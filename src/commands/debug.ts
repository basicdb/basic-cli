import { getConfigDir } from '../lib/platform';

export async function DebugCommand(): Promise<void> {
  const configDir = getConfigDir();
  console.log(`Basic CLI config directory: ${configDir}`);
} 