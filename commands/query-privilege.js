const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { bcdToDec } = require('../lib/utils');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('query-privilege <deviceSn> <controllerIp> <cardNumber>')
            .description('Query privilege for a specific card')
            .option('-p, --port <port>', 'Specify the controller port (default: 60000)', parseInt, CONTROLLER_PORT)
            .action(async (deviceSn, controllerIp, cardNumber, options) => {
                let targetDeviceSn = deviceSn;
                let targetControllerIp = controllerIp;

                if (deviceSn === 'selected' && controllerIp === 'selected') {
                    const selectedController = getSelectedController();
                    if (selectedController) {
                        targetDeviceSn = selectedController.device_serial_number;
                        targetControllerIp = selectedController.ip_address;
                        console.log(`Using selected controller: SN=${targetDeviceSn}, IP=${targetControllerIp}`);
                    } else {
                        console.error('No controller selected. Please run `select-controller` first or provide device SN and IP explicitly.');
                        process.exit(1);
                    }
                }

                console.log(`Querying privilege for card ${cardNumber} on controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const queryPrivilegePacket = Buffer.alloc(PACKET_LENGTH, 0);
                queryPrivilegePacket.writeUInt8(TYPE_BYTE, 0);
                queryPrivilegePacket.writeUInt8(0x5A, 1); // Function ID: Query Privilege
                queryPrivilegePacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number
                queryPrivilegePacket.writeUInt32LE(parseInt(cardNumber), 8); // Card number to query

                try {
                    const response = await sendUdpCommand(socket, queryPrivilegePacket, targetControllerIp, CONTROLLER_PORT, 10000);
                    if (response && response.readUInt8(1) === 0x5A) {
                        const returnedCardNumber = response.readUInt32LE(8);
                        if (returnedCardNumber === 0) {
                            console.log(`Card ${cardNumber} not found.`);
                        } else {
                            const startDateYearHigh = bcdToDec(response.readUInt8(12));
                            const startDateYearLow = bcdToDec(response.readUInt8(13));
                            const startDateMonth = bcdToDec(response.readUInt8(14));
                            const startDateDay = bcdToDec(response.readUInt8(15));
                            const startDate = `${startDateYearHigh}${startDateYearLow}-${String(startDateMonth).padStart(2, '0')}-${String(startDateDay).padStart(2, '0')}`;

                            const endDateYearHigh = bcdToDec(response.readUInt8(16));
                            const endDateYearLow = bcdToDec(response.readUInt8(17));
                            const endDateMonth = bcdToDec(response.readUInt8(18));
                            const endDateDay = bcdToDec(response.readUInt8(19));
                            const endDate = `${endDateYearHigh}${endDateYearLow}-${String(endDateMonth).padStart(2, '0')}-${String(endDateDay).padStart(2, '0')}`;

                            const door1Enable = response.readUInt8(20);
                            const door2Enable = response.readUInt8(21);
                            const door3Enable = response.readUInt8(22);
                            const door4Enable = response.readUInt8(23);

                            const passwordBytes = response.readUInt32LE(24) & 0xFFFFFF; // Read 3 bytes as a 4-byte unsigned int, then mask
                            const password = passwordBytes > 0 ? passwordBytes.toString() : 'N/A';

                            console.log('Privilege Information:');
                            console.log(`  Card Number: ${returnedCardNumber}`);
                            console.log(`  Start Date: ${startDate}`);
                            console.log(`  End Date: ${endDate}`);
                            console.log(`  Door 1 Enabled: ${door1Enable}`);
                            console.log(`  Door 2 Enabled: ${door2Enable}`);
                            console.log(`  Door 3 Enabled: ${door3Enable}`);
                            console.log(`  Door 4 Enabled: ${door4Enable}`);
                            console.log(`  Password: ${password}`);
                        }
                    } else {
                        console.error('Failed to query privilege or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during querying privilege:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};