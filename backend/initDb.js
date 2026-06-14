import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSql(connection, filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Eliminar líneas de comentario antes de dividir por ;
  const sql = raw
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await connection.query(stmt);
    } catch (err) {
      // Ignorar errores cuando el objeto ya existe
      const ignorable = [
        'ER_DUP_FIELDNAME',        // columna ya existe
        'ER_DUP_KEYNAME',          // índice ya existe
        'ER_TABLE_EXISTS_ERROR',   // tabla ya existe
        'ER_DUP_ENTRY',            // dato de seed ya insertado
        'ER_MULTIPLE_PRI_KEY',     // PK ya definida
      ];
      if (ignorable.includes(err.code)) {
        console.log(`  ⚠  Ya existe (skip): ${stmt.substring(0, 70)}...`);
      } else {
        throw err;
      }
    }
  }
}

async function init() {
  console.log('Conectando a MySQL...');

  // Conectar sin especificar base de datos para poder crearla
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: false,
  });

  try {
    console.log(`Conexión exitosa a ${process.env.DB_HOST}:${process.env.DB_PORT}`);

    console.log('\n1/2 Ejecutando schema.sql (tablas base)...');
    await runSql(connection, path.join(__dirname, 'schema.sql'));
    console.log('   ✓ schema.sql completado');

    console.log('\n2/2 Ejecutando saas_migrate.sql (tablas SaaS)...');
    await runSql(connection, path.join(__dirname, 'saas_migrate.sql'));
    console.log('   ✓ saas_migrate.sql completado');

    console.log('\n✅ Base de datos inicializada correctamente.');
    console.log('   Credenciales de acceso inicial:');
    console.log('   - Admin tenant:  admin@papelera.com  / admin123');
    console.log('   - Super admin:   superadmin@gestix.app / gestix2024');
  } finally {
    await connection.end();
  }
}

init().catch(err => {
  console.error('\n❌ Error al inicializar la base de datos:');
  console.error(err.message);
  process.exit(1);
});
