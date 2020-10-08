
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
let lastRef; // for repeating rounds
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
let corrects;
let perfectRounds;
let roundTotal;
let refNotesLatin = ['None'];
let transNotesLatin = ['None'];

// DEBUG: data collector
const DEBUG = false;
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
	// transcriber = new mm.OnsetsAndFrames('https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni_q2');

	let baseY = 150;
	scaleSelect = createSelect();
	scaleSelect.position(150, baseY); baseY += 40;
	keys.forEach((scale) => {
		scaleSelect.option(scale);
	});
	scaleSelect.attribute('class', 'drop');

	transSelect = createSelect();
	for (var key in transModes) {
		transSelect.option(transModes[key]);
	}
	transSelect.position(150, baseY); baseY += 40;
	transSelect.attribute('class', 'drop');

	numNoteSelect = createSelect();
	for (let i=3; i<=7; i++) {
		numNoteSelect.option(i);
	}
	numNoteSelect.selected(5);
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

	fill('#f0c080');
	textFont(titlefont);
	textSize(titleSize);
	textAlign(LEFT)
	let baseY = 80;
	strokeWeight(2);
	stroke(248, 200, 130);
	text('Pianotize', 30, baseY); baseY += 100;

	var initText = function() {
		fill('#f3c1a6');
		textFont(font);
		textSize(fontSize);
		textAlign(LEFT);
		noStroke();
	}

	initText();
	text('Key:', 30, baseY); baseY += 40; // dropdown labels
	text('Transition:', 30, baseY) // dropdown labels
	
	let curTransMode = transSelect.value();
	fill('#e3b196');
	textFont(font);
	textSize(fontSize*0.8);
	textAlign(LEFT);
	if (curTransMode == transModes.AUTO) {
		text('Automatically proceed to next round.', 350, baseY);
	} else if (curTransMode == transModes.MANUAL) {
		// text('User can proceed to next or repeat current round.', 300, 220);
		text('Manually proceed to next round.', 350, baseY);
	}

	initText();
	baseY += 40;
	text('Num. notes:', 30, baseY) // dropdown labels
	baseY = 390;
	switch(state) {
		case states.LOADING:
			text('Loading piano transcriber model...', 30, baseY)
			break;
		case states.IDLE:
			text('To use this app, allow access to microphone.', 30, baseY)
			text('\nFor better experience, set your browser to always remember this decision.', 30, baseY)
			if (roundTotal > 0) {
				text('\n\nLast game score: ' + perfectRounds + '/' + roundTotal +
						 ' (Per note accuracy: ' + corrects + '/' + (numNotes*roundTotal) + ')', 30, baseY);
			}
			break;
		case states.PREP:
			// initText();
			text('Listen carefully to the scale.', 30, baseY)
			if (timer > 0) {
				text('\nReference notes will play in '+timer+'...', 30, baseY)
			}
			break;
		case states.READY: // state to trigger play
			playRound();
			break;
		case states.PLAY:
			// initText();
			text('Listen carefully to the reference notes.', 30, baseY)
			text('\nRepeat the notes in your piano after hearing the click sound.', 30, baseY)
			if (timer > 0) {
				text('\n\nNext notes will play in '+timer+'...', 30, baseY)
			}
			break;
		case states.RECORD:
			// initText();
			text('Recording...', 30, baseY)
			if (noteGuide > 0) {
				text('\n' + '*'.repeat(noteGuide), 30, baseY)
			}
			break;
		case states.PROCESS:
			// initText();
			text('Processing audio...', 30, baseY)
			break;
		case states.DONE:
			// initText();
			text('Done processing.', 30, baseY)
			text('\nReference notes: ' + refNotesLatin.toString(), 30, baseY)
			text('\n\nYou played: ' + transNotesLatin.toString(), 30, baseY)
			text('\n\n\nTotal score: ' + perfectRounds + '/' + roundTotal +
					 ' (Per note accuracy: ' + corrects + '/' + (numNotes*roundTotal) + ')', 30, baseY);
			if (timer > 0) {
				text('\n\n\n\n\nNext notes will play in '+timer+'...', 30, baseY)
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
	numNoteSelect.attribute('disabled', true)

	state = states.PREP;
	rows = []; // for DEBUG

	let keyname = scaleSelect.value();
	if (keyname.length > 1) { // accidentals
		keyname = keyname.substring(0, 2)
	}

	transMode = transSelect.value();
	numNotes = numNoteSelect.value();
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
		
		let res = compare(refNotesLatin, transNotesLatin);
		corrects += res
		perfectRounds += (res == numNotes)

		console.log(refNotesLatin);
		console.log(transNotesLatin);

		if (DEBUG) {
			let row = ["'"+JSON.stringify(ns.notes)+"'", 
								 "'"+JSON.stringify(refNotes)+"'",
								 "'"+JSON.stringify(res)+"'"]
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
			// repeatButton.show();
			nextButton.show();
		}

	});	
}

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
	// 	return 0;
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
	state = states.READY;
}

// debug
function measure() {
	console.log(Tone.now() - clickStart);
}