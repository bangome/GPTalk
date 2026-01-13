import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './stores/useAppStore';
import { Layout, Navbar, LoadingOverlay } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { GeneratePage } from './pages/GeneratePage';
import { CorrectPage } from './pages/CorrectPage';
import { SettingsPage } from './pages/SettingsPage';
import { initAppsInToss } from './services/appsInToss';
import './styles/global.css';

type NavItem = 'home' | 'generate' | 'correct' | 'settings';

function AppContent() {
  const [activeNav, setActiveNav] = useState<NavItem>('home');
  const { isLoading, loadingMessage, setTossEnv } = useApp();

  useEffect(() => {
    // 앱인토스 초기화
    const env = initAppsInToss();
    setTossEnv(env);
  }, [setTossEnv]);

  const renderPage = () => {
    switch (activeNav) {
      case 'home':
        return <HomePage />;
      case 'generate':
        return <GeneratePage />;
      case 'correct':
        return <CorrectPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <Layout>
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      {renderPage()}
      <Navbar active={activeNav} onChange={setActiveNav} />
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
