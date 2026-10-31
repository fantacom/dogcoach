import { Text as RNText, type TextProps } from 'react-native';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'error';

const variants: Record<Variant, string> = {
  title: 'text-3xl font-bold text-ink dark:text-ink-dark',
  subtitle: 'text-xl font-semibold text-ink dark:text-ink-dark',
  body: 'text-base leading-6 text-ink dark:text-ink-dark',
  caption: 'text-sm text-muted dark:text-muted-dark',
  error: 'text-sm text-danger dark:text-danger-dark',
};

type Props = TextProps & { variant?: Variant; className?: string };

/** Text mit Dynamic Type (allowFontScaling bleibt aktiv). */
export function Text({ variant = 'body', className = '', ...props }: Props) {
  return (
    <RNText
      accessibilityRole={variant === 'title' ? 'header' : undefined}
      className={`${variants[variant]} ${className}`}
      {...props}
    />
  );
}
