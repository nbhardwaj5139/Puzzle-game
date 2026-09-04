import { getSkill } from '../game/skills'
import type { Player } from '../game/types'

interface SkillBarProps {
  players: Player[]
  charges: Record<string, boolean>
  /** Ids of players who must spend their charge on a station instead. */
  reservedIds: string[]
  deviceHolderId: string | null
  hotseat: boolean
  onUse: (playerId: string) => void
}

export function SkillBar({
  players,
  charges,
  reservedIds,
  deviceHolderId,
  hotseat,
  onUse,
}: SkillBarProps) {
  return (
    <div>
      <div className="label-caps mb-2">Skill charges · one each per level</div>
      <div className="grid grid-cols-2 gap-2">
        {players.map((player) => {
          const skill = getSkill(player.skillId)
          const spent = !charges[player.id]
          const reserved = reservedIds.includes(player.id)
          const needsDevice = hotseat && deviceHolderId !== player.id
          const blocked = spent || reserved || needsDevice
          const reason = spent
            ? 'spent'
            : reserved
              ? 'holding a station'
              : needsDevice
                ? 'needs the device'
                : skill.effect
          return (
            <button
              key={player.id}
              type="button"
              disabled={blocked}
              title={reason}
              onClick={() => onUse(player.id)}
              className={[
                'group relative flex flex-col gap-1 rounded-lg border p-2.5 text-left transition-all duration-150',
                blocked
                  ? 'cursor-not-allowed border-hairline-soft bg-carbon/50 opacity-50'
                  : 'border-hairline bg-slate-deep hover:-translate-y-0.5',
              ].join(' ')}
              style={
                blocked
                  ? undefined
                  : {
                      borderColor: `${skill.accent}55`,
                      boxShadow: `0 0 26px -18px ${skill.accent}`,
                    }
              }
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden className="text-sm">
                  {player.avatar}
                </span>
                <span className="truncate text-[11px] font-semibold text-ink">
                  {player.name}
                </span>
                <span
                  className="ml-auto font-mono text-sm leading-none"
                  style={{ color: blocked ? '#5d6780' : skill.accent }}
                >
                  {skill.glyph}
                </span>
              </div>
              <span
                className="font-mono text-[9px] uppercase tracking-[0.12em]"
                style={{ color: blocked ? '#5d6780' : skill.accent }}
              >
                {spent ? 'charge spent' : reserved ? 'on station' : needsDevice ? 'needs device' : skill.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
