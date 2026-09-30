'use strict';

function assertCloudSmokeTarget({ frontUrl, apiUrl, username, password }) {
  let front, api;
  try {
    front = new URL(frontUrl);
    api = new URL(apiUrl);
  } catch {
    throw new Error('Explicit cloud smoke URLs are required.');
  }
  if (front.protocol !== 'https:' || api.protocol !== 'https:' ||
      !/^hs-thesis-api-[a-z0-9]+\.azurewebsites\.net$/.test(front.hostname) ||
      front.origin !== api.origin || front.pathname !== '/' || api.pathname !== '/api/v1' ||
      front.username || front.password || api.username || api.password ||
      front.search || front.hash || api.search || api.hash || !username || !password) {
    throw new Error('An authorized same-origin cloud smoke target and credentials are required.');
  }
}

module.exports = { assertCloudSmokeTarget };
if (require.main === module) {
  assertCloudSmokeTarget({
    frontUrl: process.env.PLAYWRIGHT_BASE_URL,
    apiUrl: process.env.PLAYWRIGHT_API_BASE_URL,
    username: process.env.SMOKE_USERNAME,
    password: process.env.SMOKE_PASSWORD,
  });
  console.log('Cloud smoke destination validated; credential values are not logged.');
}
