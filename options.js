document.getElementById('btn-request').addEventListener('click', async () => {
    const statusMsg = document.getElementById('status-msg');
    
    try {
        // Pede acesso ao hardware real do microfone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Se o usuário clicar em "Permitir" no alerta do Chrome, cai aqui
        statusMsg.textContent = "✅ Permissão concedida! Você já pode fechar esta aba e usar o microfone no popup.";
        statusMsg.style.color = "var(--success-hover)";
        
        // Fecha o stream imediatamente para não ficar com a luz vermelha ligada à toa
        stream.getTracks().forEach(track => track.stop());
        
    } catch (error) {
        // Se o usuário clicar em "Bloquear"
        statusMsg.textContent = "❌ Permissão negada. Não poderemos usar os comandos de voz.";
        statusMsg.style.color = "var(--danger-hover)";
    }
});