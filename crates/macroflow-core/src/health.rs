use crate::json::{self, IntoValue, Map, Value};
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

// ---------------------------------------------------------------------------
// Date reading (Apple Health Shortcut output and health files)
// ---------------------------------------------------------------------------
// The Shortcut prints dates however the iPhone is set up: "Nov 7, 2026 at
// 12:00 AM", "11/7/26, 12:00 AM", "7.11.2026, 00:00", ISO 8601 with an
// offset, and so on. Each one is turned into a local YYYY-MM-DD key.

#[derive(Debug, Clone, Default)]
pub struct DateOptions {
    /// Minutes east of UTC on the user's device (e.g. -300 for EST). When set,
    /// zoned timestamps (`Z`, `+02:00`) and Unix times become the local day.
    pub tz_offset_min: Option<i32>,
    /// For ambiguous `a/b/yyyy` dates: true = month first (US), false = day first.
    pub month_first: Option<bool>,
    /// Today's local key (YYYY-MM-DD), used to read "Today" and "Yesterday".
    pub today: Option<String>,
}

fn days_in_month(y: i64, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 => 29,
        2 => 28,
        _ => 0,
    }
}

// Howard Hinnant's civil-date algorithms (proleptic Gregorian).
pub fn days_from_civil(y: i64, m: u32, d: u32) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = (if y >= 0 { y } else { y - 399 }) / 400;
    let yoe = y - era * 400;
    let mp = (m as i64 + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d as i64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

pub fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719468;
    let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

fn ymd_key(y: i64, m: u32, d: u32) -> Option<String> {
    if !(1900..=2200).contains(&y) || !(1..=12).contains(&m) || d == 0 || d > days_in_month(y, m) {
        return None;
    }
    Some(format!("{:04}-{:02}-{:02}", y, m, d))
}

fn key_from_epoch_minutes(minutes: i64) -> Option<String> {
    let (y, m, d) = civil_from_days(minutes.div_euclid(1440));
    ymd_key(y, m, d)
}

fn parse_key(key: &str) -> Option<(i64, u32, u32)> {
    let b = key.as_bytes();
    if b.len() != 10 || b[4] != b'-' || b[7] != b'-' {
        return None;
    }
    Some((key[0..4].parse().ok()?, key[5..7].parse().ok()?, key[8..10].parse().ok()?))
}

pub fn shift_date_key(key: &str, delta_days: i64) -> Option<String> {
    let (y, m, d) = parse_key(key)?;
    let (y2, m2, d2) = civil_from_days(days_from_civil(y, m, d) + delta_days);
    ymd_key(y2, m2, d2)
}

fn month_from_name(name: &str) -> Option<u32> {
    let w = name.trim_end_matches('.').to_lowercase();
    if w.chars().count() < 3 || !w.chars().all(|c| c.is_alphabetic()) {
        return None;
    }
    let p: String = w.chars().take(3).collect();
    // English first, then common European spellings iPhones print.
    Some(match p.as_str() {
        "jan" | "ene" | "gen" => 1,
        "feb" | "fév" | "fev" => 2,
        "mar" | "mär" | "mrz" => 3,
        "apr" | "abr" | "avr" => 4,
        "may" | "mai" | "mag" => 5,
        "jun" | "giu" => 6,
        "jul" | "lug" => 7,
        "aug" | "ago" | "aoû" | "aou" => 8,
        "sep" | "set" => 9,
        "oct" | "okt" | "ott" => 10,
        "nov" => 11,
        "dec" | "dez" | "dic" | "déc" => 12,
        _ => return None,
    })
}

fn is_weekday(word: &str) -> bool {
    matches!(
        word.trim_end_matches('.').to_lowercase().as_str(),
        "mon" | "monday" | "tue" | "tues" | "tuesday" | "wed" | "wednesday" | "thu" | "thur"
            | "thurs" | "thursday" | "fri" | "friday" | "sat" | "saturday" | "sun" | "sunday"
    )
}

fn digits(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit())
}

