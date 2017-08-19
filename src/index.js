let http = require('http')
let EmailUtil = require('./utils/EmailUtil')

const PORT = 9090

let requestHandler = (request, response) => {
  console.log(request.url)
  response.end('Hello Node.js Server!')
}


function init() {
  let server = http.createServer(requestHandler)

  server.listen(PORT, (err) => {
    if (err) {
      return console.log('something bad happened', err)
    }

    console.log('server is listening on port:' + PORT)
  })
}

//

// Run Server
init()
