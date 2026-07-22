/**
 * Pure barcode identity and consensus helpers.
 *
 * This module intentionally has no DOM, camera, storage, or network access. Camera
 * adapters must supply a real frame ID obtained from `requestVideoFrameCallback`
 * metadata (or one of the media-time/hash fallbacks handled below). Wall-clock
 * timer buckets are not frame identities and must never be passed as `frameId`.
 */

export const GTIN_LENGTHS = Object.freeze([8, 12, 13, 14]);

export const CONSENSUS_DECISIONS = Object.freeze({
    NONE: 'none',
    COLLECTING: 'collecting',
    CONFIRM_ONLY: 'confirm-only',
    AUTO_ACCEPT: 'auto-accept'
});

/**
 * @typedef {'roi'|'wide'} ScanRegion
 */

/**
 * @typedef {'decoder'|'ai'} EvidenceOrigin
 */

/**
 * Quality already measured by the camera adapter for one presented frame.
 * Numeric measurements remain optional because camera implementations use
 * different scales; `good` is the explicit threshold decision used here.
 *
 * @typedef {Object} FrameQuality
 * @property {boolean} [good]
 * @property {boolean} [sharpEnough]
 * @property {number} [sharpness]
 * @property {number} [contrast]
 * @property {number} [glare]
 */

/**
 * One observation emitted by one decoder for one actually presented frame.
 *
 * @typedef {Object} ScannerEvidence
 * @property {string} rawValue Raw decoder output; never silently replace this in the UI.
 * @property {string} [format] Decoder format name such as `UPC_A` or `EAN_13`.
 * @property {string} decoderFamily Stable independent-engine name, for example `native`, `zxing`, or `quagga`.
 * @property {string|number|null} [frameId] Real frame identity, never a wall-clock timer bucket.
 * @property {number} observedAt Observation timestamp in milliseconds.
 * @property {ScanRegion} [region='roi'] Whether the result came from the aiming ROI or a wide/full-frame pass.
 * @property {EvidenceOrigin} [origin='decoder'] AI/OCR evidence can only produce a confirmation suggestion.
 * @property {boolean} [goodQuality] Explicit good-quality decision for this frame.
 * @property {FrameQuality} [quality] Optional detailed quality measurements.
 * @property {string} [observationId] Optional source-owned identifier used only when no frame ID exists.
 */

/**
 * A validated and normalized GTIN identity.
 *
 * @typedef {Object} GtinIdentity
 * @property {string} canonical Zero-padded GTIN-14 used only for identity/equality.
 * @property {string} normalizedValue UPC-E expanded to UPC-A; otherwise the validated GTIN.
 * @property {string} observedValue Digits that were encoded or extracted from the source.
 * @property {string} format Normalized format name.
 * @property {boolean} expandedFromUpcE
 * @property {'direct'|'gs1-ai-01'|'digital-link'} syntax
 */

/**
 * Matching observations grouped under one canonical GTIN.
 *
 * @typedef {Object} CandidateGroup
 * @property {string} canonical
 * @property {string} displayValue
 * @property {string} format
 * @property {'direct'|'gs1-ai-01'|'digital-link'} syntax
 * @property {ScannerEvidence[]} observations Frame-de-duplicated evidence.
 * @property {number} observationCount All observations, including confirm-only AI evidence.
 * @property {number} decoderObservationCount Non-AI decoder observations.
 * @property {string[]} decoderFamilies Independent non-AI decoder families.
 * @property {string[]} frameIds Distinct real frame IDs from non-AI decoders.
 * @property {number} firstObservedAt
 * @property {number} lastObservedAt
 * @property {number} durationMs
 * @property {boolean} hasGoodQualityRoi
 * @property {boolean} wideOnly
 * @property {boolean} aiOnly
 */

/**
 * Result of evaluating all currently active candidate evidence.
 *
 * @typedef {Object} ConsensusResult
 * @property {'none'|'collecting'|'confirm-only'|'auto-accept'} decision
 * @property {boolean} accepted
 * @property {boolean} requiresConfirmation
 * @property {CandidateGroup|null} winner
 * @property {CandidateGroup|null} competingCandidate
 * @property {CandidateGroup[]} candidates
 * @property {string[]} reasons Stable reason codes suitable for UI-state mapping.
 */

