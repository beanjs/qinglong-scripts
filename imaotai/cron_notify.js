/**
 * 任务名称
 * name: i茅台结果
 * 定时规则
 * cron: 0 10 18 * * *
 */
const { mtversion, header, istoday } = require('./util')
const DataSource = require('./ds')
const UserEntity = require('./entity/user')
const { default: axios } = require('axios')

async function main () {
  const mtv = await mtversion()

  await DataSource.initialize()

  const UserRepo = DataSource.getRepository(UserEntity)
  const usrs = await UserRepo.find()

  const url = `https://app.moutai519.com.cn/xhr/front/mall/reservation/list/pageOne/query`

  for (const usr of usrs) {
    let msg = `# ${usr.phone} 结果\n\n`

    if (usr.status == 'enable') {
      const headers = await header(usr, { mtversion: mtv })
      headers['MT-Token'] = usr.token

      const { data } = await axios.get(url, { headers })
      if (data.code != 2000) throw new Error(data.message)

      const {
        data: { reservationItemVOS }
      } = data

      for (const ivo of reservationItemVOS) {
        if (await istoday(ivo.reservationTime)) {
          if (ivo.status == 0) {
            msg += `未开奖 [${ivo.itemName}] \n`
          }

          if (ivo.status == 1) {
            msg += `未中奖 [${ivo.itemName}]  \n`
          }

          if (ivo.status == 2) {
            msg += `已中奖 [${ivo.itemName}]\n`
          }

          msg += `![pic](${ivo.itemPicUrl})\n\n`
        }
      }
    } else {
      msg += '令牌过期'
    }

    console.log(msg)
    if (global.QLAPI) QLAPI.notify('i茅台推送', msg, { template: 'markdown' })
  }
}

main().catch(e => console.log(e))
