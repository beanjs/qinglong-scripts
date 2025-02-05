const { createHash, createCipheriv } = require('crypto')
const { default: axios } = require('axios')
const { setTimeout } = require('timers/promises')
const { v4 } = require('uuid')

const dstWares = ['11318', '11319', '11317', '2478']

async function mtversion () {
  const url = 'https://itunes.apple.com/cn/lookup?id=1600482450'

  const { data } = await axios.get(url)
  return data.results[0].version
}

async function daytime () {
  const now = new Date(Date.now())
  const dtm = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return dtm.getTime().toString()
}

async function istoday (dv) {
  const ds = parseInt(await daytime())
  const de = ds + 24 * 60 * 60 * 1000

  return dv >= ds && dv < de
}

async function sign (data) {
  const value = Object.keys(data)
    .sort()
    .map(key => data[key])
    .join('')

  const salt = '2af72f100c356273d46284f6fd1dfc08'
  const tsp = Date.now().toString()

  const raw = `${salt}${value}${tsp}`
  const md5 = createHash('md5')

  return {
    signature: md5.update(raw).digest('hex'),
    timestamp: tsp
  }
}

async function encrypt (data) {
  const key = 'qbhajinldepmucsonaaaccgypwuvcjaa'
  const iv = '2018534749963515'
  const bs = 16
  const vl = JSON.stringify(data)
  const vb = Buffer.from(vl)

  const padlen = bs - (vb.byteLength % bs)
  const padbuf = Buffer.alloc(padlen, padlen)

  const vp = Buffer.concat([vb, padbuf])

  const chiher = createCipheriv(
    'aes-256-cbc',
    Buffer.from(key),
    Buffer.from(iv)
  )

  const vc = chiher.update(vp)
  return Buffer.concat([vc, chiher.final()]).toString('base64')
}

async function header (usr, opt) {
  return {
    'MT-Request-ID': v4(),
    'MT-R': 'clips_OlU6TmFRag5rCXwbNAQ/Tz1SKlN8THcecBp/HGhHdw==',
    'MT-Device-ID': usr.uuid.toUpperCase(),
    'MT-APP-Version': opt.mtversion,
    'User-Agent': 'iOS;16.3;Apple;?unrecognized?',
    'Content-Type': 'application/json'
  }
}

async function cookie (usr, opt) {
  const headers = await header(usr, opt)
  const cookies = {
    'MT-Device-ID-Wap': usr.uuid.toUpperCase(),
    'MT-Token-Wap': usr.cookie
  }

  headers['Cookie'] = Object.keys(cookies)
    .map(k => `${k}=${cookies[k]}`)
    .join('; ')

  return headers
}

async function sleep (maxMinute) {
  const m = parseInt(Math.random() * maxMinute)
  const s = parseInt(Math.random() * 60)
  const delay = Math.abs(m * 60 - s)

  console.log(`SLEEP: ${delay}`)
  await setTimeout(delay * 1000)
}

module.exports = {
  sign,
  header,
  cookie,
  mtversion,
  daytime,
  encrypt,
  sleep,
  istoday,
  dstWares
}
