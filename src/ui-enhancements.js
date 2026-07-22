/**
 * MacroFlow runtime UI and accessibility enhancements.
 *
 * This module intentionally has no framework or package dependencies. It can be
 * installed after the legacy markup has loaded, and it exposes a small adapter
 * API so the scanner/state modules can opt into the richer behaviours without
 * coupling themselves to DOM details.
 */

const INSTALL_KEY = Symbol.for('macroflow.uiEnhancements');
// Only top-level overlay containers are modals. Heading IDs such as
// "modal-settings-title" must never enter the modal stack.
const MODAL_SELECTOR = 'body > [id^="modal-"]';
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

export const SCANNER_UI_STATES = Object.freeze({
    permission: {
        title: 'Camera permission',
        message: 'Allow camera access to scan a barcode.',
        tone: 'info'
    },
    starting: {
        title: 'Starting camera',
        message: 'Preparing the camera and barcode readers.',
        tone: 'info'
    },
    searching: {
        title: 'Looking for a barcode',
        message: 'Keep the entire barcode and its blank edges inside the frame.',
        tone: 'active'
    },
    blurry: {
        title: 'Image is too blurry',
        message: 'Hold still and tap the barcode to focus.',
        tone: 'warning'
    },
    shaky: {
        title: 'Hold still',
        message: 'Pause for a moment while the scanner compares separate camera frames.',
        tone: 'warning'
    },
    dark: {
        title: 'More light needed',
        message: 'Turn on the torch or move the barcode into brighter, even light.',
        tone: 'warning'
    },
    glare: {
        title: 'Reduce glare',
        message: 'Tilt the package slightly so bright reflections move away from the bars.',
        tone: 'warning'
    },
    'too-close': {
        title: 'Move farther back',
        message: 'Keep the whole barcode, including both blank margins, visible.',
        tone: 'warning'
    },
    'too-far': {
        title: 'Move closer',
        message: 'Bring the barcode closer until the bars fill most of the guide.',
        tone: 'warning'
    },
    verifying: {
        title: 'Verifying the number',
        message: 'Keep the barcode steady while independent readers confirm it.',
        tone: 'active'
    },
    confirmation: {
        title: 'Confirm this barcode',
        message: 'Only one reader could verify it. Check the grouped digits before continuing.',
        tone: 'warning'
    },
    confirmed: {
        title: 'Barcode confirmed',
        message: 'The number passed its checksum and independent-reader checks.',
        tone: 'success'
    },
    lookup: {
        title: 'Finding the exact product',
        message: 'Checking your foods and verified product databases.',
        tone: 'active'
    },
    'no-match': {
        title: 'No exact product found',
        message: 'Scan the nutrition label or create this food once to save it to your library.',
        tone: 'warning'
    },
    paused: {
        title: 'Camera paused',
        message: 'Resume the camera when you are ready to continue scanning.',
        tone: 'info'
    },
    denied: {
        title: 'Camera access is blocked',
        message: 'Allow camera access in browser settings, or use a clear barcode photo.',
        tone: 'error'
    },
    unavailable: {
        title: 'Live camera is unavailable',
        message: 'Use a high-resolution photo or type the printed barcode number.',
        tone: 'error'
    },
    error: {
        title: 'Scanner needs another try',
        message: 'Retry the camera or use a clear barcode photo.',
        tone: 'error'
    }
});

const MOJIBAKE_REPLACEMENTS = Object.freeze([
    ['â€”', '—'],
    ['â€“', '–'],
    ['â€¦', '…'],
    ['â†', '←'],
    ['â†’', '→'],
    ['âœ…', '✅'],
    ['âœ“', '✓'],
    ['âœ•', '×'],
    ['â€˜', '‘'],
    ['â€™', '’'],
    ['â€œ', '“'],
    ['â€', '”'],
    ['Â·', '·'],
    ['Â°', '°'],
    ['Âµ', 'µ'],
    ['Â', ''],
    ['ðŸ’¡', '💡'],
    ['ðŸ“„', '📄'],
    ['ðŸ“·', '📷'],
    ['ðŸ”', '🔍'],
    ['ðŸŽ¯', '🎯'],
    ['ðŸ’§', '💧'],
    ['ðŸ½ï¸', '🍽️']
]);

function afterDomReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
        callback();
    }
}

function isVisible(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hidden || element.classList.contains('hidden')) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

function humanizeId(value) {
    return String(value || '')
        .replace(/^modal-/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, character => character.toUpperCase())
        .trim();
}

function ensureId(element, prefix) {
    if (element.id) return element.id;
    let counter = 1;
    let candidate = `${prefix}-${counter}`;
    while (document.getElementById(candidate)) {
        counter += 1;
        candidate = `${prefix}-${counter}`;
    }
    element.id = candidate;
    return candidate;
}

function repairMojibakeString(value) {
    if (typeof value !== 'string' || !/[ÂÃâð]/.test(value)) return value;
    return MOJIBAKE_REPLACEMENTS.reduce(
        (result, [broken, corrected]) => result.split(broken).join(corrected),
        value
    );
}

function repairMojibake(root = document.body) {
    if (!root) return;
    const ignoredParents = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA']);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let current = walker.nextNode();
    while (current) {
        if (!ignoredParents.has(current.parentElement?.tagName)) textNodes.push(current);
        current = walker.nextNode();
    }
    for (const node of textNodes) {
        const repaired = repairMojibakeString(node.nodeValue);
        if (repaired !== node.nodeValue) node.nodeValue = repaired;
    }

    const attributes = ['aria-label', 'aria-description', 'placeholder', 'title'];
    const elements = root instanceof Element
        ? [root, ...root.querySelectorAll('*')]
        : [...document.querySelectorAll('*')];
    for (const element of elements) {
        for (const attribute of attributes) {
            if (!element.hasAttribute(attribute)) continue;
            const value = element.getAttribute(attribute);
            const repaired = repairMojibakeString(value);
            if (repaired !== value) element.setAttribute(attribute, repaired);
        }
    }
}

