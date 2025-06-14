const chalk = require('chalk');
const Table = require('cli-table3');
const boxen = require('boxen');
const ora = require('ora');

class StatusDisplay {
    constructor() {
        this.spinner = null;
    }

    showControllerStatus(controller, status) {
        const table = new Table({
            head: [chalk.cyan('Property'), chalk.cyan('Value'), chalk.cyan('Status')],
            colWidths: [20, 25, 15]
        });

        // Controller Info
        table.push(
            ['Serial Number', controller.device_serial_number || 'N/A', this.getStatusIcon(true)],
            ['IP Address', controller.ip_address || 'N/A', this.getNetworkStatusIcon(status.network)],
            ['MAC Address', controller.mac_address || 'N/A', this.getStatusIcon(true)],
            ['Driver Version', controller.driver_version || 'N/A', this.getVersionStatusIcon(controller.driver_version)]
        );

        // System Status
        if (status) {
            table.push(
                [chalk.gray('--- System Status ---'), '', ''],
                ['Online Status', status.online ? 'Online' : 'Offline', this.getStatusIcon(status.online)],
                ['Last Seen', status.lastSeen || 'Never', this.getTimeStatusIcon(status.lastSeen)],
                ['Door 1 Status', status.door1 || 'Unknown', this.getDoorStatusIcon(status.door1)],
                ['Door 2 Status', status.door2 || 'Unknown', this.getDoorStatusIcon(status.door2)],
                ['Door 3 Status', status.door3 || 'Unknown', this.getDoorStatusIcon(status.door3)],
                ['Door 4 Status', status.door4 || 'Unknown', this.getDoorStatusIcon(status.door4)]
            );
        }

        console.log('\n' + table.toString());
    }

    showControllerList(controllers) {
        if (!controllers || controllers.length === 0) {
            console.log(chalk.yellow('No controllers found.'));
            return;
        }

        const table = new Table({
            head: [
                chalk.cyan('#'),
                chalk.cyan('Serial Number'),
                chalk.cyan('IP Address'),
                chalk.cyan('MAC Address'),
                chalk.cyan('Status'),
                chalk.cyan('Last Seen')
            ]
        });

        controllers.forEach((controller, index) => {
            table.push([
                index + 1,
                controller.device_serial_number || 'N/A',
                controller.ip_address || 'N/A',
                controller.mac_address || 'N/A',
                controller.online ? chalk.green('Online') : chalk.red('Offline'),
                controller.last_seen ? this.formatDate(controller.last_seen) : 'Never'
            ]);
        });

        console.log('\n' + table.toString());
    }

    showPrivilegeList(privileges) {
        if (!privileges || privileges.length === 0) {
            console.log(chalk.yellow('No privileges found.'));
            return;
        }

        const table = new Table({
            head: [
                chalk.cyan('Card Number'),
                chalk.cyan('Start Date'),
                chalk.cyan('End Date'),
                chalk.cyan('Doors'),
                chalk.cyan('Status')
            ]
        });

        privileges.forEach(privilege => {
            const doors = [];
            if (privilege.door1) doors.push('1');
            if (privilege.door2) doors.push('2');
            if (privilege.door3) doors.push('3');
            if (privilege.door4) doors.push('4');

            const isActive = this.isPrivilegeActive(privilege);

            table.push([
                privilege.card_number,
                privilege.start_date,
                privilege.end_date,
                doors.join(', ') || 'None',
                isActive ? chalk.green('Active') : chalk.red('Expired')
            ]);
        });

        console.log('\n' + table.toString());
    }

    showDashboard(controllers, selectedController) {
        const content = this.generateDashboardContent(controllers, selectedController);
        
        console.log(boxen(content, {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
            title: '🎛️  Controller Dashboard',
            titleAlignment: 'center'
        }));
    }

