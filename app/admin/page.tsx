'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => {
        if (r.status === 403) { router.push('/'); return null }
        return r.json()
      })
      .then(data => {
        if (data) setUsers(data)
        setLoading(false)
      })
  }, [router])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setMessage(null)

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: newPassword }),
    })
    const data = await res.json()

    if (!res.ok) {
      setMessage({ text: data.error ?? 'Failed to create user', ok: false })
    } else {
      setMessage({ text: `Created account for ${data.email}`, ok: true })
      setNewEmail('')
      setNewPassword('')
      setUsers(prev => [...prev, { id: data.id, email: data.email, created_at: new Date().toISOString(), last_sign_in_at: null }])
    }
    setInviting(false)
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Remove ${email}? This will delete all their words.`)) return

    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id))
    } else {
      const data = await res.json()
      setMessage({ text: data.error ?? 'Failed to delete user', ok: false })
    }
  }

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--color-card-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
  } as const

  return (
    <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Vokabel
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: 500 }}>User management</h1>
        </div>
        <a
          href="/"
          style={{
            padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--color-card-border)',
            background: 'transparent', color: 'var(--color-text-muted)',
            fontSize: '13px', fontWeight: 500, textDecoration: 'none',
          }}
        >
          Back
        </a>
      </div>

      {/* Invite form */}
      <div style={{
        backgroundColor: 'var(--color-card-bg)',
        border: '1px solid var(--color-card-border)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Add user</h2>
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Temporary password (min 8 characters)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />
          {message && (
            <p style={{ fontSize: '0.875rem', margin: 0, color: message.ok ? 'var(--color-green-text)' : 'var(--color-article-die)' }}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={inviting}
            style={{
              alignSelf: 'flex-start',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-text-primary)',
              color: 'var(--color-bg)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: inviting ? 'not-allowed' : 'pointer',
              opacity: inviting ? 0.6 : 1,
            }}
          >
            {inviting ? 'Creating...' : 'Create account'}
          </button>
        </form>
      </div>

      {/* Users table */}
      <div style={{
        backgroundColor: 'var(--color-card-bg)',
        border: '1px solid var(--color-card-border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-card-border)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>
            {loading ? 'Loading...' : `${users.length} user${users.length !== 1 ? 's' : ''}`}
          </h2>
        </div>
        {!loading && users.map(user => (
          <div
            key={user.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.875rem 1.5rem',
              borderBottom: '1px solid var(--color-card-border)',
            }}
          >
            <div>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)', margin: 0 }}>{user.email}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Joined {new Date(user.created_at).toLocaleDateString()} ·{' '}
                {user.last_sign_in_at
                  ? `Last seen ${new Date(user.last_sign_in_at).toLocaleDateString()}`
                  : 'Never signed in'}
              </p>
            </div>
            <button
              onClick={() => handleDelete(user.id, user.email)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-card-border)',
                background: 'transparent',
                color: 'var(--color-article-die)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
