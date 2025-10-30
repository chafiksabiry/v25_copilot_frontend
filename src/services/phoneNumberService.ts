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
  private static baseUrl = import.meta.env.VITE_COMP_ORCH_API;

  static async checkGigPhoneNumber(gigId: string): Promise<PhoneNumberResponse> {
    try {
      if (!this.baseUrl) {
        console.error('❌ VITE_COMP_ORCH_API environment variable is not set');
        throw new Error('API URL is not configured');
      }

      const url = `${this.baseUrl}/phone-numbers/gig/${gigId}/check`;
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
      const response = await axios.post<VoiceConfigResponse>(
        `${this.baseUrl}/phone-numbers/${phoneNumber}/configure-voice`
      );
      return response.data;
    } catch (error) {
      console.error('Error configuring voice feature:', error);
      throw error;
    }
  }

  static async configureVoiceFeature(phoneNumber: string): Promise<VoiceConfigResponse> {
    try {
      console.log('📞 Configuring voice feature for number:', phoneNumber);
      const response = await axios.post<VoiceConfigResponse>(
        `${this.baseUrl}/phone-numbers/${phoneNumber}/configure-voice`
      );
      console.log('✅ Voice feature configuration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error configuring voice feature:', error);
      throw error;
    }
  }
}
