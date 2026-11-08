#[macro_use]
pub mod json;
pub mod analytics;
pub mod barcode;
pub mod health;
pub mod nutrition;
pub mod search;
pub mod types;

use crate::json::{IntoValue, Value};
use std::cell::RefCell;
use std::slice;

thread_local! {
    static RESULT_BUF: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

fn set_result(s: String) -> usize {
    RESULT_BUF.with(|buf| {
        let mut b = buf.borrow_mut();
        *b = s.into_bytes();
        b.len()
    })
}

fn set_json_result<T: IntoValue + Clone>(val: &T) -> usize {
    let s = json::to_string(val).unwrap_or_else(|_| "null".to_string());
    set_result(s)
}

unsafe fn str_from_raw<'a>(ptr: *const u8, len: usize) -> &'a str {
    if len == 0 || ptr.is_null() {
        return "";
    }
    let bytes = unsafe { slice::from_raw_parts(ptr, len) };
    std::str::from_utf8(bytes).unwrap_or("")
}

#[no_mangle]
pub extern "C" fn wasm_alloc(len: usize) -> *mut u8 {
    let mut buf = Vec::<u8>::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn wasm_dealloc(ptr: *mut u8, cap: usize) {
    if !ptr.is_null() && cap > 0 {
        unsafe {
            let _ = Vec::from_raw_parts(ptr, 0, cap);
        }
    }
}

#[no_mangle]
pub extern "C" fn wasm_result_ptr() -> *const u8 {
    RESULT_BUF.with(|buf| buf.borrow().as_ptr())
}

#[no_mangle]
pub extern "C" fn wasm_result_len() -> usize {
    RESULT_BUF.with(|buf| buf.borrow().len())
}

// ============================================================================
// Barcode FFI exports
// ============================================================================

#[no_mangle]
pub unsafe extern "C" fn wasm_gtin_check_digit(ptr: *const u8, len: usize) -> u32 {
    let s = unsafe { str_from_raw(ptr, len) };
    barcode::gtin_check_digit(s)
}

#[no_mangle]
pub unsafe extern "C" fn wasm_is_valid_gtin(ptr: *const u8, len: usize) -> u32 {
    let s = unsafe { str_from_raw(ptr, len) };
    u32::from(barcode::is_valid_gtin(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_expand_upc_e(ptr: *const u8, len: usize) -> u32 {
    let s = unsafe { str_from_raw(ptr, len) };
    match barcode::expand_upc_e(s) {
        Some(expanded) => {
            set_result(expanded);
            1
        }
        None => {
            set_result(String::new());
            0
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn wasm_clean_barcode(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_result(barcode::clean_barcode(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_is_acceptable_barcode(
    raw_ptr: *const u8,
    raw_len: usize,
    fmt_ptr: *const u8,
    fmt_len: usize,
) -> u32 {
    let raw = unsafe { str_from_raw(raw_ptr, raw_len) };
    let fmt = unsafe { str_from_raw(fmt_ptr, fmt_len) };
    u32::from(barcode::is_acceptable_barcode(raw, fmt))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_barcode_candidates(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_json_result(&barcode::barcode_candidates(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_format_barcode(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_result(barcode::format_barcode(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_usda_gtin_spellings(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_json_result(&barcode::usda_gtin_spellings(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_title_case_if_shouting(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_result(barcode::title_case_if_shouting(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_pick_ios_close_up_camera_index(ptr: *const u8, len: usize) -> i32 {
    let s = unsafe { str_from_raw(ptr, len) };
    let labels: Vec<String> = json::from_str(s)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .map(|arr| {
            arr.into_iter()
                .filter_map(|v| v.as_str().map(|x| x.to_string()))
                .collect()
        })
        .unwrap_or_default();
    barcode::pick_ios_close_up_camera_index(&labels)
        .map(|i| i as i32)
        .unwrap_or(-1)
}

// ============================================================================
// Nutrition, Portions, OFF/USDA, Targets & Label Reading FFI exports
// ============================================================================

#[no_mangle]
pub unsafe extern "C" fn wasm_escape_html(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_result(nutrition::escape_html(s))
}

#[no_mangle]
pub extern "C" fn wasm_format_amount(value: f64) -> usize {
    set_result(nutrition::format_amount(value))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_scale_food_portion(
    food_ptr: *const u8,
    food_len: usize,
    amount: f64,
) -> u32 {
    let s = unsafe { str_from_raw(food_ptr, food_len) };
    let food = json::from_str(s).unwrap_or(Value::Null);
    match nutrition::scale_food_portion(&food, amount) {
        Ok(scaled) => {
            set_json_result(&scaled);
            1
        }
        Err(msg) => {
            set_result(msg);
            0
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn wasm_build_portion_options(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let food = json::from_str(s).unwrap_or_else(|_| json!({}));
    set_json_result(&nutrition::build_portion_options(&food))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_default_portion_food(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let food = json::from_str(s).unwrap_or_else(|_| json!({}));
    set_json_result(&nutrition::default_portion_food(&food))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_portion_description(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let food = json::from_str(s).unwrap_or_else(|_| json!({}));
    set_result(nutrition::portion_description(&food))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_normalize_nutrition_object(
    src_ptr: *const u8,
    src_len: usize,
    id_ptr: *const u8,
    id_len: usize,
) -> usize {
    let src_str = unsafe { str_from_raw(src_ptr, src_len) };
    let fallback_id = unsafe { str_from_raw(id_ptr, id_len) };
    let src = json::from_str(src_str).unwrap_or_else(|_| json!({}));
    set_json_result(&nutrition::normalize_nutrition_object(&src, fallback_id))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_normalize_usda_nutrients(
    fdc_ptr: *const u8,
    fdc_len: usize,
    id_ptr: *const u8,
    id_len: usize,
) -> usize {
    let fdc_str = unsafe { str_from_raw(fdc_ptr, fdc_len) };
    let fallback_id = unsafe { str_from_raw(id_ptr, id_len) };
    let fdc = json::from_str(fdc_str).unwrap_or_else(|_| json!({}));
    set_json_result(&nutrition::normalize_usda_nutrients(&fdc, fallback_id))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_food_from_usda_branded(
    item_ptr: *const u8,
    item_len: usize,
    code_ptr: *const u8,
    code_len: usize,
    id_ptr: *const u8,
    id_len: usize,
) -> usize {
    let item_str = unsafe { str_from_raw(item_ptr, item_len) };
    let code = unsafe { str_from_raw(code_ptr, code_len) };
    let fallback_id = unsafe { str_from_raw(id_ptr, id_len) };
    let item = json::from_str(item_str).unwrap_or_else(|_| json!({}));
    set_json_result(&nutrition::food_from_usda_branded(&item, code, fallback_id))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_off_number(
    nut_ptr: *const u8,
    nut_len: usize,
    key_ptr: *const u8,
    key_len: usize,
) -> usize {
    let nut_str = unsafe { str_from_raw(nut_ptr, nut_len) };
    let key = unsafe { str_from_raw(key_ptr, key_len) };
    let nut = json::from_str(nut_str).unwrap_or_else(|_| json!({}));
    set_json_result(&nutrition::off_number(&nut, key))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_off_micros_per_100(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let nut = json::from_str(s).unwrap_or_else(|_| json!({}));
    set_json_result(&nutrition::off_micros_per_100(&nut))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_food_from_open_food_facts_product(
    prod_ptr: *const u8,
    prod_len: usize,
    code_ptr: *const u8,
    code_len: usize,
) -> usize {
    let prod_str = unsafe { str_from_raw(prod_ptr, prod_len) };
    let code = unsafe { str_from_raw(code_ptr, code_len) };
    let prod = json::from_str(prod_str).unwrap_or_else(|_| json!({}));
    set_json_result(&nutrition::food_from_open_food_facts_product(&prod, code))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_check_label_reading(ptr: *const u8, len: usize) -> u32 {
    let s = unsafe { str_from_raw(ptr, len) };
    let r = json::from_str(s).unwrap_or(Value::Null);
    match nutrition::check_label_reading(&r) {
        Ok(out) => {
            set_json_result(&out);
            1
        }
        Err(msg) => {
            set_result(msg);
            0
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn wasm_compute_targets(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let v = json::from_str(s).unwrap_or_else(|_| json!({}));
    let input = types::TargetInput::from_value(&v);
    set_json_result(&nutrition::compute_targets(&input))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_estimate_bmr(
    sex_ptr: *const u8,
    sex_len: usize,
    age: f64,
    height_ft: f64,
    height_in: f64,
    weight_kg: f64,
) -> f64 {
    let sex = unsafe { str_from_raw(sex_ptr, sex_len) };
    nutrition::estimate_bmr(sex, age, height_ft, height_in, weight_kg)
}

#[no_mangle]
pub unsafe extern "C" fn wasm_estimate_exercise_kcal(
    type_ptr: *const u8,
    type_len: usize,
    minutes: f64,
    weight_kg: f64,
) -> i64 {
    let ex_type = unsafe { str_from_raw(type_ptr, type_len) };
    nutrition::estimate_exercise_kcal(ex_type, minutes, weight_kg)
}

#[no_mangle]
pub unsafe extern "C" fn wasm_is_ai_food(ptr: *const u8, len: usize) -> u32 {
    let s = unsafe { str_from_raw(ptr, len) };
    let food = json::from_str(s).unwrap_or_else(|_| json!({}));
    u32::from(nutrition::is_ai_food(&food))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_source_badge(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let food = json::from_str(s).unwrap_or_else(|_| json!({}));
    set_result(nutrition::source_badge(&food))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_food_icon(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let food = json::from_str(s).unwrap_or_else(|_| json!({}));
    set_json_result(&nutrition::food_icon(&food))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_food_icon_html(
    food_ptr: *const u8,
    food_len: usize,
    size_ptr: *const u8,
    size_len: usize,
) -> usize {
    let food_str = unsafe { str_from_raw(food_ptr, food_len) };
    let size = unsafe { str_from_raw(size_ptr, size_len) };
    let food = json::from_str(food_str).unwrap_or_else(|_| json!({}));
    set_result(nutrition::food_icon_html(&food, size))
}

// ============================================================================
// Smart Search & Fuzzy Matching FFI exports
// ============================================================================

#[no_mangle]
pub unsafe extern "C" fn wasm_normalize_smart_search_query(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_json_result(&search::normalize_smart_search_query(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_local_fuzzy_matches(
    q_ptr: *const u8,
    q_len: usize,
    db_ptr: *const u8,
    db_len: usize,
) -> usize {
    let q = unsafe { str_from_raw(q_ptr, q_len) };
    let db_str = unsafe { str_from_raw(db_ptr, db_len) };
    let db: Vec<Value> = json::from_str(db_str)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default();
    set_json_result(&search::local_fuzzy_matches(q, &db))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_dedupe_foods(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let list: Vec<Value> = json::from_str(s)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default();
    set_json_result(&search::dedupe_foods(&list))
}

// ============================================================================
// Analytics, Trends, & SVG Charts FFI exports
// ============================================================================

#[no_mangle]
pub unsafe extern "C" fn wasm_weight_trend(
    pts_ptr: *const u8,
    pts_len: usize,
    alpha: f64,
) -> usize {
    let s = unsafe { str_from_raw(pts_ptr, pts_len) };
    let pts: Vec<types::WeightPointInput> = json::from_str(s)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .map(|arr| {
            arr.iter()
                .filter_map(types::WeightPointInput::from_value)
                .collect()
        })
        .unwrap_or_default();
    set_json_result(&analytics::weight_trend(&pts, alpha))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_macro_segments(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let v = json::from_str(s).unwrap_or_else(|_| json!({}));
    let day = types::MacroDayInput::from_value(&v);
    set_json_result(&analytics::macro_segments(&day))
}

#[no_mangle]
pub extern "C" fn wasm_svg_num(n: f64) -> usize {
    set_result(analytics::svg_num(n))
}

#[no_mangle]
pub extern "C" fn wasm_nice_ceil(v: f64) -> f64 {
    analytics::nice_ceil(v)
}

#[no_mangle]
pub extern "C" fn wasm_short_num(n: f64) -> usize {
    set_result(analytics::short_num(n))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_goal_line_svg(
    width: f64,
    pad_l: f64,
    pad_r: f64,
    y: f64,
    lbl_ptr: *const u8,
    lbl_len: usize,
) -> usize {
    let label = unsafe { str_from_raw(lbl_ptr, lbl_len) };
    set_result(analytics::goal_line_svg(width, pad_l, pad_r, y, label))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_top_rounded_bar(
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    r: f64,
    fill_ptr: *const u8,
    fill_len: usize,
) -> usize {
    let fill = unsafe { str_from_raw(fill_ptr, fill_len) };
    set_result(analytics::top_rounded_bar(x, y, w, h, r, fill))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_bar_chart_svg(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    match json::from_str(s) {
        Ok(v) => {
            let cfg = types::BarChartConfig::from_value(&v);
            set_result(analytics::bar_chart_svg(&cfg))
        }
        Err(_) => set_result(String::new()),
    }
}

#[no_mangle]
pub unsafe extern "C" fn wasm_pair_bar_chart_svg(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    match json::from_str(s) {
        Ok(v) => {
            let cfg = types::PairBarChartConfig::from_value(&v);
            set_result(analytics::pair_bar_chart_svg(&cfg))
        }
        Err(_) => set_result(String::new()),
    }
}

#[no_mangle]
pub unsafe extern "C" fn wasm_donut_svg(
    parts_ptr: *const u8,
    parts_len: usize,
    size: f64,
    stroke: f64,
) -> usize {
    let s = unsafe { str_from_raw(parts_ptr, parts_len) };
    let parts: Vec<types::DonutPart> = json::from_str(s)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .map(|arr| arr.iter().map(types::DonutPart::from_value).collect())
        .unwrap_or_default();
    set_result(analytics::donut_svg(&parts, size, stroke))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_weekly_report_from_rows(
    rows_ptr: *const u8,
    rows_len: usize,
    today_ptr: *const u8,
    today_len: usize,
) -> usize {
    let rows_str = unsafe { str_from_raw(rows_ptr, rows_len) };
    let today_key = unsafe { str_from_raw(today_ptr, today_len) };
    let rows: Vec<types::WeeklyReportRowInput> = json::from_str(rows_str)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .map(|arr| {
            arr.iter()
                .map(types::WeeklyReportRowInput::from_value)
                .collect()
        })
        .unwrap_or_default();
    set_json_result(&analytics::weekly_report_from_rows(&rows, today_key))
}

// ============================================================================
// Health Sync, CSV, & Apple Health Shortcut FFI exports
// ============================================================================

#[no_mangle]
pub unsafe extern "C" fn wasm_parse_csv(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_json_result(&health::parse_csv(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_parse_health_date_str(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_json_result(&health::parse_health_date_str(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_health_number(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let v = json::from_str(s).unwrap_or(Value::Null);
    set_json_result(&health::health_number(&v))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_classify_health_field(
    name_ptr: *const u8,
    name_len: usize,
    file_ptr: *const u8,
    file_len: usize,
) -> usize {
    let name = unsafe { str_from_raw(name_ptr, name_len) };
    let file_name = unsafe { str_from_raw(file_ptr, file_len) };
    set_json_result(&health::classify_health_field(name, file_name))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_pick_date_field(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    let names: Vec<String> = json::from_str(s)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .map(|arr| {
            arr.into_iter()
                .filter_map(|v| v.as_str().map(|x| x.to_string()))
                .collect()
        })
        .unwrap_or_default();
    set_json_result(&health::pick_date_field(&names))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_parse_shortcut_value(
    raw_ptr: *const u8,
    raw_len: usize,
    metric_ptr: *const u8,
    metric_len: usize,
) -> usize {
    let raw = unsafe { str_from_raw(raw_ptr, raw_len) };
    let metric = unsafe { str_from_raw(metric_ptr, metric_len) };
    set_json_result(&health::parse_shortcut_value(raw, metric))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_parse_shortcut_line(ptr: *const u8, len: usize) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_json_result(&health::parse_shortcut_line(s))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_parse_shortcut_payload(
    ptr: *const u8,
    len: usize,
    require_header: u32,
) -> usize {
    let s = unsafe { str_from_raw(ptr, len) };
    set_json_result(&health::parse_shortcut_payload(s, require_header != 0))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_parse_health_file(
    name_ptr: *const u8,
    name_len: usize,
    text_ptr: *const u8,
    text_len: usize,
) -> usize {
    let name = unsafe { str_from_raw(name_ptr, name_len) };
    let text = unsafe { str_from_raw(text_ptr, text_len) };
    set_json_result(&health::parse_health_file(name, text))
}

#[no_mangle]
pub unsafe extern "C" fn wasm_merge_health_results(
    res_ptr: *const u8,
    res_len: usize,
    unit_ptr: *const u8,
    unit_len: usize,
) -> usize {
    let res_str = unsafe { str_from_raw(res_ptr, res_len) };
    let unit = unsafe { str_from_raw(unit_ptr, unit_len) };
    let results: Vec<Value> = json::from_str(res_str)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default();
    set_json_result(&health::merge_health_results(&results, unit))
}

// ============================================================================
// Rust Self-Test Suite (callable in Wasm)
// ============================================================================

#[no_mangle]
pub extern "C" fn wasm_run_self_tests() -> u32 {
    // 1. Barcode tests
    assert_eq!(barcode::gtin_check_digit("301762042200"), 3);
    assert!(barcode::is_valid_gtin("3017620422003"));
    assert!(!barcode::is_valid_gtin("3017620422004"));
    assert_eq!(
        barcode::expand_upc_e("04252614"),
        Some("042100005264".to_string())
    );
    assert_eq!(barcode::expand_upc_e("04252615"), None);
    assert_eq!(barcode::format_barcode("3017620422003"), "3 017620 422003");
    assert_eq!(
        barcode::title_case_if_shouting("ORGANIC GREEK YOGURT"),
        "Organic Greek Yogurt"
    );

    // 2. Nutrition & portion scaling tests
    let base_food = json!({
        "name": "Oats",
        "servingSize": 100,
        "servingUnit": "g",
        "calories": 389,
        "protein": 16.9,
        "carbs": 66.3,
        "fats": 6.9,
        "micros": { "iron": 4.7 }
    });
    let scaled = nutrition::scale_food_portion(&base_food, 50.0).unwrap();
    assert_eq!(scaled.get("calories").and_then(|v| v.as_i64()), Some(195));

    // 3. Target computation tests
    let targets = nutrition::compute_targets(&types::TargetInput {
        sex: "male".to_string(),
        age: 30.0,
        height_cm: 180.0,
        weight_lbs: 180.0,
        activity: "moderate".to_string(),
        goal: "recomp".to_string(),
    });
    assert!(targets.bmr > 1700 && targets.tdee > 2600 && targets.protein == 180);

    // 4. Smart search tests
    let sq = search::normalize_smart_search_query("pc popcoen");
    assert_eq!(sq.normalized, "President's Choice popcorn");
    assert_eq!(sq.inferred_store, "loblaws");

    // 5. Analytics tests
    let trend = analytics::weight_trend(
        &[
            types::WeightPointInput {
                date: "2026-10-01".to_string(),
                value: 80.0,
            },
            types::WeightPointInput {
                date: "2026-10-02".to_string(),
                value: 79.0,
            },
        ],
        0.1,
    );
    assert_eq!(trend, vec![80.0, 79.9]);

    // 6. Health Shortcut parsing tests
    let shortcut = health::parse_shortcut_payload(
        "MacroFlow Health v1\nsteps;2026-10-09;8420\nactive;2026-10-09;512\nweight;2026-10-09;75.4\n",
        true,
    )
    .unwrap();
    assert_eq!(
        shortcut
            .pointer("/days/2026-10-09/steps")
            .and_then(|v| v.as_i64()),
        Some(8420)
    );

    set_result("ok".to_string());
    1
}
