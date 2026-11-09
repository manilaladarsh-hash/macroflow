// MacroFlow — Rust UI Shell, Layout & Design System Engine
// Generates the complete CSS stylesheet and HTML view hierarchy from Rust WebAssembly.

pub const MEAL_SLOTS: [(&str, &str); 4] = [
    ("breakfast", "Breakfast"),
    ("lunch", "Lunch"),
    ("dinner", "Dinner"),
    ("snacks", "Snacks"),
];

pub fn app_stylesheet() -> &'static str {
    r######":root {
    color-scheme: light dark;
    /* iOS system colours. Dark values follow the phone (media query below). */
    --bg: #f2f2f7;
    --bg-2: #ffffff;
    --surface: #ffffff;
    --surface-2: #f2f2f7;
    --surface-3: #e5e5ea;
    --fill: rgba(118, 118, 128, 0.12);
    --line: rgba(60, 60, 67, 0.16);
    --line-strong: rgba(60, 60, 67, 0.29);
    --text: #000000;
    --muted: #6c6c70;
    --faint: #aeaeb2;
    --kcal: #34c759;
    --kcal-2: #6ad884;
    --protein: #ff2d55;
    --protein-2: #ff6a85;
    --carbs: #007aff;
    --carbs-2: #4aa3ff;
    --fat: #ff9500;
    --fat-2: #ffb340;
    --water: #32ade6;
    --burn: #ff9500;
    --burn-2: #ff3b30;
    --pink: #ff2d55;
    --nut: #a2845e;
    --ai: #af52de;
    --ai-2: #5856d6;
    --brand: var(--kcal);
    --brand-strong: #248a3d;
    --brand-soft: rgba(52, 199, 89, 0.14);
    --on-brand: #ffffff;
    --brand-ink: var(--on-brand);
    --danger: #ff3b30;
    --warn: #ff9500;
    --bar-bg: rgba(249, 249, 249, 0.94);
    --scrim: rgba(0, 0, 0, 0.4);
    --shadow: none;
    --chart-grid: rgba(60, 60, 67, 0.12);
    --note-fg: #8a5300;
    --note-ai-fg: #7a2f9c;
    --toast-bg: rgba(255, 255, 255, 0.96);
    --toast-fg: #000000;
    --seg-thumb: #ffffff;
    --radius: 14px;
    --radius-sm: 10px;
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-top: env(safe-area-inset-top, 0px);
    --nav-h: 64px;
    --font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, 'Segoe UI', Roboto, sans-serif;
    --serif: ui-rounded, 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
    :root {
        --bg: #000000;
        --bg-2: #1c1c1e;
        --surface: #1c1c1e;
        --surface-2: #2c2c2e;
        --surface-3: #3a3a3c;
        --fill: rgba(118, 118, 128, 0.24);
        --line: rgba(84, 84, 88, 0.55);
        --line-strong: rgba(84, 84, 88, 0.75);
        --text: #ffffff;
        --muted: #98989f;
        --faint: #636366;
        --kcal: #30d158;
        --kcal-2: #6ee28a;
        --protein: #ff375f;
        --protein-2: #ff7390;
        --carbs: #0a84ff;
        --carbs-2: #5aadff;
        --fat: #ff9f0a;
        --fat-2: #ffbf5a;
        --water: #64d2ff;
        --burn: #ff9f0a;
        --burn-2: #ff453a;
        --pink: #ff375f;
        --nut: #ac8e68;
        --ai: #bf5af2;
        --ai-2: #5e5ce6;
        --brand-strong: #30d158;
        --brand-soft: rgba(48, 209, 88, 0.18);
        --on-brand: #ffffff;
        --danger: #ff453a;
        --warn: #ff9f0a;
        --bar-bg: rgba(22, 22, 23, 0.92);
        --scrim: rgba(0, 0, 0, 0.55);
        --chart-grid: rgba(84, 84, 88, 0.45);
        --note-fg: #ffd28a;
        --note-ai-fg: #e3b7f7;
        --toast-bg: rgba(44, 44, 46, 0.96);
        --toast-fg: #ffffff;
        --seg-thumb: #636366;
    }
}
/* Minimal reset so the layout holds even if the Tailwind CDN is slow or blocked */
*, ::before, ::after { box-sizing: border-box; border: 0 solid; }
html, body, h1, h2, h3, h4, p, figure, blockquote { margin: 0; }
button, input, select, textarea { font: inherit; color: inherit; margin: 0; }
button { background: transparent; padding: 0; text-align: inherit; }
img, video, canvas { display: block; max-width: 100%; }
table { border-collapse: collapse; }
.contents { display: contents; }
* { -webkit-tap-highlight-color: transparent; }
html { background: var(--bg); }
body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text);
    font-size: 15px;
    line-height: 1.45;
    letter-spacing: -0.006em;
    min-height: 100vh;
    min-height: 100dvh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
body.has-overlay { overflow: hidden; }
.hidden { display: none !important; }
h1, h2, h3, .font-outfit { font-family: var(--font); letter-spacing: -0.02em; }
.num, .tnum { font-variant-numeric: tabular-nums; }
.mono { font-family: var(--mono); letter-spacing: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: 0.45; }
:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 6px; }
::selection { background: var(--kcal); color: var(--on-brand); }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: var(--surface-3); border-radius: 6px; }

/* ---------- Layout ---------- */
.app-shell { max-width: 520px; margin: 0 auto; padding: 0 20px calc(var(--nav-h) + var(--safe-bottom) + 32px); }
.topbar {
    position: sticky; top: 0; z-index: 30;
    margin: 0 -20px; padding: calc(10px + var(--safe-top)) 20px 0;
    background: var(--bar-bg);
    backdrop-filter: saturate(160%) blur(18px); -webkit-backdrop-filter: saturate(160%) blur(18px);
}
.topbar-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding: 6px 0 12px; }
.title-btn { text-align: left; background: none; border: 0; padding: 0; color: inherit; min-width: 0; }
.page-title { font-size: 30px; font-weight: 700; line-height: 1.1; letter-spacing: -0.035em; }
.page-sub { font-size: 14px; color: var(--muted); margin-top: 3px; font-weight: 450; }
.topbar-actions { display: flex; gap: 2px; margin-bottom: 2px; }
.tab-panel > * + * { margin-top: 16px; }

/* Week strip */
.week { display: grid; grid-template-columns: 28px repeat(7, minmax(0, 1fr)) 28px; align-items: center; gap: 2px; padding: 0 0 12px; border-bottom: 1px solid var(--line); }
.week-nav { height: 52px; display: grid; place-items: center; color: var(--faint); border-radius: 10px; }
.week-nav:hover { color: var(--text); }
.day { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 0 4px; border-radius: 12px; color: var(--muted); }
.day .dow { font-size: 11px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--faint); }
.day .dnum { position: relative; width: 34px; height: 34px; display: grid; place-items: center; font-size: 14px; font-weight: 500; font-variant-numeric: tabular-nums; }
.day .dnum svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.day .dnum circle { fill: none; stroke-width: 2.5; }
.day .track { stroke: var(--surface-3); }
.day .prog { stroke: var(--kcal); stroke-linecap: round; }
.day .prog.over { stroke: var(--fat-2); }
.day.is-today .dow { color: var(--kcal); }
.day.is-selected .dnum { background: var(--text); color: var(--bg); border-radius: 50%; font-weight: 700; }
.day.is-selected .dnum svg { display: none; }
.day.is-future { opacity: 0.4; }

/* ---------- Primitives ---------- */
.card { background: var(--surface); border-radius: var(--radius); padding: 18px; }
.card-tight { padding: 14px; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 10px; letter-spacing: -0.01em; }
.card-title i { color: var(--faint); font-size: 14px; width: 16px; text-align: center; }
.muted { color: var(--muted); }
.faint { color: var(--faint); }
.small { font-size: 13px; }
.tiny { font-size: 12px; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; }
.section-head h2 { font-size: 13px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 0 18px;
    border-radius: var(--radius-sm); font-weight: 600; font-size: 15px; border: 1px solid transparent; transition: background .15s, border-color .15s, opacity .15s; }
.btn:active:not(:disabled) { opacity: 0.8; }
.btn-primary { background: var(--kcal); color: var(--on-brand); }
.btn-primary:hover:not(:disabled) { filter: brightness(1.07); }
.btn-soft { background: var(--surface-2); color: var(--text); }
.btn-soft:hover:not(:disabled) { background: var(--surface-3); }
.btn-ghost { background: transparent; color: var(--muted); border-color: var(--line-strong); }
.btn-ghost:hover:not(:disabled) { color: var(--text); }
.btn-danger { background: transparent; color: var(--danger); border-color: var(--line-strong); }
.btn-danger:hover:not(:disabled) { background: rgba(204, 65, 55, 0.08); }
.btn-ai { background: var(--ai); color: #fff; }
.btn-sm { min-height: 36px; padding: 0 14px; font-size: 14px; border-radius: 10px; }
.btn-block { width: 100%; }
.icon-btn { width: 40px; height: 40px; border-radius: 12px; display: inline-grid; place-items: center; flex-shrink: 0;
    color: var(--muted); background: transparent; border: 0; transition: background .15s, color .15s; font-size: 16px; }
.icon-btn:hover { background: var(--surface-2); color: var(--text); }
.icon-btn.solid { background: var(--surface-2); }
.icon-btn.brand { color: var(--brand); }
.chip { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px; border-radius: 999px;
    background: var(--surface-2); color: var(--text); font-size: 14px; font-weight: 500; white-space: nowrap; }
.chip i { color: var(--muted); font-size: 13px; }
.chip:hover { background: var(--surface-3); }
.badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;
    background: var(--surface-2); color: var(--muted); white-space: nowrap; }
.badge.brand { background: var(--brand-soft); color: var(--brand); }
.badge.ai { background: rgba(118, 86, 204, 0.12); color: var(--ai); }
.badge.warn { background: rgba(233, 180, 76, 0.12); color: var(--warn); }

.seg { display: flex; padding: 3px; gap: 2px; background: var(--surface); border-radius: 12px; }
.seg button { flex: 1; min-height: 36px; padding: 0 8px; border-radius: 9px; font-size: 14px; font-weight: 500; color: var(--muted); transition: background .15s, color .15s; white-space: nowrap; }
.seg button:hover { color: var(--text); }
.seg button.is-active { background: var(--surface-3); color: var(--text); }
.seg.brand button.is-active { background: var(--surface-3); color: var(--text); }

.field { display: flex; flex-direction: column; gap: 6px; }
.field > label, .label { font-size: 13px; font-weight: 500; color: var(--muted); }
.input, .select, .textarea {
    width: 100%; min-height: 46px; padding: 10px 14px; border-radius: var(--radius-sm);
    background: var(--bg-2); border: 1px solid var(--line-strong); color: var(--text); font-size: 16px; font-family: inherit;
    transition: border-color .15s, box-shadow .15s; }
.textarea { min-height: 96px; resize: vertical; line-height: 1.5; }
.select { appearance: none; -webkit-appearance: none; padding-right: 36px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394949b' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center; }
.input:focus, .select:focus, .textarea:focus { outline: none; border-color: var(--muted); }
.input::placeholder, .textarea::placeholder { color: var(--faint); }
.input-unit { position: relative; }
.input-unit .input { padding-right: 52px; }
.input-unit span { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--faint); pointer-events: none; }
.check { display: flex; align-items: center; gap: 10px; min-height: 40px; font-size: 14px; color: var(--text); cursor: pointer; }
.check input { width: 18px; height: 18px; accent-color: var(--brand-strong); }

.bar { height: 6px; border-radius: 999px; background: var(--surface-3); overflow: hidden; }
.bar > div { height: 100%; border-radius: 999px; transition: width .5s cubic-bezier(.2,.8,.2,1); }
.bar.thin { height: 4px; }

/* ---------- Today: rings hero ---------- */
.hero { position: relative; background: var(--surface); box-shadow: var(--shadow);
    border-radius: 26px; padding: 18px 18px 14px; overflow: hidden; }
