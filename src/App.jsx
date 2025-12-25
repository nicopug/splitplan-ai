import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import PainPoints from './components/PainPoints'
import Solution from './components/Solution'
import Features from './components/Features'
import Pricing from './components/Pricing'
import Footer from './components/Footer'
import Dashboard from './pages/Dashboard'

import Auth from './pages/Auth'

function Landing() {
  return (
    <>
      <Navbar />
      <Hero />
      <PainPoints />
      <Solution />
      <Features />
      <Pricing />
      <Footer />
    </>
  )
}

import Toast from './components/Toast'

function App() {
  return (
    <>
      <Toast />
      <Routes>

        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={
          <>
            <Navbar />
            <Auth />
          </>
        } />
        <Route path="/verify" element={
          <>
            <Navbar />
            <Auth />
          </>
        } />
        <Route path="/trip/:id" element={
          <>
            <Navbar />
            <Dashboard />
          </>
        } />
      </Routes>
    </>
  )
}

export default App
