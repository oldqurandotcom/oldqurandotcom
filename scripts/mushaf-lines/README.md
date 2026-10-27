# Mushaf line layouts

`public/mushaf-lines/*.json` tell the two-page view where every line of each printed page goes:
surah name frames, the Bismillah, centred lines and empty lines. They're built from:

- **QUL** (qul.tarteel.ai, by Tarteel): each line's type and centring, for every page of each print.
- **Quran.com's API**: the line number of every word, which decides which words share a line.
  Where the two disagree on a word, the API matches the printed glyphs (its lines come out full
  width), so words are placed by the API.

```sh
python3 scrape_qul_layout.py 15 604 v1.json         # KFGQPC V1 (1405H) layout from QUL
python3 fetch_api_lines.py 2 604 api_2.json         # mushaf 2 = QCF V1 in the API
python3 compare.py v1.json api_2.json               # report words on different lines
python3 build.py v1.json api_2.json ../../public/mushaf-lines/v1.json
```

The site ships only `v1.json` (the default font, KFGQPC V1 1405H: QUL resource 15, API mushaf 2,
604 pages); the two-page view is offered with that font only. The other prints were checked the
same way (V2: resource 10 / mushaf 1, KFGQPC Hafs: `layout:5` / 5, Tajweed: `layout:11` / 11,
IndoPak 15 and 16 lines: resources 12 and 11 / mushaf 6 and 7), where a number is a downloadable
QUL resource and `layout:N` is QUL's layout preview `mushaf_layouts/N`.
