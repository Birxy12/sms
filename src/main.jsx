import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { StudentAuthProvider } from './context/StudentAuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import './index.css'
import App from './App.jsx'

// Gracefully handle harmless browser/extension media play interruption errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event?.reason?.name === 'AbortError' &&
      typeof event?.reason?.message === 'string' &&
      event.reason.message.includes('play() request was interrupted')
    ) {
      event.preventDefault(); // Suppress noisy harmless browser autoplay/extension interruption
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
