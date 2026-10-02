import Matter from 'matter-js';
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { drawPlayerCharacter } from '../player_renderer.js';
import { drawKevinCharacter } from '../kevin_renderer.js';
import { MatterDebugOverlay } from './matter_debug_overlay.js';

const { Composite } = Matter;
const WIDTH = 960;
const HEIGHT = 540;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function addSprite(parent, texture, label) {
  const sprite = new Sprite(texture);
  sprite.label = label;
  sprite.anchor.set(0.5);
  parent.addChild(sprite);
  return sprite;
}

function createCharacterTexture(width, height, draw, anchor) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const texture = Texture.from(canvas);
  return {
    canvas,
    context,
    texture,
    sprite: null,
    update(entity) {
      context.clearRect(0, 0, width, height);
      context.save();
      const entityX = Number.isFinite(entity?.x) ? entity.x : 0;
      const entityY = Number.isFinite(entity?.y) ? entity.y : 0;
      context.translate(anchor.x - entityX, anchor.y - entityY);
      draw(context, entity);
      context.restore();
      texture.source.update();
    },
    destroy() {
      texture.destroy(true);
    }
  };
}

export class PixiFeasibilityRenderer {
  constructor(mount) {
    this.mount = mount;
    this.mode = 'pixi';
    this.app = null;
    this.ready = false;
    this.visible = !document.hidden;
    this.contextLost = false;
    this.tuningPanel = null;
    this.debugOverlay = new MatterDebugOverlay();
    this.tuning = {
      parallaxFactor: 0.035,
      ambientTint: '#a9c6bd',
      keyLightIntensity: 1,
      contactShadowOpacity: 0.18,
      outlineMultiplier: 1,
      foregroundOpacity: 0.82,
      cameraVisualScale: 1,
      vfxAlpha: 1
    };
    this.assetTextures = {};
    this.performance = { lastFrameTime: null, intervals: [], renderCosts: [], firstFrame: null, lastFrame: null };
    this.lastFrame = null;
    this.textures = new Map();
    this.propSprites = new Map();
    this.projectileShapes = new Map();
    this.boundResize = () => this.syncResolution();
    this.boundContextLost = event => {
      event.preventDefault();
      this.contextLost = true;
    };
    this.boundContextRestored = () => { this.contextLost = false; };
    this.styleElement = null;
  }

  async initialize() {
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    this.app = new Application();
    try {
      await this.app.init({
        width: WIDTH,
        height: HEIGHT,
        resolution: dpr,
        autoDensity: true,
        antialias: true,
        preference: 'webgl',
        autoStart: false,
        backgroundAlpha: 1
      });

      const assetPaths = {
        house: '/assets/generated/vectors/environment/backyard-house.svg',
        fence: '/assets/generated/vectors/environment/cedar-fence-segment.svg',
        hedge: '/assets/generated/vectors/environment/garden-hedge.svg',
        foreground: '/assets/generated/vectors/environment/foreground-garden.svg',
        planter: '/assets/generated/vectors/props/hydrangea-planter.svg'
      };
      const loaded = await Promise.all(Object.entries(assetPaths).map(async ([key, src]) => [key, await Assets.load(src)]));
      this.assetTextures = Object.fromEntries(loaded);
      for (const [key, texture] of Object.entries(this.assetTextures)) this.textures.set(key, texture);

      this.app.canvas.classList.add('phase13-pixi-canvas');
      this.app.canvas.style.width = '100%';
      this.app.canvas.style.height = '100%';
      this.styleElement = document.createElement('style');
      this.styleElement.dataset.phase13RendererStyle = 'true';
      this.styleElement.textContent = '.phase13-pixi-canvas{position:absolute;z-index:1;inset:0;display:block;width:100%;height:100%;pointer-events:none}.canvas-container[data-renderer="pixi"] #game-canvas{opacity:0}';
      document.head.appendChild(this.styleElement);
      this.app.canvas.setAttribute('aria-hidden', 'true');
      this.mount.appendChild(this.app.canvas);
      this.mount.dataset.renderer = 'pixi';
      this.buildScene();
      this.app.canvas.addEventListener('webglcontextlost', this.boundContextLost);
      this.app.canvas.addEventListener('webglcontextrestored', this.boundContextRestored);
      window.addEventListener('resize', this.boundResize);
      await this.setTuningPanel(new URLSearchParams(window.location.search).get('phase13-tuning') === '1');
      this.syncResolution();
      this.ready = true;
      return this;
    } catch (error) {
      await this.destroy();
      throw error;
    }
  }

