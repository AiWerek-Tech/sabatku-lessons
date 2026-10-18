# Kindergarten Tahun A · Triwulan IV 2026

Naskah lokal diimpor pada 18 Oktober 2026 dari folder tim SabatKu. Dua edisi: murid (95 dokumen pembaca) dan guru (114 dokumen pembaca). Tema: **Yesus Mampu Melakukan Apa Saja**. Sumber Inggris/PDF dipakai untuk telaah dan tidak diunggah ke koleksi Indonesia.

## Menjalankan pratinjau

`npm run preview:aij` membangun katalog terpisah pada public-preview/. Katalog produksi mengecualikan draft Kindergarten. Jalankan tes Android `KindergartenFeedAuditTest` dengan SABATKU_FEED_AUDIT_DIR menunjuk folder pratinjau tersebut. Tes memutar ulang semua unit, menyimulasikan gambar eksternal dan memeriksa online/offline/refresh serta salinan teks tanpa gambar.

Importer menolak menimpa target yang sudah ada; opsi --refresh-draft hanya untuk regenerasi draft. Jangan menjalankannya setelah penyuntingan manual tanpa menyimpan perubahan editorial. Manifest review perlu diperbarui setelah setiap perubahan naskah.

## Lima flag sumber yang ditelaah

| Pasangan | Penjelasan |
|---|---|
| Murid 02/05 | Inggris menulis jam 1:00 pm; Indonesia memakai format 13.00. Empat referensi ayat tetap ada. |
| Murid 08/01 | Inggris menulis Luke14:1 tanpa spasi. Indonesia menulis Lukas 14:1. |
| Murid 13/04 | Indonesia menyebut Yohanes 11:27 secara eksplisit pada jawaban Marta. Bukan ayat yang hilang. |
| Guru 08/01-overview | Inggris menulis Luke14:1; Indonesia memakai spasi pada Lukas 14:1. |
| Guru 13/06-tell-the-story | Indonesia menambahkan rujukan eksplisit Yohanes 11:27 pada jawaban Marta. |

Ini adalah penjelasan perbedaan metrik otomatis, bukan persetujuan bahasa atau makna seluruh naskah. Laporan lengkap dalam docs/audits/kindergarten-*-source-audit.json mencatat checksum tiap pasangan tanpa menyimpan salinan teks Inggris.

## Perapian yang dilakukan

- Hierarki heading, blok ayat, gambar dan kartu audio dirender dari makna anotasi sumber; JSON dan --- tidak ditampilkan mentah.
- Judul “Gambaran Umum Kuartal 3 Taman Kanak-Kanak” diselaraskan menjadi “Ikhtisar Kindergarten · Triwulan IV”, berdasarkan buku final KYAQ4.
- Bagan Penawaran → Bagan Persembahan; Keyakinan Fundamental → Kepercayaan Dasar; semester lalu → triwulan sebelumnya.
- Urutan pekan mengikuti buku murid/guru final: pekan 2 “Kumohon, Sembuhkanlah Anakku”, pekan 4 “Berjalan di Atas Air”.
- Guru menyimpan bagian program sebagai dokumen tersendiri dengan kunci stabil; tidak dibuat menjadi tujuh hari.

## Sebelum publikasi

Tim memeriksa kelancaran bahasa anak (termasuk Anda/kamu, Martha/Marta, dan istilah lagu), ketepatan makna serta kutipan, lalu mencatat nama peninjau dan tanggal pada source-review.json. Setiap edisi memerlukan status approved dan checksum terbaru. Jangan memakai persetujuan Primary untuk Kindergarten. Setelah itu ubah edition.json dari draft menjadi published dan jalankan validasi, tes, build feed serta pemeriksaan perangkat.

## Hasil pemeriksaan implementasi

Pada 18 Oktober 2026: 18 tes publisher lulus; sembilan tes Android terarah (termasuk corpus Primary dan 209 dokumen Kindergarten) lulus; kompilasi antarmuka Android berhasil. Seluruh 302 URL media memberi HTTP HEAD 200. Rincian ukuran gambar ada pada docs/audits/kindergarten-asset-check.json. Tes gambar parser memakai aset simulasi; pemeriksaan tampilan HP dan playback nyata belum dilakukan. Pemeriksaan tersebut tidak menggantikan review bahasa dan makna oleh tim.

## Audit lanjutan 18 Oktober 2026

- Dibandingkan kembali dengan naskah sumber Inggris dan dirapikan narasi guru pekan 2, pengantar kurikulum guru, ringkasan triwulan, istilah pekan, judul audio, serta label panduan murid/guru. Penanda visual yang menempel pada kalimat juga diperbaiki.
- Kartu jawaban teka-teki “Waktu!” kini tetap menjadi jawaban tebal, bukan heading. Parser Android kembali membentuknya sebagai kartu ketuk-untuk-membuka.
- Pembaca murid Kindergarten tidak lagi menampilkan kartu refleksi umum untuk orang dewasa di akhir bacaan.
- Semua 95 bacaan murid dan 114 bacaan guru diputar melalui audit feed online/offline, mode teks tanpa gambar, dan refresh. Kartu audio, jawaban interaktif, serta status sumber tetap lolos pemeriksaan.
- Verifikasi terbaru: tes publisher 18/18 lulus; tes repository Android 100 total, 96 lulus dan 4 tes opsional dilewati; tes audit feed Kindergarten dan tes parser interaktif lulus; kompilasi `:app:compileDebugKotlin` berhasil. Validasi feed publik tetap menghasilkan 8 edisi terbit dan tidak memasukkan edisi Kindergarten yang masih draft.
- Kedua edisi Kindergarten tetap `draft` dan `needs-team-review`. Revisi ini belum menggantikan pemeriksaan akhir serta persetujuan bahasa dan makna oleh Tim SabatKu. Tidak ada APK dibangun; pemeriksaan tampilan pada perangkat fisik belum dilakukan.
