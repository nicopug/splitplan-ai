# SplitPlan - AI-Powered Trip Planner

SplitPlan is a comprehensive full-stack web application designed to simplify group trip planning, itinerary optimization, and expense sharing. It features an AI-driven proposal system, interactive chat for travel adjustments, and real-time map integration.

## Architecture Overview

### Frontend
- **Framework:** React 19 with Vite
- **Styling:** Tailwind CSS 4.0
- **Routing:** React Router 7
- **Maps:** Leaflet & React-Leaflet (OpenStreetMap)
- **State Management:** React Context API (Modal, Theme, Toast)
- **Features:** PWA support, Offline mode (local caching), Responsive Design.

### Backend
- **Framework:** FastAPI
- **ORM:** SQLModel (SQLAlchemy + Pydantic)
- **Database:** PostgreSQL (hosted on Supabase)
- **AI Integration:** Google GenAI SDK (Gemini 2.5 Flash) for proposals, budget estimation, and itinerary chat.
- **Auth:** Supabase Auth with JWT (python-jose, passlib).
- **Geodata:** Nominatim (OSM) for geocoding and Overpass API for POI discovery.
- **Deployment:** Optimized for Vercel with a `/api` root path.

## Project Structure

```
C:\Users\domen\Desktop\splitplan - Alessio Ufficiale - Copia\
├── backend/                # FastAPI application
│   ├── main.py             # Entry point & app configuration
│   ├── database.py         # SQLModel engine and session management
│   ├── models.py           # Database schemas (SQLModel)
│   ├── auth.py             # JWT & Authentication logic
│   └── routers/            # Domain-specific API endpoints
│       ├── trips.py        # Core logic: AI proposals, voting, itinerary
│       ├── expenses.py     # Expense tracking & balance calculation
│       ├── itinerary.py    # Itinerary management
│       ├── users.py        # User profiles & auth endpoints
│       └── photos.py       # Photo upload & gallery
├── src/                    # React frontend source
│   ├── api.js              # Centralized API communication layer
│   ├── App.jsx             # Main routing & layout
│   ├── components/         # Reusable UI components
│   ├── pages/              # View components (Dashboard, Auth, etc.)
│   └── context/            # Global state providers
└── public/                 # Static assets and PWA icons
```

## Setup and Development

### Prerequisites
- Node.js & npm
- Python 3.9+
- PostgreSQL database (Supabase recommended)
- Google Gemini API Key

### Backend Setup
1. Navigate to the root directory.
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Create a `.env` file in the root with:
   ```env
   DATABASE_URL=your_postgresql_url
   GOOGLE_API_KEY=your_gemini_key
   SECRET_KEY=your_auth_secret
   # Add other Supabase/Email variables as needed
   ```
4. Run the server:
   ```bash
   uvicorn backend.main:app --reload --port 5678
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Development Conventions

- **API Layer:** All frontend requests must go through `src/api.js`. It handles dynamic URL resolution (local vs. production) and includes JWT tokens automatically.
- **Database Models:** Use `SQLModel` in `backend/models.py` for both database table definitions and API data validation.
- **AI Prompts:** AI logic is centralized in `backend/routers/trips.py`. When modifying prompts, ensure the response format is strictly JSON as per the existing instructions.
- **Styling:** Adhere to the design system tokens defined in `src/index.css` and use Tailwind CSS for layout and components.
- **PWA:** Managed via `vite-plugin-pwa`. Assets are in `public/`.

## Key Features Logic

- **Consensus Voting:** Users vote on AI proposals. Once all participants have voted (or a threshold is met), the trip status changes to `BOOKED` and an itinerary is generated.
- **Itinerary Optimization:** Uses a "Nearest Neighbor" approach in `trips.py` to order activities based on geographical coordinates.
- **Expense Sharing:** Calculates balances between participants based on added expenses, facilitating "who owes whom" logic.
- **AI Chat:** The `SplitPlan Assistant` can perform `ADD` or `DELETE` actions on the itinerary based on natural language requests.
