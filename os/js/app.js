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
        this.systemInfoBtn = document.getElementById('systemInfoBtn');
        this.systemInfoModal = document.getElementById('systemInfoModal');
        this.themeSwitcherBtn = document.getElementById('themeSwitcherBtn');
        this.themeSwitcherModal = document.getElementById('themeSwitcherModal');
        this.currentUser = document.getElementById('currentUser');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.userManagementBtn = document.getElementById('userManagementBtn');
        this.userManagementModal = document.getElementById('userManagementModal');

        this.contextMenu = document.getElementById('contextMenu');
        this.notificationsContainer = document.getElementById('notifications');
        this.powerBtn = document.getElementById('powerBtn');
        this.powerMenu = document.getElementById('powerMenu');
        this.systemDate = document.getElementById('systemDate');
    }

    bindEvents() {
        // Start menu
        this.startButton.addEventListener('click', () => this.toggleStartMenu());
        document.addEventListener('click', (e) => {
            if (!this.startMenu.contains(e.target) && !this.startButton.contains(e.target)) {
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

        // System info
        this.systemInfoBtn.addEventListener('click', () => this.showSystemInfo());
        document.querySelector('#systemInfoModal .close').addEventListener('click', () => this.hideSystemInfo());

        // Theme switcher
        this.themeSwitcherBtn.addEventListener('click', () => this.showThemeSwitcher());
        document.querySelector('#themeSwitcherModal .close').addEventListener('click', () => this.hideThemeSwitcher());

        // Theme options
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.switchTheme(theme);
            });
        });

        // Theme settings
        document.getElementById('autoThemeSwitch').addEventListener('change', (e) => {
            this.autoThemeSwitch = e.target.checked;
            this.saveThemeSettings();
            if (this.autoThemeSwitch) {
                this.startAutoThemeSwitch();
            }
        });

        document.getElementById('smoothTransitions').addEventListener('change', (e) => {
            this.smoothTransitions = e.target.checked;
            this.saveThemeSettings();
            this.updateTransitionSetting();
        });

        // Shutdown/Reboot
        document.getElementById('shutdownBtn').addEventListener('click', () => this.shutdown());
        document.getElementById('rebootBtn').addEventListener('click', () => this.reboot());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showThemeSwitcher());

        // User Management
        this.userManagementBtn.addEventListener('click', () => this.showUserManagement());
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.userManagementModal.querySelector('.close').addEventListener('click', () => this.hideUserManagement());

        // User Management Tabs
        document.querySelectorAll('.user-management-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchUserManagementTab(e.target.dataset.tab));
        });

        // Change Password Form
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => this.handleChangePassword(e));

        // Power menu toggle
        this.powerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.powerMenu.classList.toggle('show');
        });

        // Start Menu Search
        const searchInput = document.getElementById('startMenuSearch');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.start-menu .menu-item');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });

        document.addEventListener('click', () => {
            this.powerMenu.classList.remove('show');
            this.contextMenu.style.display = 'none';
        });

        // Context menu items
        document.getElementById('ctxRefresh').addEventListener('click', () => {
            this.playSound('click');
            this.notify('Desktop refreshed');
        });

        document.getElementById('ctxPersonalize').addEventListener('click', () => {
            this.showThemeSwitcher();
        });

        // Show desktop button
        document.getElementById('showDesktopBtn').addEventListener('click', () => {
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
        this.contextMenu.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    showContextMenu(x, y) {
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
    }

    initializeNotifications() {
        this.notify = (message, duration = 3000) => {
            this.playSound('notify');
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = message;
            this.notificationsContainer.appendChild(notification);

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
        this.startMenu.classList.toggle('show');
    }

    hideStartMenu() {
        this.startMenu.classList.remove('show');
    }

    showSystemInfo() {
        this.systemInfoModal.style.display = 'block';
    }

    hideSystemInfo() {
        this.systemInfoModal.style.display = 'none';
    }

    // Theme Management Methods
    initializeTheme() {
        // Load saved theme settings
        const savedTheme = localStorage.getItem('os-simulator-theme') || 'default';
        const savedSettings = localStorage.getItem('os-simulator-theme-settings');

        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                this.autoThemeSwitch = settings.autoThemeSwitch || false;
                this.smoothTransitions = settings.smoothTransitions !== false;
            } catch (e) {
                console.error('Failed to parse theme settings:', e);
            }
        }

        this.switchTheme(savedTheme);
        this.updateThemeSettingsUI();
        this.updateTransitionSetting();

        if (this.autoThemeSwitch) {
            this.startAutoThemeSwitch();
        }
    }

    switchTheme(theme) {
        if (theme === this.currentTheme) return;

        this.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);

        // Update active theme indicator
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });

        // Save theme preference
        localStorage.setItem('os-simulator-theme', theme);

        // Apply transition effect
        if (this.smoothTransitions) {
            this.applyThemeTransition();
        }
    }

    showThemeSwitcher() {
        this.themeSwitcherModal.style.display = 'block';
        this.updateThemeSettingsUI();
    }

    hideThemeSwitcher() {
        this.themeSwitcherModal.style.display = 'none';
    }

    updateThemeSettingsUI() {
        document.getElementById('autoThemeSwitch').checked = this.autoThemeSwitch;
        document.getElementById('smoothTransitions').checked = this.smoothTransitions;
    }

    saveThemeSettings() {
        const settings = {
            autoThemeSwitch: this.autoThemeSwitch,
            smoothTransitions: this.smoothTransitions
        };
        localStorage.setItem('os-simulator-theme-settings', JSON.stringify(settings));
    }

    updateTransitionSetting() {
        const transitionValue = this.smoothTransitions ? 'all 0.3s ease' : 'none';
        document.documentElement.style.setProperty('--theme-transition', transitionValue);
    }

    applyThemeTransition() {
        // Add a brief flash effect during theme change
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            opacity: 0.3;
            z-index: 9999;
            pointer-events: none;
            transition: opacity 0.2s ease;
        `;
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(flash);
            }, 200);
        }, 10);
    }

    startAutoThemeSwitch() {
        if (!this.autoThemeSwitch) return;

        const checkTime = () => {
            if (!this.autoThemeSwitch) return;

            const hour = new Date().getHours();
            let targetTheme;

            if (hour >= 6 && hour < 18) {
                targetTheme = 'light';
            } else {
                targetTheme = 'dark';
            }

            if (targetTheme !== this.currentTheme) {
                this.switchTheme(targetTheme);
            }
        };

        // Check immediately and then every minute
        checkTime();
        this.autoThemeInterval = setInterval(checkTime, 60000);
    }

    stopAutoThemeSwitch() {
        if (this.autoThemeInterval) {
            clearInterval(this.autoThemeInterval);
            this.autoThemeInterval = null;
        }
    }

    // User Management Methods
    async loadCurrentUser() {
        try {
            let result;
            if (this.useLocalAuth) {
                const raw = sessionStorage.getItem('os-sim-user');
                result = raw ? { success: true, user: JSON.parse(raw) } : { success: false, error: 'Not logged in' };
            } else {
                try {
                    const response = await fetch('api/auth.php?action=current');
                    result = await response.json();
                } catch (netError) {
                    console.warn('PHP backend unreachable, switching to Local Mode:', netError);
                    this.useLocalAuth = true;
                    const raw = sessionStorage.getItem('os-sim-user');
                    result = raw ? { success: true, user: JSON.parse(raw) } : { success: false, error: 'Not logged in' };
                }
            }

            if (result.success) {
                this.currentUser.textContent = `${result.user.username}@os-simulator`;
                this.currentUser.dataset.username = result.user.username;
                this.currentUser.dataset.role = result.user.role;
            } else {
                // Redirect to login if not authenticated
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
            if (!this.useLocalAuth) window.location.href = 'login.html';
        }
    }

    showUserManagement() {
        this.userManagementModal.style.display = 'block';
        this.loadUserManagementData();
    }

    hideUserManagement() {
        this.userManagementModal.style.display = 'none';
    }

    switchUserManagementTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.user-management-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab panes
        document.querySelectorAll('.tab-content .tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}Tab`);
        });

        // Load data for specific tabs
        if (tabName === 'all-users') {
            this.loadAllUsers();
        }
    }

    async loadUserManagementData() {
        const username = this.currentUser.dataset.username;
        const role = this.currentUser.dataset.role;
        const loginTime = new Date().toLocaleString();

        document.getElementById('displayUsername').textContent = username;
        document.getElementById('displayRole').textContent = role.charAt(0).toUpperCase() + role.slice(1);
        document.getElementById('displayLoginTime').textContent = loginTime;
    }

    async loadAllUsers() {
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">Loading users...</td></tr>';

        try {
            let result;
            if (this.useLocalAuth) {
                const users = JSON.parse(localStorage.getItem('os-sim-users') || '{}');
                const userList = Object.entries(users).map(([username, data]) => ({
                    username,
                    role: data.role,
                    created: 'Local Mode',
                    last_login: 'Local Mode'
                }));
                result = { success: true, users: userList };
            } else {
                const response = await fetch('api/auth.php?action=users');
                result = await response.json();
            }

            if (result.success) {
                tbody.innerHTML = '';
                result.users.forEach(user => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${user.username}</td>
                        <td>${user.role}</td>
                        <td>${user.created}</td>
                        <td>${user.last_login || 'Never'}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="error-row">Failed to load users</td></tr>';
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" class="error-row">Network error</td></tr>';
        }
    }

    async handleChangePassword(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPasswordForm').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        const username = this.currentUser.dataset.username;

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Please fill all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters');
            return;
        }

        try {
            let result;
            if (this.useLocalAuth) {
                const users = JSON.parse(localStorage.getItem('os-sim-users') || '{}');
                if (users[username] && users[username].password === currentPassword) {
                    users[username].password = newPassword;
                    localStorage.setItem('os-sim-users', JSON.stringify(users));
                    result = { success: true };
                } else {
                    result = { success: false, error: 'Current password is incorrect' };
                }
            } else {
                const response = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'change_password',
                        username: username,
                        old_password: currentPassword,
                        new_password: newPassword
                    })
                });
                result = await response.json();
            }

            if (result.success) {
                alert('Password changed successfully!');
                document.getElementById('changePasswordForm').reset();
            } else {
                alert(result.error);
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    }

    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            try {
                if (this.useLocalAuth) {
                    sessionStorage.removeItem('os-sim-user');
                    window.location.href = 'login.html';
                    return;
                }

                const response = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout' })
                });

                const result = await response.json();

                if (result.success) {
                    window.location.href = 'login.html';
                } else {
                    alert('Logout failed');
                }
            } catch (error) {
                alert('Network error during logout');
            }
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

    minimizeAllWindows() {
        this.windows.forEach((_, app) => this.minimizeWindow(app));
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
            terminal: {
                title: 'Terminal',
                icon: 'fa-terminal',
                width: '700px',
                height: '500px'
            },
            filemanager: {
                title: 'File Manager',
                icon: 'fa-folder',
                width: '800px',
                height: '600px'
            },
            taskmanager: {
                title: 'Task Manager',
                icon: 'fa-tasks',
                width: '900px',
                height: '600px'
            },
            monitor: {
                title: 'System Monitor',
                icon: 'fa-chart-line',
                width: '800px',
                height: '600px'
            },
            editor: {
                title: 'Text Editor',
                icon: 'fa-edit',
                width: '700px',
                height: '500px'
            },
            calculator: {
                title: 'Calculator',
                icon: 'fa-calculator',
                width: '320px',
                height: '460px'
            },
            browser: {
                title: 'Web Browser',
                icon: 'fa-globe',
                width: '1000px',
                height: '700px'
            },
            taskmanager: {
                title: 'Task Manager',
                icon: 'fa-tasks',
                width: '600px',
                height: '450px'
            },
            paint: {
                title: 'Paint',
                icon: 'fa-paint-brush',
                width: '800px',
                height: '600px'
            },
            recyclebin: {
                title: 'Recycle Bin',
                icon: 'fa-trash',
                width: '800px',
                height: '600px'
            }
        };

        return apps[app] || { title: app, icon: 'fa-window-maximize' };
    }

    loadApplicationContent(app, window) {
        const content = window.element.querySelector('.window-content');

        switch (app) {
            case 'terminal':
                this.loadTerminal(content);
                break;
            case 'filemanager':
                this.loadFileManager(content);
                break;
            case 'taskmanager':
                this.loadTaskManager(content);
                break;
            case 'monitor':
                this.loadSystemMonitor(content);
                break;
            case 'editor':
                this.loadTextEditor(content);
                break;
            case 'calculator':
                this.loadCalculator(content);
                break;
            case 'browser':
                this.loadBrowser(content);
                break;
            case 'recyclebin':
                this.loadRecycleBin(content);
                break;
            case 'paint':
                this.loadPaint(content);
                break;
            case 'taskmanager':
                this.loadTaskManager(content);
                break;
        }
    }

    loadPaint(content) {
        const template = document.getElementById('paintTemplate');
        const paint = template.content.cloneNode(true).querySelector('.paint');
        content.appendChild(paint);
        new PaintApp(paint);
    }

    loadTaskManager(content) {
        const template = document.getElementById('taskManagerTemplate');
        const tm = template.content.cloneNode(true).querySelector('.taskmanager');
        content.appendChild(tm);
        new TaskManagerApp(tm);
    }

    loadCalculator(content) {
        const template = document.getElementById('calculatorTemplate');
        const calc = template.content.cloneNode(true).querySelector('.calculator');
        content.appendChild(calc);
        new CalculatorApp(calc);
    }

    loadBrowser(content) {
        const template = document.getElementById('browserTemplate');
        const browser = template.content.cloneNode(true).querySelector('.browser');
        content.appendChild(browser);
        new BrowserApp(browser);
    }

    loadRecycleBin(content) {
        const template = document.getElementById('fileManagerTemplate');
        const fileManager = template.content.cloneNode(true).querySelector('.file-manager');
        content.appendChild(fileManager);
        const app = new FileManagerApp(fileManager);
        app.currentPath = '/recycle-bin';
        app.loadDirectory();
    }

    loadTerminal(content) {
        const template = document.getElementById('terminalTemplate');
        const terminal = template.content.cloneNode(true).querySelector('.terminal');
        content.appendChild(terminal);

        const terminalApp = new TerminalApp(terminal);
        window.terminalApp = terminalApp;
    }

    loadFileManager(content) {
        const template = document.getElementById('fileManagerTemplate');
        const fileManager = template.content.cloneNode(true).querySelector('.file-manager');
        content.appendChild(fileManager);

        const fileManagerApp = new FileManagerApp(fileManager);
        window.fileManagerApp = fileManagerApp;
    }

    loadTaskManager(content) {
        const template = document.getElementById('taskManagerTemplate');
        const taskManager = template.content.cloneNode(true).querySelector('.task-manager');
        content.appendChild(taskManager);

        const taskManagerApp = new TaskManagerApp(taskManager);
        window.taskManagerApp = taskManagerApp;
    }

    loadSystemMonitor(content) {
        const template = document.getElementById('monitorTemplate');
        const monitor = template.content.cloneNode(true).querySelector('.system-monitor');
        content.appendChild(monitor);

        const monitorApp = new SystemMonitorApp(monitor);
        window.monitorApp = monitorApp;
    }

    loadTextEditor(content) {
        content.innerHTML = `
            <div class="text-editor">
                <div class="editor-toolbar">
                    <button class="toolbar-btn" id="newFileBtn">
                        <i class="fas fa-file"></i> New
                    </button>
                    <button class="toolbar-btn" id="saveFileBtn">
                        <i class="fas fa-save"></i> Save
                    </button>
                    <button class="toolbar-btn" id="openFileBtn">
                        <i class="fas fa-folder-open"></i> Open
                    </button>
                </div>
                <textarea class="editor-content" id="notepadContent" placeholder="Start typing..."></textarea>
            </div>
        `;

        const editor = content.querySelector('.editor-content');
        const saveBtn = content.querySelector('#saveFileBtn');
        const openBtn = content.querySelector('#openFileBtn');
        const newBtn = content.querySelector('#newFileBtn');

        saveBtn.addEventListener('click', () => {
            const fileName = prompt('Enter file name to save:', 'note.txt');
            if (fileName) {
                localStorage.setItem(`os-file-${fileName}`, editor.value);
                window.app.notify(`File ${fileName} saved!`);
            }
        });

        openBtn.addEventListener('click', () => {
            const fileName = prompt('Enter file name to open:');
            if (fileName) {
                const data = localStorage.getItem(`os-file-${fileName}`);
                if (data !== null) {
                    editor.value = data;
                    window.app.notify(`File ${fileName} opened.`);
                } else {
                    alert('File not found!');
                }
            }
        });

        newBtn.addEventListener('click', () => {
            if (confirm('Create new file? Any unsaved changes will be lost.')) {
                editor.value = '';
            }
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
                window.originalPosition = {
                    left: window.element.style.left,
                    top: window.element.style.top
                };
                window.originalSize = {
                    width: window.element.style.width,
                    height: window.element.style.height
                };
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

                if (this.activeWindow === app) {
                    this.activeWindow = null;
                }
            }, 200);
        }
    }

    updateWindowList() {
        this.windowList.innerHTML = '';

        this.windows.forEach((window, app) => {
            if (!window.isMinimized) {
                const button = document.createElement('button');
                button.className = 'window-tab';
                button.innerHTML = `
                    <i class="fas ${this.getApplicationInfo(app).icon}"></i>
                    <span>${this.getApplicationInfo(app).title}</span>
                `;
                button.addEventListener('click', () => this.focusWindow(app));
                this.windowList.appendChild(button);
            }
        });
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
            const app = Array.from(this.windows.entries())
                .find(([_, w]) => w.element === windowElement)?.[0];
            if (app) {
                this.focusWindow(app);
            }
        }
    }

    handleMouseMove(e) {
        if (this.isDragging && this.draggedWindow) {
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;

            // Constrain to desktop bounds
            const maxX = window.innerWidth - this.draggedWindow.element.offsetWidth;
            const maxY = window.innerHeight - this.draggedWindow.element.offsetHeight - 48; // Account for taskbar

            this.draggedWindow.element.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            this.draggedWindow.element.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        }

        if (this.isResizing && this.resizingWindow) {
            const dx = e.clientX - this.resizingWindow.startX;
            const dy = e.clientY - this.resizingWindow.startY;

            const newWidth = Math.max(320, this.resizingWindow.startWidth + dx);
            const newHeight = Math.max(200, this.resizingWindow.startHeight + dy);

            this.resizingWindow.element.style.width = `${newWidth}px`;
            this.resizingWindow.element.style.height = `${newHeight}px`;
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.draggedWindow = null;
        this.isResizing = false;
        this.resizingWindow = null;
    }

    handleKeyboard(e) {
        // Alt+Tab to switch windows
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            this.switchWindow();
        }

        // Ctrl+Alt+Delete for task manager
        if (e.ctrlKey && e.altKey && e.key === 'Delete') {
            e.preventDefault();
            this.openApplication('taskmanager');
        }

        // Ctrl+Shift+T for theme switcher
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            this.showThemeSwitcher();
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            if (this.systemInfoModal.style.display === 'block') {
                this.hideSystemInfo();
            }
            if (this.themeSwitcherModal.style.display === 'block') {
                this.hideThemeSwitcher();
            }
        }
    }

    switchWindow() {
        const windowApps = Array.from(this.windows.keys()).filter(app => !this.windows.get(app).isMinimized);

        if (windowApps.length > 0) {
            const currentIndex = windowApps.indexOf(this.activeWindow);
            const nextIndex = (currentIndex + 1) % windowApps.length;
            this.focusWindow(windowApps[nextIndex]);
        }
    }

    startSystemClock() {
        const updateTime = () => {
            const now = new Date();
            this.systemTime.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            this.systemDate.textContent = now.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
        };

        updateTime();
        setInterval(updateTime, 1000);
    }

    async loadSystemInfo() {
        try {
            if (this.useLocalAuth) {
                this.systemInfo = {
                    os: 'OS Simulator (Local Mode)',
                    version: '1.0.0',
                    browser: navigator.userAgent,
                    resolution: `${window.innerWidth}x${window.innerHeight}`
                };
                return;
            }
            const response = await fetch('api/command.php?system_info=true');
            const result = await response.json();

            if (result.success) {
                this.systemInfo = result.data;
            }
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    }

    shutdown() {
        if (confirm('Are you sure you want to shutdown the OS Simulator?')) {
            document.body.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: white; font-family: monospace;">
                    <div style="text-align: center;">
                        <h2>Shutting down...</h2>
                        <p>Goodbye!</p>
                    </div>
                </div>
            `;
        }
    }

    reboot() {
        if (confirm('Are you sure you want to reboot the OS Simulator?')) {
            document.body.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: white; font-family: monospace;">
                    <div style="text-align: center;">
                        <h2>Rebooting...</h2>
                        <p>Please wait...</p>
                    </div>
                </div>
            `;

            setTimeout(() => {
                location.reload();
            }, 2000);
        }
    }
}

