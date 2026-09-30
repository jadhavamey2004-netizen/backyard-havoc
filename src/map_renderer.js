/**
 * Procedural Endless Map Renderer for Backyard Havoc
 * Features Dynamic Time-of-Day Sky gradients (morning -> amber -> twilight),
 * 3-Layer Parallax Scrolling (distant hills, midground architecture, foreground fence),
 * Animated clothesline laundry, warm fairy lights, ivy vines, window evening glows, and cat on fence.
 */

import { YARD_THEMES } from './procedural_world.js';

export class MapRenderer {
  constructor(width = 960, height = 540, chunkSize = 960) {
    this.width = width;
    this.height = height;
    this.chunkSize = chunkSize;
    this.time = 0;
    this.survivalSeconds = 0;

    // Drifting clouds
    this.clouds = [
      { x: 120, y: 35, scale: 0.85, speed: 8 },
      { x: 380, y: 20, scale: 1.15, speed: 12 },
      { x: 680, y: 45, scale: 0.75, speed: 10 },
      { x: 890, y: 25, scale: 0.95, speed: 14 }
    ];

    // Flying bird
    this.bird = {
      x: -50,
      y: 60,
      speed: 45,
      flapTime: 0
    };

    // Fence Cat
    this.cat = {
      x: 320,
      y: 195,
      speed: 12,
      facing: 1
    };
  }

  update(dt, survivalSeconds = 0) {
    this.time += dt;
    this.survivalSeconds = survivalSeconds;

    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      cloud.x += cloud.speed * dt;
      if (cloud.x > this.width + 120) {
        cloud.x = -120;
        cloud.y = Math.random() * 60 + 15;
      }
    }

    this.bird.x += this.bird.speed * dt;
    this.bird.flapTime += dt * 10;
    if (this.bird.x > this.width + 100) {
      this.bird.x = -80;
      this.bird.y = Math.random() * 70 + 30;
      this.bird.speed = Math.random() * 30 + 35;
    }

