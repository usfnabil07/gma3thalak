import type { CSSProperties } from 'react';
import Image from 'next/image';
import styles from './SupportAvatar.module.css';

export default function SupportAvatar({ size = 46 }: { size?: number }) {
  return (
    <span className={styles.avatar} style={{ '--support-avatar-size': `${size}px` } as CSSProperties} role="img" aria-label="أفتار الدعم الفني">
      <Image src="/images/support/customer-support.svg" alt="" fill sizes={`${size}px`} />
    </span>
  );
}

