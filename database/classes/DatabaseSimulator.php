<?php

class DatabaseSimulator {
    private $tables = [];
    private $data = [];
    
    public function __construct() {
        $this->initializeSampleData();
    }
    
    private function initializeSampleData() {
        // Users table
        $this->tables['users'] = [
            'id' => ['type' => 'INTEGER', 'primary_key' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'length' => 100],
            'email' => ['type' => 'VARCHAR', 'length' => 255],
            'age' => ['type' => 'INTEGER'],
            'created_at' => ['type' => 'DATETIME']
        ];
        
        $this->data['users'] = [
            ['id' => 1, 'name' => 'John Doe', 'email' => 'john@example.com', 'age' => 25, 'created_at' => '2023-01-15 10:30:00'],
            ['id' => 2, 'name' => 'Jane Smith', 'email' => 'jane@example.com', 'age' => 30, 'created_at' => '2023-02-20 14:15:00'],
            ['id' => 3, 'name' => 'Bob Johnson', 'email' => 'bob@example.com', 'age' => 35, 'created_at' => '2023-03-10 09:45:00'],
            ['id' => 4, 'name' => 'Alice Brown', 'email' => 'alice@example.com', 'age' => 28, 'created_at' => '2023-04-05 16:20:00']
        ];
        
        // Products table
        $this->tables['products'] = [
            'id' => ['type' => 'INTEGER', 'primary_key' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'length' => 200],
            'price' => ['type' => 'DECIMAL', 'precision' => 10, 'scale' => 2],
            'category' => ['type' => 'VARCHAR', 'length' => 50],
            'stock' => ['type' => 'INTEGER']
        ];
        
        $this->data['products'] = [
            ['id' => 1, 'name' => 'Laptop', 'price' => 999.99, 'category' => 'Electronics', 'stock' => 50],
            ['id' => 2, 'name' => 'Mouse', 'price' => 25.50, 'category' => 'Electronics', 'stock' => 200],
            ['id' => 3, 'name' => 'Keyboard', 'price' => 75.00, 'category' => 'Electronics', 'stock' => 150],
            ['id' => 4, 'name' => 'Monitor', 'price' => 299.99, 'category' => 'Electronics', 'stock' => 80],
            ['id' => 5, 'name' => 'Desk Chair', 'price' => 199.99, 'category' => 'Furniture', 'stock' => 30]
        ];
    }
    
    public function executeQuery($sql) {
        $sql = trim($sql);
        $sqlUpper = strtoupper($sql);
        
        try {
            if (strpos($sqlUpper, 'SELECT') === 0) {
                return $this->executeSelect($sql);
            } elseif (strpos($sqlUpper, 'INSERT') === 0) {
                return $this->executeInsert($sql);
            } elseif (strpos($sqlUpper, 'UPDATE') === 0) {
                return $this->executeUpdate($sql);
            } elseif (strpos($sqlUpper, 'DELETE') === 0) {
                return $this->executeDelete($sql);
            } elseif (strpos($sqlUpper, 'SHOW TABLES') === 0) {
                return $this->showTables();
            } elseif (strpos($sqlUpper, 'DESCRIBE') === 0) {
                return $this->describeTable($sql);
            } else {
                throw new Exception("Unsupported query type");
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'query' => $sql
            ];
        }
    }
    
    private function executeSelect($sql) {
        // Simple SELECT parser (basic implementation)
        preg_match('/SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*))?(?:\s+ORDER\s+BY\s+(.*))?(?:\s+LIMIT\s+(\d+))?/i', $sql, $matches);
        
        if (!$matches) {
            throw new Exception("Invalid SELECT syntax");
        }
        
        $columns = trim($matches[1]);
        $table = trim($matches[2]);
        $whereClause = isset($matches[3]) ? trim($matches[3]) : '';
        $orderBy = isset($matches[4]) ? trim($matches[4]) : '';
        $limit = isset($matches[5]) ? (int)$matches[5] : null;
        
        if (!isset($this->data[$table])) {
            throw new Exception("Table '$table' does not exist");
        }
        
        $result = $this->data[$table];
        
        // Apply WHERE clause
        if ($whereClause) {
            $result = $this->applyWhereClause($result, $whereClause);
        }
        
        // Apply ORDER BY
        if ($orderBy) {
            $result = $this->applyOrderBy($result, $orderBy);
        }
        
        // Apply LIMIT
        if ($limit) {
            $result = array_slice($result, 0, $limit);
        }
        
        // Select columns
        if ($columns !== '*') {
            $selectedColumns = array_map('trim', explode(',', $columns));
            $result = array_map(function($row) use ($selectedColumns) {
                $newRow = [];
                foreach ($selectedColumns as $col) {
                    $newRow[$col] = $row[$col] ?? null;
                }
                return $newRow;
            }, $result);
        }
        
        return [
            'success' => true,
            'data' => $result,
            'row_count' => count($result),
            'query' => $sql
        ];
    }
    
