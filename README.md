OS & Database Simulator Documentation (Step-by-Step)
Project Title

OS & Database Simulator using Laravel 12, MySQL, and JavaScript

Step 1: Install Required Software

Install the following software before starting the project.

Software	Purpose
XAMPP	Apache, MySQL, PHP
PHP 8.2+	Laravel runtime
Composer	PHP dependency manager
Node.js	Frontend package manager
Visual Studio Code	Code editor
Git	Version control
Verify installation

Open Command Prompt and type:

php -v
composer -V
node -v
mysql --version
Step 2: Create Laravel Project

Open Command Prompt.

Go to htdocs.

cd C:\xampp\htdocs

Create the project.

composer create-project laravel/laravel OS_SIMULATOR_LARAVEL

Open the project.

cd OS_SIMULATOR_LARAVEL
Step 3: Configure Environment File

Open .env.

Modify:

APP_NAME="OS Simulator"

APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=os_simulator
DB_USERNAME=root
DB_PASSWORD=

Generate application key.

php artisan key:generate
Step 4: Create Database

Open XAMPP.

Start:

Apache
MySQL

Open:

http://localhost/phpmyadmin

Create database:

os_simulator

Or use:

mysql -u root -e "CREATE DATABASE os_simulator;"
Step 5: Create Database Tables

Create migration.

User Table Extension
php artisan make:migration add_username_and_role_to_users_table --table=users

Add:

$table->string('username')->unique();
$table->string('role')->default('user');
$table->timestamp('last_login')->nullable();
Create Virtual Files Table
php artisan make:migration create_virtual_files_table

Add:

Schema::create('virtual_files', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id');
    $table->string('path');
    $table->string('name');
    $table->longText('content')->nullable();
    $table->string('type');
    $table->timestamps();
});
Create Notifications Table
php artisan make:migration create_notifications_table
Create System Logs Table
php artisan make:migration create_system_logs_table
Create User Settings Table
php artisan make:migration create_user_settings_table
Step 6: Run Migrations

Run:

php artisan migrate

Expected:

Migration table created successfully.
All tables created successfully.
Step 7: Create Default Users

Create seeder.

php artisan make:seeder DefaultUserSeeder

Add:

User::create([
'username'=>'admin',
'name'=>'Administrator',
'email'=>'admin@simulator.local',
'password'=>Hash::make('admin123'),
'role'=>'administrator'
]);

User::create([
'username'=>'user',
'name'=>'Regular User',
'email'=>'user@simulator.local',
'password'=>Hash::make('user123'),
'role'=>'user'
]);

Run:

php artisan db:seed --class=DefaultUserSeeder
Step 8: Create Authentication System

Create controller.

php artisan make:controller AuthController

Functions:

Login
Logout
Register
Change Password
Current User
User Management
Step 9: Create Role Middleware

Create middleware.

php artisan make:middleware RoleMiddleware

Purpose:

Administrator access
User access restriction

Register middleware.

'role' => App\Http\Middleware\RoleMiddleware::class
Step 10: Create OS Simulator Core

Create folder.

app/Services

Create:

OSSimulator.php

Functions:

Initialize operating system
Create directories
Create files
Start system processes
Execute commands
Step 11: Create Command Controller

Create controller.

php artisan make:controller CommandController

Functions:

execute()
systemInfo()
Step 12: Create Virtual File System

Create:

app/Services/FileSystem.php

Functions:

Create file
Create folder
Read file
Delete file
Copy file
Move file
Disk usage
Step 13: Create Process Manager

Create:

app/Services/ProcessManager.php

Functions:

Create process
Kill process
List process
CPU usage
Memory usage
Step 14: Create MySQL Manager

Create:

app/Services/MySQLConnection.php

Functions:

Connect MySQL
Ping server
Get databases
Get tables
Execute SQL
Get relationships
Step 15: Create Database Simulator

Create:

app/Services/DatabaseSimulator.php

Functions:

SELECT
INSERT
UPDATE
DELETE
SHOW TABLES
DESCRIBE TABLE
Step 16: Create XAMPP Simulator

Create:

public/os/js/apps/XamppApp.js

Features:

Start Apache
Stop Apache
Start MySQL
Stop MySQL
View logs
View ports
Step 17: Create Desktop Applications

Applications:

Terminal
TerminalApp.js
File Manager
FileManagerApp.js
Task Manager
TaskManagerApp.js
System Monitor
SystemMonitorApp.js
Calculator
CalculatorApp.js
Browser
BrowserApp.js
Paint
PaintApp.js
Step 18: Create User Interface

Create CSS files.

variables.css
style.css
ui.css
apps.css
themes.css
components.css
login.css

Create Blade files.

login.blade.php
index.blade.php
database/index.blade.php
Step 19: Create API Routes

Web routes:

/
 /login
 /desktop
 /database

API routes:

/api/auth
/api/os
/api/database
/api/system
/api/files
/api/notifications
Step 20: Run the Project

Start XAMPP.

Start Laravel.

cd C:\xampp\htdocs\OS_SIMULATOR_LARAVEL

php artisan serve

Open:

http://127.0.0.1:8000
Step 21: Login
Administrator
Username: admin
Password: admin123
User
Username: user
Password: user123
Step 22: Test the System

Test the following modules:

✅ Login

✅ Desktop

✅ Terminal

✅ File Manager

✅ Database Simulator

✅ MySQL Manager

✅ XAMPP Control Panel

✅ Task Manager

✅ System Monitor

✅ WiFi Scanner

✅ Bluetooth Scanner

✅ Notifications

Step 23: Conclusion

The OS & Database Simulator was successfully developed using Laravel 12, MySQL, XAMPP, HTML, CSS, and JavaScript. The system simulates a real operating system environment and helps users learn operating systems, databases, networking, and system administration interactively.

Tip: For a school project, include screenshots after each step (Login page, Desktop page, Terminal, Database Simulator, XAMPP Simulator, etc.) to make the documentation more complete.
