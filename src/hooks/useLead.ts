import { useState, useEffect } from 'react';
import axios from 'axios';
import { ApiLead, LeadApiResponse } from '../types';

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
      const apiUrl = import.meta.env.VITE_DASH_COMPANY_API_URL;
      if (!apiUrl) {
        throw new Error('VITE_DASH_COMPANY_API_URL environment variable is not defined');
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