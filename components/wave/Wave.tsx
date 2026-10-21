'use client';

import styles from './Wave.module.css';

interface WaveProps {
  flip?: boolean;
  color?: string;
  height?: number;
}

export default function Wave({ flip = false, color = 'var(--bg-section)', height = 120 }: WaveProps) {
  return (
    <div
      className={styles.waveWrapper}
      style={{ transform: flip ? 'scaleY(-1)' : 'none', height: `${height}px` }}
    >
      <svg
        className={styles.svgWaves}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 24 150 28"
        preserveAspectRatio="none"
        style={{ fill: color }}
      >
        <defs>
          <path
            id="waveHref"
            d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z"
          />
        </defs>
        <g className={styles.parallax}>
          <use xlinkHref="#waveHref" x="48" y="0" />
          <use xlinkHref="#waveHref" x="48" y="3" />
          <use xlinkHref="#waveHref" x="48" y="5" />
          <use xlinkHref="#waveHref" x="48" y="7" />
        </g>
      </svg>
    </div>
  );
}
