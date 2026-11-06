import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class HariRayaAturan extends Model<
  InferAttributes<HariRayaAturan>,
  InferCreationAttributes<HariRayaAturan>
> {
  declare id: number;
  declare upacara_id: number;
  declare grup: CreationOptional<number>;
  declare wewaran_nilai_id: number | null;
  declare wuku_id: number | null;
  declare sasih_id: number | null;
  declare penanggal: number | null;
  declare pangelong: number | null;
  declare is_purnama: boolean | null;
  declare is_tilem: boolean | null;
  declare penjelasan_penentuan: string | null;
  declare kutipan_id: number | null;
  declare status: CreationOptional<'unverified' | 'verified'>;

  static initModel(sequelize: Sequelize): typeof HariRayaAturan {
    return HariRayaAturan.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        upacara_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'upacara',
            key: 'id',
          },
        },
        grup: {
          type: DataTypes.SMALLINT,
          allowNull: false,
          defaultValue: 1,
        },
        wewaran_nilai_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'wewaran_nilai',
            key: 'id',
          },
        },
        wuku_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'wuku',
            key: 'id',
          },
        },
        sasih_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'sasih',
            key: 'id',
          },
        },
        penanggal: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        pangelong: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        is_purnama: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        is_tilem: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        penjelasan_penentuan: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        kutipan_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'kutipan',
            key: 'id',
          },
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'unverified',
          validate: {
            isIn: [['unverified', 'verified']],
          },
        },
      },
      {
        sequelize,
        tableName: 'hari_raya_aturan',
        timestamps: false,
      }
    );
  }
}

export default HariRayaAturan;

