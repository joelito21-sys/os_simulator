class DatabaseSimulator {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadSchema();
    }

    initializeElements() {
        this.queryInput = document.getElementById('queryInput');
        this.executeBtn = document.getElementById('executeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.sampleQueriesBtn = document.getElementById('sampleQueriesBtn');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.schemaContainer = document.getElementById('schemaContainer');
        this.rowCount = document.getElementById('rowCount');
        this.executionTime = document.getElementById('executionTime');
        this.refreshSchemaBtn = document.getElementById('refreshSchemaBtn');
        this.modal = document.getElementById('sampleQueriesModal');
        this.closeBtn = document.querySelector('.close');
    }

    bindEvents() {
        this.executeBtn.addEventListener('click', () => this.executeQuery());
        this.clearBtn.addEventListener('click', () => this.clearQuery());
        this.sampleQueriesBtn.addEventListener('click', () => this.showSampleQueries());
        this.refreshSchemaBtn.addEventListener('click', () => this.loadSchema());
        
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
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
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
            const response = await fetch('api/query.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query })
            });

            const result = await response.json();
            const endTime = performance.now();
            const executionTime = (endTime - startTime).toFixed(2);

            this.displayResults(result, executionTime);
        } catch (error) {
            this.showError('Error executing query: ' + error.message);
        }
    }

    displayResults(result, executionTime) {
        this.hideLoading();
        
        if (result.success) {
            if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                this.displayTable(result.data, result.query);
                this.rowCount.textContent = `${result.row_count || result.data.length} rows`;
            } else {
                this.displaySuccess(result.message || 'Query executed successfully', result.query);
                this.rowCount.textContent = result.affected_rows ? `${result.affected_rows} rows affected` : '0 rows';
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
        try {
            const response = await fetch('api/query.php?tables=true');
            const result = await response.json();
            
            if (result.success) {
                this.displaySchema(result.data);
            } else {
                this.schemaContainer.innerHTML = '<div class="placeholder"><p>Error loading schema</p></div>';
            }
        } catch (error) {
            this.schemaContainer.innerHTML = '<div class="placeholder"><p>Error loading schema</p></div>';
        }
    }

    async displaySchema(tables) {
        let html = '';
        
        for (const table of tables) {
            const tableName = typeof table === 'string' ? table : table.table_name;
            
            try {
                const response = await fetch(`api/query.php?schema=true&table=${encodeURIComponent(tableName)}`);
                const result = await response.json();
                
                if (result.success && result.data) {
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
                    
                    Object.entries(result.data).forEach(([column, info]) => {
                        const type = info.type || 'UNKNOWN';
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
            } catch (error) {
                console.error('Error loading table schema:', error);
            }
        }
        
        if (html) {
            this.schemaContainer.innerHTML = html;
        } else {
            this.schemaContainer.innerHTML = '<div class="placeholder"><p>No schema information available</p></div>';
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DatabaseSimulator();
});
