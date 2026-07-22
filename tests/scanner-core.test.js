import { describe, expect, it } from 'vitest';

import {
    CONSENSUS_DECISIONS,
    areEquivalentGtins,
    canonicalizeGtin,
    cleanGtin,
    computeGtinCheckDigit,
    createEvidenceTracker,
    createGtinIdentity,
    deduplicateFrameEvidence,
    evaluateBarcodeConsensus,
    evaluateEvidence,
    expandUpcE,
    extractGtinIdentity,
    formatDisplayCode,
    groupBarcodeCandidates,
    hasValidGtinChecksum,
    parseGs1Ai01,
    parseGs1DigitalLink,
    parseBarcodeCandidate,
    resolveVideoFrameId
} from '../src/scanner-core.js';

const PRIMARY_UPC = '036000291452';
const COMPETING_EAN = '4006381333931';
const GS1_GTIN = '09506000134352';
const UPC_E = '01234565';
const EXPANDED_UPC_E = '012345000065';

function observation({
    rawValue = PRIMARY_UPC,
    format = 'UPC_A',
    decoderFamily = 'native',
    frameId = 'frame-1',
    observedAt = 0,
    region = 'roi',
    origin = 'decoder',
    goodQuality = true
} = {}) {
    return {
        rawValue,
        format,
        decoderFamily,
        frameId,
        observedAt,
        region,
        origin,
        goodQuality
    };
}

describe('GTIN cleanup, checksum, and identity', () => {
    it('cleans printed separators and validates all supported GTIN lengths', () => {
        expect(cleanGtin('0 36000-29145 2')).toBe(PRIMARY_UPC);
        expect(hasValidGtinChecksum('96385074')).toBe(true);
        expect(hasValidGtinChecksum(PRIMARY_UPC)).toBe(true);
        expect(hasValidGtinChecksum(COMPETING_EAN)).toBe(true);
        expect(hasValidGtinChecksum(GS1_GTIN)).toBe(true);
        expect(hasValidGtinChecksum('036000291453')).toBe(false);
        expect(hasValidGtinChecksum('12345')).toBe(false);
    });

    it('computes the correct check digit without accepting unsupported body lengths', () => {
        expect(computeGtinCheckDigit('03600029145')).toBe(2);
        expect(computeGtinCheckDigit('400638133393')).toBe(1);
        expect(computeGtinCheckDigit('12345')).toBeNull();
    });

    it('canonicalizes UPC-A, leading-zero EAN-13, and GTIN-14 to one identity', () => {
        expect(canonicalizeGtin(PRIMARY_UPC, 'UPC_A')).toBe('00036000291452');
        expect(canonicalizeGtin(`0${PRIMARY_UPC}`, 'EAN_13')).toBe('00036000291452');
        expect(canonicalizeGtin('00036000291452', 'ITF_14')).toBe('00036000291452');
        expect(areEquivalentGtins(PRIMARY_UPC, `0${PRIMARY_UPC}`, 'UPC_A', 'EAN_13')).toBe(true);
        expect(areEquivalentGtins(PRIMARY_UPC, COMPETING_EAN)).toBe(false);
    });

    it('rejects incompatible lengths and checksum-invalid identities', () => {
        expect(createGtinIdentity(PRIMARY_UPC, 'EAN_13')).toBeNull();
        expect(createGtinIdentity('036000291453', 'UPC_A')).toBeNull();
    });
});

describe('UPC-E expansion and equivalence', () => {
    it('expands a valid eight-digit UPC-E to UPC-A', () => {
        expect(expandUpcE(UPC_E)).toBe(EXPANDED_UPC_E);
        expect(hasValidGtinChecksum(EXPANDED_UPC_E)).toBe(true);
        expect(canonicalizeGtin(UPC_E, 'UPC_E')).toBe('00012345000065');
        expect(areEquivalentGtins(UPC_E, EXPANDED_UPC_E, 'UPC_E', 'UPC_A')).toBe(true);
    });

    it('rejects unsupported number systems and bad UPC-E check digits', () => {
        expect(expandUpcE('21234565')).toBeNull();
        expect(canonicalizeGtin('01234564', 'UPC_E')).toBeNull();
    });
});

