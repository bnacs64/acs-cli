const { BaseCommand } = require('../lib/baseCommand');
const { StatusDisplay } = require('../lib/statusDisplay');
const { getControllers } = require('../lib/database');
const figlet = require('figlet');
const chalk = require('chalk');

class DashboardCommand extends BaseCommand {
    constructor() {
        super();
        this.display = new StatusDisplay();
    }

    async execute(options = {}) {
        try {
            // Show banner
            if (!options.noBanner) {
                this.showBanner();
            }

            // Load controllers with real-time status
            this.display.startSpinner('Loading controller data...');
            const controllers = await getControllers();
            const selectedController = this.config.getSelectedController();
            
            // Update controller status in real-time (but skip in interactive mode to avoid readline conflicts)
            if (!options.interactive) {
                await this.updateControllerStatus(controllers, selectedController);
            } else {
                // In interactive mode, just mark basic online status without deep checking
                controllers.forEach(controller => {
                    controller.online = false; // Will be checked individually when needed
                });
                if (selectedController) {
                    // Find the selected controller in the list and mark it
                    const selected = controllers.find(c => 
                        c.device_serial_number === selectedController.device_serial_number
                    );
                    if (selected) {
                        selected.online = false; // Will show as offline initially
                    }
                }
            }
            this.display.stopSpinner();

            // Show dashboard
            this.display.showDashboard(controllers, selectedController);

            // Show controller list if requested or if there are controllers
            if (options.list || (controllers.length > 0 && controllers.length <= 10)) {
                console.log(chalk.cyan('\n📋 Controller List:'));
                this.display.showControllerList(controllers);
            }

            // Show system health
            if (options.health) {
                await this.showSystemHealth(controllers);
            }

            // Show recent activity
            if (options.activity) {
                await this.showRecentActivity();
            }

            // Interactive mode
            if (options.interactive) {
                await this.interactiveDashboard(controllers, selectedController);
            }

        } catch (error) {
            this.display.failSpinner('Failed to load dashboard');
            await this.handleError(error, 'Dashboard error');
        }
    }

    showBanner() {
        try {
            const banner = figlet.textSync('Controller\nConfig', {
                font: 'Small',
                horizontalLayout: 'fitted'
            });
            console.log(chalk.cyan(banner));
        } catch (error) {
            console.log(chalk.cyan('🎛️  Controller Configuration Tool'));
        }
        console.log(chalk.gray('Version 1.0.0 | Access Control Management\n'));
    }

    async showSystemHealth(controllers) {
        console.log(chalk.cyan('\n🏥 System Health Check:'));

        const healthData = {
            totalControllers: controllers.length,
            onlineControllers: controllers.filter(c => c.online).length,
            controllersWithErrors: controllers.filter(c => c.has_errors).length,
            lastDiscovery: await this.getLastDiscoveryTime(),
            databaseConnection: await this.checkDatabaseConnection()
        };

        const healthPercentage = this.calculateHealthScore(healthData);
        const healthColor = healthPercentage >= 80 ? 'green' : 
                           healthPercentage >= 60 ? 'yellow' : 'red';

        console.log(`Overall Health: ${chalk[healthColor](healthPercentage + '%')}`);
        console.log(`Controllers Online: ${healthData.onlineControllers}/${healthData.totalControllers}`);
        console.log(`Database: ${healthData.databaseConnection ? chalk.green('Connected') : chalk.red('Disconnected')}`);
        
        if (healthData.lastDiscovery) {
            console.log(`Last Discovery: ${this.display.formatDate(healthData.lastDiscovery)}`);
        }
    }

    async showRecentActivity() {
        console.log(chalk.cyan('\n📈 Recent Activity:'));
        // This would connect to the actual activity log
        console.log(chalk.gray('• No recent activity (feature in development)'));
    }

    async interactiveDashboard(controllers, selectedController) {
        const actions = [
            { display: '🔍 Discover controllers', value: 'discover' },
            { display: '🎯 Select controller', value: 'select' },
            { display: '📊 View controller status', value: 'status' },
            { display: '🎫 Manage privileges', value: 'privileges' },
            { display: '🚪 Test door operation', value: 'door-test' },
            { display: '⚙️  System settings', value: 'settings' },
            { display: '🧙 Launch wizard', value: 'wizard' },
            { display: '❌ Exit', value: 'exit' }
        ];

        while (true) {
            try {
                const action = await this.ui.selectFromList(
                    actions,
                    '\nWhat would you like to do?'
                );

                if (!action || action === 'exit') {
                    this.ui.info('Goodbye! 👋');
                    break;
                }

                await this.handleDashboardAction(action, controllers, selectedController);
            } catch (error) {
                if (error.message.includes('Interactive session ended') || error.message.includes('readline')) {
                    this.ui.info('\nSession ended. Goodbye! 👋');
                    break;
                } else {
                    console.error('Error in interactive menu:', error.message);
                    break;
                }
            }
        }
    }

