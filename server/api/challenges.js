import config from '../../config/server'
import * as challenges from '../challenges'
import { responses } from '../responses'
import { getChallengeScores } from '../cache/leaderboard'

export default {
  method: 'GET',
  path: '/challs',
  requireAuth: true,
  handler: async () => {
    if (Date.now() < config.startTime) {
      return responses.badNotStarted
    }

    const cleaned = challenges.getCleanedChallenges()
    const scores = await getChallengeScores({
      ids: cleaned.map(chall => chall.id)
    })

    return [responses.goodChallenges, cleaned.map((chall, i) => ({
      ...chall,
      points: scores[i]
    }))]
  }
}
