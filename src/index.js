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

    console.log('Server is listening on port:' + PORT + '\r\n')
    sendMessage()
  })
}

function sendMessage() {
  let SENDER = 'kelseyr.hawley@gmail.com'
  let RECIPIENT = '12063315264@tmomail.net'
  let SUBJECT = 'Dog Save America'
  let MESSAGE = 'HI KELSEY :)'

  let formattedMsg = EmailUtil.formatMessage(SENDER, RECIPIENT, SUBJECT, MESSAGE)
  EmailUtil.authorizeAndSendMessage(formattedMsg)
}

// Run Server
init()
