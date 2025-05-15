import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './PixelGame.css'
import PixelGame from './PixelGame.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PixelGame />
  </StrictMode>,
)