/**
 * Remove display separators and return digits only.
 * Extraction from structured GS1 payloads should use `extractGtinIdentity` so
 * an AI identifier such as `(01)` is not accidentally treated as GTIN digits.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function cleanGtin(value) {
    return String(value ?? '').replace(/\D/g, '');
}

/**
 * Normalize format spellings used by BarcodeDetector, ZXing, and Quagga.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeBarcodeFormat(value) {
    const compact = String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    const aliases = {
        UPCA: 'UPC_A',
        UPC: 'UPC_A',
        UPCE: 'UPC_E',
        EAN13: 'EAN_13',
        EAN: 'EAN_13',
        EAN8: 'EAN_8',
        ITF14: 'ITF_14',
        ITF: 'ITF_14',
        GS1DATABAR: 'GS1_DATABAR',
        GS1DATABAROMNIDIRECTIONAL: 'GS1_DATABAR',
        GS1DATABARLIMITED: 'GS1_DATABAR',
        GS1DATABAREXPANDED: 'GS1_DATABAR',
        DATABAR: 'GS1_DATABAR',
        DATABARLIMITED: 'GS1_DATABAR',
        DATABAREXPANDED: 'GS1_DATABAR',
        RSS14: 'GS1_DATABAR',
        RSSLIMITED: 'GS1_DATABAR',
        RSSEXPANDED: 'GS1_DATABAR',
        GS1128: 'GS1_128',
        EAN128: 'GS1_128',
        CODE128: 'CODE_128',
        QRCODE: 'QR_CODE',
        QR: 'QR_CODE',
        DATAMATRIX: 'DATA_MATRIX',
        CODE39: 'CODE_39'
    };

    return aliases[compact] || compact;
}

/**
 * Calculate the check digit for a GTIN body.
 *
 * @param {unknown} body GTIN without its check digit.
 * @returns {number|null}
 */
export function computeGtinCheckDigit(body) {
    const digits = cleanGtin(body);
    if (![7, 11, 12, 13].includes(digits.length)) return null;

    let sum = 0;
    let multiplier = 3;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
        sum += Number(digits[index]) * multiplier;
        multiplier = multiplier === 3 ? 1 : 3;
    }
    return (10 - (sum % 10)) % 10;
}

/**
 * Validate an EAN-8, UPC-A, EAN-13, or GTIN-14 check digit.
 * UPC-E must first be expanded because its displayed eight digits do not use
 * EAN-8 weighting.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function hasValidGtinChecksum(value) {
    const digits = cleanGtin(value);
    if (!GTIN_LENGTHS.includes(digits.length)) return false;
    const expected = computeGtinCheckDigit(digits.slice(0, -1));
    return expected !== null && expected === Number(digits.at(-1));
}

/**
 * Expand the complete eight-digit UPC-E representation (number system, six
 * compressed digits, check digit) into UPC-A. Number systems other than 0 and
 * 1 are intentionally rejected rather than guessed.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
export function expandUpcE(value) {
    const code = cleanGtin(value);
    if (code.length !== 8 || !['0', '1'].includes(code[0])) return null;

    const numberSystem = code[0];
    const [a, b, c, d, e, f] = code.slice(1, 7).split('');
    const checkDigit = code[7];

    if (['0', '1', '2'].includes(f)) {
        return `${numberSystem}${a}${b}${f}0000${c}${d}${e}${checkDigit}`;
    }
    if (f === '3') {
        return `${numberSystem}${a}${b}${c}00000${d}${e}${checkDigit}`;
    }
    if (f === '4') {
        return `${numberSystem}${a}${b}${c}${d}00000${e}${checkDigit}`;
    }
    return `${numberSystem}${a}${b}${c}${d}${e}0000${f}${checkDigit}`;
}

/**
 * @param {string} digits
 * @param {string} format
 * @returns {boolean}
 */
function isLengthCompatibleWithFormat(digits, format) {
    if (!format) return GTIN_LENGTHS.includes(digits.length);
    if (format === 'UPC_E') return digits.length === 8;
    if (format === 'UPC_A') return digits.length === 12 || (digits.length === 13 && digits.startsWith('0'));
    if (format === 'EAN_13') return digits.length === 13;
    if (format === 'EAN_8') return digits.length === 8;
    if (format === 'ITF_14') return digits.length === 14;
    if (format === 'GS1_DATABAR') return GTIN_LENGTHS.includes(digits.length);
    return GTIN_LENGTHS.includes(digits.length);
}

