/**
 * MacroFlow personal food library, saved meals, and recipes.
 *
 * The module owns only its injected DOM. Application state is read and written
 * through the adapter passed to installFeatureHub(), which keeps it usable with
 * the legacy browser app as well as the schema-v3 state core.
 */

const INSTALL_KEY = Symbol.for('macroflow.featureHub');
const MEAL_KEYS = Object.freeze(['breakfast', 'lunch', 'dinner', 'snacks']);
const MACRO_KEYS = Object.freeze(['calories', 'protein', 'carbs', 'fats']);
const MICRO_KEYS = Object.freeze([
    'vita', 'vitd', 'vite', 'vitk', 'vitc', 'thiamin', 'riboflavin',
    'niacin', 'pantothenic', 'vitb6', 'biotin', 'folate', 'vitb12',
    'calcium', 'iron', 'magnesium', 'phosphorus', 'zinc', 'copper',
    'manganese', 'selenium', 'iodine', 'chromium', 'molybdenum',
    'potassium', 'sodium'
]);
const RICH_KEYS = Object.freeze([
    'fiber', 'totalSugar', 'addedSugar', 'saturatedFat', 'transFat',
    'cholesterol', 'caffeine'
]);
const ALL_KEYS = Object.freeze([...MACRO_KEYS, ...MICRO_KEYS, ...RICH_KEYS]);
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function finiteOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function positiveOr(value, fallback = 1) {
    const parsed = finiteOrNull(value);
    return parsed !== null && parsed > 0 ? parsed : fallback;
}

