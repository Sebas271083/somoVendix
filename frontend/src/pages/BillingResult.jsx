import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const RESULTS = {
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-500',
    title: '¡Pago exitoso!',
    message: 'Tu suscripción fue activada. Podés empezar a usar todas las funciones de tu plan.',
    btnLabel: 'Ir al inicio',
    btnClass: 'bg-green-600 hover:bg-green-700',
  },
  failure: {
    icon: XCircle,
    iconClass: 'text-red-500',
    title: 'Pago rechazado',
    message: 'No pudimos procesar tu pago. Verificá los datos de tu tarjeta e intentá nuevamente.',
    btnLabel: 'Volver a intentar',
    btnClass: 'bg-red-600 hover:bg-red-700',
  },
  pending: {
    icon: Clock,
    iconClass: 'text-amber-500',
    title: 'Pago pendiente',
    message: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme y tu plan se activará automáticamente.',
    btnLabel: 'Ir al inicio',
    btnClass: 'bg-amber-600 hover:bg-amber-700',
  },
};

export default function BillingResult({ status }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const result = RESULTS[status] || RESULTS.pending;
  const Icon = result.icon;

  const handleBtn = () => {
    if (status === 'failure') {
      navigate('/settings');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <Icon size={56} className={`mx-auto mb-4 ${result.iconClass}`} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{result.title}</h1>
        <p className="text-gray-500 mb-8">{result.message}</p>

        {params.get('payment_id') && (
          <p className="text-xs text-gray-400 mb-6">
            ID de pago: {params.get('payment_id')}
          </p>
        )}

        <button
          onClick={handleBtn}
          className={`w-full text-white py-3 rounded-xl font-medium transition-colors ${result.btnClass}`}
        >
          {result.btnLabel}
        </button>
      </div>
    </div>
  );
}
