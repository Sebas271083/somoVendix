import { useAuth } from '../../context/AuthContext.jsx';
import { AlertTriangle, Zap } from 'lucide-react';

export default function PlanBanner() {
  const { tenant, trialDaysLeft } = useAuth();
  if (!tenant) return null;

  const days = trialDaysLeft();

  if (tenant.status === 'trial' && days !== null && days <= 7) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle size={14} />
          <span>
            Tu período de prueba {days === 0 ? 'vence hoy' : `vence en ${days} ${days === 1 ? 'día' : 'días'}`}.
          </span>
        </div>
        <button className="text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1">
          <Zap size={13} />
          Actualizar plan
        </button>
      </div>
    );
  }

  if (tenant.plan_slug === 'free') {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between text-sm">
        <span className="text-blue-700">Estás en el plan gratuito con funciones limitadas.</span>
        <button className="text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1">
          <Zap size={13} />
          Ver planes
        </button>
      </div>
    );
  }

  return null;
}
