'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import clsx from 'clsx'

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  date: string
  type: string
}

interface FileManagerProps {
  serverId: string
}

// Icons for different file types
function FileIcon({ type, isDirectory }: { type: string; isDirectory: boolean }) {
  if (isDirectory) return <span>📁</span>
  const icons: Record<string, string> = {
    config: '⚙️',
    json: '📋',
    log: '📜',
    jar: '☕',
    archive: '🗜️',
    script: '📝',
    text: '📄',
  }
  return <span>{icons[type] || '📄'}</span>
}

// Format file size to human readable
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function FileManager({ serverId }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState('/data')
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const loadFiles = useCallback(async (path: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get(
        `/api/servers/${serverId}/files?path=${encodeURIComponent(path)}`
      )
      setFiles(response.data.data.files)
      setCurrentPath(path)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }, [serverId])

  useEffect(() => {
    loadFiles('/data')
  }, [loadFiles])

  async function openFile(file: FileItem) {
    if (file.isDirectory) {
      loadFiles(file.path)
      return
    }

    // Only open editable file types
    const editableTypes = ['config', 'json', 'text', 'log', 'script']
    if (!editableTypes.includes(file.type)) {
      setError(`Cannot edit ${file.name} — binary or unsupported file type`)
      return
    }

    setIsLoading(true)
    try {
      const response = await api.get(
        `/api/servers/${serverId}/files/content?path=${encodeURIComponent(file.path)}`
      )
      setFileContent(response.data.data.content)
      setEditingFile(file.path)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to open file')
    } finally {
      setIsLoading(false)
    }
  }

  async function saveFile() {
    if (!editingFile) return
    setIsSaving(true)
    setSaveMessage('')
    try {
      await api.post(`/api/servers/${serverId}/files/content`, {
        path: editingFile,
        content: fileContent,
      })
      setSaveMessage('✅ Saved!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err: any) {
      setSaveMessage('❌ ' + (err.response?.data?.error || 'Save failed'))
    } finally {
      setIsSaving(false)
    }
  }

  // Navigate up one directory
  function goUp() {
    const parts = currentPath.split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    loadFiles('/' + parts.join('/'))
  }

  // Build breadcrumb path parts
  function getBreadcrumbs() {
    const parts = currentPath.split('/').filter(Boolean)
    return parts.map((part, i) => ({
      name: part,
      path: '/' + parts.slice(0, i + 1).join('/')
    }))
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <span className="text-gray-400 text-sm font-medium">File Manager</span>
        {editingFile && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {editingFile.split('/').pop()}
            </span>
            {saveMessage && (
              <span className="text-xs text-green-400">{saveMessage}</span>
            )}
            <button
              onClick={() => setEditingFile(null)}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800"
            >
              ← Back
            </button>
            <button
              onClick={saveFile}
              disabled={isSaving}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* File Editor */}
      {editingFile ? (
        <div className="p-4">
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="w-full h-96 bg-gray-950 text-green-300 font-mono text-xs p-4 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500 resize-none"
            spellCheck={false}
          />
        </div>
      ) : (
        <>
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1 px-4 py-2 bg-gray-950 border-b border-gray-800 text-xs font-mono">
            <button
              onClick={() => loadFiles('/data')}
              className="text-green-400 hover:text-green-300"
            >
              /data
            </button>
            {getBreadcrumbs().slice(1).map((crumb) => (
              <span key={crumb.path} className="flex items-center gap-1">
                <span className="text-gray-600">/</span>
                <button
                  onClick={() => loadFiles(crumb.path)}
                  className="text-green-400 hover:text-green-300"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
            <button
              onClick={goUp}
              disabled={currentPath === '/data'}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 disabled:opacity-30"
            >
              ↑ Up
            </button>
            <button
              onClick={() => loadFiles(currentPath)}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800"
            >
              ↻ Refresh
            </button>
            <span className="text-xs text-gray-500 ml-auto">
              {files.length} items
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-400 mt-1 hover:text-red-300"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* File List */}
          <div className="divide-y divide-gray-800">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Empty directory
              </div>
            ) : (
              files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => openFile(file)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left"
                >
                  <FileIcon type={file.type} isDirectory={file.isDirectory} />
                  <span className={clsx(
                    'flex-1 text-sm truncate',
                    file.isDirectory ? 'text-blue-300' : 'text-gray-300'
                  )}>
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {file.isDirectory ? '' : formatSize(file.size)}
                  </span>
                  <span className="text-xs text-gray-600 flex-shrink-0 w-24 text-right">
                    {file.date}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}