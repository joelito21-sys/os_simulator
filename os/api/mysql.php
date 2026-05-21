<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../classes/MySQLConnection.php';

function readInput(): array {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        return $_GET;
    }
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function getConnectionConfig(array $input): array {
    $conn = $input['connection'] ?? [];
    if (!is_array($conn)) {
        $conn = [];
    }
    return array_filter([
        'host' => $conn['host'] ?? null,
        'port' => isset($conn['port']) ? (int)$conn['port'] : null,
        'user' => $conn['user'] ?? null,
        'password' => $conn['password'] ?? null,
        'database' => $conn['database'] ?? null,
        'charset' => $conn['charset'] ?? null,
    ], fn($v) => $v !== null);
}

$input = readInput();
$action = $input['action'] ?? ($_GET['action'] ?? 'ping');
$config = getConnectionConfig($input);
$mysql = new MySQLConnection($config);

try {
    switch ($action) {
        case 'ping':
            echo json_encode($mysql->ping());
            break;

        case 'connect':
            echo json_encode($mysql->connect());
            break;

        case 'disconnect':
            $mysql->disconnect();
            echo json_encode(['success' => true, 'message' => 'Disconnected']);
            break;

        case 'databases':
            echo json_encode($mysql->getDatabases());
            break;

        case 'tables':
            $db = $input['database'] ?? null;
            echo json_encode($mysql->getTables($db));
            break;

        case 'schema':
            echo json_encode($mysql->getFullSchema());
            break;

        case 'structure':
            $table = $input['table'] ?? '';
            if ($table === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Table name required']);
                break;
            }
            echo json_encode($mysql->getTableStructure($table));
            break;

        case 'use':
            $db = $input['database'] ?? '';
            if ($db === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Database name required']);
                break;
            }
            echo json_encode($mysql->useDatabase($db));
            break;

        case 'execute':
            $query = trim($input['query'] ?? '');
            if ($query === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Query cannot be empty']);
                break;
            }
            echo json_encode($mysql->executeQuery($query));
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Unknown action: {$action}"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
