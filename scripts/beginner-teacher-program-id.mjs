const audio = source => [...source.matchAll(/^\[♫[^\n]+$/gm)].map(m => m[0]);
const pictures = source => [...source.matchAll(/^!\[[^\n]+$/gm)].map(m => m[0]);
const songs = (names, links) => names.map((text, i) => `${text}\n\n${links[i] ?? ''}`).join('\n\n');

/** Repeated program instructions translated from the paired English source. */
export function refineBeginnerTeacherSection(key, source, week, crafts) {
  const links = audio(source);
  const imageLinks = pictures(source);
  if (key === 'welcome') return `### Penyambutan dan Permainan Sensori (5–8 menit)

- Sambut setiap anak serta orang tua atau pengasuhnya dengan hangat.
- Arahkan anak ke tempat bermain dengan kotak pasir sensori.
- Sapa para pendamping dan bangun hubungan dengan mereka. Tersenyumlah agar mereka tahu Anda senang bertemu.
- Kenali nama anggota keluarga.
- Ciptakan suasana yang ramah dengan musik latar.
- Ajak para pendamping menyampaikan pokok doa. Berdoalah bersama bagi satu sama lain dan bagi anak-anak.

${links.join('\n\n')}

### Bahan dan Alat

- Buku bergambar sesuai tema.
- Kotak pasir sensori.`;
  if (key === 'prayer') return `### Berdoa (2 menit)

Nyanyikan “When It’s Time to Pray”. Ajak anak berlutut dengan hormat, melipat tangan, dan memejamkan mata. Panjatkan doa singkat atau ajak mereka mengulang: “Terima kasih, Tuhan, karena aku bisa menjadi penolong-Mu yang istimewa …” Sesuaikan dengan Pesan Utama pekan ini. “Kami mengasihi-Mu. Amin.”

${links.join('\n\n')}`;
  if (key === 'offering') return `### Persembahan (3 menit)

Nyanyikan “Here Is My Money”, lalu katakan, “Kita memberikan sebagian uang kita kepada Yesus untuk menunjukkan kasih kita kepada-Nya. Ia memakainya untuk menolong orang lain mengenal-Nya juga.” Setiap pekan, pilih anak yang berbeda untuk mengumpulkan persembahan. Sesudahnya, panjatkan doa singkat.

${links.join('\n\n')}

### Bahan dan Alat

- Keranjang persembahan.`;
  if (key === 'nature') return `### Mengenal Alam (5 menit)

Nyanyikan “Nature Box Song”: “Apa yang ada di kotak alam? Aku ingin melihat sesuatu yang Tuhan ciptakan untukku! Apakah warnanya hijau, kuning, atau biru? Apa pun itu, Tuhan menciptakannya untukmu!”

${links.join('\n\n')}

Tunjukkan benda-benda alam. Ajak anak memegang dan mengamatinya sambil Anda menjelaskan serta mengajukan pertanyaan. Anda dapat memakai buah atau sayur segar, kerang, daun, bunga, sarang burung, tanaman kecil, biji, hewan kecil atau gambarnya, dan benda alam lain yang tersedia di daerah Anda.

Ucapkan bersama, “Aku bisa menjadi penolong Tuhan dengan merawat … yang Engkau ciptakan.”

### Bahan dan Alat

- Lagu “Nature Box Song”.
- Kotak alam.`;
  if (key === 'goodbye') return `### Penutup (3 menit)

Katakan betapa senangnya Anda karena anak-anak datang ke Sekolah Sabat hari ini.

**Berdoa:** Panjatkan doa singkat agar Tuhan dekat dengan anak-anak dan keluarga mereka sepanjang pekan mendatang.

**Bernyanyi:** Nyanyikan “Sabbath School Is Over” bersama sambil melambaikan tangan untuk berpamitan.

${links.join('\n\n')}

### Gerakan

Lambaikan tangan.`;
  if (key === 'praise') {
    const intro = `### Memuji Tuhan (15 menit)

Jika memungkinkan, ajak orang tua atau pengasuh duduk di lantai bersama anak, atau di belakang kursinya agar mudah ikut mendampingi. Letakkan alat peraga dalam jangkauan supaya pergantian lagu berjalan lancar. Lagu dan alat peraga menjadi bagian terbesar program. Saat beralih lagu, tetap tekankan tema: **Aku bisa menjadi penolong Tuhan.** Ajak para pendamping ikut bernyanyi.

Sambut keluarga dengan senyuman dan katakan bahwa Anda senang mereka hadir.

`;
    const early = [
      '**“Tick-Tock”.** Berikan stik untuk diketukkan mengikuti lagu. Katakan betapa senangnya mereka dapat datang ke Sekolah Sabat.',
      '**“The Sabbath”.** Ceritakan bahwa Sabat adalah hari terbaik dalam sepekan. Berikan alat musik untuk dimainkan sambil memuji Tuhan.',
      '**“God’s Little Helper” atau “I’m a Little Helper”.** Berikan sikat atau sapu kecil. Ucapkan bersama, “Aku bisa menjadi penolong Tuhan.”',
      '**“Let’s Put All Our Toys Away”.** Sebarkan mainan, lalu ajak anak membereskannya sambil bernyanyi. Ucapkan bersama, “Aku bisa menjadi penolong Tuhan.”',
      '**“When a Mother Calls”.** Berikan boneka anak hewan. Pegang boneka induknya di depan dan panggillah anak-anak hewan itu. Ajak anak membawa bonekanya kepada Anda untuk belajar menaati panggilan. Ucapkan bersama, “Aku bisa menjadi penolong Tuhan saat aku taat.”',
      '**“With Jesus in the Family”.** Ceritakan bahwa rumah lebih bahagia ketika Yesus hadir. Bernyanyilah sambil bertepuk tangan dan menunjuk anak, ibu, serta ayah.',
    ];
    const late = [
      '**“Christmas Star”.** Berikan bintang pada stik kepada setiap anak dan bicarakan cahaya malaikat yang tampak sebagai bintang.',
      '**“Riding on a Camel”.** Berjalanlah mengelilingi ruangan sambil membayangkan perjalanan menunggang unta melewati padang pasir mengikuti bintang. Unta mainan atau unta pada stik juga dapat digunakan.',
      '**“I’ll Share My Home”.** Berikan sapi mainan kepada setiap anak. Bicarakan pengalaman Maria dan Yusuf di kandang.',
      '**“It Was a Happy Day”.** Gunakan malaikat, domba, dan hadiah berbungkus saat menyanyikan setiap bait. Alat peraga dan dekorasi membantu Anda menceritakan kelahiran Yesus.',
      '**“Baby Jesus”.** Berikan boneka bayi untuk dipegang, dimandikan, dibungkus, dan diayun perlahan.',
      '**“Who Is Jesus?”** Berikan gambar Yesus dewasa kepada setiap anak.',
    ];
    const resources = week < 9 ? '- Stik.\n- Alat musik.\n- Sikat atau sapu kecil.\n- Mainan.\n- Boneka anak hewan dan induknya.' : '- Bintang pada stik.\n- Unta mainan atau unta pada stik.\n- Sapi mainan.\n- Malaikat, domba, hadiah berbungkus.\n- Boneka bayi dan kain.\n- Gambar Yesus.';
    // Week 1–8 source offers two alternatives in one instruction, each with an audio card.
    const content = week < 9 ? early.map((text, i) => `${text}\n\n${i === 2 ? links.slice(2,4).join('\n\n') : links[i > 2 ? i+1 : i] ?? ''}`).join('\n\n') : songs(late,links);
    return intro + content + '\n\n### Bahan dan Alat\n\n' + resources + '\n\n' + imageLinks.join('\n\n');
  }
  if (key === 'craft') {
    const [instructions, materials] = crafts[String(week).padStart(2, '0')];
    const downloads = [...source.matchAll(/^.*\]\(https:[^\n]+\.pdf[^\n]*$/gm)].map(m => m[0]);
    return `### Kegiatan Orang Tua dan Anak (5–10 menit)

Ajak orang tua atau pengasuh membuat prakarya bersama anak. Dampingi anak saat menggunakan bahan dan alat. Sambil berkegiatan, ulangi Pesan Utama dan cerita Alkitab pekan ini.

Jika ada yang berulang tahun, rayakan bersama dengan lagu “Happy Birthday”.

${links.join('\n\n')}

### Prakarya

${instructions}

### Bahan dan Alat

${materials}

${downloads.join('\n\n')}

${imageLinks.join('\n\n')}`;
  }
  if (key === 'story') return source.replaceAll('Orang tua bisa menggendong anak mereka di pangkuan yang bergelombang.', 'Orang tua dapat mendudukkan anak di pangkuan dan mengayunkannya perlahan untuk menirukan gerakan perjalanan.')
    .replaceAll('Sapu dikibaskan untuk menyapu daun-daun yang mungkin tertiup ke rumah Allah.', 'Ia mengayunkan sapunya untuk membersihkan daun-daun yang tertiup masuk ke rumah Allah.')
    .replaceAll('Kain digosokkan untuk memoles barang-barang indah yang digunakan di rumah Allah.', 'Ia menggosok barang-barang indah di rumah Allah dengan kain hingga mengilap.')
    .replaceAll('dengan barang-barang pilihanmu', 'dengan benda-benda pilihan Anda')
    .replaceAll('Hai beberapa Orang Majus', 'Hai beberapa orang majus')
    .replace(/\*\*([^*\n]+?)\*\*/g, (_, value) => `**${value.trim()}**`).replace(/\*{4}PERSIAPAN CERITA:\*\*([^\n]*)\*\*/g,'**Persiapan cerita:**$1')
    .replaceAll('Bolehkah kau terlihat terkejut?', 'Bisakah kamu menunjukkan wajah terkejut?')
    .replaceAll('Saya bisa mempercayai Tuhan', 'Aku bisa percaya kepada Tuhan')
    .replace('Saatnya kita mendengarkan cerita tentang bagaimana Tuhan kita yang penuh kasih selalu bersama kita!', 'Saatnya mendengarkan cerita tentang Tuhan yang mengasihi dan selalu menyertai kita!');
  return source;
}
