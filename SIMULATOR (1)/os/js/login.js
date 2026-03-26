class LoginSystem {
    constructor() {
        // Detect if running via file:// or without a proper server
        this.useLocalAuth = window.location.protocol === 'file:' ||
            !window.location.hostname;

        // Initialize local users store if needed
        if (this.useLocalAuth) {
            this.initLocalUsers();
        }

        this.initializeElements();
        this.bindEvents();
        this.checkExistingSession();
    }

    // ── Local (localStorage) auth methods ──────────────────────────────────

    initLocalUsers() {
        if (!localStorage.getItem('os-sim-users')) {
            const defaultUsers = {
                admin: { password: 'admin123', role: 'administrator' },
                user: { password: 'user123', role: 'user' }
            };
            localStorage.setItem('os-sim-users', JSON.stringify(defaultUsers));
        }
    }

    localLogin(username, password) {
        const users = JSON.parse(localStorage.getItem('os-sim-users') || '{}');
        if (!users[username]) {
            return { success: false, error: 'Invalid username or password' };
        }
        if (users[username].password !== password) {
            return { success: false, error: 'Invalid username or password' };
        }
        // Store session
        sessionStorage.setItem('os-sim-user', JSON.stringify({
            username,
            role: users[username].role,
            login_time: Date.now()
        }));
        return { success: true, user: { username, role: users[username].role } };
    }

    localCreateUser(username, password) {
        if (username.length < 3) return { success: false, error: 'Username must be at least 3 characters' };
        if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };
        const users = JSON.parse(localStorage.getItem('os-sim-users') || '{}');
        if (users[username]) return { success: false, error: 'Username already exists' };
        users[username] = { password, role: 'user' };
        localStorage.setItem('os-sim-users', JSON.stringify(users));
        return { success: true, message: 'User created successfully' };
    }

    localCurrentUser() {
        const raw = sessionStorage.getItem('os-sim-user');
        if (!raw) return { success: false, error: 'Not logged in' };
        return { success: true, user: JSON.parse(raw) };
    }

    initializeElements() {
        this.loginForm = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        this.rememberMeCheckbox = document.getElementById('rememberMe');
        this.createAccountBtn = document.getElementById('createAccountBtn');
        this.createAccountModal = document.getElementById('createAccountModal');
        this.createAccountForm = document.getElementById('createAccountForm');
        this.loadingOverlay = document.getElementById('loadingOverlay');

        // Create account form elements
        this.newUsernameInput = document.getElementById('newUsername');
        this.newPasswordInput = document.getElementById('newPassword');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.cancelCreateBtn = document.getElementById('cancelCreateBtn');
        this.submitCreateBtn = document.getElementById('submitCreateBtn');
    }

    bindEvents() {
        // Login form
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        // Create account
        this.createAccountBtn.addEventListener('click', () => this.showCreateAccountModal());
        this.cancelCreateBtn.addEventListener('click', () => this.hideCreateAccountModal());
        this.createAccountForm.addEventListener('submit', (e) => this.handleCreateAccount(e));

        // Modal close
        this.createAccountModal.querySelector('.close').addEventListener('click', () => this.hideCreateAccountModal());

        // Enter key on password field
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin(e);
            }
        });

        // Quick login buttons for demo accounts
        this.addQuickLoginButtons();

        // Click outside modal to close
        this.createAccountModal.addEventListener('click', (e) => {
            if (e.target === this.createAccountModal) {
                this.hideCreateAccountModal();
            }
        });
    }

    addQuickLoginButtons() {
        const demoAccounts = [
            { username: 'admin', password: 'admin123', label: 'Admin' },
            { username: 'user', password: 'user123', label: 'User' }
        ];

        // Add quick login buttons below demo accounts
        const demoSection = document.querySelector('.demo-accounts');
        const quickLoginDiv = document.createElement('div');
        quickLoginDiv.className = 'quick-login';
        quickLoginDiv.innerHTML = '<h5>Quick Login:</h5>';

        demoAccounts.forEach(account => {
            const btn = document.createElement('button');
            btn.className = 'quick-login-btn';
            btn.innerHTML = `<i class="fas fa-user"></i> ${account.label}`;
            btn.addEventListener('click', () => this.quickLogin(account.username, account.password));
            quickLoginDiv.appendChild(btn);
        });

        demoSection.appendChild(quickLoginDiv);

        // Add styles for quick login buttons
        const style = document.createElement('style');
        style.textContent = `
            .quick-login {
                margin-top: 15px;
            }
            .quick-login h5 {
                color: #667eea;
                margin-bottom: 10px;
                font-size: 13px;
            }
            .quick-login-btn {
                width: 48%;
                padding: 8px 12px;
                margin: 2px 1%;
                background: white;
                color: #667eea;
                border: 1px solid #667eea;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }
            .quick-login-btn:hover {
                background: #667eea;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    async handleLogin(e) {
        e.preventDefault();

        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;

        if (!username || !password) {
            this.showMessage('Please enter username and password', 'error');
            return;
        }

        this.showLoading(true);

        try {
            let result;

            if (this.useLocalAuth) {
                // ── file:// mode: use localStorage auth ──
                result = this.localLogin(username, password);
            } else {
                // ── server mode: call PHP backend ──
                try {
                    const response = await fetch('api/auth.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'login', username, password })
                    });
                    result = await response.json();
                } catch (netError) {
                    console.warn('PHP backend unreachable, switching to Local Mode:', netError);
                    this.useLocalAuth = true;
                    this.initLocalUsers();
                    this.showMessage('Server unreachable. Switched to Local Mode.', 'info');
                    result = this.localLogin(username, password);
                }
            }

            if (result.success) {
                if (this.rememberMeCheckbox.checked) {
                    localStorage.setItem('os-simulator-remember', username);
                } else {
                    localStorage.removeItem('os-simulator-remember');
                }
                this.showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                this.showMessage(result.error || 'Login failed.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    quickLogin(username, password) {
        this.usernameInput.value = username;
        this.passwordInput.value = password;
        this.handleLogin(new Event('submit'));
    }

    async handleCreateAccount(e) {
        e.preventDefault();

        const username = this.newUsernameInput.value.trim();
        const password = this.newPasswordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;

        if (!username || !password || !confirmPassword) {
            this.showMessage('Please fill all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        this.showLoading(true);

        try {
            let result;

            if (this.useLocalAuth) {
                // ── file:// mode: use localStorage auth ──
                result = this.localCreateUser(username, password);
            } else {
                // ── server mode: call PHP backend ──
                try {
                    const response = await fetch('api/auth.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'create', username, password })
                    });
                    result = await response.json();
                } catch (netError) {
                    console.warn('PHP backend unreachable, switching to Local Mode:', netError);
                    this.useLocalAuth = true;
                    this.initLocalUsers();
                    this.showMessage('Server unreachable. Switched to Local Mode.', 'info');
                    result = this.localCreateUser(username, password);
                }
            }

            if (result.success) {
                this.showMessage('Account created successfully! You can now login.', 'success');
                this.hideCreateAccountModal();
                this.usernameInput.value = username;
                this.passwordInput.value = '';
                this.passwordInput.focus();
            } else {
                this.showMessage(result.error || 'Could not create account.', 'error');
            }
        } catch (error) {
            console.error('Create account error:', error);
            this.showMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showCreateAccountModal() {
        this.createAccountModal.classList.add('show');
        this.newUsernameInput.focus();
    }

    hideCreateAccountModal() {
        this.createAccountModal.classList.remove('show');
        this.createAccountForm.reset();
    }

    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.add('show');
            this.loginBtn.disabled = true;
        } else {
            this.loadingOverlay.classList.remove('show');
            this.loginBtn.disabled = false;
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = this.loginForm.querySelector('.error-message, .success-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;

        // Insert at the top of the form
        this.loginForm.insertBefore(messageDiv, this.loginForm.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    async checkExistingSession() {
        try {
            let result;

            if (this.useLocalAuth) {
                // ── file:// mode: check sessionStorage ──
                result = this.localCurrentUser();
            } else {
                // ── server mode: call PHP backend ──
                try {
                    const response = await fetch('api/auth.php?action=current');
                    result = await response.json();
                } catch (netError) {
                    console.warn('PHP backend unreachable during session check:', netError);
                    this.useLocalAuth = true;
                    result = this.localCurrentUser();
                }
            }

            if (result.success) {
                // User is already logged in, redirect to main interface
                window.location.href = 'index.html';
            } else {
                // Check for remembered username
                const rememberedUsername = localStorage.getItem('os-simulator-remember');
                if (rememberedUsername) {
                    this.usernameInput.value = rememberedUsername;
                    this.rememberMeCheckbox.checked = true;
                    this.passwordInput.focus();
                }
            }
        } catch (error) {
            console.error('Failed to check session:', error);
        }
    }
}

// Initialize login system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginSystem();
});
