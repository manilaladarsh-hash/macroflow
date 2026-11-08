use crate::nutrition::{escape_html, js_round};
use crate::types::{
    BarChartBar, BarChartConfig, ChartSegment, DonutPart, MacroDayInput, PairBarChartConfig,
    PairBarItem, WeightPointInput, WeeklyReportRowInput, WeeklyReportSummary,
};

pub fn parse_ymd_to_days(ymd: &str) -> Option<i64> {
    let parts: Vec<&str> = ymd.trim().split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let y: i64 = parts[0].parse().ok()?;
    let m: i64 = parts[1].parse().ok()?;
    let d: i64 = parts[2].parse().ok()?;
    // Howard Hinnant's civil_from_days / days_from_civil algorithm
    let y_adj = y - if m <= 2 { 1 } else { 0 };
    let era = if y_adj >= 0 { y_adj } else { y_adj - 399 } / 400;
    let yoe = y_adj - era * 400;
    let doy = (153 * (m + if m > 2 { -3 } else { 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Some(era * 146097 + doe - 719468)
}

pub fn weight_trend(points: &[WeightPointInput], alpha: f64) -> Vec<f64> {
    let mut trend: Option<f64> = None;
    let mut prev_days: Option<i64> = None;
    let mut out = Vec::with_capacity(points.len());

    for p in points {
        let cur_days = parse_ymd_to_days(&p.date).unwrap_or(0);
        let next_trend = match (trend, prev_days) {
            (Some(t), Some(pd)) => {
                let delta_days = (cur_days - pd).max(1) as i32;
                let weight = 1.0 - (1.0 - alpha).powi(delta_days);
                t + weight * (p.value - t)
            }
            _ => p.value,
        };
        trend = Some(next_trend);
        prev_days = Some(cur_days);
        out.push(js_round(next_trend * 100.0) / 100.0);
    }
    out
}

pub fn macro_segments(day: &MacroDayInput) -> Vec<ChartSegment> {
    let p = day.protein * 4.0;
    let c = day.carbs * 4.0;
    let f = day.fats * 9.0;
    let mt = p + c + f;
    let scale = if mt > day.kcal && mt > 0.0 {
        day.kcal / mt
    } else {
        1.0
    };
    vec![
        ChartSegment {
            value: p * scale,
            color: "var(--protein)".to_string(),
        },
        ChartSegment {
            value: c * scale,
            color: "var(--carbs)".to_string(),
        },
        ChartSegment {
            value: f * scale,
            color: "var(--fat)".to_string(),
        },
        ChartSegment {
            value: (day.kcal - mt * scale).max(0.0),
            color: "#8e8e93".to_string(),
        },
    ]
}

#[inline]
pub fn svg_num(n: f64) -> String {
    let r = js_round(n * 10.0) / 10.0;
    if r == 0.0 {
        "0".to_string()
    } else {
        format!("{}", r)
    }
}

pub fn nice_ceil(v: f64) -> f64 {
    if !(v > 0.0) {
        return 1.0;
    }
    let p = 10.0_f64.powf(v.log10().floor());
    let n = v / p;
    let steps = [1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0];
    let step = steps
        .iter()
        .copied()
        .find(|&s| n <= s + 1e-9)
        .unwrap_or(10.0);
    step * p
}

pub fn short_num(n: f64) -> String {
    let a = n.abs();
    if a >= 10000.0 {
        format!("{}k", js_round(n / 1000.0) as i64)
    } else if a >= 1000.0 {
        let s = format!("{:.1}", n / 1000.0);
        let trimmed = s.strip_suffix(".0").unwrap_or(&s);
        format!("{}k", trimmed)
    } else {
        format!("{}", js_round(n) as i64)
    }
}

fn fmt_value(n: f64, fmt_kind: &str) -> String {
    if fmt_kind == "round" {
        format!("{}", js_round(n) as i64)
    } else {
        short_num(n)
    }
}

pub fn goal_line_svg(width: f64, pad_l: f64, pad_r: f64, y: f64, label: &str) -> String {
    let gy = svg_num(y);
    let lw = js_round(label.chars().count() as f64 * 6.1 + 12.0) as i64;
    format!(
        "<line class=\"goal\" x1=\"{}\" x2=\"{}\" y1=\"{}\" y2=\"{}\"/><rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"16\" rx=\"8\" fill=\"var(--surface-3)\"/><text class=\"goal-label\" x=\"{}\" y=\"{}\" text-anchor=\"middle\">{}</text>",
        svg_num(pad_l),
        svg_num(width - pad_r),
        gy,
        gy,
        svg_num(pad_l + 2.0),
        svg_num(y - 8.0),
        lw,
        svg_num(pad_l + 2.0 + (lw as f64) / 2.0),
        svg_num(js_round(y * 10.0) / 10.0 + 3.6),
        escape_html(label)
    )
}

pub fn top_rounded_bar(x: f64, y: f64, w: f64, h: f64, r: f64, fill: &str) -> String {
    if !(h > 0.2) {
        return String::new();
    }
    let r_clamped = r.min(h).min(w / 2.0);
    format!(
        "<path d=\"M{},{}V{}Q{},{} {},{}H{}Q{},{} {},{}V{}Z\" fill=\"{}\"/>",
        svg_num(x),
        svg_num(y + h),
        svg_num(y + r_clamped),
        svg_num(x),
        svg_num(y),
        svg_num(x + r_clamped),
        svg_num(y),
        svg_num(x + w - r_clamped),
        svg_num(x + w),
        svg_num(y),
        svg_num(x + w),
        svg_num(y + r_clamped),
        svg_num(y + h),
        fill
    )
}

fn chart_axes_svg(
    width: f64,
    pad_l: f64,
    pad_r: f64,
    pad_t: f64,
    h: f64,
    top: f64,
    fmt_kind: &str,
) -> String {
    let y_of = |v: f64| pad_t + h - (v / top) * h;
    [0.0, 0.5, 1.0]
        .iter()
        .map(|&t| {
            let yy_val = js_round(y_of(top * t) * 10.0) / 10.0;
            let yy = svg_num(yy_val);
            let y_text = svg_num(yy_val + 3.5);
            format!(
                "<line class=\"grid\" x1=\"{}\" x2=\"{}\" y1=\"{}\" y2=\"{}\"/><text x=\"{}\" y=\"{}\" text-anchor=\"end\">{}</text>",
                svg_num(pad_l),
                svg_num(width - pad_r),
                yy,
                yy,
                svg_num(pad_l - 6.0),
                y_text,
                fmt_value(top * t, fmt_kind)
            )
        })
        .collect::<Vec<_>>()
        .join("")
}

fn chart_x_labels_bars(items: &[BarChartBar], pad_l: f64, slot: f64, height: f64) -> String {
    let step = ((items.len() as f64) / 7.0).ceil().max(1.0) as usize;
    items
        .iter()
        .enumerate()
        .map(|(i, b)| {
            if (items.len() - 1 - i) % step != 0 {
                String::new()
            } else {
                let style = if b.selected {
                    " style=\"fill:var(--text);font-weight:600\""
                } else {
                    ""
                };
                format!(
                    "<text x=\"{}\" y=\"{}\" text-anchor=\"middle\"{}>{}</text>",
                    svg_num(pad_l + slot * (i as f64) + slot / 2.0),
                    svg_num(height - 6.0),
                    style,
                    escape_html(&b.label)
                )
            }
        })
        .collect::<Vec<_>>()
        .join("")
}

fn chart_x_labels_pairs(items: &[PairBarItem], pad_l: f64, slot: f64, height: f64) -> String {
    let step = ((items.len() as f64) / 7.0).ceil().max(1.0) as usize;
    items
        .iter()
        .enumerate()
        .map(|(i, b)| {
            if (items.len() - 1 - i) % step != 0 {
                String::new()
            } else {
                let style = if b.selected {
                    " style=\"fill:var(--text);font-weight:600\""
                } else {
                    ""
                };
                format!(
                    "<text x=\"{}\" y=\"{}\" text-anchor=\"middle\"{}>{}</text>",
                    svg_num(pad_l + slot * (i as f64) + slot / 2.0),
                    svg_num(height - 6.0),
                    style,
                    escape_html(&b.label)
                )
            }
        })
        .collect::<Vec<_>>()
        .join("")
}

pub fn bar_chart_svg(cfg: &BarChartConfig) -> String {
    let pad_l = 34.0;
    let pad_r = 4.0;
    let pad_t = 18.0;
    let pad_b = 22.0;
    let w = cfg.width - pad_l - pad_r;
    let h = cfg.height - pad_t - pad_b;

    let totals: Vec<f64> = cfg
        .bars
        .iter()
        .map(|b| {
            b.segments
                .iter()
                .map(|sg| sg.value.max(0.0))
                .sum::<f64>()
        })
        .collect();

    let line_max = cfg
        .lines
        .iter()
        .flat_map(|l| l.values.iter().filter_map(|&v| v))
        .filter(|v| v.is_finite())
        .fold(0.0_f64, f64::max);

    let max_total = totals.iter().copied().fold(1.0_f64, f64::max);
    let max_val = max_total
        .max(line_max)
        .max(cfg.goal.unwrap_or(0.0));
    let top = nice_ceil(max_val * 1.08);
    let y_of = |v: f64| pad_t + h - (v / top) * h;
    let slot = w / (cfg.bars.len().max(1) as f64);
    let bw = (slot * 0.64).min(24.0).max(2.5);

    let mut svg = format!(
        "<svg viewBox=\"0 0 {} {}\" width=\"{}\" height=\"{}\" aria-hidden=\"true\">{}",
        svg_num(cfg.width),
        svg_num(cfg.height),
        svg_num(cfg.width),
        svg_num(cfg.height),
        chart_axes_svg(cfg.width, pad_l, pad_r, pad_t, h, top, &cfg.fmt_kind)
    );

    for (i, b) in cfg.bars.iter().enumerate() {
        let x = pad_l + slot * (i as f64) + (slot - bw) / 2.0;
        let segs: Vec<&ChartSegment> = b.segments.iter().filter(|sg| sg.value > 0.0).collect();
        let mut acc = 0.0;
        for (k, sg) in segs.iter().enumerate() {
            let y1 = y_of(acc + sg.value);
            let hh = y_of(acc) - y1;
            if k == segs.len() - 1 {
                svg.push_str(&top_rounded_bar(x, y1, bw, hh, 4.0, &sg.color));
            } else {
                svg.push_str(&format!(
                    "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{}\"/>",
                    svg_num(x),
                    svg_num(y1),
                    svg_num(bw),
                    svg_num((hh - 0.8).max(0.0)),
                    sg.color
                ));
            }
            acc += sg.value;
        }
        if b.selected && totals[i] > 0.0 {
            svg.push_str(&format!(
                "<text class=\"sel-label\" x=\"{}\" y=\"{}\" text-anchor=\"middle\">{}</text>",
                svg_num(x + bw / 2.0),
                svg_num(y_of(totals[i]) - 5.0),
                fmt_value(totals[i], &cfg.fmt_kind)
            ));
        }
    }

    for line in &cfg.lines {
        let mut d = String::new();
        let mut pen = false;
        for (i, v_opt) in line.values.iter().enumerate() {
            match v_opt {
                Some(v) if v.is_finite() => {
                    d.push_str(&format!(
                        "{}{},{}",
                        if pen { "L" } else { "M" },
                        svg_num(pad_l + slot * (i as f64) + slot / 2.0),
                        svg_num(y_of(*v))
                    ));
                    pen = true;
                }
                _ => {
                    pen = false;
                }
            }
        }
        if !d.is_empty() {
            svg.push_str(&format!(
                "<path d=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/>",
                d,
                line.color,
                svg_num(line.width.unwrap_or(2.0))
            ));
        }
    }

    if let Some(goal) = cfg.goal.filter(|&g| g > 0.0) {
        let lbl = format!("{} {}", cfg.goal_label, fmt_value(goal, &cfg.fmt_kind))
            .trim()
            .to_string();
        svg.push_str(&goal_line_svg(cfg.width, pad_l, pad_r, y_of(goal), &lbl));
    }

    svg.push_str(&chart_x_labels_bars(&cfg.bars, pad_l, slot, cfg.height));

    if !cfg.on_tap.is_empty() {
        for (i, b) in cfg.bars.iter().enumerate() {
            let title = b.title.as_deref().unwrap_or(&b.label);
            svg.push_str(&format!(
                "<rect class=\"bar-hit\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" onclick=\"{}('{}')\"><title>{}</title></rect>",
                svg_num(pad_l + slot * (i as f64)),
                svg_num(pad_t),
                svg_num(slot),
                svg_num(h),
                cfg.on_tap,
                b.key,
                escape_html(title)
            ));
        }
    }

    svg.push_str("</svg>");
    svg
}

pub fn pair_bar_chart_svg(cfg: &PairBarChartConfig) -> String {
    let pad_l = 34.0;
    let pad_r = 4.0;
    let pad_t = 14.0;
    let pad_b = 22.0;
    let w = cfg.width - pad_l - pad_r;
    let h = cfg.height - pad_t - pad_b;

    let max_ab = cfg
        .items
        .iter()
        .flat_map(|it| [it.a, it.b])
        .fold(1.0_f64, f64::max);
    let top = nice_ceil(max_ab * 1.08);
    let y_of = |v: f64| pad_t + h - (v / top) * h;
    let slot = w / (cfg.items.len().max(1) as f64);
    let bw = (slot * 0.34).min(14.0).max(2.0);
    let c0 = cfg.colors.first().map(|s| s.as_str()).unwrap_or("var(--kcal)");
    let c1 = cfg.colors.get(1).map(|s| s.as_str()).unwrap_or("var(--burn)");

    let mut svg = format!(
        "<svg viewBox=\"0 0 {} {}\" width=\"{}\" height=\"{}\" aria-hidden=\"true\">{}",
        svg_num(cfg.width),
        svg_num(cfg.height),
        svg_num(cfg.width),
        svg_num(cfg.height),
        chart_axes_svg(cfg.width, pad_l, pad_r, pad_t, h, top, "short")
    );

    for (i, it) in cfg.items.iter().enumerate() {
        let cx = pad_l + slot * (i as f64) + slot / 2.0;
        if it.a > 0.0 {
            svg.push_str(&top_rounded_bar(
                cx - bw - 1.0,
                y_of(it.a),
                bw,
                y_of(0.0) - y_of(it.a),
                3.5,
                c0,
            ));
        }
        if it.b > 0.0 {
            svg.push_str(&top_rounded_bar(
                cx + 1.0,
                y_of(it.b),
                bw,
                y_of(0.0) - y_of(it.b),
                3.5,
                c1,
            ));
        }
    }

    svg.push_str(&chart_x_labels_pairs(&cfg.items, pad_l, slot, cfg.height));

    if !cfg.on_tap.is_empty() {
        for (i, it) in cfg.items.iter().enumerate() {
            let title = it.title.as_deref().unwrap_or(&it.label);
            svg.push_str(&format!(
                "<rect class=\"bar-hit\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" onclick=\"{}('{}')\"><title>{}</title></rect>",
                svg_num(pad_l + slot * (i as f64)),
                svg_num(pad_t),
                svg_num(slot),
                svg_num(h),
                cfg.on_tap,
                it.key,
                escape_html(title)
            ));
        }
    }

    svg.push_str("</svg>");
    svg
}

pub fn donut_svg(parts: &[DonutPart], size: f64, stroke: f64) -> String {
    let r = (size - stroke) / 2.0;
    let c = 2.0 * std::f64::consts::PI * r;
    let total: f64 = parts.iter().map(|p| p.value).sum();
    let half = svg_num(size / 2.0);
    let r_str = svg_num(r);
    let s_str = svg_num(size);
    let st_str = svg_num(stroke);

    let mut svg = format!(
        "<svg viewBox=\"0 0 {} {}\" width=\"{}\" height=\"{}\" aria-hidden=\"true\" style=\"transform:rotate(-90deg)\"><circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"none\" stroke=\"var(--surface-3)\" stroke-width=\"{}\"/>",
        s_str, s_str, s_str, s_str, half, half, r_str, st_str
    );

    if total > 0.0 {
        let mut offset = 0.0;
        for p in parts {
            let len = (p.value / total) * c;
            if len > 1.0 {
                svg.push_str(&format!(
                    "<circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\" stroke-dasharray=\"{} {}\" stroke-dashoffset=\"{}\"/>",
                    half,
                    half,
                    r_str,
                    p.color,
                    st_str,
                    svg_num((len - 2.0).max(0.0)),
                    svg_num(c),
                    svg_num(-offset)
                ));
            }
            offset += len;
        }
    }

    svg.push_str("</svg>");
    svg
}

pub fn weekly_report_from_rows(
    rows: &[WeeklyReportRowInput],
    today_key: &str,
) -> WeeklyReportSummary {
    let logged: Vec<&WeeklyReportRowInput> = rows.iter().filter(|r| r.calories > 0.0).collect();
    let avg_calories = if logged.is_empty() {
        0
    } else {
        js_round(logged.iter().map(|r| r.calories).sum::<f64>() / (logged.len() as f64)) as i64
    };
    let goal_source: Vec<f64> = if logged.is_empty() {
        rows.iter().map(|r| r.goal).collect()
    } else {
        logged.iter().map(|r| r.goal).collect()
    };
    let avg_goal = if goal_source.is_empty() {
        0
    } else {
        js_round(goal_source.iter().sum::<f64>() / (goal_source.len() as f64)) as i64
    };
    let avg_protein = if logged.is_empty() {
        0
    } else {
        js_round(logged.iter().map(|r| r.protein).sum::<f64>() / (logged.len() as f64)) as i64
    };
    let on_target = logged
        .iter()
        .filter(|r| (r.calories - r.goal).abs() <= r.goal * 0.1)
        .count();

    let with_steps: Vec<f64> = rows.iter().filter_map(|r| r.steps).collect();
    let avg_steps = if with_steps.is_empty() {
        None
    } else {
        Some(js_round(with_steps.iter().sum::<f64>() / (with_steps.len() as f64)) as i64)
    };

    let with_burn: Vec<&WeeklyReportRowInput> = rows
        .iter()
        .filter(|r| {
            r.burned.unwrap_or(0.0) > 0.0
                && r.calories > 0.0
                && r.key.as_str() < today_key
        })
        .collect();
    let avg_balance = if with_burn.is_empty() {
        None
    } else {
        let sum_bal: f64 = with_burn
            .iter()
            .map(|r| r.calories - r.burned.unwrap_or(0.0))
            .sum();
        Some(js_round(sum_bal / (with_burn.len() as f64)) as i64)
    };

    let total_exercise: f64 = rows.iter().map(|r| r.exercise).sum();

    WeeklyReportSummary {
        days_logged: logged.len(),
        days: rows.len(),
        avg_calories,
        avg_goal,
        avg_protein,
        on_target,
        avg_steps,
        avg_balance,
        total_exercise,
    }
}

pub fn ring_stroke_metrics(name: &str, fraction: f64) -> crate::json::Value {
    let r = match name {
        "kcal" => 87.0,
        "protein" => 65.0,
        "carbs" => 43.0,
        "fat" => 21.0,
        _ => 65.0,
    };
    let c = 2.0 * std::f64::consts::PI * r;
    let f = if fraction.is_finite() && fraction > 0.0 {
        fraction
    } else {
        0.0
    };
    let first = f.min(1.0);
    let over = (f - 1.0).max(0.0).min(1.0);
    json!({
        "dasharray": format!("{:.2} {:.2}", c, c),
        "dashoffset": format!("{:.2}", c * (1.0 - first)),
        "opacity": if f > 0.005 { "1" } else { "0" },
        "lapDashoffset": format!("{:.2}", c * (1.0 - over)),
        "lapOpacity": if over > 0.005 { "1" } else { "0" }
    })
}

pub fn calculate_streak_metrics(log_dates: &[String], today_days: i64) -> crate::json::Value {
    let mut days_vec: Vec<i64> = log_dates
        .iter()
        .filter_map(|d| parse_ymd_to_days(d))
        .collect();
    days_vec.sort_unstable();
    days_vec.dedup();

    if days_vec.is_empty() {
        return json!({ "current": 0, "best": 0 });
    }

    let mut max_contig: i64 = 1;
    let mut temp_contig: i64 = 1;
    for i in 1..days_vec.len() {
        let diff = days_vec[i] - days_vec[i - 1];
        if diff == 1 {
            temp_contig += 1;
        } else if diff > 1 {
            if temp_contig > max_contig {
                max_contig = temp_contig;
            }
            temp_contig = 1;
        }
    }
    if temp_contig > max_contig {
        max_contig = temp_contig;
    }

    let day_set: std::collections::BTreeSet<i64> = days_vec.into_iter().collect();
    let mut current: i64 = 0;
    let mut cursor = if day_set.contains(&today_days) {
        Some(today_days)
    } else if day_set.contains(&(today_days - 1)) {
        Some(today_days - 1)
    } else {
        None
    };

    while let Some(d) = cursor {
        if day_set.contains(&d) {
            current += 1;
            cursor = Some(d - 1);
        } else {
            break;
        }
    }

    json!({
        "current": current,
        "best": max_contig.max(current)
    })
}

