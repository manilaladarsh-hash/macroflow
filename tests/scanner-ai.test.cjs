const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

// Shaped like a USDA FoodData Central search hit for a branded food (nutrients per 100 g).
const cheerios = {
    fdcId: 2517161, description: 'CHEERIOS CEREAL', gtinUpc: '00016000275287', brandOwner: 'GENERAL MILLS',
    servingSize: 28, servingSizeUnit: 'GRM', householdServingFullText: '1 cup',
    foodNutrients: [{ nutrientId: 1008, value: 357 }, { nutrientId: 1003, value: 10.7 }, { nutrientId: 1005, value: 75 }, { nutrientId: 1004, value: 7.1 }, { nutrientId: 1093, value: 500 }]
};

test('USDA queries every GTIN spelling it may store', () => {
    const a = app();
    assert.deepEqual(plain(a.run("usdaGtinSpellings('016000275287')")), ['16000275287', '016000275287', '0016000275287', '00016000275287']);
    assert.deepEqual(plain(a.run("usdaGtinSpellings('4006381333931')")), ['4006381333931', '04006381333931']);
});

test('a barcode Open Food Facts lacks is found in USDA Branded Foods by exact GTIN', async () => {
    const a = app();
    const urls = [];
    a.context.fetchImpl = async url => {
        urls.push(url);
        if (url.includes('openfoodfacts')) return response(404, { status: 0 });
        return response(200, { foods: [{ ...cheerios, gtinUpc: '00016000999999', description: 'OTHER CEREAL' }, cheerios] });
    };
    const r = plain(await a.run("lookupBarcode('016000275287', { fetchImpl })"));
    assert.equal(r.status, 'found');
    assert.equal(r.source, 'usda');
    assert.equal(r.food.name, 'Cheerios Cereal');
    assert.equal(r.food.brand, 'General Mills');
    assert.equal(r.food.barcode, '016000275287');
    assert.equal(r.food.calories, 100);          // 357 kcal/100 g × 28 g
    assert.equal(r.food.servingUnit, 'g');
    assert.equal(r.food.micros.sodium, 140);
    const usdaUrl = urls.find(u => u.includes('api.nal.usda.gov'));
    assert.match(usdaUrl, /dataType=Branded/);
    assert.match(usdaUrl, /api_key=DEMO_KEY/);
    assert.match(decodeURIComponent(usdaUrl), /query=16000275287 016000275287 0016000275287 00016000275287/);
    const options = plain(a.run(`buildPortionOptions(${JSON.stringify(r.food)})`));
    assert.equal(options[0].label, 'serving · 1 cup');

    // A saved personal key is used instead of the demo key.
    a.run("localStorage.setItem(USDA_KEY_STORAGE, 'my-key')");
    urls.length = 0;
    await a.run("lookupBarcode('016000275287', { fetchImpl })");
    assert.match(urls.find(u => u.includes('api.nal.usda.gov')), /api_key=my-key/);
});

test('USDA results for a different GTIN are never used', async () => {
    const a = app();
    a.context.fetchImpl = async url => url.includes('openfoodfacts')
        ? response(404, { status: 0 })
        : response(200, { foods: [{ ...cheerios, gtinUpc: '00016000275288' }] });
    const r = plain(await a.run("lookupBarcode('016000275287', { fetchImpl })"));
    assert.equal(r.status, 'not_found');
    assert.equal(r.usdaSkipped, false);
});

