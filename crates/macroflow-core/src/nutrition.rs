use crate::barcode::title_case_if_shouting;
use crate::json::{Map, Value};
use crate::types::{LabelCheckOutput, LabelPrefill, PortionOption, TargetInput, TargetOutput};
use std::collections::BTreeMap;

pub const LB_PER_KG: f64 = 2.20462;

pub const MICRO_SPECS: &[(&str, &str)] = &[
    ("vita", "mcg"),
    ("vitd", "mcg"),
    ("vite", "mg"),
    ("vitk", "mcg"),
    ("vitc", "mg"),
    ("thiamin", "mg"),
    ("riboflavin", "mg"),
    ("niacin", "mg"),
    ("pantothenic", "mg"),
    ("vitb6", "mg"),
    ("biotin", "mcg"),
    ("folate", "mcg DFE"),
    ("vitb12", "mcg"),
    ("calcium", "mg"),
    ("magnesium", "mg"),
    ("phosphorus", "mg"),
    ("potassium", "mg"),
    ("sodium", "mg"),
    ("iron", "mg"),
    ("zinc", "mg"),
    ("copper", "mg"),
    ("manganese", "mg"),
    ("selenium", "mcg"),
    ("iodine", "mcg"),
    ("chromium", "mcg"),
    ("molybdenum", "mcg"),
];

#[inline]
pub fn js_round(x: f64) -> f64 {
    if !x.is_finite() {
        return x;
    }
    (x + 0.5).floor()
}

pub fn escape_html(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(ch),
        }
    }
    out
}

pub fn format_amount(value: f64) -> String {
    if !value.is_finite() {
        return "0".to_string();
    }
    let rounded = js_round(value * 100.0) / 100.0;
    if rounded == 0.0 {
        return "0".to_string();
    }
    format!("{}", rounded)
}

fn val_to_f64(v: Option<&Value>) -> Option<f64> {
    match v {
        Some(Value::Number(n)) => n.as_f64().filter(|x| x.is_finite()),
        Some(Value::String(s)) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                None
            } else {
                trimmed.parse::<f64>().ok().filter(|x| x.is_finite())
            }
        }
        _ => None,
    }
}

fn val_to_str(v: Option<&Value>) -> String {
    match v {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Number(n)) => n.to_string(),
        Some(Value::Bool(b)) => b.to_string(),
        _ => String::new(),
    }
}

pub fn scale_food_portion(food: &Value, amount: f64) -> Result<Value, String> {
    let obj = food
        .as_object()
        .ok_or_else(|| "Enter an amount of at least 0.01.".to_string())?;

    let base_val = if let Some(pb) = obj.get("portionBase").filter(|v| v.is_object()) {
        pb.clone()
    } else {
        let mut micros_clone = Map::new();
        if let Some(Value::Object(m)) = obj.get("micros") {
            for (k, v) in m {
                micros_clone.insert(k.clone(), v.clone());
            }
        }
        json!({
            "servingSize": obj.get("servingSize").cloned().unwrap_or(Value::Null),
            "calories": obj.get("calories").cloned().unwrap_or(Value::Null),
            "protein": obj.get("protein").cloned().unwrap_or(Value::Null),
            "carbs": obj.get("carbs").cloned().unwrap_or(Value::Null),
            "fats": obj.get("fats").cloned().unwrap_or(Value::Null),
            "micros": Value::Object(micros_clone)
        })
    };

    let base_size = val_to_f64(base_val.get("servingSize")).unwrap_or(0.0);
    if !amount.is_finite() || amount < 0.01 || !base_size.is_finite() || base_size <= 0.0 {
        return Err("Enter an amount of at least 0.01.".to_string());
    }

    let factor = amount / base_size;
    let mut scaled = obj.clone();
    scaled.insert("servingSize".to_string(), json!(amount));
    scaled.insert("portionBase".to_string(), base_val.clone());

    for key in ["calories", "protein", "carbs", "fats"] {
        let base_num = val_to_f64(base_val.get(key)).unwrap_or(0.0);
        let value = base_num * factor;
        if !value.is_finite() {
            return Err("Amount is too large.".to_string());
        }
        let rounded = if key == "calories" {
            js_round(value)
        } else {
            js_round(value * 10.0) / 10.0
        };
        if !rounded.is_finite() {
            return Err("Amount is too large.".to_string());
        }
        if key == "calories" {
            scaled.insert(key.to_string(), json!(rounded as i64));
        } else {
            scaled.insert(key.to_string(), json!(rounded));
        }
    }

    let mut scaled_micros = Map::new();
    if let Some(Value::Object(base_micros)) = base_val.get("micros") {
        for (k, v) in base_micros {
            let num = val_to_f64(Some(v)).unwrap_or(0.0) * factor;
            if !num.is_finite() {
                return Err("Amount is too large.".to_string());
            }
            scaled_micros.insert(k.clone(), json!(num));
        }
    }
    scaled.insert("micros".to_string(), Value::Object(scaled_micros));
    Ok(Value::Object(scaled))
}

