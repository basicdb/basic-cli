#!/usr/bin/env node
const path = require('path');
const { execFile, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');

let binary;

let arch = os.arch() == 'x64' ? 'amd64_v1' : os.arch();
let platform = os.platform() == 'win32' ? 'windows' : os.platform();
let folderName = 'basic-cli' + '_' + platform + '_' + arch;

switch (os.platform()) {
  case 'win32':
    binary = path.join(__dirname, 'dist', folderName, 'basic-cli.exe');
    break;
  case 'darwin':
    binary = path.join(__dirname, 'dist', folderName, 'basic-cli');
    break;
  case 'linux':
    binary = path.join(__dirname, 'dist', folderName, 'basic-cli');
    break;
  default:
    console.error('Unsupported OS');
    process.exit(1);
}

if (!fs.existsSync(binary)) {
  console.error(`Binary not found: ${binary}`);
  process.exit(1);
}


const sourcePath = binary
const fileName = platform == 'windows' ? 'basic-cli.exe' : 'basic-cli'
const destPath = path.join(__dirname, 'bin', fileName);

try {
  // Ensure the bin directory exists
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  
  fs.copyFileSync(sourcePath, destPath);
  if (os.platform() !== 'win32') {
    execSync(`chmod +x ${destPath}`);
  }
  console.log(`Installed the ${os.platform()} binary.`);
} catch (error) {
  console.error('Error during post-install script:', error);
  process.exit(1);
}
