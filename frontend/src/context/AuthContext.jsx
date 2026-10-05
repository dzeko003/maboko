import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(
    () =>
      api
        .get('/auth/me')
        .then(setUser)
        .catch(() => setUser(null))
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  async function login(email, motDePasse) {
    await api.post('/auth/connexion', { email, motDePasse })
    await refresh()
  }

  // L'inscription n'ouvre pas de session : le compte doit d'abord être activé via le lien reçu par e-mail
  function register(data) {
    return api.post('/auth/inscription', data)
  }

  async function activate(jeton) {
    await api.post('/auth/activation', { jeton })
    await refresh()
  }

  function resendActivation(email) {
    return api.post('/auth/activation/renvoyer', { email })
  }

  async function logout() {
    await api.post('/auth/deconnexion').catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, activate, resendActivation, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
