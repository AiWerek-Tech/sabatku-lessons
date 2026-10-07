#!/usr/bin/env python3
"""Import the official SabatKu Easy Reading HTML export into Markdown source files."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from html.parser import HTMLParser
from pathlib import Path


MONTHS = {
    "JANUARI": 1, "FEBRUARI": 2, "MARET": 3, "APRIL": 4,
    "MEI": 5, "JUNI": 6, "JULI": 7, "AGUSTUS": 8,
    "SEPTEMBER": 9, "OKTOBER": 10, "NOVEMBER": 11, "DESEMBER": 12,
}
DAY_KEYS = {
    "SABAT": ("sabbath", "Sabat Petang"),
    "SABAT PETANG": ("sabbath", "Sabat Petang"),
    "MINGGU": ("sunday", "Minggu"),
    "SENIN": ("monday", "Senin"),
    "SELASA": ("tuesday", "Selasa"),
    "RABU": ("wednesday", "Rabu"),
    "KAMIS": ("thursday", "Kamis"),
    "JUMAT": ("friday", "Jumat"),
}
EXPECTED_DAYS = ["sabbath", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]
LESSON_RE = re.compile(r"^PELAJARAN\s+(\d{1,2})\s*:\s*(.+)$", re.IGNORECASE)
DATE_RE = re.compile(
    r"^(SABAT(?: PETANG)?|MINGGU|SENIN|SELASA|RABU|KAMIS|JUMAT),\s*(\d{1,2})\s+([A-Z]+)\s+(\d{4})$",
    re.IGNORECASE,
)


class LessonHtmlParser(HTMLParser):
    """Read text blocks in document order and retain standalone embedded images."""

    BLOCK_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.blocks: list[dict] = []
        self.current: dict | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag in self.BLOCK_TAGS:
            self.flush()
            self.current = {"tag": tag, "parts": [], "images": []}
        elif tag == "br" and self.current:
            self.current["parts"].append("\n")
        elif tag == "img":
            image = {
                "src": attributes.get("src", ""),
                "alt": attributes.get("alt", "").strip(),
            }
            if self.current:
                self.current["images"].append(image)
            else:
                self.blocks.append({"tag": "img", "text": "", "images": [image]})

    def handle_endtag(self, tag: str) -> None:
        if self.current and self.current["tag"] == tag:
            self.flush()

    def handle_data(self, data: str) -> None:
        if self.current:
            self.current["parts"].append(data)

    def flush(self) -> None:
        if not self.current:
            return
        text = " ".join("".join(self.current["parts"]).split())
        if text or self.current["images"]:
            self.blocks.append({"tag": self.current["tag"], "text": text, "images": self.current["images"]})
        self.current = None


def parse_date_header(text: str) -> tuple[str, str] | None:
    match = DATE_RE.match(text.strip())
    if not match:
        return None
    label, day, month_name, year = match.groups()
    month = MONTHS.get(month_name.upper())
    if not month:
        raise ValueError(f"Unknown month in date header: {text}")
    day_key, _ = DAY_KEYS[label.upper()]
    return day_key, f"{int(year):04d}-{month:02d}-{int(day):02d}"


def safe_block_text(block: dict) -> str:
    text = block["text"].strip()
    if not text:
        return ""
    if re.fullmatch(r"Pelajaran\s+\d+", text, re.IGNORECASE):
        return ""
    if text.startswith("EDISI MUDAH DIBACA"):
        return ""
    if text.startswith("PELAJARAN SEKOLAH SABAT MUDAH DIBACA"):
        return ""
    return text


def markdown_for(blocks: list[dict], edition_assets_prefix: str) -> str:
    lines: list[str] = []
    for block in blocks:
        text = safe_block_text(block)
        tag = block["tag"]
        if text:
            if tag == "h1":
                lines.append(f"# {text}")
            elif tag == "h2":
                lines.append(f"## {text}")
            elif tag in ("h3", "h4", "h5", "h6"):
                lines.append(f"### {text}")
            elif text.upper() in {"BACAAN PEKAN INI", "AYAT HAFALAN"}:
                lines.append(f"### {text.title()}")
            else:
                lines.append(text)
        for image in block["images"]:
            src = image["src"].replace("\\", "/")
            filename = Path(src).name
            if not filename:
                continue
            alt = image["alt"] or "Ilustrasi dari publikasi edisi"
            lines.append(f"![{alt}]({edition_assets_prefix}/{filename})")
        if text or block["images"]:
            lines.append("")
    return "\n".join(lines).strip() + "\n"


def without_first_heading(blocks: list[dict], heading: str) -> list[dict]:
    for index, block in enumerate(blocks):
        if block["tag"] in {"h1", "h2", "h3"} and block["text"].strip() == heading:
            return blocks[:index] + blocks[index + 1:]
    return blocks


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, type=Path)
    parser.add_argument("--assets", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--edition-id", default="2026-q4-er")
    args = parser.parse_args()

    document = LessonHtmlParser()
    document.feed(args.html.read_text(encoding="utf-8"))
    blocks = document.blocks
    image_names = {Path(image["src"].replace("\\", "/")).name for block in blocks for image in block["images"]}
    missing = sorted(name for name in image_names if not (args.assets / name).is_file())
    if missing:
        raise SystemExit(f"Source image files missing: {', '.join(missing)}")

    lesson_starts: list[tuple[int, int, str]] = []
    for index, block in enumerate(blocks):
        match = LESSON_RE.match(block["text"]) if block["tag"] == "h1" else None
        if match:
            lesson_starts.append((index, int(match.group(1)), match.group(2).strip()))
    if [number for _, number, _ in lesson_starts] != list(range(1, 14)):
        raise SystemExit("Expected lesson headings 1 through 13 in source order")

    intro_index = next((i for i, block in enumerate(blocks) if block["tag"] == "h1" and block["text"].strip().upper() == "PENDAHULUAN"), None)
    if intro_index is None or not lesson_starts:
        raise SystemExit("Could not find the quarter introduction and lesson headings")
    first_lesson_index = lesson_starts[0][0]
    if intro_index >= first_lesson_index:
        raise SystemExit("Quarter introduction appears after the first lesson")

    edition_dir = args.output / args.edition_id
    edition_dir.mkdir(parents=True, exist_ok=True)
    image_output = edition_dir / "assets"
    image_output.mkdir(parents=True, exist_ok=True)
    for name in sorted(image_names):
        shutil.copy2(args.assets / name, image_output / name)

    intro = markdown_for(blocks[intro_index:first_lesson_index], "assets")
    (edition_dir / "introduction.md").write_text(intro, encoding="utf-8")

    credit_start = next((i for i, block in enumerate(blocks) if block["text"].startswith("Kantor editorial")), None)
    about_start = next((i for i, block in enumerate(blocks) if block["tag"] == "h1" and block["text"].strip().upper() == "TENTANG BUKU INI"), None)
    notes_parts = []
    if credit_start is not None:
        notes_end = intro_index
        notes_parts.append(markdown_for(blocks[credit_start:notes_end], "assets"))
    if about_start is not None:
        notes_parts.append(markdown_for(blocks[about_start:], "assets"))
    if notes_parts:
        (edition_dir / "publication-notes.md").write_text("\n\n".join(notes_parts).strip() + "\n", encoding="utf-8")

    lesson_index: list[dict] = []
    total_daily_readings = 0
    total_stories = 0
    edition_start: str | None = None
    edition_end: str | None = None

    for start_position, (block_start, lesson_number, lesson_title) in enumerate(lesson_starts):
        block_end = lesson_starts[start_position + 1][0] if start_position + 1 < len(lesson_starts) else len(blocks)
        lesson_blocks = blocks[block_start:block_end]
        day_positions: list[tuple[int, str, str]] = []
        story_positions: list[int] = []
        for local_index, block in enumerate(lesson_blocks):
            parsed = parse_date_header(block["text"])
            if parsed:
                day_key, date = parsed
                day_positions.append((local_index, day_key, date))
            if block["text"].strip().lower().startswith("inside story:"):
                story_positions.append(local_index)

        if [key for _, key, _ in day_positions] != EXPECTED_DAYS:
            raise SystemExit(f"Lesson {lesson_number}: expected seven readings in order, found {[key for _, key, _ in day_positions]}")
        if len(story_positions) != 1:
            raise SystemExit(f"Lesson {lesson_number}: expected one Inside Story, found {len(story_positions)}")
        if story_positions[0] < day_positions[-1][0]:
            raise SystemExit(f"Lesson {lesson_number}: Inside Story appears before Friday reading ends")

        lesson_id = f"lesson-{lesson_number:02d}"
        lesson_dir = edition_dir / lesson_id
        lesson_dir.mkdir(parents=True, exist_ok=True)
        readings = []

        for day_index, (local_start, day_key, date) in enumerate(day_positions):
            if day_index + 1 < len(day_positions):
                local_end = day_positions[day_index + 1][0]
            else:
                local_end = story_positions[0]
            section = lesson_blocks[local_start:local_end]
            if day_index == 0:
                title = DAY_KEYS["SABAT PETANG"][1]
            else:
                title = next((block["text"].strip() for block in section[1:] if block["tag"] == "h2" and block["text"].strip()), DAY_KEYS[next(label for label, pair in DAY_KEYS.items() if pair[0] == day_key)][1])
            content_section = section[1:]
            if day_index > 0:
                content_section = without_first_heading(content_section, title)
            markdown = markdown_for(content_section, "../../assets")
            (lesson_dir / f"{day_key}.md").write_text(markdown, encoding="utf-8")
            readings.append({"key": day_key, "title": title, "date": date, "file": f"{day_key}.md"})
            total_daily_readings += 1
            edition_start = edition_start or date
            edition_end = date

        story_start = story_positions[0]
        story_title = next((block["text"].strip() for block in lesson_blocks[story_start + 1:] if block["tag"] == "h2" and block["text"].strip()), f"Kisah di Balik Layar — Pelajaran {lesson_number}")
        story_blocks = without_first_heading(lesson_blocks[story_start + 1:], story_title)
        story_markdown = markdown_for(story_blocks, "../../assets")
        (lesson_dir / "inside-story.md").write_text(story_markdown, encoding="utf-8")

        lesson_meta = {
            "id": lesson_id,
            "title": lesson_title,
            "startDate": day_positions[0][2],
            "endDate": day_positions[-1][2],
            "readings": readings,
            "supplementaryReadings": [{"key": "inside-story", "title": story_title, "file": "inside-story.md"}],
        }
        write_json(lesson_dir / "lesson.json", lesson_meta)
        lesson_index.append({"id": lesson_id, "title": lesson_title, "startDate": lesson_meta["startDate"], "endDate": lesson_meta["endDate"]})
        total_stories += 1

    if total_daily_readings != 91 or total_stories != 13 or edition_start != "2026-09-26" or edition_end != "2026-12-25":
        raise SystemExit(f"Unexpected quarter span/content: {total_daily_readings} readings, {total_stories} stories, {edition_start}..{edition_end}")

    edition = {
        "id": args.edition_id,
        "programId": "adult-easy-reading",
        "locale": "id",
        "title": "Karunia Pesan Khusus",
        "description": "Pelajaran Sekolah Sabat Dewasa Edisi Mudah Dibaca, Triwulan IV 2026.",
        "startDate": edition_start,
        "endDate": edition_end,
        "cover": None,
        "sourceName": "General Conference of Seventh-day Adventists®",
        "attribution": "© 2026 General Conference of Seventh-day Adventists®. Edisi Mudah Dibaca disiapkan oleh Kantor Pedoman Pendalaman Alkitab Dewasa bekerja sama dengan Three Angels Deaf Ministries. Terjemahan bebas Bahasa Indonesia oleh tim penerjemah resmi SabatKu.",
        "rightsStatement": "Hak cipta dilindungi. Materi ini merupakan publikasi resmi tim penerjemah SabatKu dan disediakan untuk akses publik melalui SabatKu.",
        "publicationStatus": "published",
        "introductionFile": "introduction.md",
        "publicationNotesFile": "publication-notes.md",
        "lessonCount": len(lesson_index),
        "contributors": ["Tim penerjemah resmi SabatKu"],
    }
    write_json(edition_dir / "edition.json", edition)
    print(f"Imported {edition['id']}: {len(lesson_index)} lessons, {total_daily_readings} daily readings, {total_stories} supplementary stories, {len(image_names)} images.")


if __name__ == "__main__":
    main()
