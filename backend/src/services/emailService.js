import nodemailer from 'nodemailer';
import { query } from '../config/database.js';

const createTransport = () => {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const emailService = {
  async sendLowStockAlert(to, tenantName, products) {
    const transport = createTransport();
    if (!transport) return;

    const rows = products.map(p =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${p.name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:center;color:#dc2626;font-weight:600">${p.stock}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280">${p.min_stock}</td>
      </tr>`
    ).join('');

    await transport.sendMail({
      from: `"Gestix" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `⚠️ Stock bajo detectado — ${tenantName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#2563eb;padding:20px 24px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Gestix · Alerta de stock</h1>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
            <p style="color:#374151;margin:0 0 16px">Los siguientes productos en <strong>${tenantName}</strong> están por debajo del stock mínimo:</p>
            <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
              <thead>
                <tr style="background:#f3f4f6">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280">Producto</th>
                  <th style="padding:8px 12px;font-size:12px;color:#6b7280">Stock actual</th>
                  <th style="padding:8px 12px;font-size:12px;color:#6b7280">Stock mínimo</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="color:#6b7280;font-size:13px;margin:16px 0 0">
              Accedé a tu sistema para reponer el stock o crear órdenes de compra.
            </p>
          </div>
        </div>`,
    });
  },

  async sendSaleReceipt(to, sale, tenantName) {
    const transport = createTransport();
    if (!transport || !to) return;

    const rows = (sale.items || []).map(item =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${item.product_name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${item.quantity}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right">$ ${Number(item.unit_price).toLocaleString('es-AR')}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">$ ${Number(item.subtotal).toLocaleString('es-AR')}</td>
      </tr>`
    ).join('');

    const METHOD = { efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia', cuenta_corriente: 'Cuenta corriente', mixto: 'Mixto', cuotas: 'Cuotas' };

    await transport.sendMail({
      from: `"${tenantName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `Comprobante de compra #${sale.ticket_number} — ${tenantName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#2563eb;padding:20px 24px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">${tenantName}</h1>
            <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">Comprobante de compra</p>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
            <p style="color:#374151;margin:0 0 4px"><strong>Ticket #${sale.ticket_number}</strong></p>
            <p style="color:#6b7280;font-size:13px;margin:0 0 16px">${new Date(sale.created_at).toLocaleString('es-AR')}</p>
            <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
              <thead>
                <tr style="background:#f3f4f6">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280">Producto</th>
                  <th style="padding:8px 12px;font-size:12px;color:#6b7280">Cant.</th>
                  <th style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:right">Precio</th>
                  <th style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:right">Subtotal</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="margin-top:16px;text-align:right">
              ${Number(sale.discount) > 0 ? `<p style="color:#16a34a;font-size:13px;margin:0 0 4px">Descuento: -$ ${Number(sale.discount).toLocaleString('es-AR')}</p>` : ''}
              <p style="font-size:18px;font-weight:700;color:#1d4ed8;margin:0">Total: $ ${Number(sale.total).toLocaleString('es-AR')}</p>
              <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Pago: ${METHOD[sale.payment_method] || sale.payment_method}</p>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;text-align:center">Gracias por su compra</p>
          </div>
        </div>`,
    });
  },

  // Revisar todos los tenants y enviar alertas de stock bajo
  async checkAndSendAlerts() {
    if (!process.env.SMTP_HOST) return;

    const tenants = await query('SELECT id, name FROM tenants WHERE status != "cancelled"');

    for (const tenant of tenants) {
      try {
        // Productos con stock bajo, sin alerta enviada en las últimas 24h
        const products = await query(
          `SELECT id, name, stock, min_stock
           FROM products
           WHERE tenant_id = ? AND active = 1 AND stock <= min_stock
             AND (last_stock_alert IS NULL OR last_stock_alert < NOW() - INTERVAL 24 HOUR)
             AND has_variants = 0`,
          [tenant.id]
        );
        if (!products.length) continue;

        // Email del admin del tenant
        const admins = await query(
          "SELECT email FROM users WHERE tenant_id = ? AND role = 'admin' AND active = 1",
          [tenant.id]
        );
        if (!admins.length) continue;

        const to = admins.map(u => u.email).join(', ');
        await emailService.sendLowStockAlert(to, tenant.name, products);

        // Marcar como alertado
        const ids = products.map(p => p.id);
        await query(
          `UPDATE products SET last_stock_alert = NOW() WHERE id IN (${ids.map(() => '?').join(',')})`,
          ids
        );

        console.log(`[stock-alert] Enviada alerta a ${to} (${products.length} productos)`);
      } catch (err) {
        console.error(`[stock-alert] Error tenant ${tenant.id}:`, err.message);
      }
    }
  },
};