// Terminal Application
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
        this.pathDisplay.textContent = this.currentPath;
    }

    scrollToBottom() {
        this.output.scrollTop = this.output.scrollHeight;
    }
}

// File Manager Application
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

        backBtn.addEventListener('click', () => this.goBack());
        upBtn.addEventListener('click', () => this.goUp());
        refreshBtn.addEventListener('click', () => this.loadDirectory());
        newFolderBtn.addEventListener('click', () => this.createNewFolder());
        newFileBtn.addEventListener('click', () => this.createNewFile());
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
                this.pathInput.value = this.currentPath;
            } else {
                this.showError(result.error || 'Failed to open directory');
            }
        } catch (error) {
            console.error('File manager error:', error);
            this.showError('Network error: ' + error.message);
        }
    }

    displayFiles(files) {
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

    handleFileClick(file) {
        // Single click - could show file properties
        console.log('Selected:', file);
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
        // Simple implementation - just go to parent
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
        this.fileList.innerHTML = `<div style="color: red; padding: 20px; text-align: center;">${message}</div>`;
    }
}

// Task Manager Application
class TaskManagerApp {
    constructor(element) {
        this.element = element;
        this.processTableBody = element.querySelector('#processTableBody');

        this.bindEvents();
        this.loadProcesses();
        this.startAutoRefresh();
    }

