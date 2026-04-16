if (!window.hasAudioAIAgent) {
    window.hasAudioAIAgent = true;

    function clickSiteButton(selector) {
        const btn = document.querySelector(selector);
        if (btn) { btn.click(); return true; }
        return false;
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const media = document.querySelector('video, audio');

        if (request.action === 'get_media_info') {
            let title = document.title;
            let artist = window.location.hostname.replace('www.', '');
            let isPlaying = false;
            
            let currentTime = media ? media.currentTime : 0;
            let duration = media ? media.duration : 0;
            let currentVolume = media ? media.volume : 1;
            let artworkUrl = '';

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

            // LEITURA INTELIGENTE (Contorna a Normalização do YouTube)
            if (window.location.hostname.includes('youtube.com')) {
                try {
                    let foundVolume = false;
                    // 1. Tenta ler o slider do YT Music
                    const ytMusicSlider = document.querySelector('#volume-slider');
                    if (ytMusicSlider && ytMusicSlider.hasAttribute('value')) {
                        currentVolume = parseFloat(ytMusicSlider.getAttribute('value')) / 100;
                        foundVolume = true;
                    } 
                    // 2. Tenta ler o painel do YT Normal
                    if (!foundVolume) {
                        const ytSlider = document.querySelector('.ytp-volume-panel');
                        if (ytSlider && ytSlider.hasAttribute('aria-valuenow')) {
                            currentVolume = parseFloat(ytSlider.getAttribute('aria-valuenow')) / 100;
                            foundVolume = true;
                        }
                    }
                    // 3. Fallback para a memória
                    if (!foundVolume) {
                        const ytVol = window.localStorage.getItem('yt-player-volume');
                        if (ytVol) {
                            const parsed = JSON.parse(ytVol);
                            const volData = JSON.parse(parsed.data);
                            if (volData && typeof volData.volume === 'number') {
                                currentVolume = volData.volume / 100;
                            }
                        }
                    }
                } catch(e) {}
            }

            sendResponse({ title, artist, isPlaying, volume: currentVolume, artwork: artworkUrl, currentTime, duration });
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