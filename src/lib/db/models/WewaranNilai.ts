import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes } from 'sequelize';

export class WewaranNilai extends Model<
  InferAttributes<WewaranNilai>,
  InferCreationAttributes<WewaranNilai>
> {
  declare id: number;
  declare wewaran_jenis_id: number;
  declare nama: string;
  declare urutan: number | null;
  declare urip: number | null;

  static initModel(sequelize: Sequelize): typeof WewaranNilai {
    return WewaranNilai.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        wewaran_jenis_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'wewaran_jenis',
            key: 'id',
          },
        },
        nama: {
          type: DataTypes.STRING(30),
          allowNull: false,
        },
        urutan: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        urip: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'wewaran_nilai',
        timestamps: false,
      }
    );
  }
}

export default WewaranNilai;

