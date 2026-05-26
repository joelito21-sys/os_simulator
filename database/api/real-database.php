<?php
// Prevent any PHP errors from breaking JSON output
error_reporting(0);
ini_set('display_errors', 0);
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_clean();
    exit(json_encode(['success' => true]));
}

// Database connection configuration
$config = [
    'host' => 'localhost',
    'port' => '3306',
    'username' => 'root',
    'password' => '',
    'database' => null
];

// Load configuration if exists
if (file_exists('config.php')) {
    $userConfig = include 'config.php';
    $config = array_merge($config, $userConfig);
}

try {
    // Connect to MySQL
    $pdo = new PDO(
        "mysql:host={$config['host']};port={$config['port']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all databases
        if (isset($_GET['action']) && $_GET['action'] === 'list_databases') {
            $stmt = $pdo->query("SHOW DATABASES");
            $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // Filter out system databases
            $databases = array_filter($databases, function($db) {
                return !in_array($db, ['information_schema', 'performance_schema', 'mysql', 'sys']);
            });
            
            echo json_encode([
                'success' => true,
                'data' => array_values($databases)
            ]);
            ob_end_flush();
            exit;
        }
        
        // Get tables from a specific database
        if (isset($_GET['action']) && $_GET['action'] === 'list_tables' && isset($_GET['database'])) {
            $database = $_GET['database'];
            $pdo->exec("USE `{$database}`");
            
            $stmt = $pdo->query("SHOW TABLES");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            echo json_encode([
                'success' => true,
                'data' => $tables
            ]);
            ob_end_flush();
            exit;
        }
        
        // Get table structure
        if (isset($_GET['action']) && $_GET['action'] === 'describe_table' && isset($_GET['database']) && isset($_GET['table'])) {
            $database = $_GET['database'];
            $table = $_GET['table'];
            $pdo->exec("USE `{$database}`");
            
            $stmt = $pdo->query("DESCRIBE `{$table}`");
            $columns = $stmt->fetchAll();
            
            $schema = [];
            foreach ($columns as $col) {
                $schema[$col['Field']] = [
                    'type' => strtoupper(explode('(', $col['Type'])[0]),
                    'null' => $col['Null'] === 'YES',
                    'primary_key' => $col['Key'] === 'PRI',
                    'auto_increment' => stripos($col['Extra'], 'auto_increment') !== false,
                    'default' => $col['Default']
                ];
            }
            
            echo json_encode([
                'success' => true,
                'data' => $schema
            ]);
            ob_end_flush();
            exit;
        }
        
        // Get table data
        if (isset($_GET['action']) && $_GET['action'] === 'get_data' && isset($_GET['database']) && isset($_GET['table'])) {
            $database = $_GET['database'];
            $table = $_GET['table'];
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            
            $pdo->exec("USE `{$database}`");
            $stmt = $pdo->query("SELECT * FROM `{$table}` LIMIT {$limit}");
            $data = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $data,
                'row_count' => count($data)
            ]);
            ob_end_flush();
            exit;
        }
        
        // Execute SQL query
        if (isset($_GET['action']) && $_GET['action'] === 'execute' && isset($_GET['database']) && isset($_GET['query'])) {
            $database = $_GET['database'];
            $query = $_GET['query'];
            
            $pdo->exec("USE `{$database}`");
            $stmt = $pdo->query($query);
            
            if (stripos($query, 'SELECT') === 0 || stripos($query, 'SHOW') === 0 || stripos($query, 'DESCRIBE') === 0) {
                $data = $stmt->fetchAll();
                echo json_encode([
                    'success' => true,
                    'data' => $data,
                    'row_count' => count($data)
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'message' => 'Query executed successfully',
                    'affected_rows' => $stmt->rowCount()
                ]);
            }
            ob_end_flush();
            exit;
        }
        
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        ob_end_flush();
        exit;
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Check both POST body and GET parameters for action
        $input = json_decode(file_get_contents('php://input'), true);
        $action = isset($_GET['action']) ? $_GET['action'] : (isset($input['action']) ? $input['action'] : null);
        
        // Test connection
        if ($action === 'test_connection') {
            echo json_encode([
                'success' => true,
                'message' => 'Connected to MySQL successfully',
                'server_version' => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION)
            ]);
            ob_end_flush();
            exit;
        }
        
        echo json_encode(['success' => false, 'error' => 'Invalid action: ' . ($action ?: 'none provided')]);
        ob_end_flush();
        exit;
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    ob_end_clean(); // Clear any partial output
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed: ' . $e->getMessage(),
        'solution' => 'Make sure XAMPP MySQL is running and credentials are correct'
    ]);
    exit;
}
?>
