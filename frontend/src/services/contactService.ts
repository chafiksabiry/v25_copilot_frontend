import api from '../config/api';
import { Contact, Lead } from '../types';

export interface ContactFilters {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactResponse {
  contacts: Contact[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalContacts: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ContactService {
  static async getContacts(filters: ContactFilters = {}): Promise<ContactResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return api.get(`/contacts?${params.toString()}`);
  }

  static async getContactById(id: string): Promise<Contact> {
    return api.get(`/contacts/${id}`);
  }

  static async createContact(contactData: Partial<Contact>): Promise<Contact> {
    return api.post('/contacts', contactData);
  }

  static async updateContact(id: string, updateData: Partial<Contact>): Promise<Contact> {
    return api.put(`/contacts/${id}`, updateData);
  }

  static async deleteContact(id: string): Promise<void> {
    return api.delete(`/contacts/${id}`);
  }

  static async getContactCalls(id: string, page = 1, limit = 10) {
    return api.get(`/contacts/${id}/calls?page=${page}&limit=${limit}`);
  }

  static async addContactNote(id: string, note: string): Promise<Contact> {
    return api.post(`/contacts/${id}/notes`, { note });
  }

  static async updateContactStatus(id: string, status: string): Promise<Contact> {
    return api.put(`/contacts/${id}/status`, { status });
  }

  static async searchContacts(query: string, limit = 10): Promise<Contact[]> {
    return api.get(`/contacts/search/${encodeURIComponent(query)}?limit=${limit}`);
  }
}