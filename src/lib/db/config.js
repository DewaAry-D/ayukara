// Konfigurasi koneksi database untuk sequelize-cli (migrasi & seeder).
// Mengikuti panduan neon-postgres: gunakan koneksi langsung (unpooled/direct) untuk DDL & migrasi.
const fs = require('fs');
const path = require('path');

// Muat variabel lingkungan lokal jika ada
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          if (!process.env[key]) {
            process.env[key] = value.trim();
          }
        }
      });
    }
  }
}

loadEnv();

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.replace(/^["']|["']$/g, '').replace(/\r/g, '').trim();
  if (/sslmode=(require|prefer|verify-ca)/.test(url) && !url.includes('uselibpqcompat=')) {
    url = url.replace(/sslmode=(require|prefer|verify-ca)/, (m) => 'uselibpqcompat=true&' + m);
  }
  return url;
}

const migrationUrl = normalizeDatabaseUrl(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);

const dialectOptions = migrationUrl && (/sslmode=(require|verify-full|prefer|verify-ca)/.test(migrationUrl) || migrationUrl.includes('ssl=true'))
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }
  : {};

module.exports = {
  development: {
    url: migrationUrl,
    dialect: 'postgres',
    dialectOptions,
  },
  test: {
    url: process.env.DATABASE_URL_TEST || migrationUrl,
    dialect: 'postgres',
    dialectOptions,
  },
  production: {
    url: migrationUrl,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};

