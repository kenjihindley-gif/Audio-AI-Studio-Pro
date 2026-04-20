// --- Sincronização de Tema (Neumorfismo Light/Dark) ---
chrome.storage.local.get(['theme'], (res) => {
    if (res.theme === 'dark') document.body.classList.add('dark-mode');
});

// Escuta mudanças em tempo real (Se mudar no Popup, o Mini-Player muda na hora!)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.theme) {
        if (changes.theme.newValue === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
});

// ... (Mantenha todo o resto do seu código original do miniplayer.js abaixo disto) ...

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
let isLiked = false;

let isUserSlidingVolume = false;
let isUserSlidingTime = false;

const PATH_PLAY = "M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z";
const PATH_PAUSE = "M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z";
const PATH_HEART_EMPTY = "m8 2.748l-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z";
const PATH_HEART_FILLED = "M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z";

if (targetTabId) {
    chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        files: ['content.js']
    }).then(() => {
        updateMediaStatus();
        setInterval(updateMediaStatus, 1000);
    }).catch(err => {
        trackTitle.textContent = "Erro ao conectar";
        trackArtist.textContent = "Aba incompatível ou fechada";
    });
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateMediaStatus() {
    chrome.tabs.sendMessage(targetTabId, { action: 'get_media_info' }, (response) => {
        if (chrome.runtime.lastError) return; 

        if (response) {
            trackTitle.textContent = response.title || 'Desconhecido';
            trackArtist.textContent = response.artist || 'Desconhecido';
            
            if (response.artwork) {
                if (trackArt.src !== response.artwork) trackArt.src = response.artwork;
                trackArt.style.display = 'block';
                thumbnailIcon.style.display = 'none';
            } else {
                trackArt.style.display = 'none';
                thumbnailIcon.style.display = 'block';
            }

            if (response.isPlaying) {
                playPausePath.setAttribute('d', PATH_PAUSE);
                playOverlay.classList.remove('active'); 
            } else {
                playPausePath.setAttribute('d', PATH_PLAY);
                playOverlay.classList.add('active'); 
            }

            if (!isUserSlidingVolume && response.volume !== undefined) {
                volumeSlider.value = response.volume;
            }

            if (!isUserSlidingTime && response.currentTime !== undefined && response.duration > 0) {
                timeCurrent.textContent = formatTime(response.currentTime);
                timeTotal.textContent = formatTime(response.duration);
                timeSlider.max = response.duration;
                timeSlider.value = response.currentTime;
            }
        }
    });
}

document.getElementById('btn-play-pause').addEventListener('click', () => {
    chrome.tabs.sendMessage(targetTabId, { action: 'toggle_play' });
    setTimeout(updateMediaStatus, 150); 
});

document.getElementById('btn-next').addEventListener('click', () => {
    chrome.tabs.sendMessage(targetTabId, { action: 'next' });
    setTimeout(updateMediaStatus, 150);
});

document.getElementById('btn-prev').addEventListener('click', () => {
    chrome.tabs.sendMessage(targetTabId, { action: 'prev' });
    setTimeout(updateMediaStatus, 150);
});

document.getElementById('btn-prev-small').addEventListener('click', (e) => {
    e.stopPropagation(); 
    chrome.tabs.sendMessage(targetTabId, { action: 'prev' });
    setTimeout(updateMediaStatus, 150);
});

document.getElementById('btn-next-small').addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.tabs.sendMessage(targetTabId, { action: 'next' });
    setTimeout(updateMediaStatus, 150);
});

// --- COMANDOS AVANÇADOS COM INJEÇÃO NO MAIN WORLD (COMBO 4 GOLPES) ---
volumeSlider.addEventListener('mousedown', () => isUserSlidingVolume = true);
volumeSlider.addEventListener('mouseup', () => isUserSlidingVolume = false);
volumeSlider.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        world: "MAIN",
        func: (v) => {
            const vol100 = Math.round(v * 100);
            
            // 1. Altera o elemento HTML5 diretamente para resposta instantânea
            const media = document.querySelector('video, audio');
            if (media) {
                media.volume = v;
                if (v > 0) media.muted = false;
            }

            // 2. Altera na API do Player (Garante que o YouTube processa a alteração)
            const ytPlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
                ytPlayer.setVolume(vol100);
                if (v > 0 && typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
            }

            // 3. Força a barra visual exclusiva do YouTube Music a mexer!
            const ytMusicSlider = document.getElementById('volume-slider');
            if (ytMusicSlider && typeof ytMusicSlider.value !== 'undefined') {
                ytMusicSlider.value = vol100;
                ytMusicSlider.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // 4. O GOLPE FINAL: Sobrescreve a memória para a próxima música herdar o volume!
            try {
                window.localStorage.setItem('yt-player-volume', JSON.stringify({
                    data: JSON.stringify({ volume: vol100, muted: v === 0 }),
                    expiration: Date.now() + 2592000000,
                    creation: Date.now()
                }));
            } catch(e) {}
        },
        args: [vol]
    });
});

timeSlider.addEventListener('mousedown', () => isUserSlidingTime = true);
timeSlider.addEventListener('mouseup', () => {
    isUserSlidingTime = false;
    const timeVal = parseFloat(timeSlider.value);
    chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        world: "MAIN",
        func: (t) => {
            // Em todas as plataformas do Google o #movie_player controla o tempo com perfeição
            const ytPlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
                ytPlayer.seekTo(t, true);
            } else {
                const media = document.querySelector('video, audio');
                if (media) media.currentTime = t;
            }
        },
        args: [timeVal]
    });
});
timeSlider.addEventListener('input', (e) => {
    timeCurrent.textContent = formatTime(e.target.value);
});

function seekRelative(amount) {
    chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        world: "MAIN",
        func: (amt) => {
            const ytPlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.seekTo === 'function') {
                ytPlayer.seekTo(ytPlayer.getCurrentTime() + amt, true);
            } else {
                const media = document.querySelector('video, audio');
                if (media) media.currentTime = Math.max(0, Math.min(media.currentTime + amt, media.duration));
            }
        },
        args: [amount]
    });
}

document.getElementById('btn-minus-10').addEventListener('click', (e) => {
    e.stopPropagation(); seekRelative(-10); setTimeout(updateMediaStatus, 150);
});

document.getElementById('btn-plus-10').addEventListener('click', (e) => {
    e.stopPropagation(); seekRelative(10); setTimeout(updateMediaStatus, 150);
});

document.getElementById('btn-back').addEventListener('click', () => {
    if (targetTabId) {
        chrome.tabs.update(targetTabId, { active: true });
        chrome.tabs.get(targetTabId, (tab) => {
            chrome.windows.update(tab.windowId, { focused: true });
            window.close(); 
        });
    }
});

btnLike.addEventListener('click', () => {
    isLiked = !isLiked;
    if (isLiked) {
        likePath.setAttribute('d', PATH_HEART_FILLED);
        btnLike.classList.add('active');
    } else {
        likePath.setAttribute('d', PATH_HEART_EMPTY);
        btnLike.classList.remove('active');
    }
    btnLike.style.transform = 'scale(1.3)';
    setTimeout(() => btnLike.style.transform = '', 150);
});