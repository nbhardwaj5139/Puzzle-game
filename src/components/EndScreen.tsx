import { LEVELS } from '../game/levels'
import { getSkill } from '../game/skills'
import { useGame } from '../game/store'
import { Button, Chip, Panel, SectionLabel } from './ui/kit'

interface EndScreenProps {
  outcome: 'victory' | 'failure'
}

function medalFor(score: number): { label: string; note: string; accent: string } {
  if (score >= 3600) {
    return {
      label: 'EMPLOYEE OF THE MONTH',
      note: 'Nobody will believe how fast that was.',
      accent: '#35f2c0',
    }
  }
  if (score >= 2400) {
    return {
      label: 'SOLID QUARTER',
      note: 'Efficient, unglamorous, out before the cleaners.',
      accent: '#45d0ff',
    }
  }
  if (score >= 1200) {
    return {
      label: 'BILLABLE HOURS',
      note: 'You got out. The route was… exploratory.',
      accent: '#ffb43a',
    }
  }
  return {
    label: 'CLOCKED OUT LATE',
    note: 'The building won on style points. You won on stubbornness.',
    accent: '#ff5cc8',
  }
}

export function EndScreen({ outcome }: EndScreenProps) {
  const players = useGame((s) => s.players)
  const results = useGame((s) => s.results)
  const totalScore = useGame((s) => s.totalScore)
  const stats = useGame((s) => s.stats)
  const restart = useGame((s) => s.restart)
  const continueRun = useGame((s) => s.continueRun)
  const goPhase = useGame((s) => s.goPhase)
  const hardReset = useGame((s) => s.hardReset)

  const won = outcome === 'victory'
  const medal = medalFor(totalScore)
  const cleared = results.filter((r) => r.cleared).length

  const mvp = players.reduce<{ id: string; score: number } | null>((best, p) => {
    const s = stats[p.id]
    if (!s) return best
    const value = s.solves * 3 + s.skillUses - s.misses
    if (!best || value > best.score) return { id: p.id, score: value }
    return best
  }, null)

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Panel glow={won} className="animate-rise p-6 sm:p-8">
        <SectionLabel>{won ? 'Shift complete · 18:52' : 'Shift terminated'}</SectionLabel>
        <h1
          className={`mt-1 text-4xl font-black leading-none tracking-tight sm:text-6xl ${
            won ? 'text-neon text-glow' : 'text-flare'
          }`}
        >
          {won ? 'ALARM DISARMED' : 'LOCKDOWN HELD'}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {won
            ? 'The lift comes back online, the corridor lights drop to standby, and the badge reader by the door clicks green. Somebody still has to re-stick the sticky notes tomorrow.'
            : 'Out of coffee refills. Security will find the terminal exactly as you left it, and the sprint board still makes no sense to anyone.'}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-hairline p-4">
            <div className="label-caps">Final score</div>
            <div className="font-mono text-3xl font-black tabular-nums text-ink">
              {totalScore}
            </div>
          </div>
          <div className="rounded-lg border border-hairline p-4">
            <div className="label-caps">Stages cleared</div>
            <div className="font-mono text-3xl font-black tabular-nums text-ink">
              {cleared}/{LEVELS.length}
            </div>
          </div>
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: `${medal.accent}55`, backgroundColor: `${medal.accent}0d` }}
          >
            <div className="label-caps" style={{ color: medal.accent }}>
              Rating
            </div>
            <div
              className="font-mono text-[13px] font-bold leading-tight"
              style={{ color: medal.accent }}
            >
              {medal.label}
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              {medal.note}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <SectionLabel>Crew report</SectionLabel>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-hairline">
                  {['Operator', 'Archetype', 'Solves', 'Misses', 'Charges'].map((h) => (
                    <th key={h} className="label-caps py-2 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => {
                  const skill = getSkill(player.skillId)
                  const s = stats[player.id] ?? { solves: 0, misses: 0, skillUses: 0 }
                  return (
                    <tr key={player.id} className="border-b border-hairline-soft">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span aria-hidden>{player.avatar}</span>
                          <span className="text-[13px] font-semibold text-ink">
                            {player.name}
                          </span>
                          {mvp?.id === player.id ? (
                            <Chip accent="#ffb43a">MVP</Chip>
                          ) : null}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                          {player.role}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: skill.accent }}
                        >
                          {skill.glyph} {skill.name}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-sm text-neon">{s.solves}</td>
                      <td className="py-2.5 font-mono text-sm text-flare">{s.misses}</td>
                      <td className="py-2.5 font-mono text-sm text-ink">
                        {s.skillUses}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-hairline pt-5">
          {won ? null : (
            <Button tone="primary" size="lg" onClick={continueRun}>
              Insert coin — one more refill ▸
            </Button>
          )}
          <Button tone={won ? 'primary' : 'ghost'} size="lg" onClick={restart}>
            Run the whole shift again
          </Button>
          <Button onClick={() => goPhase('roster')}>Change the crew</Button>
          <Button tone="quiet" onClick={hardReset}>
            Title screen
          </Button>
        </div>
      </Panel>
    </div>
  )
}
