import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { comparePlanterCollisionShapes } from '../src/rendering/phase13_collision_shapes.js';

const report = comparePlanterCollisionShapes();
await mkdir(resolve('test-results'), { recursive: true });
await writeFile(resolve('test-results/phase13-prop-collision-comparison.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
