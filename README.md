# HARX REPS AI Copilot

A comprehensive AI-powered sales copilot system with clean architecture, real-time features, and advanced analytics.

## Architecture Overview

This project follows a clean architecture pattern with clear separation between frontend and backend:

```
├── backend/                 # Node.js API Server
│   ├── src/
│   │   ├── routes/         # API route definitions
│   │   ├── controllers/    # Request handlers and business logic coordination
│   │   ├── services/       # Business logic and data processing
│   │   ├── models/         # MongoDB data models
│   │   ├── middleware/     # Authentication, validation, error handling
│   │   ├── utils/          # Helper functions and utilities
│   │   └── config/         # Database and app configuration
│   └── package.json
│
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API communication layer
│   │   ├── stores/         # State management (Zustand)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   └── config/         # App configuration
│   └── package.json
│
└── README.md
```

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Express Validator** for input validation

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Query** for server state management
- **Socket.io Client** for real-time features
- **Axios** for HTTP requests

## Features

### Core Functionality
- **Contact Management**: Complete CRM functionality with lead scoring
- **Call Management**: Real-time call handling with REPS methodology
- **AI Recommendations**: Intelligent suggestions during calls
- **Real-time Transcription**: Live speech-to-text with sentiment analysis
- **Performance Analytics**: Comprehensive call metrics and reporting
- **Compliance Monitoring**: Automated compliance checking and alerts

### Detailed Feature Docs

- See `docs/FEATURES_REALTIME_TRdANSCRIPTION_DISC_SCRIPT_CALL_CONTROLS.md` for deep-dive documentation on:
  - Real-time Transcription
  - DISC Lead Profiling
  - Script Prompting & Call Phases (REPS)
  - Agent Call Controls (mute/recording)

### Real-time Features
- Live call transcription
- Real-time audio level monitoring
- Instant AI recommendations
- Live performance metrics
- Multi-user collaboration

### AI Capabilities
- DISC personality analysis
- Transaction intelligence
- Smart warning system
- Automated coaching suggestions
- Sentiment analysis

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/harx_reps_db
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_RUN_MODE=sandbox
# VITE_RUN_MODE options:
# - sandbox: Development mode (uses fixed gigId)
# - in-app: Production mode (uses currentGigId from cookies)
```

5. Start the development server:
```bash
npm run dev
```

### Database Setup

1. Install MongoDB locally or use MongoDB Atlas
2. Create a database named `harx_reps_db`
3. The application will automatically create collections and indexes

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Contact Endpoints
- `GET /api/contacts` - Get contacts with filtering
- `POST /api/contacts` - Create new contact
- `GET /api/contacts/:id` - Get contact by ID
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Call Endpoints
- `GET /api/calls` - Get calls with filtering
- `POST /api/calls` - Start new call
- `PUT /api/calls/:id/end` - End call
- `PUT /api/calls/:id/metrics` - Update call metrics
- `GET /api/calls/:id/transcripts` - Get call transcripts

## Real-time Events

### Socket.io Events
- `join-call` - Join a call room
- `leave-call` - Leave a call room
- `transcript-update` - Real-time transcript updates
- `audio-level` - Audio level monitoring
- `metrics-updated` - Performance metrics updates
- `new-recommendation` - AI recommendation alerts

## Development Guidelines

### Code Organization
- **Routes**: Define API endpoints and route parameters
- **Controllers**: Handle HTTP requests, validate input, coordinate services
- **Services**: Implement business logic, data processing, external API calls
- **Models**: Define data structure and database interactions

### Error Handling
- Centralized error handling middleware
- Consistent API response format
- Proper HTTP status codes
- Detailed error logging

### Security
- JWT-based authentication
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Helmet.js security headers

## Deployment

### Backend Deployment
1. Set production environment variables
2. Build and deploy to your preferred platform (AWS, Heroku, etc.)
3. Configure MongoDB connection string
4. Set up SSL certificates

### Frontend Deployment
1. Build the production bundle:
```bash
npm run build
```
2. Deploy to static hosting (Netlify, Vercel, etc.)
3. Configure environment variables for production API

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the established code patterns
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.