.hero-main { display: flex; align-items: center; gap: 16px; }
.rings { position: relative; width: 158px; height: 158px; flex-shrink: 0; }
.rings svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.rings circle { fill: none; stroke-linecap: round; }
.rings .ring-track { opacity: 0.2; }
.rings .ring-arc { transition: stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1); }
.rings .ring-lap { transition: stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1); }
.hero-stats { flex: 1; min-width: 0; display: grid; gap: 9px; }
.kcal-label { font-size: 13px; color: var(--muted); font-weight: 500; display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 0; }
.kcal-label i { font-size: 10px; color: var(--faint); }
.hero-kcal { font-size: 38px; font-weight: 700; line-height: 1; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; color: var(--kcal); margin-top: 3px; }
.hero-of { font-size: 13px; color: var(--muted); font-weight: 500; margin-top: 3px; font-variant-numeric: tabular-nums; }
.hero-stats > div:first-child { margin-bottom: 4px; }
.hm { display: grid; grid-template-columns: auto 1fr; align-items: baseline; column-gap: 8px; }
.hm .k { font-size: 12px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
.hm .v { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; text-align: right; white-space: nowrap; }
.hm .v small { font-size: 12px; font-weight: 500; color: var(--muted); letter-spacing: 0; }
.hm .left { grid-column: 1 / -1; font-size: 11.5px; color: var(--faint); font-variant-numeric: tabular-nums; margin-top: -1px; }
.hm .left.over { color: var(--fat-2); }
.hm.protein .k { color: var(--protein); }
.hm.carbs .k { color: var(--carbs-2); }
.hm.fat .k { color: var(--fat); }
.hero-eq { display: flex; justify-content: space-between; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
.hero-eq > div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.hero-eq span { font-size: 11.5px; color: var(--faint); font-weight: 500; }
.hero-eq b { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.hero-eq .op { align-self: flex-end; color: var(--faint); font-size: 15px; padding-bottom: 1px; }
#eq-left b { color: var(--kcal); }
#eq-left.over b { color: var(--fat-2); }
#eq-exercise b { color: var(--burn); }

/* Quick actions */
.actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.action { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 12px 4px 10px; border-radius: 18px; background: var(--surface); color: var(--text); font-size: 12.5px; font-weight: 600; transition: transform .12s, background .15s; }
.action:active { transform: scale(0.96); }
.action:hover { background: var(--surface-2); }
.action .ai-ico { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 17px; }
/* kept for selectors used by tests and older code */
.log-search, .log-scan { cursor: pointer; }

/* Quick log carousel */
.ql-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.ql-head h2 { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
.ql-meal { font-size: 13px; color: var(--muted); display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: var(--surface); }
.ql-meal b { color: var(--text); font-weight: 600; }
.ql-list { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x proximity; margin: 0 -20px; padding: 2px 20px 4px; scrollbar-width: none; }
.ql-list::-webkit-scrollbar { display: none; }
.ql-item { position: relative; flex: 0 0 138px; scroll-snap-align: start; border-radius: 18px; background: var(--surface); padding: 12px 12px 11px; text-align: left; display: flex; flex-direction: column; gap: 8px; min-height: 124px; }
.ql-item .ql-name { font-size: 13.5px; font-weight: 600; line-height: 1.25; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ql-item .ql-kcal { margin-top: auto; padding-right: 34px; font-size: 12px; line-height: 1.3; color: var(--muted); font-variant-numeric: tabular-nums; }
.ql-add { position: absolute; right: 9px; bottom: 9px; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--kcal); color: var(--brand-ink); font-size: 14px; box-shadow: 0 6px 14px -6px var(--kcal); }
.ql-add:active { transform: scale(0.92); }

/* Food icons */
.food-ico { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; font-size: 15px; }
.food-ico.sm { width: 32px; height: 32px; border-radius: 10px; font-size: 13px; }

/* ---------- Meals ---------- */
.meal { background: var(--surface); border-radius: var(--radius); padding: 14px 16px 6px; }
.meal + .meal { margin-top: 12px; }
.meal-head { display: flex; align-items: center; gap: 12px; padding-bottom: 10px; }
.meal-ico { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; font-size: 15px; flex-shrink: 0; }
.meal-title { flex: 1; min-width: 0; }
.meal-head h3 { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; }
.meal-head .meal-kcal { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; display: block; margin-top: 1px; }
.meal-head .meal-kcal:empty::before { content: 'Nothing logged yet'; color: var(--faint); }
.meal-plus { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--brand-soft); color: var(--kcal); font-size: 14px; flex-shrink: 0; }
.meal-plus:hover { background: rgba(44, 138, 91, 0.2); }
.meal-plus .lbl { display: none; }
.meal-save { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--muted); font-size: 14px; flex-shrink: 0; }
.meal-save:hover { color: var(--text); background: var(--surface-2); }
.meal-macros { display: flex; height: 4px; gap: 2px; border-radius: 99px; overflow: hidden; margin: -2px 0 8px; }
.meal-macros > div { height: 100%; border-radius: 99px; }
.meal-content.collapsed { display: none; }
.entry { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); cursor: pointer; }
.entry-main { flex: 1; min-width: 0; text-align: left; background: none; border: 0; padding: 0; color: inherit; }
.entry-name { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
.entry-meta { font-size: 12.5px; color: var(--faint); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.entry-kcal { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text); flex-shrink: 0; }
.entry-kcal small { font-size: 11.5px; color: var(--faint); font-weight: 500; margin-left: 2px; }
.meal-empty { display: none; }
.suggest { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 10px 0 10px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13.5px; background: transparent; }
.suggest:hover { color: var(--text); }
.suggest b { color: var(--text); font-weight: 600; }
.suggest .plus { margin-left: auto; color: var(--kcal); font-variant-numeric: tabular-nums; font-size: 13px; font-weight: 600; white-space: nowrap; }
.suggest > i { color: var(--faint); }
.copy-day { display: flex; align-items: center; gap: 10px; width: 100%; padding: 14px 16px; border-radius: 18px; border: 1px dashed var(--line-strong); color: var(--muted); font-size: 14px; }
.copy-day:hover { color: var(--text); border-color: var(--muted); }

.disclosure { width: 100%; display: flex; align-items: center; justify-content: space-between; min-height: 48px; padding: 0;
    font-size: 15px; font-weight: 500; color: var(--text); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.disclosure i { color: var(--faint); transition: transform .2s; }
.disclosure[aria-expanded="true"] i { transform: rotate(180deg); }
.micro-group + .micro-group { margin-top: 4px; }
.micro-group > button { width: 100%; display: flex; justify-content: space-between; align-items: center; min-height: 44px; font-size: 14px; color: var(--muted); }
.micro-row { padding: 10px 0; border-top: 1px solid var(--line); cursor: pointer; }
.micro-row .top { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; margin-bottom: 7px; }

.water-row { display: flex; align-items: center; gap: 8px; padding: 2px 0 10px; }
.water-glasses { flex: 1; display: flex; gap: 4px; min-width: 0; }
.water-glasses span { flex: 1; height: 22px; border-radius: 6px; background: rgba(63, 159, 210, 0.14); }
.water-glasses span.full { background: var(--water); }
.sync-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); flex-wrap: wrap; }
.sync-row .chip { height: 34px; padding: 0 12px; }
.text-strong { color: var(--text); font-weight: 600; }
.steps-list { counter-reset: step; display: grid; gap: 10px; font-size: 14px; line-height: 1.45; color: var(--muted); }
.steps-list li { list-style: none; position: relative; padding-left: 30px; }
.steps-list li::before { counter-increment: step; content: counter(step); position: absolute; left: 0; top: 0; width: 20px; height: 20px; border-radius: 10px; background: var(--surface-3); color: var(--text); font-size: 12px; font-weight: 600; display: grid; place-items: center; }
.steps-list b { color: var(--text); font-weight: 600; }
.code-block { font-family: var(--mono); font-size: 12px; line-height: 1.5; background: var(--surface-2); border-radius: 10px; padding: 10px 12px; white-space: pre; overflow-x: auto; color: var(--text); }
.water-bar { display: none; }
.water-row .chip { height: 34px; padding: 0 11px; font-variant-numeric: tabular-nums; }
#exercise-section .entry-kcal { color: var(--burn); }
#steps-line, #exercise-goal-note { padding: 0 0 10px; }

/* ---------- Bottom nav ---------- */
.bottom-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; padding: 6px 12px calc(6px + var(--safe-bottom));
    background: var(--bar-bg); backdrop-filter: saturate(160%) blur(18px); -webkit-backdrop-filter: saturate(160%) blur(18px); border-top: 1px solid var(--line); }
.bottom-nav .inner { max-width: 520px; margin: 0 auto; display: grid; grid-template-columns: repeat(5, 1fr); align-items: center; }
.nav-plus { justify-self: center; width: 58px; height: 58px; margin-top: -26px; border-radius: 50%; display: grid; place-items: center; font-size: 22px; color: var(--on-brand);
    background: var(--kcal); box-shadow: 0 10px 22px -8px rgba(44, 138, 91, 0.55), 0 0 0 5px var(--bg); transition: transform .12s; }
.nav-plus:active { transform: scale(0.94); }
.nav-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 52px; color: var(--faint); font-size: 11px; font-weight: 500; letter-spacing: 0.01em; }
.nav-btn i { font-size: 18px; }
.nav-btn:hover { color: var(--muted); }
.nav-btn.is-active { color: var(--kcal); }

/* ---------- Overlays ---------- */
.overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: flex-end; justify-content: center; }
.overlay.center { align-items: center; padding: 16px; }
.overlay-backdrop { position: absolute; inset: 0; background: var(--scrim); animation: fadeIn .2s ease; }
.sheet { position: relative; width: 100%; max-width: 520px; max-height: 92vh; max-height: 92dvh; overflow-y: auto; overscroll-behavior: contain;
    background: var(--surface); border-radius: 20px 20px 0 0;
    padding: 8px 20px calc(20px + var(--safe-bottom)); animation: slideUp .26s cubic-bezier(.2,.8,.2,1); }
