import { expect } from '@playwright/test';

export function monitorBrowserHealth(page) {
  const health = {
    pageErrors: [],
    consoleErrors: [],
    consoleWarnings: [],
    failedRequests: [],
    sameOriginFailures: [],
  };

  const isSameOrigin = (url) => {
    try {
      return new URL(url).origin === new URL(page.url()).origin;
    } catch {
      return false;
    }
  };

  page.on('pageerror', (error) => {
    health.pageErrors.push({ name: error.name, message: error.message, stack: error.stack });
  });

  page.on('console', (message) => {
    const entry = { text: message.text(), location: message.location() };
    if (message.type() === 'error') health.consoleErrors.push(entry);
    if (message.type() === 'warning' || message.type() === 'warn') health.consoleWarnings.push(entry);
  });

  page.on('requestfailed', (request) => {
    const entry = {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText ?? 'unknown',
    };
    health.failedRequests.push(entry);
    if (isSameOrigin(request.url())) health.sameOriginFailures.push({ type: 'request-failed', ...entry });
  });

  page.on('response', (response) => {
    if (response.status() < 400 || !isSameOrigin(response.url())) return;
    health.sameOriginFailures.push({
      type: 'http-error',
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
    });
  });

  return health;
}

export async function attachBrowserHealth(testInfo, health) {
  await testInfo.attach('browser-health.json', {
    body: Buffer.from(JSON.stringify(health, null, 2)),
    contentType: 'application/json',
  });

  const collections = {
    pageErrors: health.pageErrors,
    consoleErrors: health.consoleErrors,
    consoleWarnings: health.consoleWarnings,
    failedRequests: health.failedRequests,
    sameOriginFailures: health.sameOriginFailures,
  };
  console.info(`[browser-health] ${JSON.stringify(Object.fromEntries(
    Object.entries(collections).map(([name, entries]) => [name, entries.length]),
  ))}`);

  const nonemptyDetails = Object.fromEntries(
    Object.entries(collections)
      .filter(([, entries]) => entries.length > 0)
      .map(([name, entries]) => [name, entries.slice(0, 5)]),
  );
  if (Object.keys(nonemptyDetails).length > 0) {
    console.info(`[browser-health-details] ${JSON.stringify(nonemptyDetails)}`);
  }

  // Uncaught page errors, console errors, and same-origin request failures
  // block the smoke suite. Warnings and external request failures stay as diagnostics.
  expect(health.pageErrors, 'uncaught browser exceptions').toEqual([]);
  expect(health.consoleErrors, 'browser console errors').toEqual([]);
  expect(health.sameOriginFailures, 'same-origin request/HTTP failures').toEqual([]);
}

export async function attachScreenshot(testInfo, page, name) {
  await testInfo.attach(name, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
}
