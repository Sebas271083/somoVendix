import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pos_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [tenant, setTenant] = useState(() => {
    const saved = localStorage.getItem('pos_tenant');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    if (token) {
      authApi.me()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('pos_token');
          localStorage.removeItem('pos_user');
          localStorage.removeItem('pos_tenant');
          setUser(null);
          setTenant(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('pos_token', res.token);
    localStorage.setItem('pos_user', JSON.stringify(res.user));
    if (res.tenant) {
      localStorage.setItem('pos_tenant', JSON.stringify(res.tenant));
      localStorage.setItem('gestix_subdomain', res.tenant.subdomain || '');
      setTenant(res.tenant);
    }
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_tenant');
    setUser(null);
    setTenant(null);
  };

  const trialDaysLeft = () => {
    if (!tenant?.trial_ends_at) return null;
    const diff = new Date(tenant.trial_ends_at) - new Date();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  const hasFeature = (feature) => {
    if (!tenant?.features) return false;
    return Boolean(tenant.features[feature]);
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenant,
      login,
      logout,
      loading,
      isAdmin: user?.role === 'admin',
      trialDaysLeft,
      hasFeature,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
