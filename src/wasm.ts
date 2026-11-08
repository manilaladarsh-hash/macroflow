// MacroFlow — Rust WebAssembly Bridge (`crates/macroflow-core` -> `pkg/macroflow_core.wasm`)
// Synchronously instantiates the compiled Rust Wasm module and exposes typed FFI wrappers.

interface MacroFlowWasmExports {
    memory: WebAssembly.Memory;
    wasm_alloc(len: number): number;
    wasm_dealloc(ptr: number, cap: number): void;
    wasm_result_ptr(): number;
    wasm_result_len(): number;

    // Barcode Engine
    wasm_gtin_check_digit(ptr: number, len: number): number;
    wasm_is_valid_gtin(ptr: number, len: number): number;
    wasm_expand_upc_e(ptr: number, len: number): number;
    wasm_clean_barcode(ptr: number, len: number): number;
    wasm_is_acceptable_barcode(rawPtr: number, rawLen: number, fmtPtr: number, fmtLen: number): number;
    wasm_barcode_candidates(ptr: number, len: number): number;
    wasm_format_barcode(ptr: number, len: number): number;
    wasm_usda_gtin_spellings(ptr: number, len: number): number;
    wasm_title_case_if_shouting(ptr: number, len: number): number;
    wasm_pick_ios_close_up_camera_index(ptr: number, len: number): number;

    // Nutrition, Portions, OFF/USDA, Targets & Label Reading
    wasm_escape_html(ptr: number, len: number): number;
    wasm_format_amount(value: number): number;
    wasm_scale_food_portion(foodPtr: number, foodLen: number, amount: number): number;
    wasm_build_portion_options(ptr: number, len: number): number;
    wasm_default_portion_food(ptr: number, len: number): number;
    wasm_portion_description(ptr: number, len: number): number;
    wasm_normalize_nutrition_object(srcPtr: number, srcLen: number, idPtr: number, idLen: number): number;
    wasm_normalize_usda_nutrients(fdcPtr: number, fdcLen: number, idPtr: number, idLen: number): number;
    wasm_food_from_usda_branded(itemPtr: number, itemLen: number, codePtr: number, codeLen: number, idPtr: number, idLen: number): number;
    wasm_off_number(nutPtr: number, nutLen: number, keyPtr: number, keyLen: number): number;
    wasm_off_micros_per_100(ptr: number, len: number): number;
    wasm_food_from_open_food_facts_product(prodPtr: number, prodLen: number, codePtr: number, codeLen: number): number;
    wasm_check_label_reading(ptr: number, len: number): number;
    wasm_compute_targets(ptr: number, len: number): number;
    wasm_estimate_bmr(sexPtr: number, sexLen: number, age: number, heightFt: number, heightIn: number, weightKg: number): number;
    wasm_estimate_exercise_kcal(typePtr: number, typeLen: number, minutes: number, weightKg: number): bigint | number;
    wasm_is_ai_food(ptr: number, len: number): number;
    wasm_source_badge(ptr: number, len: number): number;
    wasm_food_icon(ptr: number, len: number): number;
    wasm_food_icon_html(foodPtr: number, foodLen: number, sizePtr: number, sizeLen: number): number;

    // Smart Search & Fuzzy Matching
    wasm_normalize_smart_search_query(ptr: number, len: number): number;
    wasm_local_fuzzy_matches(qPtr: number, qLen: number, dbPtr: number, dbLen: number): number;
    wasm_dedupe_foods(ptr: number, len: number): number;

    // Analytics, Weight Trend EMA & SVG Chart Builders
    wasm_weight_trend(ptsPtr: number, ptsLen: number, alpha: number): number;
    wasm_macro_segments(ptr: number, len: number): number;
    wasm_svg_num(n: number): number;
    wasm_nice_ceil(v: number): number;
    wasm_short_num(n: number): number;
    wasm_goal_line_svg(width: number, padL: number, padR: number, y: number, lblPtr: number, lblLen: number): number;
    wasm_top_rounded_bar(x: number, y: number, w: number, h: number, r: number, fillPtr: number, fillLen: number): number;
    wasm_bar_chart_svg(ptr: number, len: number): number;
    wasm_pair_bar_chart_svg(ptr: number, len: number): number;
    wasm_donut_svg(partsPtr: number, partsLen: number, size: number, stroke: number): number;
    wasm_weekly_report_from_rows(rowsPtr: number, rowsLen: number, todayPtr: number, todayLen: number): number;

