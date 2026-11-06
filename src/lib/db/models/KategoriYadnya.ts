import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class KategoriYadnya extends Model<
  InferAttributes<KategoriYadnya>,
  InferCreationAttributes<KategoriYadnya>
> {
  declare id: number;
  declare nama: string;

  static initModel(sequelize: Sequelize): typeof KategoriYadnya {
    return KategoriYadnya.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        nama: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
      },
      {
        sequelize,
        tableName: 'kategori_yadnya',
        timestamps: false,
      }
    );
  }
}

export default KategoriYadnya;

