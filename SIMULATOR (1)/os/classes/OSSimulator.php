<?php

class OSSimulator {
    private $processManager;
    private $memoryManager;
    private $fileSystem;
    private $scheduler;
    private $systemTime;
    
    public function __construct() {
        $this->systemTime = time();
        $this->processManager = new ProcessManager();
        $this->memoryManager = new MemoryManager();
        $this->fileSystem = new FileSystem();
        $this->scheduler = new Scheduler();
        
        $this->initializeSystem();
    }
    
    private function initializeSystem() {
        // Initialize file system with basic structure
        $this->fileSystem->createDirectory('/', 'root');
        $this->fileSystem->createDirectory('/home', 'root');
        $this->fileSystem->createDirectory('/home/user', 'root');
        $this->fileSystem->createDirectory('/bin', 'root');
        $this->fileSystem->createDirectory('/etc', 'root');
        $this->fileSystem->createDirectory('/tmp', 'root');
        
        // Create some system files
        $this->fileSystem->createFile('/etc/passwd', 'root:x:0:0:root:/root:/bin/bash' . "\n" . 'user:x:1000:1000:user:/home/user:/bin/bash');
        $this->fileSystem->createFile('/etc/hostname', 'os-simulator');
        $this->fileSystem->createFile('/home/user/welcome.txt', 'Welcome to OS Simulator!');
        
        // Start system processes
        $this->processManager->createProcess('init', 'system', 0);
        $this->processManager->createProcess('kernel', 'system', 1);
    }
    
    public function executeCommand($command, $args = []) {
        $command = trim(strtolower($command));
        
        switch ($command) {
            case 'ls':
                return $this->fileSystem->listDirectory($args[0] ?? '/home/user');
                
            case 'cd':
                if (empty($args[0])) {
                    return ['success' => false, 'error' => 'cd: missing argument'];
                }
                return $this->fileSystem->changeDirectory($args[0]);
                
            case 'pwd':
                return ['success' => true, 'data' => $this->fileSystem->getCurrentPath()];
                
            case 'mkdir':
                if (empty($args[0])) {
                    return ['success' => false, 'error' => 'mkdir: missing argument'];
                }
                return $this->fileSystem->createDirectory($args[0], 'user');
                
            case 'touch':
                if (empty($args[0])) {
                    return ['success' => false, 'error' => 'touch: missing argument'];
                }
                return $this->fileSystem->createFile($args[0], '');
                
            case 'cat':
                if (empty($args[0])) {
                    return ['success' => false, 'error' => 'cat: missing argument'];
                }
                return $this->fileSystem->readFile($args[0]);
                
            case 'echo':
                $text = implode(' ', $args);
                return ['success' => true, 'data' => $text];
                
            case 'ps':
                return $this->processManager->listProcesses();
                
            case 'kill':
                if (empty($args[0])) {
                    return ['success' => false, 'error' => 'kill: missing argument'];
                }
                return $this->processManager->killProcess((int)$args[0]);
                
            case 'free':
                return $this->memoryManager->getMemoryInfo();
                
            case 'df':
                return $this->fileSystem->getDiskUsage();
                
            case 'help':
                return $this->getHelp();
                
            case 'clear':
                return ['success' => true, 'action' => 'clear'];
                
            case 'whoami':
                return ['success' => true, 'data' => 'user'];
                
            case 'date':
                return ['success' => true, 'data' => date('Y-m-d H:i:s', $this->systemTime)];
                
            case 'uptime':
                $uptime = time() - $this->systemTime;
                return ['success' => true, 'data' => "System uptime: {$uptime} seconds"];
                
            default:
                return ['success' => false, 'error' => "Command not found: {$command}"];
        }
    }
    
    private function getHelp() {
        $help = [
            'Available commands:',
            '  ls [path]        - List directory contents',
            '  cd <path>        - Change directory',
            '  pwd              - Print working directory',
            '  mkdir <name>     - Create directory',
            '  touch <file>     - Create empty file',
            '  cat <file>       - Display file contents',
            '  echo <text>      - Display text',
            '  ps               - List processes',
            '  kill <pid>       - Terminate process',
            '  free             - Show memory usage',
            '  df               - Show disk usage',
            '  whoami           - Display current user',
            '  date             - Show current date/time',
            '  uptime           - Show system uptime',
            '  clear            - Clear terminal',
            '  help             - Show this help'
        ];
        
        return ['success' => true, 'data' => implode("\n", $help)];
    }
    
    public function getSystemInfo() {
        return [
            'processes' => $this->processManager->getProcessCount(),
            'memory' => $this->memoryManager->getMemoryInfo(),
            'filesystem' => $this->fileSystem->getDiskUsage(),
            'uptime' => time() - $this->systemTime,
            'current_directory' => $this->fileSystem->getCurrentPath()
        ];
    }
    
    public function createProcess($name, $type = 'user', $priority = 5) {
        return $this->processManager->createProcess($name, $type, $priority);
    }
    
    public function getProcesses() {
        return $this->processManager->listProcesses();
    }
    
    public function getMemoryInfo() {
        return $this->memoryManager->getMemoryInfo();
    }
    
