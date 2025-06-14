const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('set-receiving-server <deviceSn> <controllerIp> <serverIp> <serverPort> [timedUploadInterval]')
            .description('Set the IP and Port of the data receiving server on the controller')
            .option('-p, --port <port>', 'Specify the controller port (default: 60000)', parseInt, CONTROLLER_PORT)
            .action(async (deviceSn, controllerIp, serverIp, serverPort, timedUploadInterval, options) => {
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

                console.log(`Setting receiving server for controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const serverIpParts = serverIp.split('.').map(Number);
                const port = parseInt(serverPort);

                const receivingServerPacket = Buffer.alloc(PACKET_LENGTH, 0);
                receivingServerPacket.writeUInt8(TYPE_BYTE, 0);
                receivingServerPacket.writeUInt8(0x90, 1); // Function ID: Set the IP and Port of the Receiving Server
                receivingServerPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number

                receivingServerPacket.writeUInt8(serverIpParts[0], 8);
                receivingServerPacket.writeUInt8(serverIpParts[1], 9);
                receivingServerPacket.writeUInt8(serverIpParts[2], 10);
                receivingServerPacket.writeUInt8(serverIpParts[3], 11);

                receivingServerPacket.writeUInt16LE(port, 12); // Port (low byte first)
                receivingServerPacket.writeUInt8(parseInt(timedUploadInterval), 14); // Timed upload interval

                try {
                    const response = await sendUdpCommand(socket, receivingServerPacket, targetControllerIp, options.port);
                    if (response && response.readUInt8(8) === 0x01) {
                        console.log('Receiving server configuration successful.');
                    } else {
                        console.error('Receiving server configuration failed or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during receiving server configuration:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};