import { SettingsModel } from '../models/SettingsModel.js';

export const settingsController = {
  async getAll(req, res, next) {
    try {
      res.json(await SettingsModel.getAll(req.tenant.id));
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await SettingsModel.setMany(req.body, req.tenant.id);
      res.json({ message: 'Configuración guardada' });
    } catch (err) { next(err); }
  },
};
