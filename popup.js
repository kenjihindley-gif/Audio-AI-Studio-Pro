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

// Setup Passo 1: Microfone
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
        alert("Permissão bloqueada! Redirecionando para as opções do navegador...");
        setTimeout(() => chrome.runtime.openOptionsPage(), 1500);
    }
});

// Setup Passo 2: API
btnSaveSetupApi.addEventListener('click', () => {
    const newKey = setupApiKeyInput.value.trim();
    if (newKey) {
        chrome.storage.local.set({ geminiApiKey: newKey }, () => {
            btnSaveSetupApi.textContent = "Chave Salva ✔️";
            btnSaveSetupApi.style.color = "#10b981";
            checkApiKeyStatus();
            btnFinishSetup.disabled = false; // Permite concluir mesmo se pulou o mic (embora não seja ideal)
        });
    }
});

// Concluir Setup
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

// IA
const btnExpand = document.getElementById('btn-expand'); 
const canvas = document.getElementById('eqGraph');
const ctx = canvas.getContext('2d');
const aiInput = document.getElementById('ai-input');
const btnSendAi = document.getElementById('btn-send-ai');
const aiStatus = document.getElementById('ai-status');
const btnMic = document.getElementById('btn-mic');
const micStatus = document.getElementById('mic-status');
const aiNewCurveSwitch = document.getElementById('ai-new-curve-switch');

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

function doUndo() { if (historyIndex > 0) { historyIndex--; eqPoints = JSON.parse(JSON.stringify(eqHistory[historyIndex])); sendPointsToEngine(true); updateHistoryButtons(); } }
function doRedo() { if (historyIndex < eqHistory.length - 1) { historyIndex++; eqPoints = JSON.parse(JSON.stringify(eqHistory[historyIndex])); sendPointsToEngine(true); updateHistoryButtons(); } }
btnUndo.addEventListener('click', doUndo); btnRedo.addEventListener('click', doRedo);

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
    else { if (favs.length >= 3) { alert("Pode ter no máximo 3 favoritos!"); return; } favs.push(key); }
    saveStorageData(custom, order, favs, renderUI);
}

function selectPresetFromDropdown(key) { presetOptions.classList.remove('open'); applyPreset(key); renderUI(); }

function applyPreset(key) {
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
    let name = currentSelectedPresetKey; if (name.startsWith('custom_')) name = name.replace('custom_', '');
    presetTriggerText.textContent = name;
}

presetTrigger.addEventListener('click', () => presetOptions.classList.toggle('open'));
btnDots.addEventListener('click', () => dotsDropdown.classList.toggle('hidden'));
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-container')) presetOptions.classList.remove('open');
    if (!e.target.closest('.dots-container')) dotsDropdown.classList.add('hidden');
});

