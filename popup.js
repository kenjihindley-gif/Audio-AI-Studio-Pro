// --- Dicionário de Idiomas ---
const i18nDict = {
    'pt-br': {
        welcome: "Bem-vindo ao Studio!", step1_title: "1. Microfone & Saídas 🎙️", step1_desc: "Necessário para ler o áudio das abas, os dispositivos do PC e os comandos de Voz.",
        btn_grant: "Liberar Acesso", perm_ok: "Acesso Liberado! ✔️", step2_title: "2. Chave API Gemini 🤖 (Opcional)", step2_desc: "Sem ela a IA fica desativada. Pode preencher agora ou depois em Opções.",
        btn_apply_api: "Aplicar API", btn_finish: "Concluir Setup", modal_manage: "Gerenciar Presets", btn_done: "Concluir", info_guide: "Guia Rápido",
        info_create: "Criar Ponto:", info_create_desc: "Dê 2 cliques na área do gráfico.", info_del: "Apagar Ponto:", info_del_desc: "Botão direito ou tecla [Delete].",
        info_q: "Ajustar Curva (Q):", info_q_desc: "Com o mouse sobre um ponto, use o scroll (rodinha) para alargar ou estreitar a curva de frequência.",
        info_slider: "Modo Sliders:", info_slider_desc: "Use o botão de válvulas. Passe o mouse e use o scroll sobre os sliders.", btn_understood: "Entendi",
        miniplayer: "MINI-PLAYER", favs: "Favoritos", preset: "Preset", btn_upload: "↑ Subir", btn_down: "↓ Down", btn_save_plus: "Salvar +",
        new_preset: "Nome do novo Preset", btn_ok: "OK", routing: "DUAL OUTPUT ROUTING", dup_out: "Duplicar saída", out1: "OUTPUT 1", out2: "OUTPUT 2",
        ai_cmd: "Comando com IA ou Voz", new_curve: "Nova curva", btn_ai: "Ajustar com IA", ai_sleep: "🤖 A Inteligência Artificial está adormecida.", apply_key: "Aplicar Chave da API",
        preset_flat: "Padrão (Flat)", system_default: "Padrão do Sistema", none_out: "Nenhuma", menu_move: "Mover (Ordem)", menu_edit: "Editar Nomes", menu_del: "Excluir Presets",
        ai_placeholder: "Ex: Deixe os graves mais fortes...", my_presets: "Meus Presets", ready_presets: "Presets Prontos",
        dl_title: "Opções de Download", dl_current: "Preset Atual", dl_batch: "Em Lote", dl_selected: "Baixar Selecionados", btn_cancel: "Cancelar"
    },
    'en': {
        welcome: "Welcome to Studio!", step1_title: "1. Mic & Outputs 🎙️", step1_desc: "Required to read audio from tabs, PC devices, and Voice commands.",
        btn_grant: "Grant Access", perm_ok: "Access Granted! ✔️", step2_title: "2. Gemini API Key 🤖 (Optional)", step2_desc: "Without it, AI is disabled. You can fill it now or later in Options.",
        btn_apply_api: "Apply API", btn_finish: "Finish Setup", modal_manage: "Manage Presets", btn_done: "Done", info_guide: "Quick Guide",
        info_create: "Create Point:", info_create_desc: "Double-click on the graph area.", info_del: "Delete Point:", info_del_desc: "Right-click or [Delete] key.",
        info_q: "Adjust Curve (Q):", info_q_desc: "Hover over a point and use the scroll wheel to widen or narrow the frequency curve.",
        info_slider: "Sliders Mode:", info_slider_desc: "Use the valves button. Hover and scroll over the sliders to adjust.", btn_understood: "Got it",
        miniplayer: "MINI-PLAYER", favs: "Favorites", preset: "Preset", btn_upload: "↑ Upload", btn_down: "↓ Down", btn_save_plus: "Save +",
        new_preset: "New Preset Name", btn_ok: "OK", routing: "DUAL OUTPUT ROUTING", dup_out: "Duplicate output", out1: "OUTPUT 1", out2: "OUTPUT 2",
        ai_cmd: "AI or Voice Command", new_curve: "New curve", btn_ai: "Adjust with AI", ai_sleep: "🤖 Artificial Intelligence is asleep.", apply_key: "Apply API Key",
        preset_flat: "Default (Flat)", system_default: "System Default", none_out: "None", menu_move: "Move (Order)", menu_edit: "Edit Names", menu_del: "Delete Presets",
        ai_placeholder: "Ex: Make the bass stronger...", my_presets: "My Presets", ready_presets: "Built-in Presets",
        dl_title: "Download Options", dl_current: "Current Preset", dl_batch: "Batch Download", dl_selected: "Download Selected", btn_cancel: "Cancel"
    }
};

let currentLang = 'pt-br';

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18nDict[currentLang] && i18nDict[currentLang][key]) {
            el.innerHTML = i18nDict[currentLang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (i18nDict[currentLang] && i18nDict[currentLang][key]) {
            el.placeholder = i18nDict[currentLang][key];
        }
    });
    
    document.getElementById('btn-menu-move').textContent = i18nDict[currentLang].menu_move;
    document.getElementById('btn-menu-edit').textContent = i18nDict[currentLang].menu_edit;
    document.getElementById('btn-menu-delete').textContent = i18nDict[currentLang].menu_del;
    
    if (outputSelect && outputSelect.options[0]) outputSelect.options[0].textContent = i18nDict[currentLang].system_default;
    if (outputSelect2 && outputSelect2.options[0]) outputSelect2.options[0].textContent = i18nDict[currentLang].none_out;
    
    updateTriggerText();
}

chrome.storage.local.get(['language'], (res) => {
    if (res.language) currentLang = res.language;
    applyTranslations();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.language) {
        currentLang = changes.language.newValue;
        applyTranslations();
    }
});

// --- Lógica de Auto-Nomeação de Presets Modificados ---
let isModified = false;
let tempPresetName = "";

function markAsModified() {
    if (isModified) return;
    isModified = true;
    
    let base = currentSelectedPresetKey;
    if (base === 'Temp_Custom') return; 
    if (base.startsWith('custom_')) base = base.replace('custom_', '');
    
    let suffix = currentLang === 'en' ? 'Custom' : 'Personalizado';
    let proposedName = "";
    
    let cleanBase = base.replace(new RegExp(`\\s*-\\s*(Personalizado|Custom)(\\s\\d+)?$`), '');
    
    if (cleanBase === 'Padrao' || cleanBase === '') {
        proposedName = suffix;
    } else {
        proposedName = `${cleanBase} - ${suffix}`;
    }

    getStorageData((custom, order, favs) => {
        let finalName = proposedName;
        let count = 1;
        while (custom[finalName] || defaultPresets[finalName]) {
             finalName = `${proposedName} ${count}`;
             count++;
        }
        tempPresetName = finalName;
        currentSelectedPresetKey = 'Temp_Custom';
        updateTriggerText();
    });
}

// --- Lógica de Tema (Dark/Light Mode) ---
const themeToggle = document.getElementById('theme-toggle');
chrome.storage.local.get(['theme'], (res) => {
    if (res.theme === 'dark') document.body.classList.add('dark-mode');
});

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
        drawGraph();
    });
}

// --- Lógica de Permissões e Chave API Inicial ---
const permOverlay = document.getElementById('permission-overlay');
const btnGrantMic = document.getElementById('btn-grant-mic');
const permSuccessMic = document.getElementById('perm-success-mic');
const setupApiKeyInput = document.getElementById('setup-api-key');
const btnSaveSetupApi = document.getElementById('btn-save-setup-api');
const btnFinishSetup = document.getElementById('btn-finish-setup');

const aiActiveSection = document.getElementById('ai-active-section');
const aiWarningSection = document.getElementById('ai-warning-section');
const btnOpenOptions = document.getElementById('btn-open-options');

