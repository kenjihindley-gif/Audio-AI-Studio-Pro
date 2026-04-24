const dict = {
    'pt-br': {
        'options_title': 'Configurações Studio Pro',
        'lang_settings': 'Idioma / Language',
        'lang_desc': 'Selecione o idioma padrão de toda a interface da extensão. Essa alteração será aplicada instantaneamente em todos os menus e avisos visuais do Studio Pro.',
        'nonstop_desc': 'Mantém a reprodução contínua no YouTube e YouTube Music impedindo a mensagem de inatividade. Funciona 100% invisível em segundo plano.',
        'step1_desc': 'Acesso obrigatório para que a Inteligência Artificial e os equalizadores consigam captar, analisar e processar o fluxo de áudio da aba atual.',
        'btn_grant_mic': 'Liberar Acesso',
        'perm_success': 'Acesso Liberado! ✔️',
        'api_settings': 'Chave API (Gemini)',
        'api_desc': 'Insira a sua chave secreta da API do Google Gemini. Isso é necessário para habilitar as funções avançadas de masterização e os ajustes de equalização controlados por Inteligência Artificial.',
        'btn_save': 'Salvar Chave',
        'btn_edit': 'Editar',
        'btn_cancel': 'Cancelar',
        'saved_success': 'Salvo com sucesso!'
    },
    'en': {
        'options_title': 'Studio Pro Settings',
        'lang_settings': 'Language / Idioma',
        'lang_desc': 'Select the default interface language. This change will be instantly applied across all menus and visual prompts in Studio Pro.',
        'nonstop_desc': 'Maintains continuous playback on YouTube and YouTube Music by preventing the inactivity prompt. Works 100% invisibly in the background.',
        'step1_desc': 'Mandatory access so that the Artificial Intelligence and equalizers can capture, analyze, and process the audio stream of the current tab.',
        'btn_grant_mic': 'Grant Access',
        'perm_success': 'Access Granted! ✔️',
        'api_settings': 'API Key (Gemini)',
        'api_desc': 'Enter your Google Gemini API secret key. This is required to enable advanced mastering functions and AI-controlled equalization adjustments.',
        'btn_save': 'Save Key',
        'btn_edit': 'Edit',
        'btn_cancel': 'Cancel',
        'saved_success': 'Saved successfully!'
    }
};

let currentLang = 'pt-br';
let savedApiKey = '';

const langBtns = document.querySelectorAll('.lang-btn');
const btnGrantMic = document.getElementById('btn-grant-mic');
const permStatus = document.getElementById('perm-status');
const nonstopSwitch = document.getElementById('nonstop-switch');

// Elementos da API Key
const apiKeyInput = document.getElementById('api-key-input');
const btnToggleEye = document.getElementById('btn-toggle-eye');
const eyeClosed = document.getElementById('eye-closed');
const eyeOpen = document.getElementById('eye-open');
const btnEditApi = document.getElementById('btn-edit-api');
const btnSaveApi = document.getElementById('btn-save-api');
const btnCancelApi = document.getElementById('btn-cancel-api');
const apiStatus = document.getElementById('api-status');

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[currentLang] && dict[currentLang][key]) {
            el.textContent = dict[currentLang][key];
        }
    });
    btnSaveApi.textContent = dict[currentLang]['btn_save'];
    btnEditApi.textContent = dict[currentLang]['btn_edit'];
    btnCancelApi.textContent = dict[currentLang]['btn_cancel'];
}

// Sincronização Automática com o Tema do App Principal
chrome.storage.local.get(['theme'], (res) => {
    if (res.theme === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.theme) {
        if (changes.theme.newValue === 'dark') document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    }
});

// Carregar Estado Inicial
chrome.storage.local.get(['language', 'geminiApiKey', 'isNonStopOn'], (res) => {
    if (res.language) currentLang = res.language;
    updateLangButtons();
    applyTranslations();

    if (res.isNonStopOn !== undefined) nonstopSwitch.checked = res.isNonStopOn;

    if (res.geminiApiKey) {
        savedApiKey = res.geminiApiKey;
        apiKeyInput.value = savedApiKey;
        setApiState('has_key');
    } else {
        setApiState('no_key');
    }
});

// Evento de Mudança de Idioma via Botões
langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentLang = btn.getAttribute('data-lang');
        chrome.storage.local.set({ language: currentLang }, () => {
            updateLangButtons();
            applyTranslations();
        });
    });
});

function updateLangButtons() {
    langBtns.forEach(btn => {
        if (btn.getAttribute('data-lang') === currentLang) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

// Evento do Motor Non-Stop
nonstopSwitch.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    chrome.storage.local.set({ isNonStopOn: isChecked }, () => {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && tab.url.includes('youtube.com')) {
                    chrome.tabs.sendMessage(tab.id, { action: 'toggle_non_stop', state: isChecked }).catch(() => {});
                }
            });
        });
    });
});

// Permissão Microfone
navigator.permissions.query({name: 'microphone'}).then((result) => {
    if (result.state === 'granted') {
        btnGrantMic.classList.add('hidden');
        permStatus.classList.remove('hidden');
    }
});

btnGrantMic.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); 
        btnGrantMic.classList.add('hidden');
        permStatus.classList.remove('hidden');
    } catch (err) { }
});

// Lógica de Visualização (Olho)
btnToggleEye.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        eyeClosed.classList.add('hidden');
        eyeOpen.classList.remove('hidden');
    } else {
        apiKeyInput.type = 'password';
        eyeClosed.classList.remove('hidden');
        eyeOpen.classList.add('hidden');
    }
});

// Máquina de Estados da API Key
function setApiState(state) {
    btnEditApi.classList.add('hidden');
    btnSaveApi.classList.add('hidden');
    btnCancelApi.classList.add('hidden');

    if (state === 'no_key') {
        apiKeyInput.readOnly = false;
        apiKeyInput.value = '';
        btnSaveApi.classList.remove('hidden');
    } else if (state === 'has_key') {
        apiKeyInput.readOnly = true;
        btnEditApi.classList.remove('hidden');
    } else if (state === 'editing') {
        apiKeyInput.readOnly = false;
        btnSaveApi.classList.remove('hidden');
        btnCancelApi.classList.remove('hidden');
    }
}

btnEditApi.addEventListener('click', () => setApiState('editing'));

btnCancelApi.addEventListener('click', () => {
    apiKeyInput.value = savedApiKey;
    setApiState('has_key');
});

btnSaveApi.addEventListener('click', () => {
    const newKey = apiKeyInput.value.trim();
    chrome.storage.local.set({ geminiApiKey: newKey }, () => {
        savedApiKey = newKey;
        setApiState(newKey ? 'has_key' : 'no_key');
        
        apiStatus.classList.remove('hidden');
        setTimeout(() => apiStatus.classList.add('hidden'), 3000);
    });
});