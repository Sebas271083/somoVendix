import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const { LoginTicket, Wsfev1 } = require('afip-apis');
const QRCode = require('qrcode');

const WSAA_HOMO = 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
const WSAA_PROD = 'https://wsaa.afip.gov.ar/ws/services/LoginCms';
const WSFE_HOMO = 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';
const WSFE_PROD = 'https://servicios1.afip.gov.ar/wsfev1/service.asmx';

// Certs stored at backend/certs/{tenant_id}/
const CERTS_DIR = path.resolve(__dirname, '../../certs');

// TA cache per tenant: { token, sign, expiresAt }
const tokenCache = new Map();

function getCertPaths(tenant_id) {
  const dir = path.join(CERTS_DIR, String(tenant_id));
  return { dir, cert: path.join(dir, 'cert.pem'), key: path.join(dir, 'key.pem') };
}

async function loadSettings(tenant_id) {
  const rows = await query('SELECT * FROM afip_settings WHERE tenant_id = ?', [tenant_id]);
  return rows[0] || null;
}

async function getAuthToken(tenant_id, settings) {
  const cached = tokenCache.get(tenant_id);
  // Reuse if valid for at least 5 more minutes
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return { token: cached.token, sign: cached.sign };
  }

  const paths = getCertPaths(tenant_id);
  if (!fs.existsSync(paths.cert) || !fs.existsSync(paths.key)) {
    throw new Error('Archivos de certificado no encontrados. Cargue el certificado y clave privada en Configuración > AFIP.');
  }

  const wsaaUrl = settings.environment === 'produccion' ? WSAA_PROD : WSAA_HOMO;
  const lt = new LoginTicket();
  const ticket = await lt.wsaaLogin('wsfe', wsaaUrl, paths.cert, paths.key);

  const { token, sign } = ticket.credentials;
  const expiresAt = new Date(ticket.header.expirationTime).getTime();
  tokenCache.set(tenant_id, { token, sign, expiresAt });
  return { token, sign };
}

function getWsfe(settings) {
  const url = settings.environment === 'produccion' ? WSFE_PROD : WSFE_HOMO;
  return new Wsfev1(url);
}

function normalizeCuit(cuit) {
  return parseInt(String(cuit || '').replace(/\D/g, '')) || 0;
}

function buildAfipQrUrl(sale, settings) {
  const cuit = normalizeCuit(settings.cuit);
  const tipoDocRec = sale.customer_document_type === 'CUIT' ? 80
    : sale.customer_document_type === 'DNI' ? 96 : 99;
  const nroDocRec = (tipoDocRec !== 99 && sale.customer_document_number)
    ? parseInt(String(sale.customer_document_number).replace(/\D/g, ''))
    : 0;

  const data = {
    ver: 1,
    fecha: new Date(sale.created_at).toISOString().split('T')[0],
    cuit,
    ptoVta: parseInt(settings.punto_venta),
    tipoCmp: sale.invoice_type,
    nroCmp: sale.invoice_number,
    importe: parseFloat(sale.total),
    moneda: 'PES',
    ctz: 1,
    tipoDocRec,
    nroDocRec,
    tipoCodAut: 'E',
    codAut: parseInt(sale.cae),
  };

  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `https://www.afip.gob.ar/fe/qr/?p=${encoded}`;
}

const INVOICE_LABEL = { 1: 'Factura A', 6: 'Factura B', 11: 'Factura C' };

