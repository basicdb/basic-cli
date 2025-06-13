import { spawn } from 'child_process';
import { getVersion } from '../lib/version';
import { ApiClient } from '../lib/api';
import { isOnline } from '../lib/platform';
import { MESSAGES } from '../lib/constants';

export async function UpdateCommand(): Promise<void> {
  try {
    // Check if online
    if (!(await isOnline())) {
      console.error(MESSAGES.OFFLINE);
      process.exit(1);
    }

    const currentVersion = getVersion();
    console.log(`Current version: ${currentVersion}`);
    console.log('Checking for updates...');

    const apiClient = ApiClient.getInstance();
    const latestVersion = await apiClient.checkLatestRelease();

    if (latestVersion === currentVersion) {
      console.log('✅ You are already running the latest version!');
      return;
    }

    console.log(`🚀 New version available: ${latestVersion}`);
    console.log('Updating...');

    // Use npm to update the package
    await updatePackage();

  } catch (error) {
    console.error('❌ Error checking for updates:', error instanceof Error ? error.message : 'Unknown error');
    console.log('\n💡 You can try updating manually:');
    console.log('   npm update -g @basictech/cli');
    console.log('\n📚 Or visit: https://docs.basic.tech');
    process.exit(1);
  }
}

async function updatePackage(): Promise<void> {
  return new Promise((resolve, reject) => {
    const updateProcess = spawn('npm', ['update', '-g', '@basictech/cli'], {
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let errorOutput = '';

    updateProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    updateProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    updateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Update successful!');
        console.log('\n🎉 Basic CLI has been updated to the latest version.');
        console.log('💡 Run `basic version` to verify the update.');
        resolve();
      } else {
        console.error('❌ Error updating CLI');
        console.log('\n💡 Please try updating manually:');
        console.log('   npm update -g @basictech/cli');
        console.log('\n📚 Or visit: https://docs.basic.tech');
        
        if (errorOutput) {
          console.log('\nError details:', errorOutput);
        }
        
        reject(new Error(`Update process exited with code ${code}`));
      }
    });

    updateProcess.on('error', (error) => {
      console.error('❌ Failed to start update process');
      console.log('\n💡 Please try updating manually:');
      console.log('   npm update -g @basictech/cli');
      console.log('\n📚 Or visit: https://docs.basic.tech');
      reject(error);
    });
  });
} 