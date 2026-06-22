// Wilson score lower bound — balances confidence with vote count
// Used to pre-compute hot_score stored in DB so it's sortable without full table scan
export function wilsonScore(up: number, down: number): number {
  const n = up + down
  if (n === 0) return 0
  const z = 1.96 // 95% confidence
  const p = up / n
  return (
    (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  )
}

// Time decay — boosts recent submissions (Hacker News style)
// score / (age_hours + 2)^gravity
export function hotScore(score: number, createdAt: string, gravity = 1.8): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000
  return score / Math.pow(ageHours + 2, gravity)
}

// For pre-storage: combine Wilson lower bound with time decay
export function computeHotScore(up: number, down: number, createdAt: string): number {
  const wilson = wilsonScore(up, down)
  return hotScore(wilson * 100, createdAt)
}
