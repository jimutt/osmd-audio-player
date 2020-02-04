<template>
  <div>
    <h3>{{ instrument.Name }}</h3>
    <div v-for="(voice, index) in instrument.Voices" :key="index">
      <h4>{{ voice.Name }}</h4>
      <v-select
        class="mb-4"
        :value="playbackEngine.getPlaybackInstrument(voice.VoiceId)[0]"
        :items="instruments"
        @change="midiInstrumentId => setPlaybackInstrument(voice, midiInstrumentId)"
      ></v-select>
      <VolumeSlider :volume.sync="voice.Volume" />
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
    setPlaybackInstrument(voiceId, midiInstrumentId) {
      this.playbackEngine.setInstrument(voiceId, midiInstrumentId);
    }
  },
  mounted() {
    console.log("Instrument control mounted. Instrument: ", this.instrument);
  }
};
</script>
