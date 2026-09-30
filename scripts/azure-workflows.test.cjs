'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { assertCloudSmokeTarget } = require('./assert-cloud-smoke-target.cjs');

const target = {
  frontUrl: 'https://hs-thesis-api-test.azurewebsites.net',
  apiUrl: 'https://hs-thesis-api-test.azurewebsites.net/api/v1',
  username: 'offline-user', password: 'offline-test-value',
};
const workflow = name => readFileSync(join(__dirname, '../.github/workflows', name), 'utf8');

test('tag pushes start same-origin packaging while preserving manual recovery', () => {
  const source = workflow('azure-release.yml');
  assert.ok(source.includes("tags: ['v*']"));
  assert.ok(source.includes('workflow_dispatch:'));
  assert.ok(source.includes("github.event_name == 'push' || github.ref_name == inputs.release_tag"));
  assert.ok(source.includes('RELEASE_TAG: ${{ github.ref_name }}'));
  assert.ok(source.includes("inputs.hosting == 'swa' && vars.AZURE_API_BASE_URL || '/api/v1'"));
  assert.ok(source.includes('environment: azure-students'));
  assert.ok(source.includes("vars.AZURE_CD_ENABLED == 'true'"));
  assert.ok(!source.includes('ref: ${{ inputs.release_tag }}'));
  assert.ok(!source.includes('--clobber'));
  assert.ok(!source.includes('webapps-deploy'));
});

test('SWA requires explicit manual selection and cannot run on tag publication', () => {
  const source = workflow('azure-release.yml');
  assert.equal(source.split("if: github.event_name == 'workflow_dispatch' && inputs.hosting == 'swa'").length - 1, 3);
});

test('standalone smoke stays manual to avoid racing the backend deployment', () => {
  const source = workflow('azure-smoke.yml');
  assert.ok(source.includes('workflow_dispatch:'));
  assert.ok(!source.includes('  push:'));
  assert.ok(source.includes('environment: azure-students'));
  assert.ok(source.includes('node scripts/assert-cloud-smoke-target.cjs'));
});

test('authorized HTTPS same-origin cloud target is accepted', () => {
  assert.doesNotThrow(() => assertCloudSmokeTarget(target));
});

test('invalid destinations and missing credentials fail without exposing values', () => {
  const invalid = [
    { frontUrl: 'http://hs-thesis-api-test.azurewebsites.net' },
    { frontUrl: 'https://localhost' },
    { frontUrl: 'https://hs-thesis-worker-test.azurewebsites.net' },
    { frontUrl: 'https://hs-thesis-api-test.azurewebsites.net.evil.invalid' },
    { frontUrl: 'https://hs-thesis-api-test.azurewebsites.net/path' },
    { frontUrl: 'https://user:private-value@hs-thesis-api-test.azurewebsites.net' },
    { frontUrl: 'https://hs-thesis-api-test.azurewebsites.net/?secret=private-value' },
    { apiUrl: 'https://hs-thesis-api-other.azurewebsites.net/api/v1' },
    { apiUrl: 'https://hs-thesis-api-test.azurewebsites.net/api/v2' },
    { apiUrl: 'https://hs-thesis-api-test.azurewebsites.net/api/v1#private-value' },
    { frontUrl: 'not-a-url' }, { username: '' }, { password: '' },
  ];
  for (const change of invalid) {
    assert.throws(() => assertCloudSmokeTarget({ ...target, ...change }), error => {
      assert.ok(!error.message.includes('private-value'));
      assert.ok(!error.message.includes(target.password));
      return true;
    });
  }
});
