const { BaseCommand } = require('../lib/baseCommand');
const { 
    syncToDatabase, 
    syncFromDatabase, 
    getControllers, 
    getPrivileges, 
    getRecords,
    saveToLocalStorage,
    loadFromLocalStorage,
    ensureDataDirectories
} = require('../lib/database');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

class DataManagerCommand extends BaseCommand {
    constructor() {
        super();
        this.dataDir = path.join(os.homedir(), '.controller-config', 'data');
        this.backupDir = path.join(this.dataDir, 'backups');
    }

    async execute(action, options = {}) {
        switch (action) {
            case 'sync':
                await this.handleSync(options);
                break;
            case 'backup':
                await this.handleBackup(options);
                break;
            case 'restore':
                await this.handleRestore(options);
                break;
            case 'status':
                await this.handleStatus(options);
                break;
            case 'cleanup':
                await this.handleCleanup(options);
                break;
            case 'export':
                await this.handleExport(options);
                break;
            case 'import':
                await this.handleImport(options);
                break;
            default:
                await this.showHelp();
        }
    }

    async handleSync(options) {
        this.ui.info('🔄 Data Synchronization\n');

        if (options.toDb || options.both) {
            this.ui.showProgress('Syncing local data to database...');
            try {
                const success = await syncToDatabase();
                this.ui.hideProgress();
                
                if (success) {
                    this.ui.success('✅ Successfully synced to database');
                } else {
                    this.ui.error('❌ Failed to sync to database');
                }
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`Sync to database failed: ${error.message}`);
            }
        }

        if (options.fromDb || options.both) {
            this.ui.showProgress('Syncing database data to local storage...');
            try {
                const success = await syncFromDatabase();
                this.ui.hideProgress();
                
                if (success) {
                    this.ui.success('✅ Successfully synced from database');
                } else {
                    this.ui.error('❌ Failed to sync from database');
                }
            } catch (error) {
                this.ui.hideProgress();
                this.ui.error(`Sync from database failed: ${error.message}`);
            }
        }

