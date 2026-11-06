import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class BantenKomponen extends Model<
  InferAttributes<BantenKomponen>,
  InferCreationAttributes<BantenKomponen>
> {
  declare id: number;
  declare banten_id: number;
  declare nama_komponen: string;
  declare jumlah: string | null;

  static initModel(sequelize: Sequelize): typeof BantenKomponen {
    return BantenKomponen.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        banten_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'banten',
            key: 'id',
          },
        },
        nama_komponen: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        jumlah: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'banten_komponen',
        timestamps: false,
      }
    );
  }
}

export default BantenKomponen;

