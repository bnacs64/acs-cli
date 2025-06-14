const { spawn } = require('child_process');
const path = require('path');

class CommandRunner {
    constructor(cliPath = './cli-unified.js') {
        this.cliPath = cliPath;
    }

    async runCommand(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const timeout = options.timeout || 30000; // Default 30 second timeout
            let timeoutId;
            
            const childProcess = spawn('node', [this.cliPath, command, ...args], {
                stdio: options.silent ? 'pipe' : 'inherit',
                cwd: process.cwd()
            });

            let stdout = '';
            let stderr = '';

            // Set up timeout
            timeoutId = setTimeout(() => {
                childProcess.kill('SIGTERM');
                reject(new Error(`Command '${command}' timed out after ${timeout}ms`));
            }, timeout);

            if (options.silent) {
                childProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                childProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            childProcess.on('close', (code) => {
                clearTimeout(timeoutId);
                if (code === 0) {
                    resolve({ success: true, stdout, stderr });
                } else {
                    reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
                }
            });

            childProcess.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }

    async discover(options = {}) {
        const args = [];
        if (options.broadcastIp) args.push('--broadcast-ip', options.broadcastIp);
        if (options.skipPersist) args.push('--skip-persist');
        if (options.quiet) args.push('--quiet');
        if (options.timeout) args.push('--timeout', options.timeout);

        return this.runCommand('enhanced-discover', args, { silent: true });
    }

    async syncTime(deviceSn = 'selected', controllerIp = 'selected', options = {}) {
        const args = [deviceSn, controllerIp];
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('sync-time', args, { silent: true });
    }

    async addPrivilege(privilege, options = {}) {
        const args = [
            privilege.deviceSn || 'selected',
            privilege.controllerIp || 'selected',
            privilege.cardNumber,
            privilege.startDate,
            privilege.endDate,
            privilege.door1Enable ? '1' : '0',
            privilege.door2Enable ? '1' : '0',
            privilege.door3Enable ? '1' : '0',
            privilege.door4Enable ? '1' : '0'
        ];
        
        if (privilege.password) {
            args.push(privilege.password);
        }
        
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('add-privilege', args, { silent: true });
    }

    async queryStatus(deviceSn = 'selected', controllerIp = 'selected', options = {}) {
        const args = [deviceSn, controllerIp];
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('query-status', args, { silent: true, timeout: options.timeout });
    }

    async readTotalPrivileges(deviceSn = 'selected', controllerIp = 'selected', options = {}) {
        const args = [deviceSn, controllerIp];
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('read-total-privileges', args, { silent: true });
    }

    async setDoorControl(doorConfig, options = {}) {
        const args = [
            doorConfig.deviceSn || 'selected',
            doorConfig.controllerIp || 'selected',
            doorConfig.doorNumber,
            doorConfig.controlMethod,
            doorConfig.openDelay
        ];
        
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('set-door-control', args, { silent: true });
    }

    async remoteOpenDoor(deviceSn = 'selected', controllerIp = 'selected', doorNumber, options = {}) {
        const args = [deviceSn, controllerIp, doorNumber];
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('remote-open-door', args, { silent: true });
    }

    async getRecord(deviceSn = 'selected', controllerIp = 'selected', indexNumber = '0xffffffff', options = {}) {
        const args = [deviceSn, controllerIp, indexNumber];
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('get-record', args, { silent: true });
    }

    async queryPrivilege(cardNumber, deviceSn = 'selected', controllerIp = 'selected', options = {}) {
        const args = [deviceSn, controllerIp, cardNumber.toString()];
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('query-privilege', args, { silent: true });
    }

    async deletePrivilege(cardNumber, deviceSn = 'selected', controllerIp = 'selected', options = {}) {
        const args = [deviceSn, controllerIp, cardNumber.toString()];
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('delete-privilege', args, { silent: true });
    }

    async clearAllPrivileges(deviceSn = 'selected', controllerIp = 'selected', options = {}) {
        const args = [deviceSn, controllerIp];
        if (options.port) args.push('-p', options.port);
        
        return this.runCommand('clear-all-privileges', args, { silent: true });
    }
}

module.exports = { CommandRunner };
