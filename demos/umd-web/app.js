(async () => {
  const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(document.getElementById("score"));
  const audioPlayer = new OsmdAudioPlayer();

  const scoreXml = await fetch(
    "https://opensheetmusicdisplay.github.io/demo/sheets/MuzioClementi_SonatinaOpus36No3_Part1.xml"
  ).then(r => r.text());

  console.log("Score xml: ", scoreXml);

  await osmd.load(scoreXml);
  await osmd.render();
  await audioPlayer.loadScore(osmd);
  audioPlayer.on("iteration", notes => {
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
