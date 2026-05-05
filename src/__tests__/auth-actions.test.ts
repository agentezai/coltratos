import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest'

// next/navigation redirect throws a special error in Next.js;
// mock it so server actions can be tested without the full runtime.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: (_k: string) => 'http://localhost:3000' }),
}))

// Mock the Supabase client module so tests don't hit the network.
const mockSignUp = vi.fn()
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockResetPassword = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPassword,
      updateUser: mockUpdateUser,
    },
  }),
}))

// Import after mocks are established.
const { signup, login, signOut, forgotPassword, updatePassword } = await import(
  '@/app/(auth)/actions'
)

describe('auth server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ----------------------------------------------------------------
  // signup
  // ----------------------------------------------------------------
  describe('signup', () => {
    it('returns {} on success (REQ-007)', async () => {
      mockSignUp.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
      const result = await signup('a@b.com', 'pass1234')
      expect(result).toEqual({})
    })

    it('returns { error } on Supabase error (REQ-007)', async () => {
      mockSignUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } })
      const result = await signup('a@b.com', 'pass1234')
      expect(result).toEqual({ error: 'User already registered' })
    })

    it('does not call any empresa INSERT directly (RN-007)', async () => {
      mockSignUp.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
      await signup('a@b.com', 'pass1234')
      // The only Supabase call should be auth.signUp — no DB table calls
      expect(mockSignUp).toHaveBeenCalledOnce()
      expect(mockSignIn).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------------
  // login
  // ----------------------------------------------------------------
  describe('login', () => {
    it('redirects to /dashboard on success (REQ-008)', async () => {
      mockSignIn.mockResolvedValue({ error: null })
      await expect(login('a@b.com', 'pass1234')).rejects.toThrow('REDIRECT:/dashboard')
    })

    it('returns { error } on invalid credentials (REQ-008, TC-003)', async () => {
      mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
      const result = await login('a@b.com', 'wrongpass')
      expect(result).toEqual({ error: 'Invalid login credentials' })
    })

    it('honours the redirectTo param on success (RN-003)', async () => {
      mockSignIn.mockResolvedValue({ error: null })
      await expect(login('a@b.com', 'pass1234', '/empresa')).rejects.toThrow('REDIRECT:/empresa')
    })
  })

  // ----------------------------------------------------------------
  // signOut
  // ----------------------------------------------------------------
  describe('signOut', () => {
    it('calls auth.signOut and redirects to /login (REQ-012)', async () => {
      mockSignOut.mockResolvedValue({ error: null })
      await expect(signOut()).rejects.toThrow('REDIRECT:/login')
      expect(mockSignOut).toHaveBeenCalledOnce()
    })
  })

  // ----------------------------------------------------------------
  // forgotPassword
  // ----------------------------------------------------------------
  describe('forgotPassword', () => {
    it('returns void for a known email (REQ-010)', async () => {
      mockResetPassword.mockResolvedValue({ error: null })
      const result = await forgotPassword('known@b.com')
      expect(result).toBeUndefined()
    })

    it('returns void even when Supabase errors — no enumeration (RN-010, TC-010)', async () => {
      mockResetPassword.mockResolvedValue({ error: { message: 'User not found' } })
      const result = await forgotPassword('notfound@b.com')
      expect(result).toBeUndefined()
    })
  })

  // ----------------------------------------------------------------
  // updatePassword
  // ----------------------------------------------------------------
  describe('updatePassword', () => {
    it('redirects to /dashboard on success (REQ-011)', async () => {
      mockUpdateUser.mockResolvedValue({ error: null })
      await expect(updatePassword('NewPass123!')).rejects.toThrow('REDIRECT:/dashboard')
    })

    it('returns { error } on Supabase error (REQ-011)', async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: 'Password too short' } })
      const result = await updatePassword('a')
      expect(result).toEqual({ error: 'Password too short' })
    })
  })
})
