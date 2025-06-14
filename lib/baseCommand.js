const { InteractiveUI } = require('../lib/interactiveUI');
const { ConfigManager } = require('../lib/configManager');
const { getControllers } = require('../lib/database');

class BaseCommand {
    constructor() {
        this.ui = new InteractiveUI();
        this.config = new ConfigManager();
    }

    async resolveController(deviceSn, controllerIp, options = {}) {
        // If explicit values provided, use them
        if (deviceSn !== 'selected' && controllerIp !== 'selected') {
            return { deviceSn, controllerIp };
        }

        // Try to use selected controller
        const selected = this.config.getSelectedController();
        if (selected) {
            return {
                deviceSn: selected.device_serial_number,
                controllerIp: selected.ip_address
            };
        }

        // Interactive selection if no controller selected
        if (options.interactive) {
            return await this.interactiveControllerSelection();
        }

        throw new Error('No controller selected. Use "select-controller" or provide explicit values.');
    }

    async interactiveControllerSelection() {
        const controllers = await getControllers();
        
        if (controllers.length === 0) {
            this.ui.error('No controllers found. Run discovery first.');
            return null;
        }

        const choices = controllers.map(controller => ({
            display: `SN: ${controller.device_serial_number} | IP: ${controller.ip_address} | MAC: ${controller.mac_address}`,
            value: {
                deviceSn: controller.device_serial_number,
                controllerIp: controller.ip_address
            }
        }));

        const selection = await this.ui.selectFromList(
            choices,
            'Select a controller:',
            { allowCancel: true }
        );

        if (selection && await this.ui.confirmAction('Save as selected controller for future operations?')) {
            const controller = controllers.find(c => 
                c.device_serial_number === selection.deviceSn && 
                c.ip_address === selection.controllerIp
            );
            this.config.setSelectedController(controller);
        }

        return selection;
    }

    async validateInput(prompt, type, options = {}) {
        const validators = {
            ip: {
                pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                message: 'Please enter a valid IP address (e.g., 192.168.1.100)'
            },
            date: {
                pattern: /^\d{8}$/,
                message: 'Please enter date in YYYYMMDD format (e.g., 20241225)'
            },
            port: {
                type: 'number',
                min: 1,
                max: 65535,
                message: 'Please enter a valid port number (1-65535)'
            },
            cardNumber: {
                type: 'number',
                min: 1,
                max: 4294967295,
                message: 'Please enter a valid card number'
            },
            doorNumber: {
                type: 'number',
                min: 1,
                max: 4,
                message: 'Please enter a door number (1-4)'
            }
        };

        const validator = validators[type];
        if (!validator) {
            return await this.ui.askQuestion(prompt, options);
        }

        return await this.ui.inputWithValidation(prompt, {
            ...validator,
            ...options
        });
    }

    formatOutput(data, format = 'table') {
        switch (format) {
            case 'json':
                console.log(JSON.stringify(data, null, 2));
                break;
            case 'table':
                if (Array.isArray(data) && data.length > 0) {
                    const headers = Object.keys(data[0]);
                    const rows = data.map(item => headers.map(h => item[h] || ''));
                    this.ui.displayTable(rows, headers);
                } else {
                    console.log(data);
                }
                break;
            default:
                console.log(data);
        }
    }

    async handleError(error, context = '') {
        this.ui.error(`${context ? context + ': ' : ''}${error.message}`);
        
        if (this.config.get('verboseMode')) {
            console.error(error.stack);
        }
    }

    cleanup() {
        // Don't close UI in BaseCommand - let the main CLI handle it
        // this.ui.close();
    }

    // Static method to properly cleanup when the application exits
    static cleanup() {
        const { InteractiveUI } = require('./interactiveUI');
        InteractiveUI.closeGlobal();
    }
}

module.exports = { BaseCommand };