/// A zone suffix like `Z`, `UTC`, `+02:00`, `-0500` or `+05` → minutes east of UTC.
fn parse_zone(rest: &str) -> Option<i32> {
    let z = rest.trim();
    if z.eq_ignore_ascii_case("z") || z.eq_ignore_ascii_case("utc") || z.eq_ignore_ascii_case("gmt") {
        return Some(0);
    }
    let z = z
        .strip_prefix("UTC")
        .or_else(|| z.strip_prefix("GMT"))
        .unwrap_or(z);
    let sign = match z.chars().next()? {
        '+' => 1,
        '-' | '\u{2212}' => -1,
        _ => return None,
    };
    let body: String = z.chars().skip(1).filter(|c| *c != ':').collect();
    if !digits(&body) {
        return None;
    }
    let (h, m) = match body.len() {
        1 | 2 => (body.parse::<i32>().ok()?, 0),
        4 => (body[0..2].parse::<i32>().ok()?, body[2..4].parse::<i32>().ok()?),
        _ => return None,
    };
    if h > 14 || m > 59 {
        return None;
    }
    Some(sign * (h * 60 + m))
}

/// `YYYY-MM-DD` / `YYYY/MM/DD`, optionally followed by `[T ]HH:MM[:SS[.fff]]` and a zone.
fn parse_iso_like(s: &str) -> Option<((i64, u32, u32), Option<(i64, i64)>, Option<i32>)> {
    let b = s.as_bytes();
    if b.len() < 10 || !(b[4] == b'-' || b[4] == b'/') || b[7] != b[4] {
        return None;
    }
    if !digits(&s[0..4]) || !digits(&s[5..7]) || !digits(&s[8..10]) {
        return None;
    }
    let date = (s[0..4].parse().ok()?, s[5..7].parse().ok()?, s[8..10].parse().ok()?);
    let rest = &s[10..];
    if rest.is_empty() {
        return Some((date, None, None));
    }
    if rest.as_bytes()[0].is_ascii_digit() {
        return None;
    }
    let rb = rest.as_bytes();
    if rb.len() >= 6 && (rb[0] == b'T' || rb[0] == b' ') && rb[3] == b':' && digits(&rest[1..3]) && digits(&rest[4..6]) {
        let h: i64 = rest[1..3].parse().ok()?;
        let mi: i64 = rest[4..6].parse().ok()?;
        let mut tail = &rest[6..];
        if tail.len() >= 3 && tail.as_bytes()[0] == b':' && digits(&tail[1..3]) {
            tail = &tail[3..];
            if let Some(frac) = tail.strip_prefix('.') {
                let n = frac.bytes().take_while(|c| c.is_ascii_digit()).count();
                tail = &frac[n..];
            }
        }
        return Some((date, Some((h, mi)), parse_zone(tail)));
    }
    Some((date, None, None))
}

