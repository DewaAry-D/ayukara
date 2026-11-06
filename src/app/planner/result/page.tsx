import React from 'react';
import { loadPlanResult } from '@/features/planner/resultLoader';
import { PlannerResultView } from '@/features/planner/components/PlannerResultView';

export const metadata = {
  title: 'Hasil Rencana Upacara Yadnya · Ayukara',
  description:
    'Rincian hari baik, kebutuhan upakara banten, estimasi biaya pasar, dan penjelasan sastra Hindu Bali.',
};

export default async function PlannerResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const resultData = await loadPlanResult(resolvedParams);

  return <PlannerResultView resultData={resultData} />;
}
