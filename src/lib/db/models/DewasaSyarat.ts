import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class DewasaSyarat extends Model<
  InferAttributes<DewasaSyarat>,
  InferCreationAttributes<DewasaSyarat>
> {
  declare id: number;
  declare dewasa_id: number;
  declare grup: CreationOptional<number>;
  declare wewaran_nilai_id: number | null;
  declare wuku_id: number | null;
  declare sasih_id: number | null;
  declare penanggal: number | null;
  declare pangelong: number | null;
  declare is_purnama: boolean | null;
  declare is_tilem: boolean | null;

  static initModel(sequelize: Sequelize): typeof DewasaSyarat {
    return DewasaSyarat.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        dewasa_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'dewasa',
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
      },
      {
        sequelize,
        tableName: 'dewasa_syarat',
        timestamps: false,
      }
    );
  }
}

export default DewasaSyarat;

