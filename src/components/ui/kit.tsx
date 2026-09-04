import { useEffect, type ReactNode } from 'react'
import { sound } from '../../game/sound'

type ButtonTone = 'primary' | 'ghost' | 'danger' | 'quiet'
type ButtonSize = 'sm' | 'md' | 'lg'

const TONE_CLASS: Record<ButtonTone, string> = {
  primary:
    'bg-neon text-void border-neon hover:bg-white hover:border-white shadow-[0_0_28px_-6px] shadow-neon/60',
  ghost:
    'bg-transparent text-ink border-hairline hover:border-neon hover:text-neon hover:bg-neon/5',
  danger:
    'bg-transparent text-flare border-flare/50 hover:bg-flare hover:text-void hover:border-flare',
  quiet:
    'bg-transparent text-ink-soft border-transparent hover:text-ink hover:bg-white/5',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[11px] tracking-[0.14em]',
  md: 'h-10 px-4 text-xs tracking-[0.16em]',
  lg: 'h-12 px-7 text-sm tracking-[0.18em]',
}

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  tone?: ButtonTone
  size?: ButtonSize
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  title?: string
  full?: boolean
}

export function Button({
  children,
  onClick,
  tone = 'ghost',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
  title,
  full = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        sound.resume()
        sound.play('click')
        onClick?.()
      }}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg border font-mono font-semibold uppercase',
        'transition-[transform,background-color,border-color,color,box-shadow] duration-150',
        'active:translate-y-px disabled:opacity-35 disabled:hover:bg-transparent',
        'disabled:hover:text-ink-soft disabled:hover:border-hairline disabled:active:translate-y-0',
        TONE_CLASS[tone],
        SIZE_CLASS[size],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

interface PanelProps {
  children: ReactNode
  className?: string
  glow?: boolean
}

export function Panel({ children, className = '', glow = false }: PanelProps) {
  return (
    <div
      className={[
        'panel relative overflow-hidden',
        glow ? 'border-neon/45 shadow-[0_0_50px_-24px] shadow-neon/70' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

interface SectionLabelProps {
  children: ReactNode
  className?: string
}

export function SectionLabel({ children, className = '' }: SectionLabelProps) {
  return <div className={`label-caps ${className}`}>{children}</div>
}

interface ChipProps {
  children: ReactNode
  accent?: string
  className?: string
}

export function Chip({ children, accent, className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${className}`}
      style={
        accent
          ? {
              borderColor: `${accent}55`,
              color: accent,
              backgroundColor: `${accent}12`,
            }
          : { borderColor: '#232838', color: '#97a1b8' }
      }
    >
      {children}
    </span>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  wide?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-void/85 p-4 backdrop-blur-sm sm:items-center sm:p-6">
      <Panel
        className={`animate-pop my-auto w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-ink">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-soft">
                {subtitle}
              </p>
            ) : null}
          </div>
          <Button tone="quiet" size="sm" onClick={onClose}>
            Close ✕
          </Button>
        </header>
        <div className="px-5 py-5">{children}</div>
      </Panel>
    </div>
  )
}

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="label-caps mb-1.5 block">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-ink-faint">
          {hint}
        </span>
      ) : null}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-hairline bg-carbon/80 px-3 py-2.5 text-sm text-ink ' +
  'placeholder:text-ink-faint transition-colors focus:border-neon focus:bg-carbon focus:outline-none'

interface MeterProps {
  value: number
  max: number
  accent?: string
  className?: string
}

export function Meter({ value, max, accent = '#35f2c0', className = '' }: MeterProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-hairline-soft ${className}`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: accent,
          boxShadow: `0 0 12px ${accent}aa`,
        }}
      />
    </div>
  )
}

export function ScanOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div className="animate-scanline h-8 w-full bg-gradient-to-b from-transparent via-neon/8 to-transparent" />
    </div>
  )
}