let hasMicPermission = false;

function checkAndEnforcePermissions() {
    navigator.permissions.query({name: 'microphone'}).then((result) => {
        if (result.state === 'granted') {
            hasMicPermission = true;
            permOverlay.classList.add('hidden');
            permOverlay.style.display = 'none';
            loadAudioOutputs(); 
        } else {
            permOverlay.classList.remove('hidden');
            permOverlay.style.display = 'flex';
        }
    });
}

function checkApiKeyStatus() {
    chrome.storage.local.get(['geminiApiKey'], (res) => {
        if (res.geminiApiKey && res.geminiApiKey.trim() !== '') {
            aiActiveSection.classList.remove('hidden');
            aiWarningSection.classList.add('hidden');
        } else {
            aiActiveSection.classList.add('hidden');
            aiWarningSection.classList.remove('hidden');
        }
    });
}

checkAndEnforcePermissions(); 
checkApiKeyStatus();

btnGrantMic.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); 
        hasMicPermission = true;
        btnGrantMic.classList.add('hidden');
        permSuccessMic.classList.remove('hidden');
        btnFinishSetup.disabled = false;
        loadAudioOutputs(); 
    } catch (err) {
        alert(currentLang === 'pt-br' ? "Permissão bloqueada! Redirecionando para as opções do navegador..." : "Permission blocked! Redirecting to browser options...");
        setTimeout(() => chrome.runtime.openOptionsPage(), 1500);
    }
});

btnSaveSetupApi.addEventListener('click', () => {
    const newKey = setupApiKeyInput.value.trim();
    if (newKey) {
        chrome.storage.local.set({ geminiApiKey: newKey }, () => {
            btnSaveSetupApi.textContent = currentLang === 'pt-br' ? "Chave Salva ✔️" : "Key Saved ✔️";
            btnSaveSetupApi.style.color = "#10b981";
            checkApiKeyStatus();
            btnFinishSetup.disabled = false; 
        });
    }
});

btnFinishSetup.addEventListener('click', () => {
    if (hasMicPermission) {
        permOverlay.classList.add('hidden');
        permOverlay.style.display = 'none';
    } else {
        alert(currentLang === 'pt-br' ? "Por favor, libere o acesso ao microfone primeiro." : "Please grant microphone access first.");
    }
});

btnOpenOptions.addEventListener('click', () => { chrome.runtime.openOptionsPage(); });

// --- Seletores da Interface ---
const appPowerBtn = document.getElementById('app-power-btn'); 
const btnMiniplayer = document.getElementById('btn-miniplayer'); 
const boosterKnobWrapper = document.getElementById('booster-knob-wrapper');
const boosterKnob = document.getElementById('booster-knob');
const boosterValueDisplay = document.getElementById('booster-value');

const btnShowSave = document.getElementById('btn-show-save');
const saveContainer = document.getElementById('save-preset-container');
const newPresetName = document.getElementById('new-preset-name');
const btnSavePreset = document.getElementById('btn-save-preset');
const btnCancelPreset = document.getElementById('btn-cancel-preset');
const btnUpload = document.getElementById('btn-upload');
const fileInput = document.getElementById('file-input');
const btnDownload = document.getElementById('btn-download');

const outputSelect = document.getElementById('output-select');
const outputSelect2 = document.getElementById('output-select-2');
const duplicateSwitch = document.getElementById('duplicate-output-switch');
const cardOutput2 = document.getElementById('card-output-2');
const controlsOut1 = document.getElementById('controls-out-1');
const controlsOut2 = document.getElementById('controls-out-2');
const volOut1 = document.getElementById('vol-out-1');
const volOut2 = document.getElementById('vol-out-2');
const bypassOut1 = document.getElementById('bypass-out-1');
const bypassOut2 = document.getElementById('bypass-out-2');
const iconOut1 = document.getElementById('icon-out-1');
const iconOut2 = document.getElementById('icon-out-2');
const labelOut1 = document.getElementById('label-out-1');
const labelOut2 = document.getElementById('label-out-2');

const btnExpand = document.getElementById('btn-expand'); 
const btnInfo = document.getElementById('btn-info');
const infoModalOverlay = document.getElementById('info-modal-overlay');
const btnCloseInfo = document.getElementById('btn-close-info');

const canvas = document.getElementById('eqGraph');
const ctx = canvas.getContext('2d');
const aiInput = document.getElementById('ai-input');
const btnSendAi = document.getElementById('btn-send-ai');
const aiStatus = document.getElementById('ai-status');
const btnMic = document.getElementById('btn-mic');
const micStatus = document.getElementById('mic-status');
const aiNewCurveSwitch = document.getElementById('ai-new-curve-switch');

const favBar = document.getElementById('favorites-bar');
const presetTrigger = document.getElementById('preset-trigger');
const presetTriggerText = document.getElementById('preset-trigger-text');
const presetOptions = document.getElementById('preset-options');
const btnDots = document.getElementById('btn-dots');
const dotsDropdown = document.getElementById('dots-dropdown');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalList = document.getElementById('modal-list');
const btnModalClose = document.getElementById('btn-modal-close');

let currentTabId = null;
let currentSelectedPresetKey = 'Padrao'; 

const svgHeadphone = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`;
const svgSpeaker = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><circle cx="12" cy="14" r="4"></circle><line x1="12" y1="6" x2="12.01" y2="6"></line></svg>`;

let isAppOn = true;
chrome.storage.local.get(['isAppOn'], (res) => { if (res.isAppOn !== undefined) { isAppOn = res.isAppOn; updatePowerUI(); } });

function updatePowerUI() {
    if (isAppOn) { appPowerBtn.src = "https://i.imgur.com/L2I8VnN.png"; appPowerBtn.style.opacity = "1"; canvas.style.opacity = "1"; } 
    else { appPowerBtn.src = "https://i.imgur.com/99zg63i.png"; appPowerBtn.style.opacity = "0.6"; canvas.style.opacity = "0.4"; }
    sendToEngine({ action: 'set_power_state', isPowerOn: isAppOn });
}

appPowerBtn.addEventListener('click', () => { isAppOn = !isAppOn; chrome.storage.local.set({ isAppOn: isAppOn }); updatePowerUI(); appPowerBtn.style.transform = 'scale(0.9)'; setTimeout(() => appPowerBtn.style.transform = 'scale(1)', 150); });

if (btnMiniplayer) {
    btnMiniplayer.addEventListener('click', () => {
        if (currentTabId !== null) { chrome.windows.create({ url: `miniplayer.html?tabId=${currentTabId}`, type: 'popup', width: 540, height: 220, focused: true }); window.close(); }
    });
}

if (btnInfo) { btnInfo.addEventListener('click', () => { infoModalOverlay.classList.remove('hidden'); }); }
if (btnCloseInfo) { btnCloseInfo.addEventListener('click', () => { infoModalOverlay.classList.add('hidden'); }); }

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && !tabs[0].url.startsWith('chrome://')) {
        currentTabId = tabs[0].id;
        chrome.runtime.sendMessage({ action: 'request_graph_update', tabId: currentTabId }, (response) => {
            if (chrome.runtime.lastError || !response || response.status !== "ok") {
                chrome.runtime.sendMessage({ action: 'init_tab_capture', tabId: currentTabId });
            }
        });
    }
});

function sendToEngine(msgParams, callback) { if (currentTabId !== null) chrome.runtime.sendMessage({ ...msgParams, tabId: currentTabId }, callback); }

// --- Histórico ---
let eqPoints = []; const MAX_POINTS = 24; 
let eqHistory = []; let historyIndex = -1; const MAX_HISTORY = 10;
const btnUndo = document.getElementById('btn-undo'); const btnRedo = document.getElementById('btn-redo');

