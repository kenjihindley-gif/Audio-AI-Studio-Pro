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
});

function captureTab(tabId) {
    if (capturedTabs.has(tabId)) { chrome.runtime.sendMessage({ action: 'request_graph_update', tabId: tabId }); return; }

    chrome.tabs.get(tabId, (tab) => {
        if (!tab || tab.url.startsWith('chrome://')) return;
        chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
            if (streamId) {
                capturedTabs.add(tabId);
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
    
    const systemInstruction = `Você é um engenheiro de masterização experiente. O formato de saída DEVE SER EXATAMENTE E APENAS UM ARRAY JSON contendo objetos com "f" (frequência em Hz, 20 a 20000), "g" (ganho em dB, de -15 a 15) e "q" (fator Q, de 0.1 a 10, padrão 1.2). NÃO escreva introduções ou crases de markdown.
    
GUIA DE INTERPRETAÇÃO DE FREQUÊNCIAS E SINÔNIMOS (Cheat Sheet):
- GRAVES (20Hz a 250Hz): grave, gordo, peso, sub, tremor, profundo, cheio, quente, boom, embolado, sujo, turvo, lama, encorpado, massivo, boomy, muddy, grosso, inchado, pancada, soco, kick.
- MÉDIOS GRAVES (250Hz a 500Hz): papelão, caixa, boxy, nasal baixo, oco, fechado, madeira, veludo, opaco, sem vida, som de quarto, lama média, fofo.
- MÉDIOS (500Hz a 2000Hz): médio, medio, nasal, telefone, megafone, buzina, honky, lata, plástico, rádio antigo, fanho, duro, na cara, mordida. (ATENÇÃO: Se o usuário disser que a voz está "FRACA" ou "SUMIDA", você deve AUMENTAR aqui para dar projeção).
- MÉDIOS AGUDOS (2000Hz a 5000Hz): estridente, ardido, cortante, agressivo, presença, irritante, rasgado, pontudo, metálico, afiado, perfurante, harsh, fadiga, cansaço auditivo, clareza, definição, estalo, voz muito aguda. (ATENÇÃO: Se o usuário disser que a voz está "ABAFADA" ou "TAMPADA", você deve AUMENTAR aqui para desembolar e trazer inteligibilidade).
- AGUDOS (5000Hz a 8000Hz): sibilância, esser, "s" forte, s forte, chiado, sibilante, assobio, crisp, estalos de boca, excesso de consoantes, sssss, "f" ou "t" fortes.
- AR / SUPER AGUDOS (8000Hz a 20000Hz): ar, brilho, cristalino, seda, respiração, aberto, cintilante, leveza, fôlego, areia, agudo extremo.

REGRA DE DIREÇÃO: 
Identifique verbos de direção de redução ("diminuir", "remover", "reduzir", "abaixar", "tirar", "cortar", "limpar", "amenizar", "suavizar", "atenuar", "seco"). Se a intenção for negativa, SUBTRAIA do ganho atual. Se for "aumentar", "mais", "adicionar", SOME ao ganho. EXCEÇÃO: Problemas como "fraca" e "abafada" exigem GANHO POSITIVO nas bandas corretas para resolver o defeito.

REGRA DE INTENSIDADE (DOSAGEM DE DB):
- Se o usuário usar modificadores agressivos ("MUITO", "DEMAIS", "BASTANTE"): Faça uma alteração pesada (ex: +/- 6dB a 9dB).
- Se o usuário usar modificadores fracos ("POUCO", "UM POUCO", "LEVEMENTE"): Faça uma alteração moderada (ex: +/- 2dB a 3.5dB).
- Se o usuário pedir um ajuste fino ("SUTIL", "SUTILMENTE"): Faça uma alteração cirúrgica e bem pequena (ex: +/- 0.5dB a 1.5dB).
- Sem modificadores: Use o ajuste padrão (ex: +/- 4dB a 5dB).`;

    let userMessage = `Pedido do usuário: "${userPrompt}"\n\n`;

    if (!isNewCurve && currentPoints && currentPoints.length > 0) {
        userMessage += `INSTRUÇÃO: Modifique a curva atual. Aqui está o estado atual do EQ:\n${JSON.stringify(currentPoints)}\nFaça os ajustes solicitados SOMANDO ou SUBTRAINDO dos ganhos ("g") nas frequências corretas baseando-se no Guia. Retorne o array inteiro atualizado.`;
    } else {
        userMessage += `INSTRUÇÃO: Crie uma NOVA CURVA do zero. Ignore curvas anteriores e gere um novo array focado apenas no pedido dele.`;
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

// --- Fallback com Lógica de Verbos Corrigida ---
function fallbackMockAI(prompt, currentPoints, isNewCurve) {
    let pts = (!isNewCurve && currentPoints && currentPoints.length > 0) ? JSON.parse(JSON.stringify(currentPoints)) : [ {f: 150, g: 0, q: 1.2}, {f: 400, g: 0, q: 1.2}, {f: 1000, g: 0, q: 1.2}, {f: 3000, g: 0, q: 1.2}, {f: 8000, g: 0, q: 1.2} ];
    const p = prompt.toLowerCase();
    
    // Vocabulário de Direção Geral
    const cutWords = ["menos", "remov", "tir", "abai", "reduz", "cort", "seco", "limp", "ameniz", "suaviz", "diminu", "baix", "atenu"];
    const isCut = cutWords.some(w => p.includes(w));

    // Lógica de Intensidade (Multiplicadores)
    let intensityMult = 1.0;
    if (p.includes("muito") || p.includes("bastante") || p.includes("demais") || p.includes("forte")) intensityMult = 1.8; 
    else if (p.includes("pouco") || p.includes("levemente")) intensityMult = 0.5; 
    else if (p.includes("sutil") || p.includes("sutilmente")) intensityMult = 0.25; 

    const boostVal = 4 * intensityMult;
    const cutVal = -5 * intensityMult;
    const dir = isCut ? cutVal : boostVal;

    // Bancos de Palavras por Região
    const gravesWords = ["grave", "gordo", "embolado", "peso", "sub", "tremor", "profundo", "cheio", "quente", "boom", "sujo", "turvo", "lama", "encorpado", "massivo", "boomy", "muddy", "grosso", "inchado", "pancada", "soco", "kick"];
    const mediosGravesWords = ["médio grave", "medio grave", "papelão", "caixa", "boxy", "oco", "fechado", "madeira", "veludo", "opaco", "sem vida", "som de quarto", "fofo"];
    const mediosWords = ["médio", "medio", "nasal", "telefone", "megafone", "buzina", "honky", "lata", "plástico", "rádio", "fanho", "duro", "na cara", "mordida", "fraca", "sem força", "sumida"];
    const mediosAgudosWords = ["médio agudo", "medio agudo", "estridente", "ardido", "cortante", "presença", "agressivo", "irritante", "rasgado", "pontudo", "metálico", "afiado", "perfurante", "harsh", "fadiga", "cansaço", "estalo", "voz muito aguda", "abafada", "abafado", "tampada"];
    const agudosWords = ["agudo", "sibilância", "s forte", "chiado", "sibilante", "assobio", "crisp", "ssss", "f forte", "t forte", "ar", "brilho", "cristalino", "seda", "respiração", "aberto", "cintilante", "leveza", "fôlego"];

    pts.forEach(pt => {
        if (gravesWords.some(w => p.includes(w)) && pt.f <= 250) {
            pt.g += (p.includes("seco") || p.includes("limp") || p.includes("desembol")) && !p.includes("mais") ? cutVal : dir;
        }
        if (mediosGravesWords.some(w => p.includes(w)) && pt.f > 250 && pt.f <= 500) { pt.g += dir; }
        if (mediosWords.some(w => p.includes(w)) && pt.f > 500 && pt.f <= 2000) {
            if (p.includes("fraca") || p.includes("sem força") || p.includes("sumida")) pt.g += boostVal;
            else pt.g += dir;
        }
        if (mediosAgudosWords.some(w => p.includes(w)) && pt.f > 2000 && pt.f <= 5000) {
            if (p.includes("estridente") || p.includes("ardido") || p.includes("perfurante") || p.includes("metálico")) pt.g += (cutVal * 1.2); 
            else if (p.includes("abafada") || p.includes("abafado") || p.includes("tampada")) pt.g += boostVal;
            else pt.g += dir;
        }
        if (agudosWords.some(w => p.includes(w)) && pt.f > 5000) {
            if (/\bs\b/.test(p) || p.includes("sibilância") || p.includes("s forte") || p.includes("chiado")) pt.g += (cutVal * 1.2); 
            else pt.g += dir;
        }
    });
    
    // Trava de segurança contra distorção
    pts.forEach(pt => { if(pt.g > 15) pt.g = 15; if(pt.g < -15) pt.g = -15; });
    return pts;
}