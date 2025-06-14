const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('set-read-record-index <deviceSn> <controllerIp> <indexNumber>')
            .description('Set the index number of the record that has been read')
            .option('-p, --port <port>', 'Specify the controller port (default: 60000)', parseInt, CONTROLLER_PORT)
            .action(async (deviceSn, controllerIp, indexNumber, options) => {
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

                console.log(`Setting read record index to ${indexNumber} for controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const setRecordIndexPacket = Buffer.alloc(PACKET_LENGTH, 0);
                setRecordIndexPacket.writeUInt8(TYPE_BYTE, 0);
                setRecordIndexPacket.writeUInt8(0xB2, 1); // Function ID: Set the index number of the record that has been read
                setRecordIndexPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number
                setRecordIndexPacket.writeUInt32LE(parseInt(indexNumber), 8); // Record index number
                setRecordIndexPacket.writeUInt8(0x55, 12); // Identification bytes
                setRecordIndexPacket.writeUInt8(0xAA, 13);
                setRecordIndexPacket.writeUInt8(0xAA, 14);
                setRecordIndexPacket.writeUInt8(0x55, 15);

                try {
                    const response = await sendUdpCommand(socket, setRecordIndexPacket, targetControllerIp, options.port);
                    if (response && response.readUInt8(8) === 0x01) {
                        console.log('Set read record index successful.');
                    } else {
                        console.error('Set read record index failed or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during setting read record index:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};