    bindEvents() {
        const tabButtons = this.element.querySelectorAll('.tab-btn');
        const refreshBtn = this.element.querySelector('#refreshProcessesBtn');
        const newProcessBtn = this.element.querySelector('#newProcessBtn');
        const killProcessBtn = this.element.querySelector('#killProcessBtn');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        refreshBtn.addEventListener('click', () => this.loadProcesses());
        newProcessBtn.addEventListener('click', () => this.createNewProcess());
        killProcessBtn.addEventListener('click', () => this.killSelectedProcess());
    }

    switchTab(tabName) {
        const tabButtons = this.element.querySelectorAll('.tab-btn');
        const tabPanes = this.element.querySelectorAll('.tab-pane');

        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}Tab`);
        });

        if (tabName === 'memory') {
            this.loadMemoryInfo();
        }
    }

    async loadProcesses() {
        try {
            let result;
            if (window.app && window.app.useLocalAuth) {
                // ── file:// mode: simulate processes ──
                result = {
                    success: true,
                    data: [
                        { PID: 1, NAME: 'System', TYPE: 'sys', STATE: 'running', MEMORY: '128MB', CPU: '2%', TIME: '00:05:12' },
                        { PID: 102, NAME: 'Terminal', TYPE: 'app', STATE: 'running', MEMORY: '45MB', CPU: '1%', TIME: '00:01:23' },
                        { PID: 105, NAME: 'FileManager', TYPE: 'app', STATE: 'running', MEMORY: '60MB', CPU: '0%', TIME: '00:00:45' }
                    ]
                };
            } else {
                const response = await fetch('api/command.php?processes=true');
                result = await response.json();
            }

            if (result.success) {
                this.displayProcesses(result.data);
            } else {
                this.showError(result.error || 'Failed to load processes');
            }
        } catch (error) {
            console.error('Task manager error:', error);
            this.showError('Network error: ' + error.message);
        }
    }

    displayProcesses(processes) {
        this.processTableBody.innerHTML = '';

        processes.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${process.PID}</td>
                <td>${process.NAME}</td>
                <td>${process.TYPE}</td>
                <td>${process.STATE}</td>
                <td>${process.MEMORY}</td>
                <td>${process.CPU}</td>
                <td>${process.TIME}</td>
            `;

