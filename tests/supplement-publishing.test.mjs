import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateSupplements } from '../scripts/validate-supplements.mjs';
import { buildSupplements } from '../scripts/build-supplements.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceQuarter = path.join(repo, 'content', 'id', 'adult-supplements', '2026-q4');

async function makePublishedFixture() {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'sabatku-supplements-'));
  const contentRoot = path.join(temp, 'content');
  const quarterDir = path.join(contentRoot, 'id', 'adult-supplements', '2026-q4');
  await mkdir(path.dirname(quarterDir), { recursive: true });
  await cp(sourceQuarter, quarterDir, { recursive: true });

  const collectionPath = path.join(quarterDir, 'collection.json');
  const collection = JSON.parse(await readFile(collectionPath, 'utf8'));
  collection.publicationStatus = 'published';
  await writeFile(collectionPath, `${JSON.stringify(collection, null, 2)}\n`);

  // Keep the fixture focused on one published resource, even when the source
  // quarter later contains additional approved lessons.
  for (const lessonId of collection.lessons.map(item => item.lessonId).filter(id => id !== 'lesson-13')) {
    const pathToManifest = path.join(quarterDir, lessonId, 'resources.json');
    const manifestForLesson = JSON.parse(await readFile(pathToManifest, 'utf8'));
    for (const resource of manifestForLesson.resources) resource.publicationStatus = 'draft';
    await writeFile(pathToManifest, `${JSON.stringify(manifestForLesson, null, 2)}\n`);
  }

  const manifestPath = path.join(quarterDir, 'lesson-13', 'resources.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const resource = manifest.resources.find(item => item.key === 'teacher-guide');
  resource.publicationStatus = 'published';
  resource.attribution = 'Contoh atribusi untuk pengujian';
  resource.rightsStatement = 'Contoh izin publikasi untuk pengujian';
  resource.translationTeam = 'Tim SabatKu';
  resource.formats = [{ mediaType: 'text/markdown', file: 'teacher-guide/content.md' }];
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const markdownPath = path.join(quarterDir, 'lesson-13', 'teacher-guide', 'content.md');
  await writeFile(markdownPath, '# Contoh Penuntun Guru\n\nNaskah uji publikasi.\n');
  return { temp, contentRoot, manifestPath };
}

test('published supplements produce linked static indexes and checksummed files', async () => {
  const fixture = await makePublishedFixture();
  try {
    await validateSupplements(fixture.contentRoot);
    const output = await buildSupplements(fixture.contentRoot);
    assert.equal(output.resourceCount, 1);
    assert.deepEqual(output.catalog.collections.map(item => item.id), ['adult-supplements:id:2026-q4']);
    assert.equal(output.documents.find(item => item.path.endsWith('/lesson-13/resources.json')).value.resources.length, 1);
    const resourceIndex = output.documents.find(item => item.path.endsWith('/teacher-guide/index.json')).value;
    assert.equal(resourceIndex.formats[0].mediaType, 'text/markdown');
    assert.equal(resourceIndex.formats[0].bytes, Buffer.byteLength('# Contoh Penuntun Guru\n\nNaskah uji publikasi.\n'));
    assert.match(resourceIndex.formats[0].sha256, /^[a-f0-9]{64}$/);
    assert.equal(output.assets.length, 1);
  } finally {
    await rm(fixture.temp, { recursive: true, force: true });
  }
});

test('published resources without a real format are rejected', async () => {
  const fixture = await makePublishedFixture();
  try {
    const manifest = JSON.parse(await readFile(fixture.manifestPath, 'utf8'));
    manifest.resources.find(item => item.key === 'teacher-guide').formats = [];
    await writeFile(fixture.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await assert.rejects(() => validateSupplements(fixture.contentRoot), /published resources need at least one available format/);
  } finally {
    await rm(fixture.temp, { recursive: true, force: true });
  }
});

test('published Markdown rejects active HTML and unsafe links', async () => {
  const fixture = await makePublishedFixture();
  try {
    const markdownPath = path.join(path.dirname(fixture.manifestPath), 'teacher-guide', 'content.md');
    await writeFile(markdownPath, '[tautan](javascript:alert(1))\n');
    await assert.rejects(() => validateSupplements(fixture.contentRoot), /unsafe Markdown link destination/);
    await writeFile(markdownPath, '<img src=x onerror=alert(1)>\n');
    await assert.rejects(() => validateSupplements(fixture.contentRoot), /raw HTML is not allowed/);
  } finally {
    await rm(fixture.temp, { recursive: true, force: true });
  }
});

test('draft resources and collections stay out of the public catalog', async () => {
  const fixture = await makePublishedFixture();
  try {
    const collectionPath = path.join(fixture.contentRoot, 'id', 'adult-supplements', '2026-q4', 'collection.json');
    const collection = JSON.parse(await readFile(collectionPath, 'utf8'));
    collection.publicationStatus = 'draft';
    await writeFile(collectionPath, `${JSON.stringify(collection, null, 2)}\n`);
    const output = await buildSupplements(fixture.contentRoot);
    assert.equal(output.resourceCount, 0);
    assert.deepEqual(output.catalog.collections, []);
    assert.deepEqual(output.documents, []);
  } finally {
    await rm(fixture.temp, { recursive: true, force: true });
  }
});
