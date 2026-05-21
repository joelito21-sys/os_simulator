/**
 * XamppApp.js  —  Faithful replica of XAMPP Control Panel v3.3.0
 * All service controls, config menus, admin links, logs,
 * service install/uninstall simulation, netstat, shell, explorer.
 */

class XamppApp {
    constructor(element) {
        this.element = element;

        // ── Module Definitions ───────────────────────────────────
        this.modules = {
            apache: {
                label: 'Apache',
                ports: [80, 443],
                pidsCount: 2,          // Apache spawns 2 processes
                adminUrl: 'http://localhost',
                configFiles: [
                    { label: 'httpd.conf', path: 'C:/xampp/apache/conf/httpd.conf' },
                    { label: 'httpd-ssl.conf', path: 'C:/xampp/apache/conf/extra/httpd-ssl.conf' },
                    { label: 'httpd-xampp.conf', path: 'C:/xampp/apache/conf/extra/httpd-xampp.conf' },
                    { label: 'php.ini', path: 'C:/xampp/php/php.ini' },
                    { label: 'Browse [Apache]', path: 'browse:apache' },
                ],
                logFiles: [
                    { label: 'access.log', path: 'C:/xampp/apache/logs/access.log' },
                    { label: 'error.log', path: 'C:/xampp/apache/logs/error.log' },
                    { label: 'php_error_log', path: 'C:/xampp/php/logs/php_error_log' },
                    { label: 'Browse [Apache]', path: 'browse:apache/logs' },
                ],
                svcInstalled: false,
            },
            mysql: {
                label: 'MySQL',
                ports: [3306],
                pidsCount: 1,
                adminApp: 'mysql',
                configFiles: [
                    { label: 'my.ini', path: 'C:/xampp/mysql/bin/my.ini' },
                    { label: 'Browse [MySQL]', path: 'browse:mysql' },
                ],
                logFiles: [
                    { label: 'mysql_error.log', path: 'C:/xampp/mysql/data/mysql_error.log' },
                    { label: 'Browse [MySQL]', path: 'browse:mysql/data' },
                ],
                svcInstalled: true,
            },
            filezilla: {
                label: 'FileZilla',
                ports: [21],
                pidsCount: 1,
                adminUrl: null,
                configFiles: [
                    { label: 'filezilla.xml', path: 'C:/xampp/filezillaftp/filezilla.xml' },
                    { label: 'Browse [FileZilla]', path: 'browse:filezillaftp' },
                ],
                logFiles: [
                    { label: 'filezilla.log', path: 'C:/xampp/filezillaftp/logs/filezilla.log' },
                    { label: 'Browse [FileZilla]', path: 'browse:filezillaftp/logs' },
                ],
                svcInstalled: false,
            },
            mercury: {
                label: 'Mercury',
                ports: [25, 110],
                pidsCount: 1,
                adminUrl: null,
                configFiles: [
                    { label: 'mercury.ini', path: 'C:/xampp/MercuryMail/mercury.ini' },
                    { label: 'Browse [Mercury]', path: 'browse:MercuryMail' },
                ],
                logFiles: [
                    { label: 'mercury.log', path: 'C:/xampp/MercuryMail/logs/mercury.log' },
                    { label: 'Browse [Mercury]', path: 'browse:MercuryMail/logs' },
                ],
                svcInstalled: false,
            },
            tomcat: {
                label: 'Tomcat',
                ports: [8080],
                pidsCount: 1,
                adminUrl: 'http://localhost:8080',
                configFiles: [
                    { label: 'server.xml', path: 'C:/xampp/tomcat/conf/server.xml' },
                    { label: 'web.xml', path: 'C:/xampp/tomcat/conf/web.xml' },
                    { label: 'context.xml', path: 'C:/xampp/tomcat/conf/context.xml' },
                    { label: 'catalina.bat', path: 'C:/xampp/tomcat/bin/catalina.bat' },
                    { label: 'Browse [Tomcat]', path: 'browse:tomcat' },
                ],
                logFiles: [
                    { label: 'catalina.log', path: 'C:/xampp/tomcat/logs/catalina.log' },
                    { label: 'Browse [Tomcat]', path: 'browse:tomcat/logs' },
                ],
                svcInstalled: false,
            },
        };

        // Runtime state
        this.state = {};
        Object.keys(this.modules).forEach(mod => {
            this.state[mod] = { running: false, pids: [], starting: false, stopping: false };
        });

        this._activeDropdown = null;

        this._bindEvents();
        this._bootLog();
    }

