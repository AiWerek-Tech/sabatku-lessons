# Materi pendamping mingguan Dewasa

Koleksi pendamping Dewasa Q4 2026 memiliki 13 pelajaran dan empat slot per pelajaran (ringkasan SabatKu, penuntun guru, outline Hope, outline Talking Points). Tiga belas Penuntun Guru dan 13 Outline Hope Sabbath School telah diterbitkan. Resource lain dapat ditambahkan bertahap, ditinjau, lalu diterbitkan per pelajaran melalui katalog statis GitHub Pages. Ini koleksi pendamping Dewasa, bukan kelas baru.

## Mengisi bertahap

1. Pilih folder `2026-q4/lesson-XX/<sumber>/`.
2. Masukkan `content.md`, `document.pdf`, atau keduanya. Tidak wajib mengisi semua sumber atau minggu sekaligus.
3. Edit entri yang sesuai di `lesson-XX/resources.json`: judul, sumber URL spesifik, jenis original/translation/adaptation, penerjemah, atribusi, serta keterangan hak.
4. Daftarkan file nyata dalam `formats`. Contoh:

```json
"formats": [
  { "mediaType": "text/markdown", "file": "sabatku-summary/content.md" },
  { "mediaType": "application/pdf", "file": "sabatku-summary/document.pdf" }
]
```

5. Pertahankan ID dan studyId. Naikkan revision ketika memperbarui materi yang sudah dibagikan ke tahap review. Untuk materi khusus satu edisi, sesuaikan appliesToPrograms.
6. Jalankan `npm run validate` dari root sabatku-lessons. Perintah ini juga memeriksa kerangka pendamping.
7. Pertahankan `publicationStatus: "draft"` selama penyusunan dan review. Untuk menerbitkan satu resource yang sudah disetujui, lengkapi atribusi serta pernyataan hak, beri nama tim penerjemah jika jenisnya terjemahan, daftarkan minimal satu format yang tersedia, lalu ubah status resource menjadi `published`. Ubah status koleksi menjadi `published` agar indeksnya ikut dibuat. Builder hanya memasukkan resource published; slot draft lainnya tetap tersembunyi.

`formats: []` diperbolehkan untuk slot kosong atau draft. Resource published wajib memiliki format nyata, atribusi, dan pernyataan hak. README dalam folder tidak dihitung sebagai materi. Tidak membuat file PDF kosong atau naskah pelajaran tiruan. Dua format memakai satu entri hanya jika isinya setara; dokumen berbeda perlu entri sendiri dengan key unik.

`collection.json` memetakan 13 studyId ke unit Dewasa Standar Indonesia (01–13) dan Mudah Dibaca Indonesia (lesson-01–lesson-13). Semua hari dalam satu unit mengakses materi mingguan yang sama melalui resolver Android. Tidak menghubungkan InVerse hanya berdasarkan tanggal.

Setelah merge ke `main`, GitHub Actions membangun berkas statis di `public/supplements/` dan menerbitkannya ke GitHub Pages. Indeks utama `catalog.json` menunjuk ke `supplements/catalog.json`. Setiap file teks/PDF memiliki ukuran dan SHA-256 pada metadata publikasi. Klien Android menghubungkan Penuntun Guru dan Outline Hope Indonesia ke edisi Dewasa Standar dan Mudah Dibaca melalui Sumber Terkait. Outline Hope diambil dari GitHub Pages, divalidasi berdasarkan binding edisi, studyId, status publikasi, ukuran, dan checksum, lalu disimpan otomatis untuk dibaca offline. Saat jaringan gagal, aplikasi menggunakan salinan cache yang checksum-nya valid. Untuk bahasa Inggris, pemetaan edisi yang eksplisit menghubungkan Teacher Comments Adventech pada pelajaran yang sama di kedua edisi Dewasa. Pembaca Penuntun Guru menyimpan posisi, penanda, dan catatan lokal tanpa mengubah progres harian.

Blueprint lengkap berada di repo sabatku-docs, `architecture/weekly-supplements-blueprint.md`. Kontrak sumber berada di repo sabatku-contracts, `schemas/v1/domains/sabbath-school/supplement-resources.schema.json` dan `supplement-collection.schema.json`.

## Penuntun Guru Q4 2026

Untuk Q4 2026, naskah teks Penuntun Guru Pelajaran 1–13 telah disetujui tim dan diterbitkan sebagai resource mingguan. Pelajaran 13 diterjemahkan dari Teacher Comments bahasa Inggris di repositori Adventech. Tidak ada gambar atau PDF yang diperlukan untuk naskah ini.

Outline Hope Pelajaran 1–13 telah disetujui tim dan diterbitkan sebagai resource Markdown mingguan; penanda draf editorial sudah dihapus dari naskah publik. Android menampilkannya dari Sumber Terkait pada kedua edisi Dewasa Indonesia, membuat cache offline saat dibuka, serta menghubungkan referensi Alkitab yang dikenali ke pembaca ayat aktif. Ringkasan SabatKu dan Talking Points masih menunggu materi. Katalog statis hanya menerbitkan resource berstatus `published`. Perubahan Android ini belum dibuild menjadi APK dan belum dipush.

## Catatan pemeriksaan Outline Hope Q4 2026

- Pelajaran 8: referensi sumber Adventech `Yohanes 5:28–19` tidak membentuk rentang ayat yang valid; naskah menggunakan `Yohanes 5:28–29` sesuai konteks tentang kebangkitan.
- Pelajaran 12: dua referensi sumber Adventech yang keliru dipertahankan dalam catatan editorial tim: janji pertobatan dan baptisan merujuk ke Kisah Para Rasul 2:38, sedangkan anak-anak perempuan Filipus merujuk ke Kisah Para Rasul 21:8–9. Naskah terbit mengikuti koreksi yang telah disetujui tim.
