import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Capacitor } from '@capacitor/core';
import { getApiUrl, getBackendBaseUrl, resolveApiRequest } from './apiUrl';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

before(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { protocol: 'https:', origin: 'https://bavel.example' } }
  });
});

after(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

test('preserves the current web origin when no API origin is configured', () => {
  assert.equal(getBackendBaseUrl(), 'https://bavel.example');
  assert.equal(getApiUrl('/api/profiles'), 'https://bavel.example/api/profiles');
  assert.equal(resolveApiRequest('/api/messages'), 'https://bavel.example/api/messages');
});

test('does not rewrite unrelated and absolute requests', () => {
  assert.equal(resolveApiRequest('/assets/app.js'), '/assets/app.js');
  assert.equal(resolveApiRequest('https://auth.example/login'), 'https://auth.example/login');
});

test('rejects API paths that are not absolute', () => {
  assert.throws(() => getApiUrl('api/messages'), /absolute paths/);
});

test('requires a configured API origin for native WebView origins', () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { protocol: 'capacitor:', origin: 'capacitor://localhost' } }
  });

  assert.throws(() => getApiUrl('/api/profiles'), /Native builds require VITE_API_BASE_URL/);
});

test('requires a configured API origin in the Android HTTPS WebView', () => {
  const originalBridge = Object.getOwnPropertyDescriptor(globalThis, 'androidBridge');
  Object.defineProperty(globalThis, 'androidBridge', {
    configurable: true,
    value: {}
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { protocol: 'https:', origin: 'https://localhost' } }
  });

  try {
    assert.equal(Capacitor.isNativePlatform(), true);
    assert.throws(() => getApiUrl('/api/profiles'), /Native builds require VITE_API_BASE_URL/);
  } finally {
    if (originalBridge) Object.defineProperty(globalThis, 'androidBridge', originalBridge);
    else Reflect.deleteProperty(globalThis, 'androidBridge');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { protocol: 'https:', origin: 'https://bavel.example' } }
    });
  }
});
