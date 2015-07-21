var mercury = require('mercury')
var h = require('micro-css/h')(mercury.h)

var Text = require('./text.js')
var Range = require('./range.js')
var read = require('lib/read')
var QueryParam = require('loop-drop-setup/query-param')
var extend = require('xtend')

module.exports = function (param, options) {

  var value = read(param)

  var currentValue = read(getValueParam(param))
  var revertValue = currentValue
  var trigger = isTriggerable(param)

  if (typeof revertValue !== 'number' && revertValue) {
    revertValue = revertValue.maxValue
  }

  var modulatorOptions = [
    h('option', { 
      rawValue: {
        node: 'modulator/lfo',
        trigger: trigger
      }, 
      action: wrap 
    }, 'LFO')
  ]

  if (trigger) {
    modulatorOptions.push(
      h('option', { 
        rawValue: {
          node: 'modulator/adsr'
        }, 
        action: wrap 
      }, 'Envelope (ADSR)')
    )
  }

  var midiOptions = []

  if (param.context && !param.context.chunk) {
    midiOptions.push(
      h('option', { 
        rawValue: {
          node: 'midiParam',
          port: 'Launch Control',
          minValue: 0,
          maxValue: 1
        }
      }, 'Launch Control')
    )
  }

  var currentValue = read(getValueParam(param))
  var paramLinkOptions = getParamLinkOptions(param.context, currentValue, options.format)
  var linkSelector = h('select.link', {
    'ev-change': SelectedValueHandler(param)
  }, [
    h('option', { 
      rawValue: revertValue,
      selected: SetImmediateHook(!(currentValue instanceof Object))
    }, 'Specify Value'),
    paramLinkOptions.length ? h('optgroup', {
      label: 'Link Param'
    }, [
      paramLinkOptions
    ]) : null,
    midiOptions.length ? h('optgroup', {
      label: 'Link to MIDI param on'
    }, [
      midiOptions
    ]) : null,
    modulatorOptions.length ? h('optgroup', {
      label: 'Add Modulator'
    }, [
      modulatorOptions
    ]) : null
  ])

  if (currentValue && isValueNode(currentValue.node)) {
    return h('ModParam -linked', {
      className: options.flex ? '-flex' : ''
    }, [
      h('div.param', [
        h('span.title', options.title), ' ⇒ ', 
        currentValue.node === 'midiParam' ? currentValue.port : currentValue.param
      ]),
      linkSelector,
      h('div.sub', getSubEditors(param, { 
        format: options.format 
      }))
    ])
  } else {
    return h('ModParam -value', {
      className: options.flex ? '-flex' : ''
    }, [
      h('div.param', [
        Range(param, extend(options, {
          flex: true
        }))
      ]),
      linkSelector,
      h('div.sub', getSubEditors(param, { 
        format: options.format 
      }))
    ])
  }

}

function getParamLinkOptions (context, currentValue, format) {
  var options = []
  var params = context && context.paramLookup

  var minValue = 0
  var maxValue = 1

  if (typeof currentValue === 'number') {
    minValue = 0
    maxValue = currentValue || 1
  } else if (currentValue && (currentValue.minValue != null || currentValue.maxValue != null)) {
    minValue = currentValue.minValue || 0
    maxValue = currentValue.maxValue
  }

  if (params) {
    var keys = params.keys()
    for (var i=0;i<keys.length;i++) {
      var p = params.get(keys[i])
      var id = keys[i]
      if (!hasFeedback(context, p)) {
        options.push(
          h('option', { 
            rawValue: {
              node: 'linkParam',
              minValue: minValue,
              maxValue: maxValue,
              param: id,
              mode: isExpFormat(format) ? 'exp' : 'linear'
            }, 
            selected: SetImmediateHook( 
              currentValue && 
              currentValue.node === 'linkParam' && 
              currentValue.param === id 
            )
          }, getModulatorName(id, p))
        )
      }
    }
  }

  return options
}

function isExpFormat(format) {
  return (format === 'arfo')
}

function getModulatorName (key, modulator) {
  if (modulator && modulator._type === 'ModulatorChunk') {
    return key + ' (modulator)'
  } else {
    return key
  }
}

function SetImmediateHook(value) {
  if (!(this instanceof SetImmediateHook)) {
    return new SetImmediateHook(value)
  }
  this.value = value
}

SetImmediateHook.prototype.hook = function (element, prop) {
  var value = this.value
  if (value) {
    setImmediate(function() {
      element[prop] = value
    })
  }
}

function getSubEditors (param, options) {
  var editors = []
  var query = []

  var value = read(param)

  while (value instanceof Object) {

    var currentParam = query.length ? QueryParam(param, query.join('.')) : param

    if (value.node === 'linkParam') {
      editors.unshift(h('div', [
        Range(QueryParam(currentParam, 'minValue'), extend(options, {
          flex: true,
          title: 'min'
        })),
        Range(QueryParam(currentParam, 'maxValue'), extend(options, {
          flex: true,
          title: 'max'
        }))
      ]))
    } else if (value.node === 'midiParam') {
      editors.unshift(
        MidiParam(currentParam, options)
      )
    } else if (value.node === 'modulator/lfo') {
      editors.unshift(
        LFO(currentParam, options)
      )
    } else if (value.node === 'modulator/adsr') {
      editors.unshift(
        ADSR(currentParam, options)
      )
    }

    query.push('value')
    value = value.value
  }

  return editors
}