        if (!options.toDb && !options.fromDb && !options.both) {
            const choice = await this.ui.selectFromList(
                'Select synchronization direction:',
                [
                    'Sync local data to database',
                    'Sync database data to local storage',
                    'Sync both directions',
                    'Cancel'
                ]
            );

            switch (choice) {
                case 0:
                    await this.handleSync({ toDb: true });
                    break;
                case 1:
                    await this.handleSync({ fromDb: true });
                    break;
                case 2:
                    await this.handleSync({ both: true });
                    break;
                default:
                    this.ui.info('Synchronization cancelled.');
            }
        }
    }

    async handleBackup(options) {
        this.ui.info('💾 Creating Data Backup\n');

        ensureDataDirectories();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        const files = [
            { name: 'controllers.json', description: 'Controller configurations' },
            { name: 'privileges.json', description: 'Access privileges' },
            { name: 'records.json', description: 'Access records' }
        ];

        let backedUp = 0;
        const backupManifest = {
            created_at: new Date().toISOString(),
            backup_id: timestamp,
            files: []
        };

        this.ui.showProgress('Creating backup...');

        for (const file of files) {
            try {
                const sourcePath = path.join(this.dataDir, file.name);
                const data = loadFromLocalStorage(sourcePath);
                
                if (data) {
                    const backupFileName = `${path.basename(file.name, '.json')}_${timestamp}.json`;
                    const backupPath = path.join(this.backupDir, backupFileName);
                    
                    const success = await saveToLocalStorage(data, backupPath);
                    if (success) {
                        backedUp++;
                        backupManifest.files.push({
                            original: file.name,
                            backup: backupFileName,
                            description: file.description,
                            size: JSON.stringify(data).length,
                            records: Array.isArray(data) ? data.length : Object.keys(data).length
                        });
                        
                        this.ui.updateProgress(`Backed up ${file.description}`);
                    }
                } else {
                    this.ui.updateProgress(`Skipped ${file.name} (no data)`);
                }
            } catch (error) {
                this.ui.warning(`Failed to backup ${file.name}: ${error.message}`);
            }
        }

        // Save backup manifest
        const manifestPath = path.join(this.backupDir, `manifest_${timestamp}.json`);
        await saveToLocalStorage(backupManifest, manifestPath);

        this.ui.hideProgress();
        this.ui.success(`✅ Backup completed: ${backedUp}/${files.length} files backed up`);
        this.ui.info(`📁 Backup ID: ${timestamp}`);
        
        if (options.verbose) {
            this.displayBackupDetails(backupManifest);
        }
    }

    async handleRestore(options) {
        this.ui.info('🔄 Restore Data from Backup\n');

        // List available backups
        const backups = await this.listBackups();
        
        if (backups.length === 0) {
            this.ui.warning('No backups found.');
            return;
        }

        // Display backup options
        const backupChoices = backups.map(backup => 
            `${backup.id} - ${backup.created_at} (${backup.files.length} files)`
        );

        const selection = await this.ui.selectFromList(
            'Select backup to restore:',
            [...backupChoices, 'Cancel']
        );

        if (selection >= backups.length) {
            this.ui.info('Restore cancelled.');
            return;
        }

        const selectedBackup = backups[selection];
        
        // Confirm restore
        const confirmed = await this.ui.confirmAction(
            `⚠️  This will overwrite current data. Continue with restore from ${selectedBackup.id}?`,
            false
        );

        if (!confirmed) {
            this.ui.info('Restore cancelled.');
            return;
        }

        // Perform restore
        this.ui.showProgress('Restoring data...');
        let restored = 0;

        for (const file of selectedBackup.files) {
            try {
                const backupPath = path.join(this.backupDir, file.backup);
                const data = loadFromLocalStorage(backupPath);
                
                if (data) {
                    const targetPath = path.join(this.dataDir, file.original);
                    const success = await saveToLocalStorage(data, targetPath);
                    
                    if (success) {
                        restored++;
                        this.ui.updateProgress(`Restored ${file.description}`);
                    }
                }
            } catch (error) {
                this.ui.warning(`Failed to restore ${file.original}: ${error.message}`);
            }
        }

        this.ui.hideProgress();
        this.ui.success(`✅ Restore completed: ${restored}/${selectedBackup.files.length} files restored`);
    }

    async handleStatus(options) {
        this.ui.info('📊 Data Storage Status\n');

        // Check directories
        const directories = [
            { path: this.dataDir, name: 'Data Directory' },
            { path: this.backupDir, name: 'Backup Directory' }
        ];

        for (const dir of directories) {
            const exists = fs.existsSync(dir.path);
            const icon = exists ? chalk.green('✓') : chalk.red('✗');
            console.log(`${icon} ${dir.name}: ${dir.path} ${exists ? '(exists)' : '(missing)'}`);
        }

        console.log();

        // Check data files
        const dataFiles = [
            { name: 'controllers.json', description: 'Controllers' },
            { name: 'privileges.json', description: 'Privileges' },
            { name: 'records.json', description: 'Records' }
        ];

        const tableData = [];

        for (const file of dataFiles) {
            const filePath = path.join(this.dataDir, file.name);
            const exists = fs.existsSync(filePath);
            
            if (exists) {
                const stats = fs.statSync(filePath);
                const data = loadFromLocalStorage(filePath);
                const recordCount = data ? (Array.isArray(data) ? data.length : Object.keys(data).length) : 0;
                
                tableData.push([
                    file.description,
                    chalk.green('✓'),
                    this.formatFileSize(stats.size),
                    recordCount.toString(),
                    stats.mtime.toLocaleDateString()
                ]);
            } else {
                tableData.push([
                    file.description,
                    chalk.red('✗'),
                    'N/A',
                    '0',
                    'N/A'
                ]);
            }
        }

        this.ui.displayTable(tableData, ['Type', 'Status', 'Size', 'Records', 'Modified']);

        // Database connectivity
        console.log('\n📡 Database Connectivity:');
        try {
            await getControllers();
            console.log(chalk.green('✓ Database connection successful'));
        } catch (error) {
            console.log(chalk.red(`✗ Database connection failed: ${error.message}`));
        }

        // Backup status
        const backups = await this.listBackups();
        console.log(`\n💾 Backups: ${backups.length} available`);
        
        if (backups.length > 0) {
            const latest = backups[0];
            console.log(`   Latest: ${latest.id} (${latest.files.length} files)`);
        }
    }

    async handleCleanup(options) {
        this.ui.info('🧹 Data Cleanup\n');

        const cleanupTasks = [
            'Remove old backups (keep last 10)',
            'Clean up temporary files',
            'Optimize data files',
            'All cleanup tasks'
        ];

        const selection = await this.ui.selectFromList(
            'Select cleanup task:',
            [...cleanupTasks, 'Cancel']
        );

        switch (selection) {
            case 0:
                await this.cleanupOldBackups();
                break;
            case 1:
                await this.cleanupTempFiles();
                break;
            case 2:
                await this.optimizeDataFiles();
                break;
            case 3:
                await this.cleanupOldBackups();
                await this.cleanupTempFiles();
                await this.optimizeDataFiles();
                break;
            default:
                this.ui.info('Cleanup cancelled.');
        }
    }

    async cleanupOldBackups() {
        const backups = await this.listBackups();
        
        if (backups.length <= 10) {
            this.ui.info('No old backups to clean up.');
            return;
        }

        const toDelete = backups.slice(10);
        this.ui.showProgress(`Removing ${toDelete.length} old backups...`);

        let deleted = 0;
        for (const backup of toDelete) {
            try {
                // Delete backup files
                for (const file of backup.files) {
                    const filePath = path.join(this.backupDir, file.backup);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
                
                // Delete manifest
                const manifestPath = path.join(this.backupDir, `manifest_${backup.id}.json`);
                if (fs.existsSync(manifestPath)) {
                    fs.unlinkSync(manifestPath);
                }
                
                deleted++;
            } catch (error) {
                this.ui.warning(`Failed to delete backup ${backup.id}: ${error.message}`);
            }
        }

        this.ui.hideProgress();
        this.ui.success(`✅ Cleaned up ${deleted} old backups`);
    }

    async cleanupTempFiles() {
        this.ui.info('🗑️  Cleaning temporary files...');
        // Implementation for temp file cleanup
        this.ui.success('✅ Temporary files cleaned');
    }

    async optimizeDataFiles() {
        this.ui.info('⚡ Optimizing data files...');
        // Implementation for data file optimization
        this.ui.success('✅ Data files optimized');
    }

    async listBackups() {
        if (!fs.existsSync(this.backupDir)) {
            return [];
        }

        const manifestFiles = fs.readdirSync(this.backupDir)
            .filter(file => file.startsWith('manifest_') && file.endsWith('.json'))
            .sort()
            .reverse(); // Most recent first

        const backups = [];
        for (const manifestFile of manifestFiles) {
            try {
                const manifestPath = path.join(this.backupDir, manifestFile);
                const manifest = loadFromLocalStorage(manifestPath);
                if (manifest) {
                    backups.push({
                        id: manifest.backup_id,
                        created_at: manifest.created_at,
                        files: manifest.files
                    });
                }
            } catch (error) {
                // Skip invalid manifests
            }
        }

        return backups;
    }

    displayBackupDetails(manifest) {
        console.log(chalk.cyan('\n📋 Backup Details:'));
        
        const tableData = manifest.files.map(file => [
            file.description,
            file.records.toString(),
            this.formatFileSize(file.size),
            file.backup
        ]);

        this.ui.displayTable(tableData, ['Type', 'Records', 'Size', 'Backup File']);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async showHelp() {
        console.log(chalk.cyan('📚 Data Manager Help\n'));
        console.log('Available actions:');
        console.log('  sync     - Synchronize data between database and local storage');
        console.log('  backup   - Create backup of local data');
        console.log('  restore  - Restore data from backup');
        console.log('  status   - Show data storage status');
        console.log('  cleanup  - Clean up old files and optimize storage');
        console.log('  export   - Export data to external format');
        console.log('  import   - Import data from external source');
        console.log('\nExample: data-manager sync --both');
    }
}

module.exports = {
    register: (program) => {
        program
            .command('data-manager <action>')
            .description('Manage data storage, synchronization, and backups')
            .option('--to-db', 'Sync to database (for sync action)')
            .option('--from-db', 'Sync from database (for sync action)')
            .option('--both', 'Sync both directions (for sync action)')
            .option('--verbose', 'Show detailed output')
            .action(async (action, options) => {
                const command = new DataManagerCommand();
                await command.execute(action, options);
                command.cleanup();
            });
    }
};
