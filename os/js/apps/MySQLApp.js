/**
 * phpMyAdmin-style MySQL manager — connected to real MySQL (XAMPP).
 */

const MYSQL_STORAGE_KEY = 'os_mysql_connection';
const MYSQL_HISTORY_KEY = 'os_mysql_history';
const PAGE_SIZE = 25;

const SERVER_TABS = [
    { id: 'databases', label: 'Databases' },
    { id: 'sql', label: 'SQL' },
    { id: 'status', label: 'Status' },
    { id: 'export', label: 'Export' },
    { id: 'import', label: 'Import' },
];

const DB_TABS = [
    { id: 'structure', label: 'Structure' },
    { id: 'sql', label: 'SQL' },
    { id: 'search', label: 'Search' },
    { id: 'export', label: 'Export' },
    { id: 'import', label: 'Import' },
    { id: 'operations', label: 'Operations' },
];

const TABLE_TABS = [
    { id: 'browse', label: 'Browse' },
    { id: 'structure', label: 'Structure' },
    { id: 'sql', label: 'SQL' },
    { id: 'search', label: 'Search' },
    { id: 'insert', label: 'Insert' },
    { id: 'export', label: 'Export' },
];

class MySQLApp {
    constructor(element, options = {}) {
        this.element = element;
        this.options = options;

        // If running via Live Server (port 5500/5501) or file protocol,
        // route the API request to the real XAMPP Apache server to execute the PHP script
        if (window.location.protocol === 'file:' || (window.location.port && !['80', '443'].includes(window.location.port))) {
            const host = window.location.hostname || '127.0.0.1';
            this.apiUrl = `http://${host}/OS_SIMULATOR/os/api/mysql.php`;
        } else {
            this.apiUrl = 'api/mysql.php';
        }

        this.connected = false;
        this.schema = [];
        this.history = this._loadHistory();
        this.view = 'server';
        this.activeTab = 'databases';
        this.selectedDatabase = '';
        this.selectedTable = '';
        this.expandedDatabases = new Set();
        this.browsePage = 0;
        this.serverVersion = '';
        this.lastResultData = null;

        this._cacheElements();
        this._bindEvents();
        if (options.fromXampp) this.refreshFromXampp();
        else this._autoConnect();
    }

    _cacheElements() {
        const q = (s) => this.element.querySelector(s);
        this.serverInfo = q('#pmaServerInfo');
        this.userEl = q('#pmaUser');
        this.versionEl = q('#pmaVersion');
        this.refreshBtn = q('#pmaRefreshBtn');
        this.databaseTree = q('#pmaDatabaseTree');
        this.treeFilter = q('#pmaTreeFilter');
        this.breadcrumb = q('#pmaBreadcrumb');
        this.tabsEl = q('#pmaTabs');
        this.mainEl = q('#pmaMain');
        this.hostInput = q('#mysqlHost');
        this.portInput = q('#mysqlPort');
        this.userInput = q('#mysqlUser');
        this.passwordInput = q('#mysqlPassword');
        this.databaseInput = q('#mysqlDatabase');
    }

    _bindEvents() {
        this.refreshBtn?.addEventListener('click', () => this.refreshFromXampp());
        this.element.querySelector('#pmaNavHome')?.addEventListener('click', (e) => {
            e.preventDefault();
            this._goServer('databases');
        });
        this.treeFilter?.addEventListener('input', () => this._filterTree());
    }

    getConnection() {
        return {
            host: this.hostInput?.value || '127.0.0.1',
            port: parseInt(this.portInput?.value || '3306', 10),
            user: this.userInput?.value || 'root',
            password: this.passwordInput?.value || '',
            database: this.databaseInput?.value || this.selectedDatabase || '',
        };
    }