  buildScene() {
    const stage = this.app.stage;
    stage.label = 'phase13-pixi-stage';
    this.backdropZoom = new Container({ label: 'backdrop-camera-zoom' });
    this.backdropZoom.pivot.set(WIDTH / 2, HEIGHT / 2);
    this.backdropZoom.position.set(WIDTH / 2, HEIGHT / 2);
    stage.addChild(this.backdropZoom);

    this.sky = new Graphics({ label: 'phase13-atmosphere' });
    this.sky.rect(0, 0, WIDTH, HEIGHT).fill(this.tuning.ambientTint);
    this.backdropZoom.addChild(this.sky);
    this.ridgeBack = new Graphics({ label: 'phase13-far-ridge' });
    this.ridgeBack.poly([[0, 220], [130, 154], [245, 196], [370, 138], [500, 205], [650, 157], [805, 201], [960, 143], [960, 340], [0, 340]])
      .fill({ color: 0x6d928d, alpha: 0.58 });
    this.backdropZoom.addChild(this.ridgeBack);
    this.ridgeFront = new Graphics({ label: 'phase13-near-ridge' });
    this.ridgeFront.poly([[0, 258], [145, 198], [305, 241], [448, 188], [600, 244], [760, 201], [960, 248], [960, 346], [0, 346]])
      .fill({ color: 0x426d63, alpha: 0.72 });
    this.backdropZoom.addChild(this.ridgeFront);

    this.zoomRoot = new Container({ label: 'phase13-authoritative-camera-zoom' });
    this.zoomRoot.pivot.set(WIDTH / 2, HEIGHT / 2);
    this.zoomRoot.position.set(WIDTH / 2, HEIGHT / 2);
    stage.addChild(this.zoomRoot);
    this.shakeRoot = new Container({ label: 'phase13-authoritative-camera-shake' });
    this.zoomRoot.addChild(this.shakeRoot);
    this.worldRoot = new Container({ label: 'phase13-world-camera-x' });
    this.shakeRoot.addChild(this.worldRoot);

    this.worldRoot.addChild(new Graphics({ label: 'phase13-ground' })
      .rect(0, 320, WIDTH, 220).fill(0x5f8a55)
      .rect(0, 320, 230, 220).fill(0x899181)
      .rect(0, 324, WIDTH, 4).fill(0xc3c08f)
      .rect(0, 520, WIDTH, 20).fill(0x394d35));
    this.worldRoot.addChild(new Graphics({ label: 'phase13-patio-joints' })
      .moveTo(0, 360).lineTo(230, 360).moveTo(0, 402).lineTo(230, 402)
      .moveTo(72, 320).lineTo(72, 540).moveTo(154, 320).lineTo(154, 540)
      .stroke({ color: 0x697567, width: 2, alpha: 0.62 }));

    this.house = addSprite(this.worldRoot, this.assetTextures.house, 'authored-house');
    this.house.anchor.set(0, 0);
    this.house.position.set(430, 17);
    this.house.width = 520;
    this.house.height = 325;
    this.hedge = addSprite(this.worldRoot, this.assetTextures.hedge, 'authored-midground-hedge');
    this.hedge.anchor.set(0, 0);
    this.hedge.position.set(8, 192);
    this.hedge.width = 330;
    this.hedge.height = 138;

    this.fenceLayer = new Container({ label: 'authored-cedar-fence' });
    for (let x = -16; x < WIDTH + 128; x += 128) {
      const fence = addSprite(this.fenceLayer, this.assetTextures.fence, `fence-segment-${x}`);
      fence.anchor.set(0, 0);
      fence.position.set(x, 205);
      fence.width = 128;
      fence.height = 72;
    }
    this.worldRoot.addChild(this.fenceLayer);
    this.foreground = addSprite(this.worldRoot, this.assetTextures.foreground, 'authored-foreground-flowers');
    this.foreground.anchor.set(0, 0);
    this.foreground.position.set(18, 420);
    this.foreground.width = 285;
    this.foreground.height = 107;

    this.contactShadows = new Graphics({ label: 'phase13-contact-shadows' });
    this.worldRoot.addChild(this.contactShadows);
    this.propLayer = new Container({ label: 'phase13-authored-props' });
    this.worldRoot.addChild(this.propLayer);
    this.kevinTexture = createCharacterTexture(164, 148, drawKevinCharacter, { x: 82, y: 104 });
    this.kevinTexture.sprite = addSprite(this.worldRoot, this.kevinTexture.texture, 'phase13-kevin-current-canvas-pose');
    this.kevinTexture.sprite.anchor.set(0, 0);

    this.residueShapes = new Graphics({ label: 'phase13-destruction-residue' });
    this.shardShapes = new Graphics({ label: 'phase13-production-destruction-shards' });
    this.projectileLayer = new Container({ label: 'phase13-kevin-projectiles' });
    this.particleTexture = createCharacterTexture(WIDTH, HEIGHT, (ctx, particleSystem) => particleSystem.draw(ctx), { x: 0, y: 0 });
    this.particleTexture.sprite = addSprite(this.worldRoot, this.particleTexture.texture, 'phase13-production-particle-render');
    this.particleTexture.sprite.anchor.set(0, 0);
    this.worldRoot.addChild(this.residueShapes, this.shardShapes, this.projectileLayer);
    this.playerTexture = createCharacterTexture(150, 175, drawPlayerCharacter, { x: 75, y: 157 });
    this.playerTexture.sprite = addSprite(this.worldRoot, this.playerTexture.texture, 'phase13-player-current-canvas-pose');
    this.playerTexture.sprite.anchor.set(0, 0);

    this.ball = new Container({ label: 'phase13-authoritative-matter-ball' });
    this.ball.addChild(new Graphics().circle(0, 0, 15.5).fill(0x182a28));
    this.ball.addChild(new Graphics().circle(0, 0, 13.2).fill({ color: 0xf4ead0, alpha: 1 }));
    this.ball.addChild(new Graphics().circle(-4, -4, 3).fill(0xffffff));
    this.ball.addChild(new Graphics().poly([[0, -5], [5, -1], [3, 5], [-3, 5], [-5, -1]]).fill(0x26333a));
    this.worldRoot.addChild(this.ball);
    this.actionEffect = new Graphics({ label: 'phase13-kick-contact-effect' });
    this.worldRoot.addChild(this.actionEffect);
    this.aim = new Graphics({ label: 'phase13-aim-direction' });
    this.worldRoot.addChild(this.aim);
    this.debugOverlay.root.visible = false;
    this.worldRoot.addChild(this.debugOverlay.root);
    this.lightAccent = new Graphics({ label: 'phase13-upper-left-key-light' });
    this.lightAccent.poly([[0, 0], [90, 0], [0, 90]]).fill({ color: 0xffedb5, alpha: 0.13 });
    this.worldRoot.addChild(this.lightAccent);
    this.app.render();
  }

