
// ADD BOILERPLATE for CREPE MODEL here (once working)
// ADD favicon.ico

/******************************/
/* UI variables               */
let titlefont;
let titleImage;
let font;
let scaleSelect;
let startButton;
let repeatButton;
let nextButton;
const titleSize = 50;
const fontSize = 20;
const states = {
  LOADING: 'load',
  IDLE: 'idle',
  PREP: 'prep',
  PLAY: 'play',
  READY: 'ready',
  RECORD: 'record',
  PROCESS: 'process',
  DONE: 'done'
}
// transition modes
const transModes = {
  AUTO: 'Automatic',
  MANUAL: 'Manual'
}

let state = states.LOADING;
let transMode = transModes.AUTO;
let timer = 0;
let timerInterval;
let numNotes = 5;
let noteInterval = 0.5;
let noteGuide = 0;
let guideInterval;
let lastRef; // for repeating rounds
let clickStart; // debug
/******************************/


/******************************/
/* Music variables            */

let audioContext;
const keys = ['C', 'C#/D♭', 'D', 'D#/E♭', 'E', 'F',
              'F#/G♭', 'G', 'G#/A♭', 'A', 'A#/B♭', 'B']
let scaleNotes;
let synth;
let sigPlayer;

// score tracker
let predNotes;
let predProbs;
let secondsPerPred;
// minimum duration to count a note
let minNoteDuration = 0.15;
let corrects;
let perfectRounds;
let roundTotal;
let refNotesLatin = ['None'];
let predNotesLatin = ['None'];

// DEBUG: data collector
const DEBUG = true;
let curFreq = 'NONE';
let status = 'STATUS_NONE';
/******************************/


/******************************/
/* P5 functions               */

function preload() {
  titlefont = loadFont('assets/SourceSansPro-SemiboldIt.otf');
  font = loadFont('assets/SourceSansPro-Regular.otf');
  titleImage = loadImage('assets/audiate.png');
}

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.style('display', 'block');

  synth = new Tone.PolySynth(Tone.Synth).toDestination();
  sigPlayer = new Tone.Player('assets/signal.wav').toDestination();
  sigPlayer.volume.value = -12;

  let baseY = 150;
  scaleSelect = createSelect();
  scaleSelect.position(150, baseY); baseY += 40;
  keys.forEach((scale) => { scaleSelect.option(scale) });
  scaleSelect.attribute('class', 'drop');

  transSelect = createSelect();
  for (var key in transModes) { transSelect.option(transModes[key])}
  transSelect.position(150, baseY); baseY += 40;
  transSelect.attribute('class', 'drop');

  numNoteSelect = createSelect();
  for (let i=3; i<=7; i++) { numNoteSelect.option(i) } // min notes, max notes
  numNoteSelect.selected(5); // default notes
  numNoteSelect.position(150, baseY); baseY += 70;
  numNoteSelect.attribute('class', 'drop');

  startButton = createButton('START')
  startButton.position(30, baseY);
  startButton.attribute('class', 'button');
  startButton.mouseReleased(startGame);
  startButton.attribute('disabled', true) // disable until model is loaded

  // repeatButton = createButton('REPEAT')
  // repeatButton.position(200, baseY)
  // repeatButton.attribute('class', 'button');
  // repeatButton.mouseReleased(() => { playRound(repeat=true) });
  // repeatButton.hide();

  nextButton = createButton('NEXT')
  // nextButton.position(370, baseY);
  nextButton.position(200, baseY);
  nextButton.attribute('class', 'button');
  nextButton.mouseReleased(nextRound);
  nextButton.hide();


  try { 
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  } catch (e) {
    status = 'Could not instantiate AudioContext: ' + e.message;
    throw e;
  }

  initCREPE();
}

