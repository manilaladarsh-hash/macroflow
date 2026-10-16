const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const json = value => JSON.stringify(value);

// Samples shaped like real exports (Fitbit Takeout JSON, Google Fit daily CSV, a generic app CSV).
const fitbitSteps = json([
    { dateTime: '10/09/26 08:00:00', value: '1200' },
    { dateTime: '10/09/26 12:30:00', value: '3300' },
    { dateTime: '10/10/26 09:00:00', value: '7000' }
]);
const fitbitCalories = json([
    { dateTime: '10/09/26 00:00:00', value: '1100.5' },
    { dateTime: '10/09/26 12:00:00', value: '1300' }
]);
const fitbitWeight = json([{ logId: 1, weight: 172.4, bmi: 24.1, date: '10/09/26', time: '07:12:45', source: 'Aria' }]);
const googleFitCsv = [
    'Date,Move Minutes count,Calories (kcal),Distance (m),Heart Points,Heart Minutes,Step count,Average weight (kg),Max weight (kg),Min weight (kg)',
    '2026-10-08,45,2412.3,5432.1,20,15,8432,78.4,78.6,78.2',
    '2026-10-09,30,2201.0,4100.0,10,10,6100,,,'
].join('\n');
const genericCsv = 'date;active calories;steps\n2026-10-09;420;9000\n2026-10-10;310;7000\n';

test('dates from different exports become local day keys', () => {
    const a = app();
    assert.equal(a.run("parseHealthDate('10/09/26 08:00:00')"), '2026-10-09');
    assert.equal(a.run("parseHealthDate('2026-10-09')"), '2026-10-09');
    assert.equal(a.run("parseHealthDate('20261009')"), '2026-10-09');
    assert.equal(a.run("parseHealthDate('2026-10-09T23:30:00')"), '2026-10-09');
    assert.equal(a.run("parseHealthDate('09.10.2026')"), '2026-10-09');
    assert.equal(a.run("parseHealthDate('hello')"), null);
    assert.equal(a.run("parseHealthDate('')"), null);
});

test('Fitbit JSON exports: per-minute steps and calories are summed per day, weight is kept', () => {
    const a = app();
    const steps = plain(a.run(`parseHealthFile('steps-2026-10-01.json', ${json(fitbitSteps)})`));
    assert.deepEqual(steps.days, { '2026-10-09': { steps: 4500 }, '2026-10-10': { steps: 7000 } });
    const merged = plain(a.run(`mergeHealthResults([
        parseHealthFile('steps-2026-10-01.json', ${json(fitbitSteps)}),
        parseHealthFile('calories-2026-10-01.json', ${json(fitbitCalories)}),
        parseHealthFile('weight-2026-10-01.json', ${json(fitbitWeight)})
    ])`));
    assert.equal(merged.days['2026-10-09'].calories, 2400.5);
    assert.equal(merged.days['2026-10-09'].weight, 172.4);
    assert.equal(merged.caloriesKind, 'total');   // daily sums above 1200 kcal include resting energy
    assert.equal(merged.weightUnit, 'lbs');       // 172 is not a plausible kg reading
    assert.deepEqual(merged.counts, { steps: 2, calories: 1, weight: 1 });
    assert.equal(merged.from, '2026-10-09');
    assert.equal(merged.to, '2026-10-10');
});

test('Google Fit daily CSV: steps, total calories and average weight in kg', () => {
    const a = app();
    const r = plain(a.run(`mergeHealthResults([parseHealthFile('Daily activity metrics.csv', ${json(googleFitCsv)})])`));
    assert.deepEqual(r.days['2026-10-08'], { calories: 2412.3, steps: 8432, weight: 78.4 });
    assert.deepEqual(r.days['2026-10-09'], { calories: 2201, steps: 6100 });
    assert.equal(r.weightUnit, 'kg');
    assert.equal(r.caloriesKind, 'total');
});

test('generic CSV with semicolons and active calories', () => {
    const a = app();
    const r = plain(a.run(`mergeHealthResults([parseHealthFile('export.csv', ${json(genericCsv)})])`));
    assert.equal(r.caloriesKind, 'active');
    assert.deepEqual(r.days['2026-10-09'], { calories: 420, steps: 9000 });
    assert.equal(plain(a.run(`parseHealthFile('notes.csv', 'name,colour\\napple,red\\n')`)).rows, 0);
});