  setTuning(key, value) {
    if (!Object.hasOwn(this.tuning, key)) return false;
    this.tuning[key] = value;
    if (key === 'ambientTint') {
      this.sky.clear().rect(0, 0, WIDTH, HEIGHT).fill(value);
    } else if (key === 'keyLightIntensity') {
      this.lightAccent.alpha = clamp(Number(value) / 1.5, 0, 1);
    } else if (key === 'foregroundOpacity') {
      this.foreground.alpha = clamp(Number(value), 0, 1);
    } else if (key === 'vfxAlpha') {
      this.particleTexture.sprite.alpha = clamp(Number(value), 0, 1);
    }
    return true;
  }

  async setTuningPanel(visible) {
    if (visible && !this.tuningPanel) {
      const { createDevTuningPanel } = await import('./dev_tuning_panel.js');
      this.tuningPanel = createDevTuningPanel(this);
    }
    this.tuningPanel?.setVisible(Boolean(visible));
  }

  setCollisionOverlay(visible) {
    this.debugOverlay.setVisible(visible);
  }

  setPageVisible(visible) {
    this.visible = Boolean(visible);
  }

  setActive(active) {
    const enabled = Boolean(active);
    if (this.mount) this.mount.dataset.renderer = enabled ? 'pixi' : 'canvas';
    if (this.app?.canvas) this.app.canvas.style.visibility = enabled ? 'visible' : 'hidden';
  }

