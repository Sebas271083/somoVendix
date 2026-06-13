import { PaymentModel } from '../models/PaymentModel.js';
import { CustomerModel } from '../models/CustomerModel.js';

export const paymentController = {
  async receivables(req, res, next) {
    try {
      const { min_balance = 0 } = req.query;
      const customers = await PaymentModel.getReceivables({
        min_balance: parseFloat(min_balance),
        tenant_id: req.tenant.id,
      });
      const total = await PaymentModel.getTotalReceivables(req.tenant.id);
      res.json({ customers, total });
    } catch (err) { next(err); }
  },

  async list(req, res, next) {
    try {
      res.json(await PaymentModel.findAll({ ...req.query, tenant_id: req.tenant.id }));
    } catch (err) { next(err); }
  },

  async listByCustomer(req, res, next) {
    try {
      const payments = await PaymentModel.findByCustomer(req.params.customer_id);
      const customer = await CustomerModel.findById(req.params.customer_id);
      res.json({ customer, payments });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { customer_id, sale_id, amount, method, notes } = req.body;
      if (!customer_id || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Cliente y monto son obligatorios' });
      }
      const id = await PaymentModel.create({
        customer_id, sale_id, amount, method: method || 'efectivo', notes,
        user_id: req.user.id,
        tenant_id: req.tenant.id,
      });
      res.status(201).json({ id, message: 'Pago registrado correctamente' });
    } catch (err) { next(err); }
  },
};
