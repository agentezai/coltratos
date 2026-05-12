// @vitest-environment jsdom
/**
 * T18: FeedbackThumbs DS primitive — unit tests
 *
 * Contract: REQ-026
 *
 * Behaviors tested:
 *  - Renders ThumbsUp and ThumbsDown buttons
 *  - Active state: filled/active when initialRating matches
 *  - Comment input appears after clicking a thumb
 *  - Comment max length 200 enforced on the input
 *  - "Enviar" button calls onSubmit with rating + comment
 *  - Re-clicking active thumb calls onSubmit(null, null) — toggle-off
 *  - Toast "Gracias por tu opinión" shown on success
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react'

afterEach(cleanup)

const { FeedbackThumbs } = await import('../../src/components/ui/feedback-thumbs')

// ── Fixtures ──────────────────────────────────────────────────────────────────

const noop = vi.fn()

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FeedbackThumbs — T18 (REQ-026)', () => {
  describe('Initial render', () => {
    it('renders thumbs-up and thumbs-down buttons', () => {
      const { container } = render(
        <FeedbackThumbs
          initialRating={null}
          initialComment={null}
          onSubmit={noop}
        />
      )
      expect(container.querySelector('[data-feedback-up]')).toBeDefined()
      expect(container.querySelector('[data-feedback-down]')).toBeDefined()
    })

    it('marks thumbs-up as active when initialRating = "up"', () => {
      const { container } = render(
        <FeedbackThumbs
          initialRating="up"
          initialComment={null}
          onSubmit={noop}
        />
      )
      const upBtn = container.querySelector('[data-feedback-up]')
      expect(upBtn?.getAttribute('data-active')).toBe('true')
    })

    it('marks thumbs-down as active when initialRating = "down"', () => {
      const { container } = render(
        <FeedbackThumbs
          initialRating="down"
          initialComment={null}
          onSubmit={noop}
        />
      )
      const downBtn = container.querySelector('[data-feedback-down]')
      expect(downBtn?.getAttribute('data-active')).toBe('true')
    })
  })

  describe('Comment input appears after clicking a thumb', () => {
    it('shows comment input after clicking thumbs-up', () => {
      const { container } = render(
        <FeedbackThumbs
          initialRating={null}
          initialComment={null}
          onSubmit={noop}
        />
      )
      const upBtn = container.querySelector('[data-feedback-up]') as HTMLElement
      fireEvent.click(upBtn)
      // Comment input and Enviar button should appear
      expect(screen.getByRole('textbox')).toBeDefined()
    })

    it('enforces maxLength=200 on the comment input', () => {
      const { container } = render(
        <FeedbackThumbs
          initialRating={null}
          initialComment={null}
          onSubmit={noop}
        />
      )
      const upBtn = container.querySelector('[data-feedback-up]') as HTMLElement
      fireEvent.click(upBtn)
      const input = screen.getByRole('textbox')
      expect(input.getAttribute('maxlength')).toBe('200')
    })
  })

  describe('Enviar submits rating + comment', () => {
    it('calls onSubmit with rating and comment when Enviar clicked', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { container } = render(
        <FeedbackThumbs
          initialRating={null}
          initialComment={null}
          onSubmit={onSubmit}
        />
      )

      // Click thumbs-up
      const upBtn = container.querySelector('[data-feedback-up]') as HTMLElement
      fireEvent.click(upBtn)

      // Type a comment
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Muy útil' } })

      // Click Enviar
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enviar/i }))
      })

      expect(onSubmit).toHaveBeenCalledWith('up', 'Muy útil')
    })

    it('calls onSubmit with null comment when no comment entered', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { container } = render(
        <FeedbackThumbs
          initialRating={null}
          initialComment={null}
          onSubmit={onSubmit}
        />
      )

      const downBtn = container.querySelector('[data-feedback-down]') as HTMLElement
      fireEvent.click(downBtn)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enviar/i }))
      })

      expect(onSubmit).toHaveBeenCalledWith('down', null)
    })
  })

  describe('Toggle-off: re-clicking active thumb', () => {
    it('calls onSubmit(null, null) when active thumb is re-clicked', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { container } = render(
        <FeedbackThumbs
          initialRating="up"
          initialComment={null}
          onSubmit={onSubmit}
        />
      )

      // Click active thumb again
      const upBtn = container.querySelector('[data-feedback-up]') as HTMLElement
      await act(async () => {
        fireEvent.click(upBtn)
      })

      expect(onSubmit).toHaveBeenCalledWith(null, null)
    })
  })

  describe('Toast confirmation on success', () => {
    it('shows "Gracias por tu opinión" toast after successful submit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { container } = render(
        <FeedbackThumbs
          initialRating={null}
          initialComment={null}
          onSubmit={onSubmit}
        />
      )

      const upBtn = container.querySelector('[data-feedback-up]') as HTMLElement
      fireEvent.click(upBtn)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enviar/i }))
      })

      expect(screen.getByText(/gracias por tu opinión/i)).toBeDefined()
    })
  })
})