/// Reads one date into a local YYYY-MM-DD key, or `None` if it isn't a date.
pub fn parse_health_date_opts(raw: &str, opts: &DateOptions) -> Option<String> {
    let cleaned: String = raw
        .chars()
        .map(|c| if matches!(c, '\u{a0}' | '\u{202f}' | '\u{2009}') { ' ' } else { c })
        .collect();
    let s = cleaned.trim().trim_matches(|c| c == '"' || c == '\'').trim();
    if s.is_empty() {
        return None;
    }

    // Unix seconds or milliseconds.
    if (10..=13).contains(&s.len()) && digits(s) {
        let n: i64 = s.parse().ok()?;
        let ms = if n < 1_000_000_000_000 { n * 1000 } else { n };
        return key_from_epoch_minutes(ms.div_euclid(60_000) + opts.tz_offset_min.unwrap_or(0) as i64);
    }

    // YYYYMMDD
    if s.len() == 8 && digits(s) {
        return ymd_key(s[0..4].parse().ok()?, s[4..6].parse().ok()?, s[6..8].parse().ok()?);
    }

    // ISO 8601 and friends. A zoned timestamp becomes the device's local day;
    // a naive one keeps the date it shows.
    if let Some(((y, m, d), time, zone)) = parse_iso_like(s) {
        if let (Some((h, mi)), Some(z), Some(local)) = (time, zone, opts.tz_offset_min) {
            ymd_key(y, m, d)?;
            let minutes = days_from_civil(y, m, d) * 1440 + h * 60 + mi - z as i64 + local as i64;
            return key_from_epoch_minutes(minutes);
        }
        return ymd_key(y, m, d);
    }

    let words: Vec<String> = s
        .replace(',', " ")
        .split_whitespace()
        .map(|w| w.to_string())
        .collect();

    // "Today at 7:00 AM" / "Yesterday at 12:00 AM"
    if let (Some(first), Some(today)) = (words.first(), opts.today.as_deref()) {
        match first.to_lowercase().as_str() {
            "today" => return shift_date_key(today, 0),
            "yesterday" => return shift_date_key(today, -1),
            _ => {}
        }
    }

    // Numeric dates: 11/7/26, 7.11.2026, 07-11-2026 (with or without a trailing comma).
    let token = s
        .split_whitespace()
        .next()
        .unwrap_or("")
        .trim_end_matches(|c| c == ',' || c == ';' || c == '.');
    for sep in ['/', '.', '-'] {
        let parts: Vec<&str> = token.split(sep).collect();
        if parts.len() != 3 || !parts.iter().all(|p| digits(p) && p.len() <= 4) {
            continue;
        }
        let (a, b, c): (u32, u32, u32) = (parts[0].parse().ok()?, parts[1].parse().ok()?, parts[2].parse().ok()?);
        if parts[0].len() == 4 {
            return ymd_key(a as i64, b, c);
        }
        let year = match parts[2].len() {
            2 => 2000 + c as i64,
            4 => c as i64,
            _ => return None,
        };
        let month_first = if a > 12 && b <= 12 {
            false
        } else if b > 12 && a <= 12 {
            true
        } else if sep == '/' {
            opts.month_first.unwrap_or(true)
        } else {
            false
        };
        return if month_first { ymd_key(year, a, b) } else { ymd_key(year, b, a) };
    }

    // Month names: "Nov 7, 2026 at 12:00 AM", "Saturday, November 7, 2026",
    // "7 Nov 2026 at 00:00", "7. Nov. 2026", "November 7th, 2026".
    let tokens: Vec<String> = words
        .iter()
        .map(|w| w.trim_end_matches('.').to_string())
        .filter(|w| !w.is_empty() && !is_weekday(w))
        .collect();
    let number = |w: &str| -> Option<u32> {
        let t = w.trim_end_matches(|c: char| c.is_ascii_alphabetic());
        if digits(t) && t.len() <= 4 { t.parse().ok() } else { None }
    };
    let month_idx = tokens.iter().position(|w| month_from_name(w).is_some())?;
    let month = month_from_name(&tokens[month_idx])?;
    let year_idx = tokens
        .iter()
        .position(|w| digits(w) && w.len() == 4 && (1900..=2200).contains(&w.parse::<u32>().unwrap_or(0)))?;
    let year: i64 = tokens[year_idx].parse().ok()?;
    let day_at = |i: Option<usize>| -> Option<u32> {
        let i = i?;
        if i == year_idx {
            return None;
        }
        number(tokens.get(i)?).filter(|d| (1..=31).contains(d))
    };
    let day = day_at(Some(month_idx + 1)).or_else(|| day_at(month_idx.checked_sub(1)))?;
    ymd_key(year, month, day)
}

/// Date reading for file imports (no device time zone or locale hints).
pub fn parse_health_date_str(raw: &str) -> Option<String> {
    parse_health_date_opts(raw, &DateOptions::default())
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
        "steps" | "step" | "step_count" | "steps_count" => Some("steps"),
        "active" | "active_kcal" | "active_energy" | "active_calories" | "active_energy_burned" => Some("active"),
        "resting" | "resting_kcal" | "resting_energy" | "resting_calories" | "basal" | "basal_energy"
        | "basal_energy_burned" => Some("resting"),
        "weight" | "weight_kg" | "weight_lb" | "weight_lbs" | "body_mass" | "body_weight" => Some("weight"),
        "bodyfat" | "body_fat" | "body_fat_percentage" | "body_fat_percent" | "fat_percentage" => Some("bodyfat"),
        _ => None,
    }
}

#[derive(Debug, Clone, Default)]
pub struct ShortcutOptions {
    pub date: DateOptions,
    /// Unit for weights printed without one ("kg" or "lbs"); kg when unset.
    pub weight_unit: Option<String>,
}

