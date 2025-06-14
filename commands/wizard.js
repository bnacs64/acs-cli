const { BaseCommand } = require('../lib/baseCommand');
const { CommandRunner } = require('../lib/commandRunner');
const { getControllers } = require('../lib/database');

class WizardCommand extends BaseCommand {
    constructor() {
        super();
        this.runner = new CommandRunner();
    }
    async execute() {
        try {
            this.ui.info('🧙 Controller Configuration Wizard');
            this.ui.info('This wizard will guide you through common controller operations.\n');

            const wizardType = await this.selectWizardType();
            if (!wizardType) return;

            switch (wizardType) {
                case 'setup':
                    await this.initialSetupWizard();
                    break;
                case 'privilege':
                    await this.privilegeWizard();
                    break;
                case 'network':
                    await this.networkConfigWizard();
                    break;
                case 'door':
                    await this.doorConfigWizard();
                    break;
                case 'maintenance':
                    await this.maintenanceWizard();
                    break;
            }

        } catch (error) {
            await this.handleError(error, 'Wizard failed');
        } finally {
            this.cleanup();
        }
    }

    async selectWizardType() {
        const wizardTypes = [
            { display: '🚀 Initial Setup - Discover and configure your first controller', value: 'setup' },
            { display: '🎫 Privilege Management - Add, modify, or remove access cards', value: 'privilege' },
            { display: '🌐 Network Configuration - Set up controller network settings', value: 'network' },
            { display: '🚪 Door Control - Configure door behavior and access', value: 'door' },
            { display: '🔧 Maintenance - System status, time sync, and diagnostics', value: 'maintenance' }
        ];

        return await this.ui.selectFromList(
            wizardTypes,
            'What would you like to do?',
            { allowCancel: true }
        );
    }

    async initialSetupWizard() {
        this.ui.info('\n🚀 Initial Setup Wizard');
        this.ui.info('Let\'s get your controller system up and running!\n');

        // Check existing controllers first
        const existingControllers = await this.getExistingControllers();
        
        if (existingControllers.length > 0) {
            this.ui.info(`Found ${existingControllers.length} existing controller(s) in database.`);
            const useExisting = await this.ui.confirmAction(
                'Would you like to use an existing controller instead of discovering new ones?'
            );
            
            if (useExisting) {
                const controller = await this.interactiveControllerSelection();
                if (controller) {
                    await this.completeInitialSetup(controller);
                    return;
                }
            }
        }

        // Step 1: Discovery
        this.ui.info('Step 1: Discover Controllers');
        const shouldDiscover = await this.ui.confirmAction(
            'Scan for controllers on your network?',
            true
        );

        if (shouldDiscover) {
            this.ui.showProgress('Scanning network for controllers...');
            try {
                await this.runner.discover({ skipPersist: false });
                this.ui.hideProgress();
                this.ui.success('Discovery completed successfully!');
                
                // Refresh controller list after discovery
                const newControllers = await this.getExistingControllers();
                if (newControllers.length === 0) {
                    this.ui.warning('No controllers were discovered. Please check:');
                    this.ui.info('• Controllers are powered on and connected to network');
                    this.ui.info('• Your computer is on the same network segment');
                    this.ui.info('• Controller port 60000 is not blocked by firewall');
                    return;
                }
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`Discovery failed: ${error.message}`);
                return;
            }
        }

        // Step 2: Select Controller
        this.ui.info('\nStep 2: Select Your Controller');
        const controller = await this.interactiveControllerSelection();
        if (!controller) {
            this.ui.warning('Setup cancelled - no controller selected.');
            return;
        }

