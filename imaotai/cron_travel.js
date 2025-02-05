/**
 * 任务名称
 * name: i茅台旅行
 * 定时规则
 * cron: 0 0/10 10-20 * * *
 */

const { mtversion, cookie, sleep } = require('./util')
const DataSource = require('./ds')
const UserEntity = require('./entity/user')
const { default: axios } = require('axios')

async function isolation (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/isolationPage/getUserIsolationPageData`

  const { data } = await axios.get(url, { headers: await cookie(usr, opt) })

  if (data.code != 2000) throw new Error(data.message)
  return data.data
}

async function receiveReward (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/xmTravel/receiveReward`

  const headers = await cookie(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng

  await axios.post(url, undefined, { headers }).catch(() => {})
}

async function shareReward (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/xmTravel/shareReward`

  const headers = await cookie(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng

  await axios.post(url, undefined, { headers }).catch(() => {})
}

async function startTravel (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/xmTravel/startTravel`

  const headers = await cookie(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng

  await axios.post(url, undefined, { headers }).catch(() => {})
}

async function energyAward (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/isolationPage/getUserEnergyAward`

  const headers = await cookie(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng

  await axios.post(url, undefined, { headers }).catch(() => {})
}

async function exchange (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/synthesize/exchangeRateInfo`

  const headers = await cookie(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng

  const { data } = await axios.get(url, { headers })
  if (data.code != 2000) throw new Error(data.message)

  return data.data
}

async function main () {
  const mtv = await mtversion()

  await DataSource.initialize()
  const UserRepo = DataSource.getRepository(UserEntity)
  const usrs = await UserRepo.find({ where: { status: 'enable' } })

  for (const usr of usrs) {
    let msg = `# ${usr.phone} 旅行\n\n`

    const iln = await isolation(usr, { mtversion: mtv })
    console.log(iln)

    if (iln.energyReward.value > 0) {
      await energyAward(usr, { mtversion: mtv })
      msg += `申购奖励: ${iln.energyReward.value} \n`

      iln.energy += iln.energyReward.value
    }

    if (iln.xmTravel.status == 3) {
      await receiveReward(usr, { mtversion: mtv })
      await shareReward(usr, { mtversion: mtv })
      msg += `结束旅行: ${iln.energy} ${iln.xmTravel.remainChance} \n`

      iln.xmTravel.status = 1
    }

    if (iln.xmTravel.status == 1) {
      const { currentPeriodCanConvertXmyNum } = await exchange(usr, {
        mtversion: mtv
      })

      if (currentPeriodCanConvertXmyNum <= 0) continue

      if (iln.energy >= 100 && iln.xmTravel.remainChance > 0) {
        await startTravel(usr, { mtversion: mtv })
        msg += `开始旅行: ${iln.energy} ${iln.xmTravel.remainChance} \n`
      }
    }

    console.log(msg)
    await sleep(1)
  }
}

main().catch(e => console.log(e))