fn is_pure_metric_label(s: &str) -> bool {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return false;
    }
    let lower = trimmed.to_ascii_lowercase();
    let num_part = if let Some(rest) = lower.strip_suffix("ml") {
        rest.trim()
    } else if let Some(rest) = lower.strip_suffix('g') {
        rest.trim()
    } else {
        return false;
    };
    !num_part.is_empty()
        && num_part
            .chars()
            .all(|c| c.is_ascii_digit() || c == '.' || c == ',')
}

pub fn build_portion_options(food: &Value) -> Vec<PortionOption> {
    let unit_raw = val_to_str(food.get("servingUnit"));
    let unit = if unit_raw.is_empty() {
        "g".to_string()
    } else {
        unit_raw
    };
    let metric = unit == "g" || unit == "ml";
    let mut options = Vec::new();
    let serving_qty = val_to_f64(food.get("servingQuantity")).unwrap_or(0.0);
    let serving_size = val_to_f64(food.get("servingSize")).unwrap_or(0.0);
    let serving_label = val_to_str(food.get("servingLabel"));

    if metric && serving_qty > 0.0 {
        let label = if !serving_label.is_empty() && !is_pure_metric_label(&serving_label) {
            format!("serving \u{00b7} {}", serving_label)
        } else {
            format!("serving ({} {})", format_amount(serving_qty), unit)
        };
        options.push(PortionOption {
            id: "serving".to_string(),
            label,
            size: serving_qty,
            step: 0.5,
            default_amount: 1.0,
        });
    } else if metric && serving_size > 0.0 && (serving_size - 100.0).abs() > f64::EPSILON {
        options.push(PortionOption {
            id: "serving".to_string(),
            label: format!("serving ({} {})", format_amount(serving_size), unit),
            size: serving_size,
            step: 0.5,
            default_amount: 1.0,
        });
    }

    if metric {
        options.push(PortionOption {
            id: "unit".to_string(),
            label: unit,
            size: 1.0,
            step: 10.0,
            default_amount: if serving_size > 0.0 {
                serving_size
            } else {
                100.0
            },
        });
    } else {
        options.push(PortionOption {
            id: "unit".to_string(),
            label: if unit == "serving" {
                "serving(s)".to_string()
            } else {
                unit
            },
            size: 1.0,
            step: 1.0,
            default_amount: if serving_size > 0.0 {
                serving_size
            } else {
                1.0
            },
        });
    }
    options
}

pub fn default_portion_food(food: &Value) -> Value {
    let options = build_portion_options(food);
    if let Some(first) = options.first() {
        scale_food_portion(food, first.default_amount * first.size).unwrap_or_else(|_| food.clone())
    } else {
        food.clone()
    }
}

pub fn portion_description(food: &Value) -> String {
    let options = build_portion_options(food);
    let option = &options[0];
    if option.id == "serving" {
        format!("1 {}", option.label)
    } else {
        format!("{} {}", format_amount(option.default_amount), option.label)
    }
}

