import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class AturanDewasaUpacara extends Model<
  InferAttributes<AturanDewasaUpacara>,
  InferCreationAttributes<AturanDewasaUpacara>
> {
  declare id: number;
  declare dewasa_id: number;
  declare upacara_id: number | null;
  declare kategori_yadnya_id: number | null;
  declare efek: 'larangan' | 'anjuran';
  declare prioritas: CreationOptional<number>;
  declare kutipan_id: number;
  declare status: CreationOptional<'unverified' | 'verified' | 'rejected' | 'konflik'>;
  declare catatan: string | null;

  static initModel(sequelize: Sequelize): typeof AturanDewasaUpacara {
    return AturanDewasaUpacara.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        dewasa_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'dewasa',
            key: 'id',
          },
        },
        upacara_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'upacara',
            key: 'id',
          },
        },
        kategori_yadnya_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'kategori_yadnya',
            key: 'id',
          },
        },
        efek: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            isIn: [['larangan', 'anjuran']],
          },
        },
        prioritas: {
          type: DataTypes.SMALLINT,
          defaultValue: 0,
        },
        kutipan_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'kutipan',
            key: 'id',
          },
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'unverified',
          validate: {
            isIn: [['unverified', 'verified', 'rejected', 'konflik']],
          },
        },
        catatan: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'aturan_dewasa_upacara',
        timestamps: false,
      }
    );
  }
}

export default AturanDewasaUpacara;

