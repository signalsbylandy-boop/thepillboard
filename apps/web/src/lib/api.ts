import type {
  AuthResponse,
  Post,
  PaginatedResponse,
  Comment,
  PostsQuery,
  CreatePostRequest,
  CreateCommentRequest,
} from '@pillboard/types'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, string>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string>),
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (!res.ok) {
    let body: { error?: string; code?: string; details?: Record<string, string> } = {}
    try {
      body = await res.json()
    } catch {
      // non-JSON error
    }
    throw new ApiError(body.code ?? 'UNKNOWN', body.error ?? 'Request failed', res.status, body.details)
  }

  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: (token: string) =>
    request<{ ok: boolean }>('/auth/logout', { method: 'POST', token }),

  me: (token: string) => request<AuthResponse['user']>('/auth/me', { token }),

  forgotPassword: (email: string) =>
    request<{ ok: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export const postsApi = {
  list: (query: PostsQuery = {}, token?: string) => {
    const params = new URLSearchParams()
    if (query.sort) params.set('sort', query.sort)
    if (query.tag) params.set('tag', query.tag)
    if (query.page) params.set('page', String(query.page))
    if (query.pageSize) params.set('pageSize', String(query.pageSize))
    if (query.search) params.set('search', query.search)
    const qs = params.toString()
    return request<PaginatedResponse<Post>>(`/posts${qs ? `?${qs}` : ''}`, { token })
  },

  get: (slug: string, token?: string) => request<Post>(`/posts/${slug}`, { token }),

  create: (data: CreatePostRequest, token: string) =>
    request<{ id: string; slug: string; status: string }>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  delete: (id: string, token: string) =>
    request<{ ok: boolean }>(`/posts/${id}`, { method: 'DELETE', token }),
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export const commentsApi = {
  list: (postId: string, token?: string) =>
    request<Comment[]>(`/comments?postId=${postId}`, { token }),

  create: (data: CreateCommentRequest, token: string) =>
    request<Comment>('/comments', { method: 'POST', body: JSON.stringify(data), token }),

  delete: (id: string, token: string) =>
    request<{ ok: boolean }>(`/comments/${id}`, { method: 'DELETE', token }),
}

// ─── Votes ────────────────────────────────────────────────────────────────────

export const votesApi = {
  vote: (
    data: { targetId: string; targetType: 'post' | 'comment'; value: 1 | -1 },
    token: string
  ) =>
    request<{ score: number; upVotes: number; downVotes: number; userVote: 1 | -1 | null }>(
      '/votes',
      { method: 'POST', body: JSON.stringify(data), token }
    ),
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export const moderationApi = {
  queue: (token: string, page = 1) =>
    request<{ items: unknown[]; page: number }>(`/moderation/queue?page=${page}`, { token }),

  action: (postId: string, data: { action: string; reason?: string }, token: string) =>
    request<{ ok: boolean; newStatus: string }>(`/moderation/queue/${postId}/action`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  reports: (token: string) => request<unknown[]>('/moderation/reports', { token }),

  logs: (token: string) => request<unknown[]>('/moderation/logs', { token }),
}

// ─── Presence (REST snapshot) ─────────────────────────────────────────────────

export const presenceApi = {
  globalStats: () => request<{ total: number; authenticated: number; anonymous: number }>('/presence/global/stats'),
  roomCount: (postId: string) => request<{ count: number }>(`/presence/room/${postId}/count`),
}

export { ApiError }
