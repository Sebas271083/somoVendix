import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicRegistryApi } from '../services/api.js';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    email: '',
    adminName: '',
    adminPassword: '',
    confirmPassword: '',
  });
  const [subdomainStatus, setSubdomainStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  useEffect(() => {
    if (!form.subdomain || form.subdomain.length < 3) { setSubdomainStatus(null); return; }
    if (!/^[a-z0-9-]+$/.test(form.subdomain)) { setSubdomainStatus('invalid'); return; }
    setSubdomainStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { available } = await publicRegistryApi.checkSubdomain(form.subdomain);
        setSubdomainStatus(available ? 'available' : 'taken');
      } catch { setSubdomainStatus(null); }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.subdomain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.adminPassword !== form.confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
    if (subdomainStatus !== 'available') { toast.error('El subdominio no está disponible'); return; }
    setLoading(true);
    try {
      await publicRegistryApi.register({
        name: form.name, subdomain: form.subdomain,
        email: form.email, adminName: form.adminName, adminPassword: form.adminPassword,
      });
      localStorage.setItem('gestix_subdomain', form.subdomain);
      toast.success('¡Cuenta creada! Podés iniciar sesión ahora.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.error || 'Error al registrarse');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ backgroundColor: 'var(--brand)' }}>
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <span className="font-bold text-xl" style={{ color: 'var(--ink)' }}>Vendix</span>
        </div>

        <div className="card p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Creá tu cuenta</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>14 días gratis en plan Pro</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
                Nombre del negocio
              </label>
              <input type="text" required value={form.name} onChange={set('name')}
                className="input" placeholder="Mi Papelería" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
                Subdominio
              </label>
              <div className="relative">
                <input type="text" required value={form.subdomain}
                  onChange={(e) => setForm(p => ({ ...p, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="input pr-10" placeholder="mi-papeleria" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {subdomainStatus === 'checking'  && <Loader size={16} className="animate-spin" style={{ color: 'var(--muted)' }} />}
                  {subdomainStatus === 'available' && <CheckCircle size={16} style={{ color: 'var(--ok)' }} />}
                  {(subdomainStatus === 'taken' || subdomainStatus === 'invalid') && <XCircle size={16} className="text-red-500" />}
                </div>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {form.subdomain ? `${form.subdomain}.vendix.app` : 'tudominio.vendix.app'}
                {subdomainStatus === 'taken'     && <span className="text-red-500 ml-2">No disponible</span>}
                {subdomainStatus === 'available' && <span className="ml-2" style={{ color: 'var(--ok)' }}>Disponible</span>}
                {subdomainStatus === 'invalid'   && <span className="text-red-500 ml-2">Solo letras, números y guiones</span>}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>Email del negocio</label>
              <input type="email" required value={form.email} onChange={set('email')}
                className="input" placeholder="info@minegocio.com" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>Tu nombre</label>
              <input type="text" required value={form.adminName} onChange={set('adminName')}
                className="input" placeholder="Juan Pérez" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>Contraseña</label>
                <input type="password" required minLength={6} value={form.adminPassword}
                  onChange={set('adminPassword')} className="input" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>Confirmar</label>
                <input type="password" required value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  className={`input ${form.confirmPassword && form.confirmPassword !== form.adminPassword ? 'border-red-400' : ''}`}
                  placeholder="••••••••" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || subdomainStatus !== 'available'}
              className="btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--muted)' }}>
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--brand)' }}>
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
