# Compare QUL's line layout with the API's line_number for every word on every page.
import json, sys, collections

layout_file, api_file = sys.argv[1], sys.argv[2]
layout = json.load(open(layout_file))
api = json.load(open(api_file))

qul_line = {}  # (page, location) -> line
for page, lines in layout.items():
    for line in lines:
        for loc in line['words']:
            qul_line[(int(page), loc)] = line['line']

mismatch_pages = collections.defaultdict(list)
missing = 0
total = 0
offsets = collections.Counter()
for page, words in api.items():
    if words is None:
        continue
    for loc, line, word_page in words:
        total += 1
        q = qul_line.get((int(page), loc))
        if q is None:
            missing += 1
            mismatch_pages[int(page)].append((loc, 'not in QUL page'))
        elif q != line:
            offsets[line - q] += 1
            mismatch_pages[int(page)].append((loc, f'api {line} vs qul {q}'))
qul_total = len(qul_line)
print(f'{layout_file} vs {api_file}: api words {total}, qul words {qul_total}, pages with mismatches {len(mismatch_pages)}, missing {missing}, offsets {dict(offsets)}')
for p in sorted(mismatch_pages)[:12]:
    print('  page', p, mismatch_pages[p][:3], f'({len(mismatch_pages[p])} words)')
