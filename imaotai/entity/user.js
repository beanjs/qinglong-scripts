const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'User',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    uuid: {
      type: 'uuid',
      generated: 'uuid'
    },
    phone: {
      type: 'text'
    },
    status: {
      type: 'text',
      nullable: true
    },
    province: {
      type: 'text',
      nullable: true
    },
    city: {
      type: 'text',
      nullable: true
    },
    lat: {
      type: 'text',
      nullable: true
    },
    lng: {
      type: 'text',
      nullable: true
    },
    userid: {
      type: 'text',
      nullable: true
    },
    token: {
      type: 'text',
      nullable: true
    },
    cookie: {
      type: 'text',
      nullable: true
    }
  }
})
