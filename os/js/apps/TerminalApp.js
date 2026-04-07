class TerminalApp {
    constructor(element) {
        this.element = element;
        this.output = element.querySelector('#terminalOutput');
        this.input = element.querySelector('#terminalInput');
        this.pathDisplay = element.querySelector('.terminal-path');

        this.currentPath = '/home/user';
        this.commandHistory = [];
        this.historyIndex = -1;

        // Use global app instance's useLocalAuth
        this.useLocalAuth = window.app && window.app.useLocalAuth;

        this.bindEvents();
        this.printWelcome();
    }

    bindEvents() {
        this.input.addEventListener('keydown', (e) => this.handleInput(e));
    }

    handleInput(e) {
        if (e.key === 'Enter') {
            const command = this.input.value.trim();
            if (command) {
                this.executeCommand(command);
                this.commandHistory.push(command);
                this.historyIndex = this.commandHistory.length;
            }
            this.input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.commandHistory[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.input.value = '';
            }
        }
    }

    async executeCommand(command) {
        this.printCommand(command);

        if (command === 'clear') {
            this.output.innerHTML = '';
            return;
        }

        try {
            let result;
            if (this.useLocalAuth) {
                const parts = command.split(' ');
                const cmd = parts[0].toLowerCase();
                const args = parts.slice(1);

                switch (cmd) {
                    case 'help':
                        result = { success: true, data: 'Available commands:\nHELP    - Show this help message\nCLS     - Clear the screen\nDIR     - List files and directories\nCD      - Change directory\nMKDIR   - Create a directory\nTOUCH   - Create a file\nDATE    - Show current date\nTIME    - Show current time\nECHO    - Print text\nVER     - Show OS version\nEXIT    - Close terminal' };
                        break;
                    case 'cls':
                        this.output.innerHTML = '';
                        result = { success: true };
                        break;
                    case 'dir':
                        const files = window.app.fs.list(this.currentPath);
                        const output = files.map(f => `${f.type === 'directory' ? '<DIR>' : '     '} ${f.name}`).join('\n');
                        result = { success: true, data: output || 'No files found' };
                        break;
                    case 'mkdir':
                        if (args[0]) {
                            window.app.fs.createDir(this.currentPath, args[0]);
                            result = { success: true, message: `Directory ${args[0]} created.` };
                        } else result = { success: false, error: 'Usage: mkdir <folder_name>' };
                        break;
                    case 'touch':
                        if (args[0]) {
                            window.app.fs.createFile(this.currentPath, args[0]);
                            result = { success: true, message: `File ${args[0]} created.` };
                        } else result = { success: false, error: 'Usage: touch <file_name>' };
                        break;
                    case 'date':
                        result = { success: true, data: new Date().toLocaleDateString() };
                        break;
                    case 'time':
                        result = { success: true, data: new Date().toLocaleTimeString() };
                        break;
                    case 'whoami':
                        result = { success: true, data: 'user' };
                        break;
                    case 'echo':
                        result = { success: true, data: args.join(' ') };
                        break;
                    case 'pwd':
                        result = { success: true, data: this.currentPath };
                        break;
                    case 'ver':
                        result = { success: true, data: 'OS Simulator [Version 1.0.0]' };
                        break;
                    case 'exit':
                        window.app.closeWindow('terminal');
                        return;
                    case 'cd':
                        if (args[0]) {
                            let newPath = args[0];
                            if (newPath === '..') {
                                const parts = this.currentPath.split('/').filter(p => p);
                                parts.pop();
                                this.currentPath = '/' + parts.join('/');
                            } else {
                                this.currentPath = this.currentPath === '/' ? `/${newPath}` : `${this.currentPath}/${newPath}`;
                            }
                            if (this.currentPath === '') this.currentPath = '/';
                            result = { success: true, message: 'Changed directory' };
                        }
                        break;
                    default:
                        result = { success: false, error: `Command not found: ${cmd}` };
                }
            } else {
                // ── server mode: call PHP backend ──
                const response = await fetch('api/command.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: command })
                });
                result = await response.json();
            }

            if (result.success) {
                if (result.action === 'clear') {
                    this.output.innerHTML = '';
                } else if (result.data) {
                    this.printOutput(result.data, 'success');
                } else if (result.message) {
                    this.printOutput(result.message, 'info');
                }
            } else {
                this.printOutput(result.error || 'Command failed', 'error');
            }

            // Update current path if changed
            if (command.startsWith('cd ') && result.success) {
                this.updateCurrentPath();
            }

        } catch (error) {
            console.error('Terminal error:', error);
            this.printOutput('Network error: ' + error.message, 'error');
        }
    }

    printCommand(command) {
        const div = document.createElement('div');
        div.className = 'command';
        div.textContent = `$ ${command}`;
        this.output.appendChild(div);
    }

    printOutput(text, className = '') {
        const div = document.createElement('div');
        div.className = className;
        div.textContent = text;
        this.output.appendChild(div);
        this.scrollToBottom();
    }

    printWelcome() {
        this.printOutput('Welcome to OS Simulator Terminal!', 'info');
        this.printOutput('Type "help" for available commands.', 'info');
        this.printOutput('');
    }

    updateCurrentPath() {
        if (this.pathDisplay) this.pathDisplay.textContent = this.currentPath;
    }

    scrollToBottom() {
        this.output.scrollTop = this.output.scrollHeight;
    }
}

export default TerminalApp;
