import { TenantModel } from '../models/TenantModel.js';

export const tenantMiddleware = async (req, res, next) => {
  try {
    let subdomain = null;

    // Dev: X-Tenant header
    if (req.headers['x-tenant']) {
      subdomain = req.headers['x-tenant'];
    } else {
      // Prod: extract subdomain from host (negocio.gestix.app → negocio)
      // Country-code TLDs like .com.ar need 5+ parts; generic TLDs need 4+.
      const host = (req.headers.host || '').split(':')[0]; // strip port
      const parts = host.split('.');
      const tld = parts[parts.length - 1];
      const minParts = tld.length <= 2 ? 5 : 4; // e.g. sub.domain.com.ar = 5, sub.domain.com = 4
      if (parts.length >= minParts) {
        subdomain = parts[0];
      }
    }

    if (!subdomain) {
      return res.status(400).json({ error: 'Tenant no identificado' });
    }

    const tenant = await TenantModel.findBySubdomain(subdomain);
    if (!tenant) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({ error: 'Cuenta suspendida. Contacta a soporte.' });
    }

    if (tenant.status === 'cancelled') {
      return res.status(403).json({ error: 'Cuenta cancelada.' });
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
};