function updateHistoryButtons() {
    if (historyIndex > 0) { btnUndo.disabled = false; btnUndo.style.opacity = '1'; btnUndo.style.cursor = 'pointer'; } 
    else { btnUndo.disabled = true; btnUndo.style.opacity = '0.4'; btnUndo.style.cursor = 'not-allowed'; }
    if (historyIndex < eqHistory.length - 1) { btnRedo.disabled = false; btnRedo.style.opacity = '1'; btnRedo.style.cursor = 'pointer'; } 
    else { btnRedo.disabled = true; btnRedo.style.opacity = '0.4'; btnRedo.style.cursor = 'not-allowed'; }
}

function saveHistoryState(pointsToSave) {
    const currentStateString = JSON.stringify(pointsToSave);
    if (historyIndex >= 0 && JSON.stringify(eqHistory[historyIndex]) === currentStateString) return;
    if (historyIndex < eqHistory.length - 1) eqHistory = eqHistory.slice(0, historyIndex + 1);
    eqHistory.push(JSON.parse(currentStateString)); 
    if (eqHistory.length > MAX_HISTORY) eqHistory.shift(); else historyIndex++;
    updateHistoryButtons();
}

function doUndo() { if (historyIndex > 0) { historyIndex--; eqPoints = JSON.parse(JSON.stringify(eqHistory[historyIndex])); sendPointsToEngine(true); updateHistoryButtons(); markAsModified(); surfTheCurve(); } }
function doRedo() { if (historyIndex < eqHistory.length - 1) { historyIndex++; eqPoints = JSON.parse(JSON.stringify(eqHistory[historyIndex])); sendPointsToEngine(true); updateHistoryButtons(); markAsModified(); surfTheCurve(); } }
btnUndo.addEventListener('click', doUndo); btnRedo.addEventListener('click', doRedo);


// --- Lógica Dinâmica de Sliders (12 vs 24 bandas) ---
const viewGraph = document.getElementById('view-graph');
const viewSliders = document.getElementById('view-sliders');
const btnToggleView = document.getElementById('btn-toggle-view');
const dbMeterFill = document.getElementById('db-meter-fill');
const dbMeterClip = document.getElementById('db-meter-clip');

let isGraphView = true;
let sliderInputs = [];
let isExpanded = false;

// Configurações de Frequência
const bandsNormal = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000, 20000];
const bandsExpanded = [20, 32, 45, 63, 90, 125, 180, 250, 350, 500, 700, 1000, 1400, 2000, 2800, 4000, 5600, 8000, 9500, 11000, 12500, 14000, 16000, 20000];

// SVGs do Botão Toggle
const svgSlidersIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`;
const svgGraphIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`;

function buildSliders() {
    if (!viewSliders) return;
    viewSliders.innerHTML = ''; 
    sliderInputs = [];
    
    const activeBands = isExpanded ? bandsExpanded : bandsNormal;
    const sliderWidthVal = isExpanded ? '230px' : '110px'; 
    
    activeBands.forEach(freq => {
        const wrap = document.createElement('div'); 
        wrap.className = 'slider-wrapper';
        
        const input = document.createElement('input');
        input.type = 'range'; 
        input.min = -15; 
        input.max = 15; 
        input.step = 0.1; 
        input.value = 0;
        input.className = 'vertical-slider';
        input.style.setProperty('--slider-width', sliderWidthVal);
        input.title = `${freq >= 1000 ? (freq/1000) + 'k' : freq}Hz`;
        
        const lbl = document.createElement('span'); 
        lbl.className = 'slider-label';
        lbl.textContent = freq >= 1000 ? (freq/1000) + 'k' : freq;

        input.addEventListener('input', (e) => {
            // isIsolated = true -> Arrasto (Drag)
            handleSliderChange(freq, parseFloat(e.target.value), true);
            input.dataset.userModified = 'true'; 
        });
        
        input.addEventListener('change', () => { 
            sendPointsToEngine(true); 
            saveHistoryState(eqPoints); 
            setTimeout(() => { input.dataset.userModified = 'false'; }, 1000); 
        });
        
        input.addEventListener('wheel', (e) => {
            e.preventDefault();
            let step = e.deltaY < 0 ? 0.5 : -0.5;
            let newVal = Math.max(-15, Math.min(15, parseFloat(input.value) + step));
            input.value = newVal;
            input.dataset.userModified = 'true';
            
            // isIsolated = false -> Scroll (Roda do Mouse)
            handleSliderChange(freq, newVal, false);
            
            clearTimeout(window.sliderWheelTimeout);
            window.sliderWheelTimeout = setTimeout(() => {
                sendPointsToEngine(true);
                saveHistoryState(eqPoints);
                input.dataset.userModified = 'false';
            }, 500);
        }, { passive: false });

        wrap.appendChild(input); 
        wrap.appendChild(lbl); 
        viewSliders.appendChild(wrap); 
        sliderInputs.push({ freq, input });
    });

    if (!isGraphView) {
        surfTheCurve(); 
    }
}

function handleSliderChange(freq, value, isIsolated = false) {
    let pt = eqPoints.find(p => Math.abs(p.f - freq) < (freq * 0.05));
    // Correção: Se for isolado (arrastar) Q=8.0 para focar só na banda. Se for scroll, Q=1.5 para uma área menor.
    let targetQ = isIsolated ? 8.0 : 1.5; 
    
    if (pt) { 
        pt.g = value; 
        pt.f = freq; 
        pt.q = targetQ;
    } else {
        if (eqPoints.length < MAX_POINTS) { 
            eqPoints.push({ f: freq, g: value, q: targetQ }); 
        } else {
            let minG = 100, minIdx = -1;
            eqPoints.forEach((p, i) => { if (Math.abs(p.g) < minG) { minG = Math.abs(p.g); minIdx = i; } });
            if (minIdx !== -1) eqPoints[minIdx] = { f: freq, g: value, q: targetQ };
        }
    }
    sendPointsToEngine();
    markAsModified();
}

function applyExpandState(expanded) {
    isExpanded = expanded; 
    const mainViewArea = document.getElementById('main-view-area');
    
    if (expanded) { 
        document.body.classList.add('expanded'); 
        canvas.width = 710; 
        canvas.height = 300; 
        if(mainViewArea) mainViewArea.style.height = '300px'; 
    } else { 
        document.body.classList.remove('expanded'); 
        canvas.width = 330; 
        canvas.height = 150; 
        if(mainViewArea) mainViewArea.style.height = '150px'; 
    }
    
    buildSliders(); 
    drawGraph();
}

chrome.storage.local.get(['isExpanded'], (res) => { 
    if (res.isExpanded) applyExpandState(true); 
    else buildSliders(); 
});

btnExpand.addEventListener('click', () => { 
    const newState = !isExpanded; 
    chrome.storage.local.set({ isExpanded: newState }); 
    applyExpandState(newState); 
});

if (btnToggleView) {
    btnToggleView.innerHTML = svgSlidersIcon;
    btnToggleView.addEventListener('click', () => {
        isGraphView = !isGraphView;
        if (isGraphView) {
            viewGraph.style.display = 'flex'; viewSliders.style.display = 'none'; viewSliders.classList.add('hidden');
            drawGraph(); 
            btnToggleView.style.opacity = '1';
            btnToggleView.innerHTML = svgSlidersIcon;
        } else {
            viewGraph.style.display = 'none'; viewSliders.style.display = 'flex'; viewSliders.classList.remove('hidden');
            btnToggleView.style.opacity = '1';
            btnToggleView.innerHTML = svgGraphIcon;
            surfTheCurve(); 
        }
    });
}

