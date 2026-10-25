import { mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { normalizeAliveInJesusMarkdown } from './build-alive-in-jesus.mjs';
import { auditAliveInJesusTranslations, createReviewManifest } from './audit-alive-in-jesus-translations.mjs';
import { bilingualBeginnerSongs } from './beginner-song-titles.mjs';
import { refineBeginnerTeacherSection } from './beginner-teacher-program-id.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || 'C:/Users/ADMIN/Music/Alive In Jesus/2. BEGINER');
const target = path.join(root, 'content/id/alive-in-jesus/beginner/2026-q4-year-a');
const load = async name => JSON.parse(await readFile(path.join(root, 'scripts', name), 'utf8'));
const stories = await load('beginner-stories-id.json');
const reflections = await load('beginner-parent-reflections-id.json');
const play = await load('beginner-play-id.json');
const crafts = await load('beginner-crafts-id.json');
const corrections = await load('beginner-editorial-corrections.json');
const teacherTranslations = await load('beginner-teacher-resources-id.json');
const sha = text => createHash('sha256').update(text).digest('hex');
const json = async (file, value) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(value, null, 2) + '\n'); };
const titles = ['Hana Berdoa Memohon Bayi', 'Seorang Penolong Kecil', 'Samuel Mendengarkan Tuhan', 'Rut dan Naomi', 'Boas yang Baik Hati', 'Aku Bisa Membantu Keluargaku', 'Aku Bisa Membantu Orang Lain', 'Aku Bisa Menolong Tuhan', 'Malaikat yang Bercahaya', 'Perjalanan ke Betlehem', 'Lahir di Kandang', 'Para Gembala', 'Orang-Orang Majus'];
const messages = ['Tuhan menjawab doa kita.', 'Aku bisa menolong.', 'Tuhan mengenal namaku.', 'Yesus ingin aku peduli kepada orang lain.', 'Tuhan memeliharaku.', 'Aku bisa membantu keluargaku.', 'Aku bisa membantu orang lain.', 'Aku bisa menolong Tuhan.', 'Aku bisa percaya kepada Tuhan.', 'Tuhan memeliharaku.', 'Terima kasih, Tuhan, untuk Bayi Yesus.', 'Yesus memberi kita sukacita.', 'Yesus ingin aku mengikuti-Nya.'];
const refs = ['1 Samuel 1; 2:1–11', '1 Samuel 2:18–21', '1 Samuel 3', 'Rut 1', 'Rut 2', 'Galatia 5:13', 'Ibrani 13:16', 'Ibrani 13:16', 'Matius 1:18–24; Lukas 1:26–38', 'Lukas 2:1–6', 'Lukas 2:1–6', 'Lukas 2:8–20', 'Matius 2:1–12'];
const teacherSections = [
  ['welcome', 'Penyambutan dan Permainan Sensori'], ['praise', 'Memuji Tuhan'], ['prayer', 'Berdoa'],
  ['story', 'Cerita Alkitab Interaktif'], ['memory-verse', 'Ayat Hafalan'], ['offering', 'Persembahan'],
  ['nature', 'Mengenal Alam'], ['craft', 'Kegiatan Orang Tua dan Anak'], ['goodbye', 'Penutup'],
];
const headingPatterns = [
  /PENYAMBUTAN|MENYAMBUT|SENSORI/, /WAKTU (?:PUJIAN|MEMUJI)/, /WAKTU DOA/, /WAKTU BERCERITA ALKITAB/,
  /^AYAT HAFALAN/, /^PERSEMBAHAN/, /^(?:SEGMEN KOTAK ALAM|MENGENAL ALAM)/,
  /^AKTIVITAS DAN KERAJINAN|^KEGIATAN DAN KERAJINAN/, /^LAGU PERPISAHAN/,
];
const teacherResources = [
  ['000-beginner-child', 'about-beginner', 'Mengenal Anak Beginner'],
  ['001-tips-for-teacher', 'teacher-tips', 'Petunjuk untuk Guru'],
  ['002-beginner-sabbath-school-overview', 'quarter-overview', 'Ikhtisar Triwulan'],
  ['003-a-quiet-moment', 'quiet-moment', 'Saat Teduh Guru'],
  ['004-at-a-glance', 'preparation', 'Persiapan Bahan dan Alat'],
  ['005-simple-program-outline', 'program-outline', 'Garis Besar Program'],
  ['006-printed-resources', 'printables', 'Bahan Cetak'],
  ['007-crafts', 'crafts', 'Prakarya Pekanan'], ['008-music-and-podcasts', 'music', 'Musik untuk Kelas'],
];

