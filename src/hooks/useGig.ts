import { useState, useEffect } from 'react';
import axios from 'axios';

export interface Gig {
    _id: string;
    title: string;
    description?: string;
    category?: string;
    status?: string;
    [key: string]: any;
}

export interface GigApiResponse {
    success: boolean;
    data: Gig;
    error?: string;
}

export const useGig = (gigId: string | null) => {
    const [gig, setGig] = useState<Gig | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGig = async () => {
            if (!gigId) return;

            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('token');
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                let apiUrl = import.meta.env.VITE_API_URL_CALL ||
                    import.meta.env.VITE_DASH_COMPANY_BACKEND ||
                    'https://v25dashcallsbackend.netlify.app/api';

                if (!apiUrl.includes('/api')) {
                    apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;
                }

                const response = await axios.get<GigApiResponse>(`${apiUrl}/gigs/${gigId}`, { headers });

                if (response.data.success) {
                    setGig(response.data.data);
                } else {
                    setError('Gig not found');
                }
            } catch (err: any) {
                console.error('Error fetching gig:', err);
                setError(err.response?.data?.error || err.message || 'Failed to fetch gig');
            } finally {
                setLoading(false);
            }
        };

        fetchGig();
    }, [gigId]);

    return { gig, loading, error };
};
