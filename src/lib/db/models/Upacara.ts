import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class Upacara extends Model<
  InferAttributes<Upacara>,
  InferCreationAttributes<Upacara>
> {
  declare id: number;
  declare kategori_yadnya_id: number | null;
  declare nama: string;
  declare deskripsi: string | null;
  declare jenis_penentuan: CreationOptional<'dewasa' | 'hari_raya_tetap' | 'otonan'>;

  static initModel(sequelize: Sequelize): typeof Upacara {
    return Upacara.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        kategori_yadnya_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'kategori_yadnya',
            key: 'id',
          },
        },
        nama: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        deskripsi: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        jenis_penentuan: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'dewasa',
          validate: {
            isIn: [['dewasa', 'hari_raya_tetap', 'otonan']],
          },
        },
      },
      {
        sequelize,
        tableName: 'upacara',
        timestamps: false,
      }
    );
  }
}

export default Upacara;

