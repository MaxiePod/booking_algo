import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { createFirebaseAuthService } from './auth/firebase-auth-service';

const authService = createFirebaseAuthService();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider service={authService}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
