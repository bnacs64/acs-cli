// Jest setup file for controller configurator tests

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  // Uncomment the next line to silence console.log during tests
  // log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.OFFLINE_MODE = 'true';

// Mock external dependencies that might not be available in test environment
jest.mock('figlet', () => ({
  textSync: jest.fn(() => 'Mocked ASCII Art')
}));

// Global test timeout
jest.setTimeout(10000);
