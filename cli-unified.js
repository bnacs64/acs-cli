#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');

const program = new Command();

// Global error handler
process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught Exception:'), error.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
    }
    cleanupAndExit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    if (process.env.NODE_ENV === 'development') {
        console.error(reason.stack);
    }
    cleanupAndExit(1);
});

// Cleanup handlers for graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nReceived SIGINT. Cleaning up...'));
    cleanupAndExit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n\nReceived SIGTERM. Cleaning up...'));
    cleanupAndExit(0);
});

// Cleanup function
function cleanupAndExit(code) {
    try {
        const { InteractiveUI } = require('./lib/interactiveUI');
        InteractiveUI.closeGlobal();
    } catch (error) {
        // Ignore cleanup errors during shutdown
    }
    process.exit(code);
}

// Configure main program
program
    .name('controller-config')
    .description('Advanced Access Control System Configuration Tool')
    .version('2.0.0')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--config <path>', 'Configuration file path')
    .option('--no-color', 'Disable colored output')
    .option('--json', 'Output in JSON format')
    .option('--debug', 'Enable debug mode')
    .option('--offline', 'Work in offline mode (local storage only)');

// Load all commands with enhanced error handling
const commandsDir = path.join(__dirname, 'commands');
const loadedCommands = new Set();

function loadCommand(filePath) {
    try {
        const command = require(filePath);
        if (command.register && typeof command.register === 'function') {
            command.register(program);
            loadedCommands.add(path.basename(filePath, '.js'));
            return true;
        }
    } catch (error) {
        if (program.opts().verbose || program.opts().debug) {
            console.warn(chalk.yellow(`Warning: Failed to load command from ${filePath}:`), error.message);
        }
        return false;
    }
}

// Load all command files
if (fs.existsSync(commandsDir)) {
    const commandFiles = fs.readdirSync(commandsDir)
        .filter(file => file.endsWith('.js'))
        .sort(); // Load in alphabetical order
    
    let loadedCount = 0;
    for (const file of commandFiles) {
        if (loadCommand(path.join(commandsDir, file))) {
            loadedCount++;
        }
    }
    
    if (program.opts().debug) {
        console.log(chalk.gray(`Loaded ${loadedCount} commands: ${Array.from(loadedCommands).join(', ')}`));
    }
}

// Add built-in utility commands
program
    .command('list-commands')
    .description('List all available commands with descriptions')
    .action(() => {
        console.log(chalk.cyan('\n📋 Available Commands:\n'));
        
        const commands = program.commands
            .filter(cmd => cmd.name() !== 'help' && cmd.name() !== 'list-commands')
            .sort((a, b) => a.name().localeCompare(b.name()));
        
        const maxNameLength = Math.max(...commands.map(cmd => cmd.name().length));
        
        // Group commands by category
        const categories = {
            'Discovery': ['enhanced-discover', 'select-controller', 'remove-controller'],
            'Network': ['set-network', 'read-receiving-server', 'set-receiving-server'],
            'Time': ['read-time', 'sync-time'],
            'Privileges': ['add-privilege', 'delete-privilege', 'clear-all-privileges',
                          'query-privilege', 'read-privilege-by-index', 'read-total-privileges'],
            'Doors': ['remote-open-door', 'read-door-control', 'set-door-control'],
            'Records': ['get-record', 'get-read-record-index', 'set-read-record-index'],
            'Status': ['query-status', 'dashboard'],
            'Data': ['data-manager'],
            'Utilities': ['quick', 'wizard', 'doctor', 'list-commands']
        };
        
        for (const [category, cmdNames] of Object.entries(categories)) {
            const categoryCommands = commands.filter(cmd => cmdNames.includes(cmd.name()));
            if (categoryCommands.length > 0) {
                console.log(chalk.blue(`\n${category}:`));
                categoryCommands.forEach(cmd => {
                    const name = cmd.name().padEnd(maxNameLength);
                    const description = cmd.description() || 'No description available';
                    console.log(`  ${chalk.green(name)}  ${chalk.gray(description)}`);
                });
            }
        }
        
        console.log(`\n${chalk.cyan('Total:')} ${commands.length} commands available`);
        console.log(chalk.gray('Use "controller-config <command> --help" for detailed help on any command\n'));
    });

