import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PainPoints from './components/PainPoints';
import Solution from './components/Solution';
import Features from './components/Features';
import Pricing from './components/Pricing';
import Business from './components/Business';
import Footer from './components/Footer';
import Toast from './components/Toast';
import Modal from './components/Modal';
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
import { useToast } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import ROICalculator from './components/ROICalculator';

// Lazy load page components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MyTrips = lazy(() => import('./pages/MyTrips'));
const Auth = lazy(() => import('./pages/Auth'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ShareTrip = lazy(() => import('./pages/ShareTrip'));
const CalendarCallback = lazy(() => import('./pages/CalendarCallback'));
const Market = lazy(() => import('./pages/Market'));
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess'));
const DemoRequest = lazy(() => import('./pages/DemoRequest'));
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard'));
const JoinCompany = lazy(() => import('./pages/JoinCompany'));

// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
  </div>
);


function Landing({ user }) {
  return (
    <>
      <Hero />
      <PainPoints />
      <Solution />
      <Features />
      <ROICalculator />
      <Pricing user={user} />
      <Business />
      <Footer />
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { showToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      showToast(t('app.asyncError', 'Si è verificato un errore inaspettato. Riprova.'), 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

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
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300">
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
              {t('app.offlineBanner', 'Modalità Offline - Stai visualizzando i dati salvati')}
            </div>
          )}
          <Toaster richColors position="bottom-right" />
          <Toast />
          <Modal />
          <Navbar user={user} />
          <main>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing user={user} />} />
                <Route path="/auth" element={<Auth onLogin={(u) => setUser(u)} />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify" element={<Auth onLogin={(u) => setUser(u)} />} />
                <Route path="/trip/:id" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                <Route path="/calendar-callback" element={<CalendarCallback />} />
                <Route path="/my-trips" element={<ErrorBoundary><MyTrips /></ErrorBoundary>} />
                <Route path="/trip/join/:token" element={<ShareTrip isJoinMode={true} />} />
                <Route path="/share/:token" element={<ShareTrip />} />
                <Route path="/market" element={<Market />} />
                <Route path="/checkout-success" element={<CheckoutSuccess onUserUpdate={(u) => {
                  const stored = JSON.parse(localStorage.getItem('user') || '{}');
                  const newUser = { ...stored, ...u };
                  setUser(newUser);
                  localStorage.setItem('user', JSON.stringify(newUser));
                }} />} />
                <Route path="/roi" element={<ROICalculator />} />
                <Route path="/demo" element={<DemoRequest />} />
                <Route path="/manager" element={<ErrorBoundary><CompanyDashboard /></ErrorBoundary>} />
                <Route path="/join" element={<ErrorBoundary><JoinCompany /></ErrorBoundary>} />

                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </ErrorBoundary>
  );
}

export default App;

