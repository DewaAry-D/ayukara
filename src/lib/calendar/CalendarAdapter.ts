import { BalineseDate } from 'balinese-date-js-lib';
import { BalineseDateInfo, WewaranItem, WukuItem, SasihItem } from './types';

// Master data mapping to match database seed_wariga.sql
const WEWARAN_DB_MAP: Record<string, { id: number; nama: string }> = {
  // Ekawara (id 1)
  Luang: { id: 1, nama: 'Luang' },

  // Dwiwara (id 2..3)
  Menga: { id: 2, nama: 'Menga' },
  Pepet: { id: 3, nama: 'Pepet' },

  // Triwara (id 4..6)
  Pasah: { id: 4, nama: 'Pasah' },
  Beteng: { id: 5, nama: 'Beteng' },
  Kajeng: { id: 6, nama: 'Kajeng' },

  // Caturwara (id 7..10)
  'catur-Sri': { id: 7, nama: 'Sri' },
  Laba: { id: 8, nama: 'Laba' },
  Jaya: { id: 9, nama: 'Jaya' },
  Menala: { id: 10, nama: 'Menala' },

  // Pancawara (id 11..15)
  Umanis: { id: 11, nama: 'Umanis' },
  Paing: { id: 12, nama: 'Paing' },
  Pon: { id: 13, nama: 'Pon' },
  Wage: { id: 14, nama: 'Wage' },
  Kliwon: { id: 15, nama: 'Keliwon' },
  Keliwon: { id: 15, nama: 'Keliwon' },

  // Sadwara (id 16..21)
  Tungleh: { id: 16, nama: 'Tungleh' },
  Aryang: { id: 17, nama: 'Aryang' },
  Urukung: { id: 18, nama: 'Urukung' },
  Paniron: { id: 19, nama: 'Paniron' },
  Was: { id: 20, nama: 'Was' },
  Maulu: { id: 21, nama: 'Maulu' },

  // Saptawara (id 22..28)
  Redite: { id: 22, nama: 'Redite' },
  Soma: { id: 23, nama: 'Soma' },
  Anggara: { id: 24, nama: 'Anggara' },
  Buda: { id: 25, nama: 'Buda' },
  Wraspati: { id: 26, nama: 'Wraspati' },
  Sukra: { id: 27, nama: 'Sukra' },
  Saniscara: { id: 28, nama: 'Saniscara' },

  // Astawara (id 29..36)
  'asta-Sri': { id: 29, nama: 'Sri' },
  Indra: { id: 30, nama: 'Indra' },
  Guru: { id: 31, nama: 'Guru' },
  Yama: { id: 32, nama: 'Yama' },
  Ludra: { id: 33, nama: 'Ludra' },
  Brahma: { id: 34, nama: 'Brahma' },
  Kala: { id: 35, nama: 'Kala' },
  Uma: { id: 36, nama: 'Uma' },

  // Sangawara (id 37..45)
  Dangu: { id: 37, nama: 'Dangu' },
  Jangur: { id: 38, nama: 'Jangur' },
  Gigis: { id: 39, nama: 'Gigis' },
  Nohan: { id: 40, nama: 'Nohan' },
  Ogan: { id: 41, nama: 'Ogan' },
  Erangan: { id: 42, nama: 'Erangan' },
  Urungan: { id: 43, nama: 'Urungan' },
  Tulus: { id: 44, nama: 'Tulus' },
  Dadi: { id: 45, nama: 'Dadi' },

  // Dasawara (id 46..55)
  Pandita: { id: 46, nama: 'Pandita' },
  Pati: { id: 47, nama: 'Pati' },
  Suka: { id: 48, nama: 'Suka' },
  Duka: { id: 49, nama: 'Duka' },
  'dasa-Sri': { id: 50, nama: 'Sri' },
  Manuh: { id: 51, nama: 'Manuh' },
  Manusa: { id: 52, nama: 'Manusa' },
  Raja: { id: 53, nama: 'Raja' },
  Dewa: { id: 54, nama: 'Dewa' },
  Raksasa: { id: 55, nama: 'Raksasa' },
};

const WUKU_NAMES = [
  'Sinta', 'Landep', 'Ukir', 'Kulantir', 'Tolu', 'Gumbreg', 'Wariga', 'Warigadean', 'Julungwangi', 'Sungsang',
  'Dunggulan', 'Kuningan', 'Langkir', 'Medangsia', 'Pujut', 'Pahang', 'Krulut', 'Merakih', 'Tambir', 'Medangkungan',
  'Matal', 'Uye', 'Menail', 'Prangbakat', 'Bala', 'Ugu', 'Wayang', 'Kulawu', 'Dukut', 'Watugunung',
];

const SASIH_NAMES = [
  'Kasa', 'Karo', 'Katiga', 'Kapat', 'Kalima', 'Kanem', 'Kapitu', 'Kawolu', 'Kasanga', 'Kedasa', 'Desta', 'Sadha',
];

