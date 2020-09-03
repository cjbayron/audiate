
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
      console.log(audio.canPlayType("audio/ogg"))
      audio.play();
      console.log(audio)
      console.log("I'm playing")
    });

  	setTimeout(() => {
  		mediaRecorder.stop();
			rec.disabled = false;
		}, 1500);
	});
});


// load Onsets and Frames model from Magenta
// let transcriber = new mm.OnsetsAndFrames('https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni');
// let modelLoaded = transcriber.initialize();

audio_file.onchange = function(){
    var files = this.files;
    var file = URL.createObjectURL(files[0]); 
    audio_player.src = file; 
    audio_player.play();
};