# SabatKu Lessons

Repositori materi Sekolah Sabat yang diterbitkan SabatKu. Versi awal difokuskan pada program **Dewasa Mudah Dibaca** (`adult-easy-reading`) berbahasa Indonesia.

## Alur kerja

Tim menyimpan metadata edisi/pelajaran sebagai JSON dan naskah bacaan sebagai Markdown. Pull request menjadi titik review. Setelah perubahan masuk ke `main`, GitHub Actions memvalidasi sumber, menghasilkan katalog JSON statis, lalu menerbitkannya ke GitHub Pages. Android mengonsumsi hasil publikasi, bukan file kerja editorial.

```text
content/id/adult-easy-reading/<edition>/
  edition.json
  lesson-01/lesson.json
  lesson-01/sabbath.md ... friday.md
        │
        └── npm run build:content
                ├── public/catalog.json
                └── public/editions/<edition>/... JSON
```

Konten resmi Edisi Mudah Dibaca Triwulan IV 2026 saat ini tersedia pada `content/id/adult-easy-reading/2026-q4-er/`. Berkas di `content/_template/` tetap hanya contoh struktur dan tidak dipublikasikan sebagai materi.

## Kerangka EGW Notes Q4 2026

Sumber resmi tim berada di `C:\Users\ADMIN\Music\EGW Notes Q4 2026` dalam HTML untuk publikasi digital dan PDF untuk versi cetak. Materi Indonesia telah disusun di `content/id/adult-egw-notes/2026-q4-egw/` sebagai program pendamping terpisah. Tiap pelajaran memiliki tujuh bacaan harian, ilustrasi, dan ID stabil yang dipetakan ke edisi Dewasa Standar serta Mudah Dibaca.

Cover dan ilustrasi publikasi disimpan sebagai WebP teroptimasi. File Markdown harian diturunkan dari HTML digital resmi; PDF cetak dipakai untuk pemeriksaan silang. Katalog memublikasikan Catatan EGW sebagai program unduhan tersendiri, sementara pemilih Sumber Pelajaran Terkait Android menghubungkan hari yang sama berdasarkan nomor pelajaran dan hari.

Bahasa Inggris tetap memakai suplemen EGW Notes yang telah terintegrasi pada materi Dewasa Standar dari Adventech. Edisi terpisah ini hanya untuk materi Bahasa Indonesia.

## Persiapan lokal

- Node.js 20 atau lebih baru.
- Tidak ada dependensi npm eksternal untuk memeriksa dan membangun katalog.

```powershell
npm run validate
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

- `catalog.json`: program, locale, edisi, rentang tanggal, atribusi, dan URL relatif ke JSON edisi.
- `editions/<edition-id>/index.json`: metadata edisi dan daftar pelajaran.
- `editions/<edition-id>/lessons/<lesson-id>/index.json`: metadata pelajaran dan daftar tujuh bacaan dengan isi Markdown.

ID dokumen stabil memakai `adult-easy-reading:id:<edition>:lesson-XX:<day>`. Perubahan isi tidak boleh mengubah ID yang sudah diterbitkan, agar progres pengguna tetap tertaut.

## Hak dan publikasi

Hanya materi yang tim berwenang terbitkan dan setujui untuk akses publik yang boleh masuk ke `main`. Repositori ini belum menetapkan lisensi penggunaan ulang. Jangan menambahkan lisensi open-source untuk materi secara otomatis; keputusan hak penggunaan harus dinyatakan terpisah dan disetujui pemilik materi.

## Status integrasi Android

Aplikasi Android menyediakan pemilih sumber terkait pada halaman bacaan untuk membuka bacaan harian dari edisi Dewasa Standar, Mudah Dibaca, atau suplemen EGW Notes yang telah diunduh. Katalog statis mencantumkan EGW Notes sebagai edisi terpisah yang dapat disimpan offline.
