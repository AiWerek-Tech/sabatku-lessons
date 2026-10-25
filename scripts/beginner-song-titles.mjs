import { readFile } from 'node:fs/promises';
export const beginnerSongs = JSON.parse(await readFile(new URL('./beginner-song-titles.json', import.meta.url), 'utf8'));
const byFile = new Map(beginnerSongs.map(([file, english, indonesian]) => [file, `${english} (${indonesian})`]));
const aliases = new Map(beginnerSongs.map(([,english,indonesian]) => [english,[english,indonesian]]));
aliases.set('Nature Box Song', ['Nature Box','Kotak Alam']);
aliases.set('Saya Membuka Alkitab Saya dengan Hati-hati', ['I Open My Bible Carefully','Aku Membuka Alkitab dengan Hati-hati']);
aliases.set('Saatnya Berdoa', ['When It’s Time to Pray','Saatnya Berdoa']);
aliases.set('Sekolah Sabat Telah Berakhir', ['Sabbath School Is Over','Sekolah Sabat Telah Usai']);
for (const pair of [['Away in a Manger','Di Sebuah Palungan'],['Silent Night','Malam Kudus'],['Angels We Have Heard on High','Malaikat yang Kami Dengar dari Surga']]) aliases.set(pair[0], pair);
/** Preserve original song names; the Indonesian text is a title translation. */
export function bilingualBeginnerSongs(markdown) {
  let result = markdown.replace(/\[♫ ([^\]\n]+)\]\((https:\/\/[^)]+)\)/g, (match, label, url) => {
    const title = byFile.get(new URL(url).pathname.split('/').at(-1));
    return title ? `[♫ ${title} · bahasa Inggris](${url})` : match;
  });
  // Match quoted titles only: never rewrite Bible quotations or song lyrics.
  result = result.replace(/“([^”\n]+)”(?! \()/g, (match, raw) => {
    const title = raw.replace(/\.$/,'');
    const pair = aliases.get(title);
    return pair ? `“${pair[0]}” (${pair[1]})${raw.endsWith('.') ? '.' : ''}` : match;
  });
  result = result.replaceAll('### Lagu-lagu Pujian Minggu -8','### Lagu Pujian Pekan 1–8')
    .replaceAll('### Lagu-lagu Pujian Minggu -13','### Lagu Pujian Pekan 9–13');
  return result;
}
