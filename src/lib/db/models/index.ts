import { Sequelize } from 'sequelize';
import { KategoriYadnya } from './KategoriYadnya';
import { Upacara } from './Upacara';
import { UpacaraRangkaian } from './UpacaraRangkaian';
import { Tingkatan } from './Tingkatan';
import { Daerah } from './Daerah';
import { LokasiBanten } from './LokasiBanten';
import { Banten } from './Banten';
import { BantenKomponen } from './BantenKomponen';
import { Sumber } from './Sumber';
import { Kutipan } from './Kutipan';
import { BantenSet } from './BantenSet';
import { BantenSetItem } from './BantenSetItem';
import { ValidasiLog } from './ValidasiLog';
import { WewaranJenis } from './WewaranJenis';
import { WewaranNilai } from './WewaranNilai';
import { Wuku } from './Wuku';
import { Sasih } from './Sasih';
import { Dewasa } from './Dewasa';
import { DewasaSyarat } from './DewasaSyarat';
import { AturanDewasaUpacara } from './AturanDewasaUpacara';
import { HariRayaAturan } from './HariRayaAturan';
import { ValidasiAturanLog } from './ValidasiAturanLog';

export {
  KategoriYadnya,
  Upacara,
  UpacaraRangkaian,
  Tingkatan,
  Daerah,
  LokasiBanten,
  Banten,
  BantenKomponen,
  Sumber,
  Kutipan,
  BantenSet,
  BantenSetItem,
  ValidasiLog,
  WewaranJenis,
  WewaranNilai,
  Wuku,
  Sasih,
  Dewasa,
  DewasaSyarat,
  AturanDewasaUpacara,
  HariRayaAturan,
  ValidasiAturanLog,
};

let initialized = false;

