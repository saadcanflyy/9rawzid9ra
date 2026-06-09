// src/App.js
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Browse from './pages/Browse'
import ModulePage from './pages/ModulePage'
import Upload from './pages/Upload'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/Profile'
import SenpaiZone from './pages/SenpaiZone'
import AICoach from './pages/AICoach'
import MyModules from './pages/MyModules'
import WelcomeModal from './components/WelcomeModal'

const notFoundCss = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:#02040A; color:#E2E8F0; font-family:'Outfit',sans-serif; min-height:100vh; }
`

function NotFound() {
  const navigate = useNavigate()
  return (
    <>
      <style>{notFoundCss}</style>
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:'1rem',
        background:'#02040A',
      }}>
        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.72rem', color:'#4A5568', letterSpacing:'2px' }}>
          // 404 — page not found
        </div>
        <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#FFFFFF' }}>
          Cette page n'existe pas.
        </div>
        <div style={{ fontSize:'0.85rem', color:'#94A3B8', marginBottom:'0.5rem' }}>
          Le lien est peut-être cassé ou la page a été déplacée.
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background:'linear-gradient(135deg,#4F8EF7,#3A6ED4)',
            color:'#fff', border:'none', borderRadius:'9px',
            padding:'10px 24px', fontSize:'0.875rem', fontWeight:600,
            cursor:'pointer', fontFamily:'Outfit,sans-serif',
          }}
        >
          Retour à l'accueil
        </button>
      </div>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/module/:id" element={<ModulePage />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:id" element={<Profile />} />
        <Route path="/senpai" element={<SenpaiZone />} />
        <Route path="/ai" element={<AICoach />} />
        <Route path="/my-modules" element={<MyModules />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <WelcomeModal />
    </BrowserRouter>
  )
}

export default App
