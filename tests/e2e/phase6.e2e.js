import { expect, test } from '@playwright/test';
import { attachBrowserHealth, attachScreenshot, monitorBrowserHealth } from './browser-health.js';

test.beforeEach(async ({ page }) => {
  page.__browserHealth = monitorBrowserHealth(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await attachBrowserHealth(testInfo, page.__browserHealth);
});

async function startGameplay(page) {
  await page.goto('/');
  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  const titleScreen = page.locator('#title-screen');
  await expect(titleScreen).toHaveClass(/\bhidden\b/);
  await expect(titleScreen).toHaveCSS('opacity', '0');
  await page.waitForFunction(() => Boolean(window.__BACKYARD_TEST_ENGINE__));
}

async function showChunk(page, chunkIndex, survivalSeconds = 20) {
  return page.evaluate(({ chunkIndex, survivalSeconds }) => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const playerX = chunkIndex * engine.proceduralWorld.chunkSize + 330;
    engine.player.x = playerX;
    engine.camera.x = playerX - engine.width * 0.5;
    engine.survivalSeconds = survivalSeconds;
    engine.mapRenderer.update(0, survivalSeconds);
    engine.proceduralWorld.updateActiveChunks(playerX);
    engine.render(performance.now());
    const chunk = engine.proceduralWorld.activeChunks.get(chunkIndex);
    return {
      theme: chunk.theme,
      props: chunk.props.filter(prop => prop.isDestructible && !prop.isNpc).map(prop => ({
        propKey: prop.propKey,
        material: prop.material,
        objectName: prop.objectName
      }))
    };
  }, { chunkIndex, survivalSeconds });
}

test('production world renders each named yard with intact material props and night readability', async ({ page }, testInfo) => {
  await startGameplay(page);
  const expectedThemes = ['GREENHOUSE', 'PATIO_BBQ', 'SHED_TRAMPOLINE', 'DOG_PARK'];

  for (let index = 0; index < expectedThemes.length; index++) {
    const yard = await showChunk(page, index);
    expect(yard.theme).toBe(expectedThemes[index]);
    expect(yard.props.length).toBeGreaterThan(0);
    expect(yard.props.every(prop => prop.propKey && prop.material)).toBe(true);
    await attachScreenshot(testInfo, page, `phase6-${expectedThemes[index].toLowerCase()}-intact.png`);
  }

  const nightYard = await showChunk(page, 3, 150);
  expect(nightYard.theme).toBe('DOG_PARK');
  await attachScreenshot(testInfo, page, 'phase6-dog-park-night-readability.png');
});

test('material destruction leaves one event, live debris, and persistent residue after chunk reload', async ({ page }, testInfo) => {
  await startGameplay(page);
  const before = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    const target = engine.proceduralWorld.activeChunks.get(0).props.find(prop => prop.label === 'destructible_wood_crate');
    engine.ball.velocity.x = 8;
    engine.ball.velocity.y = -2;
    engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: target }] });
    // Freeze only the E2E fixture after its production collision so the score comparison
    // cannot race another live physics tick while screenshots are captured.
    engine.gameState = 'IDLE';
    engine.camera.x = 0;
    engine.render(performance.now());
    return {
      propKey: target.propKey,
      score: engine.score,
      destroyedKeys: engine.proceduralWorld.destroyedPropKeys.size,
      residueCount: engine.proceduralWorld.getActiveResidues().length,
      fragments: engine.activeShards.map(fragment => ({
        material: fragment.material,
        shape: fragment.fragmentShape,
        velocityX: fragment.velocity.x
      })),
      theme: target.theme
    };
  });

  expect(before.theme).toBe('GREENHOUSE');
  expect(before.destroyedKeys).toBe(1);
  expect(before.residueCount).toBe(1);
  expect(before.fragments).toHaveLength(6);
  expect(before.fragments.every(fragment => fragment.material === 'WOOD' && fragment.shape === 'splinter')).toBe(true);
  expect(before.fragments.filter(fragment => fragment.velocityX > 0).length)
    .toBeGreaterThan(before.fragments.filter(fragment => fragment.velocityX < 0).length);
  await attachScreenshot(testInfo, page, 'phase6-greenhouse-wood-live-debris.png');

  const afterReload = await page.evaluate(propKey => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    engine.proceduralWorld.unloadChunk(0);
    engine.proceduralWorld.loadChunk(0);
    engine.render(performance.now());
    return {
      propPresent: engine.proceduralWorld.activeChunks.get(0).props.some(prop => prop.propKey === propKey),
      residue: engine.proceduralWorld.getActiveResidues().find(item => item.propKey === propKey),
      score: engine.score,
      totalPropsSmashed: engine.proceduralWorld.totalPropsSmashed
    };
  }, before.propKey);

  expect(afterReload.propPresent).toBe(false);
  expect(afterReload.residue).toMatchObject({ propKey: before.propKey, material: 'WOOD', residueType: 'wood-splinters' });
  expect(afterReload.score).toBe(before.score);
  expect(afterReload.totalPropsSmashed).toBe(1);
  await attachScreenshot(testInfo, page, 'phase6-greenhouse-wood-persisted-residue.png');
});

