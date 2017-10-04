let http = require('http')
let EmailUtil = require('./lib/GoogleApi')

const PORT = 9090

let requestHandler = (request, response) => {
  console.log(request.url)
  response.end('Can I Coast?')
}


function init() {
  let server = http.createServer(requestHandler)

  server.listen(PORT, (err) => {
    if (err) {
      return console.log('Error Starting Server: ' + err)
    }

    console.log('server is listening on port:' + PORT)
    console.log('Sending msg...')
    sendMessage()
    console.log('Message sent.')
  })
}

function sendMessage() {
  let SENDER = 'me'
  let RECIPIENT = '12063315264@tmomail.net'
  let SUBJECT = ''
  let MESSAGE = 'HI KELSEY :)'

  let formattedMsg = EmailUtil.formatMessage(SENDER, RECIPIENT, SUBJECT, MESSAGE)
  EmailUtil.sendMessage(formattedMsg)
}

// Run Server
init()
