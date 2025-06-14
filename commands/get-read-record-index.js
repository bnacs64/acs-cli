const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('get-read-record-index <deviceSn> <controllerIp>')
            .description('Get the index number of the record that has been read')
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

                console.log(`Getting read record index for controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const getReadRecordIndexPacket = Buffer.alloc(PACKET_LENGTH, 0);
                getReadRecordIndexPacket.writeUInt8(TYPE_BYTE, 0);
                getReadRecordIndexPacket.writeUInt8(0xB4, 1); // Function ID: Get the index number of the record that has been read
                getReadRecordIndexPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number

                try {
                    const response = await sendUdpCommand(socket, getReadRecordIndexPacket, targetControllerIp, options.port);
                    if (response && response.readUInt8(1) === 0xB0) { // Note: SDK says 0xB0 for return packet function ID
                        const readIndex = response.readUInt32LE(8);
                        console.log(`Read Record Index: ${readIndex}`);
                    } else {
                        console.error('Failed to get read record index or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during getting read record index:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};