program
    .command('doctor')
    .description('Diagnose system configuration and dependencies')
    .option('--fix', 'Attempt to fix detected issues')
    .action(async (options) => {
        console.log(chalk.cyan('🏥 System Diagnosis\n'));
        
        const checks = [
            {
                name: 'Node.js Version',
                check: () => {
                    const version = process.version;
                    const major = parseInt(version.slice(1).split('.')[0]);
                    return { 
                        status: major >= 14, 
                        message: version, 
                        suggestion: major < 14 ? 'Update to Node.js 14+' : null 
                    };
                }
            },
            {
                name: 'Package Dependencies',
                check: () => {
                    try {
                        const pkg = require('./package.json');
                        const deps = Object.keys(pkg.dependencies || {}).length;
                        return { 
                            status: deps > 0, 
                            message: `${deps} dependencies`, 
                            suggestion: deps === 0 ? 'Run npm install' : null 
                        };
                    } catch (error) {
                        return { 
                            status: false, 
                            message: 'package.json not found', 
                            suggestion: 'Run npm install' 
                        };
                    }
                }
            },
            {
                name: 'Configuration Directory',
                check: () => {
                    const configDir = path.join(require('os').homedir(), '.controller-config');
                    const exists = fs.existsSync(configDir);
                    
                    if (options.fix && !exists) {
                        try {
                            fs.mkdirSync(configDir, { recursive: true });
                            return { status: true, message: 'Created', suggestion: null };
                        } catch (error) {
                            return { status: false, message: 'Failed to create', suggestion: 'Check permissions' };
                        }
                    }
                    
                    return { 
                        status: true, 
                        message: exists ? 'Exists' : 'Will be created on first run',
                        suggestion: null 
                    };
                }
            },
            {
                name: 'Data Storage',
                check: () => {
                    const dataDir = path.join(require('os').homedir(), '.controller-config', 'data');
                    const exists = fs.existsSync(dataDir);
                    
                    if (options.fix && !exists) {
                        try {
                            fs.mkdirSync(dataDir, { recursive: true });
                            return { status: true, message: 'Created', suggestion: null };
                        } catch (error) {
                            return { status: false, message: 'Failed to create', suggestion: 'Check permissions' };
                        }
                    }
                    
                    return { 
                        status: true, 
                        message: exists ? 'Ready' : 'Will be created on first use',
                        suggestion: null 
                    };
                }
            },
            {
                name: 'Database Connection',
                check: async () => {
                    try {
                        const { getControllers } = require('./lib/database');
                        await getControllers();
                        return { status: true, message: 'Connected', suggestion: null };
                    } catch (error) {
                        return { 
                            status: false, 
                            message: 'Connection failed', 
                            suggestion: 'Check Supabase configuration or use --offline mode' 
                        };
                    }
                }
            }
        ];
        
        let allPassed = true;
        for (const check of checks) {
            const result = await check.check();
            const icon = result.status ? chalk.green('✓') : chalk.red('✗');
            const message = result.status ? chalk.green(result.message) : chalk.red(result.message);
            
            console.log(`${icon} ${check.name}: ${message}`);
            if (result.suggestion) {
                console.log(chalk.yellow(`  💡 ${result.suggestion}`));
            }
            
            if (!result.status) allPassed = false;
        }
        
        console.log();
        if (allPassed) {
            console.log(chalk.green('🎉 All checks passed! System is ready.'));
        } else {
            console.log(chalk.yellow('⚠️  Some issues detected. Use --fix to attempt automatic fixes.'));
        }
        console.log();
    });

