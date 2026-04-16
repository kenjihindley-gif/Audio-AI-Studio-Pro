// Dicionário que vai guardar um motor de áudio inteiro para CADA aba aberta!
const tabEngines = {}; 

const MAX_FILTERS = 15; 
const numFrequencies = 200;

// Cria um "Motor de Áudio" totalmente independente para a aba solicitada
async function createEngine(tabId, streamId) {
    if (tabEngines[tabId]) return; // Evita criar duplicados na mesma aba

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const filters = [];
    
    // Cria os filtros independentes
    for(let i=0; i < MAX_FILTERS; i++) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        filter.Q.setValueAtTime(1.2, audioCtx.currentTime);
        filter.gain.setValueAtTime(0, audioCtx.currentTime); 
        filters.push(filter);
    }
    for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);

    const boosterGainNode = audioCtx.createGain();
    boosterGainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
    filters[filters.length - 1].connect(boosterGainNode);

    // Sistema de Bypass Profissional (Wet/Dry)
    const dryGain = audioCtx.createGain();
    const wetGain = audioCtx.createGain();
    
    // Começa ligado (Wet = 100%, Dry = 0%)
    dryGain.gain.setValueAtTime(0, audioCtx.currentTime);
    wetGain.gain.setValueAtTime(1, audioCtx.currentTime);

    boosterGainNode.connect(wetGain);
    
    // --- NOVO: Analisador de Espectro (Ouvido do Gráfico) ---
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024; // Resolução do gráfico de barras
    analyser.smoothingTimeConstant = 0.85; // Deixa o movimento das barras suave e fluido
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // 1ª SAÍDA: Destino Principal do AudioContext + Analisador de Barras
    wetGain.connect(audioCtx.destination);
    dryGain.connect(audioCtx.destination);
    
    // Liga o analisador para ouvir tanto o som com efeito quanto o som limpo
    wetGain.connect(analyser);
    dryGain.connect(analyser);

    // --- MAGIA DA SAÍDA DUPLA (Dual Audio) ---
    // Cria um destino virtual para clonar o sinal
    const secondaryDestination = audioCtx.createMediaStreamDestination();
    wetGain.connect(secondaryDestination);
    dryGain.connect(secondaryDestination);
    
    // Cria um reprodutor de áudio oculto para direcionar para o segundo hardware
    const secondaryAudioElement = new Audio();
    secondaryAudioElement.srcObject = secondaryDestination.stream;
    secondaryAudioElement.muted = true; // Nasce mutado para não sobrepor na saída padrão
    // ----------------------------------------

    // Preparar as arrays matemáticas exclusivas deste motor
    const myFrequencyArray = new Float32Array(numFrequencies);
    const minFreq = 20; const maxFreq = 20000;
    for (let i = 0; i < numFrequencies; i++) {
        myFrequencyArray[i] = minFreq * Math.pow(maxFreq / minFreq, i / numFrequencies);
    }

    // Guarda tudo no cofre daquela aba específica
    const engine = {
        audioCtx, filters, boosterGainNode, streamSource: null,
        dryGain, wetGain, isPowerOn: true, 
        points: [], boosterVolume: 100, 
        outputDeviceId: "", secondaryDeviceId: "", 
        secondaryAudioElement, 
        analyser, dataArray, // Guardando a memória visual das barras
        myFrequencyArray,
        magnitudeResponse: new Float32Array(numFrequencies),
        phaseResponse: new Float32Array(numFrequencies)
    };
    
    tabEngines[tabId] = engine;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }
        });
        const source = audioCtx.createMediaStreamSource(stream);
        
        // Divide o sinal da aba! Um vai para os filtros (Wet), outro vai limpo (Dry)
        source.connect(filters[0]); 
        source.connect(dryGain);
        
        engine.streamSource = source;
        
        // Sincroniza o estado de energia inicial
        chrome.storage.local.get(['isAppOn'], (res) => {
            if (res.isAppOn === false) {
                engine.isPowerOn = false;
                engine.dryGain.gain.setValueAtTime(1, audioCtx.currentTime);
                engine.wetGain.gain.setValueAtTime(0, audioCtx.currentTime);
            }
        });

        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { console.error("Erro ao capturar aba:", e); }
}

// Destrói o motor e liberta a memória quando a aba é fechada
function removeEngine(tabId) {
    const engine = tabEngines[tabId];
    if (engine) {
        if (engine.streamSource) engine.streamSource.disconnect();
        if (engine.secondaryAudioElement) {
            engine.secondaryAudioElement.pause();
            engine.secondaryAudioElement.srcObject = null;
        }
        engine.audioCtx.close();
        delete tabEngines[tabId];
    }
}

