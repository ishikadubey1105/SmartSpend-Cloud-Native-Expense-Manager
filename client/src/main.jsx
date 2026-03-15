import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './config/i18n';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#12123a',
              color: '#f1f5f9',
              border: '1px solid rgba(148,103,254,0.2)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#12123a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#12123a' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
