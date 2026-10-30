#!/usr/bin/env node
/*
 * Node test runner for unit-math.js. Zero dependencies.
 * Usage: node tests/unit-math-tests.js
 */
var path = require("path");
var runTests = require(path.join(__dirname, "unit-math-tests.js"));
var UnitMath = require(path.join(__dirname, "..", "unit-math.js"));

var result = runTests(UnitMath);

if (result.failures.length === 0) {
  console.log("PASS — " + result.passes + " assertions");
  process.exit(0);
} else {
  console.error("FAIL — " + result.failures.length + " of " +
    (result.passes + result.failures.length) + " assertions failed:");
  result.failures.forEach(function (f) { console.error("  - " + f); });
  process.exit(1);
}
