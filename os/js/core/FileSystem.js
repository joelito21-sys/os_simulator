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

export default FileSystem;
