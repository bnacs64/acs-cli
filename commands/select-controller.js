const { getControllers } = require('../lib/database');
const { ConfigManager } = require('../lib/configManager');
const readline = require('readline');

module.exports = {
    register: (program) => {
        program
            .command('select-controller')
            .description('Select a controller from the database for subsequent operations')
            .action(async () => {
                console.log('Fetching controllers from database...');
                const controllers = await getControllers();

                if (controllers.length === 0) {
                    console.log('No controllers found in the database. Please run `discover` first.');
                    return;
                }

                console.log('Available controllers:');
                controllers.forEach((controller, index) => {
                    console.log(`${index + 1}. SN: ${controller.device_serial_number}, IP: ${controller.ip_address}`);
                });

                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                let selectedIndex;
                while (true) {
                    const answer = await new Promise(resolve => rl.question('Select a controller by number: ', resolve));
                    selectedIndex = parseInt(answer);
                    if (selectedIndex > 0 && selectedIndex <= controllers.length) {
                        break;
                    } else {
                        console.log('Invalid selection. Please try again.');
                    }
                }
                rl.close();

                const selectedController = controllers[selectedIndex - 1];
                const config = new ConfigManager();
                const success = config.setSelectedController(selectedController);
                
                if (success) {
                    console.log(`Controller SN: ${selectedController.device_serial_number} selected and saved for future operations.`);
                    console.log(`You can now use commands like 'sync-time' without explicitly providing SN and IP, by using 'selected' as deviceSn and controllerIp.`);
                } else {
                    console.error('Error saving selected controller.');
                }
            });
    },
    getSelectedController: () => {
        const config = new ConfigManager();
        return config.getSelectedController();
    }
};