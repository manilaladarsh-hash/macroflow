use crate::json::{self, Map, Value};
use crate::nutrition::{js_round, LB_PER_KG};
use crate::types::{HealthCounts, HealthFieldClassification, ShortcutLineParsed, ShortcutValue};
use std::collections::{BTreeMap, BTreeSet};

pub fn parse_csv(text: &str) -> Vec<Vec<String>> {
    let src = text.strip_prefix('\u{feff}').unwrap_or(text);
    let first_line = src.lines().next().unwrap_or("");
    let mut counts = [
        (',', first_line.split(',').count()),
        (';', first_line.split(';').count()),
        ('\t', first_line.split('\t').count()),
    ];
    counts.sort_by(|a, b| b.1.cmp(&a.1));
    let delimiter = if counts[0].1 > 1 { counts[0].0 } else { ',' };

    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut row: Vec<String> = Vec::new();
    let mut field = String::new();
    let mut in_quotes = false;
    let chars: Vec<char> = src.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let ch = chars[i];
        if in_quotes {
            if ch == '"' && i + 1 < chars.len() && chars[i + 1] == '"' {
                field.push('"');
                i += 1;
            } else if ch == '"' {
                in_quotes = false;
            } else {
                field.push(ch);
            }
        } else if ch == '"' {
            in_quotes = true;
        } else if ch == delimiter {
            row.push(std::mem::take(&mut field));
        } else if ch == '\n' || ch == '\r' {
            if ch == '\r' && i + 1 < chars.len() && chars[i + 1] == '\n' {
                i += 1;
            }
            row.push(std::mem::take(&mut field));
            if row.iter().any(|v| !v.trim().is_empty()) {
                rows.push(std::mem::take(&mut row));
            } else {
                row.clear();
            }
        } else {
            field.push(ch);
        }
        i += 1;
    }
    row.push(field);
    if row.iter().any(|v| !v.trim().is_empty()) {
        rows.push(row);
    }
    rows
}

fn month_from_name(name: &str) -> Option<u32> {
    match name.to_ascii_lowercase().get(0..3)? {
        "jan" => Some(1),
        "feb" => Some(2),
        "mar" => Some(3),
        "apr" => Some(4),
        "may" => Some(5),
        "jun" => Some(6),
        "jul" => Some(7),
        "aug" => Some(8),
        "sep" => Some(9),
        "oct" => Some(10),
        "nov" => Some(11),
        "dec" => Some(12),
        _ => None,
    }
}

