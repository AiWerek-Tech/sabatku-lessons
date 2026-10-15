# Real-Time Faith dalam SabatKu

Real-Time Faith adalah materi Sekolah Sabat untuk kelompok Teen/Earliteen dengan rekomendasi usia 13–14 tahun. Edisi Indonesia Triwulan IV 2026 memakai `programId: realtime-faith` dan `editionId: 2026-q4-rt`; materi diterbitkan melalui feed GitHub Pages SabatKu.

## Bentuk sumber dan pengalaman belajar

Naskah siswa terjemahan tim SabatKu terdiri dari 13 lembar pekanan, masing-masing dua halaman. Setiap pelajaran disimpan sebagai:

- tujuh bacaan teks berurutan dari Sabat sampai Jumat;
- satu PDF siswa dua halaman untuk menjaga tata letak, foto, teka-teki, dan aktivitas visual sumber.

Pemetaan hari mempertahankan susunan materi: kisah pembuka dan **Untuk Dipelajari** pada Sabat; **Merespons** pada Minggu; **Jawaban Alkitab** pada Senin; **Merenungkan** pada Selasa; **Konsep Alkitab** pada Rabu; **Menghubungkan** pada Kamis; serta **Menerapkan** pada Jumat. Isi kegiatan tidak dibagi ulang menurut perkiraan.

Tanggal pada lembar adalah Sabat pembahasan. Tujuh tanggal aplikasi dimulai pada Sabat sebelumnya dan berakhir pada Jumat; `discussionDate` disimpan terpisah agar kalender kelas dan tanggal diskusi tidak bergeser.

## Berkas dan publikasi

```text
content/id/realtime-faith/2026-q4-rt/
  edition.json
  assets/lesson-01.pdf ... lesson-13.pdf
  lesson-01/lesson.json
  lesson-01/sabbath.md ... friday.md
  ...
```

`tools/import_realtime_faith.py` membagi PDF sumber 26 halaman menjadi 13 PDF dua halaman dan menyiapkan tujuh bacaan tiap pelajaran. Importer membaca posisi panel pada halaman agar aktivitas tidak salah masuk ke hari lain, lalu memakai ekstraksi teks sebagai cadangan bila batas panel tidak tersedia. `scripts/build-realtime-faith.mjs` memvalidasi urutan hari, rentang tanggal, kelengkapan teks, dan lampiran PDF; `scripts/build-content.mjs` menerbitkan katalog dan dokumen ke feed bersama.

Android memakai pembaca harian yang sama, menyimpan teks edisi untuk penggunaan offline, dan menampilkan PDF siswa sebagai lampiran pada pelajaran. PDF dapat dibuka dan disimpan offline melalui fitur PDF aplikasi.

Terjemahan diterbitkan tim SabatKu dengan izin resmi. Hak materi sumber tetap pada General Conference of Seventh-day Adventists®.