describe('scanner integration interface', () => {
    it('parses stable candidates and formats the exact observed digits for confirmation', () => {
        expect(parseBarcodeCandidate(PRIMARY_UPC, 'upc_a')).toMatchObject({
            displayCode: PRIMARY_UPC,
            formattedDisplayCode: '0 36000 29145 2',
            lookupCode: PRIMARY_UPC,
            canonical: '00036000291452',
            format: 'UPC_A',
            checksumValid: true
        });
        expect(formatDisplayCode(UPC_E, 'upc_e')).toBe('0 123456 5');
        expect(parseBarcodeCandidate('036000291453', 'UPC_A')).toBeNull();
    });

    it('maps detailed consensus to auto, confirm, pending, and reject decisions', () => {
        const autoEvidence = [
            observation({ decoderFamily: 'native', frameId: 'f1', observedAt: 0 }),
            observation({ decoderFamily: 'zxing', frameId: 'f1', observedAt: 100 }),
            observation({ decoderFamily: 'native', frameId: 'f2', observedAt: 200 })
        ];
        expect(evaluateEvidence(autoEvidence).decision).toBe('auto');
        expect(evaluateEvidence([observation()]).decision).toBe('pending');
        expect(evaluateEvidence([observation({ region: 'wide' })]).decision).toBe('confirm');
        expect(evaluateEvidence([observation({ rawValue: '036000291453' })]).decision).toBe('reject');
    });

    it('tracks bounded session evidence and resets without crossing sessions', () => {
        let now = 0;
        const tracker = createEvidenceTracker({ now: () => now });
        expect(tracker.submit(observation({ frameId: 'f1', observedAt: now })).decision).toBe('pending');
        now = 100;
        expect(tracker.submit(observation({ decoderFamily: 'zxing', frameId: 'f1', observedAt: now })).decision).toBe('pending');
        now = 200;
        expect(tracker.submitEvidence(observation({ frameId: 'f2', observedAt: now })).decision).toBe('auto');
        tracker.reset();
        expect(tracker.getEvidence()).toEqual([]);
        expect(tracker.evaluate(now).decision).toBe('reject');
    });
});

describe('GS1 extraction', () => {
    it('parses fixed-length AI 01 from human-readable and symbology-prefixed payloads', () => {
        expect(parseGs1Ai01(`(01)${GS1_GTIN}(10)ABC`)?.canonical).toBe(GS1_GTIN);
        expect(parseGs1Ai01(`]C101${GS1_GTIN}10ABC`)?.canonical).toBe(GS1_GTIN);
        expect(parseGs1Ai01(`]d201${GS1_GTIN}\u001d10ABC`)?.canonical).toBe(GS1_GTIN);
        expect(parseGs1Ai01('(01)09506000134353')).toBeNull();
    });

    it('parses explicit Digital Link AI 01 paths and query parameters', () => {
        expect(parseGs1DigitalLink(`https://id.gs1.org/01/${GS1_GTIN}/10/ABC`)?.canonical).toBe(GS1_GTIN);
        expect(parseGs1DigitalLink(`https://example.test/product?01=${GS1_GTIN}`)?.canonical).toBe(GS1_GTIN);
    });

    it('ignores arbitrary QR URLs and non-GTIN Code 128/39 values', () => {
        expect(parseGs1DigitalLink('https://example.test/products/09506000134352')).toBeNull();
        expect(extractGtinIdentity('SHIPMENT-123456', 'CODE_128')).toBeNull();
        expect(extractGtinIdentity(PRIMARY_UPC, 'CODE_39')).toBeNull();
        expect(extractGtinIdentity('https://example.test/036000291452', 'QR_CODE')).toBeNull();
    });

    it('accepts explicit GS1 payloads from QR, Data Matrix, and GS1-128', () => {
        expect(extractGtinIdentity(`https://brand.test/01/${GS1_GTIN}`, 'QR_CODE')).toMatchObject({
            canonical: GS1_GTIN,
            format: 'QR_CODE',
            syntax: 'digital-link'
        });
        expect(extractGtinIdentity(`]d201${GS1_GTIN}`, 'DATA_MATRIX')).toMatchObject({
            canonical: GS1_GTIN,
            format: 'DATA_MATRIX',
            syntax: 'gs1-ai-01'
        });
        expect(extractGtinIdentity(`01${GS1_GTIN}`, 'GS1_128')?.canonical).toBe(GS1_GTIN);
    });
});

