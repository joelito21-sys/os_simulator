# OS Simulator

A comprehensive operating system simulator built with PHP and JavaScript that provides a realistic desktop environment with multiple applications, process management, file system simulation, and system monitoring.

## Features

### Desktop Environment
- **Modern GUI**: Complete desktop interface with taskbar, start menu, and window management
- **Window Management**: Draggable, resizable, minimizable, and maximizable windows
- **Taskbar**: Quick launch buttons, window tabs, and system clock
- **Start Menu**: Application launcher with system options
- **Theme System**: Multiple color themes with smooth transitions
- **User Authentication**: Secure login system with user management

### User Authentication System
- **Login Screen**: Professional login interface with demo accounts
- **User Management**: Create, view, and manage user accounts
- **Role-Based Access**: Administrator and user roles
- **Password Security**: Secure password hashing and change functionality
- **Session Management**: Persistent login sessions with logout
- **Remember Me**: Optional username persistence

### Theme System
- **5 Built-in Themes**: Default, Dark, Light, Ocean, Forest
- **Theme Switcher**: Visual theme selector with live previews
- **Auto Theme Switch**: Automatically switches between light and dark themes based on time
- **Theme Persistence**: Saves theme preferences in localStorage
- **Smooth Transitions**: Optional smooth theme change animations
- **Keyboard Shortcut**: Ctrl+Shift+T to open theme switcher

### Applications
- **Terminal**: Full-featured command-line interface with shell commands
- **File Manager**: Graphical file browser with directory navigation
- **Task Manager**: Process monitoring and management
- **System Monitor**: Real-time system performance metrics
- **Text Editor**: Basic text editing capabilities

### System Components
- **Process Management**: Create, monitor, and terminate processes
- **Memory Management**: Simulated memory allocation and usage tracking
- **File System**: Hierarchical file system with directories and files
- **Command Shell**: Unix-like command interface
- **System Monitoring**: Real-time performance metrics

### Available Commands

#### File System Commands
- `ls [path]` - List directory contents
- `cd <path>` - Change directory
- `pwd` - Print working directory
- `mkdir <name>` - Create directory
- `touch <file>` - Create empty file
- `cat <file>` - Display file contents

#### System Commands
- `ps` - List running processes
- `kill <pid>` - Terminate process
- `free` - Show memory usage
- `df` - Show disk usage
- `whoami` - Display current user
- `date` - Show current date/time
- `uptime` - Show system uptime
- `clear` - Clear terminal screen
- `help` - Show available commands

#### Utility Commands
- `echo <text>` - Display text
- `whoami` - Display current user

## Project Structure

```
os/
├── api/
│   ├── command.php          # Command execution API
│   └── process.php          # Process management API
├── classes/
│   └── OSSimulator.php      # Core OS simulator classes
├── css/
│   └── style.css            # Stylesheets
├── js/
│   └── app.js               # Frontend JavaScript
├── assets/
│   └── icons/               # Application icons
├── index.html               # Main desktop interface
├── .htaccess                # Apache configuration
└── README.md                # This file
```

## Installation

1. Make sure you have XAMPP or similar PHP server installed
2. Place the `os` folder in your web root (e.g., `htdocs`)
3. Start your Apache server
4. Access the simulator at `http://localhost/os`

## Usage

### Login and Authentication
1. Navigate to `http://localhost/os/login.html`
2. Use demo accounts:
   - **Admin**: username `admin`, password `admin123`
   - **User**: username `user`, password `user123`
3. Or create a new account using "Create New Account"
4. Check "Remember me" to save username for future logins
5. After login, you'll be redirected to the main desktop

### User Management
- Access via Start Menu → System → User Management
- **Current User Tab**: View your account information
- **Change Password Tab**: Update your password securely
- **All Users Tab**: (Admin only) View all system users
- Logout button available in start menu

### Desktop Interface
1. **Start Menu**: Click the Start button or press Windows key
2. **Applications**: Launch apps from Start Menu or desktop icons
3. **Window Management**: Drag windows by title bar, use controls to minimize/maximize/close
4. **Taskbar**: View running applications and system time

