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

//GSAPとPIXIを連携させる
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

const BG_SEABED = config.BG_SEABED;
const BG_LAKE = config.BG_LAKE;
const DROP_OFFSET = 300;
const PHRASE_OFFSET = 0;
const LYRIC_EXPLODE_TIME = config.LYRIC_EXPLODE_TIME;
const LYRIC_FAIL_TIME = config.LYRIC_FAIL_TIME;
const LYRIC_WAIT_TIME = config.LYRIC_WAIT_TIME;
const LYRIC_COMPLETE_TIME = config.LYRIC_COMPLETE_TIME;
const LYRIC_SIZE = config.LYRIC_SIZE;
const LYRIC_FONT = config.LYRIC_FONT;
const WORD_OFFSET_MIN = config.WORD_OFFSET_MIN;
const WORD_OFFSET_MAX = config.WORD_OFFSET_MAX;
const ROTATION_MIN = config.ROTATION_MIN;
const ROTATION_MAX = config.ROTATION_MAX;
const SHAKE_MAX_AMOUNT = config.SHAKE_MAX_AMOUNT;
const SCROLL_SPEED = 1;
const MAIN_FADEIN_TIME = config.MAIN_FADEIN_TIME;

export default class MainScene extends Scene {
    public readonly assetUrls: URL[] = [
        {type: "background", name: BG_SEABED},
        {type: "background", name: BG_LAKE},
    ];

    public fontFamily: string[] = [];

    private background: PIXI.Sprite | null = null;
    private lake: PIXI.TilingSprite | null = null;
    private dropList: Drop[] = [];
    private phraseMap = new Map<TA.IPhrase, PhraseUI>();
    private completePhraseCount: number = 0;
    private isChorus: boolean = false;
    private playPauseBtn: HTMLButtonElement;
    private returnBtn: HTMLButtonElement;
    private isPause: boolean = false;
    
    constructor(name: string) {
        super(name);

        for (const data of config.SONG_LIST) {
            if (!data.font) continue;
            this.assetUrls.push({alias: data.font.name, type: "font", name: data.font.path})
        }
        this.playPauseBtn = document.getElementById("playPauseBtn") as HTMLButtonElement;
        this.returnBtn = document.getElementById("returnBtn") as HTMLButtonElement;
    }
    public override async initialize(): Promise<void> {
        TAManager.player.volume = 100;
        SceneManager.FadeIn({type: "normal", duration: MAIN_FADEIN_TIME, color: "white", onComplete: () => {
            VRE.app.renderer.background.color = "black";
        }});

        this.dropList = [];
        this.phraseMap = new Map<TA.IPhrase, PhraseUI>();
        this.completePhraseCount = 0;
        this.isChorus = false;
        this.isPause = false;

        const font = GameManager.currentSong.font;
        if (font) {
            this.fontFamily = [font.name, ...LYRIC_FONT];
        } else {
            this.fontFamily = [...LYRIC_FONT];
        }

        this.background = VRE.createSprite({
            layer: LayerType.BACK_GROUND,
            type: "background",
            name: BG_SEABED
        });
        this.lake = VRE.createTilingSprite({
            layer: LayerType.BACK_GROUND,
            type: "background",
            name: BG_LAKE,
            width: 100000,
        });

        if (this.background) {
            VRE.fitSpriteToScreen({sprite: this.background});
            
        }

        if (this.lake) {
            this.lake.texture.source.addressMode = 'repeat';
            this.lake.texture.source.scaleMode = 'linear';
            VRE.fitSpriteToScreen({sprite: this.lake, scale: 1.2});
            Ripple.addShader(this.lake);
        }

        this.playPauseBtn.addEventListener("click", this.togglePlayPause)

        this.returnBtn.addEventListener("click", this.returnSongSelect)
    }

