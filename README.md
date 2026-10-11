# MacroFlow

A personal nutrition tracker for logging meals, scanning packaged foods, and tracking calories, macronutrients, weight, and strength progress. Designed for phones first, and works in desktop browsers too.

**[Open MacroFlow](https://manilaladarsh-hash.github.io/macroflow/)**

On a phone, use your browser's **Add to Home Screen** option to open MacroFlow like an app.

## How to use

1. **Set your targets:** open **Settings** to set daily calories and macros, or use **Calculate my targets** to estimate them from your body profile.
2. **Add food:** tap **Search food**, the barcode button, or a meal's **Add**. From the Add food screen you can search, scan a barcode, describe the meal, snap a photo, quick-add calories, or create your own food. Choosing a food opens a review sheet where you set the amount (in servings or grams/ml) and the meal before adding it. The **+** on a search result adds one default serving straight away.
3. **Scan barcodes:** tap the barcode button next to **Search food** and point the camera at the barcode. MacroFlow looks the product up by its exact code in Open Food Facts. If the camera struggles, use **From photo** or **Type number**. If a product isn't found, **Add from label** saves it under My foods with its barcode, so the next scan finds it instantly.
4. **Edit or remove entries:** tap a logged food to change the amount eaten (including fractional servings) with a live nutrition preview, move it to another meal, **Log again**, or remove it. Closing the sheet cancels the change.
5. **Save meals you repeat:** when a meal has two or more foods, tap **Save as a meal**. It then appears under **My meals** in Add food, where one tap logs every item.
6. **Exercise and water:** log workouts under **Exercise** (calories are estimated from your weight, or enter your watch's number) and tap **+250 ml** / **+500 ml** under **Water**. Exercise calories are only added to your daily goal if you turn that on in **Settings → Exercise** — leave it off if your calorie target already accounts for your activity level.
7. **Review your day:** the big number shows calories eaten (tap the label to switch to calories remaining), and the bar beneath it is split by protein, carbs, and fat. **Vitamins & minerals** at the bottom expands a breakdown; tap a nutrient to see which foods supplied it. Use the week strip at the top to view or log other days — each day's ring shows how close you were to your goal. On an empty day, **Copy meals from the previous day** repeats yesterday's log.
8. **Insights and progress:** **Insights** shows your logging streak, a 7-day report (average intake against your goal, days on target, protein, exercise, steps and energy balance), your macro split, and a fasting timer. **Progress** tracks weight (with weekly averages and a goal estimate), strength check-ins, and calorie trends.

Diary dates, streaks, and calorie trends follow your browser's local calendar, including daylight saving changes. The app opens today when you return; older records remain accessible through the date bar.

## Health data (Google Health, Fitbit, Google Fit)

Google is not currently onboarding new apps to the Google Health API (the successor to the Fitbit Web API), and its data scopes require a security review, so MacroFlow cannot sign in to Google Health directly yet. Instead, import the data you can download yourself:

1. Download your data with [Google Takeout](https://takeout.google.com) (select Google Health, Fitbit, or Fit), or export a CSV from your health app.
2. In **Settings → Health data**, choose **Import health data** and pick the `.zip`, `.csv`, or `.json` files.
3. Check the preview — date range, what was found, and whether the calorie numbers are total burned or active only — then **Import**.

Steps, calories burned and weight are imported. Total calories burned appear as your energy balance on Insights; active calories are logged as exercise; weights go into Progress. Column detection is heuristic because export formats vary, so check the preview. **Remove imported** undoes an import without touching your food log.

## Barcode scanning

- Live scanning uses the browser's built-in barcode detector where available (for example Chrome on Android) and otherwise ZXing-C++ compiled to WebAssembly, loaded on demand (with the JavaScript ZXing port as a last resort). Each scan alternates between the on-screen frame, a wide band, and the whole picture, so off-centre and rotated codes are still read.
- A code is accepted only when its check digit is valid and it has been read in two frames, which filters out blurry misreads. Retail EAN-13, EAN-8, UPC-A, and UPC-E barcodes are supported.
- Lookups are exact: MacroFlow never substitutes a "similar" product or an AI guess for an unknown barcode.
- The camera needs HTTPS (as on GitHub Pages) or `localhost`, plus camera permission. Flashlight, zoom, and switch-camera buttons appear when your device supports them; the chosen camera is remembered (useful on phones whose default lens can't focus up close). Hold the phone about 15–20 cm away.

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

After the first visit, MacroFlow works offline: a service worker keeps the app and its libraries cached, so you can open it and log food without a connection. Online food searches, barcode lookups, and AI features need a connection.

## Optional services

- **Gemini (AI):** describe-a-meal, photo estimates, and AI search suggestions need your own Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Paste it in **Settings → AI features**; it is stored only in that browser and is never included in exports. AI results always open for review before anything is logged. You can change the model with an optional `geminiModel` property in `config.js` (default `gemini-2.5-flash`).
- **Food databases:** the app uses Open Food Facts for search and barcodes and supports USDA FoodData Central through an optional `usdaApiKey` property in `window.MACROFLOW_CONFIG`. Built-in foods and manual entries do not require API credentials.
- **Privacy:** AI requests send the relevant meal description or image to Google; online searches and barcode lookups contact the selected food services. A `config.js` served by a website is readable by visitors, so never put a personal key in it on a hosted copy.

## Built with

HTML, CSS, JavaScript, Tailwind CSS, Font Awesome, Geist, ZXing-C++ (via the `barcode-detector` WebAssembly ponyfill), ZXing, fflate, Open Food Facts, USDA FoodData Central, and Gemini. Libraries load from CDNs and are cached for offline use.

## Regression checks

With Node.js 18 or later, run `node --test tests/*.test.cjs`. These dependency-free suites run the app's real JavaScript in a small DOM harness. They cover portion previews and persistence, repeated logs, legacy ID repair, local dates, and daylight saving boundaries, plus barcode check digits, UPC-E expansion, two-frame scan confirmation, exact barcode lookup, Open Food Facts unit conversion, health-data import (Fitbit JSON, Google Fit CSV, generic CSV), exercise goals, saved meals, moving entries, water, and the weekly report. They do not test visual layout or a real camera. To exercise different time zones on macOS/Linux, prefix the command with `TZ=America/Toronto` or `TZ=Pacific/Kiritimati`.
