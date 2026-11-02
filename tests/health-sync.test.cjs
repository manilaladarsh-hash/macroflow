const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const json = value => JSON.stringify(value);

// What the "MacroFlow Health" Shortcut copies: one line per day and metric.
const payload = [
    'MacroFlow Health v1',
    'steps;2026-10-14T00:00:00;6100 count',
    'steps;2026-10-15T00:00:00;8432 count',
    'active;2026-10-14T00:00:00;400.4 kcal',
    'active;2026-10-15T00:00:00;512.3 kcal',
    'resting;2026-10-14T00:00:00;1700 kcal',
    'resting;2026-10-15T00:00:00;1750 kcal',
    'weight;2026-10-15T00:00:00;78.4 kg'
].join('\n');

test('Shortcut payload: active, resting and total calories, steps and weight per day', () => {
    const a = app();
    const r = plain(a.run(`parseShortcutPayload(${json(payload)})`));
    assert.deepEqual(r.days['2026-10-15'], { steps: 8432, active: 512, total: 2262, weight: 78.4 });
    assert.deepEqual(r.days['2026-10-14'], { steps: 6100, active: 400, total: 2100 });
    assert.deepEqual(r.counts, { steps: 2, calories: 2, weight: 1 });
    assert.equal(r.from, '2026-10-14');
    assert.equal(r.to, '2026-10-15');
    assert.equal(r.origin, 'apple-health');
});

test('Shortcut payload: other locales, separators, units and ungrouped samples', () => {
    const a = app();
    const value = (raw, metric) => plain(a.run(`parseShortcutValue(${json(raw)}, ${json(metric)})`))?.value;
    assert.equal(value('8,432', 'steps'), 8432);
    assert.equal(value('8.432', 'steps'), 8432);
    assert.equal(value('8 432', 'steps'), 8432);
    assert.equal(value('512,3 kcal', 'active'), 512.3);
    assert.equal(value('1,750 kcal', 'resting'), 1750);
    assert.equal(value('1.750,5', 'resting'), 1750.5);
    assert.equal(value('1,750.5', 'resting'), 1750.5);
    assert.equal(value('78,4 kg', 'weight'), 78.4);
    assert.equal(value('78,400', 'weight'), 78.4);
    assert.equal(value('kcal', 'active'), undefined);

    const r = plain(a.run(`parseShortcutPayload(${json([
        'macroflow health v1',
        'Steps, 2026-10-15, 1000',          // commas
        'steps\t2026-10-15\t2500',          // tabs; ungrouped samples add up
        'active energy;Oct 15, 2026;2092 kJ', // medium date, kilojoules
        'weight;2026-10-15;172.8 lb',       // pounds become kg
        'heart_rate;2026-10-15;61',         // ignored
        'not a line'
    ].join('\r\n'))})`));
    assert.equal(r.days['2026-10-15'].steps, 3500);
    assert.equal(r.days['2026-10-15'].active, 500);
    assert.equal(r.days['2026-10-15'].weight, 78.38);
    assert.equal(r.days['2026-10-15'].total, undefined);
});

test('Shortcut payload: anything else on the clipboard is rejected', () => {
    const a = app();
    assert.equal(a.run(`parseShortcutPayload('')`), null);
    assert.equal(a.run(`parseShortcutPayload('https://example.com')`), null);
    assert.equal(a.run(`parseShortcutPayload('steps;2026-10-15;8432')`), null); // no header
    assert.equal(a.run(`parseShortcutPayload('MacroFlow Health v1\\nhello')`), null);
    assert.notEqual(a.run(`parseShortcutPayload('steps;2026-10-15;8432', { requireHeader: false })`), null); // paste box
});