// Data management commands
program
    .command('sync')
    .description('Synchronize data between database and local storage')
    .option('--to-db', 'Sync local data to database')
    .option('--from-db', 'Sync database data to local storage')
    .option('--both', 'Sync in both directions')
    .action(async (options) => {
        const { syncToDatabase, syncFromDatabase } = require('./lib/database');

        console.log(chalk.cyan('🔄 Data Synchronization\n'));

        if (options.toDb || options.both) {
            console.log('Syncing to database...');
            const success = await syncToDatabase();
            console.log(success ? chalk.green('✓ Sync to database completed') : chalk.red('✗ Sync to database failed'));
        }

        if (options.fromDb || options.both) {
            console.log('Syncing from database...');
            const success = await syncFromDatabase();
            console.log(success ? chalk.green('✓ Sync from database completed') : chalk.red('✗ Sync from database failed'));
        }

        if (!options.toDb && !options.fromDb && !options.both) {
            console.log(chalk.yellow('Please specify sync direction: --to-db, --from-db, or --both'));
        }
    });

program
    .command('backup')
    .description('Create backup of local data')
    .action(async () => {
        const { ensureDataDirectories, loadFromLocalStorage, saveToLocalStorage } = require('./lib/database');
        const os = require('os');

        console.log(chalk.cyan('💾 Creating Backup\n'));

        ensureDataDirectories();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(os.homedir(), '.controller-config', 'data', 'backups');

        const files = ['controllers.json', 'privileges.json', 'records.json'];
        let backedUp = 0;

        for (const file of files) {
            const sourcePath = path.join(os.homedir(), '.controller-config', 'data', file);
            const data = loadFromLocalStorage(sourcePath);

            if (data) {
                const backupPath = path.join(backupDir, `${path.basename(file, '.json')}_${timestamp}.json`);
                const success = await saveToLocalStorage(data, backupPath);
                if (success) {
                    backedUp++;
                    console.log(chalk.green(`✓ Backed up ${file}`));
                } else {
                    console.log(chalk.red(`✗ Failed to backup ${file}`));
                }
            }
        }

        console.log(`\n${chalk.cyan('Backup completed:')} ${backedUp}/${files.length} files backed up`);
    });

// Enhanced error handling for commands
program.commands.forEach(cmd => {
    if (cmd._actionHandler) {
        const originalAction = cmd._actionHandler;
        cmd._actionHandler = async (...args) => {
            try {
                await originalAction.apply(cmd, args);
            } catch (error) {
                console.error(chalk.red(`Error in command '${cmd.name()}':`), error.message);

                if (program.opts().debug) {
                    console.error(chalk.gray(error.stack));
                }

                if (program.opts().verbose) {
                    console.error(chalk.gray('Command arguments:'), args);
                }

                process.exit(1);
            }
        };
    }
});

// Custom output handling
if (program.opts().noColor) {
    chalk.level = 0;
}

if (program.opts().debug) {
    process.env.NODE_ENV = 'development';
    console.log(chalk.gray('Debug mode enabled'));
}

if (program.opts().offline) {
    process.env.OFFLINE_MODE = 'true';
    console.log(chalk.yellow('Offline mode enabled - using local storage only'));
}

// Show banner and help if no command provided
if (process.argv.length === 2) {
    try {
        console.log(chalk.cyan(figlet.textSync('Controller Config', {
            font: 'Small',
            horizontalLayout: 'default',
            verticalLayout: 'default'
        })));
    } catch (error) {
        console.log(chalk.cyan('Controller Configuration Tool'));
    }

    console.log(chalk.gray('Advanced Access Control System Configuration Tool v2.0.0\n'));
    program.help();
}

// Parse arguments
program.parse(process.argv);

// If no valid command was found, show help
const validCommands = program.commands.map(cmd => cmd.name());
const providedCommand = process.argv[2];

if (providedCommand && !validCommands.includes(providedCommand) &&
    providedCommand !== '--help' && providedCommand !== '-h' &&
    !providedCommand.startsWith('-')) {
    console.log(chalk.red(`Unknown command: ${providedCommand}`));
    console.log(chalk.yellow('Available commands:'));
    validCommands.slice(0, 10).forEach(cmd => console.log(chalk.gray(`  ${cmd}`)));
    if (validCommands.length > 10) {
        console.log(chalk.gray(`  ... and ${validCommands.length - 10} more`));
    }
    console.log(chalk.gray('\nUse "list-commands" to see all commands or --help for more information'));
    process.exit(1);
}