    // Health Sync, CSV, & Apple Health Shortcut Parser
    wasm_parse_csv(ptr: number, len: number): number;
    wasm_parse_health_date_str(ptr: number, len: number): number;
    wasm_health_number(ptr: number, len: number): number;
    wasm_classify_health_field(namePtr: number, nameLen: number, filePtr: number, fileLen: number): number;
    wasm_pick_date_field(ptr: number, len: number): number;
    wasm_parse_shortcut_value(rawPtr: number, rawLen: number, metricPtr: number, metricLen: number): number;
    wasm_parse_shortcut_line(ptr: number, len: number): number;
    wasm_parse_shortcut_payload(ptr: number, len: number, requireHeader: number): number;
    wasm_parse_health_file(namePtr: number, nameLen: number, textPtr: number, textLen: number): number;
    wasm_merge_health_results(resPtr: number, resLen: number, unitPtr: number, unitLen: number): number;

    // UI Shell, Design System & Staple Food Database
    wasm_app_stylesheet(): number;
    wasm_app_shell_html(): number;
    wasm_micronutrient_definitions(): number;
    wasm_upper_limits(): number;
    wasm_rda_profiles(): number;
    wasm_initial_staple_foods(): number;
    wasm_full_staple_foods(): number;
    wasm_ring_stroke_metrics(namePtr: number, nameLen: number, fraction: number): number;
    wasm_calculate_streak_metrics(datesPtr: number, datesLen: number, todayPtr: number, todayLen: number): number;

    // Rust Self-Test Suite
    wasm_run_self_tests(): number;
}

function decodeBase64ToBytes(b64: string): Uint8Array {
    const clean = b64.replace(/[\r\n\s]/g, '');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < alphabet.length; i++) lookup[alphabet.charCodeAt(i)] = i;
    let pad = 0;
    if (clean.endsWith('==')) pad = 2;
    else if (clean.endsWith('=')) pad = 1;
    const outLen = ((clean.length * 3) >> 2) - pad;
    const bytes = new Uint8Array(outLen);
    let j = 0;
    for (let i = 0; i < clean.length; i += 4) {
        const a = lookup[clean.charCodeAt(i)];
        const b = lookup[clean.charCodeAt(i + 1)];
        const c = lookup[clean.charCodeAt(i + 2)];
        const d = lookup[clean.charCodeAt(i + 3)];
        const triple = (a << 18) | (b << 12) | (c << 6) | d;
        if (j < outLen) bytes[j++] = (triple >> 16) & 0xff;
        if (j < outLen) bytes[j++] = (triple >> 8) & 0xff;
        if (j < outLen) bytes[j++] = triple & 0xff;
    }
    return bytes;
}

const utf8Encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const utf8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

function encodeUtf8(str: string): Uint8Array {
    if (utf8Encoder) return utf8Encoder.encode(str);
    const out: number[] = [];
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80) {
            out.push(c);
        } else if (c < 0x800) {
            out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
            const c2 = str.charCodeAt(++i);
            const cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
            out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        } else {
            out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        }
    }
    return new Uint8Array(out);
}

function decodeUtf8(bytes: Uint8Array): string {
    if (utf8Decoder) return utf8Decoder.decode(bytes);
    let out = '';
    let i = 0;
    while (i < bytes.length) {
        const b0 = bytes[i++];
        if (b0 < 0x80) {
            out += String.fromCharCode(b0);
        } else if ((b0 & 0xe0) === 0xc0) {
            const b1 = bytes[i++] & 0x3f;
            out += String.fromCharCode(((b0 & 0x1f) << 6) | b1);
        } else if ((b0 & 0xf0) === 0xe0) {
            const b1 = bytes[i++] & 0x3f;
            const b2 = bytes[i++] & 0x3f;
            out += String.fromCharCode(((b0 & 0x0f) << 12) | (b1 << 6) | b2);
        } else {
            const b1 = bytes[i++] & 0x3f;
            const b2 = bytes[i++] & 0x3f;
            const b3 = bytes[i++] & 0x3f;
            const cp = (((b0 & 0x07) << 18) | (b1 << 12) | (b2 << 6) | b3) - 0x10000;
            out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        }
    }
    return out;
}

