# Ayasa Project Setup Instructions

This is a MERN (MongoDB, Express, React, Node.js) stack full-stack website for Ayasa mental health chatbot.

## Checklist

- [x] Project Structure Created
  - Created client/ and server/ directories
  - Setup React pages (6 pages)
  - Setup Express backend with routes and controllers
  - Created styling and configuration files

- [x] Frontend Setup (React)
  - 6 Pages: Login, Register, Home, Check-in, Results, History
  - React Router for navigation
  - CSS styling with responsive design
  - localStorage for mock authentication

- [x] Backend Setup (Express)
  - RESTful API endpoints
  - Auth routes (register, login)
  - Check-in routes (submit, history)
  - Controllers for business logic
  - MongoDB schema models (ready to connect)
  - JWT authentication (mock for demo)

- [x] Configuration
  - package.json for both client and server
  - .env and .env.example files
  - .gitignore for Git
  - README.md with full documentation

- [ ] Install Dependencies
  - Run `npm install` in server/
  - Run `npm install` in client/

- [ ] Start Development Servers
  - Backend: `npm start` in server/ (port 5000)
  - Frontend: `npm start` in client/ (port 3000)

- [ ] Test the Demo
  - Navigate to http://localhost:3000
  - Register or login with demo credentials
  - Test all 6 pages
  - Verify navigation flow

## Key Features

- **6 Working Pages**: Full navigation flow between all pages
- **Authentication Flow**: Login/Register with localStorage
- **Check-in Form**: User can input stress descriptions
- **Results Page**: Shows simulated stress level predictions
- **History Page**: View past check-in records
- **Responsive Design**: Mobile-friendly CSS

## API Endpoints (Demo)

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/checkin/submit` - Submit check-in
- `GET /api/checkin/history` - Get history

## Next Steps for Full Deployment

1. Connect to MongoDB for persistent data
2. Implement real JWT authentication
3. Add PyTorch/Hugging Face ML integration
4. Add actual stress detection model
5. Deploy to cloud (Heroku, AWS, etc.)

## Running the Project

```bash
# Terminal 1: Start Backend
cd server
npm install
npm start

# Terminal 2: Start Frontend
cd client
npm install
npm start
```

The website will be available at: http://localhost:3000
