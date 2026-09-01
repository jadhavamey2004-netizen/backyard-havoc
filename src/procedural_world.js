/**
 * Procedural Endless Backyard Chunk Generator & Lifecycle Manager
 * Precision aligned: 2nd-Story Window Kevin NPC + Elevated Windows on Tall Architecture.
 */

import Matter from 'matter-js';
import { COLLISION_CATEGORIES } from './destructibles.js';

const { Bodies, Composite } = Matter;

export const YARD_THEMES = ['GREENHOUSE', 'PATIO_BBQ', 'SHED_TRAMPOLINE', 'DOG_PARK'];

export class ProceduralWorld {
  constructor(world, chunkSize = 960) {
    this.world = world;
    this.chunkSize = chunkSize;
    this.activeChunks = new Map();
    this.yardsClearedCount = 0;
    this.totalPropsSmashed = 0;
  }

  getChunkIndexForX(x) {
    return Math.floor(x / this.chunkSize);
  }

  updateActiveChunks(playerX) {
    const currentChunkIdx = this.getChunkIndexForX(playerX);
    const visibleRange = 1;

    const neededIndices = new Set();
    for (let i = currentChunkIdx - visibleRange; i <= currentChunkIdx + visibleRange; i++) {
      neededIndices.add(i);
    }

    for (const [idx, chunk] of this.activeChunks.entries()) {
      if (!neededIndices.has(idx) && Math.abs(idx - currentChunkIdx) > 2) {
        this.unloadChunk(idx);
      }
    }

    for (const idx of neededIndices) {
      if (!this.activeChunks.has(idx)) {
        this.loadChunk(idx);
      }
    }
  }

