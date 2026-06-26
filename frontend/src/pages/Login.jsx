import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [subdomain, setSubdomain] = useState(localStorage.getItem('gestix_subdomain') || 'demo');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subdomain) localStorage.setItem('gestix_subdomain', subdomain);
  }, [subdomain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12"
           style={{ backgroundColor: 'var(--brand)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Vendix</span>
        </div>
        <div>
          <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-3">
            Punto de venta
          </p>
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Gestión simple,<br />ventas rápidas.
          </h2>
          <p className="text-white/70 text-base">
            Control total de tu negocio desde un solo lugar.
          </p>
        </div>
        <p className="text-white/40 text-xs">© 2025 Vendix</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: 'var(--brand)' }}>
              <span className="text-white font-bold">V</span>
            </div>
            <span className="font-bold text-xl" style={{ color: 'var(--ink)' }}>Vendix</span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Bienvenido</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
            Iniciá sesión para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isDev && (
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
                  Negocio <span className="font-normal text-xs" style={{ color: 'var(--muted)' }}>(subdominio dev)</span>
                </label>
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                  className="input"
                  placeholder="demo"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="input"
                placeholder="admin@negocio.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>Contraseña</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-50"
            >
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--muted)' }}>
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--brand)' }}>
              Registrarte gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