        await this.completeInitialSetup(controller);
    }

    async completeInitialSetup(controller) {
        // Step 3: Verify Connection
        this.ui.info('\nStep 3: Verify Controller Connection');
        this.ui.showProgress('Testing connection to controller...');
        
        try {
            // Use a shorter timeout for the connection test (15 seconds)
            await this.runner.queryStatus('selected', 'selected', { timeout: 15000 });
            this.ui.hideProgress();
            this.ui.success('Controller is responding correctly!');
        } catch (error) {
            this.ui.hideProgress();
            this.ui.warning(`Connection test failed: ${error.message}`);
            
            // Provide more detailed guidance based on the error
            if (error.message.includes('timeout')) {
                this.ui.info('\nTroubleshooting tips:');
                this.ui.info('- Verify the controller IP address is correct');
                this.ui.info('- Check that the controller is powered on and connected to the network');
                this.ui.info('- Ensure no firewall is blocking UDP port 60000');
                this.ui.info('- Try pinging the controller to verify basic network connectivity');
            }
            
            const continueAnyway = await this.ui.confirmAction(
                'Continue with setup anyway? (Some features may not work)'
            );
            if (!continueAnyway) {
                this.ui.info('Setup cancelled.');
                return;
            }
        }

        // Step 4: Basic Configuration
        this.ui.info('\nStep 4: Basic Configuration');
        const shouldSyncTime = await this.ui.confirmAction(
            'Synchronize the controller time with your system?',
            true
        );

        if (shouldSyncTime) {
            this.ui.showProgress('Synchronizing controller time...');
            try {
                await this.runner.syncTime();
                this.ui.hideProgress();
                this.ui.success('Time synchronized successfully!');
            } catch (error) {
                this.ui.hideProgress();
                this.ui.warning(`Time sync failed: ${error.message}`);
            }
        }

        // Step 5: Controller Status Check
        this.ui.info('\nStep 5: System Status Check');
        await this.displayControllerInfo(controller);

        // Step 6: Next Steps
        this.ui.info('\n✅ Setup Complete!');
        this.ui.success(`Controller ${controller.deviceSn} is now configured and ready to use.`);
        this.ui.info('\nRecommended next steps:');
        this.ui.info('  • Add access privileges for users');
        this.ui.info('  • Configure door control settings');
        this.ui.info('  • Test door operations');
        
        const nextAction = await this.ui.selectFromList([
            { display: 'Add a privilege for a card', value: 'privilege' },
            { display: 'Configure door settings', value: 'door' },
            { display: 'Test door operation', value: 'test' },
            { display: 'View system status', value: 'status' },
            { display: 'Exit wizard', value: 'exit' }
        ], '\nWhat would you like to do next?');

        // Continue the wizard based on user choice
        await this.handleNextAction(nextAction);
    }

    async handleNextAction(nextAction) {
        switch (nextAction) {
            case 'privilege':
                await this.privilegeWizard();
                break;
            case 'door':
                await this.doorConfigWizard();
                break;
            case 'test':
                const doorNum = await this.validateInput('Which door to test? (1-4)', 'doorNumber');
                await this.testDoorOperation(doorNum);
                break;
            case 'status':
                await this.checkControllerStatus();
                break;
            case 'exit':
                this.ui.info('\n👋 Thank you for using the Controller Configuration Wizard!');
                return;
        }

        // After completing an action, ask what to do next (unless it's exit)
        if (nextAction !== 'exit') {
            await this.showPostActionMenu();
        }
    }

    async showPostActionMenu() {
        this.ui.info('\n' + '─'.repeat(50));
        const continueAction = await this.ui.selectFromList([
            { display: '🔄 Return to main wizard menu', value: 'main' },
            { display: '➕ Add a privilege for a card', value: 'privilege' },
            { display: '🚪 Configure door settings', value: 'door' },
            { display: '🧪 Test door operation', value: 'test' },
            { display: '📊 View system status', value: 'status' },
            { display: '👋 Exit wizard', value: 'exit' }
        ], 'What would you like to do next?');

        if (continueAction === 'main') {
            // Go back to main wizard menu
            const wizardType = await this.selectWizardType();
            if (wizardType) {
                switch (wizardType) {
                    case 'setup':
                        await this.initialSetupWizard();
                        break;
                    case 'privilege':
                        await this.privilegeWizard();
                        break;
                    case 'network':
                        await this.networkConfigWizard();
                        break;
                    case 'door':
                        await this.doorConfigWizard();
                        break;
                    case 'maintenance':
                        await this.maintenanceWizard();
                        break;
                }
            }
        } else {
            await this.handleNextAction(continueAction);
        }
    }

    async privilegeWizard() {
        this.ui.info('\n🎫 Privilege Management Wizard');
        
        // First, show current privilege count
        try {
            this.ui.showProgress('Reading current privileges...');
            const result = await this.runner.readTotalPrivileges();
            this.ui.hideProgress();
            
            const lines = result.stdout.split('\n');
            const privilegeCount = lines.find(line => line.includes('Total privileges'))?.match(/\d+/)?.[0] || '0';
            this.ui.info(`Current privileges in controller: ${privilegeCount}`);
        } catch (error) {
            this.ui.hideProgress();
            this.ui.warning(`Could not read privilege count: ${error.message}`);
        }
        
        const action = await this.ui.selectFromList([
            { display: 'Add new privilege', value: 'add' },
            { display: 'Query specific privilege', value: 'query' },
            { display: 'Delete privilege', value: 'delete' },
            { display: 'View privilege count', value: 'view' },
            { display: 'Clear all privileges', value: 'clear' }
        ], 'What would you like to do?');

        switch (action) {
            case 'add':
                await this.addPrivilegeWizard();
                break;
            case 'query':
                await this.queryPrivilegeWizard();
                break;
            case 'delete':
                await this.deletePrivilegeWizard();
                break;
            case 'view':
                await this.viewPrivilegesWizard();
                break;
            case 'clear':
                await this.clearPrivilegesWizard();
                break;
        }

        // After completing a privilege action, show continuation menu
        await this.showPostActionMenu();
    }

    async addPrivilegeWizard() {
        this.ui.info('\n➕ Add New Privilege');
        
        // Card Number
        const cardNumber = await this.validateInput(
            'Enter the card number',
            'cardNumber'
        );

        // Date Range
        this.ui.info('\nSet the access period:');
        const startDate = await this.validateInput(
            'Enter start date (YYYYMMDD)',
            'date',
            { default: this.getTodayString() }
        );

        const endDate = await this.validateInput(
            'Enter end date (YYYYMMDD)',
            'date',
            { default: this.getNextYearString() }
        );

        // Door Access
        this.ui.info('\nConfigure door access:');
        const doorAccess = {};
        for (let i = 1; i <= 4; i++) {
            doorAccess[`door${i}`] = await this.ui.confirmAction(
                `Allow access to Door ${i}?`,
                i === 1 // Default to yes for door 1
            );
        }

        // Password (optional)
        const hasPassword = await this.ui.confirmAction('Set a password for this card?');
        let password = null;
        if (hasPassword) {
            password = await this.ui.askQuestion('Enter password (4-8 digits)');
        }

        // Summary
        this.ui.info('\n📋 Privilege Summary:');
        this.ui.info(`Card Number: ${cardNumber}`);
        this.ui.info(`Access Period: ${startDate} to ${endDate}`);
        this.ui.info(`Door Access: ${Object.entries(doorAccess)
            .filter(([_, allowed]) => allowed)
            .map(([door, _]) => door.replace('door', 'Door '))
            .join(', ') || 'None'}`);
        if (password) this.ui.info(`Password: Set`);

        const confirmed = await this.ui.confirmAction('\nAdd this privilege?', true);
        if (confirmed) {
            this.ui.showProgress('Adding privilege...');
            try {
                const privilege = {
                    cardNumber: cardNumber.toString(),
                    startDate,
                    endDate,
                    door1Enable: doorAccess.door1,
                    door2Enable: doorAccess.door2,
                    door3Enable: doorAccess.door3,
                    door4Enable: doorAccess.door4,
                    password
                };
                
                await this.runner.addPrivilege(privilege);
                this.ui.hideProgress();
                this.ui.success('Privilege added successfully!');
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`Failed to add privilege: ${error.message}`);
            }
        } else {
            this.ui.info('Privilege creation cancelled.');
        }
    }

    async networkConfigWizard() {
        this.ui.info('\n🌐 Network Configuration Wizard');
        this.ui.warning('⚠️  Network changes will require controller restart!');
        
        const currentConfig = await this.ui.confirmAction(
            'Would you like to view current network settings first?'
        );

        if (currentConfig) {
            this.ui.info('Current network settings: (implementation needed)');
        }

        const shouldModify = await this.ui.confirmAction(
            'Do you want to modify network settings?'
        );

        if (!shouldModify) {
            this.ui.info('Network configuration cancelled.');
            // Still show continuation menu even if cancelled
            await this.showPostActionMenu();
            return;
        }

        // Get new network settings
        const newIp = await this.validateInput('Enter new IP address', 'ip');
        const newMask = await this.validateInput('Enter subnet mask', 'ip', { default: '255.255.255.0' });
        const newGateway = await this.validateInput('Enter gateway IP', 'ip');

        // Confirmation
        this.ui.info('\n📋 New Network Configuration:');
        this.ui.info(`IP Address: ${newIp}`);
        this.ui.info(`Subnet Mask: ${newMask}`);
        this.ui.info(`Gateway: ${newGateway}`);

        const confirmed = await this.ui.confirmAction(
            '\n⚠️  Apply these network settings? This will restart the controller!',
            false
        );

        if (confirmed) {
            this.ui.success('Network settings applied! (implementation needed)');
        }

        // After completing network configuration, show continuation menu
        await this.showPostActionMenu();
    }

    async doorConfigWizard() {
        this.ui.info('\n🚪 Door Configuration Wizard');
        
        const doorNumber = await this.validateInput(
            'Which door would you like to configure? (1-4)',
            'doorNumber'
        );

        const controlMethod = await this.ui.selectFromList([
            { display: 'Normally Open - Door stays unlocked', value: 1 },
            { display: 'Normally Closed - Door stays locked', value: 2 },
            { display: 'Online Control - Door controlled by system', value: 3 }
        ], 'Select door control method:');

        const openDelay = await this.validateInput(
            'Enter door open delay in seconds',
            'port',
            { default: '5', min: 1, max: 255 }
        );

        // Summary and confirmation
        this.ui.info(`\n📋 Door ${doorNumber} Configuration:`);
        this.ui.info(`Control Method: ${controlMethod === 1 ? 'Normally Open' : 
                                        controlMethod === 2 ? 'Normally Closed' : 'Online Control'}`);
        this.ui.info(`Open Delay: ${openDelay} seconds`);

        const confirmed = await this.ui.confirmAction('\nApply this door configuration?', true);
        
        if (confirmed) {
            this.ui.showProgress('Applying door configuration...');
            try {
                const doorConfig = {
                    doorNumber: doorNumber.toString(),
                    controlMethod: controlMethod.toString(),
                    openDelay: openDelay.toString()
                };
                
                await this.runner.setDoorControl(doorConfig);
                this.ui.hideProgress();
                this.ui.success('Door configuration applied successfully!');
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`Failed to configure door: ${error.message}`);
            }
        }

        // After completing door configuration, show continuation menu
        await this.showPostActionMenu();
    }

    async maintenanceWizard() {
        this.ui.info('\n🔧 Maintenance Wizard');
        
        const task = await this.ui.selectFromList([
            { display: 'Check controller status', value: 'status' },
            { display: 'Synchronize time', value: 'time' },
            { display: 'View recent records', value: 'records' },
            { display: 'Test door operation', value: 'test' },
            { display: 'System diagnostics', value: 'diagnostics' }
        ], 'Select maintenance task:');

        switch (task) {
            case 'status':
                await this.checkControllerStatus();
                break;
            case 'time':
                await this.syncControllerTime();
                break;
            case 'records':
                await this.viewRecentRecords();
                break;
            case 'test':
                const door = await this.validateInput('Which door to test? (1-4)', 'doorNumber');
                await this.testDoorOperation(door);
                break;
            case 'diagnostics':
                await this.runDiagnostics();
                break;
        }

        // After completing a maintenance task, show continuation menu
        await this.showPostActionMenu();
    }

    async viewPrivilegesWizard() {
        this.ui.info('\n👀 View Privileges');
        this.ui.showProgress('Reading total privileges...');
        
        try {
            const result = await this.runner.readTotalPrivileges();
            this.ui.hideProgress();
            
            // Parse the result to extract privilege count
            const lines = result.stdout.split('\n');
            const privilegeCount = lines.find(line => line.includes('Total privileges'))?.match(/\d+/)?.[0] || '0';
            
            this.ui.success(`Total privileges in controller: ${privilegeCount}`);
            
            if (parseInt(privilegeCount) > 0) {
                const viewDetails = await this.ui.confirmAction('Would you like to view privilege details?');
                if (viewDetails) {
                    this.ui.info('Detailed privilege viewing would require reading each privilege individually.');
                    this.ui.info('This feature could be enhanced to show a paginated list.');
                }
            } else {
                this.ui.info('No privileges found. Use the "Add Privilege" wizard to create some.');
            }
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Failed to read privileges: ${error.message}`);
        }
    }

    async checkControllerStatus() {
        this.ui.showProgress('Checking controller status...');
        
        try {
            const result = await this.runner.queryStatus();
            this.ui.hideProgress();
            this.ui.success('Controller status retrieved successfully!');
            
            // Display the status information
            this.ui.info('\n📊 Controller Status:');
            console.log(result.stdout);
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Failed to get status: ${error.message}`);
        }
    }

    async syncControllerTime() {
        this.ui.showProgress('Synchronizing controller time...');
        
        try {
            await this.runner.syncTime();
            this.ui.hideProgress();
            this.ui.success('Controller time synchronized successfully!');
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Failed to sync time: ${error.message}`);
        }
    }

    async viewRecentRecords() {
        this.ui.showProgress('Fetching recent records...');
        
        try {
            const result = await this.runner.getRecord();
            this.ui.hideProgress();
            this.ui.success('Recent records retrieved!');
            
            this.ui.info('\n📝 Recent Records:');
            console.log(result.stdout);
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Failed to get records: ${error.message}`);
        }
    }

    async testDoorOperation(doorNumber) {
        const confirmed = await this.ui.confirmAction(
            `Test door ${doorNumber} by opening it remotely?`,
            false
        );
        
        if (!confirmed) {
            this.ui.info('Door test cancelled.');
            return;
        }

        this.ui.showProgress(`Testing door ${doorNumber}...`);
        
        try {
            await this.runner.remoteOpenDoor('selected', 'selected', doorNumber.toString());
            this.ui.hideProgress();
            this.ui.success(`Door ${doorNumber} test completed! Check if the door opened.`);
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Door test failed: ${error.message}`);
        }
    }

    async runDiagnostics() {
        this.ui.info('\n🔍 Running System Diagnostics');
        
        const diagnostics = [
            {
                name: 'Controller Connection',
                test: async () => {
                    try {
                        await this.runner.queryStatus();
                        return { status: true, message: 'Connected' };
                    } catch (error) {
                        return { status: false, message: error.message };
                    }
                }
            },
            {
                name: 'Database Access',
                test: async () => {
                    try {
                        await getControllers();
                        return { status: true, message: 'Accessible' };
                    } catch (error) {
                        return { status: false, message: error.message };
                    }
                }
            },
            {
                name: 'Selected Controller',
                test: async () => {
                    const selected = this.config.getSelectedController();
                    if (selected) {
                        return { status: true, message: `SN: ${selected.device_serial_number}` };
                    } else {
                        return { status: false, message: 'No controller selected' };
                    }
                }
            }
        ];

        for (const diagnostic of diagnostics) {
            this.ui.showProgress(`Testing ${diagnostic.name}...`);
            const result = await diagnostic.test();
            this.ui.hideProgress();
            
            if (result.status) {
                this.ui.success(`${diagnostic.name}: ${result.message}`);
            } else {
                this.ui.error(`${diagnostic.name}: ${result.message}`);
            }
        }
    }

    async getExistingControllers() {
        try {
            const { getControllers } = require('../lib/database');
            return await getControllers();
        } catch (error) {
            return [];
        }
    }

    async displayControllerInfo(controller) {
        this.ui.info('\n📊 Controller Information:');
        this.ui.info(`Serial Number: ${controller.deviceSn}`);
        this.ui.info(`IP Address: ${controller.controllerIp}`);
        
        try {
            this.ui.showProgress('Getting detailed status...');
            const statusResult = await this.runner.queryStatus();
            this.ui.hideProgress();
            
            // Display status in a formatted way
            const statusLines = statusResult.stdout.split('\n').filter(line => line.trim());
            statusLines.forEach(line => {
                if (line.includes(':')) {
                    this.ui.info(`${line}`);
                }
            });
        } catch (error) {
            this.ui.hideProgress();
            this.ui.warning('Could not retrieve detailed status');
        }
    }

    async queryPrivilegeWizard() {
        this.ui.info('\n🔍 Query Privilege');
        
        const cardNumber = await this.validateInput(
            'Enter the card number to query',
            'cardNumber'
        );

        this.ui.showProgress(`Querying privilege for card ${cardNumber}...`);
        
        try {
            const result = await this.runner.queryPrivilege(cardNumber);
            this.ui.hideProgress();
            this.ui.success('Privilege found!');
            
            // Display the privilege information
            this.ui.info('\n📋 Privilege Details:');
            console.log(result.stdout);
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Privilege query failed: ${error.message}`);
        }
    }

    async deletePrivilegeWizard() {
        this.ui.info('\n🗑️  Delete Privilege');
        this.ui.warning('⚠️  This action cannot be undone!');
        
        const cardNumber = await this.validateInput(
            'Enter the card number to delete',
            'cardNumber'
        );

        // First, try to query the privilege to show what will be deleted
        try {
            this.ui.showProgress('Checking privilege...');
            const queryResult = await this.runner.queryPrivilege(cardNumber);
            this.ui.hideProgress();
            
            this.ui.info('\n📋 Privilege to be deleted:');
            console.log(queryResult.stdout);
        } catch (error) {
            this.ui.hideProgress();
            this.ui.warning('Could not find privilege details, but will attempt deletion anyway.');
        }

        const confirmed = await this.ui.confirmAction(
            `\nAre you sure you want to delete the privilege for card ${cardNumber}?`,
            false
        );

        if (confirmed) {
            this.ui.showProgress('Deleting privilege...');
            try {
                await this.runner.deletePrivilege(cardNumber);
                this.ui.hideProgress();
                this.ui.success('Privilege deleted successfully!');
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`Failed to delete privilege: ${error.message}`);
            }
        } else {
            this.ui.info('Deletion cancelled.');
        }
    }

    async clearPrivilegesWizard() {
        this.ui.info('\n🗑️  Clear All Privileges');
        this.ui.warning('⚠️  This will delete ALL privileges from the controller!');
        this.ui.warning('⚠️  This action cannot be undone!');
        
        // Show current count
        try {
            const result = await this.runner.readTotalPrivileges();
            const lines = result.stdout.split('\n');
            const privilegeCount = lines.find(line => line.includes('Total privileges'))?.match(/\d+/)?.[0] || '0';
            this.ui.info(`\nThis will delete ${privilegeCount} privilege(s).`);
        } catch (error) {
            this.ui.warning('Could not determine current privilege count.');
        }

        const confirmed = await this.ui.confirmAction(
            '\nAre you absolutely sure you want to clear all privileges?',
            false
        );

        if (confirmed) {
            const doubleConfirm = await this.ui.confirmAction(
                'Type "yes" to confirm: This will delete ALL privileges permanently.',
                false
            );

            if (doubleConfirm) {
                this.ui.showProgress('Clearing all privileges...');
                try {
                    await this.runner.clearAllPrivileges();
                    this.ui.hideProgress();
                    this.ui.success('All privileges cleared successfully!');
                } catch (error) {
                    this.ui.hideProgress();
                    this.ui.error(`Failed to clear privileges: ${error.message}`);
                }
            } else {
                this.ui.info('Clear operation cancelled.');
            }
        } else {
            this.ui.info('Clear operation cancelled.');
        }
    }

    getTodayString() {
        const today = new Date();
        return today.getFullYear() + 
               String(today.getMonth() + 1).padStart(2, '0') + 
               String(today.getDate()).padStart(2, '0');
    }

    getNextYearString() {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear.getFullYear() + 
               String(nextYear.getMonth() + 1).padStart(2, '0') + 
               String(nextYear.getDate()).padStart(2, '0');
    }
}

module.exports = {
    register: (program) => {
        program
            .command('wizard')
            .alias('wiz')
            .description('Interactive wizard for common controller operations')
            .action(async () => {
                const command = new WizardCommand();
                await command.execute();
            });
    }
};
