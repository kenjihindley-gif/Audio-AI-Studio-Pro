// --- Sincronização de Tema ---
chrome.storage.local.get(['theme'], (res) => {
    if (res.theme === 'dark') document.body.classList.add('dark-mode');
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.theme) {
        if (changes.theme.newValue === 'dark') document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    }
});

const urlParams = new URLSearchParams(window.location.search);
const targetTabId = parseInt(urlParams.get('tabId'));

const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-domain');
const playPausePath = document.getElementById('play-pause-path');
const playOverlay = document.getElementById('play-overlay');
const volumeSlider = document.getElementById('volume-slider');
const timeSlider = document.getElementById('time-slider');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const trackArt = document.getElementById('track-art');
const thumbnailIcon = document.getElementById('thumbnail-icon');
const btnLike = document.getElementById('btn-like');
const likePath = document.getElementById('like-path');

// Sleep Timer & Mute Elements
const btnSleepToggle = document.getElementById('btn-sleep-toggle');
const sleepMenu = document.getElementById('sleep-menu');
const checkCloseTab = document.getElementById('check-close-tab');
const checkCloseWin = document.getElementById('check-close-win');
const sleepTimerDisplay = document.getElementById('sleep-timer-display');
const btnCancelSleep = document.getElementById('btn-cancel-sleep');
const btnMute = document.getElementById('btn-mute');

let isLiked = false;
let isUserSlidingVolume = false;
let isUserSlidingTime = false;
let sleepTimeout = null;
let fadeInterval = null;
let countdownInterval = null;
let activeSleepBtn = null;
let lastVolume = 1;
let volumeLockTimer = null;

const PATH_PLAY = "M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z";
const PATH_PAUSE = "M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z";
const PATH_HEART_EMPTY = "m8 2.748l-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z";
const PATH_HEART_FILLED = "M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z";

const SVG_VOL_ON = `<path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/><path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>`;
const SVG_VOL_OFF = `<path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/><line x1="1" y1="1" x2="15" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`;

if (targetTabId) {
    chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: ['content.js'] }).then(() => {
        updateMediaStatus(); setInterval(updateMediaStatus, 1000);
    }).catch(() => { trackTitle.textContent = "Erro de conexão"; });
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateLikeIcon() {
    if (isLiked) {
        likePath.setAttribute('d', PATH_HEART_FILLED);
        btnLike.classList.add('active');
    } else {
        likePath.setAttribute('d', PATH_HEART_EMPTY);
        btnLike.classList.remove('active');
    }
}

function updateMediaStatus() {
    chrome.tabs.sendMessage(targetTabId, { action: 'get_media_info' }, (response) => {
        if (chrome.runtime.lastError || !response) return; 
        trackTitle.textContent = response.title || 'Desconhecido';
        trackArtist.textContent = response.artist || 'Desconhecido';
        if (response.artwork) { trackArt.src = response.artwork; trackArt.style.display = 'block'; thumbnailIcon.style.display = 'none'; }
        
        if (response.isPlaying) { playPausePath.setAttribute('d', PATH_PAUSE); playOverlay.classList.remove('active'); }
        else { playPausePath.setAttribute('d', PATH_PLAY); playOverlay.classList.add('active'); }
        
        if (!isUserSlidingVolume && !volumeLockTimer) {
            volumeSlider.value = response.volume;
            btnMute.innerHTML = response.volume <= 0.01 ? SVG_VOL_OFF : SVG_VOL_ON;
        }
        
        if (!isUserSlidingTime && response.duration > 0) {
            timeCurrent.textContent = formatTime(response.currentTime);
            timeTotal.textContent = formatTime(response.duration);
            timeSlider.max = response.duration; timeSlider.value = response.currentTime;
        }

        if (response.isLiked !== undefined && isLiked !== response.isLiked) {
            isLiked = response.isLiked;
            updateLikeIcon();
        }
    });
}

