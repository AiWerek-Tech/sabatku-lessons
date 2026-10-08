# EGW Notes Q4 2026

Sumber tim berada di `C:\Users\ADMIN\Music\EGW Notes Q4 2026`. Materi digital disusun dari HTML publikasi resmi, dengan PDF versi cetak sebagai pemeriksaan silang. Catatan EGW Indonesia disimpan sebagai program tersendiri dan terhubung ke bacaan Dewasa Standar serta Mudah Dibaca lewat nomor pelajaran dan hari.

- `edition.json`: metadata terbit dan ID bacaan untuk hubungan lintas edisi.
- `lesson-01` … `lesson-13/lesson.json`: judul resmi dan rentang pekan.
- `lesson-XX/notes.md`: tujuh bagian bacaan harian dalam Markdown.
- `assets/cover.webp` dan `assets/illustration-XX.webp`: cover serta ilustrasi publikasi yang dioptimalkan.
- `edition.json.lessons[].companionReadings[]`: pemetaan ID harian Dewasa Standar, Mudah Dibaca, dan EGW Notes.

Pipeline menghasilkan program `adult-egw-notes` secara terpisah. Catatan bahasa Inggris tetap mengikuti suplemen yang sudah ada pada sumber Dewasa Standar Adventech.
