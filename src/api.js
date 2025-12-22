// Use environment variable or fallback to full URL
const API_URL = import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? "http://localhost:5678"
        : "https://splitplan-ai.vercel.app");

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

// --- Trips ---

export const createTrip = async (tripData) => {
    const response = await fetch(`${API_URL}/trips/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(tripData),
    });
    if (!response.ok) throw new Error("Failed to create trip");
    return response.json();
};

export const getTrip = async (id) => {
    const response = await fetch(`${API_URL}/trips/${id}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch trip");
    return response.json();
};

export const generateProposals = async (tripId, preferences) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/generate-proposals`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(preferences)
    });
    if (!response.ok) throw new Error("Failed to generate options");
    return response.json();
};

export const voteProposal = async (proposalId, userId, score) => {
    const response = await fetch(`${API_URL}/trips/vote/${proposalId}?user_id=${userId}&score=${score}`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to vote");
    return response.json();
};

export const simulateVotes = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/simulate-votes`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to simulate votes");
    return response.json();
};

export const getItinerary = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/itinerary`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch itinerary");
    return response.json();
};

export const getParticipants = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/participants`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch participants");
    return response.json();
};

export const confirmHotel = async (tripId, hotelData) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/confirm-hotel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(hotelData),
    });
    if (!response.ok) throw new Error('Failed to confirm hotel');
    return await response.json();
};

export const chatWithAI = async (tripId, message, history = []) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/chat`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, history }),
    });
    if (!response.ok) throw new Error("Errore nella chat AI");
    return response.json();
};

// --- Expenses ---

export const addExpense = async (expenseData) => {
    const response = await fetch(`${API_URL}/expenses/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
    });
    if (!response.ok) throw new Error("Failed to add expense");
    return response.json();
};

export const getExpenses = async (tripId) => {
    const response = await fetch(`${API_URL}/expenses/${tripId}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch expenses");
    return response.json();
};

export const getBalances = async (tripId) => {
    const response = await fetch(`${API_URL}/expenses/${tripId}/balances`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch balances");
    return response.json();
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
    if (!response.ok) throw new Error("Failed to upload photo");
    return response.json();
};

export const getPhotos = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/photos`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch photos");
    return response.json();
};

export const deletePhoto = async (photoId) => {
    const response = await fetch(`${API_URL}/trips/photos/${photoId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to delete photo");
    return response.json();
};

// --- Auth & Users ---

export const register = async (userData) => {
    const response = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const text = await response.text();
        try {
            const error = JSON.parse(text);
            throw new Error(error.detail || "Registration failed");
        } catch (e) {
            console.error("Failed to parse error response:", text);
            if (e instanceof SyntaxError) {
                throw new Error(`Request failed with ${response.status}: ${text.substring(0, 100)}...`);
            }
            throw e;
        }
    }
    return response.json();
};

export const login = async (credentials) => {
    const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Login failed");
    }
    return response.json();
};

export const verifyEmail = async (token) => {
    const response = await fetch(`${API_URL}/users/verify-email?token=${token}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Verification failed");
    }
    return response.json();
};

export const toggleSubscription = async (email) => {
    const response = await fetch(`${API_URL}/users/toggle-subscription`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error("Failed to toggle subscription");
    return response.json();
};