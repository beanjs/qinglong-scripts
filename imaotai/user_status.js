const { question } = require('../terminal')
const DataSource = require('./ds')
const UserEntity = require('./entity/user')

async function main () {
  await DataSource.initialize()

  const UserRepo = DataSource.getRepository(UserEntity)

  const phone = await question('请输入手机号: ')
  console.log(phone)

  const options = ['enable', 'disable']
  while (true) {
    const option = await question(`请输入状态(${options.join('|')}): `)
    console.log(option)

    if (!options.includes(option)) continue

    await UserRepo.update({ phone }, { status: option })
    break
  }

  process.exit(0)
}

main()
