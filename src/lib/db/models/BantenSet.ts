import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import type { UpacaraRangkaian } from './UpacaraRangkaian';
import type { Tingkatan } from './Tingkatan';
import type { BantenSetItem } from './BantenSetItem';

export class BantenSet extends Model<
  InferAttributes<BantenSet>,
  InferCreationAttributes<BantenSet>
> {
  declare id: number;
  declare upacara_id: number;
  declare tingkatan_id: number;
  declare daerah_id: number | null;
  declare rangkaian_id: number | null;
  declare asal: 'manual' | 'internet';
  declare status: CreationOptional<'unverified' | 'verified' | 'rejected'>;
  declare created_at: CreationOptional<Date>;
  declare rangkaian?: NonAttribute<UpacaraRangkaian>;
  declare tingkatan?: NonAttribute<Tingkatan>;
  declare items?: NonAttribute<BantenSetItem[]>;

  static initModel(sequelize: Sequelize): typeof BantenSet {
    return BantenSet.init(
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
        tingkatan_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'tingkatan',
            key: 'id',
          },
        },
        daerah_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'daerah',
            key: 'id',
          },
        },
        rangkaian_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'upacara_rangkaian',
            key: 'id',
          },
        },
        asal: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: [['manual', 'internet']],
          },
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'unverified',
          validate: {
            isIn: [['unverified', 'verified', 'rejected']],
          },
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'banten_set',
        timestamps: false,
      }
    );
  }
}

export default BantenSet;

