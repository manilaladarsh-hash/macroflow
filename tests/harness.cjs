const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Run the app's actual inline JavaScript in a small DOM harness. No build or
// dependencies are needed; this suite tests state and UI behavior, not layout.
function app(now = '2026-10-05T02:30:00Z') {
    const elements = new Map();
    const storage = new Map();
    class Element {
        constructor() {
            this.value = ''; this.innerText = ''; this.textContent = ''; this.innerHTML = '';
            this.style = {}; this.children = []; this.disabled = false;
            this.classes = new Set(['hidden']);
            this.classList = {
                add: x => this.classes.add(x), remove: x => this.classes.delete(x),
                contains: x => this.classes.has(x),
                toggle: (x, hide) => hide ? this.classes.add(x) : this.classes.delete(x)
            };
            this.selectors = new Map();
        }
        querySelector(selector) {
            if (!this.selectors.has(selector)) this.selectors.set(selector, new Element());
            return this.selectors.get(selector);
        }
        appendChild(child) { this.children.push(child); }
        focus() { this.focused = true; }
        remove() {}
        addEventListener() {}
        setAttribute() {}
        querySelectorAll() { return []; }
        getBoundingClientRect() { return { width: 160, height: 160 }; }
        getContext() { return new Proxy({}, { get: () => () => {} }); }
    }
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return new Date(now).getTime(); }
    }
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, new Element());
            return elements.get(id);
        },
        createElement: () => new Element(), addEventListener() {}, body: new Element()
    };
    const context = vm.createContext({
        Date: Clock, document, console, window: { crypto: { randomUUID }, devicePixelRatio: 1, addEventListener() {} },
        localStorage: { setItem: (k, v) => storage.set(k, v), getItem: k => storage.get(k) },
        setTimeout() {}, setInterval() {}, clearInterval() {}
    });
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const core = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];
    vm.runInContext(core, context);
    vm.runInContext('audioEngine.playNotification = () => {}; triggerConfetti = () => {};', context);
    return { run: code => vm.runInContext(code, context), document, storage, context };
}

module.exports = { app };