pub fn parse_health_date_str(raw: &str) -> Option<String> {
    let s = raw.trim();
    if s.is_empty() {
        return None;
    }

    // 1. YYYY-MM-DD
    if s.len() == 10 {
        let b = s.as_bytes();
        if b[4] == b'-'
            && b[7] == b'-'
            && b[0..4].iter().all(|c| c.is_ascii_digit())
            && b[5..7].iter().all(|c| c.is_ascii_digit())
            && b[8..10].iter().all(|c| c.is_ascii_digit())
        {
            return Some(s.to_string());
        }
    }

    // 2. YYYYMMDD
    if s.len() == 8 && s.bytes().all(|b| b.is_ascii_digit()) {
        return Some(format!("{}-{}-{}", &s[0..4], &s[4..6], &s[6..8]));
    }

    // 3. YYYY-MM-DD[T ]HH:MM...
    if s.len() >= 16 {
        let b = s.as_bytes();
        if b[4] == b'-'
            && b[7] == b'-'
            && (b[10] == b'T' || b[10] == b' ')
            && b[13] == b':'
            && b[0..4].iter().all(|c| c.is_ascii_digit())
            && b[5..7].iter().all(|c| c.is_ascii_digit())
            && b[8..10].iter().all(|c| c.is_ascii_digit())
            && b[11..13].iter().all(|c| c.is_ascii_digit())
            && b[14..16].iter().all(|c| c.is_ascii_digit())
        {
            return Some(s[0..10].to_string());
        }
    }

    // 4. US M/D/Y (e.g. 10/09/26 08:00:00 or 10/09/2026)
    let token = s.split_whitespace().next().unwrap_or("");
    let slash_parts: Vec<&str> = token.split('/').collect();
    if slash_parts.len() == 3
        && slash_parts.iter().all(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()))
    {
        let month: u32 = slash_parts[0].parse().ok()?;
        let day: u32 = slash_parts[1].parse().ok()?;
        let y_raw: u32 = slash_parts[2].parse().ok()?;
        let year = if slash_parts[2].len() == 2 {
            2000 + y_raw
        } else if slash_parts[2].len() == 4 {
            y_raw
        } else {
            return None;
        };
        if (1..=12).contains(&month) && (1..=31).contains(&day) {
            return Some(format!("{:04}-{:02}-{:02}", year, month, day));
        }
    }

    // 5. D.M.YYYY (e.g. 09.10.2026)
    let dot_parts: Vec<&str> = token.split('.').collect();
    if dot_parts.len() == 3
        && dot_parts[2].len() == 4
        && dot_parts.iter().all(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()))
    {
        let day: u32 = dot_parts[0].parse().ok()?;
        let month: u32 = dot_parts[1].parse().ok()?;
        let year: u32 = dot_parts[2].parse().ok()?;
        if (1..=12).contains(&month) && (1..=31).contains(&day) {
            return Some(format!("{:04}-{:02}-{:02}", year, month, day));
        }
    }

    // 6. Month name formats like "Oct 15, 2026" or "15 Oct 2026"
    let cleaned: String = s
        .chars()
        .map(|c| if c == ',' { ' ' } else { c })
        .collect();
    let words: Vec<&str> = cleaned.split_whitespace().collect();
    if words.len() >= 3 {
        if let Some(m) = month_from_name(words[0]) {
            if let (Ok(d), Ok(y)) = (words[1].parse::<u32>(), words[2].parse::<u32>()) {
                if (1..=31).contains(&d) && (1900..=2100).contains(&y) {
                    return Some(format!("{:04}-{:02}-{:02}", y, m, d));
                }
            }
        } else if let Some(m) = month_from_name(words[1]) {
            if let (Ok(d), Ok(y)) = (words[0].parse::<u32>(), words[2].parse::<u32>()) {
                if (1..=31).contains(&d) && (1900..=2100).contains(&y) {
                    return Some(format!("{:04}-{:02}-{:02}", y, m, d));
                }
            }
        }
    }

    None
}

pub fn health_number(value: &Value) -> Option<f64> {
    match value {
        Value::Null => None,
        Value::Number(n) => n.as_f64().filter(|x| x.is_finite()),
        Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                return None;
            }
            let no_commas = trimmed.replace(',', "");
            no_commas.parse::<f64>().ok().filter(|x| x.is_finite())
        }
        _ => None,
    }
}

pub fn classify_health_field(name: &str, file_name: &str) -> Option<HealthFieldClassification> {
    let n = name.to_ascii_lowercase();
    let f = file_name.to_ascii_lowercase();

    let skip_words = [
        "goal",
        "target",
        "max",
        "min",
        "minutes",
        "distance",
        "floors",
        "elevation",
        "heart",
        "bpm",
        "bmi",
        "fat",
        "water",
        "sodium",
        "protein",
        "carb",
    ];
    if skip_words.iter().any(|w| n.contains(w)) {
        if !(n.starts_with("average weight") || n.starts_with("weight")) {
            return None;
        }
    }

    if n.contains("step") {
        return Some(HealthFieldClassification {
            metric: "steps".to_string(),
            kind: None,
            unit: None,
        });
    }

    let has_cal_word = n.contains("calor") || n.contains("kcal") || n.contains("energy");
    let has_intake_word = n.contains("intake")
        || n.contains("consum")
        || n.contains("eaten")
        || n.contains("food")
        || n.contains("bmr")
        || n.contains("basal")
        || n.contains("resting")
        || n.split(|c: char| !c.is_ascii_alphanumeric())
            .any(|w| w == "in");
    if has_cal_word && !has_intake_word {
        let kind = if n.contains("active")
            || n.contains("exercise")
            || n.contains("workout")
            || n.contains("activity")
        {
            Some("active".to_string())
        } else if n.contains("total") || n.contains("burn") || n.contains("out") {
            Some("total".to_string())
        } else {
            None
        };
        return Some(HealthFieldClassification {
            metric: "calories".to_string(),
            kind,
            unit: None,
        });
    }

    let is_weight = n.contains("weight") || n.contains("body mass");
    let is_excluded_weight =
        n.contains("max") || n.contains("min") || n.contains("goal") || n.contains("lean");
    if is_weight && !is_excluded_weight {
        let words: Vec<&str> = n
            .split(|c: char| !c.is_ascii_alphanumeric())
            .filter(|s| !s.is_empty())
            .collect();
        let unit = if words.contains(&"kg") || n.contains("kilo") || n.contains("(kg)") {
            Some("kg".to_string())
        } else if words.contains(&"lb") || words.contains(&"lbs") || n.contains("pound") {
            Some("lbs".to_string())
        } else {
            None
        };
        return Some(HealthFieldClassification {
            metric: "weight".to_string(),
            kind: None,
            unit,
        });
    }

    if n == "value" {
        if f.contains("step") {
            return Some(HealthFieldClassification {
                metric: "steps".to_string(),
                kind: None,
                unit: None,
            });
        }
        if f.contains("calor") || f.contains("energy") {
            return Some(HealthFieldClassification {
                metric: "calories".to_string(),
                kind: if f.contains("active") {
                    Some("active".to_string())
                } else {
                    None
                },
                unit: None,
            });
        }
        if f.contains("weight") {
            return Some(HealthFieldClassification {
                metric: "weight".to_string(),
                kind: None,
                unit: None,
            });
        }
    }

    None
}

