import { query } from '../config/database.js';
import { emailService } from '../services/emailService.js';
import nodemailer from 'nodemailer';

export const CampaignModel = {
  async findAll(tenant_id) {
    return query(
      `SELECT c.*, u.name AS created_by_name
       FROM campaigns c JOIN users u ON c.created_by = u.id
       WHERE c.tenant_id = ? ORDER BY c.created_at DESC`,
      [tenant_id]
    );
  },

  async findById(id) {
    const rows = await query('SELECT * FROM campaigns WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ tenant_id, name, channel, subject, body, segment, created_by }) {
    const result = await query(
      `INSERT INTO campaigns (tenant_id, name, channel, subject, body, segment, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, name, channel || 'email', subject || null, body, segment || 'all', created_by]
    );
    return result.insertId;
  },

  async update(id, { name, channel, subject, body, segment }) {
    await query(
      'UPDATE campaigns SET name=?, channel=?, subject=?, body=?, segment=? WHERE id=? AND status="draft"',
      [name, channel || 'email', subject || null, body, segment || 'all', id]
    );
  },

  async delete(id) {
    await query('DELETE FROM campaigns WHERE id = ? AND status = "draft"', [id]);
  },

  // Enviar campaña de email
  async send(id, tenant_id) {
    const campaign = await CampaignModel.findById(id);
    if (!campaign || campaign.status === 'sent') {
      throw Object.assign(new Error('Campaña no válida o ya enviada'), { status: 400 });
    }
    if (campaign.channel !== 'email') {
      throw Object.assign(new Error('Envío automático solo disponible para email'), { status: 400 });
    }

    // Obtener destinatarios según segmento
    let sql = 'SELECT name, email FROM customers WHERE tenant_id = ? AND email IS NOT NULL AND email != ""';
    const params = [tenant_id];
    if (campaign.segment !== 'all') {
      sql += ' AND segment = ?';
      params.push(campaign.segment);
    }
    const recipients = await query(sql, params);
    if (!recipients.length) {
      throw Object.assign(new Error('No hay destinatarios con email para este segmento'), { status: 400 });
    }

    if (!process.env.SMTP_HOST) {
      throw Object.assign(new Error('SMTP no configurado. Configurá las variables SMTP_* en el servidor.'), { status: 503 });
    }

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const tenantRows = await query('SELECT name FROM tenants WHERE id = ?', [tenant_id]);
    const tenantName = tenantRows[0]?.name || 'Gestix';

    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      try {
        const personalizedBody = campaign.body
          .replace(/\{\{nombre\}\}/gi, r.name)
          .replace(/\{\{negocio\}\}/gi, tenantName);

        await transport.sendMail({
          from: `"${tenantName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: r.email,
          subject: campaign.subject || campaign.name,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">${personalizedBody.replace(/\n/g, '<br>')}</div>`,
        });
        sent++;
      } catch {
        failed++;
      }
    }

    await query(
      'UPDATE campaigns SET status="sent", sent_count=?, failed_count=?, sent_at=NOW() WHERE id=?',
      [sent, failed, id]
    );

    return { sent, failed, total: recipients.length };
  },

  // Para WhatsApp: devolver lista de URLs wa.me para apertura manual
  async getWhatsAppLinks(id, tenant_id) {
    const campaign = await CampaignModel.findById(id);
    if (!campaign) throw Object.assign(new Error('Campaña no encontrada'), { status: 404 });

    let sql = 'SELECT name, phone FROM customers WHERE tenant_id = ? AND phone IS NOT NULL AND phone != ""';
    const params = [tenant_id];
    if (campaign.segment !== 'all') { sql += ' AND segment = ?'; params.push(campaign.segment); }
    const recipients = await query(sql, params);

    const tenantRows = await query('SELECT name FROM tenants WHERE id = ?', [tenant_id]);
    const tenantName = tenantRows[0]?.name || '';

    return recipients.map(r => {
      const msg = campaign.body
        .replace(/\{\{nombre\}\}/gi, r.name)
        .replace(/\{\{negocio\}\}/gi, tenantName);
      const phone = r.phone.replace(/\D/g, '');
      return { name: r.name, phone: r.phone, url: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` };
    });
  },
};
