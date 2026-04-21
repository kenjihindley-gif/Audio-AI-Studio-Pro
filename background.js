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
    
    if (message.action === 'process_ai_command') {
        processPromptWithGemini(message.prompt, message.currentPoints, message.isNewCurve).then(eqPoints => {
            if (eqPoints && Array.isArray(eqPoints)) {
                chrome.runtime.sendMessage({ action: 'update_dynamic_eq', points: eqPoints, tabId: message.tabId });
            }
            sendResponse({ status: "Curva ajustada pela IA!" });
        });
        return true; 
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

// --- O CÉREBRO DA IA (Com Engenharia de Prompt Ultra Expandida) ---
async function processPromptWithGemini(userPrompt, currentPoints, isNewCurve) {
    const data = await chrome.storage.local.get(['geminiApiKey']);
    const GEMINI_API_KEY = data.geminiApiKey;

    if (!GEMINI_API_KEY) {
        console.warn("Chave da API Gemini não encontrada. A usar o Fallback local.");
        return fallbackMockAI(userPrompt, currentPoints, isNewCurve);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    
    // Prompt de Sistema com Dicionário de Áudio Expandido (Cheat Sheet 20x)
    const systemInstruction = `Você é um engenheiro de masterização experiente. O formato de saída DEVE SER EXATAMENTE E APENAS UM ARRAY JSON contendo objetos com "f" (frequência em Hz, 20 a 20000), "g" (ganho em dB, de -15 a 15) e "q" (fator Q, de 0.1 a 10, padrão 1.2). NÃO escreva introduções ou crases de markdown.
    
GUIA DE INTERPRETAÇÃO DE FREQUÊNCIAS E SINÔNIMOS (Cheat Sheet):
- GRAVES (20Hz a 250Hz): grave, gordo, peso, sub, tremor, profundo, cheio, quente, boom, embolado, sujo, turvo, lama, encorpado, massivo, boomy, muddy, grosso, inchado, pancada, soco, kick.
- MÉDIOS GRAVES (250Hz a 500Hz): papelão, caixa, boxy, nasal baixo, oco, fechado, abafado, madeira, veludo, opaco, sem vida, som de quarto, lama média, fofo.
- MÉDIOS (500Hz a 2000Hz): médio, nasal, telefone, megafone, buzina, honky, lata, plástico, rádio antigo, fanho, agressivo médio, na cara, voz projetada.
- MÉDIOS AGUDOS (2000Hz a 5000Hz): estridente, ardido, cortante, agressivo, presença, irritante, rasgado, pontudo, metálico, afiado, perfurante, harsh, fadiga, cansaço auditivo, clareza, definição, estalo, voz muito aguda.
- AGUDOS (5000Hz a 8000Hz): sibilância, esser, "s" forte, s forte, chiado, sibilante, assobio, crisp, estalos de boca, excesso de consoantes, sssss, "f" ou "t" fortes.
- AR / SUPER AGUDOS (8000Hz a 20000Hz): ar, brilho, cristalino, seda, respiração, aberto, cintilante, leveza, fôlego, areia, agudo extremo.

REGRA DE DIREÇÃO (CRÍTICO): 
Identifique os verbos e adjetivos de direção ("remover", "reduzir", "abaixar", "tirar", "cortar", "limpar", "amenizar", "suavizar", "seco"). Se a intenção for negativa ou de limpeza, você DEVE SUBTRAIR do valor do ganho atual nas frequências indicadas. Se for "aumentar", "mais", "adicionar", você deve SOMAR. NUNCA aumente o ganho de uma frequência quando a intenção for limpar um problema (ex: remover estridência, deixar mais seco, tirar embolado).`;

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

// --- Fallback aprimorado com Dicionário Léxico Array-Based ---
function fallbackMockAI(prompt, currentPoints, isNewCurve) {
    let pts = (!isNewCurve && currentPoints && currentPoints.length > 0) ? JSON.parse(JSON.stringify(currentPoints)) : [ {f: 150, g: 0, q: 1.2}, {f: 400, g: 0, q: 1.2}, {f: 1000, g: 0, q: 1.2}, {f: 3000, g: 0, q: 1.2}, {f: 8000, g: 0, q: 1.2} ];
    const p = prompt.toLowerCase();
    
    // Vocabulário de Direção
    const cutWords = ["menos", "remov", "tir", "abai", "reduz", "cort", "seco", "limp", "ameniz", "suaviz"];
    const isCut = cutWords.some(w => p.includes(w));
    const dir = isCut ? -5 : 4; // Ajuste mais assertivo (5dB) para limpeza

    // Bancos de Palavras por Região (Cheat Sheet Fallback)
    const gravesWords = ["grave", "gordo", "embolado", "peso", "sub", "tremor", "profundo", "cheio", "quente", "boom", "sujo", "turvo", "lama", "encorpado", "massivo", "boomy", "muddy", "grosso", "inchado", "pancada", "soco", "kick"];
    const mediosGravesWords = ["médio grave", "medio grave", "papelão", "caixa", "boxy", "oco", "fechado", "abafado", "madeira", "veludo", "opaco", "sem vida", "som de quarto", "fofo"];
    const mediosWords = ["médio", "medio", "nasal", "telefone", "megafone", "buzina", "honky", "lata", "plástico", "rádio", "fanho", "duro", "na cara", "mordida"];
    const mediosAgudosWords = ["médio agudo", "medio agudo", "estridente", "ardido", "cortante", "presença", "agressivo", "irritante", "rasgado", "pontudo", "metálico", "afiado", "perfurante", "harsh", "fadiga", "cansaço", "estalo", "voz muito aguda"];
    const agudosWords = ["agudo", "sibilância", "s forte", "chiado", "sibilante", "assobio", "crisp", "ssss", "f forte", "t forte", "ar", "brilho", "cristalino", "seda", "respiração", "aberto", "cintilante", "leveza", "fôlego"];

    pts.forEach(pt => {
        // 1. Graves (até 250Hz)
        if (gravesWords.some(w => p.includes(w)) && pt.f <= 250) {
            pt.g += (p.includes("seco") || p.includes("limp") || p.includes("desembol")) && !p.includes("mais") ? -6 : dir;
        }
        
        // 2. Médios Graves (250Hz - 500Hz)
        if (mediosGravesWords.some(w => p.includes(w)) && pt.f > 250 && pt.f <= 500) {
            pt.g += dir;
        }

        // 3. Médios (500Hz - 2000Hz)
        if (mediosWords.some(w => p.includes(w)) && pt.f > 500 && pt.f <= 2000) {
            pt.g += dir;
        }
        
        // 4. Médios Agudos (2000Hz - 5000Hz) - Áre Crítica
        if (mediosAgudosWords.some(w => p.includes(w)) && pt.f > 2000 && pt.f <= 5000) {
            if (p.includes("estridente") || p.includes("ardido") || p.includes("perfurante") || p.includes("metálico")) pt.g += -6; // Hard cut
            else pt.g += dir;
        }
        
        // 5. Agudos e Ar (5000Hz+) - De-Esser e Brilho
        if (agudosWords.some(w => p.includes(w)) && pt.f > 5000) {
            if (/\bs\b/.test(p) || p.includes("sibilância") || p.includes("s forte") || p.includes("chiado")) pt.g += -6; // De-esser
            else pt.g += dir;
        }
    });
    
    // Trava de segurança contra distorção (-15 a +15dB)
    pts.forEach(pt => { if(pt.g > 15) pt.g = 15; if(pt.g < -15) pt.g = -15; });
    return pts;
}