            row.addEventListener('click', () => this.selectProcess(row, process.PID));
            this.processTableBody.appendChild(row);
        });
    }

    selectProcess(row, pid) {
        // Remove previous selection
        this.processTableBody.querySelectorAll('tr').forEach(tr => tr.classList.remove('selected'));

        // Add selection to clicked row
        row.classList.add('selected');
        this.selectedPid = pid;
    }

    async loadMemoryInfo() {
        try {
            let result;
            if (window.app && window.app.useLocalAuth) {
                result = {
                    success: true,
                    data: { total: '8GB', used: '3.6GB', free: '4.4GB', usage_percent: 45 }
                };
            } else {
                const response = await fetch('api/command.php?memory=true');
                result = await response.json();
            }

            if (result.success) {
                this.displayMemoryInfo(result.data);
            }
        } catch (error) {
            console.error('Failed to load memory info:', error);
        }
    }

    displayMemoryInfo(memoryData) {
        const totalMemory = document.getElementById('totalMemory');
        const usedMemory = document.getElementById('usedMemory');
        const freeMemory = document.getElementById('freeMemory');
        const memoryUsedBar = document.getElementById('memoryUsedBar');

        totalMemory.textContent = memoryData.total;
        usedMemory.textContent = memoryData.used;
        freeMemory.textContent = memoryData.free;
        memoryUsedBar.style.width = `${memoryData.usage_percent}%`;
    }

    async createNewProcess() {
        const name = prompt('Enter process name:');
        if (name) {
            try {
                if (window.app && window.app.useLocalAuth) {
                    alert('Process started (Simulated)');
                    this.loadProcesses();
                    return;
                }
                const response = await fetch('api/process.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name })
                });

                const result = await response.json();
                if (result.success) {
                    this.loadProcesses();
                } else {
                    alert(result.error);
                }
            } catch (error) {
                alert('Network error: ' + error.message);
            }
        }
    }

    async killSelectedProcess() {
        if (!this.selectedPid) {
            alert('Please select a process first');
            return;
        }

        if (confirm(`Are you sure you want to kill process ${this.selectedPid}?`)) {
            try {
                if (window.app && window.app.useLocalAuth) {
                    alert('Process killed (Simulated)');
                    this.loadProcesses();
                    return;
                }
                const response = await fetch('api/process.php', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pid: this.selectedPid })
                });

                const result = await response.json();
                if (result.success) {
                    this.loadProcesses();
                } else {
                    alert(result.error);
                }
            } catch (error) {
                alert('Network error: ' + error.message);
            }
        }
    }

    startAutoRefresh() {
        setInterval(() => {
            if (this.element.querySelector('#processesTab').classList.contains('active')) {
                this.loadProcesses();
            }
        }, 5000); // Refresh every 5 seconds
    }

    showError(message) {
        this.processTableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">${message}</td></tr>`;
    }
}

