import { URL } from "@/core/scene";
import {SongConfig} from "@/core/textAliveManager";
import { initialize } from "@/main";

export default class Song {
  data: SongConfig;
  phraseScrollLength: number[] = [];

  constructor(data: SongConfig) {
    this.data = data;
  }

  public initialize() {
    console.log(this.data.name);
  }
}