const rustWasm = (() => {
    const wasmBytes = decodeBase64ToBytes(MACROFLOW_WASM_BASE64);
    const wasmModule = new WebAssembly.Module(wasmBytes as BufferSource);
    const wasmInstance = new WebAssembly.Instance(wasmModule, {});
    const raw = wasmInstance.exports as unknown as MacroFlowWasmExports;

    function withStr<T>(s: string, fn: (ptr: number, len: number) => T): T {
        const str = String(s ?? '');
        if (!str.length) return fn(0, 0);
        const bytes = encodeUtf8(str);
        const ptr = raw.wasm_alloc(bytes.length);
        try {
            new Uint8Array(raw.memory.buffer, ptr, bytes.length).set(bytes);
            return fn(ptr, bytes.length);
        } finally {
            raw.wasm_dealloc(ptr, bytes.length);
        }
    }

    function withTwoStrs<T>(a: string, b: string, fn: (p1: number, l1: number, p2: number, l2: number) => T): T {
        return withStr(a, (p1, l1) => withStr(b, (p2, l2) => fn(p1, l1, p2, l2)));
    }

    function withThreeStrs<T>(a: string, b: string, c: string, fn: (p1: number, l1: number, p2: number, l2: number, p3: number, l3: number) => T): T {
        return withStr(a, (p1, l1) => withStr(b, (p2, l2) => withStr(c, (p3, l3) => fn(p1, l1, p2, l2, p3, l3))));
    }

    function readResultString(): string {
        const ptr = raw.wasm_result_ptr();
        const len = raw.wasm_result_len();
        if (!len || !ptr) return '';
        const view = new Uint8Array(raw.memory.buffer, ptr, len);
        return decodeUtf8(view);
    }

    function readResultJson<T>(): T {
        const s = readResultString();
        return s ? (JSON.parse(s) as T) : (null as unknown as T);
    }

    return {
        raw,
        runSelfTests(): boolean {
            return raw.wasm_run_self_tests() === 1;
        },

        // Barcode functions
        gtinCheckDigit(body: string): number {
            return withStr(body, (p, l) => raw.wasm_gtin_check_digit(p, l) >>> 0);
        },
        isValidGtin(code: string): boolean {
            return withStr(code, (p, l) => raw.wasm_is_valid_gtin(p, l) === 1);
        },
        expandUpcE(code: string): string | null {
            const ok = withStr(code, (p, l) => raw.wasm_expand_upc_e(p, l));
            return ok === 1 ? readResultString() : null;
        },
        cleanBarcode(rawCode: string): string {
            withStr(rawCode, (p, l) => raw.wasm_clean_barcode(p, l));
            return readResultString();
        },
        isAcceptableBarcode(rawCode: string, format = ''): boolean {
            return withTwoStrs(rawCode, format, (p1, l1, p2, l2) => raw.wasm_is_acceptable_barcode(p1, l1, p2, l2) === 1);
        },
        barcodeCandidates(rawCode: string): string[] {
            withStr(rawCode, (p, l) => raw.wasm_barcode_candidates(p, l));
            return readResultJson<string[]>();
        },
        formatBarcode(code: string): string {
            withStr(code, (p, l) => raw.wasm_format_barcode(p, l));
            return readResultString();
        },
        usdaGtinSpellings(rawCode: string): string[] {
            withStr(rawCode, (p, l) => raw.wasm_usda_gtin_spellings(p, l));
            return readResultJson<string[]>();
        },
        titleCaseIfShouting(text: string): string {
            withStr(text, (p, l) => raw.wasm_title_case_if_shouting(p, l));
            return readResultString();
        },
        pickIosCloseUpCameraIndex(labels: string[]): number {
            return withStr(JSON.stringify(labels), (p, l) => raw.wasm_pick_ios_close_up_camera_index(p, l));
        },

        // Nutrition & Portions
        escapeHtml(value: unknown): string {
            withStr(String(value ?? ''), (p, l) => raw.wasm_escape_html(p, l));
            return readResultString();
        },
        formatAmount(value: number): string {
            raw.wasm_format_amount(Number(value));
            return readResultString();
        },
        scaleFoodPortion(food: FoodItem, amount: number): FoodItem {
            const numAmount = Number(amount);
            const ok = withStr(JSON.stringify(food || {}), (p, l) => raw.wasm_scale_food_portion(p, l, numAmount));
            if (ok !== 1) throw new Error(readResultString() || 'Portion amount must be a positive number.');
            return readResultJson<FoodItem>();
        },
        buildPortionOptions(food: FoodItem): PortionOption[] {
            withStr(JSON.stringify(food || {}), (p, l) => raw.wasm_build_portion_options(p, l));
            return readResultJson<PortionOption[]>();
        },
        defaultPortionFood(food: FoodItem): FoodItem {
            withStr(JSON.stringify(food || {}), (p, l) => raw.wasm_default_portion_food(p, l));
            return readResultJson<FoodItem>();
        },
        portionDescription(food: FoodItem): string {
            withStr(JSON.stringify(food || {}), (p, l) => raw.wasm_portion_description(p, l));
            return readResultString();
        },
        normalizeNutritionObject(sourceObj: Record<string, any>, fallbackId: string): FoodItem {
            withTwoStrs(JSON.stringify(sourceObj || {}), fallbackId, (p1, l1, p2, l2) =>
                raw.wasm_normalize_nutrition_object(p1, l1, p2, l2)
            );
            return readResultJson<FoodItem>();
        },
        normalizeUsdaNutrients(fdcFood: Record<string, any>, fallbackId: string): FoodItem {
            withTwoStrs(JSON.stringify(fdcFood || {}), fallbackId, (p1, l1, p2, l2) =>
                raw.wasm_normalize_usda_nutrients(p1, l1, p2, l2)
            );
            return readResultJson<FoodItem>();
        },
        foodFromUsdaBranded(item: Record<string, any>, code: string, fallbackId: string): FoodItem {
            withThreeStrs(JSON.stringify(item || {}), String(code ?? ''), fallbackId, (p1, l1, p2, l2, p3, l3) =>
                raw.wasm_food_from_usda_branded(p1, l1, p2, l2, p3, l3)
            );
            return readResultJson<FoodItem>();
        },
        offNumber(nutriments: Record<string, any> | null | undefined, key: string): number | null {
            withTwoStrs(JSON.stringify(nutriments || {}), String(key ?? ''), (p1, l1, p2, l2) =>
                raw.wasm_off_number(p1, l1, p2, l2)
            );
            return readResultJson<number | null>();
        },
        offMicrosPer100(nutriments: Record<string, any> | null | undefined): MicronutrientMap {
            withStr(JSON.stringify(nutriments || {}), (p, l) => raw.wasm_off_micros_per_100(p, l));
            return readResultJson<MicronutrientMap>();
        },
        foodFromOpenFoodFactsProduct(product: Record<string, any> | null | undefined, scannedCode = ''): FoodItem {
            withTwoStrs(JSON.stringify(product || {}), String(scannedCode ?? ''), (p1, l1, p2, l2) =>
                raw.wasm_food_from_open_food_facts_product(p1, l1, p2, l2)
            );
            return readResultJson<FoodItem>();
        },
        checkLabelReading(reading: LabelReadingInput | null | undefined): LabelReadingResult {
            const ok = withStr(JSON.stringify(reading ?? null), (p, l) => raw.wasm_check_label_reading(p, l));
            if (ok !== 1) throw new Error(readResultString());
            return readResultJson<LabelReadingResult>();
        },
        computeTargets(input: TargetCalculationInput): TargetCalculationOutput {
            withStr(JSON.stringify(input || {}), (p, l) => raw.wasm_compute_targets(p, l));
            return readResultJson<TargetCalculationOutput>();
        },
        estimateBmr(sex: string, age: number, heightFt: number, heightIn: number, weightKg: number): number {
            return withStr(String(sex ?? 'male'), (p, l) =>
                raw.wasm_estimate_bmr(p, l, Number(age), Number(heightFt), Number(heightIn), Number(weightKg))
            );
        },
        estimateExerciseKcal(type: string, minutes: number, weightKg: number): number {
            const res = withStr(String(type ?? ''), (p, l) =>
                raw.wasm_estimate_exercise_kcal(p, l, Number(minutes), Number(weightKg))
            );
            return Number(res);
        },
        isAiFood(food: FoodItem | null | undefined): boolean {
            return withStr(JSON.stringify(food || {}), (p, l) => raw.wasm_is_ai_food(p, l) === 1);
        },
        sourceBadge(food: FoodItem | null | undefined): string {
            withStr(JSON.stringify(food || {}), (p, l) => raw.wasm_source_badge(p, l));
            return readResultString();
        },
        foodIcon(food: FoodItem | null | undefined): [string, string] {
            withStr(JSON.stringify(food || {}), (p, l) => raw.wasm_food_icon(p, l));
            return readResultJson<[string, string]>();
        },
        foodIconHtml(food: FoodItem | null | undefined, size = ''): string {
            withTwoStrs(JSON.stringify(food || {}), String(size ?? ''), (p1, l1, p2, l2) =>
                raw.wasm_food_icon_html(p1, l1, p2, l2)
            );
            return readResultString();
        },

        // Smart Search
        normalizeSmartSearchQuery(rawQuery: string): SmartSearchQuery {
            withStr(String(rawQuery ?? ''), (p, l) => raw.wasm_normalize_smart_search_query(p, l));
            return readResultJson<SmartSearchQuery>();
        },
        localFuzzyMatches(query: string, db: FoodItem[]): FoodItem[] {
            withTwoStrs(String(query ?? ''), JSON.stringify(db || []), (p1, l1, p2, l2) =>
                raw.wasm_local_fuzzy_matches(p1, l1, p2, l2)
            );
            return readResultJson<FoodItem[]>();
        },
        dedupeFoods(list: FoodItem[]): FoodItem[] {
            withStr(JSON.stringify(list || []), (p, l) => raw.wasm_dedupe_foods(p, l));
            return readResultJson<FoodItem[]>();
        },

        // Analytics & SVG Charts
        weightTrend(points: { date: string; value: number }[], alpha = 0.1): number[] {
            withStr(JSON.stringify(points || []), (p, l) => raw.wasm_weight_trend(p, l, Number(alpha)));
            return readResultJson<number[]>();
        },
        macroSegments(day: { kcal: number; protein: number; carbs: number; fats: number }): ChartSegment[] {
            withStr(JSON.stringify(day || {}), (p, l) => raw.wasm_macro_segments(p, l));
            return readResultJson<ChartSegment[]>();
        },
        svgNum(n: number): number {
            raw.wasm_svg_num(Number(n));
            return Number(readResultString());
        },
        niceCeil(v: number): number {
            return raw.wasm_nice_ceil(Number(v));
        },
        shortNum(n: number): string {
            raw.wasm_short_num(Number(n));
            return readResultString();
        },
        goalLineSvg(opts: { width: number; padL: number; padR: number; y: number; label: string }): string {
            withStr(String(opts.label ?? ''), (p, l) =>
                raw.wasm_goal_line_svg(Number(opts.width), Number(opts.padL), Number(opts.padR), Number(opts.y), p, l)
            );
            return readResultString();
        },
        topRoundedBar(x: number, y: number, w: number, h: number, r: number, fill: string): string {
            withStr(String(fill ?? ''), (p, l) =>
                raw.wasm_top_rounded_bar(Number(x), Number(y), Number(w), Number(h), Number(r), p, l)
            );
            return readResultString();
        },
        barChartSvg(cfg: Record<string, any>): string {
            withStr(JSON.stringify(cfg), (p, l) => raw.wasm_bar_chart_svg(p, l));
            return readResultString();
        },
        pairBarChartSvg(cfg: Record<string, any>): string {
            withStr(JSON.stringify(cfg), (p, l) => raw.wasm_pair_bar_chart_svg(p, l));
            return readResultString();
        },
        donutSvg(parts: DonutPart[], size = 112, stroke = 16): string {
            withStr(JSON.stringify(parts || []), (p, l) => raw.wasm_donut_svg(p, l, Number(size), Number(stroke)));
            return readResultString();
        },
        weeklyReportFromRows(rows: Record<string, any>[], todayKey: string): WeeklyReportSummary {
            withTwoStrs(JSON.stringify(rows || []), String(todayKey ?? ''), (p1, l1, p2, l2) =>
                raw.wasm_weekly_report_from_rows(p1, l1, p2, l2)
            );
            return readResultJson<WeeklyReportSummary>();
        },

        // Health Sync & CSV
        parseCsv(text: string): string[][] {
            withStr(String(text ?? ''), (p, l) => raw.wasm_parse_csv(p, l));
            return readResultJson<string[][]>();
        },
        parseHealthDateStr(rawDate: string): string | null {
            withStr(String(rawDate ?? ''), (p, l) => raw.wasm_parse_health_date_str(p, l));
            return readResultJson<string | null>();
        },
        healthNumber(value: unknown): number | null {
            if (value === null || value === undefined || typeof value === 'number' && !Number.isFinite(value)) return null;
            withStr(JSON.stringify(value), (p, l) => raw.wasm_health_number(p, l));
            return readResultJson<number | null>();
        },
        classifyHealthField(name: string, fileName = ''): HealthFieldClassification | null {
            withTwoStrs(String(name ?? ''), String(fileName ?? ''), (p1, l1, p2, l2) =>
                raw.wasm_classify_health_field(p1, l1, p2, l2)
            );
            return readResultJson<HealthFieldClassification | null>();
        },
        pickDateField(names: string[]): string | undefined {
            withStr(JSON.stringify(names || []), (p, l) => raw.wasm_pick_date_field(p, l));
            const res = readResultJson<string | null>();
            return res === null ? undefined : res;
        },
        parseShortcutValue(rawVal: string, metric: string): ShortcutValueParsed | null {
            withTwoStrs(String(rawVal ?? ''), String(metric ?? ''), (p1, l1, p2, l2) =>
                raw.wasm_parse_shortcut_value(p1, l1, p2, l2)
            );
            return readResultJson<ShortcutValueParsed | null>();
        },
        parseShortcutLine(line: string): ShortcutLineParsed | null {
            withStr(String(line ?? ''), (p, l) => raw.wasm_parse_shortcut_line(p, l));
            return readResultJson<ShortcutLineParsed | null>();
        },
        parseShortcutPayload(text: string, requireHeader = true): ShortcutPayloadSummary | null {
            withStr(String(text ?? ''), (p, l) => raw.wasm_parse_shortcut_payload(p, l, requireHeader ? 1 : 0));
            return readResultJson<ShortcutPayloadSummary | null>();
        },
        parseHealthFile(fileName: string, text: string): HealthFileParseResult {
            withTwoStrs(String(fileName ?? ''), String(text ?? ''), (p1, l1, p2, l2) =>
                raw.wasm_parse_health_file(p1, l1, p2, l2)
            );
            const parsed = readResultJson<HealthFileParseResult>();
            parsed.metrics = new Set(Array.isArray(parsed.metrics) ? parsed.metrics : []);
            return parsed;
        },
        mergeHealthResults(results: HealthFileParseResult[], fallbackUnit = 'lbs'): MergedHealthSummary {
            const serializable = (results || []).map(r => ({
                ...r,
                metrics: r.metrics instanceof Set ? [...r.metrics] : (r.metrics || [])
            }));
            withTwoStrs(JSON.stringify(serializable), String(fallbackUnit || 'lbs'), (p1, l1, p2, l2) =>
                raw.wasm_merge_health_results(p1, l1, p2, l2)
            );
            return readResultJson<MergedHealthSummary>();
        },

        // UI Shell, Design System & Staple Food Database
        appStylesheet(): string {
            raw.wasm_app_stylesheet();
            return readResultString();
        },
        appShellHtml(): string {
            raw.wasm_app_shell_html();
            return readResultString();
        },
        micronutrientDefinitions(): MicronutrientDefinition[] {
            raw.wasm_micronutrient_definitions();
            return readResultJson<MicronutrientDefinition[]>();
        },
        upperLimits(): Record<string, number> {
            raw.wasm_upper_limits();
            return readResultJson<Record<string, number>>();
        },
        rdaProfiles(): Record<string, Record<string, number>> {
            raw.wasm_rda_profiles();
            return readResultJson<Record<string, Record<string, number>>>();
        },
        initialStapleFoods(): FoodItem[] {
            raw.wasm_initial_staple_foods();
            return readResultJson<FoodItem[]>();
        },
        fullStapleFoods(): FoodItem[] {
            raw.wasm_full_staple_foods();
            return readResultJson<FoodItem[]>();
        },
        ringStrokeMetrics(name: string, fraction: number): {
            dasharray: string;
            dashoffset: string;
            opacity: string;
            lapDashoffset: string;
            lapOpacity: string;
        } {
            withStr(String(name ?? ''), (p, l) => raw.wasm_ring_stroke_metrics(p, l, Number(fraction)));
            return readResultJson();
        },
        calculateStreakMetrics(logDates: string[], todayKey: string): { current: number; best: number } {
            withTwoStrs(JSON.stringify(logDates || []), String(todayKey ?? ''), (p1, l1, p2, l2) =>
                raw.wasm_calculate_streak_metrics(p1, l1, p2, l2)
            );
            return readResultJson<{ current: number; best: number }>();
        },
        mountAppShell(): void {
            if (typeof document === 'undefined') return;
            const styleEl = document.getElementById('mf-style');
            if (styleEl && !styleEl.textContent) {
                styleEl.textContent = this.appStylesheet();
            }
            const rootEl = document.getElementById('mf-root');
            if (rootEl && !rootEl.innerHTML) {
                rootEl.innerHTML = this.appShellHtml();
            }
        }
    };
})();

rustWasm.mountAppShell();