// System Monitor Application
class SystemMonitorApp {
    constructor(element) {
        this.element = element;

        this.bindEvents();
        this.loadSystemInfo();
        this.startAutoRefresh();
    }

    bindEvents() {
        // Add any event handlers here
    }

    async loadSystemInfo() {
        try {
            let result;
            if (window.app && window.app.useLocalAuth) {
                // ── file:// mode: simulate system monitor data ──
                result = {
                    success: true,
                    data: {
                        uptime: Math.floor(performance.now() / 1000),
                        processes: 3,
                        current_directory: '/',
                        memory: { data: { usage_percent: 45, total: '8GB', used: '3.6GB', free: '4.4GB' } },
                        filesystem: {
                            data: {
                                usage_percent: 60, root_structure: [
                                    { name: 'bin', type: 'directory', children: [] },
                                    {
                                        name: 'home', type: 'directory', children: [
                                            {
                                                name: 'user', type: 'directory', children: [
                                                    { name: 'Documents', type: 'directory' },
                                                    { name: 'Pictures', type: 'directory' }
                                                ]
                                            }
                                        ]
                                    },
                                    { name: 'tmp', type: 'directory', children: [] }
                                ]
                            }
                        }
                    }
                };
            } else {
                const response = await fetch('api/command.php?system_info=true');
                result = await response.json();
            }

            if (result.success) {
                this.displaySystemInfo(result.data);
            }
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    }

    displaySystemInfo(info) {
        // Update system information
        document.getElementById('uptimeValue').textContent = `${info.uptime} seconds`;
        document.getElementById('processCountValue').textContent = info.processes;
        document.getElementById('currentDirValue').textContent = info.current_directory;

        // Update memory progress
        const memoryData = info.memory.data;
        const memoryProgress = document.getElementById('memoryProgress');
        const memoryProgressText = document.getElementById('memoryProgressText');

        memoryProgress.style.width = `${memoryData.usage_percent}%`;
        memoryProgressText.textContent = `${memoryData.usage_percent}%`;

        // Update disk progress
        const diskData = info.filesystem.data;
        const diskProgress = document.getElementById('diskProgress');
        const diskProgressText = document.getElementById('diskProgressText');

        diskProgress.style.width = `${diskData.usage_percent}%`;
        diskProgressText.textContent = `${diskData.usage_percent}%`;

        // Update filesystem tree
        this.displayFilesystemTree(info.filesystem.data.root_structure);
    }

    displayFilesystemTree(tree) {
        const container = document.getElementById('filesystemTree');
        container.innerHTML = '';

        this.renderTreeNodes(tree, container, 0);
    }

    renderTreeNodes(nodes, container, depth) {
        nodes.forEach(node => {
            const item = document.createElement('div');
            item.className = `tree-item ${node.type}`;
            item.style.paddingLeft = `${depth * 20}px`;
            item.textContent = `${node.type === 'directory' ? '📁' : '📄'} ${node.name}`;
            container.appendChild(item);

            if (node.children && node.children.length > 0) {
                this.renderTreeNodes(node.children, container, depth + 1);
            }
        });
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadSystemInfo();
        }, 3000); // Refresh every 3 seconds
    }
}

