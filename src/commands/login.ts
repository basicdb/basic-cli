import { AuthService } from '../lib/auth';
import { isOnline } from '../lib/platform';
import { MESSAGES } from '../lib/constants';

export async function LoginCommand(): Promise<void> {
  // Check if online
  if (!(await isOnline())) {
    throw new Error(MESSAGES.OFFLINE);
  }

  const authService = AuthService.getInstance();
  
  // Check if already logged in
  const existingToken = await authService.getToken();
  if (existingToken) {
    console.log('Already logged in with a valid token.');
    return;
  }

  console.log('🔐 Opening browser for login...');
  await authService.login();
  console.log('✅ Login successful! Hello :)');
} 