    generateDashboardContent(controllers, selectedController) {
        let content = '';

        // Summary Stats
        const totalControllers = controllers.length;
        const onlineControllers = controllers.filter(c => c.online).length;
        const offlineControllers = totalControllers - onlineControllers;

        content += chalk.cyan('📊 System Overview\n');
        content += `Total Controllers: ${chalk.white(totalControllers)}\n`;
        content += `Online: ${chalk.green(onlineControllers)} | Offline: ${chalk.red(offlineControllers)}\n\n`;

        // Selected Controller
        if (selectedController) {
            content += chalk.cyan('🎯 Selected Controller\n');
            content += `SN: ${chalk.white(selectedController.device_serial_number)}\n`;
            content += `IP: ${chalk.white(selectedController.ip_address)}\n`;
            content += `Status: ${selectedController.online ? chalk.green('Online') : chalk.red('Offline')}\n\n`;
        } else {
            content += chalk.yellow('⚠️  No controller selected\n');
            content += 'Use "select-controller" to choose one\n\n';
        }

        // Quick Actions
        content += chalk.cyan('⚡ Quick Actions\n');
        content += '• discover - Find controllers\n';
        content += '• wizard - Interactive setup\n';
        content += '• status - Check system status\n';

        return content;
    }

    startSpinner(text) {
        this.spinner = ora({
            text: text,
            spinner: 'dots',
            color: 'cyan'
        }).start();
    }

    updateSpinner(text) {
        if (this.spinner) {
            this.spinner.text = text;
        }
    }

    stopSpinner(symbol = '✓', text = 'Done') {
        if (this.spinner) {
            this.spinner.succeed(`${symbol} ${text}`);
            this.spinner = null;
        }
    }

    failSpinner(text = 'Failed') {
        if (this.spinner) {
            this.spinner.fail(`✗ ${text}`);
            this.spinner = null;
        }
    }

    getStatusIcon(status) {
        return status ? chalk.green('✓') : chalk.red('✗');
    }

    getNetworkStatusIcon(status) {
        switch (status) {
            case 'connected': return chalk.green('🌐');
            case 'disconnected': return chalk.red('🚫');
            default: return chalk.yellow('❓');
        }
    }

    getDoorStatusIcon(status) {
        switch (status?.toLowerCase()) {
            case 'open': return chalk.green('🔓');
            case 'closed': return chalk.blue('🔒');
            case 'locked': return chalk.red('🔐');
            case 'error': return chalk.red('⚠️');
            default: return chalk.gray('❓');
        }
    }

    getVersionStatusIcon(version) {
        if (!version) return chalk.gray('❓');
        
        const versionNum = parseFloat(version);
        if (versionNum >= 6.56) return chalk.green('✓');
        if (versionNum >= 5.38) return chalk.yellow('⚠️');
        return chalk.red('✗');
    }

    getTimeStatusIcon(lastSeen) {
        if (!lastSeen) return chalk.gray('❓');
        
        const now = new Date();
        const seen = new Date(lastSeen);
        const diffMinutes = (now - seen) / (1000 * 60);
        
        if (diffMinutes < 5) return chalk.green('🟢');
        if (diffMinutes < 30) return chalk.yellow('🟡');
        return chalk.red('🔴');
    }

    isPrivilegeActive(privilege) {
        const now = new Date();
        const start = new Date(privilege.start_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        const end = new Date(privilege.end_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        
        return now >= start && now <= end;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (error) {
            return dateString;
        }
    }

    showProgressBar(current, total, label = 'Progress') {
        const percentage = Math.round((current / total) * 100);
        const barLength = 20;
        const filledLength = Math.round((barLength * current) / total);
        
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        const progressText = `${label}: [${chalk.cyan(bar)}] ${percentage}% (${current}/${total})`;
        
        process.stdout.write(`\r${progressText}`);
        
        if (current === total) {
            console.log(); // New line when complete
        }
    }
}

module.exports = { StatusDisplay };
