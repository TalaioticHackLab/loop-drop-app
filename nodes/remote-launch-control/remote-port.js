var WebsocketStream = require('websocket-stream')
var Stream = require('stream')
var beefy = require('beefy')
var http = require('http')
var Through = require('through')


module.exports = function (context, port) {
  var server = http.createServer(beefy({
    entries: ['entry.js'],
    cwd: __dirname + '/client'
  }))


  var queue = []
  var lastStream = null
  var wss = WebsocketStream.createServer({server: server}, handle)
  var result = Through(function (data) {
    if (lastStream) {
      lastStream.write(new Buffer(data))
    } else {
      queue.push(new Buffer(data))
    }
  })

  var destroy = result.destroy
  result.destroy = function () {
    destroy && destroy.call(result)
    server.close()
  }

  server.listen(port)

  return result

  function handle (stream) {
    lastStream = stream

    while (queue.length) {
      stream.write(queue.shift())
    }

    stream.on('data', function (data) {
      result.queue(data)
    })

    stream.on('close', function () {
      if (lastStream === stream) {
        result.set(empty)
        lastStream = null
      }
    })
  }

}
