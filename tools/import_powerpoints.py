"""Import the team's seven-day Markdown and keep reviewer notes out of reader content."""
from pathlib import Path
import json, re, shutil
from datetime import date, timedelta

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\ADMIN\Music\Junior Powerpoints')
EDITION = '2026-q4-pp'
DEST = ROOT / 'content/id/powerpoints' / EDITION
SUPPLEMENTS = ROOT / 'content/id/powerpoints-supplements/2026-q4'
LESSON_COVERS = SOURCE / 'Cover Pelajaran'
DAYS = [('sabbath','Sabat Petang'),('sunday','Minggu'),('monday','Senin'),('tuesday','Selasa'),('wednesday','Rabu'),('thursday','Kamis'),('friday','Jumat')]
def write_json(file, value):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def clean(text, source):
    # Reviewer-only sections and inline markers never appear in the reading interface.
    text = re.split(r'(?im)^#{1,6}\s+(?:Bagian yang Memerlukan Pemeriksaan Tim|Catatan untuk Pemeriksaan Editorial|Catatan Peninjauan untuk Tim|Perlu ditinjau(?: oleh tim)?|Catatan editorial|Catatan penerjemah)\s*$', text)[0]
    text = re.sub(r'(?im)^.*(?:Pemeriksaan ayat:|Catatan editorial yang memerlukan peninjauan).*$', '', text)
    clean_lines=[]
    for line in text.splitlines():
        marker=re.search(r'\[PERLU DITINJAU[^\]]*\]',line,re.IGNORECASE)
        if marker:
            prefix=line[:marker.start()].rstrip()
            if prefix.strip().strip('*_>#- '):
                if prefix.count('(')>prefix.count(')'): prefix+=')'
                clean_lines.append(prefix)
            continue
        if line.strip() not in {'**','*','>','-'}: clean_lines.append(line)
    text='\n'.join(clean_lines)
    text = re.sub(r'(?m)^# [^\n]+\n', '', text, count=1)
    text = re.sub(r'(?m)^\*\*Junior PowerPoints[^\n]*\n', '', text)
    text = re.sub(r'(?m)^## Ayat Hafalan \(Power Text\)', '## Ayat Hafalan', text)
    text = re.sub(r'(?m)^## Referensi\s*$', '## Referensi Utama', text)
    text = re.sub(r'(?m)^## Ayat Hafalan \(\*Power Text\*\)', '## Ayat Hafalan', text)
    text = re.sub(r'(?m)^## Pesan Utama \(\*PowerPoint\*\)', '## Pesan Utama', text)
    text = re.sub(r'(?i)(?:,|;|—)\s*terjemahan (?:kerja )?(?:dari|berdasarkan|mengikuti) (?:teks )?(?:sumber bahasa Inggris|teks Inggris|kutipan sumber|ayat yang dikutip sumber)[^\)\n]*', '', text)
    text = re.sub(r'(?i);\s*redaksi TB 1974 perlu dicocokkan sebelum publikasi', '', text)
    text = re.sub(r'(?m)\n{3,}', '\n\n', text)
    # Turn wide printed tables into readable labeled lists for the mobile guide.
    def table(match):
        rows=[line.strip().strip('|').split('|') for line in match.group().strip().splitlines()]
        labels=[value.strip() for value in rows[0]]
        parts=[]
        for row in rows[2:]:
            cells=[value.strip() for value in row]
            if not any(cells): continue
            parts.append('### '+cells[0])
            parts.extend(f'- **{label}:** {value}' for label,value in zip(labels[1:],cells[1:]) if value)
            parts.append('')
        return '\n\n'.join(parts)+'\n'
    text = re.sub(r'(?m)^\|[^\n]+\|\n\|[ :|\-]+\|\n(?:\|[^\n]+\|\n?)+', table, text)
    text = re.sub(r'(?m)^## Pesan Utama \(PowerPoint\)', '## Pesan Utama', text)
    return text.strip()+'\n'