pub fn normalize_nutrition_object(source: &Value, fallback_id: &str) -> Value {
    let id = {
        let s = val_to_str(source.get("id"));
        if s.is_empty() {
            fallback_id.to_string()
        } else {
            s
        }
    };
    let name = {
        let s = val_to_str(source.get("name"));
        if s.is_empty() {
            "Custom Food".to_string()
        } else {
            s
        }
    };
    let calories = js_round(val_to_f64(source.get("calories")).unwrap_or(0.0)) as i64;
    let protein = js_round(val_to_f64(source.get("protein")).unwrap_or(0.0) * 10.0) / 10.0;
    let carbs = js_round(val_to_f64(source.get("carbs")).unwrap_or(0.0) * 10.0) / 10.0;
    let fats = js_round(val_to_f64(source.get("fats")).unwrap_or(0.0) * 10.0) / 10.0;
    let raw_size = val_to_f64(source.get("servingSize")).unwrap_or(0.0);
    let serving_size = if raw_size > 0.0 { raw_size } else { 100.0 };
    let serving_unit = {
        let s = val_to_str(source.get("servingUnit"));
        if s.is_empty() {
            "g".to_string()
        } else {
            s
        }
    };
    let store = {
        let s = val_to_str(source.get("store"));
        if s.is_empty() {
            "Generic".to_string()
        } else {
            s
        }
    };
    let food_type = {
        let s = val_to_str(source.get("type"));
        if s.is_empty() {
            "Local Search".to_string()
        } else {
            s
        }
    };
    let source_url = val_to_str(source.get("sourceUrl"));

    let mut micros = Map::new();
    for &(m_id, _) in MICRO_SPECS {
        micros.insert(m_id.to_string(), json!(0));
    }

    if let Some(Value::Object(s_micros)) = source.get("micros") {
        let alias_map: &[(&str, &[&str])] = &[
            ("vita", &["vita", "vitamin_a", "vitamin-a", "retinol", "rae", "vitamin a"]),
            ("vitd", &["vitd", "vitamin_d", "vitamin-d", "calciferol", "vitamin d"]),
            ("vite", &["vite", "vitamin_e", "vitamin-e", "tocopherol", "vitamin e"]),
            ("vitk", &["vitk", "vitamin_k", "vitamin-k", "phylloquinone", "vitamin k"]),
            ("vitc", &["vitc", "vitamin_c", "vitamin-c", "ascorbic acid", "vitamin c"]),
            ("thiamin", &["thiamin", "thiamine", "vitamin b1", "vitamin-b1", "b1", "vitamin_b1"]),
            ("riboflavin", &["riboflavin", "vitamin b2", "vitamin-b2", "b2", "vitamin_b2"]),
            ("niacin", &["niacin", "vitamin b3", "vitamin-b3", "b3", "vitamin_b3"]),
            ("pantothenic", &["pantothenic", "pantothenic acid", "pantothenic_acid", "vitamin b5", "vitamin-b5", "b5", "vitamin_b5"]),
            ("vitb6", &["vitb6", "vitamin b6", "vitamin-b6", "b6", "pyridoxine", "vitamin_b6"]),
            ("biotin", &["biotin", "vitamin b7", "vitamin-b7", "b7", "vitamin_b7"]),
            ("folate", &["folate", "folic acid", "folic_acid", "vitamin b9", "vitamin-b9", "b9", "dfe", "vitamin_b9"]),
            ("vitb12", &["vitb12", "vitamin b12", "vitamin-b12", "b12", "cobalamin", "vitamin_b12"]),
            ("calcium", &["calcium", "ca"]),
            ("iron", &["iron", "fe"]),
            ("magnesium", &["magnesium", "mg"]),
            ("phosphorus", &["phosphorus", "p", "phosphorous"]),
            ("zinc", &["zinc", "zn"]),
            ("copper", &["copper", "cu"]),
            ("manganese", &["manganese", "mn"]),
            ("selenium", &["selenium", "se"]),
            ("iodine", &["iodine", "i"]),
            ("chromium", &["chromium", "cr"]),
            ("molybdenum", &["molybdenum", "mo"]),
            ("potassium", &["potassium", "k"]),
            ("sodium", &["sodium", "na"]),
        ];

        for &(key, aliases) in alias_map {
            for &alias in aliases {
                let candidates = [
                    alias.to_string(),
                    alias.to_uppercase(),
                    alias.replacen(' ', "_", 1),
                    alias.replacen(' ', "-", 1),
                ];
                let mut found_val = None;
                for c in &candidates {
                    if let Some(v) = s_micros.get(c) {
                        if !v.is_null() {
                            found_val = Some(v);
                            break;
                        }
                    }
                }
                if let Some(v) = found_val {
                    let parsed = val_to_f64(Some(v)).unwrap_or(0.0);
                    micros.insert(key.to_string(), json!(parsed));
                    break;
                }
            }
        }
    }

    let mut result = Map::new();
    result.insert("id".to_string(), json!(id));
    result.insert("name".to_string(), json!(name));
    result.insert("calories".to_string(), json!(calories));
    result.insert("protein".to_string(), json!(protein));
    result.insert("carbs".to_string(), json!(carbs));
    result.insert("fats".to_string(), json!(fats));
    result.insert("servingSize".to_string(), json!(serving_size));
    result.insert("servingUnit".to_string(), json!(serving_unit));
    result.insert("store".to_string(), json!(store));
    result.insert("type".to_string(), json!(food_type));
    result.insert("sourceUrl".to_string(), json!(source_url));
    let barcode = val_to_str(source.get("barcode"));
    if !barcode.is_empty() {
        result.insert("barcode".to_string(), json!(barcode));
    }
    result.insert("micros".to_string(), Value::Object(micros));
    Value::Object(result)
}

