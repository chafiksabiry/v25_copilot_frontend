import { useCallback } from 'react';
import { TwilioCallService } from '../services/twilioCallService';
import { useUrlParam } from './useUrlParams';

// Fonction pour récupérer le gigId depuis les cookies
// Utilise toujours le gigId du document MongoDB fourni comme valeur par défaut
const getGigIdFromCookie = (): string | null => {
  const runMode = import.meta.env.VITE_RUN_MODE;
  
  // GigId du document MongoDB fourni (gigId.$oid: "68e3dca594628dcffb5f6fa3")
  const defaultGigId = '68b5b12701557c476f728ea4';
  
  if (runMode === 'sandbox') {
    return '686e8ddcf74ddc5ba5d4b493'; // GigId fixe pour sandbox
  } else if (runMode === 'standalone') {
    // Utiliser le gigId du document MongoDB fourni
    return defaultGigId;
  } else if (runMode === 'in-app') {
    const cookies = document.cookie.split(';');
    const gigIdCookie = cookies.find(cookie => cookie.trim().startsWith('currentGigId='));
    return gigIdCookie ? gigIdCookie.split('=')[1] : defaultGigId; // Fallback vers le gigId MongoDB si pas de cookie
  }
  // Fallback par défaut: utiliser le gigId du document MongoDB
  return defaultGigId;
};

// Fonction pour récupérer l'ID de l'agent depuis localStorage
const getAgentIdFromStorage = (): string => {
  const runMode = import.meta.env.VITE_RUN_MODE;
  
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
  return 'unknown-agent'; // Fallback pour sandbox
};

// Fonction pour récupérer l'userId
const getUserId = (): string => {
  const runMode = import.meta.env.VITE_RUN_MODE;
  
  if (runMode === 'sandbox') {
    return "6807abfc2c1ca099fe2b13c5"; // Hardcodé pour sandbox
  } else if (runMode === 'in-app') {
    // En mode in-app, récupérer userId depuis localStorage
    try {
      const profileData = localStorage.getItem('profileData');
      if (profileData) {
        const parsed = JSON.parse(profileData);
        return parsed?.userId || 'unknown-user';
      }
    } catch (error) {
      console.error('Error getting user ID from localStorage:', error);
    }
  }
  return 'unknown-user';
};

export const useCallStorage = () => {
  const leadIdFromUrl = useUrlParam('leadId'); // Récupérer leadId depuis l'URL

  const storeCall = useCallback(async (callSid: string, contactId: string) => {
    if (!callSid) {
      console.warn('Missing callSid for call storage');
      return;
    }

    const runMode = import.meta.env.VITE_RUN_MODE;
    
    // Déterminer les paramètres selon le mode
    let agentId: string;
    let leadId: string;
    let userId: string;
    let gigId: string | null = null;

    if (runMode === 'in-app') {
      // Mode in-app: utiliser les vraies données
      agentId = getAgentIdFromStorage();
      leadId = leadIdFromUrl || contactId; // Utiliser leadId depuis URL, fallback vers contactId
      userId = getUserId();
      gigId = getGigIdFromCookie();
      
      console.log('📊 Call storage (in-app mode):', { 
        callSid, 
        agentId, 
        leadId: leadId, 
        userId, 
        gigId,
        leadIdSource: leadIdFromUrl ? 'URL' : 'fallback'
      });
    } else {
      // Mode sandbox: utiliser l'ancienne logique
      agentId = contactId;
      leadId = contactId;
      userId = getUserId();
      gigId = getGigIdFromCookie();
      
      console.log('📊 Call storage (sandbox mode):', { 
        callSid, 
        agentId, 
        leadId, 
        userId, 
        gigId 
      });
    }

    try {
      await TwilioCallService.storeCallInDB({
        callSid,
        agentId,
        leadId,
        userId,
        gigId: gigId || undefined
      });
    } catch (error) {
      console.error('Failed to store call in database:', error);
    }
  }, [leadIdFromUrl]);

  return { storeCall, getGigIdFromCookie };
}; 