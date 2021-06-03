import { getScore } from '../util/scores'
import {
  WorkerRequest,
  WorkerResponse,
  InternalChallengeInfo,
  InternalUserInfo,
  InternalGraphEntry,
} from './types'
import { Challenge } from '../challenges/types'

type IntermediateUserInfo = InternalUserInfo & {
  lastSolve: number | undefined
  lastTiebreakEligibleSolve: number | undefined
  solvedChallengeIds: Challenge['id'][]
}

export default ({
  solves,
  users,
  graphUpdate,
  challenges,
  config,
}: WorkerRequest): WorkerResponse => {
  const challengeInfos = new Map<
    InternalChallengeInfo['id'],
    InternalChallengeInfo
  >()
  for (let i = 0; i < challenges.length; i++) {
    const challenge = challenges[i]
    challengeInfos.set(challenge.id, {
      id: challenge.id,
      tiebreakEligible: challenge.tiebreakEligible,
      solves: 0,
      score: 0,
    })
  }
  const userInfos = new Map<IntermediateUserInfo['id'], IntermediateUserInfo>()
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    userInfos.set(user.id, {
      id: user.id,
      name: user.name,
      division: user.division,
      score: 0,
      lastSolve: undefined,
      lastTiebreakEligibleSolve: undefined,
      solvedChallengeIds: [],
    })
  }

  const graphSampleTime = config.leaderboard.graphSampleTime
  const calcSamples = ({
    start,
    end,
  }: {
    start: number
    end: number
  }): number[] => {
    const samples = []
    const sampleStart = Math.ceil(start / graphSampleTime) * graphSampleTime
    const sampleEnd = Math.floor(end / graphSampleTime) * graphSampleTime

    for (
      let sample = sampleStart;
      sample <= sampleEnd;
      sample += graphSampleTime
    ) {
      samples.push(sample)
    }
    return samples
  }

  let lastIdx = 0
  const calcScores = (sample: number): void => {
    for (; lastIdx < solves.length; lastIdx++) {
      const challId = solves[lastIdx].challengeid
      const userId = solves[lastIdx].userid
      const createdAt = solves[lastIdx].createdat.valueOf()

      if (createdAt > sample) {
        break
      }

      const challengeInfo = challengeInfos.get(challId)
      if (challengeInfo === undefined) {
        continue
      }
      const userInfo = userInfos.get(userId)
      if (userInfo === undefined) {
        continue
      }

      challengeInfo.solves++

      userInfo.lastSolve = createdAt
      if (challengeInfo.tiebreakEligible) {
        userInfo.lastTiebreakEligibleSolve = createdAt
      }

      userInfo.solvedChallengeIds.push(challId)
    }

    let maxSolves = 0
    for (const [, challengeInfo] of challengeInfos) {
      if (challengeInfo.solves > maxSolves) {
        maxSolves = challengeInfo.solves
      }
    }

    for (let i = 0; i < challenges.length; i++) {
      const challenge = challenges[i]
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const challengeInfo = challengeInfos.get(challenge.id)!
      challengeInfo.score = getScore(
        challenge.points.min,
        challenge.points.max,
        maxSolves,
        challengeInfo.solves
      )
    }

    for (const [, userInfo] of userInfos) {
      userInfo.score = 0
      for (let i = 0; i < userInfo.solvedChallengeIds.length; i++) {
        const challengeInfo = challengeInfos.get(userInfo.solvedChallengeIds[i])
        if (challengeInfo === undefined) {
          continue
        }
        userInfo.score += challengeInfo.score
      }
    }
  }

  const userCompare = (a: IntermediateUserInfo, b: IntermediateUserInfo) => {
    // sort the users by score
    // if two user's scores are the same, sort by last tiebreakEligible solve time
    // if neither user has any tiebreakEligible solves, sort by last solve time
    const scoreCompare = b.score - a.score
    if (scoreCompare !== 0) {
      return scoreCompare
    }
    if (
      a.lastTiebreakEligibleSolve !== undefined ||
      b.lastTiebreakEligibleSolve !== undefined
    ) {
      return (
        (a.lastTiebreakEligibleSolve ?? Infinity) -
        (b.lastTiebreakEligibleSolve ?? Infinity)
      )
    }

    if (a.lastSolve === undefined && b.lastSolve === undefined) return 0
    return (a.lastSolve ?? Infinity) - (b.lastSolve ?? Infinity)
  }

  const leaderboardUpdate = Math.min(Date.now(), config.endTime)
  const samples = calcSamples({
    start: Math.max(graphUpdate + 1, config.startTime),
    end: leaderboardUpdate,
  })

  const graphLeaderboards: InternalGraphEntry[] = []
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]
    calcScores(sample)
    const graphUserInfos: InternalGraphEntry['userInfos'] = []
    for (const [, userInfo] of userInfos) {
      graphUserInfos.push({
        id: userInfo.id,
        score: userInfo.score,
      })
    }
    graphLeaderboards.push({
      sample,
      userInfos: graphUserInfos,
    })
  }

  const cleanIntermediateInfo = ({
    id,
    name,
    division,
    score,
  }: IntermediateUserInfo): InternalUserInfo => ({ id, name, division, score })

  calcScores(leaderboardUpdate)
  const leaderboard = Array.from(userInfos.values())
    .filter(userInfo => userInfo.lastSolve !== undefined)
    .sort(userCompare)
    .map(cleanIntermediateInfo)

  return {
    leaderboard,
    graphLeaderboards,
    challengeInfos,
    leaderboardUpdate,
  }
}
