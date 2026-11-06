'use strict';

const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const candidatePaths = [
      path.resolve(__dirname, 'sql/seed_banten_v2.sql'),
      path.resolve(__dirname, '../../../../docs/seed_banten_v2.sql'),
      path.resolve(process.cwd(), 'docs/seed_banten_v2.sql'),
    ];

    let sql = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        sql = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!sql) {
      throw new Error('File seed_banten_v2.sql tidak ditemukan di kandidat path.');
    }

    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM banten_set_item WHERE banten_set_id BETWEEN 51 AND 71;
      DELETE FROM banten_set WHERE id BETWEEN 51 AND 71;
      DELETE FROM kutipan WHERE id BETWEEN 2009 AND 2048;
      DELETE FROM sumber WHERE id = 9;
      DELETE FROM banten WHERE id BETWEEN 127 AND 207;
      DELETE FROM lokasi_banten WHERE id BETWEEN 54 AND 63;
      DELETE FROM upacara WHERE id BETWEEN 29 AND 41;
      DELETE FROM tingkatan WHERE id BETWEEN 5 AND 8;
    `);
  },
};

