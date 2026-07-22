/**
 * MacroFlow state schema, migrations, safe backup/import helpers, and undo history.
 *
 * This module deliberately has no DOM dependencies. The UI can load it in the
 * browser and the same code can be exercised by Node's test runner.
 */

export const SCHEMA_VERSION = 3;
export const PRIMARY_STORAGE_KEY = 'macroflow_v2_state';
export const LAST_KNOWN_GOOD_STORAGE_KEY = 'macroflow_v3_last_known_good';
export const MAX_RECENT_SCANS = 50;
export const MAX_UNDO_ENTRIES = 20;

export const MICRO_NUTRIENT_KEYS = Object.freeze([
    'vita', 'vitd', 'vite', 'vitk', 'vitc', 'thiamin', 'riboflavin',
    'niacin', 'pantothenic', 'vitb6', 'biotin', 'folate', 'vitb12',
    'calcium', 'iron', 'magnesium', 'phosphorus', 'zinc', 'copper',
    'manganese', 'selenium', 'iodine', 'chromium', 'molybdenum',
    'potassium', 'sodium'
]);

export const RICH_NUTRIENT_KEYS = Object.freeze([
    'fiber', 'totalSugar', 'addedSugar', 'saturatedFat', 'transFat',
    'cholesterol', 'caffeine'
]);

const MACRO_NUTRIENT_KEYS = Object.freeze(['calories', 'protein', 'carbs', 'fats']);
const ALL_NUTRIENT_KEYS = Object.freeze([
    ...MACRO_NUTRIENT_KEYS,
    ...MICRO_NUTRIENT_KEYS,
    ...RICH_NUTRIENT_KEYS
]);
const MEAL_KEYS = Object.freeze(['breakfast', 'lunch', 'dinner', 'snacks']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GTIN_PATTERN = /^\d{8,14}$/;
const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SECRET_KEY_PATTERN = /(?:api[\s_-]*key|access[\s_-]*token|auth(?:orization)?|credential|password|secret|gemini[\s_-]*key|usda[\s_-]*key)/i;

/** @typedef {number|null} NullableNutrient */

/**
 * @typedef {Object} SourceProvenance
 * @property {string} kind
 * @property {string|null} id
 * @property {string|null} url
 * @property {string|null} fetchedAt
 * @property {number|null} confidence
 * @property {boolean} verified
 */

/**
 * @typedef {Object} FoodRecord
 * @property {string} id
 * @property {string} foodId
 * @property {string} name
 * @property {NullableNutrient} calories
 * @property {NullableNutrient} protein
 * @property {NullableNutrient} carbs
 * @property {NullableNutrient} fats
 * @property {number} servingSize
 * @property {string} servingUnit
 * @property {Record<string, NullableNutrient>} micros
 * @property {Record<string, NullableNutrient>} otherNutrients
 * @property {SourceProvenance} source
 * @property {'verified'|'user_confirmed'|'estimated'|'unverified'} verification
 */

/**
 * @typedef {Object} ScanHistoryEntry
 * @property {string} id
 * @property {string} scannedAt
 * @property {string} gtin
 * @property {string} format
 * @property {string[]} engines
 * @property {Record<string, number|null>} quality
 * @property {string} outcome
 * @property {string|null} sourceId
 * @property {string|null} foodId
 */

/**
 * @typedef {Object} SavedMeal
 * @property {string} id
 * @property {string} name
 * @property {Array<Object>} items
 * @property {number} servings
 */

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} name
 * @property {Array<Object>} ingredients
 * @property {number} servings
 */

/**
 * @typedef {Object} BarcodeOverride
 * @property {string} gtin
 * @property {string} foodId
 * @property {string} confirmedAt
 * @property {string|null} correctedFrom
 */

/**
 * @typedef {Object} UndoHistory
 * @property {Array<{state:any,label:string|null,at:string}>} past
 * @property {*} present
 * @property {Array<{state:any,label:string|null,at:string}>} future
 */

export class StateImportError extends Error {
    /** @param {string[]} errors */
    constructor(errors) {
        super(errors.join(' '));
        this.name = 'StateImportError';
        this.errors = errors;
    }
}

function isPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function todayFrom(now) {
    const date = now instanceof Date ? now : new Date(now ?? Date.now());
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const year = safeDate.getFullYear();
    const month = String(safeDate.getMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toIsoOrNull(value) {
    if (typeof value !== 'string' && !(value instanceof Date)) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanString(value, fallback = '', maxLength = 500) {
    if (typeof value !== 'string' && typeof value !== 'number') return fallback;
    const result = String(value).trim();
    return result ? result.slice(0, maxLength) : fallback;
}

function cleanId(value) {
    return cleanString(value, '', 160).replace(/[^a-zA-Z0-9_.:-]/g, '_');
}

function cleanGtin(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return GTIN_PATTERN.test(digits) ? digits : '';
}

function finiteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function nonNegativeNullable(value) {
    const parsed = finiteNumber(value);
    return parsed === null || parsed < 0 ? null : parsed;
}

function positiveNumber(value, fallback = 1) {
    const parsed = finiteNumber(value);
    return parsed !== null && parsed > 0 ? parsed : fallback;
}

function clampNullable(value, minimum, maximum) {
    const parsed = finiteNumber(value);
    return parsed === null ? null : Math.min(maximum, Math.max(minimum, parsed));
}

function safeClone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function canonicalStringify(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
    if (isPlainObject(value)) {
        const entries = Object.keys(value)
            .sort()
            .map(key => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
}

function fnv1a(value) {
    let hash = 0x811c9dc5;
    const stringValue = String(value);
    for (let index = 0; index < stringValue.length; index += 1) {
        hash ^= stringValue.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36).padStart(7, '0');
}

/** Create a deterministic ID for a migrated record. */
export function stableId(prefix, seed) {
    const safePrefix = cleanId(prefix) || 'record';
    const serialized = typeof seed === 'string' ? seed : canonicalStringify(seed);
    return `${safePrefix}_${fnv1a(serialized)}`;
}

/** Create a new ID for an interactive record. */
export function createRecordId(prefix = 'record') {
    const safePrefix = cleanId(prefix) || 'record';
    if (globalThis.crypto?.randomUUID) return `${safePrefix}_${globalThis.crypto.randomUUID()}`;
    return `${safePrefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultTargets() {
    return {
        calories: 2000, protein: 150, carbs: 200, fats: 65, water: 2.5,
        vita: 900, vitd: 15, vite: 15, vitk: 120, vitc: 90, thiamin: 1.2,
        riboflavin: 1.3, niacin: 16, pantothenic: 5, vitb6: 1.3,
        biotin: 30, folate: 400, vitb12: 2.4, calcium: 1000, iron: 8,
        magnesium: 400, phosphorus: 700, zinc: 11, copper: 0.9,
        manganese: 2.3, selenium: 55, iodine: 150, chromium: 35,
        molybdenum: 45, potassium: 3400, sodium: 2300
    };
}

/** Return a clean schema-v3 state. New users never receive fabricated history. */
export function createDefaultState(now = new Date()) {
    return {
        schemaVersion: SCHEMA_VERSION,
        fasting: { isFasting: false, startDate: null, targetHours: 16 },
        multiAddEnabled: false,
        apiKeys: { geminiApiKey: '', usdaApiKey: '', geminiVerified: false },
        targets: defaultTargets(),
        currentDate: todayFrom(now),
        dailyLogs: {},
        bodyProfile: {
            sex: 'male', age: 25, heightFt: 5, heightIn: 10, weight: 165,
            unit: 'lbs', activityLevel: 'moderate', goal: 'recomp'
        },
        weightHistory: [],
        weighInFrequency: 7,
        strengthHistory: [],
        foodFrequency: {},
        customPacks: [],
        personalFoodLibrary: [],
        favoriteFoodIds: [],
        recentFoodIds: [],
        recentScans: [],
        barcodeOverrides: {},
        savedMeals: [],
        recipes: [],
        activeTab: 'nutrition',
        calorieDisplayMode: 'consumed',
        expandedMeals: { breakfast: true, lunch: false, dinner: false, snacks: false },
        progressRange: 30,
        progressSubTab: 'weight',
        preferences: { sound: true, haptics: true, reducedMotion: false }
    };
}

function normalizeSource(rawFood) {
    const rawSource = isPlainObject(rawFood.source) ? rawFood.source : {};
    const legacyType = cleanString(rawFood.type, '', 100).toLowerCase();
    const legacyStore = cleanString(rawFood.store, '', 160).toLowerCase();
    let inferredKind = 'legacy';
    if (/open food|off\b/.test(`${legacyType} ${legacyStore}`)) inferredKind = 'open_food_facts';
    else if (/usda|fooddata/.test(`${legacyType} ${legacyStore}`)) inferredKind = 'usda';
    else if (/gemini|ai\b/.test(legacyType)) inferredKind = 'ai';
    else if (/custom|manual|quick log/.test(legacyType)) inferredKind = 'custom';
    else if (/local|staple/.test(legacyType)) inferredKind = 'local';

    const kind = cleanString(rawSource.kind ?? rawSource.provider, inferredKind, 80)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_');
    const verified = Boolean(rawSource.verified ?? rawFood.verified ?? false);
    return {
        kind: kind || inferredKind,
        id: cleanString(rawSource.id ?? rawFood.sourceId, '', 300) || null,
        url: cleanString(rawSource.url ?? rawFood.sourceUrl, '', 2048) || null,
        fetchedAt: toIsoOrNull(rawSource.fetchedAt ?? rawFood.fetchedAt),
        confidence: clampNullable(rawSource.confidence ?? rawFood.confidence, 0, 1),
        verified
    };
}

function normalizeVerification(rawFood, source) {
    const allowed = new Set(['verified', 'user_confirmed', 'estimated', 'unverified']);
    const candidate = cleanString(rawFood.verification, '', 40).toLowerCase();
    if (allowed.has(candidate)) return candidate;
    if (source.verified) return 'verified';
    if (source.kind === 'custom') return 'user_confirmed';
    if (source.kind === 'ai') return 'estimated';
    return 'unverified';
}

function normalizeMicros(rawFood, sourceSchemaVersion) {
    const micros = isPlainObject(rawFood.micros) ? rawFood.micros : {};
    const baseMicros = isPlainObject(rawFood.baseNutrition?.micros)
        ? rawFood.baseNutrition.micros
        : {};
    const knownKeys = new Set(Array.isArray(rawFood.nutrientCoverage?.known)
        ? rawFood.nutrientCoverage.known
        : []);
    const result = {};

    for (const key of MICRO_NUTRIENT_KEYS) {
        const baseHasKey = hasOwn(baseMicros, key);
        const microsHasKey = hasOwn(micros, key);
        const explicitlyKnown = sourceSchemaVersion >= SCHEMA_VERSION || knownKeys.has(key);
        const sourceValue = baseHasKey ? baseMicros[key] : micros[key];
        const parsed = nonNegativeNullable(sourceValue);

        // v2 filled every absent micronutrient with 0. Its sparse baseNutrition
        // tells us which zeroes were actually supplied. A non-zero legacy value
        // remains known even when baseNutrition is unavailable.
        if (baseHasKey || explicitlyKnown || (microsHasKey && parsed !== null && parsed !== 0)) {
            result[key] = parsed;
        } else {
            result[key] = null;
        }
    }
    return result;
}

function normalizeRichNutrients(rawFood) {
    const rich = isPlainObject(rawFood.otherNutrients) ? rawFood.otherNutrients : {};
    const micros = isPlainObject(rawFood.micros) ? rawFood.micros : {};
    const aliases = {
        fiber: ['fiber', 'dietaryFiber', 'dietary_fiber'],
        totalSugar: ['totalSugar', 'totalSugars', 'sugars', 'total_sugar'],
        addedSugar: ['addedSugar', 'addedSugars', 'added_sugar'],
        saturatedFat: ['saturatedFat', 'saturated_fat', 'satFat'],
        transFat: ['transFat', 'trans_fat'],
        cholesterol: ['cholesterol'],
        caffeine: ['caffeine']
    };
    const result = {};
    for (const key of RICH_NUTRIENT_KEYS) {
        let value;
        let supplied = false;
        for (const alias of aliases[key]) {
            if (hasOwn(rich, alias)) {
                value = rich[alias];
                supplied = true;
                break;
            }
            if (hasOwn(rawFood, alias)) {
                value = rawFood[alias];
                supplied = true;
                break;
            }
            if (hasOwn(micros, alias)) {
                value = micros[alias];
                supplied = true;
                break;
            }
        }
        result[key] = supplied ? nonNegativeNullable(value) : null;
    }
    return result;
}

function buildNutrientCoverage(record) {
    const values = {
        calories: record.calories,
        protein: record.protein,
        carbs: record.carbs,
        fats: record.fats,
        ...record.micros,
        ...record.otherNutrients
    };
    const known = ALL_NUTRIENT_KEYS.filter(key => values[key] !== null);
    const unknown = ALL_NUTRIENT_KEYS.filter(key => values[key] === null);
    return {
        known,
        unknown,
        ratio: Math.round((known.length / ALL_NUTRIENT_KEYS.length) * 1000) / 1000
    };
}

function normalizeBaseNutrition(rawFood, micros, otherNutrients) {
    const base = isPlainObject(rawFood.baseNutrition) ? rawFood.baseNutrition : rawFood;
    return {
        calories: nonNegativeNullable(base.calories),
        protein: nonNegativeNullable(base.protein),
        carbs: nonNegativeNullable(base.carbs),
        fats: nonNegativeNullable(base.fats),
        servingSize: positiveNumber(base.servingSize, positiveNumber(rawFood.servingSize, 100)),
        servingUnit: cleanString(base.servingUnit, cleanString(rawFood.servingUnit, 'g', 30), 30),
        micros: safeClone(micros),
        otherNutrients: safeClone(otherNutrients)
    };
}

/** Normalize a food or diary snapshot into the shared FoodRecord shape. */
export function normalizeFoodRecord(rawValue, options = {}) {
    const rawFood = isPlainObject(rawValue) ? rawValue : {};
    const sourceSchemaVersion = Number(options.sourceSchemaVersion) || 0;
    const seed = options.seed ?? {
        name: rawFood.name,
        barcode: rawFood.barcodeCanonical || rawFood.barcode,
        store: rawFood.store,
        servingSize: rawFood.servingSize
    };
    const suppliedId = cleanId(options.idOverride ?? rawFood.id);
    const id = suppliedId || stableId(options.idPrefix || 'food', seed);
    const foodId = cleanId(rawFood.foodId)
        || cleanId(rawFood.id)
        || stableId('food', {
            name: rawFood.name,
            barcode: rawFood.barcodeCanonical || rawFood.barcode,
            store: rawFood.store,
            servingSize: rawFood.servingSize,
            servingUnit: rawFood.servingUnit
        });
    const micros = normalizeMicros(rawFood, sourceSchemaVersion);
    const otherNutrients = normalizeRichNutrients(rawFood);
    const source = normalizeSource(rawFood);

    /** @type {FoodRecord & Record<string, any>} */
    const result = {
        id,
        foodId,
        name: cleanString(rawFood.name, 'Unnamed food', 240),
        calories: nonNegativeNullable(rawFood.calories),
        protein: nonNegativeNullable(rawFood.protein),
        carbs: nonNegativeNullable(rawFood.carbs),
        fats: nonNegativeNullable(rawFood.fats),
        servingSize: positiveNumber(rawFood.servingSize, 100),
        servingUnit: cleanString(rawFood.servingUnit, 'g', 30),
        store: cleanString(rawFood.store ?? rawFood.brand, 'Generic', 160),
        brand: cleanString(rawFood.brand ?? rawFood.store, '', 160),
        type: cleanString(rawFood.type, 'Food', 100),
        sourceUrl: source.url || '',
        barcode: cleanGtin(rawFood.barcode ?? rawFood.gtinUpc),
        barcodeCanonical: cleanGtin(rawFood.barcodeCanonical),
        barcodeFormat: cleanString(rawFood.barcodeFormat, '', 80),
        micros,
        otherNutrients,
        source,
        verification: normalizeVerification(rawFood, source),
        createdAt: toIsoOrNull(rawFood.createdAt),
        updatedAt: toIsoOrNull(rawFood.updatedAt),
        lastUsedAt: toIsoOrNull(rawFood.lastUsedAt),
        archived: Boolean(rawFood.archived)
    };

    if (rawFood.timestamp !== undefined) result.timestamp = cleanString(rawFood.timestamp, '', 80);
    if (rawFood.copiedFrom !== undefined) result.copiedFrom = cleanString(rawFood.copiedFrom, '', 160);
    result.baseNutrition = normalizeBaseNutrition(rawFood, micros, otherNutrients);
    result.nutrientCoverage = buildNutrientCoverage(result);
    return result;
}

function makeUniqueId(candidate, prefix, seed, seenIds) {
    let id = cleanId(candidate) || stableId(prefix, seed);
    if (!seenIds.has(id)) {
        seenIds.add(id);
        return id;
    }
    let suffix = 0;
    do {
        id = stableId(prefix, `${canonicalStringify(seed)}:${suffix}`);
        suffix += 1;
    } while (seenIds.has(id));
    seenIds.add(id);
    return id;
}

function normalizeDailyLogs(rawLogs, sourceSchemaVersion) {
    if (!isPlainObject(rawLogs)) return {};
    const logs = {};
    const seenEntryIds = new Set();
    for (const [date, rawLogValue] of Object.entries(rawLogs)) {
        if (!DATE_PATTERN.test(date) || !isPlainObject(rawLogValue)) continue;
        const rawLog = rawLogValue;
        const rawMeals = isPlainObject(rawLog.meals) ? rawLog.meals : {};
        const meals = {};
        for (const meal of MEAL_KEYS) {
            const items = Array.isArray(rawMeals[meal]) ? rawMeals[meal] : [];
            meals[meal] = items.map((rawFood, index) => {
                const seed = `diary:${date}:${meal}:${index}:${canonicalStringify(rawFood)}`;
                const candidate = isPlainObject(rawFood) ? rawFood.id : '';
                const id = makeUniqueId(candidate, 'entry', seed, seenEntryIds);
                return normalizeFoodRecord(rawFood, {
                    seed,
                    idOverride: id,
                    idPrefix: 'entry',
                    sourceSchemaVersion
                });
            });
        }
        logs[date] = {
            meals,
            water: nonNegativeNullable(rawLog.water) ?? 0
        };
        if (rawLog.copiedFrom !== undefined) {
            logs[date].copiedFrom = cleanString(rawLog.copiedFrom, '', 160);
        }
    }
    return logs;
}

function normalizeFoodList(rawList, sourceSchemaVersion, prefix) {
    if (!Array.isArray(rawList)) return [];
    const seenIds = new Set();
    return rawList.map((rawFood, index) => {
        const seed = `${prefix}:${index}:${canonicalStringify(rawFood)}`;
        const candidate = isPlainObject(rawFood) ? rawFood.id : '';
        const id = makeUniqueId(candidate, prefix, seed, seenIds);
        return normalizeFoodRecord(rawFood, {
            seed,
            idOverride: id,
            idPrefix: prefix,
            sourceSchemaVersion
        });
    });
}

function normalizeWeightHistory(rawHistory) {
    if (!Array.isArray(rawHistory)) return [];
    return rawHistory.flatMap((rawValue, index) => {
        if (!isPlainObject(rawValue) || !DATE_PATTERN.test(String(rawValue.date || ''))) return [];
        const value = finiteNumber(rawValue.value);
        if (value === null || value <= 0) return [];
        return [{
            id: cleanId(rawValue.id) || stableId('weight', `${rawValue.date}:${index}:${value}`),
            date: rawValue.date,
            value,
            unit: cleanString(rawValue.unit, 'lbs', 20)
        }];
    });
}

function normalizeStrengthHistory(rawHistory) {
    if (!Array.isArray(rawHistory)) return [];
    return rawHistory.flatMap((rawValue, index) => {
        if (!isPlainObject(rawValue) || !DATE_PATTERN.test(String(rawValue.date || ''))) return [];
        const rating = finiteNumber(rawValue.rating);
        if (rating === null) return [];
        return [{
            id: cleanId(rawValue.id) || stableId('strength', `${rawValue.date}:${index}:${rating}`),
            date: rawValue.date,
            rating: Math.max(-1, Math.min(1, rating)),
            notes: cleanString(rawValue.notes, '', 2000)
        }];
    });
}

function normalizeFoodFrequency(rawFrequency, sourceSchemaVersion) {
    if (!isPlainObject(rawFrequency)) return {};
    const result = {};
    for (const [key, rawValue] of Object.entries(rawFrequency)) {
        if (!isPlainObject(rawValue)) continue;
        const safeKey = cleanString(key, '', 240);
        if (!safeKey) continue;
        result[safeKey] = {
            count: Math.max(0, Math.floor(finiteNumber(rawValue.count) ?? 0)),
            lastUsed: DATE_PATTERN.test(String(rawValue.lastUsed || '')) ? rawValue.lastUsed : null,
            meals: Array.isArray(rawValue.meals)
                ? [...new Set(rawValue.meals.filter(value => MEAL_KEYS.includes(value)))]
                : [],
            food: normalizeFoodRecord(rawValue.food, {
                seed: `frequency:${safeKey}`,
                sourceSchemaVersion
            })
        };
    }
    return result;
}

function normalizeScanEntry(rawValue, index) {
    const raw = isPlainObject(rawValue) ? rawValue : {};
    const gtin = cleanGtin(raw.gtin ?? raw.barcode ?? raw.code);
    const scannedAt = toIsoOrNull(raw.scannedAt ?? raw.at ?? raw.timestamp) || new Date(0).toISOString();
    const rawQuality = isPlainObject(raw.quality) ? raw.quality : {};
    const quality = {};
    for (const key of ['sharpness', 'motion', 'glare', 'contrast', 'brightness', 'confidence']) {
        quality[key] = clampNullable(rawQuality[key], 0, 1);
    }
    return {
        id: cleanId(raw.id) || stableId('scan', `${gtin}:${scannedAt}:${index}`),
        scannedAt,
        gtin,
        format: cleanString(raw.format, '', 80),
        engines: Array.isArray(raw.engines)
            ? [...new Set(raw.engines.map(value => cleanString(value, '', 80)).filter(Boolean))]
            : [],
        quality,
        outcome: cleanString(raw.outcome, 'unknown', 80),
        sourceId: cleanString(raw.sourceId, '', 300) || null,
        foodId: cleanId(raw.foodId) || null,
        correctedFrom: cleanGtin(raw.correctedFrom) || null
    };
}

function normalizeBarcodeOverrides(rawOverrides) {
    if (!isPlainObject(rawOverrides)) return {};
    const result = {};
    for (const [rawGtin, rawValue] of Object.entries(rawOverrides)) {
        const gtin = cleanGtin(rawGtin);
        if (!gtin) continue;
        const raw = typeof rawValue === 'string' ? { foodId: rawValue } : rawValue;
        if (!isPlainObject(raw)) continue;
        const foodId = cleanId(raw.foodId ?? raw.id);
        if (!foodId) continue;
        result[gtin] = {
            gtin,
            foodId,
            confirmedAt: toIsoOrNull(raw.confirmedAt) || new Date(0).toISOString(),
            correctedFrom: cleanGtin(raw.correctedFrom) || null
        };
    }
    return result;
}

function normalizeTemplateItem(rawValue, seed, sourceSchemaVersion) {
    const raw = isPlainObject(rawValue) ? rawValue : {};
    const rawFood = raw.food ?? raw.snapshot ?? raw;
    const food = normalizeFoodRecord(rawFood, { seed: `${seed}:food`, sourceSchemaVersion });
    return {
        id: cleanId(raw.id) || stableId('ingredient', seed),
        foodId: cleanId(raw.foodId) || food.foodId,
        quantity: positiveNumber(raw.quantity, food.servingSize),
        unit: cleanString(raw.unit, food.servingUnit, 30),
        food
    };
}

function normalizeSavedMeals(rawMeals, sourceSchemaVersion) {
    if (!Array.isArray(rawMeals)) return [];
    return rawMeals.flatMap((rawValue, index) => {
        if (!isPlainObject(rawValue)) return [];
        const id = cleanId(rawValue.id) || stableId('meal', `${index}:${rawValue.name}`);
        const rawItems = Array.isArray(rawValue.items) ? rawValue.items : [];
        return [{
            id,
            name: cleanString(rawValue.name, 'Saved meal', 240),
            items: rawItems.map((item, itemIndex) => normalizeTemplateItem(
                item,
                `saved-meal:${id}:${itemIndex}`,
                sourceSchemaVersion
            )),
            servings: positiveNumber(rawValue.servings, 1),
            defaultMealSlot: MEAL_KEYS.includes(rawValue.defaultMealSlot) ? rawValue.defaultMealSlot : null,
            createdAt: toIsoOrNull(rawValue.createdAt),
            updatedAt: toIsoOrNull(rawValue.updatedAt),
            archived: Boolean(rawValue.archived)
        }];
    });
}

function normalizeRecipes(rawRecipes, sourceSchemaVersion) {
    if (!Array.isArray(rawRecipes)) return [];
    return rawRecipes.flatMap((rawValue, index) => {
        if (!isPlainObject(rawValue)) return [];
        const id = cleanId(rawValue.id) || stableId('recipe', `${index}:${rawValue.name}`);
        const rawIngredients = Array.isArray(rawValue.ingredients) ? rawValue.ingredients : [];
        return [{
            id,
            name: cleanString(rawValue.name, 'Recipe', 240),
            ingredients: rawIngredients.map((item, itemIndex) => normalizeTemplateItem(
                item,
                `recipe:${id}:${itemIndex}`,
                sourceSchemaVersion
            )),
            servings: positiveNumber(rawValue.servings, 1),
            instructions: cleanString(rawValue.instructions, '', 20000),
            createdAt: toIsoOrNull(rawValue.createdAt),
            updatedAt: toIsoOrNull(rawValue.updatedAt),
            archived: Boolean(rawValue.archived)
        }];
    });
}

function normalizeApiKeys(rawKeys, includeSecrets) {
    if (!includeSecrets || !isPlainObject(rawKeys)) {
        return { geminiApiKey: '', usdaApiKey: '', geminiVerified: false };
    }
    return {
        geminiApiKey: cleanString(rawKeys.geminiApiKey, '', 1000),
        usdaApiKey: cleanString(rawKeys.usdaApiKey, '', 1000),
        geminiVerified: Boolean(rawKeys.geminiVerified)
    };
}

/**
 * Migrate a saved MacroFlow state to schema v3.
 * @param {*} rawValue
 * @param {{now?: Date|string|number, includeSecrets?: boolean}} options
 */
export function migrateState(rawValue, options = {}) {
    const raw = isPlainObject(rawValue) ? rawValue : {};
    const defaults = createDefaultState(options.now ?? new Date());
    const sourceSchemaVersion = Number(raw.schemaVersion) || 2;
    const includeSecrets = options.includeSecrets !== false;
    const customPacks = normalizeFoodList(raw.customPacks, sourceSchemaVersion, 'custom');
    const rawLibrary = Array.isArray(raw.personalFoodLibrary)
        ? raw.personalFoodLibrary
        : customPacks;
    const personalFoodLibrary = normalizeFoodList(rawLibrary, sourceSchemaVersion, 'library');
    const targets = { ...defaults.targets };
    if (isPlainObject(raw.targets)) {
        for (const key of Object.keys(targets)) {
            targets[key] = nonNegativeNullable(raw.targets[key]) ?? targets[key];
        }
    }

    const rawProfile = isPlainObject(raw.bodyProfile) ? raw.bodyProfile : {};
    const bodyProfile = {
        ...defaults.bodyProfile,
        sex: cleanString(rawProfile.sex, defaults.bodyProfile.sex, 40),
        age: nonNegativeNullable(rawProfile.age) ?? defaults.bodyProfile.age,
        heightFt: nonNegativeNullable(rawProfile.heightFt) ?? defaults.bodyProfile.heightFt,
        heightIn: nonNegativeNullable(rawProfile.heightIn) ?? defaults.bodyProfile.heightIn,
        weight: nonNegativeNullable(rawProfile.weight) ?? defaults.bodyProfile.weight,
        unit: cleanString(rawProfile.unit, defaults.bodyProfile.unit, 20),
        activityLevel: cleanString(rawProfile.activityLevel, defaults.bodyProfile.activityLevel, 60),
        goal: cleanString(rawProfile.goal, defaults.bodyProfile.goal, 60)
    };

    const libraryIds = new Set(personalFoodLibrary.map(food => food.id));
    const favoriteFoodIds = Array.isArray(raw.favoriteFoodIds)
        ? [...new Set(raw.favoriteFoodIds.map(cleanId).filter(Boolean))]
        : [];
    const recentFoodIds = Array.isArray(raw.recentFoodIds)
        ? [...new Set(raw.recentFoodIds.map(cleanId).filter(Boolean))].slice(0, 50)
        : [];

    // Keep valid references even if their food currently lives in a remote
    // result cache; the UI can resolve or prune them after lookup.
    void libraryIds;

    const expandedMeals = { ...defaults.expandedMeals };
    if (isPlainObject(raw.expandedMeals)) {
        for (const meal of MEAL_KEYS) expandedMeals[meal] = Boolean(raw.expandedMeals[meal]);
    }

    const rawFasting = isPlainObject(raw.fasting) ? raw.fasting : {};
    const rawPreferences = isPlainObject(raw.preferences) ? raw.preferences : {};
    const state = {
        schemaVersion: SCHEMA_VERSION,
        fasting: {
            isFasting: Boolean(rawFasting.isFasting),
            startDate: toIsoOrNull(rawFasting.startDate),
            targetHours: positiveNumber(rawFasting.targetHours, defaults.fasting.targetHours)
        },
        multiAddEnabled: Boolean(raw.multiAddEnabled),
        apiKeys: normalizeApiKeys(raw.apiKeys, includeSecrets),
        targets,
        currentDate: DATE_PATTERN.test(String(raw.currentDate || ''))
            ? raw.currentDate
            : defaults.currentDate,
        dailyLogs: normalizeDailyLogs(raw.dailyLogs, sourceSchemaVersion),
        bodyProfile,
        weightHistory: normalizeWeightHistory(raw.weightHistory),
        weighInFrequency: positiveNumber(raw.weighInFrequency, defaults.weighInFrequency),
        strengthHistory: normalizeStrengthHistory(raw.strengthHistory),
        foodFrequency: normalizeFoodFrequency(raw.foodFrequency, sourceSchemaVersion),
        customPacks,
        personalFoodLibrary,
        favoriteFoodIds,
        recentFoodIds,
        recentScans: (Array.isArray(raw.recentScans) ? raw.recentScans : [])
            .map(normalizeScanEntry)
            .slice(-MAX_RECENT_SCANS),
        barcodeOverrides: normalizeBarcodeOverrides(raw.barcodeOverrides),
        savedMeals: normalizeSavedMeals(raw.savedMeals, sourceSchemaVersion),
        recipes: normalizeRecipes(raw.recipes, sourceSchemaVersion),
        activeTab: ['nutrition', 'dashboard', 'progress', 'library'].includes(raw.activeTab)
            ? raw.activeTab
            : defaults.activeTab,
        calorieDisplayMode: ['consumed', 'remaining'].includes(raw.calorieDisplayMode)
            ? raw.calorieDisplayMode
            : defaults.calorieDisplayMode,
        expandedMeals,
        progressRange: [14, 30, 90].includes(Number(raw.progressRange))
            ? Number(raw.progressRange)
            : defaults.progressRange,
        progressSubTab: ['weight', 'strength', 'calories'].includes(raw.progressSubTab)
            ? raw.progressSubTab
            : defaults.progressSubTab,
        preferences: {
            sound: rawPreferences.sound !== false,
            haptics: rawPreferences.haptics !== false,
            reducedMotion: Boolean(rawPreferences.reducedMotion)
        }
    };
    return state;
}

function inspectObjectSafety(value, errors, path = '$', depth = 0, counter = { value: 0 }) {
    counter.value += 1;
    if (counter.value > 100000) {
        errors.push('The import contains too many values.');
        return;
    }
    if (depth > 20) {
        errors.push(`The import is nested too deeply near ${path}.`);
        return;
    }
    if (!value || typeof value !== 'object') return;
    for (const key of Object.keys(value)) {
        if (FORBIDDEN_OBJECT_KEYS.has(key)) {
            errors.push(`Unsafe property found at ${path}.${key}.`);
            continue;
        }
        inspectObjectSafety(value[key], errors, `${path}.${key}`, depth + 1, counter);
        if (errors.length >= 20) return;
    }
}

/** Validate an already parsed import without mutating it. */
export function validateImportPayload(rawValue) {
    const errors = [];
    const warnings = [];
    if (!isPlainObject(rawValue)) {
        return { ok: false, errors: ['The import root must be a JSON object.'], warnings };
    }
    inspectObjectSafety(rawValue, errors);
    const version = Number(rawValue.schemaVersion || 2);
    if (!Number.isFinite(version) || version < 1) errors.push('The schema version is invalid.');
    if (version > SCHEMA_VERSION) errors.push(`This backup uses newer schema version ${version}.`);

    const recognizableKeys = [
        'schemaVersion', 'dailyLogs', 'customPacks', 'targets', 'weightHistory',
        'strengthHistory', 'personalFoodLibrary', 'savedMeals', 'recipes'
    ];
    if (!recognizableKeys.some(key => hasOwn(rawValue, key))) {
        errors.push('The JSON does not contain recognizable MacroFlow data.');
    }

    const arrayLimits = {
        customPacks: 5000,
        personalFoodLibrary: 5000,
        weightHistory: 5000,
        strengthHistory: 5000,
        recentScans: MAX_RECENT_SCANS * 4,
        savedMeals: 1000,
        recipes: 1000
    };
    for (const [key, limit] of Object.entries(arrayLimits)) {
        if (hasOwn(rawValue, key) && !Array.isArray(rawValue[key])) {
            errors.push(`${key} must be an array.`);
        } else if (Array.isArray(rawValue[key]) && rawValue[key].length > limit) {
            errors.push(`${key} exceeds the safe import limit of ${limit}.`);
        }
    }

    if (hasOwn(rawValue, 'dailyLogs') && !isPlainObject(rawValue.dailyLogs)) {
        errors.push('dailyLogs must be an object keyed by date.');
    } else if (isPlainObject(rawValue.dailyLogs)) {
        const logEntries = Object.entries(rawValue.dailyLogs);
        if (logEntries.length > 3660) errors.push('dailyLogs exceeds the safe ten-year import limit.');
        let foodCount = 0;
        for (const [date, rawLog] of logEntries) {
            if (!DATE_PATTERN.test(date)) errors.push(`Invalid diary date: ${date}.`);
            if (!isPlainObject(rawLog) || !isPlainObject(rawLog.meals)) {
                errors.push(`Diary entry ${date} has an invalid meals object.`);
                continue;
            }
            for (const meal of MEAL_KEYS) {
                if (rawLog.meals[meal] !== undefined && !Array.isArray(rawLog.meals[meal])) {
                    errors.push(`${date} ${meal} must be an array.`);
                    continue;
                }
                const count = Array.isArray(rawLog.meals[meal]) ? rawLog.meals[meal].length : 0;
                if (count > 500) errors.push(`${date} ${meal} exceeds 500 entries.`);
                foodCount += count;
            }
            if (errors.length >= 20) break;
        }
        if (foodCount > 20000) errors.push('The diary contains too many food entries to import safely.');
    }

    if (isPlainObject(rawValue.apiKeys)
        && Object.values(rawValue.apiKeys).some(value => typeof value === 'string' && value.trim())) {
        warnings.push('API credentials in the file will be ignored.');
    }
    return { ok: errors.length === 0, errors: [...new Set(errors)].slice(0, 20), warnings };
}

function sanitizeUrlString(value) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return value;
    try {
        const url = new URL(value);
        for (const key of [...url.searchParams.keys()]) {
            if (SECRET_KEY_PATTERN.test(key) || /^(?:key|token)$/i.test(key)) url.searchParams.delete(key);
        }
        return url.toString();
    } catch {
        return value;
    }
}

function sanitizeSecrets(value, seen = new WeakSet()) {
    if (typeof value === 'string') return sanitizeUrlString(value);
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) throw new TypeError('State cannot contain circular references.');
    seen.add(value);
    if (Array.isArray(value)) {
        const result = value.map(item => sanitizeSecrets(item, seen));
        seen.delete(value);
        return result;
    }
    const result = {};
    for (const [key, child] of Object.entries(value)) {
        if (FORBIDDEN_OBJECT_KEYS.has(key) || key === 'apiKeys' || SECRET_KEY_PATTERN.test(key)) continue;
        result[key] = sanitizeSecrets(child, seen);
    }
    seen.delete(value);
    return result;
}

/** Return a deep-cloned state safe to export or place in a backup. */
export function sanitizeStateForExport(state) {
    const sanitized = sanitizeSecrets(state);
    sanitized.schemaVersion = SCHEMA_VERSION;
    return sanitized;
}

/** Create a formatted, secret-free JSON export. */
export function createExportJson(state, spacing = 2) {
    return JSON.stringify(sanitizeStateForExport(state), null, spacing);
}

/**
 * Parse, validate, migrate, and merge an imported backup. Imported credentials
 * are always ignored; existing on-device credentials are retained.
 */
export function importStateFromJson(jsonText, options = {}) {
    if (typeof jsonText !== 'string') throw new StateImportError(['The import must be JSON text.']);
    const maxBytes = Number(options.maxBytes) > 0 ? Number(options.maxBytes) : 5 * 1024 * 1024;
    if (new TextEncoder().encode(jsonText).byteLength > maxBytes) {
        throw new StateImportError([`The backup is larger than the ${Math.round(maxBytes / 1048576)} MB limit.`]);
    }
    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        throw new StateImportError(['The selected file is not valid JSON.']);
    }
    const validation = validateImportPayload(parsed);
    if (!validation.ok) throw new StateImportError(validation.errors);
    const state = migrateState(parsed, { now: options.now, includeSecrets: false });
    state.apiKeys = normalizeApiKeys(options.existingState?.apiKeys, true);
    return { state, warnings: validation.warnings };
}

function assertStorage(storage) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
        throw new TypeError('A Storage-compatible object is required.');
    }
}

/** Save a validated, secret-free recovery snapshot. */
export function saveLastKnownGoodSnapshot(storage, state) {
    assertStorage(storage);
    const json = createExportJson(state, 0);
    storage.setItem(LAST_KNOWN_GOOD_STORAGE_KEY, json);
    return json;
}

/** Load the recovery snapshot while retaining current device credentials. */
export function loadLastKnownGoodSnapshot(storage, options = {}) {
    assertStorage(storage);
    const json = storage.getItem(LAST_KNOWN_GOOD_STORAGE_KEY);
    if (!json) return null;
    return importStateFromJson(json, options).state;
}

/** Persist schema-v3 state and update the last-known-good recovery copy. */
export function persistStateWithBackup(storage, state, options = {}) {
    assertStorage(storage);
    const normalized = migrateState(state, { now: options.now, includeSecrets: true });
    storage.setItem(options.primaryKey || PRIMARY_STORAGE_KEY, JSON.stringify(normalized));
    saveLastKnownGoodSnapshot(storage, normalized);
    return normalized;
}

/** Load primary storage and fall back to the secret-free recovery snapshot. */
export function loadStateWithRecovery(storage, options = {}) {
    assertStorage(storage);
    const errors = [];
    const primaryKey = options.primaryKey || PRIMARY_STORAGE_KEY;
    const primaryJson = storage.getItem(primaryKey);
    if (primaryJson) {
        try {
            const parsed = JSON.parse(primaryJson);
            const validation = validateImportPayload(parsed);
            if (!validation.ok) throw new StateImportError(validation.errors);
            return {
                state: migrateState(parsed, { now: options.now, includeSecrets: true }),
                recovered: false,
                errors
            };
        } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
        }
    }
    try {
        const recovered = loadLastKnownGoodSnapshot(storage, options);
        if (recovered) return { state: recovered, recovered: true, errors };
    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
    }
    return { state: createDefaultState(options.now), recovered: false, errors };
}

/** Create a session-only undo history. */
export function createUndoHistory(initialState) {
    return { past: [], present: safeClone(initialState), future: [] };
}

/** Commit the next application state, retaining at most 20 prior states. */
export function commitUndoState(history, nextState, options = {}) {
    const at = toIsoOrNull(options.at) || new Date().toISOString();
    const entry = {
        state: safeClone(history.present),
        label: cleanString(options.label, '', 160) || null,
        at
    };
    return {
        past: [...history.past, entry].slice(-MAX_UNDO_ENTRIES),
        present: safeClone(nextState),
        future: []
    };
}

/** Undo one committed application-state change. */
export function undoState(history) {
    if (!history.past.length) return history;
    const previous = history.past[history.past.length - 1];
    const currentEntry = { state: safeClone(history.present), label: previous.label, at: previous.at };
    return {
        past: history.past.slice(0, -1),
        present: safeClone(previous.state),
        future: [currentEntry, ...history.future].slice(0, MAX_UNDO_ENTRIES)
    };
}

/** Redo one previously undone application-state change. */
export function redoState(history) {
    if (!history.future.length) return history;
    const next = history.future[0];
    const currentEntry = { state: safeClone(history.present), label: next.label, at: next.at };
    return {
        past: [...history.past, currentEntry].slice(-MAX_UNDO_ENTRIES),
        present: safeClone(next.state),
        future: history.future.slice(1)
    };
}

/**
 * Run an immutable reducer through the bounded undo history. Reducers should
 * return the original state object for no-op actions.
 */
export function reduceUndoHistory(history, action, reducer) {
    if (action?.type === 'macroflow/undo') return undoState(history);
    if (action?.type === 'macroflow/redo') return redoState(history);
    if (action?.type === 'macroflow/clear-undo') {
        return { past: [], present: safeClone(history.present), future: [] };
    }
    const nextState = reducer(history.present, action);
    if (Object.is(nextState, history.present)) return history;
    return commitUndoState(history, nextState, {
        label: action?.meta?.undoLabel ?? action?.label,
        at: action?.meta?.at
    });
}
