# OSMD Playback Demo
Demo available on [https://heuristic-williams-b11ca6.netlify.com/](https://heuristic-williams-b11ca6.netlify.com/)

## About

This is a proof of concept application enabling audio playback for [OSMD](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay) scores. It features a simplistic note scheduler and utilizes [soundfont-player](https://github.com/danigb/soundfont-player) for the actual audio playback.

The overall code quality is poor and has only been put together for personal prototyping.

## Limitations

At its current state the playback functionality is very basic, it does not interprate dynamics and has no way to handle for example grace notes. In addition to the limited features the current build also contains the following bugs (along with various other misbehaviors...):

- Occasional cursor desynchronization when using progress indicator to change cursor location in score.
- Some issues with tie lengths

## Structure

The demo site is built with Vue.js and Vuetify. Run `npm run serve` to build the project and run it on a local dev server. The audio playback and scheduling logic can be found in the `src/osmd` directory.
