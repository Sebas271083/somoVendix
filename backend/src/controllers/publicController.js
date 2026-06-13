import { TenantModel } from '../models/TenantModel.js';
import { PlanModel } from '../models/PlanModel.js';

export const publicController = {
  async getPlans(req, res, next) {
    try {
      res.json(await PlanModel.findAll());
    } catch (err) { next(err); }
  },

  async register(req, res, next) {
    try {
      const { name, subdomain, email, adminName, adminPassword } = req.body;

      if (!name || !subdomain || !email || !adminName || !adminPassword) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }

      if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
        return res.status(400).json({
          error: 'El subdominio solo puede contener letras minúsculas, números y guiones (3-30 caracteres)',
        });
      }

      const exists = await TenantModel.subdomainExists(subdomain);
      if (exists) {
        return res.status(409).json({ error: 'El subdominio ya está en uso' });
      }

      const tenant_id = await TenantModel.create({ name, subdomain, email, adminName, adminPassword });

      res.status(201).json({
        message: 'Cuenta creada exitosamente',
        subdomain,
        tenant_id,
      });
    } catch (err) { next(err); }
  },

  async checkSubdomain(req, res, next) {
    try {
      const { subdomain } = req.params;
      const available = !(await TenantModel.subdomainExists(subdomain));
      res.json({ available });
    } catch (err) { next(err); }
  },
};
