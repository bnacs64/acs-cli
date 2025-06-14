const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { bcdToDec } = require('../lib/utils');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('query-status <deviceSn> <controllerIp>')
            .description('Query the real-time status of a controller')
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

                console.log(`Querying status for controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const queryStatusPacket = Buffer.alloc(PACKET_LENGTH, 0);
                queryStatusPacket.writeUInt8(TYPE_BYTE, 0);
                queryStatusPacket.writeUInt8(0x20, 1); // Function ID: Query the Status of the controller
                queryStatusPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number

                try {
                    const response = await sendUdpCommand(socket, queryStatusPacket, targetControllerIp, CONTROLLER_PORT, 10000);
                    if (response && response.readUInt8(1) === 0x20) {
                        const lastRecordIndex = response.readUInt32LE(8);
                        const recorderType = response.readUInt8(12);
                        const validity = response.readUInt8(13);
                        const doorNo = response.readUInt8(14);
                        const inOut = response.readUInt8(15);
                        const cardNumber = response.readUInt32LE(16);
                        
                        const swipeYear = bcdToDec(response.readUInt8(20)) * 100 + bcdToDec(response.readUInt8(21));
                        const swipeMonth = bcdToDec(response.readUInt8(22));
                        const swipeDay = bcdToDec(response.readUInt8(23));
                        const swipeHour = bcdToDec(response.readUInt8(24));
                        const swipeMinute = bcdToDec(response.readUInt8(25));
                        const swipeSecond = bcdToDec(response.readUInt8(26));
                        const swipeTime = `${swipeYear}-${String(swipeMonth).padStart(2, '0')}-${String(swipeDay).padStart(2, '0')} ${String(swipeHour).padStart(2, '0')}:${String(swipeMinute).padStart(2, '0')}:${String(swipeSecond).padStart(2, '0')}`;

                        const controllerHour = bcdToDec(response.readUInt8(37));
                        const controllerMinute = bcdToDec(response.readUInt8(38));
                        const controllerSecond = bcdToDec(response.readUInt8(39));
                        const controllerTime = `${String(controllerHour).padStart(2, '0')}:${String(controllerMinute).padStart(2, '0')}:${String(controllerSecond).padStart(2, '0')}`;

                        console.log('Controller Status:');
                        console.log(`  Last Record Index: ${lastRecordIndex}`);
                        console.log(`  Recorder Type: ${recorderType}`);
                        console.log(`  Validity: ${validity}`);
                        console.log(`  Door No: ${doorNo}`);
                        console.log(`  IN/OUT: ${inOut}`);
                        console.log(`  Card Number: ${cardNumber}`);
                        console.log(`  Last Swipe Time: ${swipeTime}`);
                        console.log(`  Controller Current Time: ${controllerTime}`);
                        // Add more fields as needed from the SDK documentation
                    } else {
                        console.error('Failed to query status or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during status query:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};