window.onload = () => {
    const dosContainer = document.getElementById('dos-container');
    const loadDiggerBtn = document.getElementById('load-digger');
    const loadUrlBtn = document.getElementById('load-url');
    const stopBtn = document.getElementById('stop-dos');
    const bundleInput = document.getElementById('bundle-url');

    let props = null;

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
        } catch (err) {
            console.error('Failed to start js-dos', err);
            dosContainer.innerText = 'Failed to start js-dos: ' + (err && err.message ? err.message : err);
        }
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
