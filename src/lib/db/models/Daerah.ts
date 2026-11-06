import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class Daerah extends Model<
  InferAttributes<Daerah>,
  InferCreationAttributes<Daerah>
> {
  declare id: number;
  declare nama: string;
  declare jenis: string | null;

  static initModel(sequelize: Sequelize): typeof Daerah {
    return Daerah.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        nama: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        jenis: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'daerah',
        timestamps: false,
      }
    );
  }
}

export default Daerah;

