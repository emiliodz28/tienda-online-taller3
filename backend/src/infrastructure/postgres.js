import pg from 'pg';
const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const cleanUser = ({ password_hash, ...user }) => user;
const findOrderById = async (id) => {
  const order = (await pool.query('SELECT * FROM orders WHERE id=$1', [id])).rows[0];
  if (!order) return null;
  order.items = (await pool.query('SELECT oi.*,p.name AS product_name FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=$1', [id])).rows;
  return order;
};
export const repositories = {
  users: {
    create: async (u) => cleanUser((await pool.query('INSERT INTO users(name,email,password_hash,role,can_access_products,can_access_orders) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[u.name,u.email,u.passwordHash,u.role,u.can_access_products ?? false,u.can_access_orders ?? false])).rows[0]),
    findById: async (id) => (await pool.query('SELECT id,name,email,role,can_access_products,can_access_orders,created_at FROM users WHERE id=$1',[id])).rows[0] ?? null,
    findByEmail: async (email) => (await pool.query('SELECT * FROM users WHERE email=$1',[email])).rows[0] ?? null,
    list: async () => (await pool.query('SELECT id,name,email,role,can_access_products,can_access_orders,created_at FROM users ORDER BY id')).rows,
    update: async (id,u) => { const r=await pool.query('UPDATE users SET name=COALESCE($2,name),email=COALESCE($3,email),role=COALESCE($4,role),password_hash=COALESCE($5,password_hash),can_access_products=COALESCE($6,can_access_products),can_access_orders=COALESCE($7,can_access_orders) WHERE id=$1 RETURNING id,name,email,role,can_access_products,can_access_orders,created_at',[id,u.name ?? null,u.email ?? null,u.role ?? null,u.passwordHash ?? null,u.can_access_products ?? null,u.can_access_orders ?? null]); return r.rows[0] ?? null; },
    remove: async (id) => (await pool.query('DELETE FROM users WHERE id=$1',[id])).rowCount > 0
  },
  products: {
    create: async (p) => (await pool.query('INSERT INTO products(name,description,price,stock) VALUES($1,$2,$3,$4) RETURNING *',[p.name,p.description ?? '',p.price,p.stock])).rows[0],
    findById: async (id) => (await pool.query('SELECT * FROM products WHERE id=$1',[id])).rows[0] ?? null,
    list: async () => (await pool.query('SELECT * FROM products ORDER BY id DESC')).rows,
    update: async (id,p) => (await pool.query('UPDATE products SET name=$2,description=$3,price=$4,stock=$5 WHERE id=$1 RETURNING *',[id,p.name,p.description ?? '',p.price,p.stock])).rows[0] ?? null,
    remove: async (id) => (await pool.query('DELETE FROM products WHERE id=$1',[id])).rowCount > 0
  },
  orders: {
    createWithItems: async (userId, items, total) => {
      const client=await pool.connect(); try { await client.query('BEGIN');
        for (const item of items) { const r=await client.query('UPDATE products SET stock=stock-$2 WHERE id=$1 AND stock >= $2 RETURNING id',[item.productId,item.quantity]); if (!r.rowCount) throw new Error('El inventario cambió; revisa disponibilidad e intenta de nuevo'); }
        const order=(await client.query('INSERT INTO orders(user_id,total) VALUES($1,$2) RETURNING *',[userId,total])).rows[0];
        for (const item of items) await client.query('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)',[order.id,item.productId,item.quantity,item.price]);
        await client.query('COMMIT'); return { ...order, items };
      } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    },
    findById: findOrderById,
    list: async (userId) => { const q=userId ? await pool.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC',[userId]) : await pool.query('SELECT * FROM orders ORDER BY id DESC'); return Promise.all(q.rows.map(({ id }) => findOrderById(id))); },
    updateStatus: async (id,status) => (await pool.query("UPDATE orders SET status=$2 WHERE id=$1 AND $2 IN ('pending','paid','shipped','cancelled') RETURNING *",[id,status])).rows[0] ?? null,
    remove: async (id) => (await pool.query('DELETE FROM orders WHERE id=$1',[id])).rowCount > 0
  }
};
