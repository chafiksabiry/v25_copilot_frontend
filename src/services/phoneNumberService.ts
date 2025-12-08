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
  // En mode standalone, forcer localhost même si VITE_API_URL_CALL est défini
  private static getBaseUrl(): string {
    const runMode = import.meta.env.VITE_RUN_MODE;
    const isStandalone = typeof window !== 'undefined' && !(window as any).__POWERED_BY_QIANKUN__;
    
    // En mode standalone, utiliser api-dash-calls.harx.ai/api
    if (runMode === 'standalone' || isStandalone) {
      console.log('🔍 [Standalone mode] Using api-dash-calls.harx.ai/api');
      return 'https://api-dash-calls.harx.ai/api';
    }
    
    // En mode in-app, utiliser les URLs de production
    return import.meta.env.VITE_COMP_ORCH_API || import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_GIGS_API || 'http://localhost:3000';
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

      // Si l'URL contient déjà /api, ne pas ajouter le préfixe
      // Sinon, ajouter /api pour VITE_API_URL_CALL ou localhost
      const hasApiPrefix = baseUrl.includes('/api');
      const apiPrefix = (!hasApiPrefix && (baseUrl === import.meta.env.VITE_API_URL_CALL || baseUrl.startsWith('http://localhost'))) ? '/api' : '';
      const url = `${baseUrl}${apiPrefix}/phone-numbers/gig/${gigId}/check`;
      console.log('🔍 Checking gig phone number at:', url);

      const response = await axios.get<PhoneNumberResponse>(url);
      console.log('✅ Phone number check response:', response.data);
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ API Error checking gig phone number:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      console.error('❌ Error checking gig phone number:', error);
      throw error;
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
      // Si l'URL contient déjà /api, ne pas ajouter le préfixe
      // Sinon, ajouter /api pour VITE_API_URL_CALL ou localhost
      const hasApiPrefix = baseUrl.includes('/api');
      const apiPrefix = (!hasApiPrefix && (baseUrl === import.meta.env.VITE_API_URL_CALL || baseUrl.startsWith('http://localhost'))) ? '/api' : '';
      const url = `${baseUrl}${apiPrefix}/phone-numbers/${phoneNumber}/configure-voice`;
      console.log('🔧 Configuring voice at:', url);
      
      const response = await axios.post<VoiceConfigResponse>(url);
      console.log('✅ Voice feature configuration response:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ API Error configuring voice feature:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      console.error('❌ Error configuring voice feature:', error);
      throw error;
    }
  }
}
