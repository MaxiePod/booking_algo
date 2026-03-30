import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { createMockAuthService } from './auth/mock-auth-service';

const authService = createMockAuthService();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider service={authService}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
