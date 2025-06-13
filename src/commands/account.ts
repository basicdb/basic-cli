import { AuthService } from '../lib/auth';
import { isOnline } from '../lib/platform';
import { MESSAGES } from '../lib/constants';

export async function AccountCommand(): Promise<void> {
  // Check if online
  if (!(await isOnline())) {
    throw new Error(MESSAGES.OFFLINE);
  }

  const authService = AuthService.getInstance();
  
  // Check if logged in
  const token = await authService.getToken();
  if (!token) {
    throw new Error(MESSAGES.LOGGED_OUT);
  }

  const userInfo = await authService.getUserInfo();
  console.log('Logged in user:', userInfo.email);
} 