import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class Tingkatan extends Model<
  InferAttributes<Tingkatan>,
  InferCreationAttributes<Tingkatan>
> {
  declare id: number;
  declare nama: string;
  declare urutan: number | null;
  declare parent_id: number | null;

  static initModel(sequelize: Sequelize): typeof Tingkatan {
    return Tingkatan.init(
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
        urutan: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        parent_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'tingkatan',
            key: 'id',
          },
        },
      },
      {
        sequelize,
        tableName: 'tingkatan',
        timestamps: false,
      }
    );
  }
}

export default Tingkatan;

