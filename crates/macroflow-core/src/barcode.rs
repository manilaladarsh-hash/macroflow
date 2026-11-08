pub fn gtin_check_digit(body: &str) -> u32 {
    let bytes = body.as_bytes();
    let mut sum: u32 = 0;
    for i in 0..bytes.len() {
        let ch = bytes[bytes.len() - 1 - i];
        let digit = if ch.is_ascii_digit() {
            (ch - b'0') as u32
        } else {
            0
        };
        sum += if i % 2 == 0 { digit * 3 } else { digit };
    }
    (10 - (sum % 10)) % 10
}

pub fn is_valid_gtin(code: &str) -> bool {
    let len = code.len();
    if !(len == 8 || len == 12 || len == 13 || len == 14) {
        return false;
    }
    if !code.bytes().all(|b| b.is_ascii_digit()) {
        return false;
    }
    let body = &code[..len - 1];
    let check = (code.as_bytes()[len - 1] - b'0') as u32;
    gtin_check_digit(body) == check
}

pub fn expand_upc_e(code: &str) -> Option<String> {
    if code.len() != 8 || !code.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let bytes = code.as_bytes();
    if bytes[0] != b'0' && bytes[0] != b'1' {
        return None;
    }
    let ns = bytes[0] as char;
    let d0 = bytes[1] as char;
    let d1 = bytes[2] as char;
    let d2 = bytes[3] as char;
    let d3 = bytes[4] as char;
    let d4 = bytes[5] as char;
    let d5 = bytes[6] as char;
    let check = bytes[7] as char;

    let body = match d5 {
        '0' | '1' | '2' => format!("{}{}{}0000{}{}{}", d0, d1, d5, d2, d3, d4),
        '3' => format!("{}{}{}00000{}{}", d0, d1, d2, d3, d4),
        '4' => format!("{}{}{}{}00000{}", d0, d1, d2, d3, d4),
        _ => format!("{}{}{}{}{}0000{}", d0, d1, d2, d3, d4, d5),
    };
    let upc_a = format!("{}{}{}", ns, body, check);
    if is_valid_gtin(&upc_a) {
        Some(upc_a)
    } else {
        None
    }
}

pub fn clean_barcode(raw: &str) -> String {
    raw.chars()
        .filter(|c| !c.is_whitespace() && *c != '-')
        .collect()
}

pub fn is_acceptable_barcode(raw: &str, format: &str) -> bool {
    let code = clean_barcode(raw);
    if code.is_empty() || !code.bytes().all(|b| b.is_ascii_digit()) {
        return false;
    }
    let fmt_lower = format.to_ascii_lowercase();
    if fmt_lower.contains("upc_e") && code.len() == 8 {
        return expand_upc_e(&code).is_some();
    }
    if is_valid_gtin(&code) {
        return true;
    }
    code.len() == 8 && expand_upc_e(&code).is_some()
}

fn push_unique(out: &mut Vec<String>, c: String) {
    if !c.is_empty() && !out.contains(&c) {
        out.push(c);
    }
}

pub fn barcode_candidates(raw: &str) -> Vec<String> {
    let code = clean_barcode(raw);
    let mut out: Vec<String> = Vec::new();
    match code.len() {
        8 => {
            if is_valid_gtin(&code) {
                push_unique(&mut out, code.clone());
            }
            if let Some(upc_a) = expand_upc_e(&code) {
                push_unique(&mut out, upc_a.clone());
                push_unique(&mut out, format!("0{}", upc_a));
            }
            if out.is_empty() {
                push_unique(&mut out, code);
            }
        }
        12 => {
            push_unique(&mut out, code.clone());
            push_unique(&mut out, format!("0{}", code));
        }
        13 => {
            push_unique(&mut out, code.clone());
            if let Some(stripped) = code.strip_prefix('0') {
                push_unique(&mut out, stripped.to_string());
            }
        }
        14 => {
            push_unique(&mut out, code.clone());
            if let Some(stripped) = code.strip_prefix('0') {
                push_unique(&mut out, stripped.to_string());
            }
            if let Some(stripped2) = code.strip_prefix("00") {
                push_unique(&mut out, stripped2.to_string());
            }
        }
        _ => {
            push_unique(&mut out, code);
        }
    }
    out
}

pub fn format_barcode(code: &str) -> String {
    let c = clean_barcode(code);
    if c.len() == 13 && c.is_ascii() {
        format!("{} {} {}", &c[0..1], &c[1..7], &c[7..13])
    } else if c.len() == 12 && c.is_ascii() {
        format!("{} {} {} {}", &c[0..1], &c[1..6], &c[6..11], &c[11..12])
    } else {
        c
    }
}

pub fn usda_gtin_spellings(raw_code: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for c in barcode_candidates(raw_code) {
        let bare = c.trim_start_matches('0');
        let min_len = bare.len().max(11);
        for len in min_len..=14 {
            let padded = format!("{:0>width$}", bare, width = len);
            if !out.contains(&padded) {
                out.push(padded);
            }
        }
    }
    out
}

pub fn title_case_if_shouting(text: &str) -> String {
    let t = text.trim();
    if t.is_empty() || t != t.to_uppercase() {
        return t.to_string();
    }
    let has_three_upper = t
        .as_bytes()
        .windows(3)
        .any(|w| w.iter().all(|b| b.is_ascii_uppercase()));
    if !has_three_upper {
        return t.to_string();
    }
    let lower = t.to_lowercase();
    let mut out = String::with_capacity(lower.len());
    let mut cap_next = true;
    for ch in lower.chars() {
        if cap_next && ch.is_ascii_lowercase() {
            out.push(ch.to_ascii_uppercase());
            cap_next = false;
        } else {
            out.push(ch);
            cap_next = ch.is_whitespace() || ch == '(' || ch == '/' || ch == '-';
        }
    }
    out
}

pub fn pick_ios_close_up_camera_index(labels: &[String]) -> Option<usize> {
    if let Some(idx) = labels
        .iter()
        .position(|l| l.to_ascii_lowercase().contains("back triple camera"))
    {
        return Some(idx);
    }
    labels
        .iter()
        .position(|l| l.to_ascii_lowercase().contains("back dual wide camera"))
}
