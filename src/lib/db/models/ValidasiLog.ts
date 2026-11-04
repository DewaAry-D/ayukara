import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class ValidasiLog extends Model<
  InferAttributes<ValidasiLog>,
  InferCreationAttributes<ValidasiLog>
> {
  declare id: number;
  declare banten_set_id: number;
  declare validator: string;
  declare status_baru: 'unverified' | 'verified' | 'rejected';
  declare catatan: string | null;
  declare created_at: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof ValidasiLog {
    return ValidasiLog.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: false,
        },
        banten_set_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'banten_set',
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
            isIn: [['unverified', 'verified', 'rejected']],
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
        tableName: 'validasi_log',
        timestamps: false,
      }
    );
  }
}

export default ValidasiLog;

