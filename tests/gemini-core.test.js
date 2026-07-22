import { describe, expect, it, vi } from 'vitest';

import {
    BARCODE_OCR_SCHEMA,
    DEFAULT_GEMINI_MODEL,
    GEMINI_ERROR_CODES,
    NUTRITION_SCAN_SCHEMA,
    buildBarcodeOcrInteraction,
    buildGeminiInteractionRequest,
    extractGeminiInteractionText,
    parseGeminiStructuredJson,
    parseNutritionScanInteraction,
    requestGeminiInteraction,
    validateBarcodeOcrResult
} from '../src/gemini-core.js';
import { MICRO_NUTRIENT_KEYS, RICH_NUTRIENT_KEYS } from '../src/state-core.js';

const VALID_UPC = '036000291452';
const SECOND_VALID_EAN = '4006381333931';

function nullRecord(keys) {
    return Object.fromEntries(keys.map(key => [key, null]));
}

function nutritionResult() {
    return {
        foods: [{
            name: 'Greek yogurt',
            brand: null,
            servingSize: 170,
            servingUnit: 'g',
            calories: 120,
            protein: 16,
            carbs: 8,
            fats: 2,
            micros: { ...nullRecord(MICRO_NUTRIENT_KEYS), calcium: 180 },
            otherNutrients: { ...nullRecord(RICH_NUTRIENT_KEYS), totalSugar: 6 },
            confidence: 0.91,
            warnings: ['Added sugar is not visible.']
        }],
        confidence: 0.91,
        warnings: []
    };
}

describe('Gemini Interactions request construction', () => {
    it('builds a schema-constrained image and text request without embedding a key', () => {
        const request = buildGeminiInteractionRequest({
            imageBase64: 'data:image/png;base64,YWJjZA==',
            prompt: 'Inspect this image.',
            schema: NUTRITION_SCAN_SCHEMA
        });

        expect(request.model).toBe(DEFAULT_GEMINI_MODEL);
        expect(request.input).toEqual([
            { type: 'image', mime_type: 'image/png', data: 'YWJjZA==' },
            { type: 'text', text: 'Inspect this image.' }
        ]);
        expect(request.response_format).toEqual([{
            type: 'text',
            mime_type: 'application/json',
            schema: NUTRITION_SCAN_SCHEMA
        }]);
        expect(JSON.stringify(request)).not.toContain('AIza');
    });

    it('keeps barcode OCR output as a candidates array', () => {
        const request = buildBarcodeOcrInteraction({ imageBase64: 'YWJjZA==' });
        expect(request.response_format[0].schema).toBe(BARCODE_OCR_SCHEMA);
        expect(request.response_format[0].schema.properties.candidates.type).toBe('array');
        expect(request.input[1].text).toContain('its own candidates[] item');
    });
});

describe('Interaction output extraction and structured parsing', () => {
    it('uses output_text and the last model output step', () => {
        expect(extractGeminiInteractionText({ output_text: '{"ok":true}' })).toBe('{"ok":true}');
        expect(extractGeminiInteractionText({
            steps: [
                { type: 'model_output', content: [{ type: 'text', text: '{"old":true}' }] },
                { type: 'user_input', content: [{ type: 'text', text: 'ignored' }] },
                { type: 'model_output', content: [{ type: 'text', text: '{"new":true}' }] }
            ]
        })).toBe('{"new":true}');
    });

    it('parses fenced structured output and preserves unknown nutrients as null', () => {
        const result = nutritionResult();
        const parsed = parseNutritionScanInteraction({
            steps: [{
                type: 'model_output',
                content: [{ type: 'text', text: `\`\`\`json\n${JSON.stringify(result)}\n\`\`\`` }]
            }]
        });
        expect(parsed.foods[0].micros.vitd).toBeNull();
        expect(parsed.foods[0].otherNutrients.addedSugar).toBeNull();
        expect(parsed.foods[0].otherNutrients.totalSugar).toBe(6);
    });

    it('rejects malformed structured output with a stable code', () => {
        expect(() => parseGeminiStructuredJson('not valid {json]')).toThrowError(
            expect.objectContaining({ code: GEMINI_ERROR_CODES.MALFORMED })
        );
    });
});

describe('Gemini request cancellation and API errors', () => {
    it('honors an external AbortSignal and reports cancellation', async () => {
        const external = new AbortController();
        const fetchImpl = vi.fn((_url, options) => new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
                const error = new Error('aborted');
                error.name = 'AbortError';
                reject(error);
            }, { once: true });
        }));
        const pending = requestGeminiInteraction({
            apiKey: 'AIza-test-only',
            request: { model: DEFAULT_GEMINI_MODEL, input: 'test' },
            fetchImpl,
            signal: external.signal,
            timeoutMs: 5_000
        });
        external.abort();

        await expect(pending).rejects.toMatchObject({ code: GEMINI_ERROR_CODES.CANCELLED });
        expect(fetchImpl).toHaveBeenCalledOnce();
    });

    it('maps quota responses without exposing the key', async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: false,
            status: 429,
            json: async () => ({ error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded.' } })
        }));

        const failure = requestGeminiInteraction({
            apiKey: 'AIza-secret-value',
            request: { model: DEFAULT_GEMINI_MODEL, input: 'test' },
            fetchImpl
        });
        await expect(failure).rejects.toMatchObject({
            code: GEMINI_ERROR_CODES.QUOTA,
            retryable: true
        });
        await failure.catch(error => {
            expect(JSON.stringify(error)).not.toContain('AIza-secret-value');
            expect(error.message).not.toContain('AIza-secret-value');
        });
    });
});

describe('AI barcode OCR safety', () => {
    it('keeps one independently checksum-valid candidate confirmation-only', () => {
        const result = validateBarcodeOcrResult({
            candidates: [
                { value: '036000291453', format: 'UPC_A', confidence: 0.99, warnings: [] },
                { value: VALID_UPC, format: 'UPC_A', confidence: 0.88, warnings: [] },
                { value: VALID_UPC, format: 'UPC_A', confidence: 0.8, warnings: ['duplicate read'] },
                { value: '96385074', format: null, confidence: 0.9, warnings: ['symbology unknown'] },
                { value: `${VALID_UPC}${SECOND_VALID_EAN}`, format: null, confidence: 0.95, warnings: [] }
            ],
            warnings: []
        });

        expect(result.candidates).toHaveLength(1);
        expect(result.suggestion.lookupCode).toBe(VALID_UPC);
        expect(result.decision).toBe('confirm-only');
        expect(result.autoAccept).toBe(false);
        expect(result.suggestion.confirmationRequired).toBe(true);
        expect(result.rejectedCount).toBe(3);
    });

    it('marks multiple distinct valid candidates ambiguous and selects neither', () => {
        const result = validateBarcodeOcrResult({
            candidates: [
                { value: VALID_UPC, format: 'UPC_A', confidence: 0.9, warnings: [] },
                { value: SECOND_VALID_EAN, format: 'EAN_13', confidence: 0.89, warnings: [] }
            ],
            warnings: ['Two barcodes are visible.']
        });

        expect(result.candidates).toHaveLength(2);
        expect(result.ambiguous).toBe(true);
        expect(result.suggestion).toBeNull();
        expect(result.decision).toBe('ambiguous');
        expect(result.autoAccept).toBe(false);
    });
});