fn is_exact_date_field(s: &str) -> bool {
    matches!(
        s.trim().to_ascii_lowercase().as_str(),
        "date"
            | "day"
            | "datetime"
            | "date time"
            | "start time"
            | "start_time"
            | "starttime"
            | "timestamp"
            | "time"
            | "start"
            | "summary date"
            | "calendar date"
    )
}

pub fn pick_date_field(names: &[String]) -> Option<String> {
    if let Some(found) = names.iter().find(|n| is_exact_date_field(n)) {
        return Some(found.clone());
    }
    if let Some(found) = names.iter().find(|n| {
        let l = n.to_ascii_lowercase();
        (l.contains("date") || l.contains("day")) && !l.contains("update") && !l.contains("birth")
    }) {
        return Some(found.clone());
    }
    names
        .iter()
        .find(|n| n.to_ascii_lowercase().contains("time"))
        .cloned()
}

fn is_thousands_grouped(s: &str, sep: char, allow_negative: bool) -> bool {
    let rest = if allow_negative {
        s.strip_prefix('-').unwrap_or(s)
    } else {
        s
    };
    let parts: Vec<&str> = rest.split(sep).collect();
    if parts.len() != 2 {
        return false;
    }
    let left = parts[0];
    let right = parts[1];
    (1..=3).contains(&left.len())
        && left.bytes().all(|b| b.is_ascii_digit())
        && right.len() == 3
        && right.bytes().all(|b| b.is_ascii_digit())
}

pub fn parse_shortcut_value(raw: &str, metric: &str) -> Option<ShortcutValue> {
    let collapsed = raw
        .chars()
        .map(|c| {
            if c.is_whitespace() || c == '\u{00a0}' || c == '\u{202f}' {
                ' '
            } else {
                c
            }
        })
        .collect::<String>();
    let text = collapsed.trim();
    if text.is_empty() {
        return None;
    }

    // Extract trailing ASCII letters as unit
    let trimmed_end = text.trim_end();
    let unit_start = trimmed_end
        .rfind(|c: char| !c.is_ascii_alphabetic())
        .map(|idx| idx + 1)
        .unwrap_or(0);
    let unit = trimmed_end[unit_start..].to_ascii_lowercase();
    let without_unit = &trimmed_end[..unit_start];

    let mut s: String = without_unit
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '\'')
        .collect();

    if s.is_empty() {
        return None;
    }
    let body_check = s.strip_prefix('-').unwrap_or(&s);
    if body_check.is_empty()
        || !body_check
            .bytes()
            .all(|b| b.is_ascii_digit() || b == b'.' || b == b',')
    {
        return None;
    }

    let commas = s.bytes().filter(|&b| b == b',').count();
    let dots = s.bytes().filter(|&b| b == b'.').count();

    if commas > 0 && dots > 0 {
        if s.rfind(',') > s.rfind('.') {
            s = s.replace('.', "").replace(',', ".");
        } else {
            s = s.replace(',', "");
        }
    } else if commas > 0 {
        let grouping =
            commas > 1 || (is_thousands_grouped(&s, ',', true) && metric != "weight");
        if grouping {
            s = s.replace(',', "");
        } else {
            s = s.replace(',', ".");
        }
    } else if dots > 1 || (dots == 1 && metric == "steps" && is_thousands_grouped(&s, '.', false))
    {
        s = s.replace('.', "");
    }

    let value = s.parse::<f64>().ok().filter(|x| x.is_finite())?;
    Some(ShortcutValue { value, unit })
}

