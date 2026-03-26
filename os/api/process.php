<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../classes/OSSimulator.php';

$os = new OSSimulator();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Process name is required']);
        exit;
    }
    
    $name = trim($input['name']);
    $type = $input['type'] ?? 'user';
    $priority = $input['priority'] ?? 5;
    
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Process name cannot be empty']);
        exit;
    }
    
    $result = $os->createProcess($name, $type, $priority);
    echo json_encode($result);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $processes = $os->getProcesses();
    echo json_encode($processes);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['pid'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Process ID is required']);
        exit;
    }
    
    $result = $os->executeCommand('kill', [$input['pid']]);
    echo json_encode($result);
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
