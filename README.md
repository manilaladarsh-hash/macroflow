# MacroFlow

A personal nutrition tracker for logging meals, scanning packaged foods, and tracking calories, macronutrients, weight, and strength progress. Designed for phones first, and works in desktop browsers too.

**[Open MacroFlow](https://manilaladarsh-hash.github.io/macroflow/)**

On a phone, use your browser's **Add to Home Screen** option to open MacroFlow like an app.

## How to use

1. **Set your targets:** open **Settings** to set daily calories and macros, or use **Calculate my targets** to estimate them from your body profile.
2. **Add food:** tap **Search food**, the barcode button, or a meal's **Add**. From the Add food screen you can search, scan a barcode, describe the meal, snap a photo, quick-add calories, or create your own food. Choosing a food opens a review sheet where you set the amount (in servings or grams/ml) and the meal before adding it. The **+** on a search result adds one default serving straight away.
3. **Scan barcodes:** tap the barcode button next to **Search food** and point the camera at the barcode. MacroFlow looks the product up by its exact code in Open Food Facts. If the camera struggles, use **From photo** or **Type number**. If a product isn't found, **Add from label** saves it under My foods with its barcode, so the next scan finds it instantly.
4. **Edit or remove entries:** tap a logged food to change the amount eaten (including fractional servings) with a live nutrition preview, then **Save** — or **Remove** it. Closing the sheet cancels the change.
5. **Review your day:** the big number shows calories eaten (tap the label to switch to calories remaining), and the bar beneath it is split by protein, carbs, and fat. **Vitamins & minerals** at the bottom expands a breakdown; tap a nutrient to see which foods supplied it. Use the week strip at the top to view or log other days — each day's ring shows how close you were to your goal. On an empty day, **Copy meals from the previous day** repeats yesterday's log.
6. **Insights and progress:** **Insights** shows your logging streak, macro split, and a fasting timer. **Progress** tracks weight (with weekly averages and a goal estimate), strength check-ins, and calorie trends.

Diary dates, streaks, and calorie trends follow your browser's local calendar, including daylight saving changes. The app opens today when you return; older records remain accessible through the date bar.

## Barcode scanning

- Live scanning uses the browser's built-in barcode detector where available (for example Chrome on Android) and otherwise a bundled ZXing decoder loaded on demand.
- A code is accepted only when its check digit is valid and it has been read in two frames, which filters out blurry misreads. Retail EAN-13, EAN-8, UPC-A, and UPC-E barcodes are supported.
- Lookups are exact: MacroFlow never substitutes a "similar" product or an AI guess for an unknown barcode.
- The camera needs HTTPS (as on GitHub Pages) or `localhost`, plus camera permission. The flashlight button appears when your camera supports it.

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

An internet connection is needed for externally hosted libraries, online food searches, barcode lookups, and AI features.

## Optional services

- **Gemini (AI):** describe-a-meal, photo estimates, and AI search suggestions need your own Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Paste it in **Settings → AI features**; it is stored only in that browser and is never included in exports. AI results always open for review before anything is logged. You can change the model with an optional `geminiModel` property in `config.js` (default `gemini-2.5-flash`).
- **Food databases:** the app uses Open Food Facts for search and barcodes and supports USDA FoodData Central through an optional `usdaApiKey` property in `window.MACROFLOW_CONFIG`. Built-in foods and manual entries do not require API credentials.
- **Privacy:** AI requests send the relevant meal description or image to Google; online searches and barcode lookups contact the selected food services. A `config.js` served by a website is readable by visitors, so never put a personal key in it on a hosted copy.

## Built with

HTML, CSS, JavaScript, Tailwind CSS, Font Awesome, ZXing, Open Food Facts, USDA FoodData Central, and Gemini. Libraries load from CDNs.

## Regression checks

With Node.js 18 or later, run `node --test tests/*.test.cjs`. These dependency-free suites run the app's real JavaScript in a small DOM harness. They cover portion previews and persistence, repeated logs, legacy ID repair, local dates, and daylight saving boundaries, plus barcode check digits, UPC-E expansion, two-frame scan confirmation, exact barcode lookup, and Open Food Facts unit conversion. They do not test visual layout or a real camera. To exercise different time zones on macOS/Linux, prefix the command with `TZ=America/Toronto` or `TZ=Pacific/Kiritimati`.
