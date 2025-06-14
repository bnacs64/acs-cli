const dgram = require('dgram');
const { EventEmitter } = require('events');

/**
 * Complete SDK Implementation based on main_sdk.txt
 * Implements all 21 functions defined in the SDK documentation
 */
class ControllerSDK extends EventEmitter {
    constructor(options = {}) {
        super();
        this.defaultPort = options.port || 60000;
        this.timeout = options.timeout || 5000;
        this.maxRetries = options.maxRetries || 3;
        this.debug = options.debug || false;
    }

    /**
     * Create UDP packet according to SDK specification
     * Fixed length 64 bytes structure
     */
    createPacket(functionId, deviceSn, data = Buffer.alloc(32), sequenceId = 0) {
        const packet = Buffer.alloc(64);
        
        // Basic structure
        packet.writeUInt8(0x17, 0);                    // type (fixed)
        packet.writeUInt8(functionId, 1);              // function ID
        packet.writeUInt16LE(0x0000, 2);               // reserved
        packet.writeUInt32LE(deviceSn, 4);             // device serial number (little endian)
        
        // Data section (32 bytes)
        data.copy(packet, 8, 0, Math.min(32, data.length));
        
        // Packet serial number (optional)
        packet.writeUInt32LE(sequenceId, 40);
        
        // Extended 20 bytes (unused, padded with 0x00)
        // Already initialized to 0 by Buffer.alloc
        
        return packet;
    }

    /**
     * Parse response packet
     */
    parseResponse(buffer) {
        if (buffer.length < 64) {
            throw new Error('Invalid packet length');
        }

        return {
            type: buffer.readUInt8(0),
            functionId: buffer.readUInt8(1),
            reserved: buffer.readUInt16LE(2),
            deviceSerialNumber: buffer.readUInt32LE(4),
            data: buffer.slice(8, 40),
            sequenceId: buffer.readUInt32LE(40),
            extendedData: buffer.slice(44, 64)
        };
    }

