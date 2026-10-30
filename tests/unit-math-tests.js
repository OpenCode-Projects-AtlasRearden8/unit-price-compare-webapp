/*
 * unit-math-tests.js — edge-case tests for unit-math.js.
 * Zero dependencies. Runs two ways:
 *   Node:        node tests/run-node.js          (exit code 1 on failure)
 *   Any browser: open tests/tests.html directly from file://
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.RunUnitMathTests = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function createRunner() {
    var failures = [];
    var passes = 0;
    function ok(cond, label) {
      if (cond) { passes += 1; } else { failures.push(label); }
    }
    function eq(actual, expected, label) {
      var a = typeof actual === "number" ? round(actual) : actual;
      var e = typeof expected === "number" ? round(expected) : expected;
      var same =
        a === e ||
        (typeof JSON !== "undefined" && JSON.stringify(a) === JSON.stringify(e));
      ok(same, label + " — expected " + JSON.stringify(e) + ", got " + JSON.stringify(a));
    }
    function near(actual, expected, label) {
      ok(
        typeof actual === "number" && isFinite(actual) && Math.abs(actual - expected) < 1e-9,
        label + " — expected ~" + expected + ", got " + actual
      );
    }
    function round(n) {
      return typeof n === "number" ? Math.round(n * 1e9) / 1e9 : n;
    }
    return {
      ok: ok, eq: eq, near: near,
      done: function () { return { passes: passes, failures: failures }; },
    };
  }

  function runTests(M) {
    var t = createRunner();

    /* ---------- toBase: weight family ---------- */
    (function () {
      var r = M.toBase(2, "lb");
      t.eq(r && r.family, "weight", "toBase(2,'lb') family");
      t.near(r && r.baseQty, 32, "toBase 2 lb = 32 oz");
      t.near(M.toBase(1, "kg").baseQty, 1000 / M.GRAMS_PER_OZ, "toBase 1 kg = ~35.27 oz");
      t.near(M.toBase(1, "g").baseQty, 1 / M.GRAMS_PER_OZ, "toBase 1 g in oz");
      t.near(M.toBase(1, "oz").baseQty, 1, "toBase 1 oz identity");
    })();

    /* ---------- toBase: volume family ---------- */
    (function () {
      t.near(M.toBase(1, "cup").baseQty, 8, "toBase 1 cup = 8 fl oz");
      t.near(M.toBase(1, "gal").baseQty, 128, "toBase 1 gal = 128 fl oz");
      t.near(M.toBase(1000, "mL").baseQty, 1000 / M.ML_PER_FL_OZ, "toBase 1000 mL in fl oz");
      t.near(M.toBase(1, "L").baseQty, M.toBase(1000, "mL").baseQty, "toBase 1 L == 1000 mL");
      t.near(M.toBase(2, "fl oz").baseQty, 2, "toBase fl oz identity");
    })();

    /* ---------- toBase: sheet / count families ---------- */
    (function () {
      t.eq(M.toBase(150, "sheets").family, "sheet", "sheets family");
      t.near(M.toBase(150, "sheets").baseQty, 150, "sheets base quantity");
      t.near(M.toBase(1, "dozen").baseQty, 12, "1 dozen = 12 items");
      t.eq(M.toBase(1, "dozen").family, "count", "dozen maps to count family");
    })();

    /* ---------- toBase: case-insensitivity & junk ---------- */
    (function () {
      t.near(M.toBase(16, "LB").baseQty, 256, "unit lookup is case-insensitive");
      t.eq(M.toBase(5, "acr"), null, "unknown unit -> null");
      t.eq(M.toBase(5, ""), null, "empty unit -> null");
      t.eq(M.toBase(5, null), null, "null unit -> null");
    })();

    /* ---------- toBase: zero / negative / non-numeric sizes ---------- */
    (function () {
      t.eq(M.toBase(0, "oz"), null, "zero size -> null");
      t.eq(M.toBase(-2, "lb"), null, "negative size -> null");
      t.eq(M.toBase(NaN, "oz"), null, "NaN size -> null");
      t.eq(M.toBase(Infinity, "oz"), null, "Infinity size -> null");
      t.eq(M.toBase("12", "oz"), null, "string size (not a finite number) -> null");
    })();

    /* ---------- unitPrice: core math ---------- */
    (function () {
      var r = M.unitPrice(4, 2, "lb"); // $4 for 2 lb → $2.00 per lb, $0.125 per oz (base)
      t.near(r.per, 0.125, "$4 / 2 lb = $0.125 per oz (base unit)");
      t.near(r.per * 16, 2, "$4 / 2 lb = $2.00 per lb equivalent");
      t.eq(r.family, "weight", "unitPrice family for lb");
      t.near(M.unitPrice(5.99, 150, "sheets").per, 0.039933333, "$5.99 / 150 sheets");
      t.near(M.unitPrice(1.89, 25, "oz").per, 0.0756, "$1.89 / 25 oz");
    })();

    /* ---------- unitPrice: invalid inputs ---------- */
    (function () {
      t.eq(M.unitPrice(0, 10, "oz"), null, "zero price -> null");
      t.eq(M.unitPrice(-1, 10, "oz"), null, "negative price -> null");
      t.eq(M.unitPrice(5, 0, "oz"), null, "zero size -> null");
      t.eq(M.unitPrice(5, -1, "oz"), null, "negative size -> null");
      t.eq(M.unitPrice(NaN, 1, "oz"), null, "NaN price -> null");
      t.eq(M.unitPrice("5", 1, "oz"), null, "string price -> null");
      t.eq(M.unitPrice(5, 1, "nonsense"), null, "unknown unit -> null");
      t.eq(M.unitPrice(5, 1, ""), null, "empty unit -> null");
    })();

    /* ---------- ordering & best value ---------- */
    (function () {
      var items = [
        { id: "a", name: "Big bag", price: 12.49, size: 10, unit: "lb", shelf: "Bulk beans", store: "B", unitPrice: M.unitPrice(12.49, 10, "lb") },
        { id: "b", name: "Small bag", price: 6.98, size: 5, unit: "lb", shelf: "Bulk beans", store: "A", unitPrice: M.unitPrice(6.98, 5, "lb") },
        { id: "c", name: "Can", price: 1.89, size: 25, unit: "oz", shelf: "Bulk beans", store: "B", unitPrice: M.unitPrice(1.89, 25, "oz") },
      ];
      // $12.49/10 lb = $0.0780625/oz; $6.98/5 lb = $0.08735/oz;
      // $1.89/25 oz = $0.0756/oz — the can wins despite looking "small".
      var sorted = M.sortItems(items);
      t.eq(sorted.map(function (i) { return i.id; }), ["c", "a", "b"],
        "sort ascending by true unit price (oz per ounce ranks first)");
    })();

    (function () {
      var shelves = M.groupByShelf([
        { id: "a", name: "A", shelf: "Detergent", price: 15.47, size: 92, unit: "fl oz", unitPrice: M.unitPrice(15.47, 92, "fl oz") },
        { id: "b", name: "B", shelf: "Detergent", price: 19.99, size: 146, unit: "fl oz", unitPrice: M.unitPrice(19.99, 146, "fl oz") },
        { id: "c", name: "C", shelf: "Detergent", price: 8.99, size: 70, unit: "sheets", unitPrice: M.unitPrice(8.99, 70, "sheets") },
        { id: "d", name: "Broken", shelf: "Detergent", price: 0, size: 5, unit: "oz", unitPrice: null },
      ]);
      var group = shelves["Detergent"].volume;
      // 15.47/92 = 0.168 per fl oz vs 19.99/146 = 0.1369 per fl oz — bigger Kirkland jug wins.
      t.eq(group.best && group.best.id, "b", "best value is cheapest per unit in family");
      t.eq(group.items.length, 2, "volume group excludes other families and invalid rows");
      t.eq(shelves["Detergent"].sheet.items.length, 1, "sheet group isolated");
    })();

    /* ---------- tie-breaking on equal unit price ---------- */
    (function () {
      // True tie: $8/8 oz and $10/10 oz both cost $1 per oz; "Alpha" should win
      // the best-value badge via alphabetical tie-break.
      var tie = M.groupByShelf([
        { id: "x", name: "Beta", shelf: "S", price: 8, size: 8, unit: "oz", unitPrice: M.unitPrice(8, 8, "oz") },
        { id: "y", name: "Alpha", shelf: "S", price: 10, size: 10, unit: "oz", unitPrice: M.unitPrice(10, 10, "oz") },
      ]);
      t.eq(tie["S"].weight.best && tie["S"].weight.best.id, "y",
        "tie on unit price resolves alphabetically (Alpha first)");
    })();

    /* ---------- sortItems: stable & robust ---------- */
    (function () {
      var sorted = M.sortItems([
        { id: 1, name: "z", unitPrice: null },
        { id: 2, name: "a", unitPrice: null },
        { id: 3, name: "ok", unitPrice: M.unitPrice(2, 4, "oz") },
      ]);
      t.eq(sorted[0].id, 3, "invalid entries sink to end of sort");
      t.eq(M.sortItems([]).length, 0, "sortItems([]) -> []");
      t.eq(M.sortItems(null).length, 0, "sortItems(null) -> []");
    })();

    /* ---------- groupByShelf / totals with missing fields ---------- */
    (function () {
      t.ok(Object.keys(M.groupByShelf([])).length === 0, "groupByShelf([]) -> { }");
      var shelves = M.groupByShelf(null);
      t.ok(shelves && Object.keys(shelves).length === 0, "groupByShelf(null) -> { }");
    })();

    (function () {
      var totals = M.totalsByStoreShelf([
        { store: "A", shelf: "Beans", price: 6.98 },
        { store: "A", shelf: "Beans", price: 0.02 },
        { store: "B", shelf: "Beans", price: 12.49 },
        { store: "B", shelf: "Beans", price: -1 },    // ignored
        { store: "B", shelf: "Beans", price: 100 },   // valid
        { store: "B", shelf: "Beans", price: NaN },   // ignored
        { store: "C", shelf: "Beans", price: 0 },     // ignored (zero)
      ]);
      t.eq(totals.length, 2, "totals: two store/shelf groups");
      var arr = totals.filter(function (x) { return x.store === "A"; });
      t.near(arr[0] && arr[0].total, 7.0, "A total = 6.98 + 0.02 = 7.00");
      var b = totals.filter(function (x) { return x.store === "B"; });
      t.near(b[0] && b[0].total, 112.49, "B total ignores invalid rows");
      t.eq(M.totalsByStoreShelf([]).length, 0, "totals([]) -> []");
    })();

    /* ---------- totals key normalization: blank store/shelf ---------- */
    (function () {
      var totals = M.totalsByStoreShelf([
        { store: "", shelf: "Beans", price: 5 },
        { store: "Store", shelf: "", price: 5 },
      ]);
      t.eq(totals.length, 2, "blank store vs blank shelf stay distinct");
    })();

    /* ---------- formatters ---------- */
    (function () {
      t.eq(M.formatMoney(1234.5), "$1,234.50", "money format with thousands");
      t.eq(M.formatMoney(-3), "—", "money format rejects odd values");
      t.eq(M.formatUnitPrice(0.0083), "$0.0083", "tiny unit price shows 4 decimals");
      t.eq(M.formatUnitPrice(2), "$2.000", "unit price >= 1 shows 3 decimals");
      t.eq(M.formatUnitPrice(150), "$150.00", "large unit price shows 2 decimals");
      t.eq(M.formatSize(1.5), "1.5", "size display trims float noise");
      t.eq(M.formatSize(0.1 + 0.2), "0.3", "size display fixes 0.1+0.2 noise");
    })();

    /* ---------- conversion round-trip sanity (grams <-> oz <-> lb) ---------- */
    (function () {
      // 1 kg -> base oz -> back to grams should land on 1000 g.
      var grams = M.toBase(1, "kg").baseQty * M.GRAMS_PER_OZ;
      t.near(grams, 1000, "1 kg -> oz -> g round-trip = 1000 g");
      // 16 oz label vs 1 lb label describe the same base quantity.
      t.near(M.toBase(1, "lb").baseQty, M.toBase(16, "oz").baseQty, "1 lb == 16 oz");
      // Volume sanity: 2 cups == 1 pint == 16 fl oz.
      t.near(M.toBase(2, "cup").baseQty, M.toBase(1, "pint").baseQty, "2 cups == 1 pint");
      t.near(M.toBase(1, "quart").baseQty, M.toBase(4, "cup").baseQty, "1 quart == 4 cups");
    })();

    /* ---------- realistic cross-store scenario ---------- */
    (function () {
      // Bounty 6 big rolls: 98 sheets/roll * 6 = 588 sheets? Label sizes vary; use 150-sheet packs:
      var a = M.unitPrice(14.99, 588, "sheets"); // $0.0255/sheet
      var b = M.unitPrice(13.29, 588, "sheets");
      t.ok(a.per > b.per, "same size, cheaper shelf price wins");
      // Trick: bigger pack can cost more per sheet.
      var small = M.unitPrice(5, 100, "sheets");
      var big = M.unitPrice(12, 200, "sheets");
      t.eq(small.per, 0.05, "small pack per sheet");
      t.eq(big.per, 0.06, "big pack per sheet — bigger is not always cheaper");
      t.ok(small.per < big.per, "ranking catches the 'bulk trap'");
    })();

    return t.done();
  }

  return runTests;
});
