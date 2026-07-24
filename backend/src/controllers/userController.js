import bcrypt from 'bcryptjs';
import { UserModel } from '../models/UserModel.js';
import { emailService } from '../services/emailService.js';

export const userController = {
  async list(req, res, next) {
    try {
      const users = await UserModel.findAll(req.tenant.id);
      res.json({
        users,
        max_users: req.tenant.max_users ?? null,
      });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { name, email, password, role, sendEmail = true } = req.body;
      const hashed = await bcrypt.hash(password, 10);
      const id = await UserModel.create({ name, email, password: hashed, role, tenant_id: req.tenant.id });

      if (sendEmail) {
        emailService.sendUserWelcome(email, name, password, req.tenant.name, req.tenant.subdomain)
          .catch(err => console.error('[user-welcome] Email falló:', err.message));
      }

      res.status(201).json({ id });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await UserModel.update(req.params.id, req.body);
      res.json({ message: 'Usuario actualizado' });
    } catch (err) { next(err); }
  },

  async resetPassword(req, res, next) {
    try {
      const hashed = await bcrypt.hash(req.body.password, 10);
      await UserModel.updatePassword(req.params.id, hashed);
      res.json({ message: 'Contraseña restablecida' });
    } catch (err) { next(err); }
  },
};
