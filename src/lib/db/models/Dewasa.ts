import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class Dewasa extends Model<
  InferAttributes<Dewasa>,
  InferCreationAttributes<Dewasa>
> {
  declare id: number;
  declare nama: string;
  declare sifat: 'ayu' | 'ala' | null;
  declare deskripsi: string | null;

  static initModel(sequelize: Sequelize): typeof Dewasa {
    return Dewasa.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        nama: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        sifat: {
          type: DataTypes.STRING(10),
          allowNull: true,
          validate: {
            isIn: [['ayu', 'ala']],
          },
        },
        deskripsi: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'dewasa',
        timestamps: false,
      }
    );
  }
}

export default Dewasa;

