import FileSystem from './core/FileSystem.js';
import TerminalApp from './apps/TerminalApp.js';
import FileManagerApp from './apps/FileManagerApp.js';
import TaskManagerApp from './apps/TaskManagerApp.js';
import SystemMonitorApp from './apps/SystemMonitorApp.js';
import CalculatorApp from './apps/CalculatorApp.js';
import BrowserApp from './apps/BrowserApp.js';
import PaintApp from './apps/PaintApp.js';
import XamppApp from './apps/XamppApp.js';
import MySQLApp from './apps/MySQLApp.js?v=2';

// ─────────────────────────────────────────────
// Template cache: load HTML snippets on demand
// ─────────────────────────────────────────────
const templateCache = new Map();

async function loadTemplate(name) {
    if (templateCache.has(name)) return templateCache.get(name);
    const response = await fetch(`templates/${name}.html`);
    if (!response.ok) throw new Error(`Template not found: templates/${name}.html`);
    const html = await response.text();
    templateCache.set(name, html);
    return html;
}

// ─────────────────────────────────────────────
// Main OS Application Class
// ─────────────────────────────────────────────
class OSSimulatorGUI {
    constructor() {
        // Core state
        this.windows = new Map();
        this.activeWindow = null;
        this.windowZIndex = 100;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isResizing = false;
        this.resizingWindow = null;

        // Theme
        this.currentTheme = 'default';
        this.autoThemeSwitch = false;
        this.smoothTransitions = true;

        // Auth mode
        this.useLocalAuth =
            window.location.protocol === 'file:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            !window.location.hostname;

        this._desktopVisible = true;

        // Expose globally for apps that need it
        window.app = this;

        this._init();
    }

    _init() {
        this._cacheElements();
        this._initTheme();
        this._loadCurrentUser();
        this._bindEvents();
        this._startClock();
        this._initFileSystem();
        this._initAudio();
        this._initNotifications();

        // Hide boot screen
        setTimeout(() => {
            const boot = document.getElementById('bootScreen');
            if (boot) boot.classList.add('fade-out');
            this.loadSession(); // Load session after boot
        }, 2000);
    }

