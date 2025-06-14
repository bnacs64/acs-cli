const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { bcdToDec } = require('../lib/utils');
const { getSelectedController } = require('./select-controller');

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('read-time <deviceSn> <controllerIp>')
            .description('Read date and time from a specific controller')
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

                console.log(`Reading time from controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const readTimePacket = Buffer.alloc(PACKET_LENGTH, 0);
                readTimePacket.writeUInt8(TYPE_BYTE, 0);
                readTimePacket.writeUInt8(0x32, 1); // Function ID: Read date and time
                readTimePacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number

                try {
                    const response = await sendUdpCommand(socket, readTimePacket, targetControllerIp, options.port);
                    if (response && response.readUInt8(1) === 0x32) {
                        const yearHigh = bcdToDec(response.readUInt8(8));
                        const yearLow = bcdToDec(response.readUInt8(9));
                        const month = bcdToDec(response.readUInt8(10));
                        const day = bcdToDec(response.readUInt8(11));
                        const hour = bcdToDec(response.readUInt8(12));
                        const minute = bcdToDec(response.readUInt8(13));
                        const second = bcdToDec(response.readUInt8(14));
                        console.log(`Controller Time: ${yearHigh}${yearLow}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`);
                    } else {
                        console.error('Failed to read time or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during time reading:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};