/**
 * Build a canonical identity for a direct numeric GTIN.
 *
 * @param {unknown} value
 * @param {unknown} [format='']
 * @returns {GtinIdentity|null}
 */
export function createGtinIdentity(value, format = '') {
    const observedValue = cleanGtin(value);
    const normalizedFormat = normalizeBarcodeFormat(format);
    if (!isLengthCompatibleWithFormat(observedValue, normalizedFormat)) return null;

    let normalizedValue = observedValue;
    let expandedFromUpcE = false;

    if (normalizedFormat === 'UPC_E') {
        normalizedValue = expandUpcE(observedValue) || '';
        expandedFromUpcE = true;
    } else if (normalizedFormat === 'UPC_A' && observedValue.length === 13) {
        normalizedValue = observedValue.slice(1);
    }

    if (!normalizedValue || !hasValidGtinChecksum(normalizedValue)) return null;

    return {
        canonical: normalizedValue.padStart(14, '0'),
        normalizedValue,
        observedValue,
        format: normalizedFormat,
        expandedFromUpcE,
        syntax: 'direct'
    };
}

/**
 * Return a zero-padded GTIN-14 identity, or `null` for unsupported/invalid data.
 *
 * @param {unknown} value
 * @param {unknown} [format='']
 * @returns {string|null}
 */
export function canonicalizeGtin(value, format = '') {
    return createGtinIdentity(value, format)?.canonical || null;
}

/**
 * Compare UPC-E, UPC-A, leading-zero EAN-13, and GTIN-14 representations.
 *
 * @param {unknown} left
 * @param {unknown} right
 * @param {unknown} [leftFormat='']
 * @param {unknown} [rightFormat='']
 * @returns {boolean}
 */
export function areEquivalentGtins(left, right, leftFormat = '', rightFormat = '') {
    const leftCanonical = canonicalizeGtin(left, leftFormat);
    const rightCanonical = canonicalizeGtin(right, rightFormat);
    return Boolean(leftCanonical && rightCanonical && leftCanonical === rightCanonical);
}

export const gtinsEquivalent = areEquivalentGtins;

/**
 * Extract a checksum-valid GTIN from GS1 Application Identifier 01. Supported
 * inputs include human-readable `(01)`, raw `01`, and symbology-prefixed values
 * such as `]C1` (GS1-128) and `]d2` (GS1 Data Matrix).
 *
 * @param {unknown} value
 * @returns {GtinIdentity|null}
 */
export function parseGs1Ai01(value) {
    const original = String(value ?? '').trim();
    if (!original) return null;

    const withoutSymbologyIdentifier = original.replace(/^\][A-Za-z0-9]{2}/, '');
    let gtin = '';

    const humanReadableMarker = withoutSymbologyIdentifier.match(/\(\s*01\s*\)/);
    if (humanReadableMarker?.index !== undefined) {
        const remainder = withoutSymbologyIdentifier.slice(humanReadableMarker.index + humanReadableMarker[0].length);
        const fixedField = remainder.match(/^(?:[\s-]*\d){14}/)?.[0] || '';
        gtin = cleanGtin(fixedField).slice(0, 14);
    } else {
        const compact = withoutSymbologyIdentifier.replace(/[\s-]/g, '');
        if (/^01\d{14}/.test(compact)) gtin = compact.slice(2, 16);
    }

    const identity = createGtinIdentity(gtin, 'ITF_14');
    return identity ? { ...identity, syntax: 'gs1-ai-01' } : null;
}

/**
 * Extract the explicit AI 01 path/query value from an HTTP(S) GS1 Digital Link.
 * A normal QR URL, even one containing unrelated digits, returns `null`.
 *
 * @param {unknown} value
 * @returns {GtinIdentity|null}
 */
