import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import PlanBanner from '../ui/PlanBanner.jsx';
import NotificationBell from '../ui/NotificationBell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { tenant } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-56 overflow-hidden flex flex-col">
        <PlanBanner />

        {/* Topbar */}
        <div
          style={{ backgroundColor: 'var(--surface)', borderBottomColor: 'var(--border)' }}
          className="flex items-center gap-3 px-3 md:px-5 h-12 md:h-11 border-b flex-shrink-0"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-1 rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          {tenant?.business_name ? (
            <span className="text-sm font-medium truncate" style={{ color: 'var(--muted)' }}>
              {tenant.business_name}
            </span>
          ) : (
            <span />
          )}

          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

    </div>
  );
}
