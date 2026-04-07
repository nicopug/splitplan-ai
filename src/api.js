import { toast } from 'sonner';

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
            return "http://localhost:8000";
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
export { API_URL };

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
        let errorMessage = `Richiesta fallita con status ${response.status}`;
        let errorData = {};

        try {
            errorData = await response.json();
            if (Array.isArray(errorData.detail)) {
                errorMessage = errorData.detail.map(e => e.msg || 'Errore di validazione').join(', ');
            } else {
                errorMessage = errorData.detail || errorData.message || errorMessage;
            }
            if (typeof errorMessage !== 'string') {
                errorMessage = JSON.stringify(errorMessage);
            }
        } catch (e) { }

        // Trigger notifiche toast globali basate sullo status
        if (response.status === 401) {
            toast.error("Sessione scaduta o non valida. Effettua nuovamente il login.");
        } else if (response.status === 403) {
            toast.warning("Questa è una funzione premium. Effettua l'upgrade per sbloccarla.");
        } else if (response.status === 429) {
            toast.error("Hai raggiunto il limite giornaliero per l'AI. Riprova domani o passa a Pro!");
        } else if (response.status >= 500) {
            toast.error("Problema al server. Stiamo lavorando per risolverlo.");
        } else {
            toast.error(errorMessage);
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
        if (error.message.includes("401") || error.message.includes("403") || error.message.includes("Not authenticated")) {
            throw error;
        }
        console.warn("Using cached trip data due to error:", error);
        const cached = localStorage.getItem(`cached_trip_${id}`);
        if (cached) return JSON.parse(cached);
        throw error;
    }
};

export const getProposals = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/proposals`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
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
        if (error.message.includes("401") || error.message.includes("403") || error.message.includes("Not authenticated")) {
            throw error;
        }
        console.warn("Using cached itinerary data due to error:", error);
        const cached = localStorage.getItem(`cached_itinerary_${tripId}`);
        if (cached) return JSON.parse(cached);
        throw error;
    }
};

export const getRouteGeometry = async (tripId) => {
    try {
        const response = await fetch(`${API_URL}/trips/${tripId}/route-geometry`, {
            headers: getAuthHeaders()
        });
        return handleAdminResponse(response); // silent — no global toast on failure
    } catch {
        return { polyline: null };
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

export const extractReceiptData = async (file, type) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const response = await fetch(`${API_URL}/trips/extract-receipt`, {
        method: "POST",
        headers: getAuthHeadersMultipart(),
        body: formData
    });
    return handleResponse(response);
};

export const uploadReceipt = async (tripId, file) => {
    // Uses a silent handler (no global toast) so ReceiptScanner can show
    // context-specific messages for 413 (too large) and 422 (OCR failure).
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/expenses/${tripId}/upload-receipt`, {
        method: 'POST',
        // NOTE: Do NOT set Content-Type — browser must set it with the correct
        //       multipart boundary for FormData to work.
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
    });
    if (!response.ok) {
        let detail = `Errore ${response.status}`;
        try {
            const d = await response.json();
            detail = (typeof d.detail === 'string') ? d.detail : JSON.stringify(d.detail);
        } catch {}
        const err = new Error(detail);
        err.status = response.status;
        throw err;
    }
    return response.json();
};

export const resetHotel = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/reset-hotel`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
};

export const chatWithAI = async (tripId, message, history = []) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, history })
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

export const estimateSurveyBudget = async (data) => {
    const response = await fetch(`${API_URL}/trips/estimate-survey-budget`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    return handleResponse(response);
};

export const searchTripOptions = async (tripId, type) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/search-options`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ type })
    });
    return handleResponse(response);
};

export const searchRealFlights = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/search-flights`, {
        method: "GET",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const confirmTripOption = async (tripId, optionData) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/confirm-option`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(optionData)
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

