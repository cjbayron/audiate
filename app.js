
// UI variables
let titlefont;
let font;
let scaleSelect;
let startButton;

const titleSize = 50;
const fontSize = 20;

// keys array
const keys = ['C', 'C#/D♭', 'D', 'D#/E♭', 'E', 'F',
						  'F#/G♭', 'G', 'G#/A♭', 'A', 'A#/B♭', 'B']

let synth;


// bonus: replace default sampler



function playRandomReference(scaleNotes, k) {
	// pick k notes from the scale
	let noteIxs = []
	for (i=0; i<k; i++) {
		noteIxs.push(Math.floor(Math.random() * scaleNotes.length))
	}

	console.log(noteIxs);

	now += 0.5
	noteIxs.forEach((ix) => {
		synth.triggerAttackRelease(scaleNotes[ix], '8n', now);
		now += 0.5
	});
}

//playRandomReference(scaleNotes, 5);

// P5 functions
function preload() {
	titlefont = loadFont('assets/SourceSansPro-SemiboldIt.otf');
	font = loadFont('assets/SourceSansPro-Regular.otf');
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	synth = new Tone.Synth().toDestination();

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
}

// handlers
function startGame() {

	startButton.attribute('disabled', true)

	let keyname = scaleSelect.value();
	if (keyname.length > 1) { // accidentals
		keyname = keyname.substring(0, 2)
	}

	// construct scale
	let scaleName = keyname.concat(' major')
	let scaleNotes = Tonal.Scale.get(scaleName).notes;

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

	// add scale-down
	let upDownNotes = scaleNotes.concat(scaleNotes.slice().reverse())
	// play scale up-down
	let now = Tone.now()
	let st = now
	upDownNotes.forEach((note) => {
		synth.triggerAttackRelease(note, '8n', now); // async
		now += 0.3 // interval (in seconds) between notes
	});

	// wait for synth to finish playing
	setTimeout(() => {
		startButton.removeAttribute('disabled');
	}, (0.3+now-st)*1000);
}

rec.addEventListener('click', () => {

	rec.disabled = true;

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
			rec.disabled = false;
		}, 3000);
	});
});


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