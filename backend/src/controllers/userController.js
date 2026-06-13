import bcrypt from 'bcryptjs';
import { UserModel } from '../models/UserModel.js';

export const userController = {
  async list(req, res, next) {
    try {
      res.json(await UserModel.findAll(req.tenant.id));
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { name, email, password, role } = req.body;
      const hashed = await bcrypt.hash(password, 10);
      const id = await UserModel.create({ name, email, password: hashed, role, tenant_id: req.tenant.id });
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