    private togglePlayPause = () => {
        this.isPause = !this.isPause;

        if (this.isPause) {
            this.playPauseBtn.classList.add("is-pause");
            TAManager.pause();
            this.camera.scrollEnd();
        }

        else {
            this.playPauseBtn.classList.remove("is-pause");
            TAManager.play();
        }
    }

    private returnSongSelect = async () => {
        if (!this.isPause) this.togglePlayPause();
        this.playPauseBtn.classList.remove("is-pause");

        await SceneManager.FadeOut({type: "normal", duration: MAIN_FADEIN_TIME, color: "black"});
        SceneManager.changeScene("songSelect");
    } 

    public override update(ticker: PIXI.Ticker): void {
        if (this.isPause) return;

        Ripple.update(ticker);

        for (const drop of this.dropList) {
            drop.update(ticker);
        }

        const emotion = TAManager.player.getValenceArousal(TAManager.player.timer.position);
        const aronsal = (emotion.a + 1) / 2; //０～１
        const amount = aronsal * SHAKE_MAX_AMOUNT;
        this.camera.shake({
            speed: aronsal * 0.01 * (this.isChorus ? 1.3 : 1),
            amount: aronsal * amount * ((this.isChorus ? 1.5 : 1)),
        });
        this.camera.scrollStart({vx: (aronsal + 1) * (SCROLL_SPEED / 2) * (this.isChorus ? 1.5 : 1)});
    }

    public override onDisable() {
        this.camera.scrollEnd();

        for (const ui of this.phraseMap.values()) {
            ui.destroy();
        }
        this.phraseMap.clear();
        
        this.playPauseBtn.removeEventListener("click", this.togglePlayPause);
    }

    public override onChar(char: TA.IChar): void {
        const emotion = TAManager.player.getValenceArousal(char.startTime);
        const arousal = (emotion.a + 1) / 2; //０～１

    }

    public override onChorusStart(chorus: TA.IRepetitiveSegment): void {
        this.isChorus = true;
    }

    public override onChorusEnd(): void {
        this.isChorus = false;
    }

    public override async onSongEnd(song: TA.Song): Promise<void> {
        const totalPhraseCount = TAManager.player.video.phraseCount;
        GameManager.completionRate = this.completePhraseCount / totalPhraseCount;
        
        SceneManager.changeScene("result");
    }

    public override explodeWord(word: TA.IWord) {
        if (!this.phraseMap.has(word.parent)) {
            const newPhraseUI = new PhraseUI({
                scene: this,
                phrase: word.parent,
                onComplete: () => {
                    this.completePhraseCount++;
                },

                onFail: (self: PhraseUI) => {
                    this.phraseMap.delete(word.parent);
                    self.destroy(); 
                }
            });
            
            this.phraseMap.set(word.parent, newPhraseUI);
        }

        const currentPhraseUI = this.phraseMap.get(word.parent)!;

        this.createDrop({
            x: this.camera.offset.x + math.randomRange(0, this.width) + DROP_OFFSET,
            lyric: word,
            phraseUI: currentPhraseUI
        });
    }

    public createDrop({
        x,
        lyric,
        phraseUI
    }: {
        x: number,
        lyric: TA.IWord
        phraseUI: PhraseUI;
    }) {
        const graphics = VRE.createCircle({
            x: x,
            y: -this.height / 2,
            layer: LayerType.GAME,
            radius: 20,
            color: 0x6666ff
        })

        this.dropList.push(new Drop({
            scene: this,
            sprite: graphics,
            accel: 0.5,
            lyric: lyric,

            onComplete: (target) => {
                const x = target.position.x - this.camera.offset.x + this.width;
                const y = target.position.y - this.camera.offset.y + this.height;
                Ripple.createRipple({x: x, y: y});
                phraseUI.addWord({x: target.position.x, y: target.position.y, word: target.lyric});
                this.dropList = this.dropList.filter(drop => drop !== target);
            },
        }));
    }
}

class PhraseUI {
    public words: LyricPair[] = [];
    public phrase: TA.IPhrase;

