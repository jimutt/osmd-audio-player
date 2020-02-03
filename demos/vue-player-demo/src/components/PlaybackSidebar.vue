<template>
  <div class="playback-sidebar">
    <div class="sidebar-content">
      <h2>Instrument</h2>
      <!-- <v-select
        class="mb-4"
        value="acoustic_grand_piano"
        :items="instruments"
        @change="i => playbackEngine.loadInstrument(i)"
      ></v-select> -->

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
        v-for="instrument in instrumentLevels"
        :key="instrument.id"
        :playbackEngine="playbackEngine"
        :instrument="instrument"
      />
      <h2 class="mt-5">About</h2>
      <p>
        This is a proof of concept application enabling audio playback for
        <a href="http://osmd.org">OSMD</a> scores. Built by
        <a href="https://twitter.com/jimutt">Jimmy Utterström</a>
      </p>
      <h2 class="mt-5">Limitations</h2>
      <p>
        At its current state the playback functionality is very basic, it does not interprate dynamics and has no way to
        handle for example grace notes. In addition to the limited features the current build also contains the
        following bugs:
      </p>
      <ul>
        <li>
          Occasional cursor desynchronization when using progress indicator to change cursor location in score.
        </li>
      </ul>
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
    instrumentLevels() {
      return this.playbackEngine.playbackSettings.instruments;
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
