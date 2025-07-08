<?php
/**
 * Test Runner for Zed-Memes Backend
 * Runs all tests and provides detailed reporting
 */

// Set testing environment
putenv('APP_ENV=testing');
putenv('DB_NAME=zed_memes_test');

require_once __DIR__ . '/tests/TestFramework.php';
require_once __DIR__ . '/tests/AuthTests.php';
require_once __DIR__ . '/tests/MemeTests.php';
require_once __DIR__ . '/tests/APITests.php';

class TestRunner {
    private $testSuites = [];
    private $results = [];
    private $startTime;
    
    public function __construct() {
        $this->testSuites = [
            'Auth' => new AuthTests(),
            'Meme' => new MemeTests(),
            'API' => new APITests()
        ];
    }
    
    /**
     * Run all tests
     */
    public function runAllTests() {
        $this->startTime = microtime(true);
        
        echo "🚀 Starting Zed-Memes Backend Test Suite\n";
        echo "==========================================\n\n";
        
        $totalTests = 0;
        $totalPassed = 0;
        $totalFailed = 0;
        
        foreach ($this->testSuites as $suiteName => $suite) {
            echo "📋 Running {$suiteName} Tests\n";
            echo str_repeat('-', strlen("Running {$suiteName} Tests")) . "\n";
            
            $methods = get_class_methods($suite);
            $testMethods = array_filter($methods, function($method) {
                return strpos($method, 'test') === 0;
            });
            
            $suitePassed = 0;
            $suiteFailed = 0;
            
            foreach ($testMethods as $method) {
                try {
                    echo "  🔍 {$method}... ";
                    $suite->$method();
                    echo "✅ PASS\n";
                    $suitePassed++;
                    $totalPassed++;
                } catch (Exception $e) {
                    echo "❌ FAIL\n";
                    echo "     Error: " . $e->getMessage() . "\n";
                    $suiteFailed++;
                    $totalFailed++;
                } finally {
                    $suite->cleanup();
                }
            }
            
            $totalTests += count($testMethods);
            
            echo "  📊 {$suiteName} Results: {$suitePassed} passed, {$suiteFailed} failed\n\n";
            
            $this->results[$suiteName] = [
                'passed' => $suitePassed,
                'failed' => $suiteFailed,
                'total' => count($testMethods)
            ];
        }
        
        $this->printSummary($totalTests, $totalPassed, $totalFailed);
        $this->generateReport();
        
        return $totalFailed === 0;
    }
    
    /**
     * Run specific test suite
     */
    public function runTestSuite($suiteName) {
        if (!isset($this->testSuites[$suiteName])) {
            echo "❌ Test suite '{$suiteName}' not found.\n";
            echo "Available suites: " . implode(', ', array_keys($this->testSuites)) . "\n";
            return false;
        }
        
        $this->startTime = microtime(true);
        
        echo "🚀 Running {$suiteName} Test Suite\n";
        echo "================================\n\n";
        
        $suite = $this->testSuites[$suiteName];
        $methods = get_class_methods($suite);
        $testMethods = array_filter($methods, function($method) {
            return strpos($method, 'test') === 0;
        });
        
        $passed = 0;
        $failed = 0;
        
        foreach ($testMethods as $method) {
            try {
                echo "🔍 {$method}... ";
                $suite->$method();
                echo "✅ PASS\n";
                $passed++;
            } catch (Exception $e) {
                echo "❌ FAIL\n";
                echo "Error: " . $e->getMessage() . "\n";
                $failed++;
            } finally {
                $suite->cleanup();
            }
        }
        
        echo "\n📊 {$suiteName} Results: {$passed} passed, {$failed} failed\n";
        
        return $failed === 0;
    }
    
    /**
     * Run specific test method
     */
    public function runTestMethod($suiteName, $methodName) {
        if (!isset($this->testSuites[$suiteName])) {
            echo "❌ Test suite '{$suiteName}' not found.\n";
            return false;
        }
        
        $suite = $this->testSuites[$suiteName];
        $methods = get_class_methods($suite);
        
        if (!in_array($methodName, $methods)) {
            echo "❌ Test method '{$methodName}' not found in suite '{$suiteName}'.\n";
            return false;
        }
        
        echo "🚀 Running {$suiteName}::{$methodName}\n";
        echo "=====================================\n\n";
        
        try {
            echo "🔍 {$methodName}... ";
            $suite->$methodName();
            echo "✅ PASS\n";
            return true;
        } catch (Exception $e) {
            echo "❌ FAIL\n";
            echo "Error: " . $e->getMessage() . "\n";
            return false;
        } finally {
            $suite->cleanup();
        }
    }
    
    /**
     * Print test summary
     */
    private function printSummary($totalTests, $totalPassed, $totalFailed) {
        $endTime = microtime(true);
        $duration = round($endTime - $this->startTime, 2);
        
        echo "📊 Test Summary\n";
        echo "===============\n";
        echo "Total Tests: {$totalTests}\n";
        echo "Passed: {$totalPassed}\n";
        echo "Failed: {$totalFailed}\n";
        echo "Duration: {$duration}s\n";
        
        if ($totalFailed === 0) {
            echo "\n🎉 All tests passed!\n";
        } else {
            echo "\n⚠️  {$totalFailed} test(s) failed.\n";
        }
        
        echo "\n";
    }
    
