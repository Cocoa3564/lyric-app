import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import {createNoise2D} from 'simplex-noise';
import * as TA from "textalive-app-api";

import * as config from "@/config";
import Camera from "@/core/camera";
import VRE from "@/core/visualRenderEngine";

const GAME_WIDTH = config.GAME_WIDTH;
const GAME_HEIGHT = config.GAME_HEIGHT;


export enum LayerType {
    BACK_GROUND,
    GAME,
    LYRIC,
    UI
}

interface LyricCallback {
  onChar: (char: TA.IChar) => void;
  onWord: (word: TA.IWord) => void;
  explodeWord: (word: TA.IWord) => void;
  onPhrase: (phrase: TA.IPhrase) => void;
  onChorusStart: (chorus: TA.IRepetitiveSegment) => void;
  onChorusEnd: () => void;
  onSongEnd: (song: TA.Song) => void;
}

export type URL = {
    alias?: string,
    type: 'background' | 'character' | 'icon' | 'texture' | 'ui' | 'font',
    name: string
}

export default abstract class Scene implements LyricCallback {
    public readonly name: string;
    public layers: Record<LayerType, PIXI.Container>;
    public camera: Camera;
    public rootContainer: PIXI.Container;
    public html: HTMLDivElement | null;
    public isInitialized: boolean = false;
    public width: number = 0;
    public height: number = 0;

    private _isTransitioning: boolean = false;
    private _isLoaded: boolean = false;

    public get isTransitioning() { return this._isTransitioning; }
    public get isLoaded() { return this._isLoaded; }

    // このシーンに必要なアセットのパスリスト
    public abstract readonly assetUrls: URL[];
    
    private localCache: (PIXI.Texture | PIXI.Filter)[] = [];

    constructor(name: string) {
        this.name = name;
        this.rootContainer = new PIXI.Container();
        this.camera = new Camera({
            screenWidth: VRE.app.screen.width,
            screenHeight: VRE.app.screen.height,
            worldWidth: VRE.app.screen.width,
            worldHeight: VRE.app.screen.height * 20,
            events: VRE.app.renderer.events
        });

        this.html = document.getElementById(name) as HTMLDivElement | null;

        this.rootContainer.addChild(this.camera);

        // this.camera
        //     .pinch()
        //     //.wheel()
        //     .decelerate();

        this.layers = {
            [LayerType.BACK_GROUND]: new PIXI.Container(),
            [LayerType.GAME]: new PIXI.Container(),
            [LayerType.LYRIC]: new PIXI.Container(),
            [LayerType.UI]: new PIXI.Container()
        };

        this.rootContainer.addChild(this.layers[LayerType.UI]);

        for (const [layer, container] of Object.entries(this.layers)) {
            if (Number.parseInt(layer) === LayerType.UI) {
                
            }
            else {
                this.camera.addChild(container);
            }
        }

        this.resize();
        window.addEventListener('resize', () => this.resize())
    }

    public resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        VRE.app.renderer.resize(width, height);
        this.camera.resize(width, height);

        const scale = Math.max(
            width / GAME_WIDTH,
            height / GAME_HEIGHT
        );

        this.width = width / scale;
        this.height = height / scale;

        const ui = this.layers[LayerType.UI];

        ui.position.set(width / 2, height / 2);
        ui.scale.set(scale, scale);
    }
    
    public addCache(cache: PIXI.Texture | PIXI.Filter) {
        this.localCache.push(cache);
    }

    public addChild(layer: LayerType, child: PIXI.Container) {
        this.layers[layer].addChild(child);
    }

    //ロードされる前に一度だけ実行される
    public Awake(): void | Promise<void> {}

    /** シーンが起動したときに一度だけ呼ばれる */
    public abstract initialize(): void | Promise<void>;

    /** 毎フレーム呼ばれる更新処理 */
    public update(ticker: PIXI.Ticker): void {}

    public async destroy(): Promise<void> {
        // 各レイヤーの中身だけを破棄
        for (const layer of Object.values(this.layers)) {
            const removedChildren = layer.removeChildren();
            for (const child of removedChildren) {
                child.destroy({ children: true }); 
            }
        }

        for (const resource of this.localCache) {
            if (resource instanceof PIXI.Filter) {
                resource.destroy();
            } else if (resource instanceof PIXI.Texture) {
                resource.destroy(true); 
            }
        }
        this.localCache = [];

        for (const url of this.assetUrls) {
            await PIXI.Assets.unload(url.name);
            PIXI.Assets.resolver.removeAlias(url.name);
        }
    }

    public async load() {
        for (let url of this.assetUrls) {
            await VRE.loadTexture({alias: url.alias, type: url.type, name: url.name});
        }
        this._isLoaded = true;
    }

    public onEnable() {}
    public onDisable() {}

    public onChar(char: TA.IChar) {}
    public onWord(word: TA.IWord) {}
    public explodeWord(word: TA.IWord) {}
    public onPhrase(pharse: TA.IPhrase) {}
    public onChorusStart(chorus: TA.IRepetitiveSegment) {}
    public onChorusEnd() {}
    public onSongEnd(song: TA.Song) {}

    // シーンが画面に表示されるときの処理
    public enter() {
        VRE.app.stage.addChild(this.rootContainer);
    }

    // シーンが画面から消えるときの処理
    public leave() {
        this.rootContainer.parent?.removeChild(this.rootContainer);
    }

    public hiddenUI() {
        this.html?.classList.remove('is-active');
    }

    public showUI() {
        this.html?.classList.add('is-active');
    }
}