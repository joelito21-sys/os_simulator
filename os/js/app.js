import FileSystem from './core/FileSystem.js';
import TerminalApp from './apps/TerminalApp.js';
import FileManagerApp from './apps/FileManagerApp.js';
import TaskManagerApp from './apps/TaskManagerApp.js';
import SystemMonitorApp from './apps/SystemMonitorApp.js';
import CalculatorApp from './apps/CalculatorApp.js';
import BrowserApp from './apps/BrowserApp.js';
import PaintApp from './apps/PaintApp.js';

class OSSimulatorGUI {
    constructor() {
        this.windows = new Map();
        this.activeWindow = null;
        this.windowZIndex = 100;
        this.systemInfo = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.currentTheme = 'default';
        this.autoThemeSwitch = false;
        this.smoothTransitions = true;

        // Detect if running via file:// or without a proper server
        this.useLocalAuth = window.location.protocol === 'file:' ||
            !window.location.hostname;

        window.app = this;

        this.initializeElements();
        this.initializeTheme();
        this.loadCurrentUser();
        this.bindEvents();
        this.startSystemClock();
        this.loadSystemInfo();
        this.initializeFileSystem();
        this.initializeContextMenu();
        this.initializeNotifications();
        this.initializeWindowResizing();
        this.initializeAudio();
    }

    initializeFileSystem() {
        this.fs = new FileSystem();
    }

