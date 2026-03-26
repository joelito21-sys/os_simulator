# Database Simulator

A web-based database simulator that allows you to execute SQL queries on simulated database tables using PHP and JavaScript.

## Features

- **SQL Query Execution**: Support for SELECT, INSERT, UPDATE, DELETE operations
- **Sample Data**: Pre-populated with users and products tables
- **Interactive Interface**: Modern, responsive web interface
- **Real-time Results**: Instant query execution and results display
- **Schema Viewer**: View table structures and column information
- **Sample Queries**: Built-in sample queries for learning and testing
- **Error Handling**: Comprehensive error messages and validation

## Supported SQL Operations

### SELECT Queries
- Basic SELECT: `SELECT * FROM users`
- Column selection: `SELECT name, email FROM users`
- WHERE conditions: `SELECT * FROM users WHERE age > 25`
- ORDER BY: `SELECT * FROM products ORDER BY price DESC`
- LIMIT: `SELECT * FROM users LIMIT 3`
- LIKE operator: `SELECT * FROM users WHERE name LIKE 'J%'`

### INSERT Queries
- `INSERT INTO users (name, email, age) VALUES ('John Doe', 'john@example.com', 30)`

### UPDATE Queries
- `UPDATE users SET age = 31 WHERE id = 1`

### DELETE Queries
- `DELETE FROM users WHERE id > 4` (safety: WHERE clause required)

### Utility Queries
- `SHOW TABLES` - List all tables
- `DESCRIBE users` - Show table structure

## Project Structure

```
database_simulator/
├── api/
│   └── query.php              # REST API endpoints
├── classes/
│   └── DatabaseSimulator.php  # Core database simulator class
├── css/
│   └── style.css              # Stylesheets
├── js/
│   └── app.js                 # Frontend JavaScript
├── data/                      # (reserved for future data files)
├── index.html                 # Main HTML page
└── README.md                  # This file
```

## Installation

1. Make sure you have XAMPP or similar PHP server installed
2. Place the `database_simulator` folder in your web root (e.g., `htdocs`)
3. Start your Apache server
4. Access the application at `http://localhost/database_simulator`

## Usage

1. **Execute Queries**: Type SQL queries in the editor and click "Execute Query" or press Ctrl+Enter
2. **Quick Actions**: Use the quick action buttons for common queries
3. **Sample Queries**: Click "Sample Queries" to browse and use example queries
4. **View Schema**: The database schema is automatically displayed at the bottom
5. **Results**: Query results appear in the results section with row count and execution time

## Sample Data

The simulator comes with two sample tables:

### Users Table
- Columns: id, name, email, age, created_at
- Sample records for John Doe, Jane Smith, Bob Johnson, Alice Brown

### Products Table
- Columns: id, name, price, category, stock
- Sample records for various electronics and furniture items

## Keyboard Shortcuts

- `Ctrl + Enter`: Execute current query
- Click on quick action buttons for instant queries

## Technical Details

### Backend (PHP)
- `DatabaseSimulator` class handles in-memory data storage and query parsing
- RESTful API at `/api/query.php` for query execution
- Support for basic SQL parsing and evaluation
- Automatic primary key generation for INSERT operations

### Frontend (JavaScript)
- Modern ES6+ JavaScript with async/await
- Responsive design with CSS Grid and Flexbox
- Real-time query execution with loading indicators
- Modal interface for sample queries
- Auto-resizing query editor

### Styling
- Modern, clean interface with gradient headers
- Responsive design for mobile devices
- Hover effects and smooth transitions
- Professional color scheme

## Limitations

- This is a simulator, not a real database
- SQL parsing is basic and may not support complex queries
- No persistence - data resets on server restart
- Limited to the operations implemented in the simulator
- No support for JOINs, subqueries, or advanced SQL features

## Future Enhancements

- Add more sample tables and data
- Implement JOIN operations
- Add query history feature
- Export results to CSV/JSON
- Add more SQL functions and operators
- Implement data persistence
- Add user authentication and multiple databases

## Error Handling

The simulator includes comprehensive error handling:
- Invalid SQL syntax detection
- Table/column validation
- Type checking
- Safety restrictions (e.g., DELETE without WHERE)
- Clear error messages with query context

## Security

- Input validation and sanitization
- SQL injection protection (simulator, not real SQL)
- CORS headers for API access
- Safe DELETE operations requiring WHERE clause