function parse(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  return { body: match ? text.slice(match[0].length).trim() : text.trim(), metadata: match?.[1] ?? '' };
}
function editorial(text, teacher = false) {
  for (const [from, to] of [...corrections.shared, ...(teacher ? corrections.teacherWeekly : [])]) text = text.replaceAll(from, to);
  text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u200b\ufeff]/g, '')
    .replace(/\b(?:minggu|Minggu)(?=\s+(?:ke-)?\d)/g, 'Pekan')
    .replace(/\*\*([^*\n]+)\*\*(?=[\p{L}])/gu, '**$1** ')
    .replace(/\*\*“Saatnya Berdoa”\*\*Ajak/g, '**“Saatnya Berdoa”**. Ajak')
    .replace('Nyanyikan **“Kotak Alam”**Lagu.', 'Nyanyikan lagu **“Kotak Alam”**.')
    .replace(/<callout>(.*?)<\/callout>/g, '**$1**')
    .replaceAll('WAKTUNYA SHOLAT','WAKTU DOA').replaceAll('MENAWARKAN','PERSEMBAHAN')
    .replaceAll('kuartal ini','triwulan ini').replaceAll('Keahlian','Prakarya')
    .replaceAll('pejantan penguin','penguin jantan').replaceAll('pejantan meletakkan','penguin jantan meletakkan')
    .replaceAll('Semua pejantan penguin','Semua penguin jantan');
  return text;
}
const studentIntro = 'Tuhan mempercayakan anak yang berharga kepada keluarga Anda. Hari-hari mengasuh anak kadang terasa panjang, tetapi tahun-tahun berlalu begitu cepat. Mengurus rumah, bekerja, dan memenuhi kebutuhan keluarga memang dapat melelahkan.\n\nBuku ini berisi cerita serta kegiatan yang dipilih sesuai usia untuk menolong anak mengenal dan mengasihi Yesus. **Bacalah cerita pekan ini setiap hari.** Ajak anak ikut berinteraksi. Petunjuk gerakan dalam tanda kurung membantu Anda membacakan cerita. Tunjuk gambar atau ajak anak menunjuknya. Jadikan waktu bersama ini kebiasaan harian yang istimewa.\n\nKegiatan **Bermain Sepanjang Hari** membantu Anda mengulang pesan Alkitab melalui keseharian. Jadikan kegiatan itu kenangan bersama. Luangkan waktu juga untuk membaca renungan **Untuk Orang Tua**. Ucapkan ayat hafalan kepada anak setiap hari, meskipun ia masih belajar berbicara. Letakkan kartu ayat hafalan di tempat yang mudah terlihat agar Anda ingat membacakannya dan dapat menunjukkannya kepada anak.\n\n“Bimbinglah mereka kepada Yesus Kristus hari demi hari, dengan kasih, kelembutan, dan kesungguhan. Jangan biarkan apa pun menghalangi pekerjaan besar ini” (Ellen G. White, _Child Guidance_, hlm. 41).\n\nKebiasaan kecil sehari-hari sering membentuk karakter lebih dalam daripada peristiwa besar. Di tengah kesibukan ini, kiranya Tuhan menyegarkan, menguatkan, serta memberi Anda kesabaran dan ketekunan untuk membimbing anak mengasihi serta mengikuti-Nya di atas segalanya.';
const littleDevotions = 'Salah satu bekal terpenting bagi anak adalah belajar mencari Tuhan setiap hari. Usia satu, dua, atau tiga tahun tidak terlalu dini untuk mulai membangun kebiasaan ini dengan cara sederhana.\n\n### Membimbing Anak Meluangkan Waktu bersama Yesus\n\n1. **Berdoa.** Setiap hari, mintalah agar hati anak terbuka kepada Yesus.\n2. **Gunakan kesempatan sehari-hari.** Bicarakan Yesus dan kasih Anda kepada-Nya. Nyanyikan lagu sederhana dan ajak anak ikut bernyanyi. Pujian yang tulus dan spontan membantu imannya bertumbuh.\n3. **Siapkan tempat saat teduh Anda.** Pilih kursi, tempat dekat jendela, atau lokasi tetap untuk membaca Alkitab dan berdoa. Gunakan tempat yang terlihat anak, misalnya ruang keluarga, agar ia melihat teladan Anda.\n4. **Siapkan tempat untuk anak.** Di dekat Anda, bentangkan tikar kecil atau handuk dan letakkan beberapa buku cerita Alkitab bergambar. Singkirkan mainan serta gangguan lain. Pilih waktu ketika anak tidak lelah atau lapar agar ia menantikannya dengan senang.\n5. **Nikmati waktu bersama Yesus.** Jelaskan bahwa setiap hari pada waktu yang sama, Anda berdua akan meluangkan waktu dengan Yesus. Anda membaca, berdoa, atau bernyanyi; anak dapat melihat gambar dan mengingat kisah Alkitabnya. Jelaskan bahwa pada saat ini masing-masing menikmati waktu tenang bersama Yesus. Anda dapat berbicara dan membaca cerita bersama sesudahnya. Mulailah dua hingga lima menit sesuai kemampuan anak untuk tenang dan memperhatikan. Tambahkan waktu perlahan seiring pertumbuhannya.';

