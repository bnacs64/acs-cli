const { CommandRunner } = require('../lib/commandRunner');

describe('Wizard Discovery Integration', () => {
    let commandRunner;

    beforeEach(() => {
        commandRunner = new CommandRunner();
    });

    describe('wizard discover integration', () => {
        it('should successfully call discover from wizard context', async () => {
            // Mock the runCommand method to simulate successful discovery
            const mockRunCommand = jest.fn().mockResolvedValue({ 
                success: true, 
                stdout: 'Discovery completed successfully', 
                stderr: '' 
            });
            commandRunner.runCommand = mockRunCommand;

            // Simulate the wizard calling discover with skipPersist: false (default wizard behavior)
            const result = await commandRunner.discover({ skipPersist: false });

            // Verify the command was called correctly
            expect(mockRunCommand).toHaveBeenCalledWith('enhanced-discover', [], { silent: true });
            expect(result.success).toBe(true);
        });

        it('should handle discovery errors gracefully', async () => {
            // Mock the runCommand method to simulate discovery failure
            const mockRunCommand = jest.fn().mockRejectedValue(
                new Error('Command failed with code 1: error: unknown command \'discover\'')
            );
            commandRunner.runCommand = mockRunCommand;

            // Verify that the error is properly propagated
            await expect(commandRunner.discover()).rejects.toThrow('Command failed with code 1');
        });

        it('should call enhanced-discover instead of discover command', async () => {
            const mockRunCommand = jest.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' });
            commandRunner.runCommand = mockRunCommand;

            await commandRunner.discover();

            // Verify it calls 'enhanced-discover' not 'discover'
            expect(mockRunCommand).toHaveBeenCalledWith('enhanced-discover', expect.any(Array), expect.any(Object));
            
            // Verify it does NOT call the old 'discover' command
            expect(mockRunCommand).not.toHaveBeenCalledWith('discover', expect.any(Array), expect.any(Object));
        });
    });
});
