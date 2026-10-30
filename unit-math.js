/*
 * unit-math.js — pure unit-conversion and price-per-unit math.
 * Zero dependencies. Usable from the browser (file:// friendly) and Node
 * (used by the test suite). No DOM access, no I/O.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.UnitMath = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Base quantities: weight -> ounces, volume -> US fluid ounces,
  // sheets -> 1 sheet, count -> 1 item.
  var GRAMS_PER_OZ = 28.349523125;
  var ML_PER_FL_OZ = 29.5735295625;

  var UNITS = {
    oz: { family: "weight", base: 1, label: "per oz" },
    lb: { family: "weight", base: 16, label: "per oz" },
    g: { family: "weight", base: 1 / GRAMS_PER_OZ, label: "per oz" },
    kg: { family: "weight", base: 1000 / GRAMS_PER_OZ, label: "per oz" },
    "fl oz": { family: "volume", base: 1, label: "per fl oz" },
    mL: { family: "volume", base: 1 / ML_PER_FL_OZ, label: "per fl oz" },
    L: { family: "volume", base: 1000 / ML_PER_FL_OZ, label: "per fl oz" },
    cup: { family: "volume", base: 8, label: "per fl oz" },
    pint: { family: "volume", base: 16, label: "per fl oz" },
    quart: { family: "volume", base: 32, label: "per fl oz" },
    gal: { family: "volume", base: 128, label: "per fl oz" },
    sheets: { family: "sheet", base: 1, label: "per sheet" },
    count: { family: "count", base: 1, label: "per item" },
    dozen: { family: "count", base: 12, label: "per item" },
  };

  // Case-insensitive lookup: "mL"/"L" keys are matched via a lowercased alias map.
  var UNIT_ALIASES = {
    "oz": "oz", "ounce": "oz", "ounces": "oz",
    "lb": "lb", "lbs": "lb", "pound": "lb", "pounds": "lb",
    "g": "g", "gram": "g", "grams": "g",
    "kg": "kg", "kilo": "kg", "kilogram": "kg", "kilograms": "kg",
    "fl oz": "fl oz", "fl. oz": "fl oz", "fluid ounce": "fl oz", "fluid ounces": "fl oz",
    "ml": "mL", "milliliter": "mL", "milliliters": "mL",
    "millilitre": "mL", "millilitres": "mL",
    "l": "L", "liter": "L", "liters": "L", "litre": "L", "litres": "L",
    "cup": "cup", "cups": "cup",
    "pt": "pint", "pint": "pint", "pints": "pint",
    "qt": "quart", "quart": "quart", "quarts": "quart",
    "gal": "gal", "gallon": "gal", "gallons": "gal",
    "sheet": "sheets", "sheets": "sheets",
    "count": "count", "item": "count", "items": "count", "ct": "count", "ea": "count",
    "dozen": "dozen", "dz": "dozen",
  };

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function lookupUnit(unit) {
    var raw = String(unit == null ? "" : unit).trim().toLowerCase();
    var key = UNIT_ALIASES[raw] || UNIT_ALIASES[raw.replace(/\.$/, "")];
    return key ? UNITS[key] : null;
  }

  /**
   * Convert a package size in the given unit to the base quantity for its
   * unit family (ounces for weight, fluid ounces for volume, 1 sheet,
   * 1 item). Returns null for unknown units or non-positive sizes.
   */
  function toBase(size, unit) {
    var def = lookupUnit(unit);
    if (!def || !isFiniteNumber(size) || size <= 0) return null;
    return { family: def.family, baseQty: size * def.base, label: def.label };
  }

  /** Canonical unit key for storage/display ("mL", "lb", "dozen", …) or null. */
  function normalizeUnit(unit) {
    var alias = UNIT_ALIASES[String(unit == null ? "" : unit).trim().toLowerCase()];
    return alias && UNITS[alias] ? alias : null;
  }

  /**
   * True price per base unit. Returns { family, price, per } or null when
   * the price/size is missing, zero, negative, or not a number.
   */
  function unitPrice(price, size, unit) {
    var base = toBase(size, unit);
    if (!base || !isFiniteNumber(price) || price <= 0) return null;
    return {
      family: base.family,
      label: base.label,
      per: price / base.baseQty,
    };
  }

  /** Sort items ascending by true unit price; invalid entries sink to the end. */
  function sortItems(items) {
    var list = (items || []).slice();
    list.sort(function (a, b) {
      var ua = a && a.unitPrice ? a.unitPrice.per : null;
      var ub = b && b.unitPrice ? b.unitPrice.per : null;
      if (ua == null && ub == null) return 0;
      if (ua == null) return 1;
      if (ub == null) return -1;
      if (ua !== ub) return ua - ub;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    return list;
  }

  /** Group items into shelves keyed by (family) with a best-value winner. */
  function groupByShelf(items) {
    var shelves = {}; // shelf -> family -> {items, best}
    (items || []).forEach(function (it) {
      if (!it || !it.unitPrice) return;
      var s = (shelves[it.shelf] = shelves[it.shelf] || {});
      var f = (s[it.unitPrice.family] = s[it.unitPrice.family] || {
        items: [],
        best: null,
      });
      f.items.push(it);
      if (
        !f.best ||
        it.unitPrice.per < f.best.unitPrice.per - 1e-12 ||
        (Math.abs(it.unitPrice.per - f.best.unitPrice.per) < 1e-12 &&
          String(it.name || "").localeCompare(String(f.best.name || "")) < 0)
      ) {
        f.best = it;
      }
    });
    return shelves;
  }

  /** Sum of valid shelf prices grouped by "store ∥ shelf". */
  function totalsByStoreShelf(items) {
    var totals = {};
    (items || []).forEach(function (it) {
      if (!it || !isFiniteNumber(it.price) || it.price <= 0) return;
      var key = String(it.store || "") + " ∥ " + String(it.shelf || "");
      totals[key] = totals[key] || {
        store: it.store || "",
        shelf: it.shelf || "",
        total: 0,
        count: 0,
      };
      totals[key].total += it.price;
      totals[key].count += 1;
    });
    return Object.keys(totals)
      .sort(function (a, b) {
        return a.localeCompare(b);
      })
      .map(function (k) {
        return totals[k];
      });
  }

  function formatMoney(n) {
    // Negative money is meaningless for shelf prices/totals — treat as invalid.
    if (!isFiniteNumber(n) || n < 0) return "—";
    return (
      "$" +
      n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  /** Unit-price display: enough precision for cheap items (e.g. $0.0083/sheet). */
  function formatUnitPrice(n) {
    if (!isFiniteNumber(n)) return "—";
    if (n >= 100) return "$" + n.toFixed(2);
    if (n >= 1) return "$" + n.toFixed(3);
    return "$" + n.toFixed(4);
  }

  /** Round a raw numeric size input for display (keeps 0.5 etc.). */
  function formatSize(n) {
    if (!isFiniteNumber(n)) return "—";
    var rounded = Math.round(n * 1000) / 1000;
    return String(rounded);
  }

  return {
    UNITS: UNITS,
    GRAMS_PER_OZ: GRAMS_PER_OZ,
    ML_PER_FL_OZ: ML_PER_FL_OZ,
    toBase: toBase,
    normalizeUnit: normalizeUnit,
    unitPrice: unitPrice,
    sortItems: sortItems,
    groupByShelf: groupByShelf,
    totalsByStoreShelf: totalsByStoreShelf,
    formatMoney: formatMoney,
    formatUnitPrice: formatUnitPrice,
    formatSize: formatSize,
  };
});
