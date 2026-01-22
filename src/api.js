// Configurazione API URL migliorata
const getApiUrl = () => {
    // 1. Priorità: variabile d'ambiente
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // 2. Fallback basato sull'ambiente
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // Sviluppo locale
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return "http://localhost:5678";
        }

        // Produzione su Vercel
        if (hostname.includes('vercel.app')) {
            return `${window.location.origin}/api`;
        }
    }

    // 3. Fallback finale
    return "https://splitplan-ai.vercel.app/api";
};

const API_URL = getApiUrl();

console.log("🔗 API URL:", API_URL);

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
};

const getAuthHeadersMultipart = () => {
    const token = localStorage.getItem("token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
};

// Gestione errori migliorata
const handleResponse = async (response) => {
    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
            // Se non riesce a parsare il JSON, usa il messaggio di default
        }
        throw new Error(errorMessage);
    }
    return response.json();
};

// --- Trips ---

export const createTrip = async (tripData) => {
    const response = await fetch(`${API_URL}/trips/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(tripData),
    });
    return handleResponse(response);
};

export const getTrip = async (id) => {
    try {
        const response = await fetch(`${API_URL}/trips/${id}`, {
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem(`cached_trip_${id}`);
        }

        const data = await handleResponse(response);
        localStorage.setItem(`cached_trip_${id}`, JSON.stringify(data));
        return data;
    } catch (error) {
        // Don't use cache if it was an authentication/authorization error
        if (error.message.includes("401") || error.message.includes("403") || error.message.includes("Not authenticated")) {
            throw error;
        }
        console.warn("Using cached trip data due to error:", error);
        const cached = localStorage.getItem(`cached_trip_${id}`);
        if (cached) return JSON.parse(cached);
        throw error;
    }
};

export const generateProposals = async (tripId, preferences) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/generate-proposals`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(preferences)
    });
    return handleResponse(response);
};

export const voteProposal = async (proposalId, userId, score) => {
    const response = await fetch(`${API_URL}/trips/vote/${proposalId}?user_id=${userId}&score=${score}`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const simulateVotes = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/simulate-votes`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getItinerary = async (tripId) => {
    try {
        const response = await fetch(`${API_URL}/trips/${tripId}/itinerary`, {
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem(`cached_itinerary_${tripId}`);
        }

        const data = await handleResponse(response);
        localStorage.setItem(`cached_itinerary_${tripId}`, JSON.stringify(data));
        return data;
    } catch (error) {
        // Don't use cache if it was an authentication/authorization error
        if (error.message.includes("401") || error.message.includes("403") || error.message.includes("Not authenticated")) {
            throw error;
        }
        console.warn("Using cached itinerary data due to error:", error);
        const cached = localStorage.getItem(`cached_itinerary_${tripId}`);
        if (cached) return JSON.parse(cached);
        throw error;
    }
};

export const optimizeItinerary = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/optimize`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getParticipants = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/participants`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const confirmHotel = async (tripId, hotelData) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/confirm-hotel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(hotelData),
    });
    return handleResponse(response);
};

export const chatWithAI = async (tripId, message, history = []) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/chat`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, history }),
    });
    return handleResponse(response);
};

export const estimateBudget = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/estimate-budget`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const updateTrip = async (tripId, updates) => {
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
    });
    return handleResponse(response);
};

export const generateShareLink = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/share`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getSharedTrip = async (token) => {
    const response = await fetch(`${API_URL}/trips/share/${token}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });
    return handleResponse(response);
};

// --- Expenses ---

export const addExpense = async (expenseData) => {
    const response = await fetch(`${API_URL}/expenses/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
    });
    return handleResponse(response);
};

export const getExpenses = async (tripId) => {
    const response = await fetch(`${API_URL}/expenses/${tripId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getBalances = async (tripId) => {
    const response = await fetch(`${API_URL}/expenses/${tripId}/balances`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// --- Photos ---

export const uploadPhoto = async (tripId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/trips/${tripId}/photos`, {
        method: "POST",
        headers: getAuthHeadersMultipart(),
        body: formData
    });
    return handleResponse(response);
};

export const getPhotos = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/photos`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const deletePhoto = async (photoId) => {
    const response = await fetch(`${API_URL}/trips/photos/${photoId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// --- Auth & Users ---

export const register = async (userData) => {
    const response = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
};

export const login = async (credentials) => {
    const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
};

export const verifyEmail = async (token) => {
    const response = await fetch(`${API_URL}/users/verify-email?token=${token}`);
    return handleResponse(response);
};

export const toggleSubscription = async (email) => {
    const response = await fetch(`${API_URL}/users/toggle-subscription`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
    });
    return handleResponse(response);
};

export const forgotPassword = async (email) => {
    const response = await fetch(`${API_URL}/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    return handleResponse(response);
};

export const resetPassword = async (token, new_password) => {
    const response = await fetch(`${API_URL}/users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password }),
    });
    return handleResponse(response);
};

export const validateResetToken = async (token) => {
    const response = await fetch(`${API_URL}/users/validate-reset-token?token=${token}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    return handleResponse(response);
};

