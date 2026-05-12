/**
 * Domain errors for the analysis pipeline.
 *
 * Shared between server actions and client error-handling code.
 * These classes must NOT be in a 'use server' file because Next.js
 * only allows async function exports from 'use server' modules.
 */

export class NotFoundError extends Error {
  constructor(message = 'NotFoundError') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ProfileMissingError extends Error {
  constructor(message = 'ProfileMissingError') {
    super(message)
    this.name = 'ProfileMissingError'
  }
}
