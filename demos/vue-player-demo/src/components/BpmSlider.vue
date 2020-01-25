<template>
  <v-flex xs12>
    <v-slider
      :value="bpm"
      :min="0"
      :max="200"
      :step="1"
      :disabled="disabled"
      @input="val => this.$emit('update:bpm', Number(val))"
      thumb-label
    ></v-slider>
  </v-flex>
</template>

<script>
export default {
  props: ["bpm", "disabled"]
};
</script>
