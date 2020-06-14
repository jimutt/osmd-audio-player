<template>
  <div>
    <h3>{{ instrument.Name }}</h3>
    <div v-for="(voice, index) in instrument.Voices" :key="index">
      <h4>{{ voice.Name }}</h4>
      <v-select
        class="mb-4"
        :value="playbackEngine.getPlaybackInstrument(voice.VoiceId).midiId"
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
        text: i.name,
        value: i.midiId
      }));
    }
  },
  methods: {
    setPlaybackInstrument(voiceId, midiInstrumentId) {
      this.playbackEngine.setInstrument(voiceId, midiInstrumentId);
    }
  }
};
</script>
