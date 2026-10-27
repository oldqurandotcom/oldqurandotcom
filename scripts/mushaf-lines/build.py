# Build a compact per-page line map: QUL gives each line's type and centring; words are placed by
# the API's own line numbers (the k-th API line on a page is the k-th ayah line of the layout).
import json, sys

layout_file, api_file, out = sys.argv[1], sys.argv[2], sys.argv[3]
layout = json.load(open(layout_file))
api = json.load(open(api_file))
pages = {}
problems = []
remapped = []
for page in sorted(layout, key=int):
    lines = sorted(layout[page], key=lambda l: l['line'])
    entries = []
    for l in lines:
        cls = l['cls']
        if 'surah-name' in cls and 'bismillah' in cls:
            entries.append(f"s{l['surah']}b")  # name and Bismillah share the line (IndoPak 16 lines)
        elif 'surah-name' in cls:
            entries.append(f"s{l['surah']}")
        elif 'bismillah' in cls:
            entries.append('b')
        elif not l['words']:
            entries.append('')
        else:
            entries.append('c' if 'center' in cls else 'a')
    ayah_lines = [i + 1 for i, e in enumerate(entries) if e in ('a', 'c')]
    api_lines = sorted({w[1] for w in api[page]})
    if len(api_lines) != len(ayah_lines):
        # the API's line numbers don't fit this page's layout: place words by the layout's own
        # word lists instead, writing each ayah line's first word
        problems.append(page)
        entries = [f"{e}@{lines[i]['words'][0]}" if e in ('a', 'c') else e for i, e in enumerate(entries)]
    elif api_lines != ayah_lines:
        remapped.append((page, api_lines, ayah_lines))
    pages[page] = entries
json.dump({'pages': pages}, open(out, 'w'), separators=(',', ':'))
print(f'{out}: {len(pages)} pages; pages placed by layout words {problems}; remapped pages {[r[0] for r in remapped]}')
