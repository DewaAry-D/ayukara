import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class BantenSetItem extends Model<
  InferAttributes<BantenSetItem>,
  InferCreationAttributes<BantenSetItem>
> {
  declare id: number;
  declare banten_set_id: number;
  declare banten_id: number;
  declare lokasi_id: number | null;
  declare jumlah: string | null;
  declare jumlah_min: number | null;
  declare grup_alternatif: number | null;
  declare urutan: number | null;
  declare kutipan_id: number;
  declare catatan: string | null;

  static initModel(sequelize: Sequelize): typeof BantenSetItem {
    return BantenSetItem.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        banten_set_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'banten_set',
            key: 'id',
          },
        },
        banten_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'banten',
            key: 'id',
          },
        },
        lokasi_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'lokasi_banten',
            key: 'id',
          },
        },
        jumlah: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        jumlah_min: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        grup_alternatif: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        urutan: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        kutipan_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'kutipan',
            key: 'id',
          },
        },
        catatan: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'banten_set_item',
        timestamps: false,
      }
    );
  }
}

export default BantenSetItem;

