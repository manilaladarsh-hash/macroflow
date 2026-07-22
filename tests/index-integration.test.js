import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function inlineClassicScripts(source) {
  return [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=|\btype\s*=\s*["']module["']/i.test(attributes))
    .map(match => match[2]);
}

describe('browser integration shell', () => {
  it('keeps every inline classic script syntactically valid', () => {
    const scripts = inlineClassicScripts(html);
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) expect(() => new Function(script)).not.toThrow();
  });

  it('loads decoders locally and exposes the installable shell', () => {
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('src="/src/main.js"');
    expect(html).not.toMatch(/cdn\.jsdelivr|cdnjs\.cloudflare|unpkg\.com/i);
    expect(html).not.toContain('src="config.js"');
  });

  it('never delegates exact barcode product lookup to AI', () => {
    expect(html).not.toContain('queryGeminiBarcodeSearch');
    expect(html).toContain('queryOpenFoodFactsBarcode');
    expect(html).toContain('queryUSDABarcode');
  });

  it('keeps AI OCR and one-reader photo results confirmation-only', () => {
    expect(html).toContain('offerScannerCandidateConfirmation');
    expect(html).toContain("outcome: 'ai-ocr-user-confirmed'");
    expect(html).toContain("outcome: 'photo-user-confirmed'");
  });
});