function windowResized() { // automatically resize window
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background('#291f13'); // dark brown
  initText(useColor='#f0c080', useFont=titlefont, useSize=titleSize, isTitle=true);
  
  let baseY = 80;
  //text('audiate', 30, baseY); baseY += 100;
  image(titleImage, 30, baseY); baseY += 100;

  initText();
  // dropdown labels
  text('Key:', 30, baseY); baseY += 40; 
  text('Transition:', 30, baseY);
  
  let curTransMode = transSelect.value();
  initText(useColor='#e3b196', useFont=font, useSize=fontSize*0.8);
  if (curTransMode == transModes.AUTO) {
    text('Automatically proceed to next round.', 350, baseY);
  } else if (curTransMode == transModes.MANUAL) {
    // text('User can proceed to next or repeat current round.', 300, 220);
    text('Manually proceed to next round.', 350, baseY);
  }

  initText(); baseY += 40;
  text('Num. notes:', 30, baseY); baseY = 390;

  switch(state) {
    case states.LOADING: text('Loading pitch transcription model...', 30, baseY); break;
    case states.IDLE:
      text('To use this app, allow access to microphone.', 30, baseY)
      text('\nFor better experience, set your browser to always remember this decision.', 30, baseY)
      if (roundTotal > 0) {
        text('\n\nLast game score: ' + perfectRounds + '/' + roundTotal +
             ' (Per note accuracy: ' + corrects + '/' + (numNotes*roundTotal) + ')', 30, baseY);
      }
      break;
    case states.PREP:
      text('Listen carefully to the scale.', 30, baseY)
      if (timer > 0) {
        text('\nReference notes will play in '+timer+'...', 30, baseY)
      }
      break;
    case states.PLAY:
      text('Listen carefully to the reference notes.', 30, baseY)
      text('\nRepeat the notes in your piano after hearing the click sound.', 30, baseY)
      if (timer > 0) {
        text('\n\nNext notes will play in '+timer+'...', 30, baseY)
      }
      break;
    case states.RECORD:
      text('Recording...', 30, baseY)
      if (noteGuide > 0) {
        text('\n' + '*'.repeat(noteGuide), 30, baseY)
      }
      break;
    case states.PROCESS:
      text('Processing audio...', 30, baseY)
      break;
    case states.DONE:
      text('Done processing.', 30, baseY)
      text('\nReference notes: ' + refNotesLatin.toString(), 30, baseY)
      text('\n\nYou played: ' + predNotesLatin.toString(), 30, baseY)
      text('\n\n\nTotal score: ' + perfectRounds + '/' + roundTotal +
           ' (Per note accuracy: ' + corrects + '/' + (numNotes*roundTotal) + ')', 30, baseY);
      if (timer > 0) {
        text('\n\n\n\n\nNext notes will play in '+timer+'...', 30, baseY)
      }
      break;
  }

  baseY += 100;
  text(curFreq, 30, baseY);

  baseY += 50;
  text(status, 30, baseY);
}

// p5 draw() helpers
function initText(useColor='#f3c1a6', useFont=font, useSize=fontSize, isTitle=false) {
  fill(useColor);
  textFont(useFont);
  textSize(useSize);
  textAlign(LEFT);
  if (isTitle) {
    strokeWeight(1);
    stroke(248, 180, 120);
  } else {
    noStroke();
  }
}
/******************************/


/******************************/
/* App processes              */
function startGame() {

  startButton.attribute('disabled', true)
  startButton.html('END')
  scaleSelect.attribute('disabled', true)
  transSelect.attribute('disabled', true)
  numNoteSelect.attribute('disabled', true)
  resume(); // audioContext

  state = states.PREP;

  let keyname = scaleSelect.value();
  if (keyname.length > 1) keyname = keyname.substring(0, 2); // accidentals

  transMode = transSelect.value();
  numNotes = numNoteSelect.value();

  // construct scale
  let scaleName = keyname.concat(' major')
  scaleNotes = Tonal.Scale.get(scaleName).notes;

  // add position in piano
  let pos = '4'
  scaleNotes[0] += pos
  for (i = 1; i < scaleNotes.length; i++) {
    let note = Tonal.Note.simplify(scaleNotes[i]);
    if (note.charAt(0) == 'C') {
      pos = '5'
    }
    scaleNotes[i] = note + pos
  }
  scaleNotes.push(keyname + '5'); // add final note

  // play scale notes up-down
  let upDownNotes = scaleNotes.concat(scaleNotes.slice().reverse())
  let now = Tone.now()
  let st = now
  upDownNotes.forEach((note) => {
    synth.triggerAttackRelease(note, '8n', now); // async
    now += 0.3 // interval (in seconds) between notes
  });

  // wait for synth to finish playing
  setTimeout(() => {
    startButton.removeAttribute('disabled');
    startButton.mouseReleased(stopGame);

    timer = 3
    timerInterval = setInterval(() => {
      timer -= 1
      if (timer == 0) {
        clearInterval(timerInterval);
        playRound();
      }
    }, 1000);

  }, (0.3+now-st)*1000);

  // reset scores
  corrects = 0
  perfectRounds = 0
  roundTotal = 0
}

function stopGame() {
  startButton.mouseReleased(startGame);
  startButton.html('START')
  state = states.IDLE;
  
  // repeatButton.hide();
  nextButton.hide();
  scaleSelect.removeAttribute('disabled');
  transSelect.removeAttribute('disabled');
  numNoteSelect.removeAttribute('disabled');

  // reset
  clearInterval(timerInterval);
  timer = 0
}

