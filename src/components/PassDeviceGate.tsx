import type { Player } from '../game/types'
import { getSkill } from '../game/skills'
import { Button, Panel } from './ui/kit'

interface PassDeviceGateProps {
  open: boolean
  target: Player
  stationTitle: string
  onConfirm: () => void
}

export function PassDeviceGate({
  open,
  target,
  stationTitle,
  onConfirm,
}: PassDeviceGateProps) {
  if (!open) return null
  const skill = getSkill(target.skillId)
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-void/92 p-6 backdrop-blur-md">
      <Panel glow className="animate-pop w-full max-w-md p-7 text-center">
        <div className="label-caps">Pass the device</div>
        <div
          className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-2xl border text-5xl"
          style={{
            borderColor: `${target.accent}66`,
            backgroundColor: `${target.accent}14`,
            boxShadow: `0 0 44px -14px ${target.accent}`,
          }}
        >
          <span aria-hidden>{target.avatar}</span>
        </div>
        <h3 className="mt-4 text-2xl font-bold text-ink">{target.name}</h3>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
          {target.role}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          You are on <span className="font-semibold text-ink">{stationTitle}</span>.
          Nobody else can clear it for you.
        </p>
        <p
          className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em]"
          style={{ color: skill.accent }}
        >
          {skill.glyph} {skill.name} · {skill.effect}
        </p>
        <Button tone="primary" size="lg" full className="mt-6" onClick={onConfirm}>
          I have the device
        </Button>
      </Panel>
    </div>
  )
}
