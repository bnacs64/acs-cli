const dgram = require('dgram');

const PACKET_LENGTH = 64;
const TYPE_BYTE = 0x17;

// Function to send a UDP packet and await response
function sendUdpCommand(socket, commandPacket, remoteAddress, remotePort, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.removeListener('message', onMessage);
            reject(new Error(`Command timeout after ${timeout}ms - No response from ${remoteAddress}:${remotePort}`));
        }, timeout);

        const onMessage = (msg, rinfo) => {
            // Accept responses from the same IP address (port might be different)
            if (rinfo.address === remoteAddress) {
                clearTimeout(timer);
                socket.removeListener('message', onMessage);
                resolve(msg);
            }
        };

        socket.on('message', onMessage);
        socket.send(commandPacket, 0, commandPacket.length, remotePort, remoteAddress, (err) => {
            if (err) {
                clearTimeout(timer);
                socket.removeListener('message', onMessage);
                reject(new Error(`Failed to send UDP packet to ${remoteAddress}:${remotePort} - ${err.message}`));
            }
        });
    });
}

module.exports = {
    sendUdpCommand,
    PACKET_LENGTH,
    TYPE_BYTE
};