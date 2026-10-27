import { readFileSync } from 'node:fs';

export const kindergartenSongs = JSON.parse(readFileSync(new URL('./kindergarten-song-titles.json', import.meta.url), 'utf8'));
const key = value => value.replace(/[’‘]/g, "'").replace(/[.,!?]+$/, '').trim().toLocaleLowerCase('en');
const byTitle = new Map();
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const song of kindergartenSongs) {
  for (const title of [song.english, song.indonesian, ...song.aliases]) byTitle.set(key(title), song);
}
export const songLabel = song => `${song.english} (${song.indonesian})`;

// Restrict substitutions to audio links and quoted song titles. In particular,
// ordinary references to Firman Tuhan and Hari Sabat must remain Indonesian.
export function labelKindergartenSongs(markdown) {
  let songList = false;
  return markdown.split(/(\n\s*\n)/).map(paragraph => {
    paragraph = paragraph.replace(/\[♫ ([^\]]+)\]\(([^)]+)\)/g, (original, label, url) => {
      let asset;
      try { asset = new URL(url).pathname.split('/').at(-1); } catch { return original; }
      const song = kindergartenSongs.find(item => item.asset === asset);
      return song ? `[♫ ${songLabel(song)}](${url})` : original;
    });
    const context = /nyanyi|lagu|musik|himne|putar/i.test(paragraph);
    if (paragraph.trim() && !/^\s*[-*+]\s/.test(paragraph) && !/^(?:\[♫|\s*$)/.test(paragraph)) songList = context;
    if (!context && !(songList && /^\s*[-*+]\s/.test(paragraph))) return paragraph;
    paragraph = paragraph.replace(/([“"])([^”"\n]+)([”"])(?:\s*\(((?:[^()\n]|\([^()\n]*\))*)\))?/g, (original, open, title, close, subtitle) => {
      const song = byTitle.get(key(title));
      if (!song) return original;
      const punctuation = /[.,]+$/.exec(title)?.[0] ?? '';
      const translated = `${open}${song.english}${close} (${song.indonesian})${punctuation}`;
      // Keep independent references, such as a hymnal number, after the title.
      return subtitle && key(subtitle) !== key(song.indonesian) && !song.aliases.some(alias => key(alias) === key(subtitle))
        ? `${translated} (${subtitle})` : translated;
    });
    for (const song of kindergartenSongs) paragraph = paragraph.replace(new RegExp(`(?:\\s+\\(${escape(song.indonesian)}\\)){2,}`, 'g'), ` (${song.indonesian})`);
    return paragraph;
  }).join('');
}
