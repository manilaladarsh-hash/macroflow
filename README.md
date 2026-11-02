# MacroFlow

A personal nutrition tracker for logging meals, scanning packaged foods, and tracking calories, macronutrients, weight, and strength progress. Designed for phones first, and works in desktop browsers too.

**[Open MacroFlow](https://manilaladarsh-hash.github.io/macroflow/)**

On a phone, use your browser's **Add to Home Screen** option to open MacroFlow like an app.

## How to use

1. **Set your targets:** open **Settings** to set daily calories and macros, or use **Calculate my targets** to estimate them from your body profile.
2. **Read your rings:** Today opens with four activity-style rings — calories (green, outside), protein (pink), carbs (blue) and fat (yellow, inside). A full ring means you hit that target; going past it draws a second lap. Beside the rings are the numbers, and underneath is the day's equation: goal − food (+ exercise, if you turned that on) = calories left. Tap **Eaten** to switch the big number to calories remaining.
3. **Log fast:**
   - The colourful **Search**, **Scan**, **Photo AI** and **Quick add** buttons sit right under the rings, and the green **+** in the bottom bar opens the same options (plus describe-a-meal, exercise, water and weight) from any tab, with a meal picker and your last few foods.
   - **Quick log** shows your saved meals and recent foods; its **+** logs the same portion again in one tap (with **Undo**). Tap **to Lunch** to change which meal it adds to.
   - An empty meal offers **Same as yesterday** when you ate that meal the day before, and otherwise your usual food for it.
4. **Add food:** from the Add food screen you can search, scan a barcode, describe the meal, snap a photo, quick-add calories, or create your own food. Choosing a food opens a review sheet where you set the amount (in servings or grams/ml) and the meal before adding it. The **+** on a search result adds one default serving straight away.
5. **Scan barcodes:** point the camera at the barcode. MacroFlow looks the product up by its exact code in Open Food Facts and USDA's branded foods database. If a product isn't found, **Snap the nutrition label (AI)** reads the label into a new food for you to check and save, and the next scan finds it instantly. If the bars won't read, **Read the numbers with AI** reads the digits under the barcode, or use **From photo** / **Type number**. Tick **Scan several products in a row** to add products one after another without closing the camera.
6. **Edit or remove entries:** each meal is a card with a colour stripe showing its protein / carbs / fat split, and every food has an icon for its type. Tap a food to change the amount eaten (including fractional servings) with a live nutrition preview, move it to another meal, **Log again**, or remove it. Closing the sheet cancels the change.
7. **Save meals you repeat:** when a meal has two or more foods, tap the bookmark on its card. It then appears in **Quick log** and under **My meals** in Add food, where one tap logs every item.
8. **Exercise and water:** log workouts under **Exercise** (calories are estimated from your weight, or enter your watch's number) and tap **+250 ml** / **+500 ml** under **Water** — each glass is 250 ml of your target. Exercise calories are only added to your daily goal if you turn that on in **Settings → Exercise** — leave it off if your calorie target already accounts for your activity level.
9. **Other days and micronutrients:** use the week strip at the top to view or log other days — each day's ring shows how close you were to your goal. On an empty day, **Copy meals from the previous day** repeats yesterday's log. **Vitamins & minerals** at the bottom of Today expands a breakdown; tap a nutrient to see which foods supplied it.
10. **Insights:** choose 7, 14 or 30 days to see:
    - **Calories** as bars split by protein, carbs and fat against your goal;
    - **Eaten vs burned** for finished days with burn data from Apple Health or an import;
    - **Protein** by day against your target;
    - your average **Macro split** next to your target split;
    - **Steps**;
    - a 7-day summary, your logging streak and a fasting timer.

    Tap a bar to open that day.
11. **Progress:** your **weight trend** is a smoothed line through your weigh-ins (10% per day, so one heavy day doesn't swing it), with the weekly rate and your goal line once you use the goal estimator. Progress also has strength check-ins and daily calories, with a 7-day average line and a 4-week heat map.

Diary dates, streaks, and calorie trends follow your browser's local calendar, including daylight saving changes. The app opens today when you return; older records remain accessible through the date bar.

## Health data (Google Health, Apple Health, Fitbit)

### On iPhone: sync from Apple Health with a Shortcut

Websites can't read Apple Health, and Google isn't onboarding new apps to its Google Health API, so MacroFlow can't sign in to either directly. But the Google Health app (which syncs Fitbit devices such as the Fitbit Air) writes steps, active calories, workouts and weight to Apple Health, and an Apple **Shortcut** can read Apple Health and hand the numbers to MacroFlow with one tap.

Build the Shortcut once (about 5 minutes):

1. In the **Google Health** app, open **Connections → Apple Health**, tap **Get started** and allow steps, active calories and weight. In Apple's Health app, check that Steps, Active Energy and Weight have data.
2. Open **Shortcuts**, tap **+**, and name the shortcut **MacroFlow Health**.
3. Add **Find Health Samples**: Type is **Steps**, Start Date is in the last **7 days**, **Group By: Day**, **Sort by: Start Date**.
4. Add **Repeat with Each**. Inside it, add a **Text** action with: `steps;` + *Repeat Item → Start Date* (date format **ISO 8601**) + `;` + *Repeat Item → Value* + a space + *Repeat Item → Unit*.
5. Repeat steps 3–4 for **Active Energy** (`active;`) and **Weight** (`weight;`). With an Apple Watch, also add **Resting Energy** (`resting;`).
6. After the last **End Repeat**, add a **Text** action: `MacroFlow Health v1` on the first line, then each **Repeat Results** on its own line.
7. Add **Copy to Clipboard**.
8. Make it automatic: **Automation → + → Time of Day**, pick a time, choose **Run Immediately**, and select **MacroFlow Health**. Add a few times a day (for example 7 am, 1 pm, 9 pm). Each run replaces whatever was on your clipboard.

Then open MacroFlow and tap **Sync Apple Health** in the Exercise section (or **Settings → Health data → Sync from Apple Health**), and tap **Paste** when iOS asks. That one tap is the only manual step: iOS doesn't let websites read Apple Health or the clipboard by themselves. The copied text looks like this:

```
MacroFlow Health v1
steps;2026-10-15T00:00:00-04:00;8432 count
active;2026-10-15T00:00:00-04:00;512.3 kcal
resting;2026-10-15T00:00:00-04:00;1750 kcal
weight;2026-10-15T00:00:00-04:00;78.4 kg
```

Active energy becomes that day's exercise entry. Total burned is active + resting energy; Fitbit and Google Health don't send resting energy to Apple Health, so when it's missing MacroFlow estimates it from your **Settings** profile (Mifflin-St Jeor, the same idea as Fitbit's own total; today counts only the hours so far). Total burned feeds the energy balance on Insights, which only counts finished days. Set your age, height, sex and weight in Settings so the estimate fits you. Steps show on Today and weights go to Progress. Syncing again replaces the synced days; your own exercise entries and weigh-ins are never overwritten, and **Undo** on the confirmation reverses a sync. If clipboard access is blocked, paste the text into the box that appears. The same text saved as a file also works with **Import health files**. The setup guide is also in the app (**Settings → Health data → Set up the Shortcut**).

### From files (Google Takeout, Fitbit, Google Fit, CSV)

1. Download your data with [Google Takeout](https://takeout.google.com) (select Google Health, Fitbit, or Fit), or export a CSV from your health app.
2. In **Settings → Health data**, choose **Import health files** and pick the `.zip`, `.csv`, or `.json` files.
3. Check the preview — date range, what was found, and whether the calorie numbers are total burned or active only — then **Import**.

Column detection is heuristic because export formats vary, so check the preview. **Remove imported** removes imported and synced data without touching your food log or manual entries.

## Barcode scanning

- Live scanning uses the browser's built-in barcode detector where available (for example Chrome on Android) and otherwise ZXing-C++ compiled to WebAssembly, loaded on demand (with the JavaScript ZXing port as a last resort). Each scan alternates between the on-screen frame, a wide band, and the whole picture, so off-centre and rotated codes are still read.
- A code is accepted only when its check digit is valid and it has been read in two frames, which filters out blurry misreads. Retail EAN-13, EAN-8, UPC-A, and UPC-E barcodes are supported.
- Lookups are exact: My foods, then Open Food Facts, then USDA FoodData Central's branded foods (matched by the exact GTIN), then a copy saved from your last scan for offline use. MacroFlow never substitutes a "similar" product or an AI guess for an unknown barcode.
- **AI help (needs a Gemini key):** for an unknown product, photograph the nutrition label (and optionally the front of the pack). The AI copies the printed numbers into **Create a food**, flags readings that don't add up (calories versus protein, carbs and fat, or more than the serving can hold), and saves nothing until you check and save. When the bars are too blurry, **Read the numbers with AI** reads the printed digits; they must pass the barcode check digit and you confirm them before the lookup.
- **Batch scanning:** with **Scan several products in a row** ticked, each product shows a card with **Add** (one serving), **Adjust** (amount and meal) or **Skip**, and the camera keeps running. The same product is ignored for 3 seconds so it isn't added twice.
- The camera needs HTTPS (as on GitHub Pages) or `localhost`, plus camera permission. Flashlight, zoom, and switch-camera buttons appear when your device supports them; the chosen camera is remembered. On iPhone Pro models MacroFlow picks the multi-lens back camera, which switches to the macro lens up close; use the switch-camera button if another lens works better. Hold the phone about 15–20 cm away.

## Back up and restore

In **Settings → Your data**:

- **Export** downloads a JSON backup of your saved app data.
- **Import** loads a previously exported JSON backup after you confirm. Export your current data first, because importing can replace existing records and settings.
- **Print / save PDF report** opens the browser print dialog for the current day.

Data is saved in this browser using `localStorage`; there is no account-based sync. Keep backups before clearing browser data or switching devices, and use export/import to move your records.

## Run locally

The app uses `index.html` and `config.js`, with no build step or package installation.

```sh
git clone https://github.com/manilaladarsh-hash/macroflow.git
cd macroflow
python -m http.server 8000
```

With Python 3 installed, open **http://localhost:8000**. On Windows, use `py -m http.server 8000` if `python` is unavailable. Stop the server with **Ctrl+C**.

After the first visit, MacroFlow works offline: a service worker keeps the app, its libraries and fonts cached, so you can open it and log food without a connection. Online food searches, barcode lookups, and AI features need a connection.

## Optional services

- **Gemini (AI):** describe-a-meal, photo estimates, AI search suggestions, and the scanner's label and digit reading need your own Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Paste it in **Settings → AI features**; it is stored only in that browser and is never included in exports. AI results always open for review before anything is logged. MacroFlow uses `gemini-flash-latest` and falls back to `gemini-3.8-flash` or `gemini-2.5-flash` if your key can't use it; set an optional `geminiModel` property in `config.js` to force one model.
- **Food databases:** Open Food Facts for search and barcodes, plus USDA FoodData Central. Open Food Facts' search server is often overloaded, so a failed search is retried once and then answered from USDA instead. Without a key, USDA is used through its shared `DEMO_KEY` (a few requests an hour); a free personal key from [api.data.gov](https://fdc.nal.usda.gov/api-key-signup) in **Settings → Food databases** lifts that limit and adds USDA results to every search. Built-in foods and manual entries do not require API credentials.
- **Privacy:** AI requests send the relevant meal description or image to Google; online searches and barcode lookups contact the selected food services. A `config.js` served by a website is readable by visitors, so never put a personal key in it on a hosted copy.

## Built with

HTML, CSS, JavaScript, Tailwind CSS, Font Awesome, Geist, ZXing-C++ (via the `barcode-detector` WebAssembly ponyfill), ZXing, fflate, Open Food Facts, USDA FoodData Central, and Gemini. Libraries load from CDNs and are cached for offline use.

## Regression checks

With Node.js 18 or later, run `node --test tests/*.test.cjs`. These dependency-free suites run the app's real JavaScript in a small DOM harness. They cover portion previews and persistence, repeated logs, legacy ID repair, local dates, and daylight saving boundaries, plus barcode check digits, UPC-E expansion, two-frame scan confirmation, exact barcode lookup, Open Food Facts unit conversion, health-data import (Fitbit JSON, Google Fit CSV, generic CSV), Apple Health Shortcut sync (formats from different locales, replace-on-resync, undo, manual weigh-ins kept), USDA GTIN matching, AI label checks, the Gemini model fallback, batch scanning, exercise goals, saved meals, moving entries, water, the weekly report, the calorie and macro rings (including the second lap past a target), food icons, Quick log with undo, repeating yesterday's meal, the + sheet, the weight trend, and the Insights charts. They do not test visual layout or a real camera. To exercise different time zones on macOS/Linux, prefix the command with `TZ=America/Toronto` or `TZ=Pacific/Kiritimati`.
