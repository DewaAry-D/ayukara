import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class Wuku extends Model<
  InferAttributes<Wuku>,
  InferCreationAttributes<Wuku>
> {
  declare id: number;
  declare nama: string;
  declare urutan: number;

  static initModel(sequelize: Sequelize): typeof Wuku {
    return Wuku.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        nama: {
          type: DataTypes.STRING(30),
          allowNull: false,
          unique: true,
        },
        urutan: {
          type: DataTypes.SMALLINT,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'wuku',
        timestamps: false,
      }
    );
  }
}

export default Wuku;

