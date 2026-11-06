import { Sequelize } from 'sequelize';
import pg from 'pg';

let sequelize: Sequelize | null = null;

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').replace(/\r/g, '').trim();
}

/**
 * Normalisasi databaseUrl agar pg-connection-string v2.x tidak memicu
 * SECURITY WARNING terkait sslmode=require.
 */
function normalizeDatabaseUrl(rawUrl: string): string {
  let url = cleanEnv(rawUrl);
  if (!url) return '';

  if (/sslmode=(require|prefer|verify-ca)/.test(url) && !url.includes('uselibpqcompat=')) {
    url = url.replace(/sslmode=(require|prefer|verify-ca)/, (m) => 'uselibpqcompat=true&' + m);
  }

  return url;
}

/**
 * Singleton instance Sequelize untuk runtime aplikasi.
 * Menggunakan DATABASE_URL (pooled via PgBouncer Neon) untuk efisiensi serverless.
 */
export function getSequelize(): Sequelize {
  if (sequelize) return sequelize;

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL belum didefinisikan pada environment variable.');
  }

  const databaseUrl = normalizeDatabaseUrl(rawUrl);

  const isSsl =
    /sslmode=(require|verify-full|prefer|verify-ca)/.test(databaseUrl) ||
    databaseUrl.includes('ssl=true');

  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: isSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });

  return sequelize;
}

export default getSequelize;