function hasFeedback (context, modulator){
  if (modulator && modulator.context) {
    var chunk = modulator.context.chunk
    return chunk && chunk._type == "ModulatorChunk" && chunk === context.chunk
  }
}

function SelectedValueHandler(param) {
  return {
    param: param,
    handleEvent: handleSelectEvent
  }
}

function MidiParam(param, options) {

  return h('div', [

    Toggle(QueryParam(param, 'learnNow'), {
      title: 'Learn',
      caption: 'L'
    }),

    Text(QueryParam(param, 'message'), {
      size: 7,
      placeholder: 'message'
    }),

    Range(QueryParam(param, 'minValue'), { 
      flex: true, 
      format: options.format, 
      title: 'min' 
    }),

    Range(QueryParam(param, 'maxValue'), { 
      flex: true, 
      format: options.format, 
      title: 'max' 
    })
  ])
}

function LFO(param, options){

  var mode = QueryParam(param, 'mode')
  var sync = QueryParam(param, 'sync')

  var isAdding = mode.read() === 'add'
  var isSyncing = sync.read()

  var trigger = isTriggerable(param)

  return h('div', [

    h('a', {
      tabIndex: 0,
      title: 'Add to value (instead of scaling)',
      className: isAdding ? '-selected' : '',
      'ev-click': mercury.event(setParam, {
        param: mode, 
        value: isAdding ? 'multiply' : 'add'
      })
    }, '+'),


    Range(QueryParam(param, 'amp'), {
      flex: true,
      defaultValue: 1,
      title: isAdding ? 'add' : 'multiply',
      format: isAdding ? options.format : 'ratioExp'
    }),

    Toggle(sync, {
      title: 'Sync to BPM',
      caption: 'S'
    }),

    Range(QueryParam(param, 'rate'), {
      flex: true,
      defaultValue: 1,
      title: 'rate',
      format: isSyncing ? 'beat' : 'lfo'
    }),

    trigger ? Toggle(QueryParam(param, 'trigger'), {
      title: 'Retrigger',
      caption: 'T'
    }) : null,

    Range(QueryParam(param, 'skew'), {
      defaultValue: 0,
      title: 'skew',
      format: 'offset1',
      flex: true
    }),

    Range(QueryParam(param, 'curve'), {
      defaultValue: 1,
      title: 'curve',
      format: 'ratio1',
      flex: true
    }),

    h('button.remove Button -warn', {
      title: 'Remove',
      'ev-click': mercury.event(remove, param),
    }, 'X')

  ])
}

function ADSR(param, options){
  return h('div', [

    Range(QueryParam(param, 'attack'), {
      flex: true,
      title: 'a',
      format: 'ms'
    }),

    Range(QueryParam(param, 'decay'), {
      flex: true,
      title: 'd',
      format: 'ms'
    }),

    Range(QueryParam(param, 'sustain'), {
      flex: true,
      defaultValue: 1,
      title: 's',
      format: 'ratio'
    }),

    Range(QueryParam(param, 'release'), {
      flex: true,
      title: 'r',
      format: 'ms'
    }),

    h('button.remove Button -warn', {
      'ev-click': mercury.event(remove, param),
    }, 'X')

  ])
}

function setParam(ev){
  ev.param.set(ev.value)
}

function remove(param) {
  var value = read(param)
  param.set(value.value)
}

function wrap(param, wrapper) {
  var value = read(param)
  param.set(extend(wrapper, {
    value: value
  }))
}

function getValueParam(param) {
  var query = []

  var value = read(param)

  while (value != null) {
    if (value instanceof Object && isValueNode(value.node)) {
      query.push('value')
      value = value.value
    } else {
      return query.length ? QueryParam(param, query.join('.')) : param
    }
  }

  return param
}

function Toggle(param, options) {
  var value = read(param)
  return h('a', {
    tabIndex: 0,
    title: options.title,
    className: value ? '-selected' : '',
    'ev-click': mercury.event(setParam, {
      param: param, 
      value: value ? false : true
    })
  }, options.caption)
}

function isTriggerable(param) {
  var slot = param.context && param.context.slot
  return !!(
    slot && slot.triggerOn && 
    slot().id !== 'output' // HACK: should handle this better
  )
}

function isValueNode(node) {
  return !!(node === 'linkParam' || node === 'midiParam')
}

function handleSelectEvent(ev) {
  var option = ev.currentTarget.selectedOptions.item(0)
  if (option) {
    if (option.action) {
      option.action(this.param, option.rawValue)
    } else {
      getValueParam(this.param).set(option.rawValue)
    }
  } else {
    this.param.set(null)
  }
}