Unit Price Compare
==================

An offline, zero-dependency shopping tool for **aisle decisions**: enter shelf
prices, package sizes, and units — see the true price-per-ounce, per-pound, or
per-sheet ranking, with the best value highlighted, totals per store, and a
save-comparison note for later.

Works for groceries, resale supplies (eBay/Amazon sellers love per-sheet and
per-item math), and bulk purchases. No accounts, no network, no tracking: open
the file, use it, close it.

Part of the ASDALE DYNAMICS, LLC suite of local-first tools — 
a companion to **grocery-price-ledger-webapp** (track prices over time;
Unit Price Compare answers "which one do I grab off the shelf right now?").

Quick start
-----------
No install. No build. No server.

1. Download this folder (or clone it).
2. Double-click `index.html` — it opens straight in your browser from
   `file://`.
3. Add items, or click **Load example data** to see how it works.

That's it. There are no other steps because there are no dependencies.

How to use
----------
For every package you're considering, enter:

- **Store** — where you're standing (compare across stores).
- **Shelf / aisle** — the grouping key, e.g. `Paper towels`. Items with the
  same shelf name are ranked together.
- **Item name** — what it actually is on the label.
- **Shelf price** — the sticker price.
- **Package size + unit** — the number on the front of the package and its
  unit: `oz`, `lb`, `g`, `kg`, `fl oz`, `mL`, `L`, `cup`, `pint`, `quart`,
  `gal`, `sheets`, `count`, or `dozen`.

The app then shows:

1. **Price rankings by shelf** — items group by shelf name and unit family
   (weight vs volume vs sheets vs count) so you always compare like with like,
   sorted cheapest-true-price first. The cheapest per unit gets a green
   **best value** badge. It even catches the classic bulk trap: a bigger pack
   that costs more per sheet/ounce than the small one.
2. **Totals by store & shelf** — the combined cost of everything you entered
   per store, so you can see which store wins before you drive anywhere.
3. **Save-comparison note** — a free-text note saved with the comparison
   (with export/import as JSON to move it between devices).

Everything you enter is stored only in your browser's local storage on that
device. Nothing is uploaded (there is no network code at all).

Privacy & offline guarantees
----------------------------
- Pure HTML/JS/CSS. Zero libraries, zero frameworks, zero API keys.
- Runs entirely from `file://` — airplane-mode friendly, works on a laptop
  with no Wi-Fi.
- Your data never leaves your machine. Data lives in your browser's local
  storage; if that's unavailable (strict private mode), the app says so and
  keeps working in-session, with Export/Import as the backup path.
- No secrets or personal data are stored in any file.

Why per-ounce beats eyeballing
------------------------------
Packages hide price differences in three ways: different sizes, different
units (a `25 oz` can vs a `10 lb` bag), and sale stickers. True unit price
(price ÷ real package contents) flattens all three. This tool does the
conversions for you — including grams, kilograms, milliliters, gallons, sheets
and dozens — and ranks the results.

Running the tests
-----------------
The unit math (conversions, edge cases like zero/negative sizes, string
inputs, ties, invalid rows, totals math) is covered by a dependency-free test
suite:

```
node tests/run-node.js        # 66-assertion unit test suite
node tests/app-smoke.js       # headless DOM smoke test of the real app.js
```

Both exit non-zero on failure. You can also open `tests/tests.html` directly
in a browser to run the suite from `file://`.

Project layout
--------------
```
index.html            the app (open this)
styles.css            styles (responsive + print-friendly)
app.js                UI logic, local storage, export/import
unit-math.js          pure conversion/price math shared by app and tests
tests/run-node.js     node test runner entry
tests/unit-math-tests.js   the assertions
tests/tests.html      browser test runner
```

License
-------
MIT — see `LICENSE`. Copyright (c) 2026 Asdale Dynamics, LLC.

Credits
-------
Built and maintained by **Asdale Dynamics, LLC** as part of the
beginner-friendly, local-first tool collection from Dylan Asdale
(dylanasdale.github.io). Companion project: grocery-price-ledger-webapp.
