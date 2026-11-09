const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./harness.cjs');

test('Rust WebAssembly core binary exists and passes internal Rust self-tests', async () => {
    const wasmPath = path.join(__dirname, '..', 'pkg', 'macroflow_core.wasm');
    assert.equal(fs.existsSync(wasmPath), true, 'pkg/macroflow_core.wasm should exist');
    const bytes = fs.readFileSync(wasmPath);
    const { instance } = await WebAssembly.instantiate(bytes, {});
    assert.equal(typeof instance.exports.wasm_run_self_tests, 'function');
    assert.equal(instance.exports.wasm_run_self_tests(), 1);
});

test('TypeScript bridge invokes Rust WebAssembly exports directly (UI shell, staples, barcode, search, rings, streak)', () => {
    const a = app();
    assert.equal(a.run('rustWasm.runSelfTests()'), true);
    assert.equal(a.run("rustWasm.gtinCheckDigit('301762042200')"), 3);
    assert.equal(a.run("rustWasm.formatBarcode('3017620422003')"), '3 017620 422003');
    assert.equal(a.run("rustWasm.titleCaseIfShouting('CHEERIOS CEREAL')"), 'Cheerios Cereal');
    const query = JSON.parse(JSON.stringify(a.run("rustWasm.normalizeSmartSearchQuery('pc popcoen')")));
    assert.equal(query.normalized, "President's Choice popcorn");
    assert.equal(query.inferredStore, 'loblaws');

    // UI shell & stylesheet rendered from Rust
    assert.match(a.document.getElementById('mf-style').textContent, /--kcal:\s*#34c759/);
    assert.match(a.document.getElementById('mf-root').innerHTML, /id="tab-content-nutrition"/);
    assert.match(a.document.getElementById('mf-root').innerHTML, /id="meal-breakfast"/);

    // Staple foods & micronutrient definitions loaded from Rust
    assert.equal(a.run('rustWasm.micronutrientDefinitions().length'), 26);
    assert.equal(a.run('rustWasm.initialStapleFoods().length'), 44);
    assert.equal(a.run('rustWasm.fullStapleFoods().length >= 120'), true);

    // Streak & ring metrics computed in Rust
    const streak = JSON.parse(JSON.stringify(a.run("rustWasm.calculateStreakMetrics(['2026-10-03', '2026-10-04', '2026-10-05'], '2026-10-05')")));
    assert.deepEqual(streak, { current: 3, best: 3 });
});
