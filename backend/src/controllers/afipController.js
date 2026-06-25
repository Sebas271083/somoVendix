import { afipService } from '../services/afipService.js';
import { SaleModel } from '../models/SaleModel.js';

export const afipController = {
  async getSettings(req, res, next) {
    try {
      res.json(await afipService.getSettings(req.tenant.id));
    } catch (err) { next(err); }
  },

  async saveSettings(req, res, next) {
    try {
      await afipService.saveSettings(req.tenant.id, req.body);
      res.json({ message: 'Configuración AFIP guardada' });
    } catch (err) { next(err); }
  },

  async testConnection(req, res, next) {
    try {
      res.json(await afipService.testConnection(req.tenant.id));
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  },

  async getSaleQR(req, res, next) {
    try {
      const sale = await SaleModel.findById(req.params.id);
      if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
      const qrDataUrl = await afipService.generateQR(sale, req.tenant.id);
      if (!qrDataUrl) return res.status(404).json({ error: 'Esta venta no tiene datos AFIP' });
      res.json({ qr_data_url: qrDataUrl });
    } catch (err) { next(err); }
  },
};
