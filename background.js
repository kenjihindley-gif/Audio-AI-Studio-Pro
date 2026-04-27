const capturedTabs = new Set(); 

chrome.runtime.onInstalled.addListener(async () => { await setupOffscreenDocument('offscreen.html'); });
chrome.runtime.onStartup.addListener(async () => { await setupOffscreenDocument('offscreen.html'); });

async function setupOffscreenDocument(path) {
  try {
      const offscreenUrl = chrome.runtime.getURL(path);
      const existingContexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [offscreenUrl] });
      if (existingContexts.length > 0) return;
      
      await chrome.offscreen.createDocument({ url: path, reasons: ['AUDIO_PLAYBACK', 'USER_MEDIA'], justification: 'Processamento de EQ individual por aba' });
  } catch (err) {}
}

chrome.tabs.onRemoved.addListener((tabId) => {
    if(capturedTabs.has(tabId)) { capturedTabs.delete(tabId); chrome.runtime.sendMessage({ action: 'remove_tab_engine', tabId: tabId }); }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'init_tab_capture') {
        setupOffscreenDocument('offscreen.html').then(() => { captureTab(message.tabId); });
    }
    
    else if (message.action === 'process_ai_command') {
        processPromptWithGemini(message.prompt, message.currentPoints, message.isNewCurve).then(eqPoints => {
            if (eqPoints && Array.isArray(eqPoints)) {
                chrome.runtime.sendMessage({ action: 'update_dynamic_eq', points: eqPoints, tabId: message.tabId });
            }
            sendResponse({ status: "Curva ajustada pela IA!" });
        });
        return true; 
    }

    // Receptor de gatilho do Sleep Timer
    else if (message.action === 'sleep_timer_close') {
        if (message.closeType === 'tab') {
            chrome.tabs.remove(message.targetTabId).catch(() => {});
        } else if (message.closeType === 'window') {
            chrome.tabs.get(message.targetTabId, (tab) => {
                if (tab && tab.windowId) {
                    chrome.windows.remove(tab.windowId).catch(() => {});
                }
            });
        }
        sendResponse({ status: 'closed' });
    }

    // Forçar Fullscreen da Janela (Correção para Bypass do TabCapture)
    else if (message.action === 'force_window_fullscreen') {
        if (sender && sender.tab && sender.tab.windowId) {
            if (message.state) {
                chrome.windows.get(sender.tab.windowId, (win) => {
                    if (!globalThis.prevWindowStates) globalThis.prevWindowStates = {};
                    globalThis.prevWindowStates[sender.tab.windowId] = win.state;
                    chrome.windows.update(sender.tab.windowId, { state: 'fullscreen' });
                });
            } else {
                let prevState = (globalThis.prevWindowStates && globalThis.prevWindowStates[sender.tab.windowId]) ? globalThis.prevWindowStates[sender.tab.windowId] : 'maximized';
                if (prevState === 'fullscreen') prevState = 'maximized';
                chrome.windows.update(sender.tab.windowId, { state: prevState });
            }
        }
        sendResponse({ status: 'ok' });
    }
});

function captureTab(tabId) {
    if (capturedTabs.has(tabId)) { chrome.runtime.sendMessage({ action: 'request_graph_update', tabId: tabId }); return; }

    chrome.tabs.get(tabId, (tab) => {
        if (!tab || tab.url.startsWith('chrome://')) return;
        chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
            if (streamId) {
                capturedTabs.add(tabId);
                
                // Injeta o content.js na aba para garantir que o listener de fullscreen (e outras funções) funcionem
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }).catch(err => console.log('Script injection failed:', err));

                chrome.runtime.sendMessage({ action: 'connect_tab_stream', streamId: streamId, tabId: tabId });
                setTimeout(() => chrome.runtime.sendMessage({ action: 'request_graph_update', tabId: tabId }), 500);
            }
        });
    });
}