export const joinTrip = async (token) => {
    const response = await fetch(`${API_URL}/trips/join/${token}`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const exportCompanyExpensesCSV = async (companyId, month = null) => {
    const params = month ? `?month=${month}` : '';
    const response = await fetch(`${API_URL}/companies/${companyId}/expenses/export${params}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Errore export CSV');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpeseSplitPlan_${companyId}${month ? '_' + month : ''}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const exportNotaSpese = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/export-nota-spese`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        let errorMessage = "Errore durante la generazione della Nota Spese";
        try { const d = await response.json(); errorMessage = d.detail || errorMessage; } catch {}
        throw new Error(errorMessage);
    }
    const blob = await response.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `NotaSpese_SplitPlan_${tripId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const exportTripPDF = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/export-pdf`, {
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        let errorMessage = "Errore durante l'esportazione del PDF";
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SplitPlan_Viaggio_${tripId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const getUserTrips = async () => {
    const response = await fetch(`${API_URL}/trips/my-trips`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const hideTrip = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/hide`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const completeTrip = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/complete`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getUserStats = async () => {
    const response = await fetch(`${API_URL}/trips/stats`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const createCheckout = async (productType) => {
    const response = await fetch(`${API_URL}/payments/create-checkout`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ product_type: productType })
    });
    const data = await handleResponse(response);
    // Redirect a Stripe Checkout
    window.location.href = data.url;
};

export const verifyCheckoutSession = async (sessionId) => {
    const response = await fetch(`${API_URL}/payments/verify-session?session_id=${sessionId}`, {
        headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    // Aggiorna utente locale con i dati aggiornati
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && data) {
        if (data.credits !== undefined) user.credits = data.credits;
        if (data.is_subscribed !== undefined) user.is_subscribed = data.is_subscribed;
        if (data.subscription_plan !== undefined) user.subscription_plan = data.subscription_plan;
        if (data.subscription_expiry !== undefined) user.subscription_expiry = data.subscription_expiry;
        localStorage.setItem('user', JSON.stringify(user));
    }
    return data;
};

export const createPortalSession = async () => {
    const response = await fetch(`${API_URL}/payments/portal`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    window.location.href = data.url;
};

export const unlockTrip = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/unlock`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    // Aggiorna credits nell'utente locale
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        user.credits = data.credits;
        localStorage.setItem('user', JSON.stringify(user));
    }
    return data;
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

export const deleteExpense = async (expenseId) => {
    const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const migrateExpenses = async () => {
    const response = await fetch(`${API_URL}/expenses/migrate-schema`, {
        method: "POST",
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
    // userData must include name, surname, email, password, terms_accepted, privacy_accepted
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

export const toggleSubscription = async (plan = null) => {
    const response = await fetch(`${API_URL}/users/toggle-subscription`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan }),
    });
    return handleResponse(response);
};

export const cancelSubscription = async () => {
    const response = await fetch(`${API_URL}/users/cancel-subscription`, {
        method: "POST",
        headers: getAuthHeaders(),
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

export const exchangeCalendarToken = async (code, state) => {
    const response = await fetch(`${API_URL}/calendar/exchange-token`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            code,
            state,
            redirect_uri: window.location.origin + "/calendar-callback"
        }),
    });
    return handleResponse(response);
};
export const updateLanguage = async (language) => {
    const response = await fetch(`${API_URL}/users/update-language`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ language })
    });
    const data = await handleResponse(response);
    // Aggiorna lingua nell'utente locale
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        user.language = data.language;
        localStorage.setItem('user', JSON.stringify(user));
    }
    return data;
};

export const getEvents = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/events`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// --- Delete ---

export const deleteAccount = async () => {
    const response = await fetch(`${API_URL}/users/delete-account`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const deleteTrip = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// --- Manager / Business Overview ---

export const getBusinessOverview = async () => {
    const response = await fetch(`${API_URL}/trips/business-overview`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const approveTrip = async (tripId) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/approve`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const rejectTrip = async (tripId, rejectionReason = null) => {
    const response = await fetch(`${API_URL}/trips/${tripId}/reject`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
    return handleResponse(response);
};

export const getUnreadCount = async () => {
    const response = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getNotifications = async () => {
    const response = await fetch(`${API_URL}/notifications`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const markNotificationRead = async (notificationId) => {
    const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const markAllNotificationsRead = async () => {
    const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: "POST",
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getInviteToken = async () => {
    const response = await fetch(`${API_URL}/companies/invite-token`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const joinCompany = async (token) => {
    const response = await fetch(`${API_URL}/companies/join`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ token })
    });
    return handleResponse(response);
};

export const bulkInviteMembers = async (companyId, emails) => {
    const response = await fetch(`${API_URL}/companies/${companyId}/invite-bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ emails })
    });
    return handleResponse(response);
};

// --- Admin ---
// Usa un handler silente: nessun toast globale (la UI admin gestisce i propri errori)

const adminHeaders = (adminToken) => ({
    "Content-Type": "application/json",
    "X-Admin-Token": adminToken,
});

const handleAdminResponse = async (response) => {
    if (!response.ok) {
        let errorMessage = `Errore ${response.status}`;
        try {
            const data = await response.json();
            errorMessage = data.detail || data.message || errorMessage;
            if (typeof errorMessage !== 'string') errorMessage = JSON.stringify(errorMessage);
        } catch (_) {}
        throw new Error(errorMessage);
    }
    return response.json();
};

export const adminVerifyToken = async (adminToken) => {
    const response = await fetch(`${API_URL}/admin/verify-token`, {
        headers: adminHeaders(adminToken),
    });
    return handleAdminResponse(response);
};

export const adminGetStats = async (adminToken) => {
    const response = await fetch(`${API_URL}/admin/stats`, {
        headers: adminHeaders(adminToken),
    });
    return handleAdminResponse(response);
};

export const adminGetLeads = async (adminToken) => {
    const response = await fetch(`${API_URL}/admin/leads`, {
        headers: adminHeaders(adminToken),
    });
    return handleAdminResponse(response);
};

export const adminApproveB2B = async (adminToken, body) => {
    const response = await fetch(`${API_URL}/admin/approve-b2b`, {
        method: "POST",
        headers: adminHeaders(adminToken),
        body: JSON.stringify(body),
    });
    return handleAdminResponse(response);
};

// --- Leads ---

export const submitDemoRequest = async (leadData) => {
    const response = await fetch(`${API_URL}/leads/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData)
    });
    return handleResponse(response);
};