// Modal de Gestão 
function openModal(mode) {
    getStorageData((custom, order, favs) => {
        modalList.innerHTML = ''; modalOverlay.classList.remove('hidden'); modalOverlay.style.display = 'flex';
        if (order.length === 0) { 
            modalTitle.textContent = "Gerenciar Presets";
            modalList.innerHTML = `<div style="text-align:center; padding: 25px 10px; color: var(--text-muted); font-size: 0.9rem;">Nenhum preset personalizado encontrado.</div>`;
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
        }
        else if (mode === 'edit') {
            modalTitle.textContent = "Editar Nomes";
            order.forEach((key) => {
                const div = document.createElement('div'); div.className = 'modal-item';
                div.innerHTML = `<input type="text" value="${key}"> <button class="modal-btn">Salvar</button>`;
                div.querySelector('.modal-btn').onclick = () => {
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
            modalTitle.textContent = "Excluir Presets";
            order.forEach((key) => {
                const div = document.createElement('div'); div.className = 'modal-item';
                div.innerHTML = `<span>${key}</span> <button class="modal-btn" style="color:red;">🗑️</button>`;
                div.querySelector('button').onclick = () => {
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

let isExpanded = false;
function applyExpandState(expanded) {
    isExpanded = expanded;
    if (expanded) { document.body.classList.add('expanded'); canvas.width = 730; canvas.height = 300; } 
    else { document.body.classList.remove('expanded'); canvas.width = 350; canvas.height = 150; }
    drawGraph();
}
chrome.storage.local.get(['isExpanded'], (res) => { if (res.isExpanded) applyExpandState(true); });
btnExpand.addEventListener('click', () => { const newState = !isExpanded; chrome.storage.local.set({ isExpanded: newState }); applyExpandState(newState); });

// --- Roteamento ---
async function loadAudioOutputs() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        outputSelect.innerHTML = ''; outputSelect2.innerHTML = '';
        const defaultOpt = document.createElement('option'); defaultOpt.value = ""; defaultOpt.textContent = "Padrão do Sistema"; outputSelect.appendChild(defaultOpt);
        const defaultOpt2 = document.createElement('option'); defaultOpt2.value = ""; defaultOpt2.textContent = "Selecione a 2ª Saída"; outputSelect2.appendChild(defaultOpt2);

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
    const primary = outputSelect.value;
    const secondary = duplicateSwitch.checked ? outputSelect2.value : null;
    
    sendToEngine({ 
        action: 'set_routing_params', 
        deviceId: primary, secondaryDeviceId: secondary,
        out1Vol: parseInt(volOut1.value), out2Vol: parseInt(volOut2.value),
        out1EffectOn: bypassOut1.checked, out2EffectOn: bypassOut2.checked
    });
}

duplicateSwitch.addEventListener('change', (e) => {
    if (e.target.checked) { cardOutput2.classList.remove('hidden'); controlsOut1.classList.remove('hidden'); controlsOut2.classList.remove('hidden'); } 
    else { cardOutput2.classList.add('hidden'); controlsOut1.classList.add('hidden'); controlsOut2.classList.add('hidden'); outputSelect2.value = ""; }
    updateOutputVisuals(); sendRoutingParams();
});

outputSelect.addEventListener('change', () => { updateOutputVisuals(); sendRoutingParams(); });
outputSelect2.addEventListener('change', () => { updateOutputVisuals(); sendRoutingParams(); });

[volOut1, volOut2].forEach(slider => { slider.addEventListener('input', (e) => { e.target.style.setProperty('--vol-percent', `${e.target.value}%`); sendRoutingParams(); }); });
bypassOut1.addEventListener('change', sendRoutingParams);
bypassOut2.addEventListener('change', sendRoutingParams);

aiInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });

// --- Lógica do Mouse EQ ---
let eqPoints = []; const MAX_POINTS = 15;
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
    sendPointsToEngine(true); saveHistoryState(eqPoints); 
});

canvas.addEventListener('mousedown', (e) => { if (hoveredPointIndex !== -1) { isDragging = true; draggedPointIndex = hoveredPointIndex; selectedPointIndex = hoveredPointIndex; } else { selectedPointIndex = -1; } });

canvas.addEventListener('mousemove', (e) => {
    const pos = getXY(e);
    if (isDragging && draggedPointIndex !== -1) {
        eqPoints[draggedPointIndex].f = Math.max(minFreq, Math.min(maxFreq, xToFreq(pos.x))); eqPoints[draggedPointIndex].g = yToGain(pos.y); sendPointsToEngine(); 
    } else {
        hoveredPointIndex = -1;
        for (let i = 0; i < eqPoints.length; i++) {
            const px = freqToX(eqPoints[i].f), py = gainToY(eqPoints[i].g);
            if (Math.sqrt((pos.x - px) ** 2 + (pos.y - py) ** 2) < 10) { hoveredPointIndex = i; break; }
        }
        canvas.style.cursor = hoveredPointIndex !== -1 ? 'pointer' : 'crosshair';
    }
});

canvas.addEventListener('mouseup', () => { if(isDragging) { isDragging = false; draggedPointIndex = -1; sendPointsToEngine(true); saveHistoryState(eqPoints); } });
canvas.addEventListener('mouseleave', () => { if(isDragging) { isDragging = false; draggedPointIndex = -1; hoveredPointIndex = -1; sendPointsToEngine(true); saveHistoryState(eqPoints); } });

let wheelTimeout;
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (hoveredPointIndex !== -1) { 
        eqPoints[hoveredPointIndex].q = Math.max(0.1, Math.min(10, eqPoints[hoveredPointIndex].q + (e.deltaY > 0 ? -0.2 : 0.2))); sendPointsToEngine(true); 
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
            sendPointsToEngine(true); saveHistoryState(eqPoints); 
        }
    }
});

canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (hoveredPointIndex !== -1) { eqPoints.splice(hoveredPointIndex, 1); hoveredPointIndex = -1; selectedPointIndex = -1; sendPointsToEngine(true); saveHistoryState(eqPoints); } });

// --- Desenho ---
let currentDBResponse = [], currentBoosterDB = 0; let currentSpectrum = []; let currentSampleRate = 48000;

function drawGraph() {
    if (!canvas || !ctx) return;
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
        }
        ctx.stroke();
    }

    for (let i = 0; i < eqPoints.length; i++) {
        const px = freqToX(eqPoints[i].f), py = gainToY(eqPoints[i].g);
        ctx.beginPath(); ctx.arc(px, py, (i === hoveredPointIndex || i === draggedPointIndex || i === selectedPointIndex) ? 6 : 4, 0, 2 * Math.PI);
        if (i === selectedPointIndex || i === draggedPointIndex) ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f3f4f6' : '#374151'; 
        else if (i === hoveredPointIndex) ctx.fillStyle = '#9ca3af'; else ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#4b5563' : '#ffffff'; 
        ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#1f2937' : '#1f2937'; ctx.stroke();
    }
}