    // ─── DOM References ───────────────────────
    _cacheElements() {
        this.desktop = document.getElementById('desktop');
        this.startButton = document.getElementById('startButton');
        this.startMenu = document.getElementById('startMenu');
        this.windowList = document.getElementById('windowList');
        this.windowsContainer = document.getElementById('windowsContainer');
        this.systemTime = document.getElementById('systemTime');
        this.systemDate = document.getElementById('systemDate');
        this.powerBtn = document.getElementById('powerBtn');
        this.powerMenu = document.getElementById('powerMenu');
        this.contextMenu = document.getElementById('contextMenu');
        this.notificationsEl = document.getElementById('notifications');
        this.themeSwitcherModal = document.getElementById('themeSwitcherModal');
        this.systemInfoModal = document.getElementById('systemInfoModal');
        this.userManagementModal = document.getElementById('userManagementModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.userMenuBtn = document.getElementById('userMenuBtn');

        // Quick Settings
        this.quickSettings = document.getElementById('quickSettings');
        this.trayNetwork = document.getElementById('trayNetwork');
        this.trayVolume = document.getElementById('trayVolume');
        this.trayBattery = document.getElementById('trayBattery');
    }

    // ─── File System ──────────────────────────
    _initFileSystem() {
        this.fs = new FileSystem();
    }

    // ─── Audio ────────────────────────────────
    _initAudio() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
            this.audioCtx = null;
        }
    }

    playSound(type) {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const t = this.audioCtx.currentTime;
        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.exponentialRampToValueAtTime(1, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.1);
            osc.start(); osc.stop(t + 0.1);
        } else if (type === 'notify') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.exponentialRampToValueAtTime(440, t + 0.2);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            osc.start(); osc.stop(t + 0.3);
        }
    }

    // ─── Notifications ────────────────────────
    _initNotifications() {
        this.notify = (message, duration = 3000) => {
            this.playSound('notify');
            const el = document.createElement('div');
            el.className = 'notification';
            el.textContent = message;
            this.notificationsEl?.appendChild(el);
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.3s';
                setTimeout(() => el.remove(), 300);
            }, duration);
        };
    }

    // ─── Theme ────────────────────────────────
    _initTheme() {
        const saved = localStorage.getItem('os-simulator-theme') || 'default';
        this.switchTheme(saved);
    }

    switchTheme(theme) {
        this.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('os-simulator-theme', theme);
    }

    showThemeSwitcher() { if (this.themeSwitcherModal) this.themeSwitcherModal.style.display = 'flex'; }
    hideThemeSwitcher() { if (this.themeSwitcherModal) this.themeSwitcherModal.style.display = 'none'; }
    showUserManagement() { if (this.userManagementModal) this.userManagementModal.style.display = 'flex'; }
    hideUserManagement() { if (this.userManagementModal) this.userManagementModal.style.display = 'none'; }

    // ─── User ─────────────────────────────────
    async _loadCurrentUser() {
        try {
            let user;
            if (this.useLocalAuth) {
                const raw = sessionStorage.getItem('os-sim-user');
                user = raw ? JSON.parse(raw) : { username: 'user', role: 'admin' };
            } else {
                const res = await fetch('api/auth.php?action=current');
                const data = await res.json();
                user = data.success ? data.user : { username: 'user', role: 'admin' };
            }

            const display = document.getElementById('displayUsername');
            if (display) display.textContent = user.username;
            this.currentUserData = user;
        } catch (err) {
            console.warn('Failed to load user:', err);
        }
    }

    // ─── Event Binding ────────────────────────
    _bindEvents() {
        // Start menu toggle
        this.startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleStartMenu();
        });

        // Click-outside to close menus
        document.addEventListener('click', (e) => {
            if (!this.startMenu.contains(e.target) && !this.startButton.contains(e.target)) {
                this.startMenu.classList.remove('show');
            }
            if (this.powerMenu && !this.powerBtn.contains(e.target)) {
                this.powerMenu.classList.remove('show');
            }
            if (this.contextMenu) {
                this.contextMenu.style.display = 'none';
            }
            if (this.quickSettings && !this.trayNetwork.contains(e.target) && !this.trayVolume.contains(e.target) && !this.trayBattery.contains(e.target) && !this.quickSettings.contains(e.target)) {
                this.quickSettings.classList.remove('show');
            }
        });

        // App launchers (menu items, desktop icons, quick launch)
        document.querySelectorAll('[data-app]').forEach(el => {
            el.addEventListener('click', (e) => {
                const app = e.currentTarget.dataset.app;
                this.openApplication(app);
                this.startMenu.classList.remove('show');
            });
        });

        // Tray / Quick Settings Toggle
        [this.trayNetwork, this.trayVolume, this.trayBattery].forEach(btn => {
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.quickSettings?.classList.toggle('show');
            });
        });

        // Quick Settings Interactions
        document.querySelectorAll('.qs-item').forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('active');
                const label = item.querySelector('span').textContent;
                this.notify(`${label} ${item.classList.contains('active') ? 'On' : 'Off'}`);
            });
        });

        document.getElementById('volumeSlider')?.addEventListener('input', (e) => {
            const vol = e.target.value;
            this.notify(`Volume: ${vol}%`, 1000);
            if (vol == 0) this.trayVolume.querySelector('i').className = 'fas fa-volume-mute';
            else if (vol < 50) this.trayVolume.querySelector('i').className = 'fas fa-volume-down';
            else this.trayVolume.querySelector('i').className = 'fas fa-volume-up';
        });

        document.getElementById('brightnessSlider')?.addEventListener('input', (e) => {
            document.body.style.filter = `brightness(${(parseInt(e.target.value) + 50) / 100})`;
        });

        document.getElementById('qsSettingsBtn')?.addEventListener('click', () => {
            this.showThemeSwitcher();
            this.quickSettings.classList.remove('show');
        });

        // Power menu
        this.powerBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.powerMenu.classList.toggle('show');
        });

        document.getElementById('shutdownBtn')?.addEventListener('click', () => this.shutdown());
        document.getElementById('rebootBtn')?.addEventListener('click', () => this.reboot());

        // Settings (theme switcher)
        this.settingsBtn?.addEventListener('click', () => this.showThemeSwitcher());

        // User management
        this.userMenuBtn?.addEventListener('click', () => this.showUserManagement());

        // Modal closes
        this.themeSwitcherModal?.querySelector('.close')?.addEventListener('click', () => this.hideThemeSwitcher());
        this.userManagementModal?.querySelector('.close')?.addEventListener('click', () => this.hideUserManagement());
        this.systemInfoModal?.querySelector('.close')?.addEventListener('click', () => {
            this.systemInfoModal.style.display = 'none';
        });

        // Modal backdrop clicks
        [this.themeSwitcherModal, this.userManagementModal, this.systemInfoModal].forEach(modal => {
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        });

        // Theme options
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => this.switchTheme(opt.dataset.theme));
        });

        // Start menu search
        document.getElementById('startMenuSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.start-menu .menu-item').forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
            });
        });

        // Context menu
        this.desktop.addEventListener('contextmenu', (e) => {
            if (e.target === this.desktop || e.target.classList.contains('desktop-icons')) {
                e.preventDefault();
                this._showContextMenu(e.clientX, e.clientY);
            }
        });

        document.getElementById('ctxRefresh')?.addEventListener('click', () => {
            this.playSound('click');
            this.notify('Desktop refreshed');
        });

        document.getElementById('ctxPersonalize')?.addEventListener('click', () => {
            this.showThemeSwitcher();
        });

        // Show desktop
        document.getElementById('showDesktopBtn')?.addEventListener('click', () => {
            this.windows.forEach((_, app) => this.minimizeWindow(app));
        });

        // Window drag & resize
        this.windowsContainer.addEventListener('mousedown', (e) => {
            const winEl = e.target.closest('.window');
            if (winEl) {
                const entry = [...this.windows.entries()].find(([, w]) => w.element === winEl);
                if (entry) this.focusWindow(entry[0]);
            }
        });
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
        document.addEventListener('mouseup', () => this._onMouseUp());

        // Keyboard shortcuts
        this._metaDown = false;
        this._metaCombinationUsed = false;

        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            // Try to prevent host OS Start Menu (limited browser support but worth trying)
            if (key === 'meta' || key === 'os') {
                e.preventDefault();
            }

            // Fallback for Windows Key (Ctrl + Escape is standard Windows fallback)
            if (e.ctrlKey && key === 'escape') {
                e.preventDefault();
                this.toggleStartMenu();
                return;
            }

            // Check for Meta combinations
            if (e.metaKey || (e.ctrlKey && e.altKey)) {
                if (e.metaKey) {
                    if (key !== 'meta' && key !== 'os') {
                        this._metaCombinationUsed = true;
                    }

                    // App Launchers & System Dialogs
                    if (key === 's' || key === 'q') { e.preventDefault(); this.toggleStartMenu(true); return; }
                    if (key === 'e') { e.preventDefault(); this.openApplication('filemanager'); return; }
                    if (key === 'r') { e.preventDefault(); this.openApplication('terminal'); return; }
                    if (key === 'd') {
                        e.preventDefault();
                        const anyVisible = [...this.windows.values()].some(w => !w.isMinimized);
                        if (anyVisible) {
                            this.windows.forEach((_, app) => this.minimizeWindow(app));
                        } else {
                            this.windows.forEach((_, app) => this._restoreWindow(app));
                        }
                        return;
                    }
                    if (key === 'i') { e.preventDefault(); this.showThemeSwitcher(); return; }
                    if (key === 'n') { e.preventDefault(); this.notify('Calendar & Notifications'); return; }
                    if (key === 'w') { e.preventDefault(); this.notify('Widgets Panel'); return; }
                    if (key === 'z') { e.preventDefault(); this.notify('Snap Layouts'); return; }
                    if (key === 'c') { e.preventDefault(); this.notify('Teams Chat'); return; }
                    if (key === 'g') { e.preventDefault(); this.notify('Game Bar'); return; }
                    if (key === 'k') { e.preventDefault(); this.notify('Cast Settings'); return; }
                    if (key === 'h') { e.preventDefault(); this.notify('Voice Typing'); return; }
                    if (key === 'v') { e.preventDefault(); this.notify('Clipboard History'); return; }
                    if (key === 'm') {
                        e.preventDefault();
                        if (e.shiftKey) this.windows.forEach((_, app) => this._restoreWindow(app));
                        else this.windows.forEach((_, app) => this.minimizeWindow(app));
                        return;
                    }
                    if (key === 't') { e.preventDefault(); this.notify('Cycling Taskbar apps...'); return; }
                    if (key === 'p') { e.preventDefault(); this.notify('Project Settings'); return; }
                    if (key === 'q') { e.preventDefault(); this.toggleStartMenu(true); return; }
                    if (key === 'y') { e.preventDefault(); this.notify('Reality mixed: Off'); return; }
                    if (key === 'a') { e.preventDefault(); this.notify('Quick Settings'); return; }
                    if (key === 'u') { e.preventDefault(); this.showThemeSwitcher(); return; }
                    if (key === 'x') { e.preventDefault(); this.toggleStartMenu(); return; }
                    if (key === 'l') { e.preventDefault(); this.lockScreen(); return; }
                    if (key === '.') { e.preventDefault(); this.notify('Emoji Picker'); return; }
                    if (key === ',') { e.preventDefault(); this.notify('Desktop Peek'); return; }
                    if (key === 'printscreen' || key === 'prtscn') { e.preventDefault(); this.takeScreenshot(); return; }
                    if (key === 'tab') { e.preventDefault(); this.openApplication('taskmanager'); return; }
                    if (key === 'home') { e.preventDefault(); this.minimizeAllButActive(); return; }
                    if (key === 'pause' || key === '/') { e.preventDefault(); if (this.systemInfoModal) this.systemInfoModal.style.display = 'flex'; return; }

                    // Graphics Driver Restart (Win + Ctrl + Shift + B)
                    if (e.ctrlKey && e.shiftKey && key === 'b') {
                        e.preventDefault();
                        this.playSound('click');
                        document.body.style.opacity = '0';
                        setTimeout(() => {
                            document.body.style.opacity = '1';
                            this.notify('Graphics driver restarted successfully');
                        }, 200);
                        return;
                    }

                    if (key === '=' || key === '+') { e.preventDefault(); this.notify('Magnifier: Zoom In'); return; }
                    if (key === '-' || key === '_') { e.preventDefault(); this.notify('Magnifier: Zoom Out'); return; }
                    if (key === 'v') { e.preventDefault(); this.notify('Clipboard History'); return; }
                    if (key === 'h') { e.preventDefault(); this.notify('Voice Typing...'); return; }

                    // Windows 11 Alt Snap
                    if (e.altKey) {
                        if (key === 'arrowup') { e.preventDefault(); if (this.activeWindow) this.snapWindow(this.activeWindow, 'top'); return; }
                        if (key === 'arrowdown') { e.preventDefault(); if (this.activeWindow) this.snapWindow(this.activeWindow, 'bottom'); return; }
                    }

                    // Numbers (Pinned Apps)
                    if (key >= '1' && key <= '9') {
                        e.preventDefault();
                        const pins = document.querySelectorAll('.quick-launch-btn');
                        const index = parseInt(key) - 1;
                        if (pins[index]) pins[index].click();
                        return;
                    }

                    // Window Snapping
                    if (this.activeWindow) {
                        if (key === 'arrowleft') { e.preventDefault(); this.snapWindow(this.activeWindow, 'left'); return; }
                        if (key === 'arrowright') { e.preventDefault(); this.snapWindow(this.activeWindow, 'right'); return; }
                        if (key === 'arrowup') { e.preventDefault(); this.snapWindow(this.activeWindow, 'maximize'); return; }
                        if (key === 'arrowdown') { e.preventDefault(); this.snapWindow(this.activeWindow, 'minimize'); return; }
                    }

                    // Virtual Desktop Stubs
                    if (e.ctrlKey) {
                        if (key === 'd') { e.preventDefault(); this.notify('New Virtual Desktop created'); return; }
                        if (key === 'arrowleft' || key === 'arrowright') { e.preventDefault(); this.notify('Switched Virtual Desktop'); return; }
                        if (key === 'f4') { e.preventDefault(); this.notify('Virtual Desktop closed'); return; }
                    }

                    // Snip & Sketch
                    if (e.shiftKey && key === 's') { e.preventDefault(); this.notify('Snip & Sketch: Select area'); return; }
                    if (e.shiftKey && key === 'arrowup') {
                        e.preventDefault();
                        if (this.activeWindow) {
                            const win = this.windows.get(this.activeWindow).element;
                            win.style.top = '0px';
                            win.style.height = `${window.innerHeight - 54}px`;
                        }
                        return;
                    }
                }
            }

            // Standard Window Controls
            if (e.altKey && key === 'tab') { e.preventDefault(); this._switchWindow(); }
            if (e.altKey && key === 'f4') {
                e.preventDefault();
                if (this.activeWindow) this.closeWindow(this.activeWindow);
            }
            if (e.altKey && key === 'f2') {
                e.preventDefault();
                const cmd = prompt('Run command:');
                if (cmd) this.openApplication('terminal');
            }
            if (e.ctrlKey && e.altKey && key === 't') {
                e.preventDefault();
                this.openApplication('terminal');
            }
            if (e.ctrlKey && key === 'q') {
                e.preventDefault();
                if (this.activeWindow) this.closeWindow(this.activeWindow);
            }
            // Standard close shortcut
            if (e.ctrlKey && key === 'w') {
                e.preventDefault();
                if (this.activeWindow) this.closeWindow(this.activeWindow);
            }
            if (e.ctrlKey && e.shiftKey && key === 'escape') {
                e.preventDefault();
                this.openApplication('taskmanager');
            }

            // Fallback for Lock (since Win+L is blocked by Host OS)
            if (e.altKey && key === 'l') {
                e.preventDefault();
                this.lockScreen();
            }

            // Fallback for Desktop (Win+D is often blocked)
            if (e.altKey && key === 'd') {
                e.preventDefault();
                const anyVisible = [...this.windows.values()].some(w => !w.isMinimized);
                if (anyVisible) {
                    this.windows.forEach((_, app) => this.minimizeWindow(app));
                } else {
                    this.windows.forEach((_, app) => this._restoreWindow(app));
                }
            }

            // Fallback for Explorer (Win+E)
            if (e.altKey && key === 'e') {
                e.preventDefault();
                this.openApplication('filemanager');
            }

            // Function Keys
            if (key === 'f1') {
                e.preventDefault();
                if (this.systemInfoModal) this.systemInfoModal.style.display = 'flex';
            }
            if (key === 'f2') {
                e.preventDefault();
                this.notify('Rename action triggered (F2)');
            }
            if (key === 'f3') {
                e.preventDefault();
                this.toggleStartMenu(true); // Open search
            }
            if (key === 'f5') {
                e.preventDefault();
                this.notify('Desktop refreshed');
                this.playSound('click');
            }
            if (key === 'f11') {
                e.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {
                        this.notify('Fullscreen blocked by browser');
                    });
                    this.notify('Entered Fullscreen');
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                        this.notify('Exited Fullscreen');
                    }
                }
            }
            if (e.altKey && key === ' ') {
                e.preventDefault();
                this.notify('Window Menu (Alt + Space)');
            }
            if (e.ctrlKey && e.altKey && key === 'delete') { e.preventDefault(); this.openApplication('taskmanager'); }
            if (key === 'escape') {
                this.hideThemeSwitcher();
                this.hideUserManagement();
                this.startMenu?.classList.remove('show');
                if (this.contextMenu) this.contextMenu.style.display = 'none';
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key === 'meta' || key === 'os') {
                e.preventDefault();
                if (!this._metaCombinationUsed) {
                    this.toggleStartMenu();
                }
                this._metaCombinationUsed = false;
            }
            if (key === 'printscreen' && e.metaKey) {
                this.takeScreenshot();
            }
        });
    }

    // ─── Advanced Window Actions ───────────────
    snapWindow(app, position) {
        const win = this.windows.get(app);
        if (!win) return;
        if (win.isMinimized) this._restoreWindow(app);

        win.isMaximized = false;
        win.element.classList.remove('maximized');

        const taskbarHeight = 54;
        const height = window.innerHeight - taskbarHeight;

        if (position === 'left') {
            win.element.style.top = '0px';
            win.element.style.left = '0px';
            win.element.style.width = '50%';
            win.element.style.height = `${height}px`;
        } else if (position === 'right') {
            win.element.style.top = '0px';
            win.element.style.left = '50%';
            win.element.style.width = '50%';
            win.element.style.height = `${height}px`;
        } else if (position === 'maximize') {
            this._toggleMaximize(app);
        } else if (position === 'minimize') {
            this.minimizeWindow(app);
        } else if (position === 'top') {
            win.element.style.top = '0px';
            win.element.style.left = '0px';
            win.element.style.width = '100%';
            win.element.style.height = `${height / 2}px`;
        } else if (position === 'bottom') {
            win.element.style.top = `${height / 2}px`;
            win.element.style.left = '0px';
            win.element.style.width = '100%';
            win.element.style.height = `${height / 2}px`;
        }
    }

    minimizeAllButActive() {
        if (!this.activeWindow) {
            this.windows.forEach((_, app) => this.minimizeWindow(app));
            return;
        }
        this.windows.forEach((_, app) => {
            if (app !== this.activeWindow) this.minimizeWindow(app);
        });
    }

    takeScreenshot() {
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:white;z-index:10000;pointer-events:none;transition:opacity 0.5s;';
        document.body.appendChild(flash);
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 500);
        }, 50);
        this.playSound('notify');
        this.notify('Screenshot saved to Pictures/Screenshots');
    }

    lockScreen() {
        this.notify('Locking system...');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    }

    toggleStartMenu(forceSearch = false) {
        if (!this.startMenu) return;

        const isShowing = this.startMenu.classList.contains('show');
        if (isShowing && !forceSearch) {
            this.startMenu.classList.remove('show');
        } else {
            this.startMenu.classList.add('show');
            // Focus search input
            setTimeout(() => {
                const searchInput = document.getElementById('startMenuSearch');
                if (searchInput) {
                    searchInput.focus();
                    if (forceSearch) searchInput.select();
                }
            }, 50);
        }
    }

    _showContextMenu(x, y) {
        if (!this.contextMenu) return;
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
    }

    // ─── Clock ────────────────────────────────
    _startClock() {
        const tick = () => {
            const now = new Date();
            if (this.systemTime) {
                this.systemTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            }
            if (this.systemDate) {
                this.systemDate.textContent = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
            }
        };
        tick();
        setInterval(tick, 1000);
    }

    // ─── Window Management ────────────────────
    openApplication(app, options = {}) {
        if (this.windows.has(app)) {
            const win = this.windows.get(app);
            if (win.isMinimized) this._restoreWindow(app);
            else this.focusWindow(app);
            if (options.refresh && win.instance?.refreshFromXampp) {
                win.instance.refreshFromXampp();
            }
            return;
        }
        const win = this._createWindowChrome(app, options);
        this.windows.set(app, win);
        this.windowsContainer.appendChild(win.element);
        this._updateTaskbar();
        this._loadAppContent(app, win, options);
        this.notify(`Opened ${this._getAppMeta(app).title}`);
        this.saveSession();
    }

    getApplicationInfo(app) {
        return this._getAppMeta(app);
    }

    openFile(path) {
        const ext = path.split('.').pop().toLowerCase();
        const content = this.fs.readFile(path);

        if (ext === 'txt' || ext === 'md') {
            this.openApplication('editor', { filePath: path, content: content });
        } else if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
            this.openApplication('paint', { filePath: path, content: content });
        } else {
            this.notify(`No app associated with .${ext} files`);
        }
    }

    saveSession() {
        const session = [];
        this.windows.forEach((win, app) => {
            session.push({
                app,
                zIndex: win.element.style.zIndex,
                left: win.element.style.left,
                top: win.element.style.top,
                width: win.element.style.width,
                height: win.element.style.height,
                isMaximized: win.isMaximized,
                isMinimized: win.isMinimized
            });
        });
        localStorage.setItem('os-sim-session', JSON.stringify(session));
    }

    loadSession() {
        const saved = localStorage.getItem('os-sim-session');
        if (!saved) return;
        try {
            const session = JSON.parse(saved);
            session.forEach(s => {
                this.openApplication(s.app);
                const win = this.windows.get(s.app);
                if (win) {
                    win.element.style.left = s.left;
                    win.element.style.top = s.top;
                    win.element.style.width = s.width;
                    win.element.style.height = s.height;
                    win.element.style.zIndex = s.zIndex;
                    if (s.isMaximized) this._toggleMaximize(s.app);
                    if (s.isMinimized) {
                        win.isMinimized = true;
                        win.element.style.display = 'none';
                    }
                }
            });
            this._updateTaskbar();
        } catch (e) { console.error('Failed to load session:', e); }
    }

    _getAppMeta(app) {
        const meta = {
            terminal: { title: 'Terminal', icon: 'fa-terminal', width: '700px', height: '500px' },
            filemanager: { title: 'File Manager', icon: 'fa-folder', width: '820px', height: '620px' },
            taskmanager: { title: 'Task Manager', icon: 'fa-tasks', width: '900px', height: '600px' },
            monitor: { title: 'System Monitor', icon: 'fa-chart-line', width: '800px', height: '600px' },
            editor: { title: 'Notepad', icon: 'fa-edit', width: '700px', height: '520px' },
            calculator: { title: 'Calculator', icon: 'fa-calculator', width: '340px', height: '500px' },
            browser: { title: 'Web Browser', icon: 'fa-globe', width: '1000px', height: '700px' },
            paint: { title: 'Paint', icon: 'fa-paint-brush', width: '820px', height: '640px' },
            recyclebin: { title: 'Recycle Bin', icon: 'fa-trash', width: '800px', height: '600px' },
            xampp: { title: 'XAMPP Control Panel', icon: 'fa-server', width: '1050px', height: '680px' },
            mysql: { title: 'phpMyAdmin', icon: 'fa-database', width: '1200px', height: '780px' },
        };
        return meta[app] || { title: app, icon: 'fa-window-maximize', width: '600px', height: '400px' };
    }

    _createWindowChrome(app, options = {}) {
        const tpl = document.getElementById('windowTemplate');
        const element = tpl.content.cloneNode(true).querySelector('.window');
        const meta = this._getAppMeta(app);

        element.querySelector('.window-name').textContent = options.filePath ? `${options.filePath.split('/').pop()} - ${meta.title}` : meta.title;
        element.querySelector('.window-icon').className = `window-icon fas ${meta.icon}`;

        // Size & position
        const offset = this.windows.size * 30;
        element.style.left = `${120 + offset}px`;
        element.style.top = `${80 + offset}px`;
        element.style.width = meta.width;
        element.style.height = meta.height;
        element.style.zIndex = ++this.windowZIndex;

        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'window-resize-handle';
        element.appendChild(resizeHandle);
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isResizing = true;
            this.resizingWindow = {
                element,
                startX: e.clientX, startY: e.clientY,
                startW: parseInt(getComputedStyle(element).width),
                startH: parseInt(getComputedStyle(element).height),
            };
        });

        // Controls
        element.querySelector('.minimize').addEventListener('click', () => this.minimizeWindow(app));
        element.querySelector('.maximize').addEventListener('click', () => this._toggleMaximize(app));
        element.querySelector('.close').addEventListener('click', () => this.closeWindow(app));

        // Drag
        element.querySelector('.window-header').addEventListener('mousedown', (e) => this._startDrag(e, app));

        return { element, app, isMinimized: false, isMaximized: false, origPos: null, origSize: null };
    }

    async _loadAppContent(app, win, options = {}) {
        const content = win.element.querySelector('.window-content');
        content.style.padding = '0'; // apps handle their own padding

        const inject = async (name, AppClass) => {
            try {
                const html = await loadTemplate(name);
                content.innerHTML = html;
                if (AppClass) {
                    const instance = new AppClass(content, options);
                    win.instance = instance;
                }
            } catch (err) {
                content.innerHTML = `<div style="padding:20px;color:red;">Failed to load ${name}: ${err.message}</div>`;
                console.error(err);
            }
        };

        switch (app) {
            case 'terminal': await inject('terminal', TerminalApp); break;
            case 'filemanager': await inject('filemanager', FileManagerApp); break;
            case 'taskmanager': await inject('taskmanager', TaskManagerApp); break;
            case 'monitor': await inject('monitor', SystemMonitorApp); break;
            case 'calculator': await inject('calculator', CalculatorApp); break;
            case 'browser': await inject('browser', BrowserApp); break;
            case 'paint': await inject('paint', PaintApp); break;
            case 'xampp': await inject('xampp', XamppApp); break;
            case 'mysql': await inject('mysql', MySQLApp); break;
            case 'editor': await this._loadEditor(content); break;
            case 'recyclebin':
                try {
                    const html = await loadTemplate('filemanager');
                    content.innerHTML = html;
                    const fm = new FileManagerApp(content);
                    fm.currentPath = '/recycle-bin';
                    fm.loadDirectory?.();
                } catch (err) { console.error(err); }
                break;
        }
    }

    async _loadEditor(content) {
        try {
            const html = await loadTemplate('editor');
            content.innerHTML = html;
        } catch {
            content.innerHTML = `
                <div class="text-editor">
                    <div class="editor-toolbar">
                        <button class="toolbar-btn" id="newFileBtn"><i class="fas fa-file"></i> New</button>
                        <button class="toolbar-btn" id="saveFileBtn"><i class="fas fa-save"></i> Save</button>
                        <button class="toolbar-btn" id="openFileBtn"><i class="fas fa-folder-open"></i> Open</button>
                    </div>
                    <textarea class="editor-content" id="notepadContent" placeholder="Start typing..."></textarea>
                </div>`;
        }

        const editor = content.querySelector('.editor-content');
        content.querySelector('#saveFileBtn')?.addEventListener('click', () => {
            const name = prompt('Save as:', 'note.txt');
            if (name) { localStorage.setItem(`os-file-${name}`, editor.value); this.notify(`Saved: ${name}`); }
        });
        content.querySelector('#openFileBtn')?.addEventListener('click', () => {
            const name = prompt('Open file:');
            if (name) {
                const data = localStorage.getItem(`os-file-${name}`);
                if (data !== null) { editor.value = data; this.notify(`Opened: ${name}`); }
                else alert('File not found!');
            }
        });
        content.querySelector('#newFileBtn')?.addEventListener('click', () => {
            if (confirm('New file? Unsaved changes will be lost.')) editor.value = '';
        });
        editor?.focus();
    }

    focusWindow(app) {
        const win = this.windows.get(app);
        if (win && !win.isMinimized) {
            win.element.style.zIndex = ++this.windowZIndex;
            this.activeWindow = app;
        }
    }

    minimizeWindow(app) {
        const win = this.windows.get(app);
        if (!win) return;
        win.element.classList.add('minimizing');
        setTimeout(() => {
            win.isMinimized = true;
            win.element.style.display = 'none';
            win.element.classList.remove('minimizing');
            this._updateTaskbar();
        }, 300);
    }

    _restoreWindow(app) {
        const win = this.windows.get(app);
        if (!win) return;
        win.isMinimized = false;
        win.element.style.display = 'flex';
        this.focusWindow(app);
        this._updateTaskbar();
    }

    _toggleMaximize(app) {
        const win = this.windows.get(app);
        if (!win) return;
        win.isMaximized = !win.isMaximized;
        win.element.classList.toggle('maximized');
        if (win.isMaximized) {
            win.origPos = { left: win.element.style.left, top: win.element.style.top };
            win.origSize = { width: win.element.style.width, height: win.element.style.height };
        } else if (win.origPos) {
            Object.assign(win.element.style, win.origPos, win.origSize);
        }
    }

    closeWindow(app) {
        const win = this.windows.get(app);
        if (!win) return;
        win.element.classList.add('closing');
        setTimeout(() => {
            win.element.remove();
            this.windows.delete(app);
            if (this.activeWindow === app) this.activeWindow = null;
            this._updateTaskbar();
            this.saveSession();
        }, 200);
    }

    _updateTaskbar() {
        if (!this.windowList) return;
        this.windowList.innerHTML = '';
        this.windows.forEach((win, app) => {
            const meta = this._getAppMeta(app);
            const btn = document.createElement('button');
            btn.className = 'window-tab' + (win.isMinimized ? ' minimized' : '');
            btn.innerHTML = `<i class="fas ${meta.icon}"></i><span>${meta.title}</span>`;
            btn.addEventListener('click', () => {
                if (win.isMinimized) this._restoreWindow(app);
                else this.focusWindow(app);
            });
            this.windowList.appendChild(btn);
        });
    }

    // ─── Drag ─────────────────────────────────
    _startDrag(e, app) {
        if (e.target.closest('.window-controls')) return;
        const win = this.windows.get(app);
        if (!win || win.isMaximized) return;
        this.isDragging = true;
        this.draggedWindow = win;
        this.dragOffset.x = e.clientX - win.element.offsetLeft;
        this.dragOffset.y = e.clientY - win.element.offsetTop;
        win.element.style.zIndex = ++this.windowZIndex;
        e.preventDefault();
    }

    _onMouseMove(e) {
        if (this.isDragging && this.draggedWindow) {
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            const maxX = window.innerWidth - this.draggedWindow.element.offsetWidth;
            const maxY = window.innerHeight - this.draggedWindow.element.offsetHeight - 54;
            this.draggedWindow.element.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            this.draggedWindow.element.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        }
        if (this.isResizing && this.resizingWindow) {
            const dx = e.clientX - this.resizingWindow.startX;
            const dy = e.clientY - this.resizingWindow.startY;
            this.resizingWindow.element.style.width = `${Math.max(320, this.resizingWindow.startW + dx)}px`;
            this.resizingWindow.element.style.height = `${Math.max(200, this.resizingWindow.startH + dy)}px`;
        }
    }

    _onMouseUp() {
        this.isDragging = false;
        this.draggedWindow = null;
        this.isResizing = false;
        this.resizingWindow = null;
    }

    _switchWindow() {
        const open = [...this.windows.keys()].filter(a => !this.windows.get(a).isMinimized);
        if (open.length < 2) return;
        const next = (open.indexOf(this.activeWindow) + 1) % open.length;
        this.focusWindow(open[next]);
    }

    // ─── Power ────────────────────────────────
    shutdown() {
        if (confirm('Are you sure you want to shut down?')) {
            document.body.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;
                    height:100vh;background:#000;color:#fff;flex-direction:column;gap:16px;font-family:inherit;">
                    <i class="fas fa-power-off" style="font-size:48px;opacity:0.6;"></i>
                    <h2>Shutting down...</h2>
                </div>`;
        }
    }

    reboot() {
        if (confirm('Are you sure you want to restart?')) {
            document.body.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;
                    height:100vh;background:#000;color:#fff;flex-direction:column;gap:16px;font-family:inherit;">
                    <i class="fas fa-sync fa-spin" style="font-size:48px;opacity:0.6;"></i>
                    <h2>Restarting...</h2>
                </div>`;
            setTimeout(() => location.reload(), 2000);
        }
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    new OSSimulatorGUI();
});
