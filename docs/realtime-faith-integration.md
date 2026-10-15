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

### Pemeriksaan sumber 15 Oktober 2026

Seluruh 91 bacaan sudah dicocokkan kembali dengan buku sumber. Senin pelajaran 4 dan Jumat pelajaran 9 yang sebelumnya berisi materi hari lain sudah dipulihkan. Kolom penjelasan dan daftar kata pada pelajaran 3 dipisahkan, delapan pertanyaan pilihan jamak pada pelajaran 4 disusun dengan tiga opsi masing-masing, dan daftar pasangan ayat/frasa ditata ulang. Lembar penerapan mempertahankan lintasan latihan rohani, fokus “Satu Hal”, tiga pahlawan iman, rencana keuangan Sarah, dua mentor potensial, dan catatan waktu tiga hari.

Enam belas gambar kegiatan yang dipotong langsung dari halaman sumber tersimpan sebagai `assets/activity-NN-hari.png`. Sepuluh di antaranya mempertahankan kisi permainan: lima cari kata, dua sandi, satu labirin, satu TTS, dan satu susun pesan per kolom. Enam lainnya mempertahankan lembar penerapan. Instruksi, daftar kata, opsi, petunjuk, dan kolom penerapan juga tersedia dalam bacaan. Isi permainan bahasa Inggris dipertahankan sesuai sumber; jawaban dan terjemahan kisi baru tidak dibuat pada tahap ini.

`source-review.json` mencatat halaman asal, SHA-256 sumber, SHA-256 seluruh bacaan (UTF-8 dengan akhir baris dinormalisasi menjadi LF), koordinat potongan kegiatan, dan koreksi editorial. Dua referensi yang tidak sesuai dengan kutipannya diperiksa terhadap dataset TB lokal: Amsal 11:25 pada pilihan pelajaran 3 menjadi Amsal 11:24, dan referensi butir 4 Rabu pelajaran 5 menjadi 1 Tesalonika 1:4–7. Salah cetak “Maius”/“Yahobus” dibetulkan, serta potongan kalimat Inggris yang terduplikasi pada Rabu pelajaran 10 dihapus. PDF siswa tetap menyimpan cetakan sumber tanpa perubahan.

Penerbit menolak bacaan yang belum sesuai checksum hasil tinjauan, judul hari yang salah, isi harian duplikat, gambar yang rusak/hilang, serta gambar yang tertaut ke hari lain. Importer memilih judul hari berdasarkan ukuran huruf judul, sehingga penyebutan hari dalam paragraf tidak menggantikannya. Importer menolak menimpa edisi yang memiliki `source-review.json`; impor berikutnya harus diarahkan ke `--content-root` sementara untuk dibandingkan. Sesudah penyunting meninjau perubahan terhadap sumber, perbarui checksum bacaan terkait dalam daftar `readings` sebelum publikasi.

| Pelajaran | Kelengkapan sumber | Aktivitas yang dipulihkan/diperjelas |
| --- | --- | --- |
| 1 | Selesai | Tujuh isian pertumbuhan, pasangan ayat, lintasan latihan |
| 2 | Selesai | Cari kata, petunjuk sandi dan tabel huruf, pendalaman terpandu |
| 3 | Selesai | Penjelasan karunia, daftar kata, empat kutipan isian, pasangan ayat |
| 4 | Selesai | Seluruh materi Senin, cari kata, delapan pilihan jamak dan empat refleksi |
| 5 | Selesai | Enam kutipan isian dan koreksi referensi butir 4 |
| 6 | Selesai | Labirin ayat, isian, catatan terencana dan spontan |
| 7 | Selesai | Isian, lima referensi pasangan, diagram Satu Hal |
| 8 | Selesai | TTS beserta lima petunjuk, pasangan/isian, tiga kartu pahlawan iman |
| 9 | Selesai | Cari kata, isian, seluruh rencana keuangan dan tujuh alokasi berjumlah 100% |
| 10 | Selesai | Cari kata/pesan, isian, empat refleksi, pilihan ya/tidak dan alasan |
| 11 | Selesai | Kotak pesan dan huruf per kolom, tujuh frasa berlabel A–G, surat |
| 12 | Selesai | Cari kata, isian, dua kartu calon mentor |
| 13 | Selesai | Tabel sandi, pasangan ayat, tiga hari dengan 15 rentang waktu per hari |

## Aktivitas Android — implementasi 15 Oktober 2026

Seluruh 13 pelajaran memiliki `interactions.json` dengan tujuh rencana bacaan harian dan **93 aktivitas**. Bacaan Markdown, gambar sumber, dan PDF tetap tersedia. Android yang mendukung aktivitas menampilkan kontrol asli di posisi kegiatan; Android lama tetap membaca Markdown.

