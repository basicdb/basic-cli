import { getVersion } from '../lib/version';
import { ApiClient } from '../lib/api';

export async function VersionCommand(): Promise<void> {
  const currentVersion = getVersion();
  console.log(`basic-cli version ${currentVersion}`);
  
  try {
    const apiClient = ApiClient.getInstance();
    const latestVersion = await apiClient.checkLatestRelease();
    
    if (latestVersion !== currentVersion) {
      console.log(`New version available: ${latestVersion}`);
      console.log('\nPlease update with \'basic update\'');
    } else {
      console.log('You are running the latest version!');
    }
  } catch (error) {
    console.log('\nOopsy - could not check if new version is available.');
  }
} 