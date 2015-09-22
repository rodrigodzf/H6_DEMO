const Analyser = require('web-audio-analyser')
const createCamera = require('perspective-camera')
const THREE = require('three');
const createLoop = require('raf-loop')
const getContext = require('get-canvas-context')
const lerp = require('lerp')
const once = require('once')
const defined = require('defined')
const fit = require('canvas-fit')
const queryString = require('query-string')
const soundcloud = require('soundcloud-badge')
const urlJoin = require('url-join')
const presets = require('./presets')
const showError = require('./lib/error')
const TrackballControls = require('./node_modules/three/TrackballControls')
const assign = require('object-assign')
const audioTestFile = 'ch6audio.ogg'

const AudioContext = window.AudioContext || window.webkitAudioContext
const audioContext = AudioContext ? new AudioContext() : null
const context = getContext('2d')
const canvas = context.canvas
document.body.appendChild(canvas)
document.body.style.overflow = 'hidden'

const errMessage = 'Sorry, this demo only works in Chrome and FireFox!'
const loop = createLoop()
let oldDiv, oldAudio

//********************
var camera, controls, scene, renderer, light;
var geometry, material, mesh;
//********************
var objects;
var soundSource;
var soundBuffer;
var splitter = audioContext.createChannelSplitter(6);
//********************
var panNode = audioContext.createPanner();
panNode.panningModel = 'HRTF';
panNode.distanceModel = 'inverse';
panNode.refDistance = 1;
panNode.maxDistance = 10000;
panNode.rolloffFactor = 1;
panNode.coneInnerAngle = 360;
panNode.coneOuterAngle = 0;
panNode.coneOuterGain = 0;
panNode.setOrientation(1,0,0);
panNode.connect(audioContext.destination)

//***********

var panNodes = [];
for (var i = 0; i < 6; i++){

    panNodes[i] = audioContext.createPanner();
    panNodes[i].panningModel = 'HRTF';
    panNodes[i].distanceModel = 'inverse';
    panNodes[i].refDistance = 1;
    panNodes[i].maxDistance = 10000;
    panNodes[i].rolloffFactor = 1;
    panNodes[i].coneInnerAngle = 360;
    panNodes[i].coneOuterAngle = 0;
    panNodes[i].coneOuterGain = 0;
    // panNodes[i].setOrientation(1,0,0);
    panNodes[i].connect(audioContext.destination)


}

//********************
// Mouse pointer coordinates
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

var CurX;
var CurY;
var mouseX = 0;
var mouseY = 0;

var listener = audioContext.listener;
// listener.setOrientation(0,0,-1,0,1,0);

// Get new mouse pointer coordinates when mouse is moved
// then set new gain and putch values

document.onmousemove = updatePage;

function updatePage(e) {
    CurX = (window.Event) ? e.pageX : event.clientX + (document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft);
    CurY = (window.Event) ? e.pageY : event.clientY + (document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop);

    // mouseX = ((CurX/WIDTH) - .5)* 10; // -0.5 - 0.5
    // mouseY = ((CurY/WIDTH) - .5)* 10; // -0.5 - 0.5
    mouseX = (CurX/WIDTH); // 0 - 1
    mouseY = (CurY/WIDTH); // 0 - 1

    // console.log(mouseX);
    // console.log(mouseY);
    positionPanner()

    // gainNode.gain.value = (CurY/HEIGHT) * maxVol;

    // canvasDraw();
}
//********************

function positionPanner() {
  // console.log(mouseX);
  panNode.setPosition(mouseX,mouseY,0);

  var anglex = Math.radians(mouseX * -360);

  listener.setOrientation(Math.sin(anglex),0,Math.cos(anglex),0,1,0);
  mesh.rotation.y = anglex;
  // mesh.rotation.y = anglex * 10;

  // console.log(mesh.rotation.z);
  // panNode.setVelocity(xVel,0,zVel);
  // pannerData.innerHTML = 'Panner data: X ' + xPos + ' Y ' + yPos + ' Z ' + zPos;
}

//******************** Main ********************

if (!AudioContext) {
  showError(errMessage)
} else {
  global.load = loadTrack
  // loadTrack()
  // printOptions()
  // loadSound(audioTestFile)

  getMic();


}
//******************** threejs ********************