  syncResolution() {
    if (!this.app) return;
    const resolution = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    if (resolution !== this.app.renderer.resolution) {
      this.app.renderer.resolution = resolution;
      this.app.renderer.resize(WIDTH, HEIGHT);
    }
  }

  renderEnvironment(frame) {
    const camera = frame.camera.transform;
    this.backdropZoom.scale.set(camera.zoom * this.tuning.cameraVisualScale);
    this.ridgeBack.x = -frame.camera.worldX * this.tuning.parallaxFactor * 0.55;
    this.ridgeFront.x = -frame.camera.worldX * this.tuning.parallaxFactor;
    this.worldRoot.x = -frame.camera.worldX;
    this.shakeRoot.position.set(camera.x, camera.y);
    this.shakeRoot.rotation = camera.angle;
    this.zoomRoot.scale.set(camera.zoom * this.tuning.cameraVisualScale);
    this.foreground.alpha = this.tuning.foregroundOpacity;
    this.lightAccent.alpha = clamp(this.tuning.keyLightIntensity / 1.5, 0, 1);
  }

  renderProps(frame) {
    this.contactShadows.clear();
    this.contactShadows.ellipse(frame.player.x, frame.player.y + 10, 23, 5)
      .fill({ color: 0x19251f, alpha: this.tuning.contactShadowOpacity });
    const seen = new Set();
    for (const body of frame.world.activeProps) {
      if (!body || body.isDestroyed || body.isShard || body.isNpc) continue;
      const key = body.propKey || body.id;
      seen.add(key);
      const bounds = body.bounds;
      const width = Math.max(1, bounds.max.x - bounds.min.x);
      const height = Math.max(1, bounds.max.y - bounds.min.y);
      let sprite = this.propSprites.get(key);
      if (body.label === 'destructible_flowerpot') {
        if (!sprite) {
          sprite = addSprite(this.propLayer, this.assetTextures.planter, `authored-planter-${key}`);
          this.propSprites.set(key, sprite);
        }
        sprite.visible = true;
        sprite.position.set(body.position.x, body.position.y);
        sprite.anchor.set(0.5);
        sprite.width = width;
        sprite.height = height;
        sprite.rotation = body.angle;
        this.contactShadows.ellipse(body.position.x, bounds.max.y + 2, width * 0.47, 3)
          .fill({ color: 0x19251f, alpha: this.tuning.contactShadowOpacity });
      } else if (sprite) {
        sprite.visible = false;
      }
    }
    for (const [key, sprite] of this.propSprites) {
      if (!seen.has(key)) sprite.visible = false;
    }
  }

  renderProjectiles(projectiles = []) {
    const activeIds = new Set();
    for (const projectile of projectiles) {
      const id = projectile.id;
      activeIds.add(id);
      let shape = this.projectileShapes.get(id);
      if (!shape) {
        shape = new Graphics({ label: `phase13-projectile-${id}` });
        this.projectileShapes.set(id, shape);
        this.projectileLayer.addChild(shape);
      }
      shape.clear();
      shape.position.set(projectile.position.x, projectile.position.y);
      shape.rotation = projectile.angle || 0;
      shape.roundRect(-12, -8, 24, 16, 4).fill(projectile.isParried ? 0x6e8a4c : 0xc4b28f)
        .stroke({ color: 0x283631, width: 2 * this.tuning.outlineMultiplier });
      shape.circle(0, -17, 4.5).fill(projectile.isParried ? 0xffd358 : 0xec5b53);
    }
    for (const [id, shape] of this.projectileShapes) {
      if (activeIds.has(id)) continue;
      this.projectileLayer.removeChild(shape);
      shape.destroy();
      this.projectileShapes.delete(id);
    }
  }

