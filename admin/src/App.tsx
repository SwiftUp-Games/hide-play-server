import { useState, useEffect } from 'react';
import { adminApi, getAuthToken, getSavedPhone } from './api';
import type { DashboardData } from './types';
import { LoginModal } from './components/LoginModal';
import { DashboardTab } from './components/DashboardTab';
import { PlayersTab } from './components/PlayersTab';
import { PricingTab } from './components/PricingTab';
import { MonetizationTab } from './components/MonetizationTab';
import { SecurityTab } from './components/SecurityTab';
import { TestersTab } from './components/TestersTab';
import { 
  LayoutDashboard, 
  Users, 
  Tag, 
  Tv, 
  Shield, 
  MessageSquare,
  LogOut, 
  KeyRound, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

type TabType = 'dashboard' | 'players' | 'pricing' | 'monetization' | 'testers' | 'security';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminPhone, setAdminPhone] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Dashboard Live Data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const fetchDashboard = async () => {
    setDashboardLoading(true);
    try {
      const data = await adminApi.getDashboard();
      setDashboardData(data);
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setIsAuthenticated(false);
      }
    } finally {
      setDashboardLoading(false);
    }
  };

  // Check existing session
  useEffect(() => {
    const token = getAuthToken();
    const phone = getSavedPhone();
    if (token) {
      adminApi.verifySession().then(res => {
        if (res.valid) {
          setIsAuthenticated(true);
          setAdminPhone(phone || '8606094557');
        } else {
          setIsAuthenticated(false);
        }
      });
    }
  }, []);

  // Live polling for dashboard when logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDashboard();
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') {
        fetchDashboard();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  const handleLoginSuccess = (code: string) => {
    setIsAuthenticated(true);
    setAdminPhone(code);
    showToast(`Welcome Admin! Authenticated with 10-digit OTP code ${code}`, 'success');
    fetchDashboard();
  };

  const handleLogout = async () => {
    await adminApi.logout();
    setIsAuthenticated(false);
    showToast('Logged out of Admin Studio.', 'success');
  };

  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  const livePlayers = dashboardData?.live?.online_players ?? 0;
  const activeRooms = dashboardData?.live?.active_rooms ?? 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Main Navigation Bar */}
      <header style={{
        background: 'rgba(7, 18, 11, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '12px 24px'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px', filter: 'drop-shadow(0 2px 8px rgba(255,215,82,0.3))' }}>🌴</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontFamily: 'var(--font-game)', 
                  fontSize: '20px', 
                  color: 'var(--primary-gold)',
                  letterSpacing: '0.8px' 
                }}>
                  HIDE & PLAY
                </span>
                <span className="badge badge-gold" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  STUDIO
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>
                Kerala Game Creator & Operations Panel
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar in Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="badge badge-green" style={{ padding: '6px 12px' }}>
              <span className="live-beacon"></span>
              <span><strong>{livePlayers}</strong> Online</span>
            </div>

            <div className="badge badge-blue" style={{ padding: '6px 12px' }}>
              <span>⚔️ <strong>{activeRooms}</strong> Arenas</span>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <KeyRound size={13} color="var(--primary-gold)" />
              <span>OTP: {adminPhone}</span>
            </div>

            <button
              onClick={handleLogout}
              className="btn-danger"
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Logout"
            >
              <LogOut size={13} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab Switcher Sub-Bar */}
      <nav style={{
        background: 'rgba(10, 24, 15, 0.7)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '6px 24px'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
            { id: 'testers', label: 'Feedback & Testers', icon: MessageSquare },
            { id: 'players', label: 'Players & Accounts', icon: Users },
            { id: 'pricing', label: 'Shop & Pricing', icon: Tag },
            { id: 'monetization', label: 'Monetization & Ads', icon: Tv },
            { id: 'security', label: 'Security & Settings', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  background: isActive ? 'rgba(255, 215, 82, 0.15)' : 'transparent',
                  color: isActive ? 'var(--primary-gold)' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid var(--primary-gold)' : '2px solid transparent',
                  padding: '10px 16px',
                  borderRadius: '8px 8px 0 0',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Body */}
      <main style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '28px 24px 60px'
      }}>
        {activeTab === 'dashboard' && (
          <DashboardTab 
            data={dashboardData} 
            loading={dashboardLoading} 
            onRefresh={fetchDashboard} 
            showToast={showToast} 
          />
        )}
        {activeTab === 'testers' && <TestersTab onShowToast={showToast} />}
        {activeTab === 'players' && <PlayersTab showToast={showToast} />}
        {activeTab === 'pricing' && <PricingTab showToast={showToast} />}
        {activeTab === 'monetization' && <MonetizationTab showToast={showToast} />}
        {activeTab === 'security' && <SecurityTab showToast={showToast} onLogout={handleLogout} />}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'success' ? 'rgba(18, 48, 28, 0.95)' : 'rgba(54, 18, 18, 0.95)',
          border: `1px solid ${toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          color: 'var(--text-main)',
          padding: '12px 18px',
          borderRadius: '12px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 200,
          animation: 'fadeIn 0.25s ease forwards',
          fontSize: '13px',
          fontWeight: 500,
          maxWidth: '400px'
        }}>
          {toast.type === 'success' ? (
            <CheckCircle size={18} color="var(--accent-green)" />
          ) : (
            <AlertCircle size={18} color="var(--accent-red)" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
