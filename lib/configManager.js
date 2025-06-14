const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
    constructor() {
        this.configDir = path.join(os.homedir(), '.controller-config');
        this.configFile = path.join(this.configDir, 'config.json');
        this.selectedControllerFile = path.join(this.configDir, 'selected-controller.json');
        this.presetsFile = path.join(this.configDir, 'presets.json');
        
        this.ensureConfigDir();
        this.config = this.loadConfig();
    }

    ensureConfigDir() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    loadConfig() {
        const defaultConfig = {
            defaultPort: 60000,
            timeout: 5000,
            maxRetries: 3,
            colorOutput: true,
            verboseMode: false,
            autoSave: true,
            networkInterfaces: {
                preferred: null,
                exclude: ['lo', 'docker']
            },
            discovery: {
                timeout: 3000,
                autoPersist: true
            }
        };

        try {
            if (fs.existsSync(this.configFile)) {
                const userConfig = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
                return { ...defaultConfig, ...userConfig };
            }
        } catch (error) {
            console.error('Error loading config:', error.message);
        }

        return defaultConfig;
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Error saving config:', error.message);
        }
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
    }

    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => {
            if (!obj[k]) obj[k] = {};
            return obj[k];
        }, this.config);
        
        target[lastKey] = value;
        
        if (this.config.autoSave) {
            this.saveConfig();
        }
    }

    // Selected Controller Management
    setSelectedController(controller) {
        try {
            fs.writeFileSync(this.selectedControllerFile, JSON.stringify(controller, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving selected controller:', error.message);
            return false;
        }
    }

    getSelectedController() {
        try {
            if (fs.existsSync(this.selectedControllerFile)) {
                return JSON.parse(fs.readFileSync(this.selectedControllerFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading selected controller:', error.message);
        }
        return null;
    }

    clearSelectedController() {
        try {
            if (fs.existsSync(this.selectedControllerFile)) {
                fs.unlinkSync(this.selectedControllerFile);
            }
            return true;
        } catch (error) {
            console.error('Error clearing selected controller:', error.message);
            return false;
        }
    }

    // Presets Management
    savePreset(name, data) {
        const presets = this.loadPresets();
        presets[name] = {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        try {
            fs.writeFileSync(this.presetsFile, JSON.stringify(presets, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving preset:', error.message);
            return false;
        }
    }

    loadPresets() {
        try {
            if (fs.existsSync(this.presetsFile)) {
                return JSON.parse(fs.readFileSync(this.presetsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading presets:', error.message);
        }
        return {};
    }

    getPreset(name) {
        const presets = this.loadPresets();
        return presets[name] || null;
    }

    listPresets() {
        return Object.keys(this.loadPresets());
    }

    deletePreset(name) {
        const presets = this.loadPresets();
        if (presets[name]) {
            delete presets[name];
            try {
                fs.writeFileSync(this.presetsFile, JSON.stringify(presets, null, 2));
                return true;
            } catch (error) {
                console.error('Error deleting preset:', error.message);
            }
        }
        return false;
    }
}

module.exports = { ConfigManager };
