//外部ライブラリ
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";

//自作の必須ファイル
import * as config from "@/config.js";
import Scene, { LayerType, URL } from "@/core/scene";
import SceneManager from "@/core/sceneManager";
import TAManager from "@/core/textAliveManager";
import InputHandler from "@/core/inputHandler";
import VRE from "@/core/visualRenderEngine";
import WDF from "@/filters/waterDistortionFilter";
import GameManager from "@/core/gameManager";

//GSAPとPIXIを連携させる
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

const ANCHOR_WIDTH = 0;
const ANCHOR_HEIGHT = 0;
const BUBBLE_RADIUS = config.BUBBLE_RADIUS;
const NAME_SIZE = config.NAME_SIZE;
const ARTIST_SIZE = config.ARTIST_SIZE;
const TEX_BUBBLE = config.TEX_BUBBLE;
const BG_SEABED = config.BG_SEABED;
const SONGSELECT_FADEIN_TIME = config.SONGSELECT_FADEIN_TIME;
const SONGSELECT_FADEOUT_TIME = config.SONGSELECT_FADEOUT_TIME;

//5つの泡のデフォルトトランスフォーム（位置、スケール、不透明度など）
const BUBBLE_TRANSFORMS = [
    { x: ANCHOR_WIDTH - 500, y: ANCHOR_HEIGHT, scale: 0.3, alpha: 0 },
    { x: ANCHOR_WIDTH - 400, y: ANCHOR_HEIGHT, scale: 0.5, alpha: 0.2 },
    { x: ANCHOR_WIDTH,       y: ANCHOR_HEIGHT, scale: 1.0, alpha: 1 },
    { x: ANCHOR_WIDTH + 400, y: ANCHOR_HEIGHT, scale: 0.5, alpha: 0.2 },
    { x: ANCHOR_WIDTH + 500, y: ANCHOR_HEIGHT, scale: 0.3, alpha: 0 }
];

export default class SongSelectScene extends Scene {
    public override assetUrls: URL[] = [
        {type: "texture", name: TEX_BUBBLE},
        {type: "background", name: BG_SEABED},
    ];

    private songDataList : SongData[] = [];
    private bubbles : Bubble[] = [];
    private background : PIXI.Sprite | null = null;
    private currentSong : number = 0;

    //クリック・タップ判定用
    private left : PIXI.Graphics | null = null;
    private right : PIXI.Graphics | null = null;
    private center : PIXI.Graphics | null = null;

    private help : HTMLDivElement;
    private selectToBtn: HTMLButtonElement;

    constructor(name: string) {
        super(name);

        for (const data of config.SONG_LIST) {
            if (!data.font) continue;
            this.assetUrls.push({alias: data.font.name, type: "font", name: data.font.path})
        }

        this.help = document.getElementById("help") as HTMLDivElement;
        this.selectToBtn = document.getElementById("selectToBtn") as HTMLButtonElement;

        this.selectToBtn.addEventListener("click", () => {
            if (!this.help) return;

            GameManager.helpEnded = true;
            window.addEventListener("keydown", this.onKeyDown);
            this.rootContainer.eventMode = "auto";
            this.showUI();
            this.help.classList.remove("is-active");
            this.rootContainer.filters = [];
            TAManager.startSample(0);
        })
    }

    private onKeyDown = (event : KeyboardEvent) => {
        if (event.repeat) return;

        InputHandler.onInput({
            callback: (type, value) => this.selectSong(type, value),
            map: "ui",
            action: "move",
            event: event
        });

        InputHandler.onInput({
            callback: this.onSelect,
            map: "ui",
            action: "select",
            event: event
        });
    }

