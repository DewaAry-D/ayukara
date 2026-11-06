import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class UpacaraRangkaian extends Model<
  InferAttributes<UpacaraRangkaian>,
  InferCreationAttributes<UpacaraRangkaian>
> {
  declare id: number;
  declare upacara_id: number;
  declare parent_id: number | null;
  declare nama: string;
  declare urutan: number | null;
  declare deskripsi: string | null;

  static initModel(sequelize: Sequelize): typeof UpacaraRangkaian {
    return UpacaraRangkaian.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        upacara_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'upacara',
            key: 'id',
          },
        },
        parent_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'upacara_rangkaian',
            key: 'id',
          },
        },
        nama: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        urutan: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        deskripsi: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'upacara_rangkaian',
        timestamps: false,
      }
    );
  }
}

export default UpacaraRangkaian;

