import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

interface PlotlyChartProps {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
  style?: React.CSSProperties;
}

const PlotlyLib = (Plotly as unknown as { default?: typeof Plotly }).default ?? Plotly;

export const PlotlyChart: React.FC<PlotlyChartProps> = ({ data, layout, style }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    PlotlyLib.react(
      el,
      data,
      {
        autosize: true,
        ...layout,
      },
      {
        responsive: true,
        displayModeBar: false,
      }
    );

    const handleResize = () => {
      if (containerRef.current) {
        PlotlyLib.Plots.resize(containerRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, layout]);

  useEffect(() => {
    const el = containerRef.current;
    return () => {
      if (el) PlotlyLib.purge(el);
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', ...style }} />;
};
