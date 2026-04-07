import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { checkAuth } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const userData = await checkAuth(); // already handles 401 and returns null
      setUser(userData);

      // Redirect only if user not logged in and not already on login page
      if (!userData && location.pathname !== '/login') {
        navigate('/login');
      }

      setLoading(false);
    };

    initAuth();
  }, [location.pathname, navigate]);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    // Delete token cookie
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);

    // Optional: redirect to login page after logout
    navigate('/login');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
