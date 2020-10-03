
// UI variables
let titlefont;
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
let transMode = states.AUTO;
let timer = 0;
let timerInterval;
let numNotes = 5;
let noteInterval = 0.5
let noteGuide = 0;
let guideInterval;
let clickStart; // debug

// music variables
const keys = ['C', 'C#/D♭', 'D', 'D#/E♭', 'E', 'F',
						  'F#/G♭', 'G', 'G#/A♭', 'A', 'A#/B♭', 'B']
let scaleNotes;
let synth;
let sigPlayer;
let transcriber;
let modelLoaded;

// score tracker
let roundTotal;
let refNotesLatin = ['None'];
let transNotesLatin = ['None'];

// DEBUG: data collector
const DEBUG = false; //false
let rows = [];


// P5 functions
function preload() {
	titlefont = loadFont('assets/SourceSansPro-SemiboldIt.otf');
	font = loadFont('assets/SourceSansPro-Regular.otf');
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	synth = new Tone.PolySynth(Tone.Synth).toDestination();
	sigPlayer = new Tone.Player('assets/signal.wav').toDestination();
	sigPlayer.volume.value = -12;
	transcriber = new mm.OnsetsAndFrames('https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni');

	scaleSelect = createSelect();
	scaleSelect.position(150, 150)
	keys.forEach((scale) => {
		scaleSelect.option(scale);
	});
	// scaleSelect.style('color', '#261b0a')
	// scaleSelect.style('background-color', '#e3b196')
	scaleSelect.attribute('class', 'drop');

	transSelect = createSelect();
	for (var key in transModes) {
		transSelect.option(transModes[key]);
	}
	transSelect.position(150, 190);
	transSelect.attribute('class', 'drop');

	startButton = createButton('START')
	startButton.position(30, 250)
	//startButton.style('color', '#261b0a')
	//startButton.style('background-color', '#e3b196')
	startButton.attribute('class', 'button');
	startButton.mouseReleased(startGame);
	startButton.attribute('disabled', true) // disable until model is loaded

	repeatButton = createButton('TRY AGAIN')
	repeatButton.position(200, 250)
	repeatButton.attribute('class', 'button');
	//repeatButton.mouseReleased();
	repeatButton.hide();

	nextButton = createButton('NEXT')
	nextButton.position(370, 250)
	nextButton.attribute('class', 'button');
	nextButton.mouseReleased(nextRound);
	nextButton.hide();

	// trigger microphone permission request
	navigator.mediaDevices.getUserMedia({ audio: true })
		.then(() => {})
    .catch((err) => {});

  modelLoaded = transcriber.initialize()
  modelLoaded.then(() => {
  	state = states.IDLE;
  	startButton.removeAttribute('disabled');
  });
}

function draw() {
	let bgColor = '#291f13'; // dark brown
	background(bgColor);

	fill('#e8a558');
	textFont(titlefont);
	textSize(titleSize);
	textAlign(LEFT)
	text('Pianotize', 20, 80)

	var initText = function() {
		fill('#e3b196');
		textFont(font);
		textSize(fontSize);
		textAlign(LEFT);
	}

	initText();
	text('Key:', 30, 180) // dropdown labels
	text('Transition:', 30, 220) // dropdown labels

	switch(state) {
		case states.LOADING:
			// initText();
			text('Loading piano transcriber model...', 30, 350)
			break;
		case states.IDLE:
			initText();
			text('To use this app, allow access to microphone.', 30, 350)
			text('\nFor better experience, set your browser to always remember this decision.', 30, 350)
			if (roundTotal > 0) {
				text('\n\nLast game score: X/' + roundTotal, 30, 350);
			}
			break;
		case states.PREP:
			initText();
			text('Listen carefully to the scale.', 30, 350)
			if (timer > 0) {
				text('\nReference notes will play in '+timer+'...', 30, 350)
			}
			break;
		case states.READY: // state to trigger play
			playRound();
			break;
		case states.PLAY:
			initText();
			text('Listen carefully to the reference notes.', 30, 350)
			text('\nRepeat the notes in your piano after hearing the click sound.', 30, 350)
			if (timer > 0) {
				text('\n\nNext notes will play in '+timer+'...', 30, 350)
			}
			break;
		case states.RECORD:
			initText();
			text('Recording...', 30, 350)
			if (noteGuide > 0) {
				text('\n' + '*'.repeat(noteGuide), 30, 350)
			}
			break;
		case states.PROCESS:
			initText();
			text('Processing audio...', 30, 350)
			break;
		case states.DONE:
			initText();
			text('Done processing.', 30, 350)
			text('\nReference notes: ' + refNotesLatin.toString(), 30, 350)
			text('\n\nYou played: ' + transNotesLatin.toString(), 30, 350)
			text('\n\n\nTotal score: X/' + numNotes*roundTotal, 30, 350)
			if (timer > 0) {
				text('\n\n\n\n\nNext notes will play in '+timer+'...', 30, 350)
			}
			break;
	}
}