pub fn normalize_usda_nutrients(fdc_food: &Value, fallback_id: &str) -> Value {
    let nutrients = fdc_food
        .get("foodNutrients")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let find_nutrient = |ids: &[i64]| -> f64 {
        for n in &nutrients {
            let nid = val_to_f64(n.get("nutrientId")).unwrap_or(-1.0) as i64;
            if ids.contains(&nid) {
                return val_to_f64(n.get("value")).unwrap_or(0.0);
            }
        }
        0.0
    };

    let has_1110 = nutrients
        .iter()
        .any(|n| val_to_f64(n.get("nutrientId")).unwrap_or(-1.0) as i64 == 1110);

    let raw_size = val_to_f64(fdc_food.get("servingSize")).unwrap_or(0.0);
    let size = if raw_size > 0.0 { raw_size } else { 100.0 };
    let scale = size / 100.0;

    let serving_unit = {
        let s = val_to_str(fdc_food.get("servingSizeUnit"));
        if s.is_empty() {
            "g".to_string()
        } else {
            s
        }
    };
    let store = {
        let s = val_to_str(fdc_food.get("brandOwner"));
        if s.is_empty() {
            "USDA FDC".to_string()
        } else {
            s
        }
    };

    let item = json!({
        "name": fdc_food.get("description").cloned().unwrap_or(Value::Null),
        "calories": js_round(find_nutrient(&[1008, 2047, 2048]) * scale) as i64,
        "protein": js_round((find_nutrient(&[1003]) * scale) * 10.0) / 10.0,
        "carbs": js_round((find_nutrient(&[1005]) * scale) * 10.0) / 10.0,
        "fats": js_round((find_nutrient(&[1004]) * scale) * 10.0) / 10.0,
        "servingSize": size,
        "servingUnit": serving_unit,
        "store": store,
        "type": "USDA",
        "barcode": val_to_str(fdc_food.get("gtinUpc")),
        "micros": {
            "vita": find_nutrient(&[1104]) * scale,
            "vitc": find_nutrient(&[1162]) * scale,
            "vitd": find_nutrient(&[1114, 1110]) * (if has_1110 { 0.025 } else { 1.0 }) * scale,
            "vite": find_nutrient(&[1109]) * scale,
            "vitk": find_nutrient(&[1185]) * scale,
            "thiamin": find_nutrient(&[1165]) * scale,
            "riboflavin": find_nutrient(&[1166]) * scale,
            "niacin": find_nutrient(&[1167]) * scale,
            "pantothenic": find_nutrient(&[1170]) * scale,
            "vitb6": find_nutrient(&[1175]) * scale,
            "folate": find_nutrient(&[1186, 1187]) * scale,
            "vitb12": find_nutrient(&[1178]) * scale,
            "calcium": find_nutrient(&[1087]) * scale,
            "iron": find_nutrient(&[1089]) * scale,
            "magnesium": find_nutrient(&[1090]) * scale,
            "phosphorus": find_nutrient(&[1091]) * scale,
            "potassium": find_nutrient(&[1092]) * scale,
            "sodium": find_nutrient(&[1093]) * scale,
            "zinc": find_nutrient(&[1095]) * scale,
            "selenium": find_nutrient(&[1103]) * scale,
            "copper": find_nutrient(&[1098]) * scale,
            "manganese": find_nutrient(&[1101]) * scale
        }
    });
    normalize_nutrition_object(&item, fallback_id)
}

pub fn food_from_usda_branded(item: &Value, code: &str, fallback_id: &str) -> Value {
    let raw_unit = val_to_str(item.get("servingSizeUnit")).to_ascii_lowercase();
    let unit = if raw_unit == "ml" || raw_unit == "mlt" {
        "ml"
    } else {
        "g"
    };
    let mut modified = item.as_object().cloned().unwrap_or_default();
    modified.insert("servingSizeUnit".to_string(), json!(unit));
    let mut food = normalize_usda_nutrients(&Value::Object(modified), fallback_id);
    if let Some(obj) = food.as_object_mut() {
        let brand_raw = {
            let bn = val_to_str(item.get("brandName"));
            if !bn.is_empty() {
                bn
            } else {
                val_to_str(item.get("brandOwner"))
            }
        };
        let brand = title_case_if_shouting(&brand_raw);
        let desc = title_case_if_shouting(&val_to_str(item.get("description")));
        let name = if desc.is_empty() {
            "USDA product".to_string()
        } else {
            desc
        };
        let serving_size = val_to_f64(obj.get("servingSize")).unwrap_or(100.0);
        let serving_label = val_to_str(item.get("householdServingFullText"))
            .trim()
            .to_string();

        obj.insert("name".to_string(), json!(name));
        obj.insert("brand".to_string(), json!(brand.clone()));
        obj.insert(
            "store".to_string(),
            json!(if brand.is_empty() {
                "USDA".to_string()
            } else {
                brand
            }),
        );
        obj.insert("type".to_string(), json!("USDA Branded"));
        obj.insert("barcode".to_string(), json!(code));
        obj.insert("servingQuantity".to_string(), json!(serving_size));
        obj.insert("servingLabel".to_string(), json!(serving_label));
    }
    food
}

