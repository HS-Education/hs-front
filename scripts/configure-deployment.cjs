'use strict';
const fs = require('node:fs');
const path = require('node:path');

function deploymentConfig(apiBaseUrl) {
  if (apiBaseUrl === '/api/v1') return { apiBaseUrl };
  const url = new URL(apiBaseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || url.pathname !== '/api/v1' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('An HTTPS API URL ending in /api/v1 is required.');
  }
  return { apiBaseUrl: url.href };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', 'dist', 'hs-tesis-front', 'browser');
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Build the frontend before configuring deployment.');
  fs.writeFileSync(path.join(root, 'runtime-config.json'), JSON.stringify(
    deploymentConfig(process.env['AZURE_API_BASE_URL'] || '/api/v1'), null, 2) + '\n');
  console.log('Public API endpoint configured; no credentials are written to the frontend.');
}
module.exports = { deploymentConfig };
