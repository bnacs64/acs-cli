const readline = require('readline');
const chalk = require('chalk'); // Add chalk dependency for colors

// Singleton readline interface to prevent conflicts
let globalReadlineInterface = null;

class InteractiveUI {
    constructor() {
        // Use singleton pattern to prevent multiple readline interfaces
        if (!globalReadlineInterface) {
            globalReadlineInterface = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
        }
        this.rl = globalReadlineInterface;
    }

    async askQuestion(query, options = {}) {
        const { validate, transform, default: defaultValue } = options;
        
        while (true) {
            const prompt = defaultValue ? `${query} (${defaultValue}): ` : `${query}: `;
            
            try {
                const answer = await new Promise((resolve, reject) => {
                    if (this.rl.closed) {
                        reject(new Error('readline interface is closed'));
                        return;
                    }
                    
                    this.rl.question(prompt, resolve);
                });
                
                const value = answer.trim() || defaultValue;
                
                if (validate && !validate(value)) {
                    console.log(chalk.red('Invalid input. Please try again.'));
                    continue;
                }
                
                return transform ? transform(value) : value;
            } catch (error) {
                if (error.message.includes('readline') || error.message.includes('closed')) {
                    throw new Error('Interactive session ended');
                }
                throw error;
            }
        }
    }

    async selectFromList(items, promptMessage, options = {}) {
        if (items.length === 0) {
            console.log(chalk.yellow('No items available to select.'));
            return null;
        }

        console.log(chalk.cyan(promptMessage));
        items.forEach((item, index) => {
            const prefix = options.numbered !== false ? `${index + 1}. ` : '  - ';
            console.log(`${prefix}${item.display || item}`);
        });

        if (options.allowCancel) {
            console.log(`${items.length + 1}. Cancel`);
        }

        const maxChoice = options.allowCancel ? items.length + 1 : items.length;
        
        const selectedIndex = await this.askQuestion(
            'Enter your choice',
            {
                validate: (input) => {
                    const num = parseInt(input);
                    return num > 0 && num <= maxChoice;
                },
                transform: (input) => parseInt(input)
            }
        );

        if (options.allowCancel && selectedIndex === items.length + 1) {
            return null;
        }

        return items[selectedIndex - 1].value || items[selectedIndex - 1];
    }

    async confirmAction(message, defaultValue = false) {
        const defaultText = defaultValue ? 'Y/n' : 'y/N';
        const answer = await this.askQuestion(`${message} (${defaultText})`);
        
        if (!answer) return defaultValue;
        return answer.toLowerCase().startsWith('y');
    }

    async inputWithValidation(prompt, validators = {}) {
        const { type, min, max, pattern, custom } = validators;
        
        return await this.askQuestion(prompt, {
            validate: (input) => {
                if (type === 'number') {
                    const num = parseFloat(input);
                    if (isNaN(num)) return false;
                    if (min !== undefined && num < min) return false;
                    if (max !== undefined && num > max) return false;
                }
                
                if (type === 'ip') {
                    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                    if (!ipRegex.test(input)) return false;
                }
                
                if (type === 'date') {
                    const dateRegex = /^\d{8}$/;
                    if (!dateRegex.test(input)) return false;
                }
                
                if (pattern && !pattern.test(input)) return false;
                if (custom && !custom(input)) return false;
                
                return true;
            },
            transform: type === 'number' ? parseFloat : undefined
        });
    }

    displayTable(data, headers) {
        console.log(chalk.cyan('\n' + headers.join('\t')));
        console.log(chalk.gray('-'.repeat(headers.join('\t').length)));
        
        data.forEach(row => {
            console.log(row.join('\t'));
        });
        console.log();
    }

    showProgress(message) {
        process.stdout.write(chalk.yellow(`${message}...`));
    }

    hideProgress() {
        process.stdout.write('\r\x1b[K'); // Clear line
    }

    success(message) {
        console.log(chalk.green(`✓ ${message}`));
    }

    error(message) {
        console.log(chalk.red(`✗ ${message}`));
    }

    warning(message) {
        console.log(chalk.yellow(`⚠ ${message}`));
    }

    info(message) {
        console.log(chalk.blue(`ℹ ${message}`));
    }

    close() {
        // Don't close the global interface unless explicitly requested
        // The interface will be closed when the process ends
    }

    // Static method to properly close the global readline interface
    static closeGlobal() {
        if (globalReadlineInterface) {
            globalReadlineInterface.close();
            globalReadlineInterface = null;
        }
    }
}

module.exports = { InteractiveUI };
