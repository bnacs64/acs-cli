const { bcdToDec } = require('./utils');

const PACKET_LENGTH = 64;
const TYPE_BYTE = 0x17;

// Function to parse controller discovery response
function parseDiscoveryResponse(msg) {
    if (msg.length !== PACKET_LENGTH || msg.readUInt8(0) !== TYPE_BYTE || msg.readUInt8(1) !== 0x94) {
        return null; // Not a valid discovery response
    }

    const deviceSn = msg.readUInt32LE(4);
    const ipAddress = `${msg.readUInt8(8)}.${msg.readUInt8(9)}.${msg.readUInt8(10)}.${msg.readUInt8(11)}`;
    const subnetMask = `${msg.readUInt8(12)}.${msg.readUInt8(13)}.${msg.readUInt8(14)}.${msg.readUInt8(15)}`;
    const gateway = `${msg.readUInt8(16)}.${msg.readUInt8(17)}.${msg.readUInt8(18)}.${msg.readUInt8(19)}`;
    const macAddress = Array.from({ length: 6 }, (_, i) => msg.readUInt8(20 + i).toString(16).padStart(2, '0')).join(':');
    
    const driverVersionMajor = bcdToDec(msg.readUInt8(26));
    const driverVersionMinor = bcdToDec(msg.readUInt8(27));
    const driverVersion = `${driverVersionMajor}.${driverVersionMinor}`;

    const releaseYear = bcdToDec(msg.readUInt8(28)) * 100 + bcdToDec(msg.readUInt8(29));
    const releaseMonth = bcdToDec(msg.readUInt8(30));
    const releaseDay = bcdToDec(msg.readUInt8(31));
    const driverReleaseDate = `${releaseYear}-${String(releaseMonth).padStart(2, '0')}-${String(releaseDay).padStart(2, '0')}`;

    return {
        device_serial_number: deviceSn,
        ip_address: ipAddress,
        subnet_mask: subnetMask,
        gateway: gateway,
        mac_address: macAddress,
        driver_version: driverVersion,
        driver_release_date: driverReleaseDate
    };
}

module.exports = {
    parseDiscoveryResponse
};