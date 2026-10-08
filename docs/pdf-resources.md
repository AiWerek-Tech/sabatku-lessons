# PDF resources for lesson editions

Adult Standard editions continue to receive PDF attachments from the Adventech catalog. The Android reader lists each attachment under its lesson, opens it in the built-in PDF reader, and can save all attachments for offline reading.

For SabatKu-published Adult Easy Reading and EGW Notes editions, add a `pdfs` array to the lesson's `lesson.json` when an official PDF is ready:

```json
{
  "pdfs": [
    {
      "id": "lesson-handout",
      "title": "Bahan pelajaran 01",
      "file": "../../assets/lesson-01.pdf"
    }
  ]
}
```

Put the PDF under that edition's `assets/` directory. Each lesson may list more than one PDF; `id` values must be unique within the lesson. Leave `pdfs` out or use an empty array while no official file is available. The content builder validates the file path and confirms that the asset exists before publishing its URL. The Android provider then exposes it as a lesson attachment; opening it downloads it on demand, and the edition page can save all attachments for offline use.

Only add PDFs supplied or approved for publication by the official translation team. Do not add placeholder files or external URLs to this manifest.
