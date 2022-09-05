import fetch from 'node-fetch'
import { responses } from '../../../responses'
import * as auth from '../../../auth'
import config from '../../../config/server'

const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const userEndpoint = 'https://graph.microsoft.com/v1.0/me/memberOf/microsoft.graph.group'

export default {
  method: 'POST',
  path: '/integrations/ctftime/callback',
  requireAuth: false,
  schema: {
    body: {
      type: 'object',
      properties: {
        ctftimeCode: {
          type: 'string'
        }
      },
      required: ['ctftimeCode']
    }
  },
  handler: async ({ req }) => {
    if (!config.ctftime) {
      return responses.badEndpoint
    }
    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: config.ctftime.clientId,
        client_secret: config.ctftime.clientSecret,
        code: req.body.ctftimeCode,
        scope: 'User.Read',
        redirect_uri: `${config.origin}/integrations/ctftime/callback`,
        grant_type: 'authorization_code'
      })
    })
    if (res.status === 401) {
      return responses.badCtftimeCode
    }
    const tokenBody = await res.json()
    const { value: graphBody } = await (await fetch(userEndpoint, {
      headers: {
        authorization: `Bearer ${tokenBody.access_token}`
      }
    })).json()
    const userBody = {
      team: graphBody[0] || undefined
    }
    if (userBody.team === undefined) {
      return responses.badCtftimeCode
    }
    const token = await auth.token.getToken(auth.token.tokenKinds.ctftimeAuth, {
      name: userBody.team.displayName || 'Unnamed Team',
      ctftimeId: userBody.team.id
    })
    return [responses.goodCtftimeToken, {
      ctftimeToken: token,
      ctftimeName: userBody.team.displayName || 'Unnamed Team',
      ctftimeId: userBody.team.id
    }]
  }
}