impl ShortcutOptions {
    pub fn from_value(v: &Value) -> Self {
        let int = |k: &str| v.get(k).and_then(|x| x.as_f64()).filter(|x| x.is_finite()).map(|x| x as i32);
        let text = |k: &str| v.get(k).and_then(|x| x.as_str()).map(|s| s.to_string()).filter(|s| !s.is_empty());
        ShortcutOptions {
            date: DateOptions {
                tz_offset_min: int("tzOffsetMinutes"),
                month_first: v.get("monthFirst").and_then(|x| x.as_bool()),
                today: text("today"),
            },
            weight_unit: text("weightUnit"),
        }
    }
}

pub const SHORTCUT_REASON_SEPARATOR: &str = "No ; between the label, the date and the number.";
pub const SHORTCUT_REASON_LABEL: &str = "The line should start with steps, active, resting, weight or bodyfat.";
pub const SHORTCUT_REASON_PAIRS: &str = "The dates and numbers don't pair up. Under this label, add Start Date and then Value from the same Find Health Samples.";
pub const SHORTCUT_REASON_NO_DATES: &str = "No dates under this label. Add the samples' Start Date first, then their Value.";
pub const SHORTCUT_REASON_DATE: &str = "The date couldn't be read. In the Text action, tap the date and pick Start Date.";
pub const SHORTCUT_REASON_VALUE: &str = "The number couldn't be read. In the Text action, tap the last item and pick Value.";

/// One Shortcut line, e.g. `steps;Nov 7, 2026 at 12:00 AM;8,432`. On failure,
/// returns a short reason that is shown to the user.
pub fn parse_shortcut_line_opts(line: &str, opts: &ShortcutOptions) -> Result<ShortcutLineParsed, &'static str> {
    let sep_idx = line
        .find(|c: char| c == ';' || c == ',' || c == '\t' || c == '|')
        .ok_or(SHORTCUT_REASON_SEPARATOR)?;
    let raw_metric = line[..sep_idx].trim();
    let label_ok = raw_metric.chars().next().map_or(false, |c| c.is_ascii_alphabetic())
        && raw_metric.chars().all(|c| c.is_ascii_alphabetic() || c == ' ' || c == '_');
    if !label_ok {
        return Err(SHORTCUT_REASON_LABEL);
    }
    let metric_name = raw_metric
        .to_ascii_lowercase()
        .split(|c: char| c == ' ' || c == '_')
        .filter(|w| !w.is_empty())
        .collect::<Vec<_>>()
        .join("_");
    let metric = shortcut_metric_canonical(&metric_name).ok_or(SHORTCUT_REASON_LABEL)?;

    let rest = line[sep_idx + 1..].trim();
    let has_primary_sep = rest.contains(';') || rest.contains('\t') || rest.contains('|');

    let (date, value_text) = if has_primary_sep {
        let parts: Vec<&str> = rest
            .split(|c: char| c == ';' || c == '\t' || c == '|')
            .map(|s| s.trim())
            .collect();
        (parse_health_date_opts(parts[0], &opts.date), parts[1..].join(" "))
    } else {
        // Commas only: "Oct 15, 2026, 8432" keeps decimal commas in the value.
        let parts: Vec<&str> = rest.split(',').map(|s| s.trim()).collect();
        let mut found = (None, String::new());
        for take in 1..parts.len() {
            let candidate = parts[..take].join(", ");
            if let Some(d) = parse_health_date_opts(&candidate, &opts.date) {
                found = (Some(d), parts[take..].join(","));
                break;
            }
        }
        if found.0.is_none() && parts.len() == 1 {
            return Err(SHORTCUT_REASON_SEPARATOR);
        }
        found
    };

    let date = date.ok_or(SHORTCUT_REASON_DATE)?;
    let value_text = if metric == "bodyfat" { value_text.replace('%', " ") } else { value_text };
    let parsed = parse_shortcut_value(&value_text, metric).ok_or(SHORTCUT_REASON_VALUE)?;
    if parsed.value < 0.0 {
        return Err(SHORTCUT_REASON_VALUE);
    }

    let mut value = parsed.value;
    let unit = parsed.unit.as_str();
    if metric == "weight" {
        let named_lb = metric_name.ends_with("_lb") || metric_name.ends_with("_lbs");
        let named_kg = metric_name.ends_with("_kg");
        let default_lb = matches!(opts.weight_unit.as_deref(), Some("lbs") | Some("lb"));
        let is_lb = matches!(unit, "lb" | "lbs" | "pound" | "pounds")
            || (unit.is_empty() && (named_lb || (!named_kg && default_lb)));
        if unit == "st" {
            value *= 6.35029;
        } else if is_lb {
            value /= LB_PER_KG;
        } else if unit == "g" {
            value /= 1000.0;
        }
    } else if metric == "bodyfat" {
        // Apple Health stores a fraction (0.182); Shortcuts may print 18.2.
        if value <= 1.0 {
            value *= 100.0;
        }
        if value <= 0.0 || value >= 75.0 {
            return Err(SHORTCUT_REASON_VALUE);
        }
    } else if metric != "steps" && (unit == "kj" || unit == "kilojoules") {
        value /= 4.184;
    }

    Ok(ShortcutLineParsed {
        metric: metric.to_string(),
        date,
        value,
    })
}

