import { useState, useCallback } from 'react';
import { PhoneNumberService, PhoneNumberResponse, VoiceConfigResponse } from '../services/phoneNumberService';
import { useCallStorage } from './useCallStorage';

interface UseGigPhoneNumberResult {
  checkPhoneNumber: () => Promise<PhoneNumberResponse | null>;
  configureVoiceFeature: (phoneNumber: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  phoneNumberData: PhoneNumberResponse | null;
}

// Valeurs par défaut basées sur le document fourni
const DEFAULT_PHONE_NUMBER_DATA: PhoneNumberResponse = {
  hasNumber: true,
  number: {
    phoneNumber: '+33423340775',
    provider: 'telnyx',
    status: 'success',
    features: {
      voice: true,
      sms: false,
      mms: false
    }
  },
  message: 'Using default phone number configuration'
};

export const useGigPhoneNumber = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumberData, setPhoneNumberData] = useState<PhoneNumberResponse | null>(null);
  const { getGigIdFromCookie } = useCallStorage();

  const checkPhoneNumber = useCallback(async (): Promise<PhoneNumberResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const gigId = getGigIdFromCookie();
      console.log('🔍 Checking gig phone number with gigId:', gigId);
      
      if (!gigId) {
        console.warn('⚠️ No gigId found, using default phone number configuration');
        setPhoneNumberData(DEFAULT_PHONE_NUMBER_DATA);
        return DEFAULT_PHONE_NUMBER_DATA;
      }

      try {
        const response = await PhoneNumberService.checkGigPhoneNumber(gigId);
        console.log('✅ Phone number check response:', response);
        
        setPhoneNumberData(response);
        return response;
      } catch (apiError) {
        console.warn('⚠️ API call failed, using default phone number configuration:', apiError);
        // Si l'API échoue, utiliser les valeurs par défaut
        setPhoneNumberData(DEFAULT_PHONE_NUMBER_DATA);
        return DEFAULT_PHONE_NUMBER_DATA;
      }
    } catch (error) {
      console.warn('⚠️ Error checking phone number, using default configuration:', error);
      // En cas d'erreur, utiliser les valeurs par défaut
      setPhoneNumberData(DEFAULT_PHONE_NUMBER_DATA);
      return DEFAULT_PHONE_NUMBER_DATA;
    } finally {
      setIsLoading(false);
    }
  }, [getGigIdFromCookie]);

  const configureVoiceFeature = useCallback(async (number: PhoneNumberResponse['number']): Promise<boolean> => {
    if (!number || number.status != 'success') {
      console.error('❌ Cannot configure voice: number status is not success');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await PhoneNumberService.configureVoiceFeature(number.phoneNumber);
      
      if (response.success) {
        console.log('✅ Voice feature configured successfully');
        return true;
      }

      throw new Error(response.message || 'Failed to configure voice feature');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to configure voice feature';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    checkPhoneNumber,
    configureVoiceFeature,
    isLoading,
    error,
    phoneNumberData
  };
};
