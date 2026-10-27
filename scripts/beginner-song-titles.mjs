import { readFile } from 'node:fs/promises';
export const beginnerSongs = JSON.parse(await readFile(new URL('./beginner-song-titles.json', import.meta.url), 'utf8'));
const byFile = new Map(beginnerSongs.map(([file, english, indonesian]) => [file, `${english} (${indonesian})`]));
const aliases = new Map(beginnerSongs.map(([,english,indonesian]) => [english,[english,indonesian]]));
aliases.set('Nature Box Song', ['Nature Box','Kotak Alam']);
aliases.set('Saya Membuka Alkitab Saya dengan Hati-hati', ['I Open My Bible Carefully','Aku Membuka Alkitab dengan Hati-hati']);
aliases.set('Saatnya Berdoa', ['When It’s Time to Pray','Saatnya Berdoa']);
aliases.set('Sekolah Sabat Telah Berakhir', ['Sabbath School Is Over','Sekolah Sabat Telah Usai']);
for (const pair of [['Away in a Manger','Di Sebuah Palungan'],['Silent Night','Malam Kudus'],['Angels We Have Heard on High','Malaikat yang Kami Dengar dari Surga']]) aliases.set(pair[0], pair);
const titleKey = value => value.replace(/[‘’]/g, "'").replace(/[.,]+$/, '').trim().toLocaleLowerCase('en');
const titles = new Map();
for (const [alias, pair] of aliases) titles.set(titleKey(alias), pair);
for (const [, english, indonesian] of beginnerSongs) titles.set(titleKey(indonesian), [english, indonesian]);
/** Preserve original song names; the Indonesian text is a title translation. */
export function bilingualBeginnerSongs(markdown) {
  let result = markdown.replace(/\[♫ ([^\]\n]+)\]\((https:\/\/[^)]+)\)/g, (match, label, url) => {
    const title = byFile.get(new URL(url).pathname.split('/').at(-1));
    return title ? `[♫ ${title} · bahasa Inggris](${url})` : match;
  });
  // Match quoted titles only: never rewrite Bible quotations or song lyrics.
  result = result.replace(/([“"])([^”"\n]+)([”"])(?:\s*\(((?:[^()\n]|\([^()\n]*\))*)\))?/g, (match, open, raw, close, subtitle, offset) => {
    const pair = titles.get(titleKey(raw));
    if (!pair) return match;
    // A doll called Bayi Yesus is not a song title. Translated aliases are
    // converted only immediately after an explicit singing/listening cue.
    const englishOrKnownAlias = [...aliases].some(([alias]) => titleKey(alias) === titleKey(raw));
    const before = result.slice(Math.max(0, offset - 100), offset);
    if (!englishOrKnownAlias && !/(?:nyanyikan|lagu|dengarkan|putar)\s*(?:lagu\s*)?(?:\*\*|_)?$/i.test(before)) return match;
    const label = `${open}${pair[0]}${close} (${pair[1]})${/[.,]+$/.exec(raw)?.[0] ?? ''}`;
    const subtitlePair = subtitle && titles.get(titleKey(subtitle));
    const existingTranslation = subtitle && (titleKey(subtitle) === titleKey(pair[1]) || subtitlePair?.[0] === pair[0]);
    return subtitle && !existingTranslation ? `${label} (${subtitle})` : label;
  });
  result = result.replaceAll('### Lagu-lagu Pujian Minggu -8','### Lagu Pujian Pekan 1–8')
    .replaceAll('### Lagu-lagu Pujian Minggu -13','### Lagu Pujian Pekan 9–13');
  return result;
}
