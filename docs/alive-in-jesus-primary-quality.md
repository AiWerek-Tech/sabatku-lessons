# Mutu Konten dan Alur Persetujuan Alive in Jesus · Primary

Dokumen ini mengatur cara tim menyelaraskan sumber Inggris, naskah Indonesia, dan pengalaman belajar di SabatKu. Terjemahan, perubahan redaksi, serta materi visual tetap menjadi keputusan tim penerjemah.

## Struktur kurikulum

- Setiap pelajaran mingguan memiliki tujuh bacaan: Minggu sampai Sabat, sesuai tanggal kurikulum.
- Panduan Murid dan Penuntun Guru adalah dua edisi terpisah. Bahan untuk keluarga tetap menjadi bacaan tambahan di dalam edisi murid; bahan itu tidak dibuat sebagai buku atau peran baru jika sumber tidak menyediakan buku tersendiri.
- Bacaan pendamping hanya ditautkan jika unit dan kontennya benar-benar ada. Tautan Penuntun Guru membuka pekan yang sama.
- Pertanyaan pada bagian “Pikirkan ... Lalu Diskusikan” ditampilkan sebagai bidang jawaban yang tersimpan pada akun/perangkat. Aktivitas praktis tetap menjadi petunjuk kegiatan, bukan formulir yang dibuat otomatis.
- Kata Pilihan Minggu Ini ditampilkan sebagai kartu kosakata tersendiri. Referensi Alkitab tetap dapat diketuk untuk membuka ayat.

## Pemeriksaan sumber dan terjemahan

Audit otomatis mencocokkan nama dan jumlah berkas, serta menandai perbedaan jumlah gambar, blok gaya sumber, dan pola referensi ayat. Audit ini membantu menemukan berkas yang hilang atau berubah struktur; audit ini **tidak** dapat memastikan makna, tata bahasa, tingkat baca anak, atau ketepatan teologis. Semua bacaan harus tetap diperiksa oleh manusia.

Contoh pemakaian dari PowerShell:

```powershell
npm run audit:aij-translations -- --english "C:\Users\ADMIN\Music\Alive In Jesus\4. PRIMARY\AIJ_Primary_2026_Q4_EN_MD\2026-04-pr" --indonesian "C:\Users\ADMIN\Music\Alive In Jesus\4. PRIMARY\AIJ_Primary_2026_Q4_ID_MD" --role student --report "tmp\aij-primary-student-audit.md" --json-report "tmp\aij-primary-student-audit.json"

npm run audit:aij-translations -- --english "C:\Users\ADMIN\Music\Alive In Jesus\4. PRIMARY\AIJ_Primary_Teacher_2026_Q4_EN_MD\2026-04-pr-tg" --indonesian "C:\Users\ADMIN\Music\Alive In Jesus\4. PRIMARY\AIJ_Primary_Teacher_2026_Q4_ID_MD" --role teacher --report "tmp\aij-primary-teacher-audit.md" --json-report "tmp\aij-primary-teacher-audit.json"
```

Laporan JSON mencatat checksum sumber Inggris dan Indonesia per berkas, tetapi tidak menyimpan teks konten. Tim meninjau setiap pasangan dengan urutan: arti dan fakta dibandingkan sumber Inggris; referensi Alkitab dan angka; kosakata yang sesuai usia; kelancaran bahasa Indonesia; nada yang ramah anak; lalu konsistensi judul, tanggal, dan tujuh hari. Kutipan ayat tidak boleh disunting untuk menyesuaikan gaya narasi.

## Publikasi setelah persetujuan

Edisi Primary siswa dan guru memerlukan `source-review.json`. Berkas ini mencatat checksum semua Markdown agar perubahan setelah persetujuan tidak dapat masuk ke feed secara diam-diam. Saat naskah selesai ditinjau, tim dapat membuat/menyegarkan daftar checksum:

```powershell
npm run audit:aij-translations -- --english "<folder Inggris>" --indonesian "<folder Indonesia>" --edition-root "content\id\alive-in-jesus\primary\2026-q4-year-a\student" --edition-id "2026-q4-aij-primary-student" --write-review "content\id\alive-in-jesus\primary\2026-q4-year-a\student\source-review.json"
```

Untuk memperbarui checksum setelah naskah berubah, gunakan `--refresh-review` dengan lokasi berkas yang sama. Tindakan ini mengembalikan status menjadi `needs-team-review` dan mengosongkan identitas persetujuan lama. Setelah persetujuan tim, ubah `status` menjadi `approved`, isi `reviewer` dengan nama peninjau yang menyetujui, dan isi `reviewedAt` dengan tanggal persetujuan format `YYYY-MM-DD`. Jalankan ulang audit terhadap kedua kumpulan sumber dan pastikan tidak ada pasangan hilang sebelum membangun feed. Publisher menolak checksum yang tidak cocok atau status yang belum disetujui.

Setiap perubahan pada bacaan setelah persetujuan memerlukan peninjauan ulang dan checksum baru. Jangan mengisi identitas peninjau atas nama tim tanpa persetujuan nyata.

## Mutu tampilan dan penggunaan

- Builder membersihkan metadata tata letak Adventech, garis pemisah, dan data kredit teknis sebelum menerbitkan Markdown. Sumber mentah tidak dipakai sebagai tampilan final.
- Ilustrasi harus tetap mengikuti bacaan yang benar. Pilihan unduhan tanpa gambar mempertahankan teks dan tautan gambar online; gambar ikut disimpan hanya bila pengguna memilihnya.
- Setiap hari tersedia saat online dan setelah diunduh. Status online/offline ditampilkan oleh katalog dan pembaca.
- Jawaban diskusi disimpan dengan kunci stabil per pertanyaan. Sinkronisasi mengikuti sistem data akun SabatKu yang sudah ada.
- Sebelum rilis, periksa tampilan satu bacaan tiap hari, pertanyaan tersimpan, tautan ayat, bahan keluarga, Penuntun Guru, serta pengalaman unduh dengan dan tanpa gambar.
