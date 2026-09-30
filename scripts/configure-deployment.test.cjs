'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deploymentConfig } = require('./configure-deployment.cjs');

test('same-origin hosting needs no third-party cookies', () => {
  assert.deepEqual(deploymentConfig('/api/v1'), { apiBaseUrl: '/api/v1' });
});
test('SWA can call the HTTPS API directly instead of its integrated proxy', () => {
  assert.deepEqual(deploymentConfig('https://api.example.org/api/v1'), { apiBaseUrl: 'https://api.example.org/api/v1' });
});
test('credentials, local endpoints, non-HTTPS URLs and unexpected paths are rejected', () => {
  for (const url of ['http://api.example.org/api/v1', 'https://key@api.example.org/api/v1',
    'https://api.example.org/api/v1?key=secret', 'https://api.example.org/api/v1#secret',
    'https://localhost/api/v1', 'https://api.example.org/api']) {
    assert.throws(() => deploymentConfig(url));
  }
});
