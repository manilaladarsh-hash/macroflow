import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
    LAST_KNOWN_GOOD_STORAGE_KEY,
    MAX_RECENT_SCANS,
    MAX_UNDO_ENTRIES,
    SCHEMA_VERSION,
    StateImportError,
    commitUndoState,
    createDefaultState,
    createExportJson,
    createUndoHistory,
    importStateFromJson,
    loadLastKnownGoodSnapshot,
    migrateState,
    normalizeFoodRecord,
    persistStateWithBackup,
    redoState,
    saveLastKnownGoodSnapshot,
    stableId,
    undoState,
    validateImportPayload
} from '../src/state-core.js';

const FIXED_NOW = new Date('2026-07-21T15:00:00.000Z');

function legacyFood(overrides = {}) {
    return {
        id: 'legacy_food_1',
        name: 'Legacy oats',
        calories: 150,
        protein: 5,
        carbs: 27,
        fats: 3,
        servingSize: 40,
        servingUnit: 'g',
        store: 'Old database',
        type: 'Local Search',
        micros: {
            vita: 0,
            vitd: 0,
            vite: 0,
            vitk: 0,
            vitc: 0,
            thiamin: 0.15,
            riboflavin: 0,
            niacin: 0,
            pantothenic: 0,
            vitb6: 0,
            biotin: 0,
            folate: 0,
            vitb12: 0,
            calcium: 20,
            iron: 0,
            magnesium: 0,
            phosphorus: 0,
            zinc: 0,
            copper: 0,
            manganese: 0,
            selenium: 0,
            iodine: 0,
            chromium: 0,
            molybdenum: 0,
            potassium: 0,
            sodium: 0
        },
        baseNutrition: {
            calories: 150,
            protein: 5,
            carbs: 27,
            fats: 3,
            servingSize: 40,
            servingUnit: 'g',
            micros: { calcium: 20, sodium: 0, thiamin: 0.15 }
        },
        ...overrides
    };
}

function legacyState(overrides = {}) {
    return {
        apiKeys: {
            geminiApiKey: 'AIza-device-only',
            usdaApiKey: 'usda-device-only',
            geminiVerified: true
        },
        targets: { calories: 2350, protein: 170 },
        currentDate: '2026-07-20',
        dailyLogs: {
            '2026-07-20': {
                water: 1.75,
                meals: {
                    breakfast: [legacyFood()],
                    lunch: [legacyFood({ name: 'Second serving' })],
                    dinner: [],
                    snacks: []
                }
            }
        },
        bodyProfile: { sex: 'female', age: 31, weight: 145, unit: 'lbs' },
        weightHistory: [{ date: '2026-07-19', value: 145, unit: 'lbs' }],
        strengthHistory: [{ date: '2026-07-18', rating: 1, notes: 'Strong' }],
        customPacks: [legacyFood({ id: 'custom_oats', type: 'Custom Import' })],
        foodFrequency: {},
        ...overrides
    };
}

class MemoryStorage {
    constructor() {
        this.values = new Map();
    }

