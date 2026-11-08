use crate::json::Value;
use crate::types::SmartSearchQuery;
use std::collections::HashSet;

fn replace_phrase_ci(input: &str, phrase: &str, replacement: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let lower = input.to_ascii_lowercase();
    let phrase_lower = phrase.to_ascii_lowercase();
    let plen = phrase_lower.len();
    let bytes = input.as_bytes();
    let is_word = |b: u8| b.is_ascii_alphanumeric() || b == b'_';

    let mut i = 0;
    while i < input.len() {
        if i + plen <= input.len() && &lower[i..i + plen] == phrase_lower {
            let left_ok = i == 0 || !is_word(bytes[i - 1]);
            let right_ok = i + plen == input.len() || !is_word(bytes[i + plen]);
            if left_ok && right_ok {
                out.push_str(replacement);
                i += plen;
                continue;
            }
        }
        let ch = input[i..].chars().next().unwrap();
        out.push(ch);
        i += ch.len_utf8();
    }
    out
}

pub fn normalize_smart_search_query(raw_query: &str) -> SmartSearchQuery {
    let q_init = raw_query.trim();
    let original = q_init.to_string();
    let mut q = q_init.to_string();

    let replacements: &[(&str, &str)] = &[
        ("popcoen", "popcorn"),
        ("popcron", "popcorn"),
        ("pop corn", "popcorn"),
        ("microwav", "microwave"),
        ("presidents choice", "President's Choice"),
        ("pc", "President's Choice"),
        ("no name", "No Name"),
        ("noname", "No Name"),
        ("greatvalue", "Great Value"),
        ("kirkland", "Kirkland Signature"),
        ("compliment", "Compliments"),
        ("yoghurt", "yogurt"),
        ("protien", "protein"),
        ("choclate", "chocolate"),
    ];

    for &(pat, rep) in replacements {
        q = replace_phrase_ci(&q, pat, rep);
    }

    let normalized = q.split_whitespace().collect::<Vec<_>>().join(" ");
    let ql = normalized.to_ascii_lowercase();

    let inferred_store = if ql.contains("president")
        || ql.contains("pc")
        || ql.contains("loblaws")
        || ql.contains("superstore")
    {
        "loblaws"
    } else if ql.contains("no name") || ql.contains("nofrills") {
        "nofrills"
    } else if ql.contains("compliments") || ql.contains("sobeys") || ql.contains("freshco") {
        "sobeys"
    } else if ql.contains("great value") || ql.contains("walmart") {
        "walmart"
    } else if ql.contains("kirkland") || ql.contains("costco") {
        "costco"
    } else if ql.contains("selection") || ql.contains("metro") {
        "metro"
    } else {
        "all"
    };

    SmartSearchQuery {
        original,
        normalized,
        inferred_store: inferred_store.to_string(),
    }
}

pub fn local_fuzzy_matches(query: &str, database: &[Value]) -> Vec<Value> {
    let q_lower = query.to_lowercase();
    let words: Vec<&str> = q_lower
        .split_whitespace()
        .filter(|w| w.chars().count() > 1)
        .collect();
    if words.is_empty() {
        return Vec::new();
    }

    let mut scored: Vec<(usize, i32, &Value)> = Vec::new();
    for (idx, food) in database.iter().enumerate() {
        let name = food
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase();
        let score: i32 = words
            .iter()
            .map(|w| if name.contains(w) { 1 } else { 0 })
            .sum();
        if score > 0 || name.contains(&q_lower) {
            scored.push((idx, score, food));
        }
    }

    scored.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    scored
        .into_iter()
        .take(15)
        .map(|(_, _, f)| f.clone())
        .collect()
}

pub fn dedupe_foods(list: &[Value]) -> Vec<Value> {
    let mut seen = HashSet::new();
    let mut out = Vec::with_capacity(list.len());
    for f in list {
        let name_compact: String = f
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase()
            .chars()
            .filter(|c| !c.is_whitespace())
            .collect();
        let cal_str = match f.get("calories") {
            Some(Value::Number(n)) => n.to_string(),
            Some(Value::String(s)) => s.clone(),
            _ => "undefined".to_string(),
        };
        let key = format!("{}|{}", name_compact, cal_str);
        if seen.insert(key) {
            out.push(f.clone());
        }
    }
    out
}
