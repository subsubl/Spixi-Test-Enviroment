window.onload = () => {
    const dosContainer = document.getElementById('dos-container');
    const loadDiggerBtn = document.getElementById('load-digger');
    const loadUrlBtn = document.getElementById('load-url');
    const stopBtn = document.getElementById('stop-dos');
    const bundleInput = document.getElementById('bundle-url');

    let props = null;
        let repeatInterval = null;
        let lastKey = null;

    async function createDos(bundleUrl, opts = {}) {
        if (!window.Dos) {
            console.error('js-dos library not found.');
            dosContainer.innerText = 'Error: js-dos library not found.';
            return;
        }

        // Stop previous player if running
        if (props && typeof props.stop === 'function') {
            try { await props.stop(); } catch (e) { console.warn('Could not stop existing player', e); }
            props = null;
            dosContainer.innerHTML = '';
        }

        dosContainer.innerText = 'Loading...';

        try {
            // Create Dos player and pass bundle via options
            const optObj = Object.assign({ url: bundleUrl, autoStart: true, onEvent: (ev) => console.log('js-dos event', ev) }, opts);
            // default to dark theme if not specified
            if (!optObj.theme) optObj.theme = 'dark';
            const maybe = Dos(dosContainer, optObj);
            // Dos API may return a promise or a props object
            if (maybe && typeof maybe.then === 'function') {
                props = await maybe;
            } else {
                props = maybe;
            }
            console.log('js-dos props', props);
            // Focus the outer container so keys go to emulator
            dosContainer.focus();
            // after player is created -> resize canvas to container size
            requestAnimationFrame(() => resizeDos());
        } catch (err) {
            console.error('Failed to start js-dos', err);
            dosContainer.innerText = 'Failed to start js-dos: ' + (err && err.message ? err.message : err);
        }
    }

    // Resize behavior: set canvas element to fill the container and keep it responsive
    function resizeDos() {
        const canvas = dosContainer.querySelector('canvas') || dosContainer.querySelector('video') || null;
        if (!canvas) return;
        // Ensure the in-place element covers the whole container
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        // If the props provide a resize method, call it (v8 might expose API)
        if (props && typeof props.resize === 'function') {
            try { props.resize(); } catch (e) { /* noop */ }
        }
    }

    // Keyboard dispatch helper: send key events to the emulator container
    function dispatchKeyToDos(key, options = {}) {
        const target = dosContainer;
        const code = options.code || key;
        const keyCode = options.keyCode || (key && key.length === 1 ? key.charCodeAt(0) : 0);

        ['keydown', 'keypress', 'keyup'].forEach((type, i) => {
            const ev = new KeyboardEvent(type, {
                key: key,
                code: code,
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true
            });
            target.dispatchEvent(ev);
            window.dispatchEvent(ev);
        });
    }

    loadDiggerBtn && loadDiggerBtn.addEventListener('click', () => {
        createDos('https://v8.js-dos.com/bundles/digger.jsdos');
    });
    const loadSelectedBtn = document.getElementById('load-selected');
    const sampleSelect = document.getElementById('sample-bundles');
    loadSelectedBtn && loadSelectedBtn.addEventListener('click', () => {
        const url = sampleSelect.value;
        if (url) createDos(url);
    });

    loadUrlBtn.addEventListener('click', () => {
        const url = bundleInput.value.trim();
        if (!url) return alert('Please enter a bundle URL');
        createDos(url);
    });

    stopBtn.addEventListener('click', async () => {
        if (props && typeof props.stop === 'function') {
            await props.stop();
            props = null;
            dosContainer.innerHTML = '';
            dosContainer.innerText = 'Stopped';
        }
    });

    // Keep canvas resizing with viewport
    window.addEventListener('resize', () => requestAnimationFrame(resizeDos));

    // On-screen keypad: map to Arrow keys + Enter/Escape
    const keypad = document.getElementById('dos-keypad');
    const input = document.getElementById('dos-keyboard-input');

    function startKeyRepeat(keyName) {
        // send initial press
        dispatchKeyToDos(keyName);
        lastKey = keyName;
        repeatInterval = setInterval(() => dispatchKeyToDos(keyName), 150);
    }
    function stopKeyRepeat() {
        if (repeatInterval) clearInterval(repeatInterval);
        repeatInterval = null;
        lastKey = null;
    }

    // Attach pointer/touch handlers for keys
    keypad.querySelectorAll('button[data-key]').forEach(btn => {
        const keyName = btn.getAttribute('data-key');
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); startKeyRepeat(keyName); });
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); startKeyRepeat(keyName); });
        ['mouseup', 'mouseleave'].forEach(ev => btn.addEventListener(ev, stopKeyRepeat));
        ['touchend', 'touchcancel'].forEach(ev => btn.addEventListener(ev, stopKeyRepeat));
        // single click
        btn.addEventListener('click', (e) => { e.preventDefault(); dispatchKeyToDos(keyName); });
    });

    // Toggle mobile keyboard pop-up: focus the hidden input which triggers soft keyboard
    const kbToggle = document.getElementById('keyboard-toggle');
    kbToggle.addEventListener('click', () => {
        // If already focused, blur it
        if (document.activeElement === input) { input.blur(); } else { input.focus(); }
    });

    // When the hidden input receives actual typed characters, forward them as key events
    input.addEventListener('input', (ev) => {
        const val = input.value || '';
        // Send each typed character, then clear the input
        if (val.length > 0) {
            for (const ch of val) {
                dispatchKeyToDos(ch);
            }
        }
        input.value = '';
    });

        // Forward non-printable key presses from the soft keyboard to the emulator
        input.addEventListener('keydown', (ev) => {
            // Forward keydown and keyup events for non-character keys
            if (ev.key && ev.key.length > 1) {
                dispatchKeyToDos(ev.key);
                ev.preventDefault();
            }
        });

    // Focus the hidden input when the dos container is tapped on mobile to bring up keyboard
    dosContainer.addEventListener('touchstart', (e) => { input.focus(); }, { passive: true });
    dosContainer.addEventListener('click', (e) => { dosContainer.focus(); });

    // Auto-load the 'terminal' bundle when the page is opened (default)
    // We'll load a lightweight sample bundle but theme will be dark
    const DEFAULT_AUTOSTART = true;
    if (window.Dos && DEFAULT_AUTOSTART) {
        // default to the first sample bundle (Digger) — you can change this to a local bundle for a terminal
        const defaultUrl = sampleSelect ? sampleSelect.value : 'https://v8.js-dos.com/bundles/digger.jsdos';
        // honor the checkbox if present
        const autoStartCheckbox = document.getElementById('auto-start');
        const shouldAutoStart = autoStartCheckbox ? autoStartCheckbox.checked : true;
        if (shouldAutoStart) createDos(defaultUrl, { theme: 'dark' });
    }
};