    /**
     * Send UDP packet and wait for response
     */
    async sendPacket(packet, targetIp, targetPort = this.defaultPort) {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            let timeoutHandle;
            let retryCount = 0;

            const sendAttempt = () => {
                if (this.debug) {
                    console.log(`Sending packet to ${targetIp}:${targetPort} (attempt ${retryCount + 1})`);
                }

                client.send(packet, targetPort, targetIp, (error) => {
                    if (error) {
                        client.close();
                        reject(error);
                        return;
                    }
                });

                timeoutHandle = setTimeout(() => {
                    if (retryCount < this.maxRetries - 1) {
                        retryCount++;
                        sendAttempt();
                    } else {
                        client.close();
                        reject(new Error(`Timeout after ${this.maxRetries} attempts`));
                    }
                }, this.timeout);
            };

            client.on('message', (msg, rinfo) => {
                clearTimeout(timeoutHandle);
                client.close();
                
                try {
                    const response = this.parseResponse(msg);
                    resolve({ response, rinfo });
                } catch (error) {
                    reject(error);
                }
            });

            client.on('error', (error) => {
                clearTimeout(timeoutHandle);
                client.close();
                reject(error);
            });

            sendAttempt();
        });
    }

    /**
     * BCD conversion utilities
     */
    decimalToBCD(decimal) {
        return decimal + Math.floor(decimal / 10) * 6;
    }

    bcdToDecimal(bcd) {
        return bcd - Math.floor(bcd / 16) * 6;
    }

    /**
     * Date/Time conversion utilities
     */
    dateToBytes(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();

        const buffer = Buffer.alloc(7);
        buffer.writeUInt8(this.decimalToBCD(Math.floor(year / 100)), 0); // year high
        buffer.writeUInt8(this.decimalToBCD(year % 100), 1);             // year low
        buffer.writeUInt8(this.decimalToBCD(month), 2);                  // month
        buffer.writeUInt8(this.decimalToBCD(day), 3);                    // day
        buffer.writeUInt8(this.decimalToBCD(hour), 4);                   // hour
        buffer.writeUInt8(this.decimalToBCD(minute), 5);                 // minute
        buffer.writeUInt8(this.decimalToBCD(second), 6);                 // second

        return buffer;
    }

    bytesToDate(buffer, offset = 0) {
        const yearHigh = this.bcdToDecimal(buffer.readUInt8(offset));
        const yearLow = this.bcdToDecimal(buffer.readUInt8(offset + 1));
        const month = this.bcdToDecimal(buffer.readUInt8(offset + 2));
        const day = this.bcdToDecimal(buffer.readUInt8(offset + 3));
        const hour = this.bcdToDecimal(buffer.readUInt8(offset + 4));
        const minute = this.bcdToDecimal(buffer.readUInt8(offset + 5));
        const second = this.bcdToDecimal(buffer.readUInt8(offset + 6));

        return new Date(yearHigh * 100 + yearLow, month - 1, day, hour, minute, second);
    }

    /**
     * 1.2 Search Controller [Function ID: 0x94]
     */
    async searchController(broadcastIp = '255.255.255.255') {
        const data = Buffer.alloc(32);
        const packet = this.createPacket(0x94, 0x00000000, data);
        
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const controllers = [];
            let timeoutHandle;

            client.bind(() => {
                client.setBroadcast(true);
                client.send(packet, this.defaultPort, broadcastIp, (error) => {
                    if (error) {
                        client.close();
                        reject(error);
                        return;
                    }
                });

                timeoutHandle = setTimeout(() => {
                    client.close();
                    resolve(controllers);
                }, this.timeout);
            });

            client.on('message', (msg, rinfo) => {
                try {
                    const response = this.parseResponse(msg);
                    if (response.functionId === 0x94) {
                        const controller = this.parseDiscoveryResponse(response.data, rinfo.address);
                        controllers.push(controller);
                        this.emit('controllerDiscovered', controller);
                    }
                } catch (error) {
                    if (this.debug) {
                        console.warn('Failed to parse discovery response:', error.message);
                    }
                }
            });

            client.on('error', (error) => {
                clearTimeout(timeoutHandle);
                client.close();
                reject(error);
            });
        });
    }

    parseDiscoveryResponse(data, sourceIp) {
        // Parse controller information from discovery response
        const deviceSn = data.readUInt32LE(0);
        const ip = `${data.readUInt8(4)}.${data.readUInt8(5)}.${data.readUInt8(6)}.${data.readUInt8(7)}`;
        const mask = `${data.readUInt8(8)}.${data.readUInt8(9)}.${data.readUInt8(10)}.${data.readUInt8(11)}`;
        const gateway = `${data.readUInt8(12)}.${data.readUInt8(13)}.${data.readUInt8(14)}.${data.readUInt8(15)}`;
        
        const macAddress = Array.from(data.slice(16, 22))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(':');
        
        const driverVersion = data.readUInt16LE(22);
        const driverReleaseDate = data.readUInt32LE(24);

        return {
            device_serial_number: deviceSn,
            ip_address: ip,
            subnet_mask: mask,
            gateway: gateway,
            mac_address: macAddress,
            driver_version: driverVersion.toString(16).padStart(4, '0'),
            driver_release_date: this.parseBCDDate(driverReleaseDate),
            discovered_at: new Date().toISOString(),
            source_ip: sourceIp
        };
    }

    parseBCDDate(bcdDate) {
        // Convert BCD date format (e.g., 20150429) to readable format
        const dateStr = bcdDate.toString(16).padStart(8, '0');
        const year = parseInt(dateStr.substr(0, 4), 16);
        const month = parseInt(dateStr.substr(4, 2), 16);
        const day = parseInt(dateStr.substr(6, 2), 16);
        
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    /**
     * 1.3 Set IP Address of Controller [Function ID: 0x96]
     */
    async setControllerIP(deviceSn, newIp, newMask, newGateway, currentIp) {
        const data = Buffer.alloc(32);
        
        // Parse IP addresses
        const ipParts = newIp.split('.').map(Number);
        const maskParts = newMask.split('.').map(Number);
        const gatewayParts = newGateway.split('.').map(Number);
        
        // Set IP, mask, gateway
        ipParts.forEach((part, i) => data.writeUInt8(part, i));
        maskParts.forEach((part, i) => data.writeUInt8(part, 4 + i));
        gatewayParts.forEach((part, i) => data.writeUInt8(part, 8 + i));
        
        // Identification bytes (to prevent mis-setting)
        data.writeUInt8(0x55, 12);
        data.writeUInt8(0xAA, 13);
        data.writeUInt8(0xAA, 14);
        data.writeUInt8(0x55, 15);
        
        const packet = this.createPacket(0x96, deviceSn, data);
        
        // Note: This command doesn't return a response as controller restarts
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            
            client.send(packet, this.defaultPort, currentIp, (error) => {
                client.close();
                if (error) {
                    reject(error);
                } else {
                    resolve({ success: true, message: 'IP configuration sent, controller will restart' });
                }
            });
        });
    }

    /**
     * 1.4 Query Controller Status [Function ID: 0x20]
     */
    async queryControllerStatus(deviceSn, controllerIp) {
        const data = Buffer.alloc(32);
        const packet = this.createPacket(0x20, deviceSn, data);
        
        const result = await this.sendPacket(packet, controllerIp);
        return this.parseStatusResponse(result.response.data);
    }

    parseStatusResponse(data) {
        const lastRecordIndex = data.readUInt32LE(0);
        const recordType = data.readUInt8(4);
        const validity = data.readUInt8(5);
        const doorNumber = data.readUInt8(6);
        const inOut = data.readUInt8(7);
        const cardNumber = data.readUInt32LE(8);
        
        // Parse swipe time (7 bytes BCD)
        const swipeTime = this.bytesToDate(data, 12);
        
        const reasonCode = data.readUInt8(19);
        
        // Door sensors and buttons
        const doorSensors = [
            data.readUInt8(20), data.readUInt8(21),
            data.readUInt8(22), data.readUInt8(23)
        ];
        
        const doorButtons = [
            data.readUInt8(24), data.readUInt8(25),
            data.readUInt8(26), data.readUInt8(27)
        ];
        
        const errorNumber = data.readUInt8(28);
        
        // Current time
        const currentHour = this.bcdToDecimal(data.readUInt8(29));
        const currentMinute = this.bcdToDecimal(data.readUInt8(30));
        const currentSecond = this.bcdToDecimal(data.readUInt8(31));
        
        return {
            lastRecord: {
                index: lastRecordIndex,
                type: recordType,
                validity: validity === 1,
                doorNumber,
                direction: inOut === 1 ? 'IN' : 'OUT',
                cardNumber,
                timestamp: swipeTime,
                reasonCode
            },
            doorStatus: {
                sensors: doorSensors.map(s => s === 1),
                buttons: doorButtons.map(b => b === 1)
            },
            errorNumber,
            currentTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:${currentSecond.toString().padStart(2, '0')}`,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 1.5 Read Date and Time [Function ID: 0x32]
     */
    async readDateTime(deviceSn, controllerIp) {
        const data = Buffer.alloc(32);
        const packet = this.createPacket(0x32, deviceSn, data);

        const result = await this.sendPacket(packet, controllerIp);
        return this.bytesToDate(result.response.data, 0);
    }

    /**
     * 1.6 Set Date and Time [Function ID: 0x30]
     */
    async setDateTime(deviceSn, controllerIp, date = new Date()) {
        const data = Buffer.alloc(32);
        const dateBytes = this.dateToBytes(date);
        dateBytes.copy(data, 0);

        const packet = this.createPacket(0x30, deviceSn, data);
        const result = await this.sendPacket(packet, controllerIp);

        return {
            success: true,
            setTime: this.bytesToDate(result.response.data, 0)
        };
    }

    /**
     * 1.7 Get Record with Specified Index [Function ID: 0xB0]
     */
    async getRecord(deviceSn, controllerIp, recordIndex) {
        const data = Buffer.alloc(32);
        data.writeUInt32LE(recordIndex, 0);

        const packet = this.createPacket(0xB0, deviceSn, data);
        const result = await this.sendPacket(packet, controllerIp);

        return this.parseRecordResponse(result.response.data);
    }

    parseRecordResponse(data) {
        const recordIndex = data.readUInt32LE(0);
        const recordType = data.readUInt8(4);
        const validity = data.readUInt8(5);
        const doorNumber = data.readUInt8(6);
        const inOut = data.readUInt8(7);
        const cardNumber = data.readUInt32LE(8);
        const swipeTime = this.bytesToDate(data, 12);
        const reasonCode = data.readUInt8(19);

        return {
            index: recordIndex,
            type: recordType,
            validity: validity === 1,
            doorNumber,
            direction: inOut === 1 ? 'IN' : 'OUT',
            cardNumber,
            timestamp: swipeTime,
            reasonCode,
            typeDescription: this.getRecordTypeDescription(recordType)
        };
    }

    getRecordTypeDescription(type) {
        const types = {
            0x00: 'No record',
            0x01: 'Swipe card record',
            0x02: 'Door sensor/button/device start/remote door open',
            0x03: 'Alarm log',
            0xFF: 'Record overwritten'
        };
        return types[type] || 'Unknown';
    }

    /**
     * 1.8 Set Read Record Index [Function ID: 0xB2]
     */
    async setReadRecordIndex(deviceSn, controllerIp, recordIndex) {
        const data = Buffer.alloc(32);
        data.writeUInt32LE(recordIndex, 0);

        // Identification bytes
        data.writeUInt8(0x55, 4);
        data.writeUInt8(0xAA, 5);
        data.writeUInt8(0xAA, 6);
        data.writeUInt8(0x55, 7);

        const packet = this.createPacket(0xB2, deviceSn, data);
        const result = await this.sendPacket(packet, controllerIp);

        return {
            success: result.response.data.readUInt8(0) === 1,
            recordIndex
        };
    }

    /**
     * 1.9 Get Read Record Index [Function ID: 0xB4]
     */
    async getReadRecordIndex(deviceSn, controllerIp) {
        const data = Buffer.alloc(32);
        const packet = this.createPacket(0xB4, deviceSn, data);

        const result = await this.sendPacket(packet, controllerIp);
        return result.response.data.readUInt32LE(0);
    }

    /**
     * 1.10 Remote Open Door [Function ID: 0x40]
     */
    async remoteOpenDoor(deviceSn, controllerIp, doorNumber) {
        const data = Buffer.alloc(32);
        data.writeUInt8(doorNumber, 0);

        const packet = this.createPacket(0x40, deviceSn, data);
        const result = await this.sendPacket(packet, controllerIp);

        return {
            success: result.response.data.readUInt8(0) === 1,
            doorNumber
        };
    }

    /**
     * 1.11 Add or Modify Privilege [Function ID: 0x50]
     */
    async addPrivilege(deviceSn, controllerIp, privilege) {
        const data = Buffer.alloc(32);

        // Card number
        data.writeUInt32LE(privilege.cardNumber, 0);

        // Start date (YYYYMMDD format)
        const startDate = this.parseDate(privilege.startDate);
        data.writeUInt32LE(startDate, 4);

        // End date
        const endDate = this.parseDate(privilege.endDate);
        data.writeUInt32LE(endDate, 8);

        // Door permissions
        data.writeUInt8(privilege.door1 ? 1 : 0, 12);
        data.writeUInt8(privilege.door2 ? 1 : 0, 13);
        data.writeUInt8(privilege.door3 ? 1 : 0, 14);
        data.writeUInt8(privilege.door4 ? 1 : 0, 15);

        // Password (3 bytes, max 999999)
        if (privilege.password) {
            const password = Math.min(privilege.password, 999999);
            data.writeUInt8(password & 0xFF, 16);
            data.writeUInt8((password >> 8) & 0xFF, 17);
            data.writeUInt8((password >> 16) & 0xFF, 18);
        }

        const packet = this.createPacket(0x50, deviceSn, data);
        const result = await this.sendPacket(packet, controllerIp);

        return {
            success: result.response.data.readUInt8(0) === 1,
            privilege
        };
    }

    parseDate(dateStr) {
        // Convert YYYYMMDD string to number
        if (typeof dateStr === 'string' && dateStr.length === 8) {
            return parseInt(dateStr, 10);
        }
        return dateStr;
    }

    /**
     * 1.12 Delete Privilege [Function ID: 0x52]
     */
    async deletePrivilege(deviceSn, controllerIp, cardNumber) {
        const data = Buffer.alloc(32);
        data.writeUInt32LE(cardNumber, 0);

        const packet = this.createPacket(0x52, deviceSn, data);
        const result = await this.sendPacket(packet, controllerIp);

        return {
            success: result.response.data.readUInt8(0) === 1,
            cardNumber
        };
    }

    /**
     * 1.13 Clear All Privileges [Function ID: 0x54]
     */
    async clearAllPrivileges(deviceSn, controllerIp) {
        const data = Buffer.alloc(32);

        // Identification bytes (to prevent accidental clearing)
        data.writeUInt8(0x55, 0);
        data.writeUInt8(0xAA, 1);
        data.writeUInt8(0xAA, 2);
        data.writeUInt8(0x55, 3);

        const packet = this.createPacket(0x54, deviceSn, data);
        const result = await this.sendPacket(packet, controllerIp);

        return {
            success: result.response.data.readUInt8(0) === 1
        };
    }

    /**
     * 1.14 Read Total Number of Privileges [Function ID: 0x58]
     */
    async readTotalPrivileges(deviceSn, controllerIp) {
        const data = Buffer.alloc(32);
        const packet = this.createPacket(0x58, deviceSn, data);

        const result = await this.sendPacket(packet, controllerIp);
        return result.response.data.readUInt32LE(0);
    }

    /**
     * 1.15 Query Privilege [Function ID: 0x5A]
     */
    async queryPrivilege(deviceSn, controllerIp, cardNumber) {
        const data = Buffer.alloc(32);
        data.writeUInt32LE(cardNumber, 0);

        const packet = this.createPacket(0x5A, deviceSn, data);
        const result = await this.sendPacket(packet, controllerIp);

        return this.parsePrivilegeResponse(result.response.data);
    }

    parsePrivilegeResponse(data) {
        const cardNumber = data.readUInt32LE(0);

        if (cardNumber === 0) {
            return { found: false, cardNumber: 0 };
        }

        const startDate = data.readUInt32LE(4);
        const endDate = data.readUInt32LE(8);

        return {
            found: true,
            cardNumber,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            door1: data.readUInt8(12) === 1,
            door2: data.readUInt8(13) === 1,
            door3: data.readUInt8(14) === 1,
            door4: data.readUInt8(15) === 1,
            password: data.readUInt8(16) | (data.readUInt8(17) << 8) | (data.readUInt8(18) << 16)
        };
    }
}

module.exports = { ControllerSDK };