fn shortcut_metric_canonical(name: &str) -> Option<&'static str> {
    match name {
        "steps" | "step" | "step_count" => Some("steps"),
        "active" | "active_kcal" | "active_energy" | "active_calories" => Some("active"),
        "resting" | "resting_kcal" | "resting_energy" | "basal" | "basal_energy" => Some("resting"),
        "weight" | "weight_kg" | "weight_lb" | "weight_lbs" | "body_mass" => Some("weight"),
        _ => None,
    }
}

pub fn parse_shortcut_line(line: &str) -> Option<ShortcutLineParsed> {
    let sep_idx = line.find(|c: char| c == ';' || c == ',' || c == '\t' || c == '|')?;
    let raw_metric = line[..sep_idx].trim();
    if raw_metric.is_empty()
        || !raw_metric.chars().next()?.is_ascii_alphabetic()
        || !raw_metric
            .chars()
            .all(|c| c.is_ascii_alphabetic() || c == ' ' || c == '_')
    {
        return None;
    }
    let metric_name = raw_metric
        .to_ascii_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("_");
    let metric = shortcut_metric_canonical(&metric_name)?;

    let rest = line[sep_idx + 1..].trim();
    let has_primary_sep = rest.contains(';') || rest.contains('\t') || rest.contains('|');

    let (date, value_text) = if has_primary_sep {
        let parts: Vec<&str> = rest
            .split(|c: char| c == ';' || c == '\t' || c == '|')
            .map(|s| s.trim())
            .collect();
        if parts.len() < 2 {
            return None;
        }
        (parse_health_date_str(parts[0]), parts[1..].join(" "))
    } else {
        let parts: Vec<&str> = rest.split(',').map(|s| s.trim()).collect();
        if parts.is_empty() {
            return None;
        }
        let d1 = parse_health_date_str(parts[0]);
        if d1.is_some() {
            (d1, parts[1..].join(","))
        } else if parts.len() >= 3 {
            let combined = format!("{}, {}", parts[0], parts[1]);
            (parse_health_date_str(&combined), parts[2..].join(","))
        } else {
            (None, String::new())
        }
    };

    let date = date?;
    let parsed = parse_shortcut_value(&value_text, metric)?;
    if parsed.value < 0.0 {
        return None;
    }

    let mut value = parsed.value;
    let unit = parsed.unit.as_str();
    if metric == "weight" {
        let is_lb = matches!(unit, "lb" | "lbs" | "pound" | "pounds")
            || (unit.is_empty()
                && (metric_name.ends_with("_lb") || metric_name.ends_with("_lbs")));
        if unit == "st" {
            value *= 6.35029;
        } else if is_lb {
            value /= LB_PER_KG;
        } else if unit == "g" {
            value /= 1000.0;
        }
    } else if metric != "steps" && unit == "kj" {
        value /= 4.184;
    }

    Some(ShortcutLineParsed {
        metric: metric.to_string(),
        date,
        value,
    })
}

fn is_shortcut_header(line: &str) -> bool {
    let t = line.trim().to_ascii_lowercase();
    if let Some(rest) = t.strip_prefix("macroflow health v1") {
        rest.is_empty()
            || !rest
                .chars()
                .next()
                .map(|c| c.is_ascii_alphanumeric() || c == '_')
                .unwrap_or(false)
    } else {
        false
    }
}

