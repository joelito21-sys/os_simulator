class DatabaseSimulator {
    constructor() {
        this.databases = {};
        this.currentDb = 'default';
        this.queryHistory = [];
        this.useRealDatabase = false;
        this.realDbConnection = null;
        this.currentRealDb = null;
        this.initializeElements();
        this.initializeDefaultDatabase();
        this.loadFromLocalStorage();
        
        // Ensure we always have at least the default database
        if (!this.databases['default']) {
            console.log('Default database not found, reinitializing...');
            this.initializeDefaultDatabase();
        }
        
        this.bindEvents();
        this.updateDatabaseSelector();
        this.loadSchema();
        this.displayHistory();
        
        // Auto-connect to real MySQL on page load
        this.autoConnectToMySQL();
        
        console.log('Database Simulator initialized with databases:', Object.keys(this.databases));
    }

    initializeDefaultDatabase() {
        this.databases['default'] = {
            tables: {
                users: {
                    schema: {
                        id: { type: 'INTEGER', primary_key: true, auto_increment: true },
                        name: { type: 'VARCHAR', length: 100 },
                        email: { type: 'VARCHAR', length: 255, unique: true },
                        age: { type: 'INTEGER', check: 'age >= 0' },
                        status: { type: 'VARCHAR', length: 20, default: 'active' },
                        created_at: { type: 'DATETIME', default: 'CURRENT_TIMESTAMP' }
                    },
                    indexes: [
                        { name: 'idx_email', columns: ['email'], unique: true },
                        { name: 'idx_status', columns: ['status'] }
                    ],
                    data: [
                        { id: 1, name: 'John Doe', email: 'john@example.com', age: 25, status: 'active', created_at: '2023-01-15 10:30:00' },
                        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 30, status: 'active', created_at: '2023-02-20 14:15:00' },
                        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35, status: 'inactive', created_at: '2023-03-10 09:45:00' },
                        { id: 4, name: 'Alice Brown', email: 'alice@example.com', age: 28, status: 'active', created_at: '2023-04-05 16:20:00' },
                        { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', age: 32, status: 'active', created_at: '2023-05-12 11:00:00' }
                    ],
                    auto_increment: 6
                },
                products: {
                    schema: {
                        id: { type: 'INTEGER', primary_key: true, auto_increment: true },
                        name: { type: 'VARCHAR', length: 200, not_null: true },
                        price: { type: 'DECIMAL', precision: 10, scale: 2, check: 'price >= 0' },
                        category: { type: 'VARCHAR', length: 50 },
                        stock: { type: 'INTEGER', default: 0, check: 'stock >= 0' },
                        created_at: { type: 'DATETIME', default: 'CURRENT_TIMESTAMP' }
                    },
                    indexes: [
                        { name: 'idx_category', columns: ['category'] },
                        { name: 'idx_price', columns: ['price'] }
                    ],
                    data: [
                        { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', stock: 50, created_at: '2023-01-10 08:00:00' },
                        { id: 2, name: 'Mouse', price: 25.50, category: 'Electronics', stock: 200, created_at: '2023-01-10 08:05:00' },
                        { id: 3, name: 'Keyboard', price: 75.00, category: 'Electronics', stock: 150, created_at: '2023-01-10 08:10:00' },
                        { id: 4, name: 'Monitor', price: 299.99, category: 'Electronics', stock: 80, created_at: '2023-01-11 09:00:00' },
                        { id: 5, name: 'Desk Chair', price: 199.99, category: 'Furniture', stock: 30, created_at: '2023-01-12 10:00:00' },
                        { id: 6, name: 'Webcam', price: 89.99, category: 'Electronics', stock: 120, created_at: '2023-01-13 11:00:00' }
                    ],
                    auto_increment: 7
                },
                orders: {
                    schema: {
                        id: { type: 'INTEGER', primary_key: true, auto_increment: true },
                        user_id: { type: 'INTEGER', foreign_key: { table: 'users', column: 'id' } },
                        product_id: { type: 'INTEGER', foreign_key: { table: 'products', column: 'id' } },
                        quantity: { type: 'INTEGER', check: 'quantity > 0' },
                        total_price: { type: 'DECIMAL', precision: 10, scale: 2 },
                        status: { type: 'VARCHAR', length: 20, default: 'pending' },
                        order_date: { type: 'DATETIME', default: 'CURRENT_TIMESTAMP' }
                    },
                    indexes: [
                        { name: 'idx_user_id', columns: ['user_id'] },
                        { name: 'idx_order_date', columns: ['order_date'] }
                    ],
                    data: [
                        { id: 1, user_id: 1, product_id: 1, quantity: 1, total_price: 999.99, status: 'completed', order_date: '2023-06-01 14:30:00' },
                        { id: 2, user_id: 2, product_id: 3, quantity: 2, total_price: 150.00, status: 'completed', order_date: '2023-06-02 10:15:00' },
                        { id: 3, user_id: 1, product_id: 2, quantity: 3, total_price: 76.50, status: 'shipped', order_date: '2023-06-03 16:45:00' },
                        { id: 4, user_id: 3, product_id: 5, quantity: 1, total_price: 199.99, status: 'pending', order_date: '2023-06-04 09:20:00' }
                    ],
                    auto_increment: 5
                },
                categories: {
                    schema: {
                        id: { type: 'INTEGER', primary_key: true, auto_increment: true },
                        name: { type: 'VARCHAR', length: 100, unique: true },
                        description: { type: 'TEXT' }
                    },
                    indexes: [],
                    data: [
                        { id: 1, name: 'Electronics', description: 'Electronic devices and accessories' },
                        { id: 2, name: 'Furniture', description: 'Office and home furniture' },
                        { id: 3, name: 'Books', description: 'Physical and digital books' }
                    ],
                    auto_increment: 4
                }
            },
            views: {},
            triggers: [],
            transactions: {
                active: false,
                backup: null
            }
        };
    }

    initializeElements() {
        this.queryInput = document.getElementById('queryInput');
        this.executeBtn = document.getElementById('executeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.sampleQueriesBtn = document.getElementById('sampleQueriesBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.schemaContainer = document.getElementById('schemaContainer');
        this.historyContainer = document.getElementById('historyContainer');
        this.rowCount = document.getElementById('rowCount');
        this.executionTime = document.getElementById('executionTime');
        this.refreshSchemaBtn = document.getElementById('refreshSchemaBtn');
        this.clearResultsBtn = document.getElementById('clearResultsBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.dbSelect = document.getElementById('dbSelect');
        this.createDbBtn = document.getElementById('createDbBtn');
        this.modal = document.getElementById('sampleQueriesModal');
        this.closeBtn = document.querySelector('.close');
        this.createDbModal = document.getElementById('createDbModal');
        this.closeDbBtn = document.querySelector('.close-db');
        this.dbNameInput = document.getElementById('dbNameInput');
        this.confirmCreateDbBtn = document.getElementById('confirmCreateDbBtn');
        this.cancelCreateDbBtn = document.getElementById('cancelCreateDbBtn');
        this.currentDbIndicator = document.getElementById('currentDbIndicator');
        this.resetDbBtn = document.getElementById('resetDbBtn');
        this.connectRealDbBtn = document.getElementById('connectRealDbBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.realDbSelector = document.getElementById('realDbSelector');
        this.realDbSelect = document.getElementById('realDbSelect');
    }

    bindEvents() {
        this.executeBtn.addEventListener('click', () => this.executeQuery());
        this.clearBtn.addEventListener('click', () => this.clearQuery());
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.sampleQueriesBtn.addEventListener('click', () => this.showSampleQueries());
        this.refreshSchemaBtn.addEventListener('click', () => this.loadSchema());
        this.clearResultsBtn.addEventListener('click', () => this.clearResults());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.dbSelect.addEventListener('change', (e) => this.switchDatabase(e.target.value));
        this.createDbBtn.addEventListener('click', () => this.showCreateDbModal());
        this.confirmCreateDbBtn.addEventListener('click', () => this.createDatabase());
        this.cancelCreateDbBtn.addEventListener('click', () => this.hideCreateDbModal());
        this.resetDbBtn.addEventListener('click', () => this.resetDatabases());
        this.connectRealDbBtn.addEventListener('click', () => this.toggleRealDatabase());
        this.realDbSelect.addEventListener('change', (e) => this.switchRealDatabase(e.target.value));
        
        // Quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.queryInput.value = e.target.dataset.query;
                this.executeQuery();
            });
        });

        // Sample query buttons in modal
        document.querySelectorAll('.sample-query').forEach(sample => {
            sample.addEventListener('click', (e) => {
                const query = e.currentTarget.dataset.query;
                this.queryInput.value = query;
                this.hideModal();
                this.executeQuery();
            });
        });

        // Modal events
        this.closeBtn.addEventListener('click', () => this.hideModal());
        this.closeDbBtn.addEventListener('click', () => this.hideCreateDbModal());
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
            if (e.target === this.createDbModal) {
                this.hideCreateDbModal();
            }
        });

        // Keyboard shortcuts
        this.queryInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.executeQuery();
            }
        });

        // Auto-resize textarea
        this.queryInput.addEventListener('input', () => {
            this.queryInput.style.height = 'auto';
            this.queryInput.style.height = this.queryInput.scrollHeight + 'px';
        });

        // Enter key for database name input
        this.dbNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.createDatabase();
            }
        });
    }

    async executeQuery() {
        const query = this.queryInput.value.trim();
        
        if (!query) {
            this.showError('Please enter a SQL query');
            return;
        }

        this.showLoading();
        const startTime = performance.now();

        try {
            let result;
            
            // Route to real database if connected
            if (this.useRealDatabase && this.currentRealDb) {
                result = await this.executeRealQuery(query);
            } else {
                result = this.processQuery(query);
            }
            
            const endTime = performance.now();
            const executionTime = (endTime - startTime).toFixed(2);

            this.displayResults(result, executionTime);
            this.addToHistory(query, result.success);
            
            // Only save to localStorage if using simulated database
            if (!this.useRealDatabase) {
                this.saveToLocalStorage();
                this.loadSchema();
            }
        } catch (error) {
            this.showError('Error executing query: ' + error.message);
        }
    }

    processQuery(query) {
        const db = this.databases[this.currentDb];
        const sql = query.trim();
        const sqlUpper = sql.toUpperCase();
        
        // Transaction control
        if (sqlUpper === 'BEGIN' || sqlUpper === 'START TRANSACTION') {
            return this.beginTransaction(db);
        } else if (sqlUpper === 'COMMIT') {
            return this.commitTransaction(db);
        } else if (sqlUpper === 'ROLLBACK') {
            return this.rollbackTransaction(db);
        }
        
        // DDL operations
        if (sqlUpper.startsWith('SELECT')) {
            return this.executeSelect(sql, db);
        } else if (sqlUpper.startsWith('INSERT')) {
            return this.executeInsert(sql, db);
        } else if (sqlUpper.startsWith('UPDATE')) {
            return this.executeUpdate(sql, db);
        } else if (sqlUpper.startsWith('DELETE')) {
            return this.executeDelete(sql, db);
        } else if (sqlUpper.startsWith('SHOW TABLES')) {
            return this.showTables(db);
        } else if (sqlUpper.startsWith('DESCRIBE') || sqlUpper.startsWith('DESC ')) {
            return this.describeTable(sql, db);
        } else if (sqlUpper.startsWith('CREATE TABLE')) {
            return this.createTable(sql, db);
        } else if (sqlUpper.startsWith('DROP TABLE')) {
            return this.dropTable(sql, db);
        } else if (sqlUpper.startsWith('ALTER TABLE')) {
            return this.alterTable(sql, db);
        } else if (sqlUpper.startsWith('CREATE INDEX')) {
            return this.createIndex(sql, db);
        } else if (sqlUpper.startsWith('DROP INDEX')) {
            return this.dropIndex(sql, db);
        } else if (sqlUpper.startsWith('CREATE VIEW')) {
            return this.createView(sql, db);
        } else if (sqlUpper.startsWith('DROP VIEW')) {
            return this.dropView(sql, db);
        } else if (sqlUpper.startsWith('SHOW INDEX')) {
            return this.showIndexes(sql, db);
        } else if (sqlUpper.startsWith('SHOW')) {
            return this.showCommand(sql, db);
        } else if (sqlUpper.startsWith('USE ')) {
            return this.useDatabase(sql, db);
        } else if (sqlUpper.startsWith('EXPLAIN')) {
            return this.explainQuery(sql, db);
        } else {
            throw new Error('Unsupported query type. Supported: SELECT, INSERT, UPDATE, DELETE, SHOW, DESCRIBE, CREATE, DROP, ALTER, BEGIN, COMMIT, ROLLBACK, EXPLAIN');
        }
    }

    displayResults(result, executionTime) {
        this.hideLoading();
        
        if (result.success) {
            if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                this.displayTable(result.data, result.query);
                this.rowCount.textContent = `${result.row_count || result.data.length} rows`;
            } else if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
                // For DESCRIBE or schema results
                this.displayTable(Object.entries(result.data).map(([field, info]) => ({
                    Field: field,
                    Type: info.type || 'UNKNOWN',
                    Key: info.primary_key ? 'PRI' : '',
                    Extra: info.auto_increment ? 'auto_increment' : ''
                })), result.query);
                this.rowCount.textContent = `${Object.keys(result.data).length} columns`;
            } else {
                this.displaySuccess(result.message || 'Query executed successfully', result.query);
                this.rowCount.textContent = result.affected_rows !== undefined ? `${result.affected_rows} rows affected` : '0 rows';
            }
            this.executionTime.textContent = `(${executionTime}ms)`;
        } else {
            this.showError(result.error || 'Unknown error occurred', result.query);
            this.rowCount.textContent = '0 rows';
            this.executionTime.textContent = `(${executionTime}ms)`;
        }
    }

    displayTable(data, query) {
        const columns = Object.keys(data[0]);
        
        let html = `
            <div class="query-display">${this.escapeHtml(query)}</div>
            <table class="results-table">
                <thead>
                    <tr>
        `;
        
        columns.forEach(column => {
            html += `<th>${this.escapeHtml(column)}</th>`;
        });
        
        html += `
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(row => {
            html += '<tr>';
            columns.forEach(column => {
                const value = row[column];
                const displayValue = value === null ? 'NULL' : 
                                    value === '' ? '(empty)' : 
                                    this.escapeHtml(String(value));
                html += `<td>${displayValue}</td>`;
            });
            html += '</tr>';
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        this.resultsContainer.innerHTML = html;
    }

    displaySuccess(message, query) {
        const html = `
            <div class="query-display">${this.escapeHtml(query)}</div>
            <div class="success-message">
                <strong>Success:</strong> ${this.escapeHtml(message)}
            </div>
        `;
        this.resultsContainer.innerHTML = html;
    }

    showError(message, query = null) {
        const html = `
            ${query ? `<div class="query-display">${this.escapeHtml(query)}</div>` : ''}
            <div class="error-message">
                <strong>Error:</strong> ${this.escapeHtml(message)}
            </div>
        `;
        this.resultsContainer.innerHTML = html;
    }

    clearQuery() {
        this.queryInput.value = '';
        this.queryInput.style.height = 'auto';
        this.resultsContainer.innerHTML = '<div class="placeholder"><p>Execute a query to see results here</p></div>';
        this.rowCount.textContent = '';
        this.executionTime.textContent = '';
    }

    showSampleQueries() {
        this.modal.style.display = 'block';
    }

    hideModal() {
        this.modal.style.display = 'none';
    }

    async loadSchema() {
        const db = this.databases[this.currentDb];
        if (!db) {
            this.schemaContainer.innerHTML = '<div class="placeholder"><p>No database selected</p></div>';
            return;
        }
        
        const tables = Object.keys(db.tables);
        this.displaySchema(tables.map(t => ({ table_name: t })));
    }

    async displaySchema(tables) {
        const db = this.databases[this.currentDb];
        let html = '';
        
        for (const table of tables) {
            const tableName = typeof table === 'string' ? table : table.table_name;
            const tableInfo = db.tables[tableName];
            
            if (tableInfo && tableInfo.schema) {
                html += `
                    <div class="table-name">Table: ${this.escapeHtml(tableName)}</div>
                    <table class="schema-table">
                        <thead>
                            <tr>
                                <th>Column</th>
                                <th>Type</th>
                                <th>Key</th>
                                <th>Extra</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                Object.entries(tableInfo.schema).forEach(([column, info]) => {
                    let type = info.type || 'UNKNOWN';
                    if (info.length) {
                        type += `(${info.length})`;
                    } else if (info.precision && info.scale) {
                        type += `(${info.precision},${info.scale})`;
                    }
                    
                    const key = info.primary_key ? 'PRI' : '';
                    const extra = info.auto_increment ? 'auto_increment' : '';
                    
                    html += `
                        <tr>
                            <td><strong>${this.escapeHtml(column)}</strong></td>
                            <td>${this.escapeHtml(type)}</td>
                            <td>${key}</td>
                            <td>${extra}</td>
                        </tr>
                    `;
                });
                
                html += `
                        </tbody>
                    </table>
                `;
            }
        }
        
        if (html) {
            this.schemaContainer.innerHTML = html;
        } else {
            this.schemaContainer.innerHTML = '<div class="placeholder"><p>No tables in database</p></div>';
        }
    }

    showLoading() {
        this.resultsContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div class="loading"></div>
                <p style="margin-top: 1rem; color: #6c757d;">Executing query...</p>
            </div>
        `;
    }

    hideLoading() {
        // Loading will be replaced by result display
    }

    // SQL Execution Methods
    executeSelect(sql, db) {
        // Check for JOIN syntax
        if (sql.toUpperCase().includes(' JOIN ')) {
            return this.executeJoin(sql, db);
        }
        
        // Check for GROUP BY with aggregate functions
        if (sql.toUpperCase().includes('GROUP BY')) {
            return this.executeGroupBy(sql, db);
        }
        
        const match = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?(?:\s+OFFSET\s+(\d+))?$/i);
        
        if (!match) {
            throw new Error('Invalid SELECT syntax');
        }
        
        const columns = match[1].trim();
        const tableName = match[2].trim();
        const whereClause = match[3] ? match[3].trim() : '';
        const orderBy = match[4] ? match[4].trim() : '';
        const limit = match[5] ? parseInt(match[5]) : null;
        const offset = match[6] ? parseInt(match[6]) : 0;
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        let result = [...db.tables[tableName].data];
        
        // Apply WHERE clause
        if (whereClause) {
            result = result.filter(row => this.evaluateWhereClause(row, whereClause));
        }
        
        // Apply ORDER BY
        if (orderBy) {
            result = this.applyOrderBy(result, orderBy);
        }
        
        // Apply OFFSET
        if (offset > 0) {
            result = result.slice(offset);
        }
        
        // Apply LIMIT
        if (limit) {
            result = result.slice(0, limit);
        }
        
        // Select columns
        if (columns !== '*') {
            const selectedColumns = columns.split(',').map(c => c.trim());
            result = result.map(row => {
                const newRow = {};
                selectedColumns.forEach(col => {
                    newRow[col] = row[col] !== undefined ? row[col] : null;
                });
                return newRow;
            });
        }
        
        return {
            success: true,
            data: result,
            row_count: result.length,
            query: sql
        };
    }

    executeInsert(sql, db) {
        const match = sql.match(/INSERT\s+INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
        
        if (!match) {
            throw new Error('Invalid INSERT syntax');
        }
        
        const tableName = match[1].trim();
        const columns = match[2].split(',').map(c => c.trim());
        const values = this.parseValues(match[3]);
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        const newRow = {};
        const schema = db.tables[tableName].schema;
        
        // Validate and insert values
        columns.forEach((column, i) => {
            if (!schema[column]) {
                throw new Error(`Column '${column}' does not exist in table '${tableName}'`);
            }
            
            let value = values[i];
            
            // Check NOT NULL constraint
            if (schema[column].not_null && (value === null || value === undefined)) {
                throw new Error(`Column '${column}' cannot be NULL`);
            }
            
            // Check UNIQUE constraint
            if (schema[column].unique && value !== null) {
                const exists = db.tables[tableName].data.some(row => row[column] === value);
                if (exists) {
                    throw new Error(`Duplicate entry '${value}' for unique column '${column}'`);
                }
            }
            
            // Check CHECK constraint
            if (schema[column].check) {
                // Simple check constraint validation
                const checkExpr = schema[column].check;
                if (checkExpr.includes('>= 0') && value < 0) {
                    throw new Error(`Check constraint violated for column '${column}'`);
                }
                if (checkExpr.includes('> 0') && value <= 0) {
                    throw new Error(`Check constraint violated for column '${column}'`);
                }
            }
            
            newRow[column] = value;
        });
        
        // Set default values for missing columns
        Object.entries(schema).forEach(([colName, colInfo]) => {
            if (!(colName in newRow)) {
                if (colInfo.default === 'CURRENT_TIMESTAMP') {
                    newRow[colName] = new Date().toISOString().slice(0, 19).replace('T', ' ');
                } else if (colInfo.default !== undefined) {
                    newRow[colName] = colInfo.default;
                }
            }
        });
        
        // Auto-increment primary key
        for (const [colName, colInfo] of Object.entries(schema)) {
            if (colInfo.primary_key && colInfo.auto_increment && !newRow[colName]) {
                newRow[colName] = db.tables[tableName].auto_increment || (db.tables[tableName].data.length + 1);
                db.tables[tableName].auto_increment = newRow[colName] + 1;
            }
        }
        
        db.tables[tableName].data.push(newRow);
        
        return {
            success: true,
            message: 'Record inserted successfully',
            inserted_id: newRow.id || null,
            query: sql
        };
    }

    executeUpdate(sql, db) {
        const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)\s+WHERE\s+(.*)/i);
        
        if (!match) {
            throw new Error('Invalid UPDATE syntax');
        }
        
        const tableName = match[1].trim();
        const setClause = match[2].trim();
        const whereClause = match[3].trim();
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        const updates = this.parseSetClause(setClause);
        let affectedRows = 0;
        
        db.tables[tableName].data.forEach(row => {
            if (this.evaluateWhereClause(row, whereClause)) {
                Object.assign(row, updates);
                affectedRows++;
            }
        });
        
        return {
            success: true,
            message: 'Records updated successfully',
            affected_rows: affectedRows,
            query: sql
        };
    }

    executeDelete(sql, db) {
        const match = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*))?$/i);
        
        if (!match) {
            throw new Error('Invalid DELETE syntax');
        }
        
        const tableName = match[1].trim();
        const whereClause = match[2] ? match[2].trim() : '';
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        if (!whereClause) {
            throw new Error('DELETE without WHERE clause is not allowed for safety');
        }
        
        const originalCount = db.tables[tableName].data.length;
        db.tables[tableName].data = db.tables[tableName].data.filter(row => 
            !this.evaluateWhereClause(row, whereClause)
        );
        
        const affectedRows = originalCount - db.tables[tableName].data.length;
        
        return {
            success: true,
            message: 'Records deleted successfully',
            affected_rows: affectedRows,
            query: sql
        };
    }

    showTables(db) {
        const tables = Object.keys(db.tables).map(name => ({ table_name: name }));
        return {
            success: true,
            data: tables,
            query: 'SHOW TABLES'
        };
    }

    describeTable(sql, db) {
        const match = sql.match(/DESCRIBE\s+(\w+)/i);
        
        if (!match) {
            throw new Error('Invalid DESCRIBE syntax');
        }
        
        const tableName = match[1].trim();
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        return {
            success: true,
            data: db.tables[tableName].schema,
            query: sql
        };
    }

    createTable(sql, db) {
        const match = sql.match(/CREATE\s+TABLE\s+(\w+)\s*\((.*)\)/i);
        
        if (!match) {
            throw new Error('Invalid CREATE TABLE syntax. Example: CREATE TABLE users (id, name, email)');
        }
        
        const tableName = match[1].trim();
        const columnsStr = match[2].trim();
        
        if (db.tables[tableName]) {
            throw new Error(`Table '${tableName}' already exists`);
        }
        
        const columns = columnsStr.split(',').map(c => c.trim());
        const schema = {};
        
        columns.forEach(col => {
            const parts = col.split(/\s+/);
            const colName = parts[0];
            schema[colName] = {
                type: parts[1] || 'VARCHAR',
                primary_key: colName.toLowerCase() === 'id',
                auto_increment: colName.toLowerCase() === 'id'
            };
        });
        
        db.tables[tableName] = {
            schema: schema,
            data: []
        };
        
        return {
            success: true,
            message: `Table '${tableName}' created successfully`,
            query: sql
        };
    }

    dropTable(sql, db) {
        const match = sql.match(/DROP\s+TABLE\s+(\w+)/i);
        
        if (!match) {
            throw new Error('Invalid DROP TABLE syntax');
        }
        
        const tableName = match[1].trim();
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        delete db.tables[tableName];
        
        return {
            success: true,
            message: `Table '${tableName}' dropped successfully`,
            query: sql
        };
    }

    alterTable(sql, db) {
        // Simplified ALTER TABLE implementation
        return {
            success: true,
            message: 'ALTER TABLE executed (simplified implementation)',
            query: sql
        };
    }

    // JOIN Operations
    executeJoin(sql, db) {
        const joinMatch = sql.match(
            /SELECT\s+(.*?)\s+FROM\s+(\w+)\s+(?:AS\s+)?(\w+)?\s+INNER\s+JOIN\s+(\w+)\s+(?:AS\s+)?(\w+)?\s+ON\s+(\S+)\s*=\s*(\S+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?$/i
        );
        
        if (!joinMatch) {
            throw new Error('Invalid JOIN syntax. Example: SELECT * FROM orders o INNER JOIN users u ON o.user_id = u.id');
        }
        
        const columns = joinMatch[1].trim();
        const table1Name = joinMatch[2];
        const alias1 = joinMatch[3] || table1Name;
        const table2Name = joinMatch[4];
        const alias2 = joinMatch[5] || table2Name;
        const joinCol1 = joinMatch[6];
        const joinCol2 = joinMatch[7];
        const whereClause = joinMatch[8] ? joinMatch[8].trim() : '';
        const orderBy = joinMatch[9] ? joinMatch[9].trim() : '';
        const limit = joinMatch[10] ? parseInt(joinMatch[10]) : null;
        
        if (!db.tables[table1Name] || !db.tables[table2Name]) {
            throw new Error('One or both tables do not exist');
        }
        
        let result = [];
        
        db.tables[table1Name].data.forEach(row1 => {
            db.tables[table2Name].data.forEach(row2 => {
                const val1 = this.resolveColumnValue(row1, joinCol1, alias1);
                const val2 = this.resolveColumnValue(row2, joinCol2, alias2);
                
                if (val1 === val2) {
                    const joinedRow = {};
                    
                    // Add columns from both tables with aliases
                    Object.keys(row1).forEach(key => {
                        joinedRow[`${alias1}.${key}`] = row1[key];
                        if (alias1 === alias2) {
                            joinedRow[`${alias1}_${key}`] = row1[key];
                        }
                    });
                    
                    Object.keys(row2).forEach(key => {
                        joinedRow[`${alias2}.${key}`] = row2[key];
                        if (alias1 === alias2) {
                            joinedRow[`${alias2}_${key}`] = row2[key];
                        }
                    });
                    
                    result.push(joinedRow);
                }
            });
        });
        
        // Apply WHERE clause
        if (whereClause) {
            result = result.filter(row => this.evaluateWhereClause(row, whereClause));
        }
        
        // Apply ORDER BY
        if (orderBy) {
            result = this.applyOrderBy(result, orderBy);
        }
        
        // Apply LIMIT
        if (limit) {
            result = result.slice(0, limit);
        }
        
        return {
            success: true,
            data: result,
            row_count: result.length,
            query: sql
        };
    }

    resolveColumnValue(row, column, alias) {
        const cleanCol = column.replace(/^[\w]+\./, '');
        return row[column] !== undefined ? row[column] : row[cleanCol];
    }

    // GROUP BY with Aggregates
    executeGroupBy(sql, db) {
        const match = sql.match(
            /SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*?))?\s+GROUP\s+BY\s+(.*?)(?:\s+HAVING\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?$/i
        );
        
        if (!match) {
            throw new Error('Invalid GROUP BY syntax');
        }
        
        const columns = match[1].trim();
        const tableName = match[2].trim();
        const whereClause = match[3] ? match[3].trim() : '';
        const groupByCol = match[4].trim();
        const havingClause = match[5] ? match[5].trim() : '';
        const orderBy = match[6] ? match[6].trim() : '';
        const limit = match[7] ? parseInt(match[7]) : null;
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        let data = [...db.tables[tableName].data];
        
        // Apply WHERE
        if (whereClause) {
            data = data.filter(row => this.evaluateWhereClause(row, whereClause));
        }
        
        // Group data
        const groups = {};
        data.forEach(row => {
            const key = row[groupByCol];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(row);
        });
        
        // Apply aggregate functions
        const result = Object.entries(groups).map(([key, rows]) => {
            const resultRow = { [groupByCol]: key };
            
            columns.split(',').forEach(col => {
                const colTrimmed = col.trim();
                
                if (colTrimmed.toUpperCase().startsWith('COUNT(')) {
                    resultRow[colTrimmed] = rows.length;
                } else if (colTrimmed.toUpperCase().startsWith('SUM(')) {
                    const colName = colTrimmed.match(/\((.*?)\)/)[1];
                    resultRow[colTrimmed] = rows.reduce((sum, row) => sum + (parseFloat(row[colName]) || 0), 0);
                } else if (colTrimmed.toUpperCase().startsWith('AVG(')) {
                    const colName = colTrimmed.match(/\((.*?)\)/)[1];
                    resultRow[colTrimmed] = rows.reduce((sum, row) => sum + (parseFloat(row[colName]) || 0), 0) / rows.length;
                } else if (colTrimmed.toUpperCase().startsWith('MAX(')) {
                    const colName = colTrimmed.match(/\((.*?)\)/)[1];
                    resultRow[colTrimmed] = Math.max(...rows.map(row => parseFloat(row[colName]) || 0));
                } else if (colTrimmed.toUpperCase().startsWith('MIN(')) {
                    const colName = colTrimmed.match(/\((.*?)\)/)[1];
                    resultRow[colTrimmed] = Math.min(...rows.map(row => parseFloat(row[colName]) || 0));
                } else {
                    resultRow[colTrimmed] = rows[0][colTrimmed];
                }
            });
            
            return resultRow;
        });
        
        // Apply HAVING
        let filtered = result;
        if (havingClause) {
            filtered = result.filter(row => this.evaluateWhereClause(row, havingClause));
        }
        
        // Apply ORDER BY
        if (orderBy) {
            filtered = this.applyOrderBy(filtered, orderBy);
        }
        
        // Apply LIMIT
        if (limit) {
            filtered = filtered.slice(0, limit);
        }
        
        return {
            success: true,
            data: filtered,
            row_count: filtered.length,
            query: sql
        };
    }

    // Transaction Control
    beginTransaction(db) {
        if (db.transactions.active) {
            throw new Error('Transaction already in progress');
        }
        
        db.transactions.active = true;
        db.transactions.backup = JSON.parse(JSON.stringify(db.tables));
        
        return {
            success: true,
            message: 'Transaction started. Use COMMIT to save or ROLLBACK to cancel.',
            query: 'BEGIN'
        };
    }

    commitTransaction(db) {
        if (!db.transactions.active) {
            throw new Error('No active transaction to commit');
        }
        
        db.transactions.active = false;
        db.transactions.backup = null;
        
        return {
            success: true,
            message: 'Transaction committed successfully. Changes saved.',
            query: 'COMMIT'
        };
    }

    rollbackTransaction(db) {
        if (!db.transactions.active) {
            throw new Error('No active transaction to rollback');
        }
        
        db.tables = db.transactions.backup;
        db.transactions.active = false;
        db.transactions.backup = null;
        
        return {
            success: true,
            message: 'Transaction rolled back. All changes discarded.',
            query: 'ROLLBACK'
        };
    }

    // Index Management
    createIndex(sql, db) {
        const match = sql.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(\w+)\s+ON\s+(\w+)\s*\((.*?)\)/i);
        
        if (!match) {
            throw new Error('Invalid CREATE INDEX syntax. Example: CREATE INDEX idx_name ON users(name)');
        }
        
        const indexName = match[1].trim();
        const tableName = match[2].trim();
        const columns = match[3].split(',').map(c => c.trim());
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        if (!db.tables[tableName].indexes) {
            db.tables[tableName].indexes = [];
        }
        
        db.tables[tableName].indexes.push({
            name: indexName,
            columns: columns,
            unique: sql.toUpperCase().includes('UNIQUE')
        });
        
        return {
            success: true,
            message: `Index '${indexName}' created on ${tableName}(${columns.join(', ')})`,
            query: sql
        };
    }

    dropIndex(sql, db) {
        const match = sql.match(/DROP\s+INDEX\s+(\w+)\s+ON\s+(\w+)/i);
        
        if (!match) {
            throw new Error('Invalid DROP INDEX syntax. Example: DROP INDEX idx_name ON users');
        }
        
        const indexName = match[1].trim();
        const tableName = match[2].trim();
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        const indexIdx = db.tables[tableName].indexes.findIndex(idx => idx.name === indexName);
        
        if (indexIdx === -1) {
            throw new Error(`Index '${indexName}' does not exist`);
        }
        
        db.tables[tableName].indexes.splice(indexIdx, 1);
        
        return {
            success: true,
            message: `Index '${indexName}' dropped from ${tableName}`,
            query: sql
        };
    }

    showIndexes(sql, db) {
        const match = sql.match(/SHOW\s+INDEX\s+FROM\s+(\w+)/i);
        
        if (!match) {
            throw new Error('Invalid SHOW INDEX syntax. Example: SHOW INDEX FROM users');
        }
        
        const tableName = match[1].trim();
        
        if (!db.tables[tableName]) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        const indexes = db.tables[tableName].indexes || [];
        const data = indexes.map(idx => ({
            index_name: idx.name,
            columns: idx.columns.join(', '),
            unique: idx.unique ? 'YES' : 'NO'
        }));
        
        return {
            success: true,
            data: data,
            row_count: data.length,
            query: sql
        };
    }

    // Views
    createView(sql, db) {
        const match = sql.match(/CREATE\s+VIEW\s+(\w+)\s+AS\s+(.*)/i);
        
        if (!match) {
            throw new Error('Invalid CREATE VIEW syntax. Example: CREATE VIEW active_users AS SELECT * FROM users WHERE status = "active"');
        }
        
        const viewName = match[1].trim();
        const query = match[2].trim();
        
        if (db.views[viewName]) {
            throw new Error(`View '${viewName}' already exists`);
        }
        
        db.views[viewName] = { query: query, created_at: new Date().toISOString() };
        
        return {
            success: true,
            message: `View '${viewName}' created successfully`,
            query: sql
        };
    }

    dropView(sql, db) {
        const match = sql.match(/DROP\s+VIEW\s+(\w+)/i);
        
        if (!match) {
            throw new Error('Invalid DROP VIEW syntax');
        }
        
        const viewName = match[1].trim();
        
        if (!db.views[viewName]) {
            throw new Error(`View '${viewName}' does not exist`);
        }
        
        delete db.views[viewName];
        
        return {
            success: true,
            message: `View '${viewName}' dropped successfully`,
            query: sql
        };
    }

    // SHOW commands
    showCommand(sql, db) {
        const sqlUpper = sql.toUpperCase();
        
        if (sqlUpper === 'SHOW TABLES') {
            return this.showTables(db);
        } else if (sqlUpper.startsWith('SHOW INDEX')) {
            return this.showIndexes(sql, db);
        } else if (sqlUpper.startsWith('SHOW DATABASES')) {
            const databases = Object.keys(this.databases).map(name => ({ database_name: name }));
            return {
                success: true,
                data: databases,
                row_count: databases.length,
                query: sql
            };
        } else if (sqlUpper.startsWith('SHOW VIEWS')) {
            const views = Object.entries(db.views).map(([name, info]) => ({
                view_name: name,
                created_at: info.created_at
            }));
            return {
                success: true,
                data: views,
                row_count: views.length,
                query: sql
            };
        } else if (sqlUpper.startsWith('SHOW TRIGGERS')) {
            return {
                success: true,
                data: db.triggers,
                row_count: db.triggers.length,
                query: sql
            };
        }
        
        throw new Error('Unknown SHOW command. Supported: SHOW TABLES, SHOW DATABASES, SHOW INDEX FROM <table>, SHOW VIEWS, SHOW TRIGGERS');
    }

    useDatabase(sql, db) {
        const match = sql.match(/USE\s+(\w+)/i);
        
        if (!match) {
            throw new Error('Invalid USE syntax. Example: USE database_name');
        }
        
        const dbName = match[1].trim();
        
        if (!this.databases[dbName]) {
            throw new Error(`Database '${dbName}' does not exist`);
        }
        
        this.currentDb = dbName;
        this.updateDatabaseSelector();
        this.saveToLocalStorage();
        
        return {
            success: true,
            message: `Database changed to '${dbName}'`,
            query: sql
        };
    }

    // EXPLAIN - Query execution plan
    explainQuery(sql, db) {
        const cleanSql = sql.replace(/^EXPLAIN\s+/i, '').trim();
        
        try {
            const result = this.processQuery(cleanSql);
            
            const executionPlan = {
                query_type: cleanSql.split(' ')[0].toUpperCase(),
                estimated_rows: result.data ? result.data.length : 0,
                operations: [
                    '1. Parse query',
                    '2. Validate syntax',
                    '3. Check permissions',
                    '4. Optimize query plan',
                    '5. Execute query',
                    `6. Return ${result.data ? result.data.length : 0} rows`
                ]
            };
            
            return {
                success: true,
                data: executionPlan,
                query: sql
            };
        } catch (error) {
            throw new Error('EXPLAIN failed: ' + error.message);
        }
    }

    // Helper Methods
    parseValues(valuesStr) {
        const values = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        
        for (let i = 0; i < valuesStr.length; i++) {
            const char = valuesStr[i];
            
            if (inQuotes) {
                if (char === quoteChar) {
                    inQuotes = false;
                } else {
                    current += char;
                }
            } else {
                if (char === "'" || char === '"') {
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === ',') {
                    values.push(this.parseValue(current.trim()));
                    current = '';
                } else {
                    current += char;
                }
            }
        }
        
        if (current.trim()) {
            values.push(this.parseValue(current.trim()));
        }
        
        return values;
    }

    parseValue(value) {
        if (value === 'NULL') return null;
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
        if (/^\d+$/.test(value)) return parseInt(value);
        return value;
    }

    parseSetClause(setClause) {
        const updates = {};
        const pairs = setClause.split(',');
        
        pairs.forEach(pair => {
            const [column, ...valueParts] = pair.split('=');
            const value = valueParts.join('=').trim();
            updates[column.trim()] = this.parseValue(value.replace(/^['"]|['"]$/g, ''));
        });
        
        return updates;
    }

    evaluateWhereClause(row, whereClause) {
        const conditions = whereClause.split(/\s+AND\s+/i).map(c => c.trim());
        
        return conditions.every(condition => this.evaluateCondition(row, condition));
    }

    evaluateCondition(row, condition) {
        const match = condition.match(/(\w+)\s*(=|>|<|>=|<=|!=|<>|LIKE)\s*(.+)/i);
        
        if (!match) return false;
        
        const column = match[1];
        const operator = match[2].toUpperCase();
        let value = match[3].trim();
        
        if (!(column in row)) return false;
        
        // Remove quotes
        value = value.replace(/^['"]|['"]$/g, '');
        
        const rowValue = row[column];
        
        switch (operator) {
            case '=':
                return rowValue == value;
            case '>':
                return rowValue > value;
            case '<':
                return rowValue < value;
            case '>=':
                return rowValue >= value;
            case '<=':
                return rowValue <= value;
            case '!=':
            case '<>':
                return rowValue != value;
            case 'LIKE':
                const pattern = value.replace(/%/g, '.*').replace(/_/g, '.');
                return new RegExp('^' + pattern + '$', 'i').test(String(rowValue));
            default:
                return false;
        }
    }

    applyOrderBy(data, orderBy) {
        const match = orderBy.match(/(\w+)(?:\s+(ASC|DESC))?/i);
        
        if (!match) return data;
        
        const column = match[1];
        const direction = match[2] && match[2].toUpperCase() === 'DESC' ? -1 : 1;
        
        return data.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            
            if (aVal === null) return 1;
            if (bVal === null) return -1;
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return (aVal - bVal) * direction;
            }
            
            return String(aVal).localeCompare(String(bVal)) * direction;
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // History Management
    addToHistory(query, success) {
        const entry = {
            query: query,
            success: success,
            timestamp: new Date().toLocaleString(),
            database: this.currentDb
        };
        
        this.queryHistory.unshift(entry);
        if (this.queryHistory.length > 50) {
            this.queryHistory.pop();
        }
        
        this.displayHistory();
    }

    displayHistory() {
        if (this.queryHistory.length === 0) {
            this.historyContainer.innerHTML = '<div class="placeholder"><p>Your query history will appear here</p></div>';
            return;
        }
        
        let html = '<div class="history-list">';
        this.queryHistory.forEach((entry, index) => {
            html += `
                <div class="history-item ${entry.success ? 'success' : 'error'}">
                    <div class="history-query" title="${this.escapeHtml(entry.query)}">
                        ${this.escapeHtml(entry.query)}
                    </div>
                    <div class="history-meta">
                        <span class="history-time">${entry.timestamp}</span>
                        <span class="history-db">${entry.database}</span>
                        <button class="history-rerun-btn" data-index="${index}">Rerun</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        this.historyContainer.innerHTML = html;
        
        // Bind rerun buttons
        this.historyContainer.querySelectorAll('.history-rerun-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.queryInput.value = this.queryHistory[index].query;
                this.executeQuery();
            });
        });
    }

    clearHistory() {
        this.queryHistory = [];
        this.displayHistory();
        this.saveToLocalStorage();
    }

    // Database Management
    updateDatabaseSelector() {
        console.log('Updating database selector, databases:', Object.keys(this.databases));
        console.log('Current DB:', this.currentDb);
        
        this.dbSelect.innerHTML = '';
        
        const dbNames = Object.keys(this.databases);
        if (dbNames.length === 0) {
            console.warn('No databases available!');
            return;
        }
        
        dbNames.forEach(dbName => {
            const option = document.createElement('option');
            option.value = dbName;
            option.textContent = dbName === 'default' ? 'Default Database' : dbName;
            if (dbName === this.currentDb) {
                option.selected = true;
            }
            this.dbSelect.appendChild(option);
        });
        
        // Update the database indicator in header
        if (this.currentDbIndicator) {
            const displayName = this.currentDb === 'default' ? 'Default Database' : this.currentDb;
            this.currentDbIndicator.textContent = `Active: ${displayName}`;
        }
        
        console.log('Database selector updated with', dbNames.length, 'databases');
    }

    switchDatabase(dbName) {
        if (this.databases[dbName]) {
            this.currentDb = dbName;
            this.loadSchema();
            this.saveToLocalStorage();
        }
    }

    showCreateDbModal() {
        this.createDbModal.style.display = 'block';
        this.dbNameInput.value = '';
        this.dbNameInput.focus();
    }

    hideCreateDbModal() {
        this.createDbModal.style.display = 'none';
    }

    createDatabase() {
        const dbName = this.dbNameInput.value.trim();
        
        if (!dbName) {
            alert('Please enter a database name');
            return;
        }
        
        if (this.databases[dbName]) {
            alert('Database already exists');
            return;
        }
        
        // Create new database with same structure as default
        this.databases[dbName] = JSON.parse(JSON.stringify(this.databases['default']));
        this.currentDb = dbName;
        
        this.hideCreateDbModal();
        this.updateDatabaseSelector();
        this.loadSchema();
        this.saveToLocalStorage();
        
        this.displaySuccess(`Database '${dbName}' created successfully`, '');
    }

    resetDatabases() {
        if (confirm('⚠️ This will delete all databases and reset to default. Are you sure?')) {
            // Clear localStorage
            localStorage.removeItem('dbSimulator_databases');
            localStorage.removeItem('dbSimulator_currentDb');
            localStorage.removeItem('dbSimulator_history');
            
            // Reset to default
            this.databases = {};
            this.currentDb = 'default';
            this.queryHistory = [];
            
            // Reinitialize
            this.initializeDefaultDatabase();
            this.updateDatabaseSelector();
            this.loadSchema();
            this.displayHistory();
            
            this.displaySuccess('All databases have been reset to default', '');
            console.log('Databases reset successfully');
        }
    }

    // Real Database Connection
    async autoConnectToMySQL() {
        // Try to connect automatically on page load
        this.updateConnectionStatus('connecting');
        
        try {
            const response = await fetch('api/real-database.php?action=test_connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            // Check if response is OK
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Get response text first to debug
            const text = await response.text();
            
            // Try to parse JSON
            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('Response text:', text);
                throw new Error('Invalid JSON response from server');
            }
            
            if (result.success) {
                this.useRealDatabase = true;
                this.realDbSelector.style.display = 'flex';
                this.updateConnectionStatus('connected', result.server_version);
                await this.loadRealDatabases();
                console.log(`Auto-connected to MySQL ${result.server_version}`);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            // If connection fails, stay in simulated mode
            this.updateConnectionStatus('simulated');
            console.log('MySQL not available, using simulated mode:', error.message);
        }
    }

    async toggleRealDatabase() {
        if (this.useRealDatabase) {
            // Disconnect from real database
            this.useRealDatabase = false;
            this.currentRealDb = null;
            this.realDbSelector.style.display = 'none';
            this.updateConnectionStatus('disconnected');
            this.updateDatabaseSelector();
            this.loadSchema();
            return;
        }
        
        // Connect to real database
        this.updateConnectionStatus('connecting');
        
        try {
            const response = await fetch('api/real-database.php?action=test_connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.useRealDatabase = true;
                this.realDbSelector.style.display = 'flex';
                this.updateConnectionStatus('connected', result.server_version);
                await this.loadRealDatabases();
                this.displaySuccess(`Connected to MySQL ${result.server_version}`, '');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.updateConnectionStatus('error', error.message);
            this.showError('Failed to connect to MySQL: ' + error.message);
            console.error('Connection error:', error);
        }
    }

    async loadRealDatabases() {
        try {
            const response = await fetch('api/real-database.php?action=list_databases');
            const result = await response.json();
            
            if (result.success) {
                this.realDbSelect.innerHTML = '<option value="">Select a database...</option>';
                result.data.forEach(db => {
                    const option = document.createElement('option');
                    option.value = db;
                    option.textContent = db;
                    this.realDbSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading databases:', error);
        }
    }

    async switchRealDatabase(dbName) {
        if (!dbName) {
            this.currentRealDb = null;
            return;
        }
        
        this.currentRealDb = dbName;
        this.currentDbIndicator.textContent = `Active: MySQL - ${dbName}`;
        await this.loadRealSchema(dbName);
    }

    async loadRealSchema(dbName) {
        try {
            const response = await fetch(`api/real-database.php?action=list_tables&database=${dbName}`);
            const result = await response.json();
            
            if (result.success) {
                this.displayRealSchema(result.data, dbName);
            }
        } catch (error) {
            console.error('Error loading schema:', error);
        }
    }

    async displayRealSchema(tables, dbName) {
        let html = `<div class="real-db-notice">📊 Viewing real MySQL database: <strong>${dbName}</strong></div>`;
        
        for (const tableName of tables.slice(0, 10)) { // Limit to 10 tables for performance
            try {
                const response = await fetch(`api/real-database.php?action=describe_table&database=${dbName}&table=${tableName}`);
                const result = await response.json();
                
                if (result.success) {
                    html += `
                        <div class="table-name">Table: ${this.escapeHtml(tableName)}</div>
                        <table class="schema-table">
                            <thead>
                                <tr>
                                    <th>Column</th>
                                    <th>Type</th>
                                    <th>Null</th>
                                    <th>Key</th>
                                    <th>Extra</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    Object.entries(result.data).forEach(([column, info]) => {
                        html += `
                            <tr>
                                <td><strong>${this.escapeHtml(column)}</strong></td>
                                <td>${this.escapeHtml(info.type)}</td>
                                <td>${info.null ? 'YES' : 'NO'}</td>
                                <td>${info.primary_key ? 'PRI' : ''}</td>
                                <td>${info.auto_increment ? 'auto_increment' : ''}</td>
                            </tr>
                        `;
                    });
                    
                    html += `</tbody></table>`;
                }
            } catch (error) {
                console.error('Error loading table schema:', error);
            }
        }
        
        if (tables.length > 10) {
            html += `<div class="notice">Showing 10 of ${tables.length} tables</div>`;
        }
        
        this.schemaContainer.innerHTML = html;
    }

    async executeRealQuery(query) {
        if (!this.currentRealDb) {
            throw new Error('No real database selected. Please select a database from the Real MySQL Database dropdown.');
        }
        
        const response = await fetch(
            `api/real-database.php?action=execute&database=${this.currentRealDb}&query=${encodeURIComponent(query)}`
        );
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return result;
    }

    updateConnectionStatus(status, message = '') {
        const dot = this.connectionStatus.querySelector('.status-dot');
        const text = this.connectionStatus.querySelector('.status-text');
        
        dot.className = 'status-dot';
        
        switch (status) {
            case 'connected':
                dot.classList.add('connected');
                text.textContent = `Connected to MySQL ${message}`;
                this.connectRealDbBtn.textContent = 'Disconnect';
                this.connectRealDbBtn.disabled = false;
                break;
            case 'connecting':
                dot.classList.add('connecting');
                text.textContent = 'Connecting to MySQL...';
                this.connectRealDbBtn.disabled = true;
                break;
            case 'error':
                dot.classList.add('error');
                text.textContent = `MySQL Error: ${message}`;
                this.connectRealDbBtn.disabled = false;
                break;
            default:
                // Simulated mode
                text.textContent = 'Simulated Mode (MySQL not detected)';
                this.connectRealDbBtn.textContent = 'Connect to Real MySQL';
                this.connectRealDbBtn.disabled = false;
        }
    }

    // LocalStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('dbSimulator_databases', JSON.stringify(this.databases));
            localStorage.setItem('dbSimulator_currentDb', this.currentDb);
            localStorage.setItem('dbSimulator_history', JSON.stringify(this.queryHistory));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }

    loadFromLocalStorage() {
        try {
            const databases = localStorage.getItem('dbSimulator_databases');
            const currentDb = localStorage.getItem('dbSimulator_currentDb');
            const history = localStorage.getItem('dbSimulator_history');
            
            if (databases) {
                const parsed = JSON.parse(databases);
                // Validate that it's a proper databases object
                if (parsed && typeof parsed === 'object') {
                    this.databases = parsed;
                    console.log('Loaded databases from localStorage:', Object.keys(this.databases));
                } else {
                    console.warn('Invalid database format in localStorage, clearing...');
                    localStorage.removeItem('dbSimulator_databases');
                }
            } else {
                console.log('No databases in localStorage, using default');
            }
            
            if (currentDb && this.databases[currentDb]) {
                this.currentDb = currentDb;
                console.log('Current database:', this.currentDb);
            } else {
                this.currentDb = 'default';
                console.log('Resetting to default database');
            }
            
            if (history) {
                this.queryHistory = JSON.parse(history);
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            console.warn('Clearing corrupted localStorage data...');
            localStorage.removeItem('dbSimulator_databases');
            localStorage.removeItem('dbSimulator_currentDb');
            localStorage.removeItem('dbSimulator_history');
        }
    }

    // Export Data
    exportData() {
        const db = this.databases[this.currentDb];
        if (!db) {
            this.showError('No database selected');
            return;
        }
        
        const exportObj = {
            database: this.currentDb,
            exported_at: new Date().toISOString(),
            tables: db.tables
        };
        
        const dataStr = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `database_${this.currentDb}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // UI Helpers
    clearResults() {
        this.resultsContainer.innerHTML = '<div class="placeholder"><p>Execute a query to see results here</p></div>';
        this.rowCount.textContent = '';
        this.executionTime.textContent = '';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DatabaseSimulator();
});
