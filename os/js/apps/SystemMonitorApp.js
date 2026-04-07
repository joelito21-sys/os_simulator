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
        const uptimeValue = document.getElementById('uptimeValue');
        const processCountValue = document.getElementById('processCountValue');
        const currentDirValue = document.getElementById('currentDirValue');

        if (uptimeValue) uptimeValue.textContent = `${info.uptime} seconds`;
        if (processCountValue) processCountValue.textContent = info.processes;
        if (currentDirValue) currentDirValue.textContent = info.current_directory;

        // Update memory progress
        const memoryData = info.memory.data;
        const memoryProgress = document.getElementById('memoryProgress');
        const memoryProgressText = document.getElementById('memoryProgressText');

        if (memoryProgress) memoryProgress.style.width = `${memoryData.usage_percent}%`;
        if (memoryProgressText) memoryProgressText.textContent = `${memoryData.usage_percent}%`;

        // Update disk progress
        const diskData = info.filesystem.data;
        const diskProgress = document.getElementById('diskProgress');
        const diskProgressText = document.getElementById('diskProgressText');

        if (diskProgress) diskProgress.style.width = `${diskData.usage_percent}%`;
        if (diskProgressText) diskProgressText.textContent = `${diskData.usage_percent}%`;

        // Update filesystem tree
        this.displayFilesystemTree(info.filesystem.data.root_structure);
    }

    displayFilesystemTree(tree) {
        const container = document.getElementById('filesystemTree');
        if (!container) return;
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
        this.interval = setInterval(() => {
            this.loadSystemInfo();
        }, 3000); // Refresh every 3 seconds
    }

    destroy() {
        if (this.interval) clearInterval(this.interval);
    }
}

export default SystemMonitorApp;
