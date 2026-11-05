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
import {
  HariRayaAturanItem,
  IHariRayaRuleRepository,
} from '../../engine/HariRayaResolver';
import {
  IUpacaraMatchRepository,
  UpacaraMatchItem,
} from '../../upacara/UpacaraMatcher';
import { UPACARA_KNOWLEDGE_MAP } from '../../upacara/upacaraKnowledge';
import {
  WarigaRuleSet,
  RuleHierarchyLevel,
} from '../../engine/WarigaRuleEngine';

export interface RuleRepositoryOptions {
  sequelize: Sequelize;
}

export class RuleRepository implements IHariRayaRuleRepository, IUpacaraMatchRepository {
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

  async getAllCandidates(): Promise<UpacaraMatchItem[]> {
    const upacaras = await this.getAllUpacara();
    return upacaras.map((u) => {
      const meta = UPACARA_KNOWLEDGE_MAP.get(u.id);
      return {
        id: u.id,
        nama: u.nama,
        alias: meta ? meta.aliases : [],
        deskripsi: u.deskripsi || meta?.deskripsiBudaya || null,
        jenis_penentuan: u.jenis_penentuan,
      };
    });
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

  async getRulesByUpacaraId(upacaraId: number): Promise<HariRayaAturanItem[]> {
    const rules = await this.getHariRayaAturan(upacaraId, { mode: 'all' });
    return rules.map((r) => ({
      id: r.id,
      upacara_id: r.upacara_id,
      grup: r.grup,
      wewaran_nilai_id: r.wewaran_nilai_id,
      wuku_id: r.wuku_id,
      sasih_id: r.sasih_id,
      penanggal: r.penanggal,
      pangelong: r.pangelong,
      is_purnama: r.is_purnama,
      is_tilem: r.is_tilem,
      penjelasan_penentuan: r.penjelasan_penentuan || '',
      status: r.status,
    }));
  }

  async getWarigaRuleSet(options?: { verifiedOnly?: boolean }): Promise<WarigaRuleSet> {
    const dewasas = await Dewasa.findAll({
      include: [
        {
          model: DewasaSyarat,
          as: 'syarat_list',
        },
      ],
    });

    const aturans = await AturanDewasaUpacara.findAll({
      where: options?.verifiedOnly ? { status: 'verified' } : {},
      include: [
        {
          model: Kutipan,
          as: 'kutipan',
          include: [{ model: Sumber, as: 'sumber' }],
        },
      ],
    });

    return {
      dewasaList: dewasas.map((d) => ({
        id: d.id,
        nama: d.nama,
        sifat: d.sifat,
        deskripsi: d.deskripsi,
        syarat: ((d as unknown as { syarat_list?: DewasaSyarat[] }).syarat_list || []).map((s) => ({
          grup: s.grup,
          wewaran_nilai_id: s.wewaran_nilai_id,
          wuku_id: s.wuku_id,
          sasih_id: s.sasih_id,
          penanggal: s.penanggal,
          pangelong: s.pangelong,
          is_purnama: s.is_purnama,
          is_tilem: s.is_tilem,
        })),
      })),
      aturanList: aturans.map((a) => {
        let level = RuleHierarchyLevel.WEWARAN;
        if (a.prioritas >= 20) level = RuleHierarchyLevel.SASIH;
        else if (a.prioritas >= 10) level = RuleHierarchyLevel.WUKU;

        const k = a.kutipan;
        const s = k?.sumber;

        return {
          id: a.id,
          dewasa_id: a.dewasa_id,
          upacara_id: a.upacara_id,
          kategori_yadnya_id: a.kategori_yadnya_id,
          efek: a.efek,
          level,
          status: a.status,
          kutipan_id: a.kutipan_id,
          catatan: a.catatan
            ? a.catatan.replace(/^otomatis\s+dari\s+teks:\s*/i, '').trim()
            : null,
          kutipan: k
            ? {
                teks: k.teks ? k.teks.replace(/^otomatis\s+dari\s+teks:\s*/i, '').trim() : '',
                sumberJudul: s?.judul || 'Lontar Wariga Dewasa',
                sumberUrl: s?.url || null,
              }
            : null,
        };
      }),
    };
  }
}
