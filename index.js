const AudioContext = window.AudioContext || window.webkitAudioContext
const audioContext = AudioContext ? new AudioContext() : null
const context = getContext('2d')
const canvas = context.canvas
