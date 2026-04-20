document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Lógica do Tema (Dark Mode) ---
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

    // --- 2. Lógica do Microfone ---
    const micIndicator = document.getElementById('mic-indicator');
    const micStatusText = document.getElementById('mic-status-text');
    const btnReqMic = document.getElementById('btn-req-mic');

    function updateMicUI(state) {
        if (state === 'granted') {
            micIndicator.textContent = '✔️';
            micStatusText.textContent = 'Acesso Liberado';
            micStatusText.style.color = '#10b981'; // Verde bonito
            btnReqMic.classList.add('hidden'); // Esconde o botão se já tem acesso
        } else {
            micIndicator.textContent = '❌';
            micStatusText.textContent = 'Acesso Bloqueado';
            micStatusText.style.color = '#ef4444'; // Vermelho de aviso
            btnReqMic.classList.remove('hidden');
        }
    }

    // Verifica a permissão atual ao carregar a página
    navigator.permissions.query({name: 'microphone'}).then((result) => {
        updateMicUI(result.state);
        // Ouve mudanças na permissão em tempo real
        result.onchange = () => {
            updateMicUI(result.state);
        };
    });

    // Pede acesso ao microfone ao clicar
    btnReqMic.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Fecha o stream imediatamente, pois só queríamos a permissão
            stream.getTracks().forEach(track => track.stop()); 
            updateMicUI('granted');
        } catch (err) {
            alert("Não foi possível acessar o microfone. Por favor, verifique se o navegador está a bloquear o acesso na barra de endereço (ícone de cadeado/câmera).");
        }
    });

    // --- 3. Lógica da API Gemini ---
    const apiKeyInput = document.getElementById('api-key-input');
    const toggleVisibilityBtn = document.getElementById('toggle-visibility');
    const btnEdit = document.getElementById('btn-edit');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSave = document.getElementById('btn-save');
    const statusMsg = document.getElementById('status-msg');
    const viewModeBtns = document.getElementById('view-mode-btns');
    const editModeBtns = document.getElementById('edit-mode-btns');

    let savedKey = '';

    chrome.storage.local.get(['geminiApiKey'], (res) => {
        if (res.geminiApiKey && res.geminiApiKey.trim() !== '') {
            savedKey = res.geminiApiKey; apiKeyInput.value = savedKey; setMode('view');
        } else { setMode('edit'); }
    });

    function setMode(mode) {
        if (mode === 'view') {
            apiKeyInput.disabled = true; apiKeyInput.type = 'password'; toggleVisibilityBtn.textContent = '👁️';
            viewModeBtns.classList.remove('hidden'); editModeBtns.classList.add('hidden');
        } else {
            apiKeyInput.disabled = false; apiKeyInput.type = 'text'; toggleVisibilityBtn.textContent = '🙈';
            apiKeyInput.focus(); viewModeBtns.classList.add('hidden'); editModeBtns.classList.remove('hidden');
        }
    }

    toggleVisibilityBtn.addEventListener('click', () => {
        if (apiKeyInput.disabled) {
            if (apiKeyInput.type === 'password') { apiKeyInput.type = 'text'; toggleVisibilityBtn.textContent = '🙈'; } 
            else { apiKeyInput.type = 'password'; toggleVisibilityBtn.textContent = '👁️'; }
        }
    });

    btnEdit.addEventListener('click', () => { setMode('edit'); });

    btnCancel.addEventListener('click', () => {
        apiKeyInput.value = savedKey; 
        if (savedKey) { setMode('view'); } else { apiKeyInput.value = ''; }
        statusMsg.classList.add('hidden');
    });

    btnSave.addEventListener('click', () => {
        const newKey = apiKeyInput.value.trim();
        chrome.storage.local.set({ geminiApiKey: newKey }, () => {
            savedKey = newKey;
            if (newKey === '') { showStatus('Chave removida. A IA foi desativada.', '#ef4444'); } 
            else { showStatus('Chave API guardada com sucesso! A IA está pronta.', 'var(--text-main)'); setMode('view'); }
        });
    });

    function showStatus(text, color) {
        statusMsg.textContent = text; statusMsg.style.color = color; statusMsg.classList.remove('hidden');
        setTimeout(() => { statusMsg.classList.add('hidden'); }, 3500);
    }
});