import { useState } from 'react'

export default function LoginForm({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await onLogin(email, password)
    if (err) setError(traducirError(err.message))
    setLoading(false)
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">

        {/* Ícono + título */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
            <IconLock />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Acceso restringido</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
            Ingresá tus credenciales para cargar datos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@email.com"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
              <IconAlert />
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <IconSpinner />}
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}

function traducirError(msg) {
  if (msg?.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (msg?.includes('Email not confirmed'))        return 'Confirmá tu correo antes de ingresar.'
  if (msg?.includes('Too many requests'))          return 'Demasiados intentos. Esperá unos minutos.'
  return msg ?? 'Error al iniciar sesión.'
}

function IconLock() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
