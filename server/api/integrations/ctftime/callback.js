import got from 'got'
import { responses } from '../../../responses'
import * as auth from '../../../auth'
import config from '../../../config/server'

const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const userEndpoint = 'https://graph.microsoft.com/me/memberOf'

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
    let tokenBody
    try {
      ({ body: tokenBody } = await got({
        url: tokenEndpoint,
        method: 'POST',
        responseType: 'json',
        form: {
          client_id: config.ctftime.clientId,
          client_secret: config.ctftime.clientSecret,
          code: req.body.ctftimeCode,
          scope: 'User.Read',
          redirect_uri: `${config.origin}/integrations/ctftime/callback`,
          grant_type: 'authorization_code'
        }
      }))
    } catch (e) {
      if (e instanceof got.HTTPError && e.response.statusCode === 401) {
        return responses.badCtftimeCode
      }
      throw e
    }
    const { body: graphBody } = await got({
      url: userEndpoint,
      responseType: 'json',
      headers: {
        authorization: `Bearer ${tokenBody.access_token}`
      }
    })
    const userBody = {
      team: graphBody[0] || undefined
    }
    if (userBody.team === undefined) {
      return responses.badCtftimeCode
    }
    const token = await auth.token.getToken(auth.token.tokenKinds.ctftimeAuth, {
      name: userBody.team.displayName,
      ctftimeId: userBody.team.id
    })
    return [responses.goodCtftimeToken, {
      ctftimeToken: token,
      ctftimeName: userBody.team.displayName,
      ctftimeId: userBody.team.id
    }]
  }
}
