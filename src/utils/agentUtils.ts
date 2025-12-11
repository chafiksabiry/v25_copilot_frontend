export const getAgentIdFromStorage = (): string => {
  const runMode = import.meta.env.VITE_RUN_MODE;
  const defaultAgentId = '68b5b12701557c476f728ea4'; // AgentId par défaut (même que gigId pour standalone)
  
  if (runMode === 'in-app') {
    try {
      const profileData = localStorage.getItem('profileData');
      if (profileData) {
        const parsed = JSON.parse(profileData);
        const agentId = parsed?._id;
        if (agentId) {
          return agentId;
        }
      }
    } catch (error) {
      console.error('Error getting agent ID from localStorage:', error);
    }
  }
  
  // En mode standalone ou si aucun agentId trouvé, utiliser le defaultAgentId
  console.log('✅ Using default agentId for', runMode || 'standalone', 'mode:', defaultAgentId);
  return defaultAgentId;
};