    private scene: MainScene;
    private airLyric: {container: PIXI.Container, graphics: PIXI.Graphics, isCompleted: boolean};
    private waterLyric: {container: PIXI.Container, graphics: PIXI.Graphics, isCompleted: boolean};
    private completeLyric: PIXI.Text;
    private isCompleted: boolean = false;
    private wordXOffsets = new Map<TA.IWord, number>();
    private style: PIXI.TextStyle;
    private onComplete?: (self: PhraseUI) => void;
    private onFail?: (self: PhraseUI) => void;
    private onFinish?: (self: PhraseUI) => void;
    private timers: gsap.core.Tween[] = [];
    constructor({
        scene,
        phrase,
        onComplete,
        onFail,
        onFinish,
    }: {
        scene: MainScene;
        phrase: TA.IPhrase;
        onComplete?: (self: PhraseUI) => void;
        onFail?: (self: PhraseUI) => void;
        onFinish?: (self: PhraseUI) => void;
    }) {
        this.scene = scene;
        this.phrase = phrase;
        this.onComplete = onComplete;
        this.onFail = onFail;
        this.onFinish = onFinish;

        this.style = new PIXI.TextStyle({
            fontFamily: this.scene.fontFamily,
            fontSize: LYRIC_SIZE,
            fill: 0xffffff,
            align: "center"
        })

        const neonStyle = new PIXI.TextStyle({
            fontFamily: this.scene.fontFamily,
            fontSize: LYRIC_SIZE,
            fill: '#ffffff',
            padding: 20,
            
            // ★発光の設定
            dropShadow: {
                alpha: 1,
                color: '#00ffff',
                blur: 12,
                angle: 0,
                distance: 0,
            }
        });

        const phraseText = PIXI.CanvasTextMetrics.measureText(this.phrase.text, this.style);
        let currentX = -phraseText.width / 2;

        let currentWord: TA.IWord | null = phrase.firstWord;
        while (currentWord) {
            this.wordXOffsets.set(currentWord, currentX);

            const wordWidth = PIXI.CanvasTextMetrics.measureText(currentWord.text, this.style).width;
            currentX += wordWidth;

            if (currentWord === phrase.lastWord) break;
            currentWord = currentWord.next;
        }

        const airGraphics = VRE.newRect({
            width: phraseText.width,
            height: phraseText.height * 1.5,
            alpha: 0,
            color: 0xffffff,
            pivot: {x: 0.5, y: 0.5},
            onEvent: this.airComplete,
        });

        const waterGraphics = VRE.newRect({
                width: phraseText.width,
                height: phraseText.height * 1.5,
                alpha: 0,
                color: 0xffffff,
                pivot: {x: 0.5, y: 0.5},
                onEvent: this.waterComplete,
            });

        this.airLyric = {
            isCompleted: false,
            container: new PIXI.Container({
                x: this.scene.camera.offset.x + math.randomRange(0, PHRASE_OFFSET) + this.scene.width,
                y: this.scene.camera.offset.y + math.randomRange(150, this.scene.height / 2 - 100),
            }),
            graphics: airGraphics
        };

        this.waterLyric = {
            isCompleted: false,
            container: new PIXI.Container({
                x: this.scene.camera.offset.x + math.randomRange(0, PHRASE_OFFSET) + this.scene.width,
                y: this.scene.camera.offset.y + math.randomRange(100, this.scene.height / 2 - 150) + this.scene.height / 2,
            }),
            graphics: waterGraphics
        };

        this.airLyric.container.addChild(this.airLyric.graphics);
        this.waterLyric.container.addChild(this.waterLyric.graphics);

        const y = this.scene.camera.offset.y + this.scene.height / 2;
        const p1 = this.airLyric.container;
        const p2 = this.waterLyric.container;

        const x = p1.y === p2.y ? p1.x : p1.x + ((y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y);

        this.completeLyric = VRE.createText({
            layer: LayerType.LYRIC,
            x: x,
            y: y,
            text: phrase.text,
            style: neonStyle,
            alpha: 0,
        });
        this.completeLyric.eventMode = "none";

        this.scene.addChild(LayerType.LYRIC, this.airLyric.container);
        this.scene.addChild(LayerType.LYRIC, this.waterLyric.container);
        //WDF.addShader(this.waterLyric.container);
    }

    //空中の歌詞をクリックしたときの処理
    airComplete = () => {
        if (this.airLyric.isCompleted) return;

        this.airLyric.isCompleted = true;
        this.airLyric.graphics.eventMode = "none";
        if (this.waterLyric.isCompleted) {
            this.isCompleted = true;
        }

        for (const w of this.words) {
            w.air.break();
            w.air.completeText();
        }
    }

    //水中の歌詞をクリックしたときの処理
    waterComplete = () => {
        if (this.waterLyric.isCompleted) return;

        this.waterLyric.isCompleted = true;
        this.waterLyric.graphics.eventMode = "none";
        if (this.airLyric.isCompleted) {
            this.isCompleted = true;
        }

        for (const w of this.words) {
            w.water.break();
            w.water.completeText();
        }
    }

    addWord({
        x,
        y,
        word
    }: {
        x: number;
        y: number;
        word: TA.IWord;
    }) {
        const correctX = this.wordXOffsets.get(word) ?? x;
        const lyricPair = new LyricPair({
            position: {
                init: {
                    air: {x: x - this.airLyric.container.x, y: y - this.airLyric.container.y},
                    water: {x: x - this.waterLyric.container.x, y: y - this.waterLyric.container.y}
                },
                target: {
                    air: {x: this.airLyric.graphics.x + correctX, y: this.airLyric.graphics.y},
                    water: {x: this.waterLyric.graphics.x + correctX, y: this.waterLyric.graphics.y} 
                },
                
            },
            lyric: word,
            style: this.style
        });

        this.words.push(lyricPair);
        this.airLyric.container.addChild(lyricPair.air.ui);
        this.waterLyric.container.addChild(lyricPair.water.ui);
        lyricPair.animate(!this.airLyric.isCompleted, !this.waterLyric.isCompleted);

        //フレーズ最後の単語だったら通過
        if (this.phrase.lastWord !== word) return;

        //時間内に空中と水中の歌詞をクリック
        this.timers.push(gsap.delayedCall(LYRIC_EXPLODE_TIME,() => {
            if (this.isCompleted) this.complete();
        }));

        //猶予時間
        this.timers.push(gsap.delayedCall(LYRIC_WAIT_TIME,() => {
            if (this.isCompleted) this.complete();
            else this.fail();
        }));
    }

    //歌詞が完成したときの処理
    private complete() {
        this.isCompleted = true;

        const tl = gsap.timeline();
        tl.to(this.airLyric.container, {
            pixi: {
                x: this.completeLyric.x,
                y: this.completeLyric.y,
            },
            duration: LYRIC_COMPLETE_TIME,
            ease: "power2.inOut",
        })
        .to(this.waterLyric.container, {
            pixi: {
                x: this.completeLyric.x,
                y: this.completeLyric.y,
            },
            duration: LYRIC_COMPLETE_TIME,
            ease: "power2.inOut",
        }, "<")
        .to(this.airLyric.container, {
            pixi: {
                alpha: 0,
            },
            duration: LYRIC_COMPLETE_TIME,
            ease: "power2.inOut",
        })
        .to(this.waterLyric.container, {
            pixi: {
                alpha: 0,
            },
            duration: LYRIC_COMPLETE_TIME,
            ease: "power2.inOut",
        }, "<")
        .to(this.completeLyric, {
            pixi: {
                alpha: 1
            },
            duration: LYRIC_COMPLETE_TIME,
            onComplete: () => {
                this.airLyric.container.destroy();
                this.waterLyric.container.destroy();
            }
        }, "<")
        .to(this.completeLyric, {
            pixi: {
                y: this.scene.height + this.completeLyric.width / 2,
                rotation: math.randomRange(ROTATION_MIN, ROTATION_MAX),
            },
            duration: 8,
            ease: "power1.in",
            onComplete: () => {
                this.onFinish?.(this);
                this.onComplete?.(this);
            }
        }, "<")
    }

    //歌詞が完成しなかったときの処理
    private fail() {
        this.disable();
        this.break();
        this.failText();

        gsap.delayedCall(LYRIC_FAIL_TIME, () => {
            this.onFinish?.(this);
            this.onFail?.(this);
        })
    }

    public completeText() {
        for (const w of this.words) w.completeText();
    }

    public failText() {
        for (const w of this.words) w.failText();
    }

    /**アニメーションを中断するメソッド */
    public break() {
        for (const w of this.words) w.break();
    }

    /**入力を無効にするメソッド */
    public disable() {
        for (const timer of this.timers) timer?.kill();
        this.timers = [];
        this.airLyric.graphics.destroy();
        this.waterLyric.graphics.destroy();
    }

    /**すべて破棄するメソッド */
    public destroy() {
        this.disable();
        for (const w of this.words) w.destroy();
        this.words = [];
    }
}

class Drop {
    public sprite: PIXI.Graphics | null;
    public position: {x: number, y: number};
    public speed: {x: number, y: number};
    public accel: number;
    public lyric: TA.IWord;