- Refleksi pribadi, isian ayat, pasangan ayat/frasa, pilihan tunggal/jamak, anggaran 100%, dan lembar penerapan dapat diisi langsung. Lembar penerapan mencakup latihan rohani, fokus Satu Hal, pahlawan iman, surat, mentor, serta 45 rentang waktu pada tiga hari.
- **Sepuluh permainan**: lima cari kata (pelajaran 2, 4, 9, 10, 12), dua sandi (2, 13), labirin ayat (6), TTS (8), dan susun pesan per kolom (11). Seluruh kisi dan kunci diuji dapat diselesaikan.
- Permainan bahasa Inggris mengikuti sumber. Isian Alkitab Indonesia menggunakan TB dari dataset lokal. Pemeriksaan isian menerima perbedaan kapitalisasi, spasi dan tanda baca. Respons pribadi tidak dinilai benar/salah; anggaran diperiksa keseimbangan dan rentang persentasenya.
- Kartu menampilkan kemajuan dan tombol mulai/lanjutkan. Aktivitas dibuka dalam layar tersendiri, dengan navigasi soal/kelompok, pemeriksaan jawaban, rujukan Alkitab, pengulangan yang memerlukan konfirmasi, serta papan yang dapat digeser dan diubah ukuran kotaknya.
- Jawaban disimpan otomatis setelah jeda singkat dan saat pembaca ditutup, dapat dilanjutkan offline, dan memakai jalur sinkronisasi/cadangan belajar pribadi yang sudah ada. Penulisan memeriksa pemilik data akun di dalam transaksi; kegagalan simpan ditampilkan dengan opsi mencoba kembali.

### Penyesuaian permainan dari cetakan

PDF dan gambar cetakan **tidak diubah**. Tiga penyesuaian hanya berlaku pada permainan Android:

1. Cari kata pelajaran 2: kata **PERCAYA** tercantum dalam daftar tetapi tidak memiliki lintasan pada kisi cetak. Kisi interaktif menambah lintasannya sambil mempertahankan 16 lintasan kata lainnya.
2. Cari kata pelajaran 10: satu huruf R tambahan di ujung baris pertama tidak terpakai oleh kata mana pun dan mengganggu pesan sisa. Sel tersebut diblokir agar pesan dua baris pertama terbaca **SAYING IT WITH TACT**.
3. TTS pelajaran 8: susunan kisi asli tidak konsisten dengan lima petunjuk. Kisi interaktif disusun ulang untuk **FAITH, RELIANCE, TRUST, CONFIDENCE, ASSURANCE**, mempertahankan kelima petunjuk dan memvalidasi semua perpotongan. Susunan ini adalah adaptasi aplikasi, bukan kunci jawaban resmi penerbit.

### Kontrak, perubahan dan identitas jawaban

`scripts/study-activities.mjs` memvalidasi aktivitas dan menerbitkan rencana harian sebagai string JSON pada `interactiveContent`, dengan versi dokumen `1`. Field `format` berisi `text/markdown; interactive-sha256=<sha256>`; hash dihitung atas string JSON persis yang dikirim. Dengan demikian perubahan aktivitas ikut mengubah revisi pelajaran pada perhitungan checksum v1 yang sudah digunakan. Android memeriksa hash sebelum menerima rencana. Field `content` tetap berisi Markdown lengkap untuk kompatibilitas.

`sourceReadings` pada berkas sumber menyimpan checksum tujuh bacaan Markdown dengan akhir baris LF. Publisher menolak rencana interaktif yang belum ditinjau ulang setelah Markdown berubah; perbarui rencana dan checksum ini bersama hasil tinjauan `source-review.json`.

Blok rencana berisi tepat satu dari `markdown` atau `activity`. Aktivitas memakai `id`, `answerVersion`, `kind`, `title`, `instruction`, dan data soal/kisi sesuai jenisnya. Identitas tidak boleh mengikuti nomor urut blok atau redaksi judul. Jawaban memakai kunci `lesson-answer:<day-id>:activity:<activity-id>:v<answerVersion>:<field-id>`. Penyunting harus mempertahankan ID soal saat hanya mengubah redaksi; naikkan `answerVersion` jika arti/kunci soal berubah sehingga jawaban lama tidak lagi berlaku. Simpan soal baru dengan ID baru, tanpa menggeser ID soal lama.

Publisher menolak kunci pilihan yang hilang, ID ganda, lintasan di luar kisi, lintasan kata yang tidak bersebelahan, labirin terputus, sandi tidak lengkap, dan kumpulan huruf kolom yang tidak sesuai solusi. Pengujian Android mencakup seluruh 93 aktivitas, normalisasi isian, pilihan jamak, anggaran, kedua arah cari kata, identitas jawaban stabil, serta pemuatan feed dan pemulihan snapshot offline. Pengujian visual pada perangkat fisik masih diperlukan sebelum rilis.

Android memakai pembaca harian yang sama, menyimpan teks edisi untuk penggunaan offline, dan menampilkan PDF siswa sebagai lampiran pada pelajaran. PDF dapat dibuka dan disimpan offline melalui fitur PDF aplikasi.

Terjemahan diterbitkan tim SabatKu dengan izin resmi. Hak materi sumber tetap pada General Conference of Seventh-day Adventists®.