// 16 Presets Nativos
const defaultPresets = { 
    'Padrao': [], 
    'Acoustic': [{f:60,g:2,q:1.2},{f:250,g:1,q:1.2},{f:1000,g:1,q:1.2},{f:4000,g:2,q:1.2},{f:10000,g:3,q:1.2}],
    'Bass Booster': [{f:60,g:8,q:1.2},{f:250,g:4,q:1.2},{f:1000,g:0,q:1.2},{f:4000,g:0,q:1.2},{f:10000,g:0,q:1.2}], 
    'Classical': [{f:60,g:3,q:1.2},{f:250,g:0,q:1.2},{f:1000,g:0,q:1.2},{f:4000,g:2,q:1.2},{f:10000,g:3,q:1.2}],
    'Dance': [{f:60,g:6,q:1.2},{f:250,g:0,q:1.2},{f:1000,g:2,q:1.2},{f:4000,g:4,q:1.2},{f:10000,g:1,q:1.2}],
    'Deep': [{f:60,g:5,q:1.2},{f:250,g:3,q:1.2},{f:1000,g:0,q:1.2},{f:4000,g:-2,q:1.2},{f:10000,g:-4,q:1.2}],
    'Electronic': [{f:60,g:4,q:1.2},{f:250,g:-1,q:1.2},{f:1000,g:1,q:1.2},{f:4000,g:4,q:1.2},{f:10000,g:5,q:1.2}],
    'Hip Hop': [{f:60,g:5,q:1.2},{f:250,g:3,q:1.2},{f:1000,g:-1,q:1.2},{f:4000,g:2,q:1.2},{f:10000,g:3,q:1.2}],
    'Jazz': [{f:60,g:3,q:1.2},{f:250,g:2,q:1.2},{f:1000,g:-2,q:1.2},{f:4000,g:2,q:1.2},{f:10000,g:4,q:1.2}],
    'Latin': [{f:60,g:4,q:1.2},{f:250,g:0,q:1.2},{f:1000,g:0,q:1.2},{f:4000,g:2,q:1.2},{f:10000,g:4,q:1.2}],
    'Lounge': [{f:60,g:-2,q:1.2},{f:250,g:-1,q:1.2},{f:1000,g:0,q:1.2},{f:4000,g:1,q:1.2},{f:10000,g:2,q:1.2}],
    'Piano': [{f:60,g:1,q:1.2},{f:250,g:3,q:1.2},{f:1000,g:0,q:1.2},{f:4000,g:2,q:1.2},{f:10000,g:3,q:1.2}],
    'Pop Rock': [{f:60,g:2,q:1.2},{f:250,g:1,q:1.2},{f:1000,g:-1,q:1.2},{f:4000,g:1,q:1.2},{f:10000,g:2,q:1.2}], 
    'R&B': [{f:60,g:3,q:1.2},{f:250,g:1,q:1.2},{f:1000,g:0,q:1.2},{f:4000,g:2,q:1.2},{f:10000,g:3,q:1.2}],
    'Rock': [{f:60,g:5,q:1.2},{f:250,g:2,q:1.2},{f:1000,g:-4,q:1.2},{f:4000,g:3,q:1.2},{f:10000,g:5,q:1.2}], 
    'Treble Booster': [{f:60,g:0,q:1.2},{f:250,g:0,q:1.2},{f:1000,g:0,q:1.2},{f:4000,g:4,q:1.2},{f:10000,g:8,q:1.2}],
    'Vocal': [{f:60,g:-2,q:1.2},{f:250,g:-1,q:1.2},{f:1000,g:4,q:1.2},{f:4000,g:3,q:1.2},{f:10000,g:1,q:1.2}]
};
const presetIcons = { 
    'Acoustic': '🎸', 'Bass Booster': '🔈', 'Classical': '🎻', 'Dance': '💃', 'Deep': '🕳️', 
    'Electronic': '🎛️', 'Hip Hop': '🧢', 'Jazz': '🎷', 'Latin': '🎺', 'Lounge': '🍸', 
    'Piano': '🎹', 'Pop Rock': '🎤', 'R&B': '🤎', 'Rock': '🤘', 'Treble Booster': '🔊', 'Vocal': '🗣️' 
};

function getStorageData(callback) {
    chrome.storage.local.get(['customPresets', 'customOrder', 'favorites'], (res) => {
        let custom = res.customPresets || {}; let order = res.customOrder || Object.keys(custom); let favs = res.favorites || [];
        order = order.filter(k => custom[k]); Object.keys(custom).forEach(k => { if(!order.includes(k)) order.push(k); });
        callback(custom, order, favs);
    });
}
function saveStorageData(custom, order, favs, callback) { chrome.storage.local.set({ customPresets: custom, customOrder: order, favorites: favs }, callback); }

function renderUI() { getStorageData((custom, order, favs) => { renderFavoritesBar(favs); renderDropdownList(custom, order, favs); updateTriggerText(); }); }

function renderFavoritesBar(favs) {
    favBar.innerHTML = '';
    if (favs.length === 0) { favBar.classList.add('hidden'); return; }
    favBar.classList.remove('hidden');
    favs.forEach(favKey => {
        const btn = document.createElement('button'); const isActive = (currentSelectedPresetKey === favKey);
        btn.className = `btn-fav ${isActive ? 'active' : ''}`; btn.textContent = favKey.replace('custom_', '');
        btn.onclick = () => { if (isActive) applyPreset('Padrao'); else applyPreset(favKey); renderUI(); };
        favBar.appendChild(btn);
    });
}

function renderDropdownList(custom, order, favs) {
    presetOptions.innerHTML = '';
    const createItem = (key, displayName, icon) => {
        const div = document.createElement('div'); div.className = 'custom-option';
        const isFav = favs.includes(key);
        const starHtml = key === 'Padrao' ? `<div style="width: 44px;"></div>` : `<div class="star-btn-container"><button class="star-btn ${isFav ? 'active' : ''}">${isFav ? '★' : '☆'}</button></div>`;
        
        let translatedName = displayName;
        if (key === 'Padrao') translatedName = i18nDict[currentLang] ? i18nDict[currentLang].preset_flat : 'Padrão (Flat)';
        
        div.innerHTML = `<div class="preset-info"><span class="preset-icon monochrome-icon">${icon}</span> <span>${translatedName}</span></div>${starHtml}`;
        div.querySelector('.preset-info').addEventListener('click', () => { selectPresetFromDropdown(key); });
        if (key !== 'Padrao') { div.querySelector('.star-btn-container').addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(key, favs, custom, order); }); }
        presetOptions.appendChild(div);
    };

    createItem('Padrao', 'Padrão (Flat)', '🎚️');
    
    if (order.length > 0) {
        const divSep1 = document.createElement('div');
        const headerText = i18nDict[currentLang] ? i18nDict[currentLang].my_presets : 'Meus Presets';
        divSep1.innerHTML = `<div class="preset-divider"></div><div class="preset-group-header">${headerText}</div>`;
        presetOptions.appendChild(divSep1);
        
        order.forEach(key => { 
            const data = custom[key]; 
            const type = data.type || 'created'; 
            const icon = type === 'imported' ? '⬆️' : '🔧'; 
            createItem(`custom_${key}`, key, icon); 
        });
    }

    const divSep2 = document.createElement('div');
    const headerTextReady = i18nDict[currentLang] ? i18nDict[currentLang].ready_presets : 'Presets Prontos';
    divSep2.innerHTML = `<div class="preset-divider"></div><div class="preset-group-header">${headerTextReady}</div>`;
    presetOptions.appendChild(divSep2);

    Object.keys(defaultPresets).forEach(key => { 
        if (key !== 'Padrao') createItem(key, key, presetIcons[key] || '🎵'); 
    });
}

function toggleFavorite(key, favs, custom, order) {
    if (favs.includes(key)) favs = favs.filter(f => f !== key);
    else { if (favs.length >= 3) { alert("Pode ter no máximo 3 favoritos!"); return; } favs.push(key); }
    saveStorageData(custom, order, favs, renderUI);
}

function selectPresetFromDropdown(key) { presetOptions.classList.remove('open'); applyPreset(key); renderUI(); }

