# Qalun mushaf data

`public/qalun` holds the Qalun 'an Nafi' mushaf page by page and line by line, built from the King
Fahd Glorious Quran Printing Complex's developer package **UthmanicQaloun v2.1** (update 5.0,
2022-09-25): `UthmanicQaloun_v2-1.zip`, MD5 `964208ff04c8aadd3ddc1be262d8cfd3` as published on
https://qurancomplex.gov.sa/en/techquran/dev/ (fetched from the Internet Archive capture
20250818023759).

- Lines and pages come from the package's signed Word typesetting (`uthmanic_qaloun_v21.docx`,
  its manual line and page breaks), read as data.
- Checked against the package's JSON: every one of the 6,214 ayat ends on the page and line the
  JSON gives, and the text is identical letter for letter (ayah marks aside).
- `public/fonts/quran/qalun/uthmanic_qaloun_v21.ttf` is the package's font, unmodified
  (KFGQPC's licence is embedded in it).

```sh
python3 build_site_data.py "<package>/font/uthmanic_qaloun_v21.docx" \
  "<package>/data/QalounData_v2-1.json" ../../public/qalun
```
