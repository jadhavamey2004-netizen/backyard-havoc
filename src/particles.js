/**
 * High-Performance Particle & Visual Effects Engine for Backyard Havoc
 * Features concentric impact shockwaves, chromatic hit-freeze frame bursts,
 * multi-tier combo trails (white -> flame -> plasma -> rainbow), vignette flashes,
 * power shot charging aura beams, confetti yard clear fireworks, and anime sprint lines.
 */

export class ParticleSystem {
  constructor(maxParticles = 400) {
    this.particles = [];
    this.popTexts = [];
    this.shockwaves = [];
    this.speedLines = [];
    this.lightningArcs = [];
    this.trailPoints = [];
    this.impactRings = [];
    this.vignettes = [];
    this.powerBeams = [];
    this.maxParticles = maxParticles;

    // Hit-stop is measured in simulation seconds rather than render-frame count.
    this.hitStopRemainingSeconds = 0;
  }

  triggerHitStop(durationSeconds = 0) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
    this.hitStopRemainingSeconds = Math.max(this.hitStopRemainingSeconds, durationSeconds);
  }

  consumeHitStop(frameSeconds) {
    const elapsed = Math.max(0, Number.isFinite(frameSeconds) ? frameSeconds : 0);
    const stopped = Math.min(elapsed, this.hitStopRemainingSeconds);
    this.hitStopRemainingSeconds = Math.max(0, this.hitStopRemainingSeconds - stopped);
    return elapsed - stopped;
  }

  clearHitStop() {
    this.hitStopRemainingSeconds = 0;
  }

  spawnImpactRings(x, y, count = 3, color = '#facc15') {
    if (this.impactRings.length > 25) return;
    for (let i = 0; i < count; i++) {
      this.impactRings.push({
        x,
        y,
        radius: 8 + i * 10,
        maxRadius: 55 + i * 22,
        color,
        lineWidth: 3.5 - i * 0.8,
        life: 0.32 + i * 0.06,
        maxLife: 0.32 + i * 0.06
      });
    }
  }

  spawnVignetteFlash(color = 'rgba(239, 68, 68, 0.35)', duration = 0.35) {
    if (this.vignettes.length > 6) return;
    this.vignettes.push({
      color,
      life: duration,
      maxLife: duration
    });
  }

  spawnPowerBeam(x, y, charge = 0.5) {
    if (this.powerBeams.length > 8) return;
    this.powerBeams.push({
      x,
      y,
      charge,
      width: Math.max(12, charge * 34),
      life: 0.18,
      maxLife: 0.18
    });
  }

  spawnYardClearFireworks(cx, cy) {
    const colors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#c084fc'];
    for (let i = 0; i < 55; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 9 + 4;
      const col = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 3,
        size: Math.random() * 5 + 3,
        color: col,
        alpha: 1.0,
        life: 1.6,
        maxLife: 1.6,
        gravity: 0.22,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }
    this.spawnPopText(cx, cy - 60, '🏆 YARD COMPLETED! +1000', '#facc15', 30);
  }

  spawnSprintLines(x, y, facing = 1) {
    for (let i = 0; i < 4; i++) {
      this.speedLines.push({
        cx: x - facing * (Math.random() * 25 + 15),
        cy: y - 10 + (Math.random() - 0.5) * 30,
        angle: facing > 0 ? Math.PI : 0,
        innerDist: 0,
        outerDist: Math.random() * 35 + 20,
        color: 'rgba(255, 255, 255, 0.75)',
        lineWidth: Math.random() * 2 + 1.2,
        life: 0.16,
        maxLife: 0.16
      });
    }
  }

  spawnAnimeSpeedLines(cx, cy, count = 18, color = 'rgba(255, 255, 255, 0.85)') {
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + (Math.random() - 0.5) * 0.15;
      const innerDist = Math.random() * 40 + 30;
      const outerDist = innerDist + Math.random() * 80 + 90;
      this.speedLines.push({
        cx,
        cy,
        angle,
        innerDist,
        outerDist,
        color,
        lineWidth: Math.random() * 3 + 1.5,
        life: 0.25,
        maxLife: 0.25
      });
    }
  }

  spawnShockwave(x, y, maxRadius = 70, color = '#38bdf8', lineWidth = 4.5) {
    if (this.shockwaves.length > 20) return;
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius,
      color,
      lineWidth,
      alpha: 1.0,
      life: 0.35,
      maxLife: 0.35
    });
  }

  spawnLightningArc(x, y, radius = 24, count = 3) {
    if (this.lightningArcs.length > 30) return;
    for (let i = 0; i < count; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = angle1 + (Math.random() - 0.5) * 1.5;
      const p1 = { x: x + Math.cos(angle1) * radius, y: y + Math.sin(angle1) * radius };
      const p2 = { x: x + Math.cos(angle2) * (radius * 1.5), y: y + Math.sin(angle2) * (radius * 1.5) };
      const mid = {
        x: (p1.x + p2.x) * 0.5 + (Math.random() - 0.5) * 16,
        y: (p1.y + p2.y) * 0.5 + (Math.random() - 0.5) * 16
      };
      this.lightningArcs.push({
        p1,
        p2,
        mid,
        color: Math.random() > 0.5 ? '#38bdf8' : '#c084fc',
        life: 0.12,
        maxLife: 0.12
      });
    }
  }

  spawnDebris(x, y, count = 20, color = '#bae6fd', speed = 8, isGlass = false) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.8 + 0.3) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 2,
        size: Math.random() * (isGlass ? 5 : 6) + 2,
        color,
        alpha: 1.0,
        life: Math.random() * 0.6 + 0.4,
        maxLife: 1.0,
        gravity: 0.35,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        isGlass
      });
    }
  }

  spawnFire(x, y, count = 15) {
    if (this.particles.length > this.maxParticles) return;

    const fireColors = ['#facc15', '#f97316', '#ef4444', '#7f1d1d'];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const spd = Math.random() * 6 + 2;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 8 + 4,
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        alpha: 1.0,
        life: Math.random() * 0.5 + 0.3,
        maxLife: 0.8,
        gravity: -0.1,
        isFire: true
      });
    }
  }

  spawnDust(x, y, count = 3) {
    if (this.particles.length > this.maxParticles) return;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.8 - 0.5,
        size: Math.random() * 4 + 2,
        color: 'rgba(203, 213, 225, 0.6)',
        alpha: 0.7,
        life: 0.35,
        maxLife: 0.35,
        gravity: 0.05
      });
    }
  }

  spawnPopText(x, y, text, color = '#facc15', size = 20) {
    if (this.popTexts.length > 30) {
      this.popTexts.shift();
    }
    this.popTexts.push({
      x,
      y,
      text,
      color,
      size,
      vy: -2.2,
      alpha: 1.0,
      scale: 1.35,
      life: 1.1,
      maxLife: 1.1
    });
  }

  clear() {
    this.particles = [];
    this.popTexts = [];
    this.shockwaves = [];
    this.speedLines = [];
    this.lightningArcs = [];
    this.trailPoints = [];
    this.impactRings = [];
    this.vignettes = [];
    this.powerBeams = [];
    this.clearHitStop();
  }

  addTrailPoint(pos, color = '#38bdf8', size = 6, combo = 1) {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;

    // Dynamic color tier per combo
    let trailColor = color;
    if (combo >= 10) {
      const rainbow = ['#ef4444', '#f97316', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];
      trailColor = rainbow[Math.floor(Date.now() / 60) % rainbow.length];
    } else if (combo >= 7) {
      trailColor = '#38bdf8'; // Electric blue
    } else if (combo >= 4) {
      trailColor = '#f97316'; // Vivid orange flame
    }

    this.trailPoints.unshift({
      x: pos.x,
      y: pos.y,
      color: trailColor,
      size,
      alpha: 0.85
    });

    // Hard cap at 60 trail points
    if (this.trailPoints.length > 60) {
      this.trailPoints.pop();
    }
  }

  update(dt) {
    // 1. Trail Points Decay
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const tp = this.trailPoints[i];
      tp.alpha -= dt * 3.0;
      tp.size *= 0.94;
      if (tp.alpha <= 0 || tp.size < 0.5) {
        this.trailPoints.splice(i, 1);
      }
    }

    // 2. Impact Rings
    for (let i = this.impactRings.length - 1; i >= 0; i--) {
      const ring = this.impactRings[i];
      ring.life -= dt;
      ring.radius += (ring.maxRadius - ring.radius) * 6.5 * dt;
      if (ring.life <= 0) {
        this.impactRings.splice(i, 1);
      }
    }

    // 3. Power Beams
    for (let i = this.powerBeams.length - 1; i >= 0; i--) {
      const beam = this.powerBeams[i];
      beam.life -= dt;
      if (beam.life <= 0) {
        this.powerBeams.splice(i, 1);
      }
    }

    // 4. Vignette Flashes
    for (let i = this.vignettes.length - 1; i >= 0; i--) {
      const vig = this.vignettes[i];
      vig.life -= dt;
      if (vig.life <= 0) {
        this.vignettes.splice(i, 1);
      }
    }

    // 5. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity || 0;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.rotSpeed) p.rot += p.rotSpeed * dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 6. Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      sw.radius += (sw.maxRadius - sw.radius) * 8.5 * dt;
      sw.alpha = Math.max(0, sw.life / sw.maxLife);
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 7. Pop Texts
    for (let i = this.popTexts.length - 1; i >= 0; i--) {
      const pt = this.popTexts[i];
      pt.life -= dt;
      pt.y += pt.vy;
      pt.vy *= 0.94;
      pt.scale = Math.max(1.0, pt.scale - dt * 1.5);
      pt.alpha = Math.max(0, pt.life / pt.maxLife);
      if (pt.life <= 0) {
        this.popTexts.splice(i, 1);
      }
    }

    // 8. Speed Lines
    for (let i = this.speedLines.length - 1; i >= 0; i--) {
      const sl = this.speedLines[i];
      sl.life -= dt;
      if (sl.life <= 0) {
        this.speedLines.splice(i, 1);
      }
    }

    // 9. Lightning Arcs
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      const arc = this.lightningArcs[i];
      arc.life -= dt;
      if (arc.life <= 0) {
        this.lightningArcs.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // 1. Trail Line
    if (this.trailPoints.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < this.trailPoints.length - 1; i++) {
        const p1 = this.trailPoints[i];
        const p2 = this.trailPoints[i + 1];
        if (!p1 || !p2) continue;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        // Skip large teleport/leap gaps to prevent crossing lines across the screen
        if (Math.hypot(dx, dy) > 75) continue;

        ctx.strokeStyle = p1.color;
        ctx.globalAlpha = p1.alpha * 0.7;
        ctx.lineWidth = p1.size;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Impact Rings
    if (this.impactRings.length > 0) {
      for (let i = 0; i < this.impactRings.length; i++) {
        const ring = this.impactRings[i];
        const progress = 1 - ring.life / ring.maxLife;
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.lineWidth;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 3. Shockwaves
    if (this.shockwaves.length > 0) {
      for (let i = 0; i < this.shockwaves.length; i++) {
        const sw = this.shockwaves[i];
        ctx.globalAlpha = sw.alpha * 0.85;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.lineWidth;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 4. Power Charging Beams
    if (this.powerBeams.length > 0) {
      for (let i = 0; i < this.powerBeams.length; i++) {
        const beam = this.powerBeams[i];
        const alpha = Math.max(0, beam.life / beam.maxLife);
        ctx.globalAlpha = alpha * 0.75;
        const grad = ctx.createLinearGradient(beam.x, beam.y, beam.x, beam.y - 280);
        grad.addColorStop(0, '#f97316');
        grad.addColorStop(0.5, '#facc15');
        grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(beam.x - beam.width / 2, beam.y - 280, beam.width, 280);
      }
    }

    // 5. Particles
    if (this.particles.length > 0) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.rot) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 6. Speed Lines
    if (this.speedLines.length > 0) {
      for (let i = 0; i < this.speedLines.length; i++) {
        const sl = this.speedLines[i];
        ctx.strokeStyle = sl.color;
        ctx.lineWidth = sl.lineWidth;
        ctx.globalAlpha = Math.max(0, sl.life / sl.maxLife);
        ctx.beginPath();
        const cos = Math.cos(sl.angle);
        const sin = Math.sin(sl.angle);
        ctx.moveTo(sl.cx + cos * sl.innerDist, sl.cy + sin * sl.innerDist);
        ctx.lineTo(sl.cx + cos * sl.outerDist, sl.cy + sin * sl.outerDist);
        ctx.stroke();
      }
    }

    // 7. Lightning Arcs
    if (this.lightningArcs.length > 0) {
      for (let i = 0; i < this.lightningArcs.length; i++) {
        const arc = this.lightningArcs[i];
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = Math.max(0, arc.life / arc.maxLife);
        ctx.beginPath();
        ctx.moveTo(arc.p1.x, arc.p1.y);
        ctx.lineTo(arc.mid.x, arc.mid.y);
        ctx.lineTo(arc.p2.x, arc.p2.y);
        ctx.stroke();
      }
    }

    // 8. Pop Texts with Cartoon Outline
    if (this.popTexts.length > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < this.popTexts.length; i++) {
        const pt = this.popTexts[i];
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.translate(pt.x, pt.y);
        ctx.scale(pt.scale, pt.scale);

        ctx.font = `900 ${pt.size}px Outfit, sans-serif`;

        // Thick black comic outline
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4.5;
        ctx.strokeText(pt.text, 0, 0);

        ctx.fillStyle = pt.color;
        ctx.fillText(pt.text, 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // Draw Screen-space Vignettes (Called after camera restore)
  drawScreenVignettes(ctx, width = 960, height = 540) {
    for (let i = 0; i < this.vignettes.length; i++) {
      const vig = this.vignettes[i];
      ctx.save();
      const alpha = Math.max(0, vig.life / vig.maxLife);
      ctx.globalAlpha = alpha;

      const grad = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.35,
        width / 2, height / 2, width * 0.75
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, vig.color);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }
}