function init() {

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2( 0xcccccc, 0.002 );
    // var loader = new THREE.OBJLoader();
    // // load a resource
    // loader.load(
    //     // resource URL
    //     'lib/WaltDisneyHeads/WaltDisneyHeads.obj',
    //     // Function when resource is loaded
    //     function ( object ) {
    //         scene.add( object );
    //     }
    // );
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 300; //from above
    camera.position.y = 300; //from above

    light = new THREE.DirectionalLight( 0xffffff );
      light.position.set( 0, 1, 0 ).normalize();
      scene.add(light);

    controls = new THREE.TrackballControls( camera );

    controls.rotateSpeed = 10.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = true;

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

    controls.keys = [ 65, 83, 68 ];

    controls.addEventListener( 'change', render );

    geometry = new THREE.SphereGeometry( 5, 32, 16 );

    // modify UVs to accommodate MatCap texture
    var faceVertexUvs = geometry.faceVertexUvs[ 0 ];
    for ( i = 0; i < faceVertexUvs.length; i ++ ) {

        var uvs = faceVertexUvs[ i ];
        var face = geometry.faces[ i ];

        for ( var j = 0; j < 3; j ++ ) {

            uvs[ j ].x = face.vertexNormals[ j ].x * 0.25 + 0.5;
            uvs[ j ].y = face.vertexNormals[ j ].y * 0.25 + 0.5;
            uvs[ j ].z = face.vertexNormals[ j ].z * 0.25 + 0.5;

        }

    }
    // material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
    material = new THREE.MeshPhongMaterial( {
        color: 0xffffff,
		ambient: 0xffffff,
		specular: 0x050505,
		shininess: 50,
        map: THREE.ImageUtils.loadTexture('lib/compass.jpg') } );

    var cgeometry = new THREE.SphereGeometry( 2, 16, 16 );
    // var cmaterial =  new THREE.MeshPhongMaterial( { color:0xffffff, shading: THREE.FlatShading } );


    mesh = new THREE.Mesh( geometry, material );
    // mesh.updateMatrix();
    // mesh.matrixAutoUpdate = true;
    scene.add( mesh );


    for (var i in objects){

        var meshy = new THREE.Mesh( cgeometry, material );
        meshy.position.x = objects[i][0]
        meshy.position.y = objects[i][1]
        meshy.position.z = objects[i][2]

        meshy.rotation.x = 0
        meshy.rotation.y = 0
        meshy.rotation.z = 0

        console.log(objects[i][0])

        // mesh.updateMatrix();
        // mesh.matrixAutoUpdate = false;
        scene.add(meshy);
    }


    // light = new THREE.DirectionalLight( 0xffffff );
    // light.position.set( 1, 1, 1 );
    // scene.add( light );
    //
    // light = new THREE.DirectionalLight( 0x002288 );
    // light.position.set( -1, -1, -1 );
    // scene.add( light );
    //
    // light = new THREE.AmbientLight( 0x222222 );
    // scene.add( light );

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( scene.fog.color );
    renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );

}

function animate() {

    requestAnimationFrame( animate );

    // mesh.rotation.x += 0.01;
    // mesh.rotation.y += 0.02;
    controls.update();
    // controls.rotateCamera();
    renderer.render( scene, camera );

}

function render() {

    renderer.render( scene, camera );
    // stats.update();

}

 //******************** !Main ********************

function loadTrack (opt) {
  if (oldAudio) oldAudio.pause()
  if (oldDiv) oldDiv.parentNode.removeChild(oldDiv)
  loop.stop()
  loop.removeAllListeners('tick')

  if (!opt) {
    opt = presets[Math.floor(Math.random() * presets.length)]
  } else if (typeof opt === 'string') {
    opt = { url: opt }
  }

  // don't mutate options
  opt = assign({}, opt)

  // mixin query parameters
  var query = getQueryParams()
  opt.url = query.url || opt.url

  var numbers = ['distance', 'capacity', 'alpha', 'seek', 'extent']
  numbers.forEach(function (key) {
      if (typeof query[key] !== 'undefined') {
        opt[key] = parseFloat(query[key])
      }
    })

  soundcloud({
    client_id: 'b95f61a90da961736c03f659c03cb0cc',
    song: getTrackUrl(opt.url),
    dark: true,
    getFonts: true
  }, (err, src, json, div) => {
    if (err) {
      showError(errMessage)
    }
    oldDiv = div
    startAudio(src, opt)
    // startAudioToNode(src, opt)
  })
}

