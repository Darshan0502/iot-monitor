import nextJest from 'next/jest.js';

// next/jest compiles the tests with the same SWC setup as the app, so there is no separate TypeScript transform to configure.
const createJestConfig = nextJest({ dir: './' });

export default createJestConfig({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
});
