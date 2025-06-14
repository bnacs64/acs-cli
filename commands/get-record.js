const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { bcdToDec } = require('../lib/utils');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('get-record <deviceSn> <controllerIp> <indexNumber>')
            .description('Get the record with the specified index number (0 for oldest, 0xffffffff for latest)')
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

                console.log(`Getting record ${indexNumber} from controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const getRecordPacket = Buffer.alloc(PACKET_LENGTH, 0);
                getRecordPacket.writeUInt8(TYPE_BYTE, 0);
                getRecordPacket.writeUInt8(0xB0, 1); // Function ID: Get the record with the specified index number
                getRecordPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number
                getRecordPacket.writeUInt32LE(parseInt(indexNumber), 8); // Record index number

                try {
                    const response = await sendUdpCommand(socket, getRecordPacket, targetControllerIp, CONTROLLER_PORT, 10000);
                    if (response && response.readUInt8(1) === 0xB0) {
                        const recordIndex = response.readUInt32LE(8);
                        const recordType = response.readUInt8(12);
                        const validity = response.readUInt8(13);
                        const doorNumber = response.readUInt8(14);
                        const inOut = response.readUInt8(15);
                        const cardNumber = response.readUInt32LE(16);
                        
                        const swipeYear = bcdToDec(response.readUInt8(20)) * 100 + bcdToDec(response.readUInt8(21));
                        const swipeMonth = bcdToDec(response.readUInt8(22));
                        const swipeDay = bcdToDec(response.readUInt8(23));
                        const swipeHour = bcdToDec(response.readUInt8(24));
                        const swipeMinute = bcdToDec(response.readUInt8(25));
                        const swipeSecond = bcdToDec(response.readUInt8(26));
                        const swipeTime = `${swipeYear}-${String(swipeMonth).padStart(2, '0')}-${String(swipeDay).padStart(2, '0')} ${String(swipeHour).padStart(2, '0')}:${String(swipeMinute).padStart(2, '0')}:${String(swipeSecond).padStart(2, '0')}`;
                        const reasonCode = response.readUInt8(27);

                        console.log('Record Information:');
                        console.log(`  Record Index: ${recordIndex}`);
                        console.log(`  Record Type: ${recordType}`);
                        console.log(`  Validity: ${validity}`);
                        console.log(`  Door Number: ${doorNumber}`);
                        console.log(`  IN/OUT: ${inOut}`);
                        console.log(`  Card Number: ${cardNumber}`);
                        console.log(`  Swipe Time: ${swipeTime}`);
                        console.log(`  Reason Code: ${reasonCode}`);
                    } else {
                        console.error('Failed to get record or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during getting record:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};