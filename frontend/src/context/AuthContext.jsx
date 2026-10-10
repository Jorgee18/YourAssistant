import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginRequest, register as registerRequest } from '../services/auth.api.js';
import {
  clearSession,
  readStoredUser,
  storeSession
} from '../services/api-client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    const token = sessionStorage.getItem('yourassistant.access-token');
    return token ? { token, user: readStoredUser() } : null;
  });

  useEffect(() => {
    const expireSession = () => setSession(null);
    window.addEventListener('yourassistant:session-expired', expireSession);
    return () => window.removeEventListener('yourassistant:session-expired', expireSession);
  }, []);

  const signIn = async credentials => {
    const result = await loginRequest(credentials);
    const nextSession = { token: result.token, user: result.user };
    storeSession(nextSession);
    setSession(nextSession);
    return result;
  };

  const signUp = details => registerRequest(details);

  const updateUser = updates => {
    if (!session) return;
    const nextSession = { ...session, user: { ...session.user, ...updates } };
    storeSession(nextSession);
    setSession(nextSession);
  };

  const signOut = () => {
    clearSession();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signUp, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  return context;
};