    //初期化する関数
    public override async initialize() {

        let brightness = 0;
        if (!GameManager.helpEnded) {
            const blurFilter = new PIXI.BlurFilter({
                strength: 8,
                quality: 4
            });
            const colorFilter = new PIXI.ColorMatrixFilter();

            this.rootContainer.filters = [blurFilter, colorFilter];

            brightness = 0.5;
        }

        else {
            brightness = 1;
        }
        

        SceneManager.FadeIn({type: "normal", duration: SONGSELECT_FADEIN_TIME, brightness: brightness, color: "black", onComplete: () => {
            if (!this.help) return;
            if (GameManager.helpEnded) {
                window.addEventListener("keydown", this.onKeyDown);
                return;
            }

            this.rootContainer.eventMode = "none";
            this.hiddenUI();
            this.help.classList.add("is-active");
        }});

        TAManager.startSample(this.currentSong);
        this.background = VRE.createSprite({
            layer: LayerType.BACK_GROUND,
            type: "background",
            name: BG_SEABED,
            x: 0,
            y: 0,
        });

        for (let data of config.SONG_LIST){
            this.songDataList.push(new SongData({
                name: data.name,
                artist: data.artist,
                font: data.font ? data.font.name : "sans-serif",
            }));
        }

        this.initializeBubbles();
        this.initializeHitArea();

        if (this.background) {
            VRE.fitSpriteToScreen({sprite: this.background});
            WDF.addShader(this.background);
        }
    }

    public override update(ticker: PIXI.Ticker): void {
    }

    public override onDisable(): void {
        this.bubbles = [];
    }

    //泡の初期化処理
    private initializeBubbles() {
        for (let i = 0;i < BUBBLE_TRANSFORMS.length;i ++) {
            const sprite = this.createBubble() ?? new PIXI.Sprite();
            const index = (i - 2 + this.songDataList.length) % this.songDataList.length;
            const data = this.songDataList[index];
            const song = new SongUI(data);
            song.initialize();
            
            const bubble = new Bubble({
                x: BUBBLE_TRANSFORMS[i].x,
                y: BUBBLE_TRANSFORMS[i].y,
                scale: BUBBLE_TRANSFORMS[i].scale,
                alpha: BUBBLE_TRANSFORMS[i].alpha,
                index: i,
                song: song,
                sprite: sprite
            });

            this.bubbles.push(bubble);
            WDF.addShader(bubble.sprite);
            this.addChild(LayerType.GAME, bubble.container);
        }
    }

    //クリック判定用スプライトの初期化処理
    private initializeHitArea(){
        if (this.bubbles.length < 5) {
            console.error(`bubblesが必要な数分生成されていません！／bubblesの要素数:${this.bubbles.length}`);
            return;
        }

        this.left = this.createHitArea({
            x: this.bubbles[1].container.x,
            y: this.bubbles[1].container.y,
            radius: this.bubbles[1].container.width / 2 * 0.79,
            color: 0xff0000
        });

        this.right = this.createHitArea({
            x: this.bubbles[3].container.x,
            y: this.bubbles[3].container.y,
            radius: this.bubbles[3].container.width / 2 * 0.79,
            color: 0x0000ff
        });

        this.center = this.createHitArea({
            x: this.bubbles[2].container.x,
            y: this.bubbles[2].container.y,
            radius: this.bubbles[2].container.width / 2 * 0.79,
            color: 0xffffff
        });

        this.left.on("pointerdown", () => {
            this.selectSong("click", {x: -1, y: 0})
        });

        this.right.on("pointerdown", () => {
            this.selectSong("click", {x: 1, y: 0})
        });

        this.center.on("pointerdown", () => {
            this.onSelect();
        });
    }

    //泡を作成する関数
    private createBubble() {
        let sprite = VRE.newSprite({
            type: "texture",
            name: TEX_BUBBLE
        });
        if (!sprite) return null;

        VRE.resizeSprite({
            sprite: sprite,
            width: BUBBLE_RADIUS * 2,
            height: BUBBLE_RADIUS * 2
        });
        return sprite;
    }

    //クリック判定用スプライトを作成する関数
    private createHitArea({
        x = 0,
        y = 0,
        radius,
        color = 0xffffff
    }: {
        x?: number;
        y?: number;
        radius: number;
        color?: number;
    }): PIXI.Graphics {
        let circle = VRE.createCircle({layer: LayerType.UI,x:x, y: y, radius: radius, color: color});
        circle.eventMode = 'static';
        circle.cursor = 'pointer';
        circle.alpha = config.DEBUG_MODE ? 1 : 0;

        return circle;
    }

