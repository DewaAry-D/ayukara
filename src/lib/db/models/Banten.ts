import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class Banten extends Model<
  InferAttributes<Banten>,
  InferCreationAttributes<Banten>
> {
  declare id: number;
  declare nama: string;
  declare nama_alias: string[] | null;
  declare deskripsi: string | null;

  static initModel(sequelize: Sequelize): typeof Banten {
    return Banten.init(
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
        nama_alias: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: true,
        },
        deskripsi: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'banten',
        timestamps: false,
      }
    );
  }
}

export default Banten;

