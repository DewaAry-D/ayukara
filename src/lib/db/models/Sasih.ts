import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class Sasih extends Model<
  InferAttributes<Sasih>,
  InferCreationAttributes<Sasih>
> {
  declare id: number;
  declare nama: string;
  declare urutan: number;

  static initModel(sequelize: Sequelize): typeof Sasih {
    return Sasih.init(
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
        tableName: 'sasih',
        timestamps: false,
      }
    );
  }
}

export default Sasih;

