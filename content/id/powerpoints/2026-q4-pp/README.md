# Junior PowerPoints Indonesia — Triwulan IV 2026

Materi tim diimpor sebagai 13 pelajaran dan 91 bacaan Sabat–Jumat. Identitas program `powerpoints`, kelompok `children-youth`, usia rekomendasi resmi panduan 10–14 tahun. Kalender belajar dimulai 26 September; diskusi pelajaran pertama pada 3 Oktober. Minggu terakhir belajar 19–25 Desember, diskusi 26 Desember.

Sabat Petang berisi ayat hafalan, pesan utama, referensi, kisah Alkitab, dan kegiatan Sabat. Hari berikutnya mempertahankan kegiatan sumber. Jawaban hanya disediakan untuk pertanyaan dan tugas menulis, bukan seluruh kegiatan praktik atau doa. Identitas blok jawaban stabil dan menggunakan penyimpanan serta sinkronisasi akun pembaca yang sudah ada.

Penuntun Guru merupakan bahan pekanan khusus PowerPoints di `content/id/powerpoints-supplements/2026-q4`. Seluruh 13 naskah tersedia; Pelajaran 03 memakai nama berkas sumber `Penuntun_Guru_Pelajaran_03.md`. `teacherGuideAvailable` di metadata pekan mengendalikan tampilnya pintasan dan unduhan panduan. Panduan tetap terhubung dengan pekan yang sama tanpa menambah hari bacaan.

Setiap pekan mempunyai tautan PDF Inggris siswa dan guru pada situs resmi. PDF Inggris tidak disalin ke repo Indonesia. Android membuka PDF online atau menyimpan salinan ketika pengguna memilih unduh. Teks siswa, gambar teka-teki, dan panduan Indonesia mendukung bacaan online serta salinan offline. PDF Indonesia belum tersedia, sehingga tidak ada tombol PDF Indonesia kosong.

Cover buku memakai `assets/cover.jpg` dari berkas tim `Kurikulum PowerPoints_ Kasih Karunia Allah.jpg` (33.957 byte). Cover disediakan melalui metadata edisi dan ikut disimpan oleh pengunduh edisi Android. Logo kelas tetap digunakan pada pemilih kelas. Ilustrasi/sampul per pelajaran belum diberikan sebagai aset tersendiri; nomor pelajaran digunakan pada daftar. Gambar teka-teki tidak dijadikan cover. Teka-teki yang memakai kosakata Inggris tetap dilabeli bahasa Inggris; tidak ditambahkan jawaban atau adaptasi huruf rekaan.

Penanda pemeriksaan dan catatan internal dari berkas kerja tidak ditampilkan dalam bacaan aplikasi. Naskah sumber di Music tidak diubah. Beberapa teka-teki pada materi sumber masih berupa gambar berbahasa Inggris dan diberi keterangan yang jelas; SabatKu tidak mengarang adaptasi atau kunci jawaban. PDF pelajaran dan Penuntun Guru berbahasa Inggris ditautkan dari situs resmi, bukan disalin ke edisi Indonesia.

`tools/import_powerpoints.py` menyusun ulang naskah tim dan mengubah tabel lebar panduan menjadi daftar berlabel untuk layar ponsel. `scripts/build-powerpoints.mjs` memeriksa urutan hari, kalender, bagian pekanan, aset, serta alamat PDF resmi sebelum menghasilkan JSON. Publikasi jarak jauh memerlukan push dan workflow GitHub Pages; APK/perangkat diuji pada tahap tersendiri.
