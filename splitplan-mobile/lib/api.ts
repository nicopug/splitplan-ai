import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── API URL Configuration ────────────────────────────────────────
// In development, replace with your PC's local IP address.
// In production, use the Vercel deployment URL.
const API_URL = __DEV__
    ? 'http://192.168.1.166:8000'   // ← CHANGE THIS to your PC's IP
    : 'https://splitplan-ai.vercel.app/api';

console.log('🔗 API URL:', API_URL);

// ─── Auth Headers ─────────────────────────────────────────────────
const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await AsyncStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const getAuthHeadersMultipart = async (): Promise<Record<string, string>> => {
    const token = await AsyncStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Response Handler ─────────────────────────────────────────────
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
    }
    return response.json();
};

// ─── Auth & Users ─────────────────────────────────────────────────
export const register = async (userData: { name: string; surname: string; email: string; password: string }) => {
    const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
};

export const login = async (credentials: { email: string; password: string }) => {
    const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
};

export const forgotPassword = async (email: string) => {
    const response = await fetch(`${API_URL}/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return handleResponse(response);
};

// ─── Trips ────────────────────────────────────────────────────────
export const getUserTrips = async () => {
    const response = await fetch(`${API_URL}/trips/my-trips`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const getTrip = async (id: number) => {
    const response = await fetch(`${API_URL}/trips/${id}`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const createTrip = async (tripData: { name: string; trip_type: string }) => {
    const response = await fetch(`${API_URL}/trips/`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(tripData),
    });
    return handleResponse(response);
};

export const getProposals = async (tripId: number) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/proposals`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const generateProposals = async (tripId: number, preferences: Record<string, any>) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/generate-proposals`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(preferences),
    });
    return handleResponse(response);
};

export const voteProposal = async (proposalId: number, userId: number, score: number) => {
    const response = await fetch(`${API_URL}/trips/vote/${proposalId}?user_id=${userId}&score=${score}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const getItinerary = async (tripId: number) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/itinerary`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const getParticipants = async (tripId: number) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/participants`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const confirmHotel = async (tripId: number, hotelData: Record<string, any>) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/confirm-hotel`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(hotelData),
    });
    return handleResponse(response);
};

export const resetHotel = async (tripId: number) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/reset-hotel`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const chatWithAI = async (tripId: number, message: string, history: any[] = []) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/chat`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ message, history }),
    });
    return handleResponse(response);
};

export const estimateBudget = async (tripId: number) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/estimate-budget`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const updateTrip = async (tripId: number, updates: Record<string, any>) => {
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify(updates),
    });
    return handleResponse(response);
};

export const completeTrip = async (tripId: number) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/complete`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const hideTrip = async (tripId: number) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/hide`, {
        method: 'POST',
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const getUserStats = async () => {
    const response = await fetch(`${API_URL}/trips/stats`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

// ─── Expenses ─────────────────────────────────────────────────────
export const addExpense = async (expenseData: Record<string, any>) => {
    const response = await fetch(`${API_URL}/expenses/`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(expenseData),
    });
    return handleResponse(response);
};

export const getExpenses = async (tripId: number) => {
    const response = await fetch(`${API_URL}/expenses/${tripId}`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const getBalances = async (tripId: number) => {
    const response = await fetch(`${API_URL}/expenses/${tripId}/balances`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const deleteExpense = async (expenseId: number) => {
    const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

// ─── Photos ───────────────────────────────────────────────────────
export const uploadPhoto = async (tripId: number, fileUri: string) => {
    const formData = new FormData();
    // @ts-ignore — React Native FormData accepts {uri, name, type} objects
    formData.append('file', {
        uri: fileUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
    });

    const response = await fetch(`${API_URL}/trips/${tripId}/photos`, {
        method: 'POST',
        headers: await getAuthHeadersMultipart(),
        body: formData,
    });
    return handleResponse(response);
};

export const getPhotos = async (tripId: number) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/photos`, {
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};

export const deletePhoto = async (photoId: number) => {
    const response = await fetch(`${API_URL}/trips/photos/${photoId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
    });
    return handleResponse(response);
};