function playRound(repeat=false) {
  // play a single round
  state = states.PLAY;
  startButton.attribute('disabled', true)
  // repeatButton.hide();
  nextButton.hide();

  let ref;
  if (repeat) { // repeat last played
    ref = playReference(lastRef.refNotes, numNotes, sample=false);
  } else {
    ref = playReference(scaleNotes, numNotes);
  }
  lastRef = ref;

  setTimeout(() => {
    record(ref, numNotes)
  }, (ref.playTime + ref.playBuffer)*1000);
}

function playReference(notes, k, sample=true) {
  // pick k notes to play
  let refNotes = [];
  let midiNotes = [];
  if (sample) {
    let ix;
    let base;
    if (DEBUG) {
      base = roundTotal % (scaleNotes.length - (Math.round(numNotes/2)-1));
    }
    for (i=0; i<k; i++) {
      if (DEBUG) {
        if (i < Math.round(numNotes/2)) {
          ix = base + i
        } else {
          ix = base + (k-i-1)
        }
      }
      else {
        ix = Math.floor(Math.random() * notes.length)
      }

      refNotes.push(notes[ix])
      midiNotes.push(Tonal.Note.midi(notes[ix]))
    }
  } else {
    refNotes = notes;
    midiNotes = refNotes.map(Tonal.Note.midi);
    //console.log(midiNotes);
  }

  //console.log(refNotes);

  let now = Tone.now()
  let st = now
  refNotes.forEach((note) => {
    synth.triggerAttackRelease(note, '8n', now);
    now += noteInterval
  });

  // play signal sound
  let buffer = 0.5
  clickStart = now + buffer;
  sigPlayer.start(now+buffer)
  buffer += 0.8
  sigPlayer.stop(now+buffer)

  return {
    refNotes: refNotes,
    midiNotes: midiNotes,
    playTime: (now - st), // for ref notes only
    playBuffer: buffer
  }
}

function record(ref, numNotes) {
  predNotes = []; // reset
  predProbs = []

  state = states.RECORD;
  let refNotes = ref.midiNotes;
  // length_s: record length in seconds
  let length_s = ref.playTime + 0.3; // add'l average reflex delay

  // record audio
  guideInterval = setInterval(() => {
    noteGuide += 1
    if (noteGuide == numNotes) {
      clearInterval(guideInterval);
    }
  }, noteInterval*1000);

  setTimeout(() => {
    checkRecorded(refNotes);

    state = states.DONE;
    startButton.removeAttribute('disabled');

    if (transMode == transModes.AUTO) {
      timer = 3
      timerInterval = setInterval(() => {
        timer -= 1
        if (timer == 0) {
          clearInterval(timerInterval);
          playRound();
        }
      }, 1000);
    } else if (transMode == transModes.MANUAL) {
      // repeatButton.show();
      nextButton.show();
    }

    noteGuide = 0
  }, length_s*1000);


  // source: https://medium.com/@bryanjenningz/how-to-record-and-play-audio-in-javascript-faa1b2b3e49b
  // navigator.mediaDevices.getUserMedia({ audio: true })
  //   .then(stream => {
  //     const mediaRecorder = new MediaRecorder(stream);
  //     mediaRecorder.start();

  //     const audioChunks = [];
  //     mediaRecorder.addEventListener("dataavailable", event => {
  //       audioChunks.push(event.data);
  //     });

  //     mediaRecorder.addEventListener("stop", () => {
  //       const audioBlob = new Blob(audioChunks);
  //       const audioUrl = URL.createObjectURL(audioBlob);
  //       //const audio = new Audio(audioUrl);
  //       //audio.play();
  //       //process(refNotes, audioUrl);

  //       state = states.DONE;
  //       startButton.removeAttribute('disabled');

  //       if (transMode == transModes.AUTO) {
  //         timer = 3
  //         timerInterval = setInterval(() => {
  //           timer -= 1
  //           if (timer == 0) {
  //             clearInterval(timerInterval);
  //             playRound();
  //           }
  //         }, 1000);
  //       } else if (transMode == transModes.MANUAL) {
  //         // repeatButton.show();
  //         nextButton.show();
  //       }
  //     });

  //     guideInterval = setInterval(() => {
  //       noteGuide += 1
  //       if (noteGuide == numNotes) {
  //         clearInterval(guideInterval);
  //       }
  //     }, noteInterval*1000);

  //     setTimeout(() => {
  //       mediaRecorder.stop();
  //       noteGuide = 0
  //     }, length_s*1000);
  //   })
  //   .catch((err) => {
  //     stopGame();
  //     startButton.removeAttribute('disabled');
  //   });
}

