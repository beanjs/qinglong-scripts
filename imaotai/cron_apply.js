/**
 * 任务名称
 * name: i茅台申购
 * 定时规则
 * cron: 0 5 9 * * *
 */
const {
  mtversion,
  daytime,
  encrypt,
  header,
  sleep,
  dstWares
} = require('./util')
const DataSource = require('./ds')
const UserEntity = require('./entity/user')
const { default: axios } = require('axios')

async function session (usr, opt) {
  const url = `https://static.moutai519.com.cn/mt-backend/xhr/front/mall/index/session/get/${opt.daytime}`

  const { data } = await axios.get(url)

  if (data.code != 2000) throw new Error(data.message)
  return data.data.sessionId
}

async function store (usr, opt) {
  const url = `https://static.moutai519.com.cn/mt-backend/xhr/front/mall/resource/get`
  const { data: resource } = await axios.get(url)

  if (resource.code != 2000) throw new Error(resource.message)

  const { data: mtshops } = await axios.get(resource.data.mtshops_pc.url)
  return mtshops
}

async function ware (usr, opt) {
  const { session, ware, daytime } = opt
  const { province } = usr

  const url = `https://static.moutai519.com.cn/mt-backend/xhr/front/mall/shop/list/slim/v3/${session}/${province}/${ware}/${daytime}`
  const { data } = await axios.get(url)

  if (data.code != 2000) throw new Error(data.message)

  return {
    shops: data.data.shops,
    item: data.data.items.find(v => v.itemId == ware)
  }
}

async function params (usr, opt) {
  const { userid } = usr
  const { session, store, ware } = opt

  const body = {
    itemInfoList: [
      {
        count: 1,
        itemId: ware
      }
    ],
    sessionId: session,
    shopId: store,
    userId: userid
  }

  body.actParam = await encrypt(body)

  return body
}

async function submit (usr, opt) {
  const url = 'https://app.moutai519.com.cn/xhr/front/mall/reservation/add'

  const body = await params(usr, opt)

  const headers = await header(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng
  headers['MT-Token'] = usr.token
  headers['userId'] = usr.userid
  headers['MT-Info'] = '028e7f96f6369cafe1d105579c5b9377'

  return await axios
    .post(url, body, { headers: headers })
    .then(() => '申购完成')
    .catch(({ response }) => {
      if (response.status == 401) return '令牌过期'
      else return response.data.message
    })
}

async function main () {
  const mtv = await mtversion()
  const dtm = await daytime()

  await DataSource.initialize()

  const UserRepo = DataSource.getRepository(UserEntity)
  const usrs = await UserRepo.find({ where: { status: 'enable' } })

  const snid = await session(null, { mtversion: mtv, daytime: dtm })
  const sls = await store(null, { mtversion: mtv, daytime: dtm })

  for (const usr of usrs) {
    let msg = `# ${usr.phone} 申购\n\n`
    let notify = false

    for (const wc of dstWares) {
      const wis = await ware(usr, { ware: wc, session: snid, daytime: dtm })

      const wft = wis.shops.filter(v => sls[v.shopId])
      const sft = wft
        .map(v => ({
          ...sls[v.shopId],
          item: v.items.find(v => v.itemId == wc)
        }))
        .filter(v => v.item)

      const nsls = sft
        .map(v => {
          const lat = parseFloat(usr.lat)
          const lng = parseFloat(usr.lng)

          const dlat = Math.pow(v.lat - lat, 2)
          const dlng = Math.pow(v.lng - lng, 2)

          v.distance = Math.sqrt(dlat + dlng)
          return v
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10)
        .sort((a, b) => b.item.inventory - a.item.inventory)

      const idx = parseInt(Math.random() * nsls.length)
      const nsl = nsls[idx]

      if (!nsl) continue

      const message = await submit(usr, {
        mtversion: mtv,
        session: snid,
        store: nsl.shopId,
        ware: wc
      })

      if (message == '令牌过期') {
        await UserRepo.update({ phone }, { status: 'disable' })
      }

      msg += `[${message}] ${wis.item.title}\n\n`
      msg += `[店铺地址] ${nsl.address} \n\n`
      msg += `![pic](${wis.item.picUrl})\n\n`

      if (message != '申购完成') {
        notify = true
      }
    }

    console.log(msg)
    if (global.QLAPI && notify) {
      QLAPI.notify('i茅台推送', msg, { template: 'markdown' })
    }

    // 随机休眠
    await sleep(1)
  }
}

main().catch(e => console.log(e))
