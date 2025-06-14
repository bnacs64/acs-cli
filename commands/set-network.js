const dgram = require('dgram');
const { sendUdpCommand, PACKET_LENGTH, TYPE_BYTE } = require('../lib/udpClient');
const { getSelectedController } = require('./select-controller'); // Import getSelectedController

const CONTROLLER_PORT = 60000;

module.exports = {
    register: (program) => {
        program
            .command('set-network <deviceSn> <controllerIp> <newIp> <newMask> <newGateway>')
            .description('Set network parameters for a specific controller')
            .option('-p, --port <port>', 'Specify the controller port (default: 60000)', parseInt, CONTROLLER_PORT)
            .action(async (deviceSn, controllerIp, newIp, newMask, newGateway, options) => {
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

                console.log(`Setting network for controller SN: ${targetDeviceSn} at IP: ${targetControllerIp}`);
                const socket = dgram.createSocket('udp4');
                // Bind to a random available port, don't bind to the target port
                socket.bind();

                const ipParts = newIp.split('.').map(Number);
                const maskParts = newMask.split('.').map(Number);
                const gatewayParts = newGateway.split('.').map(Number);

                const networkPacket = Buffer.alloc(PACKET_LENGTH, 0);
                networkPacket.writeUInt8(TYPE_BYTE, 0);
                networkPacket.writeUInt8(0x96, 1); // Function ID: Set the IP address of the controller
                networkPacket.writeUInt32LE(parseInt(targetDeviceSn), 4); // Device serial number

                networkPacket.writeUInt8(ipParts[0], 8);
                networkPacket.writeUInt8(ipParts[1], 9);
                networkPacket.writeUInt8(ipParts[2], 10);
                networkPacket.writeUInt8(ipParts[3], 11);

                networkPacket.writeUInt8(maskParts[0], 12);
                networkPacket.writeUInt8(maskParts[1], 13);
                networkPacket.writeUInt8(maskParts[2], 14);
                networkPacket.writeUInt8(maskParts[3], 15);

                networkPacket.writeUInt8(gatewayParts[0], 16);
                networkPacket.writeUInt8(gatewayParts[1], 17);
                networkPacket.writeUInt8(gatewayParts[2], 18);
                networkPacket.writeUInt8(gatewayParts[3], 19);

                networkPacket.writeUInt8(0x55, 20); // Identification bytes
                networkPacket.writeUInt8(0xAA, 21);
                networkPacket.writeUInt8(0xAA, 22);
                networkPacket.writeUInt8(0x55, 23);

                try {
                    // This command does not return a packet, so we just send and assume success
                    // The SDK suggests searching the controller afterwards to verify
                    socket.send(networkPacket, 0, networkPacket.length, options.port, targetControllerIp, (err) => {
                        if (err) {
                            console.error('Error sending network configuration packet:', err);
                        } else {
                            console.log('Network configuration packet sent. Controller will restart. Please re-discover to verify.');
                        }
                        socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                    });
                } catch (error) {
                    console.error('Error during network configuration:', error.message);
                    socket.close();
                    // Ensure the process exits
                    setTimeout(() => process.exit(0), 100);
                }
            });
    }
};