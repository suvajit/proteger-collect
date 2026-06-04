const VARIANTS = {
  success: { bg: '#d1fae5', color: '#065f46' },
  warning: { bg: '#fef3c7', color: '#92400e' },
  danger: { bg: '#fee2e2', color: '#991b1b' },
  gray: { bg: '#f3f4f6', color: '#374151' },
  blue: { bg: '#dbeafe', color: '#1e40af' },
};

export default function Badge({ label, variant = 'gray' }: { label: string; variant?: keyof typeof VARIANTS }) {
  const v = VARIANTS[variant];
  return (
    <span style={{ background: v.bg, color: v.color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}
