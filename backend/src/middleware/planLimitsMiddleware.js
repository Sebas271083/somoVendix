import { PlanModel } from '../models/PlanModel.js';

const limitExceeded = (res, resource, current, max) =>
  res.status(403).json({
    error: `Límite de plan alcanzado`,
    detail: `Tu plan permite ${max} ${resource}. Tenés ${current} activos.`,
    upgrade_required: true,
  });

export const checkProductLimit = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    if (tenant.max_products === null) return next();
    const usage = await PlanModel.getTenantUsage(tenant.id);
    if (usage.products >= tenant.max_products) {
      return limitExceeded(res, 'productos', usage.products, tenant.max_products);
    }
    next();
  } catch (err) { next(err); }
};

export const checkUserLimit = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    if (tenant.max_users === null) return next();
    const usage = await PlanModel.getTenantUsage(tenant.id);
    if (usage.users >= tenant.max_users) {
      return limitExceeded(res, 'usuarios', usage.users, tenant.max_users);
    }
    next();
  } catch (err) { next(err); }
};

export const checkSaleLimit = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    if (tenant.max_sales_per_month === null) return next();
    const usage = await PlanModel.getTenantUsage(tenant.id);
    if (usage.sales_this_month >= tenant.max_sales_per_month) {
      return limitExceeded(res, 'ventas este mes', usage.sales_this_month, tenant.max_sales_per_month);
    }
    next();
  } catch (err) { next(err); }
};

export const requireFeature = (feature) => (req, res, next) => {
  const features = req.tenant?.features || {};
  if (!features[feature]) {
    return res.status(403).json({
      error: `Módulo no disponible en tu plan`,
      feature,
      upgrade_required: true,
    });
  }
  next();
};
