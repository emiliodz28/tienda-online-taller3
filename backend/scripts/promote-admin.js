import 'dotenv/config';
import pg from 'pg';

const email = String(process.argv[2] ?? '').trim().toLowerCase();
if (!email) {
  console.error('Uso: node scripts/promote-admin.js correo@ejemplo.com');
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en backend/.env');
  process.exit(2);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const result = await pool.query(
    `UPDATE users
     SET role = 'admin', can_access_products = TRUE, can_access_orders = TRUE
     WHERE lower(email) = $1
     RETURNING id, name, email, role`,
    [email]
  );
  if (!result.rowCount) {
    console.error(`No se encontró una cuenta con el correo ${email}. Regístrala primero.`);
    process.exitCode = 1;
  } else {
    console.log(`Cuenta habilitada como administradora: ${result.rows[0].email}`);
  }
} catch (error) {
  console.error(`No se pudo actualizar la cuenta: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
