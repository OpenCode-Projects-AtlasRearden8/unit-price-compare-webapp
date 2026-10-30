# STATUS.md — Unit Price Compare

Last updated: 2026-10-30

## What was built

An offline, single-page unit-price comparison tool for aisle decisions, per the
original goal:

- **Enter shelf prices, package sizes, and units** for items across stores and
  shelves (aisles). 14 units supported: oz, lb, g, kg, fl oz, mL, L, cup,
  pint, quart, gal, sheets, count, dozen (plus polite aliases).
- **True price-per-ounce/pound/sheet rankings** — items group by shelf name and
  unit family (weight / volume / sheets / count) so like compares with like,
  sorted cheapest true unit price first.
- **Best-value highlight** — the cheapest per unit in each shelf×family group
  gets a green "best value" badge; ties break alphabetically deterministically.
- **Store-per-shelf totals** — combined cost of all entered items per store and
  shelf, so you can pick the winning store before driving.
- **Save-comparison note for later** — free-text note persisted with the data;
  JSON export/import to move comparisons between devices.
- **Local-first** — all data in-browser (localStorage with graceful in-memory
  fallback and an explicit warning when storage is unavailable). No accounts,
  no network, no telemetry. Pure HTML/JS/CSS, zero dependencies, runs from
  `file://`.
- Print-friendly stylesheet for taking the comparison to the store.
- **MIT LICENSE** (Copyright (c) 2026 Asdale Dynamics, LLC) and README
  crediting Asdale Dynamics, LLC; positioned as companion to
  grocery-price-ledger-webapp.

## Layout

```
index.html           the app (double-click to run)
styles.css           responsive + print styles
app.js               UI, storage, export/import
unit-math.js         pure conversion/price math (shared by app + tests)
tests/run-node.js    node test runner entry
tests/unit-math-tests.js   66 unit-math assertions
tests/tests.html     browser test runner (file:// friendly)
tests/app-smoke.js   headless DOM smoke test of the real app.js
LICENSE, README.md, STATUS.md
```

## How to run

- Open `index.html` in any modern browser (double-click; no build, no server,
  no install). Optional: **Load example data** button demonstrates the full flow.
- Tests: `node tests/run-node.js` and `node tests/app-smoke.js`
  (both exit non-zero on failure). Browser: open `tests/tests.html`.

## Verification results (2026-10-30)

- `node tests/run-node.js` → **PASS — 66 assertions** (exit 0). Covers:
  lb/kg/g→oz and mL/L/cup/pint/quart/gal→fl-oz conversions, round-trips,
  sheets/count/dozen families, unit-alias/case-insensitivity, zero/negative/
  NaN/Infinity/string inputs, bulk-trap pricing, tie-breaks, invalid rows in
  grouping/totals, and money/size formatters.
- `node tests/app-smoke.js` → **SMOKE PASS**. Headless-run of the real
  `app.js`: init renders empty state, form handler adds an item with correct
  unit price ($0.0999/sheet), best-value badge and store totals render, note
  persists to (stubbed) localStorage, and a simulated reload restores items.
- `node --check` on all JS files → clean syntax.
- Static cross-check: every `id` referenced by `app.js` exists in
  `index.html`.
- Browser run (manual coding pass + smoke coverage): `index.html` loads two
  scripts only (`unit-math.js`, `app.js`); no external requests in any file.

## Known gaps

- Package-size parsing relies on one number + one unit; labels like
  "2 pack × 24 oz" must be entered as the total (48 oz).
- Same-product matching across items is by name only, for humans' benefit —
  ranking is purely numeric, per shelf and unit family.
- No CSV export (JSON only) — could add if wanted.
- localStorage is per-browser/per-origin: data does not sync across devices;
  use Export/Import.
- On some browsers strict `file://` settings block localStorage; the app
  detects this, warns clearly, and keeps working in-session.
- No automated end-to-end test in a real browser engine (smoke test uses a
  minimal DOM stub by design to stay dependency-free).
