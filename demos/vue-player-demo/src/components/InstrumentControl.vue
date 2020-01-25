<template>
  <div>
    <h3>{{ instrument.name }}</h3>
    <div v-for="(voice, index) in instrument.voices" :key="index">
      <h4>{{ voice.name }}</h4>
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
  props: ["instrument"]
};
</script>
