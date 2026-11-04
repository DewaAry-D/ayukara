'use strict';

const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const candidatePaths = [
      path.resolve(__dirname, 'sql/seed_banten.sql'),
      path.resolve(__dirname, '../../../../docs/seed_banten.sql'),
      path.resolve(process.cwd(), 'docs/seed_banten.sql'),
    ];

    let sql = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        sql = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!sql) {
      throw new Error('File seed_banten.sql tidak ditemukan di kandidat path.');
    }

    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM banten_set_item;
      DELETE FROM banten_set;
      DELETE FROM kutipan WHERE sumber_id = 1;
      DELETE FROM sumber WHERE id = 1;
      DELETE FROM banten_komponen;
      DELETE FROM banten;
      DELETE FROM lokasi_banten;
      DELETE FROM daerah;
      DELETE FROM tingkatan;
      DELETE FROM upacara_rangkaian;
      DELETE FROM upacara;
      DELETE FROM kategori_yadnya;
    `);
  },
};

