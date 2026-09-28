import { useEffect, useId, useRef, useState } from 'react'
import { PencilIcon } from '../../components/PencilIcon'
import { formatHours } from './format'

// Must match maxWeeklyHours in api/people.go.
const MAX_WEEKLY_HOURS = 168

type Props = {
  name: string
  hours: number
  disabled: boolean
  onSave: (hours: number) => void
}

export function WeeklyHoursEditor({ name, hours, disabled, onSave }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Closing the editor unmounts the input, which can fire a trailing blur.
  const closing = useRef(false)
  const restoreFocus = useRef(false)

  useEffect(() => {
    if (draft === null && restoreFocus.current) {
      restoreFocus.current = false
      buttonRef.current?.focus()
    }
  }, [draft])

  if (draft === null) {
    return (
      <button
        ref={buttonRef}
        type="button"
        // aria-disabled rather than disabled, so the button keeps focus while its save is pending.
        aria-disabled={disabled}
        aria-label={`Edit weekly hours for ${name}, currently ${formatHours(hours)}`}
        title="Edit weekly hours"
        onClick={() => {
          if (disabled) return
          closing.current = false
          setDraft(String(hours))
        }}
        className="group inline-flex w-full items-center justify-end gap-1.5 rounded-md border border-transparent px-2 py-0.5 hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-blue-600 aria-disabled:opacity-60 dark:hover:border-gray-700 dark:hover:bg-gray-900"
      >
        {formatHours(hours)}h
        <PencilIcon className="size-3.5 text-gray-400 group-hover:text-gray-700 dark:text-gray-600 dark:group-hover:text-gray-300" />
      </button>
    )
  }

  function close({ refocus }: { refocus: boolean }) {
    closing.current = true
    restoreFocus.current = refocus
    setDraft(null)
    setInvalid(false)
  }

  function commit(value: string, { refocus }: { refocus: boolean }) {
    const parsed = parseHours(value)
    if (parsed === null) {
      setInvalid(true)
      return
    }
    close({ refocus })
    if (parsed !== hours) onSave(parsed)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={MAX_WEEKLY_HOURS}
        step="any"
        autoFocus
        aria-label={`Weekly hours for ${name}`}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        value={draft}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setDraft(e.target.value)
          setInvalid(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Focus moves to the edit button before keypress fires, which would activate it.
            e.preventDefault()
            commit(e.currentTarget.value, { refocus: true })
          }
          if (e.key === 'Escape') close({ refocus: true })
        }}
        onBlur={(e) => {
          if (!closing.current) commit(e.currentTarget.value, { refocus: false })
        }}
        className="w-20 rounded-md border border-gray-300 px-2 py-0.5 text-right focus:outline-2 focus:outline-blue-600 aria-invalid:border-red-600 aria-invalid:outline-red-600 dark:border-gray-700"
      />
      {invalid ? (
        <span id={errorId} className="text-xs text-red-700 dark:text-red-300">
          Enter 0–{MAX_WEEKLY_HOURS} hours
        </span>
      ) : (
        <span className="text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">Enter to save · Esc to cancel</span>
      )}
    </div>
  )
}

function parseHours(value: string): number | null {
  if (value.trim() === '') return null
  const hours = Number(value)
  return Number.isFinite(hours) && hours >= 0 && hours <= MAX_WEEKLY_HOURS ? hours : null
}