describe('real frame identity and de-duplication', () => {
    it('prefers presented-frame metadata and has no timer fallback', () => {
        expect(resolveVideoFrameId({ presentedFrames: 42, mediaTime: 1.25 }, {
            currentTime: 1.25,
            frameHash: 'abc',
            streamId: 'rear'
        })).toBe('rear:presented:42');
        expect(resolveVideoFrameId({ mediaTime: 1.25 })).toBe('media:1250000');
        expect(resolveVideoFrameId(null, { currentTime: 1.25 })).toBe('current:1250000');
        expect(resolveVideoFrameId(null, { frameHash: 'abc' })).toBe('hash:abc');
        expect(resolveVideoFrameId(null)).toBeNull();
    });

    it('deduplicates repeated reports by one family on one actual frame', () => {
        const evidence = [
            observation({ decoderFamily: 'native', frameId: 'f1', observedAt: 0, goodQuality: false }),
            observation({ decoderFamily: 'native', frameId: 'f1', observedAt: 20, goodQuality: true }),
            observation({ decoderFamily: 'zxing', frameId: 'f1', observedAt: 30 }),
            observation({ decoderFamily: 'native', frameId: 'f2', observedAt: 40 })
        ];
        const deduplicated = deduplicateFrameEvidence(evidence);
        expect(deduplicated).toHaveLength(3);
        expect(deduplicated[0].goodQuality).toBe(true);
    });
});

describe('candidate grouping', () => {
    it('groups equivalent UPC-E and UPC-A observations under one canonical candidate', () => {
        const groups = groupBarcodeCandidates([
            observation({ rawValue: UPC_E, format: 'UPC_E', frameId: 'f1' }),
            observation({ rawValue: EXPANDED_UPC_E, format: 'UPC_A', decoderFamily: 'zxing', frameId: 'f2' })
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0].canonical).toBe('00012345000065');
        expect(groups[0].decoderFamilies).toEqual(['native', 'zxing']);
        expect(groups[0].frameIds).toEqual(['f1', 'f2']);
    });

    it('drops checksum-invalid observations and sorts valid contenders by evidence', () => {
        const groups = groupBarcodeCandidates([
            observation({ rawValue: '036000291453' }),
            observation({ frameId: 'f1' }),
            observation({ frameId: 'f2' }),
            observation({ rawValue: COMPETING_EAN, format: 'EAN_13', frameId: 'f3' })
        ]);
        expect(groups).toHaveLength(2);
        expect(groups[0].canonical).toBe('00036000291452');
        expect(groups[0].observationCount).toBe(2);
    });
});

