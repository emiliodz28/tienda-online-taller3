import 'dotenv/config';
import { repositories, pool } from './infrastructure/postgres.js';
import { buildHttp } from './infrastructure/http.js';
import { createUseCases } from './application/use-cases.js';
import { passwordHasher } from './infrastructure/passwords.js';
import { createNotificationAdapter } from './infrastructure/notifications.js';

if (!process.env.JWT_SECRET) throw new Error('Configura JWT_SECRET en backend/.env');
const notifications = createNotificationAdapter(process.env);
const app=buildHttp(createUseCases(
  { ...repositories, notifications },
  passwordHasher,
  { paymentInstructions: process.env.PAYMENT_INSTRUCTIONS ?? '' }
));
const port=Number(process.env.PORT ?? 3000);
app.listen(port,()=>console.log(`API disponible en http://localhost:${port}/api`));
process.on('SIGINT',async()=>{await pool.end();process.exit(0);});
