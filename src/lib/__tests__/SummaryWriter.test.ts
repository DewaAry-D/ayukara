import { describe, it, expect } from 'vitest';
import { SummaryWriter, SummaryPlanInput } from '@/lib/summary/SummaryWriter';
import { MockLlmClient } from '@/lib/llm/MockLlmClient';

describe('SummaryWriter (Fase 4)', () => {
  const planInput: SummaryPlanInput = {
    upacaraNama: 'Pawiwahan',
    tingkatanNama: 'Nista',
    tanggalInfo: {
      tanggal: '2024-02-28',
      keterangan: 'Buda Keliwon Dunggulan (Paling disarankan)',
    },
    bantenItems: [
      {
        nama: 'Pejati',
        lokasi: 'Pamerjan',
        jumlah: '1 soroh',
        kutipan: {
          teks: 'Banten Pejati dihaturkan di Pamerjan',
          sumberJudul: 'Lontar Kusuma Dewa',
        },
      },
      {
        nama: 'Canang Sari',
        lokasi: 'Pelangkiran',
        jumlah: '5 tanding',
        kutipan: {
          teks: 'Canang sari di pelangkiran',
          sumberJudul: 'Babad Bali',
        },
      },
    ],
    hargaTotal: {
      totalMin: 60000,
      totalMax: 90000,
      itemTanpaHargaCount: 0,
    },
  };

  it('generates grounded summary with numbered citations and does not hallucinate new facts', async () => {
    const mockLlm = new MockLlmClient({
      mockText: 'Rencana upacara Pawiwahan tingkatan Nista disarankan pada Buda Keliwon Dunggulan [1]. Banten utama yang dibutuhkan meliputi Pejati [1] dan Canang Sari [2]. Total estimasi biaya berkisar Rp 60.000 hingga Rp 90.000.',
    });

    const writer = new SummaryWriter(mockLlm);
    const result = await writer.generateSummary(planInput);

    expect(result.summaryText).toContain('Pawiwahan');
    expect(result.summaryText).toContain('Buda Keliwon Dunggulan');
    expect(result.citations.length).toBe(2);
    expect(result.citations[0].id).toBe(1);
    expect(result.citations[0].sourceTitle).toBe('Lontar Kusuma Dewa');
    expect(result.citations[1].id).toBe(2);
    expect(result.citations[1].sourceTitle).toBe('Babad Bali');
  });

  it('handles plan without banten quotes safely', async () => {
    const mockLlm = new MockLlmClient({
      mockText: 'Upacara tanpa kutipan banten.',
    });

    const writer = new SummaryWriter(mockLlm);
    const result = await writer.generateSummary({
      ...planInput,
      bantenItems: [
        { nama: 'Banten Tanpa Kutipan', lokasi: null, jumlah: null, kutipan: null },
      ],
    });

    expect(result.summaryText).toBe('Upacara tanpa kutipan banten.');
    expect(result.citations.length).toBe(0);
  });
});

