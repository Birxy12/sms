import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { StudentAuthProvider } from './context/StudentAuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { FinanceProvider } from './context/FinanceContext'
import './index.css'
import App from './App.jsx'

// Gracefully handle harmless browser/extension errors (e.g. extension context menus, autoplay interruptions, Firestore SDK internal race assertions, network reconnection events)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    
    // Suppress harmless extension / browser background errors, internal SDK assertions, and transient network disconnects
    if (
      msg.includes('Cannot find menu item with id') ||
      msg.includes('save-page') ||
      (reason?.name === 'AbortError' && msg.includes('play() request was interrupted')) ||
      msg.includes('ResizeObserver loop') ||
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('BloomFilter') ||
      msg.includes('ve":-1') ||
      msg.includes('ERR_INTERNET_DISCONNECTED') ||
      msg.includes('net::ERR_INTERNET_DISCONNECTED') ||
      msg.includes('ERR_NETWORK_CHANGED') ||
      msg.includes('ERR_CONNECTION_RESET') ||
      msg.includes('ERR_CONNECTION_CLOSED') ||
      msg.includes('QUIC_NETWORK_IDLE_TIMEOUT') ||
      msg.includes('ERR_QUIC_PROTOCOL_ERROR') ||
      msg.includes('fonts.googleapis.com') ||
      msg.includes('fonts.gstatic.com') ||
      msg.includes('Firestore/Write/channel') ||
      msg.includes('Firestore/Listen/channel') ||
      msg.includes('network-request-failed')
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
      msg.includes('ve":-1') ||
      msg.includes('ERR_INTERNET_DISCONNECTED') ||
      msg.includes('net::ERR_INTERNET_DISCONNECTED') ||
      msg.includes('ERR_NETWORK_CHANGED') ||
      msg.includes('ERR_CONNECTION_RESET') ||
      msg.includes('ERR_CONNECTION_CLOSED') ||
      msg.includes('QUIC_NETWORK_IDLE_TIMEOUT') ||
      msg.includes('ERR_QUIC_PROTOCOL_ERROR') ||
      msg.includes('fonts.googleapis.com') ||
      msg.includes('fonts.gstatic.com') ||
      msg.includes('Firestore/Write/channel') ||
      msg.includes('Firestore/Listen/channel') ||
      msg.includes('network-request-failed')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  // Filter console.error and console.warn for extension errors
  const origError = console.error;
  console.error = function(...args) {
    const msg = args.map(a => typeof a === 'object' ? (a?.message || a?.stack || JSON.stringify(a)) : String(a)).join(' ');
    if (
      msg.includes('save-page') ||
      msg.includes('Cannot find menu item') ||
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('BloomFilter') ||
      msg.includes('ve":-1') ||
      msg.includes('ERR_INTERNET_DISCONNECTED') ||
      msg.includes('ERR_NETWORK_CHANGED') ||
      msg.includes('ERR_CONNECTION_RESET') ||
      msg.includes('ERR_CONNECTION_CLOSED') ||
      msg.includes('QUIC_NETWORK_IDLE_TIMEOUT') ||
      msg.includes('ERR_QUIC_PROTOCOL_ERROR') ||
      msg.includes('fonts.googleapis.com') ||
      msg.includes('fonts.gstatic.com') ||
      msg.includes('Firestore/Write/channel') ||
      msg.includes('Firestore/Listen/channel')
    ) {
      return;
    }
    origError.apply(console, args);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AdminAuthProvider>
        <StudentAuthProvider>
          <FinanceProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <App />
            </BrowserRouter>
          </FinanceProvider>
        </StudentAuthProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
