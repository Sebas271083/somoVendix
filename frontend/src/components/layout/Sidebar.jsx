import { NavLink } from 'react-router-dom';
import {
  Home, ShoppingCart, Package, Layers, Users, Truck,
  FileText, Archive, BarChart2, LogOut, Settings,
  CreditCard, DollarSign, TrendingDown, TrendingUp, Moon, Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

const navItems = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/pos', icon: ShoppingCart, label: 'Punto de venta' },
  { to: '/products', icon: Package, label: 'Productos' },
  { to: '/stock', icon: Layers, label: 'Stock' },
  { to: '/customers', icon: Users, label: 'Clientes' },
  { to: '/receivables', icon: CreditCard, label: 'Cuentas a cobrar' },
  { to: '/suppliers', icon: Truck, label: 'Proveedores' },
  { to: '/sales', icon: FileText, label: 'Facturación' },
  { to: '/cash-register', icon: Archive, label: 'Caja diaria' },
  { to: '/cash-flow', icon: TrendingUp, label: 'Flujo de caja' },
  { to: '/expenses', icon: TrendingDown, label: 'Gastos' },
  { to: '/reports', icon: BarChart2, label: 'Reportes' },
];

const planColors = {
  free: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  business: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
};

export default function Sidebar() {
  const { user, tenant, logout, isAdmin, trialDaysLeft } = useAuth();
  const { dark, toggle } = useTheme();
  const days = trialDaysLeft();

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-screen fixed left-0 top-0 z-20 dark:bg-gray-800 dark:border-gray-700">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">Gestix</span>
        </div>
        {tenant && (
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[tenant.plan_slug] || planColors.free}`}>
              {tenant.plan_name}
            </span>
            {tenant.status === 'trial' && days !== null && (
              <span className="text-xs text-amber-600">{days}d trial</span>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium border-r-2 border-blue-600 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium border-r-2 border-blue-600 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
              }`
            }
          >
            <Settings size={17} />
            Configuración
          </NavLink>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm dark:bg-blue-900 dark:text-blue-300">
            {user?.name?.charAt(0) ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate dark:text-gray-200">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize dark:text-gray-500">{user?.role}</p>
          </div>
          <button
            onClick={toggle}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
            className="text-gray-400 hover:text-gray-700 transition-colors dark:text-gray-500 dark:hover:text-gray-200"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="text-gray-400 hover:text-red-500 transition-colors dark:text-gray-500"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