function animationLoop() {
    if (currentTabId !== null && isAppOn) {
        chrome.runtime.sendMessage({ action: 'get_spectrum', tabId: currentTabId }, (res) => {
            if (!chrome.runtime.lastError && res && res.data) { currentSpectrum = res.data; if (res.sampleRate) currentSampleRate = res.sampleRate; } 
            else { currentSpectrum = []; } drawGraph(); requestAnimationFrame(animationLoop);
        });
    } else { currentSpectrum = []; drawGraph(); requestAnimationFrame(animationLoop); }
}

let isInitialLoad = true;
chrome.runtime.onMessage.addListener((message) => {
    if (message.tabId !== currentTabId) return;
    
    if (message.action === 'sync_popup_state') {
        eqPoints = message.points || [];
        const vol = message.boosterVolume || 100;
        setKnobValue(vol);
        
        chrome.storage.local.get([`preset_${currentTabId}`], (res) => {
            if (res[`preset_${currentTabId}`]) {
                currentSelectedPresetKey = res[`preset_${currentTabId}`];
                updateTriggerText(); renderUI(); 
            }
        });
        
        if (message.routing) {
            if (message.routing.deviceId !== undefined) outputSelect.value = message.routing.deviceId;
            if (message.routing.secondaryDeviceId) {
                duplicateSwitch.checked = true;
                cardOutput2.classList.remove('hidden'); controlsOut1.classList.remove('hidden'); controlsOut2.classList.remove('hidden');
                outputSelect2.value = message.routing.secondaryDeviceId;
            } else {
                duplicateSwitch.checked = false;
                cardOutput2.classList.add('hidden'); controlsOut1.classList.add('hidden'); controlsOut2.classList.add('hidden');
                outputSelect2.value = "";
            }
            volOut1.value = message.routing.out1Vol; volOut1.style.setProperty('--vol-percent', `${message.routing.out1Vol}%`); bypassOut1.checked = message.routing.out1EffectOn;
            volOut2.value = message.routing.out2Vol; volOut2.style.setProperty('--vol-percent', `${message.routing.out2Vol}%`); bypassOut2.checked = message.routing.out2EffectOn;
            updateOutputVisuals();
        }

        if (isInitialLoad) { saveHistoryState(eqPoints); isInitialLoad = false; }
        if (window.justGotAIPoints) { saveHistoryState(eqPoints); window.justGotAIPoints = false; }
    } 
    else if (message.action === 'update_graph_data') { currentDBResponse = message.dbValues; currentBoosterDB = message.boosterDB; }
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

btnShowSave.addEventListener('click', () => { saveContainer.classList.toggle('hidden'); newPresetName.focus(); });
btnSavePreset.addEventListener('click', () => {
    const name = newPresetName.value.trim(); if (!name) return;
    getStorageData((custom, order, favs) => {
        custom[name] = { points: eqPoints, type: 'created' }; if(!order.includes(name)) order.push(name);
        saveStorageData(custom, order, favs, () => { newPresetName.value = ''; saveContainer.classList.add('hidden'); currentSelectedPresetKey = `custom_${name}`; renderUI(); });
    });
});

btnUpload.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const data = JSON.parse(evt.target.result);
                if (data && data.points && Array.isArray(data.points)) {
                    eqPoints = data.points; sendPointsToEngine(true); saveHistoryState(eqPoints); 
                    const rawName = data.presetName ? data.presetName.replace('Preset - ', '') : "Importado"; const importName = `Preset - ${rawName}`;
                    getStorageData((custom, order, favs) => { custom[importName] = { points: eqPoints, type: 'imported' }; if(!order.includes(importName)) order.push(importName); saveStorageData(custom, order, favs, () => { currentSelectedPresetKey = `custom_${importName}`; renderUI(); }); });
                } else { alert("Arquivo JSON inválido."); }
            } catch (err) { alert("Erro ao ler o arquivo."); }
        }; reader.readAsText(file); 
    } e.target.value = ''; 
});

btnDownload.addEventListener('click', () => {
    let currentName = currentSelectedPresetKey; if (currentName.startsWith('custom_')) currentName = currentName.replace('custom_', ''); else if (currentName === 'Padrao') currentName = "Meu_EQ";
    const cleanName = currentName.replace('Preset - ', ''); const dataObj = { presetName: `Preset - ${cleanName}`, points: eqPoints };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
    const a = document.createElement('a'); a.href = dataStr; a.download = `Preset_${cleanName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
});

function sendAiCommand(promptText) {
    if (promptText === "") return;
    aiStatus.textContent = "A IA está pensando... 🤔"; aiStatus.classList.remove('hidden'); aiInput.style.height = 'auto';
    const isNewCurve = aiNewCurveSwitch.checked; const pointsToSend = isNewCurve ? [] : eqPoints; 
    sendToEngine({ action: 'process_ai_command', prompt: promptText, currentPoints: pointsToSend, isNewCurve: isNewCurve }, () => { setTimeout(() => { sendToEngine({ action: 'request_graph_update' }); window.justGotAIPoints = true; }, 1000); });
    aiInput.value = ""; setTimeout(() => { aiStatus.textContent = "Curva ajustada! 🚀"; setTimeout(() => aiStatus.classList.add('hidden'), 3000); }, 1500);
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