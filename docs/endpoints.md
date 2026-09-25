# Especificación de endpoints

Base URL local: `http://localhost:3000/api`. Las rutas protegidas reciben `Authorization: Bearer <token>`. El registro crea usuarios con rol `user` y sin acceso a módulos. El administrador concede acceso a productos y pedidos de forma independiente. `admin` puede entrar a todos los módulos y realizar todas las operaciones.

| Método | Ruta | Acceso | Función |
|---|---|---|---|
| POST | `/auth/register` | Público | Registrar usuario (`name`, `email`, `password`) |
| POST | `/auth/login` | Público | Iniciar sesión; responde JWT y usuario sin hash |
| GET | `/users` | Admin | Listar usuarios y permisos asignados |
| GET | `/users/:id` | Propietario o admin | Consultar usuario |
| PUT | `/users/:id` | Propietario o admin | Actualizar nombre/correo y opcionalmente contraseña (mínimo 8 caracteres). Solo admin asigna `role` (`user`/`admin`), `can_access_products` y `can_access_orders` |
| DELETE | `/users/:id` | Admin | Eliminar usuario (si no tiene pedidos asociados) |
| GET | `/products` | Admin o usuario con `can_access_products` | Listar catálogo |
| GET | `/products/:id` | Admin o usuario con `can_access_products` | Consultar producto |
| POST | `/products` | Admin | Crear producto (`name`, `description`, `price`, `stock`) |
| PUT | `/products/:id` | Admin | Reemplazar datos editables de producto |
| DELETE | `/products/:id` | Admin | Eliminar producto sin partidas históricas |
| GET | `/orders` | Admin o usuario con `can_access_orders` | Listar pedidos propios; admin lista todos |
| GET | `/orders/:id` | Admin o usuario con `can_access_orders` | Consultar pedido propio y partidas |
| POST | `/orders` | Admin o usuario autorizado para productos y pedidos | Crear pedido (`items: [{productId, quantity}]`) |
| PUT | `/orders/:id` | Admin | Cambiar estado (`pending`, `paid`, `shipped`, `cancelled`) |
| DELETE | `/orders/:id` | Admin o usuario con `can_access_orders` | Eliminar pedido propio |
| GET | `/health` | Público | Verificar disponibilidad de API |

Errores usan JSON `{ "error": "mensaje" }`; estados habituales: 400 validación, 401 falta de autenticación, 403 permisos, 404 recurso y 409 correo duplicado.
