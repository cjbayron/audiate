# audiate

<p align="center">
  <img src="assets/audiate.png" />
</p>

Simple ear training game using machine learning (ML) models in the browser

## About

Audiate, stylized **a**ud**i**ate, is a *play-what-you-hear* type of game wherein you are tasked to repeat the sequence of notes that the app plays, using the instrument of your choice. It aims to test (& train through practice) one's musical memory and relative pitch.

## How It Works

Once in-game, the app captures the sound of your instrument (through your device microphone) and feeds it to a pitch transcription model (that runs in your browser) to determine the notes you played and check if it matches with the reference notes that the app played.

### Development

- Previous model: Onsets & Frames
- Current model: CREPE

## Libraries used

* [Magenta.js](https://github.com/magenta/magenta-js) (old model)
* TensorFlow.js
* Tone.js
* Tonal.js
* P5.js

