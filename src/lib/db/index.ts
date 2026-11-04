import { Sequelize } from 'sequelize';
import pg from 'pg';

let sequelize: Sequelize | null = null;

/**
 * Singleton instance Sequelize untuk runtime aplikasi.
 * Menggunakan DATABASE_URL (pooled via PgBouncer Neon) untuk efisiensi serverless.
 */
export function getSequelize(): Sequelize {
  if (sequelize) return sequelize;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL belum didefinisikan pada environment variable.');
  }

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
    dialectOptions: databaseUrl.includes('sslmode=require')
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

