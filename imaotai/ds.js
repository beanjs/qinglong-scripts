const { DataSource } = require('typeorm')
const { join } = require('path')
const UserEntity = require('./entity/user')

const __dir__ = global.QLAPI ? '../..' : '..'

module.exports = new DataSource({
  type: 'sqlite',
  database: join(__dirname, __dir__, 'imaotai.sqlite3'),
  entities: [UserEntity],
  synchronize: true
})