describe('accuracy-first consensus', () => {
    it('auto-accepts only matching evidence from two families and two real frames', () => {
        const result = evaluateBarcodeConsensus([
            observation({ decoderFamily: 'native', frameId: 'f1', observedAt: 0, goodQuality: true }),
            observation({ decoderFamily: 'zxing', frameId: 'f1', observedAt: 100, goodQuality: true }),
            observation({ decoderFamily: 'native', frameId: 'f2', observedAt: 250, goodQuality: false })
        ]);
        expect(result.decision).toBe(CONSENSUS_DECISIONS.AUTO_ACCEPT);
        expect(result.accepted).toBe(true);
        expect(result.winner?.canonical).toBe('00036000291452');
    });

    it('does not count frozen-frame repeats as separate evidence', () => {
        const result = evaluateBarcodeConsensus([
            observation({ decoderFamily: 'native', frameId: 'frozen', observedAt: 0 }),
            observation({ decoderFamily: 'native', frameId: 'frozen', observedAt: 300 }),
            observation({ decoderFamily: 'native', frameId: 'frozen', observedAt: 600 }),
            observation({ decoderFamily: 'zxing', frameId: 'frozen', observedAt: 900 })
        ]);
        expect(result.decision).toBe(CONSENSUS_DECISIONS.COLLECTING);
        expect(result.winner?.decoderObservationCount).toBe(2);
        expect(result.winner?.frameIds).toEqual(['frozen']);
    });

    it('makes four-frame single-family evidence confirm-only after 800 ms', () => {
        const result = evaluateBarcodeConsensus([
            observation({ frameId: 'f1', observedAt: 0 }),
            observation({ frameId: 'f2', observedAt: 300 }),
            observation({ frameId: 'f3', observedAt: 600 }),
            observation({ frameId: 'f4', observedAt: 900 })
        ]);
        expect(result.decision).toBe(CONSENSUS_DECISIONS.CONFIRM_ONLY);
        expect(result.accepted).toBe(false);
        expect(result.requiresConfirmation).toBe(true);
    });

    it('keeps single-family evidence collecting before the time threshold', () => {
        const result = evaluateBarcodeConsensus([
            observation({ frameId: 'f1', observedAt: 0 }),
            observation({ frameId: 'f2', observedAt: 200 }),
            observation({ frameId: 'f3', observedAt: 400 }),
            observation({ frameId: 'f4', observedAt: 700 })
        ]);
        expect(result.decision).toBe(CONSENSUS_DECISIONS.COLLECTING);
        expect(result.requiresConfirmation).toBe(false);
    });

    it('makes wide-frame and AI-only candidates confirm-only, never automatic', () => {
        const wideResult = evaluateBarcodeConsensus([
            observation({ decoderFamily: 'native', frameId: 'f1', observedAt: 0, region: 'wide' }),
            observation({ decoderFamily: 'zxing', frameId: 'f1', observedAt: 100, region: 'wide' }),
            observation({ decoderFamily: 'native', frameId: 'f2', observedAt: 250, region: 'wide' })
        ]);
        const aiResult = evaluateBarcodeConsensus([
            observation({ decoderFamily: 'gemini-ai', frameId: 'photo-1', origin: 'ai' })
        ]);
        expect(wideResult.decision).toBe(CONSENSUS_DECISIONS.CONFIRM_ONLY);
        expect(wideResult.accepted).toBe(false);
        expect(aiResult.decision).toBe(CONSENSUS_DECISIONS.CONFIRM_ONLY);
        expect(aiResult.accepted).toBe(false);
    });

    it('blocks automatic acceptance while another valid candidate has two observations', () => {
        const result = evaluateBarcodeConsensus([
            observation({ decoderFamily: 'native', frameId: 'p1', observedAt: 0 }),
            observation({ decoderFamily: 'zxing', frameId: 'p1', observedAt: 100 }),
            observation({ decoderFamily: 'native', frameId: 'p2', observedAt: 200 }),
            observation({ rawValue: COMPETING_EAN, format: 'EAN_13', decoderFamily: 'native', frameId: 'c1', observedAt: 250 }),
            observation({ rawValue: COMPETING_EAN, format: 'EAN_13', decoderFamily: 'zxing', frameId: 'c2', observedAt: 300 })
        ]);
        expect(result.decision).toBe(CONSENSUS_DECISIONS.COLLECTING);
        expect(result.accepted).toBe(false);
        expect(result.competingCandidate?.observationCount).toBe(2);
        expect(result.reasons).toContain('competing-candidate');
    });

    it('requires an explicitly good ROI frame for automatic acceptance', () => {
        const result = evaluateBarcodeConsensus([
            observation({ decoderFamily: 'native', frameId: 'f1', observedAt: 0, goodQuality: false }),
            observation({ decoderFamily: 'zxing', frameId: 'f1', observedAt: 100, goodQuality: false }),
            observation({ decoderFamily: 'native', frameId: 'f2', observedAt: 200, goodQuality: false })
        ]);
        expect(result.decision).toBe(CONSENSUS_DECISIONS.COLLECTING);
        expect(result.reasons).toContain('no-good-quality-roi-frame');
    });
});