pub fn parse_shortcut_line(line: &str) -> Option<ShortcutLineParsed> {
    parse_shortcut_line_opts(line, &ShortcutOptions::default()).ok()
}

fn is_shortcut_header(line: &str) -> bool {
    let t = line.trim().to_ascii_lowercase();
    if let Some(rest) = t.strip_prefix("macroflow health") {
        let rest = rest.trim_start();
        rest.is_empty()
            || rest.starts_with("v1")
                && !rest[2..]
                    .chars()
                    .next()
                    .map(|c| c.is_ascii_alphanumeric() || c == '_')
                    .unwrap_or(false)
    } else {
        false
    }
}

/// A line that is only a metric name ("steps", "Active energy:") starts a
/// section in the Repeat-free Shortcut layout.
fn section_label(line: &str) -> Option<&'static str> {
    let t = line.trim().trim_end_matches(':').trim();
    if t.is_empty() || !t.chars().all(|c| c.is_ascii_alphabetic() || c == ' ' || c == '_') {
        return None;
    }
    let name = t
        .to_ascii_lowercase()
        .split(|c: char| c == ' ' || c == '_')
        .filter(|w| !w.is_empty())
        .collect::<Vec<_>>()
        .join("_");
    shortcut_metric_canonical(&name)
}

/// The Repeat-free Shortcut puts each metric's list properties in one Text
/// action, and Shortcuts prints a list one item per line:
///
/// ```text
/// steps
/// Nov 7, 2026 at 12:00 AM      <- Start Date of every sample
/// Nov 8, 2026 at 12:00 AM
/// 8,432                        <- Value of every sample, same order
/// 10,120
/// ```
///
/// An optional third block holds each sample's Unit. Sections become ordinary
/// `metric;date;value` lines; lines outside any section are kept as they are.
/// Errors are `(label, reason)` pairs for the report.
fn expand_sections(lines: &[&str], opts: &DateOptions) -> (Vec<String>, Vec<(String, &'static str)>) {
    let mut out: Vec<String> = Vec::new();
    let mut errors = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        let Some(metric) = section_label(lines[i]) else {
            out.push(lines[i].to_string());
            i += 1;
            continue;
        };
        let label = lines[i].trim().to_string();
        let start = i + 1;
        let mut end = start;
        while end < lines.len() && section_label(lines[end]).is_none() {
            end += 1;
        }
        let body = &lines[start..end];
        i = end;
        if body.is_empty() {
            continue; // no samples for this metric
        }
        // Full `metric;date;value` lines under a label still work.
        if body.iter().all(|l| parse_shortcut_line_opts(l, &ShortcutOptions { date: opts.clone(), weight_unit: None }).is_ok()) {
            out.extend(body.iter().map(|l| l.to_string()));
            continue;
        }
        let dates = body
            .iter()
            .take_while(|l| parse_health_date_opts(l, opts).is_some())
            .count();
        let rest = body.len() - dates;
        if dates == 0 {
            errors.push((label, SHORTCUT_REASON_NO_DATES));
            continue;
        }
        let with_units = rest == dates * 2;
        if rest != dates && !with_units {
            errors.push((label, SHORTCUT_REASON_PAIRS));
            continue;
        }
        for k in 0..dates {
            let mut value = body[dates + k].to_string();
            if with_units {
                value.push(' ');
                value.push_str(body[dates * 2 + k]);
            }
            out.push(format!("{};{};{}", metric, body[k].trim(), value.trim()));
        }
    }
    (out, errors)
}

