// src/App.js
import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { AuthProvider } from './context/AuthContext'
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
import ModeratorPanel from './pages/ModeratorPanel'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Terms from './pages/Terms'
import About from './pages/About'
import Contact from './pages/Contact'
import MessengerWidget from './components/MessengerWidget'
import Footer from './components/Footer'

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

function BanScreen({ banInfo }) {
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' }) : 'Permanent'
  return (
    <div style={{ minHeight:'100vh', background:'#02040A', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', fontFamily:'Outfit,sans-serif' }}>
      <div style={{ maxWidth:440, textAlign:'center' }}>
        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'#4A5568', letterSpacing:'2px', marginBottom:'1rem' }}>// compte suspendu</div>
        <div style={{ fontSize:'1.5rem', fontWeight:700, color:'#fff', marginBottom:'0.5rem' }}>Ton compte a été suspendu.</div>
        {banInfo.ban_reason && <div style={{ fontSize:'0.88rem', color:'#94A3B8', marginBottom:'0.5rem' }}>Raison : <span style={{color:'#E2E8F0'}}>{banInfo.ban_reason}</span></div>}
        <div style={{ fontSize:'0.85rem', color:'#94A3B8', marginBottom:'1.5rem' }}>Jusqu'au : <span style={{color:'#F87171'}}>{fmtDate(banInfo.banned_until)}</span></div>
        <div style={{ fontSize:'0.78rem', color:'#4A5568', fontFamily:'DM Mono,monospace' }}>Contact : saadga2003@gmail.com</div>
      </div>
    </div>
  )
}

function App() {
  const [bannedUser, setBannedUser] = useState(null)
  const banSignOutRef = useRef(false)

  useEffect(() => {
    const checkBan = async (session) => {
      if (!session?.user) {
        // This SIGNED_OUT was triggered by our own ban sign-out — don't clear the screen
        if (banSignOutRef.current) { banSignOutRef.current = false; return }
        setBannedUser(null)
        return
      }
      const { data } = await supabase.from('user_profiles')
        .select('is_banned, banned_until, ban_reason').eq('id', session.user.id).single()
      if (data?.is_banned) {
        const isPerm = !data.banned_until
        const isFuture = data.banned_until && new Date(data.banned_until) > new Date()
        if (isPerm || isFuture) {
          banSignOutRef.current = true
          setBannedUser(data)
          await supabase.auth.signOut()
          return
        }
      }
      setBannedUser(null)
    }

    supabase.auth.getSession().then(({ data: { session } }) => checkBan(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      checkBan(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (bannedUser) return <BanScreen banInfo={bannedUser} />

  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/module/:slug" element={<ModulePage />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/moderator" element={<ModeratorPanel />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:id" element={<Profile />} />
        <Route path="/senpai" element={<SenpaiZone />} />
        <Route path="/ai" element={<AICoach />} />
        <Route path="/my-modules" element={<MyModules />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <WelcomeModal />
      <MessengerWidget />
    </BrowserRouter>
    </AuthProvider>
  )
}

export default App
