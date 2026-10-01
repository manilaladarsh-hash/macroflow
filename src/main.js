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
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      let acceptUpdate = false;
      const showUpdate = worker => {
        if (!navigator.serviceWorker.controller || !worker) return;
        let notice = document.getElementById('mf-update-notice');
        if (!notice) {
          notice = document.createElement('aside');
          notice.id = 'mf-update-notice';
          notice.setAttribute('role', 'status');
          notice.innerHTML = '<span>A MacroFlow update is ready.</span><button type="button">Update now</button>';
          document.body.appendChild(notice);
          notice.querySelector('button').addEventListener('click', () => {
            acceptUpdate = true;
            worker.postMessage({ type: 'MACROFLOW_ACTIVATE_UPDATE' });
          });
        }
        notice.hidden = false;
      };
      registration.waiting && showUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && registration.waiting) showUpdate(registration.waiting);
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (acceptUpdate) window.location.reload();
      });
    } catch (_) {
      // Offline use remains optional when service workers are unavailable.
    }
  }, { once: true });
}
