# Materi pendamping mingguan Dewasa

Kerangka awal: Q4 2026, 13 pelajaran, masing-masing empat slot (ringkasan SabatKu, penuntun guru, outline Hope, outline Talking Points). Semua draft dan belum tampil di aplikasi/katalog publik. Ini koleksi pendamping Dewasa, bukan kelas baru.

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
7. Tetap gunakan `publicationStatus: "draft"`. Adapter publikasi dan pembaca pendamping belum aktif; status published saat ini sengaja ditolak, bukan diterbitkan sebagian secara tidak sengaja.

`formats: []` diperbolehkan untuk slot kosong. README dalam folder tidak dihitung sebagai materi. Tidak membuat file PDF kosong atau naskah pelajaran tiruan. Dua format memakai satu entri hanya jika isinya setara; dokumen berbeda perlu entri sendiri dengan key unik.

`collection.json` memetakan 13 studyId ke unit Dewasa Standar Indonesia (01–13) dan Mudah Dibaca Indonesia (lesson-01–lesson-13). Semua hari dalam satu unit akan mengakses materi mingguan yang sama saat resolver Android diimplementasikan. Tidak menghubungkan InVerse hanya berdasarkan tanggal.

Blueprint lengkap berada di repo sabatku-docs, `architecture/weekly-supplements-blueprint.md`. Kontrak draf berada di repo sabatku-contracts, `schemas/v1/domains/sabbath-school/supplement-resources.schema.json`.
