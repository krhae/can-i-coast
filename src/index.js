const http = require('http')

const PORT = 9090

const requestHandler = (request, response) => {  
  console.log(request.url)
  response.end('Hello Node.js Server!')
}

const server = http.createServer(requestHandler)

server.listen(PORT, (err) => {  
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log('server is listening on port:' + PORT)
})