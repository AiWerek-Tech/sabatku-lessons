"""Import a translated Real-Time Faith quarter PDF into SabatKu's seven-day format."""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import date, timedelta
from pathlib import Path

import pdfplumber
from pypdf import PdfReader, PdfWriter


LESSONS = [
    "Latihan Rohani",
    "Belajar Alkitab dan Berdoa",
    "Pelayanan Kristen",
    "Kedatangan Yesus yang Kedua Kali",
    "Penyerahan",
    "Kebaikan Rahasia",
    "Puasa, Kemurnian, dan Kesederhanaan",
    "Pengorbanan Kristen dan Lompatan Iman",
    "Orang Kristen dan Uang",
    "Mengatakannya Dengan Santun",
    "Menyatakan Perasaan",
    "Seseorang untuk Diajak Berbicara",
    "Masalah Waktu",
]
SABBATH_DATES = [date(2026, 10, 3) + timedelta(days=7 * index) for index in range(13)]
DAY_KEYS = ["sabbath", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]
DAY_NAMES = ["Sabat", "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
SECTION_HEADINGS = {
    "sabbath": "Untuk Dipelajari",
    "sunday": "Merespons",
    "monday": "Jawaban Alkitab",
    "tuesday": "Merenungkan",
    "wednesday": "Konsep Alkitab",
    "thursday": "Menghubungkan",
    "friday": "Menerapkan",
}
DAY_PATTERN = re.compile(r"(?im)^\s*(Sabat|Minggu|Senin|Selasa|Rabu|Kamis|Jumat)\s*$")
DATE_PATTERN = re.compile(r"^\d{1,2}\s+(?:Oktober|November|Desember)\s+2026$", re.IGNORECASE)
RUNNING_HEADER = re.compile(r"^.{1,70}\s*/\s*\d{1,2}\s+(?:OKTOBER|NOVEMBER|DESEMBER)\s+2026$", re.IGNORECASE)
MIN_PANEL_AREA = 20_000


def split_day_sections(text: str) -> tuple[dict[str, str], str]:
    matches = list(DAY_PATTERN.finditer(text))
    sections: dict[str, list[str]] = {}
    outside: list[str] = []
    cursor = 0
    for index, match in enumerate(matches):
        outside.append(text[cursor:match.start()])
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        key = {name.casefold(): key for key, name in zip(DAY_KEYS, DAY_NAMES)}[match.group(1).casefold()]
        sections.setdefault(key, []).append(text[match.end():end])
        cursor = end
    outside.append(text[cursor:])
    return {key: "\n\n".join(value) for key, value in sections.items()}, "\n\n".join(outside)


def panel_geometry(page: pdfplumber.page.Page, day_name: str) -> tuple[tuple[float, float, float, float], float] | None:
    matches = [word for word in page.extract_words() if word["text"].casefold() == day_name.casefold()]
    if not matches:
        return None
    anchor = min(matches, key=lambda word: word["top"])
    anchor_x = (anchor["x0"] + anchor["x1"]) / 2
    anchor_y = (anchor["top"] + anchor["bottom"]) / 2
    panels = []
    for shape in [*page.curves, *page.rects]:
        x0 = max(0.0, shape["x0"])
        top = max(0.0, shape["top"])
        x1 = min(page.width, shape["x1"])
        bottom = min(page.height, shape["bottom"])
        area = max(0.0, x1 - x0) * max(0.0, bottom - top)
        if (
            MIN_PANEL_AREA <= area <= page.width * page.height * 0.8
            and x0 <= anchor_x <= x1
            and top <= anchor_y <= bottom
        ):
            panels.append((area, (x0, top, x1, bottom)))
    if not panels:
        return None
    area, panel_box = min(panels, key=lambda candidate: candidate[0])
    return panel_box, area


def sabbath_fallback_geometry(
    page: pdfplumber.page.Page,
    peer_days: list[str],
) -> tuple[tuple[float, float, float, float], float] | None:
    """Bound the top-right Sabat card on pages whose decorative card has no shape."""
    anchors = [word for word in page.extract_words() if word["text"].casefold() == "sabat"]
    if not anchors:
        return None
    anchor = min(anchors, key=lambda word: word["top"])
    center_x = (anchor["x0"] + anchor["x1"]) / 2
    center_y = (anchor["top"] + anchor["bottom"]) / 2
    x0 = max(0.0, center_x - 55)
    top = max(0.0, anchor["top"] - 30)
    following_panels = [
        geometry[0][1]
        for name in peer_days
        if name != "Sabat"
        if (geometry := panel_geometry(page, name)) is not None
        if geometry[0][1] > center_y
    ]
    bottom = min(following_panels) - 20 if following_panels else min(page.height, center_y + 280)
    if bottom <= top:
        return None
    box = (x0, top, page.width, min(page.height, bottom))
    return box, (box[2] - box[0]) * (box[3] - box[1])


def text_from_words(words: list[dict]) -> str:
    rows: list[list] = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        row = next((candidate for candidate in rows if abs(candidate[0] - word["top"]) <= 2.5), None)
        if row is None:
            rows.append([word["top"], [word]])
        else:
            row[1].append(word)
    return "\n".join(
        " ".join(word["text"] for word in sorted(items, key=lambda item: item["x0"]))
        for _, items in sorted(rows, key=lambda candidate: candidate[0])
    )


def clear_column_gutter(
    words: list[dict],
    box: tuple[float, float, float, float],
    minimum_width: float = 450,
) -> float | None:
    """Find a real two-column gutter without mistaking blank page space for one."""
    width = box[2] - box[0]
    if width < minimum_width or len(words) < 80:
        return None
    candidates = []
    for step in range(30, 71):
        split = box[0] + width * step / 100
        left = sum((word["x0"] + word["x1"]) / 2 < split for word in words)
        right = len(words) - left
        crossing = sum(word["x0"] < split - 2 and word["x1"] > split + 2 for word in words)
        gutter_words = sum(abs((word["x0"] + word["x1"]) / 2 - split) <= 14 for word in words)
        if left >= max(20, len(words) * 0.15) and right >= max(20, len(words) * 0.15):
            candidates.append((crossing, gutter_words, abs(step - 50), split))
    if not candidates:
        return None
    crossing, gutter_words, _, split = min(candidates)
    if crossing > max(1, len(words) * 0.01) or gutter_words > max(3, len(words) * 0.035):
        return None
    return split


def day_panel_text(
    page: pdfplumber.page.Page,
    day_name: str,
    peer_days: list[str],
    extra_boxes: list[tuple[tuple[float, float, float, float], float]] | None = None,
) -> str:
    """Extract one card and exclude text in overlapping cards using their geometry."""
    geometries = {name: panel_geometry(page, name) for name in peer_days}
    target = geometries.get(day_name)
    if target is None and day_name == "Sabat":
        target = sabbath_fallback_geometry(page, peer_days)
    if target is None:
        return ""
    target_box, target_area = target
    all_boxes = {name: geometry for name, geometry in geometries.items() if geometry is not None}
    extras = extra_boxes or []
    competitors = list(all_boxes.items())
    competitors.extend((f"story-{index}", geometry) for index, geometry in enumerate(extras))

    overlaps = []
    for name, (box, area) in competitors:
        if name == day_name:
            continue
        overlap_width = min(target_box[2], box[2]) - max(target_box[0], box[0])
        overlap_height = min(target_box[3], box[3]) - max(target_box[1], box[1])
        if overlap_width > 0 and overlap_height > 0 and overlap_width * overlap_height > 500:
            overlaps.append((name, box, area))
    selected = []
    for word in page.extract_words():
        center_x = (word["x0"] + word["x1"]) / 2
        center_y = (word["top"] + word["bottom"]) / 2
        if not (target_box[0] <= center_x <= target_box[2] and target_box[1] <= center_y <= target_box[3]):
            continue
        owners = [(day_name, target_box, target_area)]
        owners.extend((name, box, area) for name, box, area in overlaps if box[0] <= center_x <= box[2] and box[1] <= center_y <= box[3])
        if not overlaps or min(owners, key=lambda owner: owner[2])[0] == day_name:
            selected.append(word)

    # Preserve normal crop order except when a clear two-column layout is
    # present. Requiring a clean gutter and substantial content on both sides
    # avoids splitting single-column prose or worksheet rows at random.
    split = clear_column_gutter(selected, target_box)
    if split is not None:
        left = [word for word in selected if (word["x0"] + word["x1"]) / 2 < split]
        right = [word for word in selected if (word["x0"] + word["x1"]) / 2 >= split]
        # Joining with a single line break lets a sentence that continues from
        # the bottom of the first column flow into the top of the second.
        # Explicit bullet markers still start fresh paragraphs in reflow().
        return "\n".join(part for part in [text_from_words(left), text_from_words(right)] if part)
    if not overlaps:
        return page.crop(target_box).extract_text() or ""
    return text_from_words(selected)


def opening_story_panel(page: pdfplumber.page.Page) -> tuple[str, tuple[float, float, float, float], float]:
    """Find the first-page feature story card by its all-caps story heading."""
    words = page.extract_words()
    day_anchors = []
    for day_name in DAY_NAMES[:3]:
        matches = [word for word in words if word["text"].casefold() == day_name.casefold()]
        if matches:
            word = min(matches, key=lambda item: item["top"])
            day_anchors.append(((word["x0"] + word["x1"]) / 2, (word["top"] + word["bottom"]) / 2))

    candidates: dict[str, tuple[int, str, tuple[float, float, float, float], float]] = {}
    for shape in [*page.curves, *page.rects]:
        x0 = max(0.0, shape["x0"])
        top = max(0.0, shape["top"])
        x1 = min(page.width, shape["x1"])
        bottom = min(page.height, shape["bottom"])
        area = max(0.0, x1 - x0) * max(0.0, bottom - top)
        if area < MIN_PANEL_AREA:
            continue
        if any(x0 <= x <= x1 and top <= y <= bottom for x, y in day_anchors):
            continue
        text = page.crop((x0, top, x1, bottom)).extract_text() or ""
        if len(text.split()) < 120:
            continue
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if lines and any(lines[0].casefold().startswith(day_name.casefold()) for day_name in DAY_NAMES):
            continue
        first_lines = " ".join(lines[:3])
        # Story panels start with a distinct display title in capitals. Requiring
        # a multiword capitalized phrase avoids treating worksheets as stories.
        if not re.search(r"\b[A-Z][A-Z0-9,'’-]{1,}(?:\s+[A-Z][A-Z0-9,'’-]{1,}){1,6}\b", first_lines):
            continue
        normalized = re.sub(r"\s+", " ", text).strip()
        candidates[normalized] = (len(text.split()), text, (x0, top, x1, bottom), area)
    if not candidates:
        return "", (0.0, 0.0, 0.0, 0.0), 0.0
    _, text, box, area = max(candidates.values(), key=lambda candidate: candidate[0])
    story_words = [
        word for word in page.extract_words()
        if box[0] <= (word["x0"] + word["x1"]) / 2 <= box[2]
        and box[1] <= (word["top"] + word["bottom"]) / 2 <= box[3]
    ]
    split = clear_column_gutter(story_words, box, minimum_width=350)
    if split is not None:
        left = [word for word in story_words if (word["x0"] + word["x1"]) / 2 < split]
        right = [word for word in story_words if (word["x0"] + word["x1"]) / 2 >= split]
        title = next((line.strip() for line in text.splitlines() if line.strip()), "")
        columns = [text_from_words(left), text_from_words(right)]
        title_tokens = [token for token in title.split() if token.isupper()]
        cleaned_columns = []
        for column in columns:
            for token in title_tokens:
                column = re.sub(rf"(?<!\w){re.escape(token)}(?!\w)", "", column)
            cleaned_columns.append(column)
        text = "\n".join(part.strip() for part in [title, *cleaned_columns] if part.strip())
    return text, box, area


def remove_pdf_headers(text: str, lesson_title: str) -> str:
    kept = []
    for line in text.splitlines():
        clean = line.strip()
        if not clean or clean.casefold() == lesson_title.casefold() or DATE_PATTERN.fullmatch(clean) or RUNNING_HEADER.fullmatch(clean):
            if not clean:
                kept.append("")
            continue
        kept.append(clean)
    return "\n".join(kept)


def fix_extraction_marks(text: str) -> str:
    text = unicodedata.normalize("NFC", text.replace("\r", ""))
    # The source PDF's text layer encodes bullets, quotation marks, and em dashes as U+FFFD.
    text = re.sub(r"(?m)^\s*\uFFFD\s+", "- ", text)
    text = re.sub(r"(?m)^\s*\uFFFD(?=(?:Pastor Troy|Kathleen D\. Sowards))", "—", text)
    text = re.sub(r"(?<=\w)\uFFFD(?=\w)", "—", text)
    text = re.sub(r"\uFFFD(.*?)\uFFFD", lambda match: "“" + match.group(1) + "”", text, flags=re.DOTALL)
    text = re.sub(r"(?m)^\s*\uFFFD", "- ", text)
    text = text.replace("\uFFFD", "—")
    # Repair a few verified text-layer joins against the rendered source page.
    text = text.replace("apaapa", "apa-apa").replace("tiaptiap", "tiap-tiap")
    text = text.replace("kelakuan.Dengan", "kelakuan. Dengan")
    text = text.replace("Mereka tampaknya kekecewaan", "Mereka tampak kecewa")
    return text


def reflow(text: str, lesson_title: str) -> str:
    text = fix_extraction_marks(remove_pdf_headers(text, lesson_title))
    output: list[str] = []
    paragraph = ""

    def flush() -> None:
        nonlocal paragraph
        if paragraph:
            output.append(paragraph.strip())
            paragraph = ""

    for line in text.splitlines():
        line = line.strip()
        if not line:
            flush()
            if output and output[-1] != "":
                output.append("")
            continue
        if re.match(r"^»\s*", line):
            flush()
            bullet = re.sub(r"^»\s*", "", line).strip()
            if bullet:
                paragraph = "- " + bullet
            continue
        if re.match(r"^(?:-\s+|\d+[.)]\s*)", line):
            flush()
            paragraph = re.sub(r"^(\d+[.)])\s*", r"\1 ", line)
            continue
        heading_words = line.split()
        if (
            len(heading_words) >= 2
            and len(line) <= 90
            and all(word == word.upper() and len(re.sub(r"[^A-Z]", "", word)) >= 3 for word in heading_words)
        ):
            flush()
            output.append(line)
            continue
        if paragraph:
            if paragraph.endswith("-") and line[:1].islower():
                paragraph = paragraph[:-1] + line
            elif paragraph.endswith("-") and line[:1].isupper():
                paragraph += line
            else:
                paragraph += " " + line
        else:
            paragraph = line
    flush()
    while output and output[-1] == "":
        output.pop()
    cleaned = re.sub(r"([!?.,:;])\1+", r"\1", "\n".join(output))
    cleaned = re.sub(r"(?m)^-\s{2,}", "- ", cleaned)
    cleaned = re.sub(r"\s+([,.;:!?])", r"\1", cleaned)
    cleaned = re.sub(r"(?<=[.!?])(?=[A-Z])", " ", cleaned)
    cleaned = re.sub(r"\btiaptiap\b", "tiap-tiap", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bapaapa\b", "apa-apa", cleaned, flags=re.IGNORECASE)
    return cleaned


def split_heading(body: str, fallback: str) -> tuple[str, str]:
    lines = [line.strip() for line in body.splitlines()]
    while lines and not lines[0]:
        lines.pop(0)
    if not lines:
        return fallback, ""
    heading = lines.pop(0)
    if heading.upper() == heading and len(heading) < 100:
        while lines and lines[0] and lines[0].upper() == lines[0] and len(lines[0]) < 100:
            heading += " " + lines.pop(0)
    return heading.strip(), "\n".join(lines).strip()


def story_markdown(text: str, title: str) -> str:
    content = reflow(text, title)
    if not content:
        return ""
    heading, body = split_heading(content, "Kisah Pekan Ini")
    title_words = []
    for word in heading.split():
        letters = [character for character in word if character.isalpha()]
        if letters and all(character.isupper() for character in letters):
            title_words.append(word)
        else:
            break
    # Some PDF text runs join the display title and first sentence on one line.
    if len(title_words) >= 2:
        story_title = " ".join(title_words)
        first_sentence = " ".join(heading.split()[len(title_words):])
        body = "\n\n".join(part for part in [first_sentence, body] if part)
        return f"## Kisah Pekan Ini\n\n### {story_title}\n\n{body}".strip()
    return f"## Kisah Pekan Ini\n\n{content}".strip()


def reading_markdown(key: str, raw: str, title: str) -> str:
    raw = re.sub(rf"(?im)^\s*{re.escape(DAY_NAMES[DAY_KEYS.index(key)])}\b\s*", "", raw)
    if key != "monday":
        heading = SECTION_HEADINGS[key]
        raw = re.sub(rf"(?im)^\s*{re.escape(heading)}\s*$", "", raw)
        raw = re.sub(rf"(?i)(?<!\w){re.escape(heading)}(?!\w)", "", raw)
    body = reflow(raw, title)
    if key != "monday":
        return f"## {SECTION_HEADINGS[key]}\n\n{body}".strip()
    heading, content = split_heading(body, SECTION_HEADINGS[key])
    if heading.casefold().startswith("jawaban alkitab"):
        section_heading = heading
    elif heading.upper() == heading and len(heading) < 100:
        section_heading = heading.title()
    else:
        section_heading = SECTION_HEADINGS[key]
        content = body
    return f"## {section_heading}\n\n{content}".strip()


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def import_edition(source: Path, destination: Path) -> None:
    reader = PdfReader(str(source))
    if len(reader.pages) != 26:
        raise ValueError(f"RTF Q4 2026 must contain 26 pages (13 lessons × 2 pages); found {len(reader.pages)}")
    with pdfplumber.open(str(source)) as layout_pdf:
        if len(layout_pdf.pages) != 26:
            raise ValueError("PDF layout extraction could not read all 26 source pages")

        edition_id = "2026-q4-rt"
        first_study_day = SABBATH_DATES[0] - timedelta(days=7)
        last_study_day = SABBATH_DATES[-1] - timedelta(days=1)
        edition_dir = destination / "id" / "realtime-faith" / edition_id
        assets_dir = edition_dir / "assets"
        assets_dir.mkdir(parents=True, exist_ok=True)
        lesson_index = []

        for index, (title, discussion_date) in enumerate(zip(LESSONS, SABBATH_DATES), start=1):
            lesson_id = f"lesson-{index:02d}"
            start = discussion_date - timedelta(days=7)
            end = discussion_date - timedelta(days=1)
            first_page = (index - 1) * 2
            page_texts = [(reader.pages[first_page + offset].extract_text() or "") for offset in range(2)]
            fallback_sections = [split_day_sections(text)[0] for text in page_texts]
            first_layout = layout_pdf.pages[first_page]
            second_layout = layout_pdf.pages[first_page + 1]
            story_text, story_box, story_area = opening_story_panel(first_layout)
            story_boxes = [(story_box, story_area)] if story_area else []
            first_page_days = ["Sabat", "Minggu", "Senin"]
            second_page_days = ["Selasa", "Rabu", "Kamis", "Jumat"]
            panels = {
                "sabbath": day_panel_text(first_layout, "Sabat", first_page_days, story_boxes) or fallback_sections[0].get("sabbath", ""),
                "sunday": day_panel_text(first_layout, "Minggu", first_page_days, story_boxes) or fallback_sections[0].get("sunday", ""),
                "monday": day_panel_text(first_layout, "Senin", first_page_days, story_boxes) or fallback_sections[0].get("monday", ""),
                "tuesday": day_panel_text(second_layout, "Selasa", second_page_days) or fallback_sections[1].get("tuesday", ""),
                "wednesday": day_panel_text(second_layout, "Rabu", second_page_days) or fallback_sections[1].get("wednesday", ""),
                "thursday": day_panel_text(second_layout, "Kamis", second_page_days) or fallback_sections[1].get("thursday", ""),
                "friday": day_panel_text(second_layout, "Jumat", second_page_days) or fallback_sections[1].get("friday", ""),
            }
            missing = [key for key, value in panels.items() if not value.strip()]
            if missing:
                raise ValueError(f"{lesson_id}: could not locate labeled content panels {missing}")

            story = story_markdown(story_text, title)
            if not story:
                raise ValueError(f"{lesson_id}: opening Sabbath story was not extracted")

            readings = []
            for day_index, key in enumerate(DAY_KEYS):
                day_date = start + timedelta(days=day_index)
                day_content = reading_markdown(key, panels[key], title)
                if key == "sabbath":
                    day_content = f"{story}\n\n{day_content}".strip()
                if lesson_id == "lesson-13" and key == "friday":
                    activity = (
                        "Cobalah mencatat waktu Anda selama tiga hari dalam pekan ini. "
                        "Tuliskan apa yang Anda lakukan setiap jam setiap hari saat Anda terbangun "
                        "(seperti: saat teduh, belajar Alkitab, berdoa, menolong orang lain, makan, "
                        "mengerjakan pekerjaan rumah, melakukan hobi, berbicara dengan keluarga, "
                        "berbicara di telepon atau berkirim pesan di komputer atau di perangkat "
                        "elektronik lainnya, persiapan, tidur, bergaul dengan teman)."
                    )
                    day_content = (
                        "## Menerapkan\n\n"
                        + activity
                        + "\n\nLembar pencatatan untuk Hari Pertama, Hari Kedua, dan Hari Ketiga "
                        "(pukul 07.00–22.00) tersedia pada PDF pelajaran ini."
                    )
                if lesson_id == "lesson-03" and key == "friday":
                    day_content = re.sub(
                        r"bagaimana Anda akan\s+rencana Anda\?",
                        "bagaimana Anda akan menerapkan rencana Anda?",
                        day_content,
                    )
                if not day_content or "\uFFFD" in day_content:
                    raise ValueError(f"{lesson_id}/{key}: missing content or unreadable extraction mark")
                filename = f"{key}.md"
                (edition_dir / lesson_id / filename).parent.mkdir(parents=True, exist_ok=True)
                (edition_dir / lesson_id / filename).write_text(day_content + "\n", encoding="utf-8")
                readings.append({"key": key, "title": title if key == "sabbath" else DAY_NAMES[day_index], "date": day_date.isoformat(), "file": filename})

            pdf_path = assets_dir / f"{lesson_id}.pdf"
            writer = PdfWriter()
            writer.add_page(reader.pages[first_page])
            writer.add_page(reader.pages[first_page + 1])
            writer.add_metadata({"/Title": f"Real-Time Faith Q4 2026 · Pelajaran {index:02d} · {title}"})
            with pdf_path.open("wb") as output:
                writer.write(output)

            lesson = {
                "id": lesson_id,
                "title": title,
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
                "discussionDate": discussion_date.isoformat(),
                "readings": readings,
                "pdfs": [{"id": "student-id", "title": f"PDF Siswa · Pelajaran {index:02d}", "src": f"../../assets/{lesson_id}.pdf"}],
            }
            write_json(edition_dir / lesson_id / "lesson.json", lesson)
            lesson_index.append({"id": lesson_id, "title": title, "startDate": start.isoformat(), "endDate": end.isoformat(), "discussionDate": discussion_date.isoformat()})

        edition = {
            "id": edition_id,
            "programId": "realtime-faith",
            "locale": "id",
            "title": "Real-Time Faith · Triwulan IV 2026",
            "description": "Tiga belas pelajaran remaja dengan tujuh bacaan harian dan PDF siswa per pelajaran.",
            "startDate": first_study_day.isoformat(),
            "endDate": last_study_day.isoformat(),
            "sourceName": "Real-Time Faith · General Conference",
            "sourceUrl": "https://www.realtimefaith.net/",
            "attribution": "© 2026 General Conference of Seventh-day Adventists®. Diterjemahkan oleh tim SabatKu dengan izin resmi.",
            "rightsStatement": "Terjemahan tim SabatKu diterbitkan dengan izin resmi. Hak materi sumber tetap pada General Conference.",
            "publicationStatus": "published",
            "lessons": lesson_index,
            "dayOrder": DAY_KEYS,
        }
        write_json(edition_dir / "edition.json", edition)
        readme = """# Real-Time Faith · Triwulan IV 2026

Naskah siswa terjemahan tim SabatKu dibagi dari PDF sumber menjadi 13 PDF pekanan dan tujuh bacaan Markdown per pelajaran.

## Struktur satu pelajaran

- Sabat: kisah pembuka dan bagian **Untuk Dipelajari**.
- Minggu: **Merespons**.
- Senin: **Jawaban Alkitab**.
- Selasa: **Merenungkan**.
- Rabu: **Konsep Alkitab**.
- Kamis: **Menghubungkan**.
- Jumat: **Menerapkan**.

Setiap PDF pelajaran mempertahankan kedua halaman sumber, termasuk foto, lembar kerja, dan teka-teki. Bacaan teks menggunakan lapisan teks PDF; jika aktivitas memakai kisi atau gambar, PDF menjadi salinan visual lengkapnya.

Tanggal yang tercetak pada sampul pekanan adalah Sabat pembahasan. Rentang bacaan aplikasi berjalan dari Sabat sebelumnya sampai Jumat, dan tanggal pembahasan disimpan terpisah.
"""
        (edition_dir / "README.md").write_text(readme, encoding="utf-8")
        print(f"Imported {edition_id}: {len(lesson_index)} lessons, 91 daily readings, 13 student PDFs.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_pdf", type=Path)
    parser.add_argument("--content-root", type=Path, default=Path("content"))
    args = parser.parse_args()
    import_edition(args.source_pdf, args.content_root)


if __name__ == "__main__":
    main()
