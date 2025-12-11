import { useState, useEffect, useCallback } from 'react';

export interface DestinationZoneState {
  zone: string | null;
  loading: boolean;
  error: string | null;
}

// Fonction pour récupérer le gigId selon l'environnement
const getGigId = (): string | null => {
  const runMode = import.meta.env.VITE_RUN_MODE;
  const defaultGigId = '68b5b12701557c476f728ea4'; // GigId par défaut
  
  if (runMode === 'standalone') {
    // En mode sandbox (équivalent développement), utiliser le gigId par défaut
    return defaultGigId;
  } else if (runMode === 'in-app') {
    // En mode in-app (équivalent production), récupérer depuis les cookies
    const cookies = document.cookie.split(';');
    let gigIdCookie = cookies.find(cookie => cookie.trim().startsWith('currentGigId='));
    if (!gigIdCookie) {
      gigIdCookie = cookies.find(cookie => cookie.trim().startsWith('gigId='));
    }
    if (gigIdCookie) {
      const gigId = gigIdCookie.split('=')[1]?.trim();
      if (gigId) {
        return gigId;
      }
    }
    // Si aucun cookie trouvé, utiliser le gigId par défaut
    return defaultGigId;
  } else {
    // Fallback: si VITE_RUN_MODE n'est pas défini, utiliser l'ancienne logique NODE_ENV
    if (process.env.NODE_ENV === 'development') {
      return defaultGigId;
    } else {
      const cookies = document.cookie.split(';');
      const gigIdCookie = cookies.find(cookie => cookie.trim().startsWith('gigId='));
      if (gigIdCookie) {
        const gigId = gigIdCookie.split('=')[1]?.trim();
        if (gigId) {
          return gigId;
        }
      }
      return defaultGigId;
    }
  }
};

export const useDestinationZone = (gigId?: string) => {
  const [state, setState] = useState<DestinationZoneState>({
    zone: null,
    loading: false,
    error: null
  });

  // Déterminer le gigId à utiliser
  const effectiveGigId = gigId || getGigId();

  const fetchDestinationZone = useCallback(async () => {
    if (!effectiveGigId) {
      console.error('Gig ID not found');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/${effectiveGigId}/destination-zone`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🌍 Destination zone data:', data);
      
      if (data.data && data.data.code) {
        setState(prev => ({ 
          ...prev, 
          zone: data.data.code, 
          loading: false 
        }));
        console.log('🌍 Destination zone set:', data.data.code);
      } else {
        throw new Error('Invalid response format: missing data.code');
      }
    } catch (error) {
      console.error('Error fetching destination zone:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch destination zone',
        loading: false 
      }));
    }
  }, [effectiveGigId]);

  // Récupérer automatiquement la zone de destination quand effectiveGigId change
  useEffect(() => {
    if (effectiveGigId) {
      fetchDestinationZone();
    }
  }, [effectiveGigId, fetchDestinationZone]);

  return {
    ...state,
    fetchDestinationZone,
    gigId: effectiveGigId // Exposer le gigId effectif utilisé
  };
}; 