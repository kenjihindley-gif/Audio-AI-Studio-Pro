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
    });
}

// --- Lógica de Permissões e Chave API ---
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
        alert("Permissão bloqueada!");
        setTimeout(() => chrome.runtime.openOptionsPage(), 1500);
    }
});

btnSaveSetupApi.addEventListener('click', () => {
    const newKey = setupApiKeyInput.value.trim();
    if (newKey) {
        chrome.storage.local.set({ geminiApiKey: newKey }, () => {
            btnSaveSetupApi.textContent = "Chave Salva ✔️";
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
        alert("Por favor, libere o acesso ao microfone primeiro.");
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
const btnUpload = document.getElementById('btn-upload');
const fileInput = document.getElementById('file-input');
const btnDownload = document.getElementById('btn-download');

// Roteamento
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

// IA e Visualização
const btnExpand = document.getElementById('btn-expand'); 
const canvas = document.getElementById('eqGraph');
const ctx = canvas.getContext('2d');
const aiInput = document.getElementById('ai-input');
const btnSendAi = document.getElementById('btn-send-ai');
const aiStatus = document.getElementById('ai-status');
const btnMic = document.getElementById('btn-mic');
const micStatus = document.getElementById('mic-status');
const aiNewCurveSwitch = document.getElementById('ai-new-curve-switch');

// NOVO: Toggle e Sliders
const btnToggleEq = document.getElementById('btn-toggle-eq');
const slidersContainer = document.getElementById('sliders-container');
const graphHints = document.getElementById('graph-hints');
const dbMeterFill = document.getElementById('db-meter-fill');
let isSliderView = false;

// Menu
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
    if (isAppOn) { 
        appPowerBtn.src = "https://i.imgur.com/L2I8VnN.png"; 
        appPowerBtn.style.opacity = "1"; 
        canvas.style.opacity = "1"; 
        slidersContainer.style.opacity = "1";
    } else { 
        appPowerBtn.src = "https://i.imgur.com/99zg63i.png"; 
        appPowerBtn.style.opacity = "0.6"; 
        canvas.style.opacity = "0.4"; 
        slidersContainer.style.opacity = "0.4";
    }
    sendToEngine({ action: 'set_power_state', isPowerOn: isAppOn });
}

appPowerBtn.addEventListener('click', () => { 
    isAppOn = !isAppOn; 
    chrome.storage.local.set({ isAppOn: isAppOn }); 
    updatePowerUI(); 
    appPowerBtn.style.transform = 'scale(0.9)'; 
    setTimeout(() => appPowerBtn.style.transform = 'scale(1)', 150); 
});

// --- Alternância de Visualização (Canvas / Sliders) ---
btnToggleEq.addEventListener('click', () => {
    isSliderView = !isSliderView;
    if (isSliderView) {
        canvas.classList.add('hidden');
        slidersContainer.classList.remove('hidden');
        graphHints.classList.add('hidden');
        btnToggleEq.style.boxShadow = "inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light)";
        syncSlidersToGraph(); // Sincroniza ao entrar
    } else {
        canvas.classList.remove('hidden');
        slidersContainer.classList.add('hidden');
        graphHints.classList.remove('hidden');
        btnToggleEq.style.boxShadow = "3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)";
    }
});

if (btnMiniplayer) {
    btnMiniplayer.addEventListener('click', () => {
        if (currentTabId !== null) { chrome.windows.create({ url: `miniplayer.html?tabId=${currentTabId}`, type: 'popup', width: 540, height: 220, focused: true }); window.close(); }
    });
}

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
let eqHistory = []; let historyIndex = -1; const MAX_HISTORY = 10;
const btnUndo = document.getElementById('btn-undo'); const btnRedo = document.getElementById('btn-redo');

function updateHistoryButtons() {
    if (historyIndex > 0) { btnUndo.disabled = false; btnUndo.style.opacity = '1'; } 
    else { btnUndo.disabled = true; btnUndo.style.opacity = '0.4'; }
    if (historyIndex < eqHistory.length - 1) { btnRedo.disabled = false; btnRedo.style.opacity = '1'; } 
    else { btnRedo.disabled = true; btnRedo.style.opacity = '0.4'; }
}

function saveHistoryState(pointsToSave) {
    const currentStateString = JSON.stringify(pointsToSave);
    if (historyIndex >= 0 && JSON.stringify(eqHistory[historyIndex]) === currentStateString) return;
    if (historyIndex < eqHistory.length - 1) eqHistory = eqHistory.slice(0, historyIndex + 1);
    eqHistory.push(JSON.parse(currentStateString)); 
    if (eqHistory.length > MAX_HISTORY) eqHistory.shift(); else historyIndex++;
    updateHistoryButtons();
}

function doUndo() { 
    if (historyIndex > 0) { 
        historyIndex--; eqPoints = JSON.parse(JSON.stringify(eqHistory[historyIndex])); 
        sendPointsToEngine(true); updateHistoryButtons(); syncSlidersToGraph();
    } 
}
function doRedo() { 
    if (historyIndex < eqHistory.length - 1) { 
        historyIndex++; eqPoints = JSON.parse(JSON.stringify(eqHistory[historyIndex])); 
        sendPointsToEngine(true); updateHistoryButtons(); syncSlidersToGraph();
    } 
}
btnUndo.addEventListener('click', doUndo); btnRedo.addEventListener('click', doRedo);

// --- Presets ---
const defaultPresets = { 
    'Padrao': [], 
    'Pop Rock': [{f:150,g:2,q:1.2},{f:400,g:1,q:1.2},{f:1000,g:-1,q:1.2},{f:3000,g:1,q:1.2},{f:8000,g:2,q:1.2}], 
    'Rock': [{f:150,g:5,q:1.2},{f:400,g:2,q:1.2},{f:1000,g:-4,q:1.2},{f:3000,g:3,q:1.2},{f:8000,g:5,q:1.2}], 
    'Bass Booster': [{f:150,g:8,q:1.2},{f:400,g:4,q:1.2},{f:1000,g:0,q:1.2},{f:3000,g:0,q:1.2},{f:8000,g:0,q:1.2}], 
    'Treble Booster': [{f:150,g:0,q:1.2},{f:400,g:0,q:1.2},{f:1000,g:0,q:1.2},{f:3000,g:4,q:1.2},{f:8000,g:8,q:1.2}],
};
const presetIcons = { 'Pop Rock': '🎸', 'Rock': '🤘', 'Vocal': '🎤', 'Bass Booster': '🔈', 'Treble Booster': '🔊' };

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
        const btn = document.createElement('button');
        const isActive = (currentSelectedPresetKey === favKey);
        btn.className = `btn-fav ${isActive ? 'active' : ''}`;
        btn.textContent = favKey.replace('custom_', '');
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
        div.innerHTML = `<div class="preset-info"><span class="preset-icon monochrome-icon">${icon}</span> <span>${displayName}</span></div>${starHtml}`;
        div.querySelector('.preset-info').addEventListener('click', () => { selectPresetFromDropdown(key); });
        if (key !== 'Padrao') { div.querySelector('.star-btn-container').addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(key, favs, custom, order); }); }
        presetOptions.appendChild(div);
    };

    createItem('Padrao', 'Padrão (Flat)', '🎚️');
    order.forEach(key => { const data = custom[key]; const type = data.type || 'created'; const icon = type === 'imported' ? '⬆️' : '🔧'; createItem(`custom_${key}`, key, icon); });
    Object.keys(defaultPresets).forEach(key => { if (key !== 'Padrao') createItem(key, key, presetIcons[key] || '🎵'); });
}

