const DataSource = require('./ds')
const UserEntity = require('./entity/user')

async function main () {
  await DataSource.initialize()

  const UserRepo = DataSource.getRepository(UserEntity)
  const usrs = await UserRepo.find()

  for (const usr of usrs) {
    console.log(`${usr.phone}  ${usr.status}`)
  }
}

main()
