'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE aturan_dewasa_upacara 
      SET catatan = REGEXP_REPLACE(catatan, '^otomatis dari teks:\\s*', '', 'i')
      WHERE catatan LIKE '%otomatis dari teks:%';
    `);
  },

  async down(_queryInterface, _Sequelize) {
    // No-op
  },
};

