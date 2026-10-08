# InVerse Bahasa Indonesia · Karunia Nubuat · Triwulan IV 2026

Materi lokal mencakup 13 pelajaran mingguan dan 91 bacaan harian dengan urutan Minggu–Sabat (`inTro`, `inGest`, `inTerpret`, `inSpect`, `inVite`, `inSight`, `inQuire`). Setiap file harian hanya memuat bacaan untuk hari itu; bagian dari hari berikutnya tidak digabungkan. Tanggal dan judul Indonesia diambil dari publikasi yang diberikan tim penerjemah resmi SabatKu. Cover edisi serta ilustrasi tema setiap pelajaran berada di `assets/`.

Edisi berstatus `published` dan masuk katalog InVerse Indonesia. Materi harian mengikuti HTML publikasi yang diberikan tim; catatan internal penerjemah tidak disertakan dalam bacaan.

`source-print-edition.pdf` adalah PDF cetak triwulan penuh untuk pemeriksaan silang. Metadata PDF per pelajaran masih kosong karena file ini mencakup seluruh triwulan, bukan satu pelajaran.

- `edition.json`: metadata edisi dan jadwal 13 pelajaran.
- `lesson-NN/lesson.json`: judul, tanggal, bacaan utama pekan ini, ilustrasi, dan tujuh hari.
- `lesson-NN/<hari>.md`: isi bacaan yang diekstrak dari HTML digital yang diberikan.
- `assets/cover-inverse.png` dan `assets/inverse-lesson-NN.png`: cover dan ilustrasi publikasi.

`npm run validate` memeriksa kelengkapan 13 × 7 bacaan, judul harian, serta memastikan label bagian InVerse dari hari lain tidak tersisa sebagai penanda di isi file.

Urutan pekan InVerse dimulai Minggu dan berakhir Sabat. Jangan menyamakan hari atau tanggalnya dengan minggu Sekolah Sabat Dewasa yang dimulai Sabat petang.
