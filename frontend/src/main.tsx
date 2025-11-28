import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { injectColors } from './config/colors'

// Inject colors and site title from environment variables
injectColors()
document.title = import.meta.env.VITE_APP_TITLE || 'Voter98';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
