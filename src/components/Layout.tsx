import { type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      {children}
    </div>
  );
}

interface HeaderProps {
  title: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}

export function Header({ title, leftAction, rightAction }: HeaderProps) {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 48 }}>{leftAction}</div>
        <h1 className="header-title">{title}</h1>
        <div style={{ width: 48 }}>{rightAction}</div>
      </div>
    </header>
  );
}

type NavItem = 'home' | 'generate' | 'correct' | 'settings';

interface NavbarProps {
  active: NavItem;
  onChange: (item: NavItem) => void;
}

export function Navbar({ active, onChange }: NavbarProps) {
  const items: { id: NavItem; icon: string; label: string }[] = [
    { id: 'home', icon: '📤', label: '업로드' },
    { id: 'generate', icon: '💬', label: '답변생성' },
    { id: 'correct', icon: '✏️', label: '메시지보정' },
    { id: 'settings', icon: '⚙️', label: '설정' },
  ];

  return (
    <nav className="nav">
      <ul className="nav-list">
        {items.map(item => (
          <li key={item.id}>
            <button
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => onChange(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = '처리 중...' }: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
