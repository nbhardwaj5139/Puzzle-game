import { useEffect, useRef, useState } from 'react'
import { useGame } from '../game/store'
import {
  DEFAULT_CALIBRATION,
  MAX_CODE_LENGTH,
  MIN_CODE_LENGTH,
  checksumFor,
  checksumFormula,
  validateCalibration,
} from '../game/scene'
import { Button, Chip, Field, Modal, inputClass } from './ui/kit'
import type { Calibration } from '../game/types'

const MAX_PHOTO_BYTES = 6 * 1024 * 1024

interface RealityCheckPanelProps {
  open: boolean
  onClose: () => void
}

export function RealityCheckPanel({ open, onClose }: RealityCheckPanelProps) {
  const calibration = useGame((s) => s.calibration)
  const patchCalibration = useGame((s) => s.patchCalibration)
  const resetCalibration = useGame((s) => s.resetCalibration)
  const [draft, setDraft] = useState<Calibration>(calibration)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Re-open always shows what is actually in play, not an abandoned draft.
  useEffect(() => {
    if (!open) return
    setDraft(calibration)
    setSaved(false)
    setPhotoError(null)
  }, [open, calibration])

  const issues = validateCalibration(draft)
  const issueFor = (field: keyof Calibration) =>
    issues.find((i) => i.field === field)?.message ?? null

  function toggleCell(cell: number) {
    setSaved(false)
    setDraft((d) => {
      const exists = d.patternCells.includes(cell)
      return {
        ...d,
        patternCells: exists
          ? d.patternCells.filter((c) => c !== cell)
          : [...d.patternCells, cell],
      }
    })
  }

  function onPhoto(file: File | undefined) {
    if (!file) return
    setPhotoError(null)
    if (!file.type.startsWith('image/')) {
      setPhotoError('That is not an image file.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Keep it under 6 MB so the browser can hold it.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setSaved(false)
      setDraft((d) => ({
        ...d,
        photoDataUrl: typeof reader.result === 'string' ? reader.result : null,
        photoName: file.name,
      }))
    }
    reader.onerror = () => setPhotoError('The browser could not read that file.')
    reader.readAsDataURL(file)
  }

  function apply() {
    if (issues.length > 0) return
    patchCalibration({
      ...draft,
      badgeId: draft.badgeId.trim().toUpperCase(),
      patternCells: [...draft.patternCells],
    })
    setSaved(true)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Reality Check — calibrate to your office"
      subtitle="Every answer in the campaign is read from here. Point these fields at real things in your actual room and the physical-inspection mechanic works against your office instead of the drawn bay."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Field
            label="Level 01 · sticky-note code"
            hint={
              issueFor('keypadCode') ??
              `${MIN_CODE_LENGTH}–${MAX_CODE_LENGTH} digits. One sticky note is drawn per digit, in the whiteboard's colour order.`
            }
          >
            <input
              className={`${inputClass} font-mono tracking-[0.3em] ${
                issueFor('keypadCode') ? 'border-flare' : ''
              }`}
              value={draft.keypadCode}
              inputMode="numeric"
              maxLength={MAX_CODE_LENGTH}
              onChange={(e) => {
                setSaved(false)
                setDraft((d) => ({
                  ...d,
                  keypadCode: e.target.value.replace(/[^0-9]/g, ''),
                }))
              }}
            />
          </Field>

          <div>
            <span className="label-caps mb-1.5 block">
              Level 02 · mug wash order on the 3×3 rack
            </span>
            <div className="flex gap-4">
              <div className="grid w-fit grid-cols-3 gap-1.5">
                {Array.from({ length: 9 }, (_, i) => {
                  const step = draft.patternCells.indexOf(i)
                  const active = step !== -1
                  return (
                    <button
                      key={`cal-cell-${i}`}
                      type="button"
                      onClick={() => toggleCell(i)}
                      className={`h-11 w-11 rounded-lg border font-mono text-sm font-bold transition-all ${
                        active
                          ? 'border-neon bg-neon/20 text-neon'
                          : 'border-hairline bg-carbon text-ink-faint hover:border-neon/50'
                      }`}
                    >
                      {active ? step + 1 : i + 1}
                    </button>
                  )
                })}
              </div>
              <div className="flex-1 text-[11px] leading-relaxed text-ink-faint">
                Tap cells in the order the mugs were washed. The order you tap is the
                order players must trace, and the count feeds the finale checksum.
                <div className="mt-2 font-mono text-[11px] text-ink-soft">
                  path:{' '}
                  {draft.patternCells.length
                    ? draft.patternCells.map((c) => c + 1).join(' → ')
                    : '—'}
                </div>
                {issueFor('patternCells') ? (
                  <div className="mt-1 font-mono text-[11px] text-flare">
                    {issueFor('patternCells')}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <Field
            label="Level 03 · badge ID on the desk"
            hint={issueFor('badgeId') ?? 'Typed into the terminal as AUTH <badge-id>. Case-insensitive.'}
          >
            <input
              className={`${inputClass} font-mono uppercase ${
                issueFor('badgeId') ? 'border-flare' : ''
              }`}
              value={draft.badgeId}
              maxLength={16}
              onChange={(e) => {
                setSaved(false)
                setDraft((d) => ({ ...d, badgeId: e.target.value }))
              }}
            />
          </Field>

          <Field
            label="Level 03 · floor tiles between the pillars"
            hint={issueFor('tileCount') ?? 'Typed into the terminal as MOUNT <tile-count>.'}
          >
            <input
              className={`${inputClass} font-mono ${
                issueFor('tileCount') ? 'border-flare' : ''
              }`}
              value={draft.tileCount}
              inputMode="numeric"
              maxLength={2}
              onChange={(e) => {
                setSaved(false)
                setDraft((d) => ({
                  ...d,
                  tileCount: e.target.value.replace(/[^0-9]/g, ''),
                }))
              }}
            />
          </Field>

          <div className="rounded-lg border border-amber-signal/30 bg-amber-signal/5 p-3">
            <div className="label-caps text-amber-signal">Derived · finale checksum</div>
            <div className="mt-1 font-mono text-sm text-ink">
              {checksumFormula(draft)} = <strong>{checksumFor(draft)}</strong>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
              Computed from the two fields above, which is what chains the levels
              together. It updates itself — never enter it by hand.
            </p>
          </div>

          <div>
            <span className="label-caps mb-1.5 block">Workspace photo (optional)</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                Choose image
              </Button>
              {draft.photoDataUrl ? (
                <>
                  <Chip accent="#45d0ff">{draft.photoName ?? 'photo attached'}</Chip>
                  <Button
                    size="sm"
                    tone="danger"
                    onClick={() => {
                      setSaved(false)
                      setDraft((d) => ({ ...d, photoDataUrl: null, photoName: null }))
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <span className="text-[11px] text-ink-faint">
                  Falls back to the drawn bay.
                </span>
              )}
            </div>
            {photoError ? (
              <p className="mt-1.5 font-mono text-[11px] text-flare">{photoError}</p>
            ) : null}
            {draft.photoDataUrl ? (
              <img
                src={draft.photoDataUrl}
                alt="Workspace photo preview"
                className="mt-2 max-h-36 w-full rounded-lg border border-hairline object-cover"
              />
            ) : null}
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
              Photos stay in this browser tab — nothing is uploaded anywhere. Large
              images are dropped from saved setup rather than breaking storage.
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-6 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
        <Button tone="primary" onClick={apply} disabled={issues.length > 0}>
          {saved ? 'Saved ✓' : 'Apply calibration'}
        </Button>
        <Button
          onClick={() => {
            setSaved(false)
            resetCalibration()
            setDraft({
              ...DEFAULT_CALIBRATION,
              photoDataUrl: draft.photoDataUrl,
              photoName: draft.photoName,
            })
          }}
        >
          Restore defaults
        </Button>
        {issues.length > 0 ? (
          <span className="font-mono text-[11px] text-flare">
            {issues.length} field{issues.length === 1 ? '' : 's'} need attention
          </span>
        ) : (
          <span className="font-mono text-[11px] text-ink-faint">
            Facilitator tip: calibrate before you start, then keep this window shut.
          </span>
        )}
        <Button tone="quiet" className="ml-auto" onClick={onClose}>
          Done
        </Button>
      </footer>
    </Modal>
  )
}