// Calculator Application
class CalculatorApp {
    constructor(element) {
        this.element = element;
        this.display = element.querySelector('#calcInput');
        this.bindEvents();
    }

    bindEvents() {
        this.element.querySelectorAll('.num').forEach(btn => {
            btn.addEventListener('click', () => this.appendNumber(btn.textContent));
        });
        this.element.querySelectorAll('.op').forEach(btn => {
            btn.addEventListener('click', () => this.appendOperator(btn.textContent));
        });
        this.element.querySelector('.equals').addEventListener('click', () => this.calculate());
        this.element.querySelector('.clear').addEventListener('click', () => this.clear());
        this.element.querySelector('.back').addEventListener('click', () => this.backspace());
    }

    appendNumber(num) {
        if (this.display.value === '0') this.display.value = num;
        else this.display.value += num;
    }

    appendOperator(op) {
        this.display.value += ` ${op} `;
    }

    calculate() {
        try {
            this.display.value = eval(this.display.value);
        } catch (e) {
            this.display.value = 'Error';
        }
    }

    clear() {
        this.display.value = '0';
    }

    backspace() {
        this.display.value = this.display.value.slice(0, -1) || '0';
    }
}

// Browser Application
class BrowserApp {
    constructor(element) {
        this.element = element;
        this.iframe = element.querySelector('#browserIframe');
        this.urlInput = element.querySelector('#browserUrl');
        this.bindEvents();
    }

