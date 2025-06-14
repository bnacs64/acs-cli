const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('remote-open-door <deviceSn> <controllerIp> <doorNumber>')
            .description('Remotely open a specific door on the controller (doorNumber 1-4)')
            .option('-p, --port <port>', 'Specify the controller port (default: 60000)', parseInt, CONTROLLER_PORT)
            .action(async (deviceSn, controllerIp, doorNumber, options) => {
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

                console.log(`Attempting to open door ${doorNumber} on controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const openDoorPacket = Buffer.alloc(PACKET_LENGTH, 0);
                openDoorPacket.writeUInt8(TYPE_BYTE, 0);
                openDoorPacket.writeUInt8(0x40, 1); // Function ID: Remote open door
                openDoorPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number
                openDoorPacket.writeUInt8(parseInt(doorNumber), 8); // Door number

                try {
                    const response = await sendUdpCommand(socket, openDoorPacket, targetControllerIp, CONTROLLER_PORT, 10000);
                    if (response && response.readUInt8(8) === 0x01) {
                        console.log(`Door ${doorNumber} opened successfully.`);
                    } else {
                        console.error(`Failed to open door ${doorNumber} or unexpected response.`);
                    }
                } catch (error) {
                    console.error('Error during remote door opening:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};