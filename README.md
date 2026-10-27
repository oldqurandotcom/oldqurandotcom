# Old Quran.com

An unofficial, non-commercial copy of the 2021–2023 Quran.com design, live at
**https://oldqurandotcom.vercel.app**.

It is here only to help people keep reading the Quran in the layout they know, and it will be
taken down as soon as Quran.com adds a toggle for the classic design.

## Not affiliated

Not affiliated with or endorsed by Quran.com or Quran.Foundation, and no rights are claimed.
The code is Quran.com's open-source frontend
([quran/quran.com-frontend-next](https://github.com/quran/quran.com-frontend-next), October 2023).
The Quran text, translations, tafsir, recitations and design belong to Quran.com,
Quran.Foundation and their content providers, and are loaded from Quran.com's public API and CDN.
The page line layouts come from [QUL](https://qul.tarteel.ai) by Tarteel, and the surah heading
font is by the King Fahd Glorious Quran Printing Complex.

No ads, no tracking, nothing for sale.

## Added

- **Select to loop:** select ayat, or just a few words, and press *Loop*; it repeats from the first
  selected word to the last until you press *Stop* or Esc.
- **Two pages:** in reading view on a wide screen, with the default (Madani V1) font, the
  open-book button (bottom right) shows full printed pages in pairs, odd page on the right, with every line, surah heading and
  Bismillah where the printed mushaf has it (see `scripts/mushaf-lines`).
- **Cmd/Ctrl + and −** make the Quran text bigger or smaller instead of zooming the page.
- **Mini Mushaf:** the current page in an always-on-top window while you work in other tabs
  (Chrome, Edge, Brave, Arc). Cmd −/+ changes the size.

## Run it

```sh
yarn && yarn dev   # Node 18+, then open http://localhost:3000
```

On macOS you can also double-click `start.command`.

## Contact

Complaints, or the Quran.com team wanting to get in touch: **oldqurandotcom@proton.me**
