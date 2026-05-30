import api from './api'

export async function getAdminStats() {
  const response = await api.get('/api/admin/stats')
  return response.data.data
}

export async function getAdminUsers() {
  const response = await api.get('/api/admin/users')
  return response.data.data
}

export async function getAdminServers() {
  const response = await api.get('/api/admin/servers')
  return response.data.data
}

export async function deleteUser(id: string) {
  const response = await api.delete(`/api/admin/users/${id}`)
  return response.data
}

export async function updateUserRole(id: string, role: string) {
  const response = await api.patch(`/api/admin/users/${id}/role`, { role })
  return response.data
}

export async function adminDeleteServer(id: string) {
  const response = await api.delete(`/api/admin/servers/${id}`)
  return response.data
}