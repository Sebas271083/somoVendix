import { useRef, useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { afipApi } from '../../services/api.js';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const PAYMENT_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  transferencia: 'Transferencia', cuenta_corriente: 'Cuenta corriente', mixto: 'Pago mixto',
};

const INVOICE_LABEL = { 1: 'Factura A', 6: 'Factura B', 11: 'Factura C' };

function formatInvoiceNumber(puntoVenta, number) {
  const pv = String(puntoVenta || 1).padStart(5, '0');
  const n = String(number || 0).padStart(8, '0');
  return `${pv}-${n}`;
}

export default function ReceiptModal({ sale, settings = {}, onClose }) {
  const afip = sale?.afip || null;
  const hasCae = !!(afip?.cae || sale?.cae);
  const [qrDataUrl, setQrDataUrl] = useState(afip?.qr_data_url || null);

  // Load QR for historical receipts (no afip.qr_data_url in create response)
  useEffect(() => {
    if (hasCae && !afip?.qr_data_url && sale?.id) {
      afipApi.getSaleQR(sale.id).then(r => setQrDataUrl(r.qr_data_url)).catch(() => {});
    }
  }, [sale?.id]);
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
      <div className="rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]" style={{ backgroundColor: 'var(--surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>Recibo #{sale.ticket_number}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-secondary text-sm px-3 py-1.5">
              <Printer size={15} /> Imprimir
            </button>
            <button onClick={onClose} style={{ color: 'var(--muted)' }} className="hover:opacity-70">
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

            {/* AFIP data */}
            {hasCae && (() => {
              const cae = afip?.cae || sale?.cae;
              const caeVto = afip?.cae_vto || sale?.cae_vto;
              const invoiceType = afip?.invoice_type || sale?.invoice_type;
              const invoiceNumber = afip?.invoice_number || sale?.invoice_number;
              const puntoVenta = afip?.punto_venta || 1;
              const typeLabel = INVOICE_LABEL[invoiceType] || `Tipo ${invoiceType}`;
              return (
                <div className="space-y-1">
                  <p className="font-bold text-center">{typeLabel} N° {formatInvoiceNumber(puntoVenta, invoiceNumber)}</p>
                  <p><span className="font-semibold">CAE:</span> {cae}</p>
                  <p><span className="font-semibold">Vto. CAE:</span> {caeVto ? new Date(caeVto + 'T00:00:00').toLocaleDateString('es-AR') : '—'}</p>
                  {qrDataUrl && (
                    <div className="flex justify-center pt-1">
                      <img src={qrDataUrl} alt="QR AFIP" style={{ width: 90, height: 90 }} />
                    </div>
                  )}
                  <div className="border-t border-dashed border-gray-400 my-2" />
                </div>
              );
            })()}

            {/* Footer */}
            <p className="text-center">{footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
