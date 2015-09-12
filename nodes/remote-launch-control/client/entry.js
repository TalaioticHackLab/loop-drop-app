var MidiStream = require('web-midi')
var WebsocketStream = require('websocket-stream')
var ws = WebsocketStream('ws://' + window.location.host)
var port = MidiStream('Launch Control', {
  normalizeNotes: true
})

port.on('data', function (data) {
  ws.write(new Buffer(data))
})

ws.on('data', function (data) {
  port.write(data)
})
