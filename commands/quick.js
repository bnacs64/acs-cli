const { BaseCommand } = require('../lib/baseCommand');
const { CommandRunner } = require('../lib/commandRunner');

class QuickOpsCommand extends BaseCommand {
    constructor() {
        super();
        this.runner = new CommandRunner();
    }

    async execute(options = {}) {
        try {
            this.ui.info('⚡ Quick Operations');
            this.ui.info('Fast access to common controller operations\n');

            const operations = [
                { display: '🎫 Add card privilege', value: 'add-card' },
                { display: '🔍 Check card access', value: 'check-card' },
                { display: '🚪 Open door now', value: 'open-door' },
                { display: '⏰ Sync time', value: 'sync-time' },
                { display: '📊 Controller status', value: 'status' },
                { display: '📝 Recent activity', value: 'activity' },
                { display: '🗑️  Remove card', value: 'remove-card' },
                { display: '🔧 Quick test', value: 'test' }
            ];

            const operation = await this.ui.selectFromList(
                operations,
                'What would you like to do?',
                { allowCancel: true }
            );

            if (!operation) return;

            switch (operation) {
                case 'add-card':
                    await this.quickAddCard();
                    break;
                case 'check-card':
                    await this.quickCheckCard();
                    break;
                case 'open-door':
                    await this.quickOpenDoor();
                    break;
                case 'sync-time':
                    await this.quickSyncTime();
                    break;
                case 'status':
                    await this.quickStatus();
                    break;
                case 'activity':
                    await this.quickActivity();
                    break;
                case 'remove-card':
                    await this.quickRemoveCard();
                    break;
                case 'test':
                    await this.quickTest();
                    break;
            }

        } catch (error) {
            await this.handleError(error, 'Quick operation failed');
        } finally {
            this.cleanup();
        }
    }