    private scene: Scene;
    private onComplete: (target: Drop) => void;
    private isProgress = true;
    private time: number = 0;
    
    constructor({
        scene,
        onComplete,
        sprite,
        speed = {x: 0, y: 0},
        accel,
        lyric,
    }: {
        scene: Scene;
        onComplete: (target: Drop) => void;
        sprite: PIXI.Graphics;
        speed?: {x: number, y: number};
        accel: number;
        lyric: TA.IWord;
    }) {
        this.scene = scene;
        this.onComplete = onComplete;
        this.sprite = sprite;
        this.position = this.sprite ? { x: this.sprite.x, y: this.sprite.y } : { x: 0, y: 0 };
        this.speed = speed;
        this.accel = accel;
        this.lyric = lyric;
    }

    public update(ticker: PIXI.Ticker) {
        if (!this.isProgress) return;
        this.move(ticker);
        if (this.position.y > this.scene.camera.offset.y + this.scene.height / 2) {
            this.destroy();
        }
        
        this.time += ticker.elapsedMS;
    }

    private move(ticker: PIXI.Ticker) {
        this.position.x += this.speed.x * ticker.deltaTime;
        this.position.y += this.speed.y * ticker.deltaTime;
        this.speed.y += this.accel * ticker.deltaTime;
        this.speed.x /= 1.5;

        if (this.sprite) {
            this.sprite.x = this.position.x;
            this.sprite.y = this.position.y;
        }
        
    }

