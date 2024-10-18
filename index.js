#!/usr/bin/env node
const path = require('path');
const { execFile } = require('child_process');
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

console.log(`Attempting to execute binary: ${binary}`);
console.log(`Arguments: ${process.argv.slice(2).join(' ')}`);

execFile(binary, process.argv.slice(2), { encoding: 'utf8' }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing binary: ${error.message}`);
    console.error(`Command: ${binary} ${process.argv.slice(2).join(' ')}`);
    console.error(`Exit code: ${error.code}`);
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    if (stdout) {
      console.error(`stdout: ${stdout}`);
    }
    process.exit(1);
  }
  console.log(stdout);
});