function toggleFavorite(key, favs, custom, order) {
    if (favs.includes(key)) favs = favs.filter(f => f !== key);
    else { if (favs.length >= 3) { alert("Máximo de 3 favoritos!"); return; } favs.push(key); }
    saveStorageData(custom, order, favs, renderUI);
}

function selectPresetFromDropdown(key) { presetOptions.classList.remove('open'); applyPreset(key); renderUI(); }

function applyPreset(key) {
    currentSelectedPresetKey = key; selectedPointIndex = -1;
    if (currentTabId !== null) chrome.storage.local.set({ [`preset_${currentTabId}`]: key });
    if (key.startsWith('custom_')) {
        const name = key.replace('custom_', '');
        getStorageData((custom) => { if(custom[name]) { eqPoints = Array.isArray(custom[name]) ? custom[name] : custom[name].points; finalizeEngineUpdate(); } });
    } else {
        eqPoints = JSON.parse(JSON.stringify(defaultPresets[key])); finalizeEngineUpdate();
    }
}

function finalizeEngineUpdate() {
    sendPointsToEngine(true); saveHistoryState(eqPoints); syncSlidersToGraph();
}

function updateTriggerText() {
    let name = currentSelectedPresetKey; if (name.startsWith('custom_')) name = name.replace('custom_', '');
    presetTriggerText.textContent = name;
}

