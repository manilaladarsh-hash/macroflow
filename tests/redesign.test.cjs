const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const json = value => JSON.stringify(value);
const oats = { name: 'Rolled Oats (Dry)', calories: 379, protein: 13, carbs: 68, fats: 6.5, servingSize: 100, servingUnit: 'g', type: 'Grain' };
const eggs = { name: 'Eggs, 2 large', calories: 143, protein: 12.6, carbs: 0.7, fats: 9.5, servingSize: 100, servingUnit: 'g' };

test('rings fill to the target and draw a second lap past it', () => {
    const a = app();
    a.run(`appState.targets = { ...appState.targets, calories: 2000, protein: 100, carbs: 200, fats: 50 };
        logFood(${json({ ...oats, calories: 2500, protein: 50, carbs: 0, fats: 0 })}, 'lunch', { silent: true });`);
    const style = id => a.document.getElementById(id).style;
    const c = 2 * Math.PI * 87;
    assert.equal(Number(style('ring-kcal').strokeDashoffset), 0);                         // full turn
    assert.equal(Number(style('ring-kcal-lap').strokeDashoffset), Number((c * 0.75).toFixed(2))); // +25% lap
    assert.equal(style('ring-kcal-lap').opacity, '1');
    assert.equal(Number(style('ring-protein').strokeDashoffset), Number((2 * Math.PI * 65 * 0.5).toFixed(2)));
    assert.equal(style('ring-carbs').opacity, '0');                                         // nothing eaten: no dot
    assert.equal(a.document.getElementById('calorie-left-label').innerText, 'Over');
    assert.equal(a.document.getElementById('calorie-left-display').innerText, '500');
    a.run("toggleCalorieDisplayMode()");
    assert.equal(a.document.getElementById('calorie-big-unit').innerText, 'kcal over 2,000');
});

test('foods get an icon from their category or name', () => {
    const a = app();
    const icon = food => plain(a.run(`foodIcon(${json(food)})`));
    assert.deepEqual(icon(oats), ['fa-wheat-awn', 'grain']);
    assert.deepEqual(icon({ name: 'Greek yogurt, plain' }), ['fa-cheese', 'dairy']);
    assert.deepEqual(icon({ name: 'Peanut butter, creamy' }), ['fa-seedling', 'nuts']);
    assert.deepEqual(icon({ name: 'Nutella', type: 'Open Food Facts' }), ['fa-cookie', 'sweet']);
    assert.deepEqual(icon({ name: 'Chicken salad' }), ['fa-drumstick-bite', 'meat']);
    assert.deepEqual(icon({ name: 'Grilled salmon 150 g, rice', type: 'AI estimate' }), ['fa-wand-magic-sparkles', 'ai']);
    assert.deepEqual(icon({ name: 'Quick add', type: 'Quick Add' }), ['fa-bolt', 'quick']);
    assert.deepEqual(icon({ name: 'Mystery product', type: 'Open Food Facts' }), ['fa-basket-shopping', 'pack']);
});

test('quick log re-logs a recent food in one tap, with undo', () => {
    const a = app();
    a.run(`logFood(${json(oats)}, 'breakfast', { silent: true }); logFood(${json(eggs)}, 'breakfast', { silent: true });`);
    const items = plain(a.run('quickLogItems()'));
    assert.deepEqual(items.map(i => i.food.name).sort(), ['Eggs, 2 large', 'Rolled Oats (Dry)']); // the harness clock is frozen, so order ties
    assert.equal(a.document.getElementById('quick-log-section').classes.has('hidden'), false);
    a.run("quickLogMeal = 'snacks'; var entry = quickLogFood(appState.foodFrequency['rolled oats (dry)'].food);");
    assert.deepEqual(plain(a.run('appState.dailyLogs[appState.currentDate].meals.snacks')).map(f => f.calories), [379]);
    a.run("removeFood(entry.id, 'snacks')"); // what the toast's Undo does
    assert.equal(a.run('appState.dailyLogs[appState.currentDate].meals.snacks.length'), 0);
    a.run('cycleQuickLogMeal()');
    assert.equal(a.document.getElementById('quick-log-meal').innerText, 'Breakfast');
});

