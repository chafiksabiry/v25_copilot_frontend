import api from '../config/api';
import { Call, CallMetrics } from '../types';

export interface CallFilters {
  status?: string;
  outcome?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CallResponse {
  calls: Call[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCalls: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class CallService {
  static async getCalls(filters: CallFilters = {}): Promise<CallResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return api.get(`/calls?${params.toString()}`);
  }

  static async getCallById(id: string): Promise<Call> {
    return api.get(`/calls/${id}`);
  }

  static async startCall(callData: {
    contactId: string;
    callType: 'inbound' | 'outbound' | 'scheduled';
    methodology?: string;
  }): Promise<Call> {
    return api.post('/calls', callData);
  }

  static async endCall(id: string, outcome?: string, notes?: string): Promise<{ call: Call; insights: any }> {
    return api.put(`/calls/${id}/end`, { outcome, notes });
  }

  static async updateCallMetrics(id: string, metrics: Partial<CallMetrics>): Promise<Call> {
    return api.put(`/calls/${id}/metrics`, metrics);
  }

  static async updateCallPhase(id: string, phase: string): Promise<{ call: Call; recommendations: any[] }> {
    return api.put(`/calls/${id}/phase`, { phase });
  }

  static async getCallTranscripts(id: string) {
    return api.get(`/calls/${id}/transcripts`);
  }

  static async addRecommendation(id: string, recommendation: any) {
    return api.post(`/calls/${id}/recommendations`, recommendation);
  }

  static async getCallsAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    agentId?: string;
  } = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return api.get(`/calls/analytics/summary?${params.toString()}`);
  }
}

export const getPersonalityAnalysis = async (transcription: string, context?: any[], callDuration?: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/personality-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription,
        context,
        callDuration
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting personality analysis:', error);
    throw error;
  }
};