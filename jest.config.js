module.exports = {
  preset: 'ts-jest/presets/default',
  testEnvironment: 'jsdom',
  testRegex: '/test/.*\\.(test|spec)?\\.(ts|tsx)$',
  setupFiles: [
  ],
  coverageDirectory: './test/report/',
  globals: {
    'ts-jest': {
        diagnostics: false
    }
  }
};