    // Cat strolling slowly along the fence
    this.cat.x += this.cat.speed * this.cat.facing * dt;
    if (this.cat.x > 850) {
      this.cat.facing = -1;
    } else if (this.cat.x < 150) {
      this.cat.facing = 1;
    }
  }

  resetRunState() {
    this.time = 0;
    this.survivalSeconds = 0;
    const cloudStarts = [
      { x: 120, y: 35 },
      { x: 380, y: 20 },
      { x: 680, y: 45 },
      { x: 890, y: 25 },
    ];
    this.clouds.forEach((cloud, index) => Object.assign(cloud, cloudStarts[index]));
    Object.assign(this.bird, { x: -50, y: 60, speed: 45, flapTime: 0 });
    Object.assign(this.cat, { x: 320, y: 195, speed: 12, facing: 1 });
  }

  // 1. Dynamic Time-of-Day Parallax Sky & Distant Mountain Layers
  drawSkyAndSun(ctx, camX = 0) {
    const t = this.survivalSeconds;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.75);

    if (t < 60) {
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.4, '#38bdf8');
      skyGrad.addColorStop(0.8, '#bae6fd');
      skyGrad.addColorStop(1, '#e0f2fe');
    } else if (t < 130) {
      skyGrad.addColorStop(0, '#c2410c');
      skyGrad.addColorStop(0.35, '#ea580c');
      skyGrad.addColorStop(0.7, '#f59e0b');
      skyGrad.addColorStop(1, '#fde68a');
    } else {
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.4, '#1e1b4b');
      skyGrad.addColorStop(0.75, '#3730a3');
      skyGrad.addColorStop(1, '#818cf8');
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Layer 1: Distant Layered Mountains & Ridges (0.04x Parallax)
    this.drawDistantHills(ctx, camX);

    // Sun / Moon with Atmospheric Corona Glow
    const sunX = 110 - (camX * 0.05) % this.width;
    this.drawSun(ctx, sunX < 0 ? sunX + this.width : sunX, 65);

    // Drifting Volumetric Clouds (0.12x Parallax)
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      const cx = (c.x - camX * 0.12) % (this.width + 240);
      this.drawCloud(ctx, cx < -120 ? cx + this.width + 240 : cx, c.y, c.scale);
    }

    this.drawBird(ctx);
  }

  drawDistantHills(ctx, camX) {
    ctx.save();
    const isNight = this.survivalSeconds > 130;
    const isSunset = this.survivalSeconds > 60 && !isNight;

    // Back Ridge
    ctx.fillStyle = isNight ? '#1e1b4b' : (isSunset ? '#7c2d12' : '#0369a1');
    ctx.globalAlpha = 0.35;
    const backOffset = (camX * 0.02) % 600;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.42);
    for (let x = -600; x < this.width + 600; x += 150) {
      const hx = x - backOffset;
      const hy = 140 + Math.sin((x / 600) * Math.PI * 2) * 45;
      ctx.quadraticCurveTo(hx + 75, hy - 40, hx + 150, hy);
    }
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();

    // Foreground Ridge with Tree Silhouettes
    ctx.fillStyle = isNight ? '#0f172a' : (isSunset ? '#9a3412' : '#0284c7');
    ctx.globalAlpha = 0.45;
    const hillOffset = (camX * 0.05) % 480;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.48);
    for (let x = -480; x < this.width + 480; x += 120) {
      const hx = x - hillOffset;
      const hy = 165 + Math.sin((x / 480) * Math.PI * 2 + 1) * 32;
      ctx.quadraticCurveTo(hx + 60, hy - 30, hx + 120, hy);
    }
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 2. World Environment (Picket Fences, Lawns, and Tall 2-Story Architectural Structures)
  drawWorldLayers(ctx, camX = 0, startChunk = -1, endChunk = 1) {
    const fenceY = 210;
    const fenceHeight = 110;
    const groundY = 320;

    for (let cIdx = startChunk; cIdx <= endChunk; cIdx++) {
      const originX = cIdx * this.chunkSize;
      const themeIdx = Math.abs(cIdx) % YARD_THEMES.length;
      const theme = YARD_THEMES[themeIdx];

      // A. Themed Tall 2-Story Architectural Structures (y=20 to 320px)
      if (theme === 'GREENHOUSE') {
        this.drawTallConservatory(ctx, originX);
      } else if (theme === 'PATIO_BBQ') {
        this.drawTallTwoStoryHouse(ctx, originX, cIdx);
      } else if (theme === 'SHED_TRAMPOLINE') {
        this.drawTallLoftedBarn(ctx, originX);
      } else if (theme === 'DOG_PARK') {
        this.drawTallCraftsmanHome(ctx, originX, cIdx);
      }

      // B. Textured Swaying Trees Behind Fence
      this.drawSwayingTreesAt(ctx, originX);

      // C. Illustrated Cedar Privacy Fence
      ctx.save();
      // Horizontal Rails
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.fillRect(originX, fenceY + 22, this.chunkSize, 14);
      ctx.strokeRect(originX, fenceY + 22, this.chunkSize, 14);
      ctx.fillRect(originX, fenceY + 72, this.chunkSize, 14);
      ctx.strokeRect(originX, fenceY + 72, this.chunkSize, 14);

      const plankWidth = 26;
      for (let x = originX; x < originX + this.chunkSize; x += 32) {
        // Cedar Plank with Wood Grain Gradient
        const plankGrad = ctx.createLinearGradient(x, fenceY, x + plankWidth, fenceY);
        plankGrad.addColorStop(0, '#d97706');
        plankGrad.addColorStop(0.7, '#b45309');
        plankGrad.addColorStop(1, '#92400e');

        ctx.fillStyle = plankGrad;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, fenceY + fenceHeight);
        ctx.lineTo(x, fenceY + 12);
        ctx.lineTo(x + plankWidth / 2, fenceY); // Dog-eared pointed top
        ctx.lineTo(x + plankWidth, fenceY + 12);
        ctx.lineTo(x + plankWidth, fenceY + fenceHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wood Grain Fiber Lines
        ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 7, fenceY + 14);
        ctx.lineTo(x + 7, fenceY + fenceHeight - 4);
        ctx.moveTo(x + 18, fenceY + 18);
        ctx.lineTo(x + 18, fenceY + fenceHeight - 4);
        ctx.stroke();

        // Iron Nail Heads
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(x + plankWidth / 2, fenceY + 29, 2.5, 0, Math.PI * 2);
        ctx.arc(x + plankWidth / 2, fenceY + 79, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fairy Lights Warm Glow on Fence
      const lightPulse = Math.sin(this.time * 4) * 0.15 + 0.85;
      ctx.fillStyle = `rgba(250, 204, 21, ${0.45 * lightPulse})`;
      for (let lx = originX + 20; lx < originX + this.chunkSize; lx += 64) {
        ctx.beginPath();
        ctx.arc(lx, fenceY + 22, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(lx, fenceY + 22, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(250, 204, 21, ${0.45 * lightPulse})`;
      }
      ctx.restore();

      // D. Ground, Flagstone Patio & Shaded Lawn
      ctx.save();
      // Flagstone Pavers
      const stoneGrad = ctx.createLinearGradient(originX, groundY, originX + 240, groundY + 80);
      stoneGrad.addColorStop(0, '#94a3b8');
      stoneGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = stoneGrad;
      ctx.fillRect(originX, groundY, 240, this.height - groundY);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(originX, groundY, 240, this.height - groundY);

      // Flagstone Mortar Grout Lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      for (let py = groundY + 28; py < this.height; py += 28) {
        ctx.beginPath();
        ctx.moveTo(originX, py);
        ctx.lineTo(originX + 240, py);
        ctx.stroke();
      }
      for (let px = originX + 35; px < originX + 240; px += 45) {
        ctx.beginPath();
        ctx.moveTo(px, groundY);
        ctx.lineTo(px, this.height);
        ctx.stroke();
      }

      // Shaded Multi-Tone Lawn
      const lawnGrad = ctx.createLinearGradient(0, groundY, 0, this.height);
      lawnGrad.addColorStop(0, '#22c55e');
      lawnGrad.addColorStop(0.3, '#16a34a');
      lawnGrad.addColorStop(0.8, '#15803d');
      lawnGrad.addColorStop(1, '#14532d');
      ctx.fillStyle = lawnGrad;
      ctx.fillRect(originX + 240, groundY, this.chunkSize - 240, this.height - groundY);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(originX + 240, groundY, this.chunkSize - 240, this.height - groundY);

      // Detailed Grass Blade Tufts
      const grassSway = Math.sin(this.time * 2.5) * 3.5;
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2.2;
      for (let gx = originX + 250; gx < originX + this.chunkSize - 20; gx += 38) {
        ctx.beginPath();
        ctx.moveTo(gx, groundY + 2);
        ctx.quadraticCurveTo(gx - 2, groundY - 6, gx - 5 + grassSway, groundY - 12);
        ctx.moveTo(gx + 4, groundY + 2);
        ctx.quadraticCurveTo(gx + 6, groundY - 6, gx + 6 + grassSway, groundY - 14);
        ctx.moveTo(gx + 8, groundY + 2);
        ctx.quadraticCurveTo(gx + 10, groundY - 4, gx + 12 + grassSway, groundY - 9);
        ctx.stroke();
      }

      // Soil Sub-layer
      ctx.fillStyle = '#451a03';
      ctx.fillRect(originX, this.height - 18, this.chunkSize, 18);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(originX, this.height - 18, this.chunkSize, 18);
      ctx.restore();
    }

    // E. Draw Fence Cat
    this.drawCatOnFence(ctx);
  }

  drawCatOnFence(ctx) {
    ctx.save();
    ctx.translate(this.cat.x, this.cat.y);
    ctx.scale(this.cat.facing, 1);

    // Black / Tuxedo Cat
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head & Ears
    ctx.beginPath();
    ctx.arc(8, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -8);
    ctx.lineTo(8, -12);
    ctx.lineTo(11, -8);
    ctx.closePath();
    ctx.fill();

    // Tail
    const tailWag = Math.sin(this.time * 4) * 0.3;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.quadraticCurveTo(-16, -12 + tailWag * 10, -14, -16);
    ctx.stroke();

    // Glowing Yellow Eyes
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(9, -4, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // TALL 2-STORY ARCHITECTURAL STRUCTURES (y = 20 to 320px)
  // =========================================================================
  drawTallConservatory(ctx, originX) {
    ctx.save();
    // 2-Story Conservatory Base Wall (x: 685 to 895, y: 40 to 320)
    ctx.fillStyle = '#14532d';
    ctx.fillRect(originX + 685, 95, 210, 225);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(originX + 685, 95, 210, 225);

    // Interior Foliage & Tomato Vines
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(originX + 725, 260, 32, 0, Math.PI * 2);
    ctx.arc(originX + 785, 270, 38, 0, Math.PI * 2);
    ctx.arc(originX + 845, 260, 32, 0, Math.PI * 2);
    ctx.fill();

    // Red Ripe Tomatoes
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(originX + 735, 245, 6, 0, Math.PI * 2);
    ctx.arc(originX + 785, 260, 7, 0, Math.PI * 2);
    ctx.arc(originX + 835, 250, 6, 0, Math.PI * 2);
    ctx.fill();

    // Creeping Ivy Vines climbing up wall
    const vineSway = Math.sin(this.time * 1.5) * 2;
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(originX + 695, 310);
    ctx.quadraticCurveTo(originX + 690 + vineSway, 220, originX + 700, 120);
    ctx.stroke();

    // Tall Peaked Timber Roof (y = 35 to 95)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(originX + 680, 95);
    ctx.lineTo(originX + 790, 35);
    ctx.lineTo(originX + 900, 95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Timber Mullion Beams framing the windows
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(originX + 790, 35);
    ctx.lineTo(originX + 790, 320);
    ctx.moveTo(originX + 685, 140);
    ctx.lineTo(originX + 895, 140);
    ctx.moveTo(originX + 685, 185);
    ctx.lineTo(originX + 895, 185);
    ctx.stroke();

    ctx.restore();
  }

  drawTallTwoStoryHouse(ctx, originX, chunkIdx) {
    ctx.save();
    // Tall 2-Story Brick House (x: 710 to 950, y: 20 to 320)
    ctx.fillStyle = '#fde68a';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.fillRect(originX + 710, 45, 230, 275);
    ctx.strokeRect(originX + 710, 45, 230, 275);

    // Brick Texture Lines with staggered mortar
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
    ctx.lineWidth = 1.8;
    for (let y = 60; y < 320; y += 20) {
      ctx.beginPath();
      ctx.moveTo(originX + 715, y);
      ctx.lineTo(originX + 935, y);
      ctx.stroke();
    }

    // Roof Gable (y = 5 to 45)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(originX + 695, 45);
    ctx.lineTo(originX + 825, 5);
    ctx.lineTo(originX + 955, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Roof Shingles
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 2;
    for (let sy = 16; sy < 45; sy += 9) {
      const wRatio = (sy - 5) / 40;
      ctx.beginPath();
      ctx.moveTo(originX + 825 - wRatio * 120, sy);
      ctx.lineTo(originX + 825 + wRatio * 120, sy);
      ctx.stroke();
    }

    // Chimney with Masonry Bricks & Smoke Rings
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(originX + 895, 10, 24, 35);
    ctx.strokeRect(originX + 895, 10, 24, 35);
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(originX + 893, 7, 28, 5);

    const smokeY = (this.time * 24) % 45;
    ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.beginPath();
    ctx.arc(originX + 907, 2 - smokeY, 5 + smokeY * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Upper Floor Separation Trim Line
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(originX + 710, 145, 230, 8);
    ctx.strokeRect(originX + 710, 145, 230, 8);

    ctx.restore();
  }

  drawTallLoftedBarn(ctx, originX) {
    ctx.save();
    // Tall Cedar Barn / Tool Loft (x: 735 to 875, y: 35 to 320)
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.fillRect(originX + 735, 75, 140, 245);
    ctx.strokeRect(originX + 735, 75, 140, 245);

    // Tall Peaked Gambrel Roof
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(originX + 725, 75);
    ctx.lineTo(originX + 805, 30);
    ctx.lineTo(originX + 885, 75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Board-and-Batten Siding Lines
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.2;
    for (let x = originX + 750; x < originX + 870; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 75);
      ctx.lineTo(x, 320);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTallCraftsmanHome(ctx, originX, chunkIdx) {
    ctx.save();
    // Tall 2-Story Craftsman Home on Right (x: 710 to 950, y: 30 to 320)
    const wallGrad = ctx.createLinearGradient(originX + 710, 50, originX + 940, 320);
    wallGrad.addColorStop(0, '#fed7aa');
    wallGrad.addColorStop(1, '#fdba74');

    ctx.fillStyle = wallGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.fillRect(originX + 710, 50, 230, 270);
    ctx.strokeRect(originX + 710, 50, 230, 270);

    // Horizontal Cedar Lap Siding Planks with Drop Shadow
    ctx.strokeStyle = 'rgba(154, 52, 18, 0.35)';
    ctx.lineWidth = 1.8;
    for (let y = 65; y < 320; y += 18) {
      ctx.beginPath();
      ctx.moveTo(originX + 715, y);
      ctx.lineTo(originX + 935, y);
      ctx.stroke();
    }

    // Roof Gable (y = 10 to 50)
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(originX + 695, 50);
    ctx.lineTo(originX + 825, 10);
    ctx.lineTo(originX + 955, 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Architectural Roof Shingles
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 2;
    for (let sy = 20; sy < 50; sy += 9) {
      const wRatio = (sy - 10) / 40;
      ctx.beginPath();
      ctx.moveTo(originX + 825 - wRatio * 120, sy);
      ctx.lineTo(originX + 825 + wRatio * 120, sy);
      ctx.stroke();
    }

    // Upper Trim Line & Gable Vent
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(originX + 710, 145, 230, 8);
    ctx.strokeRect(originX + 710, 145, 230, 8);

    // Attic Gable Louver Vent
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(originX + 825, 36, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawSwayingTreesAt(ctx, originX) {
    ctx.save();
    const treeSway = Math.sin(this.time * 1.6) * 4;

    // Realistic Tree Trunk with Bark Texture & Branch Forks
    const trunkX = originX + 495;
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(trunkX - 16, 280);
    ctx.quadraticCurveTo(trunkX - 12, 210, trunkX - 8 + treeSway * 0.4, 155);
    // Left Branch Fork
    ctx.lineTo(trunkX - 22 + treeSway * 0.5, 135);
    ctx.lineTo(trunkX - 14 + treeSway * 0.5, 135);
    ctx.lineTo(trunkX - 2 + treeSway * 0.4, 150);
    // Right Branch Fork
    ctx.lineTo(trunkX + 16 + treeSway * 0.5, 138);
    ctx.lineTo(trunkX + 22 + treeSway * 0.5, 138);
    ctx.lineTo(trunkX + 6 + treeSway * 0.4, 155);
    ctx.quadraticCurveTo(trunkX + 12, 210, trunkX + 18, 280);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bark Grooves & Grain
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(trunkX - 5, 270);
    ctx.lineTo(trunkX - 3 + treeSway * 0.3, 175);
    ctx.moveTo(trunkX + 5, 265);
    ctx.lineTo(trunkX + 4 + treeSway * 0.3, 180);
    ctx.stroke();

    // Organic Shaded Foliage Canopy (Unified Silhouette)
    const cx = originX + 498 + treeSway;
    const cy = 152;

    // 1. Deep Leaf Silhouette Base
    ctx.fillStyle = '#14532d';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 72, 54, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Midtone Foliage Lobe Clusters (Fill only, no intersecting wireframes)
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(cx - 32, cy + 8, 38, 0, Math.PI * 2);
    ctx.arc(cx + 32, cy + 10, 36, 0, Math.PI * 2);
    ctx.arc(cx, cy - 14, 46, 0, Math.PI * 2);
    ctx.arc(cx - 16, cy - 22, 32, 0, Math.PI * 2);
    ctx.arc(cx + 18, cy - 20, 34, 0, Math.PI * 2);
    ctx.fill();

    // 3. Sunlit Highlights on Canopy Top
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(cx - 18, cy - 28, 22, 0, Math.PI * 2);
    ctx.arc(cx + 14, cy - 26, 24, 0, Math.PI * 2);
    ctx.arc(cx - 36, cy - 6, 18, 0, Math.PI * 2);
    ctx.arc(cx + 34, cy - 4, 16, 0, Math.PI * 2);
    ctx.fill();

    // 4. Subtle Leaf Accent Blobs
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.arc(cx - 14, cy - 34, 8, 0, Math.PI * 2);
    ctx.arc(cx + 12, cy - 32, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawSun(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    const isSunset = this.survivalSeconds > 60 && this.survivalSeconds <= 130;
    const isNight = this.survivalSeconds > 130;

    if (isNight) {
      // Crescent Moon
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a'; // Shadow cutout
      ctx.beginPath();
      ctx.arc(7, -4, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Atmospheric Solar Flare Corona
    const coronaGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 68);
    coronaGrad.addColorStop(0, isSunset ? 'rgba(251, 146, 60, 0.65)' : 'rgba(254, 240, 138, 0.7)');
    coronaGrad.addColorStop(0.5, isSunset ? 'rgba(249, 115, 22, 0.25)' : 'rgba(250, 204, 21, 0.3)');
    coronaGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');

    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.fill();

    // Sun Core
    const sunGrad = ctx.createRadialGradient(-8, -8, 6, 0, 0, 32);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.5, isSunset ? '#fb923c' : '#fde047');
    sunGrad.addColorStop(1, isSunset ? '#ea580c' : '#eab308');

    ctx.fillStyle = sunGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawCloud(ctx, x, y, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const isSunset = this.survivalSeconds > 60 && this.survivalSeconds <= 130;
    ctx.fillStyle = isSunset ? '#fef3c7' : '#ffffff';
    ctx.strokeStyle = isSunset ? '#fde68a' : '#cbd5e1';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.arc(22, -6, 18, 0, Math.PI * 2);
    ctx.arc(40, 2, 20, 0, Math.PI * 2);
    ctx.arc(20, 12, 18, 0, Math.PI * 2);
    ctx.arc(-16, 8, 16, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawBird(ctx) {
    ctx.save();
    ctx.translate(this.bird.x, this.bird.y);
    const wingY = Math.sin(this.bird.flapTime) * 6;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, wingY);
    ctx.quadraticCurveTo(-5, -6, 0, 0);
    ctx.quadraticCurveTo(5, -6, 10, wingY);
    ctx.stroke();
    ctx.restore();
  }

  // Draw Props across all active chunks
  drawProps(ctx, props) {
    for (let i = 0; i < props.length; i++) {
      const body = props[i];
      if (!body || body.isDestroyed || body.isShard) continue;

      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);

      const bounds = body.bounds;
      const w = bounds.max.x - bounds.min.x;
      const h = bounds.max.y - bounds.min.y;

      if (body.label === 'destructible_window') {
        this.drawWindow(ctx, w, h);
      } else if (body.label === 'destructible_greenhouse') {
        this.drawGreenhousePane(ctx, w, h);
      } else if (body.label === 'destructible_grill') {
        this.drawBBQGrill(ctx, w, h);
      } else if (body.label === 'destructible_flowerpot') {
        this.drawFlowerpot(ctx, w, h);
      } else if (body.label === 'destructible_gnome') {
        this.drawGnome(ctx, w, h);
      } else if (body.label === 'destructible_trashcan') {
        this.drawTrashCan(ctx, w, h);
      } else if (body.label === 'solid_doghouse') {
        this.drawDoghouse(ctx, w, h);
      } else if (body.label === 'solid_trampoline') {
        this.drawTrampoline(ctx, w, h);
      } else if (body.label === 'solid_table') {
        this.drawPatioTable(ctx, w, h);
      } else if (body.label === 'solid_bicycle') {
        this.drawBicycle(ctx, w, h);
      }

      ctx.restore();
    }
  }

  drawWindow(ctx, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // Warm evening glow inside window when twilight
    if (this.survivalSeconds > 80) {
      ctx.fillStyle = '#fde047';
    } else {
      ctx.fillStyle = '#38bdf8';
    }
    ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 4);
    ctx.lineTo(0, h / 2 - 4);
    ctx.moveTo(-w / 2 + 4, 0);
    ctx.lineTo(w / 2 - 4, 0);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 4, -h / 3);
    ctx.lineTo(w / 4, h / 3);
    ctx.stroke();
  }

  drawGreenhousePane(ctx, w, h) {
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    ctx.fillStyle = 'rgba(186, 230, 253, 0.8)';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 3, -h / 3);
    ctx.lineTo(w / 3, h / 3);
    ctx.stroke();
  }

  drawBBQGrill(ctx, w, h) {
    // Kettle Upper Lid & Bowl with Metallic Gloss
    const grillGrad = ctx.createRadialGradient(-4, -14, 2, 0, -8, 24);
    grillGrad.addColorStop(0, '#334155');
    grillGrad.addColorStop(0.7, '#0f172a');
    grillGrad.addColorStop(1, '#020617');

    ctx.fillStyle = grillGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -8, 22, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Chrome Top Handle
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, -27);
    ctx.lineTo(7, -27);
    ctx.stroke();

    // Bottom Bowl
    ctx.fillStyle = grillGrad;
    ctx.beginPath();
    ctx.arc(0, -6, 22, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red Temperature Control Dial
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Charcoal Ember Seam
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-18, -8, 36, 2.5);

    // Tripod Tubular Legs
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, 14);
    ctx.lineTo(-18, 28);
    ctx.moveTo(12, 14);
    ctx.lineTo(18, 28);
    ctx.moveTo(0, 14);
    ctx.lineTo(0, 28);
    ctx.stroke();

    // Wheels
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-18, 28, 4, 0, Math.PI * 2);
    ctx.arc(18, 28, 4, 0, Math.PI * 2);
    ctx.fill();

    // Wisps of BBQ smoke
    const smokeWisp = Math.sin(this.time * 4) * 3;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.beginPath();
    ctx.arc(smokeWisp, -34, 4, 0, Math.PI * 2);
    ctx.arc(smokeWisp * 1.4, -44, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFlowerpot(ctx, w, h) {
    // Terracotta Pot Base with Clay Gradient
    const potGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    potGrad.addColorStop(0, '#ea580c');
    potGrad.addColorStop(0.6, '#c2410c');
    potGrad.addColorStop(1, '#9a3412');

    ctx.fillStyle = potGrad;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 3, -h / 2 + 7);
    ctx.lineTo(w / 2 - 3, -h / 2 + 7);
    ctx.lineTo(w / 2 - 7, h / 2);
    ctx.lineTo(-w / 2 + 7, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Decorative Molded Clay Rim
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.roundRect(-w / 2 - 1, -h / 2, w + 2, 9, 3);
    ctx.fill();
    ctx.stroke();

    // Dark Loam Potting Soil
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.ellipse(0, -h / 2 + 2, w / 2 - 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Green Foliage Leaves
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(-w / 3, -h / 2 - 2, 7, 4, -0.4, 0, Math.PI * 2);
    ctx.ellipse(w / 3, -h / 2 - 2, 7, 4, 0.4, 0, Math.PI * 2);
    ctx.ellipse(0, -h / 2 - 4, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blooming Vibrant Petunias & Marigolds
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(-w / 4, -h / 2 - 6, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(w / 4, -h / 2 - 6, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(0, -h / 2 - 11, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // Golden Flower Stamens
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-w / 4, -h / 2 - 6, 2.5, 0, Math.PI * 2);
    ctx.arc(0, -h / 2 - 11, 3, 0, Math.PI * 2);
    ctx.arc(w / 4, -h / 2 - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGnome(ctx, w, h) {
    // Pointy Red Cap with Cloth Fold
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(2, -h / 2 - 4);
    ctx.quadraticCurveTo(w / 2 + 2, -h / 4, w / 2 - 1, -h / 8);
    ctx.lineTo(-w / 2 + 1, -h / 8);
    ctx.quadraticCurveTo(-w / 2 + 2, -h / 4, 2, -h / 2 - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rosy Cheeks & Face
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -h / 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rosy Button Nose
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(0, -h / 12 + 1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Full Fluffy White Beard
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -h / 12 + 3);
    ctx.quadraticCurveTo(-12, 8, 0, 14);
    ctx.quadraticCurveTo(12, 8, 10, -h / 12 + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Blue Coat Tunic
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(-w / 3, 6, (w * 2) / 3, 14, 2);
    ctx.fill();
    ctx.stroke();

    // Leather Belt & Golden Buckle
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-w / 3, 14, (w * 2) / 3, 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3.5, 13, 7, 6);

    // Black Ceramic Boots
    ctx.fillStyle = '#020617';
    ctx.fillRect(-w / 3 - 1, 20, (w * 2) / 3 + 2, 6);
  }

  drawTrashCan(ctx, w, h) {
    // Ribbed Galvanized Steel Barrel
    const metalGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    metalGrad.addColorStop(0, '#64748b');
    metalGrad.addColorStop(0.4, '#cbd5e1');
    metalGrad.addColorStop(1, '#475569');

    ctx.fillStyle = metalGrad;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + 6, w, h - 6, 2);
    ctx.fill();
    ctx.stroke();

    // Embossed Fluted Ribs on Can Body
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    for (let rx = -w / 2 + 7; rx < w / 2 - 3; rx += 7) {
      ctx.beginPath();
      ctx.moveTo(rx, -h / 2 + 9);
      ctx.lineTo(rx, h / 2 - 3);
      ctx.stroke();
    }

    // Steel Lid with Top Handle
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(-w / 2 - 3, -h / 2, w + 6, 9, 3);
    ctx.fill();
    ctx.stroke();

    // Drop Handle
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, -h / 2 - 3);
    ctx.lineTo(6, -h / 2 - 3);
    ctx.stroke();
  }

  drawTrampoline(ctx, w, h) {
    // Blue Reinforced Padded Perimeter Ring
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, 11, 4);
    ctx.fill();
    ctx.stroke();

    // High-Tension Woven Jump Mat
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 8, -h / 2 + 2, w - 16, 7, 2);
    ctx.fill();

    // High-Tension Springs
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    for (let sx = -w / 2 + 10; sx < w / 2 - 8; sx += 10) {
      ctx.beginPath();
      ctx.moveTo(sx, -h / 2 + 11);
      ctx.lineTo(sx + 2.5, -h / 2 + 15);
      ctx.lineTo(sx + 5, -h / 2 + 11);
      ctx.stroke();
    }

    // Tubular Steel Legs
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 12, -h / 2 + 11);
    ctx.lineTo(-w / 2 + 8, h / 2);
    ctx.moveTo(w / 2 - 12, -h / 2 + 11);
    ctx.lineTo(w / 2 - 8, h / 2);
    ctx.moveTo(0, -h / 2 + 11);
    ctx.lineTo(0, h / 2);
    ctx.stroke();
  }

  drawDoghouse(ctx, w, h) {
    // Cedar Wood Plank Siding with Warm Wood Grain
    ctx.fillStyle = '#d97706';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 4, w, (h * 3) / 4, 2);
    ctx.fill();
    ctx.stroke();

    // Horizontal Lap Siding Seams
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(w / 2, 0);
    ctx.moveTo(-w / 2, 14);
    ctx.lineTo(w / 2, 14);
    ctx.stroke();

    // Pitched Gable Cedar Shingle Roof
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 7, -h / 4 + 2);
    ctx.lineTo(0, -h / 2 - 8);
    ctx.lineTo(w / 2 + 7, -h / 4 + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Arched Kennel Doorway
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 10, 13, Math.PI, 0);
    ctx.lineTo(13, h / 2);
    ctx.lineTo(-13, h / 2);
    ctx.closePath();
    ctx.fill();

    // Bone Nameplate "BUSTER"
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-15, -19, 30, 9, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 6.5px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTER', 0, -12.5);

    // Dog Bowl with Biscuits on Lawn
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(w / 2 - 6, h / 2 - 2, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(w / 2 - 8, h / 2 - 5, 4, 2);
  }

  drawPatioTable(ctx, w, h) {
    // Glass Tabletop with Cyan Specular Shimmer
    ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, 10, 3);
    ctx.fill();
    ctx.stroke();

    // Specular Reflection Streak
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 3, -h / 2 + 3);
    ctx.lineTo(w / 3, -h / 2 + 7);
    ctx.stroke();

    // Wrought-Iron Curved Legs
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 8, -h / 2 + 10);
    ctx.lineTo(-w / 2 + 14, h / 2);
    ctx.moveTo(w / 2 - 8, -h / 2 + 10);
    ctx.lineTo(w / 2 - 14, h / 2);
    ctx.stroke();
  }

  drawBicycle(ctx, w, h) {
    // Vintage Red Curved Cruiser Frame
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-18, 12);
    ctx.lineTo(0, -7);
    ctx.lineTo(16, 12);
    ctx.lineTo(-4, 12);
    ctx.closePath();
    ctx.stroke();

    // Wire-Spoke Rubber Wheels
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-18, 12, 12, 0, Math.PI * 2);
    ctx.arc(16, 12, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Spokes
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-18, 0); ctx.lineTo(-18, 24);
    ctx.moveTo(-30, 12); ctx.lineTo(-6, 12);
    ctx.moveTo(16, 0); ctx.lineTo(16, 24);
    ctx.moveTo(4, 12); ctx.lineTo(28, 12);
    ctx.stroke();

    // Chrome Handlebars
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4, -18);
    ctx.moveTo(-1, -18);
    ctx.lineTo(9, -18);
    ctx.stroke();

    // Brown Leather Spring Saddle
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-12, -11, 12, 4.5, 2);
    ctx.fill();
    ctx.stroke();
  }
}
