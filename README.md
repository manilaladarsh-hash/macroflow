# MacroFlow

A personal nutrition tracker for logging meals, tracking calories and macronutrients, and reviewing hydration, weight, and strength progress. Designed for desktop and mobile browsers.

**[Open MacroFlow](https://manilaladarsh-hash.github.io/macroflow/)**

## How to use

1. **Set your targets:** open the settings gear to configure your daily nutrition goals and body profile. You can use the built-in calculator to estimate calorie targets.
2. **Log your meals:** search for a food, review its nutrition information and serving, then add it to a meal. Use **Quick Log Calories** for manual entries or **Create Custom Food** to save your own foods.
3. **Adjust portions:** tap a logged food, enter the amount eaten in its displayed unit (including fractional servings), review the live nutrition preview, and select **Save amount**. Closing the label cancels the change. Each repeated log is a separate entry.
4. **Review your day:** check the calorie budget, protein, carbohydrates, fats, and micronutrients. Use the date navigator to view other days.
5. **Track habits and progress:** record water intake, use the fasting timer, and log weight or strength check-ins in the progress section.
6. **Try optional tools:** look up packaged foods by barcode, describe a meal, or scan a food photo. AI tools require Gemini configuration; review estimates before logging them.

Diary dates, streaks, and calorie trends follow your browser’s local calendar, including daylight saving changes. The app opens today when you return; older records remain accessible through the date navigator.

## Back up and restore

In **Settings**:

- **Export Data** downloads a JSON backup of your saved app data.
- **Import Data** loads a previously exported JSON backup. Export your current data first, because importing can replace existing records and settings.
- **Print Clinical Report** opens the browser print dialog, where you can print or save a PDF.

Data is saved in this browser using `localStorage`; there is no account-based sync. Keep backups before clearing browser data or switching devices, and use export/import to move your records.

## Run locally

The app uses `index.html` and `config.js`, with no build step or package installation.

```sh
git clone https://github.com/manilaladarsh-hash/macroflow.git
cd macroflow
python -m http.server 8000
```

With Python 3 installed, open **http://localhost:8000**. On Windows, use `py -m http.server 8000` if `python` is unavailable. Stop the server with **Ctrl+C**.

An internet connection is needed for externally hosted libraries, online food searches, and AI features. Camera scanning requires camera permission and a supported browser on HTTPS or localhost; manual barcode entry is also available.

## Optional services

- **Gemini:** on your local copy, set `geminiApiKey` in `config.js` to your own key to enable AI meal descriptions, food search, and image parsing. Availability depends on the configured models and your account's limits.
- **Food databases:** the app integrates Open Food Facts and supports USDA FoodData Central through an optional `usdaApiKey` property in `window.MACROFLOW_CONFIG`. Built-in foods and manual entries do not require API credentials.
- **Privacy:** AI requests send the relevant meal description or image to Gemini; online searches contact the selected food services. A `config.js` served by a website is readable by visitors, so it does not keep API keys secret. Do not commit personal keys or publish them with a hosted copy; a public deployment needs a backend to keep credentials private.

## Built with

HTML, CSS, JavaScript, Tailwind CSS, Font Awesome, html5-qrcode, Open Food Facts, USDA FoodData Central, and Gemini. Libraries load from CDNs.

## Regression checks

With Node.js 18 or later, run `node --test tests/diary.test.cjs`. This dependency-free suite checks portion previews and persistence, repeated logs, legacy ID repair, local dates, and daylight saving boundaries using a DOM harness; it does not test visual layout. To exercise different time zones on macOS/Linux, prefix the command with `TZ=America/Toronto` or `TZ=Pacific/Kiritimati`.
