export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
export function validateUser({ name, email, password }) {
  if (!String(name ?? '').trim()) throw new Error('El nombre es obligatorio');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) throw new Error('Correo inválido');
  if (typeof password !== 'string' || password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
}
export function validateProduct({ name, price, stock }) {
  if (!String(name ?? '').trim()) throw new Error('El nombre del producto es obligatorio');
  if (!Number.isFinite(Number(price)) || Number(price) < 0) throw new Error('Precio inválido');
  if (!Number.isInteger(Number(stock)) || Number(stock) < 0) throw new Error('Inventario inválido');
}
export function calculateTotal(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('El pedido debe incluir productos');
  return items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}
