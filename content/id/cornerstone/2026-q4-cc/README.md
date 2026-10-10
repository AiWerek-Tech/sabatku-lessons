# Cornerstone Connections Indonesia — Q4 2026

## Identitas
Program cornerstone; kategori children-youth; usia rekomendasi 15–18. Kurikulum mandiri. Edisi siswa 2026-q4-cc, 13 pekan dan 91 bacaan. Markdown tim menjadi sumber, JSON menjadi format pembaca Android. Editor khusus Studio belum dibuat; registry dan profile sudah diaudit.

## Kalender
Pekan belajar Sabat–Jumat. Pelajaran 01: 26 September–2 Oktober; diskusi Sabat 3 Oktober. Pelajaran 13: 19–25 Desember; diskusi 26 Desember. discussionDate berbeda dari tanggal bacaan. Dasar: pendahuluan resmi mengarahkan belajar sepanjang pekan sebelum diskusi Sabat.

## Penamaan resmi
Key Text: Ayat Inti; Flashlight: Sekilas Cahaya; What Do You Think?: Apakah Pendapatmu?; Into the Story: Ke Dalam Cerita; Out of the Story: Keluar Cerita; Punch Lines: Bagian Pokok; Did You Know?: Apakah kamu tahu?; Further Insight: Wawasan Tambahan; Connecting to Life: Buat itu Nyata; This Week’s Reading: Bacaan Pekan Ini.

## Pembaca dan bahan pekanan
Tujuh tab hari. Judul utama ditampilkan satu kali. Menu Bahan pekan ini mencari bagian di seluruh pekan dan membukanya dalam modal. Ayat kisah, kutipan, dan pertanyaan menggunakan pembaca Alkitab yang ada. Pertanyaan bernomor memiliki jawaban lokal masing-masing; A/NS/D berupa pilihan chip tanpa penilaian benar/salah. Identitas catatan mencakup program, bahasa, edisi, pelajaran, hari, blok. Bacaan harian mengikuti tanggal pengguna. Provider mendukung online dan unduhan offline.

## Aset
Sampul buku Q4 dan 13 cover pelajaran tersedia. JPG 1–13 dari tim diimpor sebagai lesson-cover-NN.jpg, dengan token lesson-cover pada awal sabbath.md. Metadata illustrationStatus=available. Renderer header bersama berlaku pada Cornerstone dan gambar ikut diunduh untuk offline. PNG duplikat pelajaran 5 tidak disertakan.

## PDF dan bahasa
PDF Inggris hanya referensi lokal; tidak disalin ke repository Indonesia. PDF Indonesia per pelajaran nanti melalui lesson.json.pdfs; array kosong menyembunyikan tombol. Sumber English dibuka dari katalog Inggris melalui menu Cornerstone dan hanya resource yang tersedia ditampilkan. Penuntun Guru Indonesia berada dalam koleksi terpisah `content/id/cornerstone-supplements/2026-q4`: 13 bacaan mingguan terhubung lewat nomor pelajaran dan satu pendahuluan cakupan triwulan. Keduanya bukan kelas, hari belajar tambahan, atau progres siswa; materi tersebut tidak ditautkan ke Adult/InVerse.

## Publikasi dan batas verifikasi
build-content.mjs mengompilasi edisi siswa dan katalog suplemen. GitHub Pages memerlukan push dan workflow sebelum katalog jarak jauh berubah. Build statis, validator, dan tes publikasi memeriksa metadata, tautan edisi, berkas Markdown, serta checksum; kompilasi Kotlin tetap tidak menggantikan uji visual/perangkat. Sumber asli pada Music tidak diubah.

## Lima penyempurnaan pengalaman belajar
1. Referensi di bagian Ke Dalam Cerita menjadi tombol Baca kisah Alkitab dan membuka rentang ayat dari Alkitab lokal dengan bahasa aktif.
2. Nomor pertanyaan terlihat; pertanyaan majemuk yang dipisah berdasarkan kata tanya mendapat jawaban tersendiri dan label a/b.
3. Penyimpanan jawaban menampilkan status Menyimpan, Tersimpan di perangkat, atau Belum tersimpan dengan Coba lagi. Identitas jawaban stabil atas perubahan indeks blok; pengetikan baru tidak ditimpa callback simpan lama.
4. Penyebutan nama bagian pekan yang dikenal menjadi tautan ke isi bagian dalam modal, tetap dalam pelajaran yang sama.
5. Bentuk respons mengikuti instruksi sumber: Setuju/Belum yakin/Tidak setuju hanya muncul bila skala A/NS/D dinyatakan secara eksplisit; pasangan Pilihan A/Pilihan B memakai pilihan A/B dan kolom alasan; kegiatan pencocokan, penilaian 1–10, dan pengurutan memakai masukan yang sesuai; pertanyaan terbuka serta bagian Apakah kamu tahu? tetap memakai jawaban bebas.

## Ringkasan jawaban pekanan
Pintasan ringkasan mengumpulkan jawaban yang sudah ditulis pada kolom pertanyaan, pilihan Apakah Pendapatmu?, dan Refleksi pribadi di seluruh hari dalam pekan Cornerstone. Ringkasan tidak menambah kolom jawaban; draf yang belum tersimpan diberi label Draf dan tetap ditampilkan. Data dikelompokkan dengan label hari dan nomor pertanyaan untuk persiapan diskusi Sabat.

Penuntun Guru Cornerstone dapat dibaca dari Sumber Terkait pada tab Indonesia, lalu disimpan untuk akses offline. Uji otomatis tidak menggantikan pemeriksaan tampilan di perangkat; tahap APK/QA perangkat dilakukan terpisah.

## Peningkatan pengalaman belajar
- Menu alat pembaca menyediakan pencarian pada semua bacaan triwulan. Hasil membuka hari dan blok bacaan yang cocok; pencarian mencakup pertanyaan dan rujukan yang tertulis dalam materi.
- Ringkasan jawaban dapat dibagikan, disalin ke clipboard, atau disimpan sebagai file teks `.txt` melalui pemilih dokumen Android. Hanya jawaban yang sudah ditulis yang dimasukkan; draf diberi label jelas dan tidak dikirim atau disimpan otomatis tanpa tindakan pengguna.
- Pengaturan ukuran teks, jarak baris, dan jenis huruf memakai preferensi pembaca SabatKu yang sudah ada. Status online/offline tetap terlihat di toolbar; sumber terkait membuka Penuntun Guru untuk pelajaran yang sama.
- `build-cornerstone.mjs` memeriksa seluruh 13 pekan/91 bacaan: urutan dan jumlah hari, kalender, format rujukan Alkitab, kelengkapan dan konsistensi label kegiatan Cornerstone, struktur aktivitas pilihan A/B, A/NS/D, pencocokan, pengurutan, penilaian 1–10, serta isian ayat, gambar, cover triwulan, cover tiap pelajaran, dan aset PDF sebelum publikasi. Pemeriksaan dijalankan oleh alur validasi/build konten.
- Glosarium khusus Cornerstone menunggu daftar istilah dan definisi yang disetujui tim penerjemah. Sampai materi itu tersedia, pencarian membantu menemukan istilah di dalam bacaan tanpa menambahkan definisi yang belum ditinjau.
