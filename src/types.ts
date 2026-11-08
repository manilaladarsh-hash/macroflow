// MacroFlow — TypeScript Domain & UI Type Definitions
// Paired with the Rust WebAssembly core engine (`crates/macroflow-core`).

interface MacroFlowConfig {
    geminiApiKey?: string;
    geminiModel?: string;
    usdaApiKey?: string;
}

interface Document {
    getElementById(elementId: string): any;
}

interface MediaTrackConstraintSet {
    focusMode?: any;
    zoom?: any;
    torch?: any;
}

interface MediaTrackCapabilities {
    torch?: boolean;
    zoom?: any;
    focusMode?: any;
}

interface Window {
    MACROFLOW_CONFIG?: MacroFlowConfig;
    ZXing?: any;
    BarcodeDetector?: any;
    BarcodeDetectorPolyfill?: any;
    BarcodeDetectionAPI?: any;
    fflate?: any;
}

interface EventTarget {
    classList?: DOMTokenList;
    closest?: (selector: string) => Element | null;
    checked?: boolean;
    value?: any;
    files?: FileList | null;
}

interface Element {
    onclick?: ((ev?: any) => any) | null;
    value?: any;
    disabled?: boolean;
    checked?: boolean;
    style?: any;
}

interface HTMLElement {
    value?: any;
    disabled?: boolean;
    checked?: boolean;
    min?: any;
    max?: any;
    step?: any;
    placeholder?: string;
    files?: FileList | null;
    src?: string;
    srcObject?: MediaStream | null;
    width?: number;
    height?: number;
    videoWidth?: number;
    videoHeight?: number;
    getContext?: (contextId: string, options?: any) => any;
    play?: () => Promise<void>;
    pause?: () => void;
    select?: () => void;
}

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
type WeightUnit = 'lbs' | 'kg';
type Sex = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type GoalType = 'cut' | 'recomp' | 'maintain' | 'bulk';
type CalorieDisplayMode = 'consumed' | 'remaining';

interface FastingState {
    isFasting: boolean;
    startDate: string | null;
    targetHours: number;
}

interface MacroTargets {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    water: number;
    vita: number;
    vitd: number;
    vite: number;
    vitk: number;
    vitc: number;
    thiamin: number;
    riboflavin: number;
    niacin: number;
    pantothenic: number;
    vitb6: number;
    biotin: number;
    folate: number;
    vitb12: number;
    calcium: number;
    iron: number;
    magnesium: number;
    phosphorus: number;
    zinc: number;
    copper: number;
    manganese: number;
    selenium: number;
    iodine: number;
    chromium: number;
    molybdenum: number;
    potassium: number;
    sodium: number;
    [key: string]: number;
}

interface BodyProfile {
    sex: Sex | string;
    age: number;
    heightFt: number;
    heightIn: number;
    weight: number;
    unit: WeightUnit | string;
    activityLevel: ActivityLevel | string;
    goal: GoalType | string;
    [key: string]: any;
}

type MicronutrientMap = Record<string, number>;

interface FoodItem {
    id?: string;
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    servingSize: number;
    servingUnit: string;
    servingQuantity?: number;
    servingLabel?: string;
    store?: string;
    type?: string;
    sourceUrl?: string;
    barcode?: string;
    imageUrl?: string;
    micros?: MicronutrientMap;
    missingNutrition?: boolean;
    hasName?: boolean;
    aiWarnings?: string[];
    loggedAt?: string;
    [key: string]: any;
}

interface ExerciseEntry {
    id: string;
    name: string;
    calories: number;
    minutes: number;
    source?: string;
}

interface DayMeals {
    breakfast?: FoodItem[];
    lunch?: FoodItem[];
    dinner?: FoodItem[];
    snacks?: FoodItem[];
    [key: string]: FoodItem[] | undefined;
}

interface DayLog {
    meals: DayMeals;
    water: number;
    exercise?: ExerciseEntry[];
    [key: string]: any;
}

interface ActivityRecord {
    steps?: number;
    caloriesOut?: number;
    caloriesOutEstimated?: boolean;
    source?: string;
    [key: string]: any;
}

interface WeightRecord {
    date: string;
    value: number;
    unit: WeightUnit | string;
    source?: string;
}

interface StrengthRecord {
    date: string;
    rating: number;
    notes: string;
}

interface FoodFrequencyEntry {
    count: number;
    meals: string[];
    food: FoodItem;
    lastLogged?: number;
    lastUsed?: string;
    lastUsedAt?: number;
    [key: string]: any;
}

interface SavedMeal {
    id: string;
    name: string;
    items: FoodItem[];
    createdAt?: number;
    lastUsedAt?: number;
    [key: string]: any;
}

interface HealthCounts {
    steps: number;
    calories: number;
    weight: number;
}

interface HealthSyncRecord {
    at: string;
    from: string | null;
    to: string | null;
    counts: HealthCounts;
    origin?: string | null;
    files?: any;
    [key: string]: any;
}

interface AppSettings {
    exerciseAddsToGoal?: boolean;
    [key: string]: any;
}

