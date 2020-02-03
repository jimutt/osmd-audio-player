<template>
  <div>
    <h3>{{ instrument.name }}</h3>
    <div v-for="(voice, index) in instrument.voices" :key="index">
      <h4>{{ voice.name }}</h4>
      <v-select
        class="mb-4"
        :value="playbackEngine.getPlaybackInstrument(instrument.id)[0]"
        :items="instruments"
        @change="setPlaybackInstrument"
      ></v-select>
      <VolumeSlider :volume.sync="voice.volume" />
    </div>
  </div>
</template>

<script>
import VolumeSlider from "./VolumeSlider.vue";

export default {
  components: {
    VolumeSlider
  },
  props: ["instrument", "playbackEngine"],
  computed: {
    instruments() {
      if (!this.playbackEngine.availableInstruments) return [];
      return this.playbackEngine.availableInstruments.map(i => ({
        text: i[1],
        value: i[0]
      }));
    }
  },
  methods: {
    setPlaybackInstrument(midiInstrumentId) {
      this.playbackEngine.setInstrument(this.instrument.id, midiInstrumentId);
    }
  }
};
</script>
