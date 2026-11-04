import { NextRequest, NextResponse } from 'next/server';
import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';
import { WarigaRuleEngine, WarigaRuleSet } from '@/lib/engine/WarigaRuleEngine';
import { OtonanCalculator } from '@/lib/engine/OtonanCalculator';
import { HariRayaResolver, IHariRayaRuleRepository } from '@/lib/engine/HariRayaResolver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const calendarAdapter = new CalendarAdapter();

    if (body.tab === 'otonan') {
      const birthDateStr = body.birthDate;
      if (!birthDateStr) {
        return NextResponse.json({ error: 'birthDate wajib diisi untuk tab otonan' }, { status: 400 });
      }

      const calculator = new OtonanCalculator(calendarAdapter);
      const birthDate = new Date(birthDateStr);
      const referenceDate = body.referenceDate ? new Date(body.referenceDate) : new Date();

      const otonanResult = calculator.calculate(birthDate, referenceDate);

      return NextResponse.json({
        tab: 'otonan',
        dateSection: {
          weton: otonanResult.weton,
          wuku: otonanResult.wuku,
          otonanList: otonanResult.otonanList,
        },
        banten: [], // Stub Fase 2 (akan diisi BantenResolver pada Fase 3)
      });
    }

    if (body.tab === 'hari_raya') {
      const upacaraId = Number(body.upacaraId);
      if (!upacaraId) {
        return NextResponse.json({ error: 'upacaraId wajib diisi untuk tab hari_raya' }, { status: 400 });
      }

      // Repository fallback jika belum ada koneksi DB langsung di route stub
      const mockRepo: IHariRayaRuleRepository = {
        async getRulesByUpacaraId() {
          return []; // Default empty (mengembalikan 'Aturan penentuan belum tersedia')
        },
      };

      const resolver = new HariRayaResolver(calendarAdapter, mockRepo);
      const result = await resolver.resolveNext(upacaraId, {
        year: body.year ? Number(body.year) : undefined,
      });

      return NextResponse.json({
        tab: 'hari_raya',
        dateSection: result,
        banten: [], // Stub Fase 2
      });
    }

    // Default: tab 'dewasa' (Cari Hari Baik)
    const { fromDate, toDate, upacaraId } = body;
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'fromDate dan toDate wajib diisi untuk tab dewasa' },
        { status: 400 }
      );
    }

    const range = calendarAdapter.fromRange(new Date(fromDate), new Date(toDate));
    const emptyRuleSet: WarigaRuleSet = { dewasaList: [], aturanList: [] };
    const engine = new WarigaRuleEngine(emptyRuleSet);
    const recommendations = engine.filterRecommended(range, { upacaraId: upacaraId ? Number(upacaraId) : undefined });

    return NextResponse.json({
      tab: 'dewasa',
      dateSection: {
        recommendations,
      },
      banten: [], // Stub Fase 2
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan internal server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
