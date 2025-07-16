<?php
/**
 * Enhanced Database Configuration for Zed-Memes
 * Handles MySQL connection and provides database utilities
 */

require_once __DIR__ . '/config.php';

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    private $charset;
    private $conn;
    private static $instance = null;
    
    public function __construct() {
        $this->host = DB_HOST;
        $this->db_name = DB_NAME;
        $this->username = DB_USER;
        $this->password = DB_PASS;
        $this->port = DB_PORT;
        $this->charset = DB_CHARSET;
    }
    
    /**
     * Get singleton instance
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Get database connection
     */
    public function getConnection() {
        if ($this->conn === null) {
            try {
                $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset={$this->charset}";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->charset}"
                ];
                
                $this->conn = new PDO($dsn, $this->username, $this->password, $options);
                
                // Set timezone
                $this->conn->exec("SET time_zone = '+00:00'");
                
            } catch(PDOException $exception) {
                logError("Database connection error: " . $exception->getMessage());
                throw new Exception("Database connection failed");
            }
        }
        
        return $this->conn;
    }
    
    /**
     * Execute a query with parameters
     */
    public function executeQuery($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch(PDOException $exception) {
            logError("Query execution error: " . $exception->getMessage(), [
                'sql' => $sql,
                'params' => $params
            ]);
            throw new Exception("Database query failed");
        }
    }
    
    /**
     * Fetch a single row
     */
    public function fetchOne($sql, $params = []) {
        $stmt = $this->executeQuery($sql, $params);
        return $stmt->fetch();
    }
    
    /**
     * Fetch all rows
     */
    public function fetchAll($sql, $params = []) {
        $stmt = $this->executeQuery($sql, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Get the last inserted ID
     */
    public function getLastInsertId() {
        return $this->conn->lastInsertId();
    }
    
    /**
     * Begin a transaction
     */
    public function beginTransaction() {
        return $this->conn->beginTransaction();
    }
    
    /**
     * Commit a transaction
     */
    public function commit() {
        return $this->conn->commit();
    }
    
    /**
     * Rollback a transaction
     */
    public function rollback() {
        return $this->conn->rollback();
    }
    
    /**
     * Check if connection is active
     */
    public function isConnected() {
        return $this->conn !== null;
    }
    
    /**
     * Close the database connection
     */
    public function closeConnection() {
        $this->conn = null;
    }
    
    /**
     * Test database connection
     */
    public function testConnection() {
        try {
            $this->getConnection();
            $stmt = $this->conn->query("SELECT 1");
            return $stmt->fetch() !== false;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Get database statistics
     */
    public function getStats() {
        try {
            $stats = [];
            
            // Get table counts
            $tables = ['users', 'memes', 'reactions', 'comments'];
            foreach ($tables as $table) {
                $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM {$table}");
                $stmt->execute();
                $stats[$table] = $stmt->fetch()['count'];
            }
            
            // Get database size
            $stmt = $this->conn->prepare("
                SELECT 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                FROM information_schema.tables 
                WHERE table_schema = ?
            ");
            $stmt->execute([$this->db_name]);
            $stats['database_size_mb'] = $stmt->fetch()['size_mb'] ?? 0;
            
            return $stats;
        } catch (Exception $e) {
            logError("Error getting database stats: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Backup database (for testing)
     */
    public function backup($filename = null) {
        if ($filename === null) {
            $filename = 'backup_' . date('Y-m-d_H-i-s') . '.sql';
        }
        
        $backupDir = __DIR__ . '/../../backups/';
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        $filepath = $backupDir . $filename;
        
        // Simple backup using mysqldump if available
        $command = sprintf(
            'mysqldump -h %s -P %s -u %s %s %s > %s',
            escapeshellarg($this->host),
            escapeshellarg($this->port),
            escapeshellarg($this->username),
            $this->password ? '-p' . escapeshellarg($this->password) : '',
            escapeshellarg($this->db_name),
            escapeshellarg($filepath)
        );
        
        exec($command, $output, $returnCode);
        
        return $returnCode === 0 ? $filepath : false;
    }
    
    /**
     * Restore database (for testing)
     */
    public function restore($filepath) {
        if (!file_exists($filepath)) {
            throw new Exception("Backup file not found: {$filepath}");
        }
        
        $command = sprintf(
            'mysql -h %s -P %s -u %s %s %s < %s',
            escapeshellarg($this->host),
            escapeshellarg($this->port),
            escapeshellarg($this->username),
            $this->password ? '-p' . escapeshellarg($this->password) : '',
            escapeshellarg($this->db_name),
            escapeshellarg($filepath)
        );
        
        exec($command, $output, $returnCode);
        
        return $returnCode === 0;
    }
}

// Create a global database instance
$database = Database::getInstance();
$db = $database->getConnection();

// Helper function to get database instance
function getDatabase() {
    return Database::getInstance();
}

// Helper function to get database connection
function getDB() {
    return getDatabase()->getConnection();
}

// Helper function to test database connection
function testDatabaseConnection() {
    return getDatabase()->testConnection();
}
?> 