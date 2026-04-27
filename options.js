const dict = {
    'pt-br': {
        'options_title': 'Configurações Studio Pro',
        'lang_settings': 'Idioma / Language',
        'lang_desc': 'Escolha o idioma principal para toda a interface do Studio Pro. Esta configuração altera menus, avisos e as instruções da Inteligência Artificial em tempo real, garantindo uma experiência personalizada e fluida em sua língua preferida.',
        'nonstop_desc': 'O motor Non-Stop elimina interrupções irritantes no YouTube e YouTube Music. Ele simula atividade de forma inteligente e invisível, impedindo que o player pause sozinho por inatividade, permitindo que sua música nunca pare.',
        'step1_desc': 'Para que nosso motor de áudio de alta fidelidade e a IA Gemini funcionem, é necessário captar o fluxo de áudio da aba. Esta permissão é técnica e segura: o Studio Pro processa o som localmente para aplicar os equalizadores em tempo real.',
        'btn_grant_mic': 'Liberar Acesso',
        'perm_success': 'Acesso Liberado',
        'api_settings': 'Chave API (Gemini)',
        'api_desc': 'A Inteligência Artificial avançada requer uma chave do Google Gemini. Ao configurar sua API Key, você desbloqueia o processamento de masterização em nuvem, permitindo ajustes dinâmicos e precisos baseados em linguagem natural.',
        'btn_save': 'Salvar Chave',
        'btn_edit': 'Editar',
        'btn_cancel': 'Cancelar',
        'saved_success': 'Salvo com sucesso!',
        'ads_title': 'Apoie o Projeto',
        'ads_desc': 'O Studio Pro é um projeto independente. Todos os anúncios exibidos são links de nossos afiliados; ao realizar compras através deles, você gera uma comissão que financia nossos servidores e o desenvolvimento, mantendo o projeto gratuito.',
        'feedback_title': 'Relatar Problema',
        'feedback_desc': 'Encontrou um erro ou tem uma ideia brilhante? Sua participação é o que faz o Studio Pro evoluir. Use nossos canais oficiais para relatar problemas técnicos ou sugerir melhorias que você gostaria de ver nas próximas versões.',
        'contact_title': 'Contato e Parcerias',
        'contact_desc': 'Estamos abertos a propostas comerciais, parcerias de desenvolvimento ou suporte técnico especializado. Se você é um criador de conteúdo ou empresa, entre em contato diretamente com nosso time para colaborações profissionais.'
    },
    'en': {
        'options_title': 'Studio Pro Settings',
        'lang_settings': 'Language / Idioma',
        'lang_desc': 'Choose the primary language for the entire Studio Pro interface. This setting changes menus, warnings, and AI instructions in real-time, ensuring a personalized and fluid experience in your preferred language.',
        'nonstop_desc': 'The Non-Stop engine eliminates annoying interruptions on YouTube and YouTube Music. It intelligently and invisibly simulates activity, preventing the player from pausing on its own due to inactivity, so your music never stops.',
        'step1_desc': 'For our high-fidelity audio engine and Gemini AI to function, it is necessary to capture the tab\'s audio stream. This permission is technical and secure: Studio Pro processes the sound locally to apply equalizers in real-time.',
        'btn_grant_mic': 'Grant Access',
        'perm_success': 'Access Granted',
        'api_settings': 'API Key (Gemini)',
        'api_desc': 'Advanced Artificial Intelligence requires a Google Gemini key. By setting up your API Key, you unlock cloud mastering processing, allowing for dynamic and precise adjustments based on natural language commands.',
        'btn_save': 'Save Key',
        'btn_edit': 'Edit',
        'btn_cancel': 'Cancel',
        'saved_success': 'Saved successfully!',
        'ads_title': 'Support the Project',
        'ads_desc': 'Studio Pro is an independent project. All ads displayed are affiliate links; by making purchases through them, you generate a commission that funds our servers and development, keeping the project 100% free for everyone.',
        'feedback_title': 'Report an Issue',
        'feedback_desc': 'Found a bug or have a brilliant idea? Your participation is what makes Studio Pro evolve. Use our official channels to report technical issues or suggest improvements you\'d like to see in future versions.',
        'contact_title': 'Contact & Partnerships',
        'contact_desc': 'We are open to commercial proposals, development partnerships, or specialized technical support. If you are a content creator or company, contact our team directly for professional collaborations.'
    }
}

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

// Tutorial Modal Logic
const btnTutorialApi = document.getElementById('btn-tutorial-api');
const tutorialOverlay = document.getElementById('tutorial-overlay');
const btnCloseTutorial = document.getElementById('btn-close-tutorial');
const tutorialModeSwitch = document.getElementById('tutorial-mode-switch');
const mainWrapper = document.getElementById('main-wrapper');

if (tutorialModeSwitch) {
    tutorialModeSwitch.addEventListener('change', (e) => {
        if (e.target.checked) {
            mainWrapper.classList.add('tutorial-active');
        } else {
            mainWrapper.classList.remove('tutorial-active');
        }
    });
}

if (btnTutorialApi && tutorialOverlay) {
    // Dynamic Versioning
    const versionDisplay = document.getElementById('app-version-display');
    if (versionDisplay) {
        versionDisplay.textContent = 'v' + chrome.runtime.getManifest().version;
    }

    btnTutorialApi.addEventListener('click', () => {
        tutorialOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    btnCloseTutorial.addEventListener('click', () => {
        tutorialOverlay.style.display = 'none';
        document.body.style.overflow = '';
    });

    tutorialOverlay.addEventListener('click', (e) => {
        if (e.target === tutorialOverlay) {
            tutorialOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}