test('USDA fills in products Open Food Facts has without nutrition; a USDA outage still reports not found', async () => {
    const a = app();
    a.context.fetchImpl = async url => url.includes('openfoodfacts')
        ? response(200, { status: 1, product: { code: '016000275287', product_name: 'Cheerios', nutriments: {} } })
        : response(200, { foods: [cheerios] });
    assert.equal((await a.run("lookupBarcode('016000275287', { fetchImpl })")).source, 'usda');

    a.context.fetchImpl = async url => url.includes('openfoodfacts') ? response(404, { status: 0 }) : response(429, {});
    const r = plain(await a.run("lookupBarcode('016000275287', { fetchImpl })"));
    assert.equal(r.status, 'not_found');
    assert.equal(r.usdaSkipped, true);

    a.context.fetchImpl = async url => url.includes('openfoodfacts')
        ? response(200, { status: 1, product: { code: '016000275287', product_name: 'Cheerios', nutriments: {} } })
        : response(503, {});
    assert.equal((await a.run("lookupBarcode('016000275287', { fetchImpl })")).status, 'no_nutrition');
});

test('AI label readings are checked before they prefill Create food', () => {
    const a = app();
    const good = plain(a.run(`checkLabelReading({ readable: true, name: 'Granola Bar', brand: 'Acme', basis: 'serving', servingSize: 40, servingUnit: 'g', servingLabel: '1 bar (40g)', calories: 190, protein: 4, carbs: 27, fats: 7.5, sodiumMg: 95, potassiumMg: null, calciumMg: null, ironMg: 1.1, vitaminDMcg: null })`));
    assert.deepEqual(good.warnings, []);
    assert.deepEqual(good.prefill, { name: 'Granola Bar', brand: 'Acme', servingSize: 40, servingUnit: 'g', servingLabel: '1 bar (40g)', calories: 190, protein: 4, carbs: 27, fats: 7.5, micros: { sodium: 95, iron: 1.1 } });

    const per100ml = plain(a.run(`checkLabelReading({ readable: true, basis: '100ml', servingSize: 100, servingUnit: 'g', calories: 42, protein: 0, carbs: 10.6, fats: 0 })`));
    assert.equal(per100ml.prefill.servingUnit, 'ml');

    const mismatch = plain(a.run(`checkLabelReading({ readable: true, basis: 'serving', servingSize: 40, servingUnit: 'g', calories: 90, protein: 4, carbs: 27, fats: 7.5 })`));
    assert.match(mismatch.warnings[0], /doesn't match/);

    const tooDense = plain(a.run(`checkLabelReading({ readable: true, basis: 'serving', servingSize: 10, servingUnit: 'g', calories: 190, protein: 4, carbs: 27, fats: 7.5 })`));
    assert.equal(tooDense.warnings.length, 2); // macros and kcal both exceed what 10 g can hold

    assert.throws(() => a.run(`checkLabelReading({ readable: false, calories: 0, protein: 0, carbs: 0, fats: 0 })`), /Couldn't read a nutrition label/);
    assert.match(plain(a.run(`checkLabelReading({ readable: true, basis: 'serving', servingSize: 330, servingUnit: 'ml', calories: 0, protein: 0, carbs: 0, fats: 0 })`)).warnings[0], /0 kcal/);
});

test('the label reading prefills the Create food form and keeps the household serving', () => {
    const a = app();
    a.run(`openCustomFoodModal({ name: 'Granola Bar', brand: 'Acme', barcode: '4006381333931', servingSize: 40, servingUnit: 'g', servingLabel: '1 bar (40g)', calories: 190, protein: 4, carbs: 27, fats: 7.5, micros: { sodium: 95 }, aiWarnings: [] })`);
    const value = id => a.document.getElementById(id).value;
    assert.equal(value('custom-food-size'), '40');
    assert.equal(value('custom-food-calories'), '190');
    assert.equal(value('custom-food-fats'), '7.5');
    assert.equal(value('custom-micro-sodium'), '95');
    assert.match(a.document.getElementById('custom-food-note').innerHTML, /Read from your photo by AI/);
    a.run('saveCustomFood()');
    const saved = plain(a.run('appState.customPacks[0]'));
    assert.equal(saved.barcode, '4006381333931');
    assert.equal(saved.servingLabel, '1 bar (40g)');
    assert.equal(plain(a.run(`buildPortionOptions(appState.customPacks[0])`))[0].label, 'serving · 1 bar (40g)');
});

test('Gemini falls back to an older model when the newest is unavailable to the key', async () => {
    const a = app();
    a.run("localStorage.setItem(GEMINI_KEY_STORAGE, 'test-key')");
    const models = [];
    a.context.fetch = async url => {
        models.push(url.match(/models\/([^:]+)/)[1]);
        return models.length < 3
            ? response(404, { error: { message: 'models/x is not found for API version v1beta' } })
            : response(200, { candidates: [{ content: { parts: [{ text: '{"digits":"036000291452","readable":true}' }] } }] });
    };
    const r = plain(await a.run("queryGeminiBarcodeDigits({ base64: 'x', mimeType: 'image/jpeg' })"));
    assert.deepEqual(models, ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-flash']);
    assert.deepEqual(r, { digits: '036000291452', readable: true });
    await a.run("queryGeminiBarcodeDigits({ base64: 'x', mimeType: 'image/jpeg' })");
    assert.equal(models.at(-1), 'gemini-2.5-flash'); // remembered for the session
});

test('batch scanning ignores the product just handled, then accepts it again', () => {
    const a = app();
    a.run("var handled = []; onBarcodeScanSuccess = code => handled.push(code); scanner.reads = [];");
    a.run("scanner.ignoreCode = '036000291452'; scanner.ignoreUntil = Date.now() + 3000;");
    assert.equal(a.run("registerScanRead('036000291452', 'upc_a')"), false);
    assert.equal(a.run("registerScanRead('036000291452', 'upc_a')"), false);
    assert.equal(a.run("registerScanRead('4006381333931', 'ean_13') || registerScanRead('4006381333931', 'ean_13')"), true);
    a.run("scanner.ignoreUntil = Date.now() - 1; scanner.reads = [];");
    assert.equal(a.run("registerScanRead('036000291452', 'upc_a') || registerScanRead('036000291452', 'upc_a')"), true);
    assert.deepEqual(plain(a.run('handled')), ['4006381333931', '036000291452']);
});

test('batch Add logs one default serving and keeps counting', () => {
    const a = app();
    a.run("resumeScanning = () => {}; currentSearchMealSlot = 'lunch'; scanner.batch = true; scanner.batchCount = 0;");
    a.run(`showBatchCard(${JSON.stringify({ name: 'Nutella', calories: 539, protein: 6.3, carbs: 57.5, fats: 30.9, servingSize: 100, servingUnit: 'g', servingQuantity: 15, barcode: '3017620422003', type: 'Open Food Facts' })}, '3017620422003')`);
    assert.match(a.document.getElementById('scanner-result').innerHTML, /Nutella[\s\S]*81 kcal/);
    a.run('addBatchItem()');
    const lunch = plain(a.run('appState.dailyLogs[appState.currentDate].meals.lunch'));
    assert.deepEqual(lunch.map(f => [f.name, f.calories]), [['Nutella', 81]]);
    assert.equal(a.run('scanner.batchCount'), 1);
    assert.equal(a.run('scanner.ignoreCode'), '3017620422003');
    assert.equal(a.document.getElementById('scanner-title').innerText, '1 added');
    assert.ok(a.run("appState.barcodeCache['3017620422003']"));
});

test('on iPhone the multi-lens back camera is preferred for close-up focus', () => {
    const a = app();
    const pick = labels => a.run(`pickIosCloseUpCamera(${JSON.stringify(labels.map((label, i) => ({ deviceId: `d${i}`, label })))})?.label ?? null`);
    assert.equal(pick(['Front Camera', 'Back Camera', 'Back Dual Wide Camera', 'Back Triple Camera', 'Back Ultra Wide Camera']), 'Back Triple Camera');
    assert.equal(pick(['Front Camera', 'Back Camera', 'Back Dual Wide Camera']), 'Back Dual Wide Camera');
    assert.equal(pick(['Front Camera', 'Back Camera']), null);
});