const OFF_MICRO_KEYS: &[(&str, &str)] = &[
    ("vita", "vitamin-a"),
    ("vitd", "vitamin-d"),
    ("vite", "vitamin-e"),
    ("vitk", "vitamin-k"),
    ("vitc", "vitamin-c"),
    ("thiamin", "vitamin-b1"),
    ("riboflavin", "vitamin-b2"),
    ("niacin", "vitamin-pp"),
    ("pantothenic", "pantothenic-acid"),
    ("vitb6", "vitamin-b6"),
    ("biotin", "biotin"),
    ("folate", "vitamin-b9"),
    ("vitb12", "vitamin-b12"),
    ("calcium", "calcium"),
    ("iron", "iron"),
    ("magnesium", "magnesium"),
    ("phosphorus", "phosphorus"),
    ("potassium", "potassium"),
    ("sodium", "sodium"),
    ("zinc", "zinc"),
    ("copper", "copper"),
    ("manganese", "manganese"),
    ("selenium", "selenium"),
    ("iodine", "iodine"),
    ("chromium", "chromium"),
    ("molybdenum", "molybdenum"),
];

pub fn off_number(nutriments: &Value, key: &str) -> Option<f64> {
    let v = nutriments.get(key)?;
    if v.is_null() {
        return None;
    }
    match v {
        Value::Number(n) => n.as_f64().filter(|x| x.is_finite()),
        Value::String(s) => {
            let t = s.trim();
            if t.is_empty() {
                None
            } else {
                t.parse::<f64>().ok().filter(|x| x.is_finite())
            }
        }
        _ => None,
    }
}

pub fn off_micros_per_100(nutriments: &Value) -> Value {
    let mut micros = Map::new();
    for &(m_id, unit) in MICRO_SPECS {
        let off_key = OFF_MICRO_KEYS
            .iter()
            .find(|&&(id, _)| id == m_id)
            .map(|&(_, k)| k);
        let mut grams = off_key.and_then(|k| off_number(nutriments, &format!("{}_100g", k)));
        if grams.is_none() && m_id == "niacin" {
            grams = off_number(nutriments, "vitamin-b3_100g");
        }
        if let Some(g) = grams {
            let factor = if unit.starts_with("mcg") { 1e6 } else { 1e3 };
            let converted = js_round(g * factor * 1000.0) / 1000.0;
            micros.insert(m_id.to_string(), json!(converted));
        } else {
            micros.insert(m_id.to_string(), json!(0));
        }
    }
    Value::Object(micros)
}

pub fn food_from_open_food_facts_product(product: &Value, scanned_code: &str) -> Value {
    let empty_obj = json!({});
    let p = if product.is_object() {
        product
    } else {
        &empty_obj
    };
    let n = p.get("nutriments").unwrap_or(&empty_obj);
    let per_100 = |key: &str| off_number(n, &format!("{}_100g", key));

    let mut kcal = per_100("energy-kcal");
    if kcal.is_none() {
        if let Some(kj) = per_100("energy") {
            kcal = Some(kj / 4.184);
        }
    }

    let raw_name = [
        val_to_str(p.get("product_name")),
        val_to_str(p.get("product_name_en")),
        val_to_str(p.get("generic_name")),
    ]
    .into_iter()
    .find(|s| !s.is_empty())
    .unwrap_or_default();
    let name = raw_name.trim().to_string();

    let brands = val_to_str(p.get("brands"));
    let brand = brands.split(',').next().unwrap_or("").trim().to_string();

    let unit = if val_to_str(p.get("serving_quantity_unit"))
        .trim()
        .eq_ignore_ascii_case("ml")
    {
        "ml"
    } else {
        "g"
    };

    let serving_qty = val_to_f64(p.get("serving_quantity"))
        .filter(|&x| x > 0.0)
        .unwrap_or(0.0);

    let code = {
        let c = val_to_str(p.get("code"));
        if !c.is_empty() {
            c
        } else {
            scanned_code.to_string()
        }
    };

    let image_url = [
        val_to_str(p.get("image_front_small_url")),
        val_to_str(p.get("image_small_url")),
        val_to_str(p.get("image_url")),
    ]
    .into_iter()
    .find(|s| !s.is_empty())
    .unwrap_or_default();

    let p_code = val_to_str(p.get("code"));
    let source_url = if !p_code.is_empty() {
        format!("https://world.openfoodfacts.org/product/{}", p_code)
    } else {
        String::new()
    };

    json!({
        "name": if !name.is_empty() { name.clone() } else { format!("Product {}", code) },
        "brand": brand.clone(),
        "store": if !brand.is_empty() { brand } else { "Open Food Facts".to_string() },
        "type": "Open Food Facts",
        "barcode": code,
        "calories": kcal.map(|k| js_round(k) as i64).unwrap_or(0),
        "protein": js_round(per_100("proteins").unwrap_or(0.0) * 10.0) / 10.0,
        "carbs": js_round(per_100("carbohydrates").unwrap_or(0.0) * 10.0) / 10.0,
        "fats": js_round(per_100("fat").unwrap_or(0.0) * 10.0) / 10.0,
        "servingSize": 100,
        "servingUnit": unit,
        "servingQuantity": serving_qty,
        "servingLabel": val_to_str(p.get("serving_size")).trim(),
        "imageUrl": image_url,
        "sourceUrl": source_url,
        "micros": off_micros_per_100(n),
        "missingNutrition": kcal.is_none(),
        "hasName": !name.is_empty()
    })
}