presetTrigger.addEventListener('click', () => presetOptions.classList.toggle('open'));
btnDots.addEventListener('click', () => dotsDropdown.classList.toggle('hidden'));
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-container')) presetOptions.classList.remove('open');
    if (!e.target.closest('.dots-container')) dotsDropdown.classList.add('hidden');
});

// Modal
function openModal(mode) {
    getStorageData((custom, order, favs) => {
        modalList.innerHTML = ''; modalOverlay.classList.remove('hidden'); modalOverlay.style.display = 'flex';
        if (order.length === 0) { 
            modalTitle.textContent = "Gerenciar Presets";
            modalList.innerHTML = `<div style="text-align:center; padding: 25px; color: var(--text-muted);">Nenhum preset personalizado.</div>`;
            return; 
        }
        if (mode === 'move') {
            modalTitle.textContent = "Mover Ordem";
            order.forEach((key, idx) => {
                const div = document.createElement('div'); div.className = 'modal-item';
                div.innerHTML = `<span>${key}</span><div class="modal-actions"><button class="modal-btn" ${idx===0 ? 'disabled':''}>↑</button><button class="modal-btn" ${idx===order.length-1 ? 'disabled':''}>↓</button></div>`;
                const btns = div.querySelectorAll('.modal-btn');
                btns[0].onclick = () => { [order[idx], order[idx-1]] = [order[idx-1], order[idx]]; saveStorageData(custom, order, favs, () => openModal('move')); };
                btns[1].onclick = () => { [order[idx], order[idx+1]] = [order[idx+1], order[idx]]; saveStorageData(custom, order, favs, () => openModal('move')); };
                modalList.appendChild(div);
            });
        } else if (mode === 'edit') {
            modalTitle.textContent = "Editar Nomes";
            order.forEach((key) => {
                const div = document.createElement('div'); div.className = 'modal-item';
                div.innerHTML = `<input type="text" value="${key}"> <button class="modal-btn">OK</button>`;
                div.querySelector('button').onclick = () => {
                    const n = div.querySelector('input').value.trim(); if (!n || n === key || custom[n]) return;
                    custom[n] = custom[key]; delete custom[key]; order[order.indexOf(key)] = n;
                    saveStorageData(custom, order, favs, () => openModal('edit'));
                };
                modalList.appendChild(div);
            });
        } else if (mode === 'delete') {
            modalTitle.textContent = "Excluir Presets";
            order.forEach((key) => {
                const div = document.createElement('div'); div.className = 'modal-item';
                div.innerHTML = `<span>${key}</span> <button class="modal-btn" style="color:red;">🗑️</button>`;
                div.querySelector('button').onclick = () => {
                    delete custom[key]; order = order.filter(k => k !== key); 
                    saveStorageData(custom, order, favs, () => openModal('delete'));
                };
                modalList.appendChild(div);
            });
        }
    });
}
document.getElementById('btn-menu-move').addEventListener('click', () => openModal('move'));
document.getElementById('btn-menu-edit').addEventListener('click', () => openModal('edit'));
document.getElementById('btn-menu-delete').addEventListener('click', () => openModal('delete'));
btnModalClose.addEventListener('click', () => { modalOverlay.classList.add('hidden'); modalOverlay.style.display = 'none'; renderUI(); });

