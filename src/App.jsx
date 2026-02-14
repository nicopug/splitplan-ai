// Initial state restore - Force redeploy
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PainPoints from './components/PainPoints';
import Solution from './components/Solution';
import Features from './components/Features';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import MyTrips from './pages/MyTrips';
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import ShareTrip from './pages/ShareTrip';
import CalendarCallback from './pages/CalendarCallback';
import Toast from './components/Toast';
import Modal from './components/Modal';
import { useToast } from './context/ToastContext';


function Landing({ user }) {
  return (
    <>
      <Hero />
      <PainPoints />
      <Solution />
      <Features />
      <Pricing user={user} />
      <Footer />
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [globalError, setGlobalError] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'undefined') {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Local storage user parse error", e);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global Error Handler for rendering
  if (globalError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', paddingTop: '10rem' }}>
        <h2>Ops! Il sito ha riscontrato un problema critico</h2>
        <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', display: 'inline-block', color: 'red', marginTop: '1rem' }}>
          {globalError}
        </pre>
        <div style={{ marginTop: '2rem' }}>
          <button onClick={() => window.location.href = '/'} className="btn btn-primary">Riavvia App</button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="min-h-screen bg-bg-light">
        {!isOnline && (
          <div style={{
            background: 'var(--accent-orange)',
            color: 'white',
            textAlign: 'center',
            padding: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999
          }}>
            Modalità Offline - Stai visualizzando i dati salvati
          </div>
        )}
        <Toast />
        <Modal />
        <Navbar user={user} />
        <Routes>
          <Route path="/" element={<Landing user={user} />} />
          <Route path="/auth" element={<Auth onLogin={(u) => setUser(u)} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify" element={<Auth onLogin={(u) => setUser(u)} />} />
          <Route path="/trip/:id" element={<Dashboard />} />
          <Route path="/calendar-callback" element={<CalendarCallback />} />
          <Route path="/my-trips" element={<MyTrips />} />
          <Route path="/trip/join/:token" element={<ShareTrip isJoinMode={true} />} />
          <Route path="/share/:token" element={<ShareTrip />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    );
  } catch (err) {
    setGlobalError(err.message);
    return null;
  }
}

export default App;