pub fn check_label_reading(r: &Value) -> Result<LabelCheckOutput, String> {
    if !r.is_object() || r.get("readable") == Some(&Value::Bool(false)) {
        return Err("Couldn't read a nutrition label in that photo. Retake it closer, with the whole panel in view and no glare.".to_string());
    }
    let num = |v: Option<&Value>| -> f64 {
        val_to_f64(v).filter(|&x| x >= 0.0).unwrap_or(0.0)
    };
    let kcal = num(r.get("calories"));
    let protein = num(r.get("protein"));
    let carbs = num(r.get("carbs"));
    let fats = num(r.get("fats"));
    let unit = if val_to_str(r.get("servingUnit")) == "ml" || val_to_str(r.get("basis")) == "100ml"
    {
        "ml".to_string()
    } else {
        "g".to_string()
    };
    let raw_size = num(r.get("servingSize"));
    let size = if raw_size > 0.0 { raw_size } else { 100.0 };

    let mut warnings = Vec::new();
    let from_macros = 4.0 * protein + 4.0 * carbs + 9.0 * fats;
    if kcal == 0.0 && from_macros == 0.0 {
        warnings.push("The label reads 0 kcal \u{2014} check that this is right.".to_string());
    } else if (kcal - from_macros).abs() > (20.0_f64).max(kcal * 0.25) {
        warnings.push(format!(
            "{} kcal doesn't match protein, carbs and fat (about {} kcal) \u{2014} compare with the label.",
            js_round(kcal) as i64,
            js_round(from_macros) as i64
        ));
    }
    if unit == "g" && protein + carbs + fats > size * 1.05 {
        warnings.push(format!(
            "Protein, carbs and fat add up to more than {} g \u{2014} check the serving size.",
            format_amount(size)
        ));
    }
    if unit == "g" && kcal > size * 9.2 {
        warnings.push(format!(
            "{} kcal is more than {} g of food can hold \u{2014} check the serving size.",
            js_round(kcal) as i64,
            format_amount(size)
        ));
    }

    let mut micros = BTreeMap::new();
    if let Some(v) = r.get("sodiumMg").filter(|v| !v.is_null()) {
        micros.insert("sodium".to_string(), num(Some(v)));
    }
    if let Some(v) = r.get("potassiumMg").filter(|v| !v.is_null()) {
        micros.insert("potassium".to_string(), num(Some(v)));
    }
    if let Some(v) = r.get("calciumMg").filter(|v| !v.is_null()) {
        micros.insert("calcium".to_string(), num(Some(v)));
    }
    if let Some(v) = r.get("ironMg").filter(|v| !v.is_null()) {
        micros.insert("iron".to_string(), num(Some(v)));
    }
    if let Some(v) = r.get("vitaminDMcg").filter(|v| !v.is_null()) {
        micros.insert("vitd".to_string(), num(Some(v)));
    }

    Ok(LabelCheckOutput {
        prefill: LabelPrefill {
            name: val_to_str(r.get("name")).trim().to_string(),
            brand: val_to_str(r.get("brand")).trim().to_string(),
            serving_size: js_round(size * 10.0) / 10.0,
            serving_unit: unit,
            serving_label: val_to_str(r.get("servingLabel")).trim().to_string(),
            calories: js_round(kcal) as i64,
            protein: js_round(protein * 10.0) / 10.0,
            carbs: js_round(carbs * 10.0) / 10.0,
            fats: js_round(fats * 10.0) / 10.0,
            micros,
        },
        warnings,
    })
}

pub fn compute_targets(input: &TargetInput) -> TargetOutput {
    let weight_kg = input.weight_lbs / LB_PER_KG;
    let sex_offset = if input.sex == "male" { 5.0 } else { -161.0 };
    let bmr = 10.0 * weight_kg + 6.25 * input.height_cm - 5.0 * input.age + sex_offset;
    let activity_factor = match input.activity.as_str() {
        "sedentary" => 1.2,
        "light" => 1.375,
        "moderate" => 1.55,
        "very" => 1.725,
        "extreme" => 1.9,
        _ => 1.55,
    };
    let tdee = bmr * activity_factor;
    let goal_modifier = match input.goal.as_str() {
        "aggressive" => 0.75,
        "moderate_loss" => 0.80,
        "recomp" => 0.85,
        "lean_bulk" => 1.10,
        "maintenance" => 1.0,
        _ => 0.85,
    };
    let calories = js_round(tdee * goal_modifier) as i64;
    let protein = js_round(input.weight_lbs * 1.0) as i64;
    let fats = js_round(input.weight_lbs * 0.35) as i64;
    let carbs = (js_round((calories as f64 - protein as f64 * 4.0 - fats as f64 * 9.0) / 4.0)
        as i64)
        .max(0);

    TargetOutput {
        bmr: js_round(bmr) as i64,
        tdee: js_round(tdee) as i64,
        calories,
        protein,
        carbs,
        fats,
    }
}