// --- Funções de Reprodução e Like ---
document.getElementById('btn-play-pause').addEventListener('click', () => chrome.tabs.sendMessage(targetTabId, { action: 'toggle_play' }));
document.getElementById('btn-next').addEventListener('click', () => chrome.tabs.sendMessage(targetTabId, { action: 'next' }));
document.getElementById('btn-prev').addEventListener('click', () => chrome.tabs.sendMessage(targetTabId, { action: 'prev' }));

document.getElementById('btn-minus-10').addEventListener('click', () => {
    chrome.scripting.executeScript({
        target: { tabId: targetTabId }, world: "MAIN",
        func: () => {
            const yt = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            if (yt && typeof yt.seekBy === 'function') yt.seekBy(-10);
            else { const m = document.querySelector('video, audio'); if(m) m.currentTime = Math.max(0, m.currentTime - 10); }
        }
    });
});

document.getElementById('btn-plus-10').addEventListener('click', () => {
    chrome.scripting.executeScript({
        target: { tabId: targetTabId }, world: "MAIN",
        func: () => {
            const yt = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            if (yt && typeof yt.seekBy === 'function') yt.seekBy(10);
            else { const m = document.querySelector('video, audio'); if(m) m.currentTime = Math.min(m.duration, m.currentTime + 10); }
        }
    });
});

document.getElementById('btn-like').addEventListener('click', () => {
    chrome.scripting.executeScript({
        target: { tabId: targetTabId }, world: "MAIN",
        func: () => {
            const selectors = [
                'ytmusic-like-button-renderer #button-shape-like button', 
                'ytmusic-like-button-renderer .like', 
                'like-button-view-model button', 
                'ytd-menu-renderer ytd-toggle-button-renderer:nth-child(1) button' 
            ];
            for (let sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn) {
                    btn.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                    btn.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                    btn.click();
                    break;
                }
            }
        }
    });
    isLiked = !isLiked;
    updateLikeIcon(); 
});

// --- Lógica de Mute e Volume (Força Bruta Otimizada) ---
btnMute.addEventListener('click', () => {
    const currentVol = parseFloat(volumeSlider.value);
    clearTimeout(volumeLockTimer);
    volumeLockTimer = setTimeout(() => volumeLockTimer = null, 800);

    if (currentVol > 0) {
        lastVolume = currentVol;
        applyVolume(0);
    } else {
        applyVolume(lastVolume > 0 ? lastVolume : 1);
    }
});

function applyVolume(v) {
    volumeSlider.value = v;
    btnMute.innerHTML = v <= 0.01 ? SVG_VOL_OFF : SVG_VOL_ON;

    chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        world: "MAIN",
        func: (vol) => {
            const v100 = Math.round(vol * 100);
            
            // 1. Atualiza áudio raiz
            const media = document.querySelector('video, audio');
            if (media) media.volume = vol;
            
            // 2. Atualiza API YT
            const ytPlayer = document.getElementById('movie_player');
            if (ytPlayer && typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(v100);
            
            // 3. Atualiza API YT Music
            const ytMusicApi = document.querySelector('ytmusic-player-bar');
            if (ytMusicApi && ytMusicApi.playerApi && typeof ytMusicApi.playerApi.setVolume === 'function') {
                ytMusicApi.playerApi.setVolume(v100);
            }
            
            // 4. Reflete visualmente no slider do site (se existir) sem emitir eventos conflitantes
            const ytMusicSlider = document.getElementById('volume-slider') || document.querySelector('ytmusic-player-bar paper-slider');
            if (ytMusicSlider) {
                ytMusicSlider.value = v100;
            }
        },
        args: [v]
    });
}

volumeSlider.addEventListener('mousedown', () => isUserSlidingVolume = true);

volumeSlider.addEventListener('mouseup', () => {
    isUserSlidingVolume = false;
    clearTimeout(volumeLockTimer);
    volumeLockTimer = setTimeout(() => volumeLockTimer = null, 800);
});

