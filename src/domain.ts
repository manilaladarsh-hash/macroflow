// MacroFlow — TypeScript Domain Layer backed by Rust WebAssembly (`rustWasm`)
// All nutrition math, barcode verification, USDA/OFF normalization, search,
// analytics, SVG chart generation, and health sync parsing run inside Rust Wasm.

const LB_PER_KG = 2.20462;

function escapeHTML(value: unknown): string {
    return rustWasm.escapeHtml(value);
}

function formatAmount(value: number): string {
    return rustWasm.formatAmount(value);
}

// ============================================================================
// Smart Search & Fuzzy Matching (Rust Wasm)
// ============================================================================

function normalizeSmartSearchQuery(rawQuery: string): SmartSearchQuery {
    return rustWasm.normalizeSmartSearchQuery(rawQuery);
}

function localFuzzyMatches(query: string): FoodItem[] {
    return rustWasm.localFuzzyMatches(query, localFoodDatabase);
}

function dedupeFoods(list: FoodItem[]): FoodItem[] {
    return rustWasm.dedupeFoods(list);
}

// ============================================================================
// Nutrition, Portions, USDA/OFF Normalization & Label Verification (Rust Wasm)
// ============================================================================

function generateFallbackFoodId(): string {
    return Date.now().toString() + '_' + Math.random().toString(36).slice(2, 7);
}

function normalizeNutritionObject(sourceObj: Record<string, any>): FoodItem {
    return rustWasm.normalizeNutritionObject(sourceObj, generateFallbackFoodId());
}

function normalizeUSDANutrients(fdcFood: Record<string, any>): FoodItem {
    return rustWasm.normalizeUsdaNutrients(fdcFood, generateFallbackFoodId());
}

function offNumber(nutriments: Record<string, any> | null | undefined, key: string): number | null {
    return rustWasm.offNumber(nutriments, key);
}

function offMicrosPer100(nutriments: Record<string, any> | null | undefined): MicronutrientMap {
    return rustWasm.offMicrosPer100(nutriments);
}

function foodFromOpenFoodFactsProduct(product: Record<string, any> | null | undefined, scannedCode = ''): FoodItem {
    return rustWasm.foodFromOpenFoodFactsProduct(product, scannedCode);
}

function checkLabelReading(r: LabelReadingInput | null | undefined): LabelReadingResult {
    return rustWasm.checkLabelReading(r);
}

function buildPortionOptions(food: FoodItem): PortionOption[] {
    return rustWasm.buildPortionOptions(food);
}

function defaultPortionFood(food: FoodItem): FoodItem {
    return rustWasm.defaultPortionFood(food);
}

function portionDescription(food: FoodItem): string {
    return rustWasm.portionDescription(food);
}

function scaleFoodPortion(food: FoodItem, amount: number): FoodItem {
    return rustWasm.scaleFoodPortion(food, amount);
}

function isAiFood(food: FoodItem | null | undefined): boolean {
    return rustWasm.isAiFood(food);
}

function sourceBadge(food: FoodItem | null | undefined): string {
    return rustWasm.sourceBadge(food);
}

function foodIcon(food: FoodItem | null | undefined): [string, string] {
    return rustWasm.foodIcon(food);
}

function foodIconHtml(food: FoodItem | null | undefined, size = ''): string {
    return rustWasm.foodIconHtml(food, size);
}

// ============================================================================
// Barcode & GTIN Engine (Rust Wasm)
// ============================================================================

function gtinCheckDigit(body: string): number {
    return rustWasm.gtinCheckDigit(body);
}

function isValidGtin(code: string): boolean {
    return rustWasm.isValidGtin(code);
}

function expandUpcE(code: string): string | null {
    return rustWasm.expandUpcE(code);
}

function cleanBarcode(raw: string): string {
    return rustWasm.cleanBarcode(raw);
}

function isAcceptableBarcode(raw: string, format = ''): boolean {
    return rustWasm.isAcceptableBarcode(raw, format);
}

function barcodeCandidates(raw: string): string[] {
    return rustWasm.barcodeCandidates(raw);
}

function formatBarcode(code: string): string {
    return rustWasm.formatBarcode(code);
}

function usdaGtinSpellings(rawCode: string): string[] {
    return rustWasm.usdaGtinSpellings(rawCode);
}

function titleCaseIfShouting(text: string): string {
    return rustWasm.titleCaseIfShouting(text);
}

function foodFromUsdaBranded(item: Record<string, any>, code: string): FoodItem {
    return rustWasm.foodFromUsdaBranded(item, code, generateFallbackFoodId());
}