    bindEvents() {
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                let url = this.urlInput.value;
                if (!url.startsWith('http')) url = 'https://' + url;
                this.iframe.src = url;
            }
        });
        this.element.querySelector('#browserRefreshBtn').addEventListener('click', () => {
            this.iframe.src = this.iframe.src;
        });
    }
}

// Paint Application
class PaintApp {
    constructor(element) {
        this.element = element;
        this.canvas = element.querySelector('#paintCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.colorInput = element.querySelector('#paintColor');
        this.brushInput = element.querySelector('#paintBrush');
        this.clearBtn = element.querySelector('#paintClear');

        this.saveBtn = element.querySelector('#paintSave');

        this.drawing = false;
        this.init();
    }

    init() {
        this.canvas.width = 760;
        this.canvas.height = 500;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        this.clearBtn.addEventListener('click', () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        });
        this.saveBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'drawing.png';
            link.href = this.canvas.toDataURL();
            link.click();
            window.app.notify('Drawing saved to your computer');
        });
    }

    startDrawing(e) {
        this.drawing = true;
        this.draw(e);
    }

    draw(e) {
        if (!this.drawing) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.ctx.lineWidth = this.brushInput.value;
        this.ctx.strokeStyle = this.colorInput.value;

        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    stopDrawing() {
        this.drawing = false;
        this.ctx.beginPath();
    }
}

