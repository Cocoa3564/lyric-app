//外部ライブラリ
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";
import * as TA from "textalive-app-api";

//自作の必須ファイル
import * as config from "@/config.js";
import Scene, { LayerType, URL } from "@/core/scene";
import SceneManager from "@/core/sceneManager";
import TAManager from "@/core/textAliveManager";
import GameManager from "@/core/gameManager";
import * as inputHandler from "@/core/inputHandler";
import math from "@/utils/math";
import VRE from "@/core/visualRenderEngine";
import WDF from "@/filters/waterDistortionFilter";
import Ripple from "@/filters/rippleFilter";
import Fragmenter from "@/core/Fragmenter";

const CH_ILLUSTRATION = config.CH_ILLUSTRATION;
const BG_SEABED_TOP = config.BG_SEABED_TOP;
const ILLUST_COMPLETE_TIME = 3;

export default class ResultScene extends Scene {
    public override assetUrls: URL[] = [
        {type: "character", name: CH_ILLUSTRATION},
        {type: "background", name: BG_SEABED_TOP},
    ];

    public illustContainer: PIXI.Container | null = null;
    public mask: PIXI.Graphics | null = null;
    public illust: PIXI.Sprite | null = null;
    public background: PIXI.Sprite | null = null;

    private fragmenter: Fragmenter | null = null;
    public currentCompletionRate: {rate: number} = {rate: 0};

    constructor(name: string) {
        super(name);
    }

    public override initialize(): void | Promise<void> {
        this.illustContainer = new PIXI.Container();
        SceneManager.activeScene?.addChild(LayerType.GAME, this.illustContainer);
        this.mask = VRE.newRect({
            width: 2048,
            height: 2048,
        });

        this.illust = VRE.newSprite({
            type: "character",
            name: CH_ILLUSTRATION,
        })

        this.background = VRE.createSprite({
            layer: LayerType.BACK_GROUND,
            type: "background",
            name: BG_SEABED_TOP,
        })
        
        if (this.illust) {
            VRE.fitSpriteToScreen({
                sprite: this.illust,
                mode: "contain",
                scale: 0.8
            });
            this.illust.position.set(0, 0);
            
            this.fragmenter = new Fragmenter({
                x: this.camera.center.x,
                y: this.camera.center.y,
                container: this.illustContainer,
                sprite: this.illust,
                pointCount: 50,
                isRandom: true,
            })
        }

        if (this.background) {
            VRE.fitSpriteToScreen({
                sprite: this.background,
                scale: 1.1,
            });
            WDF.addShader(this.background);
        }

        gsap.to(this.currentCompletionRate, {
            rate: 1,
            duration: 1.5,
            ease: "power1.out",
        })

        if (this.fragmenter) {
            this.appearFragments(this.fragmenter, GameManager.completionRate);
        }
    }

    public override onDisable(): void {
    }

    public override update(ticker: PIXI.Ticker): void {4
        this.camera.shake({
            speed: 0.001,
        });
    }

    public appearFragments(fragmenter: Fragmenter, rate: number = 0, index: number = 0) {
        if (!fragmenter) return;
        if (index >= fragmenter.fragments.length) return;
        if (rate < index / fragmenter.fragments.length) return;
        gsap.to(fragmenter.fragments[index].sprite, {
            pixi: {
                alpha: 1,
            },
            duration: math.randomRange(0.4, 0.8),
            ease: "power1.out",
            onComplete: () => {
                if (index !== fragmenter.fragments.length) return;
                this.complete();
            }
        })

        gsap.delayedCall(ILLUST_COMPLETE_TIME / fragmenter.fragments.length, () => {
            this.appearFragments(fragmenter, rate, index + 1);
        })
    }

    private complete() {

    }
}