function checkRecorded(refNotes) {
  state = states.PROCESS;
  roundTotal += 1

  console.log(predNotes);
  console.log(predProbs);

  // number of consecutive predictions of a note
  // to consider it as actually present
  const minNumPred = Math.ceil(minNoteDuration / secondsPerPred);
  let presentNotes = detemporize(predNotes, minNumPred);
  console.log(presentNotes);
  // console.log('Total duration: ' + (predNotes.length * secondsPerPred).toFixed(5));
  // console.log(predNotes.length + ' ' + predProbs.length);
}
/******************************/


/******************************/
/* ML, Audio processing       */
function resume() {
  audioContext.resume();
  status = 'Running ...'
}

// perform resampling the audio to 16000 Hz, on which the model is trained.
// setting a sample rate in AudioContext is not supported by most browsers at the moment.
function resample(audioBuffer, onComplete) {
  const interpolate = (audioBuffer.sampleRate % 16000 != 0);
  const multiplier = audioBuffer.sampleRate / 16000;
  const original = audioBuffer.getChannelData(0);
  const subsamples = new Float32Array(1024);
  for (var i = 0; i < 1024; i++) {
    if (!interpolate) {
      subsamples[i] = original[i * multiplier];
    } else {
      // simplistic, linear resampling
      var left = Math.floor(i * multiplier);
      var right = left + 1;
      var p = i * multiplier - left;
      subsamples[i] = (1 - p) * original[left] + p * original[right];
    }
  }
  onComplete(subsamples);
}

// bin number -> cent value mapping
const cent_mapping = tf.add(tf.linspace(0, 7180, 360), tf.tensor(1997.3794084376191))
function transcribe_microphone_buffer(event) {
  resample(event.inputBuffer, function(resampled) {
    tf.tidy(() => {
      /* CREPE model:
       *   - run on 1024 samples of 16kHz signal
       *   - output 360 pitch classes
       *     - 20-cent intervals bet. C1 to B7
       *     - fref = 10Hz
       */

      // run the prediction on the model
      const frame = tf.tensor(resampled.slice(0, 1024));
      const zeromean = tf.sub(frame, tf.mean(frame));
      const framestd = tf.tensor(tf.norm(zeromean).dataSync()/Math.sqrt(1024));
      const normalized = tf.div(zeromean, framestd);
      const input = normalized.reshape([1, 1024]);
      const activation = model.predict([input]).reshape([360]);

      // the confidence of voicing activity and the argmax bin
      const confidence = activation.max().dataSync()[0];
      if ((state == states.RECORD) && (confidence < 0.5)) {
        predNotes.push('');
        predProbs.push(0.0);
        return
      }

      const center = activation.argMax().dataSync()[0];

      // slice the local neighborhood around the argmax bin
      const start = Math.max(0, center - 4);
      const end = Math.min(360, center + 5);
      const weights = activation.slice([start], [end - start]);
      const cents = cent_mapping.slice([start], [end - start]);

      // take the local weighted average to get the predicted pitch
      const products = tf.mul(weights, cents);
      const productSum = products.dataSync().reduce((a, b) => a + b, 0);
      const weightSum = weights.dataSync().reduce((a, b) => a + b, 0);
      const predicted_cent = productSum / weightSum;
      const predicted_hz = 10 * Math.pow(2, predicted_cent / 1200.0);
      const predicted_pitch = Tonal.Note.fromFreq(predicted_hz);
      const predicted_chroma = predicted_pitch.replace(/[0-9]/, '');

      status = predicted_pitch + ', ' + predicted_hz.toFixed(3) + ', ' + confidence.toFixed(3);
      if (state == states.RECORD) {
        predNotes.push(predicted_chroma);
        predProbs.push(confidence);
      }
    });
  });
}

