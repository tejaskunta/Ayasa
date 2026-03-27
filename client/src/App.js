import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import CheckIn from './pages/CheckIn';
import Results from './pages/Results';
import History from './pages/History';
import SplashCursor from './SplashCursor';

function App() {
  const isLoggedIn = !!(localStorage.getItem('token') && localStorage.getItem('user'));

  return (
    <Router>
      <SplashCursor />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/home"
          element={isLoggedIn ? <Home /> : <Navigate to="/login" />}
        />
        <Route
          path="/checkin"
          element={isLoggedIn ? <CheckIn /> : <Navigate to="/login" />}
        />
        <Route
          path="/results"
          element={isLoggedIn ? <Results /> : <Navigate to="/login" />}
        />
        <Route
          path="/history"
          element={isLoggedIn ? <History /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
