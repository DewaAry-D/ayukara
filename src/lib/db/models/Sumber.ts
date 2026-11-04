import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class Sumber extends Model<
  InferAttributes<Sumber>,
  InferCreationAttributes<Sumber>
> {
  declare id: number;
  declare jenis: 'lontar' | 'buku' | 'jurnal' | 'web' | 'narasumber' | null;
  declare judul: string | null;
  declare penulis: string | null;
  declare penerbit: string | null;
  declare tahun: number | null;
  declare url: string | null;
  declare domain_diizinkan: CreationOptional<boolean>;
  declare diakses_pada: Date | null;

  static initModel(sequelize: Sequelize): typeof Sumber {
    return Sumber.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        jenis: {
          type: DataTypes.STRING(20),
          allowNull: true,
          validate: {
            isIn: [['lontar', 'buku', 'jurnal', 'web', 'narasumber']],
          },
        },
        judul: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        penulis: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        penerbit: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        tahun: {
          type: DataTypes.SMALLINT,
          allowNull: true,
        },
        url: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        domain_diizinkan: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        diakses_pada: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'sumber',
        timestamps: false,
      }
    );
  }
}

export default Sumber;

