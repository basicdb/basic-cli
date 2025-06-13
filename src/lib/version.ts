import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

let cachedVersion: string | null = null;

export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Get the directory of the current module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Try to find package.json in the following locations:
    // 1. Current directory (for development)
    // 2. Parent directory (for global install)
    // 3. Two levels up (for global install in node_modules)
    const possiblePaths = [
      join(__dirname, 'package.json'),
      join(__dirname, '../package.json'),
      join(__dirname, '../../package.json'),
      join(__dirname, '../../../package.json')
    ];

    for (const path of possiblePaths) {
      try {
        const packageJson = JSON.parse(readFileSync(path, 'utf8'));
        if (packageJson.name === '@basictech/cli') {
          cachedVersion = packageJson.version as string;
          return cachedVersion;
        }
      } catch {
        // Continue to next path if this one fails
        continue;
      }
    }

    // If we get here, we couldn't find a valid package.json
    throw new Error('Could not find package.json');
  } catch (error) {
    // Fallback version if nothing else works
    const fallbackVersion = '0.0.31';
    cachedVersion = fallbackVersion;
    return fallbackVersion;
  }
} 