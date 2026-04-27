import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { StudentAuthProvider } from './context/StudentAuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AdminAuthProvider>
        <StudentAuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </StudentAuthProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
