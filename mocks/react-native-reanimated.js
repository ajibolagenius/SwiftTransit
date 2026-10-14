// Entry for `import ... from 'react-native-reanimated'` under jest (see
// package.json moduleNameMapper). Kept separate from mocks/reanimated-mock.js
// because expo-router's testing library mocks the main specifier and requires
// the /mock subpath inside that factory; mapping both to one file recurses.
module.exports = require('./reanimated-core');