.overlay.center .sheet { border-radius: 20px; max-width: 420px; padding-bottom: 20px; }
.grabber { width: 36px; height: 4px; border-radius: 99px; background: var(--surface-3); margin: 0 auto 14px; }
.sheet-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.sheet-head h3 { font-size: 20px; font-weight: 600; line-height: 1.2; }
.sheet-head p { font-size: 14px; color: var(--muted); margin-top: 4px; }
.sheet-body > * + * { margin-top: 16px; }
.sheet-actions { display: flex; gap: 10px; margin-top: 20px; }
.sheet-actions .btn { flex: 1; }
.screen { position: fixed; inset: 0; z-index: 55; background: var(--bg); display: flex; flex-direction: column; animation: fadeIn .15s ease; }
.screen-head { display: flex; align-items: center; gap: 8px; padding: calc(8px + var(--safe-top)) 12px 8px; border-bottom: 1px solid var(--line); }
.screen-head h2 { flex: 1; font-size: 17px; font-weight: 600; }
.screen-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
.screen-inner { max-width: 520px; margin: 0 auto; padding: 16px 20px calc(28px + var(--safe-bottom)); }
.screen-inner > * + * { margin-top: 16px; }
@keyframes slideUp { from { transform: translateY(32px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ---------- Log sheet (+) ---------- */
.log-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px 8px; }
.log-grid .action { background: transparent; padding: 6px 0 2px; }
.log-grid .action .ai-ico { width: 54px; height: 54px; border-radius: 18px; font-size: 21px; }

/* ---------- Add food screen ---------- */
.search-box { display: flex; align-items: center; gap: 10px; padding: 4px 4px 4px 16px; border-radius: 14px; background: var(--surface); border: 1px solid transparent; }
.search-box:focus-within { border-color: var(--line-strong); }
.search-box > i { color: var(--faint); }
.search-box input { flex: 1; min-width: 0; height: 44px; background: transparent; border: 0; color: var(--text); font-size: 16px; }
.search-box input:focus { outline: none; }
.search-box input::-webkit-search-cancel-button { display: none; }
.action-grid { display: flex; gap: 8px; overflow-x: auto; margin-left: -20px; margin-right: -20px; padding: 0 20px; scrollbar-width: none; }
.action-grid::-webkit-scrollbar { display: none; }
.quick { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: 999px; background: var(--surface); color: var(--text); font-size: 14px; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.quick:hover { background: var(--surface-2); }
.quick .qi { color: var(--muted); font-size: 13px; display: inline-flex; }
details.options { border-radius: 14px; background: var(--surface); }
details.options summary { list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; min-height: 46px; padding: 0 16px; font-size: 14px; color: var(--muted); }
details.options summary::-webkit-details-marker { display: none; }
details.options[open] summary i:last-child { transform: rotate(180deg); }
details.options .opts { padding: 0 16px 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
.list-label { font-size: 12px; font-weight: 500; color: var(--faint); text-transform: uppercase; letter-spacing: 0.06em; }
.result { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); cursor: pointer; }
.result.is-selected .result-name { color: var(--ai); }
.result-main { flex: 1; min-width: 0; }
.result-name { font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.result-meta { font-size: 13px; color: var(--faint); margin-top: 3px; display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; }
.result-kcal { text-align: right; flex-shrink: 0; }
.result-kcal b { font-size: 15px; font-weight: 500; display: block; font-variant-numeric: tabular-nums; }
.result-kcal span { font-size: 12px; color: var(--faint); }
.result-add { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--kcal); background: var(--brand-soft); flex-shrink: 0; font-size: 14px; }
.result-add:hover { background: rgba(44, 138, 91, 0.2); }
.state-msg { text-align: center; padding: 34px 12px; color: var(--muted); font-size: 14px; }
.state-msg i { font-size: 22px; color: var(--faint); display: block; margin-bottom: 10px; }
.multi-bar { position: sticky; bottom: calc(12px + var(--safe-bottom)); z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 8px 8px 8px 16px; border-radius: 14px; background: var(--text); color: var(--bg); font-weight: 600; }
.multi-bar .btn { background: var(--bg); color: var(--text); }

/* ---------- Review / entry sheets ---------- */
.review-head { display: flex; gap: 14px; align-items: flex-start; }
.review-img { width: 56px; height: 56px; border-radius: 12px; object-fit: contain; background: #fff; flex-shrink: 0; }
.review-name { font-size: 19px; font-weight: 600; line-height: 1.25; }
.amount-row { display: flex; gap: 8px; align-items: stretch; }
.amount-row .input { text-align: center; font-size: 19px; font-weight: 600; font-variant-numeric: tabular-nums; }
.amount-row .select { width: auto; max-width: 52%; font-size: 15px; }
.stepper { width: 46px; min-height: 46px; border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text); font-size: 18px; flex-shrink: 0; }
.nutri-summary { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.nutri { padding: 14px 4px; text-align: left; }
.nutri + .nutri { padding-left: 14px; border-left: 1px solid var(--line); }
.nutri b { display: block; font-size: 20px; font-weight: 600; line-height: 1.1; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.nutri span { font-size: 12px; color: var(--faint); }
.nutri.kcal b { font-size: 24px; color: var(--text); }
.note { display: flex; gap: 10px; padding: 12px 14px; border-radius: 12px; font-size: 13px; line-height: 1.45; background: rgba(224, 161, 43, 0.13); color: var(--note-fg); }
.note.ai { background: rgba(118, 86, 204, 0.1); color: var(--note-ai-fg); }
.note.info { background: var(--surface-2); color: var(--muted); }
.note i { margin-top: 2px; }
.ai-item { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--line); }
.ai-item input[type=checkbox] { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--ai); flex-shrink: 0; }
.detail-list { font-size: 14px; }
.detail-list .row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
.detail-list .row span:first-child { color: var(--muted); }

/* ---------- Scanner ---------- */
.scanner { position: fixed; inset: 0; z-index: 70; background: #000; color: #fff; overflow: hidden; }
.scanner video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.scan-mask { position: absolute; inset: 0; pointer-events: none; display: flex; align-items: center; justify-content: center; padding-bottom: 190px; }
.scan-window { position: relative; width: min(84vw, 420px); height: min(44vw, 220px); border-radius: 18px; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55); }
.scan-window .corner { position: absolute; width: 28px; height: 28px; border: 3px solid #fff; }
.corner.tl { top: -1px; left: -1px; border-right: 0; border-bottom: 0; border-top-left-radius: 18px; }
.corner.tr { top: -1px; right: -1px; border-left: 0; border-bottom: 0; border-top-right-radius: 18px; }
.corner.bl { bottom: -1px; left: -1px; border-right: 0; border-top: 0; border-bottom-left-radius: 18px; }
.corner.br { bottom: -1px; right: -1px; border-left: 0; border-top: 0; border-bottom-right-radius: 18px; }
.scan-window.is-found .corner { border-color: var(--brand); }
.scan-laser { position: absolute; left: 8%; right: 8%; top: 50%; height: 2px; background: rgba(255,255,255,.85); animation: laser 2.2s ease-in-out infinite; }
.scan-window.is-paused .scan-laser { display: none; }
@keyframes laser { 0%, 100% { transform: translateY(-70px); opacity: .35; } 50% { transform: translateY(70px); opacity: .9; } }
.scan-tools { display: flex; gap: 8px; justify-content: flex-end; }
.scan-btn#scanner-zoom { font-size: 14px; font-weight: 600; }
.scan-top { position: absolute; top: 0; left: 0; right: 0; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px;
    padding: calc(12px + var(--safe-top)) 14px 12px; background: linear-gradient(to bottom, rgba(0,0,0,.6), transparent); }
.scan-top h2 { font-size: 17px; font-weight: 600; }
.scan-btn { width: 44px; height: 44px; border-radius: 22px; display: grid; place-items: center; background: rgba(255,255,255,.14); color: #fff; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font-size: 16px; }
.scan-btn.on { background: #fff; color: #000; }
.scan-panel { position: absolute; left: 0; right: 0; bottom: 0; padding: 20px 20px calc(20px + var(--safe-bottom)); background: var(--surface); border-radius: 20px 20px 0 0; color: var(--text); }
.scan-panel .inner { max-width: 480px; margin: 0 auto; }
.scan-status { font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 10px; min-height: 26px; }
.scan-status .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--faint); flex-shrink: 0; }
.scan-status.live .dot { background: var(--brand); animation: pulse 1.4s ease-in-out infinite; }
.scan-status.error .dot { background: var(--danger); }
.scan-status.busy .dot { background: var(--warn); }
@keyframes pulse { 50% { opacity: .35; } }
.scan-hint { font-size: 14px; color: var(--muted); margin-top: 6px; }
.scan-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.batch-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; background: var(--surface-2); }
.batch-card .bc-main { flex: 1; min-width: 0; }
.batch-card .bc-name { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.batch-card .bc-meta { font-size: 13px; color: var(--muted); }
.batch-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 10px; }
.label-steps { display: grid; gap: 8px; }
.label-step { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); font-size: 14px; }
.label-step .ls-text { flex: 1; }
.label-step .ls-done { color: var(--brand); }
.label-step img { width: 40px; height: 40px; object-fit: cover; border-radius: 8px; }
.label-step .btn { background: var(--surface-3); }
.over-scanner { z-index: 75 !important; }
.batch-toggle { margin-top: 14px; font-size: 14px; color: var(--muted); }

/* ---------- Toasts ---------- */
#toast-container { position: fixed; left: 16px; right: 16px; top: calc(76px + var(--safe-top)); z-index: 90; display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
.toast { pointer-events: auto; width: 100%; max-width: 420px; display: flex; align-items: flex-start; gap: 10px; padding: 12px 10px 12px 14px; border-radius: 14px;
    background: #2a2622; color: #f4f1ea; font-size: 14px; font-weight: 500; box-shadow: 0 12px 32px -8px rgba(0,0,0,.45); animation: fadeIn .2s ease; white-space: pre-line; }
.toast.error { background: #3d1f1d; color: #f8cfc9; }
.toast > i { margin-top: 2px; color: var(--brand); }
.toast.error > i { color: var(--danger); }
.toast .toast-message { flex: 1; }
.toast button { color: var(--muted); width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; }

/* ---------- Insights / progress ---------- */
.stat-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tile { background: var(--surface); border-radius: var(--radius); padding: 16px; }
.tile.streak { background: var(--surface); }
.tile.today { background: var(--surface); }
.tile .k { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
.tile .k i { color: var(--faint) !important; }
.tile .v { font-size: 28px; font-weight: 600; margin-top: 8px; line-height: 1.05; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }
.tile .v small { font-size: 14px; color: var(--muted); font-weight: 500; letter-spacing: 0; }
.tile .s { font-size: 13px; color: var(--faint); margin-top: 6px; }
.chart-box { position: relative; height: 200px; }
.chart { position: relative; width: 100%; }
.chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart text { font-family: var(--font); font-size: 10.5px; fill: var(--faint); font-variant-numeric: tabular-nums; }
.chart .grid { stroke: var(--chart-grid); stroke-width: 1; }
.chart .goal { stroke: var(--muted); stroke-width: 1.25; stroke-dasharray: 4 4; }
.chart .goal-label { fill: var(--muted); font-weight: 600; }
.chart .bar-hit { fill: transparent; cursor: pointer; }
.chart .sel-label { fill: var(--text); font-weight: 700; font-size: 11.5px; }
.chart-empty { display: grid; place-items: center; gap: 10px; text-align: center; min-height: 150px; color: var(--muted); font-size: 13.5px; padding: 12px; }
.chart-empty i { font-size: 22px; color: var(--faint); }
.chart-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; font-size: 12.5px; color: var(--muted); }
.chart-legend span { display: inline-flex; align-items: center; gap: 6px; }
.chart-legend i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
.chart-kpis { display: flex; gap: 18px; margin-bottom: 12px; }
.chart-kpis div { display: flex; flex-direction: column; }
.chart-kpis b { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; line-height: 1.1; }
.chart-kpis b small { font-size: 12px; color: var(--muted); font-weight: 500; letter-spacing: 0; margin-left: 2px; }
.chart-kpis span { font-size: 12px; color: var(--faint); }
.split-row { display: grid; grid-template-columns: 58px 1fr; align-items: center; gap: 10px; font-size: 12.5px; color: var(--muted); }
.split-row + .split-row { margin-top: 8px; }
.split-bar { display: flex; height: 22px; border-radius: 8px; overflow: hidden; gap: 2px; background: var(--surface-2); }
.split-bar > div { display: grid; place-items: center; font-size: 11px; font-weight: 700; color: rgba(0,0,0,.75); min-width: 0; overflow: hidden; }
.chart-box canvas { width: 100%; height: 100%; display: block; }
.legend { display: grid; gap: 12px; }
.legend-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--muted); }
.legend-row b { color: var(--text); font-size: 16px; font-weight: 600; margin-left: auto; font-variant-numeric: tabular-nums; }
.legend-row .sw { width: 8px; height: 8px; border-radius: 2px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th { text-align: left; font-size: 12px; font-weight: 500; color: var(--faint); text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 4px; border-bottom: 1px solid var(--line); }
.table td { padding: 11px 4px; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
.table tr:last-child td { border-bottom: 0; }
.heat { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; }
.heat > div { aspect-ratio: 1; border-radius: 8px; display: grid; place-items: center; font-size: 12px; font-variant-numeric: tabular-nums; background: var(--surface-2); color: var(--faint); }
.heat .h1 { background: rgba(44, 138, 91, 0.14); color: var(--kcal); }
.heat .h2 { background: rgba(44, 138, 91, 0.32); color: var(--text); }
.heat .h3 { background: var(--kcal); color: var(--on-brand); font-weight: 700; }
.heat .h4 { background: rgba(224, 161, 43, 0.34); color: var(--text); }
.rating-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.rating { display: flex; flex-direction: column; align-items: center; gap: 6px; min-height: 72px; justify-content: center; border-radius: 12px; background: var(--surface-2); border: 1px solid transparent; font-size: 14px; color: var(--muted); }
.rating i { font-size: 16px; }
.rating.is-active { border-color: var(--muted); color: var(--text); background: var(--surface-3); }
.log-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.fast-wrap { display: flex; align-items: center; gap: 20px; }
.fast-ring { position: relative; width: 104px; height: 104px; flex-shrink: 0; }
.fast-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.fast-ring circle { fill: none; stroke-width: 6; }
.fast-ring .center { position: absolute; inset: 0; display: grid; place-items: center; font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }

.settings-section { background: var(--surface); border-radius: var(--radius); padding: 18px; }
.settings-section > * + * { margin-top: 14px; }
.settings-section h3 { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
.settings-section h3 i { color: var(--faint); width: 16px; text-align: center; font-size: 14px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.status-pill { font-size: 12px; font-weight: 500; padding: 3px 9px; border-radius: 6px; }
.status-pill.on { background: var(--brand-soft); color: var(--brand); }
.status-pill.off { background: var(--surface-3); color: var(--muted); }

.confetti-particle { position: fixed; z-index: 9999; pointer-events: none; }
@keyframes confetti-fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(720deg); opacity: 0; } }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 380px) {
    .app-shell { padding-left: 16px; padding-right: 16px; }
    .topbar { margin: 0 -16px; padding-left: 16px; padding-right: 16px; }
    .rings { width: 136px; height: 136px; }
    .hero-kcal { font-size: 29px; }
    .hm .v { font-size: 14px; }
    .actions { gap: 8px; }
    .hero-eq b { font-size: 15px; }
}
/* Small phones: rings above the numbers so nothing is clipped. */
@media (max-width: 360px) {
    .hero-main { flex-direction: column; align-items: stretch; gap: 14px; }
    .rings { width: 150px; height: 150px; align-self: center; }
    .hero-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 8px; }
    .hero-stats > div:first-child { grid-column: 1 / -1; text-align: center; }
    .hm { grid-template-columns: 1fr; }
    .hm .v { text-align: left; }
    .action { font-size: 11.5px; }
}
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
@media print {
    body { background: #fff !important; color: #000 !important; }
    .topbar-actions, .week, .bottom-nav, #toast-container, .actions, #quick-log-section, .meal-plus, .suggest, .overlay, .screen, .scanner { display: none !important; }
    .hero, .meal { background: #fff !important; border: 1px solid #bbb !important; }
    .card, .tile { background: #fff !important; border: 1px solid #bbb !important; color: #000 !important; }
    .muted, .faint, .entry-meta { color: #333 !important; }
    #micros-panel-content, .meal-content { display: block !important; }
}

.repeat-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 12px; border-radius: 16px; background: var(--surface-2); }
.repeat-row .rr-main { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: 14.5px; }
.repeat-row .rr-main span { font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.repeat-row .rr-kcal { font-size: 13px; font-weight: 650; color: var(--kcal); font-variant-numeric: tabular-nums; white-space: nowrap; }
.setup-card { background: var(--surface); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); }
.setup-card h3 { font-family: var(--serif); font-size: 19px; font-weight: 600; letter-spacing: -0.01em; }
.welcome-result { border-radius: 16px; background: var(--surface-2); padding: 14px 16px; }
.welcome-result .big { font-family: var(--serif); font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; }
.welcome-result .macros { display: flex; gap: 14px; margin-top: 6px; font-size: 13.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.welcome-result .macros b { color: var(--text); font-weight: 650; }

/* ---------- Theme: iPhone-native (follows light / dark) ---------- */
body { font-size: 16px; letter-spacing: -0.01em; }
.page-title { font-family: var(--font); font-size: 34px; font-weight: 700; letter-spacing: -0.02em; }
.page-sub { font-size: 15px; }
.hero-kcal, .tile .v, .chart-kpis b, .nutri.kcal b, .welcome-result .big { font-family: var(--serif); font-weight: 700; letter-spacing: -0.02em; }
.hero-kcal { font-size: 40px; color: var(--text); }
.sheet-head h3, .setup-card h3 { font-family: var(--font); font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
.meal-head h3, .card-title { font-weight: 600; letter-spacing: -0.02em; }
.card, .tile, .meal, .hero, .settings-section, .setup-card { background: var(--surface); border-radius: var(--radius); box-shadow: none; }
.ql-item, .action { box-shadow: none; }

/* Rings: thick, like Activity */
.rings circle { stroke-width: 16; }
.rings .ring-track { opacity: 0.18; }
.hm .left { display: none; }
.hero-stats { gap: 7px; }
.kcal-label { text-transform: none; letter-spacing: 0; font-size: 13px; font-weight: 600; color: var(--muted); }
.hm .k { text-transform: none; letter-spacing: 0; font-size: 14px; font-weight: 600; }
.hm.protein .k { color: var(--protein); }
.hm.carbs .k { color: var(--carbs); }
.hm.fat .k { color: var(--fat); }
.hm .v { font-size: 16px; font-weight: 600; }
#eq-left b, .hero-eq #eq-left b { color: var(--kcal); }
#eq-left.over b, .hero-eq #eq-left.over b { color: var(--protein); }

/* Week strip: calendar style */
.week { border-bottom: 0; }
.day .dnum { width: 36px; height: 36px; }
.day.is-selected .dnum { background: var(--kcal); color: #fff; }
.week .day .dow { font-weight: 600; font-size: 11px; }

/* Segmented control */
.seg { background: var(--fill); border-radius: 9px; padding: 2px; gap: 0; }
.seg button { min-height: 32px; border-radius: 7px; font-size: 13.5px; font-weight: 600; color: var(--text); }
.seg button.is-active { background: var(--seg-thumb); color: var(--text); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12), 0 3px 1px rgba(0, 0, 0, 0.04); }

/* Buttons and fields: large, thumb-friendly */
.btn { min-height: 50px; border-radius: 12px; font-size: 17px; font-weight: 600; }
.btn-sm { min-height: 40px; font-size: 15px; border-radius: 10px; }
.btn-primary { background: var(--kcal); color: #fff; box-shadow: none; }
.btn-soft { background: var(--fill); color: var(--text); }
.btn-ghost { background: transparent; border-color: transparent; color: var(--kcal); }
.btn-ghost:hover:not(:disabled) { background: var(--fill); color: var(--kcal); }
.chip { background: var(--fill); }
.input, .select, .textarea { background: var(--fill); border-color: transparent; border-radius: 10px; font-size: 17px; }
.input:focus, .select:focus, .textarea:focus { border-color: var(--kcal); background: var(--surface); }
.icon-btn { width: 44px; height: 44px; }
.meal-plus { width: 40px; height: 40px; font-size: 16px; }
.meal-save { width: 40px; height: 40px; }

/* Today: search bar instead of tiles; recent foods as compact chips */
.today-search { display: flex; gap: 10px; }
.hs-banner { display: flex; align-items: center; background: var(--surface); border-radius: var(--radius); margin-bottom: 12px; }
.hs-banner-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 12px 14px; text-align: left; min-height: 60px; }
.hs-banner-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hs-banner-text b { font-size: 16px; font-weight: 600; }
.hs-banner-x { width: 44px; height: 44px; display: grid; place-items: center; color: var(--faint); }
.hs-types { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0 4px; }
.hs-types span { display: grid; grid-template-columns: 18px 1fr; column-gap: 6px; align-items: center; padding: 8px 10px; border-radius: 10px; background: var(--fill); color: var(--text); font-size: 13px; font-weight: 600; }
.hs-types em { grid-column: 2; font-style: normal; font-weight: 400; color: var(--muted); font-size: 12px; }
.hs-text { margin-top: 8px; padding: 10px 12px; border-radius: 12px; background: var(--fill); display: grid; gap: 4px; font-size: 13px; }
.hs-word { color: var(--text); font-family: var(--mono); }
.hs-word + .hs-word, div + .hs-word { margin-top: 4px; }
.hs-chip { display: inline-block; padding: 2px 8px; border-radius: 6px; color: #fff; font-weight: 600; font-size: 12px; }
.hs-chip.c1 { background: var(--kcal); } .hs-chip.c2 { background: var(--fat); } .hs-chip.c3 { background: var(--carbs); } .hs-chip.c4 { background: var(--ai, #af52de); }
.today-search .log-search { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px; border-radius: 12px; background: var(--fill); color: var(--muted); font-size: 17px; text-align: left; }
.today-search .log-search i { color: var(--muted); font-size: 15px; }
.today-search .log-scan { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--fill); color: var(--kcal); font-size: 18px; }
.ql-head { margin-bottom: 8px; padding: 0 4px; }
.ql-head h2 { font-size: 13px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.02em; color: var(--muted); }
.ql-meal { background: transparent; padding: 0; font-size: 15px; color: var(--kcal); }
.ql-meal b { color: var(--kcal); font-weight: 600; }
.ql-list { gap: 8px; }
.ql-item { flex: 0 0 auto; min-height: 0; flex-direction: row; align-items: center; gap: 8px; padding: 6px 6px 6px 8px; border-radius: 999px; background: var(--surface); max-width: 260px; }
.ql-item .food-ico { width: 30px; height: 30px; border-radius: 50%; font-size: 12px; }
.ql-item .ql-name { font-size: 15px; font-weight: 500; -webkit-line-clamp: 1; white-space: nowrap; display: block; text-overflow: ellipsis; max-width: 150px; }
.ql-item .ql-kcal { margin-top: 0; padding-right: 0; font-size: 13px; white-space: nowrap; }
.ql-add { position: static; width: 32px; height: 32px; box-shadow: none; flex-shrink: 0; color: #fff; }

/* Meals: inset grouped lists */
.meal { padding: 4px 16px 4px; }
.meal + .meal { margin-top: 14px; }
.meal-head { padding: 10px 0; }
.meal-macros { display: none !important; }
.entry { padding: 11px 0; border-top: 0.5px solid var(--line); }
.entry-name { font-size: 16px; font-weight: 400; }
.entry-kcal { font-weight: 500; color: var(--muted); }
.entry-kcal small { color: var(--faint); }
.suggest { border-top: 0.5px solid var(--line); color: var(--kcal); font-size: 15px; }
.suggest b { color: var(--text); font-weight: 500; }
.suggest > i { color: var(--kcal); }
.disclosure { border-color: var(--line); }

/* Bottom tab bar */
.bottom-nav { background: var(--bar-bg); border-top: 0.5px solid var(--line-strong); }
.nav-btn { font-size: 10.5px; color: #8e8e93; }
.nav-btn i { font-size: 21px; }
.nav-btn.is-active, .nav-btn.is-active i { color: var(--kcal); }
.nav-plus { width: 50px; height: 50px; margin-top: 0; font-size: 21px; color: #fff; background: var(--kcal); box-shadow: none; }

/* Sheets, toasts */
.sheet { border-radius: 14px 14px 0 0; }
.grabber { width: 36px; height: 5px; background: var(--line-strong); }
#toast-container .toast { background: var(--toast-bg); color: var(--toast-fg); border-radius: 16px; box-shadow: 0 10px 30px -6px rgba(0, 0, 0, 0.25); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
#toast-container .toast.error { color: var(--danger); }

/* App-style icons: solid colour squircles with a white glyph */
.meal-ico, .action .ai-ico { color: #fff; border-radius: 9px; }
.meal-ico { width: 32px; height: 32px; font-size: 15px; }
.mi-breakfast, .ico-quick { background: var(--fat); }
.mi-lunch, .ico-search { background: var(--kcal); }
.mi-dinner { background: var(--ai-2); }
.mi-snacks, .ico-describe { background: var(--pink); }
.mi-exercise, .ico-exercise { background: var(--burn-2); }
.mi-water, .ico-water { background: var(--water); }
.ico-scan { background: var(--carbs); }
.ico-photo { background: var(--ai); }
.ico-weight { background: #8e8e93; }
.log-grid .action .ai-ico { border-radius: 14px; }

/* Food icons: tinted circles */
.food-ico { border-radius: 50%; }
.fi-fruit { background: rgba(255, 45, 85, 0.13); color: var(--protein); }
.fi-veg { background: rgba(52, 199, 89, 0.15); color: var(--kcal); }
.fi-dairy { background: rgba(50, 173, 230, 0.15); color: var(--water); }
.fi-egg { background: rgba(255, 204, 0, 0.2); color: var(--fat); }
.fi-grain { background: rgba(255, 149, 0, 0.15); color: var(--fat); }
.fi-meat { background: rgba(255, 59, 48, 0.13); color: var(--burn-2); }
.fi-fish { background: rgba(0, 122, 255, 0.13); color: var(--carbs); }
.fi-nuts { background: rgba(162, 132, 94, 0.18); color: var(--nut); }
.fi-fat { background: rgba(255, 149, 0, 0.13); color: var(--fat); }
.fi-sweet { background: rgba(255, 45, 85, 0.12); color: var(--pink); }
.fi-drink { background: rgba(50, 173, 230, 0.15); color: var(--water); }
.fi-pack { background: var(--fill); color: var(--muted); }
.fi-ai { background: rgba(175, 82, 222, 0.14); color: var(--ai); }
.fi-quick { background: rgba(255, 149, 0, 0.15); color: var(--fat); }
.fi-mine { background: rgba(52, 199, 89, 0.15); color: var(--kcal); }
.fi-meal { background: rgba(88, 86, 214, 0.15); color: var(--ai-2); }
"######
}

pub fn render_header() -> &'static str {
    r######"<div class="app-shell">

    <!-- HEADER -->
    <header class="topbar">
        <div class="topbar-row">
            <button class="title-btn" onclick="jumpToToday()" aria-label="Go to today">
                <h1 class="page-title" id="header-title">Today</h1>
                <p class="page-sub" id="header-eyebrow">Sunday, October 11</p>
            </button>
            <div class="topbar-actions" id="topbar-actions">
                <button class="icon-btn" onclick="copyDayLog()" aria-label="Copy day summary" title="Copy day summary"><i class="fa-regular fa-copy"></i></button>
            </div>
        </div>
        <div class="week" id="date-bar" role="group" aria-label="Choose day">
            <button class="week-nav" onclick="shiftWeek(-1)" aria-label="Previous week"><i class="fa-solid fa-chevron-left"></i></button>
            <div id="week-days" class="contents"></div>
            <button class="week-nav" onclick="shiftWeek(1)" aria-label="Next week"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
    </header>

    <main class="pt-5">"######
}

pub fn render_meal_card(key: &str, label: &str) -> String {
    let icon = match key {
        "breakfast" => "fa-mug-hot",
        "lunch" => "fa-bowl-food",
        "dinner" => "fa-utensils",
        _ => "fa-cookie-bite",
    };
    format!(
        r##"                <section class="meal" id="meal-{key}">
                    <div class="meal-head">
                        <span class="meal-ico mi-{key}"><i class="fa-solid {icon}"></i></span>
                        <div class="meal-title"><h3>{label}</h3><span class="meal-kcal" id="badge-{key}-cal"></span></div>
                        <span id="badge-{key}-protein" class="hidden"></span>
                        <button class="meal-save hidden" id="meal-save-{key}" onclick="openSaveMealModal('{key}')" title="Save as a meal" aria-label="Save {label} as a meal"><i class="fa-regular fa-bookmark"></i></button>
                        <button class="meal-plus" onclick="openFoodSearchModal('{key}')" aria-label="Add food to {label}"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <div class="meal-macros hidden" id="meal-macros-{key}" aria-hidden="true"></div>
                    <div id="meal-content-{key}" class="meal-content"><div id="logged-list-{key}"></div><div id="suggestion-slot-{key}"></div></div>
                </section>"##,
        key = key,
        label = label,
        icon = icon
    )
}

pub fn render_today_tab() -> String {
    let mut out = String::with_capacity(16384);
    out.push_str(r######"        <!-- ===================== TODAY ===================== -->
        <section id="tab-content-nutrition" class="tab-panel">

            <section class="setup-card hidden" id="setup-card" aria-label="Set up your targets">
                <div class="flex items-start gap-3">
                    <span class="meal-ico mi-lunch"><i class="fa-solid fa-bullseye"></i></span>
                    <div class="flex-1 min-w-0">
                        <h3>Set your daily targets</h3>
                        <p class="small muted">Answer a few questions and MacroFlow works out your calories, protein, carbs and fat.</p>
                    </div>
                    <button class="icon-btn" onclick="dismissSetupCard()" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <button class="btn btn-primary btn-block mt-3" onclick="openWelcome()">Set up in 30 seconds</button>
            </section>

            <section class="hero" aria-label="Calories and macros">
                <div class="hero-main">
                    <div class="rings" id="hero-rings" role="img" aria-label="Calories and macros">
                        <svg viewBox="0 0 200 200" aria-hidden="true">
                            <defs>
                                <linearGradient id="grad-kcal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--kcal)"/><stop offset="1" style="stop-color:var(--kcal-2)"/></linearGradient>
                                <linearGradient id="grad-protein" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--protein)"/><stop offset="1" style="stop-color:var(--protein-2)"/></linearGradient>
                                <linearGradient id="grad-carbs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--carbs)"/><stop offset="1" style="stop-color:var(--carbs-2)"/></linearGradient>
                                <linearGradient id="grad-fat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--fat)"/><stop offset="1" style="stop-color:var(--fat-2)"/></linearGradient>
                            </defs>
                            <circle class="ring-track" cx="100" cy="100" r="87" style="stroke:var(--kcal)" stroke-width="18"/>
                            <circle class="ring-arc" id="ring-kcal" cx="100" cy="100" r="87" stroke="url(#grad-kcal)" stroke-width="18" style="stroke-dasharray:546.64 546.64;stroke-dashoffset:546.64;opacity:0"/>
                            <circle class="ring-lap" id="ring-kcal-lap" style="stroke-dasharray:546.64 546.64;stroke-dashoffset:546.64;opacity:0" cx="100" cy="100" r="87" stroke="var(--kcal-2)" stroke-width="18"/>
                            <circle class="ring-track" cx="100" cy="100" r="65" style="stroke:var(--protein)" stroke-width="18"/>
                            <circle class="ring-arc" id="ring-protein" cx="100" cy="100" r="65" stroke="url(#grad-protein)" stroke-width="18" style="stroke-dasharray:408.41 408.41;stroke-dashoffset:408.41;opacity:0"/>
                            <circle class="ring-lap" id="ring-protein-lap" style="stroke-dasharray:408.41 408.41;stroke-dashoffset:408.41;opacity:0" cx="100" cy="100" r="65" stroke="var(--protein-2)" stroke-width="18"/>
                            <circle class="ring-track" cx="100" cy="100" r="43" style="stroke:var(--carbs)" stroke-width="18"/>
                            <circle class="ring-arc" id="ring-carbs" cx="100" cy="100" r="43" stroke="url(#grad-carbs)" stroke-width="18" style="stroke-dasharray:270.18 270.18;stroke-dashoffset:270.18;opacity:0"/>
                            <circle class="ring-lap" id="ring-carbs-lap" style="stroke-dasharray:270.18 270.18;stroke-dashoffset:270.18;opacity:0" cx="100" cy="100" r="43" stroke="var(--carbs-2)" stroke-width="18"/>
                            <circle class="ring-track" cx="100" cy="100" r="21" style="stroke:var(--fat)" stroke-width="18"/>
                            <circle class="ring-arc" id="ring-fat" cx="100" cy="100" r="21" stroke="url(#grad-fat)" stroke-width="18" style="stroke-dasharray:131.95 131.95;stroke-dashoffset:131.95;opacity:0"/>
                            <circle class="ring-lap" id="ring-fat-lap" style="stroke-dasharray:131.95 131.95;stroke-dashoffset:131.95;opacity:0" cx="100" cy="100" r="21" stroke="var(--fat-2)" stroke-width="18"/>
                        </svg>
                    </div>
                    <div class="hero-stats">
                        <div>
                            <button class="kcal-label" onclick="toggleCalorieDisplayMode()" aria-label="Switch between calories eaten and remaining">
                                <span id="calorie-state-subtitle">Eaten</span><i class="fa-solid fa-arrow-right-arrow-left"></i>
                            </button>
                            <p class="hero-kcal" id="calorie-big-number">0</p>
                            <p class="hero-of" id="calorie-big-unit">of 2,000 kcal</p>
                        </div>
                        <div class="hm protein"><span class="k">Protein</span><span class="v"><span id="protein-logged">0</span><small> / <span id="protein-target-display">150</span> g</small></span><span class="left" id="protein-left">150 g left</span></div>
                        <div class="hm carbs"><span class="k">Carbs</span><span class="v"><span id="carbs-logged">0</span><small> / <span id="carbs-target-display">200</span> g</small></span><span class="left" id="carbs-left">200 g left</span></div>
                        <div class="hm fat"><span class="k">Fat</span><span class="v"><span id="fats-logged">0</span><small> / <span id="fats-target-display">65</span> g</small></span><span class="left" id="fats-left">65 g left</span></div>
                    </div>
                </div>
                <div class="hero-eq">
                    <div><span>Goal</span><b id="calorie-target-display">2,000</b></div>
                    <span class="op" aria-hidden="true">−</span>
                    <div id="eq-eaten"><span>Food</span><b id="calorie-eaten-display">0</b></div>
                    <span class="op hidden" id="eq-exercise-op" aria-hidden="true">+</span>
                    <div id="eq-exercise" class="hidden"><span>Exercise</span><b id="calorie-exercise-display">0</b></div>
                    <span class="op" aria-hidden="true">=</span>
                    <div id="eq-left"><span id="calorie-left-label">Left</span><b id="calorie-left-display">2,000</b></div>
                </div>
            </section>

            <div class="hs-banner hidden" id="health-sync-banner" role="group" aria-label="Apple Health">
                <button class="hs-banner-main" id="health-sync-banner-btn" onclick="onHealthBannerTap()">
                    <span class="meal-ico mi-snacks"><i class="fa-solid fa-heart"></i></span>
                    <span class="hs-banner-text"><b id="health-sync-banner-title">Sync Apple Health</b><span id="health-sync-banner-sub" class="small muted"></span></span>
                    <i class="fa-solid fa-chevron-right faint"></i>
                </button>
                <button class="hs-banner-x hidden" id="health-sync-banner-x" onclick="dismissHealthBanner()" aria-label="Hide"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div class="today-search">
                <button class="log-search" onclick="openFoodSearchModal(guessMealForNow())"><i class="fa-solid fa-magnifying-glass"></i>Search food</button>
                <button class="log-scan" onclick="openScannerModal(guessMealForNow())" aria-label="Scan a barcode"><i class="fa-solid fa-barcode"></i></button>
            </div>

            <section id="quick-log-section" class="hidden" aria-label="Quick log">
                <div class="ql-head">
                    <h2>Recent</h2>
                    <button class="ql-meal" onclick="cycleQuickLogMeal()" aria-label="Choose the meal quick log adds to">to <b id="quick-log-meal">Lunch</b><i class="fa-solid fa-chevron-down" style="font-size:10px"></i></button>
                </div>
                <div class="ql-list" id="quick-log-list"></div>
            </section>
"######);
    out.push_str("\n            <div id=\"meal-cards\">\n");
    for (key, label) in MEAL_SLOTS {
        out.push_str(&render_meal_card(key, label));
        out.push('\n');
    }
    out.push_str("            </div>\n");
    out.push_str(r######"            <button id="copy-prev-day" class="copy-day hidden" onclick="copyYesterdayMeals()"><i class="fa-solid fa-clone"></i><span>Copy meals from the previous day</span></button>

            <section class="meal" id="exercise-section">
                <div class="meal-head">
                    <span class="meal-ico mi-exercise"><i class="fa-solid fa-fire"></i></span>
                    <div class="meal-title"><h3>Exercise</h3><span class="meal-kcal" id="exercise-kcal"></span></div>
                    <button class="meal-plus" onclick="openExerciseModal()" aria-label="Log exercise"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div id="exercise-list"></div>
                <p id="steps-line" class="small faint hidden"></p>
                <div id="health-sync-row" class="sync-row">
                    <button class="chip" onclick="syncFromAppleHealth()"><i class="fa-brands fa-apple"></i>Sync Apple Health</button>
                    <button class="chip" onclick="openHealthSync('guide')"><i class="fa-regular fa-circle-question"></i>How to set up</button>
                    <span class="small faint" id="health-sync-status"></span>
                </div>
                <p id="exercise-goal-note" class="small faint hidden">Not added to your calorie goal — you can change this in Settings.</p>
            </section>

            <section class="meal" id="water-section">
                <div class="meal-head">
                    <span class="meal-ico mi-water"><i class="fa-solid fa-droplet"></i></span>
                    <div class="meal-title"><h3>Water</h3><span class="meal-kcal" id="water-amount">0 of 2.5 L</span></div>
                </div>
                <div class="water-row">
                    <div class="water-glasses" id="water-glasses" aria-hidden="true"></div>
                    <div id="water-bar" class="hidden"></div>
                </div>
                <div class="water-row" style="justify-content:flex-end">
                    <button class="chip" id="water-minus" onclick="addWater(-0.25)" aria-label="Remove 250 ml">−</button>
                    <button class="chip" onclick="addWater(0.25)">+250 ml</button>
                    <button class="chip" onclick="addWater(0.5)">+500 ml</button>
                </div>
            </section>

            <div>
                <button id="micros-toggle" class="disclosure" onclick="toggleMicrosPanel()" aria-expanded="false" aria-controls="micros-panel-content">
                    <span>Vitamins &amp; minerals</span><i id="micros-panel-chevron" class="fa-solid fa-chevron-down"></i>
                </button>
                <div id="micros-panel-content" class="hidden"></div>
                <p class="hidden" id="meals-summary"></p>
            </div>
        </section>
"######);
    out
}

pub fn render_insights_tab() -> &'static str {
    r######"        <!-- ===================== INSIGHTS ===================== -->
        <section id="tab-content-dashboard" class="tab-panel hidden">
            <div class="seg" role="group" aria-label="Insights range">
                <button onclick="setInsightsRange(7)" id="insights-range-7" class="is-active">7 days</button>
                <button onclick="setInsightsRange(14)" id="insights-range-14">14 days</button>
                <button onclick="setInsightsRange(30)" id="insights-range-30">30 days</button>
            </div>

            <div class="stat-tiles">
                <div class="tile streak">
                    <div class="k"><i class="fa-solid fa-fire" style="color:var(--burn)"></i>Logging streak</div>
                    <div class="v"><span id="streak-count">0</span> <small id="streak-unit">days</small></div>
                    <div class="s">Best: <span id="streak-best">0</span><span id="streak-best-unit"> days</span></div>
                </div>
                <div class="tile today">
                    <div class="k"><i class="fa-solid fa-utensils" style="color:var(--kcal)"></i><span id="dash-day-label">Eaten today</span></div>
                    <div class="v"><span id="dash-cal">0</span> <small>kcal</small></div>
                    <div class="s"><span id="dash-protein">0</span>g protein · <span id="dash-remaining">0</span> kcal left</div>
                </div>
            </div>

            <div class="card">
                <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-fire-flame-curved" style="color:var(--kcal)"></i>Calories</h3><span class="small muted" id="ins-cal-range">last 7 days</span></div>
                <div class="chart-kpis" id="ins-cal-kpis"></div>
                <div class="chart" id="ins-cal-chart"></div>
                <div class="chart-legend"><span><i style="background:var(--protein)"></i>Protein</span><span><i style="background:var(--carbs)"></i>Carbs</span><span><i style="background:var(--fat)"></i>Fat</span><span><i style="background:transparent;border:1.5px dashed var(--muted);width:12px;height:0;border-radius:0"></i>Goal</span></div>
            </div>

            <div class="card">
                <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-scale-balanced" style="color:var(--burn)"></i>Eaten vs burned</h3><span class="small muted">finished days</span></div>
                <div class="chart-kpis" id="ins-bal-kpis"></div>
                <div class="chart" id="ins-bal-chart"></div>
                <div class="chart-legend" id="ins-bal-legend"><span><i style="background:var(--kcal)"></i>Eaten</span><span><i style="background:var(--burn)"></i>Burned</span></div>
            </div>

            <div class="card">
                <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-dumbbell" style="color:var(--protein)"></i>Protein</h3><span class="small muted" id="ins-protein-target">target 150 g</span></div>
                <div class="chart-kpis" id="ins-protein-kpis"></div>
                <div class="chart" id="ins-protein-chart"></div>
            </div>

            <div class="card">
                <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-chart-pie" style="color:var(--carbs-2)"></i>Macro split</h3><span class="small muted" id="ins-split-range">average, last 7 days</span></div>
                <div class="flex items-center gap-5">
                    <div class="shrink-0" id="ins-split-donut" style="width:112px;height:112px"></div>
                    <div class="legend flex-1">
                        <div class="legend-row"><span class="sw" style="background:var(--protein)"></span>Protein<b><span id="pie-protein-pct">0</span>%</b></div>
                        <div class="legend-row"><span class="sw" style="background:var(--carbs)"></span>Carbs<b><span id="pie-carbs-pct">0</span>%</b></div>
                        <div class="legend-row"><span class="sw" style="background:var(--fat)"></span>Fat<b><span id="pie-fats-pct">0</span>%</b></div>
                    </div>
                </div>
                <div class="mt-4" id="ins-split-bars"></div>
            </div>

            <div class="card hidden" id="ins-steps-card">
                <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-shoe-prints" style="color:var(--water)"></i>Steps</h3><span class="small muted" id="ins-steps-avg"></span></div>
                <div class="chart" id="ins-steps-chart"></div>
            </div>

            <div class="card">
                <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-calendar-week" style="color:var(--ai)"></i>Last 7 days</h3><span class="small muted">summary</span></div>
                <div class="detail-list" id="weekly-report"></div>
            </div>

            <div class="card">
                <div class="card-head">
                    <h3 class="card-title"><i class="fa-solid fa-hourglass-half" style="color:var(--ai)"></i>Fasting</h3>
                    <select id="fasting-target-select" onchange="changeFastingProtocol(this.value)" class="select" style="width:auto;min-height:38px;font-size:14px" aria-label="Fasting protocol">
                        <option value="16">16:8</option>
                        <option value="18">18:6</option>
                        <option value="20">20:4</option>
                        <option value="24">24 h</option>
                    </select>
                </div>
                <div class="fast-wrap">
                    <div class="fast-ring">
                        <svg viewBox="0 0 80 80" aria-hidden="true">
                            <defs><linearGradient id="grad-fast" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--ai)"/><stop offset="1" style="stop-color:var(--ai-2)"/></linearGradient></defs>
                            <circle cx="40" cy="40" r="34" stroke="var(--surface-3)"/>
                            <circle id="fasting-progress-ring" cx="40" cy="40" r="34" stroke="url(#grad-fast)" stroke-dasharray="213.6" stroke-dashoffset="213.6" stroke-linecap="round" style="transition:stroke-dashoffset .5s"/>
                        </svg>
                        <div class="center"><span id="fasting-percent-display">0%</span></div>
                    </div>
                    <div class="flex-1 min-w-0 space-y-2">
                        <div><p class="small muted">Status</p><p id="fasting-status-text" class="font-outfit text-lg font-bold">Eating window</p></div>
                        <div><p class="small muted">Elapsed</p><p id="fasting-time-display" class="font-outfit text-lg font-bold num">00h 00m 00s</p></div>
                    </div>
                </div>
                <button id="fasting-toggle-btn" onclick="toggleFastingState()" class="btn btn-primary btn-block mt-4">Start fast</button>
            </div>
        </section>
"######
}

pub fn render_progress_tab() -> &'static str {
    r######"        <!-- ===================== PROGRESS ===================== -->
        <section id="tab-content-progress" class="tab-panel hidden">
            <div class="seg" role="group" aria-label="Time range">
                <button onclick="setProgressRange(14)" id="range-btn-14">14 days</button>
                <button onclick="setProgressRange(30)" id="range-btn-30" class="is-active">30 days</button>
                <button onclick="setProgressRange(90)" id="range-btn-90">90 days</button>
            </div>

            <div class="stat-tiles">
                <div class="tile"><div class="k"><i class="fa-solid fa-weight-scale" style="color:var(--carbs)"></i>Weight change</div><div class="v" id="weight-change-summary">--</div></div>
                <div class="tile"><div class="k"><i class="fa-solid fa-dumbbell" style="color:var(--brand)"></i>Strength trend</div><div class="v" id="strength-change-summary">--</div></div>
            </div>

            <div class="seg brand" role="tablist" aria-label="Progress view">
                <button onclick="setProgressSubTab('weight')" id="sub-tab-weight-btn" class="is-active">Weight</button>
                <button onclick="setProgressSubTab('strength')" id="sub-tab-strength-btn">Strength</button>
                <button onclick="setProgressSubTab('calories')" id="sub-tab-calories-btn">Calories</button>
            </div>

            <!-- Weight -->
            <div id="sub-panel-weight" class="space-y-3.5">
                <div class="card">
                    <div class="card-head">
                        <h3 class="card-title"><i class="fa-solid fa-weight-scale"></i>Log weight</h3>
                        <label class="small muted flex items-center gap-2">Every
                            <select id="weigh-in-freq-select" onchange="setWeighInFrequency(this.value)" class="select" style="width:auto;min-height:36px;font-size:14px">
                                <option value="1">day</option>
                                <option value="3">3 days</option>
                                <option value="7" selected>week</option>
                            </select>
                        </label>
                    </div>
                    <form class="flex gap-2" onsubmit="event.preventDefault(); logCurrentWeight()">
                        <div class="input-unit flex-1">
                            <input type="number" id="weight-log-input" step="0.1" inputmode="decimal" placeholder="Today's weight" class="input" aria-label="Weight">
                            <span id="weight-input-unit-label">lbs</span>
                        </div>
                        <button class="btn btn-primary">Log</button>
                    </form>
                </div>
                <div class="card">
                    <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-chart-line" style="color:var(--carbs-2)"></i>Weight trend</h3><span class="small muted" id="weight-trend-rate"></span></div>
                    <div class="chart-kpis" id="weight-kpis"></div>
                    <p class="small muted hidden" id="weight-bodyfat" style="margin:-4px 0 10px"></p>
                    <div class="chart" id="weight-chart"></div>
                    <div class="chart-legend"><span><i style="background:var(--carbs-2);border-radius:50%"></i>Weigh-ins</span><span><i style="background:var(--kcal);height:3px;width:14px"></i>Trend</span><span id="weight-goal-legend" class="hidden"><i style="background:transparent;border:1.5px dashed var(--muted);width:12px;height:0;border-radius:0"></i>Goal</span></div>
                </div>
                <div class="card">
                    <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-table"></i>Weekly averages</h3></div>
                    <div class="overflow-x-auto">
                        <table class="table">
                            <thead><tr><th>Week</th><th class="text-center">Average</th><th class="text-right">Change</th></tr></thead>
                            <tbody id="weekly-averages-table-body"></tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-flag-checkered"></i>Goal estimator</h3></div>
                    <form class="flex gap-2" onsubmit="event.preventDefault(); calculateGoalEstimate()">
                        <div class="input-unit flex-1">
                            <input type="number" id="goal-weight-input" step="0.1" inputmode="decimal" placeholder="Goal weight" class="input" aria-label="Goal weight">
                            <span id="goal-weight-unit-label">lbs</span>
                        </div>
                        <button class="btn btn-soft">Estimate</button>
                    </form>
                    <div id="goal-weight-result" class="hidden mt-3 space-y-2 small">
                        <div class="flex justify-between"><span class="muted">Current</span><b id="goal-current-weight">--</b></div>
                        <div class="flex justify-between"><span class="muted">Goal</span><b id="goal-target-weight" style="color:var(--brand)">--</b></div>
                        <div class="flex justify-between"><span class="muted">Difference</span><b id="goal-weight-diff">--</b></div>
                        <div class="flex justify-between pt-2" style="border-top:1px solid var(--line)"><span class="muted">Estimated time</span><b id="goal-eta" class="text-right">--</b></div>
                        <p class="tiny faint">Based on your recent weekly rate, or your calorie target if there is not enough history.</p>
                    </div>
                </div>
            </div>

            <!-- Strength -->
            <div id="sub-panel-strength" class="hidden space-y-3.5">
                <div class="card space-y-3.5">
                    <h3 class="card-title"><i class="fa-solid fa-dumbbell"></i>Strength check-in</h3>
                    <div class="rating-grid">
                        <button onclick="setStrengthCheckRating(1)" id="strength-btn-up" class="rating up"><i class="fa-solid fa-arrow-trend-up" style="color:var(--brand)"></i>Stronger</button>
                        <button onclick="setStrengthCheckRating(0)" id="strength-btn-same" class="rating same is-active"><i class="fa-solid fa-arrow-right" style="color:var(--warn)"></i>Same</button>
                        <button onclick="setStrengthCheckRating(-1)" id="strength-btn-down" class="rating down"><i class="fa-solid fa-arrow-trend-down" style="color:var(--danger)"></i>Weaker</button>
                    </div>
                    <div class="field">
                        <label for="strength-check-notes">Notes (optional)</label>
                        <textarea id="strength-check-notes" rows="2" placeholder="e.g. Bench felt strong, deadlift up 5 lbs" class="textarea" style="min-height:70px"></textarea>
                    </div>
                    <button onclick="saveStrengthCheckIn()" class="btn btn-primary btn-block">Save check-in</button>
                </div>
                <div class="card">
                    <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-chart-line"></i>Trend</h3></div>
                    <div class="chart-box"><canvas id="strength-chart-canvas"></canvas></div>
                </div>
                <div class="card">
                    <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-list"></i>History</h3></div>
                    <div id="strength-inputs-list" class="max-h-[320px] overflow-y-auto"></div>
                </div>
            </div>

            <!-- Calories -->
            <div id="sub-panel-calories" class="hidden space-y-3.5">
                <div class="card">
                    <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-fire" style="color:var(--kcal)"></i>Daily calories</h3><span class="small muted" id="cal-trend-avg">Avg: --</span></div>
                    <div class="chart" id="calorie-trend-chart"></div>
                    <div class="chart-legend"><span><i style="background:var(--protein)"></i>Protein</span><span><i style="background:var(--carbs)"></i>Carbs</span><span><i style="background:var(--fat)"></i>Fat</span><span><i style="background:var(--text);height:2px;width:14px"></i>7-day average</span></div>
                </div>
                <div class="card">
                    <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-calendar-days"></i>Last 4 weeks</h3></div>
                    <div class="heat" id="weekly-cal-heatmap"></div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 mt-3 tiny muted">
                        <span><span class="inline-block w-2.5 h-2.5 rounded-sm align-middle" style="background:rgba(48,209,88,.34)"></span> under goal</span>
                        <span><span class="inline-block w-2.5 h-2.5 rounded-sm align-middle" style="background:var(--kcal)"></span> on target</span>
                        <span><span class="inline-block w-2.5 h-2.5 rounded-sm align-middle" style="background:rgba(255,159,10,.5)"></span> over</span>
                    </div>
                </div>
            </div>
        </section>
    </main>
</div>
"######
}

pub fn render_bottom_nav() -> &'static str {
    r######"<!-- BOTTOM NAV -->
<nav class="bottom-nav" aria-label="Main">
    <div class="inner">
        <button onclick="switchTab('nutrition')" id="mb-nutrition" class="nav-btn is-active"><i class="fa-solid fa-utensils"></i><span>Diary</span></button>
        <button onclick="switchTab('dashboard')" id="mb-dashboard" class="nav-btn"><i class="fa-solid fa-chart-simple"></i><span>Insights</span></button>
        <button onclick="openLogSheet()" id="mb-log" class="nav-plus" aria-label="Log food, exercise or water"><i class="fa-solid fa-plus"></i></button>
        <button onclick="switchTab('progress')" id="mb-progress" class="nav-btn"><i class="fa-solid fa-arrow-trend-down"></i><span>Progress</span></button>
        <button onclick="openSettingsModal()" id="mb-settings" class="nav-btn"><i class="fa-solid fa-gear"></i><span>Settings</span></button>
    </div>
</nav>

<div id="toast-container" aria-live="polite"></div>
"######
}

pub fn render_overlays() -> &'static str {
    r######"<!-- ==================== OVERLAYS ==================== -->

<!-- FIRST-RUN SETUP -->
<div id="modal-welcome" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <div class="overlay-backdrop" onclick="closeWelcome()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="welcome-title">Your daily targets</h3><p>Change any of this later in Settings.</p></div>
            <button class="icon-btn" onclick="closeWelcome()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="sheet-body" oninput="renderWelcomePreview()" onchange="renderWelcomePreview()">
            <div class="seg" id="welcome-unit-seg" role="group" aria-label="Units">
                <button data-meal="metric" onclick="setWelcomeUnits('metric')">kg · cm</button>
                <button data-meal="us" onclick="setWelcomeUnits('us')">lb · ft</button>
            </div>
            <div class="grid-2">
                <div class="field"><label for="welcome-sex">Sex</label><select id="welcome-sex" class="select"><option value="female">Female</option><option value="male">Male</option></select></div>
                <div class="field"><label for="welcome-age">Age</label><input type="number" id="welcome-age" min="13" max="100" inputmode="numeric" class="input" placeholder="30"></div>
            </div>
            <div class="grid-2" id="welcome-metric-height">
                <div class="field"><label for="welcome-height-cm">Height</label><div class="input-unit"><input type="number" id="welcome-height-cm" min="120" max="230" inputmode="numeric" class="input" placeholder="175"><span>cm</span></div></div>
                <div class="field"><label for="welcome-weight-kg">Weight</label><div class="input-unit"><input type="number" id="welcome-weight-kg" min="27" max="320" step="0.1" inputmode="decimal" class="input" placeholder="75"><span>kg</span></div></div>
            </div>
            <div class="grid-3 hidden" id="welcome-us-height">
                <div class="field"><label for="welcome-height-ft">Height</label><div class="input-unit"><input type="number" id="welcome-height-ft" min="3" max="8" inputmode="numeric" class="input" placeholder="5"><span>ft</span></div></div>
                <div class="field"><label for="welcome-height-in">&nbsp;</label><div class="input-unit"><input type="number" id="welcome-height-in" min="0" max="11" inputmode="numeric" class="input" placeholder="9"><span>in</span></div></div>
                <div class="field"><label for="welcome-weight-lb">Weight</label><div class="input-unit"><input type="number" id="welcome-weight-lb" min="60" max="700" step="0.1" inputmode="decimal" class="input" placeholder="165"><span>lb</span></div></div>
            </div>
            <div class="field"><label for="welcome-activity">How active are you?</label><select id="welcome-activity" class="select"><option value="sedentary">Sedentary (desk job, little exercise)</option>
<option value="light">Light (exercise 1–3 days/week)</option>
<option value="moderate">Moderate (exercise 3–5 days/week)</option>
<option value="very">Very active (hard exercise 6–7 days/week)</option>
<option value="extreme">Extreme (physical job + training)</option></select></div>
            <div class="field"><label for="welcome-goal">Goal</label><select id="welcome-goal" class="select"><option value="aggressive">Lose fat — faster (−25%)</option>
<option value="moderate_loss">Lose fat — steady (−20%)</option>
<option value="recomp">Body recomposition (−15%)</option>
<option value="maintenance">Maintain weight</option>
<option value="lean_bulk">Build muscle — lean bulk (+10%)</option></select></div>
            <div class="welcome-result" id="welcome-result" aria-live="polite"></div>
        </div>
        <div class="sheet-actions">
            <button class="btn btn-ghost" onclick="skipWelcome()">Not now</button>
            <button class="btn btn-primary" id="welcome-apply" onclick="applyWelcome()">Use these targets</button>
        </div>
    </div>
</div>

<!-- LOG SHEET (+ button) -->
<div id="modal-log" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="log-title">
    <div class="overlay-backdrop" onclick="closeLogSheet()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="log-title">Log</h3><p id="log-sheet-date">Today</p></div>
            <button class="icon-btn" onclick="closeLogSheet()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="seg" id="log-meal-seg" role="group" aria-label="Meal">
            <button data-meal="breakfast" onclick="setLogSheetMeal('breakfast')">Breakfast</button>
            <button data-meal="lunch" onclick="setLogSheetMeal('lunch')">Lunch</button>
            <button data-meal="dinner" onclick="setLogSheetMeal('dinner')">Dinner</button>
            <button data-meal="snacks" onclick="setLogSheetMeal('snacks')">Snacks</button>
        </div>
        <div class="log-grid mt-5">
            <button class="action" onclick="logSheetAction('search')"><span class="ai-ico ico-search"><i class="fa-solid fa-magnifying-glass"></i></span>Search</button>
            <button class="action" onclick="logSheetAction('scan')"><span class="ai-ico ico-scan"><i class="fa-solid fa-barcode"></i></span>Scan</button>
            <button class="action" onclick="logSheetAction('photo')"><span class="ai-ico ico-photo"><i class="fa-solid fa-camera"></i></span>Photo AI</button>
            <button class="action" onclick="logSheetAction('describe')"><span class="ai-ico ico-describe"><i class="fa-solid fa-wand-magic-sparkles"></i></span>Describe</button>
            <button class="action" onclick="logSheetAction('quick')"><span class="ai-ico ico-quick"><i class="fa-solid fa-bolt"></i></span>Quick add</button>
            <button class="action" onclick="logSheetAction('exercise')"><span class="ai-ico ico-exercise"><i class="fa-solid fa-person-running"></i></span>Exercise</button>
            <button class="action" onclick="logSheetAction('water')"><span class="ai-ico ico-water"><i class="fa-solid fa-droplet"></i></span>+250 ml</button>
            <button class="action" onclick="logSheetAction('weight')"><span class="ai-ico ico-weight"><i class="fa-solid fa-weight-scale"></i></span>Weight</button>
        </div>
        <div id="log-sheet-recent" class="mt-5"></div>
    </div>
</div>

<!-- ADD FOOD (full screen) -->
<div id="modal-food-search" class="screen hidden" role="dialog" aria-modal="true" aria-labelledby="food-search-title">
    <div class="screen-head">
        <button class="icon-btn" onclick="closeFoodSearchModal()" aria-label="Close"><i class="fa-solid fa-arrow-left"></i></button>
        <h2 id="food-search-title">Add food</h2>
    </div>
    <div class="screen-body">
        <div class="screen-inner">
            <div class="seg" id="search-meal-seg" role="group" aria-label="Meal">
                <button data-meal="breakfast" onclick="setSearchMeal('breakfast')">Breakfast</button>
                <button data-meal="lunch" onclick="setSearchMeal('lunch')">Lunch</button>
                <button data-meal="dinner" onclick="setSearchMeal('dinner')">Dinner</button>
                <button data-meal="snacks" onclick="setSearchMeal('snacks')">Snacks</button>
            </div>

            <form class="search-box" onsubmit="event.preventDefault(); triggerMainSearch()" role="search">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="search" id="food-search-input" enterkeyhint="search" autocomplete="off" placeholder="Search foods or brands" aria-label="Search foods">
                <button class="btn btn-primary btn-sm" type="submit">Search</button>
            </form>

            <div class="action-grid">
                <button class="quick" onclick="openScannerModal()"><span class="qi green"><i class="fa-solid fa-barcode"></i></span>Scan</button>
                <button class="quick" onclick="triggerVisionUpload()"><span class="qi amber"><i class="fa-solid fa-camera"></i></span>Photo</button>
                <button class="quick" onclick="openDescribeModal()"><span class="qi violet"><i class="fa-solid fa-wand-magic-sparkles"></i></span>Describe</button>
                <button class="quick" onclick="openQuickLogModal()"><span class="qi rose"><i class="fa-solid fa-bolt"></i></span>Quick add</button>
                <button class="quick" onclick="openCustomFoodModal()"><span class="qi blue"><i class="fa-solid fa-pen"></i></span>Create</button>
            </div>

            <details class="options">
                <summary><span><i class="fa-solid fa-filter mr-2"></i>Sources &amp; options</span><i class="fa-solid fa-chevron-down" style="transition:transform .2s"></i></summary>
                <div class="opts">
                    <label class="check"><input type="checkbox" id="source-toggle-staples" checked>Built-in foods</label>
                    <label class="check"><input type="checkbox" id="source-toggle-custom" checked>My foods</label>
                    <label class="check"><input type="checkbox" id="source-toggle-off" checked>Open Food Facts</label>
                    <label class="check"><input type="checkbox" id="source-toggle-usda" checked>USDA (needs key)</label>
                    <label class="check"><input type="checkbox" id="source-toggle-ai" checked>AI suggestions</label>
                    <label class="check"><input type="checkbox" id="enable-multi-add" onchange="toggleMultiAddMode(this.checked)">Select several</label>
                </div>
            </details>

            <div id="smart-search-debug" class="hidden small muted px-1"></div>

            <div id="often-logged-panel">
                <div id="saved-meals-list"></div>
                <p class="list-label mb-2" id="often-logged-header">Recent for breakfast</p>
                <div id="often-logged-list"></div>
            </div>
            <div id="search-results-container"></div>
            <div id="search-ai-results"></div>

            <div id="multi-add-floating-bar" class="multi-bar hidden">
                <span><i class="fa-solid fa-list-check mr-2"></i><span id="multi-add-count-badge">0</span> selected</span>
                <button onclick="executeMultiAddLog()" class="btn btn-sm">Log selected</button>
            </div>
        </div>
    </div>
</div>

<!-- FOOD REVIEW (bottom sheet) -->
<div id="modal-food-review" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="review-name">
    <div class="overlay-backdrop" onclick="closeFoodReview()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="review-head">
            <img id="review-image" class="review-img hidden" alt="">
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap gap-1.5 mb-1.5" id="review-badges"></div>
                <h3 id="review-name" class="review-name">Food</h3>
                <p id="review-brand" class="small muted mt-0.5"></p>
            </div>
            <button class="icon-btn" onclick="closeFoodReview()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="sheet-body mt-4">
            <div class="field">
                <label for="review-amount">How much?</label>
                <div class="amount-row">
                    <button class="stepper" onclick="stepReviewAmount(-1)" aria-label="Less">−</button>
                    <input id="review-amount" class="input" type="number" inputmode="decimal" min="0" step="any" oninput="renderFoodReview()">
                    <select id="review-unit" class="select" onchange="onReviewUnitChange()" aria-label="Unit"></select>
                    <button class="stepper" onclick="stepReviewAmount(1)" aria-label="More">+</button>
                </div>
                <p id="review-amount-hint" class="tiny faint"></p>
            </div>
            <div class="nutri-summary">
                <div class="nutri kcal"><b id="review-kcal">0</b><span>kcal</span></div>
                <div class="nutri"><b id="review-protein">0</b><span>protein g</span></div>
                <div class="nutri"><b id="review-carbs">0</b><span>carbs g</span></div>
                <div class="nutri"><b id="review-fats">0</b><span>fat g</span></div>
            </div>
            <div id="review-note" class="note hidden"></div>
            <div class="seg" id="review-meal-seg" role="group" aria-label="Meal">
                <button data-meal="breakfast" onclick="setReviewMeal('breakfast')">Breakfast</button>
                <button data-meal="lunch" onclick="setReviewMeal('lunch')">Lunch</button>
                <button data-meal="dinner" onclick="setReviewMeal('dinner')">Dinner</button>
                <button data-meal="snacks" onclick="setReviewMeal('snacks')">Snacks</button>
            </div>
        </div>
        <div class="sheet-actions">
            <button class="btn btn-ghost" onclick="showReviewLabel()" style="flex:0 0 auto"><i class="fa-solid fa-list"></i><span>Label</span></button>
            <button id="review-add-btn" class="btn btn-primary" onclick="confirmFoodReview()"><i class="fa-solid fa-plus"></i><span id="review-add-label">Add</span></button>
        </div>
    </div>
</div>

<!-- AI RESULTS (bottom sheet) -->
<div id="modal-ai-results" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="ai-results-title">
    <div class="overlay-backdrop" onclick="closeAiResults()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="ai-results-title">Review AI estimate</h3><p>Untick anything that's wrong. Tap an item to adjust it.</p></div>
            <button class="icon-btn" onclick="closeAiResults()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="note ai"><i class="fa-solid fa-circle-info"></i><span>These are AI estimates, not measured values. Check portions before logging.</span></div>
        <div id="ai-results-list" class="mt-3"></div>
        <p class="small muted mt-3 text-right" id="ai-results-total"></p>
        <div class="sheet-actions">
            <button class="btn btn-ghost" onclick="closeAiResults()">Cancel</button>
            <button class="btn btn-primary" id="ai-results-log-btn" onclick="logAiResults()">Log selected</button>
        </div>
    </div>
</div>

<!-- DESCRIBE MEAL -->
<div id="modal-describe-meal" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="describe-title">
    <div class="overlay-backdrop" onclick="closeDescribeModal()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="describe-title">Describe your meal</h3><p>AI turns it into foods you can review before logging.</p></div>
            <button class="icon-btn" onclick="closeDescribeModal()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="field">
            <div class="flex justify-between items-center"><label for="describe-meal-textarea">What did you eat?</label><span class="tiny faint" id="describe-char-count">0/500</span></div>
            <textarea id="describe-meal-textarea" oninput="updateCharCount(this)" maxlength="500" placeholder="e.g. 2 slices sourdough toast with half an avocado, 3 scrambled eggs and a black coffee" class="textarea"></textarea>
            <p class="tiny faint">Include sizes or weights for better estimates. Your text is sent to Google Gemini.</p>
        </div>
        <div class="sheet-actions">
            <button class="btn btn-ai" id="describe-submit-btn" onclick="processDescribeMealAI()"><i class="fa-solid fa-wand-magic-sparkles"></i><span>Estimate nutrition</span></button>
        </div>
    </div>
</div>

<!-- PHOTO (AI) CONFIRM -->
<div id="modal-vision-confirm" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="vision-title">
    <div class="overlay-backdrop" onclick="closeVisionConfirmModal()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="vision-title">Analyze meal photo</h3><p>The photo is sent to Google Gemini for an estimate.</p></div>
            <button class="icon-btn" onclick="closeVisionConfirmModal()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center"><img id="vision-preview-img" src="" alt="Selected meal photo" class="w-full h-full object-cover"></div>
        <div class="field mt-4">
            <label for="vision-confirm-description">Add details (optional)</label>
            <textarea id="vision-confirm-description" rows="2" placeholder="e.g. grilled salmon ~150 g, white rice, avocado" class="textarea" style="min-height:70px"></textarea>
        </div>
        <div class="sheet-actions">
            <button id="vision-confirm-btn" onclick="executeVisionScan()" class="btn btn-ai"><i class="fa-solid fa-wand-magic-sparkles"></i><span>Estimate nutrition</span></button>
        </div>
    </div>
</div>

<!-- QUICK ADD -->
<div id="modal-quick-log" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="quick-title">
    <div class="overlay-backdrop" onclick="closeQuickLogModal()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="quick-title">Quick add</h3><p>Log calories and macros directly.</p></div>
            <button class="icon-btn" onclick="closeQuickLogModal()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form class="sheet-body" onsubmit="event.preventDefault(); saveQuickLog()">
            <div class="field"><label for="quick-log-name">Name</label><input type="text" id="quick-log-name" value="Quick add" class="input"></div>
            <div class="grid-2">
                <div class="field"><label for="quick-log-calories">Calories</label><div class="input-unit"><input type="number" id="quick-log-calories" inputmode="decimal" placeholder="350" class="input" required min="0"><span>kcal</span></div></div>
                <div class="field"><label for="quick-log-protein">Protein</label><div class="input-unit"><input type="number" id="quick-log-protein" inputmode="decimal" step="any" placeholder="0" class="input"><span>g</span></div></div>
                <div class="field"><label for="quick-log-carbs">Carbs</label><div class="input-unit"><input type="number" id="quick-log-carbs" inputmode="decimal" step="any" placeholder="0" class="input"><span>g</span></div></div>
                <div class="field"><label for="quick-log-fats">Fat</label><div class="input-unit"><input type="number" id="quick-log-fats" inputmode="decimal" step="any" placeholder="0" class="input"><span>g</span></div></div>
            </div>
            <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-plus"></i><span id="quick-log-btn-label">Log</span></button>
        </form>
    </div>
</div>

<!-- CREATE FOOD -->
<div id="modal-custom-food" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="custom-title">
    <div class="overlay-backdrop" onclick="closeCustomFoodModal()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="custom-title">Create a food</h3><p>Saved to My foods on this device.</p></div>
            <button class="icon-btn" onclick="closeCustomFoodModal()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form class="sheet-body" onsubmit="event.preventDefault(); saveCustomFood()">
            <div id="custom-food-note" class="note ai hidden"></div>
            <div class="field"><label for="custom-food-name">Name *</label><input type="text" id="custom-food-name" placeholder="e.g. Homemade lasagna" class="input" required></div>
            <div class="grid-2">
                <div class="field"><label for="custom-food-brand">Brand</label><input type="text" id="custom-food-brand" placeholder="Optional" class="input"></div>
                <div class="field"><label for="custom-food-barcode">Barcode</label><input type="text" id="custom-food-barcode" inputmode="numeric" placeholder="Optional" class="input mono"></div>
                <div class="field"><label for="custom-food-size">Serving size *</label><input type="number" id="custom-food-size" value="100" step="any" min="0" inputmode="decimal" class="input"></div>
                <div class="field"><label for="custom-food-unit">Unit</label>
                    <select id="custom-food-unit" class="select">
                        <option value="g">grams (g)</option>
                        <option value="ml">millilitres (ml)</option>
                        <option value="oz">ounces (oz)</option>
                        <option value="pcs">pieces</option>
                        <option value="serving">serving</option>
                    </select>
                </div>
            </div>
            <p class="tiny faint -mt-1">Enter nutrition for one serving of the size above.</p>
            <div class="grid-2">
                <div class="field"><label for="custom-food-calories">Calories *</label><div class="input-unit"><input type="number" id="custom-food-calories" step="any" min="0" inputmode="decimal" placeholder="0" class="input" required><span>kcal</span></div></div>
                <div class="field"><label for="custom-food-protein">Protein</label><div class="input-unit"><input type="number" id="custom-food-protein" step="any" min="0" inputmode="decimal" placeholder="0" class="input"><span>g</span></div></div>
                <div class="field"><label for="custom-food-carbs">Carbs</label><div class="input-unit"><input type="number" id="custom-food-carbs" step="any" min="0" inputmode="decimal" placeholder="0" class="input"><span>g</span></div></div>
                <div class="field"><label for="custom-food-fats">Fat</label><div class="input-unit"><input type="number" id="custom-food-fats" step="any" min="0" inputmode="decimal" placeholder="0" class="input"><span>g</span></div></div>
            </div>
            <button type="button" class="disclosure" onclick="toggleCustomMicrosSection()" aria-expanded="false" id="custom-micros-toggle"><span>Vitamins &amp; minerals (optional)</span><i id="custom-micros-chevron" class="fa-solid fa-chevron-down"></i></button>
            <div id="custom-micros-content" class="hidden grid-2" style="margin-top:8px">
                <div class="field"><label for="custom-micro-vita">Vitamin A (mcg)</label><input type="number" id="custom-micro-vita" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-vitc">Vitamin C (mg)</label><input type="number" id="custom-micro-vitc" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-vitd">Vitamin D (mcg)</label><input type="number" id="custom-micro-vitd" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-vite">Vitamin E (mg)</label><input type="number" id="custom-micro-vite" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-vitk">Vitamin K (mcg)</label><input type="number" id="custom-micro-vitk" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-vitb12">Vitamin B12 (mcg)</label><input type="number" id="custom-micro-vitb12" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-folate">Folate (mcg)</label><input type="number" id="custom-micro-folate" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-sodium">Sodium (mg)</label><input type="number" id="custom-micro-sodium" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-calcium">Calcium (mg)</label><input type="number" id="custom-micro-calcium" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-iron">Iron (mg)</label><input type="number" id="custom-micro-iron" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-magnesium">Magnesium (mg)</label><input type="number" id="custom-micro-magnesium" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-potassium">Potassium (mg)</label><input type="number" id="custom-micro-potassium" step="any" min="0" class="input"></div>
                <div class="field"><label for="custom-micro-zinc">Zinc (mg)</label><input type="number" id="custom-micro-zinc" step="any" min="0" class="input"></div>
            </div>
            <button type="submit" class="btn btn-primary btn-block"><i class="fa-solid fa-floppy-disk"></i>Save food</button>
        </form>
    </div>
</div>

<!-- SETTINGS (full screen) -->
<div id="modal-settings" class="screen hidden" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div class="screen-head">
        <button class="icon-btn" onclick="closeSettingsModal()" aria-label="Save and close"><i class="fa-solid fa-arrow-left"></i></button>
        <h2 id="settings-title">Settings</h2>
        <button class="btn btn-primary btn-sm" onclick="closeSettingsModal()">Done</button>
    </div>
    <div class="screen-body">
        <div class="screen-inner">
            <section class="settings-section">
                <h3><i class="fa-solid fa-bullseye"></i>Daily targets</h3>
                <div class="grid-2">
                    <div class="field"><label for="settings-target-cal">Calories</label><div class="input-unit"><input type="number" id="settings-target-cal" min="500" max="10000" inputmode="numeric" class="input"><span>kcal</span></div></div>
                    <div class="field"><label for="settings-target-protein">Protein</label><div class="input-unit"><input type="number" id="settings-target-protein" min="10" max="500" inputmode="numeric" class="input"><span>g</span></div></div>
                    <div class="field"><label for="settings-target-carbs">Carbs</label><div class="input-unit"><input type="number" id="settings-target-carbs" min="10" max="1000" inputmode="numeric" class="input"><span>g</span></div></div>
                    <div class="field"><label for="settings-target-fats">Fat</label><div class="input-unit"><input type="number" id="settings-target-fats" min="5" max="300" inputmode="numeric" class="input"><span>g</span></div></div>
                    <div class="field"><label for="settings-target-water">Water</label><div class="input-unit"><input type="number" id="settings-target-water" step="0.1" min="0.5" max="10" inputmode="decimal" class="input"><span>L</span></div></div>
                    <div class="field"><label for="settings-weight-unit">Weight unit</label>
                        <select id="settings-weight-unit" class="select" onchange="onSettingsWeightUnitChange()"><option value="lbs">Pounds (lbs)</option><option value="kg">Kilograms (kg)</option></select>
                    </div>
                </div>
            </section>

            <section class="settings-section">
                <h3><i class="fa-solid fa-person-running"></i>Exercise</h3>
                <label class="check"><input type="checkbox" id="settings-exercise-goal">Add exercise calories to my daily goal</label>
                <p class="small muted">Leave this off if your calorie target already includes your activity level (the calculator below does), otherwise exercise is counted twice.</p>
            </section>

            <section class="settings-section">
                <h3><i class="fa-solid fa-calculator"></i>Calculate my targets</h3>
                <p class="small muted">Estimates calories with the Mifflin–St Jeor equation, then sets protein (1 g/lb) and fat (0.35 g/lb), with carbs filling the rest.</p>
                <div class="grid-2">
                    <div class="field"><label for="settings-profile-sex">Sex</label><select id="settings-profile-sex" class="select"><option value="male">Male</option><option value="female">Female</option></select></div>
                    <div class="field"><label for="settings-profile-age">Age</label><input type="number" id="settings-profile-age" min="13" max="100" inputmode="numeric" class="input"></div>
                </div>
                <div class="grid-3">
                    <div class="field"><label for="settings-profile-height-ft">Height ft</label><input type="number" id="settings-profile-height-ft" min="3" max="8" inputmode="numeric" class="input"></div>
                    <div class="field"><label for="settings-profile-height-in">in</label><input type="number" id="settings-profile-height-in" min="0" max="11" inputmode="numeric" class="input"></div>
                    <div class="field"><label for="settings-profile-weight" id="settings-profile-weight-label">Weight lbs</label><input type="number" id="settings-profile-weight" min="60" max="600" step="0.1" inputmode="decimal" class="input"></div>
                </div>
                <div class="field"><label for="settings-profile-activity">Activity</label>
                    <select id="settings-profile-activity" class="select">
                        <option value="sedentary">Sedentary (desk job, little exercise)</option>
                        <option value="light">Light (exercise 1–3 days/week)</option>
                        <option value="moderate">Moderate (exercise 3–5 days/week)</option>
                        <option value="very">Very active (hard exercise 6–7 days/week)</option>
                        <option value="extreme">Extreme (physical job + training)</option>
                    </select>
                </div>
                <div class="field"><label for="settings-profile-goal">Goal</label>
                    <select id="settings-profile-goal" class="select">
                        <option value="aggressive">Fat loss — aggressive (−25%)</option>
                        <option value="moderate_loss">Fat loss — moderate (−20%)</option>
                        <option value="recomp">Body recomposition (−15%)</option>
                        <option value="lean_bulk">Lean bulk (+10%)</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>
                <button onclick="calculateTDEETargets()" class="btn btn-primary btn-block"><i class="fa-solid fa-bolt"></i>Calculate &amp; apply</button>
            </section>

            <section class="settings-section">
                <h3><i class="fa-solid fa-capsules"></i>Micronutrient targets</h3>
                <div class="flex gap-2">
                    <select id="rda-profile-selector" class="select flex-1" aria-label="RDA profile">
                        <option value="male_19_50">Adult male (19–50)</option>
                        <option value="female_19_50">Adult female (19–50)</option>
                        <option value="male_51_plus">Male (51+)</option>
                        <option value="female_51_plus">Female (51+)</option>
                    </select>
                    <button onclick="applyRDAProfilePreset()" class="btn btn-soft">Apply RDA</button>
                </div>
                <button type="button" class="disclosure" onclick="toggleSettingsMicros()" aria-expanded="false" id="settings-micros-toggle" style="margin-top:6px"><span>Edit individual targets</span><i id="settings-micros-chevron" class="fa-solid fa-chevron-down"></i></button>
                <div id="form-micros-panel" class="hidden"><div class="grid-2" id="form-micros-grid"></div></div>
            </section>

            <section class="settings-section">
                <h3><i class="fa-solid fa-wand-magic-sparkles"></i>AI features (Google Gemini)</h3>
                <div class="flex items-center justify-between gap-3">
                    <span class="small muted">Status</span>
                    <span id="gemini-status-badge" class="status-pill off">Not set up</span>
                </div>
                <p class="small muted">Describe-a-meal, photo estimates and AI search suggestions need your own free Gemini API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--brand)">Google AI Studio</a>. The key is stored only in this browser and is never included in exports.</p>
                <form class="flex gap-2" onsubmit="event.preventDefault(); saveGeminiKeyFromSettings()">
                    <input type="password" id="settings-gemini-key" class="input flex-1 mono" placeholder="Paste API key" autocomplete="off" aria-label="Gemini API key">
                    <button class="btn btn-soft" type="submit">Save</button>
                </form>
                <div class="flex gap-2">
                    <button class="btn btn-ghost btn-sm flex-1" onclick="testGeminiKey()" id="gemini-test-btn"><i class="fa-solid fa-plug"></i>Test</button>
                    <button class="btn btn-ghost btn-sm flex-1" onclick="removeGeminiKey()"><i class="fa-solid fa-trash-can"></i>Remove</button>
                </div>
            </section>

            <section class="settings-section">
                <h3><i class="fa-solid fa-barcode"></i>Food databases</h3>
                <div class="flex items-center justify-between gap-3">
                    <span class="small muted">USDA FoodData Central</span>
                    <span id="usda-status-badge" class="status-pill off">Shared demo key</span>
                </div>
                <p class="small muted">Barcodes are looked up in Open Food Facts, then in USDA's database of US branded foods. USDA's shared demo key allows only a few lookups an hour; a free personal key from <a href="https://fdc.nal.usda.gov/api-key-signup" target="_blank" rel="noopener" style="color:var(--brand)">api.data.gov</a> removes that limit and adds USDA results to search.</p>
                <form class="flex gap-2" onsubmit="event.preventDefault(); saveUsdaKeyFromSettings()">
                    <input type="password" id="settings-usda-key" class="input flex-1 mono" placeholder="Paste USDA API key" autocomplete="off" aria-label="USDA API key">
                    <button class="btn btn-soft" type="submit">Save</button>
                </form>
                <button class="btn btn-ghost btn-sm" onclick="removeUsdaKey()" id="usda-remove-btn"><i class="fa-solid fa-trash-can"></i>Remove USDA key</button>
            </section>

            <section class="settings-section">
                <h3><i class="fa-solid fa-heart-pulse"></i>Health data (Google Health, Apple Health, Fitbit)</h3>
                <p class="small muted"><b class="text-strong">On iPhone:</b> the Google Health app, Fitbit and Apple Watch all write to Apple Health. A one-tap Apple Shortcut copies your last 7 days (steps, active and resting calories, weight) and MacroFlow reads them. Websites can't open Apple Health themselves, so the Shortcut is the bridge.</p>
                <button class="btn btn-primary btn-block" onclick="syncFromAppleHealth()"><i class="fa-brands fa-apple"></i>Sync from Apple Health</button>
                <button class="btn btn-ghost btn-block" onclick="openHealthSync('guide')"><i class="fa-solid fa-list-check"></i>Set up the Shortcut</button>
                <p class="small faint" id="health-sync-status-settings">Not synced yet.</p>
                <p class="small muted" style="margin-top:6px"><b class="text-strong">From files:</b> download your data with <a href="https://takeout.google.com" target="_blank" rel="noopener" style="color:var(--brand)">Google Takeout</a> (Google Health, Fitbit or Fit) or any app's CSV export and choose the .zip, .csv or .json files. You'll see a preview first.</p>
                <button class="btn btn-soft btn-block" onclick="triggerHealthImport()"><i class="fa-solid fa-file-arrow-up"></i>Import health files</button>
                <div class="flex items-center justify-between gap-3">
                    <span class="small faint" id="health-import-status">No files imported yet.</span>
                    <button class="btn btn-ghost btn-sm hidden" id="health-remove-btn" onclick="removeImportedHealthData()">Remove imported</button>
                </div>
                <input type="file" id="health-file-input" accept=".zip,.csv,.json,.txt,application/zip,text/csv,application/json" multiple class="hidden" onchange="onHealthFilesChosen(event)">
            </section>

            <section class="settings-section">
                <h3><i class="fa-solid fa-database"></i>Your data</h3>
                <p class="small muted">Everything is saved in this browser only. Export a backup before clearing browser data or switching devices.</p>
                <div class="grid-2">
                    <button onclick="exportData()" class="btn btn-soft"><i class="fa-solid fa-file-export"></i>Export</button>
                    <button onclick="triggerImport()" class="btn btn-soft"><i class="fa-solid fa-file-import"></i>Import</button>
                </div>
                <button onclick="printReport()" class="btn btn-ghost btn-block"><i class="fa-solid fa-print"></i>Print / save PDF report</button>
                <input type="file" id="import-file-input" accept="application/json,.json" onchange="importData(event)" class="hidden">
                <button onclick="clearStateData()" class="btn btn-danger btn-block"><i class="fa-solid fa-trash-can"></i>Erase all data</button>
            </section>
            <p class="tiny faint text-center">MacroFlow · food data from Open Food Facts (ODbL) and USDA</p>
        </div>
    </div>
</div>

<!-- FOOD DETAILS / DIARY ENTRY EDITOR -->
<div id="modal-nutrition-facts" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="label-food-name">
    <div class="overlay-backdrop" onclick="closeNutritionFactsModal()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div class="min-w-0">
                <h3 id="label-food-name">Food</h3>
                <p id="label-food-brand"></p>
            </div>
            <button class="icon-btn" onclick="closeNutritionFactsModal()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <form id="label-portion-controls" class="hidden field mb-4" onsubmit="event.preventDefault(); saveDiaryPortion()">
            <label for="label-portion-amount">Amount eaten (<span id="label-portion-unit"></span>)</label>
            <input id="label-portion-amount" type="number" inputmode="decimal" min="0.01" step="any" required oninput="previewDiaryPortion()" class="input" style="font-size:19px;font-weight:600">
            <p id="label-portion-error" role="status" class="small" style="color:var(--danger)"></p>
        </form>

        <div class="nutri-summary">
            <div class="nutri kcal"><b id="label-calories">0</b><span>kcal</span></div>
            <div class="nutri"><b id="label-protein">0</b><span>protein g</span></div>
            <div class="nutri"><b id="label-carbs">0</b><span>carbs g</span></div>
            <div class="nutri"><b id="label-fat">0</b><span>fat g</span></div>
        </div>
        <p class="tiny faint mt-2"><span id="label-serving-display">100 g</span> · <span id="label-protein-pct">0</span>% of protein target · <span id="label-carbs-pct">0</span>% carbs · <span id="label-fat-pct">0</span>% fat</p>

        <p class="list-label mt-5 mb-1">Vitamins &amp; minerals</p>
        <div class="detail-list" id="label-micros-panel"></div>

        <div id="label-meal-field" class="field mt-5 hidden">
            <label>Meal</label>
            <div class="seg" id="label-meal-seg" role="group" aria-label="Move to meal">
                <button data-meal="breakfast" onclick="setEntryMeal('breakfast')">Breakfast</button>
                <button data-meal="lunch" onclick="setEntryMeal('lunch')">Lunch</button>
                <button data-meal="dinner" onclick="setEntryMeal('dinner')">Dinner</button>
                <button data-meal="snacks" onclick="setEntryMeal('snacks')">Snacks</button>
            </div>
        </div>
        <div id="label-entry-actions" class="sheet-actions hidden">
            <button class="btn btn-danger" style="flex:0 0 auto" onclick="removeActiveDiaryEntry()" aria-label="Remove entry"><i class="fa-regular fa-trash-can"></i></button>
            <button class="btn btn-soft" style="flex:0 0 auto" onclick="duplicateActiveDiaryEntry()"><i class="fa-regular fa-clone"></i>Log again</button>
            <button id="label-portion-save" class="btn btn-primary" onclick="saveDiaryPortion()">Save</button>
        </div>
    </div>
</div>

<!-- EXERCISE -->
<div id="modal-exercise" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="exercise-title">
    <div class="overlay-backdrop" onclick="closeExerciseModal()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="exercise-title">Log exercise</h3><p>Calories are estimated from your weight. Use your watch's number if you have one.</p></div>
            <button class="icon-btn" onclick="closeExerciseModal()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form class="sheet-body" onsubmit="event.preventDefault(); saveExercise()">
            <div class="field"><label for="exercise-type">Activity</label><select id="exercise-type" class="select" onchange="onExerciseTypeChange()"></select></div>
            <div class="field hidden" id="exercise-name-field"><label for="exercise-name">Name</label><input id="exercise-name" class="input" placeholder="e.g. Rowing"></div>
            <div class="grid-2">
                <div class="field"><label for="exercise-minutes">Duration</label><div class="input-unit"><input id="exercise-minutes" type="number" min="1" step="1" inputmode="numeric" class="input" oninput="estimateExerciseCalories()"><span>min</span></div></div>
                <div class="field"><label for="exercise-calories">Calories burned</label><div class="input-unit"><input id="exercise-calories" type="number" min="0" step="1" inputmode="numeric" class="input" oninput="exerciseCaloriesTouched = true"><span>kcal</span></div></div>
            </div>
            <div class="sheet-actions">
                <button type="button" id="exercise-remove-btn" class="btn btn-danger hidden" style="flex:0 0 auto" onclick="removeExercise()" aria-label="Remove exercise"><i class="fa-regular fa-trash-can"></i></button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>

<!-- SAVE MEAL -->
<div id="modal-save-meal" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="save-meal-title">
    <div class="overlay-backdrop" onclick="closeSaveMealModal()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="save-meal-title">Save meal</h3><p id="save-meal-summary"></p></div>
            <button class="icon-btn" onclick="closeSaveMealModal()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form class="sheet-body" onsubmit="event.preventDefault(); confirmSaveMeal()">
            <div class="field"><label for="save-meal-name">Name</label><input id="save-meal-name" class="input" maxlength="60" required></div>
            <button type="submit" class="btn btn-primary btn-block">Save meal</button>
        </form>
    </div>
</div>

<!-- HEALTH IMPORT PREVIEW -->
<div id="modal-health-import" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="health-title">
    <div class="overlay-backdrop" onclick="closeHealthImport()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="health-title">Import health data</h3><p id="health-preview-range"></p></div>
            <button class="icon-btn" onclick="closeHealthImport()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="detail-list" id="health-preview-list"></div>
        <p class="list-label mt-5 mb-1">Most recent days</p>
        <div class="detail-list" id="health-preview-sample"></div>
        <div class="sheet-body mt-5">
            <div class="field" id="health-calories-field"><label for="health-calories-kind">The calorie numbers are…</label>
                <select id="health-calories-kind" class="select">
                    <option value="total">Total burned, incl. resting</option>
                    <option value="active">Active / exercise only</option>
                </select>
            </div>
            <div class="field" id="health-weight-field"><label for="health-weight-unit">Weights in the file are in…</label>
                <select id="health-weight-unit" class="select"><option value="kg">Kilograms (kg)</option><option value="lbs">Pounds (lbs)</option></select>
            </div>
            <p class="small faint">Total calories are shown as your energy balance on Insights; active calories are logged as exercise. Days already imported are updated, and your food log is not changed.</p>
        </div>
        <div class="sheet-actions">
            <button class="btn btn-ghost" onclick="closeHealthImport()">Cancel</button>
            <button class="btn btn-primary" onclick="confirmHealthImport()">Import</button>
        </div>
    </div>
</div>

<!-- APPLE HEALTH SYNC -->
<div id="modal-health-sync" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="health-sync-title">
    <div class="overlay-backdrop" onclick="closeHealthSync()"></div>
    <div class="sheet">
        <div class="grabber"></div>
        <div class="sheet-head">
            <div><h3 id="health-sync-title">Sync from Apple Health</h3><p>Steps, calories burned, weight and body fat from Apple Watch, iPhone, Fitbit or Google Health.</p></div>
            <button class="icon-btn" onclick="closeHealthSync()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="sheet-body">
            <p class="small muted" id="health-sync-message"></p>
            <div class="field">
                <div class="flex items-center justify-between">
                    <label for="health-sync-paste">Shortcut output (or paste lines below)</label>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="loadSampleHealthData()"><i class="fa-solid fa-flask"></i>Load sample</button>
                </div>
                <textarea id="health-sync-paste" rows="4" class="textarea mono" style="min-height:92px;font-size:13px" placeholder="MacroFlow Health&#10;steps&#10;Nov 8, 2026 at 12:00 AM&#10;8,432" autocomplete="off" autocapitalize="off" spellcheck="false" oninput="previewPastedHealthData()"></textarea>
                <div id="health-sync-preview" class="small muted hidden" style="margin-top:6px;padding:8px 10px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border)"></div>
            </div>
            <div class="grid-2">
                <button class="btn btn-soft" onclick="syncFromAppleHealth()"><i class="fa-regular fa-clipboard"></i>Read clipboard</button>
                <button class="btn btn-primary" onclick="syncPastedHealthData()"><i class="fa-solid fa-rotate"></i>Sync pasted</button>
            </div>
            <button type="button" class="disclosure" id="health-sync-guide-toggle" onclick="toggleHealthSyncGuide()" aria-expanded="false" aria-controls="health-sync-guide"><span>Set up Apple Health (one time, about 3 min)</span><i class="fa-solid fa-chevron-down"></i></button>
            <div id="health-sync-guide" class="hidden">
                <p class="small muted mb-3">Apple doesn't let websites read Apple Health, so a small Shortcut copies your last 7 days and MacroFlow reads them when you tap <b>Sync</b>. No Repeat blocks needed.</p>
                <ol class="steps-list">
                    <li><b>Fitbit or Google Health?</b> In that app, open <b>Connections → Apple Health</b> and allow steps, active calories, weight and body fat. (Apple Watch and iPhone already write to Apple Health.)</li>
                    <li><b>New Shortcut:</b> open <b>Shortcuts</b>, tap <b>+</b>, and name it <b>MacroFlow Health</b>.</li>
                    <li><b>Find your data:</b> add <b>Find Health Samples</b> four times, one for each type, all with <b>Start Date is in the last 7 days</b>:
                        <div class="hs-types">
                            <span><i class="fa-solid fa-shoe-prints"></i>Steps <em>Group by Day</em></span>
                            <span><i class="fa-solid fa-fire"></i>Active Energy <em>Group by Day</em></span>
                            <span><i class="fa-solid fa-weight-scale"></i>Weight</span>
                            <span><i class="fa-solid fa-percent"></i>Body Fat Percentage</span>
                        </div>
                        <span class="small faint">Apple Watch: add a fifth for <b>Resting Energy</b> (Group by Day) and label it <span class="mono">resting</span> below.</span></li>
                    <li><b>One Text action:</b> add <b>Text</b> and lay it out like this. Type the grey words; for each coloured chip, tap the empty line, pick that <b>Health Samples</b> variable, then tap the chip and choose the property.
                        <div class="hs-text" aria-label="Text action layout">
                            <div class="hs-word">MacroFlow Health</div>
                            <div class="hs-word">steps</div><div><span class="hs-chip c1">Health Samples · Start Date</span></div><div><span class="hs-chip c1">Health Samples · Value</span></div>
                            <div class="hs-word">active</div><div><span class="hs-chip c2">Health Samples 2 · Start Date</span></div><div><span class="hs-chip c2">Health Samples 2 · Value</span></div>
                            <div class="hs-word">weight</div><div><span class="hs-chip c3">Health Samples 3 · Start Date</span></div><div><span class="hs-chip c3">Health Samples 3 · Value</span></div><div><span class="hs-chip c3">Health Samples 3 · Unit</span></div>
                            <div class="hs-word">body fat</div><div><span class="hs-chip c4">Health Samples 4 · Start Date</span></div><div><span class="hs-chip c4">Health Samples 4 · Value</span></div>
                        </div>
                        <button type="button" class="btn btn-soft btn-sm mt-2" onclick="copyShortcutTemplate()"><i class="fa-regular fa-copy"></i>Copy the words to paste into Text</button></li>
                    <li><b>Copy to Clipboard:</b> add it last, tap ▶ once and allow Health access.</li>
                    <li><b>Make it automatic:</b> in Shortcuts, <b>Automation → + → Time of Day</b>, pick a time (say 6 am), <b>Daily</b>, <b>Run Immediately</b>, and choose <b>MacroFlow Health</b>. Add a midday and evening time too if you like.</li>
                    <li><b>Done.</b> Whenever you open MacroFlow, tap <b>Sync Apple Health</b>, then <b>Paste</b>. That one tap is all iOS allows.</li>
                </ol>
                <p class="small faint mt-3">Active energy is logged as exercise for that day. Total burned is active + resting energy (resting is estimated from your Settings profile when there's no Apple Watch) and powers Energy Balance on Insights. Weights go to Progress, body fat shows under the weight trend. Syncing again updates synced days and never touches your own entries. The older one-line-per-sample Shortcut still works.</p>
            </div>
        </div>
    </div>
</div>

<!-- BARCODE SCANNER -->
<div id="modal-scanner" class="scanner hidden" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
    <video id="scanner-video" playsinline muted autoplay aria-hidden="true"></video>
    <div class="scan-mask"><div class="scan-window" id="scanner-window"><span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span><div class="scan-laser"></div></div></div>
    <div class="scan-top">
        <button class="scan-btn" onclick="closeScannerModal()" aria-label="Close scanner"><i class="fa-solid fa-xmark"></i></button>
        <h2 id="scanner-title">Scan barcode</h2>
        <div class="scan-tools">
            <button class="scan-btn hidden" id="scanner-zoom" onclick="cycleZoom()" aria-label="Zoom">1×</button>
            <button class="scan-btn hidden" id="scanner-switch" onclick="switchCamera()" aria-label="Switch camera"><i class="fa-solid fa-camera-rotate"></i></button>
            <button class="scan-btn hidden" id="scanner-torch" onclick="toggleTorch()" aria-label="Toggle flashlight" aria-pressed="false"><i class="fa-solid fa-bolt"></i></button>
        </div>
    </div>
    <div class="scan-panel">
        <div class="inner">
            <p id="scanner-status" class="scan-status" role="status" aria-live="polite"><span class="dot"></span><span id="scanner-status-text">Starting camera…</span></p>
            <p id="scanner-hint" class="scan-hint">Line the barcode up inside the frame and hold steady.</p>
            <div id="scanner-result" class="hidden mt-3"></div>
            <div class="scan-actions" id="scanner-actions">
                <button class="btn btn-soft" onclick="scanBarcodeFromPhoto()"><i class="fa-regular fa-image"></i>From photo</button>
                <button class="btn btn-soft" onclick="toggleManualBarcode()"><i class="fa-solid fa-keyboard"></i>Type number</button>
            </div>
            <form id="manual-barcode-form" class="hidden flex gap-2 mt-3" onsubmit="event.preventDefault(); processManualBarcodeSearch()">
                <input type="text" id="manual-barcode-input" inputmode="numeric" autocomplete="off" placeholder="Digits under the barcode" class="input mono flex-1" aria-label="Barcode number">
                <button class="btn btn-primary" type="submit">Look up</button>
            </form>
            <label class="check batch-toggle"><input type="checkbox" id="scanner-batch" onchange="toggleBatchMode(this.checked)">Scan several products in a row</label>
        </div>
    </div>
    <input type="file" id="barcode-photo-input" accept="image/*" class="hidden" onchange="decodeBarcodePhoto(event)">
    <input type="file" id="label-photo-input" accept="image/*" capture="environment" class="hidden" onchange="onLabelPhotoChosen(event)">
</div>

<input type="file" id="vision-file-input" accept="image/*" class="hidden" onchange="processVisionUpload(event)">
"######
}

pub fn app_shell_html() -> String {
    let mut html = String::with_capacity(65536);
    html.push_str(render_header());
    html.push('\n');
    html.push_str(&render_today_tab());
    html.push('\n');
    html.push_str(render_insights_tab());
    html.push('\n');
    html.push_str(render_progress_tab());
    html.push('\n');
    html.push_str(render_bottom_nav());
    html.push('\n');
    html.push_str(render_overlays());
    html
}