    // ── Boot messages ───────────────────────────────────────────
    _bootLog() {
        const now = new Date();
        const t = this._ts();
        this._log(t, 'main', 'Starting Check-Timer');
        this._log(t, 'main', 'Control Panel Ready');
        this._log(t, 'main', `XAMPP v3.3.0 [ Compiled: Apr 6th 2021 ]`);
        this._log(t, 'main', 'Running in simulation mode.');
    }

    // ── Bind all events ─────────────────────────────────────────
    _bindEvents() {
        // Start/Stop buttons
        Object.keys(this.modules).forEach(mod => {
            this.element.querySelector(`#xbtn-start-${mod}`)
                ?.addEventListener('click', () => this._toggleModule(mod));

            this.element.querySelector(`#xbtn-admin-${mod}`)
                ?.addEventListener('click', () => this._openAdmin(mod));

            this.element.querySelector(`#xbtn-config-${mod}`)
                ?.addEventListener('click', (e) => this._showConfigMenu(mod, e));

            this.element.querySelector(`#xbtn-logs-${mod}`)
                ?.addEventListener('click', (e) => this._showLogsMenu(mod, e));

            // Service install/uninstall toggle
            this.element.querySelector(`#xsvc-${mod}`)
                ?.addEventListener('click', () => this._toggleService(mod));
        });

        // Sidebar buttons
        this.element.querySelector('#xside-config')
            ?.addEventListener('click', () => this._openXamppConfig());
        this.element.querySelector('#xside-netstat')
            ?.addEventListener('click', () => this._openNetstat());
        this.element.querySelector('#xside-shell')
            ?.addEventListener('click', () => this._openShell());
        this.element.querySelector('#xside-explorer')
            ?.addEventListener('click', () => this._openExplorer());
        this.element.querySelector('#xside-services')
            ?.addEventListener('click', () => this._openServices());
        this.element.querySelector('#xside-help')
            ?.addEventListener('click', () => this._openHelp());
        this.element.querySelector('#xside-quit')
            ?.addEventListener('click', () => this._quit());

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            const dd = this.element.querySelector('#xcp-dropdown');
            if (dd && !dd.contains(e.target)) {
                dd.style.display = 'none';
                this._activeDropdown = null;
            }
        });
    }

    // ── Start / Stop toggle ─────────────────────────────────────
    _toggleModule(mod) {
        const s = this.state[mod];
        if (s.starting || s.stopping) return;
        if (s.running) this._stopModule(mod);
        else this._startModule(mod);
    }

    _startModule(mod) {
        const info = this.modules[mod];
        const s = this.state[mod];
        const btn = this.element.querySelector(`#xbtn-start-${mod}`);

        s.starting = true;
        btn.textContent = 'Starting...';
        btn.disabled = true;

        this._log(this._ts(), info.label, `Attempting to start ${info.label} app...`);
        this._log(this._ts(), info.label, `Attempting to start ${info.label} app...`);

        const delay = 900 + Math.random() * 800;
        setTimeout(() => {
            // Simulate port conflict ~5% of the time
            if (Math.random() < 0.05) {
                this._log(this._ts(), info.label, `Port ${info.ports[0]} in use by another process!`, 'error');
                this._log(this._ts(), info.label, `${info.label} WILL NOT start without the configured ports free!`, 'error');
                this._log(this._ts(), info.label, `You need to uninstall/disable/reconfigure the blocking application`, 'error');
                s.starting = false;
                btn.textContent = 'Start';
                btn.disabled = false;
                return;
            }

            // Generate PIDs
            s.pids = [];
            for (let i = 0; i < info.pidsCount; i++) {
                s.pids.push(Math.floor(Math.random() * 30000) + 2000);
            }
            s.running = true;
            s.starting = false;

            this._updateModuleUI(mod);
            this._log(this._ts(), info.label, `Status change detected: running`, 'bold');
        }, delay);
    }

    _stopModule(mod) {
        const info = this.modules[mod];
        const s = this.state[mod];

        s.stopping = true;
        const btn = this.element.querySelector(`#xbtn-start-${mod}`);
        btn.textContent = 'Stopping...';
        btn.disabled = true;

        this._log(this._ts(), info.label, `Attempting to stop ${info.label} app...`);

        setTimeout(() => {
            s.pids = [];
            s.running = false;
            s.stopping = false;

            this._updateModuleUI(mod);
            this._log(this._ts(), info.label, `Status change detected: stopped`);
        }, 600 + Math.random() * 400);
    }

    _updateModuleUI(mod) {
        const info = this.modules[mod];
        const s = this.state[mod];
        const running = s.running;

        // Row background
        const row = this.element.querySelector(`#xrow-${mod}`);
        row?.classList.toggle('xcp-row-running', running);

        // Module name cell highlight
        const modCell = this.element.querySelector(`#xmod-${mod}`);
        if (modCell) modCell.classList.toggle('xcp-modname-running', running);

        // PID display
        const pidEl = this.element.querySelector(`#xpid-${mod}`);
        if (pidEl) pidEl.innerHTML = running ? s.pids.join('<br>') : '';

        // Port display
        const portEl = this.element.querySelector(`#xport-${mod}`);
        if (portEl) portEl.textContent = running ? info.ports.join(', ') : '';

        // Start/Stop button
        const btn = this.element.querySelector(`#xbtn-start-${mod}`);
        if (btn) {
            btn.textContent = running ? 'Stop' : 'Start';
            btn.disabled = false;
            btn.classList.toggle('xcp-act-stop', running);
            btn.classList.toggle('xcp-act-start', !running);
        }

        // Admin button — enabled when running and admin URL or in-OS app exists
        const adminBtn = this.element.querySelector(`#xbtn-admin-${mod}`);
        if (adminBtn) {
            const hasAdmin = !!(info.adminUrl || info.adminApp);
            adminBtn.classList.toggle('inactive', !running || !hasAdmin);
            adminBtn.disabled = !running || !hasAdmin;
        }
    }

    // ── Service Install / Uninstall ─────────────────────────────
    _toggleService(mod) {
        const info = this.modules[mod];
        const installed = info.svcInstalled;
        info.svcInstalled = !installed;

        const btn = this.element.querySelector(`#xsvc-${mod}`);
        if (!btn) return;

        if (info.svcInstalled) {
            btn.innerHTML = '&#10003;';
            btn.classList.replace('xcp-x-btn', 'xcp-chk-btn');
            btn.title = 'Uninstall Windows Service';
            this._log(this._ts(), info.label, `Installing ${info.label} as a service...`);
            setTimeout(() => this._log(this._ts(), 'main', `${info.label} service installed successfully.`, 'bold'), 600);
        } else {
            btn.innerHTML = '&#10007;';
            btn.classList.replace('xcp-chk-btn', 'xcp-x-btn');
            btn.title = 'Install as Windows Service';
            this._log(this._ts(), info.label, `Uninstalling ${info.label} service...`);
            setTimeout(() => this._log(this._ts(), 'main', `${info.label} service uninstalled.`), 600);
        }
    }

    // ── Admin ───────────────────────────────────────────────────
    _openAdmin(mod) {
        const info = this.modules[mod];
        if (!this.state[mod].running) return;

        if (info.adminApp === 'mysql' && window.app) {
            this._log(this._ts(), info.label, 'Opening phpMyAdmin (real MySQL databases)');
            window.app.openApplication('mysql', { refresh: true, fromXampp: true });
            return;
        }

        if (!info.adminUrl) return;

        this._log(this._ts(), info.label, `Opening admin interface at ${info.adminUrl}`);

        if (info.adminUrl.startsWith('http://localhost')) {
            window.open(info.adminUrl, '_blank');
        } else if (window.app) {
            window.app.openApplication('browser', { url: info.adminUrl });
        }
    }

    // ── Config Dropdown ─────────────────────────────────────────
    _showConfigMenu(mod, event) {
        const info = this.modules[mod];
        this._showDropdown(
            info.configFiles,
            event.currentTarget,
            (item) => {
                if (item.path.startsWith('browse:')) {
                    const dir = 'C:/xampp/' + item.path.replace('browse:', '');
                    this._log(this._ts(), info.label, `Browsing ${dir}`);
                    if (window.app) window.app.openApplication('filemanager', { path: dir });
                } else {
                    this._log(this._ts(), info.label, `Opening config: ${item.path}`);
                    if (window.app) window.app.openApplication('editor', {
                        filePath: item.path,
                        content: this._sampleConfig(mod, item.label)
                    });
                }
            }
        );
    }

    // ── Logs Dropdown ───────────────────────────────────────────
    _showLogsMenu(mod, event) {
        const info = this.modules[mod];
        this._showDropdown(
            info.logFiles,
            event.currentTarget,
            (item) => {
                if (item.path.startsWith('browse:')) {
                    const dir = 'C:/xampp/' + item.path.replace('browse:', '');
                    this._log(this._ts(), info.label, `Browsing ${dir}`);
                    if (window.app) window.app.openApplication('filemanager', { path: dir });
                } else {
                    this._log(this._ts(), info.label, `Opening log: ${item.path}`);
                    if (window.app) window.app.openApplication('editor', {
                        filePath: item.path,
                        content: this._sampleLog(mod, item.label)
                    });
                }
            }
        );
    }

    // ── Generic Dropdown ────────────────────────────────────────
    _showDropdown(items, anchorEl, onSelect) {
        const dd = this.element.querySelector('#xcp-dropdown');
        const inner = this.element.querySelector('#xcp-dropdown-inner');
        if (!dd || !inner) return;

        inner.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'xcp-dd-item';
            div.textContent = item.label;
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                dd.style.display = 'none';
                onSelect(item);
            });
            inner.appendChild(div);
        });

        // Position near button
        const rect = anchorEl.getBoundingClientRect();
        const rootRect = this.element.getBoundingClientRect();
        dd.style.left = `${rect.left - rootRect.left}px`;
        dd.style.top = `${rect.bottom - rootRect.top}px`;
        dd.style.display = 'block';
    }

    // ── Sidebar Actions ─────────────────────────────────────────
    _openXamppConfig() {
        this._log(this._ts(), 'main', 'Opening XAMPP configuration...');
        if (window.app) window.app.openApplication('editor', {
            filePath: 'C:/xampp/xampp-control.ini',
            content: this._sampleXamppConfig()
        });
    }

    _openNetstat() {
        this._log(this._ts(), 'main', 'Running Netstat...');
        const lines = [
            'Active Connections',
            '',
            `  Proto  Local Address          Foreign Address        State           PID`,
            `  ${'─'.repeat(70)}`,
        ];
        Object.keys(this.modules).forEach(mod => {
            if (this.state[mod].running) {
                const info = this.modules[mod];
                info.ports.forEach((port, i) => {
                    const pid = this.state[mod].pids[i] || this.state[mod].pids[0];
                    lines.push(`  TCP    0.0.0.0:${String(port).padEnd(16)} 0.0.0.0:0              LISTENING       ${pid}`);
                });
            }
        });
        if (lines.length === 4) lines.push('  (No XAMPP services are currently running.)');
        if (window.app) window.app.openApplication('editor', {
            filePath: 'netstat_xampp.txt',
            content: lines.join('\n')
        });
    }

    _openShell() {
        this._log(this._ts(), 'main', 'Opening Shell...');
        if (window.app) window.app.openApplication('terminal');
    }

    _openExplorer() {
        this._log(this._ts(), 'main', 'Opening Explorer: C:/xampp');
        if (window.app) window.app.openApplication('filemanager', { path: 'C:/xampp' });
    }

    _openServices() {
        this._log(this._ts(), 'main', 'Opening Windows Services simulation...');
        const lines = [
            '══════════════════════════════════════════════════════════',
            '  Windows Services (Simulated)',
            '══════════════════════════════════════════════════════════',
            '',
            '  Service Name          Status       Start Type',
            '  ─────────────────────────────────────────────',
        ];
        Object.keys(this.modules).forEach(mod => {
            const info = this.modules[mod];
            const installed = info.svcInstalled;
            const running = this.state[mod].running;
            const status = running ? 'Running  ' : 'Stopped  ';
            const type = installed ? 'Automatic' : 'Manual   ';
            lines.push(`  ${info.label.padEnd(22)}${status}    ${type}`);
        });
        if (window.app) window.app.openApplication('editor', {
            filePath: 'services_xampp.txt',
            content: lines.join('\n')
        });
    }

    _openHelp() {
        this._log(this._ts(), 'main', 'Opening XAMPP Help...');
        if (window.app) window.app.openApplication('browser', { url: 'https://www.apachefriends.org/faq_windows.html' });
    }

    _quit() {
        this._log(this._ts(), 'main', 'Quitting XAMPP Control Panel...');
        setTimeout(() => {
            if (window.app) window.app.closeWindow('xampp');
        }, 300);
    }

    // ── Sample Config Content ───────────────────────────────────
    _sampleConfig(mod, label) {
        const configs = {
            'httpd.conf': `# Apache HTTP Server Configuration\nServerRoot "C:/xampp/apache"\nListen 80\nListen 443\nLoadModule access_compat_module modules/mod_access_compat.so\nLoadModule actions_module modules/mod_actions.so\nLoadModule alias_module modules/mod_alias.so\nLoadModule allowmethods_module modules/mod_allowmethods.so\nServerName localhost:80\nDocumentRoot "C:/xampp/htdocs"\n\n<Directory "C:/xampp/htdocs">\n    Options Indexes FollowSymLinks Includes ExecCGI\n    AllowOverride All\n    Require all granted\n</Directory>\n\nInclude conf/extra/httpd-xampp.conf\nInclude conf/extra/httpd-ssl.conf`,
            'httpd-ssl.conf': `# SSL/TLS Configuration\nSSLCipherSuite HIGH:MEDIUM:!MD5:!RC4:!3DES\nSSLProxyCipherSuite HIGH:MEDIUM:!MD5:!RC4:!3DES\nSSLHonorCipherOrder on\nSSLProtocol all -SSLv3\n\n<VirtualHost _default_:443>\nDocumentRoot "C:/xampp/htdocs"\nServerName localhost:443\nSSLEngine on\nSSLCertificateFile "conf/ssl.crt/server.crt"\nSSLCertificateKeyFile "conf/ssl.key/server.key"\n</VirtualHost>`,
            'httpd-xampp.conf': `# XAMPP-specific Apache configuration\nAlias /phpmyadmin "C:/xampp/phpMyAdmin/"\n<Directory "C:/xampp/phpMyAdmin">\n    AllowOverride AuthConfig\n    Require local\n    ErrorDocument 403 /error/XAMPP_FORBIDDEN.html.var\n</Directory>`,
            'php.ini': `[PHP]\nengine = On\nshort_open_tag = Off\nprecision = 14\noutput_buffering = 4096\nzlib.output_compression = Off\nimplicit_flush = Off\nmax_execution_time = 30\nmemo_limit = 128M\nerror_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT\ndisplay_errors = On\ndisplay_startup_errors = Off\nlog_errors = On\nerror_log = "C:/xampp/php/logs/php_error_log"\npost_max_size = 8M\nupload_max_filesize = 40M\nextension_dir = "C:/xampp/php/ext"\nextension=mysqli\nextension=pdo_mysql\nextension=mbstring\nextension=openssl`,
            'my.ini': `[mysqld]\nport=3306\nsocket="C:/xampp/mysql/mysql.sock"\nbasedir="C:/xampp/mysql"\ndatadir=C:/xampp/mysql/data\nkey_buffer=16M\nmax_allowed_packet=1M\ntable_cache=64\nskip-external-locking\nbind-address=0.0.0.0\n\n[client]\nport=3306\nsocket="C:/xampp/mysql/mysql.sock"`,
            'filezilla.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<FileZillaServer>\n  <Settings>\n    <Item name="Port" type="numeric">21</Item>\n    <Item name="Welcomemessage" type="string">Welcome to the XAMPP FTP Server</Item>\n    <Item name="MaxUsers" type="numeric">0</Item>\n  </Settings>\n</FileZillaServer>`,
            'mercury.ini': `[MERCURY]\nMercuryRoot=C:/xampp/MercuryMail\nSMTPListenPort=25\nPOP3ListenPort=110\nIMAPPort=143\nIMAPSPort=993\nAdminPassword=admin`,
            'server.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<Server port="8005" shutdown="SHUTDOWN">\n  <Listener className="org.apache.catalina.startup.VersionLoggerListener"/>\n  <Service name="Catalina">\n    <Connector port="8080" protocol="HTTP/1.1"\n               connectionTimeout="20000"\n               redirectPort="8443" />\n    <Engine name="Catalina" defaultHost="localhost">\n      <Host name="localhost" appBase="webapps"\n            unpackWARs="true" autoDeploy="true">\n      </Host>\n    </Engine>\n  </Service>\n</Server>`,
        };
        return configs[label] || `# ${label}\n# Configuration file for ${mod}\n# Edit this file to configure the module.\n`;
    }

    _sampleLog(mod, label) {
        const d = new Date();
        const ds = d.toLocaleDateString('en-US');
        const ts = (offset = 0) => {
            const t = new Date(d.getTime() - offset * 1000);
            return t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        const info = this.modules[mod];
        const lines = [
            `[${ds} ${ts(120)}] [${info.label}] Module initialized`,
            `[${ds} ${ts(90)}]  [${info.label}] Loaded configuration`,
            `[${ds} ${ts(60)}]  [${info.label}] Preparing to start on port(s): ${info.ports.join(', ')}`,
            `[${ds} ${ts(30)}]  [${info.label}] Status change detected: running`,
            `[${ds} ${ts(10)}]  [${info.label}] ${label} — Log file opened`,
            `[${ds} ${ts(0)}]   [main] All systems operational`,
        ];
        return lines.join('\n');
    }

    _sampleXamppConfig() {
        return `[ControlPanel]\neditor=notepad.exe\nbrowser=\nAutostartApache=0\nAutostartMySQL=0\nAutostartFileZilla=0\nAutostartMercury=0\nAutostartTomcat=0\nEnableTray=1\nEnableLogging=1\nInstallPath=C:/xampp\n\n[Paths]\napache=C:/xampp/apache\nmysql=C:/xampp/mysql\nfilezilla=C:/xampp/filezillaftp\n\n[Ports]\napache_http=80\napache_https=443\nmysql_port=3306\nfilezilla_port=21\ntomcat_port=8080`;
    }

    // ── Logger ───────────────────────────────────────────────────
    _ts() {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    _log(time, source, message, style = '') {
        const log = this.element.querySelector('#xcp-log');
        if (!log) return;

        const line = document.createElement('div');
        line.className = 'xcl' + (style ? ` xcl-${style}` : '');

        // Color the source tag (matches real XAMPP blue module tags)
        const srcClass = source === 'main' ? 'xcl-src-main' : 'xcl-src-module';

        line.innerHTML =
            `<span class="xcl-time">${time}</span>` +
            `  <span class="${srcClass}">[${source}]</span>` +
            `  <span class="xcl-msg xcl-msg-${style || 'normal'}">${message}</span>`;

        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
    }

    // ── Cleanup ──────────────────────────────────────────────────
    destroy() {
        // Nothing to clean up (no intervals used)
    }
}

export default XamppApp;
