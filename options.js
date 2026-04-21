const dict = {
    'pt-br': {
        'options_title': 'Configurações - Audio AI Studio Pro',
        'lang_settings': 'Idioma / Language',
        'lang_desc': 'Selecione o idioma da interface (Aplica-se ao App e às Opções).',
        'perm_settings': 'Permissões (Microfone)',
        'step1_desc': 'Necessário para ler o áudio das abas, os dispositivos do PC e os comandos de Voz.',
        'btn_grant_mic': 'Liberar Acesso',
        'perm_success': 'Acesso Liberado! ✔️',
        'api_settings': 'Chave API (Gemini)',
        'api_desc': 'Insira sua chave de API do Google Gemini para ativar a Inteligência Artificial.',
        'btn_save': 'Salvar Chave',
        'saved_success': 'Salvo com sucesso!'
    },
    'en': {
        'options_title': 'Settings - Audio AI Studio Pro',
        'lang_settings': 'Language / Idioma',
        'lang_desc': 'Select the interface language (Applies to the App and Options).',
        'perm_settings': 'Permissions (Microphone)',
        'step1_desc': 'Required to read audio from tabs, PC devices, and Voice commands.',
        'btn_grant_mic': 'Grant Access',
        'perm_success': 'Access Granted! ✔️',
        'api_settings': 'API Key (Gemini)',
        'api_desc': 'Enter your Google Gemini API key to enable Artificial Intelligence features.',
        'btn_save': 'Save Key',
        'saved_success': 'Saved successfully!'
    }
};

let currentLang = 'pt-br';

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[currentLang] && dict[currentLang][key]) {
            if (el.tagName === 'INPUT' && el.type === 'button') {
                el.value = dict[currentLang][key];
            } else {
                el.textContent = dict[currentLang][key];
            }
        }
    });
}

const langSelect = document.getElementById('lang-select');
const btnGrantMic = document.getElementById('btn-grant-mic');
const permStatus = document.getElementById('perm-status');
const apiKeyInput = document.getElementById('api-key-input');
const btnSaveApi = document.getElementById('btn-save-api');
const apiStatus = document.getElementById('api-status');
const themeToggle = document.getElementById('theme-toggle');

// Lógica de Tema Escuro/Claro
chrome.storage.local.get(['theme'], (res) => {
    if (res.theme === 'dark') document.body.classList.add('dark-mode');
});
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    chrome.storage.local.set({ theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light' });
});

// Carregar Estado Inicial (Idioma e Chave API)
chrome.storage.local.get(['language', 'geminiApiKey'], (res) => {
    if (res.language) {
        currentLang = res.language;
        langSelect.value = currentLang;
    }
    applyTranslations(); // Aplica imediatamente ao carregar a página

    if (res.geminiApiKey) {
        apiKeyInput.value = res.geminiApiKey;
    }
});

// Evento de Mudança de Idioma (Salva para o Popup ler depois)
langSelect.addEventListener('change', (e) => {
    currentLang = e.target.value;
    chrome.storage.local.set({ language: currentLang }, () => {
        applyTranslations();
    });
});

// Verificação Automática de Permissão do Microfone
navigator.permissions.query({name: 'microphone'}).then((result) => {
    if (result.state === 'granted') {
        btnGrantMic.classList.add('hidden');
        permStatus.classList.remove('hidden');
    }
});

// Pedir Permissão
btnGrantMic.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); 
        btnGrantMic.classList.add('hidden');
        permStatus.classList.remove('hidden');
    } catch (err) {
        alert(currentLang === 'pt-br' ? "Permissão negada pelas configurações do navegador." : "Permission denied by browser settings.");
    }
});

// Salvar API Key
btnSaveApi.addEventListener('click', () => {
    const newKey = apiKeyInput.value.trim();
    chrome.storage.local.set({ geminiApiKey: newKey }, () => {
        apiStatus.classList.remove('hidden');
        setTimeout(() => apiStatus.classList.add('hidden'), 3000);
    });
});