function calculateAndSendGraphData(tabId) {
    const engine = tabEngines[tabId];
    if(!engine) return;

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = message.tabId;
    
    if (message.action === 'connect_tab_stream') {
        createEngine(tabId, message.streamId);
        sendResponse({ status: "ok" }); return true;
    } else if (message.action === 'remove_tab_engine') {
        removeEngine(tabId);
        sendResponse({ status: "ok" }); return true;
    }

    const engine = tabEngines[tabId];
    if (!engine) { sendResponse({ status: "no_engine" }); return true; }

    switch (message.action) {
        case 'update_dynamic_eq':
            engine.points = message.points;
            const now = engine.audioCtx.currentTime;
            for(let i=0; i < engine.filters.length; i++) {
                const filter = engine.filters[i];
                if (i < message.points.length) {
                    const pt = message.points[i];
                    filter.frequency.setTargetAtTime(pt.f, now, 0.03);
                    filter.gain.setTargetAtTime(pt.g, now, 0.03);
                    filter.Q.setTargetAtTime(pt.q, now, 0.03);
                } else {
                    filter.gain.setTargetAtTime(0, now, 0.03);
                }
            }
            setTimeout(() => calculateAndSendGraphData(tabId), 60);
            sendResponse({ status: "ok" });
            break;

        case 'set_booster':
            engine.boosterVolume = message.volume;
            if (engine.boosterGainNode) {
                engine.boosterGainNode.gain.setTargetAtTime(message.volume / 100, engine.audioCtx.currentTime, 0.05);
                setTimeout(() => calculateAndSendGraphData(tabId), 50);
            }
            sendResponse({ status: "ok" });
            break;

        case 'request_graph_update':
            calculateAndSendGraphData(tabId);
            chrome.runtime.sendMessage({
                action: 'sync_popup_state',
                points: engine.points,
                boosterVolume: engine.boosterVolume,
                outputDeviceId: engine.outputDeviceId,
                secondaryDeviceId: engine.secondaryDeviceId, 
                tabId: tabId
            });
            sendResponse({ status: "ok" });
            break;

        case 'set_output_device': 
            engine.outputDeviceId = message.deviceId || "";
            engine.secondaryDeviceId = message.secondaryDeviceId || "";
            
            // 1. Aplica Roteamento na Saída Principal
            if (typeof engine.audioCtx.setSinkId === 'function') {
                engine.audioCtx.setSinkId(engine.outputDeviceId).catch(e => console.error(e));
            }
            
            // 2. Aplica Roteamento na Saída Secundária (Clonada)
            if (engine.secondaryAudioElement && typeof engine.secondaryAudioElement.setSinkId === 'function') {
                if (engine.secondaryDeviceId !== "") {
                    engine.secondaryAudioElement.setSinkId(engine.secondaryDeviceId).then(() => {
                        engine.secondaryAudioElement.muted = false;
                        engine.secondaryAudioElement.play().catch(e => console.log("Aguardando interação da página para tocar na 2ª saída...", e));
                    }).catch(e => console.error("Erro ao rotear Saída Secundária:", e));
                } else {
                    engine.secondaryAudioElement.muted = true;
                    engine.secondaryAudioElement.pause();
                }
            }
            sendResponse({ status: "ok" });
            break;
            
        case 'set_power_state':
            engine.isPowerOn = message.isPowerOn;
            const t = engine.audioCtx.currentTime;
            if (message.isPowerOn) {
                engine.dryGain.gain.setTargetAtTime(0, t, 0.05);
                engine.wetGain.gain.setTargetAtTime(1, t, 0.05);
            } else {
                engine.dryGain.gain.setTargetAtTime(1, t, 0.05);
                engine.wetGain.gain.setTargetAtTime(0, t, 0.05);
            }
            sendResponse({ status: "ok" });
            break;

        // --- NOVO: Devolve os dados do Espectro Visual para o Popup! ---
        case 'get_spectrum':
            if (engine.analyser && engine.dataArray) {
                engine.analyser.getByteFrequencyData(engine.dataArray);
                sendResponse({ 
                    data: Array.from(engine.dataArray), // Converte para Array normal para transitar mensagens
                    sampleRate: engine.audioCtx.sampleRate 
                });
            } else {
                sendResponse({ data: [], sampleRate: 48000 });
            }
            break;
            
        default:
            sendResponse({ status: "unknown" });
    }
    
    return true; // Mantém a comunicação assíncrona aberta
});