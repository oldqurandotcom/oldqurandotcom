# Collect QUL's per-line mushaf layout (line type, centring, word locations) for every page.
import json, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

resource, pages, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]

def parse(html):
    lines = []
    for m in re.finditer(r'<div class="line-container" data-line="(\d+)">\s*<div class="([^"]*)"', html):
        start = m.end()
        nxt = html.find('<div class="line-container"', start)
        chunk = html[start:nxt if nxt != -1 else len(html)]
        locs = re.findall(r'data-location="([\d:]+)"', chunk)
        surah = re.search(r'surah(\d{3})', chunk)
        lines.append({
            'line': int(m.group(1)),
            'cls': ' '.join(m.group(2).split()),
            'words': locs,
            'surah': int(surah.group(1)) if surah and 'surah-name' in m.group(2) else None,
        })
    return lines

def fetch(page):
    # "16" -> a downloadable resource; "layout:16" -> the layout preview (same markup)
    url = (f'https://qul.tarteel.ai/mushaf_layouts/{resource.split(":")[1]}?page_number={page}'
           if resource.startswith('layout:')
           else f'https://qul.tarteel.ai/resources/mushaf-layout/{resource}?page={page}')
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60) as r:
                lines = parse(r.read().decode('utf-8'))
            if lines:
                return page, lines
        except Exception as e:
            err = e
        time.sleep(2 * (attempt + 1))
    return page, None

with ThreadPoolExecutor(6) as pool:
    result = dict(pool.map(fetch, range(1, pages + 1)))
missing = [p for p, l in result.items() if not l]
json.dump(result, open(out, 'w'))
print(f'resource {resource}: {pages - len(missing)} pages, missing {missing[:20]}')