function initAudio() {
  if (!navigator.getUserMedia) {
    if (navigator.mediaDevices) {
      navigator.getUserMedia = navigator.mediaDevices.getUserMedia;
    } else {
      navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    }
  }
  if (navigator.getUserMedia) {
    status = 'Initializing audio...';
    navigator.getUserMedia({audio: true}, function(stream) {
      status = 'Setting up AudioContext ...';
      console.log('Audio context sample rate = ' + audioContext.sampleRate);
      const mic = audioContext.createMediaStreamSource(stream);

      // We need the buffer size that is a power of two and is longer than 1024 samples when resampled to 16000 Hz.
      // In most platforms where the sample rate is 44.1 kHz or 48 kHz, this will be 4096, giving 10-12 updates/sec.
      const minBufferSize = audioContext.sampleRate / 16000 * 1024;
      for (var bufferSize = 4; bufferSize < minBufferSize; bufferSize *= 2);
      secondsPerPred = (bufferSize / audioContext.sampleRate)
      console.log('Buffer size = ' + bufferSize);
      console.log('Each prediction is performed over a frame lasting ' + secondsPerPred.toFixed(4) + ' seconds')
      const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
      scriptNode.onaudioprocess = transcribe_microphone_buffer;

      // It seems necessary to connect the stream to a sink for the pipeline to work, contrary to documentataions.
      // As a workaround, here we create a gain node with zero gain, and connect temp to the system audio output.
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0, audioContext.currentTime);

      mic.connect(scriptNode);
      scriptNode.connect(gain);
      gain.connect(audioContext.destination);

      status = 'Ready'
      state = states.IDLE;
      startButton.removeAttribute('disabled');
      
      // if (audioContext.state === 'running') {
      //   status = 'Running ...';
      // } else {
      //   // user gesture (like click) is required to start AudioContext, in some browser versions
        
      // }
    }, function(message) {
      status = 'Could not access microphone - ' + message;
    });
  } else {
    status = 'Could not access microphone - getUserMedia not available';
  }
}

async function initCREPE() {
  try {
    status = 'Loading pitch transcription model...';
    window.model = await tf.loadModel('crepe-model/model.json');
    status = 'Model loading complete';
  } catch (e) {
    throw error(e);
  }
  initAudio();
}

function detemporize(notes, minConsecutiveCount) {
  // Assume `notes` is a sequence of notes
  // with consistent time interval;
  // what this function does is to just identify
  // which notes are present (nevermind the duration, hence,
  // "detemporize") according to a minimum note occurence.
  let presentNotes = [];
  let curNote = null;
  let consecutiveCount = 0;
  notes.forEach((note) => {
    if (note == "") { // empty
      if (consecutiveCount >= minConsecutiveCount) {
        presentNotes.push(curNote);
      }
      curNote = null;
      consecutiveCount = 0;
      return
    }

    if (curNote == null) {
      curNote = note;
      consecutiveCount = 1;
    } else if (note == curNote) {
      consecutiveCount++;
    } else if (note != curNote) {
      if (consecutiveCount >= minConsecutiveCount) {
        presentNotes.push(curNote);
      }
      curNote = note;
      consecutiveCount = 1;
    }
  });

  if (consecutiveCount >= minConsecutiveCount) {
    presentNotes.push(curNote);
  }

  return presentNotes;
}

/******************************/


// ------------------
function monophonize(noteSeq, n) {
  // Convert polyphonic symbolic music (NoteSequence class from magenta)
  // into monophonic (single notes at a time)

  let start = 100.0 // set to max
  end = 0.0
  noteSeq.forEach((noteInfo) => {
    if (noteInfo['startTime'] < start) {
      start = noteInfo['startTime']
    }

    if (noteInfo['endTime'] > end) {
      end = noteInfo['endTime']
    }   
  });

  let estInterval = (end - start) / n;
  let monoNotes = []

  for (i=0; i<n; i++) {
    let noteSt = start + i*estInterval;
    let noteEd = noteSt + estInterval;
    let maxScore = 0;
    let monoNote;

    noteSeq.forEach((noteInfo) => {
      if (noteInfo['startTime'] > noteEd
          || noteInfo['startTime'] < noteSt
          || noteInfo['endTime'] < noteSt) {
        return; // equivalent to `continue` in the loop
      }

      let trueEd = noteInfo['endTime'];
      if (noteInfo['endTime'] >= noteEd) {
        trueEd = noteEd;
      }
      let noteLen = trueEd - noteInfo['startTime'];
      let noteScore = noteLen * noteInfo['velocity']
      if (noteScore > maxScore) {
        maxScore = noteScore
        monoNote = noteInfo['pitch']
      }
    });

    if (maxScore > 0) {
      monoNotes.push(monoNote);
    }
  }

  return monoNotes;
}

function compare(notesA, notesB) {
  // if (notesA.length != notesB.length) {
  //  return 0;
  // }

  let compRange = (notesA.length - notesB.length) + 1;
  let maxMatches = 0;
  for (let compRound=0; compRound<compRange; compRound++) {
    let matches = 0;
    for (let ix=0; ix<notesB.length; ix++) {
      matches += (notesA[ix+compRound] == notesB[ix])
    }

    if (matches > maxMatches) {
      maxMatches = matches;
    }
  }

  return maxMatches;
}

function nextRound() {
  // repeatButton.hide();
  nextButton.hide();
  playRound();
}

// debug
function measure() {
  console.log(Tone.now() - clickStart);
}
/******************************/