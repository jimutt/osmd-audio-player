<template>
  <div class="text-xs-center">
    <v-bottom-sheet inset style="max-width: 500px;" :persistent="true" :hide-overlay="true" :value="true">
      <v-card tile>
        <v-list class="blue lighten-5">
          <v-slider
            v-if="this.playbackEngine && this.playbackEngine.iterationSteps > 0"
            :value="this.playbackEngine.currentIterationStep"
            :min="0"
            :max="this.playbackEngine.iterationSteps"
            :step="1"
            @input="val => this.playbackEngine.jumpToStep(val)"
            class="progress-slider"
          ></v-slider>
          <v-list-tile>
            <v-list-tile-content>
              <v-list-tile-title>{{ scoreTitle }}</v-list-tile-title>
              <v-list-tile-sub-title></v-list-tile-sub-title>
            </v-list-tile-content>

            <v-list-tile-action :class="{ 'mr-2': $vuetify.breakpoint.mdAndUp }">
              <v-btn icon @click="playbackEngine.play()" v-if="playbackEngine.state !== 'PLAYING'">
                <v-icon dark>play_arrow</v-icon>
              </v-btn>
              <v-btn v-else icon @click="playbackEngine.pause()">
                <v-icon dark>pause</v-icon>
              </v-btn>
            </v-list-tile-action>

            <v-list-tile-action>
              <v-btn icon @click="playbackEngine.stop()">
                <v-icon dark>stop</v-icon>
              </v-btn>
            </v-list-tile-action>
          </v-list-tile>
        </v-list>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>

<script>
export default {
  props: {
    playbackEngine: Object,
    scoreTitle: String
  }
};
</script>

<style lang="scss">
.v-bottom-sheet.v-dialog.v-bottom-sheet--inset {
  max-width: 700px;
}

.v-input.progress-slider {
  margin-top: -24px;
}
</style>