function applyPreset(key) {
    isModified = false; tempPresetName = "";
    currentSelectedPresetKey = key; selectedPointIndex = -1;
    if (currentTabId !== null) chrome.storage.local.set({ [`preset_${currentTabId}`]: key });
    if (key.startsWith('custom_')) {
        const name = key.replace('custom_', '');
        getStorageData((custom) => { if(custom[name]) { eqPoints = Array.isArray(custom[name]) ? custom[name] : custom[name].points; sendPointsToEngine(true); saveHistoryState(eqPoints); } });
    } else {
        eqPoints = JSON.parse(JSON.stringify(defaultPresets[key])); sendPointsToEngine(true); saveHistoryState(eqPoints);
    }
}

function updateTriggerText() { 
    if (currentSelectedPresetKey === 'Temp_Custom') {
        presetTriggerText.textContent = tempPresetName;
        return;
    }
    let name = currentSelectedPresetKey; 
    if (name.startsWith('custom_')) name = name.replace('custom_', ''); 
    if (name === 'Padrao' && i18nDict[currentLang]) name = i18nDict[currentLang].preset_flat;
    presetTriggerText.textContent = name; 
}

presetTrigger.addEventListener('click', () => presetOptions.classList.toggle('open'));
btnDots.addEventListener('click', () => dotsDropdown.classList.toggle('hidden'));
document.addEventListener('click', (e) => { if (!e.target.closest('.custom-select-container')) presetOptions.classList.remove('open'); if (!e.target.closest('.dots-container')) dotsDropdown.classList.add('hidden'); });

function openModal(mode) {
    getStorageData((custom, order, favs) => {
        modalList.innerHTML = ''; modalOverlay.classList.remove('hidden'); modalOverlay.style.display = 'flex';
        if (order.length === 0) { modalTitle.textContent = i18nDict[currentLang].modal_manage; modalList.innerHTML = `<div style="text-align:center; padding: 25px 10px; color: var(--text-muted); font-size: 0.9rem;">Nenhum preset encontrado.</div>`; return; }
        
        if (mode === 'move') {
            modalTitle.textContent = i18nDict[currentLang].menu_move;
            order.forEach((key, idx) => {
                const div = document.createElement('div'); div.className = 'modal-item';
                div.innerHTML = `<span>${key}</span><div class="modal-actions"><button class="modal-btn" ${idx===0 ? 'disabled':''}>↑</button><button class="modal-btn" ${idx===order.length-1 ? 'disabled':''}>↓</button></div>`;
                const btns = div.querySelectorAll('.modal-btn');
                btns[0].onclick = () => { [order[idx], order[idx-1]] = [order[idx-1], order[idx]]; saveStorageData(custom, order, favs, () => openModal('move')); };
                btns[1].onclick = () => { [order[idx], order[idx+1]] = [order[idx+1], order[idx]]; saveStorageData(custom, order, favs, () => openModal('move')); };
                modalList.appendChild(div);
            });
        }
        else if (mode === 'edit') {
            modalTitle.textContent = i18nDict[currentLang].menu_edit;
            order.forEach((key) => {
                const div = document.createElement('div'); div.className = 'modal-item';
                // CORREÇÃO: Input com width 100% para empurrar o ícone e margin-right de espaçamento
                div.innerHTML = `
                    <input type="text" value="${key}" style="width: 100%; min-width: 0; border: none; background: transparent; color: var(--text-main); outline: none; padding: 4px; font-weight: bold; border-bottom: 1px solid rgba(128,128,128,0.2); margin-right: 10px;">
                    <button class="modal-icon-btn" title="Renomear" style="flex-shrink: 0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                `;
                div.querySelector('.modal-icon-btn').onclick = () => {
                    const newKey = div.querySelector('input').value.trim();
                    if (!newKey || newKey === key || custom[newKey]) return;
                    custom[newKey] = custom[key]; delete custom[key]; order[order.indexOf(key)] = newKey;
                    if (favs.includes(`custom_${key}`)) favs[favs.indexOf(`custom_${key}`)] = `custom_${newKey}`;
                    if (currentSelectedPresetKey === `custom_${key}`) currentSelectedPresetKey = `custom_${newKey}`;
                    saveStorageData(custom, order, favs, () => openModal('edit'));
                };
                modalList.appendChild(div);
            });
        }
        else if (mode === 'delete') {
            modalTitle.textContent = i18nDict[currentLang].menu_del;
            order.forEach((key) => {
                const div = document.createElement('div'); div.className = 'modal-item';
                // CORREÇÃO: Span com width 100% e margem para empurrar a lixeira
                div.innerHTML = `
                    <span style="width: 100%; padding: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;">${key}</span> 
                    <button class="modal-icon-btn" title="Excluir" style="color: #ef4444; flex-shrink: 0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                `;
                div.querySelector('.modal-icon-btn').onclick = () => {
                    delete custom[key]; order = order.filter(k => k !== key); favs = favs.filter(f => f !== `custom_${key}`);
                    if (currentSelectedPresetKey === `custom_${key}`) applyPreset('Padrao');
                    saveStorageData(custom, order, favs, () => openModal('delete'));
                };
                modalList.appendChild(div);
            });
        }
    });
}

document.getElementById('btn-menu-move').addEventListener('click', () => { openModal('move'); dotsDropdown.classList.add('hidden'); });
document.getElementById('btn-menu-edit').addEventListener('click', () => { openModal('edit'); dotsDropdown.classList.add('hidden'); });
document.getElementById('btn-menu-delete').addEventListener('click', () => { openModal('delete'); dotsDropdown.classList.add('hidden'); });
btnModalClose.addEventListener('click', () => { modalOverlay.classList.add('hidden'); modalOverlay.style.display = 'none'; renderUI(); });
renderUI();


async function loadAudioOutputs() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        outputSelect.innerHTML = ''; outputSelect2.innerHTML = '';
        
        const defaultOpt = document.createElement('option'); defaultOpt.value = ""; 
        defaultOpt.textContent = i18nDict[currentLang] ? i18nDict[currentLang].system_default : "Padrão do Sistema"; 
        outputSelect.appendChild(defaultOpt);
        
        const defaultOpt2 = document.createElement('option'); defaultOpt2.value = ""; 
        defaultOpt2.textContent = i18nDict[currentLang] ? i18nDict[currentLang].none_out : "Nenhuma"; 
        outputSelect2.appendChild(defaultOpt2);

        audioOutputs.forEach(device => {
            if (device.deviceId === "default" || device.deviceId === "communications") return;
            const opt1 = document.createElement('option'); opt1.value = device.deviceId; opt1.textContent = device.label || `Saída ${outputSelect.length}`; outputSelect.appendChild(opt1);
            const opt2 = document.createElement('option'); opt2.value = device.deviceId; opt2.textContent = device.label || `Saída ${outputSelect2.length}`; outputSelect2.appendChild(opt2);
        });
        updateOutputVisuals();
    } catch (err) {}
}

function updateOutputVisuals() {
    const val1 = outputSelect.value; const val2 = outputSelect2.value;
    Array.from(outputSelect.options).forEach(opt => { opt.disabled = (opt.value !== "" && opt.value === val2); });
    Array.from(outputSelect2.options).forEach(opt => { opt.disabled = (opt.value !== "" && opt.value === val1); });

    const text1 = outputSelect.options[outputSelect.selectedIndex]?.text.toLowerCase() || "";
    iconOut1.innerHTML = (text1.includes('headphone') || text1.includes('auscultador') || text1.includes('fone') || text1.includes('airpod')) ? svgHeadphone : svgSpeaker;
    labelOut1.textContent = outputSelect.options[outputSelect.selectedIndex]?.text.substring(0, 15).toUpperCase() || "DISPOSITIVO 1";

    const text2 = outputSelect2.options[outputSelect2.selectedIndex]?.text.toLowerCase() || "";
    iconOut2.innerHTML = (text2.includes('headphone') || text2.includes('auscultador') || text2.includes('fone') || text2.includes('airpod')) ? svgHeadphone : svgSpeaker;
    labelOut2.textContent = outputSelect2.options[outputSelect2.selectedIndex]?.text.substring(0, 15).toUpperCase() || "DISPOSITIVO 2";
}

