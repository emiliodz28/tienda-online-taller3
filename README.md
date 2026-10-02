# Tienda en línea

Proyecto académico de comercio electrónico con backend Node.js/Express en arquitectura hexagonal, PostgreSQL y frontend React + Vite.

## Estructura

- `backend/`: dominio, casos de uso, puertos y adaptadores REST/PostgreSQL.
- `frontend/`: SPA organizada por autenticación, productos y pedidos.
- Los documentos de entrega académica se preparan y entregan por separado en la plataforma escolar.

## Desarrollo local

Se requiere Node.js 18 o posterior y PostgreSQL 15 o posterior. Crea la base de datos y aplica `backend/sql/schema.sql`. Configura `backend/.env` con la conexión a PostgreSQL y un `JWT_SECRET` largo.

En una terminal, instala e inicia el backend desde `backend/` con `npm install` y `npm run dev`. En otra terminal, instala e inicia el frontend desde `frontend/` con `npm install` y `npm run dev`. La API queda en `http://localhost:3000/api` y Vite en `http://localhost:5173`.

## Despliegue en AWS Academy con tres instancias

La base de datos PostgreSQL vive en `tienda-db`; la API en `tienda-back`; y Nginx sirve React en `tienda-front`. Mantén PostgreSQL accesible solo desde el grupo de seguridad del backend y el puerto 3000 solo desde el grupo del frontend.

### Backend (`tienda-back`)

Desde la raíz del repositorio, instala las dependencias con `cd ~/tienda-online-taller3/backend && npm ci`. Crea `backend/.env` con `PORT=3000`, `DATABASE_URL=postgres://tienda_app:CLAVE@IP_PRIVADA_DB:5432/tienda_online`, un `JWT_SECRET` largo y `FRONTEND_URL=http://IP_PUBLICA_FRONT`. Después detén cualquier `npm start` manual con Ctrl+C y ejecuta `bash scripts/install-service.sh`. Systemd mantendrá la API activa y la iniciará tras reiniciar la instancia. Para revisar el estado y sus registros usa `sudo systemctl status tienda-backend` y `sudo journalctl -u tienda-backend -f`.

### Frontend (`tienda-front`)

Desde `~/tienda-online-taller3/frontend`, ejecuta `bash deploy-aws.sh IP_PRIVADA_BACK`. El script compila React, instala los archivos y configura Nginx para servir la SPA y enviar `/api` al backend. Abre `http://IP_PUBLICA_FRONT` en el navegador. Nginx queda habilitado para iniciar automáticamente.

Si detienes e inicias las instancias y cambia la IP pública del frontend, actualiza `FRONTEND_URL` en `backend/.env` con la nueva IP y reinicia la API con `sudo systemctl restart tienda-backend`. Las instancias de la base y el backend deben conservar sus IP privadas o habrá que actualizar las direcciones en las configuraciones correspondientes.

La primera cuenta registrada tiene rol `user`. Después de registrarla, desde `~/tienda-online-taller3/backend` ejecuta `node scripts/promote-admin.js correo@ejemplo.com` para habilitar la administración inicial.

## Seguridad

Las contraseñas se guardan con bcrypt; nunca se devuelven en respuestas. El registro crea usuarios sin acceso a los módulos. El administrador puede asignar independientemente acceso a productos y pedidos. El rol `admin` tiene acceso completo. Configura secretos propios antes de usar fuera de desarrollo.

Para bases existentes, primero aplica `backend/sql/migrations/002_user_module_access.sql`.
