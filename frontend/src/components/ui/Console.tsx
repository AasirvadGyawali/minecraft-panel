'use client'

import { useEffect, useRef, useState } from 'react'
import { useConsole } from '@/hooks/useConsole'
import clsx from 'clsx'

interface ConsoleProps {
  serverId: string
  serverStatus: string
}

// Color-code different types of Minecraft log lines
function getLineColor(message: string): string {
  if (message.includes('ERROR') || message.includes('WARN')) return 'text-red-400'
  if (message.includes('INFO')) return 'text-gray-300'
  if (message.includes('joined the game')) return 'text-green-400'
  if (message.includes('left the game')) return 'text-yellow-400'
  if (message.includes('Done') && message.includes('For help')) return 'text-green-300 font-bold'
  if (message.startsWith('>')) return 'text-blue-400'
  return 'text-gray-400'
}

export default function Console({ serverId, serverStatus }: ConsoleProps) {
  const isRunning = serverStatus === 'running'
  const { logs, isConnected, sendCommand } = useConsole({
    serverId,
    enabled: isRunning
  })

  const [command, setCommand] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  function handleSendCommand(e: React.FormEvent) {
    e.preventDefault()
    if (!command.trim()) return

    sendCommand(command.trim())
    setCommandHistory(prev => [command.trim(), ...prev.slice(0, 49)])
    setCommand('')
    setHistoryIndex(-1)
  }

  // Navigate command history with arrow keys
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
      setHistoryIndex(newIndex)
      setCommand(commandHistory[newIndex] || '')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIndex = Math.max(historyIndex - 1, -1)
      setHistoryIndex(newIndex)
      setCommand(newIndex === -1 ? '' : commandHistory[newIndex])
    }
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">

      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm font-mono">Console</span>
          {isRunning && (
            <span className={clsx(
              'flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full',
              isConnected
                ? 'text-green-400 bg-green-500/10'
                : 'text-yellow-400 bg-yellow-500/10'
            )}>
              <span className={clsx(
                'w-1.5 h-1.5 rounded-full',
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
              )} />
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{logs.length} lines</span>
          <button
            onClick={() => {}}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Log Output */}
      <div
        className="h-96 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        {!isRunning ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">Server is not running</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-5 h-5 border border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Connecting to console...</p>
            </div>
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 hover:bg-gray-900/50 px-1 rounded">
                <span className="text-gray-600 flex-shrink-0 select-none">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className={clsx('break-all', getLineColor(log.message))}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Command Input */}
      <div className="border-t border-gray-800 p-3">
        <form onSubmit={handleSendCommand} className="flex gap-2">
          <span className="text-green-400 font-mono text-sm self-center">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? "Type a command..." : "Server is offline"}
            disabled={!isRunning || !isConnected}
            className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none placeholder-gray-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isRunning || !isConnected || !command.trim()}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs rounded font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}