/// Settles `a/b/yyyy` for the whole paste: one date with a part over 12 decides
/// whether this iPhone prints the month or the day first.
fn infer_month_first(lines: &[&str]) -> Option<bool> {
    for line in lines {
        for token in line.split(|c: char| c == ';' || c == '\t' || c == '|' || c == ',' || c.is_whitespace()) {
            let parts: Vec<&str> = token.split('/').collect();
            if parts.len() != 3 || !parts.iter().all(|p| digits(p)) || parts[0].len() > 2 {
                continue;
            }
            let (a, b) = (parts[0].parse::<u32>().ok()?, parts[1].parse::<u32>().ok()?);
            if a > 12 && b <= 12 {
                return Some(false);
            }
            if b > 12 && a <= 12 {
                return Some(true);
            }
        }
    }
    None
}

fn shorten(line: &str, max: usize) -> String {
    if line.chars().count() <= max {
        line.to_string()
    } else {
        let mut s: String = line.chars().take(max).collect();
        s.push('…');
        s
    }
}

/// Reads the Shortcut's output and says what was understood:
/// `{ summary, header, lines, parsed, problems: [{ line, reason }] }`.
/// `summary` is the import summary for `applyHealthImport`, or null.
pub fn shortcut_report(text: &str, require_header: bool, opts: &ShortcutOptions) -> Value {
    let stripped = text.strip_prefix('\u{feff}').unwrap_or(text);
    let lines: Vec<&str> = stripped
        .split(['\r', '\n'])
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();
    let has_header = lines.first().map_or(false, |l| is_shortcut_header(l));
    let data_lines: &[&str] = if has_header { &lines[1..] } else { &lines[..] };

    let mut opts = opts.clone();
    if let Some(mf) = infer_month_first(data_lines) {
        opts.date.month_first = Some(mf);
    }
    let (expanded, section_errors) = expand_sections(data_lines, &opts.date);
    let data_lines: Vec<&str> = expanded.iter().map(|l| l.as_str()).collect();

    let mut raw: BTreeMap<String, BTreeMap<String, f64>> = BTreeMap::new();
    let mut rows = 0usize;
    let mut problems: Vec<Value> = Vec::new();
    let mut problem_count = 0usize;
    for (label, reason) in &section_errors {
        problem_count += 1;
        problems.push(json!({ "line": shorten(label, 90), "reason": *reason }));
    }

    for line in &data_lines {
        match parse_shortcut_line_opts(line, &opts) {
            Ok(r) => {
                let day = raw.entry(r.date).or_default();
                // Ungrouped samples add up; weight keeps the last reading of the day.
                if r.metric == "weight" || r.metric == "bodyfat" {
                    day.insert(r.metric, r.value);
                } else {
                    let prev = day.get(&r.metric).copied().unwrap_or(0.0);
                    day.insert(r.metric, prev + r.value);
                }
                rows += 1;
            }
            Err(reason) => {
                problem_count += 1;
                if problems.len() < 5 {
                    problems.push(json!({ "line": shorten(line, 90), "reason": reason }));
                }
            }
        }
    }

    let summary = if require_header && !has_header {
        Value::Null
    } else {
        build_shortcut_summary(raw).unwrap_or(Value::Null)
    };

    json!({
        "summary": summary,
        "header": has_header,
        "lines": data_lines.len(),
        "parsed": rows,
        "problemCount": problem_count,
        "problems": Value::Array(problems)
    })
}