// --- O CÉREBRO DA IA ---
async function processPromptWithGemini(userPrompt, currentPoints, isNewCurve) {
    const data = await chrome.storage.local.get(['geminiApiKey']);
    const GEMINI_API_KEY = data.geminiApiKey;

    if (!GEMINI_API_KEY) {
        console.warn("Chave da API Gemini não encontrada. A usar o Fallback local.");
        return fallbackMockAI(userPrompt, currentPoints, isNewCurve);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemInstruction = `Você é um engenheiro de masterização experiente lidando com usuários LEIGOS. O formato de saída DEVE SER EXATAMENTE E APENAS UM ARRAY JSON contendo objetos com "f" (frequência em Hz, de 20 a 20000), "g" (ganho em dB, de -15 a 15) e "q" (fator Q, de 0.1 a 10, padrão 1.2). NÃO escreva nada além do JSON.
    
LIBERDADE CRIATIVA NA CURVA:
Crie os pontos ("bolinhas") exatos onde a música precisar (qualquer frequência de 20 a 20000Hz).
- Cortes cirúrgicos (ex: sibilância, P estourando): Use Q alto (ex: 3.0 a 5.0) e ganho negativo.
- Ajustes musicais (ex: dar corpo, tirar abafado): Use Q baixo/médio (ex: 0.5 a 1.2) para afetar bandas largas suavemente.

DICIONÁRIO DE FREQUÊNCIAS E RECLAMAÇÕES (RESOLUÇÃO DE PROBLEMAS):
- PLOSIVAS ("P" batendo forte, "B" estourando o microfone): REDUZA 20Hz a 80Hz (Q 1.5).
- GRAVES MAGROS ("som fino", "seco", "sem peso", "falta corpo"): AUMENTE 100Hz a 250Hz.
- GRAVES GORDOS / LAMA ("som embolado", "grave invadindo", "sujo"): REDUZA 200Hz a 350Hz.
- SOM DE CAIXA ("cantando dentro de um papelão/caixa"): REDUZA 350Hz a 500Hz.
- SOM NASAL / TELEFONE / RÁDIO ("voz de fanho"): REDUZA 800Hz a 1500Hz.
- ESTRIDENTE ("dói o ouvido", "voz ardida", "grito"): REDUZA 2500Hz a 4000Hz.
- ABAFADO / ESCURO ("som tampado", "debaixo d'água"): AUMENTE os agudos largos 3000Hz a 8000Hz (Q 0.8).
- SIBILÂNCIA ("S" chiando, "C" cortante, "Z" forte): REDUZA cirurgicamente 5000Hz a 8000Hz (Q 3.0 a 5.0).
- FALTA DE BRILHO ("sem ar", "opaco", "som fechado"): AUMENTE super-agudos 10000Hz a 15000Hz.

INSTRUÇÃO DE INTENSIDADE E INTERPRETAÇÃO (COMO LER O USUÁRIO):
O PEDIDO de ação tem prioridade sobre a descrição do problema. (ex: "tá MUITO abafado, clareia SÓ UM POUCO" -> faça SÓ UM POUCO).
Na masterização, as alterações são minúsculas. NUNCA faça alterações de 10dB a menos que seja um comando drástico como "zere o grave".
- "UM POUCO", "SUTILMENTE", "LEVEMENTE": Ajuste minúsculo (+/- 0.5dB a 1.2dB).
- Sem modificador de intensidade: Ajuste padrão (+/- 1.5dB a 2.5dB).
- "MUITO", "BASTANTE": Ajuste forte, mas MUSICAL (+/- 3dB a 4dB).
- "EXTREMAMENTE", "MUITO MAIS", "MUITÍSSIMO": Ajuste extremo seguro (+/- 4.5dB a 6dB máximo).

REGRAS FINAIS:
- Se o usuário disser "tire o abafado", NÃO abafe. Ele quer CLAREZA, então AUMENTE os agudos.
- Interprete analogias com base no dicionário acima e gere o JSON.`;

    let userMessage = `Pedido do usuário: "${userPrompt}"\n\n`;

    if (!isNewCurve && currentPoints && currentPoints.length > 0) {
        userMessage += `INSTRUÇÃO: Modifique a curva atual. Aqui está o estado atual do EQ:\n${JSON.stringify(currentPoints)}\nFaça os ajustes solicitados nas frequências corretas baseando-se no Guia. Retorne o array inteiro atualizado.`;
    } else {
        userMessage += `INSTRUÇÃO: Crie uma NOVA CURVA do zero. Gere um novo array dinâmico focado apenas no pedido dele.`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction + "\n\n" + userMessage }] }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        let aiText = data.candidates[0].content.parts[0].text.trim();
        aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(aiText);
    } catch (error) {
        console.error("Erro na API do Gemini:", error);
        return fallbackMockAI(userPrompt, currentPoints, isNewCurve);
    }
}

