import { NextRequest, NextResponse } from 'next/server';
import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';
import { WarigaRuleEngine, WarigaRuleSet } from '@/lib/engine/WarigaRuleEngine';
import { OtonanCalculator } from '@/lib/engine/OtonanCalculator';
import { HariRayaResolver, IHariRayaRuleRepository } from '@/lib/engine/HariRayaResolver';
import { BantenResolver, BantenItemResolved, IBantenResolverRepository } from '@/lib/banten/BantenResolver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const calendarAdapter = new CalendarAdapter();

    // Helper untuk resolve banten bila upacaraId dan tingkatanId tersedia
    async function resolveBanten(upacaraId: number, tingkatanId?: number): Promise<BantenItemResolved[]> {
      if (!tingkatanId) return [];

      const mockRepo: IBantenResolverRepository = {
        async findBantenSet() {
          return null;
        },
        async getWhitelistedDomains() {
          return ['babadbali.com', 'phdi.or.id', 'kalenderbali.org'];
        },
      };

      const resolver = new BantenResolver(mockRepo);
      const result = await resolver.resolve({
        upacaraId,
        tingkatanId,
        upacaraNama: body.upacaraNama,
        tingkatanNama: body.tingkatanNama,
      });
      return result.items;
    }

    if (body.tab === 'otonan') {
      const birthDateStr = body.birthDate;
      if (!birthDateStr) {
        return NextResponse.json({ error: 'birthDate wajib diisi untuk tab otonan' }, { status: 400 });
      }

      const calculator = new OtonanCalculator(calendarAdapter);
      const birthDate = new Date(birthDateStr);
      const referenceDate = body.referenceDate ? new Date(body.referenceDate) : new Date();

      const otonanResult = calculator.calculate(birthDate, referenceDate);
      const banten = await resolveBanten(23, body.tingkatanId ? Number(body.tingkatanId) : undefined);

      return NextResponse.json({
        tab: 'otonan',
        dateSection: {
          weton: otonanResult.weton,
          wuku: otonanResult.wuku,
          otonanList: otonanResult.otonanList,
        },
        banten,
      });
    }

    if (body.tab === 'hari_raya') {
      const upacaraId = Number(body.upacaraId);
      if (!upacaraId) {
        return NextResponse.json({ error: 'upacaraId wajib diisi untuk tab hari_raya' }, { status: 400 });
      }

      const mockRepo: IHariRayaRuleRepository = {
        async getRulesByUpacaraId() {
          return [];
        },
      };

      const resolver = new HariRayaResolver(calendarAdapter, mockRepo);
      const result = await resolver.resolveNext(upacaraId, {
        year: body.year ? Number(body.year) : undefined,
      });

      const banten = await resolveBanten(upacaraId, body.tingkatanId ? Number(body.tingkatanId) : undefined);

      return NextResponse.json({
        tab: 'hari_raya',
        dateSection: result,
        banten,
      });
    }

    // Default: tab 'dewasa' (Cari Hari Baik)
    const { fromDate, toDate, upacaraId, tingkatanId, upacaraNama, kategoriYadnyaId } = body;
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'fromDate dan toDate wajib diisi untuk tab dewasa' },
        { status: 400 }
      );
    }

    const range = calendarAdapter.fromRange(new Date(fromDate), new Date(toDate));
    let warigaRuleSet: WarigaRuleSet = body.ruleSet || { dewasaList: [], aturanList: [] };
    if (!body.ruleSet) {
      try {
        const { getSequelize } = await import('@/lib/db');
        const { RuleRepository } = await import('@/lib/db/repositories/RuleRepository');
        const seq = getSequelize();
        const ruleRepo = new RuleRepository({ sequelize: seq });
        warigaRuleSet = await ruleRepo.getWarigaRuleSet();
      } catch {
        // Fallback ke emptyRuleSet bila DB belum terhubung
      }
    }

    const engine = new WarigaRuleEngine(warigaRuleSet);
    const recommendations = engine.filterRecommended(range, {
      upacaraId: upacaraId ? Number(upacaraId) : undefined,
      upacaraNama,
      kategoriYadnyaId: kategoriYadnyaId ? Number(kategoriYadnyaId) : undefined,
    });

    const banten = await resolveBanten(
      Number(upacaraId || 1),
      tingkatanId ? Number(tingkatanId) : undefined
    );

    return NextResponse.json({
      tab: 'dewasa',
      dateSection: {
        recommendations,
      },
      banten,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan internal server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
