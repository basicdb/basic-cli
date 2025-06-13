import { AuthService } from '../lib/auth';

export async function LogoutCommand(): Promise<void> {
  const authService = AuthService.getInstance();
  await authService.logout();
  console.log('Logged out successfully');
} 