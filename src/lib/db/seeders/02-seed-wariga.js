'use strict';

const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const candidatePaths = [
      path.resolve(__dirname, 'sql/seed_wariga.sql'),
      path.resolve(__dirname, '../../../../docs/seed_wariga.sql'),
      path.resolve(process.cwd(), 'docs/seed_wariga.sql'),
    ];

    let sql = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        sql = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!sql) {
      throw new Error('File seed_wariga.sql tidak ditemukan di kandidat path.');
    }

    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM aturan_dewasa_upacara;
      DELETE FROM dewasa_syarat;
      DELETE FROM dewasa;
      DELETE FROM sasih;
      DELETE FROM wuku;
      DELETE FROM wewaran_nilai;
      DELETE FROM wewaran_jenis;
      DELETE FROM kutipan WHERE sumber_id = 2;
      DELETE FROM sumber WHERE id = 2;
    `);
  },
};

