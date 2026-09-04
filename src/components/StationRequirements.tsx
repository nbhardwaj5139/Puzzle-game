import { getSkill } from '../game/skills'
import type { Presence } from '../game/store'
import { useGame } from '../game/store'
import type { Player, Station } from '../game/types'
import { CharacterAvatar } from './CharacterAvatar'
import { Button } from './ui/kit'

interface StationRequirementsProps {
  station: Station
  operator: Player
  presence: Presence
  hotseat: boolean
}

interface Row {
  done: boolean
  label: string
  detail: string
  action?: { label: string; run: () => void }
}

/**
 * The co-op contract, made explicit: who has to stand where, who has to be
 * looking at what, and who is holding the device. Nothing accepts input until
 * every row is green.
 */
export function StationRequirements({
  station,
  operator,
  presence,
  hotseat,
}: StationRequirementsProps) {
  const players = useGame((s) => s.players)
  const positions = useGame((s) => s.positions)
  const assist = players.find((p) => p.id === presence.assistId)
  const handDeviceTo = useGame((s) => s.handDeviceTo)
  const setMover = useGame((s) => s.setMover)
  const mode = useGame((s) => s.mode)
  const skill = getSkill(operator.skillId)

  const rows: Row[] = []

  rows.push({
    done: presence.operatorReady,
    label: `${operator.name} at ${station.title}`,
    detail: presence.operatorReady
      ? 'In position.'
      : `Walk ${operator.name} onto the highlighted checkpoint tile.`,
    action: presence.operatorReady
      ? undefined
      : {
          label: `Move ${operator.name}`,
          run: () => (hotseat ? handDeviceTo(operator.id) : setMover(operator.id)),
        },
  })

  if (station.clueAt) {
    const candidates = players.filter((p) => p.id !== operator.id)
    rows.push({
      done: presence.assistReady,
      label: `A second player at the ${station.clueLabel ?? 'reference point'}`,
      detail: presence.assistReady
        ? `${assist?.name ?? 'Someone'} is there and can read it out.`
        : `Send anyone but ${operator.name} to the dashed look-here tile.`,
      action: presence.assistReady
        ? undefined
        : candidates[0]
          ? {
              label: `Move ${candidates[0].name}`,
              run: () =>
                hotseat ? handDeviceTo(candidates[0]!.id) : setMover(candidates[0]!.id),
            }
          : undefined,
    })
  }

  if (hotseat) {
    rows.push({
      done: presence.deviceReady,
      label: `${operator.name} is holding the device`,
      detail: presence.deviceReady
        ? 'Their call to make.'
        : 'Physically hand the phone or laptop over before they type.',
      action: presence.deviceReady
        ? undefined
        : { label: 'I have the device', run: () => handDeviceTo(operator.id) },
    })
  }

  if (presence.ready) return null

  return (
    <div className="animate-rise rounded-xl border border-hairline bg-carbon/70 p-4">
      <div className="mb-3 flex items-center gap-3">
        <CharacterAvatar
          appearance={operator.appearance}
          accent={operator.accent}
          size="sm"
          title={operator.name}
        />
        <div className="min-w-0">
          <div className="label-caps">Checkpoint locked</div>
          <div className="text-[13px] font-semibold text-ink">
            {operator.name} operates this one
          </div>
        </div>
        <span
          className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em]"
          style={{ color: skill.accent }}
        >
          {skill.glyph} {skill.name}
        </span>
      </div>

      <ol className="space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[9px] ${
                row.done
                  ? 'border-neon bg-neon/20 text-neon'
                  : 'border-hairline text-ink-faint'
              }`}
            >
              {row.done ? '✓' : '·'}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[12px] font-semibold ${
                  row.done ? 'text-ink-soft line-through' : 'text-ink'
                }`}
              >
                {row.label}
              </span>
              <span className="block text-[11px] leading-relaxed text-ink-faint">
                {row.detail}
              </span>
            </span>
            {row.action ? (
              <Button size="sm" tone="ghost" onClick={row.action.run}>
                {row.action.label}
              </Button>
            ) : null}
          </li>
        ))}
      </ol>

      {mode === 'shared' ? (
        <p className="mt-3 border-t border-hairline pt-2.5 text-[11px] leading-relaxed text-ink-faint">
          Shared-screen mode: anyone can drive the map, but the checkpoint still
          needs these people in these places.
        </p>
      ) : null}

      {station.clueAt && !presence.assistReady ? (
        <p className="mt-3 text-[11px] leading-relaxed text-cyan-signal">
          Positions on the floor:{' '}
          {players
            .map((p) => {
              const pos = positions[p.id]
              return `${p.name} ${pos ? `(${pos.x},${pos.y})` : '—'}`
            })
            .join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
