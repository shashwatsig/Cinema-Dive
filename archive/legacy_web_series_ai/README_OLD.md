# Web Series Insight Platform

Web Series Insight is a full-stack application that provides AI-powered insights into web series reviews. The platform automatically loads 50+ series, processes reviews with NLP, generates insights about why people like/dislike series, and features an intelligent **Audience Intelligence Assistant** powered by Retrieval Augmented Generation (RAG).

## Features

### Audience Intelligence Assistant (RAG Chatbot)
- **Natural Language Interface**: Ask questions in plain English about series audience sentiment
- **Review-Based Answers**: All responses grounded in stored review data and NLP analysis
- **Vector Search**: ChromaDB-powered semantic search across 1000+ review chunks
- **Multi-Series Comparison**: Compare audience preferences across multiple series
- **Confidence Scoring**: Every answer includes confidence metric based on data quality
- **Source Citations**: Full traceability - see which reviews support each answer
- **Conversation Memory**: Maintains chat history with previous questions
- **Rate Limited**: 20 requests/minute per authenticated user
- **Production Ready**: Caching, error handling, and performance optimized

Example Questions:
- "Why is Panchayat so popular?"
- "What do people dislike about Mirzapur?"
- "Compare Panchayat and Gullak"
- "Which emotions dominate Sacred Games reviews?"
- "Who watches Family Man?"
- "Why is Gullak recommended after Panchayat?"

### Automatic Data Loading System
- Automatically fetches 50+ trending series from TMDB on server startup
- Loads 30-50 reviews per series (1,500-2,500 total reviews)
- Zero setup required - works out of the box with `npm start`
- Fallback to sample data if TMDB API is unavailable

### Comprehensive NLP Processing
- Sentiment Analysis: Classifies reviews as positive/negative/neutral
- Topic Extraction: Identifies discussion topics (plot, acting, pacing, etc.)
- Emotion Detection: Maps emotional content (excitement, curiosity, sadness, etc.)
- Keyword Recognition: Extracts important terms from reviews
- 100% of reviews analyzed for insights

### AI-Generated Insights
- Why People Like It: Data-driven reasons for positive reception
- Why People Dislike It: Common criticisms identified
- Content DNA: Determines pacing, complexity, emotional depth, narrative style
- Audience Profile: Identifies who watches and engagement level
- Emotional Journey: Tracks emotional experience across reviews

### Rating Management
- Individual 1-5 star ratings stored per review
- Rating distribution across all categories
- Automatic rating aggregation and averages
- Sentiment breakdown metrics

### Precomputed Metrics
- Sentiment breakdown by intensity levels
- Top topics and emotions extracted
- Average sentiment scores
- Engagement metrics (review length, topic diversity)
- All metrics updated on data load

### Management Tools
- REST API: 6 endpoints for data operations and monitoring
- CLI Utility: batchLoad.js for batch operations
- Real-time status monitoring
- Comprehensive statistics and reporting

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Create `.env` file in `backend/`:
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
TMDB_API_KEY=your_tmdb_api_key
PORT=5000
```

### 3. Start Server
```bash
npm start
```

The system automatically:
- Loads 50 trending series
- Processes 1,800+ reviews
- Calculates all metrics
- Generates AI insights
- Stores everything in MongoDB

Monitor the console for completion (2-5 minutes).

### 4. Verify Installation
```bash
curl http://localhost:5000/api/admin/status
```

## REST API Endpoints

### Admin Operations
- GET /api/admin/status - Database status and statistics
- POST /api/admin/load-data - Trigger series loading
- POST /api/admin/reprocess-insights - Regenerate insights
- GET /api/admin/series-details - Top series information
- GET /api/admin/performance-metrics - Query performance data
- POST /api/admin/clear-database - Clear all data

### Data Access
- GET /api/series/trending - Trending series
- GET /api/series/:id/details - Series with insights
- GET /api/series/:id/recommendations - Similar series
- GET /api/insights/series/:id - Series insights only

### Authentication
- POST /api/auth/register - User registration
- POST /api/auth/login - User login

### Chat & RAG (Audience Intelligence)
- POST /api/chat - Ask questions about series (requires auth)
- GET /api/chat/history - Get chat history (requires auth)
- GET /api/chat/sessions - Get chat sessions (requires auth)
- GET /api/chat/stats - Get user statistics (requires auth)
- POST /api/chat/feedback - Save feedback on responses (requires auth)

## CLI Commands

### View Statistics
```bash
node backend/batchLoad.js stats
```

### Load More Data
```bash
node backend/batchLoad.js load 100
```

### Reprocess Insights
```bash
node backend/batchLoad.js process-insights
```

### Optimize Database
```bash
node backend/batchLoad.js optimize-db
```

### Cleanup Old Reviews
```bash
node backend/batchLoad.js cleanup-old 30
```

## Database Structure

### Per Series:
- Title, description, genres, year
- TMDB metadata (posters, popularity, status)
- Cast and directors
- 30-50 reviews with ratings, text, sentiment scores, topics, and emotions
- Precomputed metrics (sentiment breakdown, top topics, engagement metrics)
- Rating statistics and distribution
- AI-generated insights (why liked/disliked, themes, content DNA, audience profile)

### Precomputed Metrics Stored:
- Sentiment breakdown (high positive, positive, neutral, negative, high negative)
- Top topics across all reviews
- Top emotions across all reviews
- Average sentiment score
- Engagement metrics (avg review length, topic diversity)

### Total Database Contents:
- 48-50 series fully loaded
- 1,500-2,500 reviews with full NLP analysis
- All metrics precomputed and indexed
- ~50-100 MB storage

## Technology Stack

### Backend
- Node.js and Express.js
- MongoDB with Mongoose
- Natural language processing: Natural, Compromise, Sentiment
- TMDB Movie Database API
- JWT authentication with bcrypt

### Data Processing
- Sentiment analysis using Sentiment package
- Topic extraction with Natural Language Processing
- Emotion detection through keyword mapping
- Metrics calculation and storage

## File Structure

```
backend/
├── services/
│   ├── dataLoaderService.js - Data loading and NLP orchestration
│   ├── nlpService.js - Sentiment and topic analysis
│   ├── aiInsightService.js - Insight generation
│   └── tmdbService.js - TMDB API integration
├── routes/
│   ├── admin.js - Management endpoints
│   ├── series.js - Series data routes
│   ├── insights.js - Insights routes
│   └── auth.js - Authentication
├── models/
│   ├── Series.js - Series schema with metrics
│   └── User.js - User model
├── data/
│   └── seedData.js - Database seeding
├── batchLoad.js - CLI utility
├── server.js - Express server
└── package.json

frontend/
├── src/
│   ├── components/ - UI components
│   ├── pages/ - Page components
│   ├── services/ - API services
│   └── App.jsx - Main application
└── package.json

docs/
├── QUICK_START.md - 5-minute setup guide
├── DATA_LOADING_GUIDE.md - Complete reference
└── IMPLEMENTATION_SUMMARY.md - Implementation details
```

## Notes

- All reviews are stored with full NLP analysis performed at load time
- Metrics are precomputed during data loading for optimal performance
- Database indexes ensure efficient querying
- The system uses batch processing to handle large datasets efficiently
- TMDB API requests are rate-limited to prevent throttling

- **1,500-2,500 Reviews** processed
- **100% NLP Analysis** complete
- **Performance Optimized** with indexes
- **~50-100 MB** total size

---

**Last Updated**: April 2024  
**Documentation Version**: 2.0  
**Status**: Production Ready
