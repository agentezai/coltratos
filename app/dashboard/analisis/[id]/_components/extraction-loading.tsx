'use client'

/**
 * T20 — REQ-028
 *
 * ExtractionLoading — step-driven loading screen for analyses in progress.
 *
 * Rendered when `extraction_status` is `pending` or `extracting`.
 * Layout reuses T5's progress primitives (stepper + progress ring).
 *
 * This is a Client Component because:
 *  - It mounts a polling interval (setInterval / clearInterval)
 *  - It calls router.refresh() on terminal status
 *
 * NOTE: NFR-01 says RSC by default, but REQ-028 explicitly requires
 * polling behavior that needs browser APIs. 'use client' is intentional.
 * This component lives in app/dashboard/…/_components/ (not src/components/ui/),
 * so it does not affect the RSC purity test in rsc-purity.test.ts.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  STAGE_ORDER,
  STAGE_DISPLAY,
  stageToPct,
  type ExtractionStage,
} from './extraction-stages'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TerminalStatus = 'completed' | 'partial' | 'failed'
type LiveStatus = 'pending' | 'extracting' | TerminalStatus

const TERMINAL: Set<string> = new Set(['completed', 'partial', 'failed'])
const POLL_INTERVAL_MS = 5_000
const SAFETY_CAP_MS = 10 * 60 * 1_000 // 10 minutes

interface StatusPayload {
  extraction_status: LiveStatus
  extraction_stage: string | null
  pages_flagged: number
  updated_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// ExtractionStatusPoller — client-only polling child
//
// Exported for unit testing (contract.md § T20 "Polling stops on terminal
// status") — the parent ExtractionLoading renders it.
// ─────────────────────────────────────────────────────────────────────────────

interface PollerProps {
  analysisId: string
  initialStage: ExtractionStage | null
  onStageChange: (stage: ExtractionStage | null) => void
  onTerminal: () => void
}

export function ExtractionStatusPoller({
  analysisId,
  initialStage,
  onStageChange,
  onTerminal,
}: PollerProps) {
  const [timedOut, setTimedOut] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stoppedRef = useRef(false)

  function stopPolling() {
    stoppedRef.current = true
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (safetyRef.current !== null) {
      clearTimeout(safetyRef.current)
      safetyRef.current = null
    }
  }

  useEffect(() => {
    // Safety cap — 10 minutes
    safetyRef.current = setTimeout(() => {
      if (!stoppedRef.current) {
        stopPolling()
        setTimedOut(true)
      }
    }, SAFETY_CAP_MS)

    // Initial stage from server (no fetch needed on mount)
    // Kick off polling
    intervalRef.current = setInterval(async () => {
      if (stoppedRef.current) return
      try {
        const res = await fetch(`/api/analyses/${analysisId}/status`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const payload: StatusPayload = await res.json()
        const { extraction_status, extraction_stage } = payload

        // Update stage indicator regardless of terminal status
        onStageChange(extraction_stage as ExtractionStage | null)

        // Check terminal
        if (TERMINAL.has(extraction_status)) {
          stopPolling()
          onTerminal()
        }
      } catch {
        // Network error — keep polling (do not stop)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId])

  if (timedOut) {
    return (
      <div
        data-testid="extraction-timeout-banner"
        className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800"
      >
        <strong>El análisis está tardando más de lo esperado.</strong>{' '}
        Si el problema persiste,{' '}
        <a
          href="mailto:soporte@coltratos.co"
          className="underline hover:text-amber-900"
        >
          contacta a soporte
        </a>
        .
      </div>
    )
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Stepper
// ─────────────────────────────────────────────────────────────────────────────

function ExtractionStepper({ activeStage }: { activeStage: ExtractionStage | null }) {
  const activeIdx = activeStage ? STAGE_ORDER.indexOf(activeStage) : 0

  return (
    <div
      className="flex justify-center gap-0 mb-8"
      data-testid="extraction-stepper"
      aria-label="Pasos del análisis"
    >
      {STAGE_ORDER.map((stage, i) => {
        const done = i < activeIdx
        const active = i === activeIdx
        const display = STAGE_DISPLAY[stage]

        return (
          <div key={stage} className="flex items-center">
            <div
              className={[
                'flex flex-col items-center gap-1.5',
                done || active ? 'opacity-100' : 'opacity-40',
              ].join(' ')}
            >
              <div
                data-testid={`step-${i + 1}`}
                aria-current={active ? 'step' : undefined}
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                  done
                    ? 'bg-green-500 text-white'
                    : active
                    ? 'bg-blue-600 text-white'
                    : 'bg-graphite-100 text-graphite-500',
                ].join(' ')}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className="text-xs text-graphite-600 w-20 text-center">
                {display.label}
              </span>
              {active && (
                <span className="text-xs text-graphite-400 w-24 text-center">
                  {display.description}
                </span>
              )}
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div className="w-16 h-px bg-graphite-200 mb-6 mx-2" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress ring
// ─────────────────────────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const R = 40
  const circumference = 2 * Math.PI * R
  const offset = circumference * (1 - pct / 100)

  return (
    <svg
      width={100}
      height={100}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Progreso: ${pct}%`}
      data-testid="progress-ring"
    >
      <circle cx={50} cy={50} r={R} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={50}
        cy={50}
        r={R}
        fill="none"
        stroke="#2563eb"
        strokeWidth={8}
        strokeDasharray={String(circumference)}
        strokeDashoffset={String(offset)}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text
        x={50}
        y={55}
        textAnchor="middle"
        fill="#111827"
        fontSize={18}
        fontWeight="bold"
      >
        {pct}%
      </text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExtractionLoading — main export
// ─────────────────────────────────────────────────────────────────────────────

interface ExtractionLoadingProps {
  analysisId: string
  initialStage: ExtractionStage | null
}

export function ExtractionLoading({
  analysisId,
  initialStage,
}: ExtractionLoadingProps) {
  const router = useRouter()
  const [stage, setStage] = useState<ExtractionStage | null>(initialStage)

  const pct = stageToPct(stage)

  return (
    <div
      className="bg-white border border-graphite-200 rounded-xl p-6"
      data-testid="extraction-loading"
    >
      <h2 className="text-base font-semibold text-graphite-900 mb-6 text-center">
        Análisis en progreso
      </h2>

      <ExtractionStepper activeStage={stage} />

      <div className="flex justify-center mb-6">
        <ProgressRing pct={pct} />
      </div>

      {/* Processing details sidebar card */}
      <div className="bg-graphite-50 rounded-lg border border-graphite-200 p-4 max-w-sm mx-auto text-sm text-graphite-700">
        <p className="font-medium mb-2">¿Qué está pasando?</p>
        <ul className="space-y-1 text-xs text-graphite-500 list-disc list-inside">
          <li>Extrayendo el texto del pliego en PDF</li>
          <li>Identificando requisitos habilitantes</li>
          <li>Comparando con el perfil de tu empresa</li>
          <li>Calculando el semáforo de elegibilidad</li>
        </ul>
      </div>

      {/* Polling engine — invisible, no spinner element */}
      <ExtractionStatusPoller
        analysisId={analysisId}
        initialStage={stage}
        onStageChange={setStage}
        onTerminal={() => router.refresh()}
      />
    </div>
  )
}