fn build_shortcut_summary(raw: BTreeMap<String, BTreeMap<String, f64>>) -> Option<Value> {
    let mut days = Map::new();
    let mut counts = HealthCounts::default();
    let mut body_fat_days = 0usize;

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
                out.insert("weight".to_string(), json!(js_round(weight * 100.0) / 100.0));
                counts.weight += 1;
            }
        }
        if let Some(&fat) = d.get("bodyfat") {
            out.insert("bodyFat".to_string(), json!(js_round(fat * 10.0) / 10.0));
            body_fat_days += 1;
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

    let mut counts = counts.into_value();
    if body_fat_days > 0 {
        if let Some(m) = counts.as_object_mut() { m.insert("bodyFat".to_string(), json!(body_fat_days)); }
    }
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

pub fn parse_shortcut_payload_opts(text: &str, require_header: bool, opts: &ShortcutOptions) -> Option<Value> {
    match shortcut_report(text, require_header, opts).get("summary") {
        Some(Value::Null) | None => None,
        Some(v) => Some(v.clone()),
    }
}

pub fn parse_shortcut_payload(text: &str, require_header: bool) -> Option<Value> {
    parse_shortcut_payload_opts(text, require_header, &ShortcutOptions::default())
}

#[cfg(test)]
mod shortcut_tests {
    use super::*;

    fn toronto() -> DateOptions {
        DateOptions { tz_offset_min: Some(-240), month_first: None, today: Some("2026-10-16".into()) }
    }

    #[test]
    fn reads_every_iphone_date_style() {
        let o = toronto();
        for (raw, want) in [
            ("2026-10-15T00:00:00-04:00", "2026-10-15"),
            ("2026-10-16T02:30:00Z", "2026-10-15"),
            ("2026-10-15 00:00:00 -0400", "2026-10-15"),
            ("2026-10-15T00:00:00", "2026-10-15"),
            ("10/15/26, 12:00 AM", "2026-10-15"),
            ("10/15/2026, 12:00\u{202f}AM", "2026-10-15"),
            ("15/10/2026, 00:00", "2026-10-15"),
            ("15.10.2026, 00:00", "2026-10-15"),
            ("Oct 15, 2026 at 12:00 AM", "2026-10-15"),
            ("October 15, 2026 at 12:00 AM", "2026-10-15"),
            ("Thursday, October 15, 2026", "2026-10-15"),
            ("15 Oct 2026 at 00:00", "2026-10-15"),
            ("15. Okt. 2026 um 00:00", "2026-10-15"),
            ("October 15th, 2026", "2026-10-15"),
            ("Today at 7:00 AM", "2026-10-16"),
            ("Yesterday at 12:00 AM", "2026-10-15"),
            ("1760500800", "2025-10-15"),
            ("20261015", "2026-10-15"),
        ] {
            assert_eq!(parse_health_date_opts(raw, &o).as_deref(), Some(want), "{raw}");
        }
        assert_eq!(parse_health_date_opts("2026-02-30", &o), None);
        assert_eq!(parse_health_date_opts("8432 count", &o), None);
    }

    #[test]
    fn day_first_iphones_are_detected_from_the_paste() {
        let text = "steps;13/10/2026, 00:00;9000\nsteps;05/10/2026, 00:00;8000";
        let r = shortcut_report(text, false, &ShortcutOptions::default());
        let days = r.pointer("/summary/days").unwrap();
        assert!(days.get("2026-10-13").is_some());
        assert!(days.get("2026-10-05").is_some());
    }

    #[test]
    fn report_explains_lines_it_cannot_read() {
        let text = "steps;Health Sample;8432\nsteps;Oct 15, 2026 at 12:00 AM;8432";
        let r = shortcut_report(text, false, &ShortcutOptions::default());
        assert_eq!(r.get("parsed").and_then(|v| v.as_i64()), Some(1));
        assert_eq!(
            r.pointer("/problems/0/reason").and_then(|v| v.as_str()),
            Some(SHORTCUT_REASON_DATE)
        );
    }

    #[test]
    fn weights_without_a_unit_use_the_profile_unit() {
        let opts = ShortcutOptions { weight_unit: Some("lbs".into()), ..Default::default() };
        let r = parse_shortcut_line_opts("weight;2026-10-15;172.8", &opts).unwrap();
        assert!((r.value - 78.38).abs() < 0.01);
        let kg = parse_shortcut_line_opts("weight;2026-10-15;78.4 kg", &opts).unwrap();
        assert!((kg.value - 78.4).abs() < 1e-9);
    }
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
