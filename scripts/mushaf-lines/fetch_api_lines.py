# Download each word's page line number from the Quran.com API, for every page of one mushaf.
import json, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

mushaf, pages, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]

def fetch(page):
    url = (f'https://api.qurancdn.com/api/qdc/verses/by_page/{page}?words=true&per_page=all'
           f'&mushaf={mushaf}&word_fields=line_number,page_number,location&filter_page_words=true')
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60) as r:
                data = json.load(r)
            return page, [[w['location'], w['line_number'], w['page_number']] for v in data['verses'] for w in v['words']]
        except Exception:
            time.sleep(2 * (attempt + 1))
    return page, None

with ThreadPoolExecutor(8) as pool:
    result = dict(pool.map(fetch, range(1, pages + 1)))
json.dump(result, open(out, 'w'))
print(f'mushaf {mushaf}: missing pages {[p for p, w in result.items() if w is None][:20]}')
