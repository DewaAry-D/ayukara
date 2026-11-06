'use client';

import React, { useState } from 'react';
import { BantenTable, BantenTableProps } from './BantenTable';
import { AiSummaryBox, AiSummaryBoxProps } from './AiSummaryBox';

export interface BantenWithSummaryProps {
  bantenTableProps: BantenTableProps;
  aiSummaryProps: AiSummaryBoxProps;
}

export function BantenWithSummary({ bantenTableProps, aiSummaryProps }: BantenWithSummaryProps) {
  const [currentPrice, setCurrentPrice] = useState<{ min: number; max: number }>({
    min: bantenTableProps.totalMin || 0,
    max: bantenTableProps.totalMax || 0,
  });

  const handlePriceLoaded = React.useCallback((min: number, max: number) => {
    setCurrentPrice({ min, max });
  }, []);

  const effectiveMin = currentPrice.min > 0 ? currentPrice.min : (bantenTableProps.totalMin || 0);
  const effectiveMax = currentPrice.max > 0 ? currentPrice.max : (bantenTableProps.totalMax || effectiveMin);

  return (
    <div className="space-y-6">
      <BantenTable
        {...bantenTableProps}
        onPriceLoaded={handlePriceLoaded}
      />

      <AiSummaryBox
        {...aiSummaryProps}
        totalMin={effectiveMin}
        totalMax={effectiveMax}
      />
    </div>
  );
}

export default BantenWithSummary;