volumeSlider.addEventListener('input', (e) => {
    clearTimeout(volumeLockTimer);
    volumeLockTimer = setTimeout(() => volumeLockTimer = null, 800);
    applyVolume(parseFloat(e.target.value));
});

timeSlider.addEventListener('mousedown', () => isUserSlidingTime = true);
timeSlider.addEventListener('mouseup', () => {
    isUserSlidingTime = false;
    const t = parseFloat(timeSlider.value);
    chrome.scripting.executeScript({
        target: { tabId: targetTabId }, world: "MAIN",
        func: (val) => {
            const yt = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            if (yt && typeof yt.seekTo === 'function') yt.seekTo(val, true);
            else { const m = document.querySelector('video, audio'); if(m) m.currentTime = val; }
        }, args: [t]
    });
});

// --- Lógica do Sleep Timer ---
btnSleepToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sleepMenu.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!sleepMenu.contains(e.target) && !btnSleepToggle.contains(e.target)) {
        sleepMenu.classList.remove('open');
    }
});

checkCloseTab.addEventListener('change', () => { if(checkCloseTab.checked) checkCloseWin.checked = false; });
checkCloseWin.addEventListener('change', () => { if(checkCloseWin.checked) checkCloseTab.checked = false; });

document.querySelectorAll('.sleep-option-box[data-time]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const minutes = parseInt(btn.getAttribute('data-time'));
        startSleepTimer(minutes, btn);
        sleepMenu.classList.remove('open');
    });
});

btnCancelSleep.addEventListener('click', (e) => { 
    e.stopPropagation();
    cancelSleepTimer(); 
    sleepMenu.classList.remove('open'); 
});

function startSleepTimer(minutes, btnElement) {
    cancelSleepTimer();
    btnSleepToggle.classList.add('active');
    activeSleepBtn = btnElement;
    btnElement.classList.add('active');
    btnElement.textContent = minutes + "m";

    let totalSeconds = minutes * 60;

    countdownInterval = setInterval(() => {
        totalSeconds--;
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        sleepTimerDisplay.textContent = `FECHA EM: ${m}:${s < 10 ? '0' : ''}${s}`;

        if (activeSleepBtn) {
            const displayMin = Math.ceil(totalSeconds / 60);
            activeSleepBtn.textContent = displayMin + "m";
        }

        if (totalSeconds === 30) startFadeOut();

        if (totalSeconds <= 0) {
            clearInterval(countdownInterval);
            executeSleepAction();
        }
    }, 1000);
}

function startFadeOut() {
    let currentVol = parseFloat(volumeSlider.value);
    fadeInterval = setInterval(() => {
        currentVol -= 0.03;
        if (currentVol <= 0) { currentVol = 0; clearInterval(fadeInterval); }
        applyVolume(currentVol);
    }, 1000);
}

function executeSleepAction() {
    let type = null;
    if (checkCloseTab.checked) type = 'tab';
    else if (checkCloseWin.checked) type = 'window';

    if (type) chrome.runtime.sendMessage({ action: 'sleep_timer_close', closeType: type, targetTabId: targetTabId });
    else chrome.tabs.sendMessage(targetTabId, { action: 'toggle_play' }); 
    cancelSleepTimer();
}

function cancelSleepTimer() {
    clearInterval(countdownInterval);
    clearInterval(fadeInterval);
    btnSleepToggle.classList.remove('active');
    sleepTimerDisplay.textContent = "FECHAR A...";
    document.querySelectorAll('.sleep-option-box[data-time]').forEach(b => {
        b.classList.remove('active');
        b.textContent = b.getAttribute('data-time');
    });
    activeSleepBtn = null;
}

document.getElementById('btn-back').addEventListener('click', () => {
    chrome.tabs.update(targetTabId, { active: true });
    chrome.tabs.get(targetTabId, (tab) => { chrome.windows.update(tab.windowId, { focused: true }); window.close(); });
});