test('applying an import converts weight units and routes calories by meaning', () => {
    const a = app();
    a.run("appState.bodyProfile.unit = 'lbs'; appState.weightHistory = [];");
    a.run(`applyHealthImport(mergeHealthResults([parseHealthFile('Daily activity metrics.csv', ${json(googleFitCsv)})]))`);
    assert.equal(a.run("appState.activity['2026-10-08'].steps"), 8432);
    assert.equal(a.run("appState.activity['2026-10-08'].caloriesOut"), 2412);
    assert.deepEqual(plain(a.run('appState.weightHistory')), [{ date: '2026-10-08', value: 172.8, unit: 'lbs', source: 'import' }]);

    // Active calories become a single, replaceable exercise entry per day.
    a.run(`const r = mergeHealthResults([parseHealthFile('export.csv', ${json(genericCsv)})]); applyHealthImport(r); applyHealthImport(r);`);
    const exercise = plain(a.run("appState.dailyLogs['2026-10-09'].exercise"));
    assert.deepEqual(exercise.map(e => [e.calories, e.source]), [[420, 'import']]);
});

test('exercise raises the calorie goal only when the setting is on', () => {
    const a = app();
    a.run("appState.targets.calories = 2000; appState.dailyLogs[appState.currentDate] = { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, water: 0, exercise: [{ id: 'x', name: 'Running', calories: 350, minutes: 30, source: 'manual' }] };");
    assert.equal(a.run('dayGoal()'), 2000);
    a.run('appState.settings = { exerciseAddsToGoal: true }; renderAll();');
    assert.equal(a.run('dayGoal()'), 2350);
    assert.equal(a.document.getElementById('calorie-left-display').innerText, '2,350');
    assert.equal(a.run("estimateExerciseKcal('Running', 60) > 0"), true);
});

test('saved meals re-log every item as independent entries', () => {
    const a = app();
    const food = { name: 'Oats', calories: 150, protein: 5, carbs: 27, fats: 3, servingSize: 40, servingUnit: 'g' };
    a.run(`logFood(${json(food)}, 'breakfast'); logFood(${json({ ...food, name: 'Milk', calories: 120 })}, 'breakfast');`);
    a.run("openSaveMealModal('breakfast'); document.getElementById('save-meal-name').value = 'Usual breakfast'; confirmSaveMeal();");
    assert.equal(a.run('appState.savedMeals.length'), 1);
    assert.equal(a.run('appState.savedMeals[0].name'), 'Usual breakfast');
    a.run("logSavedMeal(appState.savedMeals[0].id, 'lunch')");
    const lunch = plain(a.run('appState.dailyLogs[appState.currentDate].meals.lunch'));
    assert.deepEqual(lunch.map(f => f.name), ['Oats', 'Milk']);
    const ids = plain(a.run('Object.values(appState.dailyLogs[appState.currentDate].meals).flat().map(f => f.id)'));
    assert.equal(new Set(ids).size, 4);
});

test('an entry can be moved to another meal from the editor', () => {
    const a = app();
    a.run(`logFood(${json({ name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, servingSize: 182, servingUnit: 'g' })}, 'breakfast')`);
    a.run("const e = appState.dailyLogs[appState.currentDate].meals.breakfast[0]; openNutritionLabel(e, { date: appState.currentDate, meal: 'breakfast', id: e.id }); setEntryMeal('snacks'); saveDiaryPortion();");
    assert.equal(a.run('appState.dailyLogs[appState.currentDate].meals.breakfast.length'), 0);
    assert.equal(a.run('appState.dailyLogs[appState.currentDate].meals.snacks[0].name'), 'Apple');
});

test('water is tracked per day and never goes negative', () => {
    const a = app();
    a.run('addWater(0.5); addWater(0.25); addWater(-1);');
    assert.equal(a.run('getDayLog().water'), 0);
    a.run('addWater(0.75)');
    assert.equal(a.run('getDayLog().water'), 0.75);
});

test('weekly report averages logged days only', () => {
    const a = app();
    a.run(`appState.targets.calories = 2000;
        const today = localDateKey();
        const y = localDateKey(localDayOffset(-1));
        appState.dailyLogs[today] = { meals: { breakfast: [{ id: 'a', name: 'x', calories: 1900, protein: 100, carbs: 0, fats: 0 }], lunch: [], dinner: [], snacks: [] }, water: 0 };
        appState.dailyLogs[y] = { meals: { breakfast: [{ id: 'b', name: 'y', calories: 2600, protein: 120, carbs: 0, fats: 0 }], lunch: [], dinner: [], snacks: [] }, water: 0 };
        appState.activity = { [today]: { steps: 8000, caloriesOut: 2400 }, [y]: { caloriesOut: 2900 } };`);
    const r = plain(a.run('weeklyReport()'));
    assert.equal(r.daysLogged, 2);
    assert.equal(r.avgCalories, 2250);
    assert.equal(r.onTarget, 1);
    assert.equal(r.avgProtein, 110);
    assert.equal(r.avgSteps, 8000);
    assert.equal(r.avgBalance, -300); // today's still-growing burn is left out of the balance
});
