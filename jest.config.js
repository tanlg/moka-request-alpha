// jest 搜索目录，默认为 ["<rootDir>"]
module.exports = {
  roots: ['<rootDir>/__test__'],
  moduleFileExtensions: ['jsx', 'js', 'ts', 'tsx'],
  testMatch: ['**/**/__test__/**/*.test.js?(x)'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.(t|j)s$': 'babel-jest',
  },
  coverageDirectory: '<rootDir>/__test__/coverage',
};
