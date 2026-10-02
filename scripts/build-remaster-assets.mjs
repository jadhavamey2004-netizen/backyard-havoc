import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AssetPack } from '@assetpack/core';
import { optimize } from 'svgo';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawRoot = path.join(projectRoot, 'raw-assets');
const optimizedInput = path.join(projectRoot, '.phase13-assetpack-input');
const generatedRoot = path.join(projectRoot, 'public', 'assets', 'generated');
const reportRoot = path.join(projectRoot, 'test-results');

function assertInsideProject(target) {
  const relative = path.relative(projectRoot, target);
  assert.ok(relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative),
    `Refusing to write outside the repository: ${target}`);
}

async function collectSvgFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await collectSvgFiles(path.join(directory, entry.name), relativePath));
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.svg') files.push(relativePath);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

assertInsideProject(optimizedInput);
assertInsideProject(generatedRoot);
assertInsideProject(reportRoot);

const sources = await collectSvgFiles(rawRoot);
assert.ok(sources.length >= 5, 'The Phase 13 pipeline requires authored SVG environment, prop, and character references.');

await rm(optimizedInput, { recursive: true, force: true });
await rm(generatedRoot, { recursive: true, force: true });
await mkdir(optimizedInput, { recursive: true });
await mkdir(generatedRoot, { recursive: true });

const records = [];
for (const relativePath of sources) {
  const sourcePath = path.join(rawRoot, relativePath);
  const source = await readFile(sourcePath, 'utf8');
  const optimized = optimize(source, {
    path: relativePath.replaceAll(path.sep, '/'),
    multipass: true,
    plugins: ['preset-default']
  });
  assert.ok(optimized.data.includes('<svg'), `SVGO did not produce SVG output for ${relativePath}`);
  const inputPath = path.join(optimizedInput, relativePath);
  await mkdir(path.dirname(inputPath), { recursive: true });
  await writeFile(inputPath, optimized.data, 'utf8');
  records.push({
    source: relativePath.replaceAll(path.sep, '/'),
    sourceBytes: Buffer.byteLength(source),
    svgoBytes: Buffer.byteLength(optimized.data),
    runtimePath: `/assets/generated/${relativePath.replaceAll(path.sep, '/')}`
  });
}

const assetPack = new AssetPack({
  entry: optimizedInput,
  output: generatedRoot,
  cache: false,
  strict: true,
  logLevel: 'warn',
  pipes: []
});
await assetPack.run();

let generatedBytes = 0;
for (const record of records) {
  const relativePath = record.source.split('/').join(path.sep);
  const outputPath = path.join(generatedRoot, relativePath);
  const output = await readFile(outputPath);
  const outputStat = await stat(outputPath);
  assert.ok(outputStat.isFile(), `AssetPack did not generate ${record.runtimePath}`);
  assert.equal(output.toString('utf8'), await readFile(path.join(optimizedInput, relativePath), 'utf8'),
    `Generated runtime asset was changed outside the pipeline: ${record.runtimePath}`);
  record.generatedBytes = output.byteLength;
  record.sha256 = createHash('sha256').update(output).digest('hex');
  generatedBytes += output.byteLength;
}

const manifest = {
  pipeline: ['raw SVG', 'SVGO 4.1.0', '@assetpack/core 1.7.0 final-copy pipe'],
  generatedAt: 'reproducible build output; timestamp intentionally omitted',
  assets: records
};
await writeFile(path.join(generatedRoot, 'phase13-asset-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await mkdir(reportRoot, { recursive: true });
await writeFile(path.join(reportRoot, 'phase13-asset-pipeline.json'), `${JSON.stringify({
  sourceCount: records.length,
  sourceSvgBytes: records.reduce((sum, record) => sum + record.sourceBytes, 0),
  svgoBytes: records.reduce((sum, record) => sum + record.svgoBytes, 0),
  assetPackGeneratedBytes: generatedBytes,
  generatedRuntimeBytes: generatedBytes + Buffer.byteLength(`${JSON.stringify(manifest, null, 2)}\n`),
  generatedDirectory: 'public/assets/generated',
  pipeline: manifest.pipeline,
  assets: records
}, null, 2)}\n`);

console.log(JSON.stringify({
  sourceCount: records.length,
  sourceSvgBytes: records.reduce((sum, record) => sum + record.sourceBytes, 0),
  svgoBytes: records.reduce((sum, record) => sum + record.svgoBytes, 0),
  assetPackGeneratedBytes: generatedBytes,
  evidence: 'test-results/phase13-asset-pipeline.json'
}));
