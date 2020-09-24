
// UI variables
let titlefont;
let font;
let scaleSelect;
let startButton;
const titleSize = 50;
const fontSize = 20;
const states = {
	IDLE: 'idle',
	PREP: 'prep',
	PLAY: 'play',
	READY: 'ready',
	RECORD: 'record',
	PROCESS: 'process'
}
let state = states.IDLE;
let timer = 0;
let timerInterval;
let numNotes = 5;
let noteInterval = 0.5
let noteGuide = 0;
let guideInterval;

// music variables
const keys = ['C', 'C#/D♭', 'D', 'D#/E♭', 'E', 'F',
						  'F#/G♭', 'G', 'G#/A♭', 'A', 'A#/B♭', 'B']
let scaleNotes;
let synth;
let sigPlayer;

// bonus: replace default sampler

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

	scaleSelect = createSelect(keys);
	scaleSelect.position(30, 200)
	keys.forEach((scale) => {
		scaleSelect.option(scale);
	});
	// scaleSelect.style('color', '#261b0a')
	// scaleSelect.style('background-color', '#e3b196')

	startButton = createButton('START')
	startButton.position(30, 250)
	//startButton.style('color', '#261b0a')
	//startButton.style('background-color', '#e3b196')
	startButton.attribute('class', 'button');
	startButton.mouseReleased(startGame);

	// trigger microphone permission request
	navigator.mediaDevices.getUserMedia({ audio: true })
		.then(() => {})
    .catch((err) => {});
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

	switch(state) {
		case states.IDLE:
			initText();
			text('To use this app, allow access to microphone.', 30, 350)
			text('\nFor better experience, set your browser to always remember this decision.', 30, 350)
			// display nothing
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
			text('Done processing.', 30, 350)
			if (timer > 0) {
				text('\nNext notes will play in '+timer+'...', 30, 350)
			}
			break;
	}
}

// handlers
function startGame() {

	startButton.attribute('disabled', true)
	startButton.html('STOP')
	state = states.PREP;

	let keyname = scaleSelect.value();
	if (keyname.length > 1) { // accidentals
		keyname = keyname.substring(0, 2)
	}

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
}

function stopGame() {
	startButton.mouseReleased(startGame);
	startButton.html('START')
	state = states.IDLE;

	// reset
	clearInterval(timerInterval);
	timer = 0
}

function playRound() {
	// play a single round
	state = states.PLAY;
	startButton.attribute('disabled', true)

	let playTime = playRandomReference(scaleNotes, numNotes);

	setTimeout(() => {
		record(playTime, numNotes)
	}, playTime*1000);

	// setTimeout(() => {
	// 	startButton.removeAttribute('disabled');

	// 	timer = 3
	// 	timerInterval = setInterval(() => {
	// 		timer -= 1
	// 		if (timer == 0) {
	// 			state = states.READY;
	// 			clearInterval(timerInterval);
	// 		}
	// 	}, 1000);

	// }, (0.3+playTime)*1000);
}

function playRandomReference(notes, k) {
	// pick k notes to play
	let noteIxs = []
	for (i=0; i<k; i++) {
		noteIxs.push(Math.floor(Math.random() * notes.length))
	}

	//console.log(noteIxs);

	let now = Tone.now()
	let st = now
	noteIxs.forEach((ix) => {
		synth.triggerAttackRelease(notes[ix], '8n', now);
		now += noteInterval
	});

	// play signal sound
	now += 0.5
	sigPlayer.start(now)
	now += 0.8
	sigPlayer.stop(now)

	return (now - st) // wait time
}

function record(length_s, numNotes) {
	// length_s: record length in seconds
	state = states.RECORD;

	// set timeout for record

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
	      const audio = new Audio(audioUrl);
	      audio.play();
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
	  		process()
			}, length_s*1000);
		})
		.catch((err) => {

		});

}

function process() {
	state = states.PROCESS;

	// temp
	setTimeout(() => {
		startButton.removeAttribute('disabled');

		timer = 3
		timerInterval = setInterval(() => {
			timer -= 1
			if (timer == 0) {
				state = states.READY;
				clearInterval(timerInterval);
			}
		}, 1000);
	}, 1000);
}


// load Onsets and Frames model from Magenta
// let transcriber = new mm.OnsetsAndFrames('https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni');
// let modelLoaded = transcriber.initialize();


let sf = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');

audio_file.onchange = function(){
    var files = this.files;
    console.log(files[0].constructor.name);
    var file = URL.createObjectURL(files[0]);

    // container.hidden = true;
    // transcribe
		transcriber.transcribeFromAudioURL(file).then((ns) => {
			console.log(ns);


			sf.loadSamples(ns).then(() => {
				// visualizer = new mm.Visualizer(ns, canvas, {
	   //        noteRGB: '255, 255, 255', 
	   //        activeNoteRGB: '232, 69, 164', 
	   //        pixelsPerTimeStep: window.innerWidth < 500 ? null: 80,
	   //    });

				// container.hidden = false;
				audio_player.src = file; 
				audio_player.play();	
			});

		});
};