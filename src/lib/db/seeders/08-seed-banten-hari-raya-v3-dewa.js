'use strict';

const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const candidatePaths = [
      path.resolve(__dirname, 'sql/seed_banten_hari_raya_v3_dewa.sql'),
      path.resolve(__dirname, '../../../../docs/seed_banten_hari_raya_v3_dewa.sql'),
      path.resolve(process.cwd(), 'docs/seed_banten_hari_raya_v3_dewa.sql'),
    ];

    let sql = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        sql = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!sql) {
      throw new Error('File seed_banten_hari_raya_v3_dewa.sql tidak ditemukan di kandidat path.');
    }

    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM hari_raya_aturan WHERE id BETWEEN 36 AND 74;
      DELETE FROM banten_set_item WHERE id BETWEEN 1088 AND 1254;
      DELETE FROM banten_set WHERE id BETWEEN 72 AND 88;
      DELETE FROM kutipan WHERE id BETWEEN 2054 AND 2145;
      DELETE FROM sumber WHERE id = 10;
      DELETE FROM banten WHERE id BETWEEN 208 AND 250;
      DELETE FROM lokasi_banten WHERE id BETWEEN 64 AND 83;
      DELETE FROM upacara WHERE id IN (42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 55);
    `);
  },
};