pub fn parse_shortcut_payload(text: &str, require_header: bool) -> Option<Value> {
    let stripped = text.strip_prefix('\u{feff}').unwrap_or(text);
    let lines: Vec<&str> = stripped
        .split(['\r', '\n'])
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();
    if lines.is_empty() {
        return None;
    }
    let has_header = is_shortcut_header(lines[0]);
    if require_header && !has_header {
        return None;
    }

    let data_lines = if has_header { &lines[1..] } else { &lines[..] };
    let mut raw: BTreeMap<String, BTreeMap<String, f64>> = BTreeMap::new();
    let mut rows = 0usize;

    for line in data_lines {
        if let Some(r) = parse_shortcut_line(line) {
            let day = raw.entry(r.date).or_default();
            if r.metric == "weight" {
                day.insert(r.metric, r.value);
            } else {
                let prev = day.get(&r.metric).copied().unwrap_or(0.0);
                day.insert(r.metric, prev + r.value);
            }
            rows += 1;
        }
    }

    if rows == 0 {
        return None;
    }

    let mut days = Map::new();
    let mut counts = HealthCounts::default();

    for (date, d) in raw {
        let mut out = Map::new();
        if let Some(&steps) = d.get("steps") {
            out.insert("steps".to_string(), json!(js_round(steps) as i64));
            counts.steps += 1;
        }
        let active_val = d.get("active").copied();
        if let Some(active) = active_val {
            out.insert("active".to_string(), json!(js_round(active) as i64));
        }
        if let Some(&resting) = d.get("resting") {
            let total = js_round(resting + active_val.unwrap_or(0.0)) as i64;
            out.insert("total".to_string(), json!(total));
        }
        if out.contains_key("active") || out.contains_key("total") {
            counts.calories += 1;
        }
        if let Some(&weight) = d.get("weight") {
            if weight > 0.0 {
                out.insert(
                    "weight".to_string(),
                    json!(js_round(weight * 100.0) / 100.0),
                );
                counts.weight += 1;
            }
        }
        if !out.is_empty() {
            days.insert(date, Value::Object(out));
        }
    }

    if days.is_empty() {
        return None;
    }
    let from = days.keys().next().cloned().unwrap_or_default();
    let to = days.keys().next_back().cloned().unwrap_or_default();

    Some(json!({
        "days": Value::Object(days),
        "files": ["Apple Health"],
        "origin": "apple-health",
        "caloriesKind": Value::Null,
        "weightUnit": "kg",
        "counts": counts,
        "from": from,
        "to": to
    }))
}