test('all seven production materials break into their rendered fragment families', async ({ page }, testInfo) => {
  const samples = [
    { material: 'GLASS', shape: 'triangle', count: 9, chunkIndex: 0, label: 'destructible_greenhouse', screenshot: 'phase6-glass-live-debris.png' },
    { material: 'CERAMIC', shape: 'chip', count: 6, chunkIndex: 0, label: 'destructible_gnome', screenshot: 'phase6-ceramic-live-debris.png' },
    { material: 'WOOD', shape: 'splinter', count: 6, chunkIndex: 0, label: 'destructible_wood_crate', screenshot: 'phase6-wood-live-debris.png' },
    { material: 'METAL', shape: 'scrap', count: 4, chunkIndex: 1, label: 'destructible_trashcan', screenshot: 'phase6-metal-live-debris.png' },
    { material: 'PLASTIC', shape: 'molded', count: 5, chunkIndex: 0, label: 'destructible_watering_can', screenshot: 'phase6-plastic-live-debris.png' },
    { material: 'FABRIC', shape: 'fabric-strip', count: 3, chunkIndex: 1, label: 'destructible_fabric_cushion', screenshot: 'phase6-fabric-live-debris.png' },
    { material: 'SOIL', shape: 'clod', count: 6, chunkIndex: 0, label: 'destructible_soil_patch', screenshot: 'phase6-soil-live-debris.png' }
  ];

  for (const sample of samples) {
    await startGameplay(page);
    await showChunk(page, sample.chunkIndex);

    const result = await page.evaluate(({ chunkIndex, label, material }) => {
      const engine = window.__BACKYARD_TEST_ENGINE__;
      const chunk = engine.proceduralWorld.activeChunks.get(chunkIndex);
      const target = chunk?.props.find(prop => prop.label === label && prop.material === material && !prop.isDestroyed);
      if (!target) throw new Error(`Missing production ${material} prop ${label} in chunk ${chunkIndex}`);

      engine.player.x = target.position.x - 160;
      engine.camera.x = target.position.x - engine.width * 0.5;
      engine.ball.velocity.x = 8;
      engine.ball.velocity.y = -2;
      engine.collisionHandler({ pairs: [{ bodyA: engine.ball, bodyB: target }] });
      engine.gameState = 'IDLE';
      engine.kickoffBannerTimer = 0;
      engine.particles.popTexts.length = 0;

      const fragments = engine.activeShards.map(fragment => ({
        material: fragment.material,
        shape: fragment.fragmentShape,
        propKey: fragment.propKey,
        velocityX: fragment.velocity.x,
        renderWidth: fragment.fragmentRenderWidth,
        renderHeight: fragment.fragmentRenderHeight,
        renderRadius: fragment.fragmentRenderRadius,
        sides: fragment.fragmentSides
      }));
      engine.render(performance.now());
      return { targetMaterial: target.material, fragments };
    }, sample);

    expect(result.targetMaterial).toBe(sample.material);
    expect(result.fragments).toHaveLength(sample.count);
    expect(result.fragments.every(fragment => fragment.material === sample.material && fragment.shape === sample.shape)).toBe(true);
    expect(result.fragments.every(fragment => fragment.renderWidth > 0 && fragment.renderHeight > 0)).toBe(true);
    expect(result.fragments.some(fragment => fragment.velocityX > 0)).toBe(true);

    if (sample.material === 'CERAMIC') {
      expect(result.fragments.every(fragment => fragment.sides >= 3 && fragment.sides <= 5 && fragment.renderRadius > 0)).toBe(true);
    }
    if (sample.material === 'GLASS') {
      expect(result.fragments.every(fragment => fragment.sides === 3 && fragment.renderRadius > 0)).toBe(true);
    }
    if (sample.material === 'SOIL') {
      expect(result.fragments.every(fragment => fragment.renderRadius > 0)).toBe(true);
    }

    await attachScreenshot(testInfo, page, sample.screenshot);
  }
});

test('VideoGen link appears only in results, discloses affiliate status, and has no gameplay effect', async ({ page, context }, testInfo) => {
  let videoGenRequests = 0;
  context.on('request', request => {
    if (request.url().startsWith('https://app.videogen.io/')) videoGenRequests++;
  });
  await page.goto('/');
  await expect(page.locator('#affiliate-placement')).toBeHidden();
  await expect(page.locator('#affiliate-placement a')).toHaveCount(0);
  await attachScreenshot(testInfo, page, 'phase6-title-no-affiliate-placement.png');

  await page.locator('#btn-start-game').click();
  await page.keyboard.press('Space');
  await expect(page.locator('#title-screen')).toHaveClass(/\bhidden\b/);
  await expect(page.locator('#affiliate-placement')).toBeHidden();
  await page.evaluate(() => window.__BACKYARD_TEST_ENGINE__.triggerGameOver());

  const placement = page.locator('#affiliate-placement');
  const link = placement.locator('a');
  await expect(placement).toBeVisible();
  await expect(link).toHaveAttribute('href', 'https://app.videogen.io/affiliates?code=cfbff82e-d675-444b-9bbc-7e08c5847b2d');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'sponsored noopener noreferrer');
  await expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
  await expect(link).toHaveAccessibleName('Create your own game clips');
  await expect(placement).toContainText('Affiliate link — we may earn a commission at no extra cost to you.');
  expect(videoGenRequests).toBe(0);
  await attachScreenshot(testInfo, page, 'phase6-results-affiliate-disclosure.png');

  await context.route('https://app.videogen.io/**', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>VideoGen test destination</title><p>Local link safety stub</p>'
  }));
  const beforeClick = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    return { score: engine.score, combo: engine.combo, rage: engine.npc.rageMeter, havoc: engine.havocSystem.meter };
  });
  const [popup] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  await popup.waitForLoadState();
  expect(popup.url()).toBe('https://app.videogen.io/affiliates?code=cfbff82e-d675-444b-9bbc-7e08c5847b2d');
  expect(videoGenRequests).toBe(1);
  const afterClick = await page.evaluate(() => {
    const engine = window.__BACKYARD_TEST_ENGINE__;
    return { score: engine.score, combo: engine.combo, rage: engine.npc.rageMeter, havoc: engine.havocSystem.meter };
  });
  expect(afterClick).toEqual(beforeClick);
  await popup.close();
});