export class CalendarAdapter {
  /**
   * Mengonversi objek Date standar menjadi representasi kalender Bali (termasuk ID master DB).
   */
  public fromDate(date: Date): BalineseDateInfo {
    const bDate = new BalineseDate(date);

    // Format YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Wuku (0..29 -> 1..30)
    const wukuIndex = bDate.wuku.id;
    const wukuId = wukuIndex + 1;
    const wuku: WukuItem = {
      id: wukuId,
      nama: WUKU_NAMES[wukuIndex] || bDate.wuku.name,
      urutan: wukuId,
    };

    // Sasih (menggunakan refId untuk sasih pokok 0..11 -> 1..12)
    const sasihIndex = bDate.sasih.refId !== undefined ? bDate.sasih.refId : bDate.sasih.id;
    const sasihId = sasihIndex + 1;
    const sasih: SasihItem = {
      id: sasihId,
      nama: SASIH_NAMES[sasihIndex] || bDate.sasih.name,
      urutan: sasihId,
    };

    // Wewaran
    const ekawaraName = bDate.ekaWara.name;
    const ekawara: WewaranItem = WEWARAN_DB_MAP[ekawaraName] || { id: 0, nama: ekawaraName };

    const dwiwaraName = bDate.dwiWara.name;
    const dwiwara: WewaranItem = WEWARAN_DB_MAP[dwiwaraName] || { id: 0, nama: dwiwaraName };

    const triwaraName = bDate.triWara.name;
    const triwara: WewaranItem = WEWARAN_DB_MAP[triwaraName] || { id: 0, nama: triwaraName };

    const caturwaraName = bDate.caturWara.name;
    const caturwaraKey = caturwaraName === 'Sri' ? 'catur-Sri' : caturwaraName;
    const caturwara: WewaranItem = WEWARAN_DB_MAP[caturwaraKey] || { id: 0, nama: caturwaraName };

    const pancawaraName = bDate.pancaWara.name;
    const pancawara: WewaranItem = WEWARAN_DB_MAP[pancawaraName] || { id: 0, nama: pancawaraName };

    const sadwaraName = bDate.sadWara.name;
    const sadwara: WewaranItem = WEWARAN_DB_MAP[sadwaraName] || { id: 0, nama: sadwaraName };

    const saptawaraName = bDate.saptaWara.name;
    const saptawara: WewaranItem = WEWARAN_DB_MAP[saptawaraName] || { id: 0, nama: saptawaraName };

    const astawaraName = bDate.astaWara.name;
    const astawaraKey = astawaraName === 'Sri' ? 'asta-Sri' : astawaraName;
    const astawara: WewaranItem = WEWARAN_DB_MAP[astawaraKey] || { id: 0, nama: astawaraName };

    const sangawaraName = bDate.sangaWara.name;
    const sangawara: WewaranItem = WEWARAN_DB_MAP[sangawaraName] || { id: 0, nama: sangawaraName };

    const dasawaraName = bDate.dasaWara.name;
    const dasawaraKey = dasawaraName === 'Sri' ? 'dasa-Sri' : dasawaraName;
    const dasawara: WewaranItem = WEWARAN_DB_MAP[dasawaraKey] || { id: 0, nama: dasawaraName };

    // Kumpulkan seluruh wewaranNilaiId yang valid (> 0)
    const wewaranItems = [
      ekawara, dwiwara, triwara, caturwara, pancawara,
      sadwara, saptawara, astawara, sangawara, dasawara,
    ];
    const wewaranNilaiIds = wewaranItems.map((item) => item.id).filter((id) => id > 0);

    // Penanggal, Pangelong, Purnama, Tilem
    let penanggal: number | null = null;
    let pangelong: number | null = null;
    let isPurnama = false;
    let isTilem = false;

    const dayInfoId = bDate.sasihDayInfo.id;
    const dayNumber = Array.isArray(bDate.sasihDay) && bDate.sasihDay.length > 0 ? bDate.sasihDay[0] : 1;

    if (dayInfoId === 2) {
      // Purnama
      isPurnama = true;
      penanggal = 15;
    } else if (dayInfoId === 3) {
      // Tilem
      isTilem = true;
      pangelong = 15;
    } else if (dayInfoId === 0) {
      // Penanggal
      penanggal = dayNumber;
    } else if (dayInfoId === 1) {
      // Pangelong
      pangelong = dayNumber;
    }

    return {
      date,
      dateString,
      saka: bDate.saka,
      wuku,
      sasih,
      wewaran: {
        ekawara,
        dwiwara,
        triwara,
        caturwara,
        pancawara,
        sadwara,
        saptawara,
        astawara,
        sangawara,
        dasawara,
      },
      wewaranNilaiIds,
      penanggal,
      pangelong,
      isPurnama,
      isTilem,
    };
  }

  /**
   * Mengonversi rentang tanggal secara berurutan [from, to].
   */
  public fromRange(from: Date, to: Date): BalineseDateInfo[] {
    const results: BalineseDateInfo[] = [];
    const current = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());

    while (current <= end) {
      results.push(this.fromDate(new Date(current)));
      current.setDate(current.getDate() + 1);
    }

    return results;
  }
}

