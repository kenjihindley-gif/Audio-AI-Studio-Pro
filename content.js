if (!window.hasAudioAIAgent) {
    window.hasAudioAIAgent = true;

    let nonStopInterval = null;
    let dialogObserver = null;

    function clickSiteButton(selector) {
        const btn = document.querySelector(selector);
        if (btn) { btn.click(); return true; }
        return false;
    }

    function startNonStop() {
        if (nonStopInterval) return;

        dialogObserver = new MutationObserver((mutations) => {
            const confirmDialog = document.querySelector('yt-confirm-dialog-renderer');
            if (confirmDialog && confirmDialog.style.display !== 'none') {
                const confirmBtn = confirmDialog.querySelector('tp-yt-paper-button.yt-spec-button-shape-next--call-to-action, #confirm-button');
                if (confirmBtn) confirmBtn.click();
            }
        });
        dialogObserver.observe(document.body, { childList: true, subtree: true });

        nonStopInterval = setInterval(() => {
            const media = document.querySelector('video, audio');
            if (media && !media.paused && media.duration > 0) {
                requestAnimationFrame(() => {
                    window.scrollBy(0, 1);
                    requestAnimationFrame(() => window.scrollBy(0, -1));
                });
                
                const neutralElement = document.querySelector('#logo') || document.body;
                if (neutralElement && typeof neutralElement.focus === 'function') {
                    const currentFocus = document.activeElement;
                    neutralElement.focus();
                    if (currentFocus && typeof currentFocus.focus === 'function') {
                        currentFocus.focus();
                    }
                }
            }
        }, 600000);
    }

    function stopNonStop() {
        if (nonStopInterval) {
            clearInterval(nonStopInterval);
            nonStopInterval = null;
        }
        if (dialogObserver) {
            dialogObserver.disconnect();
            dialogObserver = null;
        }
    }

    chrome.storage.local.get(['isNonStopOn'], (res) => {
        if (res.isNonStopOn) startNonStop();
    });

    // CORREÇÃO: Forçar Fullscreen Real do Navegador (F11) ao entrar em Fullscreen no Vídeo (Bypass da limitação do TabCapture)
    document.addEventListener('fullscreenchange', () => {
        const isFullscreen = document.fullscreenElement != null;
        chrome.runtime.sendMessage({ 
            action: 'force_window_fullscreen', 
            state: isFullscreen 
        });
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const media = document.querySelector('video, audio');

        if (request.action === 'toggle_non_stop') {
            if (request.state) startNonStop();
            else stopNonStop();
            sendResponse({ status: 'ok' });
        }

        else if (request.action === 'get_media_info') {
            let title = document.title;
            let artist = window.location.hostname.replace('www.', '');
            let isPlaying = false;
            
            // CÓDIGO CHAVE: Leitura exclusiva do HTML5 nativo, ignorando o delay visual dos sites
            let currentVolume = (media && !media.muted) ? media.volume : 0;
            let currentTime = media ? media.currentTime : 0;
            let duration = media ? media.duration : 0;
            let artworkUrl = '';
            let isLiked = false;

            if (media && !media.paused && media.duration > 0) isPlaying = true;

            if (navigator.mediaSession && navigator.mediaSession.metadata) {
                title = navigator.mediaSession.metadata.title || title;
                artist = navigator.mediaSession.metadata.artist || artist;
                if (navigator.mediaSession.metadata.artwork && navigator.mediaSession.metadata.artwork.length > 0) {
                    const arts = navigator.mediaSession.metadata.artwork;
                    artworkUrl = arts[arts.length - 1].src;
                }
            }

            if (!artworkUrl && window.location.hostname.includes('youtube.com')) {
                const ytVideoId = new URLSearchParams(window.location.search).get('v');
                if (ytVideoId) artworkUrl = `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`;
            }

            if (window.location.hostname.includes('youtube.com')) {
                try {
                    const likeSelectors = [
                        'ytmusic-like-button-renderer #button-shape-like button',
                        'ytmusic-like-button-renderer .like',
                        'like-button-view-model button',
                        'ytd-menu-renderer ytd-toggle-button-renderer:nth-child(1) button'
                    ];
                    
                    for (let sel of likeSelectors) {
                        const btn = document.querySelector(sel);
                        if (btn) {
                            isLiked = btn.getAttribute('aria-pressed') === 'true' || btn.classList.contains('style-default-active') || btn.classList.contains('active');
                            break;
                        }
                    }
                } catch(e) {}
            }

            sendResponse({ title, artist, isPlaying, volume: currentVolume, artwork: artworkUrl, currentTime, duration, isLiked });
        }
        
        else if (request.action === 'toggle_play') {
            if (!clickSiteButton('.ytp-play-button') && !clickSiteButton('.ytmusic-player-bar .play-pause-button') && !clickSiteButton('[data-testid="control-button-playpause"]')) {
                if (media) media.paused ? media.play() : media.pause();
            }
            sendResponse({ status: 'ok' });
        }
        
        else if (request.action === 'next') {
            if (!clickSiteButton('.ytp-next-button') && !clickSiteButton('.ytmusic-player-bar .next-button') && !clickSiteButton('[data-testid="control-button-skip-forward"]')) {
                if (media) media.currentTime = Math.min(media.currentTime + 10, media.duration); 
            }
            sendResponse({ status: 'ok' });
        }
        
        else if (request.action === 'prev') {
            if (!clickSiteButton('.ytp-prev-button') && !clickSiteButton('.ytmusic-player-bar .previous-button') && !clickSiteButton('[data-testid="control-button-skip-back"]')) {
                if (media) media.currentTime = Math.max(media.currentTime - 10, 0); 
            }
            sendResponse({ status: 'ok' });
        }

        return true; 
    });
}