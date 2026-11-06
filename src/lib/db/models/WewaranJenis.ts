import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class WewaranJenis extends Model<
  InferAttributes<WewaranJenis>,
  InferCreationAttributes<WewaranJenis>
> {
  declare id: number;
  declare nama: string;
  declare siklus: number;

  static initModel(sequelize: Sequelize): typeof WewaranJenis {
    return WewaranJenis.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        nama: {
          type: DataTypes.STRING(20),
          allowNull: false,
          unique: true,
        },
        siklus: {
          type: DataTypes.SMALLINT,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'wewaran_jenis',
        timestamps: false,
      }
    );
  }
}

export default WewaranJenis;