test('an empty meal offers to repeat yesterday\'s, and repeating can be undone', () => {
    const a = app();
    a.run(`const y = localDateKey(localDayOffset(-1, new Date(appState.currentDate + 'T12:00:00')));
        appState.dailyLogs[y] = { meals: { breakfast: [{ ...${json(oats)}, id: 'a' }, { ...${json(eggs)}, id: 'b' }], lunch: [], dinner: [], snacks: [] }, water: 0 };
        renderAll();`);
    assert.match(a.document.getElementById('suggestion-slot-breakfast').children[0].innerHTML, /Same as yesterday: <b>Rolled Oats \(Dry\), Eggs, 2 large<\/b>[\s\S]*\+ 522 kcal/);
    a.run(`var repeated = repeatMealFrom(localDateKey(localDayOffset(-1, new Date(appState.currentDate + 'T12:00:00'))), 'breakfast')`);
    assert.equal(a.run('appState.dailyLogs[appState.currentDate].meals.breakfast.length'), 2);
    assert.equal(a.run('new Set(appState.dailyLogs[appState.currentDate].meals.breakfast.map(e => e.id)).has("a")'), false);
    // Two items now: the "save as a meal" button appears in the header instead.
    assert.equal(a.document.getElementById('meal-save-breakfast').classes.has('hidden'), false);
});

test('the + sheet logs water and opens the chosen meal', () => {
    const a = app();
    a.run("var opened = null; openFoodSearchModal = meal => { opened = meal; }; openLogSheet(); setLogSheetMeal('dinner'); logSheetAction('search');");
    assert.equal(a.run('opened'), 'dinner');
    a.run("openLogSheet(); logSheetAction('water'); logSheetAction('water');");
    assert.equal(a.run('getDayLog().water'), 0.5);
    assert.equal(a.document.getElementById('water-glasses').innerHTML.match(/class="full"/g).length, 2);
});

test('weight trend smooths noise and accounts for gaps between weigh-ins', () => {
    const a = app();
    const t = plain(a.run(`weightTrend([{ date: '2026-10-01', value: 180 }, { date: '2026-10-02', value: 178 }, { date: '2026-10-12', value: 176 }])`));
    assert.equal(t[0], 180);
    assert.equal(t[1], 179.8);              // one day: 10% of the way
    assert.equal(t[2], Math.round((179.8 + (1 - Math.pow(0.9, 10)) * (176 - 179.8)) * 100) / 100); // ten days: 65%
});

test('daily calorie bars split by macro; calories without macros show as grey', () => {
    const a = app();
    const segs = plain(a.run(`macroSegments({ kcal: 500, protein: 25, carbs: 25, fats: 0 })`));
    assert.deepEqual(segs.map(s => Math.round(s.value)), [100, 100, 0, 300]);
    const scaled = plain(a.run(`macroSegments({ kcal: 300, protein: 50, carbs: 50, fats: 0 })`)); // labels can overstate macros
    assert.equal(Math.round(scaled.reduce((sum, s) => sum + s.value, 0)), 300);
    const svg = a.run(`barChartSvg({ width: 320, bars: [{ key: 'a', label: 'M', segments: [{ value: 1800, color: 'red' }] }, { key: 'b', label: 'T', segments: [{ value: 2300, color: 'red' }], selected: true }], goal: 2000, onTap: 'selectInsightsDay' })`);
    assert.match(svg, /^<svg viewBox="0 0 320 176"/);
    assert.match(svg, /Goal 2k/);
    assert.match(svg, /class="sel-label"[^>]*>2.3k</);
    assert.equal((svg.match(/onclick="selectInsightsDay\('(a|b)'\)"/g) || []).length, 2);
});

test('insights render KPIs and charts from the logged days', () => {
    const a = app();
    a.run(`appState.targets.calories = 2000; appState.targets.protein = 100;
        const y = localDateKey(localDayOffset(-1));
        logFood(${json({ ...oats, calories: 1900, protein: 120 })}, 'lunch', { silent: true });
        appState.dailyLogs[y] = { meals: { breakfast: [{ ...${json(oats)}, id: 'x', calories: 2500, protein: 60 }], lunch: [], dinner: [], snacks: [] }, water: 0 };
        appState.activity = { [y]: { caloriesOut: 2700, steps: 9000 } };
        appState.insightsRange = 7;
        renderInsightsCharts();`);
    const html = id => a.document.getElementById(id).innerHTML;
    assert.match(html('ins-cal-kpis'), /2,200<small>kcal<\/small>/);   // average of 1900 and 2500
    assert.match(html('ins-cal-chart'), /<svg/);
    assert.match(html('ins-bal-kpis'), /−200/);                          // yesterday: 2500 eaten, 2700 burned
    assert.match(html('ins-protein-kpis'), /90<small>g<\/small>/);
    assert.equal(a.document.getElementById('ins-steps-card').classes.has('hidden'), false);
    assert.match(html('ins-split-donut'), /<svg/);
});
