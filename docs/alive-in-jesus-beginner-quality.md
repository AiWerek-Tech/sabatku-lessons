# Kualitas naskah dan integrasi Beginner

Tanggal: 25 Oktober 2026. Status: terbit dalam katalog produksi lokal setelah audit editorial dan instruksi publikasi pemilik proyek. Belum diunggah ke GitHub pada audit ini.

## Cakupan

Sumber lokal: `C:/Users/ADMIN/Music/Alive In Jesus/2. BEGINER`. Seluruh 43 Markdown murid dan 23 Markdown guru mempunyai pasangan Inggris–Indonesia. Source audit menyimpan checksum asli dan metrik struktur. Naskah sumber lokal tidak ditimpa.

Terjemahan cerita 13 pekan, kegiatan bermain 13 pekan dan renungan orang tua 13 pekan disusun ulang dari sumber Inggris. Pengantar orang tua, renungan singkat, karakteristik anak, petunjuk guru, saat teduh, garis besar program, serta instruksi program berulang direvisi. Seluruh 13 instruksi prakarya disusun ulang dengan sumber Inggris sebagai acuan; bahan prakarya triwulan menggunakan instruksi revisi yang sama dengan setiap pekan. Bagian guru lainnya disunting dengan sumber sebagai acuan. Contoh perbaikan makna: engagement → keterlibatan; offering → persembahan; When a Mother Calls → Saat Ibu Memanggil. Istilah orang majus, Rut, Boas, dan sapaan kepada anak/orang dewasa diselaraskan. Nomor prakarya yang rusak oleh karakter kontrol dipulihkan menurut urutan sumber.

Pengantar guru menyebut empat pelajaran terakhir, tetapi daftar isi dan program menunjukkan pekan 9–13. Pengantar hasil revisi memakai pembagian pekan eksplisit ini. Judul visual Inggris pekan 6 mempunyai kata tambahan “Man”; judul mengikuti metadata dan panduan guru, bukan kesalahan lapisan desain itu.

PDF dua pekan murid menyebut referensi Roh Nubuat dan Pesan Utama pada bagian yang tidak semuanya muncul dalam ekspor Markdown. Pesan Utama dan referensi Alkitab diambil dari pasangan panduan guru. Dua ayat hafalan utama mengikuti pembagian pekan 1–8 dan 9–13. Ayat tambahan hanya dicantumkan ketika terdapat dalam sumber kegiatan; pekan 1 dan 9 tidak diberi ayat tambahan rekaan.

## Struktur hasil impor

- Panduan Murid: 13 × 3 dokumen + 3 sumber keluarga = 42 dokumen.
- Panduan Guru: 13 × 9 bagian program + 9 sumber triwulan = 126 dokumen.
- Kedua edisi: Year A Q4 2026, 27 September–26 Desember. Tidak mempunyai `dayOrder`.
- Inggris tetap provider Adventech; tidak ada teks atau PDF Inggris yang diimpor.
- Gambar dan audio tetap memakai path sumber Year A 2025 yang sudah tersedia, tanpa mengganti alamat menjadi tahun 2026.
- `publicationStatus` kedua edisi adalah `published`; `source-review.json` berstatus `approved` dan menyimpan checksum final. Peninjau dicatat sebagai Codex untuk audit editorial, dengan dasar publikasi instruksi pemilik proyek tanggal 25 Oktober 2026. Tidak mengklaim pemeriksaan manusia oleh Tim SabatKu.

## Cara mereproduksi

1. `node scripts/import-alive-in-jesus-beginner.mjs <folder-sumber>` membuat draf baru. Untuk memperbarui draf yang belum ditinjau, tambahkan `--refresh-draft`; publikasi non-draf tidak boleh ditimpa.
2. `npm run preview:aij` membangun katalog pengujian termasuk draf.
3. `node --test tests/beginner-publishing.test.mjs` memeriksa struktur, pemisahan peran dan markup.
4. Android `BeginnerFeedAuditTest` menggunakan `SABATKU_FEED_AUDIT_DIR` yang mengarah ke `public` untuk memeriksa katalog terbit.

Laporan aset dan editorial berada pada `docs/audits/beginner-assets.json` dan `beginner-editorial-revision.json`. Perkiraan gambar murid sekitar 56,1 MB dan guru sekitar 60,0 MB; ukuran ini tidak mencakup audio/PDF streaming. Pilihan teks saja tetap harus mempertahankan URL gambar untuk dimuat ketika online.

Status terbit tidak menggantikan pemeriksaan visual dan playback pada HP sebelum rilis APK. Catatan ini berada di dokumentasi kualitas, bukan di teks bacaan.

## Hasil pemeriksaan lokal

- Seluruh 22 tes penerbit konten lulus; validasi katalog produksi lulus dan kedua edisi Beginner masuk feed produksi.
- 17 tes repository Android lulus, termasuk corpus 42 dokumen murid dan 126 dokumen guru, navigasi pekanan, pasangan bahasa, video, presentasi, serta regresi Kindergarten. Tidak ada tes yang dilewati.
- Tiga tes audit sinkronisasi akun lulus, termasuk pengenalan penanda membaca bersama sebagai data belajar yang disinkronkan.
- Kompilasi Kotlin aplikasi debug berhasil. APK tidak dibangun dalam pekerjaan ini.
- 192 URL aset berhasil diakses dengan HTTP HEAD; dua kegagalan koneksi sementara berhasil setelah dicoba ulang. Pemeriksaan HTTP bukan bukti playback pada perangkat.
- Pengujian corpus memakai gambar simulasi dan berkas feed lokal; pemeriksaan HP dan sinkronisasi Firestore antarperangkat belum dilakukan.

## Temuan dan perbaikan audit lanjutan

- Tautan Inggris sebelumnya mengabaikan sumber yang hanya menyediakan PDF. Pemilihan sekarang mencari nomor pekan yang sama, mengutamakan bagian teks yang cocok dan membuka PDF pekan yang sama jika tidak ada teks. Tidak memilih PDF pekan lain.
- Audio sumber Inggris diberi label bahasa Inggris pada kartu, termasuk di panduan guru dan bahan keluarga.
- Tiga tab keluarga mempunyai area sentuh minimum 48 dp dan status tab terpilih untuk pembaca layar. Seluruh baris penanda membaca bersama dapat disentuh sebagai satu kotak centang.
- Perbaikan instruksi prakarya: jiplak ujung gulungan karton (pekan 1), lubang mata diukur menggunakan ujung lem stik (pekan 7), serta arah segitiga palungan (pekan 11). Media dan pola PDF sumber dipertahankan.
- Padanan penomoran ayat Indonesia diperbaiki agar tautan tidak menunjuk ayat yang berbeda: Yesaya 9:5 ([TB](https://www.bible.com/id/bible/306/ISA.9.5.TB)) dan Mazmur 34:11 ([TB](https://www.bible.com/id/bible/306/PSA.34.TB)). Sumber Inggris masing-masing memakai Isaiah 9:6 dan Psalm 34:10.

Tidak ada catatan audit/persetujuan yang ditambahkan ke teks pelajaran. Tidak membangun APK, mengubah versi aplikasi, atau membuat rilis.
