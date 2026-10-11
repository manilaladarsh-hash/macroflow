const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const nutella = {
    code: '3017620422003', product_name: 'Nutella', brands: 'Ferrero,Nutella', serving_size: '15 g', serving_quantity: 15,
    nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, sodium_100g: 0.0428, 'vitamin-c_100g': 0.006, 'vitamin-d_100g': 0.0000025 }
};
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test('GTIN check digits and UPC-E expansion', () => {
    const a = app();
    assert.equal(a.run("isValidGtin('3017620422003')"), true);
    assert.equal(a.run("isValidGtin('3017620422004')"), false);
    assert.equal(a.run("isValidGtin('036000291452')"), true);
    assert.equal(a.run("isValidGtin('96385074')"), true);
    assert.equal(a.run("isValidGtin('12345')"), false);
    assert.equal(a.run("expandUpcE('04252614')"), '042100005264');
    assert.equal(a.run("expandUpcE('04252615')"), null);
    assert.deepEqual(plain(a.run("barcodeCandidates('036000291452')")), ['036000291452', '0036000291452']);
    assert.deepEqual(plain(a.run("barcodeCandidates('0036000291452')")), ['0036000291452', '036000291452']);
    assert.deepEqual(plain(a.run("barcodeCandidates('04252614')")), ['042100005264', '0042100005264']);
    assert.equal(a.run("isAcceptableBarcode('3017620422003', 'ean_13')"), true);
    assert.equal(a.run("isAcceptableBarcode('3017620422004', 'ean_13')"), false);
    assert.equal(a.run("isAcceptableBarcode('04252614', 'upc_e')"), true);
});

test('a code must be read in two frames before it is accepted', () => {
    const a = app();
    a.run('globalThis.accepted = []; onBarcodeScanSuccess = code => accepted.push(code);');
    assert.equal(a.run("registerScanRead('3017620422004', 'ean_13')"), false);
    assert.equal(a.run("registerScanRead('3017620422004', 'ean_13')"), false, 'bad checksum is never accepted');
    assert.equal(a.run("registerScanRead('3017620422003', 'ean_13')"), false);
    assert.equal(a.run("registerScanRead('3017620422003', 'ean_13')"), true);
    assert.deepEqual(plain(a.run('accepted')), ['3017620422003']);
});

test('Open Food Facts products map to per-100 g foods with converted micronutrient units', () => {
    const a = app();
    const food = plain(a.run(`foodFromOpenFoodFactsProduct(${JSON.stringify(nutella)})`));
    assert.equal(food.name, 'Nutella');
    assert.equal(food.brand, 'Ferrero');
    assert.equal(food.calories, 539);
    assert.equal(food.servingSize, 100);
    assert.equal(food.servingQuantity, 15);
    assert.equal(food.micros.sodium, 42.8);   // 0.0428 g → mg
    assert.equal(food.micros.vitc, 6);        // 0.006 g → mg
    assert.equal(food.micros.vitd, 2.5);      // 0.0000025 g → mcg
    assert.equal(food.missingNutrition, false);
    const kj = plain(a.run(`foodFromOpenFoodFactsProduct({ code: '1', product_name: 'X', nutriments: { energy_100g: 2255 } })`));
    assert.equal(kj.calories, 539);
    const none = plain(a.run(`foodFromOpenFoodFactsProduct({ code: '1', product_name: 'X', nutriments: {} })`));
    assert.equal(none.missingNutrition, true);

    const options = plain(a.run(`buildPortionOptions(foodFromOpenFoodFactsProduct(${JSON.stringify(nutella)}))`));
    assert.deepEqual(options.map(o => [o.id, o.size, o.defaultAmount]), [['serving', 15, 1], ['unit', 1, 100]]);
    const serving = plain(a.run(`defaultPortionFood(foodFromOpenFoodFactsProduct(${JSON.stringify(nutella)}))`));
    assert.equal(serving.servingSize, 15);
    assert.equal(serving.calories, 81);
});

test('barcode lookup is exact: tries equivalent codes, never guesses', async () => {
    const a = app();
    const calls = [];
    a.context.fetchImpl = async url => {
        calls.push(url.match(/product\/(\d+)/)[1]);
        return calls.length === 1 ? response(404, { status: 0 }) : response(200, { status: 1, product: { ...nutella, code: '0036000291452' } });
    };
    const found = plain(await a.run("lookupBarcode('036000291452', { fetchImpl })"));
    assert.deepEqual(calls, ['036000291452', '0036000291452']);
    assert.equal(found.status, 'found');
    assert.equal(found.food.barcode, '0036000291452');

    a.context.fetchImpl = async () => response(404, { status: 0, status_verbose: 'product not found' });
    const missing = plain(await a.run("lookupBarcode('2000001234563', { fetchImpl })"));
    assert.equal(missing.status, 'not_found');
    assert.equal(missing.code, '2000001234563');

    a.context.fetchImpl = async () => { throw new TypeError('Failed to fetch'); };
    assert.equal((await a.run("lookupBarcode('2000001234563', { fetchImpl })")).status, 'error');
    a.run(`appState.barcodeCache = { '2000001234563': { name: 'Cached bar', calories: 100, servingSize: 100, servingUnit: 'g', type: 'Open Food Facts' } }`);
    const cached = plain(await a.run("lookupBarcode('2000001234563', { fetchImpl })"));
    assert.equal(cached.status, 'found');
    assert.equal(cached.fromCache, true);

    a.run(`appState.customPacks = [{ name: 'My bar', barcode: '2000001234563', calories: 210, servingSize: 1, servingUnit: 'serving' }]`);
    a.context.fetchImpl = async () => { throw new Error('should not be called'); };
    const custom = plain(await a.run("lookupBarcode('2000001234563', { fetchImpl })"));
    assert.equal(custom.status, 'found');
    assert.equal(custom.food.name, 'My bar');
});

test('logged barcode foods keep their barcode and scaled nutrition', () => {
    const a = app();
    a.run(`const f = defaultPortionFood(foodFromOpenFoodFactsProduct(${JSON.stringify(nutella)})); logFood(f, 'snacks');`);
    const entry = plain(a.run('appState.dailyLogs[appState.currentDate].meals.snacks[0]'));
    assert.equal(entry.barcode, '3017620422003');
    assert.equal(entry.servingSize, 15);
    assert.equal(entry.calories, 81);
    assert.equal(Math.round(entry.micros.sodium * 100) / 100, 6.42);
});