def main():
    lessons=[]; guides=[]
    (DEST/'assets').mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SOURCE/'Kurikulum PowerPoints_ Kasih Karunia Allah.jpg', DEST/'assets/cover.jpg')
    for number in range(1,14):
        cover_name=f'lesson-cover-{number:02}.jpg'
        shutil.copyfile(LESSON_COVERS/f'{number}.jpg', DEST/'assets'/cover_name)
        package = next(SOURCE.glob(f'Junior_PowerPoints_2026_T4_Pelajaran_{number:02}_*'))
        student = next(p for p in package.iterdir() if p.is_dir() and p.name.startswith(f'Pelajaran {number:02} - '))
        title=student.name.split(' - ',1)[1]
        lesson_id=f'lesson-{number:02}'
        start=date(2026,9,26)+timedelta(weeks=number-1)
        entry=dict(id=lesson_id,title=title,startDate=str(start),endDate=str(start+timedelta(days=6)),discussionDate=str(start+timedelta(days=7)))
        guide_candidates=list((package/'Penuntun Guru').glob('*.md'))
        if len(guide_candidates)>1: raise ValueError(f'Ambiguous teacher guide: {package}')
        guide=guide_candidates[0] if guide_candidates else None
        entry["teacherGuideAvailable"]=guide is not None
        lessons.append(entry)
        directory=DEST/lesson_id; directory.mkdir(exist_ok=True)
        readings=[]
        for offset,(key,label) in enumerate(DAYS):
            source=student/f'{label}.md'
            text=clean(source.read_text(encoding='utf-8-sig'),source)
            # Rehome only supplied puzzle images; never invent illustrations or answers.
            for image in student.rglob('*.png'):
                asset=f'puzzle-{number:02}.png'
                shutil.copyfile(image,DEST/'assets'/asset)
                text=re.sub(r'!\[([^\]]*)\]\([^\n]+\)',f'![Teka-teki sumber bahasa Inggris](../../assets/{asset})\n\n*Teka-teki sumber bahasa Inggris.*',text)
            if key=='sabbath':
                text=f'![lesson-cover](../../assets/{cover_name})\n\n{text}'
            (directory/f'{key}.md').write_text(text,encoding='utf-8')
            readings.append(dict(key=key,title=title if key=='sabbath' else label,date=str(start+timedelta(days=offset)),file=f'{key}.md'))
        base='https://www.juniorpowerpoints.org/assets/juniors/Lessons/2026/Q4/English'
        pdfs=[dict(id='english-student',title=f'English · Student · Lesson {number:02}',src=f'{base}/Student/PP-26-Q4-L{number:02}.pdf'),dict(id='english-teacher',title=f'English · Teacher’s Guide · Lesson {number:02}',src=f'{base}/Teacher/PP-26-Q4-L{number:02}-T.pdf')]
        write_json(directory/'lesson.json',{**entry,'illustration':f'../../assets/{cover_name}','illustrationStatus':'available','readings':readings,'pdfs':pdfs})
        if guide is not None:
            folder=SUPPLEMENTS/lesson_id/'teacher-guide'; folder.mkdir(parents=True,exist_ok=True)
            (folder/'content.md').write_text(clean(guide.read_text(encoding='utf-8-sig'),guide),encoding='utf-8')
            study=f'powerpoints:2026-q4:{lesson_id}'
            write_json(folder.parent/'resources.json',dict(schemaVersion='sabatku-supplement-resources-v1',locale='id',studyId=study,resources=[dict(id=f'powerpoints-supplement:id:2026-q4:{lesson_id}:teacher-guide',key='teacher-guide',title=f'Penuntun Guru · Pelajaran {number:02} · {title}',audienceCategory='children-youth',programRole='supplement',locale='id',kind='teacher-guide',scope='weekly',studyId=study,appliesToPrograms=['powerpoints'],source=dict(id='junior-powerpoints',name='Junior PowerPoints · Teacher’s Guide',url='https://www.juniorpowerpoints.org/page2447'),editorialType='translation',translationTeam='Tim penerjemah resmi SabatKu',attribution='© 2026 General Conference of Seventh-day Adventists®. Terjemahan tim SabatKu.',rightsStatement='Materi disediakan oleh tim penerjemah SabatKu sesuai otorisasi tim; hak sumber tetap pada pemiliknya.',publicationStatus='published',revision=1,formats=[dict(mediaType='text/markdown',file='teacher-guide/content.md')])]))
            guides.append(dict(lessonId=lesson_id,manifest=f'{lesson_id}/resources.json'))
    write_json(DEST/'edition.json',dict(id=EDITION,programId='powerpoints',locale='id',title='Junior PowerPoints · Kasih Karunia Allah Memulihkan Kita',description='Triwulan IV 2026 · Tahun C · Tujuh bacaan harian dan bahan guru pekanan.',theme='Kasih Karunia Allah Memulihkan Kita',startDate=lessons[0]['startDate'],endDate=lessons[-1]['endDate'],cover=f'editions/{EDITION}/assets/cover.jpg',sourceName='Junior PowerPoints · General Conference of Seventh-day Adventists®',sourceUrl='https://www.juniorpowerpoints.org/page2447',attribution='© 2026 General Conference of Seventh-day Adventists®. Terjemahan tim SabatKu.',rightsStatement='Materi disediakan oleh tim penerjemah SabatKu sesuai otorisasi tim; hak sumber tetap pada pemiliknya.',publicationStatus='published',lessons=lessons,dayOrder=[key for key,label in DAYS]))
    write_json(SUPPLEMENTS/'collection.json',dict(schemaVersion='sabatku-supplements-v1',id='powerpoints-supplements:id:2026-q4',title='Penuntun Guru Junior PowerPoints · Triwulan IV 2026',locale='id',quarter='2026-q4',audienceCategory='children-youth',programRole='supplement',publicationStatus='published',revision=1,editionBindings=[dict(programId='powerpoints',locale='id',editionId=EDITION,unitIdPattern='{number:02}')],lessons=guides,quarterResources=[]))
    print(f'Imported {len(lessons)} lessons, 91 readings, {len(guides)} teacher guides.')

if __name__=='__main__': main()
