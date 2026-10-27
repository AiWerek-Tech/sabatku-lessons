import { readFileSync } from 'node:fs';
export const primarySongs = JSON.parse(readFileSync(new URL('./primary-song-titles.json', import.meta.url), 'utf8'));
const key = value => value.replace(/[‘’]/g, "'").replace(/[.,!?]+$/, '').trim().toLocaleLowerCase('en');
const titles = new Map(primarySongs.flatMap(song => [song.english, song.indonesian, ...song.aliases].map(title => [key(title), song])));
export const primarySongLabel = song => `${song.english} (${song.indonesian})`;
function audioLabel(url) {
  try { const song = primarySongs.find(song => song.asset === new URL(url).pathname.split('/').at(-1)); return song && primarySongLabel(song); }
  catch { return null; }
}
export function labelPrimarySongs(markdown) {
  const audio = markdown.replace(/^!a\[(https:\/\/[^\]]+)\][^\n]*$/gm, (original, url) => {
    const label = audioLabel(url); return label ? `[♫ ${label}](${url})` : original;
  }).replace(/\[♫ ([^\]]+)\]\((https:\/\/[^)]+)\)/g, (original, label, url) => {
    const title = audioLabel(url); return title ? `[♫ ${title}](${url})` : original;
  });
  let list = false;
  return audio.split(/(\n\s*\n)/).map(paragraph => {
    const context = /nyanyi|lagu|musik|himne|putar/i.test(paragraph);
    if (paragraph.trim() && !/^\s*[-*+•]\s/.test(paragraph) && !/^\s*(?:\{|\[♫)/.test(paragraph)) list = context;
    if (!context && !(list && /^\s*[-*+•]\s/.test(paragraph))) return paragraph;
    return paragraph.replace(/([“"])([^”"\n]+)([”"])(?:\s*\(((?:[^()\n]|\([^()\n]*\))*)\))?/g, (original, open, title, close, subtitle) => {
      const song = titles.get(key(title));
      if (!song) return original;
      const label = `${open}${song.english}${close} (${song.indonesian})${/[.,]+$/.exec(title)?.[0] ?? ''}`;
      return subtitle && key(subtitle) !== key(song.indonesian) && titles.get(key(subtitle)) !== song ? `${label} (${subtitle})` : label;
    });
  }).join('');
}
