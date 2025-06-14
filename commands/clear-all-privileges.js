const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('clear-all-privileges <deviceSn> <controllerIp>')
            .description('Clear all privileges from the controller')
            .option('-p, --port <port>', 'Specify the controller port (default: 60000)', parseInt, CONTROLLER_PORT)
            .action(async (deviceSn, controllerIp, options) => {
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

                console.log(`Clearing all privileges on controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const clearAllPrivilegesPacket = Buffer.alloc(PACKET_LENGTH, 0);
                clearAllPrivilegesPacket.writeUInt8(TYPE_BYTE, 0);
                clearAllPrivilegesPacket.writeUInt8(0x54, 1); // Function ID: Clear All Privilege
                clearAllPrivilegesPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number
                clearAllPrivilegesPacket.writeUInt8(0x55, 8); // Identification bytes
                clearAllPrivilegesPacket.writeUInt8(0xAA, 9);
                clearAllPrivilegesPacket.writeUInt8(0xAA, 10);
                clearAllPrivilegesPacket.writeUInt8(0x55, 11);

                try {
                    const response = await sendUdpCommand(socket, clearAllPrivilegesPacket, targetControllerIp, options.port);
                    if (response && response.readUInt8(8) === 0x01) {
                        console.log('All privileges cleared successfully.');
                    } else {
                        console.error('Failed to clear all privileges or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during clearing all privileges:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};