//外部ライブラリ
import { gsap } from "gsap";
import * as PIXI from 'pixi.js';

//自作の必須ファイル
import * as config from "@/config";
import VRE from "@/core/visualRenderEngine";
import { LayerType } from '@/core/scene';


const MAX_RIPPLE_COUNT = config.MAX_RIPPLE_COUNT;
const MAX_RIPPLE_TIME = config.MAX_RIPPLE_TIME;
const RIPPLE_DATA = config.RIPPLE_DATA

type RippleData = {
    x: number,
    y: number,
    time: number,
    amplitude: number
}

export type RippleConfig = {
    amplitude: number,
    wavelength: number,
    speed: number,
    radius: number
}

let ripples: RippleData[] = [];
let filter: RippleFilter | null = null;

export default class Ripple {
    static initialize() {
        // 3. RippleFilter のインスタンス化
        filter = new RippleFilter({
            wavelength: RIPPLE_DATA.wavelength,
            speed: RIPPLE_DATA.speed,
            radius: RIPPLE_DATA.radius
        });
        filter.padding = 100;
    }

    static update(ticker : PIXI.Ticker) {
        if (!filter) return;

        ripples = ripples.filter(ripple => {
            ripple.time -= 0.02 * ticker.deltaTime;
            return ripple.time > 0;
        });

        // 2. 配列を一旦すべて0でリセット
        filter.rippleData.fill(0);

        const STRIDE = 4;
        const viewWidth = VRE.app.screen.width;
        const viewHeight = VRE.app.screen.height;

        // 最大8個までデータを詰める
        const count = Math.min(ripples.length, MAX_RIPPLE_COUNT);
        for (let i = 0;i < count;i ++) {
            const ripple = ripples[i];
            const offset = i * STRIDE;
            const centerX = ripple.x / viewWidth;
            const centerY = ripple.y / viewHeight;
            filter.rippleData[offset + 0] = centerX;  // center.x
            filter.rippleData[offset + 1] = centerY; // center.y
            filter.rippleData[offset + 2] = ripple.time;           // time
            filter.rippleData[offset + 3] = 0.005 * Math.pow(ripple.time, 1.3); // amplitude
        }
        
        // 4. 現在の有効な波紋の数をシェーダーに伝える
        filter.resources.rippleUniforms.uniforms.uRippleCount = count;

        // 5. GPUに「データが変わったよ！」と通知して転送させる
        filter.resources.rippleUniforms.update();
    }


    static async addShader(sprite: PIXI.Container) {
        if (!filter) {
            console.error("フィルターが存在しません！")
            return;
        }
        const currentFilters = sprite.filters || [];
        sprite.filters = [...currentFilters, filter];
    }

    static createRipple({
        x,
        y,
    }: {
        x: number;
        y: number;
    }) {
        if (ripples.length >= MAX_RIPPLE_COUNT) {
            ripples.shift(); // 古いものから削除
        }

        ripples.push({
            x: x,
            y: y,
            time: MAX_RIPPLE_TIME,
            amplitude: RIPPLE_DATA.amplitude
        });

        //以下デバッグ用
        if (!config.DEBUG_MODE) return;
        const circle = VRE.createCircle({
            layer: LayerType.UI,
            x: x,
            y: y,
            radius: 40,
            color: 0xff0000,
        })

        gsap.delayedCall(1, () => circle.destroy());
    }
}



const vertexShader = /* glsl */`
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

// フラグメントシェーダー
const fragmentShader = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;

#define MAX_RIPPLES ${MAX_RIPPLE_COUNT}

uniform float uWavelength;
uniform float uSpeed;
uniform float uRadius;

// 2. 構造体の配列を定義
uniform vec4 uRipples[MAX_RIPPLES];
uniform int uRippleCount;

float addY(vec2 uv, vec4 ripple) {
    vec2 center = ripple.xy;
    float time = ripple.z;
    float amplitude = ripple.w;

    float dist = distance(uv, center);

    if (dist < uRadius && amplitude > 0.0) {
        float attenuation = 1.0 - (dist / uRadius);
        attenuation = pow(attenuation, 1.5);

        float wave = sin((dist / uWavelength) - (time * uSpeed));
        return wave * amplitude * attenuation;
    }
    return 0.0;
}

void main(void) {
    vec2 uv = vTextureCoord;
    for(int i = 0;i < MAX_RIPPLES;i ++) {
        if (i >= uRippleCount) break;
        uv.y += addY(vTextureCoord, uRipples[i]);
    }

    finalColor = texture(uTexture, uv);
}
`;

/**
 * 真横から見た波紋のように歪ませるフィルタークラス
 */
export class RippleFilter extends PIXI.Filter {
    rippleData: Float32Array;

    constructor({
        wavelength = 0.15,
        speed = 15.0,
        radius = 0.5
    } : {
        /**波の長さ */
        wavelength?: number;
        /**波の速度 */
        speed?: number;
        /**波紋の半径 */
        radius?: number;
    } = {}) {
        const rippleData = new Float32Array(MAX_RIPPLE_COUNT * 4);

        super({
            glProgram: PIXI.GlProgram.from({
                vertex: vertexShader,
                fragment: fragmentShader,
            }),
            resources: {
                rippleUniforms: new PIXI.UniformGroup({
                    uRipples: { value: rippleData, type: 'vec4<f32>', size: MAX_RIPPLE_COUNT },
                    uRippleCount: { value: 0, type: 'i32' },

                    uWavelength: { value: wavelength, type: 'f32' },
                    uSpeed: { value: speed, type: 'f32' },
                    uRadius: { value: radius, type: 'f32' }
                })
            }
        });

        this.rippleData = rippleData;
    }

    /**現在画面の中に存在しているアクティブな波紋の数（読み取り専用） */
    get rippleCount() {
        return this.resources.rippleUniforms.uniforms.uRippleCount;
    }
}