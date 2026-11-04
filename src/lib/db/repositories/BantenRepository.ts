import { Sequelize, Op, WhereOptions } from 'sequelize';
import {
  initModels,
  BantenSet,
  BantenSetItem,
  Banten,
  LokasiBanten,
  Kutipan,
  Sumber,
  Tingkatan,
  Upacara,
} from '../models';

export interface BantenRepositoryOptions {
  sequelize: Sequelize;
}

export class BantenRepository {
  private sequelize: Sequelize;

  constructor(options: BantenRepositoryOptions) {
    this.sequelize = options.sequelize;
    initModels(this.sequelize);
  }

  async findBantenSet(options: {
    upacaraId: number;
    tingkatanId: number;
    rangkaianId?: number | null;
    daerahId?: number | null;
  }): Promise<BantenSet | null> {
    const whereClause: WhereOptions<BantenSet> = {
      upacara_id: options.upacaraId,
      tingkatan_id: options.tingkatanId,
    };

    if (options.rangkaianId !== undefined) {
      whereClause.rangkaian_id = options.rangkaianId;
    }
    if (options.daerahId !== undefined) {
      whereClause.daerah_id = options.daerahId;
    }

    return BantenSet.findOne({
      where: whereClause,
      include: [
        { model: Upacara, as: 'upacara' },
        { model: Tingkatan, as: 'tingkatan' },
        {
          model: BantenSetItem,
          as: 'items',
          include: [
            { model: Banten, as: 'banten' },
            { model: LokasiBanten, as: 'lokasi' },
            {
              model: Kutipan,
              as: 'kutipan',
              include: [{ model: Sumber, as: 'sumber' }],
            },
          ],
        },
      ],
      order: [
        [{ model: BantenSetItem, as: 'items' }, 'urutan', 'ASC'],
      ],
    });
  }

  async getWhitelistedDomains(): Promise<string[]> {
    const sumbers = await Sumber.findAll({
      where: { domain_diizinkan: true },
      attributes: ['url'],
    });

    const domains = new Set<string>();
    domains.add('babadbali.com');
    domains.add('kalenderbali.org');
    domains.add('phdi.or.id');

    for (const s of sumbers) {
      if (s.url) {
        try {
          const parsed = new URL(s.url);
          domains.add(parsed.hostname);
        } catch {
          // ignore invalid
        }
      }
    }
    return Array.from(domains);
  }

  async findBantenByNameOrAlias(name: string): Promise<Banten | null> {
    const trimmed = name.trim();
    return Banten.findOne({
      where: {
        [Op.or]: [
          { nama: trimmed },
          Sequelize.where(
            Sequelize.fn('ANY', Sequelize.col('nama_alias')),
            trimmed
          ),
        ],
      },
    });
  }

  /**
   * Menyimpan set banten hasil fallback internet/LLM.
   * Strategi ID runtime: MAX(id) + 1 di dalam transaksi (sesuai AGENTS.md §7).
   */
  async saveFallbackBantenSet(data: {
    upacaraId: number;
    tingkatanId: number;
    rangkaianId?: number | null;
    daerahId?: number | null;
    sumber: {
      url: string;
      judul: string;
    };
    items: Array<{
      bantenId: number;
      lokasiId?: number | null;
      jumlah?: string;
      kutipanTeks: string;
    }>;
  }): Promise<BantenSet> {
    return this.sequelize.transaction(async (t) => {
      // 1. Tentukan ID Sumber baru (MAX + 1)
      const maxSumberResult = (await Sumber.max('id', { transaction: t })) as number || 0;
      const newSumberId = maxSumberResult + 1;

      const sumber = await Sumber.create(
        {
          id: newSumberId,
          jenis: 'web',
          judul: data.sumber.judul,
          url: data.sumber.url,
          domain_diizinkan: true,
          diakses_pada: new Date(),
        },
        { transaction: t }
      );

      // 2. Tentukan ID BantenSet baru (MAX + 1)
      const maxSetResult = (await BantenSet.max('id', { transaction: t })) as number || 0;
      const newSetId = maxSetResult + 1;

      const bantenSet = await BantenSet.create(
        {
          id: newSetId,
          upacara_id: data.upacaraId,
          tingkatan_id: data.tingkatanId,
          daerah_id: data.daerahId || null,
          rangkaian_id: data.rangkaianId || null,
          asal: 'internet',
          status: 'unverified',
        },
        { transaction: t }
      );

      // 3. Simpan item-item beserta kutipannya
      let maxKutipanId = ((await Kutipan.max('id', { transaction: t })) as number) || 0;
      let maxSetItemId = ((await BantenSetItem.max('id', { transaction: t })) as number) || 0;

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        maxKutipanId += 1;
        maxSetItemId += 1;

        const kutipan = await Kutipan.create(
          {
            id: maxKutipanId,
            sumber_id: sumber.id,
            teks: item.kutipanTeks,
          },
          { transaction: t }
        );

        await BantenSetItem.create(
          {
            id: maxSetItemId,
            banten_set_id: bantenSet.id,
            banten_id: item.bantenId,
            lokasi_id: item.lokasiId || null,
            jumlah: item.jumlah || null,
            urutan: i + 1,
            kutipan_id: kutipan.id,
          },
          { transaction: t }
        );
      }

      return bantenSet;
    });
  }
}

export default BantenRepository;
