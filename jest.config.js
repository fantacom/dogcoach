/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/supabase/functions/_shared/logic/$1',
  },
  testPathIgnorePatterns: ['/node_modules/'],
  roots: ['<rootDir>/src', '<rootDir>/supabase/functions/_shared'],
};
