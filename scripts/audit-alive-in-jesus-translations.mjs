import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex');
const lf = value => value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

function options(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${key} requires a value`);
    const name = key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    result[name] = value;
    index++;
  }
  return result;
}

async function markdownFiles(root) {
  const result = new Map();
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const relative = path.relative(root, absolute).split(path.sep).join('/');
        result.set(relative, lf(await readFile(absolute, 'utf8')));
      }
    }
  }
  await visit(root);
  return result;
}

function structure(markdown) {
  return {
    paragraphs: markdown.split(/\n\s*\n/).filter(part => part.trim()).length,
    bulletItems: (markdown.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/gm) ?? []).length,
    images: (markdown.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length,
    styleBlocks: (markdown.match(/^\s*\{"style"\s*:/gm) ?? []).length,
    scriptureLikeRefs: (markdown.match(/\b\d{1,3}:\d{1,3}(?:\s*[-–—]\s*\d{1,3})?\b/g) ?? []).length,
    separators: (markdown.match(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm) ?? []).length,
    rawAudioMetadata: (markdown.match(/!a\[[^\]]+\].*\{"(?:credits|title|copyright)"/g) ?? []).length,
  };
}

function auditPair(relative, english, indonesian) {
  const en = structure(english);
  const id = structure(indonesian);
  const differences = [];
  for (const key of ['images', 'styleBlocks', 'scriptureLikeRefs']) {
    if (en[key] !== id[key]) differences.push(`${key}: EN ${en[key]}, ID ${id[key]}`);
  }
  return {
    path: relative,
    englishSha256: sha256(english),
    indonesianSha256: sha256(indonesian),
    english: en,
    indonesian: id,
    machineFlags: differences,
    editorialStatus: 'human-review-required',
  };
}

export async function auditAliveInJesusTranslations({ englishRoot, indonesianRoot }) {
  const english = await markdownFiles(path.resolve(englishRoot));
  const indonesian = await markdownFiles(path.resolve(indonesianRoot));
  const paths = [...new Set([...english.keys(), ...indonesian.keys()])].sort((a, b) => a.localeCompare(b));
  const missingIndonesian = paths.filter(key => english.has(key) && !indonesian.has(key));
  const missingEnglish = paths.filter(key => indonesian.has(key) && !english.has(key));
  const pairs = paths.filter(key => english.has(key) && indonesian.has(key)).map(key => auditPair(key, english.get(key), indonesian.get(key)));
  const flaggedPairs = pairs.filter(pair => pair.machineFlags.length > 0);
  return {
    schemaVersion: 'alive-in-jesus-translation-audit-v1',
    englishFiles: english.size,
    indonesianFiles: indonesian.size,
    matchedFiles: pairs.length,
    missingIndonesian,
    missingEnglish,
    flaggedPairCount: flaggedPairs.length,
    pairs,
  };
}

export async function createReviewManifest({ editionRoot, editionId, audit }) {
  const root = path.resolve(editionRoot);
  const files = await markdownFiles(root);
  return {
    schemaVersion: 'alive-in-jesus-translation-review-v1',
    editionId,
    status: 'needs-team-review',
    sourceLocale: 'en',
    targetLocale: 'id',
    reviewer: null,
    reviewedAt: null,
    note: 'Generated checksum baseline. A reviewer must complete the source comparison and approve it before publication.',
    sourceAudit: {
      englishFiles: audit.englishFiles,
      indonesianFiles: audit.indonesianFiles,
      matchedFiles: audit.matchedFiles,
      missingIndonesian: audit.missingIndonesian,
      missingEnglish: audit.missingEnglish,
      flaggedPairCount: audit.flaggedPairCount,
      sourceChecksums: Object.fromEntries(audit.pairs.map(pair => [pair.path, { english: pair.englishSha256, indonesian: pair.indonesianSha256 }])),
    },
    translationFiles: Object.fromEntries([...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([file, content]) => [file, sha256(content)])),
  };
}

function markdownReport(audit, role) {
  const rows = audit.pairs.filter(pair => pair.machineFlags.length > 0).map(pair => `| \`${pair.path}\` | ${pair.machineFlags.join('; ')} |`).join('\n');
  return [
    `# Audit sumber–terjemahan Alive in Jesus (${role})`,
    '',
    `- Sumber Inggris: ${audit.englishFiles} berkas Markdown`,
    `- Terjemahan Indonesia: ${audit.indonesianFiles} berkas Markdown`,
    `- Pasangan berkas: ${audit.matchedFiles}`,
    `- Terjemahan tanpa pasangan sumber: ${audit.missingEnglish.length}`,
    `- Sumber tanpa pasangan terjemahan: ${audit.missingIndonesian.length}`,
    `- Pasangan dengan perbedaan struktur terdeteksi: ${audit.flaggedPairCount}`,
    '- Status editorial: semua pasangan tetap memerlukan pemeriksaan manusia; pemeriksaan otomatis tidak menilai ketepatan makna.',
    '- Metadata gaya Adventech, pemisah, dan metadata kredit audio memang merupakan format sumber; builder publikasi membersihkannya sebelum ditampilkan.',
    '',
    '## Perbedaan struktur yang perlu diperiksa',
    '',
    rows || 'Tidak ada perbedaan pada metrik otomatis yang diperiksa.',
    '',
    '## Berkas yang tidak berpasangan',
    '',
    '### Sumber Inggris tanpa terjemahan Indonesia',
    ...(audit.missingIndonesian.length ? audit.missingIndonesian.map(file => `- \`${file}\``) : ['- Tidak ada']),
    '',
    '### Terjemahan Indonesia tanpa sumber Inggris',
    ...(audit.missingEnglish.length ? audit.missingEnglish.map(file => `- \`${file}\``) : ['- Tidak ada']),
    '',
    'Audit struktur ini bukan sertifikasi bahwa terjemahan benar atau telah disetujui tim.',
    '',
  ].join('\n');
}

async function main() {
  const args = options(process.argv.slice(2));
  if (!args.english || !args.indonesian) {
    throw new Error('Usage: node scripts/audit-alive-in-jesus-translations.mjs --english <dir> --indonesian <dir> [--role student|teacher] [--report <file>] [--edition-root <dir> --edition-id <id> --write-review <file>|--refresh-review <file>]');
  }
  const role = args.role ?? 'student';
  const audit = await auditAliveInJesusTranslations({ englishRoot: args.english, indonesianRoot: args.indonesian });
  if (args.report) await writeFile(path.resolve(args.report), markdownReport(audit, role), 'utf8');
  if (args.jsonReport) await writeFile(path.resolve(args.jsonReport), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  if (args.editionRoot || args.writeReview || args.refreshReview || args.editionId) {
    if (!args.editionRoot || (!args.writeReview && !args.refreshReview) || (args.writeReview && args.refreshReview) || !args.editionId) throw new Error('--edition-root, --edition-id and exactly one of --write-review or --refresh-review must be supplied together');
    const manifest = await createReviewManifest({ editionRoot: args.editionRoot, editionId: args.editionId, audit });
    if (args.writeReview) await writeFile(path.resolve(args.writeReview), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    else await writeFile(path.resolve(args.refreshReview), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({
    role,
    englishFiles: audit.englishFiles,
    indonesianFiles: audit.indonesianFiles,
    matchedFiles: audit.matchedFiles,
    missingIndonesian: audit.missingIndonesian,
    missingEnglish: audit.missingEnglish,
    flaggedPairCount: audit.flaggedPairCount,
    report: args.report ? path.resolve(args.report) : null,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
