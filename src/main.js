import '@fortawesome/fontawesome-free/css/all.min.css';
import '@fontsource/plus-jakarta-sans/300.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import Quagga from '@ericblade/quagga2';
import * as ZXingBrowser from '@zxing/browser';
import * as ZXingLibrary from '@zxing/library';
import * as scannerCore from './scanner-core.js';
import * as stateCore from './state-core.js';
import * as geminiCore from './gemini-core.js';
import { installFeatureHub } from './feature-hub.js';
import { installUiEnhancements } from './ui-enhancements.js';
import './app.css';

window.Quagga = Quagga;
window.ZXingBrowser = { ...ZXingLibrary, ...ZXingBrowser };
window.MacroFlowScannerCore = scannerCore;
window.MacroFlowStateCore = stateCore;
window.MacroFlowGeminiCore = geminiCore;

const install = () => {
  window.MacroFlowUi = installUiEnhancements(window.MacroFlowApp || {});
  window.MacroFlowFeatures = installFeatureHub({
    ...(window.MacroFlowApp || {}),
    stateCore
  });
  const socialImage = document.querySelector('meta[property="og:image"]');
  if (socialImage) socialImage.content = new URL('/og.png', window.location.origin).href;
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();

if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined), { once: true });
}
