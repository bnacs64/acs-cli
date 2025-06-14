const { CommandRunner } = require('../lib/commandRunner');

describe('CommandRunner', () => {
    let commandRunner;

    beforeEach(() => {
        commandRunner = new CommandRunner();
    });

    describe('discover method', () => {
        it('should call enhanced-discover command with correct arguments', async () => {
            // Mock the runCommand method to capture the call
            const mockRunCommand = jest.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' });
            commandRunner.runCommand = mockRunCommand;

            // Test basic discover call
            await commandRunner.discover();

            expect(mockRunCommand).toHaveBeenCalledWith('enhanced-discover', [], { silent: true });
        });

        it('should pass broadcast IP option correctly', async () => {
            const mockRunCommand = jest.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' });
            commandRunner.runCommand = mockRunCommand;

            await commandRunner.discover({ broadcastIp: '192.168.1.255' });

            expect(mockRunCommand).toHaveBeenCalledWith(
                'enhanced-discover', 
                ['--broadcast-ip', '192.168.1.255'], 
                { silent: true }
            );
        });

        it('should pass skip persist option correctly', async () => {
            const mockRunCommand = jest.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' });
            commandRunner.runCommand = mockRunCommand;

            await commandRunner.discover({ skipPersist: true });

            expect(mockRunCommand).toHaveBeenCalledWith(
                'enhanced-discover', 
                ['--skip-persist'], 
                { silent: true }
            );
        });

        it('should pass quiet option correctly', async () => {
            const mockRunCommand = jest.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' });
            commandRunner.runCommand = mockRunCommand;

            await commandRunner.discover({ quiet: true });

            expect(mockRunCommand).toHaveBeenCalledWith(
                'enhanced-discover', 
                ['--quiet'], 
                { silent: true }
            );
        });

        it('should pass timeout option correctly', async () => {
            const mockRunCommand = jest.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' });
            commandRunner.runCommand = mockRunCommand;

            await commandRunner.discover({ timeout: '5000' });

            expect(mockRunCommand).toHaveBeenCalledWith(
                'enhanced-discover', 
                ['--timeout', '5000'], 
                { silent: true }
            );
        });

        it('should pass multiple options correctly', async () => {
            const mockRunCommand = jest.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' });
            commandRunner.runCommand = mockRunCommand;

            await commandRunner.discover({ 
                broadcastIp: '192.168.1.255',
                skipPersist: true,
                quiet: true,
                timeout: '5000'
            });

            expect(mockRunCommand).toHaveBeenCalledWith(
                'enhanced-discover', 
                ['--broadcast-ip', '192.168.1.255', '--skip-persist', '--quiet', '--timeout', '5000'], 
                { silent: true }
            );
        });
    });
});
