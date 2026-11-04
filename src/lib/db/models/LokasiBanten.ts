import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class LokasiBanten extends Model<
  InferAttributes<LokasiBanten>,
  InferCreationAttributes<LokasiBanten>
> {
  declare id: number;
  declare nama: string;

  static initModel(sequelize: Sequelize): typeof LokasiBanten {
    return LokasiBanten.init(
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
      },
      {
        sequelize,
        tableName: 'lokasi_banten',
        timestamps: false,
      }
    );
  }
}

export default LokasiBanten;

