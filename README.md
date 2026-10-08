# SabatKu Lessons

Repositori materi Sekolah Sabat yang diterbitkan SabatKu. Versi awal difokuskan pada program **Dewasa Mudah Dibaca** (`adult-easy-reading`) berbahasa Indonesia.

Katalog mengikuti tiga kelompok: Dewasa, Pemuda Dewasa, serta Anak-anak dan Pemuda. Edisi Standar dan Mudah Dibaca adalah edisi untuk kelompok Dewasa; EGW Notes merupakan suplemen; InVerse termasuk Pemuda Dewasa. Rentang usia hanya rekomendasi, bukan batas akses. Lihat [taksonomi kelas Sekolah Sabat](https://github.com/AiWerek-Tech/sabatku-docs/blob/main/architecture/sabbath-school-audience-taxonomy.md).

Untuk katalog bahasa Inggris, jangan tawarkan GraceLink Beginner, Kindergarten, atau Primary lama sebagai program aktif; gunakan Alive in Jesus untuk level tersebut. Gunakan Junior PowerPoints, Real-Time Faith, dan Cornerstone sebagai materi transisi resmi untuk kelompok Junior, Teen, dan Youth selama materi Alive in Jesus untuk level tersebut belum tersedia.

## Alur kerja

Koleksi [pendamping mingguan Dewasa](content/id/adult-supplements/README.md) tersedia untuk Q4 2026: 13 Penuntun Guru dan 13 Outline Hope Sabbath School telah diterbitkan. Koleksi memiliki 52 slot untuk empat jenis materi. GitHub Actions memasukkan hanya resource `published` yang lengkap ke katalog statis. Klien Android menghubungkan Penuntun Guru Indonesia ke edisi Dewasa Standar dan Mudah Dibaca lewat Sumber Terkait, memeriksa checksum, dan menyimpan cache berbasis identitas resource agar kedua edisi berbagi salinan. Untuk bahasa Inggris, pemetaan eksplisit menghubungkan edisi Adventech Dewasa Standar dan Easy Reading ke Teacher Comments triwulan yang sama. Pembaca menampilkan status salinan offline, mempertahankan posisi baca, serta menyimpan penanda dan catatan privat di perangkat; fitur-fitur ini tidak memengaruhi progres pelajaran harian.

Tim menyimpan metadata edisi/pelajaran sebagai JSON dan naskah bacaan sebagai Markdown. Pull request menjadi titik review. Setelah perubahan masuk ke `main`, GitHub Actions memvalidasi sumber, menghasilkan katalog JSON statis, lalu menerbitkannya ke GitHub Pages. Android mengonsumsi hasil publikasi, bukan file kerja editorial.

```text
content/id/adult-easy-reading/<edition>/
  edition.json
  lesson-01/lesson.json
  lesson-01/sabbath.md ... friday.md
        │
        └── npm run build:content
                ├── public/catalog.json
                ├── public/editions/<edition>/... JSON
                └── public/supplements/<locale>/<quarter>/... JSON + berkas
```

Konten resmi Edisi Mudah Dibaca Triwulan IV 2026 saat ini tersedia pada `content/id/adult-easy-reading/2026-q4-er/`. Berkas di `content/_template/` tetap hanya contoh struktur dan tidak dipublikasikan sebagai materi.

## InVerse Indonesia Q4 2026

Materi InVerse Karunia Nubuat tersedia di `content/id/inverse/2026-q4-inverse/`: 13 pelajaran, 91 bacaan harian Minggu sampai Sabat (`inTro` hingga `inQuire`), cover, dan ilustrasi mingguan. Tanggal mengikuti publikasi Indonesia. `sourceTitle` Inggris hanya menjadi referensi pencocokan edisi dan tidak ditampilkan sebagai judul Indonesia. Edisi masuk katalog publik setelah dibangun dari branch `main`.

PDF cetak triwulan disimpan sebagai `source-print-edition.pdf` untuk pemeriksaan silang. Selain itu, setiap pelajaran memiliki PDF baca tersendiri (`assets/inverse-lesson-NN.pdf`), yang didaftarkan di `lesson.json` dan tersedia melalui katalog aplikasi.

## Kerangka EGW Notes Q4 2026

Sumber resmi tim berada di `C:\Users\ADMIN\Music\EGW Notes Q4 2026` dalam HTML untuk publikasi digital dan PDF untuk versi cetak. Materi Indonesia telah disusun di `content/id/adult-egw-notes/2026-q4-egw/` sebagai program pendamping terpisah. Tiap pelajaran memiliki tujuh bacaan harian, ilustrasi, dan ID stabil yang dipetakan ke edisi Dewasa Standar serta Mudah Dibaca.

Cover dan ilustrasi publikasi disimpan sebagai WebP teroptimasi. File Markdown harian diturunkan dari HTML digital resmi; PDF cetak dipakai untuk pemeriksaan silang. Katalog memublikasikan Catatan EGW sebagai program unduhan tersendiri, sementara pemilih Sumber Pelajaran Terkait Android menghubungkan hari yang sama berdasarkan nomor pelajaran dan hari.

Bahasa Inggris tetap memakai suplemen EGW Notes yang telah terintegrasi pada materi Dewasa Standar dari Adventech. Edisi terpisah ini hanya untuk materi Bahasa Indonesia.

## Persiapan lokal

- Node.js 20 atau lebih baru.
- Tidak ada dependensi npm eksternal untuk memeriksa dan membangun katalog.

```powershell
npm run validate
npm test
npm run build:content
```

Hasil publikasi dibuat di `public/` dan diabaikan Git. GitHub Actions membangun ulang hasil tersebut dari sumber.

## Menambah materi

1. Salin `content/_template/edition.json` dan direktori pelajaran template ke `content/id/adult-easy-reading/<id-edisi>/`.
2. Isi metadata edisi dan pelajaran yang benar, serta tujuh bacaan harian sesuai jadwal edisi.
3. Simpan naskah setiap bacaan pada file Markdown terpisah. Gunakan heading dan paragraf Markdown standar; hindari HTML mentah pada fase awal.
4. Lengkapi atribusi dan pernyataan hak publikasi dalam metadata.
5. Jalankan validasi dan build lokal, lalu buka PR untuk review tim.

Jangan mengisi tanggal, judul, kutipan ayat, atau materi sumber secara tebakan. Metadata dan hak publikasi harus disetujui tim sebelum rilis.

## GitHub Pages

Aktifkan Pages untuk repo ini dengan sumber **GitHub Actions**. Workflow `.github/workflows/publish-pages.yml` akan deploy `public/` setelah push ke `main`. Endpoint katalog menjadi:

```text
https://<organisasi>.github.io/sabatku-lessons/catalog.json
```

Gunakan URL hasil Pages yang ditampilkan GitHub; URL di atas hanya pola. Aplikasi harus diberi URL katalog eksplisit melalui konfigurasi build, tidak menebak alamat organisasi.

## Format API statis v1

- `catalog.json`: program, locale, edisi, rentang tanggal, atribusi, URL edisi, serta pointer `supplements.url`.
- `editions/<edition-id>/index.json`: metadata edisi dan daftar pelajaran.
- `editions/<edition-id>/lessons/<lesson-id>/index.json`: metadata pelajaran dan daftar tujuh bacaan dengan isi Markdown.
- `supplements/catalog.json`: daftar koleksi suplemen yang sudah diterbitkan.
- `supplements/<locale>/<quarter>/index.json`: binding eksplisit ke edisi Dewasa serta daftar pelajaran/resource terbit.
- `supplements/<locale>/<quarter>/<lesson>/resources.json`: resource terbit untuk satu studyId; tiap resource memiliki indeks sendiri dan file format dengan ukuran serta SHA-256.

ID dokumen stabil memakai `adult-easy-reading:id:<edition>:lesson-XX:<day>`. Perubahan isi tidak boleh mengubah ID yang sudah diterbitkan, agar progres pengguna tetap tertaut.

## Hak dan publikasi

Hanya materi yang tim berwenang terbitkan dan setujui untuk akses publik yang boleh berstatus `published` dan masuk ke `main`. Publisher memerlukan atribusi dan pernyataan hak; terjemahan juga memerlukan nama tim penerjemah. Repositori ini belum menetapkan lisensi penggunaan ulang. Jangan menambahkan lisensi open-source untuk materi secara otomatis; keputusan hak penggunaan harus dinyatakan terpisah dan disetujui pemilik materi.

## Status integrasi Android

Aplikasi Android menyediakan pemilih sumber terkait pada halaman bacaan untuk membuka bacaan harian dari edisi Dewasa Standar, Mudah Dibaca, atau suplemen EGW Notes yang telah diunduh. Katalog statis mencantumkan EGW Notes sebagai edisi terpisah yang dapat disimpan offline. InVerse Indonesia telah diterbitkan sebagai program Pemuda Dewasa tersendiri dengan urutan hari Minggu sampai Sabat. InVerse tidak ditautkan ke pelajaran program lain berdasarkan tanggal.
