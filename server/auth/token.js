const { promisify } = require('util')
const crypto = require('crypto')
const config = require('../../config')

const randomBytes = promisify(crypto.randomBytes)
const tokenKey = Buffer.from(config.tokenKey, 'base64')

const tokenKinds = {
  auth: 0,
  team: 1,
  verify: 2
}

const tokenExpiries = {
  [tokenKinds.auth]: Infinity,
  [tokenKinds.team]: Infinity,
  [tokenKinds.verify]: 1000 * 60 * 10
}

const timeNow = () => Math.floor(Date.now() / 1000)

const encryptToken = async (content) => {
  const iv = await randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', tokenKey, iv)
  const cipherText = cipher.update(JSON.stringify(content))
  cipher.final()
  const tokenContent = Buffer.concat([iv, cipherText, cipher.getAuthTag()])
  return tokenContent.toString('base64')
}

const decryptToken = async (token) => {
  try {
    const tokenContent = Buffer.from(token, 'base64')
    const iv = tokenContent.slice(0, 12)
    const authTag = tokenContent.slice(tokenContent.length - 16)
    const cipher = crypto.createDecipheriv('aes-256-gcm', tokenKey, iv)
    cipher.setAuthTag(authTag)
    const plainText = cipher.update(tokenContent.slice(12, tokenContent.length - 16))
    return JSON.parse(plainText)
  } catch (e) {
    return null
  }
}

const getData = async (expectedTokenKind, token) => {
  const content = await decryptToken(token)
  if (content === null) {
    return null
  }
  const { k: kind, t: createdAt, d: data } = content
  if (kind !== expectedTokenKind) {
    return null
  }
  if (createdAt + tokenExpiries[kind] < timeNow()) {
    return null
  }
  return data
}

const getToken = async (tokenKind, data) => {
  const token = await encryptToken({
    k: tokenKind,
    t: timeNow(),
    d: data
  })
  return token
}

module.exports = {
  getData,
  getToken,
  tokenKinds
}
