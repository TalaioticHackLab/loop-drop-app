var h = require('micro-css/h')(require('virtual-dom/h'))
var send = require('value-event/event')

var ParamEditor = require('lib/widgets/param-editor')

var Range = require('lib/params/range')
var ToggleButton = require('lib/params/toggle-button')
var ScaleChooser = require('lib/params/scale-chooser')
var IndexParam = require('lib/index-param')
var QueryParam = require('lib/query-param')

var renderNode = require('lib/render-node')
var SlotChooser = require('./slot-chooser')

module.exports = renderTriggersChunk

function renderTriggersChunk (chunk) {
  return h('ChunkNode', [
    h('div.options', [
      h('h1', 'Slots'),
      h('ParamList -compact', [
        shapeParams(chunk.shape)
      ]),
      SlotChooser(chunk, spawnSlot),
      h('h1', 'Chunk Options'),
      h('section.options', [
        h('ParamList', [
          h('div -block', [
            h('div.extTitle', 'Choke Mode'),
            h('div', ToggleButton(chunk.chokeAll, {title: 'All', offTitle: 'Single'}))
          ])
        ])
      ]),
      h('h1', 'Params'),
      ParamEditor(chunk)
    ]),
    h('div.slot', [
      currentSlotEditor(chunk)
    ])
  ])
}

function renderScaleChooser (node) {
  return h('ParamList -compact', [
    ScaleChooser(QueryParam(node.scale, 'notes', {})),
    Range(QueryParam(node.scale, 'offset', {}), {
      title: 'offset',
      format: 'semitone',
      defaultValue: 0,
      width: 200,
      flex: true
    })
  ])
}

function shapeParams (param) {
  return [
    h('div -block -flexSmall', [
      h('div', Range(IndexParam(param, 0), {
        title: 'rows',
        format: 'bit',
        defaultValue: 1
      }))
    ]),

    h('div -block -flexSmall', [
      h('div', Range(IndexParam(param, 1), {
        title: 'cols',
        format: 'bit',
        defaultValue: 1
      }))
    ])
  ]
}

function currentSlotEditor (chunk) {
  var slotId = chunk.selectedSlotId()
  var slots = chunk.context.slotLookup
  var slot = slots.get(slotId)
  if (slot) {
    return renderNode(slot)
  }
}

function spawnSlot (ev) {
  var id = ev.id
  var chunk = ev.chunk

  chunk.slots.push({
    id: ev.id,
    node: 'slot',
    output: 'output'
  })

  chunk.selectedSlotId.set(id)
}