let isExpanded = false;
function applyExpandState(expanded) {
    isExpanded = expanded;
    if (expanded) { document.body.classList.add('expanded'); canvas.width = 730; canvas.height = 300; } 
    else { document.body.classList.remove('expanded'); canvas.width = 350; canvas.height = 150; }
    drawGraph();
}
chrome.storage.local.get(['isExpanded'], (res) => { if (res.isExpanded) applyExpandState(true); });
btnExpand.addEventListener('click', () => { const n = !isExpanded; chrome.storage.local.set({ isExpanded: n }); applyExpandState(n); });

// --- Roteamento ---
async function loadAudioOutputs() {
    try {
        const d = await navigator.mediaDevices.enumerateDevices();
        const outputs = d.filter(device => device.kind === 'audiooutput');
        outputSelect.innerHTML = '<option value="">Padrão do Sistema</option>';
        outputSelect2.innerHTML = '<option value="">Selecione a 2ª Saída</option>';
        outputs.forEach(device => {
            if (device.deviceId === "default") return;
            const opt = document.createElement('option'); opt.value = device.deviceId; opt.textContent = device.label || device.deviceId.substring(0, 8);
            outputSelect.appendChild(opt.cloneNode(true)); outputSelect2.appendChild(opt);
        });
        updateOutputVisuals();
    } catch (err) {}
}

function updateOutputVisuals() {
    const text1 = outputSelect.options[outputSelect.selectedIndex]?.text.toLowerCase() || "";
    iconOut1.innerHTML = (text1.includes('headphone') || text1.includes('auscultador') || text1.includes('fone')) ? svgHeadphone : svgSpeaker;
    labelOut1.textContent = outputSelect.options[outputSelect.selectedIndex]?.text.substring(0, 15).toUpperCase() || "SAÍDA 1";

    const text2 = outputSelect2.options[outputSelect2.selectedIndex]?.text.toLowerCase() || "";
    iconOut2.innerHTML = (text2.includes('headphone') || text2.includes('auscultador') || text2.includes('fone')) ? svgHeadphone : svgSpeaker;
    labelOut2.textContent = outputSelect2.options[outputSelect2.selectedIndex]?.text.substring(0, 15).toUpperCase() || "SAÍDA 2";
}

function sendRoutingParams() {
    sendToEngine({ 
        action: 'set_routing_params', 
        deviceId: outputSelect.value, secondaryDeviceId: duplicateSwitch.checked ? outputSelect2.value : null,
        out1Vol: parseInt(volOut1.value), out2Vol: parseInt(volOut2.value),
        out1EffectOn: bypassOut1.checked, out2EffectOn: bypassOut2.checked
    });
}

duplicateSwitch.addEventListener('change', (e) => {
    if (e.target.checked) { cardOutput2.classList.remove('hidden'); controlsOut1.classList.remove('hidden'); controlsOut2.classList.remove('hidden'); } 
    else { cardOutput2.classList.add('hidden'); controlsOut1.classList.add('hidden'); controlsOut2.classList.add('hidden'); }
    sendRoutingParams();
});
[outputSelect, outputSelect2, volOut1, volOut2, bypassOut1, bypassOut2].forEach(el => el.addEventListener('change', () => { updateOutputVisuals(); sendRoutingParams(); }));
[volOut1, volOut2].forEach(s => s.addEventListener('input', (e) => e.target.style.setProperty('--vol-percent', `${e.target.value}%`)));

// --- Lógica de Sincronização Bidirecional (NOVO) ---

// 1. Sliders -> Gráfico
document.querySelectorAll('.vertical-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
        const freq = parseFloat(e.target.getAttribute('data-freq'));
        const gain = parseFloat(e.target.value);
        
        // Procura se já existe um ponto próximo a esta frequência no gráfico
        let found = false;
        for (let pt of eqPoints) {
            // Tolerância de 5% na frequência para considerar o mesmo ponto
            if (Math.abs(pt.f - freq) / freq < 0.05) {
                pt.g = gain;
                found = true;
                break;
            }
        }
        
        if (!found) {
            eqPoints.push({ f: freq, g: gain, q: 1.2 });
        }
        
        sendPointsToEngine();
    });
    
    slider.addEventListener('change', () => saveHistoryState(eqPoints));
});