interface AppState {
    fasting: FastingState;
    multiAddEnabled: boolean;
    targets: MacroTargets;
    currentDate: string;
    dailyLogs: Record<string, DayLog>;
    bodyProfile: BodyProfile;
    weightHistory: WeightRecord[];
    weighInFrequency: number;
    strengthHistory: StrengthRecord[];
    foodFrequency: Record<string, FoodFrequencyEntry>;
    customPacks: FoodItem[];
    savedMeals?: SavedMeal[];
    barcodeCache?: Record<string, FoodItem>;
    activity?: Record<string, ActivityRecord>;
    settings?: AppSettings;
    lastHealthImport?: HealthSyncRecord | null;
    lastHealthSync?: HealthSyncRecord | null;
    onboarded?: boolean;
    activeTab: string;
    calorieDisplayMode: CalorieDisplayMode | string;
    expandedMeals: Record<string, boolean>;
    progressRange: number;
    progressSubTab: string;
    insightsRange?: number;
    [key: string]: any;
}

interface MicronutrientDefinition {
    id: string;
    name: string;
    unit: string;
    category: string;
    targetKey: string;
    color: string;
    isLimit?: boolean;
}

interface PortionOption {
    id: string;
    label: string;
    size: number;
    defaultAmount: number;
    unit: string;
}

interface SmartSearchQuery {
    original: string;
    normalized: string;
    inferredStore: string;
}

interface LabelReadingInput {
    readable?: boolean;
    name?: string;
    brand?: string;
    basis?: string;
    servingSize?: number;
    servingUnit?: string;
    servingLabel?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    sodiumMg?: number | null;
    potassiumMg?: number | null;
    calciumMg?: number | null;
    ironMg?: number | null;
    vitaminDMcg?: number | null;
}

interface LabelReadingResult {
    prefill: FoodItem;
    warnings: string[];
}

interface TargetCalculationInput {
    sex: string;
    age: number;
    heightCm: number;
    weightLbs: number;
    activity: string;
    goal: string;
}

interface TargetCalculationOutput {
    bmr: number;
    tdee: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

interface ChartSegment {
    value: number;
    color: string;
}

interface BarChartBar {
    key: string;
    label: string;
    title?: string;
    segments: ChartSegment[];
    selected?: boolean;
}

interface ChartOverlayLine {
    values: (number | null | undefined)[];
    color: string;
    width?: number;
}

interface BarChartOptions {
    width: number;
    height?: number;
    bars: BarChartBar[];
    goal?: number | null;
    goalLabel?: string;
    lines?: ChartOverlayLine[];
    onTap?: string;
    fmt?: (n: number) => string;
}

interface PairBarChartItem {
    key: string;
    label: string;
    title?: string;
    a: number;
    b: number;
    selected?: boolean;
}

interface PairBarChartOptions {
    width: number;
    height?: number;
    items: PairBarChartItem[];
    colors: [string, string] | string[];
    onTap?: string;
    fmt?: (n: number) => string;
}

interface DonutPart {
    value: number;
    color: string;
}

interface WeeklyReportSummary {
    daysLogged: number;
    days: number;
    avgCalories: number | null;
    avgGoal?: number;
    avgProtein: number | null;
    avgCarbs?: number | null;
    avgFats?: number | null;
    onTarget: number;
    proteinHit?: number;
    avgSteps: number | null;
    avgBalance: number | null;
    balanceDays?: number;
    totalExercise?: number;
    [key: string]: any;
}

interface HealthFieldClassification {
    metric: 'steps' | 'calories' | 'weight';
    kind?: 'active' | 'total' | null;
    unit?: 'kg' | 'lbs' | null;
}

interface ShortcutValueParsed {
    value: number;
    unit: string;
}

interface ShortcutLineParsed {
    metric: string;
    dateStr: string;
    value: number;
}

interface HealthDayData {
    steps?: number;
    calories?: number;
    active?: number;
    resting?: number;
    total?: number;
    weight?: number;
    [key: string]: any;
}

interface ShortcutPayloadSummary {
    days: Record<string, HealthDayData>;
    counts: HealthCounts;
    from: string | null;
    to: string | null;
    origin: string;
    files?: any;
    caloriesKind?: string | null;
    weightUnit?: string | null;
    [key: string]: any;
}

interface HealthFileParseResult {
    days: Record<string, HealthDayData>;
    metrics: Set<string> | string[];
    caloriesKind: string | null;
    weightUnit: string | null;
    rows: number;
    file: string;
    origin?: string | null;
}

interface MergedHealthSummary {
    days: Record<string, HealthDayData>;
    counts: HealthCounts;
    caloriesKind: string;
    weightUnit: string;
    from: string | null;
    to: string | null;
    files: any;
    origin: string | null;
    [key: string]: any;
}

interface BarcodeLookupResult {
    status: 'found' | 'not_found' | 'no_nutrition' | 'invalid' | 'error';
    code: string;
    food?: FoodItem;
    source?: string;
    fromCache?: boolean;
    usdaSkipped?: boolean;
    message?: string;
}

interface ScannerState {
    session: number;
    stream: MediaStream | null;
    track: MediaStreamTrack | null;
    running: boolean;
    busy: boolean;
    timer: any;
    decoder: any;
    reads: { code: string; at: number }[];
    torchOn: boolean;
    canvas: HTMLCanvasElement | null;
    frames: number;
    devices: MediaDeviceInfo[];
    zoomLevels: number[];
    zoomIndex: number;
    appliedZoom?: number;
    batch: boolean;
    batchCount: number;
    ignoreCode: string;
    ignoreUntil: number;
    autoLensDone: boolean;
    startedAt?: number;
    hinted?: boolean;
    lastMiss?: any;
    resumeOnShow?: boolean;
    [key: string]: any;
}
