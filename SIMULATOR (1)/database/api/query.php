<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../classes/DatabaseSimulator.php';

$database = new DatabaseSimulator();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['query'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Query is required']);
        exit;
    }
    
    $query = trim($input['query']);
    
    if (empty($query)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Query cannot be empty']);
        exit;
    }
    
    $result = $database->executeQuery($query);
    echo json_encode($result);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['tables'])) {
        $tables = $database->getTables();
        echo json_encode(['success' => true, 'data' => $tables]);
    } elseif (isset($_GET['schema']) && isset($_GET['table'])) {
        $table = $_GET['table'];
        $schema = $database->getTableSchema($table);
        if ($schema) {
            echo json_encode(['success' => true, 'data' => $schema]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Table not found']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid request']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