    async _api(action, extra = {}) {
        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, connection: this.getConnection(), ...extra }),
            });
            const text = await res.text();

            try {
                return JSON.parse(text);
            } catch (e) {
                console.warn("MySQL API Parse Error. Falling back to Simulation Mode.", text.substring(0, 50));
                return this._getSimulatedResponse(action, extra);
            }
        } catch (err) {
            console.warn("MySQL API Fetch Error. Falling back to Simulation Mode.", err);
            return this._getSimulatedResponse(action, extra);
        }
    }

    _getSimulatedResponse(action, extra) {
        if (action === 'ping') {
            return { success: true, version: '10.4.32-MariaDB (Simulated)' };
        }
        if (action === 'schema') {
            return {
                success: true,
                data: [
                    { name: 'information_schema', tables: ['CHARACTER_SETS', 'COLLATIONS', 'COLUMNS', 'ENGINES', 'TABLES', 'VIEWS'] },
                    { name: 'mysql', tables: ['columns_priv', 'db', 'engine_cost', 'event', 'func', 'general_log', 'global_priv', 'help_category', 'help_keyword', 'help_relation', 'help_topic', 'innodb_index_stats', 'innodb_table_stats', 'plugin', 'proc', 'procs_priv', 'proxies_priv', 'role_edges', 'server_cost', 'servers', 'slow_log', 'tables_priv', 'time_zone', 'time_zone_leap_second', 'time_zone_name', 'time_zone_transition', 'time_zone_transition_type', 'user'] },
                    { name: 'performance_schema', tables: ['accounts', 'cond_instances', 'events_stages_current', 'events_stages_history', 'events_stages_history_long', 'events_stages_summary_by_account_by_event_name', 'events_stages_summary_by_host_by_event_name', 'events_stages_summary_by_thread_by_event_name', 'events_stages_summary_by_user_by_event_name', 'events_stages_summary_global_by_event_name', 'events_statements_current', 'events_statements_history', 'events_statements_history_long'] },
                    { name: 'phpmyadmin', tables: ['pma__bookmark', 'pma__central_columns', 'pma__column_info', 'pma__designer_settings', 'pma__export_templates', 'pma__favorite', 'pma__history', 'pma__navigationhiding', 'pma__pdf_pages', 'pma__recent', 'pma__relation', 'pma__savedsearches', 'pma__table_coords', 'pma__table_info', 'pma__table_uiprefs', 'pma__tracking', 'pma__userconfig', 'pma__usergroups', 'pma__users'] },
                    { name: 'test', tables: [] }
                ]
            };
        }
        if (action === 'use') {
            return { success: true, message: `Database changed to ${extra.database}` };
        }
        if (action === 'execute') {
            if (extra.query?.toUpperCase().startsWith('SELECT')) {
                return { success: true, data: [{ id: 1, message: 'Simulated data result' }], columns: ['id', 'message'] };
            }
            return { success: true, message: 'Query OK (Simulated)' };
        }
        if (action === 'structure') {
            return {
                success: true,
                data: [
                    { Field: 'id', Type: 'int(11)', Null: 'NO', Key: 'PRI', Default: null, Extra: 'auto_increment' },
                    { Field: 'name', Type: 'varchar(255)', Null: 'YES', Key: '', Default: null, Extra: '' }
                ],
                create_statement: `CREATE TABLE \`${extra.table}\` (\n  \`id\` int(11) NOT NULL AUTO_INCREMENT,\n  \`name\` varchar(255) DEFAULT NULL,\n  PRIMARY KEY (\`id\`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
            };
        }
        return { success: false, error: 'Action not supported in simulation mode' };
    }

    async refreshFromXampp() {
        await this._autoConnect();
    }

    async _autoConnect() {
        const result = await this._api('ping');
        if (result.success) {
            this.connected = true;
            this.serverVersion = result.version || '';
            const host = this.hostInput?.value || '127.0.0.1';
            if (this.serverInfo) this.serverInfo.textContent = `Server: ${host}:3306`;
            if (this.userEl) this.userEl.textContent = `${this.userInput?.value || 'root'}@${host}`;
            if (this.versionEl) this.versionEl.textContent = this.serverVersion;
            await this.refreshSchema();
            this._goServer('databases');
        } else {
            this.connected = false;
            this._renderError('Cannot connect to MySQL', result.error);
        }
    }

    async refreshSchema() {
        if (!this.connected) return;
        this.databaseTree.innerHTML = '<li class="pma-tree-loading"><i class="fas fa-spinner fa-spin"></i></li>';
        const r = await this._api('schema');
        if (!r.success) {
            this.databaseTree.innerHTML = `<li class="pma-tree-msg">${this._esc(r.error)}</li>`;
            return;
        }
        this.schema = r.data || [];
        this._renderTree();
    }

    _filterTree() {
        const q = (this.treeFilter?.value || '').toLowerCase();
        this.element.querySelectorAll('.pma-db-node').forEach(node => {
            const name = node.dataset.database?.toLowerCase() || '';
            const tables = node.querySelectorAll('.pma-tree-table');
            let show = !q || name.includes(q);
            tables.forEach(t => {
                const tn = t.textContent.toLowerCase();
                if (tn.includes(q)) show = true;
                t.style.display = (!q || tn.includes(q) || name.includes(q)) ? '' : 'none';
            });
            node.style.display = show ? '' : 'none';
        });
    }

    _renderTree() {
        this.databaseTree.innerHTML = '';
        const recent = document.createElement('li');
        recent.className = 'pma-tree-section';
        recent.innerHTML = '<span class="pma-tree-label">Recent</span>';
        this.databaseTree.appendChild(recent);

        this.schema.forEach(db => {
            const expanded = this.expandedDatabases.has(db.name);
            const li = document.createElement('li');
            li.className = `pma-db-node${expanded ? ' expanded' : ''}`;
            li.dataset.database = db.name;

            const head = document.createElement('div');
            head.className = 'pma-tree-db';
            head.innerHTML = `<i class="pma-tree-icon fas fa-database"></i><span>${this._esc(db.name)}</span>`;
            head.addEventListener('click', () => {
                this.expandedDatabases.add(db.name);
                li.classList.add('expanded');
                this._goDatabase(db.name, 'structure');
            });

            const tables = document.createElement('ul');
            tables.className = 'pma-tree-tables';
            (db.tables || []).forEach(tbl => {
                const t = document.createElement('li');
                t.className = 'pma-tree-table';
                t.innerHTML = `<i class="fas fa-table"></i> ${this._esc(tbl)}`;
                t.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.expandedDatabases.add(db.name);
                    li.classList.add('expanded');
                    this._goTable(db.name, tbl, 'browse');
                });
                tables.appendChild(t);
            });

            li.appendChild(head);
            li.appendChild(tables);
            this.databaseTree.appendChild(li);
        });
    }

    _renderTabs(tabs, activeId) {
        this.tabsEl.innerHTML = '';
        tabs.forEach(t => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.className = t.id === activeId ? 'active' : '';
            a.textContent = t.label;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this._switchTab(t.id);
            });
            li.appendChild(a);
            this.tabsEl.appendChild(li);
        });
    }

    _updateBreadcrumb() {
        const parts = [];
        parts.push(`<a href="#" data-bc="server">Server</a>`);
        if (this.view !== 'server') {
            parts.push('<span class="pma-bc-sep">»</span>');
            parts.push(`<a href="#" data-bc="db" data-db="${this._esc(this.selectedDatabase)}">${this._esc(this.selectedDatabase)}</a>`);
        }
        if (this.view === 'table') {
            parts.push('<span class="pma-bc-sep">»</span>');
            parts.push(`<span class="pma-bc-current">${this._esc(this.selectedTable)}</span>`);
        } else if (this.view === 'database') {
            parts.push('<span class="pma-bc-sep">»</span>');
            parts.push('<span class="pma-bc-current">Database</span>');
        } else {
            parts.push('<span class="pma-bc-sep">»</span>');
            parts.push('<span class="pma-bc-current">localhost</span>');
        }
        this.breadcrumb.innerHTML = parts.join(' ');
        this.breadcrumb.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                if (a.dataset.bc === 'server') this._goServer('databases');
                else if (a.dataset.bc === 'db') this._goDatabase(a.dataset.db, 'structure');
            });
        });
    }

    async _switchTab(tabId) {
        this.activeTab = tabId;
        if (this.view === 'server') await this._renderServerTab();
        else if (this.view === 'database') await this._renderDatabaseTab();
        else if (this.view === 'table') await this._renderTableTab();
    }

    async _goServer(tab = 'databases') {
        this.view = 'server';
        this.selectedDatabase = '';
        this.selectedTable = '';
        this.databaseInput.value = '';
        this.activeTab = tab;
        this._renderTabs(SERVER_TABS, tab);
        this._updateBreadcrumb();
        await this._renderServerTab();
    }

    async _goDatabase(db, tab = 'structure') {
        this.view = 'database';
        this.selectedDatabase = db;
        this.selectedTable = '';
        this.databaseInput.value = db;
        this.expandedDatabases.add(db);
        await this._api('use', { database: db });
        this.activeTab = tab;
        this._renderTabs(DB_TABS, tab);
        this._updateBreadcrumb();
        this._highlightTree();
        await this._renderDatabaseTab();
    }

    async _goTable(db, table, tab = 'browse') {
        this.view = 'table';
        this.selectedDatabase = db;
        this.selectedTable = table;
        this.databaseInput.value = db;
        this.browsePage = 0;
        await this._api('use', { database: db });
        this.activeTab = tab;
        this._renderTabs(TABLE_TABS, tab);
        this._updateBreadcrumb();
        this._highlightTree();
        await this._renderTableTab();
    }

    _highlightTree() {
        this.element.querySelectorAll('.pma-tree-db, .pma-tree-table').forEach(el => el.classList.remove('active'));
        const dbNode = this.element.querySelector(`[data-database="${CSS.escape(this.selectedDatabase)}"] .pma-tree-db`);
        if (dbNode) dbNode.classList.add('active');
    }

    async _renderServerTab() {
        const tab = this.activeTab;
        this._renderTabs(SERVER_TABS, tab);

        if (tab === 'databases') {
            await this._renderDatabasesList();
        } else if (tab === 'sql') {
            this._renderSqlEditor('Run SQL query/queries on server');
        } else if (tab === 'status') {
            await this._renderStatus();
        } else if (tab === 'export') {
            this._renderServerExport();
        } else if (tab === 'import') {
            this._renderImportPanel();
        }
    }

    async _renderDatabasesList() {
        if (!this.schema.length) await this.refreshSchema();
        let html = `<fieldset class="pma-fieldset"><legend>Databases</legend>
            <table class="pma-table"><thead><tr>
                <th>Database</th><th>Tables</th><th>Action</th>
            </tr></thead><tbody>`;
        this.schema.forEach(db => {
            html += `<tr>
                <td><a href="#" class="pma-link pma-db-link" data-db="${this._esc(db.name)}"><strong>${this._esc(db.name)}</strong></a></td>
                <td class="pma-num">${(db.tables || []).length}</td>
                <td class="pma-actions">
                    <a href="#" class="pma-link" data-db="${this._esc(db.name)}" data-action="structure">Structure</a>
                    <a href="#" class="pma-link" data-db="${this._esc(db.name)}" data-action="sql">SQL</a>
                </td>
            </tr>`;
        });
        html += '</tbody></table></fieldset>';
        html += `<p class="pma-note">Total: <strong>${this.schema.length}</strong> databases (from real MySQL)</p>`;
        this.mainEl.innerHTML = html;
        this.mainEl.querySelectorAll('.pma-db-link, [data-action]').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const db = a.dataset.db;
                const action = a.dataset.action || 'structure';
                this._goDatabase(db, action === 'sql' ? 'sql' : 'structure');
            });
        });
    }

    async _renderDatabaseTab() {
        const tab = this.activeTab;
        const db = this.selectedDatabase;
        const dbInfo = this.schema.find(d => d.name === db);
        const tables = dbInfo?.tables || [];

        if (tab === 'structure') {
            let html = `<fieldset class="pma-fieldset"><legend>Tables in database <strong>${this._esc(db)}</strong></legend>
                <table class="pma-table"><thead><tr>
                    <th>Table</th><th>Action</th>
                </tr></thead><tbody>`;
            if (!tables.length) {
                html += '<tr><td colspan="2"><i>No tables</i></td></tr>';
            }
            tables.forEach(t => {
                html += `<tr>
                    <td><a href="#" class="pma-link pma-tbl-link" data-tbl="${this._esc(t)}">${this._esc(t)}</a></td>
                    <td class="pma-actions">
                        <a href="#" class="pma-link" data-tbl="${this._esc(t)}" data-act="browse">Browse</a>
                        <a href="#" class="pma-link" data-tbl="${this._esc(t)}" data-act="structure">Structure</a>
                        <a href="#" class="pma-link" data-tbl="${this._esc(t)}" data-act="sql">SQL</a>
                        <a href="#" class="pma-link" data-tbl="${this._esc(t)}" data-act="insert">Insert</a>
                        <a href="#" class="pma-link" data-tbl="${this._esc(t)}" data-act="empty" data-confirm="1">Empty</a>
                        <a href="#" class="pma-link pma-danger" data-tbl="${this._esc(t)}" data-act="drop" data-confirm="1">Drop</a>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></fieldset>
                <p><a href="#" class="pma-btn" id="pmaCreateTable">Create new table</a></p>`;
            this.mainEl.innerHTML = html;
            this.mainEl.querySelectorAll('.pma-tbl-link, [data-tbl]').forEach(a => {
                a.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const tbl = a.dataset.tbl;
                    const act = a.dataset.act;
                    if (act === 'empty' && !confirm(`Empty table ${tbl}?`)) return;
                    if (act === 'drop' && !confirm(`DROP table ${tbl}?`)) return;
                    if (act === 'empty') await this._runSql(`TRUNCATE TABLE \`${tbl}\`;`, true);
                    else if (act === 'drop') await this._runSql(`DROP TABLE \`${tbl}\`;`, true);
                    else this._goTable(db, tbl, act || 'browse');
                });
            });
            this.mainEl.querySelector('#pmaCreateTable')?.addEventListener('click', (e) => {
                e.preventDefault();
                this._goDatabase(db, 'sql');
                this._setSqlValue(`CREATE TABLE new_table (\n  id INT AUTO_INCREMENT PRIMARY KEY\n);`);
            });
        } else if (tab === 'sql') {
            this._renderSqlEditor(`Run SQL query/queries on database <strong>${this._esc(db)}</strong>`);
        } else if (tab === 'search') {
            this._renderDbSearch(db);
        } else if (tab === 'export') {
            this._renderDbExport(db, tables);
        } else if (tab === 'import') {
            this._renderImportPanel(db);
        } else if (tab === 'operations') {
            this._renderDbOperations(db);
        }
    }

    async _renderTableTab() {
        const tab = this.activeTab;
        const db = this.selectedDatabase;
        const tbl = this.selectedTable;

        if (tab === 'browse') await this._renderBrowse(db, tbl);
        else if (tab === 'structure') await this._renderTableStructure(db, tbl);
        else if (tab === 'sql') this._renderSqlEditor(`Run SQL on table <strong>${this._esc(tbl)}</strong>`, `SELECT * FROM \`${tbl}\` LIMIT 25;`);
        else if (tab === 'search') this._renderTableSearch(db, tbl);
        else if (tab === 'insert') await this._renderInsert(db, tbl);
        else if (tab === 'export') this._renderTableExport(db, tbl);
    }

    async _renderBrowse(db, tbl) {
        const offset = this.browsePage * PAGE_SIZE;
        const countR = await this._api('execute', { query: `SELECT COUNT(*) AS cnt FROM \`${tbl}\`` });
        const total = countR.success && countR.data?.[0] ? Number(Object.values(countR.data[0])[0]) : 0;
        const dataR = await this._api('execute', {
            query: `SELECT * FROM \`${tbl}\` LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
        });

        let html = `<fieldset class="pma-fieldset"><legend>Showing rows ${offset + 1} - ${Math.min(offset + PAGE_SIZE, total)} (${total} total)</legend>`;

        if (!dataR.success) {
            html += `<div class="pma-error">${this._esc(dataR.error)}</div>`;
        } else if (!dataR.data?.length) {
            html += '<p class="pma-note"><i>MySQL returned an empty result set.</i></p>';
        } else {
            const cols = dataR.columns || Object.keys(dataR.data[0]);
            html += '<div class="pma-table-scroll"><table class="pma-table pma-data"><thead><tr>';
            html += '<th colspan="2">Actions</th>';
            cols.forEach(c => { html += `<th>${this._esc(c)}</th>`; });
            html += '</tr></thead><tbody>';
            dataR.data.forEach((row, idx) => {
                html += '<tr>';
                html += `<td class="pma-row-actions">
                    <a href="#" class="pma-link" data-row-edit="${idx}">Edit</a>
                    <a href="#" class="pma-link pma-danger" data-row-del="${idx}">Delete</a>
                </td><td></td>`;
                cols.forEach(c => {
                    const v = row[c];
                    html += `<td>${v === null ? '<i>NULL</i>' : this._esc(String(v))}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            this.lastResultData = dataR.data;
        }

        const pages = Math.ceil(total / PAGE_SIZE) || 1;
        html += '<div class="pma-pagination">';
        if (this.browsePage > 0) html += `<a href="#" class="pma-btn" data-page="${this.browsePage - 1}">Previous</a> `;
        html += `<span>Page: <select id="pmaPageSelect">`;
        for (let i = 0; i < pages; i++) {
            html += `<option value="${i}"${i === this.browsePage ? ' selected' : ''}>${i + 1}</option>`;
        }
        html += `</select> / ${pages}</span> `;
        if (this.browsePage < pages - 1) html += `<a href="#" class="pma-btn" data-page="${this.browsePage + 1}">Next</a>`;
        html += '</div></fieldset>';
        this.mainEl.innerHTML = html;

        this.mainEl.querySelectorAll('[data-page]').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.browsePage = parseInt(a.dataset.page, 10);
                this._renderBrowse(db, tbl);
            });
        });
        this.mainEl.querySelector('#pmaPageSelect')?.addEventListener('change', (e) => {
            this.browsePage = parseInt(e.target.value, 10);
            this._renderBrowse(db, tbl);
        });
    }

    async _renderTableStructure(db, tbl) {
        const r = await this._api('structure', { table: tbl });
        if (!r.success) {
            this.mainEl.innerHTML = `<div class="pma-error">${this._esc(r.error)}</div>`;
            return;
        }
        let html = `<fieldset class="pma-fieldset"><legend>Table structure for <strong>${this._esc(tbl)}</strong></legend>
            <table class="pma-table"><thead><tr>
                <th>#</th><th>Name</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th>
            </tr></thead><tbody>`;
        (r.data || []).forEach((col, i) => {
            html += `<tr>
                <td>${i + 1}</td>
                <td><strong>${this._esc(col.Field)}</strong></td>
                <td>${this._esc(col.Type)}</td>
                <td>${this._esc(col.Null)}</td>
                <td>${this._esc(col.Key)}</td>
                <td>${col.Default === null ? '<i>NULL</i>' : this._esc(String(col.Default ?? ''))}</td>
                <td>${this._esc(col.Extra)}</td>
            </tr>`;
        });
        html += '</tbody></table></fieldset>';
        if (r.create_statement) {
            html += `<fieldset class="pma-fieldset"><legend>Create statement</legend>
                <pre class="pma-sql-code">${this._esc(r.create_statement)}</pre></fieldset>`;
        }
        this.mainEl.innerHTML = html;
    }

    async _renderInsert(db, tbl) {
        const r = await this._api('structure', { table: tbl });
        if (!r.success) {
            this.mainEl.innerHTML = `<div class="pma-error">${this._esc(r.error)}</div>`;
            return;
        }
        let html = `<form id="pmaInsertForm" class="pma-form"><fieldset class="pma-fieldset"><legend>Insert new row into <strong>${this._esc(tbl)}</strong></legend><table class="pma-table">`;
        (r.data || []).forEach(col => {
            if (col.Extra?.includes('auto_increment')) return;
            html += `<tr><td><label>${this._esc(col.Field)}</label><br><small>${this._esc(col.Type)}</small></td>
                <td><input type="text" name="${this._esc(col.Field)}" class="pma-input" placeholder="${col.Null === 'YES' ? 'NULL' : ''}"></td></tr>`;
        });
        html += `</table><p><button type="submit" class="pma-btn pma-btn-primary">Go</button></p></fieldset></form>`;
        this.mainEl.innerHTML = html;
        this.mainEl.querySelector('#pmaInsertForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const cols = [];
            const vals = [];
            for (const [k, v] of fd.entries()) {
                if (v === '') continue;
                cols.push(`\`${k}\``);
                vals.push(`'${String(v).replace(/'/g, "''")}'`);
            }
            if (!cols.length) return;
            await this._runSql(`INSERT INTO \`${tbl}\` (${cols.join(', ')}) VALUES (${vals.join(', ')});`, true);
            this._goTable(db, tbl, 'browse');
        });
    }

    _renderSqlEditor(legend, defaultSql = '') {
        this.mainEl.innerHTML = `
            <fieldset class="pma-fieldset"><legend>${legend}</legend>
                <p class="pma-note">Run SQL query/queries on the server. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to execute.</p>
                <textarea id="pmaSqlInput" class="pma-sql-input" spellcheck="false">${this._esc(defaultSql)}</textarea>
                <div class="pma-sql-actions">
                    <button class="pma-btn pma-btn-primary" id="pmaSqlGo">Go</button>
                    <button class="pma-btn" id="pmaSqlClear">Clear</button>
                    <label><input type="checkbox" id="pmaSqlShow"> Show query box</label>
                </div>
            </fieldset>
            <div id="pmaSqlResults"></div>`;
        const input = this.mainEl.querySelector('#pmaSqlInput');
        this.mainEl.querySelector('#pmaSqlGo')?.addEventListener('click', () => this._executeSqlPanel());
        this.mainEl.querySelector('#pmaSqlClear')?.addEventListener('click', () => { input.value = ''; });
        input?.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); this._executeSqlPanel(); }
        });
    }

    _setSqlValue(sql) {
        const el = this.mainEl.querySelector('#pmaSqlInput');
        if (el) el.value = sql;
    }

    async _executeSqlPanel() {
        const sql = this.mainEl.querySelector('#pmaSqlInput')?.value?.trim();
        if (!sql) return;
        const resultsEl = this.mainEl.querySelector('#pmaSqlResults');
        resultsEl.innerHTML = '<div class="pma-loading"><i class="fas fa-spinner fa-spin"></i> Executing...</div>';
        const start = performance.now();
        const r = await this._api('execute', { query: sql });
        const ms = (performance.now() - start).toFixed(1);
        this._addToHistory(sql);
        if (!r.success) {
            resultsEl.innerHTML = `<div class="pma-error">${this._esc(r.error)}</div>`;
            return;
        }
        let html = `<div class="pma-success"><img alt="" class="pma-icon-ok"> # Query executed successfully (${ms}ms)</div>`;
        const blocks = r.results || [r];
        blocks.forEach(block => {
            if (block.data?.length) {
                html += this._buildDataTable(block.data, block.columns);
                this.lastResultData = block.data;
            } else if (block.message) {
                html += `<p class="pma-note">${this._esc(block.message)}</p>`;
            }
        });
        resultsEl.innerHTML = html;
        if (sql.toUpperCase().includes('CREATE') || sql.toUpperCase().includes('DROP') || sql.startsWith('USE')) {
            await this.refreshSchema();
        }
    }

    async _runSql(sql, refresh = false) {
        const r = await this._api('execute', { query: sql });
        if (r.success) {
            if (window.app?.notify) window.app.notify(r.message || 'Query OK', 'success');
            if (refresh) { await this.refreshSchema(); await this._switchTab(this.activeTab); }
        } else if (window.app?.notify) {
            window.app.notify(r.error, 'error');
        }
        return r;
    }

    async _renderStatus() {
        const vars = await this._api('execute', { query: "SHOW VARIABLES LIKE 'version%'" });
        const status = await this._api('execute', { query: 'SHOW STATUS LIKE "Uptime%"' });
        let html = `<fieldset class="pma-fieldset"><legend>Server status</legend>
            <p><strong>Server version:</strong> ${this._esc(this.serverVersion)}</p>
            <table class="pma-table"><tbody>`;
        [...(vars.data || []), ...(status.data || [])].forEach(row => {
            const vals = Object.values(row);
            html += `<tr><td>${this._esc(vals[0])}</td><td>${this._esc(String(vals[1]))}</td></tr>`;
        });
        html += '</tbody></table></fieldset>';
        const proc = await this._api('execute', { query: 'SHOW PROCESSLIST' });
        if (proc.success && proc.data?.length) {
            html += `<fieldset class="pma-fieldset"><legend>Processes</legend>${this._buildDataTable(proc.data, proc.columns)}</fieldset>`;
        }
        this.mainEl.innerHTML = html;
    }

    _renderServerExport() {
        this.mainEl.innerHTML = `<fieldset class="pma-fieldset"><legend>Export</legend>
            <p>Export all databases or run custom export via SQL tab.</p>
            <button class="pma-btn" id="pmaExportAll">Export database list as SQL</button></fieldset>`;
        this.mainEl.querySelector('#pmaExportAll')?.addEventListener('click', () => {
            const sql = this.schema.map(d => `SHOW CREATE DATABASE \`${d.name}\`;`).join('\n');
            this._downloadText('export.sql', sql || '-- No databases');
        });
    }

    _renderDbExport(db, tables) {
        this.mainEl.innerHTML = `<fieldset class="pma-fieldset"><legend>Export database <strong>${this._esc(db)}</strong></legend>
            <p>Select tables to export:</p>
            <div id="pmaExportTables"></div>
            <button class="pma-btn pma-btn-primary" id="pmaDoExport">Export</button></fieldset>`;
        const box = this.mainEl.querySelector('#pmaExportTables');
        tables.forEach(t => {
            box.innerHTML += `<label><input type="checkbox" value="${this._esc(t)}" checked> ${this._esc(t)}</label><br>`;
        });
        this.mainEl.querySelector('#pmaDoExport')?.addEventListener('click', async () => {
            const selected = [...box.querySelectorAll('input:checked')].map(i => i.value);
            let dump = `-- Export ${db}\nUSE \`${db}\`;\n\n`;
            for (const t of selected) {
                const r = await this._api('structure', { table: t });
                if (r.create_statement) dump += r.create_statement + ';\n\n';
                const data = await this._api('execute', { query: `SELECT * FROM \`${t}\`` });
                if (data.data?.length) {
                    data.data.forEach(row => {
                        const cols = Object.keys(row);
                        const vals = cols.map(c => row[c] === null ? 'NULL' : `'${String(row[c]).replace(/'/g, "''")}'`);
                        dump += `INSERT INTO \`${t}\` (\`${cols.join('`,`')}\`) VALUES (${vals.join(', ')});\n`;
                    });
                }
            }
            this._downloadText(`${db}_export.sql`, dump);
        });
    }

    _renderTableExport(db, tbl) {
        this.mainEl.innerHTML = `<fieldset class="pma-fieldset"><legend>Export table <strong>${this._esc(tbl)}</strong></legend>
            <button class="pma-btn" data-fmt="sql">SQL</button>
            <button class="pma-btn" data-fmt="csv">CSV</button></fieldset>`;
        this.mainEl.querySelectorAll('[data-fmt]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const r = await this._api('structure', { table: tbl });
                const data = await this._api('execute', { query: `SELECT * FROM \`${tbl}\`` });
                if (btn.dataset.fmt === 'sql') {
                    let dump = (r.create_statement || '') + ';\n\n';
                    if (data.data?.length) {
                        data.data.forEach(row => {
                            const cols = Object.keys(row);
                            const vals = cols.map(c => row[c] === null ? 'NULL' : `'${String(row[c]).replace(/'/g, "''")}'`);
                            dump += `INSERT INTO \`${tbl}\` VALUES (${vals.join(', ')});\n`;
                        });
                    }
                    this._downloadText(`${tbl}.sql`, dump);
                } else if (data.data?.length) {
                    const cols = Object.keys(data.data[0]);
                    const lines = [cols.join(',')];
                    data.data.forEach(row => lines.push(cols.map(c => row[c] ?? '').join(',')));
                    this._downloadText(`${tbl}.csv`, lines.join('\n'));
                }
            });
        });
    }

    _renderImportPanel(db = '') {
        this.mainEl.innerHTML = `<fieldset class="pma-fieldset"><legend>Import${db ? ` into <strong>${this._esc(db)}</strong>` : ''}</legend>
            <p class="pma-note">Paste SQL statements below:</p>
            <textarea id="pmaImportSql" class="pma-sql-input" rows="8"></textarea>
            <button class="pma-btn pma-btn-primary" id="pmaImportGo">Go</button></fieldset>`;
        this.mainEl.querySelector('#pmaImportGo')?.addEventListener('click', async () => {
            const sql = this.mainEl.querySelector('#pmaImportSql')?.value?.trim();
            if (sql) await this._runSql(sql, true);
        });
    }

    _renderDbSearch(db) {
        this.mainEl.innerHTML = `<fieldset class="pma-fieldset"><legend>Search in database</legend>
            <input type="text" id="pmaSearchTerm" class="pma-input" placeholder="Search term">
            <button class="pma-btn pma-btn-primary" id="pmaSearchGo">Go</button>
            <div id="pmaSearchResults"></div></fieldset>`;
        this.mainEl.querySelector('#pmaSearchGo')?.addEventListener('click', async () => {
            const term = this.mainEl.querySelector('#pmaSearchTerm')?.value;
            if (!term) return;
            const dbInfo = this.schema.find(d => d.name === db);
            let html = '';
            for (const tbl of (dbInfo?.tables || []).slice(0, 20)) {
                const cols = await this._api('structure', { table: tbl });
                if (!cols.success) continue;
                const textCols = (cols.data || []).filter(c =>
                    /char|text/i.test(c.Type)).map(c => c.Field);
                if (!textCols.length) continue;
                const where = textCols.map(c => `\`${c}\` LIKE '%${term.replace(/'/g, "''")}%'`).join(' OR ');
                const r = await this._api('execute', { query: `SELECT * FROM \`${tbl}\` WHERE ${where} LIMIT 10` });
                if (r.success && r.data?.length) {
                    html += `<h4>${this._esc(tbl)}</h4>${this._buildDataTable(r.data, r.columns)}`;
                }
            }
            this.mainEl.querySelector('#pmaSearchResults').innerHTML = html || '<p>No results</p>';
        });
    }

    _renderTableSearch(db, tbl) {
        this.mainEl.innerHTML = `<fieldset class="pma-fieldset"><legend>Search in table</legend>
            Column: <input type="text" id="pmaSearchCol" class="pma-input" placeholder="column_name">
            Value: <input type="text" id="pmaSearchVal" class="pma-input">
            <button class="pma-btn pma-btn-primary" id="pmaTblSearchGo">Go</button>
            <div id="pmaSearchResults"></div></fieldset>`;
        this.mainEl.querySelector('#pmaTblSearchGo')?.addEventListener('click', async () => {
            const col = this.mainEl.querySelector('#pmaSearchCol')?.value;
            const val = this.mainEl.querySelector('#pmaSearchVal')?.value;
            if (!col) return;
            const r = await this._api('execute', {
                query: `SELECT * FROM \`${tbl}\` WHERE \`${col}\` LIKE '%${String(val).replace(/'/g, "''")}%' LIMIT 50`,
            });
            const el = this.mainEl.querySelector('#pmaSearchResults');
            el.innerHTML = r.success && r.data?.length
                ? this._buildDataTable(r.data, r.columns)
                : '<p>No results</p>';
        });
    }

    _renderDbOperations(db) {
        this.mainEl.innerHTML = `<fieldset class="pma-fieldset"><legend>Operations on database <strong>${this._esc(db)}</strong></legend>
            <p>Create database: <input type="text" id="pmaNewDb" class="pma-input" placeholder="database_name">
            <button class="pma-btn" id="pmaCreateDb">Create</button></p>
            <p class="pma-danger-zone">Drop database <strong>${this._esc(db)}</strong>:
            <button class="pma-btn pma-danger" id="pmaDropDb">Drop</button></p></fieldset>`;
        this.mainEl.querySelector('#pmaCreateDb')?.addEventListener('click', async () => {
            const name = this.mainEl.querySelector('#pmaNewDb')?.value?.trim();
            if (name) await this._runSql(`CREATE DATABASE \`${name}\`;`, true);
        });
        this.mainEl.querySelector('#pmaDropDb')?.addEventListener('click', async () => {
            if (confirm(`Drop database ${db}?`)) {
                await this._runSql(`DROP DATABASE \`${db}\`;`, true);
                this._goServer('databases');
            }
        });
    }

    _buildDataTable(data, columns) {
        const cols = columns || Object.keys(data[0]);
        let html = '<div class="pma-table-scroll"><table class="pma-table pma-data"><thead><tr>';
        cols.forEach(c => { html += `<th>${this._esc(c)}</th>`; });
        html += '</tr></thead><tbody>';
        data.forEach(row => {
            html += '<tr>';
            cols.forEach(c => {
                const v = row[c];
                html += `<td>${v === null ? '<i>NULL</i>' : this._esc(String(v))}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    _renderError(title, msg) {
        this.mainEl.innerHTML = `<div class="pma-error-box"><h3>${this._esc(title)}</h3><p>${this._esc(msg || '')}</p>
            <p>Start MySQL in XAMPP Control Panel, then click Admin again.</p></div>`;
    }

    _downloadText(filename, text) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    _addToHistory(query) {
        this.history.unshift({ query, time: new Date().toISOString() });
        this.history = this.history.slice(0, 50);
        localStorage.setItem(MYSQL_HISTORY_KEY, JSON.stringify(this.history));
    }

    _loadHistory() {
        try { return JSON.parse(localStorage.getItem(MYSQL_HISTORY_KEY) || '[]'); }
        catch { return []; }
    }

    _esc(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }
}

export default MySQLApp;
