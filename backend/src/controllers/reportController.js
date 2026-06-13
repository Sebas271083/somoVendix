import { ReportModel } from '../models/ReportModel.js';

const defaultRange = () => {
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  return { from, to };
};

export const reportController = {
  async dashboard(req, res, next) {
    try {
      res.json(await ReportModel.getDashboardStats(req.tenant.id));
    } catch (err) { next(err); }
  },

  async salesByPeriod(req, res, next) {
    try {
      const { from, to } = { ...defaultRange(), ...req.query };
      res.json(await ReportModel.getSalesByPeriod(from, to, req.tenant.id));
    } catch (err) { next(err); }
  },

  async salesByPaymentMethod(req, res, next) {
    try {
      const { from, to } = { ...defaultRange(), ...req.query };
      res.json(await ReportModel.getSalesByPaymentMethod(from, to, req.tenant.id));
    } catch (err) { next(err); }
  },

  async topProducts(req, res, next) {
    try {
      const { from, to, limit = 10 } = { ...defaultRange(), ...req.query };
      res.json(await ReportModel.getTopProducts(from, to, parseInt(limit), req.tenant.id));
    } catch (err) { next(err); }
  },

  async topCustomers(req, res, next) {
    try {
      const { from, to, limit = 10 } = { ...defaultRange(), ...req.query };
      res.json(await ReportModel.getTopCustomers(from, to, parseInt(limit), req.tenant.id));
    } catch (err) { next(err); }
  },

  async salesBySeller(req, res, next) {
    try {
      const { from, to } = { ...defaultRange(), ...req.query };
      res.json(await ReportModel.getSalesBySeller(from, to, req.tenant.id));
    } catch (err) { next(err); }
  },

  async salesByCategory(req, res, next) {
    try {
      const { from, to } = { ...defaultRange(), ...req.query };
      res.json(await ReportModel.getSalesByCategory(from, to, req.tenant.id));
    } catch (err) { next(err); }
  },

  async inventoryValue(req, res, next) {
    try {
      res.json(await ReportModel.getInventoryValue(req.tenant.id));
    } catch (err) { next(err); }
  },
};