pub fn estimate_bmr(sex: &str, age: f64, height_ft: f64, height_in: f64, weight_kg: f64) -> f64 {
    let height_cm = (height_ft * 12.0 + height_in) * 2.54;
    let sex_offset = if sex == "male" { 5.0 } else { -161.0 };
    10.0 * weight_kg + 6.25 * height_cm - 5.0 * age + sex_offset
}

pub fn estimate_exercise_kcal(exercise_type: &str, minutes: f64, weight_kg: f64) -> i64 {
    let met = match exercise_type {
        "Walking" => 3.5,
        "Brisk walking" => 4.3,
        "Running" => 9.8,
        "Cycling" => 7.5,
        "Strength training" => 5.0,
        "Swimming" => 7.0,
        "HIIT" => 8.0,
        "Yoga" => 2.5,
        "Hiking" => 6.0,
        "Sports" => 7.0,
        "Dancing" => 5.0,
        _ => 5.0,
    };
    js_round(met * weight_kg * (minutes / 60.0)) as i64
}

pub fn is_ai_food(food: &Value) -> bool {
    let t = val_to_str(food.get("type"));
    t.split_whitespace().any(|w| w == "AI" || w == "Gemini")
}

pub fn source_badge(food: &Value) -> String {
    let t = val_to_str(food.get("type"));
    let tl = t.to_ascii_lowercase();
    if is_ai_food(food) {
        "<span class=\"badge ai\"><i class=\"fa-solid fa-wand-magic-sparkles\"></i>AI estimate</span>"
            .to_string()
    } else if tl.contains("custom") {
        "<span class=\"badge brand\"><i class=\"fa-solid fa-user\"></i>My food</span>".to_string()
    } else if tl.contains("open food facts") {
        "<span class=\"badge\">Open Food Facts</span>".to_string()
    } else if tl.contains("usda") {
        "<span class=\"badge\">USDA</span>".to_string()
    } else if tl.contains("quick") {
        "<span class=\"badge\">Quick add</span>".to_string()
    } else {
        String::new()
    }
}

fn words_in_text(text: &str) -> Vec<&str> {
    text.split(|c: char| !c.is_ascii_alphanumeric() && c != '_')
        .filter(|s| !s.is_empty())
        .collect()
}

