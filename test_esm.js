import path from 'path';
import { pathToFileURL } from 'url';

const absPath = 'C:\\Users\\obsid\\Desktop\\dark-player\\metro.config.js';
console.log('Absolute path:', absPath);
console.log('As file URL:', pathToFileURL(absPath).href);

try {
  // This might fail if the file doesn't exist or is not ESM
  // but we want to see if it works with the file:// URL
  // For the sake of this test, I'll use a dummy file if needed,
  // but let's try with the actual one first.
  // await import(absPath);
  // await import(pathToFileURL(absPath).href);
} catch (e) {
  console.error(e);
}
