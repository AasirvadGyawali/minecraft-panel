'use client'

import { useState, useRef, useCallback } from 'react'
import api from '@/lib/api'
import clsx from 'clsx'

interface Plugin {
  name: string
  size: number
  path: string
}

interface PluginUploaderProps {
  serverId: string
  serverType: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function PluginUploader({ serverId, serverType }: PluginUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isModded = serverType === 'forge' || serverType === 'fabric'
  const folderName = isModded ? 'mods' : 'plugins'
  const fileLabel = isModded ? 'Mods' : 'Plugins'

  const loadPlugins = useCallback(async () => {
    setIsLoadingPlugins(true)
    try {
      const response = await api.get(`/api/servers/${serverId}/plugins`)
      setPlugins(response.data.data.plugins || [])
    } catch (err) {
      console.error('Failed to load plugins:', err)
    } finally {
      setIsLoadingPlugins(false)
    }
  }, [serverId])

  // Load plugins on mount
  useState(() => {
    loadPlugins()
  })

  async function uploadFile(file: File) {
    // Validate file type
    if (!file.name.endsWith('.jar') && !file.name.endsWith('.zip')) {
      setMessage({ text: 'Only .jar and .zip files are allowed', type: 'error' })
      return
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setMessage({ text: 'File too large. Maximum size is 50MB', type: 'error' })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      await api.post(`/api/servers/${serverId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          )
          setUploadProgress(progress)
        }
      })

      setMessage({ 
        text: `✅ ${file.name} uploaded successfully!`, 
        type: 'success' 
      })
      
      // Reload plugin list
      await loadPlugins()

    } catch (err: any) {
      setMessage({ 
        text: `❌ ${err.response?.data?.error || 'Upload failed'}`, 
        type: 'error' 
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) uploadFile(files[0])
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) uploadFile(files[0])
    // Reset input so same file can be uploaded again
    e.target.value = ''
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <span className="text-gray-400 text-sm font-medium">
          {fileLabel} ({folderName}/)
        </span>
        <button
          onClick={loadPlugins}
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
            isDragging
              ? 'border-green-500 bg-green-500/10'
              : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jar,.zip"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-3">
              <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-300 text-sm">Uploading...</p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-gray-500 text-xs">{uploadProgress}%</p>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-3">
                {isDragging ? '📥' : '☕'}
              </div>
              <p className="text-gray-300 text-sm font-medium">
                {isDragging ? 'Drop to upload!' : `Drop ${fileLabel} here`}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                or click to browse · .jar and .zip · max 50MB
              </p>
            </>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div className={clsx(
            'p-3 rounded-lg text-sm',
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          )}>
            {message.text}
          </div>
        )}

        {/* Installed Plugins List */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Installed {fileLabel}
          </h3>

          {isLoadingPlugins ? (
            <div className="text-center py-4">
              <div className="w-5 h-5 border border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : plugins.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-800 rounded-lg">
              <p className="text-gray-500 text-sm">
                No {folderName} installed yet
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Upload a .jar file above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {plugins.map((plugin) => (
                <div
                  key={plugin.path}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                >
                  <span className="text-xl">☕</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{plugin.name}</p>
                    <p className="text-xs text-gray-500">{formatSize(plugin.size)}</p>
                  </div>
                  <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                    Installed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Restart Notice */}
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-400 text-xs">
            ⚠️ Restart the server after installing plugins for them to take effect
          </p>
        </div>
      </div>
    </div>
  )
}