test('syncing twice replaces the synced days; manual entries and weigh-ins stay', () => {
    const a = app();
    a.run(`appState.bodyProfile.unit = 'kg';
        appState.weightHistory = [{ date: '2026-10-14', value: 80, unit: 'kg' }];
        const log = ensureDayLog('2026-10-15');
        log.exercise = [{ id: 'run', name: 'Running', calories: 300, minutes: 30, source: 'manual' }];`);
    const withManualWeight = payload + '\nweight;2026-10-14T00:00:00;79.1 kg';
    a.run(`applyShortcutSync(parseShortcutPayload(${json(withManualWeight)}))`);
    a.run(`applyShortcutSync(parseShortcutPayload(${json(withManualWeight)}))`);
    const exercise = plain(a.run("appState.dailyLogs['2026-10-15'].exercise"));
    assert.deepEqual(exercise.map(e => [e.name, e.calories]), [['Running', 300], ['Activity from Apple Health', 512]]);
    assert.deepEqual(plain(a.run("appState.activity['2026-10-15']")), { steps: 8432, caloriesOut: 2262, source: 'apple-health' });
    assert.deepEqual(plain(a.run('appState.weightHistory')), [
        { date: '2026-10-14', value: 80, unit: 'kg' },   // the manual weigh-in wins
        { date: '2026-10-15', value: 78.4, unit: 'kg', source: 'import' }
    ]);
    assert.equal(a.run('appState.lastHealthSync.counts.calories'), 2);
});

test('a file import never replaces a manual weigh-in on the same day', () => {
    const a = app();
    a.run(`appState.bodyProfile.unit = 'kg'; appState.weightHistory = [{ date: '2026-10-08', value: 77, unit: 'kg' }];`);
    a.run(`applyHealthImport(mergeHealthResults([parseHealthFile('Daily activity metrics.csv', ${json('Date,Average weight (kg)\n2026-10-08,78.4\n2026-10-09,78.1\n')})]))`);
    assert.deepEqual(plain(a.run('appState.weightHistory')).map(w => [w.date, w.value, w.source]), [
        ['2026-10-08', 77, undefined],
        ['2026-10-09', 78.1, 'import']
    ]);
});

test('undoing a sync restores what was there before', () => {
    const a = app();
    a.run(`appState.activity = { '2026-10-15': { steps: 10, source: 'import' } };`);
    a.run(`const snap = snapshotHealthState(['2026-10-15']); applyShortcutSync(parseShortcutPayload(${json(payload)})); restoreHealthState(snap);`);
    assert.deepEqual(plain(a.run('appState.activity')), { '2026-10-15': { steps: 10, source: 'import' } });
    assert.equal(a.run("appState.dailyLogs['2026-10-15'].exercise"), undefined);
    assert.equal(a.run('appState.lastHealthSync'), null);
});

test('a Shortcut output saved as a file imports through the file picker too', () => {
    const a = app();
    const r = plain(a.run(`mergeHealthResults([parseHealthFile('MacroFlow Health.txt', ${json(payload)})])`));
    assert.equal(r.origin, 'apple-health');
    assert.equal(r.days['2026-10-15'].total, 2262);
    assert.equal(r.counts.calories, 2);
});

test('Fitbit via Google Health has no resting energy: total burned adds an estimated resting part', () => {
    const a = app();
    a.run(`appState.bodyProfile = { sex: 'female', age: 30, heightFt: 5, heightIn: 6, weight: 150, unit: 'lbs' }; appState.weightHistory = [];`);
    const bmr = a.run('estimateBmr()');
    assert.equal(Math.round(bmr), 1417); // Mifflin-St Jeor: 68.0 kg, 167.6 cm, 30 y, female
    const fitbitOnly = ['MacroFlow Health v1', 'steps;2026-09-30;11200 count', 'active;2026-09-30;640 kcal', 'weight;2026-09-30;150.2 lb'].join('\n');
    a.run(`applyShortcutSync(parseShortcutPayload(${JSON.stringify(fitbitOnly)}))`);
    const day = plain(a.run("appState.activity['2026-09-30']"));
    assert.equal(day.caloriesOut, Math.round(bmr + 640));
    assert.equal(day.caloriesOutEstimated, true);
    assert.equal(a.run("appState.dailyLogs['2026-09-30'].exercise[0].calories"), 640);

    // Today only counts the resting calories burned so far (now using the synced 150.2 lb).
    const now = a.run('new Date()');
    const part = a.run(`restingKcalFor(localDateKey())`);
    const fraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
    assert.equal(Math.round(part), Math.round(a.run('estimateBmr()') * fraction));

    // A measured resting value (Apple Watch) replaces the estimate.
    a.run(`applyShortcutSync(parseShortcutPayload('MacroFlow Health v1\\nactive;2026-09-30;640 kcal\\nresting;2026-09-30;1380 kcal'))`);
    assert.deepEqual(plain(a.run("appState.activity['2026-09-30']")), { steps: 11200, caloriesOut: 2020, source: 'apple-health' });
});
