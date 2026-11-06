export interface WewaranItem {
  id: number;
  nama: string;
}

export interface WukuItem {
  id: number;
  nama: string;
  urutan: number;
}

export interface SasihItem {
  id: number;
  nama: string;
  urutan: number;
}

export interface BalineseDateInfo {
  date: Date;
  dateString: string; // YYYY-MM-DD
  saka: number;
  wuku: WukuItem;
  sasih: SasihItem;
  wewaran: {
    ekawara: WewaranItem;
    dwiwara: WewaranItem;
    triwara: WewaranItem;
    caturwara: WewaranItem;
    pancawara: WewaranItem;
    sadwara: WewaranItem;
    saptawara: WewaranItem;
    astawara: WewaranItem;
    sangawara: WewaranItem;
    dasawara: WewaranItem;
  };
  wewaranNilaiIds: number[];
  penanggal: number | null;
  pangelong: number | null;
  isPurnama: boolean;
  isTilem: boolean;
}

