'use client';

import { useMemo, type CSSProperties } from 'react';
import { Lottie } from 'lottie-react';
import animationData from './animations/collect-media.json';

type AnimationNode = {
  c?: { a?: number; k?: number[] | { s?: number[] }[] };
  [key: string]: unknown;
};

function recolorAnimation(): typeof animationData {
  const animation = structuredClone(animationData) as unknown as AnimationNode;
  const colors = [
    { source: [0.949, 0.412, 0.769], target: '#38bdf8' },
    { source: [0.937, 0.953, 0.451], target: '#0ea5e9' },
    { source: [1, 0.91, 0.937], target: '#7dd3fc' },
    { source: [1, 1, 1], target: '#e0f2fe' },
  ];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;

    const node = value as AnimationNode;
    if (node.c?.a === 0 && Array.isArray(node.c.k) && node.c.k.length >= 3) {
      const color = node.c.k as number[];
      const match = colors.find(({ source }) => source.every((channel, index) => Math.abs(channel - color[index]) < 0.01));
      if (match) {
        const hex = match.target.slice(1);
        node.c.k = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255).concat(color[3] ?? 1);
      }
    }
    Object.values(node).forEach(visit);
  };

  visit(animation);
  return animation as unknown as typeof animationData;
}

export default function SiteLoader({ size = 120, style }: { size?: number; style?: CSSProperties }) {
  const themedAnimation = useMemo(() => recolorAnimation(), []);

  return (
    <div
      className="siteLoader"
      role="status"
      aria-label="جاري التحميل"
      style={{ width: size, height: size, ...style }}
    >
      <span className="siteLoaderAnimation" style={{ width: size, height: size }}>
        <Lottie src={themedAnimation} autoplay loop speed={0.55} aria-hidden="true" />
      </span>
    </div>
  );
}