    /**
     * Generate detailed test report
     */
    private function generateReport() {
        $reportDir = __DIR__ . '/reports';
        if (!is_dir($reportDir)) {
            mkdir($reportDir, 0755, true);
        }
        
        $timestamp = date('Y-m-d_H-i-s');
        $reportFile = "{$reportDir}/test_report_{$timestamp}.html";
        
        $html = $this->generateHTMLReport();
        file_put_contents($reportFile, $html);
        
        echo "📄 Test report generated: {$reportFile}\n";
    }
    
    /**
     * Generate HTML test report
     */
    private function generateHTMLReport() {
        $endTime = microtime(true);
        $duration = round($endTime - $this->startTime, 2);
        
        $totalTests = 0;
        $totalPassed = 0;
        $totalFailed = 0;
        
        foreach ($this->results as $result) {
            $totalTests += $result['total'];
            $totalPassed += $result['passed'];
            $totalFailed += $result['failed'];
        }
        
        $successRate = $totalTests > 0 ? round(($totalPassed / $totalTests) * 100, 2) : 0;
        
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <title>Zed-Memes Backend Test Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
                .summary { margin: 20px 0; }
                .suite { margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
                .suite-header { background: #e9ecef; padding: 10px; font-weight: bold; }
                .suite-content { padding: 10px; }
                .passed { color: #28a745; }
                .failed { color: #dc3545; }
                .progress-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
                .progress-fill { background: #28a745; height: 100%; transition: width 0.3s; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h1>Zed-Memes Backend Test Report</h1>
                <p>Generated on: " . date('Y-m-d H:i:s') . "</p>
            </div>
            
            <div class='summary'>
                <h2>Summary</h2>
                <p><strong>Total Tests:</strong> {$totalTests}</p>
                <p><strong>Passed:</strong> <span class='passed'>{$totalPassed}</span></p>
                <p><strong>Failed:</strong> <span class='failed'>{$totalFailed}</span></p>
                <p><strong>Success Rate:</strong> {$successRate}%</p>
                <p><strong>Duration:</strong> {$duration}s</p>
                
                <div class='progress-bar'>
                    <div class='progress-fill' style='width: {$successRate}%'></div>
                </div>
            </div>
        ";
        
        foreach ($this->results as $suiteName => $result) {
            $suiteSuccessRate = $result['total'] > 0 ? round(($result['passed'] / $result['total']) * 100, 2) : 0;
            
            $html .= "
            <div class='suite'>
                <div class='suite-header'>{$suiteName} Tests</div>
                <div class='suite-content'>
                    <p><strong>Total:</strong> {$result['total']}</p>
                    <p><strong>Passed:</strong> <span class='passed'>{$result['passed']}</span></p>
                    <p><strong>Failed:</strong> <span class='failed'>{$result['failed']}</span></p>
                    <p><strong>Success Rate:</strong> {$suiteSuccessRate}%</p>
                </div>
            </div>
            ";
        }
        
        $html .= "
        </body>
        </html>
        ";
        
        return $html;
    }
    
    /**
     * Show available test suites
     */
    public function showAvailableTests() {
        echo "Available Test Suites:\n";
        echo "======================\n";
        
        foreach ($this->testSuites as $suiteName => $suite) {
            $methods = get_class_methods($suite);
            $testMethods = array_filter($methods, function($method) {
                return strpos($method, 'test') === 0;
            });
            
            echo "\n📋 {$suiteName} Tests (" . count($testMethods) . " tests):\n";
            foreach ($testMethods as $method) {
                echo "  - {$method}\n";
            }
        }
    }
}

// Command line interface
if (php_sapi_name() === 'cli') {
    $runner = new TestRunner();
    
    $args = $argv;
    array_shift($args); // Remove script name
    
    if (empty($args)) {
        // Run all tests
        $success = $runner->runAllTests();
        exit($success ? 0 : 1);
    }
    
    $command = $args[0];
    
    switch ($command) {
        case 'all':
            $success = $runner->runAllTests();
            exit($success ? 0 : 1);
            
        case 'suite':
            if (empty($args[1])) {
                echo "Usage: php run_tests.php suite <suite_name>\n";
                exit(1);
            }
            $success = $runner->runTestSuite($args[1]);
            exit($success ? 0 : 1);
            
        case 'method':
            if (empty($args[1]) || empty($args[2])) {
                echo "Usage: php run_tests.php method <suite_name> <method_name>\n";
                exit(1);
            }
            $success = $runner->runTestMethod($args[1], $args[2]);
            exit($success ? 0 : 1);
            
        case 'list':
            $runner->showAvailableTests();
            exit(0);
            
        case 'help':
            echo "Zed-Memes Backend Test Runner\n";
            echo "=============================\n\n";
            echo "Usage:\n";
            echo "  php run_tests.php [command] [options]\n\n";
            echo "Commands:\n";
            echo "  all                    Run all tests\n";
            echo "  suite <suite_name>     Run specific test suite\n";
            echo "  method <suite> <method> Run specific test method\n";
            echo "  list                   Show available tests\n";
            echo "  help                   Show this help\n\n";
            echo "Examples:\n";
            echo "  php run_tests.php all\n";
            echo "  php run_tests.php suite Auth\n";
            echo "  php run_tests.php method Auth testUserRegistration\n";
            exit(0);
            
        default:
            echo "Unknown command: {$command}\n";
            echo "Use 'php run_tests.php help' for usage information.\n";
            exit(1);
    }
}
?> 