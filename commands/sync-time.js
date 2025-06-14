const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { decToBcd } = require('../lib/utils');
const { getSelectedController } = require('./select-controller');

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('sync-time <deviceSn> <controllerIp>')
            .description('Synchronize controller time with current system time')
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

                console.log(`Synchronizing time for controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const now = new Date();
                const yearHigh = decToBcd(Math.floor(now.getFullYear() / 100));
                const yearLow = decToBcd(now.getFullYear() % 100);
                const month = decToBcd(now.getMonth() + 1);
                const day = decToBcd(now.getDate());
                const hour = decToBcd(now.getHours());
                const minute = decToBcd(now.getMinutes());
                const second = decToBcd(now.getSeconds());

                const timePacket = Buffer.alloc(PACKET_LENGTH, 0);
                timePacket.writeUInt8(TYPE_BYTE, 0);
                timePacket.writeUInt8(0x30, 1); // Function ID: Set date and time
                timePacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number

                timePacket.writeUInt8(yearHigh, 8);
                timePacket.writeUInt8(yearLow, 9);
                timePacket.writeUInt8(month, 10);
                timePacket.writeUInt8(day, 11);
                timePacket.writeUInt8(hour, 12);
                timePacket.writeUInt8(minute, 13);
                timePacket.writeUInt8(second, 14);

                try {
                    const response = await sendUdpCommand(socket, timePacket, targetControllerIp, CONTROLLER_PORT, 10000);
                    if (response && response.readUInt8(8) === 0x01) {
                        console.log('Time synchronization successful.');
                    } else {
                        console.error('Time synchronization failed or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during time synchronization:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};