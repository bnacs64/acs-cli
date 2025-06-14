const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('set-door-control <deviceSn> <controllerIp> <doorNumber> <controlMethod> <openDelay>')
            .description('Set door control parameters (controlMethod: 1=normally open, 2=normally closed, 3=online; openDelay in seconds)')
            .option('-p, --port <port>', 'Specify the controller port (default: 60000)', parseInt, CONTROLLER_PORT)
            .action(async (deviceSn, controllerIp, doorNumber, controlMethod, openDelay, options) => {
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

                console.log(`Setting door control for door ${doorNumber} on controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const setDoorControlPacket = Buffer.alloc(PACKET_LENGTH, 0);
                setDoorControlPacket.writeUInt8(TYPE_BYTE, 0);
                setDoorControlPacket.writeUInt8(0x80, 1); // Function ID: Set the Parameter of Door Control
                setDoorControlPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number
                setDoorControlPacket.writeUInt8(parseInt(doorNumber), 8); // Door number
                setDoorControlPacket.writeUInt8(parseInt(controlMethod), 9); // Control method
                setDoorControlPacket.writeUInt8(parseInt(openDelay), 10); // Door open delay

                try {
                    const response = await sendUdpCommand(socket, setDoorControlPacket, targetControllerIp, CONTROLLER_PORT, 10000);
                    if (response && response.readUInt8(8) === parseInt(doorNumber)) { // SDK says returns door number if successful
                        console.log('Door control parameters set successfully.');
                    } else {
                        console.error('Failed to set door control parameters or unexpected response.');
                    }
                } catch (error) {
                    console.error('Error during setting door control parameters:', error.message);
                } finally {
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};