  loadChunk(chunkIdx) {
    const originX = chunkIdx * this.chunkSize;
    const themeIdx = Math.abs(chunkIdx) % YARD_THEMES.length;
    const theme = YARD_THEMES[themeIdx];
    const props = [];

    const addDestructible = (opts) => {
      const body = Bodies.rectangle(originX + opts.x, opts.y, opts.width, opts.height, {
        isStatic: true,
        label: opts.label,
        isDestructible: true,
        isGlass: !!opts.isGlass,
        isGrill: !!opts.isGrill,
        isWood: !!opts.isWood,
        isNpc: !!opts.isNpc,
        isTrampoline: !!opts.isTrampoline,
        traumaContribution: opts.trauma || 0.4,
        pointValue: opts.points || 150,
        objectName: opts.name,
        associatedNpcId: 'grumpy_neighbor_kevin',
        color: opts.color || '#94a3b8',
        restitution: opts.restitution || (opts.isGlass ? 0.75 : 0.5),
        chunkIndex: chunkIdx,
        collisionFilter: {
          category: COLLISION_CATEGORIES.DESTRUCTIBLE,
          mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.STATIC
        }
      });
      Composite.add(this.world, body);
      props.push(body);
      return body;
    };

    const addSolid = (opts) => {
      const body = Bodies.rectangle(originX + opts.x, opts.y, opts.width, opts.height, {
        isStatic: true,
        label: opts.label,
        isDestructible: false,
        isTrampoline: !!opts.isTrampoline,
        restitution: opts.restitution || 0.65,
        friction: opts.friction || 0.2,
        objectName: opts.name,
        color: opts.color || '#64748b',
        chunkIndex: chunkIdx,
        collisionFilter: {
          category: COLLISION_CATEGORIES.STATIC,
          mask: COLLISION_CATEGORIES.BALL
        }
      });
      Composite.add(this.world, body);
      props.push(body);
      return body;
    };

    // =========================================================================
    // PHYSICAL BONKABLE NEIGHBOR KEVIN NPC IN 2ND-STORY WINDOW (x: 790, y: 110)
    // =========================================================================
    addDestructible({
      x: 790,
      y: 110,
      width: 52,
      height: 48,
      label: 'destructible_kevin',
      name: 'Grumpy Neighbor Kevin (2nd-Story Window)',
      points: 500,
      trauma: 0.65,
      isNpc: true,
      color: '#0284c7'
    });

    // =========================================================================
    // 1. THEME: TALL CONSERVATORY (Roof Panes, Skylights & Ground Lawn Garden)
    // =========================================================================
    if (theme === 'GREENHOUSE') {
      // Conservatory Roof Glass Panes
      addDestructible({ x: 730, y: 105, width: 50, height: 34, label: 'destructible_greenhouse', name: 'Conservatory Roof Glass #1', points: 200, trauma: 0.35, isGlass: true, color: '#67e8f9' });
      addDestructible({ x: 790, y: 80, width: 54, height: 34, label: 'destructible_greenhouse', name: 'Conservatory Peak Skylight', points: 250, trauma: 0.4, isGlass: true, color: '#38bdf8' });
      addDestructible({ x: 850, y: 105, width: 50, height: 34, label: 'destructible_greenhouse', name: 'Conservatory Roof Glass #3', points: 200, trauma: 0.35, isGlass: true, color: '#67e8f9' });

      // Conservatory Upper Transom Panes
      addDestructible({ x: 735, y: 160, width: 52, height: 30, label: 'destructible_greenhouse', name: 'Conservatory Upper Transom #1', points: 150, trauma: 0.3, isGlass: true, color: '#bae6fd' });
      addDestructible({ x: 845, y: 160, width: 52, height: 30, label: 'destructible_greenhouse', name: 'Conservatory Upper Transom #2', points: 150, trauma: 0.3, isGlass: true, color: '#bae6fd' });

      // Ground Lawn Garden Props (Naturally Grounded at y = 485 - height/2)
      addDestructible({ x: 480, y: 463, width: 32, height: 44, label: 'destructible_gnome', name: 'Garden Lawn Gnome', points: 250, trauma: 0.4, color: '#ef4444' });
      addDestructible({ x: 620, y: 468, width: 56, height: 34, label: 'destructible_flowerpot', name: 'Hydrangea Ground Planter', points: 200, trauma: 0.35, color: '#ea580c' });
      addSolid({ x: 180, y: 457, width: 66, height: 56, label: 'solid_doghouse', name: "Buster's Doghouse", restitution: 0.75, color: '#b45309' });
    }

    // =========================================================================
    // 2. THEME: TALL 2-STORY BRICK HOUSE & BBQ (Upper/Lower Windows & Patio Deck)
    // =========================================================================
    else if (theme === 'PATIO_BBQ') {
      // 2nd-Story Bedroom Window
      addDestructible({ x: 860, y: 95, width: 70, height: 52, label: 'destructible_window', name: `2nd-Story Bedroom Window [Yard ${chunkIdx}]`, points: 500, trauma: 0.65, isGlass: true, color: '#38bdf8' });
      // 1st-Story French Window
      addDestructible({ x: 800, y: 220, width: 72, height: 52, label: 'destructible_window', name: `1st-Story Patio French Window [Yard ${chunkIdx}]`, points: 350, trauma: 0.5, isGlass: true, color: '#38bdf8' });

      // Ground Patio & Deck Props
      addDestructible({ x: 520, y: 456, width: 48, height: 58, label: 'destructible_grill', name: 'Patio Weber Charcoal BBQ', points: 750, trauma: 0.85, isGrill: true, color: '#0f172a' });
      addDestructible({ x: 80, y: 459, width: 44, height: 52, label: 'destructible_trashcan', name: 'Metal Yard Trash Can', points: 220, trauma: 0.45, color: '#94a3b8' });
      addSolid({ x: 260, y: 466, width: 64, height: 38, label: 'solid_table', name: 'Patio Glass Table', restitution: 0.8, color: '#e2e8f0' });
      addDestructible({ x: 380, y: 468, width: 56, height: 34, label: 'destructible_flowerpot', name: 'Patio Terracotta Flowerpot', points: 160, trauma: 0.35, color: '#c2410c' });
    }

    // =========================================================================
    // 3. THEME: TALL LOFTED BARN & TRAMPOLINE (Loft Gable Window & Trampoline)
    // =========================================================================
    else if (theme === 'SHED_TRAMPOLINE') {
      addDestructible({ x: 860, y: 125, width: 60, height: 44, label: 'destructible_window', name: 'Loft Gable Window', points: 300, trauma: 0.5, isGlass: true, color: '#38bdf8' });
      addDestructible({ x: 800, y: 230, width: 56, height: 48, label: 'destructible_window', name: 'Tack Room Window', points: 250, trauma: 0.45, isGlass: true, color: '#38bdf8' });

      // Ground Trampoline for Mega-Launches
      addSolid({ x: 420, y: 470, width: 95, height: 30, label: 'solid_trampoline', name: 'Backyard Trampoline', isTrampoline: true, restitution: 1.25, color: '#3b82f6' });

      // Ground Lawn Cruiser Bike & Gnome
      addSolid({ x: 180, y: 461, width: 62, height: 48, label: 'solid_bicycle', name: 'Red Cruiser Bike', restitution: 0.7, color: '#dc2626' });
      addDestructible({ x: 580, y: 463, width: 32, height: 44, label: 'destructible_gnome', name: 'Shed Gnome', points: 250, trauma: 0.4, color: '#ef4444' });
    }

    // =========================================================================
    // 4. THEME: TALL CRAFTSMAN HOME & DOG PARK (Living Room Windows & Birdbath)
    // =========================================================================
    else if (theme === 'DOG_PARK') {
      addDestructible({ x: 860, y: 110, width: 78, height: 56, label: 'destructible_window', name: `Craftsman 2nd-Story Window [Yard ${chunkIdx}]`, points: 450, trauma: 0.6, isGlass: true, color: '#38bdf8' });
      addDestructible({ x: 790, y: 225, width: 68, height: 50, label: 'destructible_window', name: `Craftsman 1st-Story Bay Window [Yard ${chunkIdx}]`, points: 350, trauma: 0.5, isGlass: true, color: '#38bdf8' });

      // Ground Birdbath Fountain & Kennels
      addDestructible({ x: 480, y: 458, width: 54, height: 54, label: 'destructible_flowerpot', name: 'Ceramic Birdbath Fountain', points: 300, trauma: 0.45, color: '#38bdf8' });
      addDestructible({ x: 340, y: 468, width: 54, height: 34, label: 'destructible_flowerpot', name: 'Lawn Flowerpot', points: 160, trauma: 0.35, color: '#c2410c' });
      addSolid({ x: 180, y: 457, width: 66, height: 56, label: 'solid_doghouse', name: "Spike's Kennel", restitution: 0.75, color: '#b45309' });
    }

    this.activeChunks.set(chunkIdx, {
      theme,
      originX,
      props,
      isCleared: false
    });
  }

  unloadChunk(chunkIdx) {
    const chunk = this.activeChunks.get(chunkIdx);
    if (!chunk) return;

    for (let i = 0; i < chunk.props.length; i++) {
      Composite.remove(this.world, chunk.props[i]);
    }
    this.activeChunks.delete(chunkIdx);
  }

  getAllActiveProps() {
    const allProps = [];
    for (const chunk of this.activeChunks.values()) {
      for (let i = 0; i < chunk.props.length; i++) {
        allProps.push(chunk.props[i]);
      }
    }
    return allProps;
  }

  checkChunkClearStates() {
    for (const chunk of this.activeChunks.values()) {
      if (chunk.isCleared) continue;
      const destructibles = chunk.props.filter(p => p.isDestructible && !p.isDestroyed && !p.isNpc);
      if (destructibles.length === 0 && chunk.props.length > 0) {
        chunk.isCleared = true;
        this.yardsClearedCount++;
      }
    }
  }

  reset() {
    for (const chunkIdx of Array.from(this.activeChunks.keys())) {
      this.unloadChunk(chunkIdx);
    }
    this.activeChunks.clear();
    this.yardsClearedCount = 0;
    this.totalPropsSmashed = 0;
  }
}
