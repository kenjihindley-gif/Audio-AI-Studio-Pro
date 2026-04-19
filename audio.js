const tabEngines = {}; 
const MAX_FILTERS = 15; 
const numFrequencies = 200;

async function createEngine(tabId, streamId) {
    if (tabEngines[tabId]) return;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const filters = [];
    
    // Cria a corrente de EQ
    for(let i=0; i < MAX_FILTERS; i++) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        filter.Q.setValueAtTime(1.2, audioCtx.currentTime);
        filter.gain.setValueAtTime(0, audioCtx.currentTime); 
        filters.push(filter);
    }
    for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);

    // O "Booster" atua apenas sobre a cadeia processada (Wet)
    const boosterGainNode = audioCtx.createGain();
    boosterGainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
    filters[filters.length - 1].connect(boosterGainNode);

    // --- NOVA ARQUITETURA DE ROTEAMENTO (Individual por Card) ---
    // Output 1
    const out1Wet = audioCtx.createGain(); out1Wet.gain.value = 1;
    const out1Dry = audioCtx.createGain(); out1Dry.gain.value = 0;
    const out1Vol = audioCtx.createGain(); out1Vol.gain.value = 1;

    // Output 2
    const out2Wet = audioCtx.createGain(); out2Wet.gain.value = 1;
    const out2Dry = audioCtx.createGain(); out2Dry.gain.value = 0;
    const out2Vol = audioCtx.createGain(); out2Vol.gain.value = 1;

    // Liga a corrente processada aos nós "Wet" de cada saída
    boosterGainNode.connect(out1Wet);
    boosterGainNode.connect(out2Wet);

    // Liga os nós ao controlo de volume final de cada saída
    out1Wet.connect(out1Vol);
    out1Dry.connect(out1Vol);
    
    out2Wet.connect(out2Vol);
    out2Dry.connect(out2Vol);

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024; 
    analyser.smoothingTimeConstant = 0.85; 
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // O Analisador visual lê a saída primária
    out1Vol.connect(analyser);

    // Direcionamentos Finais
    out1Vol.connect(audioCtx.destination); // Saída 1

    const secondaryDestination = audioCtx.createMediaStreamDestination();
    out2Vol.connect(secondaryDestination); // Saída 2
    
    const secondaryAudioElement = new Audio();
    secondaryAudioElement.srcObject = secondaryDestination.stream;
    secondaryAudioElement.muted = true; 

    const myFrequencyArray = new Float32Array(numFrequencies);
    const minFreq = 20; const maxFreq = 20000;
    for (let i = 0; i < numFrequencies; i++) { myFrequencyArray[i] = minFreq * Math.pow(maxFreq / minFreq, i / numFrequencies); }

    const engine = {
        audioCtx, filters, boosterGainNode, streamSource: null,
        out1Wet, out1Dry, out1Vol, out2Wet, out2Dry, out2Vol,
        isPowerOn: true, points: [], boosterVolume: 100, 
        
        // Estado de Roteamento
        routing: {
            deviceId: "", secondaryDeviceId: "",
            out1Vol: 100, out2Vol: 100,
            out1EffectOn: true, out2EffectOn: true
        },

        secondaryAudioElement, analyser, dataArray, myFrequencyArray,
        magnitudeResponse: new Float32Array(numFrequencies), phaseResponse: new Float32Array(numFrequencies)
    };
    
    tabEngines[tabId] = engine;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }
        });
        const source = audioCtx.createMediaStreamSource(stream);
        
        // Liga o áudio capturado à cadeia de EQ e também diretamente aos nós "Dry" (Limpo)
        source.connect(filters[0]); 
        source.connect(out1Dry);
        source.connect(out2Dry);
        
        engine.streamSource = source;
        
        chrome.storage.local.get(['isAppOn'], (res) => {
            if (res.isAppOn === false) { engine.isPowerOn = false; updateRoutingState(engine); }
        });

        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { console.error("Erro ao capturar aba:", e); }
}

function removeEngine(tabId) {
    const engine = tabEngines[tabId];
    if (engine) {
        if (engine.streamSource) engine.streamSource.disconnect();
        if (engine.secondaryAudioElement) { engine.secondaryAudioElement.pause(); engine.secondaryAudioElement.srcObject = null; }
        engine.audioCtx.close(); delete tabEngines[tabId];
    }
}

function calculateAndSendGraphData(tabId) {
    const engine = tabEngines[tabId]; if(!engine) return;
    const totalLinearGain = new Float32Array(numFrequencies).fill(1.0);
    engine.filters.forEach(filter => {
        if(filter.gain.value !== 0) {
            filter.getFrequencyResponse(engine.myFrequencyArray, engine.magnitudeResponse, engine.phaseResponse);
            for (let i = 0; i < numFrequencies; i++) totalLinearGain[i] *= engine.magnitudeResponse[i];
        }
    });
    const dbTotalResponse = Array.from(totalLinearGain).map(g => g > 0 ? 20 * Math.log10(g) : -100);
    const boosterDB = engine.boosterGainNode.gain.value > 0 ? 20 * Math.log10(engine.boosterGainNode.gain.value) : -100;
    chrome.runtime.sendMessage({ action: 'update_graph_data', dbValues: dbTotalResponse, boosterDB: boosterDB, tabId: tabId });
}

