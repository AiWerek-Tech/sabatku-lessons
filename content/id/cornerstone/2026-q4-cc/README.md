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
PDF Inggris hanya referensi lokal; tidak disalin ke repository Indonesia. PDF Indonesia per pelajaran nanti melalui lesson.json.pdfs; array kosong menyembunyikan tombol. Sumber English dibuka dari katalog Inggris melalui menu Cornerstone dan hanya resource yang tersedia ditampilkan. Penuntun guru masa depan adalah resource pekanan Cornerstone, tidak terhubung ke Adult/InVerse. Belum ada penuntun guru Indonesia.

## Publikasi dan batas verifikasi
build-content.mjs mengompilasi 13 lesson JSON dan edition/catalog. GitHub Pages memerlukan push dan workflow sebelum katalog jarak jauh berubah. Kompilasi Kotlin tidak berarti uji visual/perangkat berhasil. Tidak membuat APK pada tahap ini. Sumber asli pada Music tidak diubah.

## Lima penyempurnaan pengalaman belajar
1. Referensi di bagian Ke Dalam Cerita menjadi tombol Baca kisah Alkitab dan membuka rentang ayat dari Alkitab lokal dengan bahasa aktif.
2. Nomor pertanyaan terlihat; pertanyaan majemuk yang dipisah berdasarkan kata tanya mendapat jawaban tersendiri dan label a/b.
3. Penyimpanan jawaban menampilkan status Menyimpan, Tersimpan di perangkat, atau Belum tersimpan dengan Coba lagi. Identitas jawaban stabil atas perubahan indeks blok; pengetikan baru tidak ditimpa callback simpan lama.
4. Penyebutan nama bagian pekan yang dikenal menjadi tautan ke isi bagian dalam modal, tetap dalam pelajaran yang sama.
5. Aktivitas Apakah Pendapatmu? menampilkan pilihan Setuju/Belum yakin/Tidak setuju.

## Ringkasan jawaban pekanan
Pintasan ringkasan mengumpulkan jawaban yang sudah ditulis pada kolom pertanyaan, pilihan Apakah Pendapatmu?, dan Refleksi pribadi di seluruh hari dalam pekan Cornerstone. Ringkasan tidak menambah kolom jawaban; draf yang belum tersimpan diberi label Draf dan tetap ditampilkan. Data dikelompokkan dengan label hari dan nomor pertanyaan untuk persiapan diskusi Sabat.

Kompilasi Kotlin berhasil. Tes unit tambahan tidak dijalankan pada giliran implementasi ini. Pemeriksaan visual di perangkat dan uji penyimpanan lintas restart masih perlu dilakukan sebelum menyebut pengalaman final siap rilis.