// Task Manager Application
class TaskManagerApp {
    constructor(element) {
        this.element = element;
        this.processList = element.querySelector('#tmProcessList');
        this.cpuBar = element.querySelector('#tmCpu');
        this.ramBar = element.querySelector('#tmRam');
        this.cpuText = element.querySelector('#tmCpuText');
        this.ramText = element.querySelector('#tmRamText');
        this.update();
        this.interval = setInterval(() => this.update(), 2000);

        // Cleanup interval when window is closed
        const winId = Array.from(window.app.windows.keys()).find(id => window.app.windows.get(id).element.contains(element));
        if (winId) {
            const originalClose = window.app.closeWindow;
            window.app.closeWindow = (id) => {
                if (id === winId) clearInterval(this.interval);
                originalClose.call(window.app, id);
            }
        }
    }

    update() {
        const cpu = Math.floor(Math.random() * 50) + 10;
        const ramUsed = (Math.random() * 2 + 3).toFixed(1);

        this.cpuBar.style.width = `${cpu}%`;
        this.cpuText.textContent = `${cpu}%`;
        this.ramBar.style.width = `${(ramUsed / 16 * 100).toFixed(0)}%`;
        this.ramText.textContent = `${ramUsed} GB / 16 GB`;

        this.processList.innerHTML = '';
        window.app.windows.forEach((win, app) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${window.app.getApplicationInfo(app).title}</td>
                <td>${Math.floor(Math.random() * 9000) + 1000}</td>
                <td>Running</td>
                <td><button class="tm-end-btn">End Task</button></td>
            `;
            row.querySelector('.tm-end-btn').addEventListener('click', () => {
                window.app.closeWindow(app);
                this.update();
            });
            this.processList.appendChild(row);
        });
    }
}

// Simulated File System Class
class FileSystem {
    constructor() {
        this.storageKey = 'os-sim-fs';
        this.initialize();
    }

    initialize() {
        if (!localStorage.getItem(this.storageKey)) {
            const initialFS = {
                '/': { type: 'dir', children: ['home', 'temp', 'Windows', 'Program Files'] },
                '/Windows': { type: 'dir', children: ['System32'] },
                '/Windows/System32': { type: 'dir', children: [] },
                '/Program Files': { type: 'dir', children: [] },
                '/home': { type: 'dir', children: ['user'] },
                '/home/user': { type: 'dir', children: ['Documents', 'Pictures', 'Desktop', 'Downloads'] },
                '/home/user/Documents': { type: 'dir', children: ['Welcome.txt'] },
                '/home/user/Documents/Welcome.txt': { type: 'file', content: 'Welcome to the OS Simulator!' },
                '/home/user/Pictures': { type: 'dir', children: [] },
                '/home/user/Desktop': { type: 'dir', children: [] },
                '/home/user/Downloads': { type: 'dir', children: [] },
                '/recycle-bin': { type: 'dir', children: [] }
            };
            localStorage.setItem(this.storageKey, JSON.stringify(initialFS));
        }
        this.data = JSON.parse(localStorage.getItem(this.storageKey));
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    list(path) {
        const item = this.data[path];
        if (!item || item.type !== 'dir') return [];
        return item.children.map(name => {
            const childPath = path === '/' ? `/${name}` : `${path}/${name}`;
            return { name, type: this.data[childPath].type === 'dir' ? 'directory' : 'file', path: childPath };
        });
    }

    createDir(parentPath, name) {
        const fullPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
        if (this.data[fullPath]) return false;
        this.data[parentPath].children.push(name);
        this.data[fullPath] = { type: 'dir', children: [] };
        this.save();
        return true;
    }

    createFile(parentPath, name, content = '') {
        const fullPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
        if (this.data[fullPath]) return false;
        this.data[parentPath].children.push(name);
        this.data[fullPath] = { type: 'file', content };
        this.save();
        return true;
    }

    delete(path) {
        if (path === '/' || path.startsWith('/home')) return; // Protected
        const parts = path.split('/');
        const name = parts.pop();
        const parentPath = parts.join('/') || '/';

        // Move to recycle bin
        const recyclePath = `/recycle-bin/${name}`;
        this.data['/recycle-bin'].children.push(name);
        this.data[recyclePath] = this.data[path];

        // Remove from parent
        this.data[parentPath].children = this.data[parentPath].children.filter(n => n !== name);
        delete this.data[path];
        this.save();
    }
}

// Initialize the OS Simulator
document.addEventListener('DOMContentLoaded', () => {
    new OSSimulatorGUI();
});
