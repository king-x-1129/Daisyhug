const FtpDeploy = require('ftp-deploy');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const ftpDeploy = new FtpDeploy();

const {
  FTP_HOST,
  FTP_USER,
  FTP_PASSWORD,
  FTP_REMOTE_PATH
} = process.env;

// Validate environment variables
if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: FTP configuration is missing!');
  console.log('\nPlease make sure you have added the following variables to your .env file:');
  console.log('  FTP_HOST="your-ftp-host"');
  console.log('  FTP_USER="your-ftp-username"');
  console.log('  FTP_PASSWORD="your-ftp-password"');
  console.log('  FTP_REMOTE_PATH="/public_html" (optional, defaults to /public_html)\n');
  process.exit(1);
}

const config = {
  user: FTP_USER,
  password: FTP_PASSWORD,
  host: FTP_HOST,
  port: 21, // Hostinger default FTP port
  localRoot: path.join(__dirname, '../dist'),
  remoteRoot: FTP_REMOTE_PATH || '/public_html/',
  include: ['*', '**/*'], // Upload all files recursively
  deleteRemote: false, // Keep existing files (safer)
  forcePasv: true, // Required for most shared hostings
  sftp: false
};

console.log('Starting deployment to Hostinger...');
console.log(`Host: ${FTP_HOST}`);
console.log(`Target Directory: ${config.remoteRoot}`);
console.log('------------------------------------');

ftpDeploy.on('uploading', function (data) {
  console.log(`[Uploading] (${data.transferredFileCount}/${data.totalFilesCount}) ${data.filename}`);
});

ftpDeploy.on('uploaded', function (data) {
  console.log(`[OK] Uploaded: ${data.filename}`);
});

ftpDeploy.on('upload-error', function (data) {
  console.error('\x1b[31m%s\x1b[0m', `[Error] Failed to upload ${data.filename}: ${data.err}`);
});

ftpDeploy.deploy(config)
  .then(() => {
    console.log('\n\x1b[32m%s\x1b[0m', 'SUCCESS: Deployment completed successfully!');
    console.log('Your website should now be live on your Hostinger domain!');
  })
  .catch((err) => {
    console.error('\n\x1b[31m%s\x1b[0m', 'ERROR: Deployment failed:');
    console.error(err);
    process.exit(1);
  });
