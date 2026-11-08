use std::collections::BTreeMap;
use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub struct Number(pub f64);

impl Number {
    pub fn as_f64(&self) -> Option<f64> {
        if self.0.is_finite() {
            Some(self.0)
        } else {
            None
        }
    }

    pub fn as_i64(&self) -> Option<i64> {
        if self.0.is_finite() {
            Some(self.0 as i64)
        } else {
            None
        }
    }

    pub fn as_u64(&self) -> Option<u64> {
        if self.0.is_finite() && self.0 >= 0.0 {
            Some(self.0 as u64)
        } else {
            None
        }
    }
}

impl fmt::Display for Number {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let v = self.0;
        if !v.is_finite() {
            return write!(f, "null");
        }
        if v == 0.0 {
            return write!(f, "0");
        }
        if v.fract() == 0.0 && v.abs() < 1e15 {
            write!(f, "{}", v as i64)
        } else {
            write!(f, "{}", v)
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Map {
    entries: Vec<(String, Value)>,
}

impl Map {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn get(&self, key: &str) -> Option<&Value> {
        self.entries
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v)
    }

    pub fn get_mut(&mut self, key: &str) -> Option<&mut Value> {
        self.entries
            .iter_mut()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v)
    }

    pub fn contains_key(&self, key: &str) -> bool {
        self.entries.iter().any(|(k, _)| k == key)
    }

    pub fn insert(&mut self, key: String, value: Value) -> Option<Value> {
        if let Some((_, existing)) = self.entries.iter_mut().find(|(k, _)| k == &key) {
            Some(std::mem::replace(existing, value))
        } else {
            self.entries.push((key, value));
            None
        }
    }

    pub fn keys(&self) -> impl DoubleEndedIterator<Item = &String> {
        self.entries.iter().map(|(k, _)| k)
    }

    pub fn values(&self) -> impl DoubleEndedIterator<Item = &Value> {
        self.entries.iter().map(|(_, v)| v)
    }

    pub fn iter(&self) -> impl DoubleEndedIterator<Item = &(String, Value)> {
        self.entries.iter()
    }
}

impl IntoIterator for Map {
    type Item = (String, Value);
    type IntoIter = std::vec::IntoIter<(String, Value)>;

    fn into_iter(self) -> Self::IntoIter {
        self.entries.into_iter()
    }
}

impl<'a> IntoIterator for &'a Map {
    type Item = &'a (String, Value);
    type IntoIter = std::slice::Iter<'a, (String, Value)>;

    fn into_iter(self) -> Self::IntoIter {
        self.entries.iter()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Number(Number),
    String(String),
    Array(Vec<Value>),
    Object(Map),
}

impl Value {
    pub fn is_null(&self) -> bool {
        matches!(self, Value::Null)
    }

    pub fn is_object(&self) -> bool {
        matches!(self, Value::Object(_))
    }

    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Value::Bool(b) => Some(*b),
            _ => None,
        }
    }

    pub fn as_f64(&self) -> Option<f64> {
        match self {
            Value::Number(n) => n.as_f64(),
            _ => None,
        }
    }

    pub fn as_i64(&self) -> Option<i64> {
        match self {
            Value::Number(n) => n.as_i64(),
            _ => None,
        }
    }

    pub fn as_u64(&self) -> Option<u64> {
        match self {
            Value::Number(n) => n.as_u64(),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            Value::String(s) => Some(s.as_str()),
            _ => None,
        }
    }

    pub fn as_array(&self) -> Option<&Vec<Value>> {
        match self {
            Value::Array(a) => Some(a),
            _ => None,
        }
    }

    pub fn as_object(&self) -> Option<&Map> {
        match self {
            Value::Object(m) => Some(m),
            _ => None,
        }
    }

    pub fn as_object_mut(&mut self) -> Option<&mut Map> {
        match self {
            Value::Object(m) => Some(m),
            _ => None,
        }
    }

    pub fn get(&self, key: &str) -> Option<&Value> {
        match self {
            Value::Object(m) => m.get(key),
            _ => None,
        }
    }

    pub fn pointer(&self, ptr: &str) -> Option<&Value> {
        if ptr.is_empty() {
            return Some(self);
        }
        let path = ptr.strip_prefix('/')?;
        let mut cur = self;
        for token in path.split('/') {
            match cur {
                Value::Object(m) => {
                    cur = m.get(token)?;
                }
                Value::Array(a) => {
                    let idx: usize = token.parse().ok()?;
                    cur = a.get(idx)?;
                }
                _ => return None,
            }
        }
        Some(cur)
    }
}

