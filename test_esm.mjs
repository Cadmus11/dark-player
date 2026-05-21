import path from 'path';
import { pathToFileURL } from 'url';

const absPath = 'C:\\Users\\obsid\\Desktop\\dark-player\\metro.config.js';
console.log('Absolute path:', absPath);
console.log('As file URL:', pathToFileURL(absPath).href);

try {
  const module = await import(absPath);
  console.log('Successfully imported using absolute path');
} catch (e) {
  console.log('Failed to import using absolute path:');
  console.error(e);
}

try {
  const module2 = await import(pathToFileURL(absPath).href);
  console.log('Successfully imported using file URL');
} catch (e) {
  console.log('Failed to import using file URL:');
  console.error(e);
}
