const AMAP_KEY = process.env.AMAP_KEY || ''

const { question } = require('../terminal')
const { default: axios } = require('axios')
const { sign, header, mtversion } = require('./util')
const DataSource = require('./ds')
const UserEntity = require('./entity/user')

async function findAddress () {
  while (true) {
    const address = await question('请输入住址: ')
    console.log(address)

    const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&output=json&address=${address}`

    const { data } = await axios.get(url)
    if (data.info != 'OK') {
      console.log('地址无效，请重新输入')
      continue
    }

    const { geocodes } = data
    const confirm = geocodes
      .map((geo, idx) => {
        return `[${idx}] ${geo.formatted_address}`
      })
      .join('\n')

    const addrsel = await question(
      `请选择地址(输入序号,序号无效则重新输入地址):\n${confirm}\n`
    )
    const addridx = parseInt(addrsel)
    if (addridx >= geocodes.length || isNaN(addrsel)) continue

    console.log('\n')
    console.log(`您选择的地址是: ${geocodes[addridx].formatted_address} \n`)
    return geocodes[addridx]
  }
}

async function sendCode (usr, opt) {
  const url = 'https://app.moutai519.com.cn/xhr/front/user/register/vcode'

  const body = {
    mobile: usr.phone
  }

  const signv = await sign(body)
  body['md5'] = signv.signature
  body['timestamp'] = signv.timestamp
  body['MT-APP-Version'] = opt.mtversion

  await axios.post(url, body, {
    headers: await header(usr, opt)
  })
}

async function login (usr, opt) {
  const url = 'https://app.moutai519.com.cn/xhr/front/user/register/login'

  const body = {
    mobile: usr.phone,
    vCode: opt.vcode
  }

  const signv = sign(body)
  body['md5'] = signv.signature
  body['timestamp'] = signv.timestamp
  body['MT-APP-Version'] = opt.mtversion

  const { data } = await axios.post(url, body, {
    headers: await header(usr, opt)
  })

  if (data.code != 2000) {
    throw new Error(data.message)
  }

  return data.data
}

async function main () {
  if (!AMAP_KEY) {
    throw new Error('请配置高德地图 AMAP_KEY 环境变量')
  }

  const mtv = await mtversion()
  await DataSource.initialize()

  const phone = await question('请输入手机号: ')
  console.log(phone)

  const UserRepo = DataSource.getRepository(UserEntity)
  let usr = await UserRepo.findOne({ where: { phone } })

  if (!usr) {
    usr = { phone, status: 'disable' }
    await UserRepo.save(usr)
  }

  // 获取地址信息
  const addr = await findAddress()
  usr.province = addr.province
  usr.city = addr.city
  usr.lat = addr.location.split(',')[1]
  usr.lng = addr.location.split(',')[0]
  await UserRepo.save(usr)

  // 发送验证码
  await sendCode(usr, { mtversion: mtv })

  const vcode = await question('请输入验证码: ')
  console.log(vcode)

  const uinfo = await login(usr, { mtversion: mtv, vcode })
  usr.userid = uinfo.userId.toString()
  usr.token = uinfo.token
  usr.cookie = uinfo.cookie
  usr.status = 'enable'

  await UserRepo.save(usr)
  process.exit(0)
}

main().catch(e => console.log(e))
