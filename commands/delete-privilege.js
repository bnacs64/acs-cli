const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('delete-privilege <deviceSn> <controllerIp> <cardNumber>')
            .description('Delete privilege for a specific card')
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

                console.log(`Deleting privilege for card ${cardNumber} on controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const deletePrivilegePacket = Buffer.alloc(PACKET_LENGTH, 0);
                deletePrivilegePacket.writeUInt8(TYPE_BYTE, 0);
                deletePrivilegePacket.writeUInt8(0x52, 1); // Function ID: Del Privilege (single deletion)
                deletePrivilegePacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number
                deletePrivilegePacket.writeUInt32LE(parseInt(cardNumber), 8); // Card number to delete

                try {
                    const response = await sendUdpCommand(socket, deletePrivilegePacket, targetControllerIp, CONTROLLER_PORT, 10000);
                    if (response && response.readUInt8(8) === 0x01) {
                        console.log('Privilege deleted successfully.');
                    } else {
                        console.error('Failed to delete privilege or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during deleting privilege:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};