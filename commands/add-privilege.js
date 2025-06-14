const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { decToBcd } = require('../lib/utils');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('add-privilege <deviceSn> <controllerIp> <cardNumber> <startDate> <endDate> <door1Enable> <door2Enable> <door3Enable> <door4Enable> [password]')
            .description('Add or modify privilege for a card (startDate/endDate format YYYYMMDD, doorXEnable 0 or 1, password optional)')
            .option('-p, --port <port>', 'Specify the controller port (default: 60000)', parseInt, CONTROLLER_PORT)
            .action(async (deviceSn, controllerIp, cardNumber, startDate, endDate, door1Enable, door2Enable, door3Enable, door4Enable, password, options) => {
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

                console.log(`Adding/modifying privilege for card ${cardNumber} on controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const addPrivilegePacket = Buffer.alloc(PACKET_LENGTH, 0);
                addPrivilegePacket.writeUInt8(TYPE_BYTE, 0);
                addPrivilegePacket.writeUInt8(0x50, 1); // Function ID: Add or modify Privilege
                addPrivilegePacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number
                addPrivilegePacket.writeUInt32LE(parseInt(cardNumber), 8); // Card number

                // Start Date (YYYYMMDD)
                addPrivilegePacket.writeUInt8(decToBcd(parseInt(startDate.substring(0, 2))), 12); // Year High
                addPrivilegePacket.writeUInt8(decToBcd(parseInt(startDate.substring(2, 4))), 13); // Year Low
                addPrivilegePacket.writeUInt8(decToBcd(parseInt(startDate.substring(4, 6))), 14); // Month
                addPrivilegePacket.writeUInt8(decToBcd(parseInt(startDate.substring(6, 8))), 15); // Day

                // End Date (YYYYMMDD)
                addPrivilegePacket.writeUInt8(decToBcd(parseInt(endDate.substring(0, 2))), 16); // Year High
                addPrivilegePacket.writeUInt8(decToBcd(parseInt(endDate.substring(2, 4))), 17); // Year Low
                addPrivilegePacket.writeUInt8(decToBcd(parseInt(endDate.substring(4, 6))), 18); // Month
                addPrivilegePacket.writeUInt8(decToBcd(parseInt(endDate.substring(6, 8))), 19); // Day

                addPrivilegePacket.writeUInt8(parseInt(door1Enable), 20);
                addPrivilegePacket.writeUInt8(parseInt(door2Enable), 21);
                addPrivilegePacket.writeUInt8(parseInt(door3Enable), 22);
                addPrivilegePacket.writeUInt8(parseInt(door4Enable), 23);

                // Password (up to 6 digits, stored in 3 bytes)
                const pwd = parseInt(password);
                if (pwd > 0) {
                    addPrivilegePacket.writeUInt8(pwd & 0xFF, 24);
                    addPrivilegePacket.writeUInt8((pwd >> 8) & 0xFF, 25);
                    addPrivilegePacket.writeUInt8((pwd >> 16) & 0xFF, 26);
                }

                try {
                    const response = await sendUdpCommand(socket, addPrivilegePacket, targetControllerIp, CONTROLLER_PORT, 10000);
                    if (response && response.readUInt8(8) === 0x01) {
                        console.log('Privilege added/modified successfully.');
                    } else {
                        console.error('Failed to add/modify privilege or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during adding/modifying privilege:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};