pub fn food_icon(food: &Value) -> [String; 2] {
    let t = val_to_str(food.get("type"));
    if is_ai_food(food) {
        return ["fa-wand-magic-sparkles".to_string(), "ai".to_string()];
    }
    if t.to_ascii_lowercase().contains("quick") {
        return ["fa-bolt".to_string(), "quick".to_string()];
    }
    let type_hit = match t.as_str() {
        "Fruit" => Some(("fa-apple-whole", "fruit")),
        "Vegetable" => Some(("fa-carrot", "veg")),
        "Dairy/Eggs" => Some(("fa-cheese", "dairy")),
        "Grain" => Some(("fa-wheat-awn", "grain")),
        "Meat" => Some(("fa-drumstick-bite", "meat")),
        "Seafood" => Some(("fa-fish", "fish")),
        "Nuts/Seeds" => Some(("fa-seedling", "nuts")),
        "Legume" => Some(("fa-seedling", "veg")),
        "Fats/Oils" => Some(("fa-bottle-droplet", "fat")),
        "Condiment" => Some(("fa-jar", "fat")),
        "Snack" => Some(("fa-cookie", "sweet")),
        "Supplement" => Some(("fa-capsules", "pack")),
        _ => None,
    };
    if let Some((icon, tone)) = type_hit {
        return [icon.to_string(), tone.to_string()];
    }

    let name_lower = val_to_str(food.get("name")).to_ascii_lowercase();
    let words = words_in_text(&name_lower);
    let has_any = |list: &[&str]| words.iter().any(|w| list.contains(w));

    if has_any(&["coffee", "latte", "espresso", "cappuccino", "tea"]) {
        return ["fa-mug-hot".to_string(), "drink".to_string()];
    }
    if has_any(&[
        "juice",
        "soda",
        "cola",
        "coke",
        "smoothie",
        "drink",
        "beer",
        "wine",
        "milkshake",
        "lemonade",
    ]) {
        return ["fa-bottle-water".to_string(), "drink".to_string()];
    }
    if has_any(&["egg", "eggs"]) || name_lower.contains("omelet") {
        return ["fa-egg".to_string(), "egg".to_string()];
    }
    if has_any(&[
        "chicken", "beef", "pork", "turkey", "lamb", "steak", "bacon", "ham", "sausage", "meat",
        "mince", "jerky",
    ]) {
        return ["fa-drumstick-bite".to_string(), "meat".to_string()];
    }
    if has_any(&[
        "salmon", "tuna", "fish", "cod", "shrimp", "prawn", "prawns", "sardine", "sardines",
        "trout", "tilapia", "mackerel", "sushi",
    ]) {
        return ["fa-fish".to_string(), "fish".to_string()];
    }
    if has_any(&["pizza"]) {
        return ["fa-pizza-slice".to_string(), "grain".to_string()];
    }
    if has_any(&["burger", "hamburger", "cheeseburger"]) {
        return ["fa-burger".to_string(), "meat".to_string()];
    }
    if has_any(&[
        "bread",
        "toast",
        "bagel",
        "bun",
        "wrap",
        "tortilla",
        "pita",
        "croissant",
        "sandwich",
    ]) {
        return ["fa-bread-slice".to_string(), "grain".to_string()];
    }
    if has_any(&[
        "rice",
        "pasta",
        "oat",
        "oats",
        "oatmeal",
        "porridge",
        "cereal",
        "granola",
        "quinoa",
        "noodle",
        "noodles",
        "couscous",
        "cheerios",
        "spaghetti",
    ]) {
        return ["fa-wheat-awn".to_string(), "grain".to_string()];
    }
    if has_any(&[
        "chocolate",
        "cookie",
        "cookies",
        "biscuit",
        "biscuits",
        "cake",
        "candy",
        "candies",
        "sweet",
        "sweets",
        "donut",
        "donuts",
        "nutella",
        "brownie",
        "brownies",
        "muffin",
        "muffins",
        "bar",
        "bars",
    ]) || name_lower.contains("ice cream")
    {
        return ["fa-cookie".to_string(), "sweet".to_string()];
    }
    if has_any(&[
        "nut",
        "nuts",
        "almond",
        "almonds",
        "peanut",
        "peanuts",
        "cashew",
        "cashews",
        "walnut",
        "walnuts",
        "pistachio",
        "pistachios",
        "seed",
        "seeds",
        "chia",
        "flax",
    ]) {
        return ["fa-seedling".to_string(), "nuts".to_string()];
    }
    if has_any(&[
        "milk",
        "yogurt",
        "yoghurt",
        "cheese",
        "cheddar",
        "mozzarella",
        "feta",
        "kefir",
        "cream",
        "skyr",
        "cottage",
        "whey",
    ]) {
        return ["fa-cheese".to_string(), "dairy".to_string()];
    }
    if has_any(&[
        "apple",
        "apples",
        "banana",
        "bananas",
        "berry",
        "berries",
        "orange",
        "oranges",
        "grape",
        "grapes",
        "mango",
        "melon",
        "peach",
        "pear",
        "pears",
        "kiwi",
        "pineapple",
        "cherry",
        "cherries",
        "fruit",
        "lemon",
        "avocado",
        "date",
        "dates",
    ]) {
        return ["fa-apple-whole".to_string(), "fruit".to_string()];
    }
    if has_any(&[
        "broccoli",
        "spinach",
        "salad",
        "lettuce",
        "kale",
        "carrot",
        "carrots",
        "tomato",
        "tomatoes",
        "pepper",
        "peppers",
        "cucumber",
        "onion",
        "onions",
        "bean",
        "beans",
        "peas",
        "lentil",
        "lentils",
        "chickpea",
        "chickpeas",
        "potato",
        "potatoes",
        "corn",
        "zucchini",
        "cauliflower",
        "mushroom",
        "mushrooms",
    ]) || words.iter().any(|w| w.starts_with("veg"))
    {
        return ["fa-carrot".to_string(), "veg".to_string()];
    }
    if has_any(&["oil", "olive", "ghee", "butter", "mayo", "dressing"]) {
        return ["fa-bottle-droplet".to_string(), "fat".to_string()];
    }

    if t.to_ascii_lowercase().contains("custom") {
        return ["fa-star".to_string(), "mine".to_string()];
    }
    ["fa-basket-shopping".to_string(), "pack".to_string()]
}

pub fn food_icon_html(food: &Value, size: &str) -> String {
    let [icon, tone] = food_icon(food);
    format!(
        "<span class=\"food-ico {} fi-{}\" aria-hidden=\"true\"><i class=\"fa-solid {}\"></i></span>",
        size, tone, icon
    )
}