pub trait IntoValue {
    fn into_value(self) -> Value;
}

impl IntoValue for Value {
    fn into_value(self) -> Value {
        self
    }
}

impl IntoValue for &Value {
    fn into_value(self) -> Value {
        self.clone()
    }
}

impl IntoValue for bool {
    fn into_value(self) -> Value {
        Value::Bool(self)
    }
}

impl IntoValue for f64 {
    fn into_value(self) -> Value {
        if self.is_finite() {
            Value::Number(Number(self))
        } else {
            Value::Null
        }
    }
}

impl IntoValue for i64 {
    fn into_value(self) -> Value {
        Value::Number(Number(self as f64))
    }
}

impl IntoValue for i32 {
    fn into_value(self) -> Value {
        Value::Number(Number(self as f64))
    }
}

impl IntoValue for u32 {
    fn into_value(self) -> Value {
        Value::Number(Number(self as f64))
    }
}

impl IntoValue for usize {
    fn into_value(self) -> Value {
        Value::Number(Number(self as f64))
    }
}

impl IntoValue for String {
    fn into_value(self) -> Value {
        Value::String(self)
    }
}

impl IntoValue for &str {
    fn into_value(self) -> Value {
        Value::String(self.to_string())
    }
}

impl IntoValue for &String {
    fn into_value(self) -> Value {
        Value::String(self.clone())
    }
}

impl<T: IntoValue> IntoValue for Option<T> {
    fn into_value(self) -> Value {
        match self {
            Some(v) => v.into_value(),
            None => Value::Null,
        }
    }
}

impl<T: IntoValue + Clone> IntoValue for &Option<T> {
    fn into_value(self) -> Value {
        match self {
            Some(v) => v.clone().into_value(),
            None => Value::Null,
        }
    }
}

impl<T: IntoValue> IntoValue for Vec<T> {
    fn into_value(self) -> Value {
        Value::Array(self.into_iter().map(|x| x.into_value()).collect())
    }
}

impl<T: IntoValue + Clone, const N: usize> IntoValue for [T; N] {
    fn into_value(self) -> Value {
        Value::Array(self.into_iter().map(|x| x.into_value()).collect())
    }
}

impl IntoValue for Map {
    fn into_value(self) -> Value {
        Value::Object(self)
    }
}

impl<V: IntoValue> IntoValue for BTreeMap<String, V> {
    fn into_value(self) -> Value {
        let mut map = Map::new();
        for (k, v) in self {
            map.insert(k, v.into_value());
        }
        Value::Object(map)
    }
}

#[macro_export]
macro_rules! json {
    (null) => {
        $crate::json::Value::Null
    };
    (true) => {
        $crate::json::Value::Bool(true)
    };
    (false) => {
        $crate::json::Value::Bool(false)
    };
    ([]) => {
        $crate::json::Value::Array(Vec::new())
    };
    ([ $( $elem:expr ),+ $(,)? ]) => {
        $crate::json::Value::Array(vec![ $( $crate::json!($elem) ),+ ])
    };
    ({}) => {
        $crate::json::Value::Object($crate::json::Map::new())
    };
    (@obj $map:ident () -> ()) => {};
    (@obj $map:ident ($key:tt) -> (: { $($inner:tt)* } , $($rest:tt)*)) => {
        $map.insert(($key).to_string(), $crate::json!({ $($inner)* }));
        $crate::json!(@obj $map () -> ($($rest)*));
    };
    (@obj $map:ident ($key:tt) -> (: { $($inner:tt)* })) => {
        $map.insert(($key).to_string(), $crate::json!({ $($inner)* }));
    };
    (@obj $map:ident ($key:tt) -> (: [ $($inner:tt)* ] , $($rest:tt)*)) => {
        $map.insert(($key).to_string(), $crate::json!([ $($inner)* ]));
        $crate::json!(@obj $map () -> ($($rest)*));
    };
    (@obj $map:ident ($key:tt) -> (: [ $($inner:tt)* ])) => {
        $map.insert(($key).to_string(), $crate::json!([ $($inner)* ]));
    };
    (@obj $map:ident ($key:tt) -> (: null , $($rest:tt)*)) => {
        $map.insert(($key).to_string(), $crate::json::Value::Null);
        $crate::json!(@obj $map () -> ($($rest)*));
    };
    (@obj $map:ident ($key:tt) -> (: null)) => {
        $map.insert(($key).to_string(), $crate::json::Value::Null);
    };
    (@obj $map:ident ($key:tt) -> (: $val:expr , $($rest:tt)*)) => {
        $map.insert(($key).to_string(), $crate::json!($val));
        $crate::json!(@obj $map () -> ($($rest)*));
    };
    (@obj $map:ident ($key:tt) -> (: $val:expr)) => {
        $map.insert(($key).to_string(), $crate::json!($val));
    };
    (@obj $map:ident () -> ($key:tt : $($rest:tt)*)) => {
        $crate::json!(@obj $map ($key) -> (: $($rest)*));
    };
    ({ $($tt:tt)+ }) => {{
        let mut map = $crate::json::Map::new();
        $crate::json!(@obj map () -> ($($tt)+));
        $crate::json::Value::Object(map)
    }};
    ($other:expr) => {
        $crate::json::IntoValue::into_value($other)
    };
}

