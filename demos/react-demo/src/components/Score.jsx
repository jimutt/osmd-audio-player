import React, { Component } from 'react';
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import AudioPlayer from "osmd-audio-player";

class Score extends Component {
  constructor(props) {
    super(props);
    this.state = {
      file: props.file
    };
    window.audioPlayer = new AudioPlayer();
    this.divRef = React.createRef();
  }

  play() { 
    window.audioPlayer.play(); 
  }

  pause() { 
    window.audioPlayer.pause(); 
  }
  
  stop() { 
    window.audioPlayer.stop(); 
  }

  async componentDidMount() {
    this.osmd = new OpenSheetMusicDisplay(this.divRef.current);
    await this.osmd.load(this.state.file);
    await this.osmd.render();
    await window.audioPlayer.loadScore(this.osmd);
  }

  render() {
    return (<div>
      <div class="controls">
        <button onClick={this.play}>Play</button>
        <button onClick={this.pause}>Pause</button>
        <button onClick={this.stop}>Stop</button>
      </div>
      <div ref={this.divRef} />
    </div>
    );
  }
}

export default Score;