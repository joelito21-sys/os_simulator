<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../classes/OSSimulator.php';

$os = new OSSimulator();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['command'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Command is required']);
        exit;
    }
    
    $command = trim($input['command']);
    $args = $input['args'] ?? [];
    
    if (empty($command)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Command cannot be empty']);
        exit;
    }
    
    // Parse command and arguments
    $parts = explode(' ', $command);
    $cmd = array_shift($parts);
    $args = array_merge($args, $parts);
    
    $result = $os->executeCommand($cmd, $args);
    echo json_encode($result);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['system_info'])) {
        $info = $os->getSystemInfo();
        echo json_encode(['success' => true, 'data' => $info]);
    } elseif (isset($_GET['processes'])) {
        $processes = $os->getProcesses();
        echo json_encode($processes);
    } elseif (isset($_GET['memory'])) {
        $memory = $os->getMemoryInfo();
        echo json_encode($memory);
    } elseif (isset($_GET['filesystem'])) {
        $filesystem = $os->getFileSystemInfo();
        echo json_encode(['success' => true, 'data' => $filesystem]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid request']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
