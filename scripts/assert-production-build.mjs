import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const distPath = resolve('dist');
const reportPath = resolve('test-results/phase12-production-bundle.json');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolutePath));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

const distStat = await stat(distPath).catch(() => null);
assert.ok(distStat?.isDirectory(), 'Production dist/ is missing; run npm run build first.');

const absoluteFiles = await walk(distPath);
const files = [];
const forbiddenGlobals = [
  '__BACKYARD_TEST_ENGINE__',
  '__BACKYARD_TEST_UI__',
  '__BACKYARD_TEST_META__'
];
const foundGlobals = new Set();
const foundLocalPaths = new Set();
const forbiddenPathSegments = new Set();
const localPathPatterns = [/D:\\Backyard Havock/i, /C:\\Users\\/i];

let totalBytes = 0;
let gzipBytes = 0;
let javascriptBytes = 0;
let cssBytes = 0;
let staticBytes = 0;

for (const absolutePath of absoluteFiles) {
  const filePath = relative(distPath, absolutePath).split(sep).join('/');
  const contents = await readFile(absolutePath);
  const size = contents.byteLength;
  const extension = extname(filePath).toLowerCase();
  const decoded = ['.html', '.js', '.css', '.json', '.svg', '.txt'].includes(extension)
    ? contents.toString('utf8')
    : '';

  totalBytes += size;
  gzipBytes += gzipSync(contents).byteLength;
  if (extension === '.js') javascriptBytes += size;
  else if (extension === '.css') cssBytes += size;
  else staticBytes += size;

  const pathParts = filePath.toLowerCase().split('/');
  for (const segment of pathParts) {
    if (['tests', 'playwright-report', 'test-results', '.ai', 'memory-bank'].includes(segment)
      || segment === '.env' || segment.startsWith('.env.')) {
      forbiddenPathSegments.add(filePath);
    }
  }
  if (extension === '.map') forbiddenPathSegments.add(filePath);
  for (const globalName of forbiddenGlobals) {
    if (decoded.includes(globalName)) foundGlobals.add(globalName);
  }
  for (const pattern of localPathPatterns) {
    if (pattern.test(decoded)) foundLocalPaths.add(pattern.source);
  }
  files.push({ path: filePath, bytes: size, gzipBytes: gzipSync(contents).byteLength });
}

assert.deepEqual([...foundGlobals], [], 'Production bundle contains a test bridge global.');
assert.deepEqual([...foundLocalPaths], [], 'Production bundle contains a local development path.');
assert.deepEqual([...forbiddenPathSegments], [], 'Production bundle contains a forbidden test, report, env, or source-map path.');

const report = {
  directory: 'dist',
  totalFiles: files.length,
  totalBytes,
  gzipBytes,
  javascriptBytes,
  cssBytes,
  staticBytes,
  testGlobalsPresent: Object.fromEntries(forbiddenGlobals.map(name => [name, foundGlobals.has(name)])),
  localPathPatternsPresent: Object.fromEntries(localPathPatterns.map(pattern => [pattern.source, foundLocalPaths.has(pattern.source)])),
  forbiddenPaths: [...forbiddenPathSegments],
  sourceMaps: files.filter(file => file.path.endsWith('.map')).map(file => file.path),
  files
};

await mkdir(resolve('test-results'), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  files: report.totalFiles,
  totalBytes,
  gzipBytes,
  javascriptBytes,
  cssBytes,
  staticBytes,
  testGlobalsPresent: false,
  localPathsPresent: false,
  sourceMaps: report.sourceMaps.length,
  evidence: relative(process.cwd(), reportPath)
}));