export const afipService = {
  async getSettings(tenant_id) {
    const s = await loadSettings(tenant_id);
    if (!s) {
      return { enabled: false, environment: 'homologacion', iva_condition: 'responsable_inscripto', cuit: '', punto_venta: 1, has_cert: false, has_key: false };
    }
    return {
      cuit: s.cuit,
      punto_venta: s.punto_venta,
      iva_condition: s.iva_condition,
      environment: s.environment,
      enabled: !!s.enabled,
      has_cert: !!s.cert_pem,
      has_key: !!s.key_pem,
    };
  },

  async saveSettings(tenant_id, data) {
    const { cuit, punto_venta, iva_condition, environment, enabled, cert_pem, key_pem } = data;
    const existing = await loadSettings(tenant_id);

    if (existing) {
      const sets = [], vals = [];
      const f = (k, v) => { if (v !== undefined && v !== null) { sets.push(`\`${k}\`=?`); vals.push(v); } };
      f('cuit', cuit);
      f('punto_venta', punto_venta);
      f('iva_condition', iva_condition);
      f('environment', environment);
      if (enabled !== undefined) { sets.push('`enabled`=?'); vals.push(enabled ? 1 : 0); }
      if (cert_pem && cert_pem.trim()) { sets.push('`cert_pem`=?'); vals.push(cert_pem.trim()); }
      if (key_pem && key_pem.trim()) { sets.push('`key_pem`=?'); vals.push(key_pem.trim()); }
      if (sets.length) {
        vals.push(tenant_id);
        await query(`UPDATE afip_settings SET ${sets.join(',')} WHERE tenant_id=?`, vals);
      }
    } else {
      await query(
        `INSERT INTO afip_settings (tenant_id,cuit,punto_venta,iva_condition,environment,enabled,cert_pem,key_pem)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          tenant_id,
          cuit || '',
          punto_venta || 1,
          iva_condition || 'responsable_inscripto',
          environment || 'homologacion',
          enabled ? 1 : 0,
          cert_pem?.trim() || null,
          key_pem?.trim() || null,
        ]
      );
    }

    // Write PEM files to disk so LoginTicket can read them
    const fresh = await loadSettings(tenant_id);
    if (fresh?.cert_pem || fresh?.key_pem) {
      const paths = getCertPaths(tenant_id);
      fs.mkdirSync(paths.dir, { recursive: true });
      if (fresh.cert_pem) fs.writeFileSync(paths.cert, fresh.cert_pem, 'utf8');
      if (fresh.key_pem) fs.writeFileSync(paths.key, fresh.key_pem, 'utf8');
    }

    // Invalidate cached token on settings change
    tokenCache.delete(tenant_id);
  },

  async testConnection(tenant_id) {
    const settings = await loadSettings(tenant_id);
    if (!settings?.enabled) {
      const err = new Error('AFIP está deshabilitado. Actívelo en la configuración.');
      err.status = 400;
      throw err;
    }
    const cuit = normalizeCuit(settings.cuit);
    const { token, sign } = await getAuthToken(tenant_id, settings);
    const wsfe = getWsfe(settings);
    const result = await wsfe.FEParamGetPtosVenta({
      Auth: { Token: token, Sign: sign, Cuit: cuit },
    });
    return { ok: true, ambiente: settings.environment, detalle: result };
  },

  async requestCAE(tenant_id, sale) {
    const settings = await loadSettings(tenant_id);
    if (!settings?.enabled) return null;

    const cuit = normalizeCuit(settings.cuit);
    const { token, sign } = await getAuthToken(tenant_id, settings);
    const wsfe = getWsfe(settings);

    // Determine invoice type based on issuer and receiver condition
    let invoiceType;
    if (settings.iva_condition === 'monotributista') {
      invoiceType = 11; // Factura C
    } else if (sale.customer_iva_condition === 'responsable_inscripto') {
      invoiceType = 1;  // Factura A
    } else {
      invoiceType = 6;  // Factura B (default for consumers)
    }

    // Last authorized voucher number for this type + punto de venta
    const lastRes = await wsfe.FECompUltimoAutorizado({
      Auth: { Token: token, Sign: sign, Cuit: cuit },
      PtoVta: parseInt(settings.punto_venta),
      CbteTipo: invoiceType,
    });
    const lastNum = parseInt(lastRes?.FECompUltimoAutorizadoResult?.CbteNro || '0');
    const invoiceNumber = lastNum + 1;

    // YYYYMMDD date
    const d = new Date(sale.created_at);
    const cbtefch = parseInt(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    );

    // Amounts — Factura C has no IVA breakdown
    const total = parseFloat(sale.total);
    let neto = total, iva = 0;
    if (invoiceType !== 11) {
      neto = parseFloat((total / 1.21).toFixed(2));
      iva = parseFloat((total - neto).toFixed(2));
    }

    // Customer document
    let docTipo = 99, docNro = 0;
    if (sale.customer_document_type === 'CUIT' && sale.customer_document_number) {
      docTipo = 80;
      docNro = parseInt(String(sale.customer_document_number).replace(/\D/g, ''));
    } else if (sale.customer_document_type === 'DNI' && sale.customer_document_number) {
      docTipo = 96;
      docNro = parseInt(String(sale.customer_document_number).replace(/\D/g, ''));
    }

    const detReq = {
      Concepto: 1,
      DocTipo: docTipo,
      DocNro: docNro,
      CbteDesde: invoiceNumber,
      CbteHasta: invoiceNumber,
      CbteFch: cbtefch,
      ImpTotal: total,
      ImpTotConc: 0,
      ImpNeto: neto,
      ImpOpEx: 0,
      ImpIVA: iva,
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
    };

    if (invoiceType !== 11) {
      detReq.Iva = { AlicIva: { Id: 5, BaseImp: neto, Importe: iva } };
    }

    const caeRes = await wsfe.FECAESolicitar({
      Auth: { Token: token, Sign: sign, Cuit: cuit },
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: parseInt(settings.punto_venta),
          CbteTipo: invoiceType,
        },
        FeDetReq: { FECAEDetRequest: detReq },
      },
    });

    const result = caeRes?.FECAESolicitarResult;
    const errors = result?.Errors;
    if (errors?.Err) {
      const errs = Array.isArray(errors.Err) ? errors.Err : [errors.Err];
      throw new Error(`AFIP: ${errs.map(e => `${e.Code}: ${e.Msg}`).join('; ')}`);
    }

    const detResp = result?.FeDetResp?.FECAEDetResponse;
    if (detResp?.Resultado !== 'A') {
      const obs = detResp?.Observaciones?.Obs;
      const msg = obs
        ? (Array.isArray(obs) ? obs.map(o => o.Msg).join('; ') : obs.Msg)
        : 'Sin detalle';
      throw new Error(`CAE rechazado: ${msg}`);
    }

    const cae = detResp.CAE;
    const rawVto = detResp.CAEFchVto;
    const caeVto = rawVto
      ? `${rawVto.substring(0, 4)}-${rawVto.substring(4, 6)}-${rawVto.substring(6, 8)}`
      : null;

    await query(
      'UPDATE sales SET invoice_type=?, invoice_number=?, cae=?, cae_vto=? WHERE id=?',
      [invoiceType, invoiceNumber, cae, caeVto, sale.id]
    );

    const saleForQr = { ...sale, invoice_type: invoiceType, invoice_number: invoiceNumber, cae };
    const qrUrl = buildAfipQrUrl(saleForQr, settings);
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 130, margin: 1 });

    return {
      invoice_type: invoiceType,
      invoice_type_label: INVOICE_LABEL[invoiceType] || `Tipo ${invoiceType}`,
      invoice_number: invoiceNumber,
      punto_venta: parseInt(settings.punto_venta),
      cae,
      cae_vto: caeVto,
      qr_data_url: qrDataUrl,
    };
  },

  async generateQR(sale, tenant_id) {
    const settings = await loadSettings(tenant_id);
    if (!settings || !sale.cae) return null;
    const qrUrl = buildAfipQrUrl(sale, settings);
    return QRCode.toDataURL(qrUrl, { width: 130, margin: 1 });
  },

  invalidateToken(tenant_id) {
    tokenCache.delete(tenant_id);
  },
};
