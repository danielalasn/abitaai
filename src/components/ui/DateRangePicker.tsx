'use client'

import { useEffect, useRef, useState } from 'react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay,
  isWithinInterval, startOfDay, endOfDay, subDays, subMonths as subM, subWeeks
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

export type DateRange = { start: string; end: string }

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
  onClear: () => void
}

const PRESETS = [
  { label: 'Hoy', start: () => startOfDay(new Date()), end: () => endOfDay(new Date()) },
  { label: 'Ayer', start: () => startOfDay(subDays(new Date(), 1)), end: () => endOfDay(subDays(new Date(), 1)) },
  { label: 'Últimos 7 días', start: () => startOfDay(subDays(new Date(), 6)), end: () => endOfDay(new Date()) },
  { label: 'Últimas 2 semanas', start: () => startOfDay(subWeeks(new Date(), 2)), end: () => endOfDay(new Date()) },
  { label: 'Últimos 30 días', start: () => startOfDay(subDays(new Date(), 29)), end: () => endOfDay(new Date()) },
  { label: 'Mes pasado', start: () => startOfMonth(subM(new Date(), 1)), end: () => endOfMonth(subM(new Date(), 1)) },
  { label: 'Últimos 3 meses', start: () => startOfDay(subM(new Date(), 3)), end: () => endOfDay(new Date()) },
  { label: 'Este año', start: () => new Date(new Date().getFullYear(), 0, 1), end: () => endOfDay(new Date()) },
]

function buildDaysGrid(currentMonth: Date) {
  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  const days: Date[] = []
  let cur = start
  while (cur <= end) {
    days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}

export default function DateRangePicker({ value, onChange, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selecting, setSelecting] = useState<Date | null>(null) // first click anchor
  const [hovered, setHovered] = useState<Date | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const days = buildDaysGrid(currentMonth)

  const handleDayClick = (day: Date) => {
    if (!selecting) {
      setSelecting(day)
    } else {
      const [s, e] = day >= selecting ? [selecting, day] : [day, selecting]
      onChange({
        start: format(startOfDay(s), "yyyy-MM-dd"),
        end: format(endOfDay(e), "yyyy-MM-dd"),
      })
      setSelecting(null)
      setHovered(null)
      setOpen(false)
    }
  }

  const handlePreset = (preset: typeof PRESETS[0]) => {
    onChange({
      start: format(preset.start(), "yyyy-MM-dd"),
      end: format(preset.end(), "yyyy-MM-dd"),
    })
    setSelecting(null)
    setOpen(false)
  }

  const hasValue = value.start && value.end

  const displayLabel = hasValue
    ? (() => {
        const s = new Date(value.start + 'T00:00:00')
        const e = new Date(value.end + 'T00:00:00')
        if (isSameDay(s, e)) return format(s, 'd MMM yyyy', { locale: es })
        return `${format(s, 'd MMM', { locale: es })} – ${format(e, 'd MMM yyyy', { locale: es })}`
      })()
    : 'Seleccionar período'

  const rangeStart = selecting || (value.start ? new Date(value.start + 'T00:00:00') : null)
  const rangeEnd = selecting && hovered ? hovered : (value.end ? new Date(value.end + 'T00:00:00') : null)

  const isInRange = (day: Date) => {
    if (!rangeStart || !rangeEnd) return false
    const [lo, hi] = rangeStart <= rangeEnd ? [rangeStart, rangeEnd] : [rangeEnd, rangeStart]
    return isWithinInterval(day, { start: startOfDay(lo), end: endOfDay(hi) })
  }

  const isRangeEdge = (day: Date) => {
    if (!rangeStart) return false
    if (isSameDay(day, rangeStart)) return true
    if (rangeEnd && isSameDay(day, rangeEnd)) return true
    return false
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center justify-between gap-2 h-auto md:h-9 py-2 md:py-0 px-3 rounded-lg border text-xs md:text-sm font-medium transition-all w-full sm:w-auto
          ${open
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500/60 text-indigo-700 dark:text-indigo-300'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
          } shadow-sm`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Calendar size={14} className={`shrink-0 ${open ? 'text-indigo-500' : 'text-zinc-400'}`} />
          <span className={`whitespace-nowrap truncate ${hasValue ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
            {displayLabel}
          </span>
        </div>
        {hasValue && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); setSelecting(null) }}
            className="ml-1 p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 text-zinc-400 hover:text-rose-500 transition-colors"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-[100] flex flex-col md:flex-row shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0b0b0d] overflow-hidden animate-in slide-in-from-top-2 duration-150 w-[320px] md:w-auto max-w-[calc(100vw-2rem)]">
          
          {/* Presets */}
          <div className="w-full md:w-44 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 p-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 md:gap-0.5 no-scrollbar shrink-0">
            <p className="hidden md:block text-[10px] uppercase font-bold tracking-widest text-zinc-400 px-2 py-1">Períodos</p>
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className="shrink-0 whitespace-nowrap text-left text-sm px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors bg-zinc-50 dark:bg-zinc-900 md:bg-transparent"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-4 w-full md:w-72 shrink-0">

            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <ChevronLeft size={16} className="text-zinc-500" />
              </button>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <ChevronRight size={16} className="text-zinc-500" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-zinc-400 uppercase py-1">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-y-1">
              {days.map((day, i) => {
                const inRange = isInRange(day)
                const isEdge = isRangeEdge(day)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-center relative
                      ${inRange && !isEdge ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}
                    `}
                    onMouseEnter={() => selecting && setHovered(day)}
                    onMouseLeave={() => selecting && setHovered(null)}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className={`
                      h-8 w-8 flex items-center justify-center rounded-full text-xs cursor-pointer transition-all
                      ${isEdge ? 'bg-indigo-600 text-white font-bold shadow-md' : ''}
                      ${!isEdge && isToday ? 'border border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold' : ''}
                      ${!isEdge && !isToday && isCurrentMonth ? 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800' : ''}
                      ${!isCurrentMonth ? 'text-zinc-300 dark:text-zinc-700' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Footer hint */}
            <p className="text-[10px] text-zinc-400 text-center mt-3">
              {selecting ? 'Ahora selecciona el día final' : 'Haz clic en un día para empezar'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
