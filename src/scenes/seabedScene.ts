//外部ライブラリ
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";

//自作の必須ファイル
import Scene from "@/core/scene";
import SceneManager from "@/core/sceneManager";
import * as config from "@/config.js";
import InputHandler from "@/core/inputHandler";
import VRE from "@/core/visualRenderEngine";
import WDF from "@/filters/waterDistortionFilter";
import Ripple from "@/filters/rippleFilter";


export default class SeabedScene extends Scene {
    public override assetUrls = [];

    public override initialize(): void | Promise<void> {
        
    }

    public override update(ticker: PIXI.Ticker): void {
        
    }
}