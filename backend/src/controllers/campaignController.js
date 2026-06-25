import { CampaignModel } from '../models/CampaignModel.js';

export const campaignController = {
  async list(req, res, next) {
    try { res.json(await CampaignModel.findAll(req.tenant.id)); }
    catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const c = await CampaignModel.findById(req.params.id);
      if (!c) return res.status(404).json({ error: 'Campaña no encontrada' });
      res.json(c);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const id = await CampaignModel.create({ ...req.body, tenant_id: req.tenant.id, created_by: req.user.id });
      res.status(201).json({ id });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try { await CampaignModel.update(req.params.id, req.body); res.json({ ok: true }); }
    catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try { await CampaignModel.delete(req.params.id); res.json({ ok: true }); }
    catch (err) { next(err); }
  },

  async send(req, res, next) {
    try {
      const result = await CampaignModel.send(req.params.id, req.tenant.id);
      res.json(result);
    } catch (err) { next(err); }
  },

  async whatsappLinks(req, res, next) {
    try {
      const links = await CampaignModel.getWhatsAppLinks(req.params.id, req.tenant.id);
      res.json(links);
    } catch (err) { next(err); }
  },
};