function sendRoutingParams() {
    const primary = outputSelect.value; const secondary = duplicateSwitch.checked ? outputSelect2.value : null;
    sendToEngine({ action: 'set_routing_params', deviceId: primary, secondaryDeviceId: secondary, out1Vol: parseInt(volOut1.value), out2Vol: parseInt(volOut2.value), out1EffectOn: bypassOut1.checked, out2EffectOn: bypassOut2.checked });
}

duplicateSwitch.addEventListener('change', (e) => {
    if (e.target.checked) { cardOutput2.classList.remove('hidden'); controlsOut1.classList.remove('hidden'); controlsOut2.classList.remove('hidden'); } 
    else { cardOutput2.classList.add('hidden'); controlsOut1.classList.add('hidden'); controlsOut2.classList.add('hidden'); outputSelect2.value = ""; }
    updateOutputVisuals(); sendRoutingParams();
});

outputSelect.addEventListener('change', () => { updateOutputVisuals(); sendRoutingParams(); });
outputSelect2.addEventListener('change', () => { updateOutputVisuals(); sendRoutingParams(); });
[volOut1, volOut2].forEach(slider => { slider.addEventListener('input', (e) => { e.target.style.setProperty('--vol-percent', `${e.target.value}%`); sendRoutingParams(); }); });
bypassOut1.addEventListener('change', sendRoutingParams); bypassOut2.addEventListener('change', sendRoutingParams);

aiInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });

let isDragging = false, draggedPointIndex = -1, hoveredPointIndex = -1, selectedPointIndex = -1; 
const minFreq = 20, maxFreq = 20000, dbLimit = 15;

function freqToX(f) { return (Math.log(f / minFreq) / Math.log(maxFreq / minFreq)) * canvas.width; }
function xToFreq(x) { return minFreq * Math.pow(maxFreq / minFreq, x / canvas.width); }
function gainToY(g) { const midY = (canvas.height - 20) / 2; return midY - (g * (midY / dbLimit)); }
function yToGain(y) { const midY = (canvas.height - 20) / 2; return Math.max(-dbLimit, Math.min(dbLimit, (midY - y) / (midY / dbLimit))); }
function getXY(e) { const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height; return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }; }

let lastSendTime = 0;
function sendPointsToEngine(force = false) {
    eqPoints.sort((a, b) => a.f - b.f); const now = Date.now();
    if (force || now - lastSendTime > 40) { sendToEngine({ action: 'update_dynamic_eq', points: eqPoints }); lastSendTime = now; }
}

canvas.addEventListener('dblclick', (e) => {
    if (eqPoints.length >= MAX_POINTS) return; const pos = getXY(e); if (pos.y > canvas.height - 20) return;
    eqPoints.push({ f: xToFreq(pos.x), g: yToGain(pos.y), q: 1.2 }); selectedPointIndex = eqPoints.length - 1; 
    sendPointsToEngine(true); saveHistoryState(eqPoints); markAsModified();
});

canvas.addEventListener('mousedown', (e) => { if (hoveredPointIndex !== -1) { isDragging = true; draggedPointIndex = hoveredPointIndex; selectedPointIndex = hoveredPointIndex; } else { selectedPointIndex = -1; } });
canvas.addEventListener('mousemove', (e) => {
    const pos = getXY(e);
    if (isDragging && draggedPointIndex !== -1) { eqPoints[draggedPointIndex].f = Math.max(minFreq, Math.min(maxFreq, xToFreq(pos.x))); eqPoints[draggedPointIndex].g = yToGain(pos.y); sendPointsToEngine(); markAsModified(); } 
    else {
        hoveredPointIndex = -1;
        for (let i = 0; i < eqPoints.length; i++) {
            const px = freqToX(eqPoints[i].f), py = gainToY(eqPoints[i].g);
            if (Math.sqrt((pos.x - px) ** 2 + (pos.y - py) ** 2) < 10) { hoveredPointIndex = i; break; }
        } canvas.style.cursor = hoveredPointIndex !== -1 ? 'pointer' : 'crosshair';
    }
});
canvas.addEventListener('mouseup', () => { if(isDragging) { isDragging = false; draggedPointIndex = -1; sendPointsToEngine(true); saveHistoryState(eqPoints); } });
canvas.addEventListener('mouseleave', () => { if(isDragging) { isDragging = false; draggedPointIndex = -1; hoveredPointIndex = -1; sendPointsToEngine(true); saveHistoryState(eqPoints); } });

let wheelTimeout;
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (hoveredPointIndex !== -1) { 
        eqPoints[hoveredPointIndex].q = Math.max(0.1, Math.min(10, eqPoints[hoveredPointIndex].q + (e.deltaY > 0 ? -0.2 : 0.2))); sendPointsToEngine(true); markAsModified();
        clearTimeout(wheelTimeout); wheelTimeout = setTimeout(() => saveHistoryState(eqPoints), 500);
    }
}, { passive: false });

document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPointIndex !== -1 && selectedPointIndex < eqPoints.length) {
            eqPoints.splice(selectedPointIndex, 1); selectedPointIndex = -1; hoveredPointIndex = -1; 
            sendPointsToEngine(true); saveHistoryState(eqPoints); markAsModified();
        }
    }
});
canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (hoveredPointIndex !== -1) { eqPoints.splice(hoveredPointIndex, 1); hoveredPointIndex = -1; selectedPointIndex = -1; sendPointsToEngine(true); saveHistoryState(eqPoints); markAsModified(); } });

let currentDBResponse = [], currentBoosterDB = 0; let currentSpectrum = []; let currentSampleRate = 48000;

function surfTheCurve() {
    if (isGraphView || !currentDBResponse || currentDBResponse.length === 0) return;
    
    const width = canvas.width;
    sliderInputs.forEach(s => {
        if (s.input.dataset.userModified === 'true') return; 
        
        const pt = eqPoints.find(p => Math.abs(p.f - s.freq) < (s.freq * 0.05));
        if (pt) {
            s.input.value = pt.g; 
        } else {
            const targetX = freqToX(s.freq);
            const arrayIndex = Math.round((targetX / width) * (currentDBResponse.length - 1));
            if (arrayIndex >= 0 && arrayIndex < currentDBResponse.length) {
                s.input.value = currentDBResponse[arrayIndex];
            }
        }
    });
}

