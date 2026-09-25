# Tienda en línea

Proyecto académico de comercio electrónico con backend Node.js/Express en arquitectura hexagonal, PostgreSQL y frontend React + Vite.

## Estructura

- `backend/`: dominio, casos de uso, puertos y adaptadores REST/PostgreSQL.
- `frontend/`: SPA organizada por autenticación, productos y pedidos.
- `docs/`: arquitectura, endpoints y guía de WSL. AWS queda preparado para una etapa posterior, cuando esté activo el laboratorio.

## Requisitos

Node.js 20+, npm y PostgreSQL 15+. Copia `backend/.env.example` a `backend/.env`, configura la conexión y crea la base `tienda_online`. En WSL, ejecuta `npm install` y `npm run dev` dentro de `backend`; en otra terminal, haz lo mismo dentro de `frontend`.

La API queda en `http://localhost:3000/api`; Vite sirve la interfaz en `http://localhost:5173`.

## Seguridad

Las contraseñas se guardan con bcrypt; nunca se devuelven en respuestas. El registro crea usuarios sin acceso a los módulos. El administrador puede asignar independientemente acceso a productos y pedidos. El rol `admin` tiene acceso completo. Configura secretos propios antes de usar fuera de desarrollo.

La primera cuenta administradora se habilita siguiendo la sección de administración de `docs/despliegue-wsl.md`. Para bases existentes, primero aplica `backend/sql/migrations/002_user_module_access.sql`.
