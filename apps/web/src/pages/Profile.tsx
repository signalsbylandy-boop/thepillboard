import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

interface ProfileUser {
  id: string
  username: string
  role: string
  karma: number
  avatarUrl: string | null
  bio: string | null
  createdAt: string
  recentPosts: Array<{
    id: string
    title: string
    slug: string
    score: number
    commentCount: number
    createdAt: string
  }>
}

async function fetchProfile(username: string): Promise<ProfileUser> {
  const res = await fetch(`/api/users/${username}`)
  if (!res.ok) throw new Error('User not found')
  return res.json()
}

export default function Profile() {
  const { username } = useParams<{ username: string }>()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user', username],
    queryFn: () => fetchProfile(username!),
    enabled: !!username,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="py-16 text-center text-gray-500">
        User not found.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-2xl font-bold text-orange-600 dark:bg-orange-900">
              {profile.username[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.username}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-orange-600">{profile.karma} karma</span>
              {profile.role !== 'user' && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {profile.role}
                </span>
              )}
              <span>joined {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-gray-700 dark:text-gray-300">{profile.bio}</p>
        )}
      </div>

      {profile.recentPosts.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Recent Submissions
          </h2>
          <ul className="space-y-2">
            {profile.recentPosts.map((post) => (
              <li
                key={post.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <Link
                  to={`/post/${post.slug}`}
                  className="font-medium text-gray-900 hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
                >
                  {post.title}
                </Link>
                <div className="mt-1 flex gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>{post.score} points</span>
                  <span>{post.commentCount} comments</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
