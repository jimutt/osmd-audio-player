# 🎵 OSMD Audio player

Unoffical audio playback engine for [OpenSheetMusicDisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay). Successor meant to replace my previous proof of concept player & demo at https://github.com/jimutt/osmd-playback-demo.

This player is still in a very early state and lots of breaking and non-breaking changes will most likely be introduced before the first major release. Use at your own risk!

## Install

```
npm install osmd-audio-player
```

## Demos

### Basic

Basic no-framework demo with only play, pause & stop functionality.

**Live demo:** https://osmd-audio-player-demo-basic.netlify.com/ <br/>
**Source:** https://github.com/jimutt/osmd-audio-player/tree/master/demos/basic

### Vue JS + Vuetify

A more full-featured demo featuring configurable instruments, level control, switching scores & changing tempo.

**Live demo:** https://osmd-audio-player-demo-vue.netlify.com/ <br/>
**Source:** https://github.com/jimutt/osmd-audio-player/tree/master/demos/vue-player-demo

You might notice that there's currently a quite large delay when switching instruments. It's due to the in-advance scheduling to prevent interruptions & timing issues in the audio playback, and there's currently no clearing/reset of the buffer when an instrument change takes place. Some improvements in that area are planned.

## Features

- Framework agnostic, not tied to a specific front end Framework
- Multi-instrument support
- Individual level controls
- Automatic tempo detection from score
- Automatic instrument assignment

## Roadmap

- Repeat support
- Dynamics support
- Grace note support
- Click to set playback position
- React demo project
- Updated & properly structured Vue demo
- Quickstart guide & more extensive Readme
- Custom audio stack for playing soundfonts
- Stricter typing
- Unit tests

## Credits

<div style="max-width: 340px;">

[![Browserstack](https://s3.eu-central-1.amazonaws.com/ju-media/Browserstack-logo%402x.png)](http://browserstack.com/)

</div>

Thank you Browserstack for offering me your Open Source license for cross browser testing.