// --- Fallback Dinâmico na Curva (Com Dicionário de Áudio Completo) ---
function fallbackMockAI(prompt, currentPoints, isNewCurve) {
    let pts = (!isNewCurve && currentPoints && currentPoints.length > 0) ? JSON.parse(JSON.stringify(currentPoints)) : [];
    
    const p = prompt.toLowerCase();
    
    // Tratamento Inteligente de Conflito de Modificadores
    let intensityMult = 1.0;
    if (p.includes("extremamente") || p.includes("muito mais") || p.includes("muitíssimo")) {
        intensityMult = 2.5; // ~4.5dB a 5dB
    } else if (p.includes("muito") || p.includes("bastante") || p.includes("demais")) {
        // Se houver mitigador, ele vence o "muito"
        if (p.includes("um pouco") || p.includes("levemente") || p.includes("sutil")) {
            intensityMult = 0.5; // ~0.9dB a 1dB
        } else {
            intensityMult = 1.8; // ~3.2dB a 3.6dB
        }
    } else if (p.includes("um pouco") || p.includes("pouco") || p.includes("levemente") || p.includes("sutil")) {
        intensityMult = 0.5; // ~0.9 a 1dB
    } 

    const boostVal = 1.8 * intensityMult; 
    const cutVal = -2.0 * intensityMult; 

    const adjust = (freqCenter, val, qVal = 1.2) => {
        if (pts.length === 0) {
            pts.push({ f: freqCenter, g: val, q: qVal });
            return;
        }
        let closest = pts.reduce((prev, curr) => Math.abs(curr.f - freqCenter) < Math.abs(prev.f - freqCenter) ? curr : prev);
        if (Math.abs(closest.f - freqCenter) > freqCenter * 0.4) {
            pts.push({ f: freqCenter, g: val, q: qVal });
        } else {
            closest.g += val;
            closest.q = qVal; 
        }
    };

    // --- Dicionário de Correção de Áudio ---
    // PLOSIVAS
    if (/\bp\b/.test(p) || /\bb\b/.test(p) || p.includes("estourando") || p.includes("p batendo") || p.includes("vento")) adjust(60, cutVal, 1.5);
    // GRAVES GORDOS / LAMA
    if (p.includes("embolad") || p.includes("lama") || p.includes("sujo") || p.includes("gordo")) adjust(250, cutVal, 1.2);
    // CORPO / SECO
    if (p.includes("seca") || p.includes("fina") || p.includes("sem corpo") || p.includes("magro")) adjust(150, boostVal, 1.0); 
    // CAIXA / PAPELAO
    if (p.includes("caixa") || p.includes("papelão") || p.includes("boxy")) adjust(400, cutVal, 1.5);
    // RADIO / TELEFONE
    if (p.includes("rádio") || p.includes("telefone") || p.includes("nasal") || p.includes("fanho")) adjust(1000, cutVal, 1.2);
    // DESTACAR / NA CARA
    if (p.includes("destacad") || p.includes("na cara") || p.includes("presença")) adjust(2500, boostVal, 1.0);
    // ESTRIDENTE
    if (p.includes("estrident") || p.includes("doendo") || p.includes("irritant") || p.includes("ardido") || p.includes("grito")) adjust(3500, cutVal, 1.5);
    // ABAFADO
    if (p.includes("abafad") || p.includes("tampad") || p.includes("água") || p.includes("escuro")) adjust(4500, boostVal, 0.8);
    // SIBILÂNCIA
    if (/\bs\b/.test(p) || p.includes("sibilância") || p.includes("s forte") || p.includes("chiado") || p.includes("cortante") || p.includes("z forte")) adjust(6500, cutVal, 3.5);
    // BRILHO
    if (p.includes("brilho") || p.includes("cristalin") || p.includes("ar ") || p.includes("abert")) adjust(12000, boostVal, 0.8);

    // Grave Genérico (se não foi filtrado por lama/gordo)
    if (p.includes("grave") || p.includes("peso") || p.includes("batida") || p.includes("soco") || p.includes("kick")) {
        if (!p.includes("gordo") && !p.includes("embolado")) { 
            if (p.includes("menos") || p.includes("tira") || p.includes("reduz") || p.includes("corta") || p.includes("abaixa")) {
                adjust(100, cutVal, 1.0);
            } else {
                adjust(80, boostVal, 1.0); 
            }
        }
    }
    
    if (pts.length === 0 && isNewCurve) {
        pts = [ {f: 150, g: 0, q: 1.2}, {f: 1000, g: 0, q: 1.2}, {f: 5000, g: 0, q: 1.2} ];
    }
    
    // Trava de segurança
    pts.forEach(pt => { if (pt.g > 15) pt.g = 15; if (pt.g < -15) pt.g = -15; });
    return pts;
}