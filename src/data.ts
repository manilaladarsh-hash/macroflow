// MacroFlow — State Schema & Rust-Backed Nutrient/Staple Food Tables (TypeScript)
// Micronutrient definitions, upper limits, RDA profiles, and the 120+ staple food database
// live in the compiled Rust crate (`crates/macroflow-core/src/staples.rs`).

const CONFIG: MacroFlowConfig = window.MACROFLOW_CONFIG || {};
const GEMINI_KEY_STORAGE = 'macroflow_gemini_key';
const USDA_KEY_STORAGE = 'macroflow_usda_key';
const GEMINI_MODELS = CONFIG.geminiModel
    ? [CONFIG.geminiModel]
    : ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-flash'];
let geminiModelIndex = 0;

function getUsdaKey({ allowDemo = false } = {}): string {
    let key = '';
    try {
        key = localStorage.getItem(USDA_KEY_STORAGE) || '';
    } catch (_e) {}
    return key || CONFIG.usdaApiKey || (allowDemo ? 'DEMO_KEY' : '');
}

function localDateKey(date: Date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localDayOffset(offset: number, date: Date = new Date()): Date {
    const shifted = new Date(date);
    shifted.setHours(12, 0, 0, 0);
    shifted.setDate(shifted.getDate() + offset);
    return shifted;
}

function createDiaryEntryId(): string {
    return 'entry_' + (window.crypto?.randomUUID?.() || Date.now() + '_' + Math.random().toString(36).slice(2));
}

let appState: AppState = {
    fasting: {
        isFasting: false,
        startDate: null,
        targetHours: 16
    },
    multiAddEnabled: false,
    targets: {
        calories: 2000, protein: 150, carbs: 200, fats: 65, water: 2.5,
        vita: 900, vitd: 15, vite: 15, vitk: 120, vitc: 90, thiamin: 1.2, riboflavin: 1.3,
        niacin: 16, pantothenic: 5, vitb6: 1.3, biotin: 30, folate: 400, vitb12: 2.4,
        calcium: 1000, iron: 8, magnesium: 400, phosphorus: 700, zinc: 11, copper: 0.9,
        manganese: 2.3, selenium: 55, iodine: 150, chromium: 35, molybdenum: 45, potassium: 3400, sodium: 2300
    },
    currentDate: localDateKey(),
    dailyLogs: {},
    bodyProfile: { sex: 'male', age: 25, heightFt: 5, heightIn: 10, weight: 165, unit: 'lbs', activityLevel: 'moderate', goal: 'recomp' },
    weightHistory: [
        { date: localDateKey(localDayOffset(-6)), value: 168.2, unit: 'lbs' },
        { date: localDateKey(localDayOffset(-5)), value: 167.4, unit: 'lbs' },
        { date: localDateKey(localDayOffset(-4)), value: 167.1, unit: 'lbs' },
        { date: localDateKey(localDayOffset(-3)), value: 166.5, unit: 'lbs' },
        { date: localDateKey(localDayOffset(-2)), value: 166.0, unit: 'lbs' },
        { date: localDateKey(localDayOffset(-1)), value: 165.2, unit: 'lbs' },
        { date: localDateKey(), value: 165.0, unit: 'lbs' }
    ],
    weighInFrequency: 7,
    strengthHistory: [
        { date: localDateKey(localDayOffset(-5)), rating: 1, notes: 'Felt very strong on bench today' },
        { date: localDateKey(localDayOffset(-3)), rating: 0, notes: 'Same energy as last time' },
        { date: localDateKey(localDayOffset(-1)), rating: 1, notes: 'Explosive military press' }
    ],
    foodFrequency: {},
    customPacks: [],
    activeTab: 'nutrition',
    calorieDisplayMode: 'consumed',
    expandedMeals: { breakfast: true, lunch: true, dinner: true, snacks: true },
    progressRange: 30,
    progressSubTab: 'weight'
};

// Loaded from the Rust WebAssembly core (`crates/macroflow-core/src/staples.rs`)
const micronutrients: MicronutrientDefinition[] = rustWasm.micronutrientDefinitions();
const upperLimits: Record<string, number> = rustWasm.upperLimits();
const rdaProfiles: Record<string, Record<string, number>> = rustWasm.rdaProfiles();
const localFoodDatabase: FoodItem[] = rustWasm.initialStapleFoods();

function enrichStapleFood(food: FoodItem, customMicros: MicronutrientMap = {}): FoodItem {
    const baseMicros: MicronutrientMap = {};
    micronutrients.forEach(m => (baseMicros[m.id] = 0));
    food.micros = { ...baseMicros, ...customMicros };
    return food;
}

function setupLocalStaples(): void {
    const full = rustWasm.fullStapleFoods();
    localFoodDatabase.length = 0;
    localFoodDatabase.push(...full);
}
