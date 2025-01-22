#!/usr/bin/env node
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const https = require('https');

const REPO_OWNER = 'basicdb';
const REPO_NAME = 'basic-cli';


const downloadBinary = async (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    const makeRequest = (url) => {
      https
        .get(url, (response) => {
          if (response.statusCode === 302 && response.headers.location) {
            console.log(`Redirecting to ${response.headers.location}`);
            makeRequest(response.headers.location);
          } else if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', () => {
              file.close(() => resolve());
            });
          } else {
            reject(
              new Error(
                `Failed to download binary: ${response.statusCode} - ${response.statusMessage}`
              )
            );
          }
        })
        .on('error', (err) => {
          fs.unlink(dest, () => reject(err));
        });
    };

    makeRequest(url);
  });
};

const getPackageVersion = () => {
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
};

const installBinary = async () => {
  const archMap = {
    x64: 'x86_64',
    arm64: 'arm64',
    ia32: 'i386',
  };

  const platformMap = {
    win32: 'Windows',
    darwin: 'Darwin',
    linux: 'Linux',
  };

  const arch = archMap[os.arch()] || os.arch();
  const platform = platformMap[os.platform()] || os.platform();
  const version = getPackageVersion();
  if (!arch || !platform) {
    throw new Error(`Unsupported platform/architecture: ${os.platform()}/${os.arch()}`);
  }

  const extension = platform === 'Windows' ? 'zip' : 'tar.gz';
  const fileName = `basic-cli_${platform}_${arch}.${extension}`;

  const destPath = path.join(__dirname, 'bin', `basic-cli${platform === 'Windows' ? '.exe' : ''}`);
  const tempPath = path.join(__dirname, fileName);
  const downloadUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v${version}/${fileName}`;
  console.log(`Downloading binary from ${downloadUrl}`);
  await downloadBinary(downloadUrl, tempPath);

  if (platform === 'Windows') {
    execSync(`tar -xf ${tempPath} -C ${path.dirname(destPath)}`);
  } else {
    execSync(`tar -xzf ${tempPath} -C ${path.dirname(destPath)}`);
  }

  fs.unlinkSync(tempPath);

  if (platform !== 'Windows') {
    execSync(`chmod +x ${destPath}`);
  }

  console.log(`Installed ${platform} binary to ${destPath}`);
};

const main = async () => {
  try {
    await installBinary();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

main();