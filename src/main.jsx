import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { StudentAuthProvider } from './context/StudentAuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import './index.css'
import App from './App.jsx'

// Gracefully handle harmless browser/extension errors (e.g. extension context menus, autoplay interruptions, Firestore SDK internal race assertions)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    
    // Suppress harmless extension / browser background errors and internal SDK assertions
    if (
      msg.includes('Cannot find menu item with id') ||
      msg.includes('save-page') ||
      (reason?.name === 'AbortError' && msg.includes('play() request was interrupted')) ||
      msg.includes('ResizeObserver loop') ||
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('BloomFilter') ||
      msg.includes('ve":-1')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (
      msg.includes('Cannot find menu item with id') ||
      msg.includes('save-page') ||
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('BloomFilter') ||
      msg.includes('ve":-1')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AdminAuthProvider>
        <StudentAuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </StudentAuthProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