    private function executeInsert($sql) {
        preg_match('/INSERT\s+INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i', $sql, $matches);
        
        if (!$matches) {
            throw new Exception("Invalid INSERT syntax");
        }
        
        $table = trim($matches[1]);
        $columns = array_map('trim', explode(',', $matches[2]));
        $values = array_map('trim', explode(',', $matches[3]));
        
        if (!isset($this->data[$table])) {
            throw new Exception("Table '$table' does not exist");
        }
        
        $newRow = [];
        foreach ($columns as $i => $column) {
            $value = $values[$i] ?? '';
            // Remove quotes from string values
            if (strpos($value, "'") === 0 || strpos($value, '"') === 0) {
                $value = substr($value, 1, -1);
            }
            $newRow[$column] = is_numeric($value) ? (float)$value : $value;
        }
        
        // Auto-increment primary key if exists
        if (isset($this->tables[$table])) {
            foreach ($this->tables[$table] as $colName => $colInfo) {
                if ($colInfo['primary_key'] && $colInfo['auto_increment'] && !isset($newRow[$colName])) {
                    $maxId = 0;
                    foreach ($this->data[$table] as $row) {
                        if ($row[$colName] > $maxId) {
                            $maxId = $row[$colName];
                        }
                    }
                    $newRow[$colName] = $maxId + 1;
                }
            }
        }
        
        $this->data[$table][] = $newRow;
        
        return [
            'success' => true,
            'message' => 'Record inserted successfully',
            'inserted_id' => $newRow['id'] ?? null,
            'query' => $sql
        ];
    }
    
    private function executeUpdate($sql) {
        preg_match('/UPDATE\s+(\w+)\s+SET\s+(.*?)\s+WHERE\s+(.*)/i', $sql, $matches);
        
        if (!$matches) {
            throw new Exception("Invalid UPDATE syntax");
        }
        
        $table = trim($matches[1]);
        $setClause = trim($matches[2]);
        $whereClause = trim($matches[3]);
        
        if (!isset($this->data[$table])) {
            throw new Exception("Table '$table' does not exist");
        }
        
        $affectedRows = 0;
        
        // Parse SET clause
        $setPairs = array_map('trim', explode(',', $setClause));
        $updates = [];
        foreach ($setPairs as $pair) {
            list($column, $value) = array_map('trim', explode('=', $pair));
            if (strpos($value, "'") === 0 || strpos($value, '"') === 0) {
                $value = substr($value, 1, -1);
            }
            $updates[$column] = is_numeric($value) ? (float)$value : $value;
        }
        
        // Apply updates to matching rows
        foreach ($this->data[$table] as &$row) {
            if ($this->evaluateWhereClause($row, $whereClause)) {
                foreach ($updates as $column => $value) {
                    $row[$column] = $value;
                }
                $affectedRows++;
            }
        }
        
        return [
            'success' => true,
            'message' => 'Records updated successfully',
            'affected_rows' => $affectedRows,
            'query' => $sql
        ];
    }
    
    private function executeDelete($sql) {
        preg_match('/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*))?/i', $sql, $matches);
        
        if (!$matches) {
            throw new Exception("Invalid DELETE syntax");
        }
        
        $table = trim($matches[1]);
        $whereClause = isset($matches[2]) ? trim($matches[2]) : '';
        
        if (!isset($this->data[$table])) {
            throw new Exception("Table '$table' does not exist");
        }
        
        if (empty($whereClause)) {
            throw new Exception("DELETE without WHERE clause is not allowed for safety");
        }
        
        $originalCount = count($this->data[$table]);
        $this->data[$table] = array_filter($this->data[$table], function($row) use ($whereClause) {
            return !$this->evaluateWhereClause($row, $whereClause);
        });
        $this->data[$table] = array_values($this->data[$table]); // Re-index array
        
        $affectedRows = $originalCount - count($this->data[$table]);
        
        return [
            'success' => true,
            'message' => 'Records deleted successfully',
            'affected_rows' => $affectedRows,
            'query' => $sql
        ];
    }
    
