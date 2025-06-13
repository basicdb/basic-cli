import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';
import { CONSTANTS, COMMANDS } from './constants.js';

const execAsync = promisify(exec);

export function getConfigPath(): string {
  const home = os.homedir();
  return path.join(home, CONSTANTS.CLI_DIR, CONSTANTS.TOKEN_FILE);
}

export function getConfigDir(): string {
  const home = os.homedir();
  return path.join(home, CONSTANTS.CLI_DIR);
}

export async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  
  const commands = {
    darwin: 'open',
    win32: 'start',
    linux: 'xdg-open'
  } as const;
  
  const command = commands[platform as keyof typeof commands];
  
  if (!command) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  try {
    if (platform === 'win32') {
      // Windows requires special handling for URLs
      await execAsync(`${command} "" "${url}"`);
    } else {
      await execAsync(`${command} "${url}"`);
    }
  } catch (error) {
    throw new Error(`Failed to open browser: ${error}`);
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform;
  
  try {
    if (platform === 'darwin') {
      // macOS
      await execAsync(`echo "${text}" | pbcopy`);
    } else if (platform === 'win32') {
      // Windows
      await execAsync(`echo ${text} | clip`);
    } else {
      // Linux - try xclip first, then xsel
      try {
        await execAsync(`echo "${text}" | xclip -selection clipboard`);
      } catch {
        await execAsync(`echo "${text}" | xsel --clipboard --input`);
      }
    }
  } catch (error) {
    throw new Error(`Failed to copy to clipboard: ${error}`);
  }
}

export function isOnline(): Promise<boolean> {
  return fetch(CONSTANTS.API_BASE, { method: 'HEAD' })
    .then(() => true)
    .catch(() => false);
}

export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z-]/g, '');
}

export function generateRandomTeamName(): string {
  // Generate a random number between 1000 and 9999 using crypto
  const array = new Uint16Array(1);
  crypto.getRandomValues(array);
  const randomNum = (array[0] % 9000) + 1000;
  return `team-${randomNum}`;
}

export function similarity(s1: string, s2: string): number {
  const d = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - d / maxLen;
}

function levenshteinDistance(s1: string, s2: string): number {
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [];
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  return matrix[s1.length][s2.length];
}

export function findSimilarCommands(input: string): string[] {
  const commands = COMMANDS.filter(cmd => cmd !== input);
  const suggestions: { command: string; similarity: number }[] = [];

  for (const command of commands) {
    const sim = similarity(input, command);
    if (sim >= CONSTANTS.SIMILARITY_THRESHOLD) {
      suggestions.push({ command, similarity: sim });
    }
  }

  return suggestions
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map(s => s.command);
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
} 