function drawGraph() {
    if (!canvas || !ctx || !isGraphView) return;
    const width = canvas.width, height = canvas.height, paddingBottom = 20;
    const graphHeight = height - paddingBottom, midY = graphHeight / 2, pixelsPerDB = midY / dbLimit;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#4b5563' : '#d1d5db'; 
    ctx.lineWidth = 1; ctx.beginPath();
    const y12dB = midY - (12 * pixelsPerDB), yMinus12dB = midY + (12 * pixelsPerDB);
    ctx.moveTo(0, y12dB); ctx.lineTo(width, y12dB); ctx.moveTo(0, yMinus12dB); ctx.lineTo(width, yMinus12dB);
    ctx.lineWidth = 2; ctx.moveTo(0, midY); ctx.lineTo(width, midY); ctx.stroke();

    ctx.fillStyle = '#9ca3af'; ctx.font = '10px Segoe UI'; ctx.textAlign = 'left';
    ctx.fillText('+12dB', 4, y12dB - 4); ctx.fillText('0dB', 4, midY - 4); ctx.fillText('-12dB', 4, yMinus12dB - 4);

    const freqsToLabel = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    ctx.textAlign = 'center'; ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#374151' : '#f3f4f6'; ctx.lineWidth = 1;
    freqsToLabel.forEach(freq => {
        const x = freqToX(freq); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, graphHeight); ctx.stroke();
        let textX = x; if (freq === 20) textX += 5; if (freq === 20000) textX -= 10;
        ctx.fillText(freq >= 1000 ? (freq/1000) + 'k' : freq, textX, height - 5);
    });

    if (currentSpectrum && currentSpectrum.length > 0) {
        const gradient = ctx.createLinearGradient(0, graphHeight, 0, 0);
        const isDark = document.body.classList.contains('dark-mode');
        gradient.addColorStop(0, isDark ? 'rgba(75, 85, 99, 0.05)' : 'rgba(156, 163, 175, 0.05)'); 
        gradient.addColorStop(0.6, isDark ? 'rgba(107, 114, 128, 0.3)' : 'rgba(107, 114, 128, 0.25)'); 
        gradient.addColorStop(1, isDark ? 'rgba(156, 163, 175, 0.6)' : 'rgba(75, 85, 99, 0.5)'); 
        
        ctx.fillStyle = gradient; const nyquist = currentSampleRate / 2; const binCount = currentSpectrum.length;

        for (let i = 1; i < binCount; i++) {
            const val = currentSpectrum[i]; if (val === 0) continue;
            const freq = i * (nyquist / binCount); if (freq > 20000) continue; 
            const nextFreq = (i + 1) * (nyquist / binCount);
            
            let x = freqToX(freq); if (x < 0) x = 0; let nextX = freqToX(nextFreq); if (nextX > width) nextX = width;
            let barWidth = Math.max(1.5, nextX - x - 0.5); 
            const percent = val / 255; const smoothPercent = Math.pow(percent, 1.2); 
            const barHeight = smoothPercent * graphHeight; const y = height - paddingBottom - barHeight;
            ctx.fillRect(x, y, barWidth, barHeight);
        }
    }

    if (currentDBResponse && currentDBResponse.length > 0) {
        ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#9ca3af' : '#4b5563'; 
        ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
        for (let i = 0; i < currentDBResponse.length; i++) {
            const x = (i / (currentDBResponse.length - 1)) * width;
            let y = Math.max(0, Math.min(graphHeight, midY - ((currentDBResponse[i] + currentBoosterDB) * pixelsPerDB)));
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        } ctx.stroke();
    }

    for (let i = 0; i < eqPoints.length; i++) {
        const px = freqToX(eqPoints[i].f), py = gainToY(eqPoints[i].g);
        ctx.beginPath(); ctx.arc(px, py, (i === hoveredPointIndex || i === draggedPointIndex || i === selectedPointIndex) ? 6 : 4, 0, 2 * Math.PI);
        if (i === selectedPointIndex || i === draggedPointIndex) ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f3f4f6' : '#374151'; 
        else if (i === hoveredPointIndex) ctx.fillStyle = '#9ca3af'; else ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#4b5563' : '#ffffff'; 
        ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#1f2937' : '#1f2937'; ctx.stroke();
    }
}

let clipTimer = null;
function animationLoop() {
    if (currentTabId !== null && isAppOn) {
        chrome.runtime.sendMessage({ action: 'get_spectrum', tabId: currentTabId }, (res) => {
            if (!chrome.runtime.lastError && res && res.data) { 
                currentSpectrum = res.data; 
                if (res.sampleRate) currentSampleRate = res.sampleRate; 
                
                let peak = 0;
                for (let i = 0; i < currentSpectrum.length; i++) {
                    if (currentSpectrum[i] > peak) peak = currentSpectrum[i];
                }
                
                let normalizedPeak = peak / 255;
                let targetPercent = Math.pow(normalizedPeak, 0.7) * 100;
                
                if (!window.dbMeterPercent) window.dbMeterPercent = 0;
                
                if (targetPercent > window.dbMeterPercent) {
                    window.dbMeterPercent = window.dbMeterPercent * 0.4 + targetPercent * 0.6; 
                } else {
                    window.dbMeterPercent = window.dbMeterPercent * 0.85 + targetPercent * 0.15; 
                }
                
                if (dbMeterFill) dbMeterFill.style.height = `${window.dbMeterPercent}%`;

                if (peak >= 254) {
                    if (dbMeterClip) dbMeterClip.classList.add('active');
                    clearTimeout(clipTimer);
                    clipTimer = setTimeout(() => { if (dbMeterClip) dbMeterClip.classList.remove('active'); }, 300);
                }

            } else { 
                currentSpectrum = []; 
                if (dbMeterFill) dbMeterFill.style.height = `0%`;
            } 
            drawGraph(); 
            requestAnimationFrame(animationLoop);
        });
    } else { 
        currentSpectrum = []; 
        if (dbMeterFill) dbMeterFill.style.height = `0%`;
        drawGraph(); 
        requestAnimationFrame(animationLoop); 
    }
}

let isInitialLoad = true;
chrome.runtime.onMessage.addListener((message) => {
    if (message.tabId !== currentTabId) return;
    
    if (message.action === 'sync_popup_state') {
        eqPoints = message.points || []; 
        const vol = message.boosterVolume || 100; setKnobValue(vol);
        
        chrome.storage.local.get([`preset_${currentTabId}`], (res) => {
            if (res[`preset_${currentTabId}`]) { 
                currentSelectedPresetKey = res[`preset_${currentTabId}`]; 
                isModified = false; tempPresetName = "";
                updateTriggerText(); renderUI(); 
            }
        });
        
        if (message.routing) {
            if (message.routing.deviceId !== undefined) outputSelect.value = message.routing.deviceId;
            if (message.routing.secondaryDeviceId) {
                duplicateSwitch.checked = true; cardOutput2.classList.remove('hidden'); controlsOut1.classList.remove('hidden'); controlsOut2.classList.remove('hidden');
                outputSelect2.value = message.routing.secondaryDeviceId;
            } else {
                duplicateSwitch.checked = false; cardOutput2.classList.add('hidden'); controlsOut1.classList.add('hidden'); controlsOut2.classList.add('hidden'); outputSelect2.value = "";
            }
            volOut1.value = message.routing.out1Vol; volOut1.style.setProperty('--vol-percent', `${message.routing.out1Vol}%`); bypassOut1.checked = message.routing.out1EffectOn;
            volOut2.value = message.routing.out2Vol; volOut2.style.setProperty('--vol-percent', `${message.routing.out2Vol}%`); bypassOut2.checked = message.routing.out2EffectOn;
            updateOutputVisuals();
        }

        if (isInitialLoad) { saveHistoryState(eqPoints); isInitialLoad = false; }
        if (window.justGotAIPoints) { saveHistoryState(eqPoints); window.justGotAIPoints = false; }
    } 
    else if (message.action === 'update_graph_data') { 
        currentDBResponse = message.dbValues; 
        currentBoosterDB = message.boosterDB; 
        surfTheCurve();
    }
    return true;
});

animationLoop();

// --- Booster ---
let isKnobDragging = false; let currentBoosterVal = 100;
function setKnobValue(vol) {
    currentBoosterVal = Math.max(100, Math.min(300, vol)); boosterValueDisplay.textContent = `${currentBoosterVal}%`;
    const percent = (currentBoosterVal - 100) / 200; const angle = percent * 270; 
    boosterKnobWrapper.style.setProperty('--fill-angle', `${angle}deg`); boosterKnob.style.transform = `rotate(calc(-135deg + ${angle}deg))`;
}
function handleKnobDrag(e) {
    if (!isKnobDragging) return; const rect = boosterKnobWrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2;
    let angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    angle += 90; if (angle < -180) angle += 360; if (angle > 180) angle -= 360;
    if (angle < -135) angle = -135; if (angle > 135) angle = 135;
    const percent = (angle + 135) / 270; const newVol = Math.round(100 + (percent * 200));
    setKnobValue(newVol); sendToEngine({ action: 'set_booster', volume: currentBoosterVal });
}
boosterKnob.addEventListener('mousedown', (e) => { isKnobDragging = true; handleKnobDrag(e); });
document.addEventListener('mousemove', handleKnobDrag); document.addEventListener('mouseup', () => { isKnobDragging = false; });