function rounded(value, precision = 4) {
    const factor = 10 ** precision;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

function nutrientValue(food, key) {
    if (MACRO_KEYS.includes(key)) return finiteOrNull(food?.[key]);
    if (MICRO_KEYS.includes(key)) return finiteOrNull(food?.micros?.[key]);
    return finiteOrNull(food?.otherNutrients?.[key]);
}

function setNutrientValue(food, key, value) {
    if (MACRO_KEYS.includes(key)) {
        food[key] = value;
        return;
    }
    if (MICRO_KEYS.includes(key)) {
        food.micros ||= {};
        food.micros[key] = value;
        return;
    }
    food.otherNutrients ||= {};
    food.otherNutrients[key] = value;
}

function rebuildCoverage(food) {
    const known = ALL_KEYS.filter(key => nutrientValue(food, key) !== null);
    const unknown = ALL_KEYS.filter(key => nutrientValue(food, key) === null);
    food.nutrientCoverage = {
        known,
        unknown,
        ratio: rounded(known.length / ALL_KEYS.length, 3)
    };
    return food;
}

/**
 * Scale a food snapshot without mutating the source. Null nutrient values remain
 * unknown instead of being converted to misleading zeroes.
 */
export function scaleFoodSnapshot(food, factor = 1) {
    const safeFactor = Math.max(0, finiteOrNull(factor) ?? 0);
    const scaled = cloneValue(food || {});
    for (const key of ALL_KEYS) {
        const value = nutrientValue(food, key);
        setNutrientValue(scaled, key, value === null ? null : rounded(value * safeFactor));
    }
    scaled.servingSize = rounded(positiveOr(food?.servingSize, 1) * safeFactor);
    scaled.baseNutrition = {
        calories: scaled.calories,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fats: scaled.fats,
        servingSize: scaled.servingSize,
        servingUnit: scaled.servingUnit || food?.servingUnit || 'g',
        micros: cloneValue(scaled.micros || {}),
        otherNutrients: cloneValue(scaled.otherNutrients || {})
    };
    return rebuildCoverage(scaled);
}

function itemFactor(item) {
    const food = item?.food || item?.snapshot || item || {};
    return positiveOr(item?.quantity, positiveOr(food.servingSize, 1))
        / positiveOr(food.servingSize, 1);
}

/**
 * Return scaled food snapshots for a saved meal or recipe.
 * `requestedServings` is how many servings will be logged; `template.servings`
 * describes how many servings the stored ingredient batch makes.
 */
export function scaleMealOrRecipe(template, requestedServings = 1) {
    const items = Array.isArray(template?.items)
        ? template.items
        : Array.isArray(template?.ingredients) ? template.ingredients : [];
    const servingFactor = positiveOr(requestedServings, 1) / positiveOr(template?.servings, 1);
    return items.map(item => {
        const food = item?.food || item?.snapshot || item || {};
        return scaleFoodSnapshot(food, itemFactor(item) * servingFactor);
    });
}

/** Alias kept deliberately explicit for callers that only handle recipes. */
export function scaleRecipe(recipe, requestedServings = 1) {
    return scaleMealOrRecipe(recipe, requestedServings);
}

/** Alias kept deliberately explicit for callers that only handle saved meals. */
export function scaleSavedMeal(savedMeal, requestedServings = 1) {
    return scaleMealOrRecipe(savedMeal, requestedServings);
}

/**
 * Sum a list of template items while retaining coverage information. Values are
 * known subtotals; coverage.incomplete reports nutrients missing from any item.
 */
export function calculateNutritionTotals(items, options = {}) {
    const list = Array.isArray(items) ? items : [];
    const externalScale = Math.max(0, finiteOrNull(options.scale) ?? 1);
    const totals = Object.fromEntries(ALL_KEYS.map(key => [key, 0]));
    const knownCounts = Object.fromEntries(ALL_KEYS.map(key => [key, 0]));
    const missingCounts = Object.fromEntries(ALL_KEYS.map(key => [key, 0]));

    for (const item of list) {
        const food = item?.food || item?.snapshot || item || {};
        const factor = (item?.food || item?.snapshot ? itemFactor(item) : 1) * externalScale;
        for (const key of ALL_KEYS) {
            const value = nutrientValue(food, key);
            if (value === null) {
                missingCounts[key] += 1;
            } else {
                knownCounts[key] += 1;
                totals[key] += value * factor;
            }
        }
    }

    const result = {
        calories: null,
        protein: null,
        carbs: null,
        fats: null,
        micros: {},
        otherNutrients: {},
        coverage: { known: [], unknown: [], incomplete: [], ratio: 0 }
    };
    for (const key of ALL_KEYS) {
        const value = knownCounts[key] ? rounded(totals[key]) : null;
        setNutrientValue(result, key, value);
        if (knownCounts[key]) result.coverage.known.push(key);
        else result.coverage.unknown.push(key);
        if (missingCounts[key]) result.coverage.incomplete.push(key);
    }
    result.coverage.ratio = list.length
        ? rounded(result.coverage.known.length / ALL_KEYS.length, 3)
        : 0;
    return result;
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function mealName(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Breakfast';
}

function formatNumber(value, digits = 0) {
    const parsed = finiteOrNull(value);
    if (parsed === null) return 'Unknown';
    return parsed.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function foodIdentity(food) {
    return String(food?.foodId || food?.id || '').trim();
}

function uniqueFoods(foods) {
    const seen = new Set();
    return (Array.isArray(foods) ? foods : []).filter(food => {
        const key = foodIdentity(food) || `${food?.name}|${food?.store}|${food?.servingSize}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function allDiaryFoods(state) {
    const result = [];
    const logs = state?.dailyLogs || {};
    Object.keys(logs).sort().reverse().forEach(date => {
        for (const meal of MEAL_KEYS) {
            for (const food of logs[date]?.meals?.[meal] || []) result.push(food);
        }
    });
    return result;
}

function currentDiaryEntries(state) {
    const date = state?.currentDate;
    const log = state?.dailyLogs?.[date];
    const result = [];
    for (const meal of MEAL_KEYS) {
        for (const food of log?.meals?.[meal] || []) result.push({ food, meal, date });
    }
    return result;
}

function defaultRecordId(prefix) {
    if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function ensureFeatureCollections(state) {
    state.personalFoodLibrary ||= [];
    state.favoriteFoodIds ||= [];
    state.recentFoodIds ||= [];
    state.recentScans ||= [];
    state.savedMeals ||= [];
    state.recipes ||= [];
    state.barcodeOverrides ||= {};
    state.dailyLogs ||= {};
    return state;
}

function appendScaledTemplate(state, template, requestedServings, meal, stateCore, kind) {
    ensureFeatureCollections(state);
    const date = state.currentDate || (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    })();
    state.dailyLogs[date] ||= { meals: {}, water: 0 };
    state.dailyLogs[date].meals ||= {};
    for (const key of MEAL_KEYS) state.dailyLogs[date].meals[key] ||= [];
    const now = new Date().toISOString();
    const createId = stateCore?.createRecordId || defaultRecordId;
    const scaled = scaleMealOrRecipe(template, requestedServings);
    for (const snapshot of scaled) {
        const entry = {
            ...snapshot,
            id: createId('entry'),
            foodId: snapshot.foodId || snapshot.id || createId('food'),
            timestamp: now,
            lastUsedAt: now,
            copiedFrom: `${kind}:${template.id}`
        };
        state.dailyLogs[date].meals[meal].push(entry);
        const recentId = foodIdentity(entry);
        if (recentId) {
            state.recentFoodIds = [recentId, ...state.recentFoodIds.filter(id => id !== recentId)].slice(0, 50);
        }
    }
    return scaled.length;
}

function featureStyles() {
    return `
        .mfh-launcher { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:.85rem; align-items:center; padding:1rem; border:1px solid var(--mf-border,rgba(165,214,192,.13)); border-radius:1.25rem; background:linear-gradient(145deg,rgba(22,41,33,.97),rgba(12,25,20,.98)); box-shadow:0 14px 36px rgba(0,0,0,.19); }
        .mfh-launcher-copy { min-width:0; }
        .mfh-launcher-title { display:block; color:var(--mf-text,#f3f8f5); font:800 .95rem/1.25 'Outfit',sans-serif; }
        .mfh-launcher-meta { display:block; margin-top:.2rem; color:var(--mf-text-muted,#a5b8ae); font-size:.75rem; line-height:1.4; }
        .mfh-launcher-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:.5rem; }
        .mfh-primary,.mfh-secondary,.mfh-icon,.mfh-tab { min-height:44px; border:0; border-radius:.8rem; font:800 .8rem/1.2 'Plus Jakarta Sans',sans-serif; cursor:pointer; }
        .mfh-primary { padding:.7rem 1rem; color:#062319; background:var(--mf-brand,#2dcc86); }
        .mfh-primary:hover { background:#42dda0; }
        .mfh-secondary { padding:.65rem .85rem; color:var(--mf-text,#f3f8f5); border:1px solid var(--mf-border,rgba(165,214,192,.13)); background:rgba(26,43,36,.86); }
        .mfh-secondary:hover { border-color:var(--mf-border-strong,rgba(90,222,164,.28)); background:rgba(35,57,47,.9); }
        .mfh-danger { color:#fecdd3; border-color:rgba(251,113,133,.3); background:rgba(80,23,35,.48); }
        .mfh-grow { flex:1 1 0; }
        .mfh-icon { width:44px; padding:0; color:var(--mf-text-muted,#a5b8ae); background:transparent; }
        .mfh-icon:hover { color:#fff; background:rgba(255,255,255,.06); }
        .mfh-modal[hidden] { display:none !important; }
        .mfh-modal { position:fixed; inset:0; z-index:1080; display:flex; align-items:flex-end; justify-content:center; padding-top:max(.75rem,env(safe-area-inset-top)); background:rgba(0,0,0,.66); backdrop-filter:blur(7px); }
        .mfh-backdrop { position:absolute; inset:0; width:100%; min-height:100%; border:0; border-radius:0; opacity:0; cursor:default; }
        .mfh-sheet { position:relative; display:grid; grid-template-rows:auto auto auto minmax(0,1fr); width:min(100%,46rem); height:min(94dvh,56rem); overflow:hidden; color:var(--mf-text,#f3f8f5); border:1px solid var(--mf-border-strong,rgba(90,222,164,.28)); border-bottom:0; border-radius:1.5rem 1.5rem 0 0; background:linear-gradient(180deg,#111e19,#09110e); box-shadow:0 -24px 80px rgba(0,0,0,.5); }
        .mfh-header { display:grid; grid-template-columns:44px minmax(0,1fr) 44px; align-items:center; gap:.6rem; padding:.8rem 1rem; border-bottom:1px solid var(--mf-border,rgba(165,214,192,.13)); }
        .mfh-title { margin:0; text-align:center; font:800 1.05rem/1.25 'Outfit',sans-serif; }
        .mfh-meal-picker { display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding:.65rem 1rem; color:var(--mf-text-muted,#a5b8ae); font-size:.78rem; }
        .mfh-meal-picker select,.mfh-toolbar input,.mfh-toolbar select,.mfh-form input,.mfh-form select,.mfh-form textarea,.mfh-serving-input { min-height:44px; color:var(--mf-text,#f3f8f5); border:1px solid var(--mf-border,rgba(165,214,192,.13)); border-radius:.75rem; background:#0b1612; font-size:.85rem; }
        .mfh-meal-picker select { min-width:8rem; padding:.5rem .7rem; }
        .mfh-tabs { display:grid; grid-template-columns:repeat(3,1fr); gap:.35rem; margin:0 1rem; padding:.25rem; border-radius:.9rem; background:rgba(0,0,0,.24); }
        .mfh-tab { padding:.6rem; color:var(--mf-text-muted,#a5b8ae); background:transparent; }
        .mfh-tab[aria-selected='true'] { color:#092318; background:var(--mf-brand,#2dcc86); }
        .mfh-body { min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom)); }
        .mfh-toolbar { position:sticky; top:-1rem; z-index:2; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:.55rem; padding:0 0 .8rem; background:linear-gradient(#0b1511 78%,transparent); }
        .mfh-toolbar input { width:100%; padding:.65rem .8rem; }
        .mfh-toolbar select { max-width:9.5rem; padding:.55rem .65rem; }
        .mfh-toolbar .mfh-primary { grid-column:1/-1; width:100%; }
        .mfh-list { display:grid; gap:.7rem; }
        .mfh-card { display:grid; gap:.65rem; padding:.9rem; border:1px solid var(--mf-border,rgba(165,214,192,.13)); border-radius:1rem; background:linear-gradient(145deg,rgba(23,39,32,.94),rgba(14,27,22,.98)); }
        .mfh-card[data-archived='true'] { opacity:.68; }
        .mfh-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:.75rem; }
        .mfh-card-title { margin:0; color:#fff; font:800 .92rem/1.3 'Outfit',sans-serif; overflow-wrap:anywhere; }
        .mfh-card-meta,.mfh-card-nutrition { color:var(--mf-text-muted,#a5b8ae); font-size:.75rem; line-height:1.45; }
        .mfh-card-nutrition { display:flex; flex-wrap:wrap; gap:.35rem .8rem; }
        .mfh-card-actions { display:flex; flex-wrap:wrap; gap:.45rem; }
        .mfh-card-actions .mfh-secondary { flex:1 1 auto; }
        .mfh-favorite { flex:0 0 44px !important; padding:0 !important; font-size:1rem; }
        .mfh-serving { display:flex; align-items:center; gap:.5rem; color:var(--mf-text-muted,#a5b8ae); font-size:.75rem; }
        .mfh-serving-input { width:5rem; padding:.5rem; }
        .mfh-empty { display:grid; place-items:center; min-height:13rem; padding:2rem 1rem; text-align:center; color:var(--mf-text-muted,#a5b8ae); border:1px dashed var(--mf-border-strong,rgba(90,222,164,.28)); border-radius:1rem; }
        .mfh-empty strong { display:block; margin-bottom:.35rem; color:var(--mf-text,#f3f8f5); font-size:.95rem; }
        .mfh-confirm { display:grid; gap:.75rem; margin-bottom:.85rem; padding:.85rem; color:#ffe5e8; border:1px solid rgba(251,113,133,.34); border-radius:1rem; background:rgba(72,20,31,.52); }
        .mfh-confirm-actions { display:flex; gap:.5rem; }
        .mfh-editor[hidden] { display:none; }
        .mfh-editor { position:absolute; inset:0; z-index:4; display:grid; grid-template-rows:auto minmax(0,1fr); background:linear-gradient(180deg,#111e19,#09110e); }
        .mfh-editor-head { display:grid; grid-template-columns:44px minmax(0,1fr) 44px; align-items:center; padding:.8rem 1rem; border-bottom:1px solid var(--mf-border,rgba(165,214,192,.13)); }
        .mfh-editor-head h3 { margin:0; text-align:center; font:800 1rem/1.2 'Outfit',sans-serif; }
        .mfh-form { min-height:0; overflow-y:auto; display:grid; align-content:start; gap:.9rem; padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom)); }
        .mfh-field { display:grid; gap:.35rem; color:var(--mf-text-muted,#a5b8ae); font-size:.76rem; font-weight:700; }
        .mfh-form input,.mfh-form select,.mfh-form textarea { width:100%; padding:.65rem .75rem; }
        .mfh-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.7rem; }
        .mfh-picker-list { display:grid; gap:.5rem; }
        .mfh-picker-row { display:grid; grid-template-columns:44px minmax(0,1fr) 6rem; align-items:center; gap:.55rem; padding:.55rem; border:1px solid var(--mf-border,rgba(165,214,192,.13)); border-radius:.8rem; background:rgba(15,28,23,.8); }
        .mfh-picker-row input[type='checkbox'] { width:22px; height:22px; margin:auto; accent-color:var(--mf-brand,#2dcc86); }
        .mfh-picker-name { min-width:0; color:var(--mf-text,#f3f8f5); font-size:.8rem; font-weight:750; overflow-wrap:anywhere; }
        .mfh-picker-name small { display:block; margin-top:.18rem; color:var(--mf-text-muted,#a5b8ae); font-size:.68rem; font-weight:500; }
        .mfh-inline-status { min-height:1.2rem; color:var(--mf-text-muted,#a5b8ae); font-size:.75rem; }
        .mfh-primary:focus-visible,.mfh-secondary:focus-visible,.mfh-icon:focus-visible,.mfh-tab:focus-visible,.mfh-modal input:focus-visible,.mfh-modal select:focus-visible,.mfh-modal textarea:focus-visible { outline:3px solid rgba(45,204,134,.5); outline-offset:2px; }
        @media (min-width:640px) { .mfh-modal { align-items:center; padding:1rem; } .mfh-sheet { height:min(92dvh,56rem); border-bottom:1px solid var(--mf-border-strong,rgba(90,222,164,.28)); border-radius:1.5rem; } .mfh-toolbar { grid-template-columns:minmax(0,1fr) 10rem auto; } .mfh-toolbar .mfh-primary { grid-column:auto; width:auto; } }
        @media (max-width:359px) { .mfh-launcher { grid-template-columns:1fr; } .mfh-launcher-actions { justify-content:stretch; } .mfh-launcher .mfh-primary,.mfh-launcher .mfh-secondary { flex:1; } .mfh-grid { grid-template-columns:1fr; } .mfh-picker-row { grid-template-columns:40px minmax(0,1fr); } .mfh-picker-row input[type='number'] { grid-column:2; width:100%; } }
        @media (prefers-reduced-motion:reduce) { .mfh-modal * { scroll-behavior:auto !important; transition:none !important; animation:none !important; } }
    `;
}

/**
 * Install the feature hub.
 *
 * Required adapter methods:
 *   getState(), setState(nextState, undoLabel)
 * Supported adapter methods:
 *   save(), renderAll(), showToast(message, isError),
 *   openPortion(food, meal), getCurrentMeal(), stateCore
 */
export function installFeatureHub(api = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('installFeatureHub requires a browser document.');
    }
    if (window[INSTALL_KEY]) return window[INSTALL_KEY];
    if (typeof api.getState !== 'function' || typeof api.setState !== 'function') {
        throw new TypeError('installFeatureHub requires getState() and setState(nextState, label).');
    }

    const stateCore = api.stateCore || window.MacroFlowStateCore || {};
    const createId = stateCore.createRecordId || defaultRecordId;
    let activeTab = 'foods';
    let filter = 'all';
    let query = '';
    let selectedMeal = MEAL_KEYS.includes(api.getCurrentMeal?.()) ? api.getCurrentMeal() : 'breakfast';
    let restoreFocus = null;
    let editorState = null;
    let confirmAction = null;

    const style = document.createElement('style');
    style.id = 'mf-feature-hub-styles';
    style.textContent = featureStyles();
    document.head.appendChild(style);

    const launcher = document.createElement('section');
    launcher.id = 'mf-add-food-hub';
    launcher.className = 'mfh-launcher';
    launcher.setAttribute('aria-label', 'Add food');
    launcher.innerHTML = `
        <div class="mfh-launcher-copy">
            <strong class="mfh-launcher-title">Add food</strong>
            <span class="mfh-launcher-meta">Search, scan a barcode, use an AI photo, quick log, or choose from your library.</span>
        </div>
        <div class="mfh-launcher-actions">
            <button type="button" class="mfh-primary" data-action="add-food">Add food</button>
            <button type="button" class="mfh-secondary" data-action="open">Library</button>
        </div>
    `;
    const nutritionSection = document.getElementById('tab-content-nutrition');
    const primaryActions = nutritionSection?.querySelector('section[aria-label="Add food"]');
    if (primaryActions) {
        primaryActions.hidden = true;
        primaryActions.classList.add('mf-consolidated-hidden');
        primaryActions.setAttribute('aria-hidden', 'true');
        primaryActions.insertAdjacentElement('afterend', launcher);
    }
    else (document.querySelector('main') || document.body).appendChild(launcher);

    const modal = document.createElement('div');
    modal.id = 'modal-feature-hub';
    modal.className = 'mfh-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'mf-feature-hub-title');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <button type="button" class="mfh-backdrop" data-action="close" aria-label="Close food library"></button>
        <section class="mfh-sheet" aria-label="Food library workspace">
            <header class="mfh-header">
                <span aria-hidden="true"></span>
                <h2 class="mfh-title" id="mf-feature-hub-title">Your foods</h2>
                <button type="button" class="mfh-icon" data-action="close" aria-label="Close food library">&#10005;</button>
            </header>
            <label class="mfh-meal-picker" for="mf-feature-meal">
                <span>Log items to</span>
                <select id="mf-feature-meal">
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snacks">Snacks</option>
                </select>
            </label>
            <div class="mfh-tabs" role="tablist" aria-label="Library sections">
                <button type="button" class="mfh-tab" role="tab" data-tab="foods" aria-controls="mf-feature-list" aria-selected="true">Foods</button>
                <button type="button" class="mfh-tab" role="tab" data-tab="meals" aria-controls="mf-feature-list" aria-selected="false" tabindex="-1">Meals</button>
                <button type="button" class="mfh-tab" role="tab" data-tab="recipes" aria-controls="mf-feature-list" aria-selected="false" tabindex="-1">Recipes</button>
            </div>
            <main class="mfh-body">
                <div class="mfh-toolbar">
                    <label class="mfh-field" for="mf-feature-search"><span class="mf-sr-only">Search this section</span><input id="mf-feature-search" type="search" placeholder="Search your foods" autocomplete="off"></label>
                    <label class="mfh-field" for="mf-feature-filter"><span class="mf-sr-only">Filter this section</span><select id="mf-feature-filter"></select></label>
                    <button type="button" class="mfh-primary" data-action="new">Create food</button>
                </div>
                <section id="mf-feature-confirm" class="mfh-confirm" hidden aria-live="assertive">
                    <strong></strong>
                    <span></span>
                    <div class="mfh-confirm-actions">
                        <button type="button" class="mfh-secondary mfh-grow" data-action="cancel-confirm">Cancel</button>
                        <button type="button" class="mfh-secondary mfh-grow mfh-danger" data-action="confirm">Delete</button>
                    </div>
                </section>
                <section id="mf-feature-list" class="mfh-list" role="tabpanel" aria-live="polite"></section>
                <p class="mfh-inline-status" id="mf-feature-status" role="status" aria-live="polite"></p>
            </main>
            <section class="mfh-editor" id="mf-feature-editor" hidden aria-labelledby="mf-feature-editor-title">
                <header class="mfh-editor-head">
                    <button type="button" class="mfh-icon" data-action="close-editor" aria-label="Back to library">&#8592;</button>
                    <h3 id="mf-feature-editor-title">Edit</h3>
                    <span aria-hidden="true"></span>
                </header>
                <form class="mfh-form" id="mf-feature-form"></form>
            </section>
        </section>
    `;
    document.body.appendChild(modal);

    const mealSelect = modal.querySelector('#mf-feature-meal');
    const searchInput = modal.querySelector('#mf-feature-search');
    const filterSelect = modal.querySelector('#mf-feature-filter');
    const newButton = modal.querySelector('[data-action="new"]');
    const list = modal.querySelector('#mf-feature-list');
    const title = modal.querySelector('#mf-feature-hub-title');
    const status = modal.querySelector('#mf-feature-status');
    const confirmBox = modal.querySelector('#mf-feature-confirm');
    const editor = modal.querySelector('#mf-feature-editor');
    const editorTitle = modal.querySelector('#mf-feature-editor-title');
    const form = modal.querySelector('#mf-feature-form');
    mealSelect.value = selectedMeal;

    const toast = (message, isError = false) => {
        status.textContent = message;
        api.showToast?.(message, isError);
    };

    const updateLauncher = () => {
        const state = ensureFeatureCollections(api.getState() || {});
        const visibleFoods = state.personalFoodLibrary.filter(food => !food.archived).length;
        const visibleTemplates = [...state.savedMeals, ...state.recipes].filter(record => !record.archived).length;
        launcher.querySelector('.mfh-launcher-meta').textContent = `${visibleFoods} foods and ${visibleTemplates} meal templates saved locally. Search, scan, photograph, or quick log from one menu.`;
    };

    const commit = (mutator, label) => {
        const next = ensureFeatureCollections(cloneValue(api.getState() || {}));
        mutator(next);
        api.setState(next, label);
        api.save?.();
        api.renderAll?.();
        updateLauncher();
        render();
        return next;
    };

    const resolveLibraryFood = (state, id) => state.personalFoodLibrary.find(food => food.id === id || food.foodId === id);
    const resolveRecord = (kind, id) => {
        const state = ensureFeatureCollections(api.getState() || {});
        if (kind === 'food') return resolveLibraryFood(state, id);
        if (kind === 'meal') return state.savedMeals.find(record => record.id === id);
        return state.recipes.find(record => record.id === id);
    };

    const cardNutrition = totals => {
        const row = makeElement('div', 'mfh-card-nutrition');
        const values = [
            `${formatNumber(totals.calories)} kcal`,
            `${formatNumber(totals.protein, 1)}g protein`,
            `${formatNumber(totals.carbs, 1)}g carbs`,
            `${formatNumber(totals.fats, 1)}g fat`
        ];
        values.forEach(value => row.appendChild(makeElement('span', '', value)));
        if (totals.coverage?.incomplete?.length) {
            const warning = makeElement('span', '', 'Some nutrients unknown');
            warning.title = 'Totals are known subtotals because at least one food has incomplete nutrition.';
            row.appendChild(warning);
        }
        return row;
    };

    const actionButton = (label, action, kind, id, extraClass = '') => {
        const button = makeElement('button', `mfh-secondary ${extraClass}`.trim(), label);
        button.type = 'button';
        button.dataset.action = action;
        button.dataset.kind = kind;
        button.dataset.id = id;
        return button;
    };

    const renderFoodCard = (food, state, options = {}) => {
        const card = makeElement('article', 'mfh-card');
        card.dataset.id = food.id;
        card.dataset.archived = String(Boolean(food.archived));
        const head = makeElement('div', 'mfh-card-head');
        const copy = makeElement('div');
        copy.appendChild(makeElement('h3', 'mfh-card-title', food.name || 'Unnamed food'));
        const source = food.brand || food.store || food.source?.kind || 'Personal food';
        copy.appendChild(makeElement('div', 'mfh-card-meta', `${source} · ${formatNumber(food.servingSize, 1)} ${food.servingUnit || 'g'}`));
        head.appendChild(copy);
        const favoriteId = foodIdentity(food);
        const favorite = state.favoriteFoodIds.includes(favoriteId) || state.favoriteFoodIds.includes(food.id);
        const favoriteButton = actionButton(favorite ? '★' : '☆', 'favorite', 'food', food.id, 'mfh-favorite');
        favoriteButton.setAttribute('aria-label', favorite ? `Remove ${food.name} from favorites` : `Add ${food.name} to favorites`);
        favoriteButton.setAttribute('aria-pressed', String(favorite));
        head.appendChild(favoriteButton);
        card.appendChild(head);
        card.appendChild(cardNutrition(calculateNutritionTotals([food])));
        if (options.scan) {
            card.appendChild(makeElement('div', 'mfh-card-meta', `Recent scan ${options.scan.gtin || ''} · ${new Date(options.scan.scannedAt || 0).toLocaleDateString()}`));
        }
        const actions = makeElement('div', 'mfh-card-actions');
        actions.appendChild(actionButton('Log again', 'log-food', 'food', food.id));
        actions.appendChild(actionButton('Edit', 'edit', 'food', food.id));
        actions.appendChild(actionButton(food.archived ? 'Restore' : 'Archive', 'archive', 'food', food.id));
        actions.appendChild(actionButton('Delete', 'delete', 'food', food.id, 'mfh-danger'));
        card.appendChild(actions);
        return card;
    };

    const renderUnresolvedScan = scan => {
        const card = makeElement('article', 'mfh-card');
        const head = makeElement('div', 'mfh-card-head');
        const copy = makeElement('div');
        copy.appendChild(makeElement('h3', 'mfh-card-title', scan.gtin || 'Unknown barcode'));
        copy.appendChild(makeElement('div', 'mfh-card-meta', 'This scan has no saved product yet. Scan its nutrition label to create it.'));
        head.appendChild(copy);
        card.appendChild(head);
        return card;
    };

    const renderTemplateCard = (record, kind) => {
        const items = kind === 'meal' ? record.items || [] : record.ingredients || [];
        const perServing = calculateNutritionTotals(items, { scale: 1 / positiveOr(record.servings, 1) });
        const card = makeElement('article', 'mfh-card');
        card.dataset.id = record.id;
        card.dataset.archived = String(Boolean(record.archived));
        const head = makeElement('div', 'mfh-card-head');
        const copy = makeElement('div');
        copy.appendChild(makeElement('h3', 'mfh-card-title', record.name));
        copy.appendChild(makeElement('div', 'mfh-card-meta', `${items.length} ${items.length === 1 ? 'item' : 'items'} · Makes ${formatNumber(record.servings, 1)} servings`));
        head.appendChild(copy);
        card.appendChild(head);
        card.appendChild(cardNutrition(perServing));
        const servingRow = makeElement('label', 'mfh-serving');
        servingRow.append('Servings to log');
        const servingInput = makeElement('input', 'mfh-serving-input');
        servingInput.type = 'number';
        servingInput.min = '0.1';
        servingInput.max = '100';
        servingInput.step = '0.1';
        servingInput.value = '1';
        servingInput.dataset.role = 'servings';
        servingInput.setAttribute('aria-label', `Servings of ${record.name} to log`);
        servingRow.appendChild(servingInput);
        card.appendChild(servingRow);
        const actions = makeElement('div', 'mfh-card-actions');
        actions.appendChild(actionButton(`Log ${kind === 'meal' ? 'meal' : 'recipe'}`, 'log-template', kind, record.id));
        actions.appendChild(actionButton('Edit', 'edit', kind, record.id));
        actions.appendChild(actionButton(record.archived ? 'Restore' : 'Archive', 'archive', kind, record.id));
        actions.appendChild(actionButton('Delete', 'delete', kind, record.id, 'mfh-danger'));
        card.appendChild(actions);
        return card;
    };

    const emptyState = (heading, message) => {
        const empty = makeElement('div', 'mfh-empty');
        const wrap = makeElement('div');
        wrap.appendChild(makeElement('strong', '', heading));
        wrap.appendChild(makeElement('span', '', message));
        empty.appendChild(wrap);
        return empty;
    };

    const setFilterOptions = options => {
        const old = filterSelect.value;
        filterSelect.replaceChildren();
        options.forEach(([value, label]) => {
            const option = makeElement('option', '', label);
            option.value = value;
            filterSelect.appendChild(option);
        });
        filter = options.some(([value]) => value === filter) ? filter : options[0][0];
        filterSelect.value = options.some(([value]) => value === old) ? old : filter;
        filter = filterSelect.value;
    };

    function renderFoods(state) {
        setFilterOptions([
            ['all', 'All foods'],
            ['favorites', 'Favorites'],
            ['recent', 'Recent foods'],
            ['scans', 'Recent scans'],
            ['archived', 'Archived']
        ]);
        const library = state.personalFoodLibrary || [];
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery = food => !normalizedQuery || [food.name, food.brand, food.store, food.barcode, food.barcodeCanonical]
            .some(value => String(value || '').toLowerCase().includes(normalizedQuery));
        let foods = library.filter(matchesQuery);
        if (filter === 'favorites') {
            const favorites = new Set(state.favoriteFoodIds || []);
            foods = foods.filter(food => favorites.has(food.id) || favorites.has(foodIdentity(food))).filter(food => !food.archived);
        } else if (filter === 'recent') {
            const order = new Map((state.recentFoodIds || []).map((id, index) => [id, index]));
            foods = foods.filter(food => order.has(food.id) || order.has(foodIdentity(food))).filter(food => !food.archived)
                .sort((a, b) => (order.get(foodIdentity(a)) ?? order.get(a.id) ?? 999) - (order.get(foodIdentity(b)) ?? order.get(b.id) ?? 999));
        } else if (filter === 'archived') {
            foods = foods.filter(food => food.archived);
        } else if (filter !== 'scans') {
            foods = foods.filter(food => !food.archived);
        }

        if (filter === 'scans') {
            const scans = [...(state.recentScans || [])].reverse().filter(scan => !normalizedQuery || String(scan.gtin || '').includes(normalizedQuery));
            if (!scans.length) {
                list.appendChild(emptyState('No recent scans', 'Confirmed barcode scans will appear here without storing camera images.'));
                return;
            }
            scans.forEach(scan => {
                const food = resolveLibraryFood(state, scan.foodId);
                list.appendChild(food ? renderFoodCard(food, state, { scan }) : renderUnresolvedScan(scan));
            });
            return;
        }
        if (!foods.length) {
            list.appendChild(emptyState('No foods found', filter === 'all' ? 'Create a personal food or save one after scanning its label.' : 'Try a different filter or search.'));
            return;
        }
        foods.forEach(food => list.appendChild(renderFoodCard(food, state)));
    }

    function renderTemplates(state, kind) {
        setFilterOptions([['all', 'Active'], ['archived', 'Archived']]);
        const source = kind === 'meal' ? state.savedMeals : state.recipes;
        const normalizedQuery = query.trim().toLowerCase();
        const records = source.filter(record => {
            const archiveMatch = filter === 'archived' ? record.archived : !record.archived;
            return archiveMatch && (!normalizedQuery || String(record.name || '').toLowerCase().includes(normalizedQuery));
        });
        if (!records.length) {
            list.appendChild(emptyState(
                kind === 'meal' ? 'No saved meals' : 'No recipes',
                kind === 'meal' ? 'Create one from foods already logged on the selected day.' : 'Create a recipe from snapshots in your personal library.'
            ));
            return;
        }
        records.forEach(record => list.appendChild(renderTemplateCard(record, kind)));
    }

    function render() {
        const state = ensureFeatureCollections(api.getState() || {});
        list.replaceChildren();
        title.textContent = activeTab === 'foods' ? 'Your foods' : activeTab === 'meals' ? 'Saved meals' : 'Recipes';
        searchInput.placeholder = activeTab === 'foods' ? 'Search your foods' : activeTab === 'meals' ? 'Search saved meals' : 'Search recipes';
        newButton.textContent = activeTab === 'foods' ? 'Create food' : activeTab === 'meals' ? 'Create from diary' : 'Create recipe';
        modal.querySelectorAll('[role="tab"]').forEach(tab => {
            const selected = tab.dataset.tab === activeTab;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        });
        if (activeTab === 'foods') renderFoods(state);
        else renderTemplates(state, activeTab === 'meals' ? 'meal' : 'recipe');
    }

    const open = (tab = activeTab) => {
        if (['foods', 'meals', 'recipes'].includes(tab)) activeTab = tab;
        selectedMeal = MEAL_KEYS.includes(api.getCurrentMeal?.()) ? api.getCurrentMeal() : selectedMeal;
        mealSelect.value = selectedMeal;
        restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        modal.hidden = false;
        modal.classList.add('flex');
        modal.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('mf-modal-open');
        document.body.classList.add('mf-modal-open');
        render();
        window.requestAnimationFrame(() => modal.querySelector('[data-action="close"]:not(.mfh-backdrop)')?.focus());
    };

    const closeEditor = () => {
        editorState = null;
        form.replaceChildren();
        editor.hidden = true;
        newButton.focus();
    };

    const close = () => {
        if (editorState) closeEditor();
        confirmAction = null;
        confirmBox.hidden = true;
        modal.hidden = true;
        modal.classList.remove('flex');
        modal.setAttribute('aria-hidden', 'true');
        const anotherModal = [...document.querySelectorAll('[id^="modal-"]')].some(element => element !== modal && !element.hidden && !element.classList.contains('hidden'));
        if (!anotherModal) {
            document.documentElement.classList.remove('mf-modal-open');
            document.body.classList.remove('mf-modal-open');
        }
        restoreFocus?.focus?.({ preventScroll: true });
        restoreFocus = null;
    };

    const field = (labelText, input) => {
        const label = makeElement('label', 'mfh-field');
        label.appendChild(makeElement('span', '', labelText));
        label.appendChild(input);
        return label;
    };

    const input = (name, type = 'text', value = '') => {
        const control = makeElement('input');
        control.name = name;
        control.type = type;
        control.value = value ?? '';
        return control;
    };

    const submitButton = label => {
        const button = makeElement('button', 'mfh-primary', label);
        button.type = 'submit';
        return button;
    };

    const openFoodEditor = food => {
        editorState = { kind: 'food', id: food?.id || null };
        editorTitle.textContent = food ? 'Edit food' : 'Create personal food';
        form.replaceChildren();
        const name = input('name', 'text', food?.name || '');
        name.required = true;
        name.maxLength = 240;
        form.appendChild(field('Food name', name));
        form.appendChild(field('Brand or source', input('brand', 'text', food?.brand || food?.store || '')));
        const grid = makeElement('div', 'mfh-grid');
        const serving = input('servingSize', 'number', food?.servingSize ?? 100);
        serving.min = '0.01'; serving.step = 'any'; serving.required = true;
        const unit = input('servingUnit', 'text', food?.servingUnit || 'g');
        unit.required = true; unit.maxLength = 30;
        grid.append(field('Serving amount', serving), field('Serving unit', unit));
        for (const [key, label] of [['calories', 'Calories'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fats', 'Fat (g)']]) {
            const control = input(key, 'number', food?.[key] ?? '');
            control.min = '0'; control.step = 'any';
            grid.appendChild(field(label, control));
        }
        form.appendChild(grid);
        const note = makeElement('p', 'mfh-card-meta', 'Leave a nutrient blank when it is unknown. Blank values are not saved as zero.');
        form.append(note, submitButton(food ? 'Save changes' : 'Create food'));
        editor.hidden = false;
        name.focus();
    };

    const addPickerRow = (container, candidate, selected, quantity) => {
        const row = makeElement('label', 'mfh-picker-row');
        const check = input('selected', 'checkbox');
        check.value = candidate.key;
        check.checked = selected;
        const copy = makeElement('span', 'mfh-picker-name', candidate.food.name || 'Unnamed food');
        copy.appendChild(makeElement('small', '', candidate.meta));
        const qty = input('quantity', 'number', quantity ?? candidate.food.servingSize ?? 1);
        qty.min = '0.01'; qty.step = 'any'; qty.dataset.key = candidate.key;
        qty.setAttribute('aria-label', `Quantity of ${candidate.food.name}`);
        qty.disabled = !selected;
        check.addEventListener('change', () => { qty.disabled = !check.checked; });
        row.append(check, copy, qty);
        container.appendChild(row);
    };

    const openTemplateEditor = (kind, record) => {
        const state = ensureFeatureCollections(api.getState() || {});
        const existingItems = kind === 'meal' ? record?.items || [] : record?.ingredients || [];
        const candidates = [];
        if (kind === 'meal') {
            existingItems.forEach((item, index) => candidates.push({ key: `existing:${item.id || index}`, food: item.food, item, meta: 'Saved snapshot' }));
            currentDiaryEntries(state).forEach(({ food, meal, date }) => candidates.push({ key: `diary:${food.id}`, food, item: null, meta: `${mealName(meal)} · ${date}` }));
        } else {
            existingItems.forEach((item, index) => candidates.push({ key: `existing:${item.id || index}`, food: item.food, item, meta: 'Recipe snapshot' }));
            const available = uniqueFoods([...state.personalFoodLibrary.filter(food => !food.archived), ...currentDiaryEntries(state).map(value => value.food)]);
            available.forEach(food => candidates.push({ key: `food:${food.id}`, food, item: null, meta: food.brand || food.store || 'Personal food' }));
        }
        const uniqueCandidates = [];
        const seenKeys = new Set();
        candidates.forEach(candidate => {
            const semantic = candidate.key.startsWith('existing:') ? candidate.key : `${candidate.key.split(':')[0]}:${foodIdentity(candidate.food)}`;
            if (seenKeys.has(semantic)) return;
            seenKeys.add(semantic);
            uniqueCandidates.push(candidate);
        });
        editorState = { kind, id: record?.id || null, candidates: new Map(uniqueCandidates.map(candidate => [candidate.key, candidate])) };
        editorTitle.textContent = `${record ? 'Edit' : 'Create'} ${kind === 'meal' ? 'saved meal' : 'recipe'}`;
        form.replaceChildren();
        const name = input('name', 'text', record?.name || '');
        name.required = true; name.maxLength = 240;
        form.appendChild(field(kind === 'meal' ? 'Meal name' : 'Recipe name', name));
        const grid = makeElement('div', 'mfh-grid');
        const servings = input('servings', 'number', record?.servings ?? 1);
        servings.min = '0.1'; servings.max = '100'; servings.step = '0.1'; servings.required = true;
        grid.appendChild(field('Batch servings', servings));
        if (kind === 'meal') {
            const slot = makeElement('select');
            slot.name = 'defaultMealSlot';
            const empty = makeElement('option', '', 'Use current meal'); empty.value = '';
            slot.appendChild(empty);
            MEAL_KEYS.forEach(meal => { const option = makeElement('option', '', mealName(meal)); option.value = meal; slot.appendChild(option); });
            slot.value = record?.defaultMealSlot || '';
            grid.appendChild(field('Default destination', slot));
        }
        form.appendChild(grid);
        if (kind === 'recipe') {
            const instructions = makeElement('textarea');
            instructions.name = 'instructions'; instructions.rows = 4; instructions.maxLength = 20000;
            instructions.value = record?.instructions || '';
            form.appendChild(field('Instructions (optional)', instructions));
        }
        form.appendChild(makeElement('strong', 'mfh-card-title', kind === 'meal' ? 'Choose diary foods' : 'Choose ingredient snapshots'));
        const picker = makeElement('div', 'mfh-picker-list');
        if (!uniqueCandidates.length) picker.appendChild(emptyState('Nothing to choose yet', kind === 'meal' ? 'Log foods on this date, then create the meal.' : 'Create a personal food or log food first.'));
        uniqueCandidates.forEach(candidate => addPickerRow(picker, candidate, candidate.key.startsWith('existing:'), candidate.item?.quantity));
        form.append(picker, submitButton(record ? 'Save changes' : kind === 'meal' ? 'Save meal' : 'Save recipe'));
        editor.hidden = false;
        name.focus();
    };

    const openEditor = (kind, record = null) => {
        if (kind === 'food') openFoodEditor(record);
        else openTemplateEditor(kind, record);
    };

    const saveFood = data => {
        const now = new Date().toISOString();
        const parseNutrient = key => finiteOrNull(data.get(key));
        const existing = editorState.id ? resolveRecord('food', editorState.id) : null;
        const raw = {
            ...(existing ? cloneValue(existing) : {}),
            id: existing?.id || createId('library'),
            foodId: existing?.foodId || createId('food'),
            name: String(data.get('name') || '').trim(),
            brand: String(data.get('brand') || '').trim(),
            store: String(data.get('brand') || '').trim() || 'Personal food',
            servingSize: positiveOr(data.get('servingSize'), 1),
            servingUnit: String(data.get('servingUnit') || 'g').trim(),
            calories: parseNutrient('calories'),
            protein: parseNutrient('protein'),
            carbs: parseNutrient('carbs'),
            fats: parseNutrient('fats'),
            micros: existing?.micros || Object.fromEntries(MICRO_KEYS.map(key => [key, null])),
            otherNutrients: existing?.otherNutrients || Object.fromEntries(RICH_KEYS.map(key => [key, null])),
            source: existing?.source || { kind: 'custom', id: null, url: null, fetchedAt: null, confidence: null, verified: false },
            verification: 'user_confirmed',
            createdAt: existing?.createdAt || now,
            updatedAt: now,
            archived: Boolean(existing?.archived)
        };
        const food = typeof stateCore.normalizeFoodRecord === 'function'
            ? stateCore.normalizeFoodRecord(raw, { sourceSchemaVersion: 3, idOverride: raw.id })
            : rebuildCoverage(raw);
        commit(state => {
            const index = state.personalFoodLibrary.findIndex(candidate => candidate.id === food.id);
            if (index >= 0) state.personalFoodLibrary[index] = food;
            else state.personalFoodLibrary.unshift(food);
        }, existing ? 'Edit personal food' : 'Create personal food');
        toast(existing ? 'Food updated.' : 'Food saved to your library.');
    };

    const selectedTemplateItems = () => {
        const selected = [];
        form.querySelectorAll('input[name="selected"]:checked').forEach(check => {
            const candidate = editorState.candidates.get(check.value);
            if (!candidate) return;
            const quantityControl = form.querySelector(`input[name="quantity"][data-key="${CSS.escape(check.value)}"]`);
            const quantity = positiveOr(quantityControl?.value, positiveOr(candidate.food.servingSize, 1));
            selected.push({
                id: candidate.item?.id || createId('ingredient'),
                foodId: candidate.food.foodId || candidate.food.id || createId('food'),
                quantity,
                unit: candidate.food.servingUnit || 'g',
                food: cloneValue(candidate.food)
            });
        });
        return selected;
    };

    const saveTemplate = data => {
        const kind = editorState.kind;
        const existing = editorState.id ? resolveRecord(kind, editorState.id) : null;
        const items = selectedTemplateItems();
        if (!items.length) {
            toast(kind === 'meal' ? 'Choose at least one diary food.' : 'Choose at least one ingredient.', true);
            return false;
        }
        const now = new Date().toISOString();
        const record = {
            ...(existing ? cloneValue(existing) : {}),
            id: existing?.id || createId(kind),
            name: String(data.get('name') || '').trim(),
            servings: positiveOr(data.get('servings'), 1),
            createdAt: existing?.createdAt || now,
            updatedAt: now,
            archived: Boolean(existing?.archived)
        };
        if (kind === 'meal') {
            record.items = items;
            record.defaultMealSlot = MEAL_KEYS.includes(data.get('defaultMealSlot')) ? data.get('defaultMealSlot') : null;
        } else {
            record.ingredients = items;
            record.instructions = String(data.get('instructions') || '').trim();
        }
        commit(state => {
            const collection = kind === 'meal' ? state.savedMeals : state.recipes;
            const index = collection.findIndex(candidate => candidate.id === record.id);
            if (index >= 0) collection[index] = record;
            else collection.unshift(record);
        }, existing ? `Edit ${kind}` : `Create ${kind}`);
        toast(`${kind === 'meal' ? 'Saved meal' : 'Recipe'} saved.`);
        return true;
    };

    const askDelete = (kind, record) => {
        confirmAction = () => {
            commit(state => {
                if (kind === 'food') {
                    state.personalFoodLibrary = state.personalFoodLibrary.filter(food => food.id !== record.id);
                    const identities = new Set([record.id, foodIdentity(record)]);
                    state.favoriteFoodIds = state.favoriteFoodIds.filter(id => !identities.has(id));
                    state.recentFoodIds = state.recentFoodIds.filter(id => !identities.has(id));
                    Object.keys(state.barcodeOverrides).forEach(gtin => {
                        if (identities.has(state.barcodeOverrides[gtin]?.foodId)) delete state.barcodeOverrides[gtin];
                    });
                } else if (kind === 'meal') state.savedMeals = state.savedMeals.filter(item => item.id !== record.id);
                else state.recipes = state.recipes.filter(item => item.id !== record.id);
            }, `Delete ${kind}`);
            confirmBox.hidden = true;
            confirmAction = null;
            toast(`${kind === 'food' ? 'Food' : kind === 'meal' ? 'Saved meal' : 'Recipe'} deleted. Diary and recipe snapshots were preserved.`);
        };
        confirmBox.querySelector('strong').textContent = `Delete “${record.name}”?`;
        confirmBox.querySelector('span').textContent = kind === 'food'
            ? 'Existing diary and recipe snapshots will remain, but this food will leave your library.'
            : 'Existing diary entries will remain. This cannot be undone after the current session.';
        confirmBox.hidden = false;
        confirmBox.querySelector('[data-action="cancel-confirm"]').focus();
    };

    const onClick = event => {
        const button = event.target.closest('button[data-action], button[data-tab]');
        if (!button) return;
        if (button.dataset.tab) {
            activeTab = button.dataset.tab;
            filter = 'all'; query = ''; searchInput.value = '';
            render();
            return;
        }
        const action = button.dataset.action;
        if (action === 'add-food') {
            if (typeof api.openAddFood === 'function') api.openAddFood(selectedMeal);
            else window.dispatchEvent(new CustomEvent('macroflow:add-food', { detail: { meal: selectedMeal } }));
            return;
        }
        if (action === 'open') { open(); return; }
        if (action === 'close') { close(); return; }
        if (action === 'close-editor') { closeEditor(); return; }
        if (action === 'new') { openEditor(activeTab === 'foods' ? 'food' : activeTab === 'meals' ? 'meal' : 'recipe'); return; }
        if (action === 'cancel-confirm') { confirmAction = null; confirmBox.hidden = true; return; }
        if (action === 'confirm') { confirmAction?.(); return; }
        const kind = button.dataset.kind;
        const record = resolveRecord(kind, button.dataset.id);
        if (!record) { toast('That saved item is no longer available.', true); render(); return; }
        if (action === 'edit') { openEditor(kind, record); return; }
        if (action === 'delete') { askDelete(kind, record); return; }
        if (action === 'archive') {
            commit(state => {
                const collection = kind === 'food' ? state.personalFoodLibrary : kind === 'meal' ? state.savedMeals : state.recipes;
                const target = collection.find(item => item.id === record.id);
                if (target) target.archived = !target.archived;
            }, `${record.archived ? 'Restore' : 'Archive'} ${kind}`);
            toast(record.archived ? 'Item restored.' : 'Item archived.');
            return;
        }
        if (action === 'favorite') {
            const id = foodIdentity(record) || record.id;
            commit(state => {
                const exists = state.favoriteFoodIds.includes(id) || state.favoriteFoodIds.includes(record.id);
                state.favoriteFoodIds = exists
                    ? state.favoriteFoodIds.filter(value => value !== id && value !== record.id)
                    : [id, ...state.favoriteFoodIds];
            }, 'Toggle favorite food');
            return;
        }
        if (action === 'log-food') {
            if (typeof api.openPortion !== 'function') {
                toast('Portion logging is not connected yet.', true);
                return;
            }
            close();
            api.openPortion(cloneValue(record), selectedMeal);
            return;
        }
        if (action === 'log-template') {
            const servingsControl = button.closest('.mfh-card')?.querySelector('[data-role="servings"]');
            const requestedServings = positiveOr(servingsControl?.value, 1);
            // The visible destination picker is authoritative. A template's
            // default slot is metadata for preselection by host integrations,
            // never a hidden override of the user's current choice.
            const destination = selectedMeal;
            let count = 0;
            commit(state => { count = appendScaledTemplate(state, record, requestedServings, destination, stateCore, kind); }, `Log ${kind}`);
            toast(`${count} ${count === 1 ? 'item' : 'items'} logged to ${mealName(destination)}.`);
        }
    };

    const onSubmit = event => {
        event.preventDefault();
        if (!editorState) return;
        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        if (!name) { toast('Enter a name first.', true); return; }
        const saved = editorState.kind === 'food' ? (saveFood(data), true) : saveTemplate(data);
        if (saved) closeEditor();
    };

    const onKeyDown = event => {
        if (modal.hidden) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            if (editorState) closeEditor();
            else close();
            return;
        }
        const tab = event.target.closest('[role="tab"]');
        if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const tabs = [...modal.querySelectorAll('[role="tab"]')];
            const index = tabs.indexOf(tab);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
                : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : (index + 1) % tabs.length;
            tabs[next].focus(); tabs[next].click();
            return;
        }
        if (event.key !== 'Tab') return;
        const scope = editorState ? editor : modal.querySelector('.mfh-sheet');
        const focusable = [...scope.querySelectorAll(FOCUSABLE_SELECTOR)].filter(element => !element.hidden && element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    launcher.addEventListener('click', onClick);
    launcher.querySelector('[data-action="add-food"]').addEventListener('click', event => {
        event.stopPropagation();
        if (typeof api.openAddFood === 'function') api.openAddFood(selectedMeal);
        else window.dispatchEvent(new CustomEvent('macroflow:add-food', { detail: { meal: selectedMeal } }));
    });
    modal.addEventListener('click', onClick);
    modal.addEventListener('keydown', onKeyDown);
    form.addEventListener('submit', onSubmit);
    mealSelect.addEventListener('change', () => { if (MEAL_KEYS.includes(mealSelect.value)) selectedMeal = mealSelect.value; });
    searchInput.addEventListener('input', () => { query = searchInput.value; render(); });
    filterSelect.addEventListener('change', () => { filter = filterSelect.value; render(); });

    updateLauncher();
    const controller = {
        open,
        close,
        render,
        getSelectedMeal: () => selectedMeal,
        setSelectedMeal(meal) {
            if (!MEAL_KEYS.includes(meal)) return false;
            selectedMeal = meal;
            mealSelect.value = meal;
            return true;
        },
        destroy() {
            if (!modal.hidden) close();
            launcher.removeEventListener('click', onClick);
            modal.removeEventListener('click', onClick);
            modal.removeEventListener('keydown', onKeyDown);
            form.removeEventListener('submit', onSubmit);
            launcher.remove(); modal.remove(); style.remove();
            delete window[INSTALL_KEY];
        },
        integration: Object.freeze({
            getState: '() => schema-v3 app state (required)',
            setState: '(nextState, undoLabel) => void (required)',
            save: '() => void',
            renderAll: '() => void',
            showToast: '(message, isError) => void',
            openPortion: '(food, meal) => void',
            openAddFood: '(meal) => void',
            getCurrentMeal: '() => breakfast | lunch | dinner | snacks',
            stateCore: 'MacroFlow state-core module (optional; window fallback)'
        })
    };
    window[INSTALL_KEY] = controller;
    return controller;
}

export default installFeatureHub;
