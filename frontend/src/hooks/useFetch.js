import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client.js'

export function useFetch(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let annule = false
    api
      .get(path)
      .then((data) => !annule && setState({ data, loading: false, error: null }))
      .catch((err) => !annule && setState({ data: null, loading: false, error: err.message }))
    return () => {
      annule = true
    }
  }, [path, version])

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }))
    setVersion((v) => v + 1)
  }, [])

  return { ...state, reload }
}