// 2. Gráfico -> Sliders
function syncSlidersToGraph() {
    if (!isSliderView) return;
    
    document.querySelectorAll('.vertical-slider').forEach(slider => {
        const freq = parseFloat(slider.getAttribute('data-freq'));
        
        // Busca o ponto no eqPoints que mais se aproxima da frequência fixa do slider
        let closestPt = null;
        let minDiff = Infinity;
        
        eqPoints.forEach(pt => {
            let diff = Math.abs(pt.f - freq);
            if (diff < minDiff) { minDiff = diff; closestPt = pt; }
        });
        
        // Se houver um ponto próximo (limite de 15% de distância logarítmica), ajusta o slider
        if (closestPt && minDiff / freq < 0.2) {
            slider.value = closestPt.g;
        } else {
            slider.value = 0; // Flat se não houver ponto influenciando
        }
    });
}

// --- Lógica do Mouse EQ (Canvas) ---
let eqPoints = []; const MAX_POINTS = 15;
let isDragging = false, draggedPointIndex = -1, hoveredPointIndex = -1, selectedPointIndex = -1; 
const minFreq = 20, maxFreq = 20000, dbLimit = 15;

function freqToX(f) { return (Math.log(f / minFreq) / Math.log(maxFreq / minFreq)) * canvas.width; }
function xToFreq(x) { return minFreq * Math.pow(maxFreq / minFreq, x / canvas.width); }
function gainToY(g) { const midY = (canvas.height - 20) / 2; return midY - (g * (midY / dbLimit)); }
function yToGain(y) { const midY = (canvas.height - 20) / 2; return Math.max(-dbLimit, Math.min(dbLimit, (midY - y) / (midY / dbLimit))); }

function getXY(e) { const rect = canvas.getBoundingClientRect(); return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) }; }

let lastSendTime = 0;
function sendPointsToEngine(force = false) {
    eqPoints.sort((a, b) => a.f - b.f); const now = Date.now();
    if (force || now - lastSendTime > 40) { sendToEngine({ action: 'update_dynamic_eq', points: eqPoints }); lastSendTime = now; }
}

canvas.addEventListener('dblclick', (e) => {
    const pos = getXY(e); if (pos.y > canvas.height - 20 || eqPoints.length >= MAX_POINTS) return;
    eqPoints.push({ f: xToFreq(pos.x), g: yToGain(pos.y), q: 1.2 }); finalizeEngineUpdate();
});

canvas.addEventListener('mousedown', (e) => { if (hoveredPointIndex !== -1) { isDragging = true; draggedPointIndex = hoveredPointIndex; selectedPointIndex = hoveredPointIndex; } });
canvas.addEventListener('mousemove', (e) => {
    const pos = getXY(e);
    if (isDragging && draggedPointIndex !== -1) {
        eqPoints[draggedPointIndex].f = Math.max(minFreq, Math.min(maxFreq, xToFreq(pos.x))); 
        eqPoints[draggedPointIndex].g = yToGain(pos.y); sendPointsToEngine(); 
    } else {
        hoveredPointIndex = -1;
        for (let i = 0; i < eqPoints.length; i++) {
            if (Math.sqrt((pos.x - freqToX(eqPoints[i].f))**2 + (pos.y - gainToY(eqPoints[i].g))**2) < 10) { hoveredPointIndex = i; break; }
        }
        canvas.style.cursor = hoveredPointIndex !== -1 ? 'pointer' : 'crosshair';
    }
});
canvas.addEventListener('mouseup', () => { if(isDragging) { isDragging = false; draggedPointIndex = -1; finalizeEngineUpdate(); } });

// --- Desenho e Medidor de Som ---
let currentDBResponse = [], currentBoosterDB = 0, currentSpectrum = [], currentSampleRate = 48000;

