# pianotize

Ear training game using machine learning (ML) models in the browser

## About

**Pianotize** is a *play-what-you-hear* type of game wherein you are tasked to repeat the sequence of notes that the app plays, using your piano (or any device that can emit piano sounds e.g. piano apps). It aims to test (& train through practice) one's musical memory and relative pitch.

## How It Works

Once in-game, the app captures the sound of your piano (through your device microphone) and feeds it to a piano audio transcription model (that runs in your browser) to determine the notes you played, and check if it matches with the reference notes that the app played.

### Status

Currently, this app uses the "Onsets and Frames" ML model, a pre-trained polyphonic piano music transcription model from Magenta.js. While this model can also process non-piano sounds, it will most likely not perform as good as it does on piano sounds.

**[IMPORTANT. READ.]** Additionally, based on testing, the transcription is not 100% accurate, and therefore you may encounter instances where your input is recognized as incorrect even if you know for sure that you played the correct notes. Hence, as it is now, this app is not (yet) a fully functional musical training game, as accuracy of transcription is crucial in this use case. For now, this serves mostly as a demonstration of machine learning inference in the browser.

## Libraries used

* [Magenta.js](https://github.com/magenta/magenta-js)
* Tone.js
* Tonal.js
* P5.js

