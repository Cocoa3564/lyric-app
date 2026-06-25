//外部ライブラリ
import { gsap } from "gsap";
import * as TA from "textalive-app-api";

import * as config from "@/config";
import math from "@/utils/math";
import SceneManager from "@/core/sceneManager";
import VRE from "@/core/visualRenderEngine";
import Scene from "@/core/scene";
import Song from "@/core/song";
import MainScene from "@/scenes/mainScene";

import GameManager from "./gameManager";

export type SongConfig = {
  name: string,
  artist: string,
  url: string,
  video?: {
    // 音楽地図訂正履歴
    beatId: number,
    chordId: number,
    repetitiveSegmentId: number,
    lyricId: number,
    lyricDiffId: number
  }
  font?: {
    path: string,
    name: string,
  };
}

const DROP_DELAY_MS = config.DROP_DELAY_MS;
const SONG_LIST = config.SONG_LIST;
const SAMPLE_TIME = config.SAMPLE_TIME;
const VOLUME_FADE_TIME = config.VOLUME_FADE_TIME;

export default class TextAliveManager {
  public static player: TA.Player;
  public static songList: Song[] = [];
  private static currentPlaying = -1;

  // 💡 サンプル再生の状態を管理する変数
  private static isSample = false; //サンプル再生かどうか
  private static isPreloading = false;
  private static isHelp = false;
  private static firstChorus: TA.IRepetitiveSegments | null;

  private static currentChar: TA.IChar;
  private static currentWord: TA.IWord;
  private static currentDelayWord: TA.IWord;
  private static currentPharse: TA.IPhrase;
  private static currentChorus: TA.IRepetitiveSegment;
  private static isEnded: boolean = false;
  private static silentWords: TA.IWord[] = [];

  private static prevPosition: number = 0;

