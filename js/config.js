// js/config.js - Configurações para GitHub/Vercel
const CONFIG = {
    // URLs das APIs (agora são arquivos .js na pasta /api/)
    API_BASE_URL: '', // Deixe vazio para usar caminhos relativos
    ENDPOINTS: {
        pix: '/api/bluepag-pix',
        checkPayment: '/api/check-payment',
        checkConfirmed: '/api/check-payment',
        provider: 'bluepag'
    },
    
    // Configurações do site
    SITE_NAME: 'Sorte Grande',
    PIX_EXPIRATION_HOURS: 24,
    

};

// Exportar para uso global
window.CONFIG = CONFIG;
console.log('✅ Configurações carregadas');
