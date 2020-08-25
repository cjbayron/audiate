// load Onsets and Frames model from Magenta
let transcriberModel = new mm.OnsetsAndFrames('https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni');
let modelLoaded = transcriberModel.initialize();