pub fn parse_health_file(file_name: &str, text: &str) -> Value {
    let stripped = text.strip_prefix('\u{feff}').unwrap_or(text);
    if is_shortcut_header(stripped.lines().next().unwrap_or("")) {
        if let Some(synced) = parse_shortcut_payload(text, true) {
            let days = synced.get("days").cloned().unwrap_or_else(|| json!({}));
            let rows = days.as_object().map(|m| m.len()).unwrap_or(0);
            return json!({
                "days": days,
                "metrics": [],
                "caloriesKind": Value::Null,
                "weightUnit": "kg",
                "rows": rows,
                "file": file_name,
                "origin": "apple-health"
            });
        }
        return json!({
            "days": {},
            "metrics": [],
            "caloriesKind": Value::Null,
            "weightUnit": Value::Null,
            "rows": 0,
            "file": file_name
        });
    }

    let mut days: BTreeMap<String, BTreeMap<String, f64>> = BTreeMap::new();
    let mut metrics: BTreeSet<String> = BTreeSet::new();
    let mut calories_kind: Option<String> = None;
    let mut weight_unit: Option<String> = None;
    let mut row_count: usize = 0;

    let mut add = |date: Option<String>, metric: &str, value: Option<f64>, last_wins: bool| {
        if let (Some(d), Some(v)) = (date, value) {
            if v < 0.0 {
                return;
            }
            let day = days.entry(d).or_default();
            if last_wins {
                day.insert(metric.to_string(), v);
            } else {
                let prev = day.get(metric).copied().unwrap_or(0.0);
                day.insert(metric.to_string(), prev + v);
            }
            metrics.insert(metric.to_string());
            row_count += 1;
        }
    };

    let trimmed = text.trim();
    if trimmed.starts_with('[') || trimmed.starts_with('{') {
        if let Ok(data) = json::from_str(trimmed) {
            let list_opt: Option<Vec<Value>> = if let Some(arr) = data.as_array() {
                Some(arr.clone())
            } else if let Some(arr) = data.get("data").and_then(|v| v.as_array()) {
                Some(arr.clone())
            } else if let Some(obj) = data.as_object() {
                obj.values()
                    .find(|v| {
                        v.as_array()
                            .map(|a| !a.is_empty() && a[0].is_object())
                            .unwrap_or(false)
                    })
                    .and_then(|v| v.as_array().cloned())
            } else {
                None
            };

            if let Some(list) = list_opt {
                if let Some(first_obj) = list.first().and_then(|v| v.as_object()) {
                    let keys: Vec<String> = first_obj.keys().cloned().collect();
                    let date_key = pick_date_field(&keys);
                    let fields: Vec<(String, HealthFieldClassification)> = keys
                        .iter()
                        .filter_map(|k| {
                            classify_health_field(k, file_name).map(|c| (k.clone(), c))
                        })
                        .collect();

                    for (_, c) in &fields {
                        if c.metric == "calories" && c.kind.is_some() {
                            calories_kind = c.kind.clone();
                        }
                        if c.metric == "weight" && c.unit.is_some() {
                            weight_unit = c.unit.clone();
                        }
                    }

                    for item in &list {
                        let date_val = date_key
                            .as_ref()
                            .and_then(|dk| item.get(dk))
                            .or_else(|| item.get("date"));
                        let date_str = match date_val {
                            Some(Value::String(s)) => parse_health_date_str(s),
                            Some(Value::Number(n)) => parse_health_date_str(&n.to_string()),
                            _ => None,
                        };
                        for (k, c) in &fields {
                            let raw_v = item
                                .get(k)
                                .and_then(|v| v.get("value").or(Some(v)))
                                .unwrap_or(&Value::Null);
                            let v = health_number(raw_v);
                            add(date_str.clone(), &c.metric, v, c.metric == "weight");
                        }
                    }
                }
            }
        }
    } else {
        let rows = parse_csv(text);
        if rows.len() >= 2 {
            let header_index = rows
                .iter()
                .position(|r| {
                    let trimmed_cols: Vec<String> =
                        r.iter().map(|c| c.trim().to_string()).collect();
                    pick_date_field(&trimmed_cols).is_some()
                })
                .unwrap_or(0);

            let header: Vec<String> = rows[header_index]
                .iter()
                .map(|h| h.trim().to_string())
                .collect();

            if let Some(picked_date) = pick_date_field(&header) {
                if let Some(date_col) = header.iter().position(|h| h == &picked_date) {
                    let cols: Vec<(usize, HealthFieldClassification)> = header
                        .iter()
                        .enumerate()
                        .filter_map(|(i, h)| classify_health_field(h, file_name).map(|c| (i, c)))
                        .collect();

                    let weight_cols_count =
                        cols.iter().filter(|(_, c)| c.metric == "weight").count();
                    let keep_cols: Vec<(usize, HealthFieldClassification)> = cols
                        .into_iter()
                        .filter(|(i, c)| {
                            if c.metric != "weight" || weight_cols_count < 2 {
                                true
                            } else {
                                let hl = header[*i].to_ascii_lowercase();
                                hl.contains("average") || hl.starts_with("weight")
                            }
                        })
                        .collect();

                    for (_, c) in &keep_cols {
                        if c.metric == "calories" && c.kind.is_some() {
                            calories_kind = c.kind.clone();
                        }
                        if c.metric == "weight" && c.unit.is_some() {
                            weight_unit = c.unit.clone();
                        }
                    }

                    let cal_cols: Vec<&(usize, HealthFieldClassification)> = keep_cols
                        .iter()
                        .filter(|(_, c)| c.metric == "calories")
                        .collect();
                    let chosen_cal = cal_cols
                        .iter()
                        .find(|(_, c)| c.kind.as_deref() == Some("active"))
                        .or_else(|| {
                            cal_cols
                                .iter()
                                .find(|(_, c)| c.kind.as_deref() == Some("total"))
                        })
                        .or_else(|| cal_cols.first())
                        .copied();

                    if let Some((_, cc)) = chosen_cal {
                        if cc.kind.is_some() {
                            calories_kind = cc.kind.clone();
                        }
                    }

                    let final_cols: Vec<&(usize, HealthFieldClassification)> = keep_cols
                        .iter()
                        .filter(|(i, c)| {
                            c.metric != "calories"
                                || chosen_cal.map(|(ci, _)| ci == i).unwrap_or(false)
                        })
                        .collect();

                    for r in &rows[header_index + 1..] {
                        let date_str = r.get(date_col).and_then(|s| parse_health_date_str(s));
                        for (i, c) in &final_cols {
                            let v = r
                                .get(*i)
                                .and_then(|s| health_number(&Value::String(s.clone())));
                            add(date_str.clone(), &c.metric, v, c.metric == "weight");
                        }
                    }
                }
            }
        }
    }

    json!({
        "days": days,
        "metrics": metrics.into_iter().collect::<Vec<_>>(),
        "caloriesKind": calories_kind,
        "weightUnit": weight_unit,
        "rows": row_count,
        "file": file_name
    })
}