    async quickAddCard() {
        this.ui.info('\n🎫 Quick Add Card');
        
        const cardNumber = await this.validateInput('Card number', 'cardNumber');
        
        // Quick defaults for common scenarios
        const preset = await this.ui.selectFromList([
            { display: 'Standard Access (1 year, Door 1)', value: 'standard' },
            { display: 'Temporary Access (1 week, Door 1)', value: 'temp' },
            { display: 'Full Access (1 year, All doors)', value: 'full' },
            { display: 'Custom...', value: 'custom' }
        ], 'Access type:');

        let privilege;
        const today = this.getTodayString();
        
        switch (preset) {
            case 'standard':
                privilege = {
                    cardNumber: cardNumber.toString(),
                    startDate: today,
                    endDate: this.getDateString(365), // 1 year
                    door1Enable: true,
                    door2Enable: false,
                    door3Enable: false,
                    door4Enable: false
                };
                break;
                
            case 'temp':
                privilege = {
                    cardNumber: cardNumber.toString(),
                    startDate: today,
                    endDate: this.getDateString(7), // 1 week
                    door1Enable: true,
                    door2Enable: false,
                    door3Enable: false,
                    door4Enable: false
                };
                break;
                
            case 'full':
                privilege = {
                    cardNumber: cardNumber.toString(),
                    startDate: today,
                    endDate: this.getDateString(365), // 1 year
                    door1Enable: true,
                    door2Enable: true,
                    door3Enable: true,
                    door4Enable: true
                };
                break;
                
            case 'custom':
                return this.ui.info('Use the full wizard for custom privileges: controller-config wizard');
        }

        // Show summary
        this.ui.info('\n📋 Privilege Summary:');
        this.ui.info(`Card: ${privilege.cardNumber}`);
        this.ui.info(`Period: ${privilege.startDate} to ${privilege.endDate}`);
        this.ui.info(`Doors: ${this.formatDoorAccess(privilege)}`);

        const confirmed = await this.ui.confirmAction('Add this privilege?', true);
        if (confirmed) {
            this.ui.showProgress('Adding privilege...');
            try {
                await this.runner.addPrivilege(privilege);
                this.ui.hideProgress();
                this.ui.success('Card access added successfully!');
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`Failed: ${error.message}`);
            }
        }
    }

    async quickCheckCard() {
        this.ui.info('\n🔍 Quick Check Card');
        
        const cardNumber = await this.validateInput('Card number to check', 'cardNumber');
        
        this.ui.showProgress('Checking card access...');
        try {
            const result = await this.runner.queryPrivilege(cardNumber);
            this.ui.hideProgress();
            this.ui.success('Card found!');
            console.log(result.stdout);
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Card not found or error: ${error.message}`);
        }
    }

    async quickOpenDoor() {
        this.ui.info('\n🚪 Quick Open Door');
        
        const doorNumber = await this.validateInput('Door number (1-4)', 'doorNumber');
        
        const confirmed = await this.ui.confirmAction(
            `Open door ${doorNumber} now?`,
            true
        );

        if (confirmed) {
            this.ui.showProgress(`Opening door ${doorNumber}...`);
            try {
                await this.runner.remoteOpenDoor('selected', 'selected', doorNumber.toString());
                this.ui.hideProgress();
                this.ui.success(`Door ${doorNumber} opened!`);
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`Failed: ${error.message}`);
            }
        }
    }

    async quickSyncTime() {
        this.ui.info('\n⏰ Quick Time Sync');
        this.ui.showProgress('Synchronizing time...');
        
        try {
            await this.runner.syncTime();
            this.ui.hideProgress();
            this.ui.success('Time synchronized!');
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Failed: ${error.message}`);
        }
    }

    async quickStatus() {
        this.ui.info('\n📊 Quick Status Check');
        this.ui.showProgress('Getting controller status...');
        
        try {
            const result = await this.runner.queryStatus();
            this.ui.hideProgress();
            this.ui.success('Status retrieved!');
            console.log(result.stdout);
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Failed: ${error.message}`);
        }
    }

    async quickActivity() {
        this.ui.info('\n📝 Quick Activity Check');
        this.ui.showProgress('Getting recent activity...');
        
        try {
            const result = await this.runner.getRecord();
            this.ui.hideProgress();
            this.ui.success('Recent activity:');
            console.log(result.stdout);
        } catch (error) {
            this.ui.hideProgress();
            this.ui.error(`Failed: ${error.message}`);
        }
    }

    async quickRemoveCard() {
        this.ui.info('\n🗑️  Quick Remove Card');
        
        const cardNumber = await this.validateInput('Card number to remove', 'cardNumber');
        
        const confirmed = await this.ui.confirmAction(
            `Remove access for card ${cardNumber}?`,
            false
        );

        if (confirmed) {
            this.ui.showProgress('Removing card access...');
            try {
                await this.runner.deletePrivilege(cardNumber);
                this.ui.hideProgress();
                this.ui.success('Card access removed!');
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`Failed: ${error.message}`);
            }
        }
    }

    async quickTest() {
        this.ui.info('\n🔧 Quick System Test');
        
        const tests = [
            {
                name: 'Controller Connection',
                test: async () => {
                    await this.runner.queryStatus();
                    return 'Connected';
                }
            },
            {
                name: 'Time Sync',
                test: async () => {
                    await this.runner.syncTime();
                    return 'Synchronized';
                }
            },
            {
                name: 'Privilege Count',
                test: async () => {
                    const result = await this.runner.readTotalPrivileges();
                    const count = result.stdout.match(/\d+/)?.[0] || '0';
                    return `${count} privileges`;
                }
            }
        ];

        for (const test of tests) {
            this.ui.showProgress(`Testing ${test.name}...`);
            try {
                const result = await test.test();
                this.ui.hideProgress();
                this.ui.success(`${test.name}: ${result}`);
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`${test.name}: ${error.message}`);
            }
        }
    }

    getTodayString() {
        const today = new Date();
        return today.getFullYear() + 
               String(today.getMonth() + 1).padStart(2, '0') + 
               String(today.getDate()).padStart(2, '0');
    }

    getDateString(daysFromNow) {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.getFullYear() + 
               String(date.getMonth() + 1).padStart(2, '0') + 
               String(date.getDate()).padStart(2, '0');
    }

    formatDoorAccess(privilege) {
        const doors = [];
        if (privilege.door1Enable) doors.push('1');
        if (privilege.door2Enable) doors.push('2');
        if (privilege.door3Enable) doors.push('3');
        if (privilege.door4Enable) doors.push('4');
        return doors.length > 0 ? doors.join(', ') : 'None';
    }
}

module.exports = {
    register: (program) => {
        program
            .command('quick')
            .alias('q')
            .description('Quick access to common controller operations')
            .action(async (options) => {
                const command = new QuickOpsCommand();
                await command.execute(options);
            });
    }
};
