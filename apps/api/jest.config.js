/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@healthcare/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@healthcare/validation$': '<rootDir>/../../packages/validation/src/index.ts',
    '^@healthcare/config$': '<rootDir>/../../packages/config/src/index.ts',
  },
};
