import { readFileSync } from 'node:fs';
export const powerpointsSongs = JSON.parse(readFileSync(new URL('./powerpoints-song-titles.json', import.meta.url), 'utf8'));
const key = value => value.replace(/[‘’]/g, "'").replace(/[.,]+$/, '').trim().toLowerCase();
const titles = new Map(powerpointsSongs.flatMap(pair => pair.map(title => [key(title), pair])));

export function labelPowerpointsSongs(markdown) {
  let songList = false;
  return markdown.split(/(\n\s*\n)/).map(paragraph => {
    const context = /nyanyi|lagu|musik|himne|putar|rekaman/i.test(paragraph);
    if (paragraph.trim() && !/^\s*[-*+]\s/.test(paragraph)) songList = context;
    if (!context && !(songList && /^\s*[-*+]\s/.test(paragraph))) return paragraph;
    return paragraph.replace(/([“"])([^”"\n]+)([”"])(?:\s*\(((?:[^()\n]|\([^()\n]*\))*)\))?/g, (original, open, raw, close, subtitle) => {
      const pair = titles.get(key(raw));
      if (!pair) return original;
      const label = `${open}${pair[0]}${close} (${pair[1]})${/[.,]+$/.exec(raw)?.[0] ?? ''}`;
      return subtitle && key(subtitle) !== key(pair[1]) ? `${label} (${subtitle})` : label;
    });
  }).join('');
}
