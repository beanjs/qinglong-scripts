/**
 * 任务名称
 * name: i茅台每日
 * 定时规则
 * cron: 0 2 12 * * *
 */

const { mtversion, cookie, sleep } = require('./util')
const DataSource = require('./ds')
const UserEntity = require('./entity/user')
const { default: axios } = require('axios')

async function dcap (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/xmyApplyingReward/7DaysContinuouslyApplyingProgress`

  const headers = await cookie(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng

  const { data } = await axios.post(url, undefined, { headers })
  if (data.code != 2000) throw new Error(data.message)

  return data.data
}

async function rdcap (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/xmyApplyingReward/receive7DaysContinuouslyApplyingReward`

  const headers = await cookie(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng

  const { data } = await axios.post(url, undefined, { headers })
  if (data.code != 2000) throw new Error(data.message)

  return data.data
}
// {"code":2000,"message":null,"data":{"successfullyReceived":false,"rewardAmount":0.0},"error":null}

async function cad (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/xmyApplyingReward/cumulativelyApplyingDays`

  const headers = await cookie(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng

  const { data } = await axios.post(url, undefined, { headers })
  if (data.code != 2000) throw new Error(data.message)

  return data.data
}

async function rcad (usr, opt) {
  const url = `https://h5.moutai519.com.cn/game/xmyApplyingReward/receiveCumulativelyApplyingReward`

  const headers = await cookie(usr, opt)
  headers['MT-Lat'] = usr.lat
  headers['MT-Lng'] = usr.lng

  const { data } = await axios.post(url, undefined, { headers })
  if (data.code != 2000) throw new Error(data.message)

  return data.data
}
// {"code":2000,"message":null,"data":{"successfullyReceived":true,"rewardAmount":5.0},"error":null}

async function main () {
  const mtv = await mtversion()

  await DataSource.initialize()
  const UserRepo = DataSource.getRepository(UserEntity)
  const usrs = await UserRepo.find({ where: { status: 'enable' } })

  for (const usr of usrs) {
    let msg = `# ${usr.phone} 每日\n\n`
    let notify = false

    const idcap = await dcap(usr, { mtversion: mtv })
    if (idcap.previousProgress + 1 == 7 && idcap.appliedToday) {
      const { rewardAmount } = await rdcap(usr, { mtversion: mtv })
      msg += `连续申购奖励: ${rewardAmount}`
      notify = true
    }

    const icad = await cad(usr, { mtversion: mtv })
    if (
      icad.rewardReceived[icad.previousDays + 1] === false &&
      icad.appliedToday
    ) {
      const { rewardAmount } = await rcad(usr, { mtversion: mtv })
      msg += `累计申购奖励: ${rewardAmount}`
      notify = true
    }

    if (notify) {
      console.log(msg)
      if (global.QLAPI) QLAPI.notify('i茅台奖励', msg, { template: 'markdown' })
    }
  }
}

main().catch(e => console.log(e))