    initializeAudio() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.playSound = (type) => {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1, this.audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.1);
                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.1);
            } else if (type === 'notify') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.3);
                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.3);
            }
        };
    }

    initializeElements() {
        this.desktop = document.getElementById('desktop');
        this.taskbar = document.getElementById('taskbar');
        this.startButton = document.getElementById('startButton');
        this.startMenu = document.getElementById('startMenu');
        this.windowList = document.getElementById('windowList');
        this.windowsContainer = document.getElementById('windowsContainer');
        this.systemTime = document.getElementById('systemTime');
        this.systemInfoBtn = document.getElementById('settingsBtn'); // fallback
        this.systemInfoModal = document.getElementById('systemInfoModal');
        this.themeSwitcherModal = document.getElementById('themeSwitcherModal');
        this.currentUser = document.getElementById('displayUsername'); // fallback display

        // Fix element references based on HTML
        this.powerBtn = document.getElementById('powerBtn');
        this.powerMenu = document.getElementById('powerMenu');
        this.systemDate = document.getElementById('systemDate');
        this.contextMenu = document.getElementById('contextMenu');
        this.notificationsContainer = document.getElementById('notifications');

        // Buttons that trigger modals
        this.userManagementModal = document.getElementById('userManagementModal');
        this.userMenuBtn = document.getElementById('userMenuBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
    }

    bindEvents() {
        // Start menu
        this.startButton.addEventListener('click', () => this.toggleStartMenu());
        document.addEventListener('click', (e) => {
            if (this.startMenu && !this.startMenu.contains(e.target) && !this.startButton.contains(e.target)) {
                this.hideStartMenu();
            }
        });

        // Menu items and desktop icons
        document.querySelectorAll('.menu-item[data-app], .desktop-icon[data-app], .quick-launch-btn[data-app]').forEach(item => {
            item.addEventListener('click', (e) => {
                const app = e.currentTarget.dataset.app;
                this.openApplication(app);
                this.hideStartMenu();
            });
        });

        // Power menu toggle
        if (this.powerBtn) {
            this.powerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.powerMenu.classList.toggle('show');
            });
        }

        // Shutdown/Reboot
        const shutdownBtn = document.getElementById('shutdownBtn');
        const rebootBtn = document.getElementById('rebootBtn');
        if (shutdownBtn) shutdownBtn.addEventListener('click', () => this.shutdown());
        if (rebootBtn) rebootBtn.addEventListener('click', () => this.reboot());

        // Theme switcher / Settings
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.showThemeSwitcher());
        }

        const themeClose = this.themeSwitcherModal.querySelector('.close');
        if (themeClose) themeClose.addEventListener('click', () => this.hideThemeSwitcher());

        // Theme options
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.switchTheme(theme);
            });
        });

        // User Management
        if (this.userMenuBtn) {
            this.userMenuBtn.addEventListener('click', () => this.showUserManagement());
        }
        const userClose = this.userManagementModal.querySelector('.close');
        if (userClose) userClose.addEventListener('click', () => this.hideUserManagement());

        // Logout
        // Finding logout button in User Management Modal (if it exists)
        const logoutBtn = document.getElementById('shutdownBtn'); // Using shutdown as proxy if no logout found

        // Start Menu Search
        const searchInput = document.getElementById('startMenuSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const items = document.querySelectorAll('.start-menu .menu-item');
                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.style.display = text.includes(query) ? 'flex' : 'none';
                });
            });
        }

        document.addEventListener('click', () => {
            if (this.powerMenu) this.powerMenu.classList.remove('show');
            if (this.contextMenu) this.contextMenu.style.display = 'none';
        });

        // Context menu items
        const ctxRefresh = document.getElementById('ctxRefresh');
        if (ctxRefresh) ctxRefresh.addEventListener('click', () => {
            this.playSound('click');
            this.notify('Desktop refreshed');
        });

        const ctxPersonalize = document.getElementById('ctxPersonalize');
        if (ctxPersonalize) ctxPersonalize.addEventListener('click', () => {
            this.showThemeSwitcher();
        });

        // Show desktop button
        const showDesktopBtn = document.getElementById('showDesktopBtn');
        if (showDesktopBtn) showDesktopBtn.addEventListener('click', () => {
            this.minimizeAllWindows();
        });

        // Window management
        this.windowsContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());

        // Right click on desktop
        this.desktop.addEventListener('contextmenu', (e) => {
            if (e.target === this.desktop || e.target.classList.contains('desktop-icons')) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    initializeContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }

    showContextMenu(x, y) {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'block';
            this.contextMenu.style.left = `${x}px`;
            this.contextMenu.style.top = `${y}px`;
        }
    }

    initializeNotifications() {
        this.notify = (message, duration = 3000) => {
            this.playSound('notify');
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = message;
            if (this.notificationsContainer) {
                this.notificationsContainer.appendChild(notification);
            }

            setTimeout(() => {
                notification.style.animation = 'notifySlideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        };
    }

    initializeWindowResizing() {
        this.isResizing = false;
        this.resizingWindow = null;
    }

    toggleStartMenu() {
        if (this.startMenu) this.startMenu.classList.toggle('show');
    }

    hideStartMenu() {
        if (this.startMenu) this.startMenu.classList.remove('show');
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('os-simulator-theme') || 'default';
        this.switchTheme(savedTheme);
    }

    switchTheme(theme) {
        this.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('os-simulator-theme', theme);
    }

    showThemeSwitcher() {
        if (this.themeSwitcherModal) this.themeSwitcherModal.style.display = 'block';
    }

    hideThemeSwitcher() {
        if (this.themeSwitcherModal) this.themeSwitcherModal.style.display = 'none';
    }

    showUserManagement() {
        if (this.userManagementModal) this.userManagementModal.style.display = 'block';
    }

    hideUserManagement() {
        if (this.userManagementModal) this.userManagementModal.style.display = 'none';
    }

    async loadCurrentUser() {
        try {
            let user;
            if (this.useLocalAuth) {
                const raw = sessionStorage.getItem('os-sim-user');
                user = raw ? JSON.parse(raw) : { username: 'user', role: 'admin' };
            } else {
                const response = await fetch('api/auth.php?action=current');
                const result = await response.json();
                user = result.success ? result.user : { username: 'user', role: 'admin' };
            }

            const display = document.getElementById('displayUsername');
            if (display) display.textContent = user.username;

            // Set current user on app object
            this.currentUserData = user;
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    }

    openApplication(app) {
        if (this.windows.has(app)) {
            this.focusWindow(app);
            return;
        }

        const window = this.createWindow(app);
        this.windows.set(app, window);
        this.windowsContainer.appendChild(window.element);
        this.updateWindowList();
        this.loadApplicationContent(app, window);
        this.notify(`Opened ${this.getApplicationInfo(app).title}`);
    }

    createWindow(app) {
        const template = document.getElementById('windowTemplate');
        const element = template.content.cloneNode(true).querySelector('.window');

        const appInfo = this.getApplicationInfo(app);
        const titleElement = element.querySelector('.window-name');
        const iconElement = element.querySelector('.window-icon');

        titleElement.textContent = appInfo.title;
        iconElement.className = `window-icon fas ${appInfo.icon}`;

        // Add Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'window-resize-handle';
        element.appendChild(resizeHandle);

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isResizing = true;
            this.resizingWindow = {
                app,
                element,
                startX: e.clientX,
                startY: e.clientY,
                startWidth: parseInt(window.getComputedStyle(element).width),
                startHeight: parseInt(window.getComputedStyle(element).height)
            };
        });

        // Set initial position
        const offset = this.windows.size * 30;
        element.style.left = `${100 + offset}px`;
        element.style.top = `${100 + offset}px`;
        element.style.width = appInfo.width || '600px';
        element.style.height = appInfo.height || '400px';
        element.style.zIndex = ++this.windowZIndex;

        // Window controls
        const minimizeBtn = element.querySelector('.window-control.minimize');
        const maximizeBtn = element.querySelector('.window-control.maximize');
        const closeBtn = element.querySelector('.window-control.close');

        minimizeBtn.addEventListener('click', () => this.minimizeWindow(app));
        maximizeBtn.addEventListener('click', () => this.toggleMaximizeWindow(app));
        closeBtn.addEventListener('click', () => this.closeWindow(app));

        // Make window draggable
        const header = element.querySelector('.window-header');
        header.addEventListener('mousedown', (e) => this.startDragging(e, app));

        return {
            element,
            app,
            isMinimized: false,
            isMaximized: false,
            originalPosition: null,
            originalSize: null
        };
    }

    getApplicationInfo(app) {
        const apps = {
            terminal: { title: 'Terminal', icon: 'fa-terminal', width: '700px', height: '500px' },
            filemanager: { title: 'File Manager', icon: 'fa-folder', width: '800px', height: '600px' },
            taskmanager: { title: 'Task Manager', icon: 'fa-tasks', width: '900px', height: '600px' },
            monitor: { title: 'System Monitor', icon: 'fa-chart-line', width: '800px', height: '600px' },
            editor: { title: 'Text Editor', icon: 'fa-edit', width: '700px', height: '500px' },
            calculator: { title: 'Calculator', icon: 'fa-calculator', width: '320px', height: '460px' },
            browser: { title: 'Web Browser', icon: 'fa-globe', width: '1000px', height: '700px' },
            paint: { title: 'Paint', icon: 'fa-paint-brush', width: '800px', height: '600px' },
            recyclebin: { title: 'Recycle Bin', icon: 'fa-trash', width: '800px', height: '600px' }
        };
        return apps[app] || { title: app, icon: 'fa-window-maximize' };
    }

    loadApplicationContent(app, window) {
        const content = window.element.querySelector('.window-content');

        switch (app) {
            case 'terminal':
                new TerminalApp(content);
                break;
            case 'filemanager':
                new FileManagerApp(content);
                break;
            case 'taskmanager':
                new TaskManagerApp(content);
                break;
            case 'monitor':
                new SystemMonitorApp(content);
                break;
            case 'calculator':
                new CalculatorApp(content);
                break;
            case 'browser':
                new BrowserApp(content);
                break;
            case 'paint':
                new PaintApp(content);
                break;
            case 'recyclebin':
                const fm = new FileManagerApp(content);
                fm.currentPath = '/recycle-bin';
                fm.loadDirectory();
                break;
            case 'editor':
                this.loadTextEditor(content);
                break;
        }
    }

    loadTextEditor(content) {
        content.innerHTML = `
            <div class="text-editor">
                <div class="editor-toolbar">
                    <button class="toolbar-btn" id="newFileBtn"><i class="fas fa-file"></i> New</button>
                    <button class="toolbar-btn" id="saveFileBtn"><i class="fas fa-save"></i> Save</button>
                    <button class="toolbar-btn" id="openFileBtn"><i class="fas fa-folder-open"></i> Open</button>
                </div>
                <textarea class="editor-content" id="notepadContent" placeholder="Start typing..."></textarea>
            </div>
        `;

        const editor = content.querySelector('.editor-content');
        content.querySelector('#saveFileBtn').addEventListener('click', () => {
            const fileName = prompt('Enter file name to save:', 'note.txt');
            if (fileName) {
                localStorage.setItem(`os-file-${fileName}`, editor.value);
                this.notify(`File ${fileName} saved!`);
            }
        });

        content.querySelector('#openFileBtn').addEventListener('click', () => {
            const fileName = prompt('Enter file name to open:');
            if (fileName) {
                const data = localStorage.getItem(`os-file-${fileName}`);
                if (data !== null) {
                    editor.value = data;
                    this.notify(`File ${fileName} opened.`);
                } else alert('File not found!');
            }
        });

        content.querySelector('#newFileBtn').addEventListener('click', () => {
            if (confirm('Create new file? Any unsaved changes will be lost.')) editor.value = '';
        });
        editor.focus();
    }

    focusWindow(app) {
        const window = this.windows.get(app);
        if (window && !window.isMinimized) {
            window.element.style.zIndex = ++this.windowZIndex;
            this.activeWindow = app;
        }
    }

    minimizeWindow(app) {
        const window = this.windows.get(app);
        if (window) {
            window.element.classList.add('minimizing');
            setTimeout(() => {
                window.isMinimized = true;
                window.element.style.display = 'none';
                window.element.classList.remove('minimizing');
                this.updateWindowList();
            }, 300);
        }
    }

    toggleMaximizeWindow(app) {
        const window = this.windows.get(app);
        if (window) {
            window.isMaximized = !window.isMaximized;
            window.element.classList.toggle('maximized');

            if (window.isMaximized) {
                window.originalPosition = { left: window.element.style.left, top: window.element.style.top };
                window.originalSize = { width: window.element.style.width, height: window.element.style.height };
            } else if (window.originalPosition) {
                window.element.style.left = window.originalPosition.left;
                window.element.style.top = window.originalPosition.top;
                window.element.style.width = window.originalSize.width;
                window.element.style.height = window.originalSize.height;
            }
        }
    }

    closeWindow(app) {
        const window = this.windows.get(app);
        if (window) {
            window.element.classList.add('closing');
            setTimeout(() => {
                window.element.remove();
                this.windows.delete(app);
                this.updateWindowList();
                if (this.activeWindow === app) this.activeWindow = null;
            }, 200);
        }
    }

    updateWindowList() {
        if (!this.windowList) return;
        this.windowList.innerHTML = '';
        this.windows.forEach((window, app) => {
            if (!window.isMinimized) {
                const button = document.createElement('button');
                button.className = 'window-tab';
                button.innerHTML = `<i class="fas ${this.getApplicationInfo(app).icon}"></i><span>${this.getApplicationInfo(app).title}</span>`;
                button.addEventListener('click', () => this.focusWindow(app));
                this.windowList.appendChild(button);
            }
        });
    }

    minimizeAllWindows() {
        this.windows.forEach((_, app) => this.minimizeWindow(app));
    }

    startDragging(e, app) {
        if (e.target.closest('.window-controls')) return;
        const window = this.windows.get(app);
        if (window && !window.isMaximized) {
            this.isDragging = true;
            this.draggedWindow = window;
            this.dragOffset.x = e.clientX - window.element.offsetLeft;
            this.dragOffset.y = e.clientY - window.element.offsetTop;
            window.element.style.zIndex = ++this.windowZIndex;
            e.preventDefault();
        }
    }

    handleMouseDown(e) {
        const windowElement = e.target.closest('.window');
        if (windowElement) {
            const appEntry = Array.from(this.windows.entries()).find(([_, w]) => w.element === windowElement);
            if (appEntry) this.focusWindow(appEntry[0]);
        }
    }

    handleMouseMove(e) {
        if (this.isDragging && this.draggedWindow) {
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            const maxX = window.innerWidth - this.draggedWindow.element.offsetWidth;
            const maxY = window.innerHeight - this.draggedWindow.element.offsetHeight - 48;
            this.draggedWindow.element.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            this.draggedWindow.element.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        }
        if (this.isResizing && this.resizingWindow) {
            const dx = e.clientX - this.resizingWindow.startX;
            const dy = e.clientY - this.resizingWindow.startY;
            this.resizingWindow.element.style.width = `${Math.max(320, this.resizingWindow.startWidth + dx)}px`;
            this.resizingWindow.element.style.height = `${Math.max(200, this.resizingWindow.startHeight + dy)}px`;
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.draggedWindow = null;
        this.isResizing = false;
        this.resizingWindow = null;
    }

    handleKeyboard(e) {
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            this.switchWindow();
        }
        if (e.ctrlKey && e.altKey && e.key === 'Delete') {
            e.preventDefault();
            this.openApplication('taskmanager');
        }
        if (e.key === 'Escape') {
            this.hideThemeSwitcher();
            this.hideUserManagement();
        }
    }

    switchWindow() {
        const windowApps = Array.from(this.windows.keys()).filter(app => !this.windows.get(app).isMinimized);
        if (windowApps.length > 0) {
            const nextIndex = (windowApps.indexOf(this.activeWindow) + 1) % windowApps.length;
            this.focusWindow(windowApps[nextIndex]);
        }
    }

    startSystemClock() {
        const updateTime = () => {
            const now = new Date();
            if (this.systemTime) this.systemTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            if (this.systemDate) this.systemDate.textContent = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    async loadSystemInfo() {
        try {
            if (this.useLocalAuth) {
                this.systemInfoData = { os: 'OS Simulator (Local Mode)', version: '1.0.0' };
                return;
            }
            const response = await fetch('api/command.php?system_info=true');
            const result = await response.json();
            if (result.success) this.systemInfoData = result.data;
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    }

    shutdown() {
        if (confirm('Are you sure you want to shutdown?')) {
            document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: white;"><h2>Shutting down...</h2></div>';
        }
    }

    reboot() {
        if (confirm('Are you sure you want to reboot?')) {
            document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: white;"><h2>Rebooting...</h2></div>';
            setTimeout(() => location.reload(), 2000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new OSSimulatorGUI();
});
