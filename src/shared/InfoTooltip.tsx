import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { colors, fonts, borderRadius } from './design-tokens';

interface InfoTooltipProps {
  text: React.ReactNode;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; flipped: boolean }>({
    left: 0,
    top: 0,
    flipped: false,
  });
  const iconRef = useRef<HTMLSpanElement>(null);

  const reposition = useCallback(() => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const flipped = rect.top < 80;
    setPos({
      left: rect.left + rect.width / 2,
      top: flipped ? rect.bottom + 8 : rect.top - 8,
      flipped,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    reposition();
    setVisible(true);
  }, [reposition]);

  const handleMouseLeave = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onScroll = () => reposition();
    const onResize = () => reposition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [visible, reposition]);

  const tooltip = visible
    ? ReactDOM.createPortal(
        <span
          style={{
            ...styles.tooltip,
            left: pos.left,
            top: pos.top,
            transform: pos.flipped
              ? 'translateX(-50%)'
              : 'translateX(-50%) translateY(-100%)',
          }}
        >
          {text}
          <span style={pos.flipped ? styles.arrowUp : styles.arrowDown} />
        </span>,
        document.body
      )
    : null;

  return (
    <span style={styles.wrapper}>
      <span
        ref={iconRef}
        style={styles.icon}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        i
      </span>
      {tooltip}
    </span>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    marginLeft: '6px',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: `1px solid ${colors.textMuted}`,
    fontSize: '10px',
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.textMuted,
    lineHeight: 1,
    userSelect: 'none',
    cursor: 'help',
  },
  tooltip: {
    position: 'fixed',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    padding: '8px 12px',
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightNormal,
    fontStyle: 'normal',
    color: colors.textSecondary,
    lineHeight: '1.5',
    whiteSpace: 'normal',
    width: '260px',
    zIndex: 10000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    pointerEvents: 'none',
  },
  arrowDown: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: `6px solid ${colors.border}`,
  },
  arrowUp: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderBottom: `6px solid ${colors.border}`,
  },
};
