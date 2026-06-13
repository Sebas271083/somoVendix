import { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const PAYMENT_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  transferencia: 'Transferencia', cuenta_corriente: 'Cuenta corriente', mixto: 'Pago mixto',
};

export default function ReceiptModal({ sale, settings = {}, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=400,height=700');
    win.document.write(`
      <html>
        <head>
          <title>Recibo #${sale.ticket_number}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 8px; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .separator { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 1px 0; vertical-align: top; }
            .total-row { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const businessName = settings.business_name || 'Mi Papelería';
  const businessAddress = settings.business_address || '';
  const businessPhone = settings.business_phone || '';
  const footer = settings.receipt_footer || '¡Gracias por tu compra!';
  const dateStr = new Date(sale.created_at).toLocaleString('es-AR');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">Recibo #{sale.ticket_number}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              <Printer size={15} /> Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4">
          <div ref={printRef} className="font-mono text-xs space-y-1 max-w-xs mx-auto">
            {/* Business header */}
            <div className="text-center">
              <p className="font-bold text-base">{businessName}</p>
              {businessAddress && <p>{businessAddress}</p>}
              {businessPhone && <p>Tel: {businessPhone}</p>}
            </div>
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Receipt info */}
            <div>
              <p><span className="font-semibold">Recibo #:</span> {sale.ticket_number}</p>
              <p><span className="font-semibold">Fecha:</span> {dateStr}</p>
              <p><span className="font-semibold">Vendedor:</span> {sale.user_name}</p>
              <p><span className="font-semibold">Cliente:</span> {sale.customer_name || 'Consumidor Final'}</p>
            </div>
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Items */}
            <table className="w-full">
              <thead>
                <tr>
                  <td className="font-semibold">Producto</td>
                  <td className="text-center font-semibold">Cant.</td>
                  <td className="text-right font-semibold">Precio</td>
                  <td className="text-right font-semibold">Sub</td>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((item, i) => (
                  <tr key={i}>
                    <td className="pr-1" style={{ maxWidth: '120px', wordBreak: 'break-word' }}>
                      {item.product_name}
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{fmt(item.unit_price)}</td>
                    <td className="text-right">{fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Totals */}
            <table className="w-full">
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td className="text-right">{fmt(sale.subtotal)}</td>
                </tr>
                {parseFloat(sale.discount) > 0 && (
                  <tr>
                    <td>Descuento</td>
                    <td className="text-right">-{fmt(sale.discount)}</td>
                  </tr>
                )}
                <tr className="font-bold text-sm">
                  <td>TOTAL</td>
                  <td className="text-right">{fmt(sale.total)}</td>
                </tr>
                <tr>
                  <td>Método de pago</td>
                  <td className="text-right">{PAYMENT_LABELS[sale.payment_method] || sale.payment_method}</td>
                </tr>
              </tbody>
            </table>
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Footer */}
            <p className="text-center">{footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
