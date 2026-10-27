# Build the Qalun mushaf's page files from KFGQPC's signed Word typesetting (read as data), one
# JSON per page: a list of lines, each [kind, text, align]:
#   kind  "s" surah title (text = surah number), "b" basmala, "t" ayah text
#   align "j" justified, "r" start-aligned (a surah's last line), "c" centred
# plus index.json: each surah's Arabic name, first page and ayah count. Cross-checked against
# KFGQPC's JSON (page and end line of every ayah, and the text letter for letter).
import json, os, re, sys, zipfile, xml.etree.ElementTree as ET
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
docx, data_json, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
root = ET.fromstring(zipfile.ZipFile(docx).read('word/document.xml'))
pages = [[]]
current = ''
def flush(align, paragraph_end):
    global current
    if current.strip():
        pages[-1].append({'text': current.strip(), 'align': align, 'end': paragraph_end})
    current = ''
for p in root.find(W + 'body').iter(W + 'p'):
    ppr = p.find(W + 'pPr'); jc = ppr.find(W + 'jc') if ppr is not None else None
    align = 'c' if jc is not None and jc.get(W + 'val') == 'center' else 'j'
    for el in p.iter():
        if el.tag == W + 'br' and el.get(W + 'type') == 'page':
            flush(align, False); pages.append([])
        elif el.tag == W + 'br':
            flush(align, False)
        elif el.tag == W + 't':
            current += el.text or ''
    flush(align, True)
data = json.load(open(data_json))
os.makedirs(os.path.join(out_dir, 'pages'), exist_ok=True)
surah = 0; previous = None; index = {}
for pno, page in enumerate(pages, 1):
    out = []
    for line in page:
        t = line['text']
        if t.startswith('سُورَةُ'):
            surah += 1; kind = 's'; text = str(surah); align = 'c'
            index[surah] = {'page': pno}
        elif previous == 's' and not re.search(' [٠-٩]', t):
            kind = 'b'; text = t; align = 'c'
        else:
            kind = 't'; text = t
            align = line['align'] if line['align'] == 'c' else ('r' if line['end'] else 'j')
        out.append([kind, text, align]); previous = kind
    json.dump(out, open(os.path.join(out_dir, 'pages', f'{pno}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
for a in data:
    entry = index[a['sura_no']]
    entry['name'] = a['sura_name_ar']; entry['ayat'] = max(entry.get('ayat', 0), a['aya_no'])
json.dump({'pages': len(pages), 'surahs': index}, open(os.path.join(out_dir, 'index.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('pages', len(pages), 'surahs', len(index), 'ayat', sum(s['ayat'] for s in index.values()))
