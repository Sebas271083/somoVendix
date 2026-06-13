import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/UserModel.js';

export const authController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
      }

      const tenant_id = req.tenant.id;
      const user = await UserModel.findByEmail(email, tenant_id);
      if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenant_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant_id },
        tenant: {
          id: req.tenant.id,
          name: req.tenant.name,
          subdomain: req.tenant.subdomain,
          plan_slug: req.tenant.plan_slug,
          plan_name: req.tenant.plan_name,
          status: req.tenant.status,
          trial_ends_at: req.tenant.trial_ends_at,
          features: req.tenant.features,
          max_products: req.tenant.max_products,
          max_users: req.tenant.max_users,
          max_sales_per_month: req.tenant.max_sales_per_month,
        },
      });
    } catch (err) { next(err); }
  },

  async me(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(user);
    } catch (err) { next(err); }
  },

  async changePassword(req, res, next) {
    try {
      const { current_password, new_password } = req.body;
      const user = await UserModel.findByEmail(req.user.email, req.tenant.id);
      const valid = await bcrypt.compare(current_password, user.password);
      if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      const hashed = await bcrypt.hash(new_password, 10);
      await UserModel.updatePassword(req.user.id, hashed);
      res.json({ message: 'Contraseña actualizada' });
    } catch (err) { next(err); }
  },
};
