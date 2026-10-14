// Entry for `require('react-native-reanimated/mock')` under jest: the shipped
// mock path is broken in reanimated 4.5.1 (it requires ./src, which is not in
// the package). Same core as the main entry, as its own file to avoid registry
// recursion through expo-router's testing library factory.
module.exports = require('./reanimated-core');