function startAudioToNode(src, opt) {

    var URLStreamSource = audioContext.createMediaStreamSource( src );
    // Connect it to the destination to hear yourself (or any other node for processing!)
    URLStreamSource.connect( panNode );

}

function startAudio (src, opt) {

  const audio = new Audio()
  audio.crossOrigin = 'Anonymous'
  audio.addEventListener('canplay', once(() => {
    if (opt.seek) audio.currentTime = opt.seek
    renderTrack(audio, opt)
    // audio.play()
  }))
  audio.src = src
  oldAudio = audio
}

function renderTrack (audio, opt) {

  const node = Analyser(audio, audioContext, { audible: true, stereo: false })
  const shape = [ window.innerWidth, window.innerHeight ]
  const dpr = window.devicePixelRatio

  // scale and fit to screen
  fit(canvas, window, dpr)()

  let time = 0

  const camera = createCamera({
    fov: Math.PI / 4,
    near: 0.01,
    far: 100,
    viewport: [0, 0, ...shape]
  })

  const duration = audio.duration
  const cursor = [ 0, 0, 0 ]
  const positions = [0,20,20]
  const positionMax = defined(opt.capacity, 1000)
  const dist = defined(opt.distance, 0.25)
  const ySize = defined(opt.extent, 0.5)

  loop.on('tick', render).start()

  function render (dt) {
    // console.log('render');
    time += dt / 1000
    const dur = time / duration
    if (dur > 1) return loop.stop()

    const audioData = node.waveform()
    const bufferLength = audioData.length

    // set up our camera
    // with WebGL (persistent lines) could be
    // interesting to fly through it in 3d
    camera.identity()
    camera.translate(opt.position || [ 0, 3.5, 0 ])
    camera.lookAt([ 0, 0, 0 ])
    camera.update()

    context.save()
    context.scale(dpr, dpr)

    // for a motion trail effect
    const [width, height] = shape
    context.fillStyle = 'rgba(255,255,255,0.001)'
    context.fillRect(0, 0, width, height)

    let radius = 1 - dur
    const startAngle = time
    const alpha = opt.alpha || 0.25
    context.strokeStyle = 'rgba(0, 0, 0, ' + alpha + ')'
    context.lineWidth = 1
    context.lineJoin = 'round'
    context.beginPath()
    for (let i = positions.length - 1; i >= 0; i--) {
      var pos = positions[i]
      context.lineTo(pos[0], pos[1])
    }
    context.stroke()
    context.restore()

    for (let i = 0; i < bufferLength; i++) {
      const alpha = i / (bufferLength - 1)
      const angle = lerp(startAngle + dist, startAngle, alpha)
      cursor[0] = Math.cos(angle) * radius
      cursor[2] = Math.sin(angle) * radius

      const amplitude = (audioData[i] / 128.0)
      const waveY = (amplitude * ySize / 2)

      const adjusted = [cursor[0], cursor[1] + waveY, cursor[2]]
      const [x, y] = camera.project(adjusted)
      if (positions.length > positionMax) {
        positions.shift()
      }
      positions.push([x, y])
    }
  }
}

function printOptions () {
  console.log(`%cspins`, `font-weight: bold; padding: 3px; background: #ededed;`)
  console.log(`Reload the page for another preset.

To change tracks and settings:

  load()    // loads a random track
  load(url) // loads a SoundCloud url
  load(opt) // loads with full options

  options:
    url        the URL to load
    capacity   number of line segments per tick
    distance   radial distance along circle to draw each tick
    position   camera [x, y, z]
    extent     amount to extend away from line center
    alpha      line opacity
    seek       seconds to jump into the song at


You can also specify a short URL in the query and it will take precedence.
  http://mattdesl.github.io/spins?url=roman-mars/99-invisible-162-mystery-house
`)
}

function getQueryParams () {
  return queryString.parse(window.location.search)
}