    private destroy() {
        if (config.DEBUG_MODE) console.log(this.time);
        this.isProgress = false;

        this.sprite?.destroy();
        this.sprite = null;
        this.onComplete?.(this);
    }
}

class Lyric {
    public initPosition: {x: number, y: number};
    public targetPosition: {
        x: {offset: number, min: number, max: number};
        y: {offset: number, min: number, max: number};
    };
    public lyric: TA.IWord;
    public ui: PIXI.Text;
    private animations: gsap.core.Tween[] = [];

    private _targetPosition: {x: number, y: number} = {x: 0, y: 0};

    private _randomRotation: number = 0;

    constructor({
        initPosition,
        targetPosition,
        lyric,
        style
    }: {
        initPosition: {x: number, y: number};
        targetPosition: {
            x: {offset: number, min: number, max: number};
            y: {offset: number, min: number, max: number};
        };
        lyric: TA.IWord;
        style: PIXI.TextStyle;
    }) {
        this.initPosition = initPosition;
        this.targetPosition = targetPosition;
        this.lyric = lyric;
        this.ui = VRE.createText({
            layer: LayerType.LYRIC,
            x: initPosition.x,
            y: initPosition.y,
            text: this.lyric.text,
            style: style,
        });
        this.ui.anchor.set(0, 0.5);
        this.ui.alpha = 0;
        this.ui.eventMode = 'none'; 
        this._randomRotation = math.randomRange(ROTATION_MIN, ROTATION_MAX);
        this.ui.angle = this._randomRotation * 2;
    }