    public function getFileSystemInfo() {
        return $this->fileSystem->getFileSystemInfo();
    }
}

class ProcessManager {
    private $processes = [];
    private $nextPid = 2;
    
    public function createProcess($name, $type = 'user', $priority = 5) {
        $process = [
            'pid' => $this->nextPid++,
            'name' => $name,
            'type' => $type,
            'priority' => $priority,
            'state' => 'running',
            'memory' => rand(1000, 10000),
            'cpu' => 0,
            'created_at' => time(),
            'parent_pid' => $type === 'system' ? 0 : 1
        ];
        
        $this->processes[$process['pid']] = $process;
        return ['success' => true, 'pid' => $process['pid']];
    }
    
    public function killProcess($pid) {
        if (!isset($this->processes[$pid])) {
            return ['success' => false, 'error' => 'Process not found'];
        }
        
        if ($this->processes[$pid]['type'] === 'system' && $pid < 3) {
            return ['success' => false, 'error' => 'Cannot kill system process'];
        }
        
        unset($this->processes[$pid]);
        return ['success' => true, 'message' => "Process {$pid} terminated"];
    }
    
    public function listProcesses() {
        $processList = [];
        foreach ($this->processes as $pid => $process) {
            $processList[] = [
                'PID' => $pid,
                'NAME' => $process['name'],
                'TYPE' => $process['type'],
                'STATE' => $process['state'],
                'MEMORY' => $process['memory'] . ' KB',
                'CPU' => $process['cpu'] . '%',
                'TIME' => $this->formatTime(time() - $process['created_at'])
            ];
        }
        
        return ['success' => true, 'data' => $processList];
    }
    
    public function getProcessCount() {
        return count($this->processes);
    }
    
    private function formatTime($seconds) {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        
        if ($hours > 0) {
            return sprintf("%02d:%02d:%02d", $hours, $minutes, $secs);
        } else {
            return sprintf("%02d:%02d", $minutes, $secs);
        }
    }
}

class MemoryManager {
    private $totalMemory = 1048576; // 1GB in KB
    private $usedMemory = 204800;   // 200MB used by system
    private $processes = [];
    
    public function allocateMemory($pid, $size) {
        if ($this->usedMemory + $size > $this->totalMemory) {
            return ['success' => false, 'error' => 'Out of memory'];
        }
        
        $this->usedMemory += $size;
        $this->processes[$pid] = $size;
        return ['success' => true];
    }
    
    public function freeMemory($pid) {
        if (isset($this->processes[$pid])) {
            $this->usedMemory -= $this->processes[$pid];
            unset($this->processes[$pid]);
        }
        return ['success' => true];
    }
    
    public function getMemoryInfo() {
        $freeMemory = $this->totalMemory - $this->usedMemory;
        
        return [
            'success' => true,
            'data' => [
                'total' => $this->formatMemory($this->totalMemory),
                'used' => $this->formatMemory($this->usedMemory),
                'free' => $this->formatMemory($freeMemory),
                'usage_percent' => round(($this->usedMemory / $this->totalMemory) * 100, 2)
            ]
        ];
    }
    
    private function formatMemory($kb) {
        if ($kb >= 1048576) {
            return round($kb / 1048576, 2) . ' GB';
        } elseif ($kb >= 1024) {
            return round($kb / 1024, 2) . ' MB';
        } else {
            return $kb . ' KB';
        }
    }
}

class FileSystem {
    private $currentPath = '/home/user';
    private $root = [];
    
    public function __construct() {
        $this->root = [
            'type' => 'directory',
            'owner' => 'root',
            'created' => time(),
            'modified' => time(),
            'permissions' => '755',
            'children' => []
        ];
    }
    
    public function createDirectory($path, $owner = 'user') {
        $parts = $this->parsePath($path);
        $name = array_pop($parts);
        $parentPath = '/' . implode('/', $parts);
        
        $parent = $this->navigateToPath($parentPath);
        if (!$parent) {
            return ['success' => false, 'error' => 'Parent directory not found'];
        }
        
        if (isset($parent['children'][$name])) {
            return ['success' => false, 'error' => 'Directory already exists'];
        }
        
        $parent['children'][$name] = [
            'type' => 'directory',
            'owner' => $owner,
            'created' => time(),
            'modified' => time(),
            'permissions' => '755',
            'children' => []
        ];
        
        return ['success' => true, 'message' => "Directory '{$name}' created"];
    }
    
    public function createFile($path, $content = '') {
        $parts = $this->parsePath($path);
        $name = array_pop($parts);
        $parentPath = '/' . implode('/', $parts);
        
        $parent = $this->navigateToPath($parentPath);
        if (!$parent) {
            return ['success' => false, 'error' => 'Parent directory not found'];
        }
        
        $parent['children'][$name] = [
            'type' => 'file',
            'owner' => 'user',
            'created' => time(),
            'modified' => time(),
            'permissions' => '644',
            'content' => $content,
            'size' => strlen($content)
        ];
        
        return ['success' => true, 'message' => "File '{$name}' created"];
    }
    