async function main() {
  try { await access(target); if (!process.argv.includes('--refresh-draft')) throw new Error('Beginner draft already exists. Use --refresh-draft only for an unpublished draft.');
    for (const role of ['student', 'teacher']) if (JSON.parse(await readFile(path.join(target, role, 'edition.json'))).publicationStatus !== 'draft') throw new Error('Reviewed/published content must not be overwritten');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const prepared = new Map();
  const audits = {};
  const journal = [];
  // Finish the paired translation pass before writing any publication files.
  for (const role of ['student', 'teacher']) {
    const prefix = role === 'student' ? 'AIJ_Beginner_2026_Q4' : 'AIJ_Beginner_Teacher_2026_Q4';
    const suffix = role === 'student' ? '2026-04-bg' : '2026-04-bg-tg';
    const en = path.join(source, `${prefix}_EN_MD`, suffix), id = path.join(source, `${prefix}_ID_MD`, suffix);
    audits[role] = await auditAliveInJesusTranslations({ englishRoot: en, indonesianRoot: id });
    if (audits[role].missingEnglish.length || audits[role].missingIndonesian.length) throw new Error(`${role}: source pairing is incomplete`);
    for (const pair of audits[role].pairs) {
      const english = await readFile(path.join(en, pair.path), 'utf8');
      const original = await readFile(path.join(id, pair.path), 'utf8');
      let body = editorial(parse(original).body, role === 'teacher');
      if (role === 'teacher' && teacherTranslations[pair.path]) body = teacherTranslations[pair.path];
      const week = /^(\d{2})\//.exec(pair.path)?.[1];
      if (role === 'student' && week) {
        if (pair.path.endsWith('/01-story.md')) {
          const pictures = [...english.matchAll(/!\[[^\]]*\]\((https:\/\/[^)]+)\)/g)].map(match => match[1]);
          if (pictures.length !== stories[week].length + 1) throw new Error(`Story scene mismatch: ${week}`);
          const audio = /\bsrc:\s*(https:\/\/\S+)/.exec(parse(english).metadata)?.[1];
          const i = Number(week) - 1;
          body = `![lesson-cover](${pictures[0]})\n\n**Pesan Utama:** ${messages[i]}\n\n**Bacaan Alkitab:** ${refs[i]}\n\n> **Ayat Hafalan**\n> ${i < 8 ? '“Janganlah lupa berbuat baik dan berbagi” (Ibrani 13:16).' : '“Engkau akan menamai Dia Yesus, karena Dialah yang akan menyelamatkan umat-Nya” (Matius 1:21).'}\n\n`;
          if (audio) body += `[♫ Dengarkan cerita · bahasa Inggris](${audio})\n\n`;
          body += stories[week].map((scene, index) => `![](${pictures[index + 1]})\n\n${scene}`).join('\n\n');
        } else if (pair.path.endsWith('/02-play.md')) body = play[week];
        else body = reflections[week];
      }
      if (role === 'student' && pair.path === '00-introduction/introduction.md') body = studentIntro;
      if (role === 'student' && pair.path === '00-little-devotions/little-devotions.md') body = littleDevotions;
      if (pair.path === 'introduction.md') body = '### Aku Bisa Menjadi Penolong Tuhan\n\nKenali Samuel, Rut, dan Boas, serta cara menjadi penolong Tuhan dalam keseharian. Pekan 1–8 membahas sikap suka menolong. Pekan 9–13 merayakan kelahiran Yesus, pemberian Allah bagi kita.';
      let craftIndex = 0;
      if (role === 'teacher' && (pair.path.includes('007-crafts/') || pair.path.includes('005-simple-program-outline/'))) {
        body = body.replace(/^```=(?:Minggu|Pekan)\s*[^:\n]*:\s*[^\n]*$/gm, () => { const index = craftIndex++; return `### Pekan ${index + 1}: ${titles[index] ?? ''}`; });
      }
      body = normalizeAliveInJesusMarkdown(body).replace(/^(?:;;;|\^\^\^)\s*$/gm, '').trim();
      if (/\^\[|!a\[|!v\[|<callout>|[\u0000-\u0008]/.test(body)) throw new Error(`Unrendered source markup: ${role}/${pair.path}`);
      prepared.set(`${role}/${pair.path}`, { body, english });
      journal.push({ role, source: pair.path, englishSha256: pair.englishSha256, originalIndonesianSha256: pair.indonesianSha256, revisedSha256: sha(body), method: role === 'student' && week || role === 'teacher' && teacherTranslations[pair.path] ? 'retranslated-from-english' : 'source-compared-editorial-revision', status: 'needs-team-review' });
    }
  }
  for (const role of ['student', 'teacher']) {
    const directory = path.join(target, role);
    const editionId = `2026-q4-aij-beginner-${role}`;
    const lessons = [];
    async function save(dir, key, title, date, content) {
      await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, `${key}.md`), bilingualBeginnerSongs(content.trim()).replace(/\[♫ ([^\]\n]+)\]/g, (match, title) => title.includes('bahasa Inggris') ? match : `[♫ ${title} · bahasa Inggris]`) + '\n');
      return { key, title, date, file: `${key}.md` };
    }
    for (let n = 1; n <= 13; n++) {
      const num = String(n).padStart(2, '0');
      const startDate = new Date(Date.UTC(2026, 8, 27 + (n - 1) * 7)).toISOString().slice(0, 10);
      const endDate = new Date(Date.UTC(2026, 9, 3 + (n - 1) * 7)).toISOString().slice(0, 10);
      const lesson = { id: `lesson-${num}`, title: titles[n - 1], startDate, endDate, readings: [] };
      const dir = path.join(directory, lesson.id);
      if (role === 'student') {
        for (const [key, file, title] of [['story', '01-story.md', titles[n - 1]], ['play', '02-play.md', 'Bermain Sepanjang Hari'], ['parent-reflection', '03-the-heart-of-the-matter.md', 'Untuk Orang Tua']]) {
          lesson.readings.push(await save(dir, key, title, startDate, prepared.get(`student/${num}/${file}`).body));
        }
      } else {
        const body = prepared.get(`teacher/${num}/${num}.md`).body;
        const sections = body.split(/(?=^### )/m);
        let current = -1;
        const grouped = teacherSections.map(() => []);
        for (const section of sections) {
          const first = section.split('\n')[0].replace(/^###\s*/, '');
          const next = headingPatterns.findIndex(pattern => pattern.test(first));
          if (next >= 0) current = next;
          if (section.trim()) grouped[Math.max(0, current)].push(section);
        }
        for (const [index, [key, title]] of teacherSections.entries()) {
          if (!grouped[index].length) throw new Error(`Missing teacher section ${num}/${key}`);
          let content = refineBeginnerTeacherSection(key, grouped[index].join('\n\n'), n, crafts);
          content = content.replace(/^### PEKAN \d+:.*$/gm, `### Pekan ${n}: ${titles[n - 1]}`);
          lesson.readings.push(await save(dir, key, title, endDate, content));
        }
      }
      await json(path.join(dir, 'lesson.json'), lesson);
      lessons.push({ ...lesson, readings: undefined });
    }
    const startDate = '2026-09-27', endDate = '2026-12-26';
    const resources = role === 'teacher' ? teacherResources : [
      ['00-introduction', 'parents-letter', 'Surat untuk Orang Tua'], ['00-little-devotions', 'family-devotions', 'Renungan Singkat'], ['00-music-and-podcasts', 'music-and-podcasts', 'Musik dan Podcast'],
    ];
    for (const [folder, key, title] of resources) {
      const entry = [...prepared.entries()].find(([p]) => p.startsWith(`${role}/${folder}/`));
      if (!entry) throw new Error(`Missing ${folder}`);
      const id = role === 'student' ? 'unit-resource-family' : `unit-resource-${key}`;
      const dir = path.join(directory, id);
      let resourceBody = entry[1].body;
      if (role === 'teacher' && key === 'crafts') {
        const revised = [];
        for (let n = 1; n <= 13; n++) {
          const craft = await readFile(path.join(directory, `lesson-${String(n).padStart(2, '0')}`, 'craft.md'), 'utf8');
          revised.push(`### Pekan ${n}: ${titles[n - 1]}\n\n${craft.slice(craft.indexOf('### Prakarya'))}`);
        }
        resourceBody = revised.join('\n\n');
      }
      const reading = await save(dir, key, title, startDate, resourceBody);
      const lessonFile = path.join(dir, 'lesson.json');
      let unit = { id, title: role === 'student' ? 'Bahan Pendamping Keluarga' : title, startDate, endDate, readings: [] };
      if (role === 'student') { try { unit = JSON.parse(await readFile(lessonFile)); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
      unit.readings = [...unit.readings.filter(item => item.key !== key), reading];
      await json(lessonFile, unit);
      if (!lessons.some(item => item.id === id)) lessons.push({ ...unit, readings: undefined });
    }
    await mkdir(path.join(directory, 'assets'), { recursive: true });
    const upstream = role === 'student' ? '2025-04-zaijbgsg' : '2025-04-yaijbgtgtg';
    const coverFile = path.join(directory, 'assets/cover.png');
    try { await access(coverFile); } catch {
      const response = await fetch(`https://sabbath-school.adventech.io/api/v2/en/quarterlies/${upstream}/cover.png`, { signal: AbortSignal.timeout(40000) });
      if (!response.ok) throw new Error(`Cover failed: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 100 || !/image\//.test(response.headers.get('content-type') ?? '')) throw new Error('Invalid cover');
      await writeFile(coverFile, bytes);
    }
    await writeFile(path.join(directory, 'introduction.md'), prepared.get(`${role}/introduction.md`).body + '\n');
    let imageEstimate;
    try {
      const checkedAssets = JSON.parse(await readFile(path.join(root, 'docs/audits/beginner-assets.json'), 'utf8'));
      const sizes = new Map(checkedAssets.assets.filter(asset => asset.status === 200).map(asset => [asset.url, asset.bytes]));
      const images = new Set([...prepared.entries()].filter(([key]) => key.startsWith(role + '/')).flatMap(([,value]) => [...value.body.matchAll(/!\[[^\]]*\]\((https:\/\/[^)]+)\)/g)].map(match => match[1])));
      imageEstimate = [...images].reduce((sum, url) => sum + (sizes.get(url) ?? 0), 0) + (await readFile(coverFile)).length;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await json(path.join(directory, 'edition.json'), {
      id: editionId, programId: 'alive-in-jesus-bg-pb', locale: 'id', trackId: 'beginner', cycleId: 'year-a',
      bookRole: role === 'student' ? 'student-guide' : 'teacher-guide',
      structureType: role === 'student' ? 'weekly-story-repeated-daily' : 'repeating-quarter-program-with-weekly-variations', dayOrder: null,
      title: `Alive in Jesus · Beginner · Panduan ${role === 'student' ? 'Murid' : 'Guru'} · Triwulan IV 2026`,
      description: 'Beginner · Usia 1–3 tahun · Tahun A · Triwulan IV 2026', theme: 'Aku Bisa Menjadi Penolong Tuhan',
      startDate, endDate, cover: `editions/${editionId}/assets/cover.png`, sourceName: 'Alive in Jesus · Beginner',
      sourceUrl: 'https://beginner.aliveinjesus.info/', attribution: '© 2026 General Conference of Seventh-day Adventists®. Terjemahan Bahasa Indonesia oleh tim SabatKu.', rightsStatement: 'Hak atas materi sumber tetap pada pemiliknya.',
      publicationStatus: 'draft', sourceReviewRequired: true, ...(imageEstimate != null ? { estimatedImageBytes: imageEstimate } : {}), lessons,
    });
    await json(path.join(directory, 'source-review.json'), await createReviewManifest({ editionRoot: directory, editionId, audit: audits[role] }));
    await json(path.join(root, `docs/audits/beginner-${role}-source-audit.json`), audits[role]);
  }
  await json(path.join(root, 'docs/audits/beginner-editorial-revision.json'), { date: '2026-10-25', status: 'needs-team-review', pairs: journal, sourceNotes: ['Source asset paths retain the verified 2025 Year A identity; Indonesian study dates are 2026.', 'Teacher introduction: last four lessons corrected to weeks 9–13 after checking the quarter overview.', 'Craft section numbers restored by source order where original ID contains control characters.'] });
  console.log(`Prepared ${journal.length} paired sources. Imported two Beginner drafts; English text and PDFs remain with their provider.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
