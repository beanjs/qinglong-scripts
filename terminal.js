const { createInterface } = require('readline')
const { promisify } = require('util')

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
})
const question = promisify(readline.question).bind(readline)

module.exports = {
  question
}
