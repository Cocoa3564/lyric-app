//外部ライブラリ
import * as PIXI from 'pixi.js';

import * as config from "@/config";
import InputHandler from "@/core/inputHandler";
import SceneManager from "@/core/sceneManager";
import TAManager from "@/core/textAliveManager";
import VRE from "@/core/visualRenderEngine";
import WDF from "@/filters/waterDistortionFilter";
import Ripple from "@/filters/rippleFilter";
import '@/style.css'

window.addEventListener('load', async () => {
    await initialize();

    VRE.app.ticker.add((ticker) => {
        update(ticker);
    });
});

export async function initialize() {
    await InputHandler.initialize();
    await VRE.initialize();
    await WDF.initialize();
    await Ripple.initialize();
    await TAManager.initialize();
    await SceneManager.initialize();
}

export function update(ticker: PIXI.Ticker) {
    WDF.update(ticker);
    SceneManager.update(ticker);
}