const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));

test('the app makes no sound', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.doesNotMatch(html, /AudioContext|audioEngine|playNotification/);
});

test('targets: Mifflin-St Jeor maintenance, goal adjustment, protein 1 g/lb, fat 0.35 g/lb', () => {
    const a = app();
    // 30-year-old woman, 165 cm, 60 kg, moderately active, recomp (−15%)
    const r = plain(a.run(`computeTargets({ sex: 'female', age: 30, heightCm: 165, weightLbs: 60 * LB_PER_KG, activity: 'moderate', goal: 'recomp' })`));
    assert.equal(r.bmr, 1320);               // 600 + 1031.25 − 150 − 161
    assert.equal(r.tdee, 2046);              // × 1.55
    assert.equal(r.calories, 1739);          // × 0.85
    assert.equal(r.protein, 132);
    assert.equal(r.fats, 46);
    assert.equal(r.carbs, Math.round((1739 - 132 * 4 - 46 * 9) / 4));
});

test('Settings shows and saves the profile weight in kilograms for kg users', () => {
    const a = app();
    a.run(`appState.bodyProfile = { ...appState.bodyProfile, unit: 'kg', weight: 165.3 }; openSettingsModal();`);
    const field = a.document.getElementById('settings-profile-weight');
    assert.equal(a.document.getElementById('settings-profile-weight-label').innerText, 'Weight kg');
    assert.equal(field.value, 75);           // 165.3 lb
    field.value = '80';
    a.run('closeSettingsModal()');
    assert.equal(a.run('appState.bodyProfile.weight'), 176.4); // stored in lb
    // Switching the unit converts the number already typed.
    a.run(`openSettingsModal(); document.getElementById('settings-weight-unit').value = 'lbs'; onSettingsWeightUnitChange();`);
    assert.equal(a.document.getElementById('settings-profile-weight-label').innerText, 'Weight lbs');
    assert.equal(field.value, 176.4);
});

test('first-run card: shown to new users, hidden for people who already logged food, and sets targets', () => {
    const fresh = app();
    fresh.run('applyInitialUI(); renderAll();');
    assert.equal(fresh.document.getElementById('setup-card').classes.has('hidden'), false);

    const existing = app();
    existing.run(`appState.dailyLogs[appState.currentDate] = { meals: { breakfast: [{ id: 'x', name: 'Toast', calories: 80 }], lunch: [], dinner: [], snacks: [] }, water: 0 };
        delete appState.onboarded; applyInitialUI(); renderAll();`);
    assert.equal(existing.document.getElementById('setup-card').classes.has('hidden'), true);

    const a = app();
    a.run('applyInitialUI(); openWelcome();');
    const set = (id, v) => { a.document.getElementById(id).value = v; };
    a.run('renderWelcomePreview()');
    assert.equal(a.document.getElementById('welcome-apply').disabled, true); // nothing entered yet
    set('welcome-sex', 'female'); set('welcome-age', '30'); set('welcome-height-cm', '165'); set('welcome-weight-kg', '60');
    set('welcome-activity', 'moderate'); set('welcome-goal', 'recomp');
    a.run('renderWelcomePreview()');
    assert.equal(a.document.getElementById('welcome-apply').disabled, false);
    assert.match(a.document.getElementById('welcome-result').innerHTML, /1,740 kcal/); // from the weight rounded to 132.3 lb
    a.run('applyWelcome()');
    assert.equal(a.run('appState.targets.calories'), 1740);
    assert.deepEqual(plain(a.run('[appState.bodyProfile.unit, appState.bodyProfile.weight, appState.bodyProfile.heightFt, appState.bodyProfile.heightIn]')), ['kg', 132.3, 5, 5]);
    assert.equal(a.run('appState.onboarded'), true);
    assert.equal(a.document.getElementById('setup-card').classes.has('hidden'), true);
});

test('"Not now" hides the card for good', () => {
    const a = app();
    a.run('applyInitialUI(); renderAll(); openWelcome(); skipWelcome();');
    assert.equal(a.run('appState.onboarded'), true);
    assert.equal(a.document.getElementById('setup-card').classes.has('hidden'), true);
});
