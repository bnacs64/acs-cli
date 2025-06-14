const { BaseCommand } = require('../lib/baseCommand');
const { ControllerSDK } = require('../lib/sdkImplementation');
const { upsertController, saveToLocalStorage } = require('../lib/database');
const chalk = require('chalk');

class EnhancedDiscoverCommand extends BaseCommand {
    constructor() {
        super();
        this.sdk = new ControllerSDK({
            timeout: this.config.get('discovery.timeout') || 3000,
            debug: this.config.get('verboseMode') || false
        });
    }

    async execute(options = {}) {
        this.ui.info('🔍 Enhanced Controller Discovery');
        this.ui.info('Scanning network for access control devices...\n');

        try {
            // Start discovery with progress indication
            this.ui.showProgress('Scanning network...');
            
            const controllers = await this.discoverControllers(options);
            
            this.ui.hideProgress();

            if (controllers.length === 0) {
                this.ui.warning('No controllers found on the network.');
                this.ui.info('Tips:');
                this.ui.info('• Ensure controllers are powered on and connected');
                this.ui.info('• Check network connectivity');
                this.ui.info('• Verify firewall settings (UDP port 60000)');
                return;
            }

            // Display discovered controllers
            await this.displayControllers(controllers);

            // Handle data persistence
            if (!options.skipPersist) {
                await this.handlePersistence(controllers);
            }

            // Offer additional actions
            await this.offerAdditionalActions(controllers);

        } catch (error) {
            this.ui.hideProgress();
            await this.handleError(error, 'Discovery failed');
        }
    }

    async discoverControllers(options) {
        const controllers = [];
        const discoveredMap = new Map();

        // Set up event listener for real-time discovery feedback
        this.sdk.on('controllerDiscovered', (controller) => {
            if (!discoveredMap.has(controller.device_serial_number)) {
                discoveredMap.set(controller.device_serial_number, controller);
                controllers.push(controller);
                
                this.ui.updateProgress(`Found controller: SN=${controller.device_serial_number}`);
                
                if (!options.quiet) {
                    this.ui.success(`📡 Discovered: SN=${controller.device_serial_number}, IP=${controller.ip_address}`);
                }
            }
        });

        // Perform discovery
        const broadcastIp = options.broadcastIp || '255.255.255.255';
        await this.sdk.searchController(broadcastIp);

        // Add enhanced controller information
        for (const controller of controllers) {
            try {
                // Try to get additional status information
                const status = await this.sdk.queryControllerStatus(
                    controller.device_serial_number,
                    controller.ip_address
                );
                
                controller.status = status;
                controller.online = true;
                controller.last_seen = new Date().toISOString();
            } catch (error) {
                controller.online = false;
                controller.status_error = error.message;
            }
        }

        return controllers;
    }

    async displayControllers(controllers) {
        this.ui.success(`\n🎉 Found ${controllers.length} controller(s):\n`);

        // Create detailed table
        const tableData = controllers.map((controller, index) => [
            (index + 1).toString(),
            controller.device_serial_number.toString(),
            controller.ip_address,
            controller.mac_address,
            controller.driver_version,
            controller.online ? chalk.green('Online') : chalk.red('Offline'),
            controller.status?.lastRecord?.index || 'N/A'
        ]);

        const headers = [
            '#', 'Serial Number', 'IP Address', 'MAC Address', 
            'Driver Ver.', 'Status', 'Last Record'
        ];

        this.ui.displayTable(tableData, headers);

        // Show additional details for each controller
        for (const [index, controller] of controllers.entries()) {
            console.log(chalk.cyan(`\n📋 Controller ${index + 1} Details:`));
            console.log(`   Network: ${controller.ip_address}/${controller.subnet_mask} (Gateway: ${controller.gateway})`);
            console.log(`   Driver: v${controller.driver_version} (Released: ${controller.driver_release_date})`);
            
            if (controller.status) {
                console.log(`   Current Time: ${controller.status.currentTime}`);
                console.log(`   Door Sensors: ${controller.status.doorStatus.sensors.map((s, i) => `D${i+1}:${s ? 'Open' : 'Closed'}`).join(', ')}`);
                
                if (controller.status.errorNumber !== 0) {
                    console.log(chalk.red(`   ⚠️  Error Code: ${controller.status.errorNumber}`));
                }
            }
        }
    }

