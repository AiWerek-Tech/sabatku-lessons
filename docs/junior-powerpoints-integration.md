# Junior PowerPoints dalam SabatKu

Junior PowerPoints adalah kurikulum Sekolah Sabat untuk Junior/Earliteen, dengan rekomendasi usia 10–14 tahun. Identitas program tetap `powerpoints`; usia membantu pemilihan kelas dan tidak membatasi akses pengguna.

## Pelajaran siswa dan kalender

Edisi Indonesia Q4 2026 menggunakan `content/id/powerpoints/2026-q4-pp`. Setiap pekan memiliki tujuh berkas Markdown Sabat Petang–Jumat. Tab Sabat Petang memuat Ayat Hafalan (Power Text), Pesan Utama (PowerPoint), Referensi Utama, Kisah Alkitab, dan kegiatan Sabat. Hari berikutnya memuat kegiatan belajar sesuai naskah tim, tanpa membagi ulang kisah secara paksa.

Tanggal pada daftar situs resmi adalah Sabat diskusi. Misalnya Pelajaran 01 berdiskusi 3 Oktober 2026; kalender belajar aplikasi berlangsung 26 September–2 Oktober. Pelajaran 13 berakhir pada 25 Desember, dengan diskusi 26 Desember. `discussionDate` disimpan terpisah dari tanggal tujuh bacaan.

## Penuntun Guru

Ketiga belas panduan Indonesia diterbitkan sebagai suplemen pekanan di `content/id/powerpoints-supplements/2026-q4`. Setiap panduan mempunyai binding eksplisit ke program `powerpoints`, edisi `2026-q4-pp`, serta nomor pelajaran yang sama. Panduan dapat dibuka melalui daftar pekan dan menu sumber terkait pada bacaan harian. Panduan tidak menjadi kelas terpisah atau tab hari tambahan.

Importir menerima nama naskah guru yang berbeda; Pelajaran 03 memakai `Penuntun_Guru_Pelajaran_03.md`. Ketersediaan disimpan pada metadata pekan agar tombol dan unduhan sesuai berkas yang benar-benar ada. Pengantar guru Indonesia belum disediakan sehingga tidak ditawarkan sebagai bacaan kosong.

## Pengalaman membaca

Android memakai pembaca Sekolah Sabat yang sudah ada: tujuh tab hari, perpindahan konten, progres, referensi Alkitab yang dapat diketuk, serta pengaturan tampilan. Tugas menulis dan refleksi menyediakan kolom jawaban dengan penyimpanan otomatis. Pertanyaan retoris dalam kisah dan instruksi teka-teki tetap berupa bacaan. Doa, hafalan, dan kegiatan fisik tidak otomatis diberi kolom jawaban. Jawaban menggunakan identitas blok yang stabil dan jalur penyimpanan lokal serta sinkronisasi akun yang sama dengan pelajaran lain.

Menu sumber pekanan menyediakan pintasan Ayat Hafalan, Pesan Utama, Referensi Utama, dan Kisah Alkitab. Pintasan kisah mencakup subjudul di dalamnya, bukan berhenti pada subjudul pertama.

## Bahasa dan PDF

Tab Indonesia memuat teks siswa dan panduan guru Indonesia. Tab English menyediakan PDF siswa dan PDF guru resmi untuk pelajaran yang sama. Tautan dibatasi ke direktori Student/Teacher pada situs `www.juniorpowerpoints.org`; PDF Inggris tidak disalin ke repo Indonesia. Pemilihan sumber tidak mengganti bahasa aplikasi.

PDF dapat dibuka dalam pembaca tanpa menyimpannya sebagai unduhan permanen. Pengguna dapat memilih Unduh untuk menyimpan salinan offline. Teks Indonesia dan aset pendukung menggunakan alur Baca Online atau Unduh edisi; panduan guru Indonesia ikut disiapkan melalui pengelola bahan terkait saat mengunduh edisi. Status online/offline memakai mekanisme pembaca yang sudah ada.

PDF Indonesia menunggu berkas dari tim. Cover buku menggunakan `assets/cover.jpg` dari berkas tim `Kurikulum PowerPoints_ Kasih Karunia Allah.jpg`; metadata katalog dan edisi menunjuk aset yang sama dan pengunduh Android menyimpannya untuk penggunaan offline. Logo program tetap dipakai pada pemilih kelas. Ilustrasi dan cover per pelajaran belum disediakan sebagai aset tersendiri sehingga daftar pekan menggunakan nomor pelajaran. Gambar teka-teki sumber tetap berlabel bahasa Inggris dan tidak dipakai sebagai cover.

## Publikasi dan pemeriksaan

`tools/import_powerpoints.py` mengimpor naskah tanpa mengubah berkas sumber. Tabel panduan dikonversi menjadi daftar berlabel untuk layar ponsel. Penanda internal pemeriksaan disisihkan dari bacaan; naskah sumber menjadi arsip redaksi tim.

`scripts/build-powerpoints.mjs` memeriksa 13 pekan, tujuh hari berurutan, tanggal, empat bagian utama, aset, dan alamat PDF. Feed disatukan oleh `scripts/build-content.mjs`; suplemen melewati validasi dan checksum penerbitan yang sama dengan suplemen lainnya. Tes Android memeriksa pemuatan feed, identitas jawaban, penyimpanan metadata, dan pembatasan URL PDF.

Perubahan lokal baru tersedia melalui server publik setelah repo konten dipush dan workflow GitHub Pages selesai. Pengujian unit dan kompilasi tidak menggantikan pemeriksaan visual pada perangkat Android.
