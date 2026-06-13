import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminModel } from '../models/AdminModel.js';
import { TenantModel } from '../models/TenantModel.js';
import { PlanModel } from '../models/PlanModel.js';

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

export const adminController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
      }

      const admin = await AdminModel.findByEmail(email);
      if (!admin) return res.status(401).json({ error: 'Credenciales inválidas' });

      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: 'superadmin' },
        ADMIN_SECRET,
        { expiresIn: '8h' }
      );

      res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
    } catch (err) { next(err); }
  },

  async getTenants(req, res, next) {
    try {
      res.json(await TenantModel.getAll());
    } catch (err) { next(err); }
  },

  async getStats(req, res, next) {
    try {
      res.json(await TenantModel.getStats());
    } catch (err) { next(err); }
  },

  async getTenant(req, res, next) {
    try {
      const tenant = await TenantModel.findById(req.params.id);
      if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });
      const usage = await PlanModel.getTenantUsage(req.params.id);
      res.json({ ...tenant, usage });
    } catch (err) { next(err); }
  },

  async updateTenant(req, res, next) {
    try {
      await TenantModel.update(req.params.id, req.body);
      res.json({ message: 'Tenant actualizado' });
    } catch (err) { next(err); }
  },

  async getPlans(req, res, next) {
    try {
      res.json(await PlanModel.findAll());
    } catch (err) { next(err); }
  },

  async checkTrials(req, res, next) {
    try {
      await TenantModel.checkTrials();
      res.json({ message: 'Trials revisados y actualizados' });
    } catch (err) { next(err); }
  },
};
