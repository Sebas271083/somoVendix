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
  const [subdomainStatus, setSubdomainStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  useEffect(() => {
    if (!form.subdomain || form.subdomain.length < 3) {
      setSubdomainStatus(null);
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.subdomain)) {
      setSubdomainStatus('invalid');
      return;
    }
    setSubdomainStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { available } = await publicRegistryApi.checkSubdomain(form.subdomain);
        setSubdomainStatus(available ? 'available' : 'taken');
      } catch {
        setSubdomainStatus(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.subdomain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.adminPassword !== form.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (subdomainStatus !== 'available') {
      toast.error('El subdominio no está disponible');
      return;
    }
    setLoading(true);
    try {
      await publicRegistryApi.register({
        name: form.name,
        subdomain: form.subdomain,
        email: form.email,
        adminName: form.adminName,
        adminPassword: form.adminPassword,
      });
      localStorage.setItem('gestix_subdomain', form.subdomain);
      toast.success('¡Cuenta creada! Podés iniciar sesión ahora.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Creá tu cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">14 días gratis en plan Pro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              className="input"
              placeholder="Mi Papelería"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subdominio</label>
            <div className="relative">
              <input
                type="text"
                required
                value={form.subdomain}
                onChange={(e) => setForm(p => ({ ...p, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                className="input pr-10"
                placeholder="mi-papeleria"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {subdomainStatus === 'checking' && <Loader size={16} className="text-gray-400 animate-spin" />}
                {subdomainStatus === 'available' && <CheckCircle size={16} className="text-green-500" />}
                {(subdomainStatus === 'taken' || subdomainStatus === 'invalid') && <XCircle size={16} className="text-red-500" />}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {form.subdomain ? `${form.subdomain}.gestix.app` : 'tudominio.gestix.app'}
              {subdomainStatus === 'taken' && <span className="text-red-500 ml-2">No disponible</span>}
              {subdomainStatus === 'available' && <span className="text-green-600 ml-2">Disponible</span>}
              {subdomainStatus === 'invalid' && <span className="text-red-500 ml-2">Solo letras, números y guiones</span>}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email del negocio</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={set('email')}
              className="input"
              placeholder="info@minegocio.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
            <input
              type="text"
              required
              value={form.adminName}
              onChange={set('adminName')}
              className="input"
              placeholder="Juan Pérez"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.adminPassword}
                onChange={set('adminPassword')}
                className="input"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                className={`input ${form.confirmPassword && form.confirmPassword !== form.adminPassword ? 'border-red-400' : ''}`}
                placeholder="••••••••"
              />
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

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