    public function readFile($path) {
        $file = $this->navigateToPath($path);
        if (!$file) {
            return ['success' => false, 'error' => 'File not found'];
        }
        
        if ($file['type'] !== 'file') {
            return ['success' => false, 'error' => 'Not a file'];
        }
        
        return ['success' => true, 'data' => $file['content']];
    }
    
    public function listDirectory($path = null) {
        $targetPath = $path ?: $this->currentPath;
        $directory = $this->navigateToPath($targetPath);
        
        if (!$directory) {
            return ['success' => false, 'error' => 'Directory not found'];
        }
        
        if ($directory['type'] !== 'directory') {
            return ['success' => false, 'error' => 'Not a directory'];
        }
        
        $list = [];
        foreach ($directory['children'] as $name => $node) {
            $list[] = [
                'name' => $name,
                'type' => $node['type'],
                'size' => $node['type'] === 'file' ? $node['size'] : '-',
                'owner' => $node['owner'],
                'permissions' => $node['permissions'],
                'modified' => date('M d H:i', $node['modified'])
            ];
        }
        
        return ['success' => true, 'data' => $list];
    }
    
    public function changeDirectory($path) {
        if ($path === '/') {
            $this->currentPath = '/';
            return ['success' => true];
        }
        
        $targetPath = $this->resolvePath($path);
        $directory = $this->navigateToPath($targetPath);
        
        if (!$directory) {
            return ['success' => false, 'error' => 'Directory not found'];
        }
        
        if ($directory['type'] !== 'directory') {
            return ['success' => false, 'error' => 'Not a directory'];
        }
        
        $this->currentPath = $targetPath;
        return ['success' => true];
    }
    
    public function getCurrentPath() {
        return $this->currentPath;
    }
    
    public function getDiskUsage() {
        $totalSize = $this->calculateDirectorySize($this->root);
        $totalSpace = 10485760; // 10GB
        $freeSpace = $totalSpace - $totalSize;
        
        return [
            'success' => true,
            'data' => [
                'filesystem' => '/dev/sda1',
                'total' => $this->formatSize($totalSpace),
                'used' => $this->formatSize($totalSize),
                'available' => $this->formatSize($freeSpace),
                'usage_percent' => round(($totalSize / $totalSpace) * 100, 2),
                'mounted' => '/'
            ]
        ];
    }
    
    public function getFileSystemInfo() {
        return [
            'current_path' => $this->currentPath,
            'root_structure' => $this->getDirectoryTree($this->root, 0)
        ];
    }
    
    private function navigateToPath($path) {
        if ($path === '/') {
            return $this->root;
        }
        
        $parts = $this->parsePath($path);
        $current = $this->root;
        
        foreach ($parts as $part) {
            if ($part === '..') {
                continue; // Simplified - would need to track parent
            }
            if ($part === '.') {
                continue;
            }
            
            if (!isset($current['children'][$part])) {
                return null;
            }
            
            $current = $current['children'][$part];
        }
        
        return $current;
    }
    
    private function parsePath($path) {
        $path = trim($path, '/');
        return $path ? explode('/', $path) : [];
    }
    
    private function resolvePath($path) {
        if (strpos($path, '/') === 0) {
            return $path;
        }
        
        return rtrim($this->currentPath, '/') . '/' . $path;
    }
    
    private function calculateDirectorySize($directory) {
        $size = 0;
        foreach ($directory['children'] as $node) {
            if ($node['type'] === 'file') {
                $size += $node['size'];
            } else {
                $size += $this->calculateDirectorySize($node);
            }
        }
        return $size;
    }
    
    private function formatSize($bytes) {
        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 2) . 'G';
        } elseif ($bytes >= 1048576) {
            return round($bytes / 1048576, 2) . 'M';
        } elseif ($bytes >= 1024) {
            return round($bytes / 1024, 2) . 'K';
        } else {
            return $bytes . 'B';
        }
    }
    
    private function getDirectoryTree($directory, $depth) {
        $tree = [];
        foreach ($directory['children'] as $name => $node) {
            $item = [
                'name' => $name,
                'type' => $node['type'],
                'depth' => $depth
            ];
            
            if ($node['type'] === 'directory') {
                $item['children'] = $this->getDirectoryTree($node, $depth + 1);
            }
            
            $tree[] = $item;
        }
        return $tree;
    }
}

class Scheduler {
    private $algorithms = ['fcfs', 'sjf', 'priority', 'roundrobin'];
    private $currentAlgorithm = 'fcfs';
    private $timeQuantum = 10;
    
    public function setAlgorithm($algorithm) {
        if (in_array($algorithm, $this->algorithms)) {
            $this->currentAlgorithm = $algorithm;
            return ['success' => true, 'message' => "Algorithm changed to {$algorithm}"];
        }
        return ['success' => false, 'error' => 'Invalid algorithm'];
    }
    
    public function getAlgorithm() {
        return $this->currentAlgorithm;
    }
    
    public function getTimeQuantum() {
        return $this->timeQuantum;
    }
    
    public function setTimeQuantum($quantum) {
        $this->timeQuantum = $quantum;
        return ['success' => true, 'message' => "Time quantum set to {$quantum}ms"];
    }
}
