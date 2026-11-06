import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class ValidasiAturanLog extends Model<
  InferAttributes<ValidasiAturanLog>,
  InferCreationAttributes<ValidasiAturanLog>
> {
  declare id: number;
  declare aturan_id: number;
  declare validator: string;
  declare status_baru: 'unverified' | 'verified' | 'rejected' | 'konflik';
  declare catatan: string | null;
  declare created_at: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof ValidasiAturanLog {
    return ValidasiAturanLog.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        aturan_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'aturan_dewasa_upacara',
            key: 'id',
          },
        },
        validator: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        status_baru: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: [['unverified', 'verified', 'rejected', 'konflik']],
          },
        },
        catatan: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'validasi_aturan_log',
        timestamps: false,
      }
    );
  }
}

export default ValidasiAturanLog;

