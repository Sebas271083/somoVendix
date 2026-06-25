import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_NAME = process.env.DB_NAME || 'pos_papelera';

async function runSql(connection, filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');

  // Strip single-line comments and filter out CREATE DATABASE / USE statements
  // because we handle those ourselves using DB_NAME env var
  const lines = raw
    .split('\n')
    .filter(line => {
      const t = line.trim();
      if (t.startsWith('--')) return false;
      if (/^CREATE\s+DATABASE/i.test(t)) return false;
      if (/^USE\s+/i.test(t)) return false;
      return true;
    });

  const statements = lines
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const ignorable = new Set([
    'ER_DUP_FIELDNAME',
    'ER_DUP_KEYNAME',
    'ER_TABLE_EXISTS_ERROR',
    'ER_DUP_ENTRY',
    'ER_MULTIPLE_PRI_KEY',
    'ER_CANT_DROP_FIELD_OR_KEY',
  ]);

  for (const stmt of statements) {
    try {
      await connection.query(stmt);
    } catch (err) {
      if (ignorable.has(err.code)) {
        console.log(`  ⚠  Ya existe (skip): ${stmt.substring(0, 80).replace(/\n/g, ' ')}…`);
      } else {
        console.error(`\n❌ Error en statement:\n${stmt}\n`);
        throw err;
      }
    }
  }
}

async function init() {
  console.log(`\n🔧 Iniciando configuración de BD (${DB_NAME}) en ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}…`);

  // Paso 1: conectar SIN base de datos para crearla si no existe
  const rootConn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: false,
  });

  try {
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`  ✓ Base de datos "${DB_NAME}" lista`);
  } catch (err) {
    // Algunos hostings no permiten CREATE DATABASE — si ya existe, continuamos
    if (err.code === 'ER_DBACCESS_DENIED_ERROR' || err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log(`  ⚠  Sin permisos para CREATE DATABASE — asumiendo que "${DB_NAME}" ya existe`);
    } else {
      throw err;
    }
  } finally {
    await rootConn.end();
  }

  // Paso 2: reconectar CON la base de datos especificada
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: false,
  });

  const migrations = [
    ['schema.sql',               'Tablas base'],
    ['saas_migrate.sql',         'Tablas SaaS / tenants'],
    ['migrate_v2.sql',           'Mejoras POS'],
    ['migrate_v3.sql',           'Devoluciones'],
    ['migrate_billing.sql',      'Planes y billing'],
    ['migrate_stock_advanced.sql','Depósitos, stocktaking, FIFO'],
    ['migrate_crm.sql',          'CRM, campañas'],
    ['migrate_v4.sql',           'Presupuestos, cuotas, notas de crédito'],
    ['migrate_v5.sql',           'AFIP facturación electrónica'],
    ['migrate_v6.sql',           'Caja mejorada'],
    ['migrate_v7.sql',           'Gastos avanzados'],
    ['migrate_variants.sql',     'Variantes de producto'],
  ];

  try {
    for (let i = 0; i < migrations.length; i++) {
      const [file, desc] = migrations[i];
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.log(`  ⏭  ${file} no encontrado, saltando…`);
        continue;
      }
      console.log(`  [${i + 1}/${migrations.length}] ${desc}…`);
      await runSql(conn, filePath);
      console.log(`         ✓ ${file}`);
    }

    console.log('\n✅ Base de datos configurada correctamente.');
    console.log('   Credenciales de acceso inicial:');
    console.log('   - Admin tenant:  admin@papelera.com  / admin123');
    console.log('   - Super admin:   superadmin@gestix.app / gestix2024');
  } finally {
    await conn.end();
  }
}

export { init as initDb };

// Si se ejecuta directamente (node initDb.js), correr init
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  init().catch(err => {
    console.error('\n❌ Error al inicializar la base de datos:', err.message);
    process.exit(1);
  });
}
