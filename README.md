# Ayasa - Mental Health Stress Detection Website

A demo full-stack website for Ayasa, a mental health chatbot that detects stress. This is a **website-only demo** with no actual ML chatbot logic integrated yet.

## Features

- **6 Pages**: Login, Register, Home, Check-in, Results, History
- **React Frontend**: Modern responsive UI
- **Express Backend**: Basic API endpoints for auth and check-in
- **MongoDB Ready**: Database schema prepared
- **PyTorch/Hugging Face Integration**: Placeholders included for future ML integration

## Tech Stack

- **Frontend**: React 18, React Router, CSS3
- **Backend**: Express.js, Node.js
- **Database**: MongoDB (configured but optional for demo)
- **Authentication**: JWT
- **ML Placeholder**: PyTorch, Hugging Face (for future implementation)

## Project Structure

```
Ayasa/
├── client/                 # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/         # 6 main pages
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Home.js
│   │   │   ├── CheckIn.js
│   │   │   ├── Results.js
│   │   │   └── History.js
│   │   ├── styles/
│   │   │   └── pages.css
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                # Express backend
│   ├── controllers/
│   │   ├── authController.js
│   │   └── checkInController.js
│   ├── models/
│   │   ├── User.js
│   │   └── CheckIn.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── checkin.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── README.md
└── .gitignore
```

## Quick Start

### Prerequisites
- Node.js (v14+)
- npm

### Installation

1. **Install server dependencies**:
   ```
   cd server
   npm install
   cd ..
   ```

2. **Install client dependencies**:
   ```
   cd client
   npm install
   cd ..
   ```

3. **Setup environment** (optional):
   ```
   cd server
   cp .env.example .env
   cd ..
   ```

### Running the Application

**Option 1: Run in separate terminals**

Terminal 1 - Backend:
```
cd server
npm start
```

Terminal 2 - Frontend:
```
cd client
npm start
```

The app will open at `http://localhost:3000`
Backend runs on `http://localhost:5000`

### Demo Credentials

- **Email**: user@example.com
- **Password**: ••••••••

You can register a new account or use the demo credentials above.

## Pages Overview

1. **Login Page** - Welcome back, enter credentials
2. **Register Page** - Create new account with full name
3. **Home Page** - Dashboard with user greeting
4. **Check-in Page** - Text input for stress description
5. **Results Page** - Shows predicted stress level and advice
6. **History Page** - View past check-in records

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Check-in
- `POST /api/checkin/submit` - Submit check-in
- `GET /api/checkin/history` - Get check-in history

## Future Enhancements

1. **ML Integration**:
   - Connect PyTorch model for stress detection
   - Integrate Hugging Face for NLP processing
   - Real stress level prediction

2. **Database**:
   - Connect to MongoDB
   - Store user sessions and check-in history
   - Implement proper JWT authentication

3. **Features**:
   - Chatbot conversational interface
   - Real-time stress analytics
   - Resource library with exercises/playlists
   - Email notifications

## Notes

- This is a **demo website only** - no actual stress detection is implemented
- Check-in results show random stress levels for demo purposes
- Authentication is mocked with localStorage and in-memory storage
- MongoDB connection is commented out but schema is ready

## License

MIT
