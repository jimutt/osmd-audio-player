import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import AudioPlayer from "osmd-audio-player";
import axios from "axios";
import { PlaybackEvent } from "../../dist/PlaybackEngine";

(async () => {
  const osmd = new OpenSheetMusicDisplay(document.getElementById("score"));
  const audioPlayer = new AudioPlayer();

  const scoreXml = await axios.get(
    "https://opensheetmusicdisplay.github.io/demo/sheets/MuzioClementi_SonatinaOpus36No3_Part1.xml"
  );

  await osmd.load(scoreXml.data);
  await osmd.render();
  await audioPlayer.loadScore(osmd);
  audioPlayer.on(PlaybackEvent.ITERATION, notes => {
    console.log(notes);
  });

  hideLoadingMessage();
  registerButtonEvents(audioPlayer);
})();

function hideLoadingMessage() {
  document.getElementById("loading").style.display = "none";
}

function registerButtonEvents(audioPlayer) {
  document.getElementById("btn-play").addEventListener("click", () => {
    if (audioPlayer.state === "STOPPED" || audioPlayer.state === "PAUSED") {
      audioPlayer.play();
    }
  });
  document.getElementById("btn-pause").addEventListener("click", () => {
    if (audioPlayer.state === "PLAYING") {
      audioPlayer.pause();
    }
  });
  document.getElementById("btn-stop").addEventListener("click", () => {
    if (audioPlayer.state === "PLAYING" || audioPlayer.state === "PAUSED") {
      audioPlayer.stop();
    }
  });
}