function inferButtonName(button) {
    const existing = button.getAttribute('aria-label') || button.getAttribute('title');
    if (existing) return existing;
    const onclick = button.getAttribute('onclick') || '';
    const id = button.id || '';
    const icon = button.querySelector('i')?.className || '';
    const hints = `${onclick} ${id} ${icon}`.toLowerCase();
    if (/close|cancel|xmark/.test(hints)) return 'Close dialog';
    if (/arrow-left|previous|navigatedate\(-1/.test(hints)) return 'Previous day';
    if (/arrow-right|next|navigatedate\(1/.test(hints)) return 'Next day';
    if (/scanner|barcode/.test(hints)) return 'Scan barcode';
    if (/describe|wand/.test(hints)) return 'Describe a meal';
    if (/camera|vision/.test(hints)) return 'Scan a food photo';
    if (/settings|sliders/.test(hints)) return 'Open settings';
    if (/copy/.test(hints)) return 'Copy';
    if (/remove|delete|trash/.test(hints)) return 'Delete';
    if (/add|plus/.test(hints)) return 'Add food';
    if (/chevron-down/.test(hints)) return 'Expand section';
    return id ? humanizeId(id) : 'Action';
}

function enhanceLabels(root = document) {
    root.querySelectorAll('label:not([for])').forEach(label => {
        if (label.querySelector('input, select, textarea')) return;
        const container = label.parentElement;
        const control = container?.querySelector('input:not([type="hidden"]), select, textarea');
        if (!control) return;
        label.htmlFor = ensureId(control, 'macroflow-field');
    });

    root.querySelectorAll('button, [role="button"]').forEach(button => {
        const visibleText = (button.textContent || '').replace(/\s+/g, ' ').trim();
        if (!visibleText || button.querySelector('i') && visibleText.length < 2) {
            button.setAttribute('aria-label', inferButtonName(button));
        }
        if (button.getAttribute('role') === 'button' && !button.hasAttribute('tabindex')) {
            button.tabIndex = 0;
        }
    });

    const manualBarcode = document.getElementById('manual-barcode-input');
    if (manualBarcode) {
        manualBarcode.inputMode = 'numeric';
        manualBarcode.pattern = '[0-9]*';
        manualBarcode.maxLength = 14;
        manualBarcode.autocomplete = 'off';
        manualBarcode.spellcheck = false;
        const label = manualBarcode.closest('.space-y-2')?.querySelector('label');
        if (label) label.htmlFor = manualBarcode.id;
    }
}

function enhanceModalSemantics() {
    document.querySelectorAll(MODAL_SELECTOR).forEach(modal => {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', isVisible(modal) ? 'false' : 'true');
        modal.tabIndex = -1;

        if (!modal.hasAttribute('aria-labelledby') && !modal.hasAttribute('aria-label')) {
            const heading = modal.querySelector('h1, h2, h3, h4');
            if (heading) {
                modal.setAttribute('aria-labelledby', ensureId(heading, `${modal.id}-title`));
            } else {
                modal.setAttribute('aria-label', humanizeId(modal.id));
            }
        }

        const backdrop = modal.querySelector(':scope > .absolute.inset-0');
        if (backdrop) {
            backdrop.setAttribute('aria-hidden', 'true');
            backdrop.tabIndex = -1;
        }
    });
}

function wireTabs() {
    const wireGroup = (buttons, panelForButton) => {
        if (!buttons.length) return;
        const container = buttons[0].parentElement;
        container?.setAttribute('role', 'tablist');
        buttons.forEach((button, index) => {
            const panel = panelForButton(button);
            button.setAttribute('role', 'tab');
            button.tabIndex = -1;
            if (panel) {
                button.setAttribute('aria-controls', ensureId(panel, 'macroflow-tab-panel'));
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', ensureId(button, 'macroflow-tab'));
            }
            const selected = panel ? isVisible(panel) : button.getAttribute('aria-current') === 'page';
            button.setAttribute('aria-selected', String(selected));
            if (selected) button.tabIndex = 0;
            if (button.dataset.mfTabReady) return;
            button.dataset.mfTabReady = 'true';
            button.addEventListener('keydown', event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                let targetIndex = index;
                if (event.key === 'ArrowLeft') targetIndex = (index - 1 + buttons.length) % buttons.length;
                if (event.key === 'ArrowRight') targetIndex = (index + 1) % buttons.length;
                if (event.key === 'Home') targetIndex = 0;
                if (event.key === 'End') targetIndex = buttons.length - 1;
                buttons[targetIndex].focus();
                buttons[targetIndex].click();
            });
        });
    };

    const mainTabs = ['nutrition', 'dashboard', 'progress']
        .map(id => document.getElementById(`mb-${id}`))
        .filter(Boolean);
    wireGroup(mainTabs, button => document.getElementById(`tab-content-${button.id.replace('mb-', '')}`));

    const progressTabs = ['weight', 'strength', 'calories']
        .map(id => document.getElementById(`sub-tab-${id}-btn`))
        .filter(Boolean);
    wireGroup(progressTabs, button => {
        const id = button.id.replace('sub-tab-', '').replace('-btn', '');
        return document.getElementById(`sub-panel-${id}`);
    });
}

function wireAccordions() {
    const pairs = [
        ['button[onclick*="toggleMicrosPanel"]', '#micros-panel-content'],
        ['button[onclick*="toggleSettingsMicros"]', '#form-micros-panel'],
        ['button[onclick*="togglePortionMicros"]', '#portion-micros-content'],
        ['button[onclick*="toggleCustomMicrosSection"]', '#custom-micros-content']
    ];

    for (const [buttonSelector, panelSelector] of pairs) {
        const button = document.querySelector(buttonSelector);
        const panel = document.querySelector(panelSelector);
        if (!button || !panel) continue;
        button.setAttribute('aria-controls', ensureId(panel, 'macroflow-accordion-panel'));
        button.setAttribute('aria-expanded', String(isVisible(panel)));
        panel.setAttribute('aria-hidden', String(!isVisible(panel)));
    }

    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(meal => {
        const panel = document.getElementById(`meal-content-${meal}`);
        const header = panel?.previousElementSibling;
        if (!panel || !header) return;
        header.setAttribute('role', 'button');
        header.tabIndex = 0;
        header.setAttribute('aria-controls', panel.id);
        header.setAttribute('aria-expanded', String(panel.classList.contains('expanded')));
        panel.setAttribute('aria-hidden', String(panel.classList.contains('collapsed')));
        if (header.dataset.mfAccordionReady) return;
        header.dataset.mfAccordionReady = 'true';
        header.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            header.click();
        });
    });
}

