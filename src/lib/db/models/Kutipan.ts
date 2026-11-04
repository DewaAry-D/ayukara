import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class Kutipan extends Model<
  InferAttributes<Kutipan>,
  InferCreationAttributes<Kutipan>
> {
  declare id: number;
  declare sumber_id: number;
  declare teks: string;
  declare halaman: string | null;

  static initModel(sequelize: Sequelize): typeof Kutipan {
    return Kutipan.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        sumber_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'sumber',
            key: 'id',
          },
        },
        teks: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        halaman: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'kutipan',
        timestamps: false,
      }
    );
  }
}

export default Kutipan;

