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
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import Toast from './components/Toast';
import Modal from './components/Modal';


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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
          📴 Modalità Offline - Stai visualizzando i dati salvati
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

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;

