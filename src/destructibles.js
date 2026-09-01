/**
 * Destructible Props — Shared constants and fragment physics for Backyard Havoc
 * Note: Static map layout was replaced by ProceduralWorld (procedural_world.js).
 */

import Matter from 'matter-js';

const { Bodies, Composite, Body } = Matter;

// Collision Categories — shared bitmask filter system used across all modules
export const COLLISION_CATEGORIES = {
  BALL: 0x0001,
  STATIC: 0x0002,
  DESTRUCTIBLE: 0x0004,
  SHARDS: 0x0008
};

/**
 * Break a destroyed object into non-colliding dynamic physical fragments.
 * Glass produces 3×3 shards; other objects produce 2×2 chunks.
 * Shards inherit impact momentum and angular velocity for realistic scatter.
 */
export function breakObjectIntoFragments(world, targetBody, impactVelocity = { x: 0, y: 0 }) {
  const bounds = targetBody.bounds;
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  const center = { x: targetBody.position.x, y: targetBody.position.y };

  Composite.remove(world, targetBody);

  const numCols = targetBody.isGlass ? 3 : 2;
  const numRows = targetBody.isGlass ? 3 : 2;
  const pieceW = width / numCols;
  const pieceH = height / numRows;

  const shards = [];

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const offsetX = (c + 0.5) * pieceW - width / 2;
      const offsetY = (r + 0.5) * pieceH - height / 2;

      const shard = Bodies.rectangle(
        center.x + offsetX,
        center.y + offsetY,
        pieceW * 0.85,
        pieceH * 0.85,
        {
          density: 0.0005,
          friction: 0.3,
          restitution: targetBody.isGlass ? 0.6 : 0.4,
          frictionAir: 0.02,
          label: 'debris_shard',
          color: targetBody.color,
          isGlass: targetBody.isGlass,
          isShard: true,
          lifeTime: 2.2,
          collisionFilter: {
            category: COLLISION_CATEGORIES.SHARDS,
            mask: COLLISION_CATEGORIES.STATIC
          }
        }
      );

      // Scatter with impact momentum and random angular spin
      const scatterX = (Math.random() - 0.5) * 4.0 + impactVelocity.x * 0.25;
      const scatterY = -Math.random() * 3.5 - Math.abs(impactVelocity.y) * 0.2;
      Body.setVelocity(shard, { x: scatterX, y: scatterY });
      Body.setAngularVelocity(shard, (Math.random() - 0.5) * 0.25);

      Composite.add(world, shard);
      shards.push(shard);
    }
  }

  return shards;
}
