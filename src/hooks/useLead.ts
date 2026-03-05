import { useState, useEffect } from 'react';
import axios from 'axios';

// Local interfaces for the API response
export interface ApiLead {
  _id: string;
  name?: string;
  Email_1?: string;
  email?: string;
  Phone?: string;
  phone?: string;
  companyId?: string;
  Activity_Tag?: string;
  Last_Activity_Time?: string;
  Stage?: string;
  Pipeline?: string;
  [key: string]: any;
}

export interface LeadApiResponse {
  success: boolean;
  data: ApiLead;
  error?: string;
}

interface UseLeadResult {
  lead: ApiLead | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useLead = (leadId: string | null): UseLeadResult => {
  const [lead, setLead] = useState<ApiLead | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = async (id: string) => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      // Use VITE_DASH_COMPANY_BACKEND consistently with the main app
      let apiUrl = import.meta.env.VITE_DASH_COMPANY_BACKEND || import.meta.env.VITE_DASH_COMPANY_API_URL;

      // Fallback if env is missing
      if (!apiUrl) {
        apiUrl = 'https://harxv25dashboardfrontend.netlify.app/api';
        console.warn('API URL environment variable is not defined, using production fallback');
      }

      // Normalize URL: ensure it includes /api if pointing to the netlify dashboard
      if (apiUrl.includes('harxv25dashboardfrontend.netlify.app') && !apiUrl.includes('/api')) {
        apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;
        console.log('Normalized Netlify API URL:', apiUrl);
      }

      const response = await axios.get<LeadApiResponse>(`${apiUrl}/leads/${id}`);

      if (response.data.success) {
        setLead(response.data.data);
      } else {
        throw new Error('Failed to fetch lead data');
      }
    } catch (err: any) {
      console.error('Error fetching lead:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch lead');
      setLead(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    if (leadId) {
      fetchLead(leadId);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLead(leadId);
    }
  }, [leadId]);

  return {
    lead,
    loading,
    error,
    refetch
  };
};