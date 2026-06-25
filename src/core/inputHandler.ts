//外部ライブラリ
import {FederatedPointerEvent} from 'pixi.js';

import * as config from "@/config";

export const InputType = {
    KEYBOARD: "keyboard",
    CLICK: "click",
    TAP: "tap",
    HEAD_POSE: "headPose"
};

/** mapの種類
 *
 * camera
 * lyric
 * ui
 */

// ーーーーーーーーーーactionの種類ーーーーーーーーーー
/** camera
 * 
 * move
 */

/** lyric
 *
 * select
 */

/** ui
 *
 * move
 * cancel
 * select
 * setting
 */

// ーーーーーーーーーーinputTypeの種類ーーーーーーーーーー
/**
 * click
 * tap
 * headPose
 * keyboard
 */

export default class InputHandler {
    // 1. JSONファイルを非同期で読み込む関数
    static async loadInputData(): Promise<Record<string, any> | null> {
        try {
            // 同一サーバー内、または相対パスにあるJSONを指定
            const response = await fetch('public/config/inputData.json'); 
            
            if (!response.ok) {
                throw new Error(`HTTPエラー! ステータス: ${response.status}`);
            }
            
            // JSONを解析してJavaScriptの辞書型に変換
            const inputData = await response.json();
            console.log("入力データの読み込みに成功しました", inputData);
            return inputData;
        } catch (error) {
            console.error("入力データの読み込みに失敗しました:", error);
            return null;
        }
    }

    static async initialize() {
        const inputData = await this.loadInputData();
        if (!inputData) {
            console.error("入力データがnullになっています！")
            return;
        }
        config.setInputData(inputData);
    }

    /**
     * 様々な入力イベント（キー、クリック、タップ、ヘッドポーズ）を抽象化し、
     * 指定されたマップとアクションに対応する値を抽出してコールバック関数を実行します。
     */
    static onInput({
        callback,
        map,
        action,
        event
    }: {
        /**実行したい関数 */
        callback: (type: string, value: any) => void;
        /**マップ（playerなど） */
        map: string;
        /**アクション（moveなど） */
        action: string;
        /**キー、クリック、タップの共通イベントハンドラー */
        event: KeyboardEvent | FederatedPointerEvent;
    }) {
        let inputValue = null;
        let inputType = null;;

        const getInput = (map: string, action: string, event: KeyboardEvent | FederatedPointerEvent): {type: string, value: any} | null => {
            let value = null;
            
            if (event instanceof KeyboardEvent) {
                value = this.onKey({map: map, action: action, event: event});
                return { type: InputType.KEYBOARD, value: value };
            }

            if (event.pointerType === 'mouse') {
                value = this.onClick({map: map, action: action, event: event});
                return { type: InputType.CLICK, value: value };
            }
            
            if (event.pointerType === 'touch') {
                value = this.onTap({map: map, action: action, event: event});
                return { type: InputType.TAP, value: value };
            }

            value = this.onHeadPose({map: map, action: action, event: event});
            if (value) return { type: InputType.HEAD_POSE, value: value };

            return null;
        }

        const result = getInput(map, action, event);

        if (!result || !result.value) return;

        inputValue = result.value;
        inputType = result.type;

        if (typeof callback === 'function') {
            callback(inputType, inputValue);
        } else {
            console.error("InputHandler.onInput: callbackは関数ではありません！：", callback);
        }
    }

    static onKey({
        map,
        action,
        event
    }: {
        /**マップ（playerなど） */
        map: string;
        /**アクション（moveなど） */
        action: string;
        /**キーイベント */
        event: KeyboardEvent;
    }): {x: number, y: number} | boolean | null {
        const inputData = config.getInputData();
        const typeList = ["keydown", "keyup", "keypress"];
        if (!typeList.includes(event.type)) return null;
        if (!inputData?.[map]?.[action]?.[InputType.KEYBOARD]?.[event.key]) return null;

        return inputData[map][action][InputType.KEYBOARD][event.key];
    }

    static onClick({
        map,
        action,
        event
    }: {
        /**マップ（playerなど） */
        map: string;
        /**アクション（moveなど） */
        action: string;
        /**Pixi.jsのクリック/タップイベントハンドラー */
        event: FederatedPointerEvent;
    }): {x: number, y: number} | null {
        const inputData = config.getInputData();
        const typeList = ["pointerdown", "click"];
        if (!typeList.includes(event.type)) return null;
        if (!inputData?.[map]?.[action]?.[InputType.CLICK]) return null;

        const globalX = event.global.x;
        const globalY = event.global.y;

        return { x: globalX, y: globalY };
    }

    static onTap({
        map,
        action,
        event
    }: {
        /**マップ（playerなど） */
        map: string;
        /**アクション（moveなど） */
        action: string;
        /**Pixi.jsのクリック/タップイベントハンドラー */
        event: FederatedPointerEvent;
    }): {x: number, y: number} | null {
        const inputData = config.getInputData();
        const typeList = ["pointerdown", "touchstart", "touchend"];
        if (!typeList.includes(event.type)) return null;
        if (!inputData?.[map]?.[action]?.[InputType.TAP]) return null;

        const globalX = event.global.x;
        const globalY = event.global.y;

        return { x: globalX, y: globalY };
    }

    //不十分なので要改善
    static onHeadPose({
        map,
        action,
        event
    }: {
        /**マップ（playerなど） */
        map: string;
        /**アクション（moveなど） */
        action: string;
        /**Pixi.jsのクリック/タップイベントハンドラー */
        event: FederatedPointerEvent;
    }): {x: number, y: number} | null {
        const inputData = config.getInputData();
        const typeList = ["headpose"];
        if (!typeList.includes(event.type)) return null;
        if (!inputData?.[map]?.[action]?.[InputType.HEAD_POSE]) return null;

        return {x: event.x, y: event.y};
    }
}