    getItem(key) {
        return this.values.has(key) ? this.values.get(key) : null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

test('new schema-v3 state starts without fabricated progress history', () => {
    const state = createDefaultState(FIXED_NOW);
    assert.equal(state.schemaVersion, SCHEMA_VERSION);
    assert.equal(state.currentDate, '2026-07-21');
    assert.deepEqual(state.dailyLogs, {});
    assert.deepEqual(state.weightHistory, []);
    assert.deepEqual(state.strengthHistory, []);
    assert.deepEqual(state.personalFoodLibrary, []);
    assert.deepEqual(state.savedMeals, []);
    assert.deepEqual(state.recipes, []);
});

test('v2 migration preserves diary, profile, history, custom foods, and device keys', () => {
    const migrated = migrateState(legacyState(), { now: FIXED_NOW });
    assert.equal(migrated.schemaVersion, 3);
    assert.equal(migrated.targets.calories, 2350);
    assert.equal(migrated.targets.protein, 170);
    assert.equal(migrated.bodyProfile.sex, 'female');
    assert.equal(migrated.bodyProfile.age, 31);
    assert.equal(migrated.dailyLogs['2026-07-20'].water, 1.75);
    assert.equal(migrated.dailyLogs['2026-07-20'].meals.breakfast[0].name, 'Legacy oats');
    assert.equal(migrated.weightHistory[0].value, 145);
    assert.equal(migrated.strengthHistory[0].notes, 'Strong');
    assert.equal(migrated.customPacks[0].id, 'custom_oats');
    assert.equal(migrated.personalFoodLibrary[0].id, 'custom_oats');
    assert.equal(migrated.apiKeys.geminiApiKey, 'AIza-device-only');
    assert.equal(migrated.apiKeys.geminiVerified, true);
});

test('duplicate legacy diary IDs become unique deterministic entry IDs', () => {
    const first = migrateState(legacyState(), { now: FIXED_NOW });
    const second = migrateState(legacyState(), { now: FIXED_NOW });
    const breakfastId = first.dailyLogs['2026-07-20'].meals.breakfast[0].id;
    const lunchId = first.dailyLogs['2026-07-20'].meals.lunch[0].id;
    assert.equal(breakfastId, 'legacy_food_1');
    assert.notEqual(lunchId, breakfastId);
    assert.equal(lunchId, second.dailyLogs['2026-07-20'].meals.lunch[0].id);
    assert.equal(first.dailyLogs['2026-07-20'].meals.lunch[0].foodId, 'legacy_food_1');
    assert.equal(stableId('entry', 'same seed'), stableId('entry', 'same seed'));
});

test('legacy filler zeroes become unknown while supplied zeroes remain known', () => {
    const food = normalizeFoodRecord(legacyFood(), {
        seed: 'legacy-oats',
        sourceSchemaVersion: 2
    });
    assert.equal(food.micros.calcium, 20);
    assert.equal(food.micros.thiamin, 0.15);
    assert.equal(food.micros.sodium, 0);
    assert.equal(food.micros.iron, null);
    assert.equal(food.micros.vitd, null);
    assert.ok(food.nutrientCoverage.known.includes('sodium'));
    assert.ok(food.nutrientCoverage.unknown.includes('iron'));
});

test('new food records support nullable macros, provenance, and richer nutrients', () => {
    const food = normalizeFoodRecord({
        name: 'Coffee drink',
        calories: 80,
        servingSize: 250,
        servingUnit: 'ml',
        fiber: 0,
        totalSugar: 12,
        caffeine: 95,
        source: {
            kind: 'open_food_facts',
            id: 'off-123',
            url: 'https://world.openfoodfacts.org/product/123',
            fetchedAt: '2026-07-20T00:00:00Z',
            verified: true
        }
    }, { seed: 'coffee', sourceSchemaVersion: 3 });
    assert.equal(food.protein, null);
    assert.equal(food.carbs, null);
    assert.equal(food.otherNutrients.fiber, 0);
    assert.equal(food.otherNutrients.totalSugar, 12);
    assert.equal(food.otherNutrients.caffeine, 95);
    assert.equal(food.otherNutrients.cholesterol, null);
    assert.equal(food.source.kind, 'open_food_facts');
    assert.equal(food.source.verified, true);
    assert.equal(food.verification, 'verified');
});

test('migration normalizes library features, scan cap, overrides, meals, and recipes', () => {
    const scans = Array.from({ length: 60 }, (_, index) => ({
        gtin: '012345678905',
        scannedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
        outcome: 'confirmed',
        engines: ['native', 'zxing']
    }));
    const raw = legacyState({
        personalFoodLibrary: [legacyFood({ id: 'library_oats' })],
        favoriteFoodIds: ['library_oats', 'library_oats'],
        recentFoodIds: ['library_oats'],
        recentScans: scans,
        barcodeOverrides: {
            '012345678905': { foodId: 'library_oats', confirmedAt: '2026-07-20T00:00:00Z' },
            invalid: { foodId: 'ignored' }
        },
        savedMeals: [{
            name: 'Breakfast bowl',
            servings: 2,
            items: [{ food: legacyFood(), quantity: 80, unit: 'g' }]
        }],
        recipes: [{
            name: 'Overnight oats',
            servings: 4,
            instructions: 'Mix and chill.',
            ingredients: [{ snapshot: legacyFood(), quantity: 160, unit: 'g' }]
        }]
    });
    const state = migrateState(raw, { now: FIXED_NOW });
    assert.deepEqual(state.favoriteFoodIds, ['library_oats']);
    assert.deepEqual(state.recentFoodIds, ['library_oats']);
    assert.equal(state.recentScans.length, MAX_RECENT_SCANS);
    assert.equal(state.recentScans.at(-1).engines.length, 2);
    assert.equal(state.barcodeOverrides['012345678905'].foodId, 'library_oats');
    assert.equal(state.barcodeOverrides.invalid, undefined);
    assert.equal(state.savedMeals[0].items[0].food.name, 'Legacy oats');
    assert.equal(state.savedMeals[0].servings, 2);
    assert.equal(state.recipes[0].ingredients[0].quantity, 160);
    assert.equal(state.recipes[0].instructions, 'Mix and chill.');
});

test('safe import rejects malformed, unsafe, oversized, and future-schema data', () => {
    assert.equal(validateImportPayload(null).ok, false);
    assert.equal(validateImportPayload({ hello: 'world' }).ok, false);
    assert.equal(validateImportPayload({ schemaVersion: 999, dailyLogs: {} }).ok, false);
    assert.equal(validateImportPayload({ schemaVersion: 3, dailyLogs: [] }).ok, false);
    const unsafe = JSON.parse('{"schemaVersion":3,"dailyLogs":{},"__proto__":{"polluted":true}}');
    assert.equal(validateImportPayload(unsafe).ok, false);
    assert.throws(
        () => importStateFromJson('{not json'),
        error => error instanceof StateImportError && /valid JSON/.test(error.message)
    );
    assert.throws(
        () => importStateFromJson(JSON.stringify({ schemaVersion: 4, dailyLogs: {} })),
        StateImportError
    );
});

test('import ignores file credentials and retains the current device credentials', () => {
    const current = createDefaultState(FIXED_NOW);
    current.apiKeys = {
        geminiApiKey: 'current-gemini',
        usdaApiKey: 'current-usda',
        geminiVerified: true
    };
    const raw = legacyState({
        apiKeys: {
            geminiApiKey: 'malicious-import-key',
            usdaApiKey: 'malicious-usda-key',
            geminiVerified: true
        }
    });
    const imported = importStateFromJson(JSON.stringify(raw), {
        now: FIXED_NOW,
        existingState: current
    });
    assert.equal(imported.state.apiKeys.geminiApiKey, 'current-gemini');
    assert.equal(imported.state.apiKeys.usdaApiKey, 'current-usda');
    assert.match(imported.warnings[0], /credentials/i);
});

test('exports and recovery snapshots remove API keys, nested secrets, and URL keys', () => {
    const state = migrateState(legacyState(), { now: FIXED_NOW });
    state.integration = {
        accessToken: 'remove-me',
        nested: { password: 'remove-me-too', harmless: true },
        url: 'https://example.com/food?api_key=top-secret&id=42'
    };
    const exported = JSON.parse(createExportJson(state));
    assert.equal(exported.apiKeys, undefined);
    assert.equal(exported.integration.accessToken, undefined);
    assert.equal(exported.integration.nested.password, undefined);
    assert.equal(exported.integration.nested.harmless, true);
    assert.match(exported.integration.url, /id=42/);
    assert.doesNotMatch(exported.integration.url, /top-secret|api_key/);

    const storage = new MemoryStorage();
    saveLastKnownGoodSnapshot(storage, state);
    assert.doesNotMatch(storage.getItem(LAST_KNOWN_GOOD_STORAGE_KEY), /AIza-device-only/);
    const recovered = loadLastKnownGoodSnapshot(storage, { existingState: state, now: FIXED_NOW });
    assert.equal(recovered.dailyLogs['2026-07-20'].meals.breakfast[0].name, 'Legacy oats');
    assert.equal(recovered.apiKeys.geminiApiKey, 'AIza-device-only');
});

test('persistence writes a validated primary state and a secret-free recovery copy', () => {
    const storage = new MemoryStorage();
    const state = migrateState(legacyState(), { now: FIXED_NOW });
    const saved = persistStateWithBackup(storage, state, { now: FIXED_NOW });
    assert.equal(saved.schemaVersion, 3);
    assert.match(storage.getItem('macroflow_v2_state'), /AIza-device-only/);
    assert.doesNotMatch(storage.getItem(LAST_KNOWN_GOOD_STORAGE_KEY), /AIza-device-only/);
});

test('undo history caps at 20 entries, supports undo/redo, and clears redo on commit', () => {
    let history = createUndoHistory({ count: 0 });
    for (let count = 1; count <= 25; count += 1) {
        history = commitUndoState(history, { count }, {
            label: `Set ${count}`,
            at: new Date(Date.UTC(2026, 0, count)).toISOString()
        });
    }
    assert.equal(history.past.length, MAX_UNDO_ENTRIES);
    assert.equal(history.present.count, 25);

    history = undoState(history);
    assert.equal(history.present.count, 24);
    assert.equal(history.future.length, 1);

    history = redoState(history);
    assert.equal(history.present.count, 25);
    assert.equal(history.future.length, 0);

    history = undoState(history);
    history = commitUndoState(history, { count: 100 }, { label: 'Branch' });
    assert.equal(history.present.count, 100);
    assert.equal(history.future.length, 0);
});
