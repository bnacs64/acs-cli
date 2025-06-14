const { getControllers, deleteController } = require('../lib/database');
const readline = require('readline');

module.exports = {
    register: (program) => {
        program
            .command('remove-controller')
            .description('Remove a controller from the database')
            .action(async () => {
                console.log('Fetching controllers from database...');
                const controllers = await getControllers();

                if (controllers.length === 0) {
                    console.log('No controllers found in the database.');
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
                    const answer = await new Promise(resolve => rl.question('Select a controller to remove by number: ', resolve));
                    selectedIndex = parseInt(answer);
                    if (selectedIndex > 0 && selectedIndex <= controllers.length) {
                        break;
                    } else {
                        console.log('Invalid selection. Please try again.');
                    }
                }
                rl.close();

                const controllerToRemove = controllers[selectedIndex - 1];
                const confirmAnswer = await new Promise(resolve => {
                    const rlConfirm = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    rlConfirm.question(`Are you sure you want to remove controller SN: ${controllerToRemove.device_serial_number}? (y/N): `, answer => {
                        rlConfirm.close();
                        resolve(answer.toLowerCase());
                    });
                });

                if (confirmAnswer === 'y') {
                    const success = await deleteController(controllerToRemove.device_serial_number);
                    if (success) {
                        console.log(`Controller SN: ${controllerToRemove.device_serial_number} removed successfully.`);
                    } else {
                        console.error(`Failed to remove controller SN: ${controllerToRemove.device_serial_number}.`);
                    }
                } else {
                    console.log('Controller removal cancelled.');
                }
            });
    }
};