function pickIosCloseUpCamera<T extends { label?: string }>(devices: T[]): T | null {
    if (!Array.isArray(devices) || !devices.length) return null;
    const idx = rustWasm.pickIosCloseUpCameraIndex(devices.map(d => d?.label || ''));
    return idx >= 0 && idx < devices.length ? devices[idx] : null;
}

// ============================================================================
// Analytics, Weight Trend EMA & SVG Chart Builders (Rust Wasm)
// ============================================================================

const svgNum = (n: number): number => rustWasm.svgNum(n);

function niceCeil(v: number): number {
    return rustWasm.niceCeil(v);
}

function goalLineSvg({ width, padL, padR, y, label }: { width: number; padL: number; padR: number; y: number; label: string }): string {
    return rustWasm.goalLineSvg({ width, padL, padR, y, label });
}

function shortNum(n: number): string {
    return rustWasm.shortNum(n);
}

function topRoundedBar(x: number, y: number, w: number, h: number, r: number, fill: string): string {
    return rustWasm.topRoundedBar(x, y, w, h, r, fill);
}

function barChartSvg({ width, height = 176, bars, goal = null, goalLabel = 'Goal', lines = [], onTap = '', fmt = shortNum }: BarChartOptions): string {
    return rustWasm.barChartSvg({
        width,
        height,
        bars,
        goal,
        goalLabel,
        lines,
        onTap,
        fmtKind: fmt !== shortNum ? 'round' : 'short'
    });
}

function pairBarChartSvg({ width, height = 168, items, colors, onTap = '', fmt = shortNum }: PairBarChartOptions): string {
    return rustWasm.pairBarChartSvg({
        width,
        height,
        items,
        colors,
        onTap,
        fmtKind: fmt !== shortNum ? 'round' : 'short'
    });
}

function donutSvg(parts: DonutPart[], size = 112, stroke = 16): string {
    return rustWasm.donutSvg(parts, size, stroke);
}

function macroSegments(day: { kcal: number; protein: number; carbs: number; fats: number }): ChartSegment[] {
    return rustWasm.macroSegments(day);
}

function weightTrend(points: { date: string; value: number }[], alpha = 0.1): number[] {
    return rustWasm.weightTrend(points, alpha);
}

// ============================================================================
// Health Sync, CSV & Apple Health Shortcut Parser (Rust Wasm)
// ============================================================================

function parseCsv(text: string): string[][] {
    return rustWasm.parseCsv(text);
}

function parseHealthDate(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' || /^\d{10,13}$/.test(String(value).trim())) {
        const n = Number(value);
        const d = new Date(n < 1e12 ? n * 1000 : n);
        return Number.isNaN(d.getTime()) ? null : localDateKey(d);
    }
    const s = String(value).trim();
    if (/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.test(s) && /(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) return localDateKey(d);
    }
    const fromRust = rustWasm.parseHealthDateStr(s);
    if (fromRust) return fromRust;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime()) && /[a-z]/i.test(s) && /\d{4}/.test(s)) return localDateKey(d);
    return null;
}

function healthNumber(value: unknown): number | null {
    return rustWasm.healthNumber(value);
}

function classifyHealthField(name: string, fileName = ''): HealthFieldClassification | null {
    return rustWasm.classifyHealthField(name, fileName);
}

function pickDateField(names: string[]): string | undefined {
    return rustWasm.pickDateField(names);
}

function parseShortcutValue(raw: string, metric: string): ShortcutValueParsed | null {
    return rustWasm.parseShortcutValue(raw, metric);
}

function parseShortcutLine(line: string): { metric: string; date: string; value: number } | null {
    const parsed = rustWasm.parseShortcutLine(line);
    if (!parsed) return null;
    const date = parseHealthDate(parsed.dateStr);
    if (!date) return null;
    return { metric: parsed.metric, date, value: parsed.value };
}

function parseShortcutPayload(text: string, { requireHeader = true }: { requireHeader?: boolean } = {}): ShortcutPayloadSummary | null {
    return rustWasm.parseShortcutPayload(text, requireHeader);
}

function parseHealthFile(fileName: string, text: string): HealthFileParseResult {
    return rustWasm.parseHealthFile(fileName, text);
}

function mergeHealthResults(results: HealthFileParseResult[]): MergedHealthSummary {
    return rustWasm.mergeHealthResults(results, appState.bodyProfile?.unit || 'lbs');
}

// ============================================================================
// Mifflin-St Jeor Targets, BMR & Exercise Energy (Rust Wasm)
// ============================================================================

function computeTargets({ sex, age, heightCm, weightLbs, activity, goal }: TargetCalculationInput): TargetCalculationOutput {
    return rustWasm.computeTargets({ sex, age, heightCm, weightLbs, activity, goal });
}
