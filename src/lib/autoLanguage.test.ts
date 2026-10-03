import assert from 'node:assert/strict';
import test from 'node:test';
import { detectUserGeoAndLanguage } from './autoLanguage';

function mockBrowserLocale(locale: string, t: { after: (fn: () => void) => void }) {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalFetch = globalThis.fetch;
  const values = new Map<string, string>([['bavel_user_ip', '203.0.113.10']]);
  let fetchCalls = 0;

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { language: locale, languages: [locale] },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('Locale detection must not make network requests');
  };

  t.after(() => {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete (globalThis as { navigator?: Navigator }).navigator;
    if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
    globalThis.fetch = originalFetch;
  });

  return {
    values,
    get fetchCalls() {
      return fetchCalls;
    },
  };
}

test('uses the locale region without guessing a city or sharing the IP address', async (t) => {
  const browser = mockBrowserLocale('fr-CA', t);

  const result = await detectUserGeoAndLanguage();

  assert.equal(result.countryCode, 'CA');
  assert.equal(result.country, 'Canada');
  assert.equal(result.city, '');
  assert.equal(result.language, 'Français');
  assert.equal(browser.fetchCalls, 0);
  assert.equal(browser.values.has('bavel_user_ip'), false);
});

test('leaves city unset when the browser locale has no region', async (t) => {
  const browser = mockBrowserLocale('fr', t);

  const result = await detectUserGeoAndLanguage();

  assert.equal(result.city, '');
  assert.equal(result.countryCode, '');
  assert.equal(result.country, '');
  assert.equal(browser.fetchCalls, 0);
});

test('does not infer the language from country or misread locale script subtags', async (t) => {
  const browser = mockBrowserLocale('en-CA', t);

  const result = await detectUserGeoAndLanguage();

  assert.equal(result.language, 'English');
  assert.equal(result.countryCode, 'CA');
  assert.equal(browser.fetchCalls, 0);
});

test('extracts a region following a BCP 47 script subtag', async (t) => {
  mockBrowserLocale('zh-Hant-TW', t);

  const result = await detectUserGeoAndLanguage();

  assert.equal(result.countryCode, 'TW');
});
