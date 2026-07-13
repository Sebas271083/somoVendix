import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ExpenseModel } from '../models/ExpenseModel.js';

const require = createRequire(import.meta.url);
const multer = require('multer');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECEIPTS_DIR = path.resolve(__dirname, '../../../public/uploads/receipts');
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `receipt_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|pdf/.test(file.mimetype);
    cb(ok ? null : new Error('Solo imágenes y PDF'), ok);
  },
});

export const expenseController = {
  async list(req, res, next) {
    try {
      const tenant_id = req.tenant.id;
      await ExpenseModel.updateOverdue(tenant_id);
      res.json(await ExpenseModel.findAll({ ...req.query, tenant_id }));
    } catch (err) { next(err); }
  },

  async summary(req, res, next) {
    try {
      await ExpenseModel.updateOverdue(req.tenant.id);
      res.json(await ExpenseModel.getSummary(req.tenant.id));
    } catch (err) { next(err); }
  },

  async categories(req, res, next) {
    try {
      res.json(await ExpenseModel.getCategories(req.tenant.id));
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const expense = await ExpenseModel.findById(req.params.id);
      if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });
      res.json(expense);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { description, amount } = req.body;
      if (!description || !amount) return res.status(400).json({ error: 'Descripción y monto son obligatorios' });
      const is_admin = req.user.role === 'admin' || req.user.role === 'superadmin';
      const id = await ExpenseModel.create({
        ...req.body,
        user_id: req.user.id,
        tenant_id: req.tenant.id,
        is_admin,
      });
      res.status(201).json({ id });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await ExpenseModel.update(req.params.id, req.body);
      res.json({ message: 'Gasto actualizado' });
    } catch (err) { next(err); }
  },

  async markPaid(req, res, next) {
    try {
      await ExpenseModel.markPaid(req.params.id, req.user.id, req.tenant.id);
      res.json({ message: 'Gasto marcado como pagado' });
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      await ExpenseModel.delete(req.params.id);
      res.json({ message: 'Gasto eliminado' });
    } catch (err) { next(err); }
  },

  uploadReceipt: [
    upload.single('receipt'),
    async (req, res, next) => {
      try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
        const receipt_path = `/uploads/receipts/${req.file.filename}`;
        await ExpenseModel.setReceiptPath(req.params.id, receipt_path);
        res.json({ receipt_path });
      } catch (err) { next(err); }
    },
  ],

  async approve(req, res, next) {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Sin permisos para aprobar gastos' });
      }
      await ExpenseModel.approve(req.params.id, req.user.id);
      res.json({ message: 'Gasto aprobado' });
    } catch (err) { next(err); }
  },

  async reject(req, res, next) {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Sin permisos para rechazar gastos' });
      }
      await ExpenseModel.reject(req.params.id, req.user.id, req.body.notes);
      res.json({ message: 'Gasto rechazado' });
    } catch (err) { next(err); }
  },
};