function refreshDisclosureStates() {
    document.querySelectorAll('[aria-controls]').forEach(trigger => {
        if (!trigger.matches('button, [role="button"]')) return;
        const panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (!panel || trigger.getAttribute('role') === 'tab') return;
        const expanded = isVisible(panel) && !panel.classList.contains('collapsed');
        trigger.setAttribute('aria-expanded', String(expanded));
        panel.setAttribute('aria-hidden', String(!expanded));
    });
}

function installChartSummaries() {
    document.querySelectorAll('canvas[id]').forEach(canvas => {
        const summaryId = `${canvas.id}-text-summary`;
        let summary = document.getElementById(summaryId);
        if (!summary) {
            summary = document.createElement('p');
            summary.id = summaryId;
            summary.className = 'mf-chart-summary';
            summary.textContent = 'Chart summary is not available yet.';
            canvas.insertAdjacentElement('afterend', summary);
        }
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-describedby', summaryId);
        if (!canvas.hasAttribute('aria-label')) {
            canvas.setAttribute('aria-label', humanizeId(canvas.id.replace('-canvas', '')));
        }
    });
}

function installConnectionAndPwaStatus(api, cleanup) {
    const headerActions = document.querySelector('header .justify-self-end');
    if (!headerActions || document.getElementById('mf-app-status')) return null;

    const status = document.createElement('div');
    status.id = 'mf-app-status';
    status.className = 'mf-app-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.innerHTML = `
        <span class="mf-connection-dot" aria-hidden="true"></span>
        <span class="mf-connection-label">Online</span>
        <button type="button" class="mf-install-button" hidden>Install app</button>
    `;
    headerActions.prepend(status);
    const label = status.querySelector('.mf-connection-label');
    const installButton = status.querySelector('.mf-install-button');
    let installPrompt = null;

    const setOnline = online => {
        status.dataset.connection = online ? 'online' : 'offline';
        label.textContent = online ? 'Online' : 'Offline — local logging still works';
        status.title = label.textContent;
        api.onConnectionChange?.({ online });
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onBeforeInstallPrompt = event => {
        event.preventDefault();
        installPrompt = event;
        installButton.hidden = false;
        status.dataset.install = 'available';
        api.onInstallPromptChange?.({ available: true });
    };
    const onInstalled = () => {
        installPrompt = null;
        installButton.hidden = true;
        status.dataset.install = 'installed';
        label.textContent = 'Installed';
        api.onInstallPromptChange?.({ available: false, installed: true });
    };
    const promptInstall = async () => {
        if (!installPrompt) return { outcome: 'unavailable' };
        const prompt = installPrompt;
        installPrompt = null;
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice?.outcome !== 'accepted') installButton.hidden = false;
        api.onInstallPromptChange?.({ available: choice?.outcome !== 'accepted', outcome: choice?.outcome });
        return choice;
    };

    installButton.addEventListener('click', promptInstall);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    setOnline(navigator.onLine);

    cleanup.push(() => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.removeEventListener('appinstalled', onInstalled);
        status.remove();
    });

    return { setOnline, promptInstall, isInstallAvailable: () => Boolean(installPrompt) };
}

function installScannerPanel(api, cleanup) {
    const modal = document.getElementById('modal-scanner');
    const legacyTip = document.getElementById('scanner-live-tip');
    if (!modal || !legacyTip) return null;

    let panel = document.getElementById('scanner-state-panel');
    if (!panel) {
        panel = document.createElement('section');
        panel.id = 'scanner-state-panel';
        panel.className = 'mf-scanner-state';
        panel.setAttribute('aria-label', 'Scanner status');
        panel.innerHTML = `
            <span class="mf-scanner-state-indicator" aria-hidden="true"></span>
            <span class="mf-scanner-state-copy">
                <strong class="mf-scanner-state-title"></strong>
                <span class="mf-scanner-state-message"></span>
                <span class="mf-scanner-state-code" hidden></span>
            </span>
            <button type="button" class="mf-scanner-photo-action" hidden>Take a clear photo</button>
            <span class="mf-sr-only" aria-live="polite" aria-atomic="true"></span>
        `;
        legacyTip.insertAdjacentElement('beforebegin', panel);
    }
    modal.dataset.mfScannerConsolidated = 'true';

    const title = panel.querySelector('.mf-scanner-state-title');
    const message = panel.querySelector('.mf-scanner-state-message');
    const code = panel.querySelector('.mf-scanner-state-code');
    const photoAction = panel.querySelector('.mf-scanner-photo-action');
    const liveRegion = panel.querySelector('[aria-live]');
    const photoInput = document.getElementById('barcode-file-input');
    let fallbackTimer = 0;
    let announceTimer = 0;
    let lastAnnouncement = '';
    let lastExplicitAt = 0;
    let currentState = 'starting';

    const announce = text => {
        if (!text || text === lastAnnouncement) return;
        window.clearTimeout(announceTimer);
        announceTimer = window.setTimeout(() => {
            liveRegion.textContent = '';
            window.requestAnimationFrame(() => {
                liveRegion.textContent = text;
                lastAnnouncement = text;
            });
        }, 350);
    };

    const render = (stateName, detail = {}, options = {}) => {
        const definition = SCANNER_UI_STATES[stateName] || SCANNER_UI_STATES.error;
        currentState = SCANNER_UI_STATES[stateName] ? stateName : 'error';
        if (options.explicit !== false) lastExplicitAt = Date.now();
        window.clearTimeout(fallbackTimer);
        panel.dataset.state = currentState;
        panel.dataset.tone = detail.tone || definition.tone;
        panel.dataset.fallback = 'false';
        title.textContent = detail.title || definition.title;
        message.textContent = detail.message || definition.message;

        const displayCode = detail.displayCode || detail.code || '';
        code.hidden = !displayCode;
        code.textContent = displayCode ? `Detected: ${displayCode}` : '';
        photoAction.hidden = !detail.showPhotoAction;

        if (currentState === 'searching' || currentState === 'blurry' || currentState === 'shaky') {
            fallbackTimer = window.setTimeout(() => {
                if (!['searching', 'blurry', 'shaky'].includes(currentState)) return;
                panel.dataset.fallback = 'true';
                photoAction.hidden = false;
                announce('Still not scanning. Take a clear photo for a more reliable result.');
            }, Number.isFinite(detail.fallbackDelay) ? detail.fallbackDelay : 5000);
        }

        const announcement = [title.textContent, message.textContent, code.textContent].filter(Boolean).join('. ');
        announce(announcement);
        api.onScannerUiStateChange?.({ state: currentState, ...detail });
        return currentState;
    };

    photoAction.addEventListener('click', () => photoInput?.click());

    const inferLegacyState = value => {
        const text = String(value || '').toLowerCase();
        if (/permission|allow camera/.test(text)) return 'permission';
        if (/starting|preparing|opening camera/.test(text)) return 'starting';
        if (/denied|blocked/.test(text)) return 'denied';
        if (/unavailable|no camera|not supported/.test(text)) return 'unavailable';
        if (/glare|reflection|overexpos/.test(text)) return 'glare';
        if (/too dark|more light|low light/.test(text)) return 'dark';
        if (/too close|back up|farther/.test(text)) return 'too-close';
        if (/too far|move closer|small/.test(text)) return 'too-far';
        if (/blurry|soft focus|not sharp/.test(text)) return 'blurry';
        if (/shake|hold still|movement|moving/.test(text)) return 'shaky';
        if (/verif|almost|confirming/.test(text)) return 'verifying';
        if (/confirmed|found barcode|success/.test(text)) return 'confirmed';
        if (/lookup|finding product|checking product/.test(text)) return 'lookup';
        if (/no exact|not found|no product/.test(text)) return 'no-match';
        if (/error|failed|try again/.test(text)) return 'error';
        return 'searching';
    };

    const legacyNodes = [
        document.getElementById('scanner-status-text'),
        document.getElementById('scanner-quality-text'),
        legacyTip
    ].filter(Boolean);
    const legacyObserver = new MutationObserver(() => {
        if (Date.now() - lastExplicitAt < 1500) return;
        const legacyText = legacyNodes.map(node => node.textContent.trim()).filter(Boolean).join(' ');
        const state = inferLegacyState(legacyText);
        render(state, { message: legacyText.slice(0, 240) }, { explicit: false });
    });
    legacyNodes.forEach(node => legacyObserver.observe(node, { childList: true, characterData: true, subtree: true }));
    cleanup.push(() => {
        legacyObserver.disconnect();
        window.clearTimeout(fallbackTimer);
        window.clearTimeout(announceTimer);
        panel.remove();
    });

    render('starting');
    return { render, getState: () => currentState };
}

function createModalManager(api, cleanup) {
    const backgroundState = new Map();
    let openModals = [];
    let topModal = null;
    let restoreFocusTo = null;
    let lastExternalFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let scheduled = 0;
    let historyOwned = false;
    let handlingPop = false;

    const visibleModals = () => [...document.querySelectorAll(MODAL_SELECTOR)].filter(isVisible);
    const isOverlayOpen = () => visibleModals().length > 0;
    const canNavigateBySwipe = () => !isOverlayOpen();

    const rememberExternalFocus = event => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || target.closest(MODAL_SELECTOR)) return;
        lastExternalFocus = target;
    };
    document.addEventListener('pointerdown', rememberExternalFocus, true);
    document.addEventListener('focusin', rememberExternalFocus, true);

    const setBackgroundInert = activeModal => {
        const exemptions = new Set([activeModal, document.getElementById('toast-container')].filter(Boolean));
        [...document.body.children].forEach(child => {
            // Modal interactivity is managed from the visible modal stack below.
            // Keeping modal elements out of the background-state map prevents a
            // nested dialog's temporary `inert` value from being restored onto
            // the dialog when it becomes topmost again.
            if (child.matches?.(MODAL_SELECTOR)) return;
            const exempt = [...exemptions].some(element => child === element || child.contains(element));
            if (exempt) {
                if (backgroundState.has(child)) {
                    const previous = backgroundState.get(child);
                    if (!previous.inert) child.removeAttribute('inert');
                    else child.setAttribute('inert', '');
                    if (previous.ariaHidden === null) child.removeAttribute('aria-hidden');
                    else child.setAttribute('aria-hidden', previous.ariaHidden);
                    backgroundState.delete(child);
                }
                return;
            }
            if (!backgroundState.has(child)) {
                backgroundState.set(child, {
                    inert: child.hasAttribute('inert'),
                    ariaHidden: child.getAttribute('aria-hidden')
                });
            }
            child.setAttribute('inert', '');
            child.setAttribute('aria-hidden', 'true');
        });
    };

    const restoreBackground = () => {
        backgroundState.forEach((previous, element) => {
            if (!previous.inert) element.removeAttribute('inert');
            else element.setAttribute('inert', '');
            if (previous.ariaHidden === null) element.removeAttribute('aria-hidden');
            else element.setAttribute('aria-hidden', previous.ariaHidden);
        });
        backgroundState.clear();
    };

    const focusFirst = modal => {
        if (!modal) return;
        const preferred = modal.querySelector('[autofocus], [data-initial-focus], input:not([type="hidden"]), button:not([disabled]), select, textarea');
        const target = preferred && isVisible(preferred) ? preferred : modal;
        window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    };

    const fallbackClose = modal => {
        const closeButton = [...modal.querySelectorAll('button')].find(button => {
            const hint = `${button.getAttribute('aria-label') || ''} ${button.getAttribute('onclick') || ''}`;
            return /close|cancel/i.test(hint);
        });
        if (closeButton) {
            closeButton.click();
            return;
        }
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    const requestClose = (modal = topModal, reason = 'dismiss') => {
        if (!modal) return false;
        let handled = false;
        if (typeof api.closeModal === 'function') {
            try {
                handled = api.closeModal(modal.id, reason) !== false;
            } catch (error) {
                api.onUiError?.(error, { area: 'modal-close', modalId: modal.id });
            }
        }
        if (!handled) fallbackClose(modal);
        return true;
    };

    const syncHistory = depth => {
        if (api.manageModalHistory === false || !window.history?.pushState) return;
        const stateIsOurs = Boolean(history.state?.__macroflowModal);
        try {
            if (depth > 0 && !historyOwned && !stateIsOurs) {
                history.pushState({ ...history.state, __macroflowModal: true }, '', location.href);
                historyOwned = true;
            } else if (depth === 0 && historyOwned && stateIsOurs && !handlingPop) {
                historyOwned = false;
                history.back();
            } else if (depth === 0) {
                historyOwned = false;
            }
        } catch (error) {
            historyOwned = false;
            api.onUiError?.(error, { area: 'modal-history' });
        }
    };

    const sync = () => {
        scheduled = 0;
        const nextOpen = visibleModals();
        nextOpen.forEach((modal, index) => {
            modal.style.setProperty('--mf-modal-layer', String(1000 + index * 10));
            modal.setAttribute('aria-hidden', 'false');
            modal.toggleAttribute('data-mf-top-modal', index === nextOpen.length - 1);
            if (index !== nextOpen.length - 1) modal.setAttribute('inert', '');
            else modal.removeAttribute('inert');
        });
        document.querySelectorAll(MODAL_SELECTOR).forEach(modal => {
            if (!nextOpen.includes(modal)) {
                modal.setAttribute('aria-hidden', 'true');
                modal.removeAttribute('data-mf-top-modal');
                modal.removeAttribute('inert');
            }
        });

        const nextTop = nextOpen.at(-1) || null;
        if (!openModals.length && nextOpen.length) {
            const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            restoreFocusTo = lastExternalFocus?.isConnected
                ? lastExternalFocus
                : (activeElement && !nextTop?.contains(activeElement) ? activeElement : null);
        }
        if (nextTop) {
            document.documentElement.classList.add('mf-modal-open');
            document.body.classList.add('mf-modal-open');
            setBackgroundInert(nextTop);
            if (nextTop !== topModal || !nextTop.contains(document.activeElement)) focusFirst(nextTop);
        } else {
            document.documentElement.classList.remove('mf-modal-open');
            document.body.classList.remove('mf-modal-open');
            restoreBackground();
            if (openModals.length && restoreFocusTo?.isConnected) {
                const focusTarget = restoreFocusTo;
                window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
            }
            restoreFocusTo = null;
        }

        openModals = nextOpen;
        topModal = nextTop;
        refreshDisclosureStates();
        wireTabs();
        syncHistory(nextOpen.length);
        api.onModalStateChange?.({
            open: nextOpen.map(modal => modal.id),
            top: nextTop?.id || null,
            hasOverlay: Boolean(nextTop)
        });
    };

    const scheduleSync = () => {
        if (scheduled) return;
        scheduled = window.requestAnimationFrame(sync);
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'hidden']
    });

    const onKeyDown = event => {
        if (!topModal) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            requestClose(topModal, 'escape');
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = [...topModal.querySelectorAll(FOCUSABLE_SELECTOR)].filter(isVisible);
        if (!focusable.length) {
            event.preventDefault();
            topModal.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const onFocusIn = event => {
        if (!topModal || topModal.contains(event.target)) return;
        const target = [...topModal.querySelectorAll(FOCUSABLE_SELECTOR)].find(isVisible) || topModal;
        target.focus({ preventScroll: true });
    };

    const blockSwipeBehindOverlay = event => {
        if (!canNavigateBySwipe()) event.stopImmediatePropagation();
    };

    const onPopState = () => {
        historyOwned = false;
        if (!topModal) return;
        handlingPop = true;
        requestClose(topModal, 'back');
        window.setTimeout(() => {
            handlingPop = false;
            scheduleSync();
        }, 0);
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('touchend', blockSwipeBehindOverlay, true);
    window.addEventListener('popstate', onPopState);
    cleanup.push(() => {
        observer.disconnect();
        document.removeEventListener('pointerdown', rememberExternalFocus, true);
        document.removeEventListener('focusin', rememberExternalFocus, true);
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('focusin', onFocusIn, true);
        document.removeEventListener('touchend', blockSwipeBehindOverlay, true);
        window.removeEventListener('popstate', onPopState);
        if (scheduled) window.cancelAnimationFrame(scheduled);
        restoreBackground();
    });

    const predicate = canNavigateBySwipe;
    api.setSwipeAllowedPredicate?.(predicate);
    api.setOverlayOpenPredicate?.(isOverlayOpen);
    scheduleSync();

    return { isOverlayOpen, canNavigateBySwipe, closeTopModal: reason => requestClose(topModal, reason), refresh: scheduleSync };
}

/**
 * Installs MacroFlow's runtime enhancement layer.
 *
 * Supported integration callbacks are documented in the returned object's
 * `integration` field. All callbacks are optional; legacy markup still receives
 * safe fallbacks when none are supplied.
 */
export function installUiEnhancements(api = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('installUiEnhancements requires a browser document.');
    }
    if (window[INSTALL_KEY]) return window[INSTALL_KEY];

    const cleanup = [];
    const controller = {
        ready: null,
        isOverlayOpen: () => false,
        canNavigateBySwipe: () => true,
        closeTopModal: () => false,
        renderScannerState: () => null,
        getScannerState: () => null,
        setChartSummary(chartOrId, summary) {
            const canvas = typeof chartOrId === 'string' ? document.getElementById(chartOrId) : chartOrId;
            if (!(canvas instanceof HTMLCanvasElement)) return false;
            const summaryElement = document.getElementById(`${canvas.id}-text-summary`);
            if (!summaryElement) return false;
            summaryElement.textContent = String(summary || 'No chart data is available.');
            return true;
        },
        setOnline: () => {},
        promptInstall: async () => ({ outcome: 'unavailable' }),
        isInstallAvailable: () => false,
        repairText: repairMojibake,
        refresh: () => {},
        destroy() {
            cleanup.splice(0).reverse().forEach(dispose => dispose());
            delete window[INSTALL_KEY];
        },
        integration: Object.freeze({
            closeModal: '(modalId, reason) => boolean | void',
            setSwipeAllowedPredicate: 'predicate => void',
            setOverlayOpenPredicate: 'predicate => void',
            onModalStateChange: '({ open, top, hasOverlay }) => void',
            onScannerUiStateChange: '({ state, ...detail }) => void',
            onConnectionChange: '({ online }) => void',
            onInstallPromptChange: 'status => void',
            onUiError: '(error, context) => void',
            manageModalHistory: 'boolean (defaults to true)'
        })
    };

    controller.ready = new Promise(resolve => {
        afterDomReady(() => {
            repairMojibake();
            enhanceLabels();
            enhanceModalSemantics();
            wireTabs();
            wireAccordions();
            installChartSummaries();

            const modalManager = createModalManager(api, cleanup);
            const scannerPanel = installScannerPanel(api, cleanup);
            const connectionStatus = installConnectionAndPwaStatus(api, cleanup);

            if (modalManager) {
                controller.isOverlayOpen = modalManager.isOverlayOpen;
                controller.canNavigateBySwipe = modalManager.canNavigateBySwipe;
                controller.closeTopModal = modalManager.closeTopModal;
                controller.refresh = () => {
                    enhanceLabels();
                    enhanceModalSemantics();
                    wireAccordions();
                    modalManager.refresh();
                };
            }
            if (scannerPanel) {
                controller.renderScannerState = scannerPanel.render;
                controller.getScannerState = scannerPanel.getState;
            }
            if (connectionStatus) {
                controller.setOnline = connectionStatus.setOnline;
                controller.promptInstall = connectionStatus.promptInstall;
                controller.isInstallAvailable = connectionStatus.isInstallAvailable;
            }

            api.onReady?.(controller);
            resolve(controller);
        });
    });

    window[INSTALL_KEY] = controller;
    return controller;
}

export default installUiEnhancements;
