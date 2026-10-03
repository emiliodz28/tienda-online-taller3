const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export function buildOrderEmail({ customer, order, paymentInstructions, audience }) {
  const reference = `PEDIDO-${order.id}`;
  const instructions = paymentInstructions || 'Contacta a la tienda para recibir los datos de pago.';
  const items = (order.items ?? []).map((item) => {
    const name = item.product_name ?? `Producto ${item.product_id ?? item.productId}`;
    const unitPrice = Number(item.unit_price ?? item.price);
    const quantity = Number(item.quantity);
    return {
      name,
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity
    };
  });
  const text = [
    `Pedido: #${order.id}`,
    `Referencia de pago: ${reference}`,
    `Cliente: ${customer.name} (${customer.email})`,
    'Estado: Pendiente de pago',
    '',
    'Detalle:',
    ...items.map((item) => `${item.quantity} x ${item.name} | $${item.unitPrice.toFixed(2)} c/u | $${item.subtotal.toFixed(2)}`),
    '',
    `Total: $${Number(order.total).toFixed(2)}`,
    '',
    'Instrucciones para completar el pago:',
    instructions
  ].join('\n');
  const htmlItems = items.map((item) => `<li>${item.quantity} x ${escapeHtml(item.name)} - $${item.unitPrice.toFixed(2)} c/u - $${item.subtotal.toFixed(2)}</li>`).join('');
  const title = audience === 'admin' ? 'Nuevo pedido recibido' : 'Tu pedido está pendiente de pago';
  const html = `<h2>${title}</h2>
    <p>Pedido <strong>#${escapeHtml(order.id)}</strong> | Referencia: <strong>${escapeHtml(reference)}</strong></p>
    <p>Cliente: ${escapeHtml(customer.name)} (${escapeHtml(customer.email)})</p>
    <p>Estado: Pendiente de pago</p><ul>${htmlItems}</ul>
    <p><strong>Total: $${Number(order.total).toFixed(2)}</strong></p>
    <h3>Instrucciones de pago</h3><pre>${escapeHtml(instructions)}</pre>`;
  return { text, html, reference };
}
