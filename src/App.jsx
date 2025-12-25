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
import Toast from './components/Toast';
import Modal from './components/Modal';

function Landing() {
  return (
    <>
      <Hero />
      <PainPoints />
      <Solution />
      <Features />
      <Pricing />
      <Footer />
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <div className="min-h-screen bg-bg-light">
      <Toast />
      <Modal />
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth onLogin={(u) => setUser(u)} />} />
        <Route path="/trip/:id" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;