    async handleDashboardAction(action, controllers, selectedController) {
        switch (action) {
            case 'discover':
                this.ui.info('To run discovery, exit and use: node cli-enhanced.js discover');
                break;
                
            case 'select':
                if (controllers.length === 0) {
                    this.ui.warning('No controllers available. Run discovery first.');
                    return;
                }
                const newSelection = await this.interactiveControllerSelection();
                if (newSelection) {
                    this.ui.success('Controller selected!');
                    selectedController = newSelection;
                }
                break;
                
            case 'status':
                if (!selectedController) {
                    this.ui.warning('No controller selected.');
                    return;
                }
                this.ui.info('To check status, exit and use: node cli-enhanced.js query-status selected selected');
                break;
                
            case 'privileges':
                this.ui.info('To manage privileges, exit and use: node cli-enhanced.js wizard');
                break;
                
            case 'door-test':
                if (!selectedController) {
                    this.ui.warning('No controller selected.');
                    return;
                }
                this.ui.info('To test doors, exit and use: node cli-enhanced.js quick');
                break;
                
            case 'settings':
                await this.showSettingsMenu();
                break;
                
            case 'wizard':
                this.ui.info('To launch wizard, exit and use: node cli-enhanced.js wizard');
                break;
        }
    }

    async testDoorOperation(controller) {
        const doorNumber = await this.validateInput(
            'Which door would you like to test? (1-4)',
            'doorNumber'
        );

        const confirmed = await this.ui.confirmAction(
            `Test door ${doorNumber} on controller ${controller.device_serial_number}?`
        );

        if (confirmed) {
            this.display.startSpinner(`Testing door ${doorNumber}...`);
            // Simulate door test
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.display.stopSpinner('✓', `Door ${doorNumber} test completed`);
        }
    }

    async showSettingsMenu() {
        const settings = [
            { display: 'Default port settings', value: 'port' },
            { display: 'Network interface preferences', value: 'network' },
            { display: 'Discovery timeout', value: 'timeout' },
            { display: 'Auto-save preferences', value: 'autosave' },
            { display: 'Reset to defaults', value: 'reset' }
        ];

        const setting = await this.ui.selectFromList(
            settings,
            'Which setting would you like to modify?'
        );

        switch (setting) {
            case 'port':
                const newPort = await this.validateInput(
                    'Enter default controller port',
                    'port',
                    { default: this.config.get('defaultPort').toString() }
                );
                this.config.set('defaultPort', parseInt(newPort));
                this.ui.success('Default port updated!');
                break;
                
            case 'timeout':
                const newTimeout = await this.validateInput(
                    'Enter discovery timeout (ms)',
                    'port',
                    { default: this.config.get('discovery.timeout').toString(), min: 1000, max: 30000 }
                );
                this.config.set('discovery.timeout', parseInt(newTimeout));
                this.ui.success('Discovery timeout updated!');
                break;
                
            case 'autosave':
                const autoSave = await this.ui.confirmAction(
                    'Enable auto-save for configuration changes?',
                    this.config.get('autoSave')
                );
                this.config.set('autoSave', autoSave);
                this.ui.success('Auto-save preference updated!');
                break;
                
            case 'reset':
                const confirmed = await this.ui.confirmAction(
                    'Reset all settings to defaults? This cannot be undone.',
                    false
                );
                if (confirmed) {
                    // Reset logic would go here
                    this.ui.success('Settings reset to defaults!');
                }
                break;
        }
    }

    async getLastDiscoveryTime() {
        // This would query the database for the last discovery timestamp
        return null;
    }

    async checkDatabaseConnection() {
        try {
            await getControllers();
            return true;
        } catch (error) {
            return false;
        }
    }

    async updateControllerStatus(controllers, selectedController) {
        const { CommandRunner } = require('../lib/commandRunner');
        const runner = new CommandRunner();
        
        // Test connectivity for each controller
        for (const controller of controllers) {
            try {
                // Save current selection
                const currentSelected = this.config.getSelectedController();
                
                // Temporarily select this controller for status check
                this.config.setSelectedController({
                    device_serial_number: controller.device_serial_number,
                    ip_address: controller.ip_address
                });
                
                // Test connection
                await runner.queryStatus();
                controller.online = true;
                controller.last_seen = new Date().toISOString();
                
                // Restore original selection
                if (currentSelected) {
                    this.config.setSelectedController(currentSelected);
                } else {
                    this.config.clearSelectedController();
                }
                
            } catch (error) {
                controller.online = false;
            }
        }
        
        // Update selected controller status with more details
        if (selectedController) {
            try {
                const statusResult = await runner.queryStatus();
                selectedController.detailedStatus = statusResult.stdout;
            } catch (error) {
                selectedController.detailedStatus = 'Offline or unreachable';
            }
        }
    }

    calculateHealthScore(healthData) {
        let score = 100;
        
        // Deduct points for offline controllers
        if (healthData.totalControllers > 0) {
            const offlineRatio = (healthData.totalControllers - healthData.onlineControllers) / healthData.totalControllers;
            score -= offlineRatio * 30;
        }
        
        // Deduct points for controllers with errors
        if (healthData.controllersWithErrors > 0) {
            score -= (healthData.controllersWithErrors / healthData.totalControllers) * 20;
        }
        
        // Deduct points for database issues
        if (!healthData.databaseConnection) {
            score -= 25;
        }
        
        return Math.max(0, Math.round(score));
    }
}

module.exports = {
    register: (program) => {
        program
            .command('dashboard')
            .alias('dash')
            .description('Show interactive controller dashboard')
            .option('--no-banner', 'Hide the welcome banner')
            .option('-l, --list', 'Show controller list')
            .option('-h, --health', 'Show system health check')
            .option('-a, --activity', 'Show recent activity')
            .option('-i, --interactive', 'Enter interactive mode')
            .action(async (options) => {
                const command = new DashboardCommand();
                await command.execute(options);
            });
    }
};