function getTrackUrl (url) {
  if (!url) return null
  if (!/https?:/i.test(url)) {
    url = urlJoin('https://soundcloud.com/', url)
  }
  return url
}

//************************************** FILE **********************************

function loadSound(url) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  // create a sound sources
  // for (var i = 0; i < 6; i++){
  //     soundSource[i] = audioContext.createBufferSource();
  // }

  soundSource = audioContext.createBufferSource();
  // Decode asynchronously
  request.onload = function() {
    audioContext.decodeAudioData(request.response, function(buffer) {
        soundSource.buffer = buffer;
        // console.log(buffer.channelCount);
        // splitSound(5);
        // 0 - FL
        // 1 - FR
        // 2 - LS
        // 3 - RS
        // 4 - FC
        // 5 - Sub
        // playSound();
        setUpPanNodes();
        splitChannels();
        init()
        animate()

    }, onError);
  }
  request.send();
}

function setUpPanNodes() {

    var fl = pol2car(-30);
    var fr = pol2car(30);
    var ls = pol2car(-110);
    var rs = pol2car(110);
    var fc = pol2car(0);
    var sub = [10,0,-10];

    objects = [fl,fr,fc,ls,rs,sub];

    // console.log(objects);
    panNodes[0].setPosition(fl[0],fl[1],fl[2]); // 0 - FL
    panNodes[1].setPosition(fr[0],fr[1],fr[2]); // 1 - FR
    panNodes[2].setPosition(ls[0],ls[1],ls[2]); // 2 - LS
    panNodes[3].setPosition(rs[0],rs[1],rs[2]); // 3 - RS
    panNodes[4].setPosition(fc[0],fc[1],fc[2]); // 4 - FC
    panNodes[5].setPosition(sub[0],sub[1],fl[2]); // 5 - Sub

    listener.setPosition(0,0,0);


}

// Converts from degrees to radians.
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};

// Converts from radians to degrees.
Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};

function pol2car(angle) {
    var r = -10;
    var x = r * Math.cos(Math.radians(angle + 90));
    var y = 0;
    var z = r * Math.sin(Math.radians(angle + 90));
    return [x,y,z];

}




function splitChannels() {

    soundSource.connect(splitter);
    for (var i = 0; i < 6; i++){
        splitter.connect(panNodes[i], i);
    }
    soundSource.start(0);

}

function panChannelsToLayout() {



}


function splitSound(channelIndex) {

    soundSource.connect(splitter);
    splitter.connect(audioContext.destination, channelIndex);
    soundSource.start(0);

}

function playSound() {

    soundSource.connect(audioContext.destination);
    soundSource.start(audioContext.currentTime);

}

//************************************** MIC **********************************

// success callback when requesting audio input stream
function gotStream(stream) {
    // window.AudioContext = window.AudioContext || window.webkitAudioContext;
    // var audioContext = new AudioContext();

    // Create an AudioNode from the stream.
    var mediaStreamSource = audioContext.createMediaStreamSource( stream );
    mediaStreamSource.channelCount = 6;
    // inputNode.channelCountMode = 'discrete';
    console.log(mediaStreamSource.channelCount);

    // Connect it to the destination to hear yourself (or any other node for processing!)
    // mediaStreamSource.connect( panNode );

    setUpPanNodes();
    mediaStreamSource.connect( splitter );
    for (var i = 0; i < 6; i++){
        splitter.connect(panNodes[i], i);
    }
    // var opt = presets[Math.floor(Math.random() * presets.length)]
    //
    //
    // // don't mutate options
    // opt = assign({}, opt)
    //
    // // mixin query parameters
    // var query = getQueryParams()
    // opt.url = query.url || opt.url
    //
    // var numbers = ['distance', 'capacity', 'alpha', 'seek', 'extent']
    // numbers.forEach(function (key) {
    //     if (typeof query[key] !== 'undefined') {
    //       opt[key] = parseFloat(query[key])
    //     }
    //   })

    // renderTrack(panNode, opt)
}
function onError() {
    alert('Stream generation failed.');
}
function getMic() {
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
navigator.getUserMedia( {
            "audio": {
                "mandatory": {
                    "echoCancellation": "false",
                    "googEchoCancellation": "true",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream, onError );

}
//!************************************** MIC **********************************
