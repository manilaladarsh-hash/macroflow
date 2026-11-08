use crate::json::{IntoValue, Map, Value};
use std::collections::BTreeMap;

fn v_str(v: Option<&Value>, default: &str) -> String {
    match v {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Number(n)) => n.to_string(),
        _ => default.to_string(),
    }
}

fn v_opt_str(v: Option<&Value>) -> Option<String> {
    match v {
        Some(Value::String(s)) => Some(s.clone()),
        _ => None,
    }
}

fn v_f64(v: Option<&Value>, default: f64) -> f64 {
    match v {
        Some(Value::Number(n)) => n.as_f64().unwrap_or(default),
        Some(Value::String(s)) => s.trim().parse::<f64>().unwrap_or(default),
        _ => default,
    }
}

fn v_opt_f64(v: Option<&Value>) -> Option<f64> {
    match v {
        Some(Value::Number(n)) => n.as_f64(),
        Some(Value::String(s)) => s.trim().parse::<f64>().ok().filter(|x| x.is_finite()),
        _ => None,
    }
}

fn v_bool(v: Option<&Value>) -> bool {
    match v {
        Some(Value::Bool(b)) => *b,
        _ => false,
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct PortionOption {
    pub id: String,
    pub label: String,
    pub size: f64,
    pub step: f64,
    pub default_amount: f64,
}

impl IntoValue for PortionOption {
    fn into_value(self) -> Value {
        json!({
            "id": self.id,
            "label": self.label,
            "size": self.size,
            "step": self.step,
            "defaultAmount": self.default_amount
        })
    }
}

#[derive(Debug, Clone)]
pub struct TargetInput {
    pub sex: String,
    pub age: f64,
    pub height_cm: f64,
    pub weight_lbs: f64,
    pub activity: String,
    pub goal: String,
}

impl TargetInput {
    pub fn from_value(v: &Value) -> Self {
        Self {
            sex: v_str(v.get("sex"), "male"),
            age: v_f64(v.get("age"), 30.0),
            height_cm: v_f64(v.get("heightCm"), 178.0),
            weight_lbs: v_f64(v.get("weightLbs"), 175.0),
            activity: v_str(v.get("activity"), "moderate"),
            goal: v_str(v.get("goal"), "recomp"),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct TargetOutput {
    pub bmr: i64,
    pub tdee: i64,
    pub calories: i64,
    pub protein: i64,
    pub carbs: i64,
    pub fats: i64,
}

impl IntoValue for TargetOutput {
    fn into_value(self) -> Value {
        json!({
            "bmr": self.bmr,
            "tdee": self.tdee,
            "calories": self.calories,
            "protein": self.protein,
            "carbs": self.carbs,
            "fats": self.fats
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct WeightPointInput {
    pub date: String,
    pub value: f64,
}

impl WeightPointInput {
    pub fn from_value(v: &Value) -> Option<Self> {
        Some(Self {
            date: v.get("date")?.as_str()?.to_string(),
            value: v_opt_f64(v.get("value"))?,
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct MacroDayInput {
    pub kcal: f64,
    pub protein: f64,
    pub carbs: f64,
    pub fats: f64,
}

impl MacroDayInput {
    pub fn from_value(v: &Value) -> Self {
        Self {
            kcal: v_f64(v.get("kcal"), 0.0),
            protein: v_f64(v.get("protein"), 0.0),
            carbs: v_f64(v.get("carbs"), 0.0),
            fats: v_f64(v.get("fats"), 0.0),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChartSegment {
    pub value: f64,
    pub color: String,
}

impl ChartSegment {
    pub fn from_value(v: &Value) -> Self {
        Self {
            value: v_f64(v.get("value"), 0.0),
            color: v_str(v.get("color"), ""),
        }
    }
}

impl IntoValue for ChartSegment {
    fn into_value(self) -> Value {
        json!({
            "value": self.value,
            "color": self.color
        })
    }
}

#[derive(Debug, Clone)]
pub struct BarChartBar {
    pub key: String,
    pub label: String,
    pub title: Option<String>,
    pub segments: Vec<ChartSegment>,
    pub selected: bool,
}

impl BarChartBar {
    pub fn from_value(v: &Value) -> Self {
        let segments = v
            .get("segments")
            .and_then(|s| s.as_array())
            .map(|arr| arr.iter().map(ChartSegment::from_value).collect())
            .unwrap_or_default();
        Self {
            key: v_str(v.get("key"), ""),
            label: v_str(v.get("label"), ""),
            title: v_opt_str(v.get("title")),
            segments,
            selected: v_bool(v.get("selected")),
        }
    }
}

#[derive(Debug, Clone)]
pub struct BarChartLine {
    pub values: Vec<Option<f64>>,
    pub color: String,
    pub width: Option<f64>,
}

impl BarChartLine {
    pub fn from_value(v: &Value) -> Self {
        let values = v
            .get("values")
            .and_then(|s| s.as_array())
            .map(|arr| arr.iter().map(|it| v_opt_f64(Some(it))).collect())
            .unwrap_or_default();
        Self {
            values,
            color: v_str(v.get("color"), ""),
            width: v_opt_f64(v.get("width")),
        }
    }
}

#[derive(Debug, Clone)]
pub struct BarChartConfig {
    pub width: f64,
    pub height: f64,
    pub bars: Vec<BarChartBar>,
    pub goal: Option<f64>,
    pub goal_label: String,
    pub lines: Vec<BarChartLine>,
    pub on_tap: String,
    pub fmt_kind: String,
}

impl BarChartConfig {
    pub fn from_value(v: &Value) -> Self {
        let bars = v
            .get("bars")
            .and_then(|s| s.as_array())
            .map(|arr| arr.iter().map(BarChartBar::from_value).collect())
            .unwrap_or_default();
        let lines = v
            .get("lines")
            .and_then(|s| s.as_array())
            .map(|arr| arr.iter().map(BarChartLine::from_value).collect())
            .unwrap_or_default();
        let goal_label = match v.get("goalLabel") {
            Some(Value::String(s)) => s.clone(),
            _ => "Goal".to_string(),
        };
        Self {
            width: v_f64(v.get("width"), 320.0),
            height: v_f64(v.get("height"), 176.0),
            bars,
            goal: v_opt_f64(v.get("goal")),
            goal_label,
            lines,
            on_tap: v_str(v.get("onTap"), ""),
            fmt_kind: v_str(v.get("fmtKind"), ""),
        }
    }
}

#[derive(Debug, Clone)]
pub struct PairBarItem {
    pub key: String,
    pub label: String,
    pub title: Option<String>,
    pub a: f64,
    pub b: f64,
    pub selected: bool,
}

impl PairBarItem {
    pub fn from_value(v: &Value) -> Self {
        Self {
            key: v_str(v.get("key"), ""),
            label: v_str(v.get("label"), ""),
            title: v_opt_str(v.get("title")),
            a: v_f64(v.get("a"), 0.0),
            b: v_f64(v.get("b"), 0.0),
            selected: v_bool(v.get("selected")),
        }
    }
}

#[derive(Debug, Clone)]
pub struct PairBarChartConfig {
    pub width: f64,
    pub height: f64,
    pub items: Vec<PairBarItem>,
    pub colors: Vec<String>,
    pub on_tap: String,
}

impl PairBarChartConfig {
    pub fn from_value(v: &Value) -> Self {
        let items = v
            .get("items")
            .and_then(|s| s.as_array())
            .map(|arr| arr.iter().map(PairBarItem::from_value).collect())
            .unwrap_or_default();
        let colors = v
            .get("colors")
            .and_then(|s| s.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|c| c.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();
        Self {
            width: v_f64(v.get("width"), 320.0),
            height: v_f64(v.get("height"), 168.0),
            items,
            colors,
            on_tap: v_str(v.get("onTap"), ""),
        }
    }
}

#[derive(Debug, Clone)]
pub struct DonutPart {
    pub value: f64,
    pub color: String,
}

impl DonutPart {
    pub fn from_value(v: &Value) -> Self {
        Self {
            value: v_f64(v.get("value"), 0.0),
            color: v_str(v.get("color"), ""),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SmartSearchQuery {
    pub original: String,
    pub normalized: String,
    pub inferred_store: String,
}

impl IntoValue for SmartSearchQuery {
    fn into_value(self) -> Value {
        json!({
            "original": self.original,
            "normalized": self.normalized,
            "inferredStore": self.inferred_store
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ShortcutValue {
    pub value: f64,
    pub unit: String,
}

impl IntoValue for ShortcutValue {
    fn into_value(self) -> Value {
        json!({
            "value": self.value,
            "unit": self.unit
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ShortcutLineParsed {
    pub metric: String,
    pub date: String,
    pub value: f64,
}

impl IntoValue for ShortcutLineParsed {
    fn into_value(self) -> Value {
        json!({
            "metric": self.metric,
            "date": self.date,
            "value": self.value
        })
    }
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct HealthCounts {
    pub steps: usize,
    pub calories: usize,
    pub weight: usize,
}

impl IntoValue for HealthCounts {
    fn into_value(self) -> Value {
        json!({
            "steps": self.steps,
            "calories": self.calories,
            "weight": self.weight
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct HealthFieldClassification {
    pub metric: String,
    pub kind: Option<String>,
    pub unit: Option<String>,
}

impl IntoValue for HealthFieldClassification {
    fn into_value(self) -> Value {
        let mut m = Map::new();
        m.insert("metric".to_string(), self.metric.into_value());
        if let Some(k) = self.kind {
            m.insert("kind".to_string(), k.into_value());
        }
        if let Some(u) = self.unit {
            m.insert("unit".to_string(), u.into_value());
        }
        Value::Object(m)
    }
}

#[derive(Debug, Clone)]
pub struct WeeklyReportRowInput {
    pub key: String,
    pub calories: f64,
    pub protein: f64,
    pub carbs: f64,
    pub fats: f64,
    pub goal: f64,
    pub steps: Option<f64>,
    pub burned: Option<f64>,
    pub exercise: f64,
}

impl WeeklyReportRowInput {
    pub fn from_value(v: &Value) -> Self {
        Self {
            key: v_str(v.get("key"), ""),
            calories: v_f64(v.get("calories"), 0.0),
            protein: v_f64(v.get("protein"), 0.0),
            carbs: v_f64(v.get("carbs"), 0.0),
            fats: v_f64(v.get("fats"), 0.0),
            goal: v_f64(v.get("goal"), 0.0),
            steps: v_opt_f64(v.get("steps")),
            burned: v_opt_f64(v.get("burned")),
            exercise: v_f64(v.get("exercise"), 0.0),
        }
    }
}

#[derive(Debug, Clone)]
pub struct WeeklyReportSummary {
    pub days_logged: usize,
    pub days: usize,
    pub avg_calories: i64,
    pub avg_goal: i64,
    pub avg_protein: i64,
    pub on_target: usize,
    pub avg_steps: Option<i64>,
    pub avg_balance: Option<i64>,
    pub total_exercise: f64,
}

impl IntoValue for WeeklyReportSummary {
    fn into_value(self) -> Value {
        json!({
            "daysLogged": self.days_logged,
            "days": self.days,
            "avgCalories": self.avg_calories,
            "avgGoal": self.avg_goal,
            "avgProtein": self.avg_protein,
            "onTarget": self.on_target,
            "avgSteps": self.avg_steps,
            "avgBalance": self.avg_balance,
            "totalExercise": self.total_exercise
        })
    }
}

#[derive(Debug, Clone)]
pub struct LabelPrefill {
    pub name: String,
    pub brand: String,
    pub serving_size: f64,
    pub serving_unit: String,
    pub serving_label: String,
    pub calories: i64,
    pub protein: f64,
    pub carbs: f64,
    pub fats: f64,
    pub micros: BTreeMap<String, f64>,
}

impl IntoValue for LabelPrefill {
    fn into_value(self) -> Value {
        json!({
            "name": self.name,
            "brand": self.brand,
            "servingSize": self.serving_size,
            "servingUnit": self.serving_unit,
            "servingLabel": self.serving_label,
            "calories": self.calories,
            "protein": self.protein,
            "carbs": self.carbs,
            "fats": self.fats,
            "micros": self.micros
        })
    }
}

#[derive(Debug, Clone)]
pub struct LabelCheckOutput {
    pub prefill: LabelPrefill,
    pub warnings: Vec<String>,
}

impl IntoValue for LabelCheckOutput {
    fn into_value(self) -> Value {
        json!({
            "prefill": self.prefill,
            "warnings": self.warnings
        })
    }
}