pub fn escape_json_str(s: &str, out: &mut String) {
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{08}' => out.push_str("\\b"),
            '\u{0c}' => out.push_str("\\f"),
            c if (c as u32) < 0x20 => {
                out.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => out.push(c),
        }
    }
    out.push('"');
}

pub fn write_value(val: &Value, out: &mut String) {
    match val {
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Number(n) => out.push_str(&n.to_string()),
        Value::String(s) => escape_json_str(s, out),
        Value::Array(arr) => {
            out.push('[');
            for (i, item) in arr.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_value(item, out);
            }
            out.push(']');
        }
        Value::Object(map) => {
            out.push('{');
            for (i, (k, v)) in map.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                escape_json_str(k, out);
                out.push(':');
                write_value(v, out);
            }
            out.push('}');
        }
    }
}

pub fn to_string<T: IntoValue + Clone>(val: &T) -> Result<String, String> {
    let v = val.clone().into_value();
    let mut out = String::new();
    write_value(&v, &mut out);
    Ok(out)
}

pub fn from_str(input: &str) -> Result<Value, String> {
    let mut parser = Parser::new(input);
    let val = parser.parse_value()?;
    parser.skip_ws();
    if parser.pos < parser.bytes.len() {
        return Err("Trailing characters in JSON".to_string());
    }
    Ok(val)
}

struct Parser<'a> {
    input: &'a str,
    bytes: &'a [u8],
    pos: usize,
}

impl<'a> Parser<'a> {
    fn new(input: &'a str) -> Self {
        Self {
            input,
            bytes: input.as_bytes(),
            pos: 0,
        }
    }

