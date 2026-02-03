import React from 'react';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface SimulatorDisclaimerModalProps {
  onAcknowledge: () => void;
}

const MODAL_STYLE_ID = 'podplay-modal-animations';
function ensureModalStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MODAL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = MODAL_STYLE_ID;
  style.textContent = `
@keyframes podplay-modal-backdrop-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes podplay-modal-slide-up {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes podplay-pulse-glow {
  0%, 100% { box-shadow: 0 0 30px rgba(56, 151, 240, 0.3), 0 20px 60px rgba(0, 0, 0, 0.5); }
  50% { box-shadow: 0 0 50px rgba(56, 151, 240, 0.5), 0 20px 60px rgba(0, 0, 0, 0.5); }
}
.podplay-modal-backdrop {
  animation: podplay-modal-backdrop-fade 0.3s ease-out forwards;
}
.podplay-modal-content {
  animation: podplay-modal-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards,
             podplay-pulse-glow 3s ease-in-out infinite;
}
.podplay-modal-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(56, 151, 240, 0.4);
}
.podplay-modal-button:active {
  transform: translateY(0);
}`;
  document.head.appendChild(style);
}

export const SimulatorDisclaimerModal: React.FC<SimulatorDisclaimerModalProps> = ({
  onAcknowledge,
}) => {
  React.useEffect(() => { ensureModalStyles(); }, []);

  return (
    <div className="podplay-modal-backdrop" style={styles.backdrop}>
      <div className="podplay-modal-content" style={styles.modal}>
        {/* Warning icon */}
        <div style={styles.iconContainer}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Header */}
        <h2 style={styles.header}>
          Attention: You Are Now Entering a Simulation
        </h2>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Body text */}
        <div style={styles.body}>
          <p style={styles.paragraph}>
            This simulator provides an <strong style={styles.emphasis}>approximation</strong> of
            what may happen in real-world scenarios. Statistical simulations are inherently
            different from actual outcomes — that's precisely why they're called simulations.
          </p>
          <p style={styles.paragraph}>
            The purpose of this tool is to help you understand <strong style={styles.emphasis}>
            directional trends</strong> and <strong style={styles.emphasis}>relative comparisons
            </strong>, not to predict exact results with precision.
          </p>
          <p style={{ ...styles.paragraph, marginBottom: 0 }}>
            Always apply your own judgment to ensure the output aligns with your expectations
            and real-world knowledge before treating it as definitive.
          </p>
        </div>

        {/* Button */}
        <button
          className="podplay-modal-button"
          style={styles.button}
          onClick={onAcknowledge}
        >
          I Understand
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.primary}`,
    maxWidth: '520px',
    width: '100%',
    padding: spacing.xl,
    textAlign: 'center' as const,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  header: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightBold,
    color: colors.text,
    margin: 0,
    marginBottom: spacing.md,
    letterSpacing: '-0.3px',
  },
  divider: {
    height: '1px',
    backgroundColor: colors.border,
    margin: `${spacing.md} 0`,
  },
  body: {
    textAlign: 'left' as const,
    marginBottom: spacing.xl,
  },
  paragraph: {
    fontSize: fonts.sizeBase,
    color: colors.textSecondary,
    lineHeight: 1.7,
    margin: 0,
    marginBottom: spacing.md,
  },
  emphasis: {
    color: colors.text,
    fontWeight: fonts.weightMedium,
  },
  button: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: borderRadius.sm,
    padding: `${spacing.md} ${spacing.xl}`,
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
  },
};
