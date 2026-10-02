import Matter from 'matter-js';
import decomp from 'poly-decomp';

const { Bodies, Body, Common, Composite, Engine } = Matter;

const planterOutline = [
  { x: -28, y: -11 }, { x: -20, y: -11 }, { x: -18, y: -8 },
  { x: 18, y: -8 }, { x: 20, y: -11 }, { x: 28, y: -11 },
  { x: 21, y: 7 }, { x: 14, y: 17 }, { x: -14, y: 17 }, { x: -21, y: 7 }
];

function createCandidate(name) {
  if (name === 'old-rectangle') {
    return Bodies.rectangle(400, 350, 56, 34, { isStatic: true, label: name });
  }
  if (name === 'manual-compound') {
    const rim = Bodies.rectangle(0, -10, 56, 10);
    const taperedBowl = Bodies.rectangle(0, 2, 42, 20);
    const base = Bodies.rectangle(0, 14, 28, 8);
    const body = Body.create({ parts: [rim, taperedBowl, base], isStatic: true, label: name });
    Body.setPosition(body, { x: 400, y: 350 });
    return body;
  }
  const vertices = planterOutline.map(point => ({ x: point.x + 400, y: point.y + 350 }));
  const body = Bodies.fromVertices(400, 350, [vertices], { isStatic: true, label: name }, true);
  if (!body) throw new Error('Matter fromVertices did not create the planter body.');
  return body;
}

function runStabilityTrial(candidateName, iterations = 90) {
  const world = Composite.create();
  const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 }, positionIterations: 6, velocityIterations: 4 });
  const body = createCandidate(candidateName);
  const start = { x: body.position.x, y: body.position.y };
  const ball = Bodies.circle(354, 312, 12, { restitution: 0.2, frictionAir: 0.002 });
  Body.setVelocity(ball, { x: 4.5, y: 2.4 });
  const ground = Bodies.rectangle(400, 440, 1000, 24, { isStatic: true });
  Composite.add(world, [body, ball, ground]);
  engine.world = world;
  const before = performance.now();
  for (let frame = 0; frame < iterations; frame += 1) Engine.update(engine, 1000 / 60);
  const elapsedMs = performance.now() - before;
  const finite = [
    body.position.x, body.position.y, ball.position.x, ball.position.y,
    ball.velocity.x, ball.velocity.y
  ].every(Number.isFinite);
  return {
    finite,
    staticBodyDisplacement: Math.hypot(body.position.x - start.x, body.position.y - start.y),
    ball: { x: ball.position.x, y: ball.position.y, vx: ball.velocity.x, vy: ball.velocity.y },
    iterations,
    elapsedMs
  };
}

export function comparePlanterCollisionShapes({ iterations = 90 } = {}) {
  const previousDecomp = Common._decomp;
  Common.setDecomp(decomp);
  try {
    const candidates = ['old-rectangle', 'manual-compound', 'from-vertices-poly-decomp'].map(name => {
      const body = createCandidate(name);
      const fixtures = body.parts.length > 1 ? body.parts.slice(1) : body.parts;
      const area = fixtures.reduce((sum, fixture) => sum + fixture.area, 0);
      return {
        name,
        fixtureCount: fixtures.length,
        area: Number(area.toFixed(2)),
        bounds: {
          width: Number((body.bounds.max.x - body.bounds.min.x).toFixed(2)),
          height: Number((body.bounds.max.y - body.bounds.min.y).toFixed(2))
        },
        stability: runStabilityTrial(name, iterations)
      };
    });
    return {
      prop: 'destructible_flowerpot / authored hydrangea planter',
      source: 'raw-assets/vectors/props/hydrangea-planter.svg',
      fixedStep: 'Matter.Engine.update at 60 Hz; same static prop and incoming ball for each candidate',
      limitations: 'CPU timings are a local microbenchmark, not a low-end-device result; no gameplay fixture was changed.',
      candidates
    };
  } finally {
    Common.setDecomp(previousDecomp);
  }
}