  renderDestruction(frame) {
    this.residueShapes.clear();
    for (const residue of frame.world.residues) {
      if (!Number.isFinite(residue.x) || !Number.isFinite(residue.y)) continue;
      this.residueShapes.ellipse(residue.x, residue.y + 5, Math.max(6, (residue.width || 24) * 0.42), 3)
        .fill({ color: 0x5f4934, alpha: 0.66 });
      this.residueShapes.moveTo(residue.x - 11, residue.y + 2).lineTo(residue.x + 9, residue.y - 1)
        .stroke({ color: 0xb88350, width: 2, alpha: 0.82 });
    }
    this.shardShapes.clear();
    for (const shard of frame.destruction.shards) {
      if (!shard.position) continue;
      const bounds = shard.bounds;
      const width = shard.fragmentRenderWidth || Math.max(3, bounds ? bounds.max.x - bounds.min.x : 8);
      const height = shard.fragmentRenderHeight || Math.max(3, bounds ? bounds.max.y - bounds.min.y : 8);
      this.shardShapes.rect(shard.position.x - width / 2, shard.position.y - height / 2, width, height)
        .fill({ color: Number.parseInt((shard.color || '#b78350').replace('#', ''), 16), alpha: 0.9 });
    }
  }

  renderBall(frame) {
    const ball = frame.ball;
    if (!ball?.position) {
      this.ball.visible = false;
      return;
    }
    this.ball.visible = true;
    this.ball.position.set(ball.position.x, ball.position.y);
    this.ball.rotation = ball.angle || 0;
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    const stretch = speed > 2 ? clamp(1 + speed / 60, 1, 1.42) : 1;
    this.ball.scale.set(stretch, 1 / Math.sqrt(stretch));
  }

  renderActionAndAim(frame) {
    this.actionEffect.clear();
    const player = frame.player;
    if (player.state === 'KICKING' || player.state === 'HEADING') {
      const contact = player.getKickPosition();
      const motionScale = frame.reducedMotion ? 0.7 : 1;
      const kickProgress = clamp(Number(player.kickProgress) || 0, 0, 1);
      this.actionEffect.circle(contact.x, contact.y, 12 + kickProgress * 12)
        .stroke({ color: player.state === 'HEADING' ? 0x81dbef : 0xf3d068, width: 2, alpha: 0.72 * motionScale });
    }
    this.aim.clear();
    if (frame.input?.aimWorld && frame.ball?.position) {
      const aim = frame.input.aimWorld;
      const ball = frame.ball.position;
      this.aim.moveTo(ball.x, ball.y).lineTo(aim.x, aim.y)
        .stroke({ color: 0xf6eab4, width: 1.5, alpha: 0.34 });
    }
  }

  recordFrame(startTime) {
    const finished = performance.now();
    if (this.performance.lastFrameTime !== null) {
      this.performance.intervals.push(finished - this.performance.lastFrameTime);
      this.performance.renderCosts.push(finished - startTime);
    } else {
      this.performance.firstFrame = finished;
    }
    this.performance.lastFrame = finished;
    this.performance.lastFrameTime = finished;
  }

  resetPerformance() {
    this.performance = { lastFrameTime: null, intervals: [], renderCosts: [], firstFrame: null, lastFrame: null };
  }

