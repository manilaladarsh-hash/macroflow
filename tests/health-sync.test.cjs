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

test('iPhone default date formats, day-first locales, diagnostic preview and sample loader work without ISO 8601 setup', () => {
    const a = app();
    for (const d of [
        '10/15/26, 12:00 AM',
        '10/15/2026, 12:00\u202fAM',
        '15.10.2026, 00:00',
        'Wednesday, October 15, 2026',
        'Oct 15, 2026 at 12:00 AM',
        '15 Oct 2026 at 00:00'
    ]) {
        const p = plain(a.run(`parseShortcutPayload(${json('MacroFlow Health v1\nsteps;' + d + ';8,432')})`));
        assert.equal(p?.days?.['2026-10-15']?.steps, 8432, `failed for date format: ${d}`);
    }

    // Day-first slash dates are inferred across the batch when any day > 12.
    const uk = plain(a.run(`parseShortcutPayload('steps;13/10/2026, 00:00;9000\\nsteps;05/10/2026, 00:00;8000', { requireHeader: false })`));
    assert.equal(uk.days['2026-10-13'].steps, 9000);
    assert.equal(uk.days['2026-10-05'].steps, 8000);

    // Diagnostic report explains malformed lines.
    const rep = plain(a.run(`shortcutReport('steps;Health Sample;8432\\nsteps;10/15/26, 12:00 AM;8432')`));
    assert.equal(rep.parsed, 1);
    assert.equal(rep.problemCount, 1);
    assert.match(rep.problems[0].reason, /Start Date/);

    // Sample data loader populates 7 days and syncs cleanly.
    a.run('openHealthSync("guide"); loadSampleHealthData();');
    assert.match(a.document.getElementById('health-sync-preview').innerHTML, /Ready to sync: 7 days of steps, 7 days of calories, 1 weight, 1 body fat reading/);
    const synced = plain(a.run('syncPastedHealthData()'));
    assert.equal(synced.counts.steps, 7);
    assert.equal(synced.counts.calories, 7);
});

// The Repeat-free Shortcut: one Find Health Samples per metric, then one Text
// action with a label line, the samples' Start Dates, then their Values.
const sectionPayload = [
    'MacroFlow Health',
    'steps',
    'Nov 7, 2026 at 12:00 AM',
    'Nov 8, 2026 at 12:00 AM',
    '8,432',
    '10,120',
    'active',
    'Nov 7, 2026 at 12:00 AM',
    'Nov 8, 2026 at 12:00 AM',
    '512.3',
    '640',
    'resting',                       // no Apple Watch: nothing under the label
    'weight',
    'Nov 8, 2026 at 7:30 AM',
    '172.8',
    'lb',                            // optional Unit block
    'body fat',
    'Nov 8, 2026 at 7:30 AM',
    '0.182'                          // Health stores a fraction
].join('\n');

test('Repeat-free Shortcut: label, dates, then values per metric', () => {
    const a = app();
    const r = plain(a.run(`parseShortcutPayload(${json(sectionPayload)})`));
    assert.deepEqual(r.days['2026-11-07'], { steps: 8432, active: 512 });
    assert.equal(r.days['2026-11-08'].steps, 10120);
    assert.equal(r.days['2026-11-08'].active, 640);
    assert.equal(r.days['2026-11-08'].weight, 78.38);       // 172.8 lb
    assert.equal(r.days['2026-11-08'].bodyFat, 18.2);
    assert.deepEqual(r.counts, { steps: 2, calories: 2, weight: 1, bodyFat: 1 });
    // A weight with no Unit block uses the unit chosen in Settings.
    a.run(`appState.bodyProfile.unit = 'kg'`);
    const kg = plain(a.run(`parseShortcutPayload(${json('MacroFlow Health\nweight\n2026-11-08\n78.4')})`));
    assert.equal(kg.days['2026-11-08'].weight, 78.4);
    a.run(`appState.bodyProfile.unit = 'lbs'`);
    const lb = plain(a.run(`parseShortcutPayload(${json('MacroFlow Health\nweight\n2026-11-08\n172.8')})`));
    assert.equal(lb.days['2026-11-08'].weight, 78.38);
});

test('Repeat-free Shortcut: mismatched lists are explained, the rest still syncs', () => {
    const a = app();
    const report = plain(a.run(`shortcutReport(${json([
        'MacroFlow Health',
        'steps', '2026-11-07', '2026-11-08', '8432',   // one value missing
        'active', '512', '640',                       // values but no dates
        'weight', '2026-11-08', '78.4 kg'
    ].join('\n'))})`));
    assert.deepEqual(report.problems.map(p => p.line), ['steps', 'active']);
    assert.match(report.problems[0].reason, /don't pair up/);
    assert.match(report.problems[1].reason, /No dates/);
    assert.deepEqual(Object.keys(report.summary.days), ['2026-11-08']);
    // Old one-line-per-sample text still works, with or without labels above it.
    const old = plain(a.run(`parseShortcutPayload(${json('MacroFlow Health v1\nsteps\nsteps;2026-11-08;8432')})`));
    assert.equal(old.days['2026-11-08'].steps, 8432);
});

test('body fat from Apple Health is kept and shown with the weight trend', () => {
    const a = app();
    a.run(`appState.weightHistory = [{ date: '2026-11-01', value: 176, unit: 'lbs' }, { date: '2026-11-08', value: 175, unit: 'lbs' }];
        applyShortcutSync(parseShortcutPayload(${json(sectionPayload)}));`);
    assert.equal(a.run(`appState.activity['2026-11-08'].bodyFat`), 18.2);
    assert.deepEqual(plain(a.run('latestBodyFat()')), { date: '2026-11-08', value: 18.2 });
    a.run('renderBodyFatLine()');
    assert.match(a.document.getElementById('weight-bodyfat').innerText, /^Body fat 18\.2% · /);
    assert.equal(a.run(`parseShortcutPayload('MacroFlow Health v1\\nbodyfat;2026-11-08;250')`), null); // not a body fat %
});

test('Today offers a sync once the last one is a few hours old', () => {
    const a = app();
    const banner = () => a.document.getElementById('health-sync-banner');
    a.run(`appState.lastHealthSync = { at: new Date(Date.now() - 30 * 60000).toISOString() }; renderAll();`);
    assert.equal(banner().classes.has('hidden'), true);                     // fresh
    a.run(`appState.lastHealthSync = { at: new Date(Date.now() - 5 * 3600000).toISOString() }; renderAll();`);
    assert.equal(banner().classes.has('hidden'), false);
    assert.equal(a.document.getElementById('health-sync-banner-title').innerText, 'Sync Apple Health');
    assert.match(a.document.getElementById('health-sync-banner-sub').innerText, /5 h ago/);
    a.run(`selectDate(localDateKey(localDayOffset(-1))); renderAll();`);
    assert.equal(banner().classes.has('hidden'), true);                     // only on today
});

test('the copied Text template has the labels the parser expects', () => {
    const a = app();
    const t = a.run('SHORTCUT_TEXT_TEMPLATE');
    const lines = t.split('\n').filter(Boolean);
    assert.deepEqual(lines, ['MacroFlow Health', 'steps', 'active', 'weight', 'body fat']);
});
