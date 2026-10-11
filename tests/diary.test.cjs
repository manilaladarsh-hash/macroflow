const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./harness.cjs');
const food = { id: 'custom_same', name: 'Rice', servingSize: 100, servingUnit: 'g', calories: 123, protein: 2.7, carbs: 28.1, fats: 0.3, micros: { iron: 1.25 } };
const plain = value => JSON.parse(JSON.stringify(value));

test('local calendar keys, navigation, streaks, and trends agree near UTC midnight', () => {
    const a = app();
    const expected = process.env.TZ === 'America/Toronto' ? '2026-10-04' : '2026-10-05';
    assert.equal(a.run('appState.currentDate'), expected);
    a.run(`logFood(${JSON.stringify(food)}, 'breakfast'); calculateStreak(); calculateCalorieTrendStats();`);
    assert.equal(a.document.getElementById('streak-count').innerText, 1);
    assert.equal(a.document.getElementById('cal-trend-avg').innerText, 'Avg: 123 kcal / day');
    a.run('navigateDate(-1)');
    assert.equal(a.run('appState.currentDate'), expected === '2026-10-04' ? '2026-10-03' : '2026-10-04');
    a.run('copyYesterdayMeals()'); // Empty yesterday must not modify the original.
    assert.equal(a.run(`appState.dailyLogs['${expected}'].meals.breakfast.length`), 1);
});

test('calendar offsets include each day across both daylight saving transitions', () => {
    const a = app();
    for (const [date, previous] of [['2026-03-09', '2026-03-08'], ['2026-11-02', '2026-11-01'], ['2027-01-01', '2026-12-31']]) {
        assert.equal(a.run(`localDateKey(localDayOffset(-1, new Date('${date}T00:30:00')))`), previous);
    }
});

test('fractional portions scale all nutrients without accumulating rounding', () => {
    const a = app();
    const half = plain(a.run(`scaleFoodPortion(${JSON.stringify(food)}, 50)`));
    assert.equal(half.calories, 62); assert.equal(half.protein, 1.4);
    assert.equal(half.carbs, 14.1); assert.equal(half.fats, 0.2); assert.equal(half.micros.iron, 0.625);
    const restored = plain(a.run(`scaleFoodPortion(${JSON.stringify(half)}, 100)`));
    for (const key of ['calories', 'protein', 'carbs', 'fats']) assert.equal(restored[key], food[key]);
    assert.deepEqual(restored.micros, food.micros);
    assert.equal(a.run(`normalizeNutritionObject({...${JSON.stringify(food)}, servingSize: 0.5}).servingSize`), 0.5);
    for (const amount of ['0', '-1', 'NaN', 'Infinity', 'Number.MAX_VALUE']) {
        assert.throws(() => a.run(`scaleFoodPortion(${JSON.stringify(food)}, ${amount})`));
    }
});

test('preview is reversible; save updates only the selected entry and persists it', () => {
    const a = app();
    a.run(`logFood(${JSON.stringify(food)}, 'breakfast'); logFood(${JSON.stringify(food)}, 'breakfast');`);
    assert.equal(a.run('new Set(appState.dailyLogs[appState.currentDate].meals.breakfast.map(f => f.id)).size'), 2);
    const row = a.document.getElementById('logged-list-breakfast').children.at(-2);
    row.querySelector('.diary-details').onclick();
    a.document.getElementById('label-portion-amount').value = '50';
    a.run('previewDiaryPortion()');
    assert.equal(a.document.getElementById('label-calories').innerText, 62);
    assert.equal(a.run('appState.dailyLogs[appState.currentDate].meals.breakfast[0].calories'), 123);
    a.run('closeNutritionFactsModal()');
    assert.equal(a.run('appState.dailyLogs[appState.currentDate].meals.breakfast[0].calories'), 123);
    row.querySelector('.diary-details').onclick();
    a.document.getElementById('label-portion-amount').value = '0';
    a.run('previewDiaryPortion(); saveDiaryPortion()');
    assert.equal(a.document.getElementById('label-portion-save').disabled, true);
    assert.equal(a.run('appState.dailyLogs[appState.currentDate].meals.breakfast[0].calories'), 123);
    a.document.getElementById('label-portion-amount').value = '150';
    a.run('previewDiaryPortion(); saveDiaryPortion()');
    const entries = plain(a.run('appState.dailyLogs[appState.currentDate].meals.breakfast'));
    assert.deepEqual(entries.map(x => x.calories), [185, 123]);
    assert.equal(String(a.document.getElementById('calorie-big-number').innerText), '308');
    assert.equal(JSON.parse(a.storage.get('macroflow_v2_state')).dailyLogs[a.run('appState.currentDate')].meals.breakfast[0].servingSize, 150);
    a.run(`removeFood('${entries[0].id}', 'breakfast')`);
    assert.equal(a.run('appState.dailyLogs[appState.currentDate].meals.breakfast.length'), 1);
});

test('legacy duplicate IDs are repaired and copied meals get independent IDs', () => {
    const a = app();
    a.run(`appState.dailyLogs['2026-10-03'] = { meals: { breakfast: [${JSON.stringify(food)}, ${JSON.stringify(food)}], lunch: [], dinner: [], snacks: [] }, water: 0 }; ensureUniqueDiaryEntryIds();`);
    assert.equal(a.run("new Set(appState.dailyLogs['2026-10-03'].meals.breakfast.map(f => f.id)).size"), 2);
    a.run("appState.currentDate = '2026-10-04'; copyYesterdayMeals();");
    assert.equal(a.run("appState.dailyLogs['2026-10-04'].meals.breakfast.length"), 2);
    assert.equal(a.run("new Set(Object.values(appState.dailyLogs).flatMap(d => d.meals.breakfast.map(f => f.id))).size"), 4);
});

test('reload opens local today and preserves saved historical records', () => {
    const a = app();
    a.run(`appState.currentDate = '2026-01-01'; logFood(${JSON.stringify(food)}, 'breakfast'); window.onload();`);
    assert.equal(a.run('appState.currentDate'), process.env.TZ === 'America/Toronto' ? '2026-10-04' : '2026-10-05');
    assert.equal(a.run("appState.dailyLogs['2026-01-01'].meals.breakfast[0].calories"), 123);
});

test('configuration ships without a key and displayed names are escaped', () => {
    const a = app();
    assert.equal(a.run(`escapeHTML('<img src=x> "&')`), '&lt;img src=x&gt; &quot;&amp;');
    const config = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
    assert.match(config, /geminiApiKey:\s*''/);
    assert.doesNotMatch(config, /AIza[\w-]{30,}/);
});
