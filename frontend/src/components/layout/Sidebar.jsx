import { NavLink } from 'react-router-dom';
import {
  Home, ShoppingCart, Package, Layers, Users, Truck,
  FileText, Archive, BarChart2, LogOut, Settings,
  CreditCard, TrendingDown, TrendingUp, Moon, Sun, UserCog, ClipboardList, Mail,
  ScrollText, RotateCcw, CalendarDays, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

// Sidebar always uses these fixed dark-brand colors, regardless of light/dark mode
const S = {
  bg:         '#0E2A1F',
  bgHover:    'rgba(255,255,255,0.06)',
  bgActive:   'rgba(255,255,255,0.11)',
  text:       'rgba(255,255,255,0.58)',
  textActive: '#ffffff',
  label:      'rgba(255,255,255,0.28)',
  border:     'rgba(255,255,255,0.08)',
  logo:       '#ffffff',
};

const NAV_SECTIONS = [
  {
    label: 'Ventas',
    items: [
      { to: '/pos',          icon: ShoppingCart, label: 'Punto de venta' },
      { to: '/sales',        icon: FileText,     label: 'Facturación' },
      { to: '/quotes',       icon: ScrollText,   label: 'Presupuestos' },
      { to: '/credit-notes', icon: RotateCcw,    label: 'Notas de crédito' },
      { to: '/installments', icon: CalendarDays, label: 'Cuotas' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { to: '/products',    icon: Package,       label: 'Productos' },
      { to: '/stock',       icon: Layers,        label: 'Stock' },
      { to: '/stocktaking', icon: ClipboardList, label: 'Inventario físico' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/cash-register', icon: Archive,      label: 'Caja diaria' },
      { to: '/cash-flow',     icon: TrendingUp,   label: 'Flujo de caja',    feature: 'cashflow' },
      { to: '/expenses',      icon: TrendingDown, label: 'Gastos',           feature: 'expenses' },
      { to: '/receivables',   icon: CreditCard,   label: 'Cuentas a cobrar', feature: 'receivables' },
    ],
  },
  {
    label: 'Compras',
    items: [
      { to: '/suppliers',       icon: Truck,        label: 'Proveedores',       feature: 'suppliers' },
      { to: '/purchase-orders', icon: ShoppingCart, label: 'Órdenes de compra', feature: 'suppliers' },
    ],
  },
];

function NavItem({ to, icon: Icon, label, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `sidebar-nav-item flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-all duration-150 ${isActive ? 'active font-semibold' : 'font-medium'}`
      }
      style={({ isActive }) => isActive
        ? { backgroundColor: S.bgActive, color: S.textActive }
        : { color: S.text }
      }
    >
      <Icon size={15} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-widest uppercase px-3 mb-1 mt-5"
       style={{ color: S.label }}>
      {children}
    </p>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, tenant, logout, isAdmin, trialDaysLeft, hasFeature } = useAuth();
  const { dark, toggle } = useTheme();
  const days = trialDaysLeft();

  return (
    <aside
      style={{ backgroundColor: S.bg, borderRight: `1px solid ${S.border}` }}
      className={`
        w-64 md:w-56 flex flex-col h-screen fixed left-0 top-0 z-40
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full pointer-events-none md:pointer-events-auto'}
        md:translate-x-0
      `}
    >
      {/* ── Logo ────────────────────────────────── */}
      <div className="px-4 py-4 flex items-start justify-between"
           style={{ borderBottom: `1px solid ${S.border}` }}>
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <span className="font-bold text-sm leading-none" style={{ color: '#fff' }}>V</span>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight leading-none" style={{ color: S.logo }}>
                Vendix
              </span>
              {tenant?.name && (
                <p className="text-[10px] mt-0.5 uppercase tracking-wider truncate max-w-[120px]"
                   style={{ color: S.label }}>
                  {tenant.name}
                </p>
              )}
            </div>
          </div>
          {tenant && (
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}>
                {tenant.plan_name || tenant.plan_slug}
              </span>
              {tenant.status === 'trial' && days !== null && (
                <span className="text-[11px] font-medium" style={{ color: '#FBC02D' }}>
                  {days}d trial
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="md:hidden sidebar-footer-btn p-1.5 rounded-lg transition-colors mt-0.5 flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Nav ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <NavItem to="/" icon={Home} label="Inicio" end onNavigate={onClose} />

        {NAV_SECTIONS.map(({ label, items }) => {
          const visible = items.filter(({ feature }) => !feature || hasFeature(feature));
          if (!visible.length) return null;
          return (
            <div key={label}>
              <SectionLabel>{label}</SectionLabel>
              <div className="space-y-0.5">
                {visible.map(({ to, icon, label: lbl }) => (
                  <NavItem key={to} to={to} icon={icon} label={lbl} onNavigate={onClose} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Gestión */}
        <div>
          <SectionLabel>Gestión</SectionLabel>
          <div className="space-y-0.5">
            <NavItem to="/customers"  icon={Users}     label="Clientes"      onNavigate={onClose} />
            {hasFeature('crm')     && <NavItem to="/campaigns"       icon={Mail}      label="Campañas"      onNavigate={onClose} />}
            {isAdmin               && <NavItem to="/users"           icon={UserCog}   label="Usuarios"      onNavigate={onClose} />}
            {hasFeature('reports') && <NavItem to="/reports"         icon={BarChart2} label="Reportes"      onNavigate={onClose} />}
            {isAdmin               && <NavItem to="/settings"        icon={Settings}  label="Configuración" onNavigate={onClose} />}
          </div>
        </div>
      </nav>

      {/* ── Footer usuario ───────────────────────── */}
      <div className="p-3" style={{ borderTop: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
               style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }}>
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: S.textActive }}>
              {user?.name}
            </p>
            <p className="text-[11px]" style={{ color: S.text }}>
              {{ admin: 'Administrador', cashier: 'Cajero/Vendedor', vendedor: 'Vendedor' }[user?.role] ?? user?.role}
            </p>
          </div>
          <button
            onClick={toggle}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
            className="sidebar-footer-btn p-2 rounded-lg transition-colors"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="sidebar-footer-btn p-2 rounded-lg transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
