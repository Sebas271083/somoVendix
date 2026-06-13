# Resma - Punto de Venta para Papelería

## Tecnologías
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js (ESModules) + Express - arquitectura MVC
- **Base de datos:** MySQL / MariaDB

## Estructura del proyecto
```
puntoVentaPapeleras/
├── backend/
│   ├── src/
│   │   ├── config/       → Conexión a la base de datos
│   │   ├── models/       → Consultas SQL (UserModel, ProductModel, etc.)
│   │   ├── controllers/  → Lógica de negocio
│   │   ├── routes/       → Endpoints de la API
│   │   └── middleware/   → Auth (JWT) y manejo de errores
│   ├── schema.sql        → Script de creación de tablas + datos iniciales
│   └── .env              → Variables de entorno
└── frontend/
    └── src/
        ├── components/   → Layout, POS components
        ├── context/      → AuthContext, CartContext
        ├── pages/        → Login, POS, Products, Stock, Customers...
        └── services/     → api.js (axios)
```

## Instalación

### 1. Base de datos
```sql
-- En MySQL Workbench o terminal:
mysql -u root -p < backend/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # Editar con tus credenciales de MySQL
npm install
npm run dev               # Puerto 3001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev               # Puerto 5173
```

## Acceso inicial
- URL: http://localhost:5173
- **Admin:** admin@papelera.com / `admin123`
- **Vendedor:** maria@papelera.com / `admin123`

## API REST
Base URL: `http://localhost:3001/api`

| Módulo        | Endpoints principales                    |
|---------------|------------------------------------------|
| Auth          | POST /auth/login, GET /auth/me           |
| Productos     | GET/POST/PUT /products                   |
| Categorías    | GET/POST/PUT/DELETE /categories          |
| Clientes      | GET/POST/PUT /customers                  |
| Ventas        | GET/POST /sales, PATCH /sales/:id/cancel |
| Caja          | GET /cash-register/current, POST /open   |
| Proveedores   | GET/POST/PUT/DELETE /suppliers           |
| Usuarios      | GET/POST/PUT /users (solo admin)         |

## Roles
- **Admin:** acceso completo (CRUD productos, cancelar ventas, gestionar usuarios)
- **Vendedor:** vender, consultar stock, clientes, proveedores
