import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { ConflictError, NotFoundError } from '../domain/errors.js';

const publicUser = (user) => {
  if (!user) return user;
  const { password_hash, passwordHash, ...safe } = user;
  return safe;
};

export function buildHttp(use) {
  const app = express();
  app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
  app.use(express.json());

  const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const auth = asyncRoute(async (req, res, next) => {
    try {
      const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      const claims = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await use.users.get(claims.id);
      req.user = publicUser(currentUser);
      next();
    } catch {
      res.status(401).json({ error: 'Autenticación requerida' });
    }
  });
  const admin = (req, res, next) => req.user?.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Se requiere rol administrador' });
  const moduleAccess = (module) => (req, res, next) => {
    if (req.user?.role === 'admin' || req.user?.[`can_access_${module}`]) return next();
    return res.status(403).json({ error: `El administrador no te ha otorgado acceso a ${module === 'products' ? 'productos' : 'pedidos'}` });
  };
  const productAccess = moduleAccess('products');
  const orderAccess = moduleAccess('orders');

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/api/auth/register', asyncRoute(async (req, res) => res.status(201).json(await use.register(req.body))));
  app.post('/api/auth/login', asyncRoute(async (req, res) => {
    const user = await use.login(req.body);
    res.json({ token: jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' }), user: publicUser(user) });
  }));

  app.get('/api/users', auth, admin, asyncRoute(async (_req, res) => res.json(await use.users.list())));
  app.get('/api/users/:id', auth, asyncRoute(async (req, res) => {
    if (req.user.role !== 'admin' && String(req.user.id) !== req.params.id) return res.status(403).json({ error: 'Acceso denegado' });
    res.json(publicUser(await use.users.get(req.params.id)));
  }));
  app.put('/api/users/:id', auth, asyncRoute(async (req, res) => {
    if (req.user.role !== 'admin' && String(req.user.id) !== req.params.id) return res.status(403).json({ error: 'Acceso denegado' });
    const body = { ...req.body };
    if (req.user.role !== 'admin') {
      delete body.role;
      delete body.can_access_products;
      delete body.can_access_orders;
    }
    res.json(await use.users.update(req.params.id, body));
  }));
  app.delete('/api/users/:id', auth, admin, asyncRoute(async (req, res) => { await use.users.remove(req.params.id); res.status(204).end(); }));

  app.get('/api/products', auth, productAccess, asyncRoute(async (_req, res) => res.json(await use.products.list())));
  app.get('/api/products/:id', auth, productAccess, asyncRoute(async (req, res) => res.json(await use.products.get(req.params.id))));
  app.post('/api/products', auth, admin, asyncRoute(async (req, res) => res.status(201).json(await use.products.create(req.body))));
  app.put('/api/products/:id', auth, admin, asyncRoute(async (req, res) => res.json(await use.products.update(req.params.id, req.body))));
  app.delete('/api/products/:id', auth, admin, asyncRoute(async (req, res) => { await use.products.remove(req.params.id); res.status(204).end(); }));

  app.get('/api/orders', auth, orderAccess, asyncRoute(async (req, res) => res.json(await use.orders.list(req.user))));
  app.get('/api/orders/:id', auth, orderAccess, asyncRoute(async (req, res) => res.json(await use.orders.get(req.params.id, req.user))));
  app.post('/api/orders', auth, productAccess, orderAccess, asyncRoute(async (req, res) => res.status(201).json(await use.orders.create(req.user.id, req.body.items))));
  app.put('/api/orders/:id', auth, admin, asyncRoute(async (req, res) => res.json(await use.orders.update(req.params.id, req.body, req.user))));
  app.delete('/api/orders/:id', auth, orderAccess, asyncRoute(async (req, res) => { await use.orders.remove(req.params.id, req.user); res.status(204).end(); }));

  app.use((err, _req, res, _next) => {
    const status = err instanceof NotFoundError ? 404 : err instanceof ConflictError ? 409 : 400;
    res.status(status).json({ error: err.message || 'Error interno' });
  });
  return app;
}