### Terminal
1. Open Terminal from Start Menu or desktop
2. Type commands and press Enter to execute
3. Use arrow keys to navigate command history
4. Type `help` for available commands

### File Manager
1. Navigate directories with double-click
2. Create new files and folders with toolbar buttons
3. Use back/up buttons for navigation
4. View file properties with single-click

### Task Manager
1. Monitor running processes in real-time
2. Create new processes with "New Process" button
3. Terminate processes by selecting and clicking "Kill Process"
4. View memory usage in Memory tab

### System Monitor
1. View system information and performance metrics
2. Monitor memory and disk usage
3. Browse file system structure
4. Auto-refreshes every 3 seconds

## Keyboard Shortcuts

- `Alt + Tab`: Switch between windows
- `Ctrl + Alt + Delete`: Open Task Manager
- `Ctrl + Shift + T`: Open Theme Switcher
- `Escape`: Close modal dialogs
- `Arrow Up/Down`: Navigate command history in Terminal
- `Ctrl + Enter`: Execute command in Terminal

## Technical Architecture

### Backend (PHP)
- **OSSimulator**: Main simulator class coordinating all components
- **ProcessManager**: Handles process creation, termination, and scheduling
- **MemoryManager**: Simulates memory allocation and usage tracking
- **FileSystem**: Hierarchical file system with directory operations
- **Scheduler**: Process scheduling algorithms (FCFS, SJF, Priority, Round Robin)

### Frontend (JavaScript)
- **OSSimulatorGUI**: Main desktop environment manager
- **TerminalApp**: Command-line interface implementation
- **FileManagerApp**: Graphical file browser
- **TaskManagerApp**: Process monitoring interface
- **SystemMonitorApp**: System performance display

### API Endpoints
- `POST /api/command.php`: Execute shell commands
- `GET /api/command.php?system_info=true`: Get system information
- `GET /api/command.php?processes=true`: Get process list
- `POST /api/process.php`: Create new process
- `DELETE /api/process.php`: Terminate process

## System Components

### Process Management
- Process creation with unique PIDs
- Process states (running, terminated)
- Memory allocation per process
- CPU usage simulation
- Process scheduling algorithms

### Memory Management
- Total memory: 1GB simulated
- Memory allocation and deallocation
- Usage tracking and reporting
- Memory usage percentage

### File System
- Hierarchical directory structure
- File and directory creation
- Navigation and path resolution
- File content storage
- Disk usage calculation

### Shell Commands
- Unix-like command syntax
- Command history and navigation
- Input/output handling
- Error reporting
- Help system

## Security Features

- Input validation and sanitization
- Command injection protection
- Safe process termination (cannot kill system processes)
- File system access controls
- CORS protection for API

## Performance

- Efficient in-memory data structures
- Optimized file system operations
- Minimal API overhead
- Responsive user interface
- Auto-refresh for real-time monitoring

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Responsive design for mobile devices
- Touch support for tablets

## Future Enhancements

- More shell commands and utilities
- Network simulation and services
- User accounts and permissions
- More scheduling algorithms
- Performance graphs and charts
- File upload/download capabilities
- Application installation system
- Virtual memory simulation
- Inter-process communication

## Educational Value

This simulator is designed for educational purposes to demonstrate:
- Operating system concepts and components
- Process and memory management
- File system operations
- Command-line interfaces
- GUI development
- Client-server architecture
- System programming concepts

## Troubleshooting

### Common Issues
1. **404 Errors**: Ensure Apache is running and .htaccess is enabled
2. **CORS Issues**: Check that API endpoints are accessible
3. **Command Failures**: Verify PHP error logs for syntax issues
4. **UI Problems**: Check browser console for JavaScript errors

### Debug Mode
The simulator runs in debug mode by default. To disable:
- Edit `.htaccess` and comment out PHP error display lines
- Check PHP error logs for detailed information

## Contributing

Feel free to extend the simulator with:
- New shell commands
- Additional applications
- Enhanced GUI features
- Performance improvements
- Bug fixes and optimizations

## License

This project is provided for educational purposes. Feel free to use, modify, and distribute according to your needs.
