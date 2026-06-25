import Song from "@/core/song";
import {RippleConfig} from "@/filters/rippleFilter";
import {SongConfig} from "@/core/textAliveManager";

export const DEBUG_MODE = false;     //デバッグモードのフラグ
export const API_TOKEN = "iBZ37bwJzLRukDAv";

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

//水中の歪み
export const FILTER_COUNT = 3; // 設定するフィルターの数 0~3
export const NOISE_MIN_SPEED = 2; // フィルター用画像の最低スクロール速度
export const NOISE_MAX_SPEED = 4; // フィルター用画像の最大スクロール速度
export const NOISE_SCALE = 40; // フィルターのスケール（大きいほど強いフィルターがかかる）

//水面シェーダー
export const MAX_RIPPLE_COUNT = 16; //同時に存在できる最大波紋数
export const MAX_RIPPLE_TIME = 4; //波紋の滞在時間（秒）
export const RIPPLE_DATA: RippleConfig = {
    amplitude: 13,
    wavelength: 0.05,
    speed: 13.0,
    radius: 0.4
}

//曲選択画面
export const BUBBLE_RADIUS = 250; // 泡の半径
export const NAME_SIZE = 40; // 曲名のテキストサイズ
export const ARTIST_SIZE = 30; // 作曲者名のテキストサイズ
export const SONGSELECT_FADEIN_TIME = 1;
export const SONGSELECT_FADEOUT_TIME = 4;
export const SAMPLE_TIME = 10;
export const VOLUME_FADE_TIME = 5;

//メイン画面
export const MAIN_FADEIN_TIME = 2;
export const DROP_DELAY_MS = 743;
export const LYRIC_EXPLODE_TIME = 1;
export const LYRIC_FAIL_TIME = 1;
export const LYRIC_WAIT_TIME = 2;
export const LYRIC_COMPLETE_TIME = 1;
export const LYRIC_SIZE = 50;
export const LYRIC_FONT = ['Helvetica', 'Arial', 'sans-serif'];
export const WORD_OFFSET_MIN = -20;
export const WORD_OFFSET_MAX = 20;
export const ROTATION_MIN = -30;
export const ROTATION_MAX = 30;
export const SHAKE_MAX_AMOUNT = 40;

//素材ファイル名
export const TEX_BUBBLE = "temp_bubble_01.png";
export const BG_SEABED = "temp_bg_seabed.jpg";
export const BG_LAKE = "bg_lake.png";
export const BG_SEABED_TOP = "bg_seabed_top.jpg";
export const CH_ILLUSTRATION = "ch_illustration.jpg";

//曲リスト
export const SONG_LIST: SongConfig[] = [
    {
        name: "こたえて",
        artist: "imie",
        url: "https://piapro.jp/t/6W2N/20251215164617",
        video: {
          // 音楽地図訂正履歴
          beatId: 4827293,
          chordId: 2963754,
          repetitiveSegmentId: 3086261,
      
          // 歌詞URL: https://piapro.jp/t/9o24
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2F6W2N%2F20251215164617
          lyricId: 126519,
          lyricDiffId: 28645
        },
        font: {path: "DotGothic16-Regular.ttf", name: "DotGothic16"},
    },
    {
        name: "アフター・ザ・カーテン",
        artist: "Rulmry",
        url: "https://piapro.jp/t/zoqO/20251214200738",
        video: {
          // 音楽地図訂正履歴
          beatId: 4827294,
          chordId: 2963755,
          repetitiveSegmentId: 3086262,
      
          // 歌詞URL: https://piapro.jp/t/EVO2
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FzoqO%2F20251214200738
          lyricId: 126591,
          lyricDiffId: 28627
        },
        font: {path: "DotGothic16-Regular.ttf", name: "DotGothic16"},
    },
    {
        name: "シャッターチャンス",
        artist: "夜未アガリ",
        url: "https://piapro.jp/t/PNpQ/20251209170719",
        video: {
          // 音楽地図訂正履歴
          beatId: 4827295,
          chordId: 2963756,
          repetitiveSegmentId: 3086263,
      
          // 歌詞URL: https://piapro.jp/t/wyWv
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FPNpQ%2F20251209170719
          lyricId: 126542,
          lyricDiffId: 28628
        },
        font: {path: "DotGothic16-Regular.ttf", name: "DotGothic16"},
    },
    {
        name: "世界最後の音楽隊",
        artist: "夏山よつぎ×ど～ぱみん",
        url: "https://piapro.jp/t/B3yJ/20251215061727",
        video: {
          // 音楽地図訂正履歴
          beatId: 4827296,
          chordId: 2963757,
          repetitiveSegmentId: 3086264,
      
          // 歌詞URL: https://piapro.jp/t/9U-6
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FB3yJ%2F20251215061727
          lyricId: 126594,
          lyricDiffId: 28629
        },
        font: {path: "DotGothic16-Regular.ttf", name: "DotGothic16"},
    },
    {
        name: "トリツクロジー",
        artist: "鶴三",
        url: "https://piapro.jp/t/QBdL/20251215094303",
        video: {
          // 音楽地図訂正履歴
          beatId: 4827297,
          chordId: 2963758,
          repetitiveSegmentId: 3086265,
      
          // 歌詞URL: https://piapro.jp/t/Nixq
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FQBdL%2F20251215094303
          lyricId: 126593,
          lyricDiffId: 28630
        },
        font: {path: "DotGothic16-Regular.ttf", name: "DotGothic16"},
    },
    {
        name: "TAKEOVER",
        artist: "Twinfield",
        url: "https://piapro.jp/t/E2i3/20251215092113",
        video: {
          // 音楽地図訂正履歴
          beatId: 4827298,
          chordId: 2963759,
          repetitiveSegmentId: 3086266,
      
          // 歌詞URL: https://piapro.jp/t/zxWP
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FE2i3%2F20251215092113
          lyricId: 126533,
          lyricDiffId: 28631
        },
        font: {path: "DotGothic16-Regular.ttf", name: "DotGothic16"},
    }
];

export let inputData: Record<string, any> | null = null;
/**インプットデータの基本構造（文字列キーの多層辞書） */
export function setInputData(data: Record<string, any>) {
    inputData = data;
}
export function getInputData() {
    return inputData;
}