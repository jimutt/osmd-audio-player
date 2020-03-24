<template>
  <div class="playback-sidebar">
    <div class="sidebar-content">
      <div v-if="playbackEngine.ready">
        <h2>
          BPM
          {{ playbackEngine.denominator ? `(1/${playbackEngine.denominator})` : "" }}
        </h2>
        <BpmSlider
          :bpm="playbackEngine.playbackSettings.bpm"
          @update:bpm="val => playbackEngine.setBpm(val)"
          :disabled="bpmDisabled"
        ></BpmSlider>
        <h2>Levels</h2>
        <InstrumentControl
          v-for="instrument in scoreInstruments"
          :key="instrument.Id"
          :playbackEngine="playbackEngine"
          :instrument="instrument"
        />
        <h2 class="mt-5">About</h2>
        <p>
          Vue.js demo for <a href="https://github.com/jimutt/osmd-audio-player">OSMD Audio player</a>.
          Built by <a href="https://twitter.com/jimutt">Jimmy Utterström</a>
        </p>
      </div>
      <div v-else>
        Loading...
      </div>
    </div>
  </div>
</template>

<script>
import InstrumentControl from "./InstrumentControl.vue";
import BpmSlider from "./BpmSlider";

export default {
  components: {
    InstrumentControl,
    BpmSlider
  },
  props: {
    playbackEngine: Object
  },
  data() {
    return {};
  },
  computed: {
    scoreInstruments() {
      return this.playbackEngine.scoreInstruments;
    },
    bpmDisabled() {
      return this.playbackEngine.state === "PLAYING";
    }
  }
};
</script>

<style lang="scss">
.playback-sidebar {
  padding: 20px;
}
</style>
