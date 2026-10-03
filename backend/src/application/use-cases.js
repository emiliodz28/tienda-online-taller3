import { calculateTotal, normalizeEmail, validateProduct, validateUser } from '../domain/entities.js';
import { ConflictError, NotFoundError } from '../domain/errors.js';

export function createUseCases(
  { users, products, orders, notifications = { orderCreated: async () => ({ customer: 'disabled', admin: 'disabled' }) } },
  passwordHasher,
  { paymentInstructions = '' } = {}
) {
  return {
    register: async (data) => {
      validateUser(data);
      const email = normalizeEmail(data.email);
      if (await users.findByEmail(email)) throw new ConflictError('Ese correo ya está registrado');
      return users.create({ name: data.name.trim(), email, passwordHash: await passwordHasher.hash(data.password), role: 'user' });
    },
    login: async ({ email, password }) => {
      const user = await users.findByEmail(normalizeEmail(email));
      if (!user || !(await passwordHasher.verify(password ?? '', user.password_hash))) throw new Error('Correo o contraseña incorrectos');
      return user;
    },
    users: {
      list: () => users.list(), get: async (id) => { const x = await users.findById(id); if (!x) throw new NotFoundError('Usuario no encontrado'); return x; },
      update: async (id, data) => {
        if (data.email) data.email = normalizeEmail(data.email);
        if (data.role && !['user','admin'].includes(data.role)) throw new Error('Rol inválido');
        for (const key of ['can_access_products','can_access_orders']) if (data[key] !== undefined && typeof data[key] !== 'boolean') throw new Error(`Permiso inválido: ${key}`);
        if (data.password) { if (data.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres'); data.passwordHash = await passwordHasher.hash(data.password); }
        const x = await users.update(id, data); if (!x) throw new NotFoundError('Usuario no encontrado'); return x;
      },
      remove: async (id) => { if (!(await users.remove(id))) throw new NotFoundError('Usuario no encontrado'); }
    },
    products: {
      list: () => products.list(), get: async (id) => { const x = await products.findById(id); if (!x) throw new NotFoundError('Producto no encontrado'); return x; },
      create: async (data) => { validateProduct(data); return products.create(data); },
      update: async (id, data) => { validateProduct(data); const x = await products.update(id, data); if (!x) throw new NotFoundError('Producto no encontrado'); return x; },
      remove: async (id) => { if (!(await products.remove(id))) throw new NotFoundError('Producto no encontrado'); }
    },
    orders: {
      list: (user) => orders.list(user.role === 'admin' ? null : user.id),
      get: async (id, user) => { const x = await orders.findById(id); if (!x || (user.role !== 'admin' && String(x.user_id) !== String(user.id))) throw new NotFoundError('Pedido no encontrado'); return x; },
      create: async (userId, lines) => {
        if (!Array.isArray(lines) || !lines.length) throw new Error('Agrega al menos un producto');
        const items = [];
        for (const line of lines) {
          const quantity = Number(line.quantity);
          if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Cantidad inválida');
          const product = await products.findById(line.productId);
          if (!product) throw new NotFoundError('Producto no encontrado');
          if (Number(product.stock) < quantity) throw new Error(`Inventario insuficiente para ${product.name}`);
          items.push({ productId: product.id, quantity, price: Number(product.price) });
        }
        const created = await orders.createWithItems(userId, items, calculateTotal(items));
        let order = created;
        let emailNotifications = { customer: 'failed', admin: 'failed' };
        try {
          const [customer, persistedOrder] = await Promise.all([
            users.findById(userId),
            orders.findById(created.id)
          ]);
          if (persistedOrder) order = persistedOrder;
          emailNotifications = await notifications.orderCreated({ customer, order, paymentInstructions });
        } catch (error) {
          console.error(`No se pudieron enviar las notificaciones del pedido #${created.id}:`, error.message);
        }
        return { ...order, emailNotifications };
      },
      update: async (id, data, user) => { if (user.role !== 'admin') throw new Error('Solo administración puede cambiar el estado'); const x = await orders.updateStatus(id, data.status); if (!x) throw new NotFoundError('Pedido no encontrado'); return x; },
      remove: async (id, user) => { const order = await orders.findById(id); if (!order || (user.role !== 'admin' && String(order.user_id) !== String(user.id))) throw new NotFoundError('Pedido no encontrado'); await orders.remove(id); }
    }
  };
}
