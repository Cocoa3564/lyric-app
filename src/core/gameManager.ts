//外部ライブラリ
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";

import {SongConfig} from "@/core/textAliveManager";
import SceneManager from "./sceneManager";

//GSAPとPIXIを連携させる
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

export default class GameManager {
    public static currentSong: SongConfig;
    public static helpEnded: boolean = false;

    private static _completionRate: number;
    
    public static get completionRate(): number {
        return this._completionRate;
    }

    public static set completionRate(value: number) {
        if (value < 0) value = 0;
        if (value > 1) value = 1;
        this._completionRate = value;
    }
}