btnShowSave.addEventListener('click', () => { 
    saveContainer.classList.toggle('hidden'); 
    if (!saveContainer.classList.contains('hidden')) {
        if (isModified && tempPresetName) newPresetName.value = tempPresetName;
        newPresetName.focus(); 
    }
});

if (btnCancelPreset) {
    btnCancelPreset.addEventListener('click', () => {
        saveContainer.classList.add('hidden');
        newPresetName.value = '';
    });
}

btnSavePreset.addEventListener('click', () => {
    const name = newPresetName.value.trim(); if (!name) return;
    getStorageData((custom, order, favs) => {
        custom[name] = { points: eqPoints, type: 'created' }; if(!order.includes(name)) order.push(name);
        saveStorageData(custom, order, favs, () => { 
            newPresetName.value = ''; saveContainer.classList.add('hidden'); 
            currentSelectedPresetKey = `custom_${name}`; 
            isModified = false; tempPresetName = "";
            renderUI(); 
        });
    });
});

// --- NOVO: BATCH UPLOAD (Até 50 arquivos) ---
btnUpload.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (files.length > 50) { alert("Por favor, selecione no máximo 50 arquivos por vez."); return; }
    
    getStorageData((custom, order, favs) => {
        let filesProcessed = 0;
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const data = JSON.parse(evt.target.result);
                    if (data && data.points && Array.isArray(data.points)) {
                        const rawName = data.presetName ? data.presetName.replace('Preset - ', '') : file.name.replace('.json', '');
                        const importName = `${rawName}`;
                        custom[importName] = { points: data.points, type: 'imported' }; 
                        if(!order.includes(importName)) order.push(importName); 
                        
                        if (filesProcessed === files.length - 1) {
                            eqPoints = data.points; sendPointsToEngine(true); saveHistoryState(eqPoints);
                            currentSelectedPresetKey = `custom_${importName}`;
                        }
                    }
                } catch (err) { console.error("Erro no arquivo:", file.name); }
                
                filesProcessed++;
                if (filesProcessed === files.length) {
                    saveStorageData(custom, order, favs, () => renderUI());
                }
            }; 
            reader.readAsText(file); 
        });
    });
    e.target.value = ''; 
});

// --- NOVO: BATCH DOWNLOAD SYSTEM ---
const dlModal = document.getElementById('download-modal-overlay');
const btnDlCurrent = document.getElementById('btn-dl-current');
const btnDlBatch = document.getElementById('btn-dl-batch');
const batchDlSection = document.getElementById('batch-dl-section');
const batchDlList = document.getElementById('batch-dl-list');
const btnExecBatchDl = document.getElementById('btn-exec-batch-dl');
const btnCloseDlModal = document.getElementById('btn-close-dl-modal');

btnDownload.addEventListener('click', () => {
    dlModal.classList.remove('hidden');
    batchDlSection.classList.add('hidden');
    document.getElementById('dl-options-container').style.display = 'flex';
});

btnCloseDlModal.addEventListener('click', () => { dlModal.classList.add('hidden'); });

btnDlCurrent.addEventListener('click', () => {
    executeSingleDownload(currentSelectedPresetKey, eqPoints);
    dlModal.classList.add('hidden');
});

btnDlBatch.addEventListener('click', () => {
    document.getElementById('dl-options-container').style.display = 'none';
    batchDlSection.classList.remove('hidden');
    batchDlSection.style.display = 'flex';
    
    getStorageData((custom, order) => {
        batchDlList.innerHTML = '';
        order.forEach(key => {
            const div = document.createElement('div');
            div.className = 'batch-item';
            div.innerHTML = `<input type="checkbox" class="batch-checkbox" value="${key}"> <span>${key}</span>`;
            div.addEventListener('click', (e) => {
                if(e.target.tagName !== 'INPUT') {
                    const cb = div.querySelector('input');
                    cb.checked = !cb.checked;
                }
            });
            batchDlList.appendChild(div);
        });
        if(order.length === 0) batchDlList.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted);">Nenhum preset na biblioteca.</div>';
    });
});

btnExecBatchDl.addEventListener('click', () => {
    const checkboxes = batchDlList.querySelectorAll('.batch-checkbox:checked');
    if(checkboxes.length === 0) return;
    
    getStorageData((custom) => {
        checkboxes.forEach((cb, index) => {
            const key = cb.value;
            if(custom[key]) {
                setTimeout(() => {
                    executeSingleDownload(`Preset - ${key}`, custom[key].points);
                }, index * 300); 
            }
        });
    });
    dlModal.classList.add('hidden');
});

function executeSingleDownload(presetNameRaw, pointsData) {
    let cleanName = presetNameRaw.replace('custom_', '').replace('Preset - ', '');
    if (cleanName === 'Padrao' || cleanName === 'Temp_Custom') {
        cleanName = tempPresetName || "Meu_EQ";
    }
    const dataObj = { presetName: `Preset - ${cleanName}`, points: pointsData };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
    const a = document.createElement('a'); a.href = dataStr; a.download = `Preset_${cleanName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
}


function sendAiCommand(promptText) {
    if (promptText === "") return;
    aiStatus.textContent = currentLang === 'pt-br' ? "A IA está pensando... 🤔" : "AI is thinking... 🤔"; 
    aiStatus.classList.remove('hidden'); aiInput.style.height = 'auto';
    const isNewCurve = aiNewCurveSwitch.checked; const pointsToSend = isNewCurve ? [] : eqPoints; 
    sendToEngine({ action: 'process_ai_command', prompt: promptText, currentPoints: pointsToSend, isNewCurve: isNewCurve }, () => { setTimeout(() => { sendToEngine({ action: 'request_graph_update' }); window.justGotAIPoints = true; markAsModified(); surfTheCurve(); }, 1000); });
    aiInput.value = ""; setTimeout(() => { aiStatus.textContent = currentLang === 'pt-br' ? "Curva ajustada! 🚀" : "Curve adjusted! 🚀"; setTimeout(() => aiStatus.classList.add('hidden'), 3000); }, 1500);
}
btnSendAi.addEventListener('click', () => sendAiCommand(aiInput.value.trim()));
aiInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiCommand(aiInput.value.trim()); } });

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; 
let recognition = null; let isRecording = false;
if (SpeechRecognition) {
    recognition = new SpeechRecognition(); recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'pt-BR'; 
    recognition.onstart = () => { isRecording = true; micStatus.classList.remove('hidden'); btnMic.classList.add('recording'); };
    recognition.onresult = (e) => { let t = ''; for (let i = e.resultIndex; i < e.results.length; ++i) { t += e.results[i][0].transcript; } aiInput.value = t; aiInput.dispatchEvent(new Event('input')); };
    recognition.onend = () => { isRecording = false; micStatus.classList.add('hidden'); btnMic.classList.remove('recording'); const f = aiInput.value.trim(); if (f !== "") sendAiCommand(f); };
    recognition.onerror = (e) => { isRecording = false; micStatus.classList.add('hidden'); btnMic.classList.remove('recording'); if (e.error === 'not-allowed') { chrome.runtime.openOptionsPage(); } else { micStatus.textContent = "Erro: " + e.error; micStatus.classList.remove('hidden'); setTimeout(() => micStatus.classList.add('hidden'), 3000); } };
} else { btnMic.style.display = 'none'; }
btnMic.addEventListener('click', async () => { if (!recognition || isRecording) return; isRecording = true; try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(track => track.stop()); recognition.start(); } catch (err) {} });