    async handlePersistence(controllers) {
        const shouldPersist = await this.ui.confirmAction(
            `💾 Save ${controllers.length} controller(s) to storage?`,
            true
        );

        if (!shouldPersist) {
            this.ui.info('Controllers not saved.');
            return;
        }

        this.ui.showProgress('Saving controllers...');
        
        let savedToDb = 0;
        let savedToLocal = 0;
        const errors = [];

        for (const controller of controllers) {
            try {
                // Enhanced controller data for storage
                const controllerData = {
                    device_serial_number: controller.device_serial_number,
                    ip_address: controller.ip_address,
                    subnet_mask: controller.subnet_mask,
                    gateway: controller.gateway,
                    mac_address: controller.mac_address,
                    driver_version: controller.driver_version,
                    driver_release_date: controller.driver_release_date,
                    discovered_at: controller.discovered_at,
                    last_seen: controller.last_seen,
                    online: controller.online,
                    status: controller.status,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                // Try database first, then local storage
                const result = await upsertController(controllerData);
                if (result) {
                    savedToDb++;
                }
                savedToLocal++; // Local storage is always attempted in upsertController

            } catch (error) {
                errors.push(`SN ${controller.device_serial_number}: ${error.message}`);
            }
        }

        this.ui.hideProgress();

        // Report results
        if (savedToDb > 0) {
            this.ui.success(`✅ Saved ${savedToDb} controllers to database`);
        }
        
        if (savedToLocal > 0) {
            this.ui.success(`💾 Saved ${savedToLocal} controllers to local storage`);
        }

        if (errors.length > 0) {
            this.ui.warning(`⚠️  ${errors.length} errors occurred:`);
            errors.forEach(error => this.ui.warning(`   ${error}`));
        }
    }

    async offerAdditionalActions(controllers) {
        if (controllers.length === 0) return;

        const actions = [
            'Select a controller as default',
            'Test connectivity to all controllers',
            'Export controller data',
            'Continue without additional actions'
        ];

        const choice = await this.ui.selectFromList(
            'What would you like to do next?',
            actions
        );

        switch (choice) {
            case 0: // Select controller
                await this.selectDefaultController(controllers);
                break;
            case 1: // Test connectivity
                await this.testConnectivity(controllers);
                break;
            case 2: // Export data
                await this.exportControllerData(controllers);
                break;
            default:
                this.ui.info('Discovery completed.');
        }
    }

    async selectDefaultController(controllers) {
        const choices = controllers.map((c, i) => 
            `${i + 1}. SN=${c.device_serial_number}, IP=${c.ip_address} (${c.online ? 'Online' : 'Offline'})`
        );

        const selection = await this.ui.selectFromList(
            'Select default controller:',
            choices
        );

        if (selection >= 0) {
            const selected = controllers[selection];
            const success = this.config.setSelectedController(selected);
            
            if (success) {
                this.ui.success(`✅ Selected controller SN=${selected.device_serial_number} as default`);
            } else {
                this.ui.error('Failed to save selected controller');
            }
        }
    }

    async testConnectivity(controllers) {
        this.ui.info('\n🔗 Testing connectivity...\n');

        for (const controller of controllers) {
            this.ui.showProgress(`Testing ${controller.ip_address}...`);
            
            try {
                const startTime = Date.now();
                await this.sdk.queryControllerStatus(
                    controller.device_serial_number,
                    controller.ip_address
                );
                const responseTime = Date.now() - startTime;
                
                this.ui.hideProgress();
                this.ui.success(`✅ ${controller.ip_address}: ${responseTime}ms`);
                
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`❌ ${controller.ip_address}: ${error.message}`);
            }
        }
    }

    async exportControllerData(controllers) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `controllers_export_${timestamp}.json`;
        
        try {
            const exportData = {
                exported_at: new Date().toISOString(),
                total_controllers: controllers.length,
                controllers: controllers
            };

            await saveToLocalStorage(exportData, filename);
            this.ui.success(`📄 Exported controller data to ${filename}`);
            
        } catch (error) {
            this.ui.error(`Failed to export data: ${error.message}`);
        }
    }
}

module.exports = {
    register: (program) => {
        program
            .command('enhanced-discover')
            .description('Enhanced controller discovery with detailed information and persistence')
            .option('--broadcast-ip <ip>', 'Broadcast IP address', '255.255.255.255')
            .option('--skip-persist', 'Skip saving discovered controllers')
            .option('--quiet', 'Reduce output verbosity')
            .option('--timeout <ms>', 'Discovery timeout in milliseconds', '3000')
            .action(async (options) => {
                const command = new EnhancedDiscoverCommand();
                await command.execute(options);
                command.cleanup();
            });
    }
};
