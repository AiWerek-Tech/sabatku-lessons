# Real-Time Faith · Triwulan IV 2026

Naskah siswa terjemahan tim SabatKu dibagi dari PDF sumber menjadi 13 PDF pekanan dan tujuh bacaan Markdown per pelajaran.

## Struktur satu pelajaran

- Sabat: kisah pembuka dan bagian **Untuk Dipelajari**.
- Minggu: **Merespons**.
- Senin: **Jawaban Alkitab**.
- Selasa: **Merenungkan**.
- Rabu: **Konsep Alkitab**.
- Kamis: **Menghubungkan**.
- Jumat: **Menerapkan**.

Setiap PDF pelajaran mempertahankan kedua halaman sumber, termasuk foto, lembar kerja, dan teka-teki. Seluruh 91 bacaan sudah ditinjau terhadap sumber pada 15 Oktober 2026. Enam belas gambar kegiatan dari sumber ditampilkan di bacaan untuk mempertahankan kisi, simbol, kolom, dan diagram. Instruksi, daftar kata, pilihan, serta bidang penerapan disusun terpisah agar terbaca jelas.

Catatan halaman sumber, checksum bacaan/gambar, dan koreksi editorial terdapat dalam `source-review.json`. Penerbit memeriksa kecocokannya sebelum membangun feed. Importer tidak boleh menimpa edisi yang sudah ditinjau; arahkan impor ulang ke direktori sementara dan bandingkan terlebih dahulu.

Setiap pelajaran memiliki `interactions.json` untuk kontrol asli Android: total 93 aktivitas, termasuk sepuluh permainan cari kata, sandi, labirin, TTS, dan susun pesan. Isian, pilihan, pasangan, refleksi, anggaran, serta lembar penerapan bisa dijawab dan dilanjutkan offline. `sourceReadings` mengikat rencana interaktif ke checksum Markdown; perubahan bacaan memerlukan peninjauan ulang rencana sebelum publikasi. Pertahankan ID dan `answerVersion` ketika hanya memperbaiki redaksi. Panduan lengkap serta penyesuaian tiga kisi sumber terdapat di [panduan integrasi](../../../../docs/realtime-faith-integration.md).

Tanggal yang tercetak pada sampul pekanan adalah Sabat pembahasan. Rentang bacaan aplikasi berjalan dari Sabat sebelumnya sampai Jumat, dan tanggal pembahasan disimpan terpisah.
