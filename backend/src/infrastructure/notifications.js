import nodemailer from 'nodemailer';
import { buildOrderEmail } from './email-templates.js';

function createConsoleAdapter() {
  return {
    orderCreated: async ({ customer, order, paymentInstructions }) => {
      const message = buildOrderEmail({ customer, order, paymentInstructions, audience: 'customer' });
      const adminMessage = buildOrderEmail({ customer, order, paymentInstructions, audience: 'admin' });
      console.info(`[correo de prueba] Para: ${customer.email}\n${message.text}`);
      console.info(`[correo de prueba] Aviso al administrador\n${adminMessage.text}`);
      return { mode: 'console', customer: 'preview', admin: 'preview' };
    }
  };
}

function createSmtpAdapter(env) {
  const required = ['SMTP_HOST', 'SMTP_FROM', 'ADMIN_EMAIL'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Faltan variables de correo: ${missing.join(', ')}`);

  const port = Number(env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: String(env.SMTP_SECURE).toLowerCase() === 'true',
    ...(env.SMTP_USER && env.SMTP_PASS ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {})
  });
  // Mailtrap's free sandbox accepts one message per 10-second window. Serialize
  // every recipient delivery so simultaneous orders cannot bypass that limit.
  const minimumInterval = Number(env.SMTP_MIN_INTERVAL_MS ?? (
    env.SMTP_HOST === 'sandbox.smtp.mailtrap.io' ? 10_100 : 0
  ));
  let sendQueue = Promise.resolve();
  let lastSentAt = 0;

  const send = async (message) => {
    const delivery = sendQueue.then(async () => {
      const wait = Math.max(0, minimumInterval - (Date.now() - lastSentAt));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      try {
        await transport.sendMail(message);
        return 'sent';
      } catch (error) {
        console.error('Falló el envío de un correo de pedido:', error.message);
        return 'failed';
      } finally {
        lastSentAt = Date.now();
      }
    });
    sendQueue = delivery.then(() => undefined, () => undefined);
    return delivery;
  };

  return {
    orderCreated: async ({ customer, order, paymentInstructions }) => {
      const base = buildOrderEmail({ customer, order, paymentInstructions, audience: 'customer' });
      const admin = buildOrderEmail({ customer, order, paymentInstructions, audience: 'admin' });
      const customerStatus = await send({ from: env.SMTP_FROM, to: customer.email, subject: `Pedido #${order.id} - instrucciones de pago`, text: base.text, html: base.html });
      const adminStatus = await send({ from: env.SMTP_FROM, to: env.ADMIN_EMAIL, subject: `Nuevo pedido #${order.id} - ${customer.name}`, text: admin.text, html: admin.html });
      return { mode: 'smtp', customer: customerStatus, admin: adminStatus };
    }
  };
}

export function createNotificationAdapter(env = process.env) {
  const mode = String(env.MAIL_MODE ?? 'console').toLowerCase();
  if (mode === 'console') return createConsoleAdapter();
  if (mode === 'smtp') return createSmtpAdapter(env);
  throw new Error('MAIL_MODE debe ser console o smtp');
}
