'use strict';

const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const candidatePaths = [
      path.resolve(__dirname, 'sql/seed_hari_raya_v2.sql'),
      path.resolve(__dirname, '../../../../docs/seed_hari_raya_v2.sql'),
      path.resolve(process.cwd(), 'docs/seed_hari_raya_v2.sql'),
    ];

    let sql = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        sql = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!sql) {
      throw new Error('File seed_hari_raya_v2.sql tidak ditemukan di kandidat path.');
    }

    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM hari_raya_aturan WHERE id BETWEEN 21 AND 35;
      DELETE FROM kutipan WHERE id BETWEEN 2049 AND 2053;
    `);
  },
};