// Aplica a matemática complexa de volumes individuais e bypass global vs individual
function updateRoutingState(engine) {
    const t = engine.audioCtx.currentTime;
    const isGlobalOn = engine.isPowerOn;

    // Output 1 
    const out1On = isGlobalOn && engine.routing.out1EffectOn;
    engine.out1Wet.gain.setTargetAtTime(out1On ? 1 : 0, t, 0.05);
    engine.out1Dry.gain.setTargetAtTime(out1On ? 0 : 1, t, 0.05);
    engine.out1Vol.gain.setTargetAtTime(engine.routing.out1Vol / 100, t, 0.05);

    // Output 2
    const out2On = isGlobalOn && engine.routing.out2EffectOn;
    engine.out2Wet.gain.setTargetAtTime(out2On ? 1 : 0, t, 0.05);
    engine.out2Dry.gain.setTargetAtTime(out2On ? 0 : 1, t, 0.05);
    engine.out2Vol.gain.setTargetAtTime(engine.routing.out2Vol / 100, t, 0.05);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = message.tabId;
    if (message.action === 'connect_tab_stream') { createEngine(tabId, message.streamId); sendResponse({ status: "ok" }); return true; } 
    else if (message.action === 'remove_tab_engine') { removeEngine(tabId); sendResponse({ status: "ok" }); return true; }

    const engine = tabEngines[tabId];
    if (!engine) { sendResponse({ status: "no_engine" }); return true; }

    switch (message.action) {
        case 'update_dynamic_eq':
            engine.points = message.points; const now = engine.audioCtx.currentTime;
            for(let i=0; i < engine.filters.length; i++) {
                const filter = engine.filters[i];
                if (i < message.points.length) {
                    const pt = message.points[i];
                    filter.frequency.setTargetAtTime(pt.f, now, 0.03); filter.gain.setTargetAtTime(pt.g, now, 0.03); filter.Q.setTargetAtTime(pt.q, now, 0.03);
                } else { filter.gain.setTargetAtTime(0, now, 0.03); }
            }
            setTimeout(() => calculateAndSendGraphData(tabId), 60);
            sendResponse({ status: "ok" }); break;

        case 'set_booster':
            engine.boosterVolume = message.volume;
            if (engine.boosterGainNode) {
                engine.boosterGainNode.gain.setTargetAtTime(message.volume / 100, engine.audioCtx.currentTime, 0.05);
                setTimeout(() => calculateAndSendGraphData(tabId), 50);
            }
            sendResponse({ status: "ok" }); break;

        case 'request_graph_update':
            calculateAndSendGraphData(tabId);
            chrome.runtime.sendMessage({ action: 'sync_popup_state', points: engine.points, boosterVolume: engine.boosterVolume, routing: engine.routing, tabId: tabId });
            sendResponse({ status: "ok" }); break;

        case 'set_routing_params': 
            // Atualiza Hardware Físico
            if (message.deviceId !== undefined && message.deviceId !== engine.routing.deviceId) {
                engine.routing.deviceId = message.deviceId;
                if (typeof engine.audioCtx.setSinkId === 'function') engine.audioCtx.setSinkId(engine.routing.deviceId).catch(e => console.error(e));
            }
            
            if (message.secondaryDeviceId !== undefined && message.secondaryDeviceId !== engine.routing.secondaryDeviceId) {
                engine.routing.secondaryDeviceId = message.secondaryDeviceId;
                if (engine.secondaryAudioElement && typeof engine.secondaryAudioElement.setSinkId === 'function') {
                    if (engine.routing.secondaryDeviceId !== "") {
                        engine.secondaryAudioElement.setSinkId(engine.routing.secondaryDeviceId).then(() => {
                            engine.secondaryAudioElement.muted = false; engine.secondaryAudioElement.play().catch(e => {});
                        });
                    } else { engine.secondaryAudioElement.muted = true; engine.secondaryAudioElement.pause(); }
                }
            }

            // Atualiza Volumes e Efeitos Individuais
            if (message.out1Vol !== undefined) engine.routing.out1Vol = message.out1Vol;
            if (message.out2Vol !== undefined) engine.routing.out2Vol = message.out2Vol;
            if (message.out1EffectOn !== undefined) engine.routing.out1EffectOn = message.out1EffectOn;
            if (message.out2EffectOn !== undefined) engine.routing.out2EffectOn = message.out2EffectOn;
            
            updateRoutingState(engine);
            sendResponse({ status: "ok" }); break;
            
        case 'set_power_state':
            engine.isPowerOn = message.isPowerOn; updateRoutingState(engine);
            sendResponse({ status: "ok" }); break;

        case 'get_spectrum':
            if (engine.analyser && engine.dataArray) {
                engine.analyser.getByteFrequencyData(engine.dataArray);
                sendResponse({ data: Array.from(engine.dataArray), sampleRate: engine.audioCtx.sampleRate });
            } else { sendResponse({ data: [], sampleRate: 48000 }); }
            break;
            
        default: sendResponse({ status: "unknown" });
    }
    return true; 
});