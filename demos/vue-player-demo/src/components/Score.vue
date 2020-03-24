<template>
  <div>
    <div class="score-progress" v-if="scoreLoading || !ready">
      <v-progress-circular :size="60" color="primary" indeterminate></v-progress-circular>
    </div>
    <div class="score" ref="scorediv" v-show="!scoreLoading" :style="{opacity: ready ? 100 : 0}"></div>
  </div>
</template>

<script>
import axios from "axios";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

export default {
  props: ["score", "ready"],
  data() {
    return {
      osmd: null,
      scoreLoading: false
    };
  },
  watch: {
    score(val, oldVal) {
      if (!val || val === oldVal) return;
      this.loadScore(val);
    }
  },
  async mounted() {
    this.osmd = new OpenSheetMusicDisplay(this.$refs.scorediv, {
      followCursor: true
      // backend: "canvas"
    });
    this.$emit("osmdInit", this.osmd);
    if (this.score) this.loadScore(this.score);
  },
  methods: {
    async loadScore(scoreUrl) {
      this.scoreLoading = true;
      let scoreXml = await axios.get(scoreUrl);
      await this.osmd.load(scoreXml.data);
      this.scoreLoading = false;
      await this.$nextTick();
      await this.osmd.render();
      this.$emit("scoreLoaded");
    }
  }
};
</script>

<style scoped lang="scss">
.score {
  width: 100%;
  -webkit-box-shadow: 0px 4px 5px 0px rgba(0, 0, 0, 0.4);
  -moz-box-shadow: 0px 4px 5px 0px rgba(0, 0, 0, 0.4);
  box-shadow: 0px 4px 5px 0px rgba(0, 0, 0, 0.4);
}

.score-progress {
  text-align: center;
}
</style>

<style lang="scss">
.score {
  img {
    z-index: 1 !important;
  }
}
</style>
