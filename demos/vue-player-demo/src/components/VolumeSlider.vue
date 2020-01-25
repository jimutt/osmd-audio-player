<template>
  <v-flex xs12>
    <v-slider
      :value="volume"
      :min="0"
      :max="2"
      :step="0.05"
      append-icon="volume_up"
      prepend-icon="volume_down"
      @input="val => this.$emit('update:volume', Number(val))"
    ></v-slider>
  </v-flex>
</template>

<script>
export default {
  props: ["volume"]
};
</script>