    //曲を選択したときの処理
    private async onSelect(){
        window.removeEventListener("keydown", this.onKeyDown);

        this.left?.off("pointerdown");
        this.right?.off("pointerdown");
        this.center?.off("pointerdown");

        await SceneManager.FadeOut({type: "zoom", duration: SONGSELECT_FADEOUT_TIME, color: "white"});
        await TAManager.start();
    }

    //曲を切り替える処理
    private selectSong(type: string, direction: {x: number, y: number}) {
        if (!direction) return;
        this.moveBubble(direction);
        TAManager.startSample(this.currentSong);
    }

    //泡を移動させる処理
    private moveBubble(direction: {x: number, y: number}) {
        this.currentSong += direction.x;
        if (this.currentSong < 0) this.currentSong = this.songDataList.length - 1;
        if (this.currentSong >= this.songDataList.length) this.currentSong = 0;

        for (let bubble of this.bubbles) {
            bubble.index -= direction.x;
            if (bubble.index < 0) bubble.index = this.bubbles.length - 1;
            if (bubble.index >= this.bubbles.length) bubble.index = 0;

            //曲情報更新（右移動時）
            if (direction.x > 0 && bubble.index === this.bubbles.length - 1) {
                bubble.setSongData(this.songDataList[(this.currentSong + 2 + this.songDataList.length) % this.songDataList.length]);
            }
            
            //曲情報更新（左移動時）
            if (direction.x < 0 && bubble.index === 0) {
                bubble.setSongData(this.songDataList[(this.currentSong - 2 + this.songDataList.length) % this.songDataList.length]);
            }
            
            //泡が動くアニメーション
            let nextTransform = BUBBLE_TRANSFORMS[bubble.index];
            gsap.to(bubble.container, {
                pixi: { x: nextTransform.x, scale: nextTransform.scale, alpha: nextTransform.alpha }, 
                duration: 0.8,
                ease: "expo.out"
            });
        }
    }
}



//曲データクラス
class SongData {
    name: string;
    artist: string;
    font: string;

    constructor({
        name,
        artist,
        font,
    }: {
        name: string;
        artist: string; 
        font: string;  
    }) {
        /**曲名 */
        this.name = name;
        /**作曲者名 */
        this.artist = artist;
        /**フォント名 */
        this.font = font;
    }
}

//曲データ表示用クラス
class SongUI {
    data: SongData;
    container: PIXI.Container;
    nameText: PIXI.Text | null;
    artistText: PIXI.Text | null;

    constructor(data: SongData) {
        this.data = data;
        this.container = new PIXI.Container();
        this.nameText = null;
        this.artistText = null;
    }

    initialize() {
        this.nameText = VRE.newText({
            y: 40,
            text: this.data.name,
            style: new PIXI.TextStyle({
                fontFamily: this.data.font,
                fontSize: NAME_SIZE,
                fill: 0xffffff
            }),
        });

        this.artistText = VRE.newText({
            y: 100,
            text: this.data.artist,
            style: new PIXI.TextStyle({
                fontFamily: this.data.font,
                fontSize: ARTIST_SIZE,
                fill: 0xffffff
            }),
        });

        this.setData(this.data);

        this.container.addChild(this.artistText);
        this.container.addChild(this.nameText);

        this.container.alpha = 1;
        return {name: this.nameText, artist: this.artistText};
    }

    setData(data: SongData){
        if (!this.nameText) return;
        if (!this.artistText) return;

        this.nameText.text = data.name;
        this.artistText.text = data.artist;
    }
}

//泡クラス
class Bubble {
    x: number;
    y: number;
    index: number;
    song: SongUI;
    sprite: PIXI.Sprite;
    container: PIXI.Container;

    constructor({
        x,
        y,
        scale,
        alpha,
        index,
        song,
        sprite
    }: {
        x: number;
        y: number;
        scale: number;
        alpha: number;
        index: number;
        song: SongUI;
        sprite: PIXI.Sprite;
    }) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.song = song;
        this.sprite = sprite;

        this.container = new PIXI.Container();
        this.container.addChild(this.sprite);
        this.container.addChild(this.song.container ?? new PIXI.Container());

        this.container.x = x;
        this.container.y = y;
        this.container.scale = scale;
        this.container.alpha = alpha;
    }

    setSongData(data: SongData) {
        this.song.setData(data);
    }

    getSongData() {
        return this.song.data;
    }
}