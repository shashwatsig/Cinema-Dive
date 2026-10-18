# Cinema Dive — Movie & TV Discovery Platform

Cinema Dive is a modern, full-stack web application designed for exploring movies, television series, seasons, and episodes with real-time metadata, trailers, user authentication, personal watchlists, and favorites.

---

## Features

- **Trending & Popular**: Real-time trending movies and TV shows powered by TMDB.
- **Top Rated & Discovery**: Filter and discover media by genres, release year, minimum rating, and sorting criteria.
- **Detailed Media Views**:
  - Movie & TV metadata: Synopsis, ratings, release dates, runtime, genres, networks, and production details.
  - Video Trailers (embedded YouTube player).
  - Cast & Crew credits.
  - Season & Episode breakdown for TV shows with episode stills and overviews.
  - Similar & Recommended media carousels.
- **Multi-Search**: Live search bar with debounced autocomplete and a dedicated full-search results page for movies and TV series.
- **User Authentication**: Secure user registration and login with bcrypt password hashing and JWT authentication.
- **Personal Watchlist & Favorites**: Save shows and movies to your custom watchlist and favorites list, backed by MongoDB.

---

## Tech Stack

### Backend
- **Node.js** & **Express.js**
- **MongoDB** with **Mongoose** (User auth, Watchlist, Favorites)
- **TMDB API** (The Movie Database v3/v4)
- **JWT (jsonwebtoken)** & **bcryptjs**
- **Security & Performance**: Helmet CSP, CORS, Compression, Rate Limiting

### Frontend
- **React 19** with **Vite 8**
- **React Router Dom v7**
- **Axios** with automatic auth token injection and retry handlers
- Pure **Vanilla CSS** with dark cinematic styling and responsive layouts

---

## Project Structure

```
cinema-dive/
├── backend/
│   ├── config/
│   │   └── database.js      # MongoDB connection configuration
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── models/
│   │   ├── User.js          # User account schema
│   │   ├── Watchlist.js     # User watchlist schema
│   │   └── Favorite.js      # User favorites schema
│   ├── routes/
│   │   ├── auth.js          # /api/auth (register, login, me)
│   │   ├── movies.js        # /api/movies (trending, popular, top-rated, discover, details)
│   │   ├── tv.js            # /api/tv (trending, popular, top-rated, discover, details, season)
│   │   ├── search.js        # /api/search (multi, movies, tv)
│   │   ├── watchlist.js     # /api/watchlist
│   │   └── favorites.js     # /api/favorites
│   ├── services/
│   │   └── tmdbService.js   # TMDB API client with caching
│   ├── .env.example         # Backend environment template
│   ├── package.json
│   └── server.js            # Express server entrypoint
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # Header, MediaCard
│   │   ├── hooks/           # useAuth context
│   │   ├── pages/           # Home, Movies, TVShows, MovieDetail, TVDetail, SearchPage, Watchlist, Favorites, Login, Register
│   │   ├── services/        # api.js client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js       # Vite dev server with /api proxy
│
├── archive/                 # Preserved legacy / reference code
└── package.json             # Root runner scripts
```

---

## Getting Started

### 1. Environment Configuration

Create or update `backend/.env` with your credentials:

```env
# MongoDB Connection String (Local or MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/cinemadive

# TMDB API Key (Free from https://www.themoviedb.org/settings/api)
TMDB_API_READ_ACCESS_TOKEN=your_tmdb_read_access_token_here
# OR: TMDB_API_KEY=your_v3_api_key_here

# JWT Secret for Auth
JWT_SECRET=your_jwt_random_secret_key_here

# Server Port
PORT=5000

# Allowed CORS Origins
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Node Environment
NODE_ENV=development
```

### 2. Install Dependencies

From root:
```bash
npm run install-all
```

Or individually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Run the Development Servers

**Option A — Two Terminals (Recommended):**
- Terminal 1: `cd backend && npm run dev` (Runs on `http://localhost:5000`)
- Terminal 2: `cd frontend && npm run dev` (Runs on `http://localhost:3000`)

**Option B — Root concurrent command:**
```bash
npm run dev
```

Open your browser at **`http://localhost:3000`**.
