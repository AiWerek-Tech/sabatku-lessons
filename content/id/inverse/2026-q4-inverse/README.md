# Kerangka InVerse Bahasa Indonesia · Triwulan IV 2026

Folder ini hanya menyediakan kerangka editorial lokal. Materi pelajaran Indonesia belum dimasukkan dan status edisi tetap `draft`, sehingga builder tidak menerbitkannya ke katalog publik.

Struktur mengikuti InVerse Q4 2026 berbahasa Inggris: 13 pelajaran mingguan, masing-masing tujuh hari dengan urutan Minggu–Sabat (`inTro`, `inGest`, `inTerpret`, `inSpect`, `inVite`, `inSight`, `inQuire`). Minggu InVerse dimulai pada hari Minggu dan berakhir pada Sabtu; ini berbeda dari pekan Sekolah Sabat Dewasa yang dimulai Sabat petang.

- `edition.json`: metadata edisi dan daftar 13 pelajaran.
- `lesson-NN/lesson.json`: judul, rentang tanggal, serta metadata tujuh bacaan.
- `lesson-NN/<hari>.md`: placeholder untuk materi resmi tim, bukan konten publikasi.
- `lesson-NN/lesson.json` menyediakan `pdfs: []` sebagai tempat metadata PDF bila tim nanti menyediakan file resminya.

`sourceTitle` hanya menjadi referensi editorial untuk menyamakan nomor dan jadwal dengan edisi Inggris. Jangan mengubah status ke `published` sebelum judul dan bacaan Indonesia resmi selesai, metadata sumber/hak ditinjau, dan semua placeholder diganti.