// handlers
function startGame() {

	startButton.attribute('disabled', true)
	startButton.html('END')
	scaleSelect.attribute('disabled', true)
	transSelect.attribute('disabled', true)

	state = states.PREP;
	rows = []; // for DEBUG

	let keyname = scaleSelect.value();
	if (keyname.length > 1) { // accidentals
		keyname = keyname.substring(0, 2)
	}

	transMode = transSelect.value();
	// console.log(transMode);

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
				state = states.READY;
				clearInterval(timerInterval);
			}
		}, 1000);

	}, (0.3+now-st)*1000);

	// reset scores
	roundTotal = 0
}

function stopGame() {
	startButton.mouseReleased(startGame);
	startButton.html('START')
	state = states.IDLE;
	
	repeatButton.hide();
	nextButton.hide();
	scaleSelect.removeAttribute('disabled');
	transSelect.removeAttribute('disabled');

	// reset
	clearInterval(timerInterval);
	timer = 0

	if (DEBUG) {
		if (rows.length > 0) {
			// save to CSV
			let csvContent = "data:text/csv;charset=utf-8," 
	    								 + rows.map(e => e.join(",")).join("\n");
	    
	    var encodedUri = encodeURI(csvContent);
			window.open(encodedUri);
		}
	}
}

function playRound() {
	// play a single round
	state = states.PLAY;
	startButton.attribute('disabled', true)

	let ref = playRandomReference(scaleNotes, numNotes);

	setTimeout(() => {
		record(ref, numNotes)
	}, (ref.playTime + ref.playBuffer)*1000);
}

function playRandomReference(notes, k) {
	// pick k notes to play
	let refNotes = [];
	let midiNotes = [];
	let ix;

	if (DEBUG) {
		let base = roundTotal % (notes.length - 2);
	}
	for (i=0; i<k; i++) {
		if (DEBUG) {
			if (i < 3) {
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
		midiNotes: midiNotes,
		playTime: (now - st), // for ref notes only
		playBuffer: buffer
	}
}

function record(ref, numNotes) {
	state = states.RECORD;
	// length_s: record length in seconds
	let refNotes = ref.midiNotes;
	let length_s = ref.playTime + 0.3; // add'l average reflex delay

	// record audio
	// source: https://medium.com/@bryanjenningz/how-to-record-and-play-audio-in-javascript-faa1b2b3e49b
	navigator.mediaDevices.getUserMedia({ audio: true })
		.then(stream => {
	  	const mediaRecorder = new MediaRecorder(stream);
	  	mediaRecorder.start();

	  	const audioChunks = [];
	    mediaRecorder.addEventListener("dataavailable", event => {
	      audioChunks.push(event.data);
	    });

	    mediaRecorder.addEventListener("stop", () => {
	      const audioBlob = new Blob(audioChunks);
	      const audioUrl = URL.createObjectURL(audioBlob);
	      //const audio = new Audio(audioUrl);
	      //audio.play();
	      process(refNotes, audioUrl);
	    });

			guideInterval = setInterval(() => {
				noteGuide += 1
				if (noteGuide == numNotes) {
					clearInterval(guideInterval);
				}
			}, noteInterval*1000);

	  	setTimeout(() => {
	  		mediaRecorder.stop();
				noteGuide = 0
			}, length_s*1000);
		})
		.catch((err) => {
			stopGame();
			startButton.removeAttribute('disabled');
		});
}

function process(refNotes, audioUrl) {
	state = states.PROCESS;
	roundTotal += 1

	// transcribe audio
	transcriber.transcribeFromAudioURL(audioUrl).then((ns) => {
		//console.log(ns.notes);
		//console.log(refNotes);

		// "convert" transcribed notes to monophonic
		let transNotes = monophonize(ns.notes, numNotes);

		// convert to Latin notation
		refNotesLatin = refNotes.map((midiNote) => {
			return Tonal.Note.pitchClass(Tonal.Note.fromMidi(midiNote))
		});

		transNotesLatin = transNotes.map((midiNote) => {
			return Tonal.Note.pitchClass(Tonal.Note.fromMidi(midiNote))
		});
		
		console.log(refNotesLatin);
		console.log(transNotesLatin);

		if (DEBUG) {
			let row = ["'"+JSON.stringify(ns.notes)+"'", 
								 "'"+JSON.stringify(refNotes)+"'"]
			rows.push(row)
		}

		state = states.DONE;
		startButton.removeAttribute('disabled');

		if (transMode == transModes.AUTO) {
			timer = 3
			timerInterval = setInterval(() => {
				timer -= 1
				if (timer == 0) {
					state = states.READY;
					clearInterval(timerInterval);
				}
			}, 1000);
		} else if (transMode == transModes.MANUAL) {
			repeatButton.show();
			nextButton.show();
		}

	});	
}

function monophonize(noteSeq, n) {
	// Convert polyphonic symbolic music (NoteSequence class from magenta)
  // into monophonic (single notes at a time)

  let start = 5.0 // set to max
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

function nextRound() {
	repeatButton.hide();
	nextButton.hide();
	state = states.READY;
}

// debug
function measure() {
	console.log(Tone.now() - clickStart);
}