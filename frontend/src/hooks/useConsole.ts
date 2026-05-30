import { useEffect, useRef, useState, useCallback } from 'react'

interface LogLine {
  id: number
  message: string
  type: 'log' | 'error' | 'connected' | 'disconnected'
  timestamp: Date
}

interface UseConsoleOptions {
  serverId: string
  enabled: boolean
}

export function useConsole({ serverId, enabled }: UseConsoleOptions) {
  const [logs, setLogs] = useState<LogLine[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const counterRef = useRef(0)

  const addLog = useCallback((message: string, type: LogLine['type'] = 'log') => {
    setLogs(prev => {
      const newLog: LogLine = {
        id: counterRef.current++,
        message,
        type,
        timestamp: new Date()
      }
      // Keep only last 500 lines to prevent memory issues
      const updated = [...prev, newLog]
      return updated.length > 500 ? updated.slice(-500) : updated
    })
  }, [])

  const sendCommand = useCallback((command: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        serverId,
        command
      }))
    }
  }, [serverId])

  useEffect(() => {
    if (!enabled || !serverId) return

    const token = localStorage.getItem('token')
    if (!token) return

    // Connect to WebSocket with token in URL
    const wsUrl = `ws://localhost:4000?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      // Subscribe to this server's logs
      ws.send(JSON.stringify({
        type: 'subscribe',
        serverId
      }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'log':
            addLog(data.message, 'log')
            break
          case 'connected':
            addLog(data.message, 'connected')
            break
          case 'disconnected':
            addLog(data.message, 'disconnected')
            setIsConnected(false)
            break
          case 'error':
            addLog(data.message, 'error')
            setError(data.message)
            break
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      addLog('Disconnected from console', 'disconnected')
    }

    ws.onerror = () => {
      setError('WebSocket connection failed')
      setIsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [enabled, serverId, addLog])

  return { logs, isConnected, error, sendCommand }
}