# Guía de ejecución en WSL

## Preparación

Abre Ubuntu/WSL y entra en la carpeta del proyecto montada desde Windows:

```bash
cd /mnt/c/Users/Emilio\ Zamorano/taller3
```

Instala Node.js 20 o posterior y PostgreSQL 15 o posterior en la distribución WSL. Crea la base y aplica el esquema:

```bash
sudo service postgresql start
sudo -u postgres psql -c "CREATE DATABASE tienda_online;"
sudo -u postgres psql -d tienda_online -f backend/sql/schema.sql
```

Si ya tenías una base creada con el esquema anterior, aplica también la migración de permisos:

```bash
sudo -u postgres psql -d tienda_online -f backend/sql/migrations/002_user_module_access.sql
```

En `backend`, crea la configuración local y ajusta usuario/contraseña de PostgreSQL:

```bash
cd backend
cp .env.example .env
nano .env
npm install
npm run dev
```

En otra terminal WSL, inicia React + Vite:

```bash
cd /mnt/c/Users/Emilio\ Zamorano/taller3/frontend
cp .env.example .env
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador de Windows; WSL reenvía localhost. API: `http://localhost:3000/api/health`.

## Cuenta administradora para catálogo

Registra una cuenta desde la interfaz. Luego, desde WSL, asígnale rol administrador para habilitar gestión de tenis, pedidos y usuarios:

```bash
sudo -u postgres psql -d tienda_online -c "UPDATE users SET role='admin' WHERE email='tu-correo@ejemplo.com';"
```

Vuelve a iniciar sesión. Después podrás abrir **USUARIOS** en la barra de navegación y habilitar individualmente los módulos **Tenis / catálogo** y **Pedidos** para cada usuario. Los registros nuevos comienzan sin acceso. Si otorgas solo catálogo, la persona verá productos pero no podrá crear pedidos.

## Despliegue AWS (etapa posterior)

El proyecto queda listo para preparar despliegue cuando se active el laboratorio AWS. En esa etapa se definirán recursos concretos para API, frontend y PostgreSQL administrado, variables secretas, red y procedimiento de publicación según los servicios habilitados por el laboratorio. No se necesitan ni se configuran credenciales AWS ahora.
