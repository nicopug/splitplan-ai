import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Toast from './components/Toast';
import Modal from './components/Modal';

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
        <Route path="/" element={<Hero />} />
        <Route path="/auth" element={<Auth onLogin={(u) => setUser(u)} />} />
        <Route path="/trip/:id" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
