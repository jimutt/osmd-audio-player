import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import PlaybackEngine from "../../dist/PlaybackEngine";
import axios from "axios";

(async () => {
  const osmd = new OpenSheetMusicDisplay(document.getElementById("score"));
  const pbEngine = new PlaybackEngine();

  const scoreXml = await axios.get(
    "https://opensheetmusicdisplay.github.io/demo/sheets/MuzioClementi_SonatinaOpus36No3_Part1.xml"
  );

  await osmd.load(scoreXml.data);
  await osmd.render();
  await pbEngine.loadScore(osmd);

  hideLoadingMessage();
  registerButtonEvents(pbEngine);
})();

function hideLoadingMessage() {
  document.getElementById("loading").style.display = "none";
}

function registerButtonEvents(pbEngine) {
  document.getElementById("btn-play").addEventListener("click", () => {
    if (pbEngine.state === "STOPPED" || pbEngine.state === "PAUSED") {
      pbEngine.play();
    }
  });
  document.getElementById("btn-pause").addEventListener("click", () => {
    if (pbEngine.state === "PLAYING") {
      pbEngine.pause();
    }
  });
  document.getElementById("btn-stop").addEventListener("click", () => {
    if (pbEngine.state === "PLAYING" || pbEngine.state === "PAUSED") {
      pbEngine.stop();
    }
  });
}