  private static  sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  static async startSample(index: number = -1) {
    if (index == -1) index = this.currentPlaying;
    await this.load(index, true);
    this.firstChorus = this.getFirstChorus();
    if (!this.firstChorus) return;

    this.player.requestMediaSeek(this.firstChorus.segments[0].startTime);
    
    try {
      this.player.requestPlay();
      this.currentPlaying = index;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.warn("サンプルの再生が開始直後に中断されました（安全に無視できます）");
      } else {
        console.error("再生エラー:", error);
      }
    }
  }

  static play() {
    if(this.player.isPlaying) return;
    this.player.requestPlay();
  }

  static pause() { 
    if(!this.player.isPlaying) return;
    this.player.requestPause();
  }

  static getSilentWord() {
    this.silentWords = [];
    
    let word = this.player.video.firstWord;
      while (word) {
        const duration = word.endTime - word.startTime;
        if (duration === 0) { // 無声音
          this.silentWords.push(word);
        }
        word = word.next;
      }
  }

  static async restartSample() {
    if (!this.firstChorus) return;

    const volumeObj = { value: this.player.volume };

    gsap.to(volumeObj, {
        value: 0,
        duration: VOLUME_FADE_TIME,
        ease: "linear", // 一定のスピードで小さくする
        onUpdate: () => {
            this.player.volume = volumeObj.value;
        },

        onComplete: () => {
          if (!this.isSample || !this.firstChorus) return;

          this.startSample(this.currentPlaying);
          this.player.volume = 100;
        }
    })
    
  }

  static async initialize() {
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason && event.reason.name === "AbortError") {
        event.preventDefault();
      }
    });

    this.player = new TA.Player({
      app: { token: config.API_TOKEN },
      valenceArousalEnabled: true
    });
    this.player.volume = 0;

    this.player.addListener({onVideoReady: (video: TA.IVideo) => {
        if (this.player.app.managed) return;
      },
    });

    this.player.addListener({
      onAppReady: (app: TA.IPlayerApp) => {
      },

      //楽曲データの準備が完了したとき
      onVideoReady: (video: TA.IVideo) => {
        this.getFirstChorus();

        if (!this.isPreloading) return;
        this.songList[this.currentPlaying + 1].initialize();
      },

      onTimeUpdate: (position: number) => {
        if (!SceneManager.activeScene?.isInitialized) return;

        if (this.isHelp) {
          this.player.requestStop();
          this.isHelp = false;
          this.player.volume = 100;
          return;
        }

        if (this.isSample) {
          if (this.firstChorus) {
            const targetTime = this.firstChorus.segments[0].startTime + SAMPLE_TIME * 1000;
            if (this.prevPosition < targetTime && targetTime <= position ) {
              this.restartSample();
            }
          }
        }        

        const char = this.player.video.findChar(position);
        if (char && char !== this.currentChar) {
          this.currentChar = char;
          SceneManager.activeScene?.onChar(char);
        }

        for (const word of this.silentWords) {
          if (this.prevPosition < word.startTime && word.startTime <= position) {
            SceneManager.activeScene?.onWord(word);
            break;
          }
        }

        const delayWord = this.player.video.findWord(position + DROP_DELAY_MS);
        if (delayWord && delayWord !== this.currentDelayWord) {
          this.currentDelayWord = delayWord;
          SceneManager.activeScene?.explodeWord(delayWord);
        }

        const word = this.player.video.findWord(position);
        if (word && word !== this.currentWord) {
          this.currentWord = word;
          SceneManager.activeScene?.onWord(word);
        }

        const pharse = this.player.video.findPhrase(position);
        if (pharse && pharse !== this.currentPharse) {
          this.currentPharse = pharse;
          SceneManager.activeScene?.onPhrase(pharse);
        }

        if (position >= this.player.video.duration - 100 && !this.isEnded) {
          console.log(`終了：${this.player.data.song.name}`);
          this.isEnded = true;
          SceneManager.activeScene?.onSongEnd(this.player.data.song);
        }

        const chorus = this.player.findChorus(position);
        if (chorus !== this.currentChorus) {
          this.currentChorus = chorus;
          
          if (this.currentChorus) {
            SceneManager.activeScene?.onChorusStart(this.currentChorus);
          } else {
            SceneManager.activeScene?.onChorusEnd();
          }
        }

        this.prevPosition = position;
      }
    });

    await this.preload();
    this.player.requestStop();
    await this.sleep(500);
  }

  
  public static async preload() {
    console.log("【キャッシュ開始】全曲のプリロードを開始します...");
    this.isPreloading = true;

    const load = document.getElementById("load") as HTMLDivElement | null;
    const meter = load?.querySelector("meter") as HTMLMeterElement | null;
    const content = document.getElementById("load-content") as HTMLMeterElement | null;

    if (!load) return;
    if (!meter) return;
    if (!content) return;

    load.classList.add('is-active');
    meter.value = 0;
    meter.min = 0;
    meter.max = SONG_LIST.length;

    for (let i = 0; i < SONG_LIST.length; i++) {
      this.songList.push(new Song(SONG_LIST[i]));
      const song = this.songList[i];
      console.log(`[${i + 1}/${SONG_LIST.length}] ${song.data.name} をキャッシュ中...`);
      content.innerText = `${song.data.name}を読み込み中...`;
      await this.load(i, true);
      meter.value++;
    }

    this.isPreloading = false;
    this.isHelp = true;
    console.log("【キャッシュ完了】すべての曲が即座に開けるようになりました！");

    this.currentPlaying = -1; 
    await this.load(0, true);

    load.classList.remove('is-active');
  }

  static async start() {
    this.player.requestStop();
    this.getSilentWord();
    
    if (!this.player.app.managed) {
      GameManager.currentSong = SONG_LIST[this.currentPlaying];
      SceneManager.changeScene("main");
    }

    setTimeout(() => {
      this.load(this.currentPlaying);
    }, config.MAIN_FADEIN_TIME * 1000);
  }

  static async restart() {
    this.player.requestMediaSeek(0);
    this.player.requestPlay();
  }

  static async load(index: number, isSample: boolean = false) {
    this.isSample = isSample;
    if (this.currentPlaying === index) {
      console.log(`[TextAlive] ${SONG_LIST[index].name} はロード済みのため、曲をリスタートします。`);
      this.restart();
      return;
    }

    const song = SONG_LIST[index];
    if (song.video == null) {
      await this.player.createFromSongUrl(song.url);
    }
    else {
      await this.player.createFromSongUrl(song.url, {video: song.video});
    }

    this.currentPlaying = index;
  }

  static getFirstChorus() {
    const segmentsList = this.player.data.songMap.segments;

    if (!segmentsList || segmentsList.length <= 0) {
      console.error("セグメントデータが見つかりません！");
      return null;
    }

    for (let i = 0;i < segmentsList.length;i ++) {
      if (segmentsList[i].chorus) {
        return segmentsList[i];
      }
    }

    return null;
  }
}