class FileManagerApp {
    constructor(element) {
        this.element = element;
        this.currentPath = '/home/user';
        this.fileList = element.querySelector('#fileList');
        this.pathInput = element.querySelector('#pathInput');

        this.bindEvents();
        this.loadDirectory();
    }

    bindEvents() {
        const backBtn = this.element.querySelector('#backBtn');
        const upBtn = this.element.querySelector('#upBtn');
        const refreshBtn = this.element.querySelector('#refreshBtn');
        const newFolderBtn = this.element.querySelector('#newFolderBtn');
        const newFileBtn = this.element.querySelector('#newFileBtn');

        if (backBtn) backBtn.addEventListener('click', () => this.goBack());
        if (upBtn) upBtn.addEventListener('click', () => this.goUp());
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadDirectory());
        if (newFolderBtn) newFolderBtn.addEventListener('click', () => this.createNewFolder());
        if (newFileBtn) newFileBtn.addEventListener('click', () => this.createNewFile());
    }

    async loadDirectory() {
        try {
            let result;
            if (window.app && window.app.useLocalAuth) {
                const files = window.app.fs.list(this.currentPath);
                result = { success: true, data: files };
            } else {
                const response = await fetch('api/command.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: 'ls', args: [this.currentPath] })
                });
                result = await response.json();
            }

            if (result.success) {
                this.displayFiles(result.data);
                if (this.pathInput) this.pathInput.value = this.currentPath;
            } else {
                this.showError(result.error || 'Failed to open directory');
            }
        } catch (error) {
            console.error('File manager error:', error);
            this.showError('Network error: ' + error.message);
        }
    }

    displayFiles(files) {
        if (!this.fileList) return;
        this.fileList.innerHTML = '';

        // Add "Up" folder if not at root
        if (this.currentPath !== '/') {
            const upItem = document.createElement('div');
            upItem.className = 'file-item directory';
            upItem.innerHTML = `<i class="fas fa-folder"></i><span>..</span>`;
            upItem.addEventListener('dblclick', () => this.goUp());
            this.fileList.appendChild(upItem);
        }

        files.forEach(file => {
            const item = document.createElement('div');
            item.className = `file-item ${file.type}`;
            item.innerHTML = `
                <i class="fas ${file.type === 'directory' ? 'fa-folder' : 'fa-file'}"></i>
                <span>${file.name}</span>
            `;

            item.addEventListener('dblclick', () => this.handleFileDoubleClick(file));

            // Context menu for individual files
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm(`Delete ${file.name}?`)) {
                    window.app.fs.delete(file.path);
                    this.loadDirectory();
                    window.app.notify(`${file.name} moved to Recycle Bin`);
                }
            });

            this.fileList.appendChild(item);
        });
    }

    handleFileDoubleClick(file) {
        if (file.type === 'directory') {
            this.navigateToDirectory(file.name);
        } else {
            this.openFile(file.name);
        }
    }

    navigateToDirectory(dirName) {
        if (dirName === '..') {
            this.goUp();
        } else {
            this.currentPath = this.currentPath === '/' ? `/${dirName}` : `${this.currentPath}/${dirName}`;
            this.loadDirectory();
        }
    }

    goUp() {
        const parts = this.currentPath.split('/').filter(p => p);
        parts.pop();
        this.currentPath = '/' + parts.join('/');
        if (this.currentPath === '') this.currentPath = '/';
        this.loadDirectory();
    }

    goBack() {
        this.goUp();
    }

    openFile(fileName) {
        alert(`Opening file: ${fileName}\n(Feature coming soon!)`);
    }

    async createNewFolder() {
        const name = prompt('Enter folder name:');
        if (name) {
            if (window.app.fs.createDir(this.currentPath, name)) {
                this.loadDirectory();
                window.app.notify('Folder created');
            } else {
                alert('Folder already exists');
            }
        }
    }

    async createNewFile() {
        const name = prompt('Enter file name:');
        if (name) {
            if (window.app.fs.createFile(this.currentPath, name)) {
                this.loadDirectory();
                window.app.notify('File created');
            } else {
                alert('File already exists');
            }
        }
    }

    showError(message) {
        if (this.fileList) {
            this.fileList.innerHTML = `<div style="color: red; padding: 20px; text-align: center;">${message}</div>`;
        }
    }
}

export default FileManagerApp;
