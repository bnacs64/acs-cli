const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('read-door-control <deviceSn> <controllerIp> <doorNumber>')
            .description('Read door control parameters from a specific door')
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

                console.log(`Reading door control for door ${doorNumber} on controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const readDoorControlPacket = Buffer.alloc(PACKET_LENGTH, 0);
                readDoorControlPacket.writeUInt8(TYPE_BYTE, 0);
                readDoorControlPacket.writeUInt8(0x82, 1); // Function ID: Read the Parameter of Door Control
                readDoorControlPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number
                readDoorControlPacket.writeUInt8(parseInt(doorNumber), 8); // Door number

                try {
                    const response = await sendUdpCommand(socket, readDoorControlPacket, targetControllerIp, options.port);
                    if (response && response.readUInt8(1) === 0x82) {
                        const returnedDoorNumber = response.readUInt8(8);
                        const controlMethod = response.readUInt8(9);
                        const openDelay = response.readUInt8(10);
                        console.log('Door Control Parameters:');
                        console.log(`  Door Number: ${returnedDoorNumber}`);
                        console.log(`  Control Method: ${controlMethod} (1=normally open, 2=normally closed, 3=online)`);
                        console.log(`  Open Delay: ${openDelay} seconds`);
                    } else {
                        console.error('Failed to read door control parameters or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during reading door control parameters:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};