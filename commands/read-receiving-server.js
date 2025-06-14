const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('read-receiving-server <deviceSn> <controllerIp>')
            .description('Read the IP and Port of the data receiving server from the controller')
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

                console.log(`Reading receiving server config from controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const readReceivingServerPacket = Buffer.alloc(PACKET_LENGTH, 0);
                readReceivingServerPacket.writeUInt8(TYPE_BYTE, 0);
                readReceivingServerPacket.writeUInt8(0x92, 1); // Function ID: Read the IP and port of the Receiving server
                readReceivingServerPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number

                try {
                    const response = await sendUdpCommand(socket, readReceivingServerPacket, targetControllerIp, options.port);
                    if (response && response.readUInt8(1) === 0x92) {
                        const serverIp = `${response.readUInt8(8)}.${response.readUInt8(9)}.${response.readUInt8(10)}.${response.readUInt8(11)}`;
                        const serverPort = response.readUInt16LE(12);
                        const timedUpload = response.readUInt8(14);
                        console.log(`Receiving Server IP: ${serverIp}, Port: ${serverPort}, Timed Upload Interval: ${timedUpload} seconds`);
                    } else {
                        console.error('Failed to read receiving server configuration or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during reading receiving server configuration:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};