  renderFrame(frame) {
    if (!this.ready || !this.visible) return;
    if (this.contextLost) throw new Error('Pixi WebGL context is lost; reload to retry the feasibility renderer.');
    const start = performance.now();
    this.lastFrame = frame;
    this.renderEnvironment(frame);
    this.renderProps(frame);
    this.kevinTexture.update(frame.kevin);
    this.kevinTexture.sprite.position.set(frame.kevin.x - 82, frame.kevin.y - 104);
    this.renderDestruction(frame);
    this.renderProjectiles(frame.projectiles);
    this.particleTexture.update(frame.particles);
    this.particleTexture.sprite.alpha = this.tuning.vfxAlpha;
    this.playerTexture.update(frame.player);
    this.playerTexture.sprite.position.set(frame.player.x - 75, frame.player.y - 157);
    this.renderBall(frame);
    this.renderActionAndAim(frame);
    this.debugOverlay.render(frame);
    this.app.render();
    this.recordFrame(start);
  }

  async prepareVisualScenario(name) {
    if (name === 'collision-overlay') this.setCollisionOverlay(true);
    if (name === 'normal') {
      this.setCollisionOverlay(false);
      await this.setTuningPanel(false);
    }
  }

  getDiagnostics() {
    const visit = container => container.children.reduce((total, child) => total + 1
      + (child.children ? visit(child) : 0), 0);
    const intervals = [...this.performance.intervals].sort((a, b) => a - b);
    const percentile = fraction => intervals.length ? intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * fraction))] : null;
    return {
      mode: this.mode,
      backend: this.app?.renderer?.name || this.app?.renderer?.constructor?.name || 'unknown',
      cameraTransform: this.lastFrame?.camera?.transform || null,
      cameraWorldX: this.lastFrame?.camera?.worldX ?? null,
      reducedMotion: this.lastFrame?.reducedMotion ?? null,
      collisionOverlayVisible: this.debugOverlay.visible,
      resolution: this.app?.renderer?.resolution || null,
      screen: this.app ? { width: this.app.screen.width, height: this.app.screen.height } : null,
      backing: this.app ? { width: this.app.canvas.width, height: this.app.canvas.height } : null,
      textureCount: this.textures.size + 3,
      sceneRenderableCountProxy: this.app ? visit(this.app.stage) : 0,
      drawCallCountProxy: this.app ? visit(this.app.stage) : 0,
      sampleDurationMs: this.performance.firstFrame === null ? 0 : this.performance.lastFrame - this.performance.firstFrame,
      frameCount: this.performance.intervals.length,
      medianFrameIntervalMs: percentile(0.5),
      p95FrameIntervalMs: percentile(0.95),
      p99FrameIntervalMs: percentile(0.99),
      maxFrameIntervalMs: intervals.length ? intervals.at(-1) : null,
      lastRenderCostMs: this.performance.renderCosts.at(-1) ?? null,
      matterBodyCount: this.lastFrame?.matterWorld ? Composite.allBodies(this.lastFrame.matterWorld).length : 0,
      particleCount: this.lastFrame?.particles?.particles?.length || 0,
      projectileCount: this.lastFrame?.projectiles?.length || 0,
      visible: this.visible,
      contextLost: this.contextLost,
      assetTextureNames: [...this.textures.keys()],
      tuning: { ...this.tuning }
    };
  }

  async destroy() {
    window.removeEventListener('resize', this.boundResize);
    if (this.app?.canvas) {
      this.app.canvas.removeEventListener('webglcontextlost', this.boundContextLost);
      this.app.canvas.removeEventListener('webglcontextrestored', this.boundContextRestored);
    }
    this.tuningPanel?.destroy();
    this.styleElement?.remove();
    this.worldRoot?.removeChild(this.debugOverlay.root);
    this.debugOverlay.destroy();
    this.kevinTexture?.destroy();
    this.playerTexture?.destroy();
    this.particleTexture?.destroy();
    for (const sprite of this.propSprites.values()) sprite.destroy();
    for (const shape of this.projectileShapes.values()) shape.destroy();
    this.propSprites.clear();
    this.projectileShapes.clear();
    if (this.app?.renderer) {
      this.mount?.dataset && delete this.mount.dataset.renderer;
      this.app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
    }
    this.ready = false;
    this.app = null;
  }
}
