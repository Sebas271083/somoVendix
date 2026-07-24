import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Requiere permisos de administrador' });
  }
  next();
};

// Acepta un arreglo de roles permitidos, ej: requireRole(['admin', 'manager'])
export const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso no autorizado para tu rol' });
  }
  next();
};