export function initModels(sequelize: Sequelize) {
  if (initialized) {
    return {
      KategoriYadnya,
      Upacara,
      UpacaraRangkaian,
      Tingkatan,
      Daerah,
      LokasiBanten,
      Banten,
      BantenKomponen,
      Sumber,
      Kutipan,
      BantenSet,
      BantenSetItem,
      ValidasiLog,
      WewaranJenis,
      WewaranNilai,
      Wuku,
      Sasih,
      Dewasa,
      DewasaSyarat,
      AturanDewasaUpacara,
      HariRayaAturan,
      ValidasiAturanLog,
    };
  }

  // 1. Initialize all models
  KategoriYadnya.initModel(sequelize);
  Upacara.initModel(sequelize);
  UpacaraRangkaian.initModel(sequelize);
  Tingkatan.initModel(sequelize);
  Daerah.initModel(sequelize);
  LokasiBanten.initModel(sequelize);
  Banten.initModel(sequelize);
  BantenKomponen.initModel(sequelize);
  Sumber.initModel(sequelize);
  Kutipan.initModel(sequelize);
  BantenSet.initModel(sequelize);
  BantenSetItem.initModel(sequelize);
  ValidasiLog.initModel(sequelize);
  WewaranJenis.initModel(sequelize);
  WewaranNilai.initModel(sequelize);
  Wuku.initModel(sequelize);
  Sasih.initModel(sequelize);
  Dewasa.initModel(sequelize);
  DewasaSyarat.initModel(sequelize);
  AturanDewasaUpacara.initModel(sequelize);
  HariRayaAturan.initModel(sequelize);
  ValidasiAturanLog.initModel(sequelize);

  // 2. Define associations
  // KategoriYadnya <-> Upacara
  KategoriYadnya.hasMany(Upacara, { foreignKey: 'kategori_yadnya_id', as: 'upacara_list' });
  Upacara.belongsTo(KategoriYadnya, { foreignKey: 'kategori_yadnya_id', as: 'kategori_yadnya' });

  // Upacara <-> UpacaraRangkaian
  Upacara.hasMany(UpacaraRangkaian, { foreignKey: 'upacara_id', as: 'rangkaian_list' });
  UpacaraRangkaian.belongsTo(Upacara, { foreignKey: 'upacara_id', as: 'upacara' });
  UpacaraRangkaian.belongsTo(UpacaraRangkaian, { foreignKey: 'parent_id', as: 'parent' });
  UpacaraRangkaian.hasMany(UpacaraRangkaian, { foreignKey: 'parent_id', as: 'children' });

  // Tingkatan hierarchy
  Tingkatan.belongsTo(Tingkatan, { foreignKey: 'parent_id', as: 'parent' });
  Tingkatan.hasMany(Tingkatan, { foreignKey: 'parent_id', as: 'children' });

  // Banten <-> BantenKomponen
  Banten.hasMany(BantenKomponen, { foreignKey: 'banten_id', as: 'komponen_list' });
  BantenKomponen.belongsTo(Banten, { foreignKey: 'banten_id', as: 'banten' });

  // Sumber <-> Kutipan
  Sumber.hasMany(Kutipan, { foreignKey: 'sumber_id', as: 'kutipan_list' });
  Kutipan.belongsTo(Sumber, { foreignKey: 'sumber_id', as: 'sumber' });

  // BantenSet relations
  Upacara.hasMany(BantenSet, { foreignKey: 'upacara_id', as: 'banten_sets' });
  BantenSet.belongsTo(Upacara, { foreignKey: 'upacara_id', as: 'upacara' });

  Tingkatan.hasMany(BantenSet, { foreignKey: 'tingkatan_id', as: 'banten_sets' });
  BantenSet.belongsTo(Tingkatan, { foreignKey: 'tingkatan_id', as: 'tingkatan' });

  Daerah.hasMany(BantenSet, { foreignKey: 'daerah_id', as: 'banten_sets' });
  BantenSet.belongsTo(Daerah, { foreignKey: 'daerah_id', as: 'daerah' });

  UpacaraRangkaian.hasMany(BantenSet, { foreignKey: 'rangkaian_id', as: 'banten_sets' });
  BantenSet.belongsTo(UpacaraRangkaian, { foreignKey: 'rangkaian_id', as: 'rangkaian' });

  BantenSet.hasMany(BantenSetItem, { foreignKey: 'banten_set_id', as: 'items' });
  BantenSetItem.belongsTo(BantenSet, { foreignKey: 'banten_set_id', as: 'banten_set' });

  Banten.hasMany(BantenSetItem, { foreignKey: 'banten_id', as: 'set_items' });
  BantenSetItem.belongsTo(Banten, { foreignKey: 'banten_id', as: 'banten' });

  LokasiBanten.hasMany(BantenSetItem, { foreignKey: 'lokasi_id', as: 'set_items' });
  BantenSetItem.belongsTo(LokasiBanten, { foreignKey: 'lokasi_id', as: 'lokasi' });

  Kutipan.hasMany(BantenSetItem, { foreignKey: 'kutipan_id', as: 'set_items' });
  BantenSetItem.belongsTo(Kutipan, { foreignKey: 'kutipan_id', as: 'kutipan' });

  BantenSet.hasMany(ValidasiLog, { foreignKey: 'banten_set_id', as: 'logs' });
  ValidasiLog.belongsTo(BantenSet, { foreignKey: 'banten_set_id', as: 'banten_set' });

  // Wewaran relations
  WewaranJenis.hasMany(WewaranNilai, { foreignKey: 'wewaran_jenis_id', as: 'nilai_list' });
  WewaranNilai.belongsTo(WewaranJenis, { foreignKey: 'wewaran_jenis_id', as: 'jenis' });

  // Dewasa <-> DewasaSyarat
  Dewasa.hasMany(DewasaSyarat, { foreignKey: 'dewasa_id', as: 'syarat_list' });
  DewasaSyarat.belongsTo(Dewasa, { foreignKey: 'dewasa_id', as: 'dewasa' });
  DewasaSyarat.belongsTo(WewaranNilai, { foreignKey: 'wewaran_nilai_id', as: 'wewaran_nilai' });
  DewasaSyarat.belongsTo(Wuku, { foreignKey: 'wuku_id', as: 'wuku' });
  DewasaSyarat.belongsTo(Sasih, { foreignKey: 'sasih_id', as: 'sasih' });

  // AturanDewasaUpacara relations
  Dewasa.hasMany(AturanDewasaUpacara, { foreignKey: 'dewasa_id', as: 'aturan_upacara_list' });
  AturanDewasaUpacara.belongsTo(Dewasa, { foreignKey: 'dewasa_id', as: 'dewasa' });

  Upacara.hasMany(AturanDewasaUpacara, { foreignKey: 'upacara_id', as: 'aturan_dewasa_list' });
  AturanDewasaUpacara.belongsTo(Upacara, { foreignKey: 'upacara_id', as: 'upacara' });

  KategoriYadnya.hasMany(AturanDewasaUpacara, { foreignKey: 'kategori_yadnya_id', as: 'aturan_dewasa_list' });
  AturanDewasaUpacara.belongsTo(KategoriYadnya, { foreignKey: 'kategori_yadnya_id', as: 'kategori_yadnya' });

  Kutipan.hasMany(AturanDewasaUpacara, { foreignKey: 'kutipan_id', as: 'aturan_dewasa_list' });
  AturanDewasaUpacara.belongsTo(Kutipan, { foreignKey: 'kutipan_id', as: 'kutipan' });

  AturanDewasaUpacara.hasMany(ValidasiAturanLog, { foreignKey: 'aturan_id', as: 'logs' });
  ValidasiAturanLog.belongsTo(AturanDewasaUpacara, { foreignKey: 'aturan_id', as: 'aturan' });

  // HariRayaAturan relations
  Upacara.hasMany(HariRayaAturan, { foreignKey: 'upacara_id', as: 'hari_raya_aturan_list' });
  HariRayaAturan.belongsTo(Upacara, { foreignKey: 'upacara_id', as: 'upacara' });
  HariRayaAturan.belongsTo(WewaranNilai, { foreignKey: 'wewaran_nilai_id', as: 'wewaran_nilai' });
  HariRayaAturan.belongsTo(Wuku, { foreignKey: 'wuku_id', as: 'wuku' });
  HariRayaAturan.belongsTo(Sasih, { foreignKey: 'sasih_id', as: 'sasih' });
  HariRayaAturan.belongsTo(Kutipan, { foreignKey: 'kutipan_id', as: 'kutipan' });

  initialized = true;

  return {
    KategoriYadnya,
    Upacara,
    UpacaraRangkaian,
    Tingkatan,
    Daerah,
    LokasiBanten,
    Banten,
    BantenKomponen,
    Sumber,
    Kutipan,
    BantenSet,
    BantenSetItem,
    ValidasiLog,
    WewaranJenis,
    WewaranNilai,
    Wuku,
    Sasih,
    Dewasa,
    DewasaSyarat,
    AturanDewasaUpacara,
    HariRayaAturan,
    ValidasiAturanLog,
  };
}

