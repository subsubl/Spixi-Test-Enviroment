window.onload = () => {
    const dosContainer = document.getElementById('dos-container');
    const loadDiggerBtn = document.getElementById('load-digger');
    const loadUrlBtn = document.getElementById('load-url');
    const stopBtn = document.getElementById('stop-dos');
    const bundleInput = document.getElementById('bundle-url');
    const loadSelectedBtn = document.getElementById('load-selected');
    const sampleSelect = document.getElementById('sample-bundles');
    const lanStatusEl = document.getElementById('lan-status');

    let props = null;
    let currentBundleUrl = '';

    const LAN_PROTOCOL_ID = 'com.example.spixi.dos-app/lan/v1';
    const LAN_HELLO_INTERVAL_MS = 5000;
    const LAN_PEER_TIMEOUT_MS = 15000;
    const DEFAULT_DOSBOX_NETWORK_CONF = ['[ipx]', 'ipx=true', '', '[serial]', 'serial1=modem listenport:5000', ''].join('\n');

    const lanPeers = new Map();
    const seenSeqBySender = new Map();
    const pendingKeyQueue = [];
    const pendingSent = new Map();
    let lanSeq = 0;
    let lanSessionId = '';
    let lanInitialized = false;
    let lanHelloInterval = null;
    let lanPeerPruneInterval = null;

    const spixiAvailable = typeof window.SpixiAppSdk !== 'undefined';

    function applyLanStatusMode(mode) {
        if (!lanStatusEl) return;
        lanStatusEl.dataset.mode = mode;
    }

    function updateLanStatus(text, mode) {
        if (!lanStatusEl) return;
        lanStatusEl.textContent = text;
        applyLanStatusMode(mode);
    }

    function markPeerSeen(address) {
        if (!address) return;
        lanPeers.set(address, Date.now());
        const peerCount = lanPeers.size;
        updateLanStatus(peerCount > 0 ? `LAN sync active (${peerCount} peer${peerCount > 1 ? 's' : ''})` : 'LAN sync idle', peerCount > 0 ? 'online' : 'idle');
    }

    function pruneLanPeers() {
        const now = Date.now();
        lanPeers.forEach((lastSeen, address) => {
            if (now - lastSeen > LAN_PEER_TIMEOUT_MS) {
                lanPeers.delete(address);
            }
        });
        if (!lanInitialized) return;
        const peerCount = lanPeers.size;
        updateLanStatus(peerCount > 0 ? `LAN sync active (${peerCount} peer${peerCount > 1 ? 's' : ''})` : 'LAN sync idle', peerCount > 0 ? 'online' : 'idle');
    }

    function sendLanMessage(payload) {
        if (!lanInitialized || !spixiAvailable || !window.SpixiAppSdk || typeof SpixiAppSdk.sendNetworkProtocolData !== 'function') {
            return;
        }
        const envelope = Object.assign({}, payload, {
            sessionId: lanSessionId,
            sentAt: Date.now()
        });
        if ((payload.type === 'key' || payload.type === 'launch') && !envelope.seq) {
            lanSeq += 1;
            envelope.seq = lanSeq;
            pendingSent.set(envelope.seq, envelope);
        }
        try {
            SpixiAppSdk.sendNetworkProtocolData(LAN_PROTOCOL_ID, JSON.stringify(envelope));
        } catch (err) {
            console.warn('Failed to send LAN payload', err);
        }
    }

    function startLanHeartbeat() {
        if (lanHelloInterval) clearInterval(lanHelloInterval);
        lanHelloInterval = setInterval(() => sendLanMessage({ type: 'hello' }), LAN_HELLO_INTERVAL_MS);
        if (lanPeerPruneInterval) clearInterval(lanPeerPruneInterval);
        lanPeerPruneInterval = setInterval(pruneLanPeers, Math.max(3000, LAN_PEER_TIMEOUT_MS / 2));
    }

    function flushPendingKeyQueue() {
        while (pendingKeyQueue.length) {
            const p = pendingKeyQueue.shift();
            sendLanMessage(p);
        }
    }

    function dispatchRemoteKey(payload) {
        if (!payload || !payload.key) return;
        const eventTypes = payload.action === 'down' ? ['keydown', 'keypress'] : ['keyup'];
        dispatchKeyToDos(payload.key, {
            code: payload.code,
            keyCode: payload.keyCode,
            repeat: payload.repeat,
            altKey: payload.altKey,
            ctrlKey: payload.ctrlKey,
            shiftKey: payload.shiftKey,
            metaKey: payload.metaKey
        }, eventTypes);
    }

    function handleRemoteLaunch(payload) {
        if (!payload || !payload.url) return;
        const url = String(payload.url);
        if (bundleInput && !bundleInput.value) {
            bundleInput.value = url;
        }
        if (!props) {
            createDos(url, { theme: 'dark' });
        }
        lanStatusEl && (lanStatusEl.title = `Last shared bundle: ${url}`);
    }

    function handleLanPayload(senderAddress, payload) {
        if (!payload || typeof payload !== 'object') return;
        if (payload.sessionId && payload.sessionId === lanSessionId) return;
        markPeerSeen(senderAddress || 'peer');

        switch (payload.type) {
            case 'hello':
                sendLanMessage({ type: 'helloAck' });
                break;
            case 'helloAck':
                break;
            case 'ack':
                if (payload.acked) {
                    pendingSent.delete(payload.acked);
                }
                break;
            case 'key':
                // Deduplicate by session + seq
                if (payload.seq) {
                    const sender = payload.sessionId || senderAddress || 'peer';
                    const set = seenSeqBySender.get(sender) || new Set();
                    if (set.has(payload.seq)) return; // already processed
                    set.add(payload.seq);
                    // keep sets reasonably small
                    if (set.size > 256) set.clear();
                    seenSeqBySender.set(sender, set);
                }
                // Send an ack back so the origin can stop retrying
                if (payload.seq) sendLanMessage({ type: 'ack', acked: payload.seq });
                dispatchRemoteKey(payload);
                break;
            case 'launch':
                handleRemoteLaunch(payload);
                break;
            default:
                console.debug('Unhandled LAN payload', payload);
                break;
        }
    }

    async function createDos(bundleUrl, opts = {}) {
        if (!window.Dos) {
            console.error('js-dos library not found.');
            dosContainer.innerText = 'Error: js-dos library not found.';
            return;
        }

        currentBundleUrl = bundleUrl;

        if (props && typeof props.stop === 'function') {
            try { await props.stop(); } catch (e) { console.warn('Could not stop existing player', e); }
            props = null;
            dosContainer.innerHTML = '';
        }

        dosContainer.innerText = 'Loading...';

        try {
            const optObj = Object.assign({ url: bundleUrl, autoStart: true, onEvent: (ev) => console.log('js-dos event', ev) }, opts);
            if (!optObj.theme) optObj.theme = 'dark';

            if (!optObj.dosboxConf || typeof optObj.dosboxConf !== 'string') {
                optObj.dosboxConf = DEFAULT_DOSBOX_NETWORK_CONF;
            } else if (!/\[ipx\]/i.test(optObj.dosboxConf)) {
                optObj.dosboxConf += `\n${DEFAULT_DOSBOX_NETWORK_CONF}`;
            }

            const maybe = Dos(dosContainer, optObj);
            props = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
            console.log('js-dos props', props);
            dosContainer.focus();
            requestAnimationFrame(() => resizeDos());

            if (lanInitialized) {
                sendLanMessage({ type: 'launch', url: bundleUrl });
            }
        } catch (err) {
            console.error('Failed to start js-dos', err);
            dosContainer.innerText = 'Failed to start js-dos: ' + (err && err.message ? err.message : err);
        }
    }

    function resizeDos() {
        const canvas = dosContainer.querySelector('canvas') || dosContainer.querySelector('video') || null;
        if (!canvas) return;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        if (props && typeof props.resize === 'function') {
            try { props.resize(); } catch (e) { /* noop */ }
        }
    }

    function dispatchKeyToDos(key, options = {}, eventTypes = ['keydown', 'keypress', 'keyup']) {
        const target = dosContainer;
        const code = options.code || key;
        const keyCode = options.keyCode || (key && key.length === 1 ? key.charCodeAt(0) : 0);

        eventTypes.forEach((type) => {
            const ev = new KeyboardEvent(type, {
                key: key,
                code: code,
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true,
                repeat: !!options.repeat,
                altKey: !!options.altKey,
                ctrlKey: !!options.ctrlKey,
                shiftKey: !!options.shiftKey,
                metaKey: !!options.metaKey
            });
            target.dispatchEvent(ev);
            window.dispatchEvent(ev);
        });
    }

    function handleLocalKeyEvent(event) {
        if (!event || !event.isTrusted) return;
        const action = event.type === 'keydown' ? 'down' : 'up';
        const payload = {
            type: 'key',
            action,
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            repeat: event.repeat,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey
        };
        // If LAN hasn't been initialized yet, queue the key event for sending after the handshake
        if (!lanInitialized) {
            pendingKeyQueue.push(payload);
            if (pendingKeyQueue.length > 128) pendingKeyQueue.shift();
            return;
        }
        sendLanMessage(payload);
    }

    loadDiggerBtn && loadDiggerBtn.addEventListener('click', () => {
        createDos('https://v8.js-dos.com/bundles/digger.jsdos');
    });

    loadSelectedBtn && loadSelectedBtn.addEventListener('click', () => {
        const url = sampleSelect ? sampleSelect.value : '';
        if (url) createDos(url);
    });

    loadUrlBtn && loadUrlBtn.addEventListener('click', () => {
        const url = bundleInput ? bundleInput.value.trim() : '';
        if (!url) return alert('Please enter a bundle URL');
        createDos(url);
    });

    stopBtn && stopBtn.addEventListener('click', async () => {
        if (props && typeof props.stop === 'function') {
            await props.stop();
            props = null;
            dosContainer.innerHTML = '';
            dosContainer.innerText = 'Stopped';
        }
    });

    window.addEventListener('resize', () => requestAnimationFrame(resizeDos));
    dosContainer.addEventListener('click', () => dosContainer.focus());
    dosContainer.addEventListener('keydown', handleLocalKeyEvent, true);
    dosContainer.addEventListener('keyup', handleLocalKeyEvent, true);

    const DEFAULT_AUTOSTART = true;
    if (window.Dos && DEFAULT_AUTOSTART) {
        const defaultUrl = sampleSelect ? sampleSelect.value : 'https://v8.js-dos.com/bundles/digger.jsdos';
        const autoStartCheckbox = document.getElementById('auto-start');
        const shouldAutoStart = autoStartCheckbox ? autoStartCheckbox.checked : true;
        if (shouldAutoStart) createDos(defaultUrl, { theme: 'dark' });
    }

    if (!spixiAvailable) {
        updateLanStatus('LAN sync unavailable (no SDK)', 'offline');
        return;
    }

    updateLanStatus('LAN sync waiting for session', 'idle');

    const previousOnInit = SpixiAppSdk.onInit;
    SpixiAppSdk.onInit = function (sessionId, userAddresses) {
        lanSessionId = sessionId || '';
        lanInitialized = true;
        updateLanStatus('LAN sync idle', 'idle');
        startLanHeartbeat();
        sendLanMessage({ type: 'hello' });
        // replay queued key events after we have the session
        flushPendingKeyQueue();
        pruneLanPeers();
        if (typeof previousOnInit === 'function') {
            try { previousOnInit.apply(this, arguments); } catch (err) { console.warn('Spixi onInit handler error', err); }
        }
    };

    const previousOnProtocolData = SpixiAppSdk.onNetworkProtocolData;
    SpixiAppSdk.onNetworkProtocolData = function (senderAddress, protocolId, data) {
        if (protocolId === LAN_PROTOCOL_ID) {
            let payload = null;
            try {
                payload = typeof data === 'string' ? JSON.parse(data) : data;
            } catch (err) {
                console.warn('Failed to parse LAN payload', err, data);
            }
            handleLanPayload(senderAddress, payload || {});
            return;
        }
        if (typeof previousOnProtocolData === 'function') {
            try { previousOnProtocolData.apply(this, arguments); } catch (err) { console.warn('Spixi onNetworkProtocolData handler error', err); }
        }
    };

    window.addEventListener('beforeunload', () => {
        if (lanHelloInterval) clearInterval(lanHelloInterval);
        if (lanPeerPruneInterval) clearInterval(lanPeerPruneInterval);
    });
};
