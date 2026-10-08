# Materi pendamping mingguan Dewasa

Koleksi pendamping Dewasa Q4 2026 memiliki 13 pelajaran dan empat slot per pelajaran (ringkasan SabatKu, penuntun guru, outline Hope, outline Talking Points). Slot boleh tetap draft dan tidak akan masuk katalog. Resource yang telah ditinjau dapat diterbitkan per pelajaran melalui katalog statis GitHub Pages. Ini koleksi pendamping Dewasa, bukan kelas baru.

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

`collection.json` memetakan 13 studyId ke unit Dewasa Standar Indonesia (01–13) dan Mudah Dibaca Indonesia (lesson-01–lesson-13). Semua hari dalam satu unit akan mengakses materi mingguan yang sama saat resolver Android diimplementasikan. Tidak menghubungkan InVerse hanya berdasarkan tanggal.

Setelah merge ke `main`, GitHub Actions membangun berkas statis di `public/supplements/` dan menerbitkannya ke GitHub Pages. Indeks utama `catalog.json` menunjuk ke `supplements/catalog.json`. Setiap file teks/PDF memiliki ukuran dan SHA-256 pada metadata publikasi. Android belum mengonsumsi indeks suplemen; pembaca, unduhan, dan UI pendamping masih tahap berikutnya.

Blueprint lengkap berada di repo sabatku-docs, `architecture/weekly-supplements-blueprint.md`. Kontrak sumber berada di repo sabatku-contracts, `schemas/v1/domains/sabbath-school/supplement-resources.schema.json` dan `supplement-collection.schema.json`.

## Penuntun Guru Q4 2026

Untuk Q4 2026, naskah teks Penuntun Guru Pelajaran 1–13 telah disetujui tim dan diterbitkan sebagai resource mingguan. Pelajaran 13 diterjemahkan dari Teacher Comments bahasa Inggris di repositori Adventech. Tidak ada gambar atau PDF yang diperlukan untuk naskah ini.

Resource lain (ringkasan SabatKu, Hope Outline, dan Talking Points) tetap `draft` sampai kontennya disiapkan dan disetujui. Katalog statis menerbitkan hanya resource berstatus `published`. Integrasi pembaca Android belum diaktifkan.
