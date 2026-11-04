import { Sequelize, WhereOptions } from 'sequelize';
import {
  initModels,
  Upacara,
  Dewasa,
  DewasaSyarat,
  AturanDewasaUpacara,
  HariRayaAturan,
  WewaranNilai,
  Wuku,
  Sasih,
  Kutipan,
  Sumber,
} from '../models';

export interface RuleRepositoryOptions {
  sequelize: Sequelize;
}

export class RuleRepository {
  private sequelize: Sequelize;

  constructor(options: RuleRepositoryOptions) {
    this.sequelize = options.sequelize;
    initModels(this.sequelize);
  }

  async getAllUpacara(): Promise<Upacara[]> {
    return Upacara.findAll({
      order: [['id', 'ASC']],
    });
  }

  async getUpacaraById(id: number): Promise<Upacara | null> {
    return Upacara.findByPk(id);
  }

  async getDewasaRules(options?: {
    upacaraId?: number;
    kategoriYadnyaId?: number;
    mode?: 'verified_only' | 'all';
  }): Promise<AturanDewasaUpacara[]> {
    const whereClause: WhereOptions<AturanDewasaUpacara> = {};

    if (options?.mode === 'verified_only') {
      whereClause.status = 'verified';
    }

    return AturanDewasaUpacara.findAll({
      where: whereClause,
      include: [
        {
          model: Dewasa,
          as: 'dewasa',
          include: [
            {
              model: DewasaSyarat,
              as: 'syarat_list',
              include: [
                { model: WewaranNilai, as: 'wewaran_nilai' },
                { model: Wuku, as: 'wuku' },
                { model: Sasih, as: 'sasih' },
              ],
            },
          ],
        },
        {
          model: Kutipan,
          as: 'kutipan',
          include: [{ model: Sumber, as: 'sumber' }],
        },
      ],
      order: [['prioritas', 'DESC']],
    });
  }

  async getHariRayaAturan(upacaraId: number, options?: { mode?: 'verified_only' | 'all' }): Promise<HariRayaAturan[]> {
    const whereClause: WhereOptions<HariRayaAturan> = { upacara_id: upacaraId };

    if (options?.mode === 'verified_only') {
      whereClause.status = 'verified';
    }

    return HariRayaAturan.findAll({
      where: whereClause,
      include: [
        { model: WewaranNilai, as: 'wewaran_nilai' },
        { model: Wuku, as: 'wuku' },
        { model: Sasih, as: 'sasih' },
        {
          model: Kutipan,
          as: 'kutipan',
          include: [{ model: Sumber, as: 'sumber' }],
        },
      ],
      order: [['grup', 'ASC'], ['id', 'ASC']],
    });
  }
}

export default RuleRepository;