    private function showTables() {
        return [
            'success' => true,
            'data' => array_map(function($table) {
                return ['table_name' => $table];
            }, array_keys($this->data)),
            'query' => 'SHOW TABLES'
        ];
    }
    
    private function describeTable($sql) {
        preg_match('/DESCRIBE\s+(\w+)/i', $sql, $matches);
        
        if (!$matches) {
            throw new Exception("Invalid DESCRIBE syntax");
        }
        
        $table = trim($matches[1]);
        
        if (!isset($this->tables[$table])) {
            throw new Exception("Table '$table' does not exist");
        }
        
        $columns = [];
        foreach ($this->tables[$table] as $columnName => $columnInfo) {
            $type = $columnInfo['type'];
            if (isset($columnInfo['length'])) {
                $type .= '(' . $columnInfo['length'] . ')';
            } elseif (isset($columnInfo['precision']) && isset($columnInfo['scale'])) {
                $type .= '(' . $columnInfo['precision'] . ',' . $columnInfo['scale'] . ')';
            }
            
            $columns[] = [
                'field' => $columnName,
                'type' => $type,
                'null' => 'YES',
                'key' => $columnInfo['primary_key'] ?? false ? 'PRI' : '',
                'extra' => $columnInfo['auto_increment'] ?? false ? 'auto_increment' : ''
            ];
        }
        
        return [
            'success' => true,
            'data' => $columns,
            'query' => $sql
        ];
    }
    
    private function applyWhereClause($data, $whereClause) {
        return array_filter($data, function($row) use ($whereClause) {
            return $this->evaluateWhereClause($row, $whereClause);
        });
    }
    
    private function evaluateWhereClause($row, $whereClause) {
        // Simple WHERE clause evaluation (basic implementation)
        $conditions = array_map('trim', preg_split('/\s+AND\s+/i', $whereClause));
        
        foreach ($conditions as $condition) {
            if (!$this->evaluateCondition($row, $condition)) {
                return false;
            }
        }
        
        return true;
    }
    
    private function evaluateCondition($row, $condition) {
        // Parse basic conditions: column = value, column > value, etc.
        if (preg_match('/(\w+)\s*(=|>|<|>=|<=|!=|LIKE)\s*(.+)/i', $condition, $matches)) {
            $column = $matches[1];
            $operator = $matches[2];
            $value = $matches[3];
            
            if (!isset($row[$column])) {
                return false;
            }
            
            // Remove quotes from string values
            if (strpos($value, "'") === 0 || strpos($value, '"') === 0) {
                $value = substr($value, 1, -1);
            }
            
            $rowValue = $row[$column];
            
            switch (strtoupper($operator)) {
                case '=':
                    return $rowValue == $value;
                case '>':
                    return $rowValue > $value;
                case '<':
                    return $rowValue < $value;
                case '>=':
                    return $rowValue >= $value;
                case '<=':
                    return $rowValue <= $value;
                case '!=':
                case '<>':
                    return $rowValue != $value;
                case 'LIKE':
                    // Simple LIKE implementation (convert SQL wildcards to regex)
                    $pattern = str_replace('%', '.*', preg_quote($value, '/'));
                    return preg_match('/^' . $pattern . '$/i', $rowValue);
                default:
                    return false;
            }
        }
        
        return false;
    }
    
    private function applyOrderBy($data, $orderBy) {
        if (preg_match('/(\w+)\s*(ASC|DESC)?/i', $orderBy, $matches)) {
            $column = $matches[1];
            $direction = isset($matches[2]) && strtoupper($matches[2]) === 'DESC' ? -1 : 1;
            
            usort($data, function($a, $b) use ($column, $direction) {
                $aValue = $a[$column] ?? '';
                $bValue = $b[$column] ?? '';
                
                if (is_numeric($aValue) && is_numeric($bValue)) {
                    return ($aValue - $bValue) * $direction;
                } else {
                    return strcmp($aValue, $bValue) * $direction;
                }
            });
        }
        
        return $data;
    }
    
    public function getTables() {
        return array_keys($this->data);
    }
    
    public function getTableSchema($table) {
        return $this->tables[$table] ?? null;
    }
}
