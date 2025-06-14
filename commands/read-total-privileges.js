const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('read-total-privileges <deviceSn> <controllerIp>')
            .description('Read the total number of privileges from the controller')
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

                console.log(`Reading total number of privileges from controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const readTotalPrivilegesPacket = Buffer.alloc(PACKET_LENGTH, 0);
                readTotalPrivilegesPacket.writeUInt8(TYPE_BYTE, 0);
                readTotalPrivilegesPacket.writeUInt8(0x58, 1); // Function ID: Read the total number of Privilege
                readTotalPrivilegesPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number

                try {
                    const response = await sendUdpCommand(socket, readTotalPrivilegesPacket, targetControllerIp, CONTROLLER_PORT, 10000);
                    if (response && response.readUInt8(1) === 0x58) {
                        const totalPrivileges = response.readUInt32LE(8);
                        console.log(`Total Number of Privileges: ${totalPrivileges}`);
                    } else {
                        console.error('Failed to read total privileges or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during reading total privileges:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};