
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

// music variables
const keys = ['C', 'C#/D♭', 'D', 'D#/E♭', 'E', 'F',
						  'F#/G♭', 'G', 'G#/A♭', 'A', 'A#/B♭', 'B']
let scaleNotes;
let synth;

// bonus: replace default sampler

// P5 functions
function preload() {
	titlefont = loadFont('assets/SourceSansPro-SemiboldIt.otf');
	font = loadFont('assets/SourceSansPro-Regular.otf');
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	synth = new Tone.PolySynth(Tone.Synth).toDestination();

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
}

function draw() {
	let bgColor = '#291f13'; // dark brown
	background(bgColor);

	fill('#e8a558');
	textFont(titlefont);
	textSize(titleSize);
	textAlign(LEFT)
	text('Pianotize', 20, 80)

	// fill('#e3b196');
	// textFont(font);
	// textSize(fontSize);
	// textAlign(CENTER)
	// text('Scale (major): ', width * 0.45, height * 0.215)

	switch(state) {
		case states.IDLE:
			// display nothing
			break;
		case states.PREP:
			fill('#e3b196');
			textFont(font);
			textSize(fontSize);
			textAlign(LEFT)
			text('Listen carefully to the scale.', 30, 350)
			if (timer > 0) {
				text('Reference notes will play in '+timer+'...', 30, 350+fontSize)
			}
			break;
		case states.READY: // state to trigger play
			playRound();
			break;
		case states.PLAY:
			fill('#e3b196');
			textFont(font);
			textSize(fontSize);
			textAlign(LEFT)
			text('Listen carefully to the reference notes.', 30, 350)
			text('Repeat the notes in your piano after hearing the chord.', 30, 350+fontSize)
			if (timer > 0) {
				text('Next notes will play in '+timer+'...', 30, 350+(fontSize*2))
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

	let playTime = playRandomReference(scaleNotes, 5);

	// setTimeout(() => {
	// 	record()
	// }, (0.3+playTime)*1000);

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

	}, (0.3+playTime)*1000);
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
		now += 0.5
	});

	// TBD: add some percussion here
	// play major chord (or some signal)
	// now += 0.5
	// let majorFirst = [notes[0], notes[2], notes[4]]
	// synth.triggerAttackRelease(majorFirst, '8n', now);

	return (now - st) // wait time
}

function record() {
	state = states.RECORD;

	// record audio
	// source: https://medium.com/@bryanjenningz/how-to-record-and-play-audio-in-javascript-faa1b2b3e49b
	navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
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

  	setTimeout(() => {
  		mediaRecorder.stop();
  		state = states.PROCESS
		}, 3000);
	});
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