    destroy() {
        this.animations.forEach((anim) => anim?.kill());
        this.ui.destroy();
    }

    break() {
        this.animations.forEach((anim) => anim?.kill());
    }

    explodeText(isRnd: boolean = true) {
        this._targetPosition.x = this.targetPosition.x.offset;
        this._targetPosition.y = this.targetPosition.y.offset;

        const rndX = math.randomRange(this.targetPosition.x.min, this.targetPosition.x.max);
        const rndY = math.randomRange(this.targetPosition.y.min, this.targetPosition.y.max);
        this.animations.push(gsap.to(this.ui, {
            pixi: {
                x: this._targetPosition.x + (isRnd ? rndX : 0),
                y: this._targetPosition.y + (isRnd ? rndY : 0),
                rotation: isRnd ? this._randomRotation : 0,
                alpha: 1,
            },
            duration: LYRIC_EXPLODE_TIME,
            ease: "power2.out",
        }));
    }

    completeText() {
        this.animations.push(gsap.to(this.ui, {
            pixi: {
                x: this._targetPosition.x,
                y: this._targetPosition.y,
                rotation: 0,
                alpha: 1,
            },
            duration: LYRIC_EXPLODE_TIME,
            ease: "power2.out",
        }));
    }

    failText() {
        this.animations.push(gsap.to(this.ui, {
            pixi: {
                alpha: 0,
            },
            duration: LYRIC_FAIL_TIME,
            ease: "power2.out",
        }));
    }
}

class LyricPair {
    public air: Lyric;
    public water: Lyric;

    constructor({
        position,
        lyric,
        style
    }: {
        position: {
            init: {
                air: {x: number, y: number},
                water: {x: number, y: number},
            },
            target: {
                air: {x: number, y: number},
                water: {x: number, y: number},
            }
        };
        lyric: TA.IWord;
        style: PIXI.TextStyle;
    }) {

        const airStyle = new PIXI.TextStyle(style);
        const waterStyle = new PIXI.TextStyle(style);
        waterStyle.fill = 0x777777;
        this.air = new Lyric({
            initPosition: position.init.air,
            targetPosition: {
                x: {offset: position.target.air.x, min: WORD_OFFSET_MIN, max: WORD_OFFSET_MAX},
                y: {offset: position.target.air.y, min: WORD_OFFSET_MIN, max: WORD_OFFSET_MAX}
            },
            lyric: lyric,
            style: airStyle
        });
        this.water = new Lyric({
            initPosition: position.init.water,
            targetPosition: {
                x: {offset: position.target.water.x, min: WORD_OFFSET_MIN, max: WORD_OFFSET_MAX},
                y: {offset: position.target.water.y, min: WORD_OFFSET_MIN, max: WORD_OFFSET_MAX}
            },
            lyric: lyric,
            style: waterStyle
        });
    }

    public animate(isRndAir: boolean, isRndWater: boolean) {
        this.air.explodeText(isRndAir);
        this.water.explodeText(isRndWater);
    }

    public completeText() {
        this.air.completeText();
        this.water.completeText();
    }

    public failText() {
        this.air.failText();
        this.water.failText();
    }

    public destroy() {
        this.air.destroy();
        this.water.destroy();
    }

    public break() {
        this.air.break();
        this.water.break();
    }
}