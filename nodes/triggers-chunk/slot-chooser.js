var h = require('micro-css/h')(require('virtual-dom/h'))
var send = require('value-event/event')

var MPE = require('lib/mouse-position-event.js')
var nextTick = require('next-tick')
var importSample = require('lib/import-sample')
var extend = require('xtend/immutable')

module.exports = SlotChooser

function SlotChooser (chunk, spawnSlot) {
  var triggers = []
  var shape = chunk.shape() || [1, 1]
  var selectedSlotId = chunk.selectedSlotId()
  var slots = chunk.context.slotLookup
  var length = shape[0] * shape[1]

  for (var i = 0;i < length;i++) {
    var id = String(i)
    var slot = slots.get(id)
    var width = (100 / shape[1]) + '%'
    var dragInfo = { collection: chunk.slots, id: id, select: chunk.selectedSlotId.set }

    if (slot) {
      triggers.push(
        h('div.slot', {
          'draggable': true,

          'ev-dragstart': MPE(dragStart, dragInfo),
          'ev-dragend': MPE(dragEnd, dragInfo),
          'ev-dragover': MPE(dragOver, dragInfo),
          'ev-dragleave': MPE(dragLeave, dragInfo),
          'ev-drop': MPE(drop, dragInfo),

          'style': {width: width},
          'className': selectedSlotId === id ? '-selected' : '',
          'ev-click': send(chunk.selectedSlotId.set, id)
        }, [
          id,
          h('button.remove', {
            'ev-click': send(chunk.slots.remove, slot),
          }, 'X')
        ])
      )
    } else {
      triggers.push(
        h('div.slot -spawn', {
          'style': {width: width},

          'ev-dragover': MPE(dragOver, dragInfo),
          'ev-dragleave': MPE(dragLeave, dragInfo),
          'ev-drop': MPE(drop, dragInfo),

          'ev-click': send(spawnSlot, { id: id, chunk: chunk })
        }, '+ trigger')
      )
    }


  }

  return h('SlotChooser', [
    triggers,
    h('div.spacer'),
    h('div.slot -output', {
      'className': selectedSlotId === 'output' ? '-selected' : '',
      'ev-click': send(chunk.selectedSlotId.set, 'output')
    }, 'output')
  ])
}

var currentDrag = null

function dragStart (ev) {
  currentDrag = ev.data
}

function dragEnd (ev) {
  currentDrag = null
}

function dragOver (ev) {
  ev.currentTarget.classList.add('-dragOver')
  if (ev.altKey || containsFiles(ev.dataTransfer)) {
    ev.dataTransfer.dropEffect = 'copy'
  } else {
    ev.dataTransfer.dropEffect = 'move'
  }
  ev.event.preventDefault()
}

function drop (ev) {
  dragLeave(ev)
  ev.event.preventDefault()

  var targetCollection = ev.data.collection
  var targetLookup = targetCollection.context.slotLookup
  var target = targetLookup.get(ev.data.id)

  if (containsFiles(ev.dataTransfer)) {
    var file = ev.dataTransfer.items[0].getAsFile()
    if (target) {
      targetCollection.remove(target)
    }

    var node = targetCollection.push({
      id: ev.data.id,
      node: 'slot',
      output: 'output',
      sources: [
        { node: 'source/sample', mode: 'oneshot' }
      ]
    })

    importSample(targetCollection.context, file, function (err, descriptor) {
      var player = node.sources.get(0)
      player.set(extend(player(), descriptor))
      ev.data.select(ev.data.id)
    })

  } else {
    var sourceCollection = currentDrag.collection
    var sourceLookup = sourceCollection.context.slotLookup
    var source = sourceLookup.get(currentDrag.id)
    var isCopying = ev.altKey

    if (source && source !== target) {
      if (target) {
        // clear out existing
        targetCollection.remove(target)
      }

      if (sourceCollection !== targetCollection || isCopying) {
        // move to different collection
        var descriptor = obtainWithId(ev.data.id, source())

        if (!isCopying) {
          sourceCollection.remove(source)
        }

        targetCollection.push(descriptor)

      } else {
        source.id.set(ev.data.id)
      }

      ev.data.select(ev.data.id)
    }
  }
}

function dragLeave (ev) {
  ev.currentTarget.classList.remove('-dragOver')
}

function obtainWithId (id, obj) {
  obj = JSON.parse(JSON.stringify(obj))
  obj.id = id
  return obj
}

function containsFiles (transfer) {
  if (transfer.types) {
    for (var i = 0; i < event.dataTransfer.types.length; i++) {
      if (event.dataTransfer.types[i] == 'Files') {
        return true
      }
    }
  }
  return false
}
