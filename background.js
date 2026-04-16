const GEMINI_API_KEY = "AIzaSyCW1SHZ-XMGWGx5yFG7CJrXPpTWlJTSDxw";
const capturedTabs = new Set(); // Guarda o ID de todas as abas que têm o áudio a ser processado

chrome.runtime.onInstalled.addListener(async () => {
  await setupOffscreenDocument('offscreen.html');
});

async function setupOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });
  if (existingContexts.length > 0) return;
  
  await chrome.offscreen.createDocument({ 
      url: path, 
      reasons: ['AUDIO_PLAYBACK', 'USER_MEDIA'], 
      justification: 'Processamento de EQ individual por aba' 
  });
}

// Limpa a memória do motor quando o utilizador fecha a aba do Chrome
chrome.tabs.onRemoved.addListener((tabId) => {
    if(capturedTabs.has(tabId)) {
        capturedTabs.delete(tabId);
        chrome.runtime.sendMessage({ action: 'remove_tab_engine', tabId: tabId });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Quando o popup abre, ele avisa qual é a aba atual
    if (message.action === 'init_tab_capture') {
        captureTab(message.tabId);
    }
    
    // Lógica da Inteligência Artificial ATUALIZADA
    if (message.action === 'process_ai_command') {
        // Passa o comando de voz, os pontos atuais e se o switch de "Nova Curva" está ligado
        processPromptWithGemini(message.prompt, message.currentPoints, message.isNewCurve).then(eqPoints => {
            if (eqPoints && Array.isArray(eqPoints)) {
                // Envia os pontos calculados APENAS para a aba correta
                chrome.runtime.sendMessage({ action: 'update_dynamic_eq', points: eqPoints, tabId: message.tabId });
            }
            sendResponse({ status: "Curva ajustada pela IA!" });
        });
        return true; 
    }
});

function captureTab(tabId) {
    if (capturedTabs.has(tabId)) {
        // Se a aba já foi capturada antes, só pede ao motor para devolver os dados visuais ao popup
        chrome.runtime.sendMessage({ action: 'request_graph_update', tabId: tabId });
        return;
    }

    chrome.tabs.get(tabId, (tab) => {
        if (!tab || tab.url.startsWith('chrome://')) return;

        chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
            if (streamId) {
                capturedTabs.add(tabId);
                chrome.runtime.sendMessage({ action: 'connect_tab_stream', streamId: streamId, tabId: tabId });
                
                // Pequeno delay para garantir que o motor iniciou antes de pedir o desenho do gráfico
                setTimeout(() => chrome.runtime.sendMessage({ action: 'request_graph_update', tabId: tabId }), 500);
            }
        });
    });
}

// --- O CÉREBRO DA IA ---
async function processPromptWithGemini(userPrompt, currentPoints, isNewCurve) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    
    // Prompt Mestre: Transforma o Gemini num Engenheiro de Masterização avançado
    const systemInstruction = `Você é um engenheiro de áudio especialista em equalização (EQ).
O formato de saída DEVE SER EXATAMENTE E APENAS UM ARRAY JSON contendo objetos com "f" (frequência em Hz, 20 a 20000), "g" (ganho em dB, de -15 a 15) e "q" (fator Q, de 0.1 a 10, padrão 1.2).
NÃO escreva introduções, explicações ou crases de markdown (\`\`\`json). Apenas o array limpo.
Exemplo: [{"f": 150, "g": 4, "q": 1.2}, {"f": 1000, "g": -2, "q": 1.2}, {"f": 8000, "g": 5, "q": 1.2}]`;

    let userMessage = `Pedido do usuário: "${userPrompt}"\n\n`;

    // Avalia a regra do Switch de Nova Curva que vem do Popup
    if (!isNewCurve && currentPoints && currentPoints.length > 0) {
        userMessage += `INSTRUÇÃO: O usuário quer MODIFICAR a curva atual. Aqui está o estado atual do EQ:\n${JSON.stringify(currentPoints)}\nFaça os ajustes solicitados SOMANDO ou SUBTRAINDO dos ganhos ("g") nas frequências certas para atender ao pedido, ou adicione novas frequências específicas se necessário. Retorne o array inteiro atualizado.`;
    } else {
        userMessage += `INSTRUÇÃO: O usuário quer criar uma NOVA CURVA do zero. Ignore curvas anteriores e gere um novo array focado apenas no pedido dele.`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction + "\n\n" + userMessage }] }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        // Limpa formatação markdown caso a IA teime em mandar blocos de código
        let aiText = data.candidates[0].content.parts[0].text.trim();
        aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        return JSON.parse(aiText);
    } catch (error) {
        console.error("Erro na API do Gemini:", error);
        return fallbackMockAI(userPrompt, currentPoints, isNewCurve);
    }
}

// Fallback Inteligente (Se a API falhar ou estiver sem internet)
function fallbackMockAI(prompt, currentPoints, isNewCurve) {
    // Se não for curva nova, tenta reaproveitar os pontos atuais, senão começa do zero
    let pts = (!isNewCurve && currentPoints && currentPoints.length > 0) 
        ? JSON.parse(JSON.stringify(currentPoints)) 
        : [
            {f: 150, g: 0, q: 1.2},
            {f: 400, g: 0, q: 1.2},
            {f: 1000, g: 0, q: 1.2},
            {f: 3000, g: 0, q: 1.2},
            {f: 8000, g: 0, q: 1.2}
        ];

    const p = prompt.toLowerCase();
    
    // Matemática básica de adição/subtração em cima do que já existe
    pts.forEach(pt => {
        if (p.includes("grave") && pt.f <= 300) pt.g += p.includes("menos") ? -4 : 4;
        if ((p.includes("médio") || p.includes("medio")) && pt.f > 300 && pt.f < 4000) pt.g += p.includes("menos") ? -4 : 4;
        if (p.includes("agudo") && pt.f >= 4000) pt.g += p.includes("menos") ? -4 : 4;
    });

    // Trava de segurança para não estourar o limite de decibéis
    pts.forEach(pt => {
        if(pt.g > 15) pt.g = 15;
        if(pt.g < -15) pt.g = -15;
    });

    return pts;
}