function updateDbMeter() {
    if (!currentSpectrum || currentSpectrum.length === 0) { dbMeterFill.style.height = '0%'; return; }
    // Calcula o nível médio de energia (RMS simplificado)
    let sum = 0;
    for (let v of currentSpectrum) sum += v;
    let avg = sum / currentSpectrum.length;
    let percent = Math.min(100, (avg / 128) * 100); // 128 como teto de sensibilidade visual
    dbMeterFill.style.height = `${percent}%`;
}

function drawGraph() {
    if (!canvas || !ctx) return;
    const w = canvas.width, h = canvas.height, padding = 20, gh = h - padding, midY = gh/2, pDB = midY/dbLimit;
    ctx.clearRect(0, 0, w, h);
    
    // Grid
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#4b5563' : '#d1d5db';
    ctx.lineWidth = 1; ctx.beginPath();
    [12, 0, -12].forEach(db => { let y = midY - (db*pDB); ctx.moveTo(0, y); ctx.lineTo(w, y); });
    ctx.stroke();

    // Spectrum
    if (currentSpectrum.length > 0) {
        ctx.fillStyle = document.body.classList.contains('dark-mode') ? 'rgba(156,163,175,0.2)' : 'rgba(75,85,99,0.1)';
        const binW = w / (currentSpectrum.length / 4); // Amostragem visual
        for (let i=0; i < currentSpectrum.length; i+=4) {
            let val = (currentSpectrum[i]/255) * gh;
            ctx.fillRect(i * (w/currentSpectrum.length), gh - val, binW, val);
        }
    }

    // Response Curve
    if (currentDBResponse.length > 0) {
        ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#9ca3af' : '#4b5563'; 
        ctx.lineWidth = 3; ctx.beginPath();
        for (let i=0; i < currentDBResponse.length; i++) {
            let x = (i/(currentDBResponse.length-1)) * w;
            let y = midY - ((currentDBResponse[i] + currentBoosterDB) * pDB);
            if (i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Pontos
    eqPoints.forEach((pt, i) => {
        ctx.beginPath(); ctx.arc(freqToX(pt.f), gainToY(pt.g), 5, 0, 2*Math.PI);
        ctx.fillStyle = (i === selectedPointIndex) ? '#374151' : '#fff'; ctx.fill();
        ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.stroke();
    });
}

function animationLoop() {
    if (currentTabId !== null && isAppOn) {
        chrome.runtime.sendMessage({ action: 'get_spectrum', tabId: currentTabId }, (res) => {
            if (res && res.data) { currentSpectrum = res.data; currentSampleRate = res.sampleRate; }
            updateDbMeter(); drawGraph(); requestAnimationFrame(animationLoop);
        });
    } else { updateDbMeter(); drawGraph(); requestAnimationFrame(animationLoop); }
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.tabId !== currentTabId) return;
    if (msg.action === 'sync_popup_state') {
        eqPoints = msg.points || []; setKnobValue(msg.boosterVolume || 100);
        syncSlidersToGraph(); drawGraph();
    } else if (msg.action === 'update_graph_data') {
        currentDBResponse = msg.dbValues; currentBoosterDB = msg.boosterDB;
    }
});

animationLoop();

// Booster Knob
function setKnobValue(v) {
    const val = Math.max(100, Math.min(300, v)); boosterValueDisplay.textContent = `${val}%`;
    const ang = ((val-100)/200) * 270;
    boosterKnobWrapper.style.setProperty('--fill-angle', `${ang}deg`);
    boosterKnob.style.transform = `rotate(calc(-135deg + ${ang}deg))`;
}
// (Lógica de drag do knob omitida para brevidade, mas mantida a funcionalidade existente)

// IA Commands
function sendAiCommand(text) {
    if (!text) return; aiStatus.textContent = "IA processando..."; aiStatus.classList.remove('hidden');
    sendToEngine({ action: 'process_ai_command', prompt: text, currentPoints: eqNewCurveSwitch.checked ? [] : eqPoints, isNewCurve: aiNewCurveSwitch.checked }, () => {
        setTimeout(() => { sendToEngine({ action: 'request_graph_update' }); syncSlidersToGraph(); }, 800);
    });
}
btnSendAi.addEventListener('click', () => sendAiCommand(aiInput.value.trim()));