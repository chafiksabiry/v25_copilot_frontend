import axios from 'axios';

export interface PhoneNumberResponse {
  hasNumber: boolean;
  number?: {
    phoneNumber: string;
    provider: 'twilio' | 'telnyx';
    status: string;
    features: {
      voice: boolean;
      [key: string]: boolean;
    };
  };
  message?: string;
}

export interface VoiceConfigResponse {
  success?: boolean;
  error?: string;
  message: string;
  data?: {
    phoneNumber: string;
    features: {
      voice: boolean;
      [key: string]: boolean;
    };
    status: string;
  };
  currentStatus?: string;
}

export class PhoneNumberService {
  // Utiliser VITE_COMP_ORCH_API si disponible, sinon VITE_API_URL_CALL, sinon VITE_GIGS_API
  // En mode standalone, utiliser localhost pour le développement local
  private static getBaseUrl(): string {
    const runMode = import.meta.env.VITE_RUN_MODE;
    const isStandalone = typeof window !== 'undefined' && !(window as any).__POWERED_BY_QIANKUN__;
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    // Debug logging
    console.log('🔍 [getBaseUrl] Environment check:', {
      VITE_API_URL_CALL: import.meta.env.VITE_API_URL_CALL,
      VITE_RUN_MODE: runMode,
      isStandalone,
      isDev,
      DEV: import.meta.env.DEV,
      MODE: import.meta.env.MODE
    });
    
    // Si VITE_API_URL_CALL est défini explicitement, l'utiliser tel quel (sans /api)
    if (import.meta.env.VITE_API_URL_CALL) {
      const baseUrl = import.meta.env.VITE_API_URL_CALL;
      console.log('🔍 [getBaseUrl] Using VITE_API_URL_CALL:', baseUrl);
      // Retourner l'URL de base sans /api, on l'ajoutera lors de la construction de l'URL complète
      return baseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    }
    
    // En mode standalone ou développement, utiliser localhost
    if ((runMode === 'standalone' || isStandalone) && isDev) {
      console.log('🔍 [Standalone dev mode] Using localhost:5006');
      return 'http://localhost:5006';
    }
    
    // En mode standalone production, utiliser api-dash-calls.harx.ai
    if (runMode === 'standalone' || isStandalone) {
      console.log('🔍 [Standalone mode] Using api-dash-calls.harx.ai');
      return 'https://api-dash-calls.harx.ai';
    }
    
    // En mode in-app, utiliser les URLs de production ou localhost (sans /api)
    const fallbackUrl = import.meta.env.VITE_COMP_ORCH_API || import.meta.env.VITE_GIGS_API || 'http://localhost:5006';
    return fallbackUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }
  
  // baseUrl sera recalculé dynamiquement via getBaseUrl()

  static async checkGigPhoneNumber(gigId: string): Promise<PhoneNumberResponse> {
    try {
      // Recalculer l'URL de base à chaque appel pour prendre en compte les changements
      const baseUrl = this.getBaseUrl();
      
      if (!baseUrl) {
        console.error('❌ No API URL environment variable is set');
        console.error('Available env vars:', {
          VITE_COMP_ORCH_API: import.meta.env.VITE_COMP_ORCH_API,
          VITE_API_URL_CALL: import.meta.env.VITE_API_URL_CALL,
          VITE_GIGS_API: import.meta.env.VITE_GIGS_API,
          VITE_RUN_MODE: import.meta.env.VITE_RUN_MODE
        });
        throw new Error('API URL is not configured');
      }
      
      console.log('🔍 Using API base URL:', baseUrl);

      // Construire l'URL complète - toujours ajouter /api avant le chemin
      // Nettoyer baseUrl pour éviter les doubles slashes
      const cleanBaseUrl = baseUrl.replace(/\/+$/, ''); // Enlever les slashes à la fin
      const url = `${cleanBaseUrl}/api/phone-numbers/gig/${gigId}/check`;
      console.log('🔍 Checking gig phone number at:', url);

      const response = await axios.get<PhoneNumberResponse>(url);
      console.log('✅ Phone number check response:', response.data);
      
      return response.data;
    } catch (error: any) {
      if (error?.response) {
        console.error('❌ API Error checking gig phone number:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      console.error('❌ Error checking gig phone number:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  static async configureVoiceFeature(phoneNumber: string): Promise<VoiceConfigResponse> {
    try {
      // Recalculer l'URL de base à chaque appel
      const baseUrl = this.getBaseUrl();
      
      if (!baseUrl) {
        console.error('❌ API URL is not configured');
        throw new Error('API URL is not configured');
      }

      console.log('📞 Configuring voice feature for number:', phoneNumber);
      // Construire l'URL complète - toujours ajouter /api avant le chemin
      // Nettoyer baseUrl pour éviter les doubles slashes
      const cleanBaseUrl = baseUrl.replace(/\/+$/, ''); // Enlever les slashes à la fin
      const url = `${cleanBaseUrl}/api/phone-numbers/${phoneNumber}/configure-voice`;
      console.log('🔧 Configuring voice at:', url);
      
      const response = await axios.post<VoiceConfigResponse>(url);
      console.log('✅ Voice feature configuration response:', response.data);
      return response.data;
    } catch (error: any) {
      if (error?.response) {
        console.error('❌ API Error configuring voice feature:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      console.error('❌ Error configuring voice feature:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }
}
