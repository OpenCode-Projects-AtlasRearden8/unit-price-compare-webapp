/*
 * app.js — Unit Price Compare UI. Zero dependencies, file:// friendly.
 * All data is stored locally in localStorage (with an in-memory fallback
 * if storage is unavailable, e.g. private mode or storage quota).
 */
(function () {
  "use strict";

  var M = window.UnitMath;
  var STORAGE_KEY = "unit-price-compare.v1";
  var familyLabels = {
    weight: "Weight (cheapest per oz)",
    volume: "Volume (cheapest per fl oz)",
    sheet: "Sheets",
    count: "Count (cheapest per item)",
  };

  var state = { items: [], note: "" };
  var memoryOnly = false;

  /* ---------- storage ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      // Re-derive unit prices from stored fields (schema survives code changes).
      state.items = (Array.isArray(parsed.items) ? parsed.items : [])
        .map(function (it) {
          var item = {
            id: String(it.id || Date.now() + Math.random()),
            store: sanitizeText(it.store),
            shelf: sanitizeText(it.shelf),
            name: sanitizeText(it.name),
            price: numberOrNull(it.price),
            size: numberOrNull(it.size),
            unit: normalizeUnit(it.unit),
          };
          item.unitPrice = M.unitPrice(item.price, item.size, item.unit);
          return item;
        })
        .filter(function (it) {
          return it.name != null && it.price != null && it.size != null && it.unitPrice;
        });
      state.note = typeof parsed.note === "string" ? parsed.note : "";
    } catch (e) {
      markStorage("Could not read saved data (it may be corrupted); starting fresh.", true);
    }
  }

  function save() {
    if (memoryOnly) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ items: state.items, note: state.note })
      );
    } catch (e) {
      markStorage("Saving failed — your edits will be lost when you close the page.", true);
    }
  }

  function markStorage(message, warn) {
    var el = document.getElementById("storage-status");
    el.textContent = message;
    el.hidden = false;
    el.classList.toggle("warn", !!warn);
  }

  /* ---------- helpers ---------- */

  function sanitizeText(v) {
    if (v == null) return null;
    var s = String(v).replace(/[<>]/g, "").trim();
    return s === "" ? null : s;
  }

  function numberOrNull(v) {
    if (v === "" || v == null) return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function normalizeUnit(v) {
    return M.normalizeUnit(v);
  }

  function escapeHtml(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- rendering ---------- */

  function render() {
    renderRankings();
    renderTotals();
  }

  function renderRankings() {
    var host = document.getElementById("rankings");
    // Decorate items with computed unit price.
    var decorated = state.items.map(function (it) {
      return Object.assign({}, it, {
        unitPrice: M.unitPrice(it.price, it.size, it.unit),
      });
    });
    var valid = decorated.filter(function (it) { return it.unitPrice; });
    var invalid = decorated.filter(function (it) { return !it.unitPrice; });
    invalid.forEach(function (it) {
      markStorage(
        "Skipped an item with invalid price/size/unit: " + (it.name || "(unnamed)"),
        true
      );
    });
    var shelves = M.groupByShelf(valid);
    var shelfNames = Object.keys(shelves).sort(function (a, b) {
      return a.localeCompare(b);
    });

    if (!shelfNames.length) {
      host.innerHTML =
        '<p class="empty">No items yet. Add your first item above, or load the example data.</p>';
      return;
    }

    var html = "";
    shelfNames.forEach(function (shelf) {
      html += '<h3 class="shelf-title">' + escapeHtml(shelf) + "</h3>";
      var families = Object.keys(shelves[shelf]).sort(function (a, b) {
        return familyLabels[a] ? familyLabels[a].localeCompare(familyLabels[b]) : 0;
      });
      families.forEach(function (family) {
        var group = shelves[shelf][family];
        if (!group.items.length) return;
        html += '<p class="family-title">' + escapeHtml(familyLabels[family] || family) + "</p>";
        html +=
          '<div class="table-wrap"><table><thead><tr>' +
          "<th>Item</th><th>Store</th><th class=\"num\">Price</th><th class=\"num\">Size</th><th class=\"num\">True unit price</th><th></th>" +
          "</tr></thead><tbody>";
        M.sortItems(group.items).forEach(function (it) {
          var isBest = group.best && it.id === group.best.id;
          html +=
            "<tr" + (isBest ? ' class="best"' : "") + ">" +
            "<td>" + escapeHtml(it.name) +
            (isBest ? ' <span class="badge">best value</span>' : "") +
            "</td>" +
            "<td>" + escapeHtml(it.store || "—") + "</td>" +
            '<td class="num">' + M.formatMoney(it.price) + "</td>" +
            '<td class="num">' + M.formatSize(it.size) + " " + escapeHtml(it.unit) + "</td>" +
            '<td class="num"><strong>' + M.formatUnitPrice(it.unitPrice.per) +
            "</strong> " + escapeHtml(it.unitPrice.label) + "</td>" +
            '<td><button type="button" class="row-actions" data-del="' + escapeHtml(it.id) +
            '">✕ delete</button></td>' +
            "</tr>";
        });
        html += "</tbody></table></div>";
      });
    });
    host.innerHTML = html;

    host.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.items = state.items.filter(function (it) { return it.id !== btn.dataset.del; });
        save();
        render();
      });
    });
  }

  function renderTotals() {
    var totals = M.totalsByStoreShelf(state.items);
    var host = document.getElementById("totals");
    if (!totals.length) {
      host.innerHTML =
        '<p class="empty">No totals yet — totals appear once items have valid prices.</p>';
      return;
    }
    var html =
      '<div class="table-wrap"><table><thead><tr>' +
      "<th>Store</th><th>Shelf</th><th class=\"num\">Items</th><th class=\"num\">Total</th>" +
      "</tr></thead><tbody>";
    totals.forEach(function (t) {
      html +=
        "<tr><td>" + escapeHtml(t.store || "—") + "</td><td>" +
        escapeHtml(t.shelf || "—") + "</td>" +
        '<td class="num">' + t.count + "</td>" +
        '<td class="num"><strong>' + M.formatMoney(t.total) + "</strong></td></tr>";
    });
    html += "</tbody></table></div>";
    host.innerHTML = html;
  }

  function renderNote() {
    document.getElementById("note").value = state.note;
  }

  /* ---------- events ---------- */

  function onAddItem(e) {
    e.preventDefault();
    var form = e.target;
    var item = {
      id: uid(),
      store: sanitizeText(form.store.value),
      shelf: sanitizeText(form.shelf.value),
      name: sanitizeText(form.name.value),
      price: numberOrNull(form.price.value),
      size: numberOrNull(form.size.value),
      unit: normalizeUnit(form.unit.value),
    };
    if (!M.unitPrice(item.price, item.size, item.unit)) return; // native form validation covers most
    state.items.push(item);
    save();
    render();
    form.reset();
    form.unit.value = "oz";
    form.store.focus();
  }

  function onSaveNote() {
    state.note = document.getElementById("note").value;
    save();
    var status = document.getElementById("note-status");
    if (!memoryOnly) {
      status.textContent = "Note saved locally (" + new Date().toLocaleString() + ").";
    } else {
      status.textContent = "Storage unavailable in this browser — note shown for this session only.";
    }
  }

  function onExport() {
    var blob = new Blob([JSON.stringify({ items: state.items, note: state.note }, null, 2)], {
      type: "application/json",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "unit-price-compare-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  function onImportFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
          throw new Error("not a Unit Price Compare backup");
        }
        // Validate via the same path as load().
        var tmp = document.createElement("form"); // reuse sanitize/number helpers directly
        var incoming = parsed.items.map(function (it) {
          var item = {
            id: String(it.id || uid()),
            store: sanitizeText(it.store),
            shelf: sanitizeText(it.shelf),
            name: sanitizeText(it.name),
            price: numberOrNull(it.price),
            size: numberOrNull(it.size),
            unit: normalizeUnit(it.unit),
          };
          item.unitPrice = M.unitPrice(item.price, item.size, item.unit);
          return item;
        }).filter(function (it) {
          return it.name != null && it.price != null && it.size != null && it.unitPrice;
        });
        state.items = incoming.concat(state.items);
        if (typeof parsed.note === "string") {
          state.note = parsed.note;
          renderNote();
        }
        save();
        render();
        document.getElementById("note-status").textContent = "Imported " + incoming.length + " item(s).";
      } catch (err) {
        document.getElementById("note-status").textContent =
          "Import failed: " + err.message + ".";
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function onClear() {
    if (!confirm("Delete all items and the saved note? This cannot be undone.")) return;
    state.items = [];
    state.note = "";
    save();
    render();
    renderNote();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  function onDemo() {
    var demo = [
      { store: "Store A", shelf: "Paper towels", name: "Bounty Select-A-Size 6 big rolls", price: 14.99, size: 98, unit: "sheets" },
      { store: "Store A", shelf: "Paper towels", name: "Great Value Sparkle Pick-A-Size", price: 8.49, size: 70, unit: "sheets" },
      { store: "Store B", shelf: "Paper towels", name: "Bounty Select-A-Size 6 big rolls", price: 13.29, size: 98, unit: "sheets" },
      { store: "Store A", shelf: "Detergent", name: "Tide Free & Clear 92 fl oz", price: 15.47, size: 92, unit: "fl oz" },
      { store: "Store B", shelf: "Detergent", name: "Kirkland Signature Ultra Clean 146 fl oz", price: 19.99, size: 146, unit: "fl oz" },
      { store: "Store A", shelf: "Bulk beans", name: "Black beans 5 lb bag", price: 6.98, size: 5, unit: "lb" },
      { store: "Store B", shelf: "Bulk beans", name: "Pinto beans 10 lb bag", price: 12.49, size: 10, unit: "lb" },
      { store: "Store B", shelf: "Bulk beans", name: "Black beans 25 oz can", price: 1.89, size: 25, unit: "oz" },
    ];
    demo.forEach(function (d) {
      var item = Object.assign({ id: uid() }, d);
      item.unitPrice = M.unitPrice(item.price, item.size, item.unit);
      state.items.push(item);
    });
    document.getElementById("note").value =
      document.getElementById("note").value ||
      "Demo data — replace with your own shelf prices.";
    state.note = document.getElementById("note").value;
    save();
    render();
  }

  function init() {
    // Storage availability check (some browsers block it for file://, private mode, etc.)
    try {
      var probeKey = STORAGE_KEY + ".probe";
      localStorage.setItem(probeKey, "1");
      localStorage.removeItem(probeKey);
    } catch (e) {
      memoryOnly = true;
      markStorage(
        "Local storage is unavailable here (private window / strict file:// settings). " +
          "Everything still works in this session, but nothing is remembered after you close the page. " +
          "Use Export/Import to move data between devices.",
        false
      );
    }
    load();
    renderNote();
    render();

    document.getElementById("item-form").addEventListener("submit", onAddItem);
    document.getElementById("save-note-btn").addEventListener("click", onSaveNote);
    document.getElementById("export-btn").addEventListener("click", onExport);
    document.getElementById("import-file").addEventListener("change", onImportFile);
    document.getElementById("clear-btn").addEventListener("click", onClear);
    document.getElementById("demo-btn").addEventListener("click", onDemo);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
