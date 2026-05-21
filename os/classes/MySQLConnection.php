<?php

class MySQLConnection {
    private $pdo = null;
    private $config = [];
    private $lastError = '';

    public function __construct(array $config = []) {
        $defaults = require __DIR__ . '/../config/mysql.defaults.php';
        if (file_exists(__DIR__ . '/../config/mysql.local.php')) {
            $local = require __DIR__ . '/../config/mysql.local.php';
            $defaults = array_merge($defaults, $local);
        }
        $this->config = array_merge($defaults, $config);
    }

    public function getConfig(): array {
        $c = $this->config;
        unset($c['password']);
        return $c;
    }

    public function connect(): array {
        if ($this->pdo) {
            return ['success' => true, 'message' => 'Already connected', 'config' => $this->getConfig()];
        }

        $host = $this->config['host'] ?? '127.0.0.1';
        $port = (int)($this->config['port'] ?? 3306);
        $user = $this->config['user'] ?? 'root';
        $pass = $this->config['password'] ?? '';
        $db = $this->config['database'] ?? '';
        $charset = $this->config['charset'] ?? 'utf8mb4';

        $dsn = "mysql:host={$host};port={$port};charset={$charset}";
        if ($db !== '') {
            $dsn .= ";dbname={$db}";
        }

        try {
            $this->pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            $version = $this->pdo->query('SELECT VERSION() AS v')->fetch()['v'] ?? 'unknown';
            return [
                'success' => true,
                'message' => 'Connected to MySQL',
                'version' => $version,
                'config' => $this->getConfig(),
            ];
        } catch (PDOException $e) {
            $this->lastError = $e->getMessage();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function disconnect(): void {
        $this->pdo = null;
    }

    public function isConnected(): bool {
        return $this->pdo !== null;
    }

    public function ping(): array {
        if (!$this->pdo) {
            $result = $this->connect();
            if (!$result['success']) {
                return $result;
            }
        }
        try {
            $this->pdo->query('SELECT 1');
            $version = $this->pdo->query('SELECT VERSION() AS v')->fetch()['v'] ?? '';
            return [
                'success' => true,
                'version' => $version,
                'database' => $this->config['database'] ?? '',
                'config' => $this->getConfig(),
            ];
        } catch (PDOException $e) {
            $this->pdo = null;
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function useDatabase(string $database): array {
        if (!$this->pdo) {
            $connect = $this->connect();
            if (!$connect['success']) {
                return $connect;
            }
        }
        try {
            $safe = preg_replace('/[^a-zA-Z0-9_$-]/', '', $database);
            if ($safe === '') {
                throw new Exception('Invalid database name');
            }
            $this->pdo->exec("USE `{$safe}`");
            $this->config['database'] = $safe;
            return ['success' => true, 'message' => "Database changed to {$safe}", 'database' => $safe];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getDatabases(): array {
        $connect = $this->ensureConnected();
        if (!$connect['success']) {
            return $connect;
        }
        try {
            $rows = $this->pdo->query('SHOW DATABASES')->fetchAll();
            $databases = array_map(fn($r) => array_values($r)[0], $rows);
            return ['success' => true, 'data' => $databases];
        } catch (PDOException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getFullSchema(): array {
        $connect = $this->ensureConnected();
        if (!$connect['success']) {
            return $connect;
        }
        try {
            $dbRows = $this->pdo->query('SHOW DATABASES')->fetchAll();
            $databases = array_map(fn($r) => array_values($r)[0], $dbRows);

            $tableRows = $this->pdo->query(
                "SELECT TABLE_SCHEMA AS db_name, TABLE_NAME AS table_name
                 FROM information_schema.TABLES
                 WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
                 ORDER BY TABLE_SCHEMA, TABLE_NAME"
            )->fetchAll();

            $map = [];
            foreach ($databases as $db) {
                $map[$db] = ['name' => $db, 'tables' => []];
            }
            foreach ($tableRows as $row) {
                $db = $row['db_name'];
                if (!isset($map[$db])) {
                    $map[$db] = ['name' => $db, 'tables' => []];
                }
                $map[$db]['tables'][] = $row['table_name'];
            }

            return [
                'success' => true,
                'data' => array_values($map),
                'database_count' => count($map),
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getTables(?string $database = null): array {
        $connect = $this->ensureConnected();
        if (!$connect['success']) {
            return $connect;
        }
        try {
            if ($database) {
                $safe = preg_replace('/[^a-zA-Z0-9_$-]/', '', $database);
                $rows = $this->pdo->query("SHOW TABLES FROM `{$safe}`")->fetchAll();
            } else {
                $rows = $this->pdo->query('SHOW TABLES')->fetchAll();
            }
            $tables = array_map(fn($r) => array_values($r)[0], $rows);
            return ['success' => true, 'data' => $tables];
        } catch (PDOException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getTableStructure(string $table): array {
        $connect = $this->ensureConnected();
        if (!$connect['success']) {
            return $connect;
        }
        try {
            $safe = preg_replace('/[^a-zA-Z0-9_$-]/', '', $table);
            $columns = $this->pdo->query("DESCRIBE `{$safe}`")->fetchAll();
            $create = $this->pdo->query("SHOW CREATE TABLE `{$safe}`")->fetch();
            return [
                'success' => true,
                'data' => $columns,
                'create_statement' => $create['Create Table'] ?? $create['Create View'] ?? '',
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function executeQuery(string $sql): array {
        $connect = $this->ensureConnected();
        if (!$connect['success']) {
            return $connect;
        }

        $statements = $this->splitStatements($sql);
        if (empty($statements)) {
            return ['success' => false, 'error' => 'No SQL statements found'];
        }

        $results = [];
        $totalAffected = 0;

        try {
            foreach ($statements as $index => $statement) {
                $stmtResult = $this->executeSingleStatement($statement);
                $stmtResult['statement_index'] = $index + 1;
                $stmtResult['total_statements'] = count($statements);
                $results[] = $stmtResult;

                if (!$stmtResult['success']) {
                    return [
                        'success' => false,
                        'error' => $stmtResult['error'],
                        'query' => $sql,
                        'results' => $results,
                        'failed_at' => $index + 1,
                    ];
                }
                $totalAffected += $stmtResult['affected_rows'] ?? 0;
            }

            $last = end($results);
            return [
                'success' => true,
                'query' => $sql,
                'results' => $results,
                'statement_count' => count($statements),
                'affected_rows' => $totalAffected,
                'data' => $last['data'] ?? null,
                'row_count' => $last['row_count'] ?? 0,
                'message' => $last['message'] ?? null,
                'columns' => $last['columns'] ?? null,
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'error' => $e->getMessage(), 'query' => $sql];
        }
    }

    private function executeSingleStatement(string $sql): array {
        $trimmed = trim($sql);
        if ($trimmed === '') {
            return ['success' => true, 'message' => 'Empty statement skipped'];
        }

        if (preg_match('/^USE\s+[`\']?([\w$-]+)[`\']?\s*;?$/i', $trimmed, $m)) {
            return $this->useDatabase($m[1]);
        }

        if ($this->returnsResultSet($trimmed)) {
            $stmt = $this->pdo->query($trimmed);
            $data = $stmt->fetchAll();
            $columns = [];
            if (count($data) > 0) {
                $columns = array_keys($data[0]);
            } elseif ($stmt->columnCount() > 0) {
                for ($i = 0; $i < $stmt->columnCount(); $i++) {
                    $meta = $stmt->getColumnMeta($i);
                    $columns[] = $meta['name'] ?? "col_{$i}";
                }
            }
            return [
                'success' => true,
                'type' => 'resultset',
                'data' => $data,
                'columns' => $columns,
                'row_count' => count($data),
                'query' => $trimmed,
            ];
        }

        $affected = $this->pdo->exec($trimmed);
        if ($affected === false) {
            return ['success' => false, 'error' => 'Query execution failed', 'query' => $trimmed];
        }

        $message = $this->buildSuccessMessage($trimmed, $affected);
        $result = [
            'success' => true,
            'type' => 'command',
            'affected_rows' => max(0, (int)$affected),
            'message' => $message,
            'query' => $trimmed,
        ];

        if (preg_match('/^INSERT\s+/i', $trimmed)) {
            $result['last_insert_id'] = (int)$this->pdo->lastInsertId();
        }

        return $result;
    }

    private function buildSuccessMessage(string $sql, $affected): string {
        $upper = strtoupper(ltrim($sql));
        $rows = max(0, (int)$affected);
        if (strpos($upper, 'INSERT') === 0) {
            return "Query OK, {$rows} row(s) inserted";
        }
        if (strpos($upper, 'UPDATE') === 0) {
            return "Query OK, {$rows} row(s) affected";
        }
        if (strpos($upper, 'DELETE') === 0) {
            return "Query OK, {$rows} row(s) deleted";
        }
        if (strpos($upper, 'CREATE') === 0) {
            return 'Query OK, object created';
        }
        if (strpos($upper, 'DROP') === 0) {
            return 'Query OK, object dropped';
        }
        if (strpos($upper, 'ALTER') === 0) {
            return 'Query OK, table altered';
        }
        return "Query OK, {$rows} row(s) affected";
    }

    private function returnsResultSet(string $sql): bool {
        $upper = strtoupper(ltrim($sql));
        return (bool)preg_match('/^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH|HANDLER)\b/', $upper);
    }

    private function splitStatements(string $sql): array {
        $statements = [];
        $current = '';
        $len = strlen($sql);
        $inString = false;
        $stringChar = '';
        $inLineComment = false;
        $inBlockComment = false;

        for ($i = 0; $i < $len; $i++) {
            $c = $sql[$i];
            $next = ($i + 1 < $len) ? $sql[$i + 1] : '';

            if ($inLineComment) {
                if ($c === "\n") {
                    $inLineComment = false;
                    $current .= $c;
                }
                continue;
            }

            if ($inBlockComment) {
                if ($c === '*' && $next === '/') {
                    $inBlockComment = false;
                    $i++;
                }
                continue;
            }

            if (!$inString && $c === '-' && $next === '-') {
                $inLineComment = true;
                continue;
            }

            if (!$inString && $c === '#') {
                $inLineComment = true;
                continue;
            }

            if (!$inString && $c === '/' && $next === '*') {
                $inBlockComment = true;
                $i++;
                continue;
            }

            if ($inString) {
                $current .= $c;
                if ($c === $stringChar && ($i === 0 || $sql[$i - 1] !== '\\')) {
                    $inString = false;
                }
                continue;
            }

            if ($c === "'" || $c === '"') {
                $inString = true;
                $stringChar = $c;
                $current .= $c;
                continue;
            }

            if ($c === ';') {
                $stmt = trim($current);
                if ($stmt !== '') {
                    $statements[] = $stmt;
                }
                $current = '';
                continue;
            }

            $current .= $c;
        }

        $stmt = trim($current);
        if ($stmt !== '') {
            $statements[] = $stmt;
        }

        return $statements;
    }

    private function ensureConnected(): array {
        if ($this->pdo) {
            return ['success' => true];
        }
        return $this->connect();
    }
}
