export const getAgentIdFromStorage = (): string => {
  const runMode = import.meta.env.VITE_RUN_MODE;
  const isStandalone = typeof window !== 'undefined' && !(window as any).__POWERED_BY_QIANKUN__;
  
  // En mode standalone ou sandbox, utiliser le gigId comme agentId
  if (runMode === 'sandbox' || runMode === 'standalone' || isStandalone) {
    // Récupérer le gigId depuis les cookies
    const cookies = document.cookie.split(';');
    const gigIdCookie = cookies.find(cookie => cookie.trim().startsWith('currentGigId='));
    if (gigIdCookie) {
      const gigId = gigIdCookie.split('=')[1];
      if (gigId) {
        return gigId; // Utiliser le gigId comme agentId en mode standalone
      }
    }
    // Fallback: utiliser un ID fixe pour les tests
    return '68b5b12701557c476f728ea4'; // GigId fixe pour sandbox/standalone
  }
  
  if (runMode === 'in-app') {
    try {
      const profileData = localStorage.getItem('profileData');
      if (profileData) {
        const parsed = JSON.parse(profileData);
        return parsed?._id || 'unknown-agent';
      }
    } catch (error) {
      console.error('Error getting agent ID from localStorage:', error);
    }
  }
  return 'unknown-agent'; // Fallback par défaut
};