pub fn merge_health_results(results: &[Value], user_unit: &str) -> Value {
    let mut days: BTreeMap<String, BTreeMap<String, f64>> = BTreeMap::new();
    let mut calories_kind: Option<String> = None;
    let mut weight_unit: Option<String> = None;
    let mut files: Vec<String> = Vec::new();
    let mut origin: Option<String> = None;

    for r in results {
        let rows = r.get("rows").and_then(|v| v.as_u64()).unwrap_or(0);
        if rows == 0 {
            continue;
        }
        if let Some(f) = r.get("file").and_then(|v| v.as_str()) {
            files.push(f.to_string());
        }
        if calories_kind.is_none() {
            calories_kind = r
                .get("caloriesKind")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
        }
        if weight_unit.is_none() {
            weight_unit = r
                .get("weightUnit")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
        }
        if origin.is_none() {
            origin = r
                .get("origin")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
        }
        if let Some(r_days) = r.get("days").and_then(|v| v.as_object()) {
            for (date, values) in r_days {
                if let Some(v_obj) = values.as_object() {
                    let day = days.entry(date.clone()).or_default();
                    for (metric, val) in v_obj {
                        if let Some(num) = val.as_f64() {
                            if metric == "weight" {
                                day.insert(metric.clone(), num);
                            } else {
                                let prev = day.get(metric).copied().unwrap_or(0.0);
                                day.insert(metric.clone(), prev.max(num));
                            }
                        }
                    }
                }
            }
        }
    }

    let mut counts = HealthCounts::default();
    let mut from: Option<String> = None;
    let mut to: Option<String> = None;

    for (date, v) in &days {
        if v.contains_key("steps") {
            counts.steps += 1;
        }
        if v.contains_key("calories") || v.contains_key("active") || v.contains_key("total") {
            counts.calories += 1;
        }
        if v.contains_key("weight") {
            counts.weight += 1;
        }
        if from.as_ref().map(|f| date < f).unwrap_or(true) {
            from = Some(date.clone());
        }
        if to.as_ref().map(|t| date > t).unwrap_or(true) {
            to = Some(date.clone());
        }
    }

    if calories_kind.is_none() && days.values().any(|d| d.contains_key("calories")) {
        let mut cal_vals: Vec<f64> = days
            .values()
            .filter_map(|d| d.get("calories").copied())
            .filter(|&v| v > 0.0)
            .collect();
        cal_vals.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let median = cal_vals.get(cal_vals.len() / 2).copied().unwrap_or(0.0);
        calories_kind = Some(if median > 1200.0 {
            "total".to_string()
        } else {
            "active".to_string()
        });
    }

    if weight_unit.is_none() && counts.weight > 0 {
        let w_vals: Vec<f64> = days
            .values()
            .filter_map(|d| d.get("weight").copied())
            .filter(|&v| v > 0.0)
            .collect();
        let avg = if w_vals.is_empty() {
            0.0
        } else {
            w_vals.iter().sum::<f64>() / (w_vals.len() as f64)
        };
        weight_unit = Some(if avg > 140.0 {
            "lbs".to_string()
        } else if user_unit == "kg" || avg < 90.0 {
            "kg".to_string()
        } else {
            "lbs".to_string()
        });
    }

    let mut out = json!({
        "days": days,
        "files": files,
        "caloriesKind": calories_kind,
        "weightUnit": weight_unit,
        "counts": counts,
        "from": from,
        "to": to
    });
    if let Some(orig) = origin {
        if let Some(obj) = out.as_object_mut() {
            obj.insert("origin".to_string(), json!(orig));
        }
    }
    out
}
