class TaskManagerApp {
    constructor(element) {
        this.element = element;
        this.processTableBody = element.querySelector('#processTableBody');
        this.processList = element.querySelector('#tmProcessList');
        this.cpuBar = element.querySelector('#tmCpu');
        this.ramBar = element.querySelector('#tmRam');
        this.cpuText = element.querySelector('#tmCpuText');
        this.ramText = element.querySelector('#tmRamText');

        this.bindEvents();
        this.loadProcesses();
        this.startAutoRefresh();

        if (this.processList) {
            this.update();
            this.interval = setInterval(() => this.update(), 2000);
        }
    }

    bindEvents() {
        const tabButtons = this.element.querySelectorAll('.tab-btn');
        const refreshBtn = this.element.querySelector('#refreshProcessesBtn');
        const newProcessBtn = this.element.querySelector('#newProcessBtn');
        const killProcessBtn = this.element.querySelector('#killProcessBtn');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadProcesses());
        if (newProcessBtn) newProcessBtn.addEventListener('click', () => this.createNewProcess());
        if (killProcessBtn) killProcessBtn.addEventListener('click', () => this.killSelectedProcess());
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
        if (!this.processTableBody) return;
        try {
            let result;
            if (window.app && window.app.useLocalAuth) {
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
        if (!this.processTableBody) return;
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
        this.processTableBody.querySelectorAll('tr').forEach(tr => tr.classList.remove('selected'));
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

        if (totalMemory) totalMemory.textContent = memoryData.total;
        if (usedMemory) usedMemory.textContent = memoryData.used;
        if (freeMemory) freeMemory.textContent = memoryData.free;
        if (memoryUsedBar) memoryUsedBar.style.width = `${memoryData.usage_percent}%`;
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
            const processesTab = this.element.querySelector('#processesTab');
            if (processesTab && processesTab.classList.contains('active')) {
                this.loadProcesses();
            }
        }, 5000);
    }

    showError(message) {
        if (this.processTableBody) {
            this.processTableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">${message}</td></tr>`;
        }
    }

    update() {
        if (!this.processList) return;
        const cpu = Math.floor(Math.random() * 50) + 10;
        const ramUsed = (Math.random() * 2 + 3).toFixed(1);

        if (this.cpuBar) this.cpuBar.style.width = `${cpu}%`;
        if (this.cpuText) this.cpuText.textContent = `${cpu}%`;
        if (this.ramBar) this.ramBar.style.width = `${(ramUsed / 16 * 100).toFixed(0)}%`;
        if (this.ramText) this.ramText.textContent = `${ramUsed} GB / 16 GB`;

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

    destroy() {
        if (this.interval) clearInterval(this.interval);
    }
}

export default TaskManagerApp;