export function parseGs1DigitalLink(value) {
    const text = String(value ?? '').trim();
    if (!/^https?:\/\//i.test(text)) return null;

    try {
        const url = new URL(text);
        let gtin = url.searchParams.get('01') || '';
        if (!gtin) {
            const segments = url.pathname
                .split('/')
                .filter(Boolean)
                .map(segment => decodeURIComponent(segment));
            const aiIndex = segments.findIndex(segment => segment === '01');
            if (aiIndex >= 0) gtin = segments[aiIndex + 1] || '';
        }

        if (!/^\d{14}$/.test(gtin)) return null;
        const identity = createGtinIdentity(gtin, 'ITF_14');
        return identity ? { ...identity, syntax: 'digital-link' } : null;
    } catch (_) {
        return null;
    }
}

const DIRECT_GTIN_FORMATS = new Set([
    '',
    'UPC_A',
    'UPC_E',
    'EAN_13',
    'EAN_8',
    'ITF_14',
    'GS1_DATABAR'
]);

/**
 * Safely extract a GTIN according to the decoder's format. QR, Data Matrix, and
 * Code 128 must contain an explicit GS1 AI 01 or Digital Link; arbitrary QR URLs
 * and non-GTIN Code 128/39 strings are intentionally ignored.
 *
 * @param {unknown} value
 * @param {unknown} [format='']
 * @returns {GtinIdentity|null}
 */
export function extractGtinIdentity(value, format = '') {
    const normalizedFormat = normalizeBarcodeFormat(format);
    const digitalLinkIdentity = parseGs1DigitalLink(value);
    if (digitalLinkIdentity) {
        return normalizedFormat ? { ...digitalLinkIdentity, format: normalizedFormat } : digitalLinkIdentity;
    }

    const aiIdentity = parseGs1Ai01(value);
    if (aiIdentity) return normalizedFormat ? { ...aiIdentity, format: normalizedFormat } : aiIdentity;

    if (!DIRECT_GTIN_FORMATS.has(normalizedFormat)) return null;
    return createGtinIdentity(value, normalizedFormat);
}

/**
 * Integration-friendly barcode candidate returned to camera/photo adapters.
 *
 * @typedef {Object} BarcodeCandidate
 * @property {string} rawValue Original decoder payload.
 * @property {string} displayCode Exact extracted digits, without silent UPC/EAN conversion.
 * @property {string} formattedDisplayCode Human-readable grouping of `displayCode`.
 * @property {string} lookupCode UPC-E expanded for exact product lookup; otherwise the validated GTIN.
 * @property {string} canonical Zero-padded GTIN-14 identity.
 * @property {string} format Normalized decoder format.
 * @property {'direct'|'gs1-ai-01'|'digital-link'} syntax
 * @property {boolean} checksumValid
 */

/**
 * Format the encoded digits for user confirmation while keeping every digit in
 * its original order. This is presentation-only and must never be sent to a
 * product API without parsing/canonicalization.
 *
 * @param {unknown} value
 * @param {unknown} [format='']
 * @returns {string}
 */
export function formatDisplayCode(value, format = '') {
    const identity = extractGtinIdentity(value, format);
    const digits = identity?.observedValue || cleanGtin(value);
    const normalizedFormat = identity?.format || normalizeBarcodeFormat(format);

    if (digits.length === 8 && normalizedFormat === 'UPC_E') {
        return `${digits[0]} ${digits.slice(1, 7)} ${digits[7]}`;
    }
    if (digits.length === 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    if (digits.length === 12) return `${digits[0]} ${digits.slice(1, 6)} ${digits.slice(6, 11)} ${digits[11]}`;
    if (digits.length === 13) return `${digits[0]} ${digits.slice(1, 7)} ${digits.slice(7)}`;
    if (digits.length === 14) return `${digits.slice(0, 2)} ${digits.slice(2, 8)} ${digits.slice(8)}`;
    return digits;
}

/**
 * Parse a decoder result into the small stable interface used by scanner UI and
 * exact-match lookup code.
 *
 * @param {unknown} rawValue
 * @param {unknown} [format='']
 * @returns {BarcodeCandidate|null}
 */
export function parseBarcodeCandidate(rawValue, format = '') {
    const identity = extractGtinIdentity(rawValue, format);
    if (!identity) return null;
    return {
        rawValue: String(rawValue ?? '').trim(),
        displayCode: identity.observedValue,
        formattedDisplayCode: formatDisplayCode(identity.observedValue, identity.format),
        lookupCode: identity.normalizedValue,
        canonical: identity.canonical,
        format: identity.format,
        syntax: identity.syntax,
        checksumValid: true
    };
}

/**
 * Resolve a stable ID for an actual video presentation. Preference order is the
 * browser-provided presentation counter, media time, video currentTime, then a
 * captured-frame hash. No wall-clock fallback exists by design.
 *
 * @param {{presentedFrames?: number, mediaTime?: number}|null|undefined} metadata
 * @param {{currentTime?: number, frameHash?: string, streamId?: string|number}} [fallbacks]
 * @returns {string|null}
 */
export function resolveVideoFrameId(metadata, fallbacks = {}) {
    const streamPrefix = fallbacks.streamId === undefined || fallbacks.streamId === null
        ? ''
        : `${String(fallbacks.streamId)}:`;

    if (Number.isFinite(metadata?.presentedFrames)) {
        return `${streamPrefix}presented:${Math.trunc(metadata.presentedFrames)}`;
    }
    if (Number.isFinite(metadata?.mediaTime)) {
        return `${streamPrefix}media:${Math.round(metadata.mediaTime * 1_000_000)}`;
    }
    if (Number.isFinite(fallbacks.currentTime)) {
        return `${streamPrefix}current:${Math.round(fallbacks.currentTime * 1_000_000)}`;
    }
    if (String(fallbacks.frameHash || '').trim()) {
        return `${streamPrefix}hash:${String(fallbacks.frameHash).trim()}`;
    }
    return null;
}

/** @param {ScannerEvidence} evidence */
function getEvidenceTimestamp(evidence) {
    const timestamp = Number(evidence?.observedAt ?? evidence?.timestamp ?? evidence?.at);
    return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

/** @param {ScannerEvidence} evidence */
function getEvidenceFrameId(evidence) {
    const value = evidence?.frameId;
    if (value === null || value === undefined || String(value).trim() === '') return null;
    return String(value);
}

/** @param {ScannerEvidence} evidence */
function getDecoderFamily(evidence) {
    return String(evidence?.decoderFamily || evidence?.source || evidence?.decoder || 'unknown')
        .trim()
        .toLowerCase() || 'unknown';
}

/** @param {ScannerEvidence} evidence */
function isAiEvidence(evidence) {
    const origin = String(evidence?.origin || evidence?.sourceKind || '').trim().toLowerCase();
    const family = getDecoderFamily(evidence);
    return origin === 'ai' || /(^|[-_])(ai|ocr|gemini)($|[-_])/.test(family);
}

/** @param {ScannerEvidence} evidence */
function getEvidenceRegion(evidence) {
    const region = String(evidence?.region || '').trim().toLowerCase();
    return ['wide', 'full', 'full-frame', 'full_frame'].includes(region) ? 'wide' : 'roi';
}

/** @param {ScannerEvidence} evidence */
function isGoodQualityEvidence(evidence) {
    return evidence?.goodQuality === true || evidence?.quality?.good === true;
}

/**
 * Remove repeat reports of the same canonical candidate by the same decoder on
 * the same actual frame. Independent decoders on that frame remain separate,
 * while evidence without a real frame ID is preserved but cannot satisfy frame
 * thresholds.
 *
 * @param {ScannerEvidence[]} evidence
 * @returns {ScannerEvidence[]}
 */
export function deduplicateFrameEvidence(evidence) {
    const output = [];
    const indexesByKey = new Map();

    for (const observation of Array.isArray(evidence) ? evidence : []) {
        const identity = extractGtinIdentity(observation?.rawValue ?? observation?.value ?? observation?.code, observation?.format);
        const frameId = getEvidenceFrameId(observation);
        if (!identity || !frameId) {
            output.push(observation);
            continue;
        }

        const key = `${identity.canonical}|${getDecoderFamily(observation)}|${frameId}`;
        const existingIndex = indexesByKey.get(key);
        if (existingIndex === undefined) {
            indexesByKey.set(key, output.length);
            output.push(observation);
            continue;
        }

        const existing = output[existingIndex];
        const existingScore = (getEvidenceRegion(existing) === 'roi' ? 2 : 0) + (isGoodQualityEvidence(existing) ? 1 : 0);
        const newScore = (getEvidenceRegion(observation) === 'roi' ? 2 : 0) + (isGoodQualityEvidence(observation) ? 1 : 0);
        if (newScore > existingScore) output[existingIndex] = observation;
    }

    return output;
}

/**
 * @param {Array<{observation: ScannerEvidence, identity: GtinIdentity}>} entries
 * @returns {{displayValue: string, format: string, syntax: 'direct'|'gs1-ai-01'|'digital-link'}}
 */
function chooseCandidateDisplay(entries) {
    const ranked = [...entries].sort((left, right) => {
        const score = ({ observation, identity }) =>
            (isAiEvidence(observation) ? 0 : 4) +
            (getEvidenceRegion(observation) === 'roi' ? 2 : 0) +
            (identity.format === 'UPC_A' && identity.observedValue.length === 12 ? 2 : 0) +
            (identity.format ? 1 : 0);
        return score(right) - score(left);
    });
    const winner = ranked[0];
    return {
        displayValue: winner?.identity.observedValue || '',
        format: winner?.identity.format || '',
        syntax: winner?.identity.syntax || 'direct'
    };
}

/**
 * Validate, frame-de-duplicate, canonicalize, and group observations. Groups are
 * sorted deterministically by observation count, independent families, frames,
 * then canonical value.
 *
 * @param {ScannerEvidence[]} evidence
 * @param {{windowMs?: number, now?: number}} [options]
 * @returns {CandidateGroup[]}
 */
export function groupBarcodeCandidates(evidence, options = {}) {
    const windowMs = Number.isFinite(options.windowMs) ? Math.max(0, options.windowMs) : 4_000;
    const input = Array.isArray(evidence) ? evidence : [];
    const finiteTimestamps = input.map(getEvidenceTimestamp).filter(Number.isFinite);
    const referenceTime = Number.isFinite(options.now)
        ? Number(options.now)
        : (finiteTimestamps.length ? Math.max(...finiteTimestamps) : Number.NaN);
    const activeEvidence = input.filter(observation => {
        const observedAt = getEvidenceTimestamp(observation);
        return !Number.isFinite(referenceTime) || !Number.isFinite(observedAt) || observedAt >= referenceTime - windowMs;
    });
    const deduplicated = deduplicateFrameEvidence(activeEvidence);
    const groupedEntries = new Map();

    for (const observation of deduplicated) {
        const identity = extractGtinIdentity(observation?.rawValue ?? observation?.value ?? observation?.code, observation?.format);
        if (!identity) continue;
        const entries = groupedEntries.get(identity.canonical) || [];
        entries.push({ observation, identity });
        groupedEntries.set(identity.canonical, entries);
    }

    const groups = [];
    for (const [canonical, entries] of groupedEntries) {
        const observations = entries.map(entry => entry.observation);
        const decoderEntries = entries.filter(entry => !isAiEvidence(entry.observation));
        const decoderFamilies = [...new Set(decoderEntries.map(entry => getDecoderFamily(entry.observation)))].sort();
        const frameIds = [...new Set(decoderEntries.map(entry => getEvidenceFrameId(entry.observation)).filter(Boolean))].sort();
        const timestamps = observations.map(getEvidenceTimestamp).filter(Number.isFinite);
        const firstObservedAt = timestamps.length ? Math.min(...timestamps) : 0;
        const lastObservedAt = timestamps.length ? Math.max(...timestamps) : 0;
        const display = chooseCandidateDisplay(entries);

        groups.push({
            canonical,
            displayValue: display.displayValue,
            format: display.format,
            syntax: display.syntax,
            observations,
            observationCount: observations.length,
            decoderObservationCount: decoderEntries.length,
            decoderFamilies,
            frameIds,
            firstObservedAt,
            lastObservedAt,
            durationMs: Math.max(0, lastObservedAt - firstObservedAt),
            hasGoodQualityRoi: decoderEntries.some(entry =>
                getEvidenceFrameId(entry.observation) &&
                getEvidenceRegion(entry.observation) === 'roi' &&
                isGoodQualityEvidence(entry.observation)
            ),
            wideOnly: decoderEntries.length > 0 && decoderEntries.every(entry => getEvidenceRegion(entry.observation) === 'wide'),
            aiOnly: decoderEntries.length === 0
        });
    }

    return groups.sort((left, right) =>
        right.decoderObservationCount - left.decoderObservationCount ||
        right.observationCount - left.observationCount ||
        right.decoderFamilies.length - left.decoderFamilies.length ||
        right.frameIds.length - left.frameIds.length ||
        left.canonical.localeCompare(right.canonical)
    );
}

/**
 * Apply the accuracy-first scanner consensus contract.
 *
 * Automatic acceptance requires all of the following:
 * - checksum-valid canonical GTIN (invalid evidence never enters a group),
 * - at least three non-AI decoder observations,
 * - at least two independent decoder families,
 * - at least two distinct real frame IDs,
 * - at least one good-quality ROI observation,
 * - no other checksum-valid candidate with two or more observations.
 *
 * A single decoder family can only propose confirmation after four distinct
 * frames spanning at least 800 ms. Wide-only and AI-only candidates always need
 * confirmation and can never contribute to automatic acceptance.
 *
 * @param {ScannerEvidence[]} evidence
 * @param {{windowMs?: number, now?: number}} [options]
 * @returns {ConsensusResult}
 */
export function evaluateBarcodeConsensus(evidence, options = {}) {
    const candidates = groupBarcodeCandidates(evidence, options);
    const winner = candidates[0] || null;
    if (!winner) {
        return {
            decision: CONSENSUS_DECISIONS.NONE,
            accepted: false,
            requiresConfirmation: false,
            winner: null,
            competingCandidate: null,
            candidates,
            reasons: ['no-valid-candidate']
        };
    }

    const competingCandidate = candidates.find(candidate =>
        candidate.canonical !== winner.canonical && candidate.observationCount >= 2
    ) || null;
    const reasons = [];

    if (winner.decoderObservationCount < 3) reasons.push('insufficient-observations');
    if (winner.decoderFamilies.length < 2) reasons.push('insufficient-decoder-families');
    if (winner.frameIds.length < 2) reasons.push('insufficient-real-frames');
    if (!winner.hasGoodQualityRoi) reasons.push('no-good-quality-roi-frame');
    if (competingCandidate) reasons.push('competing-candidate');
    if (winner.wideOnly) reasons.push('wide-frame-only');
    if (winner.aiOnly) reasons.push('ai-only');

    const canAutoAccept =
        winner.decoderObservationCount >= 3 &&
        winner.decoderFamilies.length >= 2 &&
        winner.frameIds.length >= 2 &&
        winner.hasGoodQualityRoi &&
        !winner.wideOnly &&
        !winner.aiOnly &&
        !competingCandidate;

    if (canAutoAccept) {
        return {
            decision: CONSENSUS_DECISIONS.AUTO_ACCEPT,
            accepted: true,
            requiresConfirmation: false,
            winner,
            competingCandidate: null,
            candidates,
            reasons: []
        };
    }

    const singleFamilyConfirmation =
        winner.decoderFamilies.length === 1 &&
        winner.decoderObservationCount >= 4 &&
        winner.frameIds.length >= 4 &&
        winner.durationMs >= 800;
    const forceConfirmation = winner.aiOnly || winner.wideOnly || singleFamilyConfirmation;

    if (!competingCandidate && forceConfirmation) {
        return {
            decision: CONSENSUS_DECISIONS.CONFIRM_ONLY,
            accepted: false,
            requiresConfirmation: true,
            winner,
            competingCandidate: null,
            candidates,
            reasons
        };
    }

    return {
        decision: CONSENSUS_DECISIONS.COLLECTING,
        accepted: false,
        requiresConfirmation: false,
        winner,
        competingCandidate,
        candidates,
        reasons
    };
}

/**
 * Smaller decision shape intended for the live-scanner integration boundary.
 *
 * @typedef {Object} EvidenceDecision
 * @property {'auto'|'confirm'|'pending'|'reject'} decision
 * @property {BarcodeCandidate|null} candidate
 * @property {ConsensusResult} consensus
 * @property {string[]} reasons
 */

/** @param {CandidateGroup|null} group */
function candidateFromGroup(group) {
    if (!group) return null;
    // A grouped GS1 QR/Data Matrix candidate stores its extracted GTIN for display,
    // so reparsing that bare value as QR/Data Matrix would correctly reject it.
    // Build from the already-validated group while retaining the source format.
    const identity = createGtinIdentity(group.displayValue, group.format) || createGtinIdentity(group.displayValue);
    if (!identity) return null;
    const candidate = {
        rawValue: group.displayValue,
        displayCode: identity.observedValue,
        formattedDisplayCode: formatDisplayCode(identity.observedValue),
        lookupCode: identity.normalizedValue,
        canonical: group.canonical,
        format: group.format,
        syntax: group.syntax,
        checksumValid: true
    };
    return {
        ...candidate,
        canonical: group.canonical,
        evidence: {
            observationCount: group.observationCount,
            decoderObservationCount: group.decoderObservationCount,
            decoderFamilies: [...group.decoderFamilies],
            frameIds: [...group.frameIds],
            durationMs: group.durationMs,
            hasGoodQualityRoi: group.hasGoodQualityRoi,
            wideOnly: group.wideOnly,
            aiOnly: group.aiOnly
        }
    };
}

/**
 * Evaluate evidence and map the detailed consensus result onto the four scanner
 * integration decisions.
 *
 * @param {ScannerEvidence[]} evidence
 * @param {{windowMs?: number, now?: number}} [options]
 * @returns {EvidenceDecision}
 */
export function evaluateEvidence(evidence, options = {}) {
    const consensus = evaluateBarcodeConsensus(evidence, options);
    const decisionMap = {
        [CONSENSUS_DECISIONS.AUTO_ACCEPT]: 'auto',
        [CONSENSUS_DECISIONS.CONFIRM_ONLY]: 'confirm',
        [CONSENSUS_DECISIONS.COLLECTING]: 'pending',
        [CONSENSUS_DECISIONS.NONE]: 'reject'
    };
    return {
        decision: decisionMap[consensus.decision],
        candidate: candidateFromGroup(consensus.winner),
        consensus,
        reasons: [...consensus.reasons]
    };
}

/**
 * Create one bounded evidence tracker for one scanner session. Call `reset` on
 * close/retry/camera-switch; the camera adapter should create a fresh tracker for
 * the next session so stale observations cannot cross session boundaries.
 *
 * @param {{windowMs?: number, maxEvidence?: number, now?: () => number}} [options]
 * @returns {{
 *   submitEvidence: (evidence: ScannerEvidence) => EvidenceDecision,
 *   submit: (evidence: ScannerEvidence) => EvidenceDecision,
 *   evaluate: (now?: number) => EvidenceDecision,
 *   reset: () => void,
 *   getEvidence: () => ScannerEvidence[]
 * }}
 */
export function createEvidenceTracker(options = {}) {
    const windowMs = Number.isFinite(options.windowMs) ? Math.max(0, options.windowMs) : 4_000;
    const maxEvidence = Number.isFinite(options.maxEvidence) ? Math.max(8, Math.trunc(options.maxEvidence)) : 200;
    const nowProvider = typeof options.now === 'function' ? options.now : () => Date.now();
    /** @type {ScannerEvidence[]} */
    let evidence = [];

    const prune = now => {
        evidence = evidence
            .filter(item => {
                const observedAt = getEvidenceTimestamp(item);
                return !Number.isFinite(observedAt) || observedAt >= now - windowMs;
            })
            .slice(-maxEvidence);
    };

    const evaluate = (now = nowProvider()) => {
        const evaluatedAt = Number.isFinite(now) ? Number(now) : nowProvider();
        prune(evaluatedAt);
        return evaluateEvidence(evidence, { windowMs, now: evaluatedAt });
    };

    const submitEvidence = submitted => {
        const observedAt = getEvidenceTimestamp(submitted);
        const normalized = {
            ...submitted,
            rawValue: String(submitted?.rawValue ?? submitted?.raw ?? submitted?.value ?? submitted?.code ?? '').trim(),
            decoderFamily: String(submitted?.decoderFamily || submitted?.source || submitted?.decoder || 'unknown'),
            observedAt: Number.isFinite(observedAt) ? observedAt : nowProvider()
        };
        const candidate = parseBarcodeCandidate(normalized.rawValue, normalized.format);
        if (!candidate) {
            const current = evaluate(normalized.observedAt);
            return {
                ...current,
                decision: 'reject',
                candidate: null,
                reasons: ['invalid-candidate']
            };
        }

        evidence.push(normalized);
        return evaluate(normalized.observedAt);
    };

    return Object.freeze({
        submitEvidence,
        submit: submitEvidence,
        evaluate,
        reset() {
            evidence = [];
        },
        getEvidence() {
            return [...evidence];
        }
    });
}
