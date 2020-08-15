import PlaybackEngine from ".";
import { mock, instance, when } from "ts-mockito";
import { OpenSheetMusicDisplay, Cursor, MusicSheet, PlaybackSettings, Fraction } from "opensheetmusicdisplay";
import { PlaybackEvent, PlaybackState } from "./PlaybackEngine";
import { IAudioContext } from "standardized-audio-context";

jest.mock("./PlaybackScheduler");

describe("PlaybackEngine", () => {
  describe("Events", () => {
    test("Playback state event on loadScore()", async () => {
      const acMock = createMockedAudioContext();
      const osmdMock = createOsmdMock();
      const stateCb = jest.fn();

      const pbEngine = new PlaybackEngine(acMock);

      pbEngine.on(PlaybackEvent.STATE_CHANGE, stateCb);
      await pbEngine.loadScore(osmdMock);

      expect(stateCb).toHaveBeenCalledTimes(1);
      expect(stateCb).toHaveBeenCalledWith(PlaybackState.STOPPED);
    });

    test("Playback state event on play()", async () => {
      const acMock = createMockedAudioContext();
      const osmdMock = createOsmdMock();
      const stateCb = jest.fn();

      const pbEngine = new PlaybackEngine(acMock);

      await pbEngine.loadScore(osmdMock);
      pbEngine.on(PlaybackEvent.STATE_CHANGE, stateCb);
      await pbEngine.play();

      expect(stateCb).toHaveBeenCalledTimes(1);
      expect(stateCb).toHaveBeenCalledWith(PlaybackState.PLAYING);
    });

    test("Playback state event on stop()", async () => {
      const acMock = createMockedAudioContext();
      const osmdMock = createOsmdMock();
      const stateCb = jest.fn();

      const pbEngine = new PlaybackEngine(acMock);

      await pbEngine.loadScore(osmdMock);
      await pbEngine.play();
      pbEngine.on(PlaybackEvent.STATE_CHANGE, stateCb);
      await pbEngine.stop();

      expect(stateCb).toHaveBeenCalledTimes(1);
      expect(stateCb).toHaveBeenCalledWith(PlaybackState.STOPPED);
    });

    test("Playback state event on pause()", async () => {
      const acMock = createMockedAudioContext();
      const osmdMock = createOsmdMock();
      const stateCb = jest.fn();

      const pbEngine = new PlaybackEngine(acMock);

      await pbEngine.loadScore(osmdMock);
      await pbEngine.play();
      pbEngine.on(PlaybackEvent.STATE_CHANGE, stateCb);
      await pbEngine.pause();

      expect(stateCb).toHaveBeenCalledTimes(1);
      expect(stateCb).toHaveBeenCalledWith(PlaybackState.PAUSED);
    });
  });
});

function createMockedAudioContext(): IAudioContext {
  return ({
    currentTime: 0,
    suspend: jest.fn(async () => {}),
    resume: jest.fn(async () => {}),
  } as unknown) as IAudioContext;
}

function createOsmdMock(): OpenSheetMusicDisplay {
  const mockedOsmd = mock(OpenSheetMusicDisplay);
  const mockedSheet = mock(MusicSheet);
  const mockedPlaybackSettings = mock(PlaybackSettings);
  const mockedFraction = mock(Fraction);
  const mockedCursor = mock(Cursor);

  //@ts-ignore
  when(mockedCursor.Iterator).thenReturn({ EndReached: true });
  when(mockedOsmd.cursor).thenReturn(instance(mockedCursor));
  when(mockedSheet.Instruments).thenReturn([]);
  when(mockedPlaybackSettings.rhythm).thenReturn(instance(mockedFraction));
  when(mockedSheet.SheetPlaybackSetting).thenReturn(instance(mockedPlaybackSettings));
  when(mockedOsmd.Sheet).thenReturn(instance(mockedSheet));
  return instance(mockedOsmd);
}
