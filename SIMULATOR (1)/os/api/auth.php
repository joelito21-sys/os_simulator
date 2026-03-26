<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class UserAuth {
    private $usersFile;
    private $users;
    
    public function __construct() {
        $this->usersFile = __DIR__ . '/../data/users.json';
        $this->initializeUsers();
        $this->loadUsers();
    }
    
    private function initializeUsers() {
        if (!file_exists($this->usersFile)) {
            $defaultUsers = [
                'admin' => [
                    'password' => password_hash('admin123', PASSWORD_DEFAULT),
                    'role' => 'administrator',
                    'created' => date('Y-m-d H:i:s'),
                    'last_login' => null
                ],
                'user' => [
                    'password' => password_hash('user123', PASSWORD_DEFAULT),
                    'role' => 'user',
                    'created' => date('Y-m-d H:i:s'),
                    'last_login' => null
                ]
            ];
            
            $this->saveUsers($defaultUsers);
        }
    }
    
    private function loadUsers() {
        if (file_exists($this->usersFile)) {
            $json = file_get_contents($this->usersFile);
            $this->users = json_decode($json, true);
        } else {
            $this->users = [];
        }
    }
    
    private function saveUsers($users = null) {
        $data = $users ?: $this->users;
        file_put_contents($this->usersFile, json_encode($data, JSON_PRETTY_PRINT));
    }
    
    public function login($username, $password) {
        if (!isset($this->users[$username])) {
            return ['success' => false, 'error' => 'Invalid username or password'];
        }
        
        $user = $this->users[$username];
        
        if (!password_verify($password, $user['password'])) {
            return ['success' => false, 'error' => 'Invalid username or password'];
        }
        
        // Update last login
        $this->users[$username]['last_login'] = date('Y-m-d H:i:s');
        $this->saveUsers();
        
        // Create session
        session_start();
        $_SESSION['user'] = $username;
        $_SESSION['role'] = $user['role'];
        $_SESSION['login_time'] = time();
        
        return [
            'success' => true,
            'user' => [
                'username' => $username,
                'role' => $user['role'],
                'last_login' => $user['last_login']
            ]
        ];
    }
    
    public function logout() {
        session_start();
        session_destroy();
        return ['success' => true, 'message' => 'Logged out successfully'];
    }
    
    public function getCurrentUser() {
        session_start();
        
        if (!isset($_SESSION['user'])) {
            return ['success' => false, 'error' => 'Not logged in'];
        }
        
        return [
            'success' => true,
            'user' => [
                'username' => $_SESSION['user'],
                'role' => $_SESSION['role'],
                'login_time' => $_SESSION['login_time']
            ]
        ];
    }
    
    public function createUser($username, $password, $role = 'user') {
        if (isset($this->users[$username])) {
            return ['success' => false, 'error' => 'Username already exists'];
        }
        
        if (strlen($username) < 3) {
            return ['success' => false, 'error' => 'Username must be at least 3 characters'];
        }
        
        if (strlen($password) < 6) {
            return ['success' => false, 'error' => 'Password must be at least 6 characters'];
        }
        
        $this->users[$username] = [
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'role' => $role,
            'created' => date('Y-m-d H:i:s'),
            'last_login' => null
        ];
        
        $this->saveUsers();
        
        return ['success' => true, 'message' => 'User created successfully'];
    }
    
    public function changePassword($username, $oldPassword, $newPassword) {
        if (!isset($this->users[$username])) {
            return ['success' => false, 'error' => 'User not found'];
        }
        
        if (!password_verify($oldPassword, $this->users[$username]['password'])) {
            return ['success' => false, 'error' => 'Current password is incorrect'];
        }
        
        if (strlen($newPassword) < 6) {
            return ['success' => false, 'error' => 'New password must be at least 6 characters'];
        }
        
        $this->users[$username]['password'] = password_hash($newPassword, PASSWORD_DEFAULT);
        $this->saveUsers();
        
        return ['success' => true, 'message' => 'Password changed successfully'];
    }
    
    public function getUsers() {
        session_start();
        
        if (!isset($_SESSION['user']) || $_SESSION['role'] !== 'administrator') {
            return ['success' => false, 'error' => 'Administrator access required'];
        }
        
        $userList = [];
        foreach ($this->users as $username => $data) {
            $userList[] = [
                'username' => $username,
                'role' => $data['role'],
                'created' => $data['created'],
                'last_login' => $data['last_login']
            ];
        }
        
        return ['success' => true, 'users' => $userList];
    }
}

$auth = new UserAuth();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'login':
            if (!isset($input['username']) || !isset($input['password'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Username and password required']);
                exit;
            }
            
            $result = $auth->login($input['username'], $input['password']);
            echo json_encode($result);
            break;
            
        case 'logout':
            $result = $auth->logout();
            echo json_encode($result);
            break;
            
        case 'create':
            if (!isset($input['username']) || !isset($input['password'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Username and password required']);
                exit;
            }
            
            $role = $input['role'] ?? 'user';
            $result = $auth->createUser($input['username'], $input['password'], $role);
            echo json_encode($result);
            break;
            
        case 'change_password':
            if (!isset($input['username']) || !isset($input['old_password']) || !isset($input['new_password'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'All password fields required']);
                exit;
            }
            
            $result = $auth->changePassword($input['username'], $input['old_password'], $input['new_password']);
            echo json_encode($result);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'current':
            $result = $auth->getCurrentUser();
            echo json_encode($result);
            break;
            
        case 'users':
            $result = $auth->getUsers();
            echo json_encode($result);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
