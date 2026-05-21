const path = require('path');
const absPath = 'C:\\Users\\obsid\\Desktop\\dark-player\\metro.config.js';
console.log('Absolute path:', absPath);
try {
  const config = require(absPath);
  console.log('Successfully required using absolute path');
} catch (e) {
  console.log('Failed to require using absolute path:');
  console.error(e);
}