    fn skip_ws(&mut self) {
        while self.pos < self.bytes.len() {
            match self.bytes[self.pos] {
                b' ' | b'\t' | b'\n' | b'\r' => self.pos += 1,
                _ => break,
            }
        }
    }

    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.pos).copied()
    }

    fn parse_value(&mut self) -> Result<Value, String> {
        self.skip_ws();
        match self.peek().ok_or_else(|| "Unexpected EOF".to_string())? {
            b'n' => self.parse_null(),
            b't' => self.parse_true(),
            b'f' => self.parse_false(),
            b'"' => self.parse_string().map(Value::String),
            b'[' => self.parse_array(),
            b'{' => self.parse_object(),
            b'-' | b'0'..=b'9' => self.parse_number(),
            c => Err(format!("Unexpected byte: {}", c as char)),
        }
    }

    fn parse_null(&mut self) -> Result<Value, String> {
        if self.bytes.get(self.pos..self.pos + 4) == Some(b"null") {
            self.pos += 4;
            Ok(Value::Null)
        } else {
            Err("Invalid null".to_string())
        }
    }

    fn parse_true(&mut self) -> Result<Value, String> {
        if self.bytes.get(self.pos..self.pos + 4) == Some(b"true") {
            self.pos += 4;
            Ok(Value::Bool(true))
        } else {
            Err("Invalid true".to_string())
        }
    }

    fn parse_false(&mut self) -> Result<Value, String> {
        if self.bytes.get(self.pos..self.pos + 5) == Some(b"false") {
            self.pos += 5;
            Ok(Value::Bool(false))
        } else {
            Err("Invalid false".to_string())
        }
    }

    fn parse_string(&mut self) -> Result<String, String> {
        if self.peek() != Some(b'"') {
            return Err("Expected '\"'".to_string());
        }
        self.pos += 1;
        let mut out = String::new();
        while self.pos < self.bytes.len() {
            let b = self.bytes[self.pos];
            if b == b'"' {
                self.pos += 1;
                return Ok(out);
            }
            if b == b'\\' {
                self.pos += 1;
                let esc = self.peek().ok_or_else(|| "Unexpected EOF in escape".to_string())?;
                self.pos += 1;
                match esc {
                    b'"' => out.push('"'),
                    b'\\' => out.push('\\'),
                    b'/' => out.push('/'),
                    b'b' => out.push('\u{08}'),
                    b'f' => out.push('\u{0c}'),
                    b'n' => out.push('\n'),
                    b'r' => out.push('\r'),
                    b't' => out.push('\t'),
                    b'u' => {
                        let hex = self
                            .input
                            .get(self.pos..self.pos + 4)
                            .ok_or_else(|| "Invalid unicode escape".to_string())?;
                        let code = u16::from_str_radix(hex, 16)
                            .map_err(|_| "Invalid hex in unicode escape".to_string())?;
                        self.pos += 4;
                        if (0xD800..=0xDBFF).contains(&code) {
                            if self.bytes.get(self.pos..self.pos + 2) == Some(b"\\u") {
                                self.pos += 2;
                                if let Some(hex2) = self.input.get(self.pos..self.pos + 4) {
                                    if let Ok(low) = u16::from_str_radix(hex2, 16) {
                                        self.pos += 4;
                                        let combined = 0x10000
                                            + (((code as u32 - 0xD800) << 10)
                                                | (low as u32 - 0xDC00));
                                        if let Some(ch) = char::from_u32(combined) {
                                            out.push(ch);
                                            continue;
                                        }
                                    }
                                }
                            }
                        }
                        if let Some(ch) = char::from_u32(code as u32) {
                            out.push(ch);
                        }
                    }
                    _ => out.push(esc as char),
                }
            } else {
                let ch = self.input[self.pos..]
                    .chars()
                    .next()
                    .ok_or_else(|| "Invalid UTF-8".to_string())?;
                out.push(ch);
                self.pos += ch.len_utf8();
            }
        }
        Err("Unterminated string".to_string())
    }

    fn parse_number(&mut self) -> Result<Value, String> {
        let start = self.pos;
        if self.peek() == Some(b'-') {
            self.pos += 1;
        }
        while let Some(b'0'..=b'9') = self.peek() {
            self.pos += 1;
        }
        if self.peek() == Some(b'.') {
            self.pos += 1;
            while let Some(b'0'..=b'9') = self.peek() {
                self.pos += 1;
            }
        }
        if matches!(self.peek(), Some(b'e' | b'E')) {
            self.pos += 1;
            if matches!(self.peek(), Some(b'+' | b'-')) {
                self.pos += 1;
            }
            while let Some(b'0'..=b'9') = self.peek() {
                self.pos += 1;
            }
        }
        let s = &self.input[start..self.pos];
        let n: f64 = s.parse().map_err(|_| "Invalid number".to_string())?;
        Ok(Value::Number(Number(n)))
    }

    fn parse_array(&mut self) -> Result<Value, String> {
        self.pos += 1; // '['
        self.skip_ws();
        let mut arr = Vec::new();
        if self.peek() == Some(b']') {
            self.pos += 1;
            return Ok(Value::Array(arr));
        }
        loop {
            let v = self.parse_value()?;
            arr.push(v);
            self.skip_ws();
            match self.peek() {
                Some(b',') => {
                    self.pos += 1;
                }
                Some(b']') => {
                    self.pos += 1;
                    return Ok(Value::Array(arr));
                }
                _ => return Err("Expected ',' or ']' in array".to_string()),
            }
        }
    }

    fn parse_object(&mut self) -> Result<Value, String> {
        self.pos += 1; // '{'
        self.skip_ws();
        let mut map = Map::new();
        if self.peek() == Some(b'}') {
            self.pos += 1;
            return Ok(Value::Object(map));
        }
        loop {
            self.skip_ws();
            let key = self.parse_string()?;
            self.skip_ws();
            if self.peek() != Some(b':') {
                return Err("Expected ':' in object".to_string());
            }
            self.pos += 1;
            let val = self.parse_value()?;
            map.insert(key, val);
            self.skip_ws();
            match self.peek() {
                Some(b',') => {
                    self.pos += 1;
                }
                Some(b'}') => {
                    self.pos += 1;
                    return Ok(Value::Object(map));
                }
                _ => return Err("Expected ',' or '}' in object".to_string()),
            }
        }
    }
}
