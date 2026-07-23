import { useState, useMemo, useRef, Fragment, useEffect, Component } from 'react';
import {
  Landmark, UtensilsCrossed, BedDouble, Store, Check, Star,
  Footprints, Bus, Car, Clock, RotateCcw, Map as MapIcon, LayoutGrid, Flag, Compass, Navigation, Route,
  Save, Share2, Download, Upload, X, Trash2, ExternalLink,
  Calendar,
  ChevronRight, ChevronLeft, Plane, Ship,
} from 'lucide-react';

/* ---------------------------------------------------------
   DEMO DATA — Isahaya City (placeholder spots: A–H)
--------------------------------------------------------- */

const VIEW_W = 84.2;
const VIEW_H = 71.9;

// 保存・共有するプランデータのフォーマットバージョンとブラウザ保存用のキー名
const PLAN_FORMAT_VERSION = 1;
const SAVED_PLANS_STORAGE_KEY = 'mairu_saved_plans_v1';

// price/durationのレンジ文字列("500〜1000"等、スプレッドシートの生の値)を、カンマ区切りの表示用文字列に変換する。
// レンジでない単一の値の場合はnullを返す(呼び出し側で従来通りのtoLocaleString()表示にフォールバックさせるため)
function formatPriceRangeText(rangeText) {
  if (!rangeText) return null;
  const str = String(rangeText);
  if (!str.includes('〜')) return null;
  const [minPart, maxPart] = str.split('〜');
  const min = minPart.trim() ? Number(minPart.trim()).toLocaleString() : '';
  const max = maxPart.trim() ? Number(maxPart.trim()).toLocaleString() : '';
  return `${min}〜${max}`;
}

// 諫早市の輪郭(長崎県ページのMUNICIPALITIES内の諫早市ローポリ形状を拡大・中央配置したもの。直線のみ)。選択画面・ルート画面・TOPページ演出で共用。

// 諫早市に隣接する市町村の輪郭(長崎県ページと同じ座標変換を適用し、諫早市の輪郭と同じ座標系に揃えたもの)。
// 灰色の線のみで表示し、諫早市ページの枠からはみ出す部分は自動的に切り取られる(表示できる範囲だけ見える)。

// 隣接市町村どうしの境界線。各市町村の輪郭線自体に境界の縁取りが含まれるため、現在は未使用。

// 諫早市の天気予報取得用の代表地点(諫早駅の緯度経度をそのまま使用)

// 南島原市:諫早市と同じ「九州全体マップと同じ正確な図法」を使い、専用の切り出し範囲を用意。
// 実データ(MINAMISHIMABARA_SPOTS_DATA_URL)が用意され次第、諫早市と同じ仕組みで表示できる。
const MINAMISHIMABARA_CROP = { x: 373.9, y: 484.5 };
const MINAMISHIMABARA_VIEW_W = 67.8;
const MINAMISHIMABARA_VIEW_H = 55.4;
const MINAMISHIMABARA_SPOTS_DATA_URL = '/data/南島原市.json';


// 島原市:諫早市・南島原市と同じ「九州全体マップと同じ正確な図法」を使い、専用の切り出し範囲を用意。
const SHIMABARA_CROP = { x: 407.7, y: 458.2 };
const SHIMABARA_VIEW_W = 32.1;
const SHIMABARA_VIEW_H = 42.3;
const SHIMABARA_SPOTS_DATA_URL = '/data/島原市.json';


// 長崎県の残り18市町村:諫早市と同じ「九州全体マップと同じ正確な図法」から専用の切り出し範囲だけを用意。
// 輪郭・周辺市町村はKYUSHU_MUNICIPALITIESを直接参照するため、ここでは切り出し範囲とデータURLだけを持つ。
const NAGASAKI_CITY_CROP = { x: 243.4, y: 421.6 };
const NAGASAKI_CITY_VIEW_W = 125.1;
const NAGASAKI_CITY_VIEW_H = 137.1;
const NAGASAKI_CITY_SPOTS_DATA_URL = '/data/長崎市.json';
const SASEBO_CROP = { x: 126.7, y: 317.3 };
const SASEBO_VIEW_W = 226.4;
const SASEBO_VIEW_H = 125.8;
const SASEBO_SPOTS_DATA_URL = '/data/佐世保市.json';
const OMURA_CROP = { x: 327.2, y: 422.5 };
const OMURA_VIEW_W = 51.6;
const OMURA_VIEW_H = 52.3;
const OMURA_SPOTS_DATA_URL = '/data/大村市.json';
const HIRADO_CROP = { x: 195.3, y: 259.3 };
const HIRADO_VIEW_W = 97.1;
const HIRADO_VIEW_H = 144.3;
const HIRADO_SPOTS_DATA_URL = '/data/平戸市.json';
const MATSUURA_CROP = { x: 267.8, y: 303.6 };
const MATSUURA_VIEW_W = 64.1;
const MATSUURA_VIEW_H = 65.8;
const MATSUURA_SPOTS_DATA_URL = '/data/松浦市.json';
const TSUSHIMA_CROP = { x: 152.4, y: -23.5 };
const TSUSHIMA_VIEW_W = 117.8;
const TSUSHIMA_VIEW_H = 204.0;
const TSUSHIMA_SPOTS_DATA_URL = '/data/対馬市.json';
const IKI_CROP = { x: 267.8, y: 204.2 };
const IKI_VIEW_W = 49.8;
const IKI_VIEW_H = 54.5;
const IKI_SPOTS_DATA_URL = '/data/壱岐市.json';
const GOTO_CROP = { x: -34.2, y: 421.2 };
const GOTO_VIEW_W = 210.4;
const GOTO_VIEW_H = 296.9;
const GOTO_SPOTS_DATA_URL = '/data/五島市.json';
const SAIKAI_CROP = { x: 168.7, y: 385.3 };
const SAIKAI_VIEW_W = 167.2;
const SAIKAI_VIEW_H = 89.8;
const SAIKAI_SPOTS_DATA_URL = '/data/西海市.json';
const UNZEN_CROP = { x: 372.9, y: 450.9 };
const UNZEN_VIEW_W = 58.2;
const UNZEN_VIEW_H = 73.8;
const UNZEN_SPOTS_DATA_URL = '/data/雲仙市.json';
const NAGAYO_CROP = { x: 318.1, y: 456.0 };
const NAGAYO_VIEW_W = 23.0;
const NAGAYO_VIEW_H = 27.8;
const NAGAYO_SPOTS_DATA_URL = '/data/長与町.json';
const TOGITSU_CROP = { x: 307.1, y: 458.9 };
const TOGITSU_VIEW_W = 21.3;
const TOGITSU_VIEW_H = 20.3;
const TOGITSU_SPOTS_DATA_URL = '/data/時津町.json';
const HIGASHISONOGI_CROP = { x: 322.5, y: 401.5 };
const HIGASHISONOGI_VIEW_W = 46.1;
const HIGASHISONOGI_VIEW_H = 37.7;
const HIGASHISONOGI_SPOTS_DATA_URL = '/data/東彼杵町.json';
const KAWATANA_CROP = { x: 308.2, y: 398.1 };
const KAWATANA_VIEW_W = 33.9;
const KAWATANA_VIEW_H = 26.2;
const KAWATANA_SPOTS_DATA_URL = '/data/川棚町.json';
const HASAMI_CROP = { x: 317.7, y: 384.4 };
const HASAMI_VIEW_W = 30.7;
const HASAMI_VIEW_H = 23.4;
const HASAMI_SPOTS_DATA_URL = '/data/波佐見町.json';
const OJIKA_CROP = { x: 110.1, y: 364.2 };
const OJIKA_VIEW_W = 68.9;
const OJIKA_VIEW_H = 34.8;
const OJIKA_SPOTS_DATA_URL = '/data/小値賀町.json';
const SASA_CROP = { x: 270.8, y: 356.7 };
const SASA_VIEW_W = 19.9;
const SASA_VIEW_H = 23.3;
const SASA_SPOTS_DATA_URL = '/data/佐々町.json';
const SHINKAMIGOTO_CROP = { x: 112.3, y: 375.1 };
const SHINKAMIGOTO_VIEW_W = 83.2;
const SHINKAMIGOTO_VIEW_H = 113.8;
const SHINKAMIGOTO_SPOTS_DATA_URL = '/data/新上五島町.json';

// 佐賀県20市町村:諫早市などと同じ「九州全体マップと同じ正確な図法」から専用の切り出し範囲だけを用意。
const SAGA_CITY_CROP = { x: 371.6, y: 295.6 };
const SAGA_CITY_VIEW_W = 76.6;
const SAGA_CITY_VIEW_H = 111.5;
const SAGA_CITY_SPOTS_DATA_URL = '/data/佐賀市.json';
const KARATSU_CROP = { x: 284.8, y: 260.4 };
const KARATSU_VIEW_W = 119.5;
const KARATSU_VIEW_H = 113.1;
const KARATSU_SPOTS_DATA_URL = '/data/唐津市.json';
const TOSU_CROP = { x: 444.1, y: 318.1 };
const TOSU_VIEW_W = 29.9;
const TOSU_VIEW_H = 33.5;
const TOSU_SPOTS_DATA_URL = '/data/鳥栖市.json';
const TAKU_CROP = { x: 355.1, y: 339.1 };
const TAKU_VIEW_W = 43.2;
const TAKU_VIEW_H = 36.5;
const TAKU_SPOTS_DATA_URL = '/data/多久市.json';
const IMARI_CROP = { x: 294.1, y: 317.4 };
const IMARI_VIEW_W = 74.1;
const IMARI_VIEW_H = 64.4;
const IMARI_SPOTS_DATA_URL = '/data/伊万里市.json';
const TAKEO_CROP = { x: 325.6, y: 351.8 };
const TAKEO_VIEW_W = 57.3;
const TAKEO_VIEW_H = 56.7;
const TAKEO_SPOTS_DATA_URL = '/data/武雄市.json';
const KASHIMA_CROP = { x: 356.8, y: 391.1 };
const KASHIMA_VIEW_W = 39.2;
const KASHIMA_VIEW_H = 47.5;
const KASHIMA_SPOTS_DATA_URL = '/data/鹿島市.json';
const OGI_CROP = { x: 378.1, y: 338.3 };
const OGI_VIEW_W = 34.0;
const OGI_VIEW_H = 48.3;
const OGI_SPOTS_DATA_URL = '/data/小城市.json';
const URESHINO_CROP = { x: 331.3, y: 380.0 };
const URESHINO_VIEW_W = 48.1;
const URESHINO_VIEW_H = 54.9;
const URESHINO_SPOTS_DATA_URL = '/data/嬉野市.json';
const KANZAKI_CROP = { x: 405.0, y: 309.9 };
const KANZAKI_VIEW_W = 46.6;
const KANZAKI_VIEW_H = 66.8;
const KANZAKI_SPOTS_DATA_URL = '/data/神埼市.json';
const YOSHINOGARI_CROP = { x: 426.9, y: 316.8 };
const YOSHINOGARI_VIEW_W = 22.5;
const YOSHINOGARI_VIEW_H = 47.0;
const YOSHINOGARI_SPOTS_DATA_URL = '/data/吉野ヶ里町.json';
const KIYAMA_CROP = { x: 450.5, y: 314.1 };
const KIYAMA_VIEW_W = 22.1;
const KIYAMA_VIEW_H = 18.9;
const KIYAMA_SPOTS_DATA_URL = '/data/基山町.json';
const KAMIMINE_CROP = { x: 437.2, y: 325.5 };
const KAMIMINE_VIEW_W = 14.7;
const KAMIMINE_VIEW_H = 33.3;
const KAMIMINE_SPOTS_DATA_URL = '/data/上峰町.json';
const MIYAKI_CROP = { x: 434.9, y: 323.6 };
const MIYAKI_VIEW_W = 29.1;
const MIYAKI_VIEW_H = 44.7;
const MIYAKI_SPOTS_DATA_URL = '/data/みやき町.json';
const GENKAI_CROP = { x: 314.5, y: 295.5 };
const GENKAI_VIEW_W = 22.6;
const GENKAI_VIEW_H = 28.5;
const GENKAI_SPOTS_DATA_URL = '/data/玄海町.json';
const ARITA_CROP = { x: 308.7, y: 364.6 };
const ARITA_VIEW_W = 36.6;
const ARITA_VIEW_H = 29.9;
const ARITA_SPOTS_DATA_URL = '/data/有田町.json';
const OMACHI_CROP = { x: 372.5, y: 367.8 };
const OMACHI_VIEW_W = 12.7;
const OMACHI_VIEW_H = 14.1;
const OMACHI_SPOTS_DATA_URL = '/data/大町町.json';
const KOHOKU_CROP = { x: 378.6, y: 363.7 };
const KOHOKU_VIEW_W = 20.7;
const KOHOKU_VIEW_H = 20.8;
const KOHOKU_SPOTS_DATA_URL = '/data/江北町.json';
const SHIROISHI_CROP = { x: 364.1, y: 371.9 };
const SHIROISHI_VIEW_W = 44.7;
const SHIROISHI_VIEW_H = 34.5;
const SHIROISHI_SPOTS_DATA_URL = '/data/白石町.json';
const TARA_CROP = { x: 365.7, y: 412.0 };
const TARA_VIEW_W = 41.2;
const TARA_VIEW_H = 34.3;
const TARA_SPOTS_DATA_URL = '/data/太良町.json';

// 福岡県60市町村:諫早市などと同じ「九州全体マップと同じ正確な図法」から専用の切り出し範囲だけを用意。
const KITAKYUSHU_CROP = { x: 486.4, y: 161.5 };
const KITAKYUSHU_VIEW_W = 101.7;
const KITAKYUSHU_VIEW_H = 98.4;
const KITAKYUSHU_SPOTS_DATA_URL = '/data/北九州市.json';
const FUKUOKA_CITY_CROP = { x: 344.3, y: 192.8 };
const FUKUOKA_CITY_VIEW_W = 132.6;
const FUKUOKA_CITY_VIEW_H = 146.8;
const FUKUOKA_CITY_SPOTS_DATA_URL = '/data/福岡市.json';
const OMUTA_CROP = { x: 434.4, y: 400.2 };
const OMUTA_VIEW_W = 40.5;
const OMUTA_VIEW_H = 34.0;
const OMUTA_SPOTS_DATA_URL = '/data/大牟田市.json';
const KURUME_CROP = { x: 425.5, y: 326.1 };
const KURUME_VIEW_W = 96.4;
const KURUME_VIEW_H = 58.2;
const KURUME_SPOTS_DATA_URL = '/data/久留米市.json';
const NOGATA_CROP = { x: 495.7, y: 225.4 };
const NOGATA_VIEW_W = 34.5;
const NOGATA_VIEW_H = 31.7;
const NOGATA_SPOTS_DATA_URL = '/data/直方市.json';
const IIZUKA_CROP = { x: 465.9, y: 244.2 };
const IIZUKA_VIEW_W = 61.8;
const IIZUKA_VIEW_H = 66.3;
const IIZUKA_SPOTS_DATA_URL = '/data/飯塚市.json';
const TAGAWA_CROP = { x: 509.9, y: 249.5 };
const TAGAWA_VIEW_W = 30.1;
const TAGAWA_VIEW_H = 42.0;
const TAGAWA_SPOTS_DATA_URL = '/data/田川市.json';
const YANAGAWA_CROP = { x: 425.4, y: 376.6 };
const YANAGAWA_VIEW_W = 34.6;
const YANAGAWA_VIEW_H = 35.3;
const YANAGAWA_SPOTS_DATA_URL = '/data/柳川市.json';
const YAME_CROP = { x: 453.0, y: 340.7 };
const YAME_VIEW_W = 102.9;
const YAME_VIEW_H = 74.5;
const YAME_SPOTS_DATA_URL = '/data/八女市.json';
const CHIKUGO_CROP = { x: 447.7, y: 362.7 };
const CHIKUGO_VIEW_W = 24.3;
const CHIKUGO_VIEW_H = 27.0;
const CHIKUGO_SPOTS_DATA_URL = '/data/筑後市.json';
const OKAWA_CROP = { x: 424.3, y: 365.4 };
const OKAWA_VIEW_W = 23.3;
const OKAWA_VIEW_H = 24.0;
const OKAWA_SPOTS_DATA_URL = '/data/大川市.json';
const YUKUHASHI_CROP = { x: 540.6, y: 235.3 };
const YUKUHASHI_VIEW_W = 42.1;
const YUKUHASHI_VIEW_H = 30.1;
const YUKUHASHI_SPOTS_DATA_URL = '/data/行橋市.json';
const BUZEN_CROP = { x: 560.3, y: 264.3 };
const BUZEN_VIEW_W = 49.0;
const BUZEN_VIEW_H = 43.1;
const BUZEN_SPOTS_DATA_URL = '/data/豊前市.json';
const NAKAMA_CROP = { x: 495.1, y: 215.5 };
const NAKAMA_VIEW_W = 20.4;
const NAKAMA_VIEW_H = 14.9;
const NAKAMA_SPOTS_DATA_URL = '/data/中間市.json';
const OGORI_CROP = { x: 464.8, y: 312.4 };
const OGORI_VIEW_W = 23.8;
const OGORI_VIEW_H = 35.0;
const OGORI_SPOTS_DATA_URL = '/data/小郡市.json';
const CHIKUSHINO_CROP = { x: 446.8, y: 284.8 };
const CHIKUSHINO_VIEW_W = 45.6;
const CHIKUSHINO_VIEW_H = 42.3;
const CHIKUSHINO_SPOTS_DATA_URL = '/data/筑紫野市.json';
const KASUGA_CROP = { x: 445.1, y: 289.6 };
const KASUGA_VIEW_W = 13.0;
const KASUGA_VIEW_H = 16.4;
const KASUGA_SPOTS_DATA_URL = '/data/春日市.json';
const ONOJO_CROP = { x: 446.9, y: 284.9 };
const ONOJO_VIEW_W = 20.9;
const ONOJO_VIEW_H = 31.4;
const ONOJO_SPOTS_DATA_URL = '/data/大野城市.json';
const MUNAKATA_CROP = { x: 356.4, y: 96.4 };
const MUNAKATA_VIEW_W = 153.5;
const MUNAKATA_VIEW_H = 163.3;
const MUNAKATA_SPOTS_DATA_URL = '/data/宗像市.json';
const DAZAIFU_CROP = { x: 454.3, y: 286.4 };
const DAZAIFU_VIEW_W = 25.5;
const DAZAIFU_VIEW_H = 28.1;
const DAZAIFU_SPOTS_DATA_URL = '/data/太宰府市.json';
const KOGA_CROP = { x: 446.2, y: 236.4 };
const KOGA_VIEW_W = 31.0;
const KOGA_VIEW_H = 23.9;
const KOGA_SPOTS_DATA_URL = '/data/古賀市.json';
const FUKUTSU_CROP = { x: 444.6, y: 211.1 };
const FUKUTSU_VIEW_W = 32.8;
const FUKUTSU_VIEW_H = 39.3;
const FUKUTSU_SPOTS_DATA_URL = '/data/福津市.json';
const UKIHA_CROP = { x: 503.0, y: 330.9 };
const UKIHA_VIEW_W = 41.6;
const UKIHA_VIEW_H = 39.7;
const UKIHA_SPOTS_DATA_URL = '/data/うきは市.json';
const MIYAWAKA_CROP = { x: 464.2, y: 225.0 };
const MIYAWAKA_VIEW_W = 48.5;
const MIYAWAKA_VIEW_H = 49.9;
const MIYAWAKA_SPOTS_DATA_URL = '/data/宮若市.json';
const KAMA_CROP = { x: 490.1, y: 267.0 };
const KAMA_VIEW_W = 44.7;
const KAMA_VIEW_H = 49.9;
const KAMA_SPOTS_DATA_URL = '/data/嘉麻市.json';
const ASAKURA_CROP = { x: 478.1, y: 296.4 };
const ASAKURA_VIEW_W = 68.2;
const ASAKURA_VIEW_H = 54.6;
const ASAKURA_SPOTS_DATA_URL = '/data/朝倉市.json';
const MIYAMA_CROP = { x: 437.3, y: 378.2 };
const MIYAMA_VIEW_W = 42.8;
const MIYAMA_VIEW_H = 38.2;
const MIYAMA_SPOTS_DATA_URL = '/data/みやま市.json';
const ITOSHIMA_CROP = { x: 354.9, y: 260.6 };
const ITOSHIMA_VIEW_W = 69.8;
const ITOSHIMA_VIEW_H = 59.6;
const ITOSHIMA_SPOTS_DATA_URL = '/data/糸島市.json';
const NAKAGAWA_CROP = { x: 428.6, y: 291.2 };
const NAKAGAWA_VIEW_W = 30.3;
const NAKAGAWA_VIEW_H = 43.1;
const NAKAGAWA_SPOTS_DATA_URL = '/data/那珂川市.json';
const UMI_CROP = { x: 454.9, y: 277.2 };
const UMI_VIEW_W = 27.4;
const UMI_VIEW_H = 22.3;
const UMI_SPOTS_DATA_URL = '/data/宇美町.json';
const SASAGURI_CROP = { x: 457.5, y: 258.9 };
const SASAGURI_VIEW_W = 27.6;
const SASAGURI_VIEW_H = 24.1;
const SASAGURI_SPOTS_DATA_URL = '/data/篠栗町.json';
const SHIME_CROP = { x: 446.9, y: 274.4 };
const SHIME_VIEW_W = 15.9;
const SHIME_VIEW_H = 16.1;
const SHIME_SPOTS_DATA_URL = '/data/志免町.json';
const SUE_CROP = { x: 456.3, y: 272.5 };
const SUE_VIEW_W = 20.6;
const SUE_VIEW_H = 14.5;
const SUE_SPOTS_DATA_URL = '/data/須恵町.json';
const SHINGU_CROP = { x: 427.1, y: 232.0 };
const SHINGU_VIEW_W = 40.5;
const SHINGU_VIEW_H = 32.7;
const SHINGU_SPOTS_DATA_URL = '/data/新宮町.json';
const HISAYAMA_CROP = { x: 451.5, y: 248.0 };
const HISAYAMA_VIEW_W = 25.9;
const HISAYAMA_VIEW_H = 25.0;
const HISAYAMA_SPOTS_DATA_URL = '/data/久山町.json';
const KASUYA_CROP = { x: 446.7, y: 267.4 };
const KASUYA_VIEW_W = 16.2;
const KASUYA_VIEW_H = 14.9;
const KASUYA_SPOTS_DATA_URL = '/data/粕屋町.json';
const ASHIYA_CROP = { x: 488.2, y: 196.6 };
const ASHIYA_VIEW_W = 14.5;
const ASHIYA_VIEW_H = 16.6;
const ASHIYA_SPOTS_DATA_URL = '/data/芦屋町.json';
const MIZUMAKI_CROP = { x: 496.6, y: 203.3 };
const MIZUMAKI_VIEW_W = 13.5;
const MIZUMAKI_VIEW_H = 19.7;
const MIZUMAKI_SPOTS_DATA_URL = '/data/水巻町.json';
const OKAGAKI_CROP = { x: 466.8, y: 202.2 };
const OKAGAKI_VIEW_W = 30.6;
const OKAGAKI_VIEW_H = 26.5;
const OKAGAKI_SPOTS_DATA_URL = '/data/岡垣町.json';
const ONGA_CROP = { x: 487.2, y: 202.5 };
const ONGA_VIEW_W = 17.9;
const ONGA_VIEW_H = 26.4;
const ONGA_SPOTS_DATA_URL = '/data/遠賀町.json';
const KOTAKE_CROP = { x: 495.9, y: 243.5 };
const KOTAKE_VIEW_W = 15.7;
const KOTAKE_VIEW_H = 16.1;
const KOTAKE_SPOTS_DATA_URL = '/data/小竹町.json';
const KURATE_CROP = { x: 487.2, y: 220.4 };
const KURATE_VIEW_W = 21.2;
const KURATE_VIEW_H = 25.9;
const KURATE_SPOTS_DATA_URL = '/data/鞍手町.json';
const KEISEN_CROP = { x: 490.3, y: 275.9 };
const KEISEN_VIEW_W = 17.1;
const KEISEN_VIEW_H = 23.3;
const KEISEN_SPOTS_DATA_URL = '/data/桂川町.json';
const CHIKUZEN_CROP = { x: 470.4, y: 297.1 };
const CHIKUZEN_VIEW_W = 30.8;
const CHIKUZEN_VIEW_H = 34.7;
const CHIKUZEN_SPOTS_DATA_URL = '/data/筑前町.json';
const TOHO_CROP = { x: 514.4, y: 302.2 };
const TOHO_VIEW_W = 36.7;
const TOHO_VIEW_H = 37.9;
const TOHO_SPOTS_DATA_URL = '/data/東峰村.json';
const TACHIARAI_CROP = { x: 475.1, y: 323.0 };
const TACHIARAI_VIEW_W = 24.6;
const TACHIARAI_VIEW_H = 20.6;
const TACHIARAI_SPOTS_DATA_URL = '/data/大刀洗町.json';
const OKI_CROP = { x: 440.0, y: 365.5 };
const OKI_VIEW_W = 15.8;
const OKI_VIEW_H = 20.9;
const OKI_SPOTS_DATA_URL = '/data/大木町.json';
const HIROKAWA_CROP = { x: 459.1, y: 353.7 };
const HIROKAWA_VIEW_W = 33.8;
const HIROKAWA_VIEW_H = 21.6;
const HIROKAWA_SPOTS_DATA_URL = '/data/広川町.json';
const KAWARA_CROP = { x: 526.4, y: 240.9 };
const KAWARA_VIEW_W = 21.9;
const KAWARA_VIEW_H = 31.3;
const KAWARA_SPOTS_DATA_URL = '/data/香春町.json';
const SOEDA_CROP = { x: 522.1, y: 275.6 };
const SOEDA_VIEW_W = 40.6;
const SOEDA_VIEW_H = 46.8;
const SOEDA_SPOTS_DATA_URL = '/data/添田町.json';
const ITODA_CROP = { x: 513.6, y: 259.4 };
const ITODA_VIEW_W = 11.4;
const ITODA_VIEW_H = 10.7;
const ITODA_SPOTS_DATA_URL = '/data/糸田町.json';
const KAWASAKI_TOWN_CROP = { x: 517.8, y: 268.6 };
const KAWASAKI_TOWN_VIEW_W = 20.6;
const KAWASAKI_TOWN_VIEW_H = 37.1;
const KAWASAKI_TOWN_SPOTS_DATA_URL = '/data/川崎町.json';
const OTO_CROP = { x: 529.8, y: 264.7 };
const OTO_VIEW_W = 12.5;
const OTO_VIEW_H = 21.1;
const OTO_SPOTS_DATA_URL = '/data/大任町.json';
const AKA_CROP = { x: 533.7, y: 262.6 };
const AKA_VIEW_W = 21.1;
const AKA_VIEW_H = 30.2;
const AKA_SPOTS_DATA_URL = '/data/赤村.json';
const FUKUCHI_CROP = { x: 510.3, y: 240.0 };
const FUKUCHI_VIEW_W = 24.3;
const FUKUCHI_VIEW_H = 25.5;
const FUKUCHI_SPOTS_DATA_URL = '/data/福智町.json';
const KANDA_CROP = { x: 544.6, y: 215.2 };
const KANDA_VIEW_W = 36.6;
const KANDA_VIEW_H = 33.6;
const KANDA_SPOTS_DATA_URL = '/data/苅田町.json';
const MIYAKO_CROP = { x: 530.2, y: 233.2 };
const MIYAKO_VIEW_W = 49.8;
const MIYAKO_VIEW_H = 83.3;
const MIYAKO_SPOTS_DATA_URL = '/data/みやこ町.json';
const YOSHITOMI_CROP = { x: 599.5, y: 272.1 };
const YOSHITOMI_VIEW_W = 9.4;
const YOSHITOMI_VIEW_H = 10.7;
const YOSHITOMI_SPOTS_DATA_URL = '/data/吉富町.json';
const KOGE_CROP = { x: 578.6, y: 275.2 };
const KOGE_VIEW_W = 34.2;
const KOGE_VIEW_H = 32.1;
const KOGE_SPOTS_DATA_URL = '/data/上毛町.json';
const CHIKUJO_CROP = { x: 553.0, y: 249.4 };
const CHIKUJO_VIEW_W = 40.5;
const CHIKUJO_VIEW_H = 59.3;
const CHIKUJO_SPOTS_DATA_URL = '/data/築上町.json';

// 大分県18市町村:諫早市などと同じ「九州全体マップと同じ正確な図法」から専用の切り出し範囲だけを用意。
const OITA_CITY_CROP = { x: 640.4, y: 342.0 };
const OITA_CITY_VIEW_W = 149.5;
const OITA_CITY_VIEW_H = 87.1;
const OITA_CITY_SPOTS_DATA_URL = '/data/大分市.json';
const BEPPU_CROP = { x: 644.1, y: 335.5 };
const BEPPU_VIEW_W = 40.3;
const BEPPU_VIEW_H = 42.7;
const BEPPU_SPOTS_DATA_URL = '/data/別府市.json';
const NAKATSU_CROP = { x: 541.0, y: 263.1 };
const NAKATSU_VIEW_W = 98.0;
const NAKATSU_VIEW_H = 90.2;
const NAKATSU_SPOTS_DATA_URL = '/data/中津市.json';
const HITA_CROP = { x: 514.5, y: 298.1 };
const HITA_VIEW_W = 89.3;
const HITA_VIEW_H = 141.8;
const HITA_SPOTS_DATA_URL = '/data/日田市.json';
const SAIKI_CROP = { x: 650.1, y: 392.4 };
const SAIKI_VIEW_W = 169.4;
const SAIKI_VIEW_H = 128.5;
const SAIKI_SPOTS_DATA_URL = '/data/佐伯市.json';
const USUKI_CROP = { x: 693.7, y: 368.0 };
const USUKI_VIEW_W = 78.8;
const USUKI_VIEW_H = 83.4;
const USUKI_SPOTS_DATA_URL = '/data/臼杵市.json';
const TSUKUMI_CROP = { x: 727.9, y: 379.0 };
const TSUKUMI_VIEW_W = 65.1;
const TSUKUMI_VIEW_H = 50.8;
const TSUKUMI_SPOTS_DATA_URL = '/data/津久見市.json';
const TAKETA_CROP = { x: 597.1, y: 379.1 };
const TAKETA_VIEW_W = 81.1;
const TAKETA_VIEW_H = 105.9;
const TAKETA_SPOTS_DATA_URL = '/data/竹田市.json';
const BUNGOTAKADA_CROP = { x: 648.5, y: 250.4 };
const BUNGOTAKADA_VIEW_W = 54.9;
const BUNGOTAKADA_VIEW_H = 67.4;
const BUNGOTAKADA_SPOTS_DATA_URL = '/data/豊後高田市.json';
const KITSUKI_CROP = { x: 644.9, y: 279.0 };
const KITSUKI_VIEW_W = 86.9;
const KITSUKI_VIEW_H = 70.7;
const KITSUKI_SPOTS_DATA_URL = '/data/杵築市.json';
const USA_CROP = { x: 603.9, y: 272.6 };
const USA_VIEW_W = 70.3;
const USA_VIEW_H = 89.2;
const USA_SPOTS_DATA_URL = '/data/宇佐市.json';
const BUNGOONO_CROP = { x: 630.4, y: 388.1 };
const BUNGOONO_VIEW_W = 94.6;
const BUNGOONO_VIEW_H = 102.7;
const BUNGOONO_SPOTS_DATA_URL = '/data/豊後大野市.json';
const YUFU_CROP = { x: 613.9, y: 338.4 };
const YUFU_VIEW_W = 79.5;
const YUFU_VIEW_H = 73.9;
const YUFU_SPOTS_DATA_URL = '/data/由布市.json';
const KUNISAKI_CROP = { x: 674.8, y: 245.8 };
const KUNISAKI_VIEW_W = 62.2;
const KUNISAKI_VIEW_H = 84.3;
const KUNISAKI_SPOTS_DATA_URL = '/data/国東市.json';
const HIMESHIMA_CROP = { x: 701.6, y: 241.9 };
const HIMESHIMA_VIEW_W = 15.9;
const HIMESHIMA_VIEW_H = 9.2;
const HIMESHIMA_SPOTS_DATA_URL = '/data/姫島村.json';
const HIJI_CROP = { x: 650.7, y: 315.6 };
const HIJI_VIEW_W = 55.8;
const HIJI_VIEW_H = 34.1;
const HIJI_SPOTS_DATA_URL = '/data/日出町.json';
const KOKONOE_CROP = { x: 583.2, y: 344.4 };
const KOKONOE_VIEW_W = 62.8;
const KOKONOE_VIEW_H = 75.3;
const KOKONOE_SPOTS_DATA_URL = '/data/九重町.json';
const KUSU_CROP = { x: 566.7, y: 322.4 };
const KUSU_VIEW_W = 81.9;
const KUSU_VIEW_H = 70.5;
const KUSU_SPOTS_DATA_URL = '/data/玖珠町.json';

// 熊本県45市町村:諫早市などと同じ「九州全体マップと同じ正確な図法」から専用の切り出し範囲だけを用意。
const KUMAMOTO_CITY_CROP = { x: 464.5, y: 423.4 };
const KUMAMOTO_CITY_VIEW_W = 78.9;
const KUMAMOTO_CITY_VIEW_H = 103.3;
const KUMAMOTO_CITY_SPOTS_DATA_URL = '/data/熊本市.json';
const YATSUSHIRO_CROP = { x: 451.8, y: 513.8 };
const YATSUSHIRO_VIEW_W = 137.4;
const YATSUSHIRO_VIEW_H = 97.6;
const YATSUSHIRO_SPOTS_DATA_URL = '/data/八代市.json';
const HITOYOSHI_CROP = { x: 486.0, y: 599.2 };
const HITOYOSHI_VIEW_W = 63.6;
const HITOYOSHI_VIEW_H = 65.6;
const HITOYOSHI_SPOTS_DATA_URL = '/data/人吉市.json';
const ARAO_CROP = { x: 439.0, y: 422.8 };
const ARAO_VIEW_W = 32.3;
const ARAO_VIEW_H = 26.4;
const ARAO_SPOTS_DATA_URL = '/data/荒尾市.json';
const MINAMATA_CROP = { x: 423.7, y: 613.6 };
const MINAMATA_VIEW_W = 65.7;
const MINAMATA_VIEW_H = 46.4;
const MINAMATA_SPOTS_DATA_URL = '/data/水俣市.json';
const TAMANA_CROP = { x: 450.3, y: 425.0 };
const TAMANA_VIEW_W = 44.6;
const TAMANA_VIEW_H = 50.1;
const TAMANA_SPOTS_DATA_URL = '/data/玉名市.json';
const YAMAGA_CROP = { x: 479.8, y: 377.4 };
const YAMAGA_VIEW_W = 64.3;
const YAMAGA_VIEW_H = 78.2;
const YAMAGA_SPOTS_DATA_URL = '/data/山鹿市.json';
const KIKUCHI_CROP = { x: 502.2, y: 397.9 };
const KIKUCHI_VIEW_W = 67.3;
const KIKUCHI_VIEW_H = 64.2;
const KIKUCHI_SPOTS_DATA_URL = '/data/菊池市.json';
const UTO_CROP = { x: 454.0, y: 493.7 };
const UTO_VIEW_W = 60.4;
const UTO_VIEW_H = 31.8;
const UTO_SPOTS_DATA_URL = '/data/宇土市.json';
const KAMIAMAKUSA_CROP = { x: 412.8, y: 514.0 };
const KAMIAMAKUSA_VIEW_W = 55.3;
const KAMIAMAKUSA_VIEW_H = 83.6;
const KAMIAMAKUSA_SPOTS_DATA_URL = '/data/上天草市.json';
const UKI_CROP = { x: 440.4, y: 499.2 };
const UKI_VIEW_W = 91.7;
const UKI_VIEW_H = 52.0;
const UKI_SPOTS_DATA_URL = '/data/宇城市.json';
const ASO_CROP = { x: 545.8, y: 408.1 };
const ASO_VIEW_W = 86.5;
const ASO_VIEW_H = 63.0;
const ASO_SPOTS_DATA_URL = '/data/阿蘇市.json';
const AMAKUSA_CROP = { x: 333.0, y: 528.4 };
const AMAKUSA_VIEW_W = 119.5;
const AMAKUSA_VIEW_H = 127.4;
const AMAKUSA_SPOTS_DATA_URL = '/data/天草市.json';
const KOSHI_CROP = { x: 504.1, y: 443.7 };
const KOSHI_VIEW_W = 35.3;
const KOSHI_VIEW_H = 26.7;
const KOSHI_SPOTS_DATA_URL = '/data/合志市.json';
const MISATO_CROP = { x: 513.8, y: 507.4 };
const MISATO_VIEW_W = 55.8;
const MISATO_VIEW_H = 39.1;
const MISATO_SPOTS_DATA_URL = '/data/美里町.json';
const GYOKUTO_CROP = { x: 480.7, y: 440.3 };
const GYOKUTO_VIEW_W = 16.1;
const GYOKUTO_VIEW_H = 27.4;
const GYOKUTO_SPOTS_DATA_URL = '/data/玉東町.json';
const NANKAN_CROP = { x: 456.3, y: 403.9 };
const NANKAN_VIEW_W = 29.7;
const NANKAN_VIEW_H = 32.3;
const NANKAN_SPOTS_DATA_URL = '/data/南関町.json';
const NAGASU_CROP = { x: 445.9, y: 439.9 };
const NAGASU_VIEW_W = 16.5;
const NAGASU_VIEW_H = 16.3;
const NAGASU_SPOTS_DATA_URL = '/data/長洲町.json';
const NAGOMI_CROP = { x: 467.8, y: 393.8 };
const NAGOMI_VIEW_W = 33.3;
const NAGOMI_VIEW_H = 57.1;
const NAGOMI_SPOTS_DATA_URL = '/data/和水町.json';
const OZU_CROP = { x: 527.0, y: 436.2 };
const OZU_VIEW_W = 43.6;
const OZU_VIEW_H = 39.4;
const OZU_SPOTS_DATA_URL = '/data/大津町.json';
const KIKUYO_CROP = { x: 510.3, y: 452.4 };
const KIKUYO_VIEW_W = 35.0;
const KIKUYO_VIEW_H = 26.0;
const KIKUYO_SPOTS_DATA_URL = '/data/菊陽町.json';
const MINAMIOGUNI_CROP = { x: 561.3, y: 394.0 };
const MINAMIOGUNI_VIEW_W = 55.2;
const MINAMIOGUNI_VIEW_H = 37.1;
const MINAMIOGUNI_SPOTS_DATA_URL = '/data/南小国町.json';
const OGUNI_CROP = { x: 557.2, y: 374.2 };
const OGUNI_VIEW_W = 54.1;
const OGUNI_VIEW_H = 37.9;
const OGUNI_SPOTS_DATA_URL = '/data/小国町.json';
const UBUYAMA_CROP = { x: 596.2, y: 407.5 };
const UBUYAMA_VIEW_W = 32.3;
const UBUYAMA_VIEW_H = 36.1;
const UBUYAMA_SPOTS_DATA_URL = '/data/産山村.json';
const TAKAMORI_CROP = { x: 580.8, y: 445.1 };
const TAKAMORI_VIEW_W = 64.8;
const TAKAMORI_VIEW_H = 54.0;
const TAKAMORI_SPOTS_DATA_URL = '/data/高森町.json';
const NISHIHARA_CROP = { x: 536.7, y: 459.1 };
const NISHIHARA_VIEW_W = 34.5;
const NISHIHARA_VIEW_H = 29.9;
const NISHIHARA_SPOTS_DATA_URL = '/data/西原村.json';
const MINAMIASO_CROP = { x: 551.8, y: 446.9 };
const MINAMIASO_VIEW_W = 46.3;
const MINAMIASO_VIEW_H = 42.4;
const MINAMIASO_SPOTS_DATA_URL = '/data/南阿蘇村.json';
const MIFUNE_CROP = { x: 509.6, y: 475.6 };
const MIFUNE_VIEW_W = 56.5;
const MIFUNE_VIEW_H = 44.9;
const MIFUNE_SPOTS_DATA_URL = '/data/御船町.json';
const KASHIMA_TOWN_CROP = { x: 500.7, y: 485.9 };
const KASHIMA_TOWN_VIEW_W = 27.2;
const KASHIMA_TOWN_VIEW_H = 15.1;
const KASHIMA_TOWN_SPOTS_DATA_URL = '/data/嘉島町.json';
const MASHIKI_CROP = { x: 516.5, y: 465.7 };
const MASHIKI_VIEW_W = 32.1;
const MASHIKI_VIEW_H = 35.5;
const MASHIKI_SPOTS_DATA_URL = '/data/益城町.json';
const KOSA_CROP = { x: 511.5, y: 496.0 };
const KOSA_VIEW_W = 34.0;
const KOSA_VIEW_H = 31.5;
const KOSA_SPOTS_DATA_URL = '/data/甲佐町.json';
const YAMATO_CROP = { x: 533.0, y: 463.9 };
const YAMATO_VIEW_W = 96.5;
const YAMATO_VIEW_H = 90.1;
const YAMATO_SPOTS_DATA_URL = '/data/山都町.json';
const HIKAWA_CROP = { x: 482.8, y: 520.9 };
const HIKAWA_VIEW_W = 29.8;
const HIKAWA_VIEW_H = 31.1;
const HIKAWA_SPOTS_DATA_URL = '/data/氷川町.json';
const ASHIKITA_CROP = { x: 444.8, y: 569.3 };
const ASHIKITA_VIEW_W = 55.4;
const ASHIKITA_VIEW_H = 74.5;
const ASHIKITA_SPOTS_DATA_URL = '/data/芦北町.json';
const TSUNAGI_CROP = { x: 441.9, y: 605.1 };
const TSUNAGI_VIEW_W = 21.2;
const TSUNAGI_VIEW_H = 26.2;
const TSUNAGI_SPOTS_DATA_URL = '/data/津奈木町.json';
const NISHIKI_CROP = { x: 516.4, y: 612.9 };
const NISHIKI_VIEW_W = 38.0;
const NISHIKI_VIEW_H = 42.6;
const NISHIKI_SPOTS_DATA_URL = '/data/錦町.json';
const TARAGI_CROP = { x: 535.8, y: 583.1 };
const TARAGI_VIEW_W = 63.4;
const TARAGI_VIEW_H = 67.4;
const TARAGI_SPOTS_DATA_URL = '/data/多良木町.json';
const YUNOMAE_CROP = { x: 557.1, y: 598.8 };
const YUNOMAE_VIEW_W = 25.8;
const YUNOMAE_VIEW_H = 27.7;
const YUNOMAE_SPOTS_DATA_URL = '/data/湯前町.json';
const MIZUKAMI_CROP = { x: 548.1, y: 557.8 };
const MIZUKAMI_VIEW_W = 50.8;
const MIZUKAMI_VIEW_H = 59.6;
const MIZUKAMI_SPOTS_DATA_URL = '/data/水上村.json';
const SAGARA_CROP = { x: 514.4, y: 579.1 };
const SAGARA_VIEW_W = 38.7;
const SAGARA_VIEW_H = 56.9;
const SAGARA_SPOTS_DATA_URL = '/data/相良村.json';
const ITSUKI_CROP = { x: 500.6, y: 547.8 };
const ITSUKI_VIEW_W = 66.9;
const ITSUKI_VIEW_H = 54.7;
const ITSUKI_SPOTS_DATA_URL = '/data/五木村.json';
const YAMAE_CROP = { x: 496.4, y: 576.1 };
const YAMAE_VIEW_W = 38.3;
const YAMAE_VIEW_H = 53.5;
const YAMAE_SPOTS_DATA_URL = '/data/山江村.json';
const KUMA_VILLAGE_CROP = { x: 469.7, y: 578.8 };
const KUMA_VILLAGE_VIEW_W = 49.9;
const KUMA_VILLAGE_VIEW_H = 72.6;
const KUMA_VILLAGE_SPOTS_DATA_URL = '/data/球磨村.json';
const ASAGIRI_CROP = { x: 527.6, y: 591.1 };
const ASAGIRI_VIEW_W = 46.8;
const ASAGIRI_VIEW_H = 68.7;
const ASAGIRI_SPOTS_DATA_URL = '/data/あさぎり町.json';
const REIHOKU_CROP = { x: 352.6, y: 540.0 };
const REIHOKU_VIEW_W = 33.0;
const REIHOKU_VIEW_H = 37.3;
const REIHOKU_SPOTS_DATA_URL = '/data/苓北町.json';

// 宮崎県26市町村:諫早市などと同じ「九州全体マップと同じ正確な図法」から専用の切り出し範囲だけを用意。
const MIYAZAKI_CITY_CROP = { x: 595.9, y: 651.5 };
const MIYAZAKI_CITY_VIEW_W = 93.7;
const MIYAZAKI_CITY_VIEW_H = 112.7;
const MIYAZAKI_CITY_SPOTS_DATA_URL = '/data/宮崎市.json';
const MIYAKONOJO_CROP = { x: 529.1, y: 682.7 };
const MIYAKONOJO_VIEW_W = 105.6;
const MIYAKONOJO_VIEW_H = 106.2;
const MIYAKONOJO_SPOTS_DATA_URL = '/data/都城市.json';
const NOBEOKA_CROP = { x: 645.4, y: 456.2 };
const NOBEOKA_VIEW_W = 124.3;
const NOBEOKA_VIEW_H = 116.0;
const NOBEOKA_SPOTS_DATA_URL = '/data/延岡市.json';
const NICHINAN_CROP = { x: 591.3, y: 724.9 };
const NICHINAN_VIEW_W = 88.1;
const NICHINAN_VIEW_H = 95.5;
const NICHINAN_SPOTS_DATA_URL = '/data/日南市.json';
const KOBAYASHI_CROP = { x: 527.3, y: 626.1 };
const KOBAYASHI_VIEW_W = 96.6;
const KOBAYASHI_VIEW_H = 94.8;
const KOBAYASHI_SPOTS_DATA_URL = '/data/小林市.json';
const HYUGA_CROP = { x: 629.9, y: 550.2 };
const HYUGA_VIEW_W = 96.9;
const HYUGA_VIEW_H = 67.7;
const HYUGA_SPOTS_DATA_URL = '/data/日向市.json';
const KUSHIMA_CROP = { x: 591.9, y: 761.9 };
const KUSHIMA_VIEW_W = 70.5;
const KUSHIMA_VIEW_H = 90.3;
const KUSHIMA_SPOTS_DATA_URL = '/data/串間市.json';
const SAITO_CROP = { x: 593.3, y: 583.2 };
const SAITO_VIEW_W = 83.1;
const SAITO_VIEW_H = 105.4;
const SAITO_SPOTS_DATA_URL = '/data/西都市.json';
const EBINO_CROP = { x: 496.0, y: 638.8 };
const EBINO_VIEW_W = 75.0;
const EBINO_VIEW_H = 67.5;
const EBINO_SPOTS_DATA_URL = '/data/えびの市.json';
const MIMATA_CROP = { x: 582.9, y: 726.3 };
const MIMATA_VIEW_W = 48.4;
const MIMATA_VIEW_H = 43.8;
const MIMATA_SPOTS_DATA_URL = '/data/三股町.json';
const TAKAHARU_CROP = { x: 543.3, y: 681.1 };
const TAKAHARU_VIEW_W = 53.1;
const TAKAHARU_VIEW_H = 36.0;
const TAKAHARU_SPOTS_DATA_URL = '/data/高原町.json';
const KUNITOMI_CROP = { x: 602.1, y: 641.5 };
const KUNITOMI_VIEW_W = 55.0;
const KUNITOMI_VIEW_H = 54.6;
const KUNITOMI_SPOTS_DATA_URL = '/data/国富町.json';
const AYA_CROP = { x: 594.4, y: 642.0 };
const AYA_VIEW_W = 39.0;
const AYA_VIEW_H = 52.0;
const AYA_SPOTS_DATA_URL = '/data/綾町.json';
const TAKANABE_CROP = { x: 659.6, y: 634.7 };
const TAKANABE_VIEW_W = 27.9;
const TAKANABE_VIEW_H = 27.6;
const TAKANABE_SPOTS_DATA_URL = '/data/高鍋町.json';
const SHINTOMI_CROP = { x: 651.4, y: 645.2 };
const SHINTOMI_VIEW_W = 31.5;
const SHINTOMI_VIEW_H = 29.0;
const SHINTOMI_SPOTS_DATA_URL = '/data/新富町.json';
const NISHIMERA_CROP = { x: 569.5, y: 593.6 };
const NISHIMERA_VIEW_W = 66.5;
const NISHIMERA_VIEW_H = 62.5;
const NISHIMERA_SPOTS_DATA_URL = '/data/西米良村.json';
const KIJO_CROP = { x: 622.0, y: 590.0 };
const KIJO_VIEW_W = 59.0;
const KIJO_VIEW_H = 65.4;
const KIJO_SPOTS_DATA_URL = '/data/木城町.json';
const KAWAMINAMI_CROP = { x: 657.5, y: 610.4 };
const KAWAMINAMI_VIEW_W = 37.5;
const KAWAMINAMI_VIEW_H = 35.9;
const KAWAMINAMI_SPOTS_DATA_URL = '/data/川南町.json';
const TSUNO_CROP = { x: 653.7, y: 594.4 };
const TSUNO_VIEW_W = 46.3;
const TSUNO_VIEW_H = 34.5;
const TSUNO_SPOTS_DATA_URL = '/data/都農町.json';
const KADOGAWA_CROP = { x: 669.2, y: 536.5 };
const KADOGAWA_VIEW_W = 61.7;
const KADOGAWA_VIEW_H = 41.7;
const KADOGAWA_SPOTS_DATA_URL = '/data/門川町.json';
const MOROTSUKA_CROP = { x: 605.7, y: 512.8 };
const MOROTSUKA_VIEW_W = 57.4;
const MOROTSUKA_VIEW_H = 58.5;
const MOROTSUKA_SPOTS_DATA_URL = '/data/諸塚村.json';
const SHIIBA_CROP = { x: 558.3, y: 518.7 };
const SHIIBA_VIEW_W = 84.9;
const SHIIBA_VIEW_H = 97.8;
const SHIIBA_SPOTS_DATA_URL = '/data/椎葉村.json';
const MISATO_TOWN_CROP = { x: 598.7, y: 527.1 };
const MISATO_TOWN_VIEW_W = 94.1;
const MISATO_TOWN_VIEW_H = 87.1;
const MISATO_TOWN_SPOTS_DATA_URL = '/data/美郷町.json';
const TAKACHIHO_CROP = { x: 609.3, y: 463.8 };
const TAKACHIHO_VIEW_W = 56.5;
const TAKACHIHO_VIEW_H = 66.7;
const TAKACHIHO_SPOTS_DATA_URL = '/data/高千穂町.json';
const HINOKAGE_CROP = { x: 623.9, y: 460.3 };
const HINOKAGE_VIEW_W = 65.2;
const HINOKAGE_VIEW_H = 90.3;
const HINOKAGE_SPOTS_DATA_URL = '/data/日之影町.json';
const GOKASE_CROP = { x: 583.5, y: 486.8 };
const GOKASE_VIEW_W = 48.9;
const GOKASE_VIEW_H = 60.9;
const GOKASE_SPOTS_DATA_URL = '/data/五ヶ瀬町.json';

// 鹿児島県31市町村:諫早市などと同じ「九州全体マップと同じ正確な図法」から専用の切り出し範囲だけを用意。
const KAGOSHIMA_CITY_CROP = { x: 419.9, y: 726.1 };
const KAGOSHIMA_CITY_VIEW_W = 106.6;
const KAGOSHIMA_CITY_VIEW_H = 149.5;
const KAGOSHIMA_CITY_SPOTS_DATA_URL = '/data/鹿児島市.json';
const KANOYA_CROP = { x: 502.1, y: 762.9 };
const KANOYA_VIEW_W = 74.5;
const KANOYA_VIEW_H = 127.1;
const KANOYA_SPOTS_DATA_URL = '/data/鹿屋市.json';
const MAKURAZAKI_CROP = { x: 402.2, y: 842.9 };
const MAKURAZAKI_VIEW_W = 36.7;
const MAKURAZAKI_VIEW_H = 31.1;
const MAKURAZAKI_SPOTS_DATA_URL = '/data/枕崎市.json';
const AKUNE_CROP = { x: 381.9, y: 641.3 };
const AKUNE_VIEW_W = 46.7;
const AKUNE_VIEW_H = 65.4;
const AKUNE_SPOTS_DATA_URL = '/data/阿久根市.json';
const IZUMI_CROP = { x: 393.2, y: 629.6 };
const IZUMI_VIEW_W = 80.1;
const IZUMI_VIEW_H = 68.1;
const IZUMI_SPOTS_DATA_URL = '/data/出水市.json';
const IBUSUKI_CROP = { x: 457.3, y: 850.4 };
const IBUSUKI_VIEW_W = 48.2;
const IBUSUKI_VIEW_H = 48.0;
const IBUSUKI_SPOTS_DATA_URL = '/data/指宿市.json';
const NISHINOOMOTE_CROP = { x: 524.0, y: 963.6 };
const NISHINOOMOTE_VIEW_W = 71.2;
const NISHINOOMOTE_VIEW_H = 82.2;
const NISHINOOMOTE_SPOTS_DATA_URL = '/data/西之表市.json';
const TARUMIZU_CROP = { x: 493.9, y: 765.4 };
const TARUMIZU_VIEW_W = 45.6;
const TARUMIZU_VIEW_H = 71.2;
const TARUMIZU_SPOTS_DATA_URL = '/data/垂水市.json';
const SATSUMASENDAI_CROP = { x: 251.4, y: 656.9 };
const SATSUMASENDAI_VIEW_W = 258.7;
const SATSUMASENDAI_VIEW_H = 148.9;
const SATSUMASENDAI_SPOTS_DATA_URL = '/data/薩摩川内市.json';
const HIOKI_CROP = { x: 411.4, y: 738.8 };
const HIOKI_VIEW_W = 53.2;
const HIOKI_VIEW_H = 84.0;
const HIOKI_SPOTS_DATA_URL = '/data/日置市.json';
const SOO_CROP = { x: 526.6, y: 719.3 };
const SOO_VIEW_W = 88.3;
const SOO_VIEW_H = 90.6;
const SOO_SPOTS_DATA_URL = '/data/曽於市.json';
const KIRISHIMA_CROP = { x: 467.5, y: 683.0 };
const KIRISHIMA_VIEW_W = 94.3;
const KIRISHIMA_VIEW_H = 110.2;
const KIRISHIMA_SPOTS_DATA_URL = '/data/霧島市.json';
const ICHIKIKUSHIKINO_CROP = { x: 386.4, y: 727.3 };
const ICHIKIKUSHIKINO_VIEW_W = 55.0;
const ICHIKIKUSHIKINO_VIEW_H = 45.9;
const ICHIKIKUSHIKINO_SPOTS_DATA_URL = '/data/いちき串木野市.json';
const MINAMISATSUMA_CROP = { x: 199.5, y: 776.0 };
const MINAMISATSUMA_VIEW_W = 282.7;
const MINAMISATSUMA_VIEW_H = 228.8;
const MINAMISATSUMA_SPOTS_DATA_URL = '/data/南さつま市.json';
const SHIBUSHI_CROP = { x: 544.3, y: 764.4 };
const SHIBUSHI_VIEW_W = 76.6;
const SHIBUSHI_VIEW_H = 69.8;
const SHIBUSHI_SPOTS_DATA_URL = '/data/志布志市.json';
const MINAMIKYUSHU_CROP = { x: 410.9, y: 803.0 };
const MINAMIKYUSHU_VIEW_W = 69.5;
const MINAMIKYUSHU_VIEW_H = 85.8;
const MINAMIKYUSHU_SPOTS_DATA_URL = '/data/南九州市.json';
const ISA_CROP = { x: 446.4, y: 624.4 };
const ISA_VIEW_W = 71.4;
const ISA_VIEW_H = 82.6;
const ISA_SPOTS_DATA_URL = '/data/伊佐市.json';
const AIRA_CROP = { x: 447.6, y: 703.3 };
const AIRA_VIEW_W = 68.7;
const AIRA_VIEW_H = 67.9;
const AIRA_SPOTS_DATA_URL = '/data/姶良市.json';
const MISHIMA_CROP = { x: 316.6, y: 952.6 };
const MISHIMA_VIEW_W = 150.3;
const MISHIMA_VIEW_H = 54.4;
const MISHIMA_SPOTS_DATA_URL = '/data/三島村.json';
const SATSUMA_TOWN_CROP = { x: 417.2, y: 663.9 };
const SATSUMA_TOWN_VIEW_W = 80.2;
const SATSUMA_TOWN_VIEW_H = 72.0;
const SATSUMA_TOWN_SPOTS_DATA_URL = '/data/さつま町.json';
const NAGASHIMA_CROP = { x: 365.5, y: 595.8 };
const NAGASHIMA_VIEW_W = 54.1;
const NAGASHIMA_VIEW_H = 70.9;
const NAGASHIMA_SPOTS_DATA_URL = '/data/長島町.json';
const YUSUI_CROP = { x: 481.0, y: 660.1 };
const YUSUI_VIEW_W = 54.0;
const YUSUI_VIEW_H = 51.4;
const YUSUI_SPOTS_DATA_URL = '/data/湧水町.json';
const OSAKI_CROP = { x: 541.0, y: 787.4 };
const OSAKI_VIEW_W = 46.0;
const OSAKI_VIEW_H = 51.9;
const OSAKI_SPOTS_DATA_URL = '/data/大崎町.json';
const HIGASHIKUSHIRA_CROP = { x: 554.6, y: 819.1 };
const HIGASHIKUSHIRA_VIEW_W = 24.3;
const HIGASHIKUSHIRA_VIEW_H = 28.6;
const HIGASHIKUSHIRA_SPOTS_DATA_URL = '/data/東串良町.json';
const KINKO_CROP = { x: 511.3, y: 847.4 };
const KINKO_VIEW_W = 52.1;
const KINKO_VIEW_H = 61.6;
const KINKO_SPOTS_DATA_URL = '/data/錦江町.json';
const MINAMIOSUMI_CROP = { x: 484.5, y: 861.8 };
const MINAMIOSUMI_VIEW_W = 71.8;
const MINAMIOSUMI_VIEW_H = 81.3;
const MINAMIOSUMI_SPOTS_DATA_URL = '/data/南大隅町.json';
const KIMOTSUKI_CROP = { x: 532.2, y: 822.2 };
const KIMOTSUKI_VIEW_W = 74.7;
const KIMOTSUKI_VIEW_H = 92.5;
const KIMOTSUKI_SPOTS_DATA_URL = '/data/肝付町.json';
const NAKATANE_CROP = { x: 535.3, y: 1015.1 };
const NAKATANE_VIEW_W = 47.3;
const NAKATANE_VIEW_H = 64.4;
const NAKATANE_SPOTS_DATA_URL = '/data/中種子町.json';
const MINAMITANE_CROP = { x: 530.5, y: 1057.7 };
const MINAMITANE_VIEW_W = 38.8;
const MINAMITANE_VIEW_H = 45.1;
const MINAMITANE_SPOTS_DATA_URL = '/data/南種子町.json';
const YAKUSHIMA_CROP = { x: 368.8, y: 1043.9 };
const YAKUSHIMA_VIEW_W = 145.9;
const YAKUSHIMA_VIEW_H = 100.0;
const YAKUSHIMA_SPOTS_DATA_URL = '/data/屋久島町.json';
const TOSHIMA_VILLAGE_CROP = { x: 89.0, y: 1136.4 };
const TOSHIMA_VILLAGE_VIEW_W = 299.7;
const TOSHIMA_VILLAGE_VIEW_H = 396.9;
const TOSHIMA_VILLAGE_SPOTS_DATA_URL = '/data/十島村.json';

// 九州全体マップと同じ正確な図法(経度×cos(緯度)の正距円筒図法)。市ごとの切り出しに共通で使う。
const GEO_PROJ = { lonMin: 128.3437633597913, latMax: 34.70802082939781, coslat: 0.8503512172946261, scale: 251.49473321270509 };
const ISAHAYA_CROP = { x: 321.5, y: 427.7 }; // 九州全体座標系における諫早市エリアの切り出し原点
// データの配信元(GitHub→ConoHa WINGで毎晩自動更新される、諫早市のスポット一覧)
const SPOTS_DATA_URL = '/data/諫早市.json';

// 奄美群島12市町村のスポットデータURL(まだ実データが無い場合は空の一覧として表示される)
const AMAMI_SPOTS_DATA_URL = '/data/奄美市.json';
const YAMATO_VILLAGE_SPOTS_DATA_URL = '/data/大和村.json';
const UKEN_SPOTS_DATA_URL = '/data/宇検村.json';
const SETOUCHI_SPOTS_DATA_URL = '/data/瀬戸内町.json';
const TATSUGO_SPOTS_DATA_URL = '/data/龍郷町.json';
const KIKAI_SPOTS_DATA_URL = '/data/喜界町.json';
const TOKUNOSHIMA_SPOTS_DATA_URL = '/data/徳之島町.json';
const AMAGI_SPOTS_DATA_URL = '/data/天城町.json';
const ISEN_SPOTS_DATA_URL = '/data/伊仙町.json';
const WADOMARI_SPOTS_DATA_URL = '/data/和泊町.json';
const CHINAN_SPOTS_DATA_URL = '/data/知名町.json';
const YORON_SPOTS_DATA_URL = '/data/与論町.json';

// 市町村ページ(スポット地図・ルート機能など)が使えるようになっている市町村の設定一覧。
// ここに追加した市町村は、諫早市と同じ仕組み(専用の切り出し座標・実データURL)で動くようになる。
const CITY_CONFIGS = {
  '42204': {
    name: '諫早市', nameEn: 'Isahaya City', prefId: '42',
    crop: ISAHAYA_CROP, viewW: VIEW_W, viewH: VIEW_H,
    dataUrl: SPOTS_DATA_URL,
    seaBgClass: 'isahaya-sea-bg',
  },
  '42214': {
    name: '南島原市', nameEn: 'Minamishimabara City', prefId: '42',
    crop: MINAMISHIMABARA_CROP, viewW: MINAMISHIMABARA_VIEW_W, viewH: MINAMISHIMABARA_VIEW_H,
    dataUrl: MINAMISHIMABARA_SPOTS_DATA_URL,
    seaBgClass: 'minamishimabara-sea-bg',
  },
  '42203': {
    name: '島原市', nameEn: 'Shimabara City', prefId: '42',
    crop: SHIMABARA_CROP, viewW: SHIMABARA_VIEW_W, viewH: SHIMABARA_VIEW_H,
    dataUrl: SHIMABARA_SPOTS_DATA_URL,
    seaBgClass: 'shimabara-sea-bg',
  },
  '42201': {
    name: '長崎市', nameEn: 'Nagasaki City', prefId: '42',
    crop: NAGASAKI_CITY_CROP, viewW: NAGASAKI_CITY_VIEW_W, viewH: NAGASAKI_CITY_VIEW_H,
    dataUrl: NAGASAKI_CITY_SPOTS_DATA_URL,
    seaBgClass: 'nagasakicity-sea-bg',
  },
  '42202': {
    name: '佐世保市', nameEn: 'Sasebo City', prefId: '42',
    crop: SASEBO_CROP, viewW: SASEBO_VIEW_W, viewH: SASEBO_VIEW_H,
    dataUrl: SASEBO_SPOTS_DATA_URL,
    seaBgClass: 'sasebo-sea-bg',
  },
  '42205': {
    name: '大村市', nameEn: 'Omura City', prefId: '42',
    crop: OMURA_CROP, viewW: OMURA_VIEW_W, viewH: OMURA_VIEW_H,
    dataUrl: OMURA_SPOTS_DATA_URL,
    seaBgClass: 'omura-sea-bg',
  },
  '42207': {
    name: '平戸市', nameEn: 'Hirado City', prefId: '42',
    crop: HIRADO_CROP, viewW: HIRADO_VIEW_W, viewH: HIRADO_VIEW_H,
    dataUrl: HIRADO_SPOTS_DATA_URL,
    seaBgClass: 'hirado-sea-bg',
  },
  '42208': {
    name: '松浦市', nameEn: 'Matsuura City', prefId: '42',
    crop: MATSUURA_CROP, viewW: MATSUURA_VIEW_W, viewH: MATSUURA_VIEW_H,
    dataUrl: MATSUURA_SPOTS_DATA_URL,
    seaBgClass: 'matsuura-sea-bg',
  },
  '42209': {
    name: '対馬市', nameEn: 'Tsushima City', prefId: '42',
    crop: TSUSHIMA_CROP, viewW: TSUSHIMA_VIEW_W, viewH: TSUSHIMA_VIEW_H,
    dataUrl: TSUSHIMA_SPOTS_DATA_URL,
    seaBgClass: 'tsushima-sea-bg',
  },
  '42210': {
    name: '壱岐市', nameEn: 'Iki City', prefId: '42',
    crop: IKI_CROP, viewW: IKI_VIEW_W, viewH: IKI_VIEW_H,
    dataUrl: IKI_SPOTS_DATA_URL,
    seaBgClass: 'iki-sea-bg',
  },
  '42211': {
    name: '五島市', nameEn: 'Goto City', prefId: '42',
    crop: GOTO_CROP, viewW: GOTO_VIEW_W, viewH: GOTO_VIEW_H,
    dataUrl: GOTO_SPOTS_DATA_URL,
    seaBgClass: 'goto-sea-bg',
  },
  '42212': {
    name: '西海市', nameEn: 'Saikai City', prefId: '42',
    crop: SAIKAI_CROP, viewW: SAIKAI_VIEW_W, viewH: SAIKAI_VIEW_H,
    dataUrl: SAIKAI_SPOTS_DATA_URL,
    seaBgClass: 'saikai-sea-bg',
  },
  '42213': {
    name: '雲仙市', nameEn: 'Unzen City', prefId: '42',
    crop: UNZEN_CROP, viewW: UNZEN_VIEW_W, viewH: UNZEN_VIEW_H,
    dataUrl: UNZEN_SPOTS_DATA_URL,
    seaBgClass: 'unzen-sea-bg',
  },
  '42307': {
    name: '長与町', nameEn: 'Nagayo Town', prefId: '42',
    crop: NAGAYO_CROP, viewW: NAGAYO_VIEW_W, viewH: NAGAYO_VIEW_H,
    dataUrl: NAGAYO_SPOTS_DATA_URL,
    seaBgClass: 'nagayo-sea-bg',
  },
  '42308': {
    name: '時津町', nameEn: 'Togitsu Town', prefId: '42',
    crop: TOGITSU_CROP, viewW: TOGITSU_VIEW_W, viewH: TOGITSU_VIEW_H,
    dataUrl: TOGITSU_SPOTS_DATA_URL,
    seaBgClass: 'togitsu-sea-bg',
  },
  '42321': {
    name: '東彼杵町', nameEn: 'Higashisonogi Town', prefId: '42',
    crop: HIGASHISONOGI_CROP, viewW: HIGASHISONOGI_VIEW_W, viewH: HIGASHISONOGI_VIEW_H,
    dataUrl: HIGASHISONOGI_SPOTS_DATA_URL,
    seaBgClass: 'higashisonogi-sea-bg',
  },
  '42322': {
    name: '川棚町', nameEn: 'Kawatana Town', prefId: '42',
    crop: KAWATANA_CROP, viewW: KAWATANA_VIEW_W, viewH: KAWATANA_VIEW_H,
    dataUrl: KAWATANA_SPOTS_DATA_URL,
    seaBgClass: 'kawatana-sea-bg',
  },
  '42323': {
    name: '波佐見町', nameEn: 'Hasami Town', prefId: '42',
    crop: HASAMI_CROP, viewW: HASAMI_VIEW_W, viewH: HASAMI_VIEW_H,
    dataUrl: HASAMI_SPOTS_DATA_URL,
    seaBgClass: 'hasami-sea-bg',
  },
  '42383': {
    name: '小値賀町', nameEn: 'Ojika Town', prefId: '42',
    crop: OJIKA_CROP, viewW: OJIKA_VIEW_W, viewH: OJIKA_VIEW_H,
    dataUrl: OJIKA_SPOTS_DATA_URL,
    seaBgClass: 'ojika-sea-bg',
  },
  '42391': {
    name: '佐々町', nameEn: 'Sasa Town', prefId: '42',
    crop: SASA_CROP, viewW: SASA_VIEW_W, viewH: SASA_VIEW_H,
    dataUrl: SASA_SPOTS_DATA_URL,
    seaBgClass: 'sasa-sea-bg',
  },
  '42411': {
    name: '新上五島町', nameEn: 'Shinkamigoto Town', prefId: '42',
    crop: SHINKAMIGOTO_CROP, viewW: SHINKAMIGOTO_VIEW_W, viewH: SHINKAMIGOTO_VIEW_H,
    dataUrl: SHINKAMIGOTO_SPOTS_DATA_URL,
    seaBgClass: 'shinkamigoto-sea-bg',
  },
  '41201': {
    name: '佐賀市', nameEn: 'Saga City', prefId: '41',
    crop: SAGA_CITY_CROP, viewW: SAGA_CITY_VIEW_W, viewH: SAGA_CITY_VIEW_H,
    dataUrl: SAGA_CITY_SPOTS_DATA_URL,
    seaBgClass: 'sagacity-sea-bg',
  },
  '41202': {
    name: '唐津市', nameEn: 'Karatsu City', prefId: '41',
    crop: KARATSU_CROP, viewW: KARATSU_VIEW_W, viewH: KARATSU_VIEW_H,
    dataUrl: KARATSU_SPOTS_DATA_URL,
    seaBgClass: 'karatsu-sea-bg',
  },
  '41203': {
    name: '鳥栖市', nameEn: 'Tosu City', prefId: '41',
    crop: TOSU_CROP, viewW: TOSU_VIEW_W, viewH: TOSU_VIEW_H,
    dataUrl: TOSU_SPOTS_DATA_URL,
    seaBgClass: 'tosu-sea-bg',
  },
  '41204': {
    name: '多久市', nameEn: 'Taku City', prefId: '41',
    crop: TAKU_CROP, viewW: TAKU_VIEW_W, viewH: TAKU_VIEW_H,
    dataUrl: TAKU_SPOTS_DATA_URL,
    seaBgClass: 'taku-sea-bg',
  },
  '41205': {
    name: '伊万里市', nameEn: 'Imari City', prefId: '41',
    crop: IMARI_CROP, viewW: IMARI_VIEW_W, viewH: IMARI_VIEW_H,
    dataUrl: IMARI_SPOTS_DATA_URL,
    seaBgClass: 'imari-sea-bg',
  },
  '41206': {
    name: '武雄市', nameEn: 'Takeo City', prefId: '41',
    crop: TAKEO_CROP, viewW: TAKEO_VIEW_W, viewH: TAKEO_VIEW_H,
    dataUrl: TAKEO_SPOTS_DATA_URL,
    seaBgClass: 'takeo-sea-bg',
  },
  '41207': {
    name: '鹿島市', nameEn: 'Kashima City', prefId: '41',
    crop: KASHIMA_CROP, viewW: KASHIMA_VIEW_W, viewH: KASHIMA_VIEW_H,
    dataUrl: KASHIMA_SPOTS_DATA_URL,
    seaBgClass: 'kashima-sea-bg',
  },
  '41208': {
    name: '小城市', nameEn: 'Ogi City', prefId: '41',
    crop: OGI_CROP, viewW: OGI_VIEW_W, viewH: OGI_VIEW_H,
    dataUrl: OGI_SPOTS_DATA_URL,
    seaBgClass: 'ogi-sea-bg',
  },
  '41209': {
    name: '嬉野市', nameEn: 'Ureshino City', prefId: '41',
    crop: URESHINO_CROP, viewW: URESHINO_VIEW_W, viewH: URESHINO_VIEW_H,
    dataUrl: URESHINO_SPOTS_DATA_URL,
    seaBgClass: 'ureshino-sea-bg',
  },
  '41210': {
    name: '神埼市', nameEn: 'Kanzaki City', prefId: '41',
    crop: KANZAKI_CROP, viewW: KANZAKI_VIEW_W, viewH: KANZAKI_VIEW_H,
    dataUrl: KANZAKI_SPOTS_DATA_URL,
    seaBgClass: 'kanzaki-sea-bg',
  },
  '41327': {
    name: '吉野ヶ里町', nameEn: 'Yoshinogari Town', prefId: '41',
    crop: YOSHINOGARI_CROP, viewW: YOSHINOGARI_VIEW_W, viewH: YOSHINOGARI_VIEW_H,
    dataUrl: YOSHINOGARI_SPOTS_DATA_URL,
    seaBgClass: 'yoshinogari-sea-bg',
  },
  '41341': {
    name: '基山町', nameEn: 'Kiyama Town', prefId: '41',
    crop: KIYAMA_CROP, viewW: KIYAMA_VIEW_W, viewH: KIYAMA_VIEW_H,
    dataUrl: KIYAMA_SPOTS_DATA_URL,
    seaBgClass: 'kiyama-sea-bg',
  },
  '41345': {
    name: '上峰町', nameEn: 'Kamimine Town', prefId: '41',
    crop: KAMIMINE_CROP, viewW: KAMIMINE_VIEW_W, viewH: KAMIMINE_VIEW_H,
    dataUrl: KAMIMINE_SPOTS_DATA_URL,
    seaBgClass: 'kamimine-sea-bg',
  },
  '41346': {
    name: 'みやき町', nameEn: 'Miyaki Town', prefId: '41',
    crop: MIYAKI_CROP, viewW: MIYAKI_VIEW_W, viewH: MIYAKI_VIEW_H,
    dataUrl: MIYAKI_SPOTS_DATA_URL,
    seaBgClass: 'miyaki-sea-bg',
  },
  '41387': {
    name: '玄海町', nameEn: 'Genkai Town', prefId: '41',
    crop: GENKAI_CROP, viewW: GENKAI_VIEW_W, viewH: GENKAI_VIEW_H,
    dataUrl: GENKAI_SPOTS_DATA_URL,
    seaBgClass: 'genkai-sea-bg',
  },
  '41401': {
    name: '有田町', nameEn: 'Arita Town', prefId: '41',
    crop: ARITA_CROP, viewW: ARITA_VIEW_W, viewH: ARITA_VIEW_H,
    dataUrl: ARITA_SPOTS_DATA_URL,
    seaBgClass: 'arita-sea-bg',
  },
  '41423': {
    name: '大町町', nameEn: 'Omachi Town', prefId: '41',
    crop: OMACHI_CROP, viewW: OMACHI_VIEW_W, viewH: OMACHI_VIEW_H,
    dataUrl: OMACHI_SPOTS_DATA_URL,
    seaBgClass: 'omachi-sea-bg',
  },
  '41424': {
    name: '江北町', nameEn: 'Kouhoku Town', prefId: '41',
    crop: KOHOKU_CROP, viewW: KOHOKU_VIEW_W, viewH: KOHOKU_VIEW_H,
    dataUrl: KOHOKU_SPOTS_DATA_URL,
    seaBgClass: 'kohoku-sea-bg',
  },
  '41425': {
    name: '白石町', nameEn: 'Shiroishi Town', prefId: '41',
    crop: SHIROISHI_CROP, viewW: SHIROISHI_VIEW_W, viewH: SHIROISHI_VIEW_H,
    dataUrl: SHIROISHI_SPOTS_DATA_URL,
    seaBgClass: 'shiroishi-sea-bg',
  },
  '41441': {
    name: '太良町', nameEn: 'Tara Town', prefId: '41',
    crop: TARA_CROP, viewW: TARA_VIEW_W, viewH: TARA_VIEW_H,
    dataUrl: TARA_SPOTS_DATA_URL,
    seaBgClass: 'tara-sea-bg',
  },
  '40100': {
    name: '北九州市', nameEn: 'Kitakyushu City', prefId: '40',
    crop: KITAKYUSHU_CROP, viewW: KITAKYUSHU_VIEW_W, viewH: KITAKYUSHU_VIEW_H,
    dataUrl: KITAKYUSHU_SPOTS_DATA_URL,
    seaBgClass: 'kitakyushu-sea-bg',
  },
  '40130': {
    name: '福岡市', nameEn: 'Fukuoka City', prefId: '40',
    crop: FUKUOKA_CITY_CROP, viewW: FUKUOKA_CITY_VIEW_W, viewH: FUKUOKA_CITY_VIEW_H,
    dataUrl: FUKUOKA_CITY_SPOTS_DATA_URL,
    seaBgClass: 'fukuokacity-sea-bg',
  },
  '40202': {
    name: '大牟田市', nameEn: 'Omuta City', prefId: '40',
    crop: OMUTA_CROP, viewW: OMUTA_VIEW_W, viewH: OMUTA_VIEW_H,
    dataUrl: OMUTA_SPOTS_DATA_URL,
    seaBgClass: 'omuta-sea-bg',
  },
  '40203': {
    name: '久留米市', nameEn: 'Kurume City', prefId: '40',
    crop: KURUME_CROP, viewW: KURUME_VIEW_W, viewH: KURUME_VIEW_H,
    dataUrl: KURUME_SPOTS_DATA_URL,
    seaBgClass: 'kurume-sea-bg',
  },
  '40204': {
    name: '直方市', nameEn: 'Nogata City', prefId: '40',
    crop: NOGATA_CROP, viewW: NOGATA_VIEW_W, viewH: NOGATA_VIEW_H,
    dataUrl: NOGATA_SPOTS_DATA_URL,
    seaBgClass: 'nogata-sea-bg',
  },
  '40205': {
    name: '飯塚市', nameEn: 'Iizuka City', prefId: '40',
    crop: IIZUKA_CROP, viewW: IIZUKA_VIEW_W, viewH: IIZUKA_VIEW_H,
    dataUrl: IIZUKA_SPOTS_DATA_URL,
    seaBgClass: 'iizuka-sea-bg',
  },
  '40206': {
    name: '田川市', nameEn: 'Tagawa City', prefId: '40',
    crop: TAGAWA_CROP, viewW: TAGAWA_VIEW_W, viewH: TAGAWA_VIEW_H,
    dataUrl: TAGAWA_SPOTS_DATA_URL,
    seaBgClass: 'tagawa-sea-bg',
  },
  '40207': {
    name: '柳川市', nameEn: 'Yanagawa City', prefId: '40',
    crop: YANAGAWA_CROP, viewW: YANAGAWA_VIEW_W, viewH: YANAGAWA_VIEW_H,
    dataUrl: YANAGAWA_SPOTS_DATA_URL,
    seaBgClass: 'yanagawa-sea-bg',
  },
  '40210': {
    name: '八女市', nameEn: 'Yame City', prefId: '40',
    crop: YAME_CROP, viewW: YAME_VIEW_W, viewH: YAME_VIEW_H,
    dataUrl: YAME_SPOTS_DATA_URL,
    seaBgClass: 'yame-sea-bg',
  },
  '40211': {
    name: '筑後市', nameEn: 'Chikugo City', prefId: '40',
    crop: CHIKUGO_CROP, viewW: CHIKUGO_VIEW_W, viewH: CHIKUGO_VIEW_H,
    dataUrl: CHIKUGO_SPOTS_DATA_URL,
    seaBgClass: 'chikugo-sea-bg',
  },
  '40212': {
    name: '大川市', nameEn: 'Okawa City', prefId: '40',
    crop: OKAWA_CROP, viewW: OKAWA_VIEW_W, viewH: OKAWA_VIEW_H,
    dataUrl: OKAWA_SPOTS_DATA_URL,
    seaBgClass: 'okawa-sea-bg',
  },
  '40213': {
    name: '行橋市', nameEn: 'Yukuhashi City', prefId: '40',
    crop: YUKUHASHI_CROP, viewW: YUKUHASHI_VIEW_W, viewH: YUKUHASHI_VIEW_H,
    dataUrl: YUKUHASHI_SPOTS_DATA_URL,
    seaBgClass: 'yukuhashi-sea-bg',
  },
  '40214': {
    name: '豊前市', nameEn: 'Buzen City', prefId: '40',
    crop: BUZEN_CROP, viewW: BUZEN_VIEW_W, viewH: BUZEN_VIEW_H,
    dataUrl: BUZEN_SPOTS_DATA_URL,
    seaBgClass: 'buzen-sea-bg',
  },
  '40215': {
    name: '中間市', nameEn: 'Nakama City', prefId: '40',
    crop: NAKAMA_CROP, viewW: NAKAMA_VIEW_W, viewH: NAKAMA_VIEW_H,
    dataUrl: NAKAMA_SPOTS_DATA_URL,
    seaBgClass: 'nakama-sea-bg',
  },
  '40216': {
    name: '小郡市', nameEn: 'Ogori City', prefId: '40',
    crop: OGORI_CROP, viewW: OGORI_VIEW_W, viewH: OGORI_VIEW_H,
    dataUrl: OGORI_SPOTS_DATA_URL,
    seaBgClass: 'ogori-sea-bg',
  },
  '40217': {
    name: '筑紫野市', nameEn: 'Chikushino City', prefId: '40',
    crop: CHIKUSHINO_CROP, viewW: CHIKUSHINO_VIEW_W, viewH: CHIKUSHINO_VIEW_H,
    dataUrl: CHIKUSHINO_SPOTS_DATA_URL,
    seaBgClass: 'chikushino-sea-bg',
  },
  '40218': {
    name: '春日市', nameEn: 'Kasuga City', prefId: '40',
    crop: KASUGA_CROP, viewW: KASUGA_VIEW_W, viewH: KASUGA_VIEW_H,
    dataUrl: KASUGA_SPOTS_DATA_URL,
    seaBgClass: 'kasuga-sea-bg',
  },
  '40219': {
    name: '大野城市', nameEn: 'Onojo City', prefId: '40',
    crop: ONOJO_CROP, viewW: ONOJO_VIEW_W, viewH: ONOJO_VIEW_H,
    dataUrl: ONOJO_SPOTS_DATA_URL,
    seaBgClass: 'onojo-sea-bg',
  },
  '40220': {
    name: '宗像市', nameEn: 'Munakata City', prefId: '40',
    crop: MUNAKATA_CROP, viewW: MUNAKATA_VIEW_W, viewH: MUNAKATA_VIEW_H,
    dataUrl: MUNAKATA_SPOTS_DATA_URL,
    seaBgClass: 'munakata-sea-bg',
  },
  '40221': {
    name: '太宰府市', nameEn: 'Dazaifu City', prefId: '40',
    crop: DAZAIFU_CROP, viewW: DAZAIFU_VIEW_W, viewH: DAZAIFU_VIEW_H,
    dataUrl: DAZAIFU_SPOTS_DATA_URL,
    seaBgClass: 'dazaifu-sea-bg',
  },
  '40223': {
    name: '古賀市', nameEn: 'Koga City', prefId: '40',
    crop: KOGA_CROP, viewW: KOGA_VIEW_W, viewH: KOGA_VIEW_H,
    dataUrl: KOGA_SPOTS_DATA_URL,
    seaBgClass: 'koga-sea-bg',
  },
  '40224': {
    name: '福津市', nameEn: 'Fukutsu City', prefId: '40',
    crop: FUKUTSU_CROP, viewW: FUKUTSU_VIEW_W, viewH: FUKUTSU_VIEW_H,
    dataUrl: FUKUTSU_SPOTS_DATA_URL,
    seaBgClass: 'fukutsu-sea-bg',
  },
  '40225': {
    name: 'うきは市', nameEn: 'Ukiha City', prefId: '40',
    crop: UKIHA_CROP, viewW: UKIHA_VIEW_W, viewH: UKIHA_VIEW_H,
    dataUrl: UKIHA_SPOTS_DATA_URL,
    seaBgClass: 'ukiha-sea-bg',
  },
  '40226': {
    name: '宮若市', nameEn: 'Miyawaka City', prefId: '40',
    crop: MIYAWAKA_CROP, viewW: MIYAWAKA_VIEW_W, viewH: MIYAWAKA_VIEW_H,
    dataUrl: MIYAWAKA_SPOTS_DATA_URL,
    seaBgClass: 'miyawaka-sea-bg',
  },
  '40227': {
    name: '嘉麻市', nameEn: 'Kama City', prefId: '40',
    crop: KAMA_CROP, viewW: KAMA_VIEW_W, viewH: KAMA_VIEW_H,
    dataUrl: KAMA_SPOTS_DATA_URL,
    seaBgClass: 'kama-sea-bg',
  },
  '40228': {
    name: '朝倉市', nameEn: 'Asakura City', prefId: '40',
    crop: ASAKURA_CROP, viewW: ASAKURA_VIEW_W, viewH: ASAKURA_VIEW_H,
    dataUrl: ASAKURA_SPOTS_DATA_URL,
    seaBgClass: 'asakura-sea-bg',
  },
  '40229': {
    name: 'みやま市', nameEn: 'Miyama City', prefId: '40',
    crop: MIYAMA_CROP, viewW: MIYAMA_VIEW_W, viewH: MIYAMA_VIEW_H,
    dataUrl: MIYAMA_SPOTS_DATA_URL,
    seaBgClass: 'miyama-sea-bg',
  },
  '40230': {
    name: '糸島市', nameEn: 'Itoshima City', prefId: '40',
    crop: ITOSHIMA_CROP, viewW: ITOSHIMA_VIEW_W, viewH: ITOSHIMA_VIEW_H,
    dataUrl: ITOSHIMA_SPOTS_DATA_URL,
    seaBgClass: 'itoshima-sea-bg',
  },
  '40231': {
    name: '那珂川市', nameEn: 'Nakagawa City', prefId: '40',
    crop: NAKAGAWA_CROP, viewW: NAKAGAWA_VIEW_W, viewH: NAKAGAWA_VIEW_H,
    dataUrl: NAKAGAWA_SPOTS_DATA_URL,
    seaBgClass: 'nakagawa-sea-bg',
  },
  '40341': {
    name: '宇美町', nameEn: 'Umi Town', prefId: '40',
    crop: UMI_CROP, viewW: UMI_VIEW_W, viewH: UMI_VIEW_H,
    dataUrl: UMI_SPOTS_DATA_URL,
    seaBgClass: 'umi-sea-bg',
  },
  '40342': {
    name: '篠栗町', nameEn: 'Sasaguri Town', prefId: '40',
    crop: SASAGURI_CROP, viewW: SASAGURI_VIEW_W, viewH: SASAGURI_VIEW_H,
    dataUrl: SASAGURI_SPOTS_DATA_URL,
    seaBgClass: 'sasaguri-sea-bg',
  },
  '40343': {
    name: '志免町', nameEn: 'Shime Town', prefId: '40',
    crop: SHIME_CROP, viewW: SHIME_VIEW_W, viewH: SHIME_VIEW_H,
    dataUrl: SHIME_SPOTS_DATA_URL,
    seaBgClass: 'shime-sea-bg',
  },
  '40344': {
    name: '須恵町', nameEn: 'Sue Town', prefId: '40',
    crop: SUE_CROP, viewW: SUE_VIEW_W, viewH: SUE_VIEW_H,
    dataUrl: SUE_SPOTS_DATA_URL,
    seaBgClass: 'sue-sea-bg',
  },
  '40345': {
    name: '新宮町', nameEn: 'Shingu Town', prefId: '40',
    crop: SHINGU_CROP, viewW: SHINGU_VIEW_W, viewH: SHINGU_VIEW_H,
    dataUrl: SHINGU_SPOTS_DATA_URL,
    seaBgClass: 'shingu-sea-bg',
  },
  '40348': {
    name: '久山町', nameEn: 'Hisayama Town', prefId: '40',
    crop: HISAYAMA_CROP, viewW: HISAYAMA_VIEW_W, viewH: HISAYAMA_VIEW_H,
    dataUrl: HISAYAMA_SPOTS_DATA_URL,
    seaBgClass: 'hisayama-sea-bg',
  },
  '40349': {
    name: '粕屋町', nameEn: 'Kasuya Town', prefId: '40',
    crop: KASUYA_CROP, viewW: KASUYA_VIEW_W, viewH: KASUYA_VIEW_H,
    dataUrl: KASUYA_SPOTS_DATA_URL,
    seaBgClass: 'kasuya-sea-bg',
  },
  '40381': {
    name: '芦屋町', nameEn: 'Ashiya Town', prefId: '40',
    crop: ASHIYA_CROP, viewW: ASHIYA_VIEW_W, viewH: ASHIYA_VIEW_H,
    dataUrl: ASHIYA_SPOTS_DATA_URL,
    seaBgClass: 'ashiya-sea-bg',
  },
  '40382': {
    name: '水巻町', nameEn: 'Mizumaki Town', prefId: '40',
    crop: MIZUMAKI_CROP, viewW: MIZUMAKI_VIEW_W, viewH: MIZUMAKI_VIEW_H,
    dataUrl: MIZUMAKI_SPOTS_DATA_URL,
    seaBgClass: 'mizumaki-sea-bg',
  },
  '40383': {
    name: '岡垣町', nameEn: 'Okagaki Town', prefId: '40',
    crop: OKAGAKI_CROP, viewW: OKAGAKI_VIEW_W, viewH: OKAGAKI_VIEW_H,
    dataUrl: OKAGAKI_SPOTS_DATA_URL,
    seaBgClass: 'okagaki-sea-bg',
  },
  '40384': {
    name: '遠賀町', nameEn: 'Onga Town', prefId: '40',
    crop: ONGA_CROP, viewW: ONGA_VIEW_W, viewH: ONGA_VIEW_H,
    dataUrl: ONGA_SPOTS_DATA_URL,
    seaBgClass: 'onga-sea-bg',
  },
  '40401': {
    name: '小竹町', nameEn: 'Kotake Town', prefId: '40',
    crop: KOTAKE_CROP, viewW: KOTAKE_VIEW_W, viewH: KOTAKE_VIEW_H,
    dataUrl: KOTAKE_SPOTS_DATA_URL,
    seaBgClass: 'kotake-sea-bg',
  },
  '40402': {
    name: '鞍手町', nameEn: 'Kurate Town', prefId: '40',
    crop: KURATE_CROP, viewW: KURATE_VIEW_W, viewH: KURATE_VIEW_H,
    dataUrl: KURATE_SPOTS_DATA_URL,
    seaBgClass: 'kurate-sea-bg',
  },
  '40421': {
    name: '桂川町', nameEn: 'Keisen Town', prefId: '40',
    crop: KEISEN_CROP, viewW: KEISEN_VIEW_W, viewH: KEISEN_VIEW_H,
    dataUrl: KEISEN_SPOTS_DATA_URL,
    seaBgClass: 'keisen-sea-bg',
  },
  '40447': {
    name: '筑前町', nameEn: 'Chikuzen Town', prefId: '40',
    crop: CHIKUZEN_CROP, viewW: CHIKUZEN_VIEW_W, viewH: CHIKUZEN_VIEW_H,
    dataUrl: CHIKUZEN_SPOTS_DATA_URL,
    seaBgClass: 'chikuzen-sea-bg',
  },
  '40448': {
    name: '東峰村', nameEn: 'Toho Village', prefId: '40',
    crop: TOHO_CROP, viewW: TOHO_VIEW_W, viewH: TOHO_VIEW_H,
    dataUrl: TOHO_SPOTS_DATA_URL,
    seaBgClass: 'toho-sea-bg',
  },
  '40503': {
    name: '大刀洗町', nameEn: 'Tachiarai Town', prefId: '40',
    crop: TACHIARAI_CROP, viewW: TACHIARAI_VIEW_W, viewH: TACHIARAI_VIEW_H,
    dataUrl: TACHIARAI_SPOTS_DATA_URL,
    seaBgClass: 'tachiarai-sea-bg',
  },
  '40522': {
    name: '大木町', nameEn: 'Oki Town', prefId: '40',
    crop: OKI_CROP, viewW: OKI_VIEW_W, viewH: OKI_VIEW_H,
    dataUrl: OKI_SPOTS_DATA_URL,
    seaBgClass: 'oki-sea-bg',
  },
  '40544': {
    name: '広川町', nameEn: 'Hirokawa Town', prefId: '40',
    crop: HIROKAWA_CROP, viewW: HIROKAWA_VIEW_W, viewH: HIROKAWA_VIEW_H,
    dataUrl: HIROKAWA_SPOTS_DATA_URL,
    seaBgClass: 'hirokawa-sea-bg',
  },
  '40601': {
    name: '香春町', nameEn: 'Kawara Town', prefId: '40',
    crop: KAWARA_CROP, viewW: KAWARA_VIEW_W, viewH: KAWARA_VIEW_H,
    dataUrl: KAWARA_SPOTS_DATA_URL,
    seaBgClass: 'kawara-sea-bg',
  },
  '40602': {
    name: '添田町', nameEn: 'Soeda Town', prefId: '40',
    crop: SOEDA_CROP, viewW: SOEDA_VIEW_W, viewH: SOEDA_VIEW_H,
    dataUrl: SOEDA_SPOTS_DATA_URL,
    seaBgClass: 'soeda-sea-bg',
  },
  '40604': {
    name: '糸田町', nameEn: 'Itoda Town', prefId: '40',
    crop: ITODA_CROP, viewW: ITODA_VIEW_W, viewH: ITODA_VIEW_H,
    dataUrl: ITODA_SPOTS_DATA_URL,
    seaBgClass: 'itoda-sea-bg',
  },
  '40605': {
    name: '川崎町', nameEn: 'Kawasaki Town', prefId: '40',
    crop: KAWASAKI_TOWN_CROP, viewW: KAWASAKI_TOWN_VIEW_W, viewH: KAWASAKI_TOWN_VIEW_H,
    dataUrl: KAWASAKI_TOWN_SPOTS_DATA_URL,
    seaBgClass: 'kawasakitown-sea-bg',
  },
  '40608': {
    name: '大任町', nameEn: 'Oto Town', prefId: '40',
    crop: OTO_CROP, viewW: OTO_VIEW_W, viewH: OTO_VIEW_H,
    dataUrl: OTO_SPOTS_DATA_URL,
    seaBgClass: 'oto-sea-bg',
  },
  '40609': {
    name: '赤村', nameEn: 'Aka Village', prefId: '40',
    crop: AKA_CROP, viewW: AKA_VIEW_W, viewH: AKA_VIEW_H,
    dataUrl: AKA_SPOTS_DATA_URL,
    seaBgClass: 'aka-sea-bg',
  },
  '40610': {
    name: '福智町', nameEn: 'Fukuchi Town', prefId: '40',
    crop: FUKUCHI_CROP, viewW: FUKUCHI_VIEW_W, viewH: FUKUCHI_VIEW_H,
    dataUrl: FUKUCHI_SPOTS_DATA_URL,
    seaBgClass: 'fukuchi-sea-bg',
  },
  '40621': {
    name: '苅田町', nameEn: 'Kanda Town', prefId: '40',
    crop: KANDA_CROP, viewW: KANDA_VIEW_W, viewH: KANDA_VIEW_H,
    dataUrl: KANDA_SPOTS_DATA_URL,
    seaBgClass: 'kanda-sea-bg',
  },
  '40625': {
    name: 'みやこ町', nameEn: 'Miyako Town', prefId: '40',
    crop: MIYAKO_CROP, viewW: MIYAKO_VIEW_W, viewH: MIYAKO_VIEW_H,
    dataUrl: MIYAKO_SPOTS_DATA_URL,
    seaBgClass: 'miyako-sea-bg',
  },
  '40642': {
    name: '吉富町', nameEn: 'Yoshitomi Town', prefId: '40',
    crop: YOSHITOMI_CROP, viewW: YOSHITOMI_VIEW_W, viewH: YOSHITOMI_VIEW_H,
    dataUrl: YOSHITOMI_SPOTS_DATA_URL,
    seaBgClass: 'yoshitomi-sea-bg',
  },
  '40646': {
    name: '上毛町', nameEn: 'Koge Town', prefId: '40',
    crop: KOGE_CROP, viewW: KOGE_VIEW_W, viewH: KOGE_VIEW_H,
    dataUrl: KOGE_SPOTS_DATA_URL,
    seaBgClass: 'koge-sea-bg',
  },
  '40647': {
    name: '築上町', nameEn: 'Chikujo Town', prefId: '40',
    crop: CHIKUJO_CROP, viewW: CHIKUJO_VIEW_W, viewH: CHIKUJO_VIEW_H,
    dataUrl: CHIKUJO_SPOTS_DATA_URL,
    seaBgClass: 'chikujo-sea-bg',
  },
  '44201': {
    name: '大分市', nameEn: 'Oita City', prefId: '44',
    crop: OITA_CITY_CROP, viewW: OITA_CITY_VIEW_W, viewH: OITA_CITY_VIEW_H,
    dataUrl: OITA_CITY_SPOTS_DATA_URL,
    seaBgClass: 'oitacity-sea-bg',
  },
  '44202': {
    name: '別府市', nameEn: 'Beppu City', prefId: '44',
    crop: BEPPU_CROP, viewW: BEPPU_VIEW_W, viewH: BEPPU_VIEW_H,
    dataUrl: BEPPU_SPOTS_DATA_URL,
    seaBgClass: 'beppu-sea-bg',
  },
  '44203': {
    name: '中津市', nameEn: 'Nakatsu City', prefId: '44',
    crop: NAKATSU_CROP, viewW: NAKATSU_VIEW_W, viewH: NAKATSU_VIEW_H,
    dataUrl: NAKATSU_SPOTS_DATA_URL,
    seaBgClass: 'nakatsu-sea-bg',
  },
  '44204': {
    name: '日田市', nameEn: 'Hita City', prefId: '44',
    crop: HITA_CROP, viewW: HITA_VIEW_W, viewH: HITA_VIEW_H,
    dataUrl: HITA_SPOTS_DATA_URL,
    seaBgClass: 'hita-sea-bg',
  },
  '44205': {
    name: '佐伯市', nameEn: 'Saiki City', prefId: '44',
    crop: SAIKI_CROP, viewW: SAIKI_VIEW_W, viewH: SAIKI_VIEW_H,
    dataUrl: SAIKI_SPOTS_DATA_URL,
    seaBgClass: 'saiki-sea-bg',
  },
  '44206': {
    name: '臼杵市', nameEn: 'Usuki City', prefId: '44',
    crop: USUKI_CROP, viewW: USUKI_VIEW_W, viewH: USUKI_VIEW_H,
    dataUrl: USUKI_SPOTS_DATA_URL,
    seaBgClass: 'usuki-sea-bg',
  },
  '44207': {
    name: '津久見市', nameEn: 'Tsukumi City', prefId: '44',
    crop: TSUKUMI_CROP, viewW: TSUKUMI_VIEW_W, viewH: TSUKUMI_VIEW_H,
    dataUrl: TSUKUMI_SPOTS_DATA_URL,
    seaBgClass: 'tsukumi-sea-bg',
  },
  '44208': {
    name: '竹田市', nameEn: 'Taketa City', prefId: '44',
    crop: TAKETA_CROP, viewW: TAKETA_VIEW_W, viewH: TAKETA_VIEW_H,
    dataUrl: TAKETA_SPOTS_DATA_URL,
    seaBgClass: 'taketa-sea-bg',
  },
  '44209': {
    name: '豊後高田市', nameEn: 'Bungotakada City', prefId: '44',
    crop: BUNGOTAKADA_CROP, viewW: BUNGOTAKADA_VIEW_W, viewH: BUNGOTAKADA_VIEW_H,
    dataUrl: BUNGOTAKADA_SPOTS_DATA_URL,
    seaBgClass: 'bungotakada-sea-bg',
  },
  '44210': {
    name: '杵築市', nameEn: 'Kitsuki City', prefId: '44',
    crop: KITSUKI_CROP, viewW: KITSUKI_VIEW_W, viewH: KITSUKI_VIEW_H,
    dataUrl: KITSUKI_SPOTS_DATA_URL,
    seaBgClass: 'kitsuki-sea-bg',
  },
  '44211': {
    name: '宇佐市', nameEn: 'Usa City', prefId: '44',
    crop: USA_CROP, viewW: USA_VIEW_W, viewH: USA_VIEW_H,
    dataUrl: USA_SPOTS_DATA_URL,
    seaBgClass: 'usa-sea-bg',
  },
  '44212': {
    name: '豊後大野市', nameEn: 'Bungoono City', prefId: '44',
    crop: BUNGOONO_CROP, viewW: BUNGOONO_VIEW_W, viewH: BUNGOONO_VIEW_H,
    dataUrl: BUNGOONO_SPOTS_DATA_URL,
    seaBgClass: 'bungoono-sea-bg',
  },
  '44213': {
    name: '由布市', nameEn: 'Yufu City', prefId: '44',
    crop: YUFU_CROP, viewW: YUFU_VIEW_W, viewH: YUFU_VIEW_H,
    dataUrl: YUFU_SPOTS_DATA_URL,
    seaBgClass: 'yufu-sea-bg',
  },
  '44214': {
    name: '国東市', nameEn: 'Kunisaki City', prefId: '44',
    crop: KUNISAKI_CROP, viewW: KUNISAKI_VIEW_W, viewH: KUNISAKI_VIEW_H,
    dataUrl: KUNISAKI_SPOTS_DATA_URL,
    seaBgClass: 'kunisaki-sea-bg',
  },
  '44322': {
    name: '姫島村', nameEn: 'Himeshima Village', prefId: '44',
    crop: HIMESHIMA_CROP, viewW: HIMESHIMA_VIEW_W, viewH: HIMESHIMA_VIEW_H,
    dataUrl: HIMESHIMA_SPOTS_DATA_URL,
    seaBgClass: 'himeshima-sea-bg',
  },
  '44341': {
    name: '日出町', nameEn: 'Hiji Town', prefId: '44',
    crop: HIJI_CROP, viewW: HIJI_VIEW_W, viewH: HIJI_VIEW_H,
    dataUrl: HIJI_SPOTS_DATA_URL,
    seaBgClass: 'hiji-sea-bg',
  },
  '44461': {
    name: '九重町', nameEn: 'Kokonoe Town', prefId: '44',
    crop: KOKONOE_CROP, viewW: KOKONOE_VIEW_W, viewH: KOKONOE_VIEW_H,
    dataUrl: KOKONOE_SPOTS_DATA_URL,
    seaBgClass: 'kokonoe-sea-bg',
  },
  '44462': {
    name: '玖珠町', nameEn: 'Kusu Town', prefId: '44',
    crop: KUSU_CROP, viewW: KUSU_VIEW_W, viewH: KUSU_VIEW_H,
    dataUrl: KUSU_SPOTS_DATA_URL,
    seaBgClass: 'kusu-sea-bg',
  },
  '43100': {
    name: '熊本市', nameEn: 'Kumamoto City', prefId: '43',
    crop: KUMAMOTO_CITY_CROP, viewW: KUMAMOTO_CITY_VIEW_W, viewH: KUMAMOTO_CITY_VIEW_H,
    dataUrl: KUMAMOTO_CITY_SPOTS_DATA_URL,
    seaBgClass: 'kumamotocity-sea-bg',
  },
  '43202': {
    name: '八代市', nameEn: 'Yatsushiro City', prefId: '43',
    crop: YATSUSHIRO_CROP, viewW: YATSUSHIRO_VIEW_W, viewH: YATSUSHIRO_VIEW_H,
    dataUrl: YATSUSHIRO_SPOTS_DATA_URL,
    seaBgClass: 'yatsushiro-sea-bg',
  },
  '43203': {
    name: '人吉市', nameEn: 'Hitoyoshi City', prefId: '43',
    crop: HITOYOSHI_CROP, viewW: HITOYOSHI_VIEW_W, viewH: HITOYOSHI_VIEW_H,
    dataUrl: HITOYOSHI_SPOTS_DATA_URL,
    seaBgClass: 'hitoyoshi-sea-bg',
  },
  '43204': {
    name: '荒尾市', nameEn: 'Arao City', prefId: '43',
    crop: ARAO_CROP, viewW: ARAO_VIEW_W, viewH: ARAO_VIEW_H,
    dataUrl: ARAO_SPOTS_DATA_URL,
    seaBgClass: 'arao-sea-bg',
  },
  '43205': {
    name: '水俣市', nameEn: 'Minamata City', prefId: '43',
    crop: MINAMATA_CROP, viewW: MINAMATA_VIEW_W, viewH: MINAMATA_VIEW_H,
    dataUrl: MINAMATA_SPOTS_DATA_URL,
    seaBgClass: 'minamata-sea-bg',
  },
  '43206': {
    name: '玉名市', nameEn: 'Tamana City', prefId: '43',
    crop: TAMANA_CROP, viewW: TAMANA_VIEW_W, viewH: TAMANA_VIEW_H,
    dataUrl: TAMANA_SPOTS_DATA_URL,
    seaBgClass: 'tamana-sea-bg',
  },
  '43208': {
    name: '山鹿市', nameEn: 'Yamaga City', prefId: '43',
    crop: YAMAGA_CROP, viewW: YAMAGA_VIEW_W, viewH: YAMAGA_VIEW_H,
    dataUrl: YAMAGA_SPOTS_DATA_URL,
    seaBgClass: 'yamaga-sea-bg',
  },
  '43210': {
    name: '菊池市', nameEn: 'Kikuchi City', prefId: '43',
    crop: KIKUCHI_CROP, viewW: KIKUCHI_VIEW_W, viewH: KIKUCHI_VIEW_H,
    dataUrl: KIKUCHI_SPOTS_DATA_URL,
    seaBgClass: 'kikuchi-sea-bg',
  },
  '43211': {
    name: '宇土市', nameEn: 'Uto City', prefId: '43',
    crop: UTO_CROP, viewW: UTO_VIEW_W, viewH: UTO_VIEW_H,
    dataUrl: UTO_SPOTS_DATA_URL,
    seaBgClass: 'uto-sea-bg',
  },
  '43212': {
    name: '上天草市', nameEn: 'Kamiamakusa City', prefId: '43',
    crop: KAMIAMAKUSA_CROP, viewW: KAMIAMAKUSA_VIEW_W, viewH: KAMIAMAKUSA_VIEW_H,
    dataUrl: KAMIAMAKUSA_SPOTS_DATA_URL,
    seaBgClass: 'kamiamakusa-sea-bg',
  },
  '43213': {
    name: '宇城市', nameEn: 'Uki City', prefId: '43',
    crop: UKI_CROP, viewW: UKI_VIEW_W, viewH: UKI_VIEW_H,
    dataUrl: UKI_SPOTS_DATA_URL,
    seaBgClass: 'uki-sea-bg',
  },
  '43214': {
    name: '阿蘇市', nameEn: 'Aso City', prefId: '43',
    crop: ASO_CROP, viewW: ASO_VIEW_W, viewH: ASO_VIEW_H,
    dataUrl: ASO_SPOTS_DATA_URL,
    seaBgClass: 'aso-sea-bg',
  },
  '43215': {
    name: '天草市', nameEn: 'Amakusa City', prefId: '43',
    crop: AMAKUSA_CROP, viewW: AMAKUSA_VIEW_W, viewH: AMAKUSA_VIEW_H,
    dataUrl: AMAKUSA_SPOTS_DATA_URL,
    seaBgClass: 'amakusa-sea-bg',
  },
  '43216': {
    name: '合志市', nameEn: 'Koshi City', prefId: '43',
    crop: KOSHI_CROP, viewW: KOSHI_VIEW_W, viewH: KOSHI_VIEW_H,
    dataUrl: KOSHI_SPOTS_DATA_URL,
    seaBgClass: 'koshi-sea-bg',
  },
  '43348': {
    name: '美里町', nameEn: 'Misato Town', prefId: '43',
    crop: MISATO_CROP, viewW: MISATO_VIEW_W, viewH: MISATO_VIEW_H,
    dataUrl: MISATO_SPOTS_DATA_URL,
    seaBgClass: 'misato-sea-bg',
  },
  '43364': {
    name: '玉東町', nameEn: 'Gyokuto Town', prefId: '43',
    crop: GYOKUTO_CROP, viewW: GYOKUTO_VIEW_W, viewH: GYOKUTO_VIEW_H,
    dataUrl: GYOKUTO_SPOTS_DATA_URL,
    seaBgClass: 'gyokuto-sea-bg',
  },
  '43367': {
    name: '南関町', nameEn: 'Nankan Town', prefId: '43',
    crop: NANKAN_CROP, viewW: NANKAN_VIEW_W, viewH: NANKAN_VIEW_H,
    dataUrl: NANKAN_SPOTS_DATA_URL,
    seaBgClass: 'nankan-sea-bg',
  },
  '43368': {
    name: '長洲町', nameEn: 'Nagasu Town', prefId: '43',
    crop: NAGASU_CROP, viewW: NAGASU_VIEW_W, viewH: NAGASU_VIEW_H,
    dataUrl: NAGASU_SPOTS_DATA_URL,
    seaBgClass: 'nagasu-sea-bg',
  },
  '43369': {
    name: '和水町', nameEn: 'Nagomi Town', prefId: '43',
    crop: NAGOMI_CROP, viewW: NAGOMI_VIEW_W, viewH: NAGOMI_VIEW_H,
    dataUrl: NAGOMI_SPOTS_DATA_URL,
    seaBgClass: 'nagomi-sea-bg',
  },
  '43403': {
    name: '大津町', nameEn: 'Ozu Town', prefId: '43',
    crop: OZU_CROP, viewW: OZU_VIEW_W, viewH: OZU_VIEW_H,
    dataUrl: OZU_SPOTS_DATA_URL,
    seaBgClass: 'ozu-sea-bg',
  },
  '43404': {
    name: '菊陽町', nameEn: 'Kikuyo Town', prefId: '43',
    crop: KIKUYO_CROP, viewW: KIKUYO_VIEW_W, viewH: KIKUYO_VIEW_H,
    dataUrl: KIKUYO_SPOTS_DATA_URL,
    seaBgClass: 'kikuyo-sea-bg',
  },
  '43423': {
    name: '南小国町', nameEn: 'Minamioguni Town', prefId: '43',
    crop: MINAMIOGUNI_CROP, viewW: MINAMIOGUNI_VIEW_W, viewH: MINAMIOGUNI_VIEW_H,
    dataUrl: MINAMIOGUNI_SPOTS_DATA_URL,
    seaBgClass: 'minamioguni-sea-bg',
  },
  '43424': {
    name: '小国町', nameEn: 'Oguni Town', prefId: '43',
    crop: OGUNI_CROP, viewW: OGUNI_VIEW_W, viewH: OGUNI_VIEW_H,
    dataUrl: OGUNI_SPOTS_DATA_URL,
    seaBgClass: 'oguni-sea-bg',
  },
  '43425': {
    name: '産山村', nameEn: 'Ubuyama Village', prefId: '43',
    crop: UBUYAMA_CROP, viewW: UBUYAMA_VIEW_W, viewH: UBUYAMA_VIEW_H,
    dataUrl: UBUYAMA_SPOTS_DATA_URL,
    seaBgClass: 'ubuyama-sea-bg',
  },
  '43428': {
    name: '高森町', nameEn: 'Takamori Town', prefId: '43',
    crop: TAKAMORI_CROP, viewW: TAKAMORI_VIEW_W, viewH: TAKAMORI_VIEW_H,
    dataUrl: TAKAMORI_SPOTS_DATA_URL,
    seaBgClass: 'takamori-sea-bg',
  },
  '43432': {
    name: '西原村', nameEn: 'Nishihara Village', prefId: '43',
    crop: NISHIHARA_CROP, viewW: NISHIHARA_VIEW_W, viewH: NISHIHARA_VIEW_H,
    dataUrl: NISHIHARA_SPOTS_DATA_URL,
    seaBgClass: 'nishihara-sea-bg',
  },
  '43433': {
    name: '南阿蘇村', nameEn: 'Minamiaso Village', prefId: '43',
    crop: MINAMIASO_CROP, viewW: MINAMIASO_VIEW_W, viewH: MINAMIASO_VIEW_H,
    dataUrl: MINAMIASO_SPOTS_DATA_URL,
    seaBgClass: 'minamiaso-sea-bg',
  },
  '43441': {
    name: '御船町', nameEn: 'Mifune Town', prefId: '43',
    crop: MIFUNE_CROP, viewW: MIFUNE_VIEW_W, viewH: MIFUNE_VIEW_H,
    dataUrl: MIFUNE_SPOTS_DATA_URL,
    seaBgClass: 'mifune-sea-bg',
  },
  '43442': {
    name: '嘉島町', nameEn: 'Kashima Town', prefId: '43',
    crop: KASHIMA_TOWN_CROP, viewW: KASHIMA_TOWN_VIEW_W, viewH: KASHIMA_TOWN_VIEW_H,
    dataUrl: KASHIMA_TOWN_SPOTS_DATA_URL,
    seaBgClass: 'kashimatown-sea-bg',
  },
  '43443': {
    name: '益城町', nameEn: 'Mashiki Town', prefId: '43',
    crop: MASHIKI_CROP, viewW: MASHIKI_VIEW_W, viewH: MASHIKI_VIEW_H,
    dataUrl: MASHIKI_SPOTS_DATA_URL,
    seaBgClass: 'mashiki-sea-bg',
  },
  '43444': {
    name: '甲佐町', nameEn: 'Kosa Town', prefId: '43',
    crop: KOSA_CROP, viewW: KOSA_VIEW_W, viewH: KOSA_VIEW_H,
    dataUrl: KOSA_SPOTS_DATA_URL,
    seaBgClass: 'kosa-sea-bg',
  },
  '43447': {
    name: '山都町', nameEn: 'Yamato Town', prefId: '43',
    crop: YAMATO_CROP, viewW: YAMATO_VIEW_W, viewH: YAMATO_VIEW_H,
    dataUrl: YAMATO_SPOTS_DATA_URL,
    seaBgClass: 'yamato-sea-bg',
  },
  '43468': {
    name: '氷川町', nameEn: 'Hikawa Town', prefId: '43',
    crop: HIKAWA_CROP, viewW: HIKAWA_VIEW_W, viewH: HIKAWA_VIEW_H,
    dataUrl: HIKAWA_SPOTS_DATA_URL,
    seaBgClass: 'hikawa-sea-bg',
  },
  '43482': {
    name: '芦北町', nameEn: 'Ashikita Town', prefId: '43',
    crop: ASHIKITA_CROP, viewW: ASHIKITA_VIEW_W, viewH: ASHIKITA_VIEW_H,
    dataUrl: ASHIKITA_SPOTS_DATA_URL,
    seaBgClass: 'ashikita-sea-bg',
  },
  '43484': {
    name: '津奈木町', nameEn: 'Tsunagi Town', prefId: '43',
    crop: TSUNAGI_CROP, viewW: TSUNAGI_VIEW_W, viewH: TSUNAGI_VIEW_H,
    dataUrl: TSUNAGI_SPOTS_DATA_URL,
    seaBgClass: 'tsunagi-sea-bg',
  },
  '43501': {
    name: '錦町', nameEn: 'Nishiki Town', prefId: '43',
    crop: NISHIKI_CROP, viewW: NISHIKI_VIEW_W, viewH: NISHIKI_VIEW_H,
    dataUrl: NISHIKI_SPOTS_DATA_URL,
    seaBgClass: 'nishiki-sea-bg',
  },
  '43505': {
    name: '多良木町', nameEn: 'Taragi Town', prefId: '43',
    crop: TARAGI_CROP, viewW: TARAGI_VIEW_W, viewH: TARAGI_VIEW_H,
    dataUrl: TARAGI_SPOTS_DATA_URL,
    seaBgClass: 'taragi-sea-bg',
  },
  '43506': {
    name: '湯前町', nameEn: 'Yunomae Town', prefId: '43',
    crop: YUNOMAE_CROP, viewW: YUNOMAE_VIEW_W, viewH: YUNOMAE_VIEW_H,
    dataUrl: YUNOMAE_SPOTS_DATA_URL,
    seaBgClass: 'yunomae-sea-bg',
  },
  '43507': {
    name: '水上村', nameEn: 'Mizukami Village', prefId: '43',
    crop: MIZUKAMI_CROP, viewW: MIZUKAMI_VIEW_W, viewH: MIZUKAMI_VIEW_H,
    dataUrl: MIZUKAMI_SPOTS_DATA_URL,
    seaBgClass: 'mizukami-sea-bg',
  },
  '43510': {
    name: '相良村', nameEn: 'Sagara Village', prefId: '43',
    crop: SAGARA_CROP, viewW: SAGARA_VIEW_W, viewH: SAGARA_VIEW_H,
    dataUrl: SAGARA_SPOTS_DATA_URL,
    seaBgClass: 'sagara-sea-bg',
  },
  '43511': {
    name: '五木村', nameEn: 'Itsuki Village', prefId: '43',
    crop: ITSUKI_CROP, viewW: ITSUKI_VIEW_W, viewH: ITSUKI_VIEW_H,
    dataUrl: ITSUKI_SPOTS_DATA_URL,
    seaBgClass: 'itsuki-sea-bg',
  },
  '43512': {
    name: '山江村', nameEn: 'Yamae Village', prefId: '43',
    crop: YAMAE_CROP, viewW: YAMAE_VIEW_W, viewH: YAMAE_VIEW_H,
    dataUrl: YAMAE_SPOTS_DATA_URL,
    seaBgClass: 'yamae-sea-bg',
  },
  '43513': {
    name: '球磨村', nameEn: 'Kuma Village', prefId: '43',
    crop: KUMA_VILLAGE_CROP, viewW: KUMA_VILLAGE_VIEW_W, viewH: KUMA_VILLAGE_VIEW_H,
    dataUrl: KUMA_VILLAGE_SPOTS_DATA_URL,
    seaBgClass: 'kumavillage-sea-bg',
  },
  '43514': {
    name: 'あさぎり町', nameEn: 'Asagiri Town', prefId: '43',
    crop: ASAGIRI_CROP, viewW: ASAGIRI_VIEW_W, viewH: ASAGIRI_VIEW_H,
    dataUrl: ASAGIRI_SPOTS_DATA_URL,
    seaBgClass: 'asagiri-sea-bg',
  },
  '43531': {
    name: '苓北町', nameEn: 'Reihoku Town', prefId: '43',
    crop: REIHOKU_CROP, viewW: REIHOKU_VIEW_W, viewH: REIHOKU_VIEW_H,
    dataUrl: REIHOKU_SPOTS_DATA_URL,
    seaBgClass: 'reihoku-sea-bg',
  },
  '45201': {
    name: '宮崎市', nameEn: 'Miyazaki City', prefId: '45',
    crop: MIYAZAKI_CITY_CROP, viewW: MIYAZAKI_CITY_VIEW_W, viewH: MIYAZAKI_CITY_VIEW_H,
    dataUrl: MIYAZAKI_CITY_SPOTS_DATA_URL,
    seaBgClass: 'miyazakicity-sea-bg',
  },
  '45202': {
    name: '都城市', nameEn: 'Miyakonojo City', prefId: '45',
    crop: MIYAKONOJO_CROP, viewW: MIYAKONOJO_VIEW_W, viewH: MIYAKONOJO_VIEW_H,
    dataUrl: MIYAKONOJO_SPOTS_DATA_URL,
    seaBgClass: 'miyakonojo-sea-bg',
  },
  '45203': {
    name: '延岡市', nameEn: 'Nobeoka City', prefId: '45',
    crop: NOBEOKA_CROP, viewW: NOBEOKA_VIEW_W, viewH: NOBEOKA_VIEW_H,
    dataUrl: NOBEOKA_SPOTS_DATA_URL,
    seaBgClass: 'nobeoka-sea-bg',
  },
  '45204': {
    name: '日南市', nameEn: 'Nichinan City', prefId: '45',
    crop: NICHINAN_CROP, viewW: NICHINAN_VIEW_W, viewH: NICHINAN_VIEW_H,
    dataUrl: NICHINAN_SPOTS_DATA_URL,
    seaBgClass: 'nichinan-sea-bg',
  },
  '45205': {
    name: '小林市', nameEn: 'Kobayashi City', prefId: '45',
    crop: KOBAYASHI_CROP, viewW: KOBAYASHI_VIEW_W, viewH: KOBAYASHI_VIEW_H,
    dataUrl: KOBAYASHI_SPOTS_DATA_URL,
    seaBgClass: 'kobayashi-sea-bg',
  },
  '45206': {
    name: '日向市', nameEn: 'Hyuga City', prefId: '45',
    crop: HYUGA_CROP, viewW: HYUGA_VIEW_W, viewH: HYUGA_VIEW_H,
    dataUrl: HYUGA_SPOTS_DATA_URL,
    seaBgClass: 'hyuga-sea-bg',
  },
  '45207': {
    name: '串間市', nameEn: 'Kushima City', prefId: '45',
    crop: KUSHIMA_CROP, viewW: KUSHIMA_VIEW_W, viewH: KUSHIMA_VIEW_H,
    dataUrl: KUSHIMA_SPOTS_DATA_URL,
    seaBgClass: 'kushima-sea-bg',
  },
  '45208': {
    name: '西都市', nameEn: 'Saito City', prefId: '45',
    crop: SAITO_CROP, viewW: SAITO_VIEW_W, viewH: SAITO_VIEW_H,
    dataUrl: SAITO_SPOTS_DATA_URL,
    seaBgClass: 'saito-sea-bg',
  },
  '45209': {
    name: 'えびの市', nameEn: 'Ebino City', prefId: '45',
    crop: EBINO_CROP, viewW: EBINO_VIEW_W, viewH: EBINO_VIEW_H,
    dataUrl: EBINO_SPOTS_DATA_URL,
    seaBgClass: 'ebino-sea-bg',
  },
  '45341': {
    name: '三股町', nameEn: 'Mimata Town', prefId: '45',
    crop: MIMATA_CROP, viewW: MIMATA_VIEW_W, viewH: MIMATA_VIEW_H,
    dataUrl: MIMATA_SPOTS_DATA_URL,
    seaBgClass: 'mimata-sea-bg',
  },
  '45361': {
    name: '高原町', nameEn: 'Takaharu Town', prefId: '45',
    crop: TAKAHARU_CROP, viewW: TAKAHARU_VIEW_W, viewH: TAKAHARU_VIEW_H,
    dataUrl: TAKAHARU_SPOTS_DATA_URL,
    seaBgClass: 'takaharu-sea-bg',
  },
  '45382': {
    name: '国富町', nameEn: 'Kunitomi Town', prefId: '45',
    crop: KUNITOMI_CROP, viewW: KUNITOMI_VIEW_W, viewH: KUNITOMI_VIEW_H,
    dataUrl: KUNITOMI_SPOTS_DATA_URL,
    seaBgClass: 'kunitomi-sea-bg',
  },
  '45383': {
    name: '綾町', nameEn: 'Aya Town', prefId: '45',
    crop: AYA_CROP, viewW: AYA_VIEW_W, viewH: AYA_VIEW_H,
    dataUrl: AYA_SPOTS_DATA_URL,
    seaBgClass: 'aya-sea-bg',
  },
  '45401': {
    name: '高鍋町', nameEn: 'Takanabe Town', prefId: '45',
    crop: TAKANABE_CROP, viewW: TAKANABE_VIEW_W, viewH: TAKANABE_VIEW_H,
    dataUrl: TAKANABE_SPOTS_DATA_URL,
    seaBgClass: 'takanabe-sea-bg',
  },
  '45402': {
    name: '新富町', nameEn: 'Shintomi Town', prefId: '45',
    crop: SHINTOMI_CROP, viewW: SHINTOMI_VIEW_W, viewH: SHINTOMI_VIEW_H,
    dataUrl: SHINTOMI_SPOTS_DATA_URL,
    seaBgClass: 'shintomi-sea-bg',
  },
  '45403': {
    name: '西米良村', nameEn: 'Nishimera Village', prefId: '45',
    crop: NISHIMERA_CROP, viewW: NISHIMERA_VIEW_W, viewH: NISHIMERA_VIEW_H,
    dataUrl: NISHIMERA_SPOTS_DATA_URL,
    seaBgClass: 'nishimera-sea-bg',
  },
  '45404': {
    name: '木城町', nameEn: 'Kijo Town', prefId: '45',
    crop: KIJO_CROP, viewW: KIJO_VIEW_W, viewH: KIJO_VIEW_H,
    dataUrl: KIJO_SPOTS_DATA_URL,
    seaBgClass: 'kijo-sea-bg',
  },
  '45405': {
    name: '川南町', nameEn: 'Kawaminami Town', prefId: '45',
    crop: KAWAMINAMI_CROP, viewW: KAWAMINAMI_VIEW_W, viewH: KAWAMINAMI_VIEW_H,
    dataUrl: KAWAMINAMI_SPOTS_DATA_URL,
    seaBgClass: 'kawaminami-sea-bg',
  },
  '45406': {
    name: '都農町', nameEn: 'Tsuno Town', prefId: '45',
    crop: TSUNO_CROP, viewW: TSUNO_VIEW_W, viewH: TSUNO_VIEW_H,
    dataUrl: TSUNO_SPOTS_DATA_URL,
    seaBgClass: 'tsuno-sea-bg',
  },
  '45421': {
    name: '門川町', nameEn: 'Kadogawa Town', prefId: '45',
    crop: KADOGAWA_CROP, viewW: KADOGAWA_VIEW_W, viewH: KADOGAWA_VIEW_H,
    dataUrl: KADOGAWA_SPOTS_DATA_URL,
    seaBgClass: 'kadogawa-sea-bg',
  },
  '45429': {
    name: '諸塚村', nameEn: 'Morotsuka Village', prefId: '45',
    crop: MOROTSUKA_CROP, viewW: MOROTSUKA_VIEW_W, viewH: MOROTSUKA_VIEW_H,
    dataUrl: MOROTSUKA_SPOTS_DATA_URL,
    seaBgClass: 'morotsuka-sea-bg',
  },
  '45430': {
    name: '椎葉村', nameEn: 'Shiiba Village', prefId: '45',
    crop: SHIIBA_CROP, viewW: SHIIBA_VIEW_W, viewH: SHIIBA_VIEW_H,
    dataUrl: SHIIBA_SPOTS_DATA_URL,
    seaBgClass: 'shiiba-sea-bg',
  },
  '45431': {
    name: '美郷町', nameEn: 'Misato Town', prefId: '45',
    crop: MISATO_TOWN_CROP, viewW: MISATO_TOWN_VIEW_W, viewH: MISATO_TOWN_VIEW_H,
    dataUrl: MISATO_TOWN_SPOTS_DATA_URL,
    seaBgClass: 'misatotown-sea-bg',
  },
  '45441': {
    name: '高千穂町', nameEn: 'Takachiho Town', prefId: '45',
    crop: TAKACHIHO_CROP, viewW: TAKACHIHO_VIEW_W, viewH: TAKACHIHO_VIEW_H,
    dataUrl: TAKACHIHO_SPOTS_DATA_URL,
    seaBgClass: 'takachiho-sea-bg',
  },
  '45442': {
    name: '日之影町', nameEn: 'Hinokage Town', prefId: '45',
    crop: HINOKAGE_CROP, viewW: HINOKAGE_VIEW_W, viewH: HINOKAGE_VIEW_H,
    dataUrl: HINOKAGE_SPOTS_DATA_URL,
    seaBgClass: 'hinokage-sea-bg',
  },
  '45443': {
    name: '五ヶ瀬町', nameEn: 'Gokase Town', prefId: '45',
    crop: GOKASE_CROP, viewW: GOKASE_VIEW_W, viewH: GOKASE_VIEW_H,
    dataUrl: GOKASE_SPOTS_DATA_URL,
    seaBgClass: 'gokase-sea-bg',
  },
  '46201': {
    name: '鹿児島市', nameEn: 'Kagoshima City', prefId: '46',
    crop: KAGOSHIMA_CITY_CROP, viewW: KAGOSHIMA_CITY_VIEW_W, viewH: KAGOSHIMA_CITY_VIEW_H,
    dataUrl: KAGOSHIMA_CITY_SPOTS_DATA_URL,
    seaBgClass: 'kagoshimacity-sea-bg',
  },
  '46203': {
    name: '鹿屋市', nameEn: 'Kanoya City', prefId: '46',
    crop: KANOYA_CROP, viewW: KANOYA_VIEW_W, viewH: KANOYA_VIEW_H,
    dataUrl: KANOYA_SPOTS_DATA_URL,
    seaBgClass: 'kanoya-sea-bg',
  },
  '46204': {
    name: '枕崎市', nameEn: 'Makurazaki City', prefId: '46',
    crop: MAKURAZAKI_CROP, viewW: MAKURAZAKI_VIEW_W, viewH: MAKURAZAKI_VIEW_H,
    dataUrl: MAKURAZAKI_SPOTS_DATA_URL,
    seaBgClass: 'makurazaki-sea-bg',
  },
  '46206': {
    name: '阿久根市', nameEn: 'Akune City', prefId: '46',
    crop: AKUNE_CROP, viewW: AKUNE_VIEW_W, viewH: AKUNE_VIEW_H,
    dataUrl: AKUNE_SPOTS_DATA_URL,
    seaBgClass: 'akune-sea-bg',
  },
  '46208': {
    name: '出水市', nameEn: 'Izumi City', prefId: '46',
    crop: IZUMI_CROP, viewW: IZUMI_VIEW_W, viewH: IZUMI_VIEW_H,
    dataUrl: IZUMI_SPOTS_DATA_URL,
    seaBgClass: 'izumi-sea-bg',
  },
  '46210': {
    name: '指宿市', nameEn: 'Ibusuki City', prefId: '46',
    crop: IBUSUKI_CROP, viewW: IBUSUKI_VIEW_W, viewH: IBUSUKI_VIEW_H,
    dataUrl: IBUSUKI_SPOTS_DATA_URL,
    seaBgClass: 'ibusuki-sea-bg',
  },
  '46213': {
    name: '西之表市', nameEn: 'Nishinoomote City', prefId: '46',
    crop: NISHINOOMOTE_CROP, viewW: NISHINOOMOTE_VIEW_W, viewH: NISHINOOMOTE_VIEW_H,
    dataUrl: NISHINOOMOTE_SPOTS_DATA_URL,
    seaBgClass: 'nishinoomote-sea-bg',
  },
  '46214': {
    name: '垂水市', nameEn: 'Tarumizu City', prefId: '46',
    crop: TARUMIZU_CROP, viewW: TARUMIZU_VIEW_W, viewH: TARUMIZU_VIEW_H,
    dataUrl: TARUMIZU_SPOTS_DATA_URL,
    seaBgClass: 'tarumizu-sea-bg',
  },
  '46215': {
    name: '薩摩川内市', nameEn: 'Satsumasendai City', prefId: '46',
    crop: SATSUMASENDAI_CROP, viewW: SATSUMASENDAI_VIEW_W, viewH: SATSUMASENDAI_VIEW_H,
    dataUrl: SATSUMASENDAI_SPOTS_DATA_URL,
    seaBgClass: 'satsumasendai-sea-bg',
  },
  '46216': {
    name: '日置市', nameEn: 'Hioki City', prefId: '46',
    crop: HIOKI_CROP, viewW: HIOKI_VIEW_W, viewH: HIOKI_VIEW_H,
    dataUrl: HIOKI_SPOTS_DATA_URL,
    seaBgClass: 'hioki-sea-bg',
  },
  '46217': {
    name: '曽於市', nameEn: 'Soo City', prefId: '46',
    crop: SOO_CROP, viewW: SOO_VIEW_W, viewH: SOO_VIEW_H,
    dataUrl: SOO_SPOTS_DATA_URL,
    seaBgClass: 'soo-sea-bg',
  },
  '46218': {
    name: '霧島市', nameEn: 'Kirishima City', prefId: '46',
    crop: KIRISHIMA_CROP, viewW: KIRISHIMA_VIEW_W, viewH: KIRISHIMA_VIEW_H,
    dataUrl: KIRISHIMA_SPOTS_DATA_URL,
    seaBgClass: 'kirishima-sea-bg',
  },
  '46219': {
    name: 'いちき串木野市', nameEn: 'Ichikikushikino City', prefId: '46',
    crop: ICHIKIKUSHIKINO_CROP, viewW: ICHIKIKUSHIKINO_VIEW_W, viewH: ICHIKIKUSHIKINO_VIEW_H,
    dataUrl: ICHIKIKUSHIKINO_SPOTS_DATA_URL,
    seaBgClass: 'ichikikushikino-sea-bg',
  },
  '46220': {
    name: '南さつま市', nameEn: 'Minamisatsuma City', prefId: '46',
    crop: MINAMISATSUMA_CROP, viewW: MINAMISATSUMA_VIEW_W, viewH: MINAMISATSUMA_VIEW_H,
    dataUrl: MINAMISATSUMA_SPOTS_DATA_URL,
    seaBgClass: 'minamisatsuma-sea-bg',
  },
  '46221': {
    name: '志布志市', nameEn: 'Shibushi City', prefId: '46',
    crop: SHIBUSHI_CROP, viewW: SHIBUSHI_VIEW_W, viewH: SHIBUSHI_VIEW_H,
    dataUrl: SHIBUSHI_SPOTS_DATA_URL,
    seaBgClass: 'shibushi-sea-bg',
  },
  '46223': {
    name: '南九州市', nameEn: 'Minamikyushu City', prefId: '46',
    crop: MINAMIKYUSHU_CROP, viewW: MINAMIKYUSHU_VIEW_W, viewH: MINAMIKYUSHU_VIEW_H,
    dataUrl: MINAMIKYUSHU_SPOTS_DATA_URL,
    seaBgClass: 'minamikyushu-sea-bg',
  },
  '46224': {
    name: '伊佐市', nameEn: 'Isa City', prefId: '46',
    crop: ISA_CROP, viewW: ISA_VIEW_W, viewH: ISA_VIEW_H,
    dataUrl: ISA_SPOTS_DATA_URL,
    seaBgClass: 'isa-sea-bg',
  },
  '46225': {
    name: '姶良市', nameEn: 'Aira City', prefId: '46',
    crop: AIRA_CROP, viewW: AIRA_VIEW_W, viewH: AIRA_VIEW_H,
    dataUrl: AIRA_SPOTS_DATA_URL,
    seaBgClass: 'aira-sea-bg',
  },
  '46303': {
    name: '三島村', nameEn: 'Mishima Village', prefId: '46',
    crop: MISHIMA_CROP, viewW: MISHIMA_VIEW_W, viewH: MISHIMA_VIEW_H,
    dataUrl: MISHIMA_SPOTS_DATA_URL,
    seaBgClass: 'mishima-sea-bg',
  },
  '46392': {
    name: 'さつま町', nameEn: 'Satsuma Town', prefId: '46',
    crop: SATSUMA_TOWN_CROP, viewW: SATSUMA_TOWN_VIEW_W, viewH: SATSUMA_TOWN_VIEW_H,
    dataUrl: SATSUMA_TOWN_SPOTS_DATA_URL,
    seaBgClass: 'satsumatown-sea-bg',
  },
  '46404': {
    name: '長島町', nameEn: 'Nagashima Town', prefId: '46',
    crop: NAGASHIMA_CROP, viewW: NAGASHIMA_VIEW_W, viewH: NAGASHIMA_VIEW_H,
    dataUrl: NAGASHIMA_SPOTS_DATA_URL,
    seaBgClass: 'nagashima-sea-bg',
  },
  '46452': {
    name: '湧水町', nameEn: 'Yusui Town', prefId: '46',
    crop: YUSUI_CROP, viewW: YUSUI_VIEW_W, viewH: YUSUI_VIEW_H,
    dataUrl: YUSUI_SPOTS_DATA_URL,
    seaBgClass: 'yusui-sea-bg',
  },
  '46468': {
    name: '大崎町', nameEn: 'Osaki Town', prefId: '46',
    crop: OSAKI_CROP, viewW: OSAKI_VIEW_W, viewH: OSAKI_VIEW_H,
    dataUrl: OSAKI_SPOTS_DATA_URL,
    seaBgClass: 'osaki-sea-bg',
  },
  '46482': {
    name: '東串良町', nameEn: 'Higashikushira Town', prefId: '46',
    crop: HIGASHIKUSHIRA_CROP, viewW: HIGASHIKUSHIRA_VIEW_W, viewH: HIGASHIKUSHIRA_VIEW_H,
    dataUrl: HIGASHIKUSHIRA_SPOTS_DATA_URL,
    seaBgClass: 'higashikushira-sea-bg',
  },
  '46490': {
    name: '錦江町', nameEn: 'Kinko Town', prefId: '46',
    crop: KINKO_CROP, viewW: KINKO_VIEW_W, viewH: KINKO_VIEW_H,
    dataUrl: KINKO_SPOTS_DATA_URL,
    seaBgClass: 'kinko-sea-bg',
  },
  '46491': {
    name: '南大隅町', nameEn: 'Minamiosumi Town', prefId: '46',
    crop: MINAMIOSUMI_CROP, viewW: MINAMIOSUMI_VIEW_W, viewH: MINAMIOSUMI_VIEW_H,
    dataUrl: MINAMIOSUMI_SPOTS_DATA_URL,
    seaBgClass: 'minamiosumi-sea-bg',
  },
  '46492': {
    name: '肝付町', nameEn: 'Kimotsuki Town', prefId: '46',
    crop: KIMOTSUKI_CROP, viewW: KIMOTSUKI_VIEW_W, viewH: KIMOTSUKI_VIEW_H,
    dataUrl: KIMOTSUKI_SPOTS_DATA_URL,
    seaBgClass: 'kimotsuki-sea-bg',
  },
  '46501': {
    name: '中種子町', nameEn: 'Nakatane Town', prefId: '46',
    crop: NAKATANE_CROP, viewW: NAKATANE_VIEW_W, viewH: NAKATANE_VIEW_H,
    dataUrl: NAKATANE_SPOTS_DATA_URL,
    seaBgClass: 'nakatane-sea-bg',
  },
  '46502': {
    name: '南種子町', nameEn: 'Minamitane Town', prefId: '46',
    crop: MINAMITANE_CROP, viewW: MINAMITANE_VIEW_W, viewH: MINAMITANE_VIEW_H,
    dataUrl: MINAMITANE_SPOTS_DATA_URL,
    seaBgClass: 'minamitane-sea-bg',
  },
  '46505': {
    name: '屋久島町', nameEn: 'Yakushima Town', prefId: '46',
    crop: YAKUSHIMA_CROP, viewW: YAKUSHIMA_VIEW_W, viewH: YAKUSHIMA_VIEW_H,
    dataUrl: YAKUSHIMA_SPOTS_DATA_URL,
    seaBgClass: 'yakushima-sea-bg',
  },
  '46304': {
    name: '十島村', nameEn: 'Toshima Village', prefId: '46',
    crop: TOSHIMA_VILLAGE_CROP, viewW: TOSHIMA_VILLAGE_VIEW_W, viewH: TOSHIMA_VILLAGE_VIEW_H,
    dataUrl: TOSHIMA_VILLAGE_SPOTS_DATA_URL,
    seaBgClass: 'toshimavillage-sea-bg',
  },
  // 奄美群島12市町村。crop は KYUSHU_MUNICIPALITIES と同じ共有座標系のままでよい
  // (他の市町村と同じ仕組みで、選択中市町村自身の d や隣接市町村の表示も自動で機能する)。
  '46222': {
    name: '奄美市', nameEn: 'Amami City', prefId: '46',
    crop: { x: 180.9, y: 1539.2 }, viewW: 102.1, viewH: 93.2,
    dataUrl: AMAMI_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46523': {
    name: '大和村', nameEn: 'Yamato Village', prefId: '46',
    crop: { x: 166.5, y: 1574.1 }, viewW: 47.8, viewH: 33.0,
    dataUrl: YAMATO_VILLAGE_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46524': {
    name: '宇検村', nameEn: 'Uken Village', prefId: '46',
    crop: { x: 148.1, y: 1586.1 }, viewW: 53.9, viewH: 33.5,
    dataUrl: UKEN_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46525': {
    name: '瀬戸内町', nameEn: 'Setouchi Town', prefId: '46',
    crop: { x: 139.9, y: 1616.0 }, viewW: 56.8, viewH: 55.8,
    dataUrl: SETOUCHI_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46527': {
    name: '龍郷町', nameEn: 'Tatsugo Town', prefId: '46',
    crop: { x: 226.4, y: 1556.3 }, viewW: 34.2, viewH: 39.1,
    dataUrl: TATSUGO_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46529': {
    name: '喜界町', nameEn: 'Kikai Town', prefId: '46',
    crop: { x: 314.4, y: 1591.2 }, viewW: 33.0, viewH: 30.3,
    dataUrl: KIKAI_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46530': {
    name: '徳之島町', nameEn: 'Tokunoshima Town', prefId: '46',
    crop: { x: 86.3, y: 1687.2 }, viewW: 39.8, viewH: 62.5,
    dataUrl: TOKUNOSHIMA_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46531': {
    name: '天城町', nameEn: 'Amagi Town', prefId: '46',
    crop: { x: 81.2, y: 1688.0 }, viewW: 31.8, viewH: 48.6,
    dataUrl: AMAGI_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46532': {
    name: '伊仙町', nameEn: 'Isen Town', prefId: '46',
    crop: { x: 82.9, y: 1725.0 }, viewW: 32.2, viewH: 29.7,
    dataUrl: ISEN_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46533': {
    name: '和泊町', nameEn: 'Wadomari Town', prefId: '46',
    crop: { x: 13.9, y: 1799.5 }, viewW: 37.3, viewH: 24.2,
    dataUrl: WADOMARI_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46534': {
    name: '知名町', nameEn: 'Chinan Town', prefId: '46',
    crop: { x: 2.4, y: 1805.7 }, viewW: 28.1, viewH: 25.2,
    dataUrl: CHINAN_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
  '46535': {
    name: '与論町', nameEn: 'Yoron Town', prefId: '46',
    crop: { x: -24.7, y: 1890.3 }, viewW: 16.8, viewH: 15.4,
    dataUrl: YORON_SPOTS_DATA_URL,
    seaBgClass: 'nagasaki-sea-bg',
  },
};
const ACTIVE_CITY_IDS = Object.keys(CITY_CONFIGS);

// 2026年の日本の祝日(振替休日・国民の休日を含む)。混雑予想の判定に使用。
const JP_HOLIDAYS_2026 = new Set([
  '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20',
  '2026-04-29', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06',
  '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23',
  '2026-10-12', '2026-11-03', '2026-11-23',
]);
// 指定日(YYYY-MM-DD)が土日・祝日かどうかで混雑予想を判定する(実際の混雑統計ではない簡易的な目安)
function getCrowdLevel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const isWeekend = day === 0 || day === 6;
  const isHoliday = JP_HOLIDAYS_2026.has(dateStr);
  return (isWeekend || isHoliday) ? 'busy' : 'normal';
}


const CATEGORY_META = {
  sightseeing: { label: { ja: '観光', en: 'Sightseeing' }, color: '#E2613D', tint: '#FBEAE4', icon: Landmark },
  food: { label: { ja: '食事', en: 'Food' }, color: '#3F8753', tint: '#E9F3EC', icon: UtensilsCrossed },
  lodging: { label: { ja: '宿泊', en: 'Lodging' }, color: '#3B5E91', tint: '#E9EDF6', icon: BedDouble },
  roadside: { label: { ja: '道の駅', en: 'Rest stop' }, color: '#C9821A', tint: '#FBF1E2', icon: Store },
};

// 九州に実在する空港一覧(緯度経度は各空港の実測値)。ルート機能で「現在地を使わない場合」の
// 出発地点として、表示中の市に応じた最寄りの空港を使うために用意。
// これらはフォールバック用の既定値。実際にはdata/airports.json(スプレッドシート「空港」シート由来)を
// 起動時に取得し、取得できればそちらの内容で上書きする(下のuseEffect参照)。
const DEFAULT_AIRPORTS = {
  fukuoka: { name: '福岡空港', nameEn: 'Fukuoka Airport', lat: 33.5859, lon: 130.4506 },
  kitakyushu: { name: '北九州空港', nameEn: 'Kitakyushu Airport', lat: 33.8459, lon: 131.0347 },
  saga: { name: '九州佐賀国際空港', nameEn: 'Saga Airport', lat: 33.1497, lon: 130.3019 },
  nagasaki: { name: '長崎空港', nameEn: 'Nagasaki Airport', lat: 32.9169, lon: 129.9136 },
  tsushima: { name: '対馬空港', nameEn: 'Tsushima Airport', lat: 34.2847, lon: 129.3308 },
  iki: { name: '壱岐空港', nameEn: 'Iki Airport', lat: 33.7503, lon: 129.7856 },
  goto: { name: '五島つばき空港', nameEn: 'Goto Tsubaki Airport', lat: 32.6664, lon: 128.8347 },
  kumamoto: { name: '阿蘇くまもと空港', nameEn: 'Kumamoto Airport', lat: 32.8373, lon: 130.8556 },
  amakusa: { name: '天草空港', nameEn: 'Amakusa Airport', lat: 32.4828, lon: 130.1508 },
  oita: { name: '大分空港', nameEn: 'Oita Airport', lat: 33.4794, lon: 131.7369 },
  miyazaki: { name: '宮崎空港', nameEn: 'Miyazaki Airport', lat: 31.8772, lon: 131.4486 },
  kagoshima: { name: '鹿児島空港', nameEn: 'Kagoshima Airport', lat: 31.8034, lon: 130.7194 },
  tanegashima: { name: '種子島空港', nameEn: 'Tanegashima Airport', lat: 30.6053, lon: 130.9917 },
  yakushima: { name: '屋久島空港', nameEn: 'Yakushima Airport', lat: 30.3856, lon: 130.6592 },
  amami: { name: '奄美空港', nameEn: 'Amami Airport', lat: 28.4308, lon: 129.7125 },
  kikai: { name: '喜界空港', nameEn: 'Kikai Airport', lat: 28.4881, lon: 129.9281 },
  tokunoshima: { name: '徳之島空港', nameEn: 'Tokunoshima Airport', lat: 27.8364, lon: 128.8814 },
  okinoerabu: { name: '沖永良部空港', nameEn: 'Okinoerabu Airport', lat: 27.4317, lon: 128.7056 },
  yoron: { name: '与論空港', nameEn: 'Yoron Airport', lat: 27.0439, lon: 128.4017 },
};
// 県ごとの代表空港(その県の市町村が既定で使う空港)
const DEFAULT_PREF_AIRPORT = { '40': 'fukuoka', '41': 'saga', '42': 'nagasaki', '43': 'kumamoto', '44': 'oita', '45': 'miyazaki', '46': 'kagoshima' };
// 離島など、県の代表空港よりも明らかに近い専用の空港がある市町村の上書き設定
const DEFAULT_MUNI_AIRPORT_OVERRIDE = {
  '42209': 'tsushima', '42210': 'iki', '42211': 'goto', '42383': 'goto', '42411': 'goto', // 長崎県の離島
  '43212': 'amakusa', '43215': 'amakusa', '43531': 'amakusa', // 熊本県天草エリア
  '46213': 'tanegashima', '46501': 'tanegashima', '46502': 'tanegashima', '46505': 'yakushima', // 種子島・屋久島
  '46222': 'amami', '46523': 'amami', '46524': 'amami', '46525': 'amami', '46527': 'amami', // 奄美大島
  '46529': 'kikai', // 喜界島
  '46530': 'tokunoshima', '46531': 'tokunoshima', '46532': 'tokunoshima', // 徳之島
  '46533': 'okinoerabu', '46534': 'okinoerabu', // 沖永良部島
  '46535': 'yoron', // 与論島
  '40100': 'kitakyushu', '40213': 'kitakyushu', '40214': 'kitakyushu', '40215': 'kitakyushu',
  '40381': 'kitakyushu', '40382': 'kitakyushu', '40383': 'kitakyushu', '40384': 'kitakyushu',
  '40401': 'kitakyushu', '40402': 'kitakyushu', '40601': 'kitakyushu', '40602': 'kitakyushu',
  '40604': 'kitakyushu', '40605': 'kitakyushu', '40608': 'kitakyushu', '40609': 'kitakyushu',
  '40610': 'kitakyushu', '40621': 'kitakyushu', '40625': 'kitakyushu', '40642': 'kitakyushu',
  '40646': 'kitakyushu', '40647': 'kitakyushu', // 北九州市・京築・田川エリア
};
// 実際に参照される可変の空港データ。起動時にdata/airports.jsonの取得に成功すれば、その内容で置き換わる。
let AIRPORTS = DEFAULT_AIRPORTS;
// 奄美群島など地図の端に近い離島は、緯度経度からの変換だけだと実際の地図データ(手描きの市町村形状)と
// 数十px単位でズレることがあるため、既存の市町村データ(cx/cy)に合わせた手動の座標補正を用意する。
// 該当する空港のみ、地図上の表示位置をこの座標で上書きする(距離計算などには影響しない)。
const AIRPORT_SVG_OVERRIDE = {
  amami: { x: 215.1, y: 1595.1 }, // 奄美市の位置に合わせる
  kikai: { x: 330.6, y: 1606.9 }, // 喜界町の位置に合わせる
  tokunoshima: { x: 106.4, y: 1718.9 }, // 徳之島町の位置に合わせる
  okinoerabu: { x: 31.3, y: 1811.7 }, // 和泊町の位置に合わせる
  yoron: { x: -15.4, y: 1897.9 }, // 与論町の位置に合わせる
};
function airportSvgPos(id, a) {
  return AIRPORT_SVG_OVERRIDE[id] || geoToSvg(a.lat, a.lon);
}
let PREF_AIRPORT = DEFAULT_PREF_AIRPORT;
let MUNI_AIRPORT_OVERRIDE = DEFAULT_MUNI_AIRPORT_OVERRIDE;
function getAirportInfo(cityCode, prefId) {
  const key = MUNI_AIRPORT_OVERRIDE[cityCode] || PREF_AIRPORT[prefId] || 'fukuoka';
  return AIRPORTS[key] || DEFAULT_AIRPORTS.fukuoka;
}

// フェリーターミナルのデータ。空港と違い「県ごとの既定値」は無く、離島など特定の
// 市町村だけに対応する(該当が無ければnullを返す=その市町村はフェリーの対象外)。
// 起動時にdata/ferries.json(スプレッドシート「フェリー」シート由来)の取得に成功すれば置き換わる。
let FERRIES = {};
// フェリーは県ごとの既定値が無いため、data/ferries.jsonの取得に失敗した場合(オフライン・
// プレビュー環境など)にボタンを押しても何も表示されない問題が起きていた。
// 空港と同様、代表的なフェリーターミナルを既定値として用意しておく。
const DEFAULT_FERRIES = {
  hakata: { name: '博多港', nameEn: 'Hakata Port', lat: 33.6056, lon: 130.4025 },
  shinmoji: { name: '新門司港', nameEn: 'Shin-Moji Port', lat: 33.9214, lon: 130.9989 },
  beppu: { name: '別府港', nameEn: 'Beppu Port', lat: 33.2967, lon: 131.4989 },
  oita_port: { name: '大分港', nameEn: 'Oita Port', lat: 33.2461, lon: 131.6633 },
  nagasaki_port: { name: '長崎港', nameEn: 'Nagasaki Port', lat: 32.7392, lon: 129.8656 },
  izuhara: { name: '厳原港', nameEn: 'Izuhara Port (Tsushima)', lat: 34.2011, lon: 129.2933 },
  ashibe: { name: '芦辺港', nameEn: 'Ashibe Port (Iki)', lat: 33.7889, lon: 129.7189 },
  kumamoto_port: { name: '熊本港', nameEn: 'Kumamoto Port', lat: 32.8283, lon: 130.5636 },
  kagoshima_port: { name: '鹿児島港(北ふ頭)', nameEn: 'Kagoshima Port', lat: 31.5966, lon: 130.5642 },
  shibushi: { name: '志布志港', nameEn: 'Shibushi Port', lat: 31.4783, lon: 131.1136 },
};
FERRIES = DEFAULT_FERRIES;
// 道の駅も、フェリーと同じ理由(データ取得に失敗した時に何も表示されない問題)で、
// 代表的な道の駅を県ごとに1つずつ既定値として用意しておく。実際のデータ取得に
// 成功すればこちらに追加され、失敗・空だった場合でもこの既定値が表示される。
const DEFAULT_ROADSIDE = [
  { id: 'rs-fukuoka-ukiha', name: '道の駅うきは', nameEn: 'Michi-no-Eki Ukiha', prefId: '40', category: '道の駅', x: 520.37, y: 350.09 },
  { id: 'rs-saga-yoshinogari', name: '道の駅吉野ヶ里', nameEn: 'Michi-no-Eki Yoshinogari', prefId: '41', category: '道の駅', x: 441.88, y: 358.39 },
  { id: 'rs-nagasaki-mikawa', name: '道の駅みかわ', nameEn: 'Michi-no-Eki Mikawa', prefId: '42', category: '道の駅', x: 309.93, y: 472.06 },
  { id: 'rs-kumamoto-aso', name: '道の駅阿蘇', nameEn: 'Michi-no-Eki Aso', prefId: '43', category: '道の駅', x: 590.94, y: 448.17 },
  { id: 'rs-oita-yufuin', name: '道の駅ゆふいん', nameEn: 'Michi-no-Eki Yufuin', prefId: '44', category: '道の駅', x: 645.26, y: 363.16 },
  { id: 'rs-miyazaki-takachiho', name: '道の駅高千穂', nameEn: 'Michi-no-Eki Takachiho', prefId: '45', category: '道の駅', x: 632.43, y: 503.50 },
  { id: 'rs-kagoshima-kiire', name: '道の駅喜入', nameEn: 'Michi-no-Eki Kiire', prefId: '46', category: '道の駅', x: 472.25, y: 826.67 },
];
let MUNI_FERRY_OVERRIDE = {};
function getFerryInfo(cityCode) {
  const key = MUNI_FERRY_OVERRIDE[cityCode];
  return key ? FERRIES[key] : null;
}

// 眼鏡橋(S1)のデモ用実写画像。諫早公園の池越しにライトアップされた眼鏡橋を撮影したもの。

// 実在の諫早市スポット。起動時にGAS Web App→GitHub→ConoHa WINGの配信経路で
// 毎晩自動更新される本物のスプレッドシートデータを取得して入れる(下のuseEffectを参照)。
let SPOTS = [];

// 仮のプレビュー用スポット(A/B/C/D)。本物のデータ取得(SPOTS_DATA_URL)に失敗した場合、
// または0件だった場合のみ表示され、ルート検索の動作確認ができるようにするための一時的なもの。
// 本物のデータが取得できるようになったら不要(このまま置いておいて問題ない)。
const DEMO_SPOTS = [
  { id: 'demo-a', category: 'sightseeing', name: 'A', nameEn: 'A', x: 363.6, y: 454.3, duration: 30, price: 0, desc: '仮の観光スポットです。', descEn: 'A placeholder sightseeing spot.', hours: null },
  { id: 'demo-b', category: 'food', name: 'B', nameEn: 'B', x: 372.0, y: 463.6, duration: 45, price: 1200, desc: '仮の食事スポットです。', descEn: 'A placeholder dining spot.', hours: null },
  { id: 'demo-c', category: 'lodging', name: 'C', nameEn: 'C', x: 352.7, y: 470.8, duration: 0, price: 8000, desc: '仮の宿泊施設です。', descEn: 'A placeholder lodging spot.', hours: null },
  { id: 'demo-d', category: 'roadside', name: 'D', nameEn: 'D', x: 345.1, y: 455.7, duration: 20, price: 0, desc: '仮の道の駅です。', descEn: 'A placeholder roadside station.', hours: null },
];

// スプレッドシートの「カテゴリ」列(日本語)を、このアプリが使う内部キーに変換する
const CATEGORY_JA_TO_EN = { '観光': 'sightseeing', '食事': 'food', '宿泊': 'lodging', '道の駅': 'roadside' };

const KYUSHU_VIEW_W = 800;
const KYUSHU_VIEW_H = 1502.5;
const KYUSHU_MAINLAND_VIEWBOX = { x: -4.4, y: -4.5, w: 808.9, h: 1136.1 }; // 九州本土(トカラ列島を除く)の表示範囲。初期表示・枠の縦横比に使用
const ACTIVE_PREF_ID = '42'; // 長崎県(現在体験可能な唯一の県)

// 九州7県の輪郭(国土数値情報より簡略化・滑らかな曲線に加工。長崎県以外は県単位のみ)
const KYUSHU_OUTLINE_PATHS = [
  "M204.6,1612.1L204.0,1613.4L209.4,1616.9L208.5,1618.2L206.9,1623.9L203.3,1622.3L202.8,1620.8L194.1,1620.3L190.5,1617.0L189.4,1614.7L192.5,1609.9L191.8,1608.7L197.5,1606.9L193.3,1600.6L201.9,1597.9L203.8,1596.2L204.3,1593.2L210.3,1593.8L208.1,1584.9L201.0,1577.9L203.3,1578.9L209.3,1579.5L213.1,1580.3L214.4,1575.9L216.5,1572.3L218.1,1574.0L220.5,1576.2L227.3,1573.5L227.8,1570.9L228.7,1566.6L230.8,1565.7L232.4,1564.9L233.8,1562.4L235.9,1567.9L235.4,1574.6L237.4,1576.1L237.4,1578.3L236.4,1582.3L232.9,1580.0L231.7,1579.3L230.4,1580.2L229.9,1580.3L230.1,1587.4L231.3,1590.7L233.3,1590.8L240.3,1591.9L232.0,1596.0L232.1,1597.5L232.6,1597.9L233.0,1601.3L224.5,1602.6L218.7,1602.8L217.5,1603.4L216.0,1601.9L212.5,1604.1L213.6,1604.1L215.0,1604.3L215.6,1609.4L212.7,1611.3L204.9,1613.0ZM259.1,1579.7L255.0,1578.5L254.8,1578.2L257.6,1577.8L257.9,1574.4L257.1,1573.2L257.1,1571.8L257.4,1571.4L257.3,1572.6L258.3,1573.0L258.6,1574.5L260.2,1572.1L257.8,1567.6L258.7,1565.7L257.7,1562.8L259.0,1562.9L261.9,1570.6L263.3,1569.8L262.0,1567.1L263.7,1564.9L263.0,1564.9L263.1,1563.3L261.9,1561.3L259.7,1559.4L257.4,1553.9L260.3,1554.9L260.5,1553.4L261.6,1553.0L264.0,1548.5L267.1,1547.7L268.0,1552.6L267.2,1554.6L268.2,1558.0L270.6,1562.2L273.7,1562.7L272.9,1564.9L274.5,1566.7L272.2,1571.4L273.7,1571.7L271.7,1575.9L270.7,1575.5L271.3,1573.9L268.2,1577.7L262.6,1578.2L261.5,1581.0L259.4,1580.8L259.1,1579.7Z", // 奄美大島 - 46222(実際の市町村データを流用)
  "M201.9,1597.9L193.3,1600.6L193.3,1603.0L191.9,1603.1L189.2,1599.8L183.6,1599.0L180.7,1595.1L177.1,1596.3L171.6,1595.1L170.8,1594.0L171.9,1592.2L170.5,1590.6L171.7,1590.7L171.9,1589.7L175.8,1590.2L176.7,1589.0L178.2,1590.5L180.9,1590.0L181.2,1589.0L182.1,1589.4L182.8,1588.8L182.0,1587.3L183.0,1586.3L181.9,1585.4L185.7,1585.4L188.5,1581.0L189.9,1580.9L191.5,1583.3L194.6,1585.2L196.1,1584.3L196.8,1582.3L199.7,1580.8L201.3,1582.4L202.2,1585.7L203.4,1584.7L203.3,1583.7L204.4,1584.2L204.7,1583.7L203.3,1582.6L203.1,1580.1L200.9,1578.1L201.4,1578.1L207.2,1582.1L208.1,1584.9L207.6,1587.0L210.3,1593.8L204.3,1593.2L203.1,1594.0L203.8,1596.2L203.3,1598.8L201.9,1597.9Z", // 奄美大島 - 46523(実際の市町村データを流用)
  "M169.0,1603.1L166.8,1601.4L166.9,1600.0L165.1,1600.7L163.2,1598.3L163.9,1597.4L162.0,1597.4L160.9,1596.0L161.5,1595.2L160.5,1595.6L159.8,1593.8L161.0,1594.8L163.8,1593.3L165.1,1594.1L166.5,1592.5L170.1,1592.1L170.5,1590.6L171.9,1592.2L170.8,1594.0L171.6,1595.1L177.1,1596.3L181.4,1595.4L183.6,1599.0L189.2,1599.8L191.1,1602.4L193.9,1603.1L197.5,1606.9L192.9,1609.2L191.8,1608.7L192.5,1609.9L189.9,1613.9L187.9,1613.7L185.8,1615.1L184.2,1613.7L182.0,1614.8L180.7,1612.7L178.5,1612.9L175.9,1610.0L164.5,1612.7L163.4,1610.9L163.7,1608.0L166.2,1607.6L166.9,1605.3L168.1,1605.9L167.3,1606.8L169.7,1605.4L171.2,1606.6L171.7,1605.1L172.9,1605.3L174.0,1606.9L174.9,1603.1L177.2,1603.0L178.8,1604.4L179.9,1604.6L178.5,1604.0L178.3,1601.4L173.7,1601.4L172.4,1599.9L171.4,1600.9L171.8,1603.4ZM152.6,1595.3L153.7,1593.1L157.0,1595.2L158.2,1594.8L161.0,1597.2L162.2,1599.9L160.2,1599.1L158.9,1600.0L157.2,1598.7L155.9,1599.2L152.6,1595.3ZM157.2,1605.1L158.1,1606.9L159.3,1607.3L158.0,1608.0L157.7,1606.8L157.5,1609.9L154.9,1609.9L153.5,1607.6L157.2,1605.1Z", // 奄美大島 - 46524(実際の市町村データを流用)
  "M165.6,1647.9L162.2,1652.4L160.6,1651.0L161.7,1649.8L162.1,1644.3L161.0,1641.3L161.7,1636.6L157.9,1635.5L156.9,1633.0L154.5,1630.2L152.4,1625.9L153.2,1622.6L154.9,1623.7L159.3,1620.7L161.3,1623.5L166.2,1623.2L166.5,1624.2L166.1,1625.5L158.0,1625.6L159.6,1629.3L162.5,1629.6L164.6,1633.3L166.4,1634.3L169.3,1629.0L170.6,1632.9L173.0,1630.5L174.1,1634.9L167.3,1634.8L167.4,1636.1L171.0,1636.4L166.9,1638.6L168.5,1639.2L169.1,1641.5L171.8,1639.5L174.1,1639.2L171.3,1640.2L170.8,1643.2L173.8,1642.0L174.0,1644.6L176.5,1643.8L178.9,1646.3L181.7,1644.7L183.0,1645.3L185.5,1647.2L187.9,1646.7L190.0,1647.2L191.9,1648.5L188.9,1655.3L183.9,1658.6L183.1,1655.7L184.3,1649.8L180.5,1652.0L177.7,1652.0L177.0,1654.3L177.2,1657.1L174.0,1656.6L172.0,1651.0L170.6,1646.0L166.9,1645.7L168.2,1647.4ZM186.2,1635.6L184.6,1640.7L184.5,1636.9L183.6,1637.5L183.0,1636.7L184.1,1635.6L182.8,1635.5L182.4,1637.4L180.1,1635.8L178.8,1636.1L177.8,1634.7L179.0,1632.8L176.1,1631.4L176.7,1630.6L178.2,1631.5L179.1,1630.3L177.4,1629.3L178.5,1628.4L178.1,1627.4L175.8,1628.2L175.7,1626.4L177.6,1625.7L176.2,1625.6L175.9,1623.3L175.2,1625.8L172.8,1627.0L174.9,1620.9L182.5,1621.3L181.0,1622.4L180.8,1626.6L182.5,1627.5L182.5,1630.4L184.6,1632.2L184.1,1633.6L186.2,1635.6ZM149.7,1659.1L150.5,1661.6L149.2,1663.4L149.4,1665.5L145.5,1667.0L144.6,1664.5L144.9,1661.8L146.0,1660.6L145.6,1657.9L147.6,1657.4L147.9,1655.5L151.0,1653.4L150.5,1655.9L152.5,1658.9L149.7,1659.1Z", // 奄美大島 - 46525(実際の市町村データを流用)
  "M243.8,1588.1L243.2,1587.2L243.3,1588.9L240.4,1592.2L237.3,1591.3L234.3,1592.0L229.7,1589.7L231.2,1585.9L232.9,1586.2L233.8,1585.4L234.0,1583.5L236.0,1580.3L237.4,1578.3L237.4,1576.1L234.1,1576.4L235.4,1574.6L234.7,1571.0L233.9,1562.4L234.5,1561.7L236.0,1562.9L237.8,1566.4L238.8,1565.9L240.4,1563.9L241.7,1561.4L244.3,1561.7L245.9,1559.8L251.9,1559.6L251.3,1560.9L250.4,1562.6L250.5,1564.1L249.9,1563.5L248.2,1565.5L248.4,1570.0L246.6,1571.4L245.3,1572.2L245.7,1573.3L245.0,1573.1L245.6,1573.4L244.7,1575.2L245.3,1574.5L246.3,1573.9L247.4,1575.1L247.6,1570.9L249.9,1569.7L251.0,1571.1L251.4,1569.1L250.4,1567.4L251.6,1566.4L253.5,1567.8L253.0,1568.5L251.2,1572.4L251.7,1575.0L255.8,1575.6L256.6,1571.8L257.4,1571.3L255.9,1577.4L249.9,1579.0L249.2,1581.5L246.4,1583.8L245.4,1587.3Z", // 奄美大島 - 46527(実際の市町村データを流用)
  "M325.1,1618.6L322.6,1617.6L322.5,1615.9L321.0,1613.9L318.9,1614.3L318.4,1612.4L317.6,1612.6L317.1,1608.6L317.8,1607.3L321.5,1604.5L322.2,1606.4L322.8,1606.2L322.4,1604.7L326.1,1605.4L326.4,1604.1L330.8,1601.9L335.4,1597.0L337.0,1596.2L337.0,1596.8L337.3,1596.9L338.6,1594.3L341.4,1594.0L343.7,1595.9L344.4,1597.4L343.6,1598.0L344.4,1597.8L344.6,1598.8L344.0,1600.0L342.6,1599.7L343.6,1600.8L341.7,1601.5L341.6,1603.2L340.1,1604.7L338.4,1603.5L338.7,1604.5L338.2,1605.2L336.9,1604.0L337.3,1605.5L338.4,1605.6L334.2,1611.0L331.8,1616.0L331.0,1615.4L330.6,1617.1L329.7,1617.4L328.9,1616.3L328.7,1617.9L326.0,1618.8L325.0,1617.8L325.1,1618.6Z", // 喜界島 - 46529(実際の市町村データを流用)
  "M111.7,1744.5L106.2,1737.3L104.0,1737.6L101.4,1735.6L102.5,1732.9L101.9,1730.9L105.7,1729.8L107.4,1726.4L107.3,1724.3L108.9,1722.2L105.3,1720.8L103.6,1719.4L103.3,1717.9L99.6,1716.8L97.2,1711.9L95.1,1712.6L96.3,1709.2L94.6,1708.3L93.7,1705.2L97.4,1702.8L95.9,1698.5L91.5,1697.4L91.8,1692.4L95.9,1694.1L98.1,1693.2L106.1,1694.0L105.4,1695.1L106.9,1698.8L104.7,1699.1L102.4,1701.3L106.0,1703.3L105.8,1705.7L104.7,1706.6L106.3,1709.4L104.9,1709.3L105.0,1712.8L108.2,1714.5L109.0,1716.6L111.8,1716.5L112.5,1718.4L116.1,1721.9L115.6,1723.2L119.7,1725.1L120.9,1726.8L119.5,1732.4L117.1,1733.3L118.1,1734.9L117.3,1735.1L116.5,1737.6L117.1,1739.5L114.7,1740.0L113.1,1742.0L113.6,1744.0L111.7,1744.5Z", // 徳之島 - 46530(実際の市町村データを流用)
  "M87.5,1718.7L87.1,1713.6L88.6,1713.1L87.5,1712.3L88.0,1710.7L85.3,1708.6L85.8,1703.5L86.2,1706.6L88.2,1702.2L87.2,1700.5L88.5,1701.1L88.8,1701.5L88.9,1701.5L87.3,1698.9L87.5,1694.4L89.3,1692.3L91.4,1692.0L91.5,1697.4L95.9,1698.5L97.4,1702.8L93.7,1705.2L94.6,1708.3L96.3,1709.2L95.1,1712.6L97.2,1711.9L99.6,1716.8L103.3,1717.9L103.6,1719.4L109.0,1722.7L107.3,1724.3L107.4,1726.4L105.7,1729.8L101.9,1730.9L101.9,1732.5L99.3,1731.4L95.2,1731.5L94.7,1730.2L93.7,1730.3L91.1,1728.6L90.6,1727.7L91.4,1724.0L90.8,1724.5L89.1,1722.7L88.5,1719.5L87.5,1718.7Z", // 徳之島 - 46531(実際の市町村データを流用)
  "M104.7,1750.1L98.0,1752.0L95.5,1750.3L94.4,1747.8L94.4,1743.5L89.7,1739.2L88.1,1739.0L85.6,1735.2L89.7,1732.2L90.4,1727.7L94.7,1730.2L95.2,1731.5L99.3,1731.4L102.4,1732.8L101.7,1736.3L104.0,1737.6L106.2,1737.3L111.8,1744.6L112.4,1746.1L109.5,1751.0L107.1,1751.2L104.7,1750.1Z", // 徳之島 - 46532(実際の市町村データを流用)
  "M30.7,1820.3L27.0,1820.6L23.1,1814.7L21.3,1816.7L18.5,1816.5L17.0,1814.7L18.2,1812.7L17.2,1810.0L21.3,1811.4L25.5,1808.8L27.3,1810.1L28.8,1808.9L30.3,1809.3L32.3,1807.9L31.9,1807.2L32.7,1807.8L35.0,1806.1L40.3,1805.0L43.1,1802.6L47.5,1803.5L48.1,1804.8L46.9,1805.9L43.9,1808.0L39.6,1809.1L37.9,1812.3L37.1,1811.5L36.7,1812.4L37.5,1812.9L35.4,1813.4L35.8,1814.0L35.3,1813.4L34.7,1816.0L30.7,1820.3Z", // 沖永良部島 - 46533(実際の市町村データを流用)
  "M23.9,1825.2L16.4,1828.2L15.1,1828.5L16.3,1827.9L14.6,1828.4L11.4,1826.9L7.6,1822.9L5.9,1818.9L5.5,1819.2L5.6,1817.2L4.7,1815.8L5.2,1812.0L7.6,1808.0L12.1,1810.7L17.2,1810.0L18.2,1812.7L17.0,1814.2L17.8,1815.9L21.0,1816.8L23.1,1814.7L27.0,1820.6L28.1,1820.9L23.9,1825.2Z", // 沖永良部島 - 46534(実際の市町村データを流用)
  "M-12.5,1904.3L-16.9,1902.9L-17.6,1901.4L-18.4,1900.8L-19.5,1901.2L-21.5,1898.2L-22.5,1899.0L-23.3,1895.8L-22.0,1894.8L-20.9,1896.3L-19.1,1895.9L-19.7,1895.5L-18.9,1895.2L-19.0,1893.3L-17.4,1891.7L-13.3,1892.2L-10.1,1896.6L-10.3,1899.5L-9.3,1903.3L-12.5,1904.3Z", // 与論島 - 46535(実際の市町村データを流用)
  "M155.27,361.41L155.94,364.21L157.79,362.84L161.77,366.98L168.11,366.94L168.15,363.87L173.78,361.41L170.89,360.28L170.01,354.72L167.85,353.55L165.96,356.80L160.21,357.22L155.27,361.41Z",
  "M155.88,365.42L153.98,366.36L154.57,363.46L152.83,364.88L155.09,368.10L156.43,367.18L155.88,365.42Z",
  "M153.56,372.72L155.21,374.69L156.30,373.60L154.65,372.19L153.56,372.72Z",
  "M143.83,376.17L143.03,379.07L145.47,379.12L145.39,375.96L143.83,376.17Z",
  "M159.37,382.76L160.54,381.15L157.80,380.04L157.45,377.18L160.88,377.53L161.28,375.39L155.07,377.39L152.01,376.25L152.51,374.23L150.15,374.51L149.59,377.95L148.58,376.46L146.73,380.15L150.36,380.31L150.98,383.58L153.61,383.02L154.04,380.54L159.37,382.76Z",
  "M124.58,381.59L125.17,381.70L125.36,380.72L124.64,380.59L124.58,381.59Z",
  "M135.97,381.93L136.03,382.88L138.92,382.20L137.56,380.86L135.97,381.93Z",
  "M146.28,382.20L146.44,382.71L147.08,382.23L147.01,381.75L146.28,382.20Z",
  "M144.14,383.20L143.43,384.22L145.33,384.41L144.97,383.05L144.14,383.20Z",
  "M151.68,384.52L152.04,385.15L153.12,384.38L152.82,383.19L151.68,384.52Z",
  "M147.71,386.36L148.93,386.09L148.48,385.69L147.66,385.69L147.71,386.36Z",
  "M119.00,385.98L118.07,387.54L119.55,387.32L119.48,385.77L119.00,385.98Z",
  "M144.24,386.46L144.23,388.01L146.02,387.14L145.54,385.42L144.24,386.46Z",
  "M119.41,390.43L118.22,391.07L119.79,390.84L119.41,390.43Z",
  "M143.72,426.05L141.37,428.84L145.77,427.56L147.16,425.81L143.72,426.05Z",
  "M156.42,415.17L158.45,418.64L157.62,422.10L159.27,423.13L155.36,424.71L154.64,418.53L151.09,419.38L151.96,419.95L149.39,422.59L149.15,428.70L151.01,430.67L149.30,431.46L149.67,432.88L153.10,434.34L151.54,434.86L151.33,438.23L150.73,435.96L148.94,435.45L146.34,439.32L145.43,436.25L144.43,435.43L143.84,437.64L142.78,435.61L139.84,437.96L141.06,443.20L138.57,443.79L141.80,444.56L143.32,442.32L143.30,445.38L145.27,446.60L147.92,443.32L149.07,446.76L148.46,447.87L146.86,447.04L146.08,449.92L148.42,448.24L151.23,449.34L151.92,452.39L153.89,452.43L153.38,455.62L152.90,453.02L151.59,454.40L149.34,452.42L148.71,454.80L149.59,456.54L152.47,457.02L152.94,459.31L149.63,458.28L151.55,460.03L148.99,459.87L149.01,461.31L150.45,462.66L151.10,469.96L151.05,473.82L149.59,474.23L153.03,475.75L155.12,471.90L152.52,467.93L154.47,464.13L160.53,466.06L161.77,464.73L160.51,459.17L158.52,459.29L159.90,456.86L157.70,455.78L158.44,453.71L160.37,453.74L159.50,452.42L160.78,449.87L158.77,448.62L163.72,448.01L164.17,444.34L162.06,441.56L162.21,439.06L165.63,445.03L168.33,443.39L170.07,445.37L172.09,440.61L179.33,436.73L179.61,434.95L177.63,430.35L179.54,429.09L175.58,427.51L174.18,429.52L169.14,429.38L166.10,433.52L165.62,432.17L163.63,434.28L162.10,433.34L161.23,434.52L160.60,433.02L159.27,433.94L160.89,429.74L159.48,425.09L161.36,422.59L159.86,419.86L162.81,417.25L161.71,415.48L164.27,414.04L166.18,402.71L162.41,398.18L165.51,390.19L164.51,388.25L160.51,399.02L162.67,401.40L161.31,403.29L163.72,404.02L163.39,407.34L158.65,410.59L157.97,414.74L156.42,415.17Z",
  "M144.91,433.25L145.82,435.74L146.13,431.98L145.65,431.19L144.91,433.25Z",
  "M136.52,441.97L139.22,441.53L139.69,439.20L138.22,438.19L135.58,439.96L136.64,443.40L136.52,441.97Z",
  "M164.20,449.01L164.60,449.43L165.05,449.07L164.78,448.73L164.20,449.01Z",
  "M131.14,451.03L133.28,449.31L133.73,447.23L132.45,446.54L131.01,450.67L129.07,448.45L125.41,449.80L126.65,452.00L132.23,453.59L132.92,451.18L131.13,452.73L130.54,450.67L131.14,451.03Z",
  "M150.14,450.03L149.87,450.59L150.43,450.65L150.14,450.03Z",
  "M127.95,455.11L129.05,455.68L129.08,455.24L128.21,454.57L127.95,455.11Z",
  "M121.55,456.12L121.02,458.25L122.46,458.09L122.62,455.48L121.55,456.12Z",
  "M148.51,456.69L148.71,458.10L149.52,457.86L148.75,456.54L148.51,456.69Z",
  "M139.67,455.91L141.29,459.35L140.22,460.04L138.33,456.14L137.32,459.57L136.77,456.01L132.14,453.79L134.99,460.17L133.18,461.76L136.18,461.79L136.19,465.15L139.64,462.37L142.06,464.26L144.29,463.41L142.74,465.67L145.33,465.90L143.75,466.33L145.83,468.65L146.57,462.29L145.14,461.39L147.05,457.20L145.12,457.46L147.39,455.48L145.35,453.77L144.90,450.40L143.20,450.23L143.68,448.70L140.47,449.63L138.20,446.41L136.68,447.10L138.32,448.40L137.53,449.63L135.62,449.99L137.80,452.72L136.17,453.69L138.78,455.49L140.54,454.03L139.67,455.91Z",
  "M119.99,460.26L120.51,460.73L120.62,460.11L120.41,459.96L119.99,460.26Z",
  "M146.69,461.52L147.92,462.76L148.20,462.59L147.74,459.03L146.69,461.52Z",
  "M149.19,463.54L150.46,463.69L149.46,462.32L149.16,462.23L149.19,463.54Z",
  "M147.07,463.01L147.55,464.80L147.75,462.91L147.12,462.50L147.07,463.01Z",
  "M149.30,463.73L149.85,464.34L150.20,464.05L149.30,463.73Z",
  "M141.08,464.05L140.50,464.91L140.63,465.82L141.61,465.37L141.08,464.05Z",
  "M148.67,468.92L149.05,468.92L149.26,467.37L148.45,466.33L148.67,468.92Z",
  "M117.71,460.12L116.56,460.39L116.81,463.06L113.41,464.07L116.79,466.79L117.23,463.80L121.59,469.56L123.24,469.28L125.33,472.93L125.01,474.28L122.04,474.66L125.86,475.42L127.35,473.75L127.57,479.94L130.08,475.64L127.83,472.98L129.18,471.37L131.95,472.07L130.55,471.34L130.46,468.19L132.68,466.86L131.44,462.49L127.85,458.56L129.47,461.58L128.09,467.51L125.08,461.99L123.79,462.22L126.62,467.14L125.90,470.09L122.44,462.22L118.85,462.05L117.71,460.12Z",
  "M70.21,478.05L71.37,479.21L72.47,478.85L72.02,477.25L70.21,478.05Z",
  "M108.64,472.41L105.66,470.22L105.14,484.31L108.21,485.16L111.28,488.94L114.56,489.01L121.23,480.25L119.75,479.26L119.09,474.41L115.94,473.57L115.39,471.34L111.25,468.60L112.19,474.61L114.34,475.37L113.22,477.75L114.15,480.06L110.96,479.40L112.77,478.29L111.11,476.69L110.63,471.05L108.64,472.41Z",
  "M125.23,478.20L126.08,480.27L126.79,479.70L126.29,477.93L125.23,478.20Z",
  "M130.81,488.88L132.89,489.53L133.34,487.78L131.34,485.63L130.81,488.88Z",
  "M138.85,492.34L141.58,491.68L141.92,486.87L138.83,482.12L137.21,485.33L138.60,487.45L137.93,490.37L133.78,491.05L132.40,492.21L133.18,493.58L137.43,494.49L137.81,491.19L138.85,492.34Z",
  "M129.59,491.03L129.96,491.28L130.59,491.04L130.09,490.56L129.59,491.03Z",
  "M112.52,493.49L112.61,495.11L114.27,494.89L114.60,492.23L112.52,493.49Z",
  "M92.34,494.52L91.96,493.88L91.52,494.76L91.99,495.69L92.34,494.52Z",
  "M109.87,498.17L111.03,499.70L112.13,499.17L111.02,497.12L109.87,498.17Z",
  "M54.46,502.27L54.87,497.71L56.91,496.11L56.10,494.82L52.77,498.22L52.83,501.71L54.46,502.27Z",
  "M108.40,499.82L109.21,500.23L109.44,499.44L108.98,499.07L108.40,499.82Z",
  "M117.56,502.95L118.36,506.52L120.18,503.71L118.58,502.03L117.56,502.95Z",
  "M96.04,489.65L91.85,492.31L92.93,495.87L91.53,496.38L88.75,487.74L87.34,487.79L84.48,495.33L84.92,492.23L81.86,492.93L84.21,490.55L78.17,492.46L77.64,495.31L75.74,495.57L74.48,494.81L75.84,492.92L75.61,488.30L68.56,483.69L66.71,485.01L63.42,489.62L66.26,494.37L64.79,500.01L68.45,504.79L65.09,504.91L65.32,509.81L67.87,512.10L71.08,512.02L68.33,514.20L70.02,517.27L66.11,515.55L69.35,518.53L64.29,516.53L66.21,519.73L63.67,519.93L62.46,523.04L63.94,525.32L66.19,522.74L69.26,522.60L65.62,525.10L66.74,526.94L64.61,529.33L64.92,527.42L59.95,525.25L60.42,523.27L58.90,522.42L57.47,524.84L57.63,522.71L59.61,521.60L57.47,518.36L54.42,526.98L59.97,527.95L62.91,531.95L66.16,532.51L68.84,528.04L73.70,529.52L84.05,528.39L87.21,532.48L87.50,535.32L91.77,536.58L96.10,531.01L94.56,527.86L89.28,524.76L91.18,518.90L98.94,516.21L102.10,521.07L112.19,518.94L112.91,520.31L117.39,519.91L118.25,516.55L116.10,516.11L115.29,512.65L109.00,507.58L105.97,501.62L106.66,494.51L109.45,493.43L107.79,491.65L105.24,493.73L104.61,491.94L102.88,494.43L105.09,489.80L100.29,493.03L98.54,491.92L103.17,489.84L98.56,486.28L99.45,480.33L95.54,482.61L97.02,483.77L95.97,485.64L92.31,485.44L90.14,489.80L92.37,490.88L95.95,488.61L97.30,491.12L96.04,489.65Z",
  "M65.04,513.77L64.87,514.54L65.65,514.15L65.49,513.76L65.04,513.77Z",
  "M62.42,518.39L60.73,513.98L63.29,514.20L62.20,510.08L58.16,515.61L59.60,520.70L62.42,518.39Z",
  "M92.76,524.75L92.74,525.34L93.17,525.15L92.76,524.75Z",
  "M103.32,530.51L106.31,531.20L105.94,528.95L104.31,528.74L103.32,530.51Z",
  "M123.44,531.10L122.13,531.30L124.84,532.21L124.42,530.48L123.44,531.10Z",
  "M119.91,531.65L119.90,532.09L120.53,532.09L120.40,531.45L119.91,531.65Z",
  "M118.51,533.03L118.32,533.57L119.83,533.70L119.76,532.57L118.51,533.03Z",
  "M78.88,534.50L77.95,535.17L80.66,535.38L80.04,534.45L78.88,534.50Z",
  "M117.56,537.90L117.34,539.35L120.16,539.65L120.14,537.39L117.56,537.90Z",
  "M10.20,670.24L7.96,670.80L8.18,671.43L11.76,670.43L13.15,671.67L14.88,667.85L13.48,668.77L10.75,667.40L10.20,670.24Z",
  "M7.33,673.18L7.97,673.33L7.76,672.38L7.57,672.15L7.33,673.18Z",
  "M5.29,674.50L5.40,675.11L6.77,674.00L6.22,673.47L5.29,674.50Z",
  "M3.39,678.28L3.65,678.77L4.61,677.53L4.45,677.34L3.39,678.28Z",
  "M0.07,679.60L1.12,683.88L3.11,680.20L2.74,679.01L0.07,679.60Z",
  "M141.23,1478.65L139.96,1476.97L140.24,1478.66L141.23,1478.65Z",
  "M134.83,1485.34L135.68,1487.48L140.73,1487.41L140.90,1485.24L139.13,1484.03L137.07,1486.27L134.83,1485.34Z",
  "M233.70,0.35L233.32,0.00L232.96,0.50L232.97,1.10L233.70,0.35Z",
  "M243.54,6.34L242.89,6.22L242.57,6.36L242.94,7.09L243.54,6.34Z",
  "M244.88,19.43L244.55,19.15L244.16,19.47L244.47,19.78L244.88,19.43Z",
  "M211.60,97.89L211.82,100.36L212.83,98.56L212.26,100.91L214.45,102.51L215.28,100.74L216.61,100.56L215.01,102.33L215.76,103.71L219.75,99.62L218.64,97.74L221.53,99.37L218.59,92.93L222.73,93.85L222.69,94.95L224.36,93.40L224.31,93.25L223.54,92.51L223.77,91.78L223.45,90.91L222.52,91.91L218.44,91.26L222.46,90.49L224.49,87.57L222.82,86.15L223.52,84.96L220.66,84.92L222.19,84.20L220.63,80.35L224.00,81.56L225.18,74.48L223.67,77.23L222.43,76.55L223.12,78.12L220.79,77.87L215.56,80.91L221.31,74.09L220.54,70.87L218.52,72.72L218.57,69.30L222.68,70.88L219.60,63.69L222.96,63.05L225.25,57.95L236.74,46.28L235.47,44.88L238.83,42.98L238.49,39.11L241.20,38.98L241.17,30.34L242.86,28.53L240.89,25.29L236.87,25.44L236.30,23.45L234.08,24.08L233.06,22.68L233.90,21.08L234.08,22.61L238.12,24.05L235.84,21.36L235.98,19.22L238.99,23.71L242.84,22.71L241.10,20.18L243.48,20.00L245.25,16.38L243.14,16.77L240.67,13.20L243.45,13.66L246.70,10.31L244.15,10.39L245.79,6.23L241.81,8.61L241.15,5.33L242.96,4.15L236.17,2.65L236.53,0.40L232.61,4.25L229.85,3.11L229.06,6.43L232.02,6.57L232.74,8.48L227.67,7.47L224.94,13.89L222.45,14.70L223.67,17.31L220.40,15.36L218.48,17.49L215.77,14.59L212.09,17.58L211.72,14.66L208.70,15.39L205.82,29.90L201.45,36.53L203.47,38.21L205.44,35.29L207.91,37.83L207.45,39.80L210.44,39.46L210.82,43.99L212.66,42.74L213.79,43.99L210.74,45.30L208.50,43.20L207.45,47.99L206.30,45.81L203.00,55.78L198.94,60.07L199.80,64.12L201.95,65.10L206.41,61.44L207.05,64.81L204.41,64.01L204.86,65.25L202.92,66.13L203.41,69.20L201.45,66.50L198.97,67.23L200.12,69.44L198.22,70.92L201.20,73.24L198.47,74.05L197.63,81.08L199.59,81.64L199.14,83.77L194.14,86.16L194.19,88.62L191.37,85.86L188.98,86.87L191.72,89.74L198.44,88.30L200.26,91.34L201.68,90.23L201.94,92.75L201.87,88.65L203.67,88.87L200.13,85.96L202.14,86.00L202.86,84.37L201.28,83.08L201.35,80.59L203.37,83.63L206.45,80.98L207.34,81.53L204.14,85.59L206.88,88.41L204.45,90.13L204.92,92.22L206.76,91.23L206.10,93.34L208.90,88.98L210.02,89.81L209.12,87.33L210.64,87.58L208.83,85.14L210.55,85.79L212.69,82.37L211.72,86.69L214.72,83.21L215.05,86.58L213.33,87.91L214.76,89.82L214.82,89.81L214.77,89.83L215.69,91.07L214.51,91.94L215.92,91.28L216.48,93.20L213.76,93.38L215.21,93.98L214.21,95.65L216.05,97.84L213.73,96.60L211.60,97.89Z",
  "M197.45,69.69L196.94,70.33L197.34,70.55L197.45,69.69Z",
  "M197.84,72.01L197.22,71.42L196.93,71.61L197.92,73.06L197.84,72.01Z",
  "M211.69,88.60L211.80,87.13L211.56,87.43L211.44,88.67L211.69,88.60Z",
  "M228.55,86.71L226.37,87.70L227.16,89.85L228.32,89.11L228.55,86.71Z",
  "M213.28,91.18L213.50,90.40L214.77,89.83L214.76,89.82L213.42,90.10L213.28,91.18Z",
  "M224.31,93.25L225.15,94.07L227.52,93.02L225.10,87.56L223.77,91.78L224.31,93.25Z",
  "M210.18,93.47L208.22,96.04L203.97,93.28L202.44,96.63L204.53,94.97L204.76,97.09L207.51,96.21L208.26,99.43L211.79,100.89L210.18,93.47Z",
  "M224.89,96.71L223.38,97.45L224.82,99.62L228.76,98.30L224.49,98.41L224.89,96.71Z",
  "M204.68,99.07L204.86,98.36L204.18,98.58L204.28,98.95L204.68,99.07Z",
  "M210.43,100.94L209.04,102.00L209.01,102.46L210.87,101.55L210.43,100.94Z",
  "M190.02,102.28L189.49,102.96L190.26,103.23L190.27,102.56L190.02,102.28Z",
  "M207.19,102.72L206.99,102.69L207.08,103.51L207.63,103.47L207.19,102.72Z",
  "M217.20,110.00L224.42,103.43L222.52,101.75L220.25,101.99L220.93,104.67L219.35,101.95L215.40,104.40L215.22,105.02L215.74,107.76L217.20,110.00Z",
  "M201.47,97.40L200.33,98.59L200.48,96.88L197.11,97.23L199.01,98.16L199.03,100.11L201.64,100.81L202.32,107.72L200.78,106.36L200.08,101.08L197.30,101.31L196.56,104.83L195.24,104.57L195.83,102.50L194.13,102.87L196.26,100.99L195.25,99.76L192.43,103.23L190.89,102.70L189.85,104.57L189.01,103.20L187.82,104.69L189.06,96.53L184.26,94.69L182.30,99.27L182.94,110.12L179.96,116.20L181.25,118.87L178.76,122.83L179.23,131.05L176.18,142.38L177.15,148.45L175.99,151.91L179.58,148.24L183.88,151.91L186.14,149.63L186.17,156.95L187.74,153.56L189.40,154.24L189.60,149.72L191.87,152.38L193.10,149.84L194.74,150.49L196.44,148.77L194.66,146.54L195.66,145.65L200.63,145.27L198.88,141.67L201.16,141.61L200.86,136.63L203.65,137.38L203.87,134.66L202.08,133.76L203.93,131.16L201.38,130.45L202.12,127.77L204.23,129.33L205.30,125.32L203.91,122.67L206.57,123.55L210.01,121.21L207.77,117.03L209.58,113.65L208.20,112.31L209.96,112.16L211.05,108.67L212.20,109.69L215.84,108.30L215.74,107.76L214.83,106.37L215.22,105.02L214.97,103.71L212.89,102.73L212.43,104.41L211.08,103.05L208.11,103.49L207.71,106.52L206.31,105.34L205.26,108.00L204.66,103.46L206.64,100.63L204.84,100.16L203.98,101.53L203.20,98.42L201.47,97.40Z",
  "M191.75,152.77L191.36,153.09L192.16,153.91L192.49,153.43L191.75,152.77Z",
  "M258.10,277.37L258.54,277.69L259.73,277.17L259.04,275.99L258.10,277.37Z",
  "M263.40,308.51L265.13,304.89L261.18,303.49L261.15,306.22L258.79,306.51L259.34,301.10L253.20,303.96L246.94,310.68L251.23,310.94L250.19,308.63L253.14,307.65L254.70,310.17L258.78,311.51L258.87,310.14L263.40,308.51Z",
  "M256.59,318.50L253.81,315.29L252.46,318.25L248.74,320.10L248.85,322.89L256.59,318.50Z",
  "M254.49,323.57L254.78,323.65L254.63,322.72L254.37,322.42L254.49,323.57Z",
  "M233.81,320.87L233.28,318.73L230.29,320.94L230.51,326.82L225.33,338.88L229.11,341.28L233.39,340.32L232.30,334.35L233.75,329.87L231.86,323.40L233.81,320.87Z",
  "M251.06,355.99L250.22,356.40L251.06,356.45L251.06,355.99Z",
  "M255.90,335.35L252.56,333.95L254.08,336.75L252.10,340.58L250.25,339.53L251.98,335.01L249.61,333.64L246.80,340.23L233.85,342.25L235.07,347.82L232.84,350.49L235.97,356.17L231.24,356.46L230.51,358.19L231.70,358.62L227.37,359.64L226.71,362.80L228.46,364.03L227.09,365.50L228.13,366.95L230.71,367.05L231.69,369.93L233.54,369.76L232.27,370.64L230.18,369.85L231.04,372.65L227.67,369.17L225.76,369.20L222.06,372.37L221.70,377.25L224.41,380.02L227.41,380.37L225.58,384.34L223.84,382.64L220.11,383.13L219.73,381.48L218.80,382.47L217.96,378.53L215.79,378.20L217.11,381.25L215.08,383.81L219.51,386.98L233.16,381.54L237.13,377.66L237.00,375.93L239.47,375.79L244.67,366.39L247.54,364.36L248.25,361.31L244.16,358.05L249.41,357.21L248.65,353.41L252.38,353.47L254.04,351.51L250.23,346.45L251.78,347.48L256.85,346.15L257.10,341.83L261.90,339.43L259.78,336.33L258.63,336.74L260.73,333.49L258.86,331.37L260.50,330.98L258.94,326.56L254.20,328.66L252.47,327.26L251.52,328.70L253.16,330.48L251.15,331.10L252.00,332.28L256.85,331.52L258.37,333.81L255.90,335.35Z",
  "M249.91,358.12L250.18,358.87L250.49,358.63L249.91,358.12Z",
  "M259.99,363.77L261.02,363.83L260.49,363.32L259.99,363.77Z",
  "M261.17,365.64L260.88,365.54L260.08,366.28L260.59,366.60L261.17,365.64Z",
  "M213.31,366.04L212.16,366.95L213.21,366.74L213.31,366.04Z",
  "M213.76,369.60L213.23,369.27L213.42,369.90L213.76,369.60Z",
  "M259.45,370.80L259.53,372.02L260.57,372.32L260.40,370.91L259.45,370.80Z",
  "M259.13,372.21L258.48,372.16L259.67,372.58L259.49,372.11L259.13,372.21Z",
  "M257.40,372.20L257.54,373.30L258.30,373.56L257.97,372.79L257.40,372.20Z",
  "M168.13,373.56L169.07,374.28L170.46,373.47L169.08,372.24L168.13,373.56Z",
  "M214.81,376.47L214.87,376.92L215.88,376.36L215.78,376.08L214.81,376.47Z",
  "M213.98,380.30L213.16,380.61L213.59,381.15L213.98,380.30Z",
  "M211.92,383.08L212.59,383.44L213.44,382.19L212.80,381.76L211.92,383.08Z",
  "M166.94,381.92L166.92,388.62L168.73,389.63L168.43,382.96L171.04,381.16L166.60,375.81L164.95,377.97L166.94,381.92Z",
  "M213.54,383.04L214.67,384.83L214.78,383.70L214.18,383.55L213.54,383.04Z",
  "M251.69,385.93L251.39,386.54L252.35,387.56L252.54,386.56L251.69,385.93Z",
  "M255.77,394.93L257.95,395.27L256.66,391.40L250.49,394.22L248.06,394.25L255.00,396.62L255.77,394.93Z",
  "M169.02,395.06L168.88,396.45L169.28,396.21L169.29,395.01L169.02,395.06Z",
  "M174.58,421.22L175.07,421.44L175.24,421.12L174.52,420.92L174.58,421.22Z",
  "M178.79,424.07L178.41,424.60L179.88,424.53L179.53,423.77L178.79,424.07Z",
  "M233.04,424.06L232.58,424.89L233.81,425.61L234.20,425.10L233.04,424.06Z",
  "M182.21,424.99L180.75,424.54L177.60,425.85L178.02,427.25L182.29,427.55L182.21,424.99Z",
  "M217.80,428.67L215.86,424.27L213.64,425.57L214.17,430.09L217.80,428.67Z",
  "M255.64,426.96L255.05,426.96L254.91,427.40L256.28,427.50L255.64,426.96Z",
  "M191.71,430.52L190.45,432.38L195.06,429.16L196.17,424.58L193.68,426.21L193.23,423.72L187.97,429.05L191.71,430.52Z",
  "M256.88,427.45L256.49,428.82L258.63,429.41L258.65,427.79L256.88,427.45Z",
  "M179.77,450.06L180.32,450.46L182.37,449.44L180.91,448.51L179.77,450.06Z",
  "M260.02,463.17L260.76,462.97L260.77,462.52L259.18,462.21L260.02,463.17Z",
  "M240.68,881.33L242.24,883.26L242.15,880.94L241.38,879.34L240.68,881.33Z",
  "M237.40,882.88L235.91,882.28L235.37,885.29L233.40,888.34L236.02,887.77L237.40,882.88Z",
  "M239.40,967.22L239.33,967.94L240.37,967.95L239.99,966.98L239.40,967.22Z",
  "M232.11,971.23L232.16,972.22L233.48,971.06L233.21,970.49L232.11,971.23Z",
  "M257.98,1207.28L255.15,1205.07L253.73,1206.26L254.15,1210.24L258.46,1210.74L257.98,1207.28Z",
  "M252.68,1262.67L255.01,1265.45L255.80,1262.91L254.65,1260.27L252.68,1262.67Z",
  "M214.91,1378.42L213.73,1377.70L213.85,1378.96L214.91,1378.42Z",
  "M208.58,1379.03L210.26,1380.70L211.25,1379.08L210.28,1377.97L208.58,1379.03Z",
  "M183.39,1395.54L180.27,1396.95L187.42,1403.66L187.72,1396.15L183.39,1395.54Z",
  "M284.40,211.08L284.71,211.87L285.84,212.13L285.94,210.57L284.40,211.08Z",
  "M289.77,211.12L289.02,211.54L290.85,211.94L290.31,211.07L289.77,211.12Z",
  "M286.41,212.01L287.82,212.96L288.10,210.71L287.06,210.50L286.41,212.01Z",
  "M281.83,225.00L279.27,226.63L282.99,228.36L279.47,228.36L281.63,230.79L280.57,233.17L281.52,234.48L285.39,234.10L284.48,235.02L286.88,238.53L279.24,234.95L277.86,236.13L280.24,237.86L278.76,240.16L280.30,243.48L284.13,238.96L286.55,241.93L285.04,246.40L287.70,248.15L289.09,246.74L287.71,249.32L293.39,252.44L297.41,243.63L306.87,243.36L308.54,242.87L308.84,239.68L310.55,240.01L310.69,237.49L306.17,235.07L304.15,236.58L302.61,233.68L305.61,231.84L310.59,233.55L311.28,231.89L300.44,226.68L303.74,225.61L303.92,219.79L305.67,217.74L304.66,216.68L295.24,215.65L290.95,212.39L289.10,213.94L290.54,214.33L287.02,214.68L283.93,218.79L284.44,223.86L287.51,226.52L285.17,227.11L284.85,229.14L281.83,225.00Z",
  "M306.50,232.96L306.32,233.47L306.62,233.88L307.26,233.11L306.50,232.96Z",
  "M274.66,242.98L275.16,245.21L277.89,243.82L276.49,242.10L274.66,242.98Z",
  "M301.85,244.96L302.41,246.06L303.15,245.44L302.63,244.26L301.85,244.96Z",
  "M274.08,246.49L275.28,247.78L276.58,246.45L274.80,245.82L274.08,246.49Z",
  "M278.09,247.26L278.75,248.99L280.16,247.17L278.96,245.80L278.09,247.26Z",
  "M300.20,283.04L298.64,285.49L303.50,287.79L305.66,285.71L304.73,283.17L303.02,283.02L301.58,284.24L300.20,283.04Z",
  "M293.01,313.85L295.59,315.89L296.10,314.74L294.11,312.92L293.01,313.85Z",
  "M303.61,320.51L309.16,322.66L309.98,321.36L304.78,318.08L305.28,313.78L301.79,311.24L301.34,316.48L298.43,319.47L299.73,321.43L294.06,324.26L296.73,327.36L299.71,327.05L300.26,323.53L302.13,324.85L303.61,320.51Z",
  "M292.10,323.70L292.35,324.00L292.83,323.70L292.24,322.90L292.10,323.70Z",
  "M285.67,326.29L286.84,327.45L287.94,325.67L287.29,323.15L285.67,326.29Z",
  "M306.62,328.61L306.05,329.56L307.27,330.68L308.15,329.84L306.62,328.61Z",
  "M260.85,345.76L260.53,347.85L263.38,351.91L265.01,351.24L265.92,352.88L270.44,350.35L273.00,351.54L270.18,351.09L266.60,356.25L265.59,355.65L266.32,361.23L263.97,362.55L264.16,359.16L262.73,360.76L263.14,363.23L259.24,368.87L261.49,367.85L261.52,371.79L258.50,374.83L264.28,374.94L267.71,377.06L269.27,374.39L271.47,373.03L271.79,373.15L268.79,377.46L271.60,378.50L272.99,376.19L272.63,380.55L274.25,381.82L276.97,379.19L276.60,373.05L279.29,377.29L278.02,379.72L280.72,381.27L279.52,381.38L280.46,383.26L277.85,384.44L276.30,387.43L279.48,385.87L281.83,386.50L281.98,388.12L283.81,388.00L283.87,387.72L284.12,387.98L284.89,387.93L285.53,391.75L289.69,393.98L289.32,395.31L286.64,394.90L285.65,397.82L282.90,398.40L280.84,396.45L282.88,404.09L284.32,399.46L285.66,400.91L292.36,400.51L290.05,398.44L292.28,397.44L289.81,389.30L292.17,387.96L293.14,389.14L293.68,387.67L296.39,390.30L294.53,390.81L294.80,392.82L296.24,392.08L294.46,393.76L295.60,397.75L297.55,397.92L296.87,395.18L297.89,394.40L298.94,396.39L301.14,393.09L302.89,394.30L304.58,392.55L310.14,394.75L310.16,395.12L310.54,396.30L310.41,398.90L310.59,401.60L308.85,403.68L312.54,410.62L311.42,410.86L312.14,412.50L315.61,414.23L315.00,413.03L316.38,412.52L319.46,414.62L315.72,416.01L317.08,416.11L316.23,420.37L318.03,419.89L319.86,415.37L321.08,417.39L323.10,413.86L327.86,413.37L331.30,415.28L333.73,419.66L337.95,421.21L342.60,425.76L343.33,431.89L341.85,435.90L338.87,437.43L339.27,448.05L344.34,453.42L343.52,455.88L348.05,457.13L346.74,461.43L354.96,468.81L351.30,469.39L350.96,470.79L350.76,469.62L349.32,470.14L348.88,467.48L345.18,468.12L345.23,465.97L343.00,464.22L339.13,465.00L339.40,463.34L335.46,463.18L332.20,459.74L331.56,462.68L330.75,461.96L328.70,459.18L328.80,463.55L326.45,464.53L326.19,468.69L323.93,467.77L322.66,464.57L321.71,471.72L315.16,464.07L311.39,463.83L310.81,462.01L309.18,462.34L309.35,458.68L310.27,457.38L310.85,457.50L310.26,458.65L312.00,459.77L313.42,456.27L312.53,452.77L309.83,452.60L310.33,454.49L309.00,454.51L307.96,452.78L308.27,451.12L309.97,451.11L308.21,450.07L307.86,444.37L311.12,441.08L310.30,446.19L311.58,444.76L311.10,449.16L313.51,450.42L315.39,442.80L312.91,439.13L316.58,435.88L311.65,427.58L307.52,427.65L303.76,424.05L301.17,428.72L303.71,429.66L302.58,430.81L301.23,429.40L298.49,432.51L296.97,429.70L298.73,428.59L296.77,427.48L297.21,425.23L303.30,417.18L300.67,414.40L298.67,414.98L297.84,417.83L295.81,417.68L297.72,413.29L296.41,410.61L294.38,411.29L292.26,407.40L291.47,408.96L285.20,404.59L284.29,406.12L285.54,407.75L281.83,410.18L284.75,409.92L281.76,411.66L284.87,413.35L281.97,414.20L281.34,419.48L278.73,419.98L279.04,425.21L281.89,429.24L279.78,430.03L279.77,432.90L279.62,432.80L278.63,432.43L278.67,432.12L277.77,431.48L275.74,432.72L274.20,441.20L276.77,443.03L275.74,447.48L277.14,448.19L276.73,449.85L277.89,446.58L279.82,446.90L283.32,455.85L285.76,459.83L285.18,463.03L286.91,466.70L290.21,469.50L290.66,471.95L293.97,471.45L294.24,474.21L297.25,477.87L298.47,478.11L299.87,474.29L306.02,475.20L304.54,480.51L306.59,480.54L309.54,485.09L311.68,485.57L310.81,489.91L312.08,489.49L313.01,491.34L312.99,489.74L314.62,490.47L312.39,493.90L314.66,495.38L316.62,493.12L317.79,493.95L318.18,496.74L315.72,499.89L317.30,500.55L319.82,498.41L321.18,499.94L323.56,494.69L325.40,492.63L326.49,492.68L324.08,499.55L322.51,499.78L320.61,503.58L321.63,505.14L318.55,505.65L319.41,507.75L315.72,506.25L316.97,506.10L317.13,502.98L315.22,503.42L313.77,506.78L309.59,507.00L312.14,510.53L315.63,508.63L315.04,516.48L312.41,517.73L307.18,529.21L302.34,531.82L301.66,534.35L301.00,532.07L297.67,535.03L298.25,537.70L303.64,534.43L307.60,536.58L306.98,534.67L312.39,532.50L319.52,524.88L319.83,519.67L321.34,520.62L325.51,519.19L331.97,514.38L335.85,506.68L335.61,501.90L338.29,502.95L339.07,499.25L339.98,500.68L342.02,498.47L341.50,496.99L344.91,494.57L342.92,490.19L345.29,488.62L351.57,490.14L352.26,491.50L353.96,489.43L359.70,490.19L372.06,481.24L380.79,482.93L385.02,480.86L392.49,481.23L394.15,482.61L395.55,484.77L393.56,489.06L398.21,491.04L399.11,495.26L396.75,500.54L391.08,504.33L390.85,506.96L388.44,506.50L388.02,508.68L384.83,510.22L381.40,508.20L382.67,510.49L381.77,516.19L381.91,519.88L385.35,521.21L387.12,524.20L388.77,523.34L390.26,524.83L391.65,528.33L389.93,532.11L392.93,531.98L396.52,529.76L394.30,527.20L397.78,529.09L400.84,528.80L403.98,527.08L405.13,523.48L408.80,522.94L411.02,518.23L409.63,516.90L418.46,517.24L425.59,512.52L427.61,512.93L430.67,507.40L428.14,502.97L433.95,495.57L434.90,482.66L427.12,465.96L422.51,463.06L417.76,459.39L410.04,461.87L406.34,460.85L395.95,467.75L391.46,462.25L386.92,454.92L389.59,451.20L394.16,451.17L394.50,448.14L397.37,447.39L397.63,440.19L399.18,440.50L402.19,439.08L399.14,433.06L396.04,432.43L390.50,416.72L386.25,412.65L385.35,407.88L381.50,403.51L381.90,399.92L386.25,401.24L395.32,393.95L394.86,392.82L401.72,388.05L403.65,381.24L406.96,381.34L406.90,378.53L408.51,378.63L407.95,381.73L415.31,388.89L415.90,392.67L430.29,394.26L434.04,394.03L434.04,399.47L439.24,402.43L437.51,405.99L442.25,407.76L443.52,411.48L445.15,416.24L444.69,422.13L441.40,425.20L443.88,427.57L441.74,427.18L439.04,429.55L442.77,428.98L446.15,432.81L447.82,444.17L449.21,450.99L450.78,452.42L453.31,451.70L451.94,453.34L453.13,454.34L456.10,453.45L466.83,460.46L466.01,466.44L475.01,469.29L476.43,467.59L478.63,473.17L480.88,473.83L481.61,477.20L485.59,481.70L482.19,485.35L484.13,501.04L475.66,505.18L469.24,513.81L461.02,516.58L451.02,523.44L452.87,525.81L452.44,528.18L465.19,526.85L469.91,524.00L482.10,523.89L493.58,519.47L495.65,522.13L493.94,523.34L494.00,526.92L491.30,524.27L489.03,524.45L486.38,525.30L489.53,529.62L485.92,533.08L484.37,531.89L480.35,536.13L474.48,545.76L473.10,544.52L470.51,545.69L468.86,548.80L475.59,553.61L467.79,550.27L475.06,553.94L474.55,555.65L471.15,555.26L470.22,559.19L471.66,561.04L475.02,561.34L476.76,570.19L469.27,577.87L458.82,588.92L458.67,590.37L462.73,591.82L457.45,595.04L456.91,598.83L455.48,597.68L453.91,600.22L455.18,605.26L459.00,605.60L456.34,608.88L453.77,606.50L453.35,611.44L452.25,608.12L450.17,608.71L450.54,612.51L448.14,612.94L444.90,618.24L447.34,620.42L446.64,622.94L444.57,621.16L441.33,622.92L440.25,621.85L433.72,630.42L435.51,632.74L434.32,633.96L435.04,636.68L431.27,635.21L431.48,639.00L436.89,643.99L431.10,638.86L431.82,642.94L429.57,646.88L420.37,653.85L414.84,653.38L412.27,651.70L412.07,648.81L410.23,648.98L410.58,651.10L407.85,648.81L404.10,648.81L398.62,649.89L392.96,653.25L390.83,658.91L390.89,661.39L393.51,663.23L393.24,661.22L395.28,660.18L398.59,665.78L397.66,671.42L395.05,673.60L395.20,676.56L392.56,677.14L392.47,680.80L398.83,687.98L401.26,699.02L401.52,707.30L399.01,713.36L395.42,716.18L396.72,717.88L395.96,720.31L389.85,732.63L392.74,736.68L393.99,744.13L395.20,744.80L399.35,742.38L407.33,748.64L408.17,750.92L409.83,751.03L409.00,752.40L410.55,752.74L409.39,754.49L413.14,755.23L415.87,759.23L417.86,765.79L421.70,766.91L424.60,774.35L425.81,786.79L424.02,800.34L421.14,809.11L412.25,825.22L404.22,829.49L402.92,831.92L395.39,829.66L395.48,824.60L394.09,825.49L394.12,829.35L392.87,826.79L390.74,826.79L388.41,821.88L383.35,828.54L378.97,825.92L377.00,828.69L380.12,827.70L382.52,829.14L389.48,838.42L391.56,840.40L394.94,840.34L394.85,843.22L397.23,842.57L398.95,844.98L397.83,848.42L391.34,850.92L395.16,853.12L400.13,851.84L402.30,854.70L401.63,856.91L396.75,858.34L397.15,861.32L399.93,859.61L400.55,861.37L403.27,861.76L400.07,863.60L403.16,865.25L399.99,866.87L400.59,869.74L405.39,867.32L406.38,868.89L410.27,868.13L413.72,869.79L414.59,865.75L416.86,865.15L419.84,865.48L423.28,868.37L433.03,869.20L440.38,868.78L446.39,870.53L452.48,869.35L458.19,872.91L462.96,878.88L464.47,882.65L462.89,883.85L462.97,888.51L467.59,891.45L473.34,887.78L479.86,892.86L481.65,887.34L488.10,887.04L491.16,884.66L491.91,880.67L490.48,880.29L489.80,882.14L488.85,879.56L494.88,877.12L493.21,871.02L496.75,865.44L488.48,863.77L484.03,858.75L482.36,858.98L479.13,856.00L474.96,851.44L471.25,839.57L471.41,837.06L473.58,835.45L471.84,832.84L469.48,834.26L466.59,828.94L464.04,817.22L464.44,815.81L468.02,816.27L468.15,814.34L463.98,812.38L464.38,809.85L465.36,810.45L464.05,809.12L467.85,810.76L468.93,807.62L465.45,805.69L465.71,804.47L468.22,804.99L471.30,794.39L473.71,795.11L476.19,787.86L474.56,782.36L477.70,777.35L482.52,774.24L483.87,769.05L486.39,767.54L484.93,763.32L485.55,757.36L488.43,753.07L489.69,753.71L495.40,749.32L497.96,749.45L501.69,747.78L505.17,750.14L507.59,749.49L511.19,754.63L524.76,756.58L524.48,759.20L527.70,760.62L530.24,766.63L529.23,770.32L525.51,773.62L522.57,780.58L522.61,785.18L518.22,790.82L505.37,792.39L508.41,790.77L506.25,789.87L507.60,781.02L503.81,776.35L500.55,776.22L499.57,774.38L488.10,776.52L480.61,784.44L485.18,791.13L490.89,795.45L496.50,793.36L500.02,795.59L503.54,792.79L505.31,798.73L503.51,799.28L502.09,812.22L503.76,816.43L510.66,819.17L516.79,828.42L523.55,845.22L525.91,847.82L523.23,855.73L523.80,858.18L523.21,868.69L518.38,875.88L515.38,879.24L518.18,887.12L513.34,899.49L510.53,903.17L506.91,903.66L493.90,914.83L499.22,917.06L498.96,923.98L494.64,930.80L495.38,933.74L497.14,930.42L500.24,931.57L501.45,928.88L500.45,926.23L507.02,925.23L508.03,920.99L513.15,919.34L514.12,917.23L516.42,918.19L528.04,910.11L541.08,908.65L546.92,904.09L550.08,904.01L551.31,901.06L554.29,900.95L562.62,895.68L563.50,893.02L562.20,890.67L567.01,889.59L564.86,887.63L568.76,884.81L569.51,877.95L571.81,875.17L582.27,875.23L585.18,871.01L596.22,862.12L594.05,860.46L590.98,863.22L587.73,862.36L585.93,863.45L583.78,859.24L591.02,853.15L590.23,850.49L591.35,849.51L571.43,842.30L572.59,833.25L580.98,820.34L584.77,817.31L586.43,819.96L586.08,817.01L588.35,817.61L591.72,812.78L597.33,815.05L597.60,816.64L598.89,814.82L602.04,816.11L603.21,813.43L602.28,816.94L604.52,818.88L605.86,819.44L606.90,817.75L612.24,818.67L616.95,825.86L618.27,824.30L620.04,825.35L618.45,830.66L622.40,836.78L628.45,836.62L630.30,834.67L631.59,835.68L634.22,834.29L636.16,839.82L639.82,841.84L642.91,839.19L639.47,836.37L639.42,832.33L642.02,831.86L641.29,829.29L647.38,824.88L645.70,813.90L650.31,811.74L651.21,810.39L649.99,808.29L650.39,806.11L647.98,805.35L647.72,802.35L650.45,801.97L650.26,792.12L653.10,792.01L651.82,790.54L654.14,786.25L655.69,788.14L655.02,789.81L656.24,789.13L655.54,784.79L656.87,781.73L665.79,775.44L666.90,773.30L665.03,772.16L666.04,769.92L668.42,770.26L666.70,764.28L664.74,764.14L664.37,761.75L668.25,759.76L665.63,756.89L666.96,755.54L666.44,751.86L668.12,751.22L667.13,747.95L669.24,747.14L668.24,743.25L672.55,735.00L665.40,727.12L664.93,715.90L666.94,712.34L665.98,708.70L668.37,703.04L667.31,702.81L666.69,705.96L665.98,704.65L666.41,702.19L669.09,700.53L669.10,694.57L676.60,669.41L679.26,659.08L683.57,647.83L684.28,641.46L690.61,621.21L690.52,616.55L694.67,604.08L699.58,595.57L702.02,595.41L701.36,590.72L704.06,587.76L703.36,585.30L706.12,578.17L715.61,574.65L708.14,573.66L713.87,571.47L712.61,569.61L709.68,571.27L710.00,568.06L707.28,571.72L705.75,570.86L708.49,568.57L707.24,565.95L709.18,559.44L713.53,559.59L712.88,561.53L716.95,562.98L723.77,556.13L719.91,554.63L720.26,551.53L718.53,550.62L717.90,553.36L714.45,553.00L713.99,545.15L716.64,537.83L720.56,532.57L726.82,532.17L729.73,529.18L729.13,527.96L731.55,526.05L730.81,525.05L733.48,519.92L730.07,521.30L729.90,518.97L732.14,518.34L731.20,515.40L733.06,515.15L734.26,511.54L735.91,511.41L736.75,514.63L737.64,510.50L742.46,508.29L742.75,504.29L744.84,503.36L748.33,507.40L750.53,505.70L748.95,502.90L749.85,499.50L752.89,500.35L751.47,497.61L752.33,496.30L755.39,496.57L754.87,494.83L756.84,492.49L754.47,491.97L756.19,489.34L753.80,486.19L755.43,485.16L755.12,482.27L758.16,485.71L759.39,485.17L757.41,482.37L758.10,479.03L760.44,479.31L759.41,482.76L761.11,483.65L761.91,481.58L764.79,483.50L764.21,480.99L765.94,479.59L765.55,481.31L768.32,483.77L770.94,480.64L770.73,478.21L773.52,478.14L774.05,481.29L775.82,481.92L776.88,477.73L783.60,473.13L783.62,470.59L779.02,468.26L776.79,469.48L779.25,471.98L778.06,473.57L775.55,472.11L773.71,474.58L772.73,470.61L769.99,471.14L771.92,469.72L771.16,466.02L773.73,468.06L784.57,457.01L781.39,455.21L778.85,457.00L777.48,449.26L780.75,449.42L780.52,450.97L784.01,453.24L783.73,449.30L787.49,445.80L789.42,445.42L791.52,448.12L791.94,445.58L800.00,446.75L799.46,443.83L797.13,442.64L791.34,442.86L789.12,441.54L789.23,444.69L784.07,446.47L781.30,445.22L782.45,439.82L778.03,444.80L776.27,442.04L774.04,441.17L773.23,443.04L770.39,439.63L768.37,441.15L768.13,439.17L765.62,438.41L766.22,436.37L764.42,435.58L764.04,437.09L758.31,431.62L760.05,429.85L761.28,431.48L762.26,429.54L760.77,427.00L764.64,423.12L766.48,416.62L777.71,417.84L781.04,415.36L785.03,415.18L782.47,411.97L781.13,409.83L781.67,406.70L779.07,407.14L779.56,412.37L776.50,413.82L774.63,413.12L774.99,411.58L769.94,412.24L768.56,406.16L767.30,406.01L766.61,412.50L763.11,412.81L762.07,409.08L760.97,410.61L757.56,408.61L752.28,410.10L750.37,407.23L754.00,406.19L756.15,402.22L759.14,402.65L760.66,399.90L763.66,398.60L762.87,397.73L760.41,397.09L756.90,398.91L755.07,398.44L755.82,396.71L753.86,396.63L748.94,400.65L746.18,398.09L739.31,397.92L745.25,391.81L743.81,388.78L746.19,383.97L749.65,382.21L753.92,378.95L752.13,378.12L755.67,372.76L754.39,371.14L756.05,368.14L758.23,368.19L761.18,362.29L753.52,364.52L754.29,366.99L751.24,365.26L738.45,368.64L729.44,366.09L729.42,368.82L721.73,362.55L720.50,364.22L721.05,362.08L716.03,359.28L713.63,359.35L714.52,362.60L712.63,359.66L710.70,360.45L711.85,364.12L710.67,364.69L708.88,360.85L696.41,365.04L694.08,367.78L678.80,362.82L676.79,360.32L674.22,342.45L674.76,338.94L679.88,337.15L683.32,337.65L686.26,341.60L694.39,342.22L695.70,341.59L695.96,336.48L700.02,335.98L705.80,335.16L706.35,330.89L702.17,326.19L703.98,323.08L709.29,323.27L714.87,327.41L718.05,327.46L721.77,316.89L723.57,312.34L726.02,312.63L726.09,305.33L724.29,305.95L723.98,303.58L727.26,292.94L724.96,283.49L717.98,275.17L716.29,268.61L714.35,268.70L709.38,261.11L706.43,262.85L706.68,260.75L704.01,257.97L701.63,259.96L700.71,258.38L697.92,258.89L697.98,256.81L692.49,255.51L690.72,256.84L691.14,259.78L689.18,259.87L688.16,256.92L684.51,259.21L680.76,258.16L681.36,260.02L674.97,260.73L674.32,262.62L676.05,264.44L673.97,264.93L673.83,267.68L672.19,266.50L671.16,267.79L671.63,269.36L668.17,275.26L666.92,273.83L658.73,280.70L660.99,286.12L659.70,286.73L648.10,283.64L642.73,285.46L636.62,282.92L627.71,283.48L622.76,278.91L622.47,276.61L620.53,275.89L619.10,278.31L617.35,278.22L613.80,277.37L611.90,274.41L607.64,274.70L606.27,273.31L603.60,274.42L592.65,270.99L591.38,274.09L589.46,274.11L586.59,270.00L577.85,256.25L571.24,244.79L571.52,240.74L569.84,242.47L568.95,240.96L568.23,239.11L571.85,236.41L570.56,234.02L567.90,236.07L566.88,234.67L568.70,233.13L568.58,229.83L565.27,230.35L568.20,227.91L567.81,226.58L571.37,225.49L570.58,223.44L564.06,225.69L560.91,225.97L558.80,220.91L559.59,218.54L562.97,219.72L563.23,217.19L566.66,215.53L567.68,211.18L564.23,211.50L566.04,206.83L568.01,209.84L568.92,205.85L565.63,203.13L567.39,201.39L569.01,202.21L569.18,199.37L570.89,199.23L568.36,197.04L570.33,195.59L570.36,192.68L572.57,192.68L573.18,188.70L568.52,185.64L566.40,187.68L560.15,187.57L560.02,191.23L556.56,193.56L553.49,201.24L544.98,206.21L544.06,202.69L540.48,203.37L543.29,201.91L540.65,199.19L536.23,201.56L540.07,198.81L536.09,199.46L537.06,195.80L530.58,198.05L530.14,202.30L526.52,205.30L526.53,209.36L525.31,209.39L526.06,205.58L521.50,208.70L514.57,209.77L513.41,206.30L515.39,208.70L524.39,205.63L528.35,202.67L528.87,199.64L527.37,198.67L529.01,198.93L529.26,197.44L526.88,195.28L520.48,194.60L520.01,196.38L514.93,197.37L518.62,195.89L516.75,193.25L518.61,192.99L518.59,191.31L515.15,191.83L515.16,195.17L512.36,195.18L512.03,196.42L507.61,193.76L502.79,193.76L498.17,198.51L495.80,199.86L496.04,202.93L490.14,206.88L480.59,208.79L476.04,208.16L474.53,205.69L470.31,205.96L467.39,206.26L467.17,209.91L463.57,214.06L456.80,215.61L455.46,223.62L453.81,225.41L449.15,224.49L450.69,227.96L449.56,230.70L450.51,232.18L452.81,231.29L454.64,233.71L454.16,239.99L449.82,247.21L446.62,249.46L444.29,248.88L443.59,250.36L443.23,252.80L436.95,258.85L428.25,263.10L423.70,263.54L425.60,266.25L431.46,267.55L431.26,264.00L432.99,262.28L439.42,260.81L440.49,258.27L446.27,256.83L445.22,259.81L446.70,263.82L440.82,265.54L444.40,266.91L444.14,268.30L441.32,267.98L440.62,270.00L441.79,270.39L440.51,272.88L442.73,274.38L440.03,274.02L438.88,276.10L440.18,277.39L438.57,278.07L437.60,276.20L436.47,276.77L438.29,279.34L436.68,280.13L434.10,277.38L429.67,279.88L421.27,279.15L419.17,282.83L414.07,283.46L407.82,278.68L410.35,277.96L412.11,279.63L412.69,275.77L403.78,274.42L402.29,270.59L404.91,266.39L403.59,264.71L399.14,261.70L398.38,266.95L396.51,268.66L387.75,271.58L387.17,273.35L388.84,275.48L386.01,279.50L381.58,281.21L377.30,279.58L376.87,282.48L373.20,282.85L375.09,287.62L379.79,285.05L383.07,287.13L382.46,289.06L379.90,289.13L379.03,292.06L381.18,289.52L384.42,291.26L387.49,288.71L389.30,288.46L389.54,289.97L387.11,294.49L380.94,297.65L382.66,299.44L381.32,301.28L376.15,300.56L364.56,305.01L362.91,311.16L368.76,310.73L362.62,311.54L362.39,315.59L359.90,316.99L353.97,317.19L347.94,315.18L345.64,311.68L348.03,309.98L346.76,308.04L343.02,310.74L340.82,308.43L347.63,300.93L345.02,299.41L344.10,296.35L339.13,294.55L339.37,292.43L335.84,293.15L334.79,291.40L332.31,291.43L328.95,295.18L323.92,292.79L322.42,290.36L321.71,294.28L323.50,295.46L321.87,299.88L323.59,300.94L318.00,298.83L317.77,302.50L320.94,308.61L318.94,310.84L321.73,309.97L323.67,312.66L322.45,317.08L320.68,317.67L318.90,316.17L319.42,312.80L317.00,311.75L317.12,309.01L312.80,307.42L310.10,310.78L312.76,313.39L312.18,315.13L309.39,314.10L307.86,316.21L316.77,322.92L316.16,325.33L321.54,327.51L325.13,326.28L325.33,330.67L325.73,335.01L321.97,337.76L321.66,343.15L317.95,345.09L318.56,346.84L320.19,345.97L321.44,347.11L319.15,351.15L317.47,350.98L318.08,353.05L321.40,353.89L322.32,356.68L320.85,355.83L320.50,357.43L318.14,355.70L312.32,344.46L309.15,343.93L306.42,345.85L309.86,343.23L309.01,336.11L306.41,336.02L305.26,340.41L299.76,337.25L291.26,342.42L288.62,341.26L289.40,338.69L287.23,338.65L287.24,340.39L285.29,340.77L283.29,337.57L285.10,332.42L286.98,332.13L284.23,329.14L280.56,336.19L279.06,335.70L278.45,337.81L275.53,336.21L275.70,338.46L274.20,338.63L271.90,335.66L266.98,336.80L268.19,333.62L262.28,335.08L263.81,338.31L262.59,342.53L263.54,345.98L260.85,345.76Z",
  "M264.36,352.50L264.42,353.05L264.92,352.85L264.36,352.50Z",
  "M262.54,359.79L263.09,359.93L262.98,359.26L262.54,359.79Z",
  "M261.85,359.99L261.43,360.28L261.49,361.43L262.46,360.59L261.85,359.99Z",
  "M260.81,361.80L260.30,362.42L260.83,363.42L261.36,363.27L260.81,361.80Z",
  "M261.33,374.91L261.28,375.92L261.68,376.01L261.86,375.54L261.33,374.91Z",
  "M263.93,375.91L263.58,376.43L263.68,377.35L264.34,377.00L263.93,375.91Z",
  "M265.02,377.27L265.02,378.58L267.33,378.62L267.19,378.13L265.02,377.27Z",
  "M268.62,377.53L267.94,377.62L267.86,378.67L269.27,378.64L268.62,377.53Z",
  "M264.85,378.88L265.16,379.63L265.66,379.53L265.34,378.95L264.85,378.88Z",
  "M268.67,379.31L267.85,379.90L267.77,380.57L268.80,380.54L268.67,379.31Z",
  "M271.61,381.43L270.98,379.79L270.49,381.85L271.42,381.96L271.61,381.43Z",
  "M271.40,382.05L270.83,382.26L271.21,383.20L271.73,382.25L271.40,382.05Z",
  "M266.91,384.26L265.58,383.87L265.96,381.73L267.57,382.98L266.69,380.80L264.66,381.16L264.31,382.95L266.61,386.48L265.07,389.15L267.22,387.88L266.91,384.26Z",
  "M284.71,388.61L284.12,387.98L283.81,388.00L283.75,388.32L284.71,388.61Z",
  "M279.40,389.23L279.87,389.31L279.64,388.70L279.40,389.23Z",
  "M276.79,388.52L276.54,388.63L276.80,389.84L277.02,389.09L276.79,388.52Z",
  "M283.31,389.96L283.43,391.34L284.26,391.87L283.84,390.29L283.31,389.96Z",
  "M284.69,393.53L284.69,395.10L285.63,395.25L285.88,394.06L284.69,393.53Z",
  "M301.34,395.67L301.02,396.39L301.36,396.53L301.87,396.25L301.34,395.67Z",
  "M301.31,403.91L296.21,404.39L298.48,409.75L300.38,409.99L298.48,411.63L298.88,413.68L302.47,413.59L301.69,415.47L304.50,416.96L303.86,414.85L307.32,414.16L302.40,409.32L302.50,407.38L304.61,404.29L304.36,410.06L310.01,408.77L308.54,403.37L310.31,401.00L310.41,398.90L310.16,395.12L310.11,394.95L304.64,393.48L302.43,396.52L305.84,397.78L302.61,397.29L303.05,400.94L301.72,400.84L301.11,398.34L299.39,399.00L301.31,403.91Z",
  "M307.33,410.23L306.75,411.70L308.25,412.90L308.17,411.11L307.33,410.23Z",
  "M262.32,413.25L261.62,413.14L261.48,413.50L262.25,413.62L262.32,413.25Z",
  "M278.15,413.88L277.80,413.62L277.38,413.75L277.39,414.33L278.15,413.88Z",
  "M270.53,413.14L270.19,415.83L266.90,417.84L265.91,420.58L265.98,422.56L268.31,423.64L269.11,422.40L270.10,423.62L271.42,420.96L273.98,421.24L274.99,418.83L273.97,418.16L276.03,416.77L275.20,414.89L276.87,414.38L270.53,413.14Z",
  "M276.65,418.27L274.69,420.96L274.94,422.63L276.86,420.68L276.65,418.27Z",
  "M301.94,421.46L301.49,422.20L301.80,422.28L301.94,421.46Z",
  "M266.59,424.06L260.50,421.90L260.53,424.57L262.33,425.27L260.16,427.04L261.22,427.60L259.48,427.34L259.33,429.36L266.59,424.06Z",
  "M300.47,429.37L300.08,428.48L299.64,428.88L300.08,429.48L300.47,429.37Z",
  "M279.62,432.80L279.69,432.82L279.10,429.39L279.40,427.15L278.67,432.12L279.62,432.80Z",
  "M299.85,430.42L300.38,430.05L300.19,429.72L299.69,429.94L299.78,430.27L299.85,430.42Z",
  "M299.85,430.42L299.83,430.44L299.78,430.27L299.44,429.53L298.58,430.67L299.23,431.02L299.93,430.59L299.85,430.42Z",
  "M269.74,444.95L268.34,442.71L267.78,447.68L269.77,450.13L272.19,450.37L274.10,448.09L273.76,445.33L271.40,443.93L269.74,444.95Z",
  "M267.05,458.46L266.73,459.60L269.10,459.42L269.11,456.93L267.05,458.46Z",
  "M302.43,481.89L302.49,482.33L302.94,482.36L303.18,481.66L302.43,481.89Z",
  "M303.91,503.37L307.03,504.24L306.12,502.58L303.15,501.17L303.91,503.37Z",
  "M305.38,504.86L307.11,507.45L308.37,506.82L307.33,504.37L305.38,504.86Z",
  "M299.96,514.62L301.72,517.54L302.81,514.09L301.02,513.28L299.96,514.62Z",
  "M298.41,522.71L297.82,523.55L298.20,523.59L298.41,522.71Z",
  "M300.56,746.99L291.27,750.83L289.43,752.47L290.43,754.89L288.10,756.04L288.62,758.40L285.25,764.53L286.23,765.90L281.23,766.57L282.95,772.78L286.36,773.63L286.83,775.88L289.31,775.92L289.42,773.44L291.38,772.22L293.14,775.91L292.54,773.25L298.13,767.87L295.78,766.36L295.49,763.76L299.38,759.73L298.49,755.00L300.35,752.15L302.18,752.23L302.45,753.93L304.72,753.28L306.73,745.53L311.82,740.39L309.97,737.18L311.86,735.03L309.73,735.35L308.23,733.59L307.33,737.56L309.10,739.21L307.74,741.95L306.16,741.84L307.31,743.46L306.33,746.08L304.15,745.56L302.06,747.78L300.56,746.99Z",
  "M273.86,1213.63L272.70,1213.43L272.96,1215.30L273.86,1213.63Z",
  "M291.43,1268.03L286.54,1271.57L289.61,1283.82L292.73,1283.10L292.54,1281.46L297.21,1277.70L298.62,1266.58L291.43,1268.03Z",
  "M267.32,1322.92L272.54,1323.04L270.68,1316.79L267.66,1315.56L265.59,1318.98L267.75,1320.98L267.32,1322.92Z",
  "M376.33,115.48L375.19,117.24L376.66,117.81L378.19,115.23L376.33,115.48Z",
  "M361.26,211.64L362.12,212.64L362.46,211.06L361.96,209.72L361.26,211.64Z",
  "M324.15,277.82L324.89,274.22L321.72,278.83L325.29,281.69L325.71,279.39L324.15,277.82Z",
  "M331.31,279.21L331.79,280.08L333.50,279.72L332.47,277.61L331.31,279.21Z",
  "M321.19,280.67L319.31,281.28L320.87,282.47L321.19,280.67Z",
  "M363.80,286.52L364.94,287.30L365.76,285.96L364.38,284.75L363.80,286.52Z",
  "M327.23,288.86L327.14,292.66L330.77,290.68L328.94,286.77L327.23,288.86Z",
  "M348.59,292.85L346.64,296.48L348.64,296.60L348.59,292.85Z",
  "M351.04,309.34L351.31,310.51L352.97,310.64L352.42,308.75L351.04,309.34Z",
  "M320.51,337.33L319.30,336.18L322.29,336.49L324.23,334.34L320.02,332.19L319.43,333.99L317.59,331.11L318.58,327.93L310.78,325.28L310.87,326.19L314.19,328.29L313.05,330.62L314.55,337.36L312.19,338.47L313.99,341.96L315.65,338.29L319.02,338.38L320.51,337.33Z",
  "M315.78,430.66L315.20,430.46L315.00,431.03L315.51,431.62L315.78,430.66Z",
  "M314.09,438.67L313.72,438.88L314.27,439.90L314.85,439.65L314.09,438.67Z",
  "M334.58,451.42L337.89,453.41L338.34,451.42L333.21,447.41L334.58,451.42Z",
  "M311.42,450.98L312.94,451.46L313.22,450.55L312.00,450.60L311.42,450.98Z",
  "M341.34,454.03L341.60,454.74L342.08,453.84L341.83,453.65L341.34,454.03Z",
  "M310.69,459.59L311.60,460.48L311.94,460.05L310.69,459.59Z",
  "M338.21,461.85L339.06,462.28L339.01,461.64L338.71,461.32L338.21,461.85Z",
  "M312.48,462.57L313.62,463.19L314.23,462.56L312.54,461.39L312.48,462.57Z",
  "M316.90,462.46L316.16,462.91L316.47,463.38L316.90,462.46Z",
  "M362.76,489.00L362.29,489.07L362.55,489.99L363.01,490.08L362.76,489.00Z",
  "M350.07,489.91L346.81,489.38L347.84,492.64L351.90,492.34L349.48,491.77L350.07,489.91Z",
  "M306.16,538.83L306.15,542.93L309.53,540.95L308.56,537.51L306.16,538.83Z",
  "M362.86,557.87L362.32,563.73L358.06,570.59L355.62,573.42L353.42,582.66L351.71,584.47L352.90,586.30L348.81,591.56L350.10,599.29L352.59,599.77L352.87,603.74L358.01,602.07L360.77,604.80L362.37,602.35L369.48,605.49L367.33,606.54L368.56,608.47L367.63,611.01L365.26,610.95L363.62,606.08L361.69,605.01L359.80,608.90L359.58,605.27L356.54,606.00L351.56,611.48L347.69,619.95L348.88,620.67L350.63,619.13L356.88,621.88L357.35,625.12L354.18,626.23L352.51,630.51L354.62,632.46L356.90,630.96L356.98,633.39L359.11,633.59L361.17,630.75L360.51,628.42L362.82,628.49L363.74,630.31L366.64,627.93L369.90,627.91L371.47,626.13L369.68,624.51L371.77,623.18L371.41,619.92L373.34,619.95L373.36,623.65L375.70,622.78L376.20,618.43L374.30,618.97L374.05,617.11L377.06,617.25L382.79,608.57L386.13,609.89L389.80,606.64L389.16,605.21L384.16,606.16L385.81,602.58L387.75,602.16L386.68,600.03L388.15,599.55L387.95,596.97L389.38,598.25L391.59,595.70L390.16,601.38L392.52,602.94L396.92,599.91L399.50,591.67L402.44,588.29L400.55,585.43L401.92,583.99L401.12,582.33L398.92,581.47L396.85,584.21L395.76,583.66L397.28,582.45L396.51,579.08L399.08,576.93L398.66,574.93L400.43,575.02L396.32,565.74L398.80,562.27L395.36,556.28L396.54,554.11L394.40,543.10L379.43,544.34L368.32,551.31L363.51,551.53L361.21,548.68L362.28,546.27L359.69,545.81L356.87,547.92L361.77,550.93L364.33,557.56L362.86,557.87Z",
  "M382.78,612.61L383.04,614.98L386.42,613.40L384.40,611.23L382.78,612.61Z",
  "M392.03,617.18L391.08,616.34L389.79,620.35L388.31,620.14L390.38,624.23L391.74,618.80L394.77,615.34L394.12,613.41L392.03,617.18Z",
  "M393.25,619.92L393.19,620.62L394.13,620.01L393.93,619.62L393.25,619.92Z",
  "M392.37,624.03L392.51,624.52L393.10,624.43L393.21,623.63L392.37,624.03Z",
  "M370.90,630.33L369.16,631.77L370.99,631.97L370.90,630.33Z",
  "M361.09,637.00L363.78,641.08L364.60,638.97L360.44,633.06L358.73,633.83L358.02,640.21L361.09,637.00Z",
  "M377.60,626.72L376.83,628.35L378.04,628.98L376.74,629.80L379.52,630.53L377.44,630.82L378.62,632.30L376.17,632.31L377.21,633.67L375.26,633.47L373.69,635.36L377.45,638.16L378.90,641.48L378.38,649.50L383.72,654.60L385.39,654.30L385.97,657.44L387.82,658.54L390.31,657.11L392.25,650.25L391.28,648.38L399.00,642.40L398.10,638.52L394.24,639.20L394.48,633.50L397.07,631.31L395.19,631.37L391.47,623.36L389.33,627.03L387.61,624.21L387.16,627.09L385.92,626.55L387.28,631.32L382.31,626.62L381.11,626.73L381.86,628.01L377.60,626.72Z",
  "M389.86,675.49L390.57,675.57L391.03,674.87L389.42,673.77L389.86,675.49Z",
  "M321.63,723.13L323.70,721.98L325.07,722.97L323.65,725.74L327.15,726.24L327.18,730.52L332.63,727.89L333.99,725.09L336.88,727.10L338.17,726.44L339.51,722.16L336.99,720.42L339.47,718.67L337.95,715.01L341.00,714.30L341.02,713.61L333.88,714.17L336.77,718.91L335.11,720.55L328.87,716.94L322.56,710.47L318.89,710.83L315.09,715.85L316.01,720.55L318.96,721.92L320.40,713.84L321.43,717.42L324.95,716.44L320.67,718.99L321.63,723.13Z",
  "M320.41,724.53L319.05,724.84L320.20,725.83L320.94,723.82L320.41,724.53Z",
  "M319.90,726.55L315.82,728.17L314.33,731.97L316.33,737.58L318.41,735.57L316.81,733.88L321.03,731.73L319.15,729.99L320.61,728.11L319.90,726.55Z",
  "M388.97,842.10L388.61,843.90L389.53,843.96L390.41,840.96L388.97,842.10Z",
  "M339.15,979.83L344.16,978.23L346.62,975.29L341.20,969.90L333.93,973.02L335.20,976.86L339.15,979.83Z",
  "M336.39,1182.18L334.82,1183.77L335.94,1186.19L332.71,1189.90L335.74,1194.72L340.18,1196.88L342.90,1194.13L337.65,1186.81L336.39,1182.18Z",
  "M322.50,1213.28L320.11,1215.14L318.72,1219.24L324.39,1228.82L327.10,1230.22L330.32,1228.73L336.13,1229.09L331.81,1223.28L331.00,1216.70L322.50,1213.28Z",
  "M441.92,205.03L446.31,206.20L449.96,200.08L447.99,199.33L445.78,200.87L441.82,200.56L441.92,205.03Z",
  "M431.79,239.67L434.65,238.46L433.89,237.23L431.95,236.65L431.79,239.67Z",
  "M405.03,256.08L403.17,254.90L402.14,255.69L403.99,257.86L405.03,256.08Z",
  "M415.36,258.68L418.05,263.49L421.79,263.16L421.76,262.06L419.08,256.62L416.23,257.33L415.36,258.68Z",
  "M439.35,264.70L443.49,264.00L445.77,262.26L444.26,259.72L438.52,263.03L439.35,264.70Z",
  "M420.00,276.53L421.33,274.65L420.02,269.86L418.74,269.02L417.89,276.49L420.00,276.53Z",
  "M400.56,439.85L400.13,441.54L401.83,441.14L402.10,440.05L400.56,439.85Z",
  "M424.88,528.88L427.22,530.49L427.71,529.24L426.25,528.41L424.88,528.88Z",
  "M450.53,540.20L449.87,537.11L452.22,533.60L449.27,530.35L452.10,526.48L448.97,523.65L444.41,525.79L438.78,532.30L438.47,533.68L443.36,534.94L443.92,536.43L441.33,538.85L440.81,542.50L448.07,543.23L450.53,540.20Z",
  "M437.55,533.48L435.52,534.51L436.51,535.34L437.55,533.48Z",
  "M452.72,536.86L453.81,545.10L458.43,537.59L455.46,533.22L452.72,536.86Z",
  "M442.14,543.32L442.96,545.37L445.90,545.02L442.14,543.32Z",
  "M438.84,545.37L440.61,546.27L441.47,544.65L440.52,544.22L438.84,545.37Z",
  "M397.96,567.52L402.34,577.42L406.36,577.33L406.80,581.24L404.28,583.62L406.24,584.36L408.19,583.60L410.22,577.81L412.98,577.42L413.75,579.75L420.20,581.46L424.64,580.65L429.24,575.98L429.94,579.16L428.49,580.91L430.38,586.25L432.66,583.03L435.89,583.76L439.81,580.96L442.11,576.67L440.58,575.00L443.14,574.82L441.48,572.06L445.88,566.55L451.70,549.26L448.63,548.11L446.68,550.46L443.74,549.53L437.76,554.90L437.49,551.78L433.04,550.77L433.24,549.13L431.09,548.43L421.72,550.88L414.46,559.31L409.60,560.59L404.12,565.24L397.96,567.52Z",
  "M446.40,586.21L442.97,580.60L441.74,584.54L444.33,585.85L443.20,587.94L446.40,586.21Z",
  "M422.40,586.10L422.40,587.79L423.83,587.31L423.59,584.96L422.40,586.10Z",
  "M403.38,586.18L403.28,588.88L404.66,588.49L404.62,585.33L403.38,586.18Z",
  "M427.18,588.87L428.87,590.38L430.07,589.58L429.19,587.53L427.18,588.87Z",
  "M421.48,588.50L420.72,591.08L419.18,589.69L418.27,590.72L418.77,592.86L421.81,593.42L422.93,595.44L426.75,593.71L427.06,592.57L421.48,588.50Z",
  "M432.09,594.06L430.18,592.49L424.73,597.21L425.59,601.21L423.00,601.24L419.36,604.04L424.94,604.05L431.22,599.04L434.20,594.79L433.71,593.06L432.09,594.06Z",
  "M411.43,610.75L411.25,606.52L408.44,604.87L409.22,603.99L404.10,605.65L404.29,607.98L401.02,608.43L399.85,617.57L402.61,615.17L405.95,616.60L405.29,614.40L409.76,610.31L411.43,610.75Z",
  "M402.76,619.13L403.39,618.91L403.33,618.04L401.89,616.99L402.76,619.13Z",
  "M400.45,624.74L401.34,623.99L400.83,623.82L400.45,624.74Z",
  "M398.05,625.88L398.66,624.26L395.83,619.57L396.21,624.03L394.36,625.43L397.26,628.73L396.44,627.02L398.73,627.92L398.02,629.30L399.15,628.21L399.39,625.73L398.05,625.88Z",
  "M444.27,979.07L441.87,978.20L439.06,980.97L442.24,980.27L448.68,982.79L449.58,980.37L445.67,977.89L444.27,979.07Z",
  "M419.11,980.73L413.25,984.93L410.90,984.96L410.95,988.12L412.75,987.83L413.94,989.63L413.22,987.78L422.54,986.59L422.35,983.27L419.11,980.73Z",
  "M404.53,1065.85L397.03,1063.01L395.05,1065.37L392.99,1062.36L389.62,1062.73L390.31,1061.17L387.49,1062.05L385.62,1060.73L390.84,1069.29L396.05,1068.01L395.14,1073.01L399.06,1077.89L403.28,1077.21L405.42,1074.23L410.60,1074.92L410.83,1071.30L404.53,1065.85Z",
  "M510.67,173.99L509.35,173.27L508.63,173.88L510.04,175.87L510.67,173.99Z",
  "M460.21,203.41L462.34,203.96L460.43,200.17L458.78,199.82L460.21,203.41Z",
  "M476.79,489.19L480.59,489.18L481.01,487.74L476.97,487.79L476.79,489.19Z",
  "M455.57,529.34L456.88,532.56L459.54,532.77L458.23,534.53L459.45,536.14L463.35,530.42L463.09,528.35L459.73,527.71L455.57,529.34Z",
  "M508.07,753.62L507.91,754.36L508.90,753.86L508.47,753.49L508.07,753.62Z",
  "M508.65,776.56L508.42,777.69L508.98,777.46L509.24,776.82L508.65,776.56Z",
  "M474.88,782.46L474.83,783.10L475.58,783.07L475.55,782.26L474.88,782.46Z",
  "M473.46,797.43L472.11,797.05L471.88,797.64L473.15,798.21L473.46,797.43Z",
  "M499.08,862.00L498.05,862.61L498.33,863.91L499.93,863.22L499.08,862.00Z",
  "M438.04,1103.14L440.40,1104.58L442.53,1109.32L442.56,1117.13L444.24,1116.85L447.54,1123.52L458.74,1126.84L461.74,1125.42L465.76,1127.06L467.58,1125.26L470.85,1126.17L479.43,1123.60L493.99,1108.74L497.82,1090.54L494.62,1085.56L482.37,1080.99L482.05,1079.07L476.80,1076.89L470.41,1071.59L467.10,1072.26L463.43,1069.37L461.00,1070.18L460.70,1065.97L459.49,1069.85L455.04,1067.99L453.50,1069.07L453.50,1074.08L449.84,1076.25L443.84,1084.42L435.11,1085.43L434.75,1089.56L438.04,1103.14Z",
  "M529.00,180.77L530.13,181.32L528.12,177.78L528.22,179.04L529.00,180.77Z",
  "M528.35,192.29L527.19,190.96L520.46,191.63L521.91,194.41L530.05,195.57L534.92,193.34L532.19,190.68L528.35,192.29Z",
  "M576.40,219.41L575.40,213.77L573.33,214.11L574.32,219.76L574.96,223.35L577.01,223.02L576.40,219.41Z",
  "M574.99,837.53L572.85,837.73L573.48,841.19L575.63,840.03L574.99,837.53Z",
  "M537.41,1001.61L539.06,1000.25L539.83,997.68L537.61,991.45L534.34,995.69L533.49,1001.21L537.41,1001.61Z",
  "M583.42,992.26L585.72,985.62L583.36,983.51L583.39,979.79L581.69,978.85L581.32,974.08L579.88,973.06L576.74,977.32L575.02,976.75L574.86,979.12L569.00,986.43L569.94,991.36L566.14,997.52L566.84,999.49L565.34,999.71L566.25,1002.08L563.46,1001.61L560.24,1009.51L555.57,1014.91L556.87,1016.69L555.62,1021.07L557.20,1024.18L558.10,1034.81L556.32,1040.39L549.98,1053.30L542.69,1062.91L540.14,1067.40L535.71,1067.10L539.33,1079.15L537.60,1090.93L540.77,1097.35L543.04,1097.60L545.90,1093.66L554.48,1089.65L561.16,1090.28L560.60,1085.45L564.06,1083.74L561.19,1078.12L563.62,1073.83L560.20,1070.21L559.19,1068.42L561.32,1067.69L561.45,1065.80L560.07,1063.68L563.55,1057.84L563.57,1054.51L567.02,1050.52L567.92,1046.20L570.96,1046.12L574.27,1043.68L575.10,1036.28L579.85,1031.92L579.37,1025.82L580.62,1022.99L578.70,1021.37L578.98,1018.92L581.92,1010.62L584.69,1009.11L583.42,992.26Z",
  "M706.24,248.06L711.50,248.94L715.70,245.37L711.67,243.76L706.04,245.85L703.47,249.29L706.24,248.06Z",
  "M772.61,359.32L768.99,359.80L770.21,361.27L772.61,359.32Z",
  "M778.24,386.92L778.18,388.24L779.39,387.73L780.25,386.47L778.24,386.92Z",
  "M782.76,402.52L784.41,404.08L785.48,402.70L784.27,401.52L782.76,402.52Z",
  "M765.56,426.62L765.84,429.56L762.80,432.20L764.13,434.24L769.77,430.38L767.21,429.11L769.90,425.68L768.09,425.52L765.56,426.62Z",
  "M796.31,438.51L797.13,440.84L798.97,438.71L797.96,435.22L796.31,438.51Z",
  "M762.41,484.74L762.23,487.05L765.54,487.45L765.51,486.08L762.41,484.74Z",
  "M765.11,500.03L766.07,501.37L767.21,499.56L766.33,498.22L765.11,500.03Z",
  "M743.92,512.86L743.08,511.48L741.76,515.50L745.23,515.70L746.75,512.32L743.92,512.86Z",
  "M711.24,562.77L710.50,563.82L711.50,564.03L711.24,562.77Z",
  "M654.31,799.16L657.02,802.46L656.69,796.41L655.88,796.17L654.31,799.16Z",
  "M650.88,812.48L651.88,813.52L651.91,812.24L651.47,811.89L650.88,812.48Z",
  "M647.70,819.10L648.86,819.75L649.20,818.06L649.04,817.71L647.70,819.10Z",
  "M592.46,824.39L593.03,825.38L593.46,824.63L592.92,823.39L592.46,824.39Z"
];
// 上のKYUSHU_OUTLINE_PATHSに含めた奄美群島(鹿児島県の離島)と同じ形状。
// 九州ページで地図をタップした時に「鹿児島県を選択」として反応させるための、クリック判定専用の配列。
const KAGOSHIMA_REMOTE_ISLAND_PATHS = [
  "M204.6,1612.1L204.0,1613.4L209.4,1616.9L208.5,1618.2L206.9,1623.9L203.3,1622.3L202.8,1620.8L194.1,1620.3L190.5,1617.0L189.4,1614.7L192.5,1609.9L191.8,1608.7L197.5,1606.9L193.3,1600.6L201.9,1597.9L203.8,1596.2L204.3,1593.2L210.3,1593.8L208.1,1584.9L201.0,1577.9L203.3,1578.9L209.3,1579.5L213.1,1580.3L214.4,1575.9L216.5,1572.3L218.1,1574.0L220.5,1576.2L227.3,1573.5L227.8,1570.9L228.7,1566.6L230.8,1565.7L232.4,1564.9L233.8,1562.4L235.9,1567.9L235.4,1574.6L237.4,1576.1L237.4,1578.3L236.4,1582.3L232.9,1580.0L231.7,1579.3L230.4,1580.2L229.9,1580.3L230.1,1587.4L231.3,1590.7L233.3,1590.8L240.3,1591.9L232.0,1596.0L232.1,1597.5L232.6,1597.9L233.0,1601.3L224.5,1602.6L218.7,1602.8L217.5,1603.4L216.0,1601.9L212.5,1604.1L213.6,1604.1L215.0,1604.3L215.6,1609.4L212.7,1611.3L204.9,1613.0ZM259.1,1579.7L255.0,1578.5L254.8,1578.2L257.6,1577.8L257.9,1574.4L257.1,1573.2L257.1,1571.8L257.4,1571.4L257.3,1572.6L258.3,1573.0L258.6,1574.5L260.2,1572.1L257.8,1567.6L258.7,1565.7L257.7,1562.8L259.0,1562.9L261.9,1570.6L263.3,1569.8L262.0,1567.1L263.7,1564.9L263.0,1564.9L263.1,1563.3L261.9,1561.3L259.7,1559.4L257.4,1553.9L260.3,1554.9L260.5,1553.4L261.6,1553.0L264.0,1548.5L267.1,1547.7L268.0,1552.6L267.2,1554.6L268.2,1558.0L270.6,1562.2L273.7,1562.7L272.9,1564.9L274.5,1566.7L272.2,1571.4L273.7,1571.7L271.7,1575.9L270.7,1575.5L271.3,1573.9L268.2,1577.7L262.6,1578.2L261.5,1581.0L259.4,1580.8L259.1,1579.7Z",
  "M201.9,1597.9L193.3,1600.6L193.3,1603.0L191.9,1603.1L189.2,1599.8L183.6,1599.0L180.7,1595.1L177.1,1596.3L171.6,1595.1L170.8,1594.0L171.9,1592.2L170.5,1590.6L171.7,1590.7L171.9,1589.7L175.8,1590.2L176.7,1589.0L178.2,1590.5L180.9,1590.0L181.2,1589.0L182.1,1589.4L182.8,1588.8L182.0,1587.3L183.0,1586.3L181.9,1585.4L185.7,1585.4L188.5,1581.0L189.9,1580.9L191.5,1583.3L194.6,1585.2L196.1,1584.3L196.8,1582.3L199.7,1580.8L201.3,1582.4L202.2,1585.7L203.4,1584.7L203.3,1583.7L204.4,1584.2L204.7,1583.7L203.3,1582.6L203.1,1580.1L200.9,1578.1L201.4,1578.1L207.2,1582.1L208.1,1584.9L207.6,1587.0L210.3,1593.8L204.3,1593.2L203.1,1594.0L203.8,1596.2L203.3,1598.8L201.9,1597.9Z",
  "M169.0,1603.1L166.8,1601.4L166.9,1600.0L165.1,1600.7L163.2,1598.3L163.9,1597.4L162.0,1597.4L160.9,1596.0L161.5,1595.2L160.5,1595.6L159.8,1593.8L161.0,1594.8L163.8,1593.3L165.1,1594.1L166.5,1592.5L170.1,1592.1L170.5,1590.6L171.9,1592.2L170.8,1594.0L171.6,1595.1L177.1,1596.3L181.4,1595.4L183.6,1599.0L189.2,1599.8L191.1,1602.4L193.9,1603.1L197.5,1606.9L192.9,1609.2L191.8,1608.7L192.5,1609.9L189.9,1613.9L187.9,1613.7L185.8,1615.1L184.2,1613.7L182.0,1614.8L180.7,1612.7L178.5,1612.9L175.9,1610.0L164.5,1612.7L163.4,1610.9L163.7,1608.0L166.2,1607.6L166.9,1605.3L168.1,1605.9L167.3,1606.8L169.7,1605.4L171.2,1606.6L171.7,1605.1L172.9,1605.3L174.0,1606.9L174.9,1603.1L177.2,1603.0L178.8,1604.4L179.9,1604.6L178.5,1604.0L178.3,1601.4L173.7,1601.4L172.4,1599.9L171.4,1600.9L171.8,1603.4ZM152.6,1595.3L153.7,1593.1L157.0,1595.2L158.2,1594.8L161.0,1597.2L162.2,1599.9L160.2,1599.1L158.9,1600.0L157.2,1598.7L155.9,1599.2L152.6,1595.3ZM157.2,1605.1L158.1,1606.9L159.3,1607.3L158.0,1608.0L157.7,1606.8L157.5,1609.9L154.9,1609.9L153.5,1607.6L157.2,1605.1Z",
  "M165.6,1647.9L162.2,1652.4L160.6,1651.0L161.7,1649.8L162.1,1644.3L161.0,1641.3L161.7,1636.6L157.9,1635.5L156.9,1633.0L154.5,1630.2L152.4,1625.9L153.2,1622.6L154.9,1623.7L159.3,1620.7L161.3,1623.5L166.2,1623.2L166.5,1624.2L166.1,1625.5L158.0,1625.6L159.6,1629.3L162.5,1629.6L164.6,1633.3L166.4,1634.3L169.3,1629.0L170.6,1632.9L173.0,1630.5L174.1,1634.9L167.3,1634.8L167.4,1636.1L171.0,1636.4L166.9,1638.6L168.5,1639.2L169.1,1641.5L171.8,1639.5L174.1,1639.2L171.3,1640.2L170.8,1643.2L173.8,1642.0L174.0,1644.6L176.5,1643.8L178.9,1646.3L181.7,1644.7L183.0,1645.3L185.5,1647.2L187.9,1646.7L190.0,1647.2L191.9,1648.5L188.9,1655.3L183.9,1658.6L183.1,1655.7L184.3,1649.8L180.5,1652.0L177.7,1652.0L177.0,1654.3L177.2,1657.1L174.0,1656.6L172.0,1651.0L170.6,1646.0L166.9,1645.7L168.2,1647.4ZM186.2,1635.6L184.6,1640.7L184.5,1636.9L183.6,1637.5L183.0,1636.7L184.1,1635.6L182.8,1635.5L182.4,1637.4L180.1,1635.8L178.8,1636.1L177.8,1634.7L179.0,1632.8L176.1,1631.4L176.7,1630.6L178.2,1631.5L179.1,1630.3L177.4,1629.3L178.5,1628.4L178.1,1627.4L175.8,1628.2L175.7,1626.4L177.6,1625.7L176.2,1625.6L175.9,1623.3L175.2,1625.8L172.8,1627.0L174.9,1620.9L182.5,1621.3L181.0,1622.4L180.8,1626.6L182.5,1627.5L182.5,1630.4L184.6,1632.2L184.1,1633.6L186.2,1635.6ZM149.7,1659.1L150.5,1661.6L149.2,1663.4L149.4,1665.5L145.5,1667.0L144.6,1664.5L144.9,1661.8L146.0,1660.6L145.6,1657.9L147.6,1657.4L147.9,1655.5L151.0,1653.4L150.5,1655.9L152.5,1658.9L149.7,1659.1Z",
  "M243.8,1588.1L243.2,1587.2L243.3,1588.9L240.4,1592.2L237.3,1591.3L234.3,1592.0L229.7,1589.7L231.2,1585.9L232.9,1586.2L233.8,1585.4L234.0,1583.5L236.0,1580.3L237.4,1578.3L237.4,1576.1L234.1,1576.4L235.4,1574.6L234.7,1571.0L233.9,1562.4L234.5,1561.7L236.0,1562.9L237.8,1566.4L238.8,1565.9L240.4,1563.9L241.7,1561.4L244.3,1561.7L245.9,1559.8L251.9,1559.6L251.3,1560.9L250.4,1562.6L250.5,1564.1L249.9,1563.5L248.2,1565.5L248.4,1570.0L246.6,1571.4L245.3,1572.2L245.7,1573.3L245.0,1573.1L245.6,1573.4L244.7,1575.2L245.3,1574.5L246.3,1573.9L247.4,1575.1L247.6,1570.9L249.9,1569.7L251.0,1571.1L251.4,1569.1L250.4,1567.4L251.6,1566.4L253.5,1567.8L253.0,1568.5L251.2,1572.4L251.7,1575.0L255.8,1575.6L256.6,1571.8L257.4,1571.3L255.9,1577.4L249.9,1579.0L249.2,1581.5L246.4,1583.8L245.4,1587.3Z",
  "M325.1,1618.6L322.6,1617.6L322.5,1615.9L321.0,1613.9L318.9,1614.3L318.4,1612.4L317.6,1612.6L317.1,1608.6L317.8,1607.3L321.5,1604.5L322.2,1606.4L322.8,1606.2L322.4,1604.7L326.1,1605.4L326.4,1604.1L330.8,1601.9L335.4,1597.0L337.0,1596.2L337.0,1596.8L337.3,1596.9L338.6,1594.3L341.4,1594.0L343.7,1595.9L344.4,1597.4L343.6,1598.0L344.4,1597.8L344.6,1598.8L344.0,1600.0L342.6,1599.7L343.6,1600.8L341.7,1601.5L341.6,1603.2L340.1,1604.7L338.4,1603.5L338.7,1604.5L338.2,1605.2L336.9,1604.0L337.3,1605.5L338.4,1605.6L334.2,1611.0L331.8,1616.0L331.0,1615.4L330.6,1617.1L329.7,1617.4L328.9,1616.3L328.7,1617.9L326.0,1618.8L325.0,1617.8L325.1,1618.6Z",
  "M111.7,1744.5L106.2,1737.3L104.0,1737.6L101.4,1735.6L102.5,1732.9L101.9,1730.9L105.7,1729.8L107.4,1726.4L107.3,1724.3L108.9,1722.2L105.3,1720.8L103.6,1719.4L103.3,1717.9L99.6,1716.8L97.2,1711.9L95.1,1712.6L96.3,1709.2L94.6,1708.3L93.7,1705.2L97.4,1702.8L95.9,1698.5L91.5,1697.4L91.8,1692.4L95.9,1694.1L98.1,1693.2L106.1,1694.0L105.4,1695.1L106.9,1698.8L104.7,1699.1L102.4,1701.3L106.0,1703.3L105.8,1705.7L104.7,1706.6L106.3,1709.4L104.9,1709.3L105.0,1712.8L108.2,1714.5L109.0,1716.6L111.8,1716.5L112.5,1718.4L116.1,1721.9L115.6,1723.2L119.7,1725.1L120.9,1726.8L119.5,1732.4L117.1,1733.3L118.1,1734.9L117.3,1735.1L116.5,1737.6L117.1,1739.5L114.7,1740.0L113.1,1742.0L113.6,1744.0L111.7,1744.5Z",
  "M87.5,1718.7L87.1,1713.6L88.6,1713.1L87.5,1712.3L88.0,1710.7L85.3,1708.6L85.8,1703.5L86.2,1706.6L88.2,1702.2L87.2,1700.5L88.5,1701.1L88.8,1701.5L88.9,1701.5L87.3,1698.9L87.5,1694.4L89.3,1692.3L91.4,1692.0L91.5,1697.4L95.9,1698.5L97.4,1702.8L93.7,1705.2L94.6,1708.3L96.3,1709.2L95.1,1712.6L97.2,1711.9L99.6,1716.8L103.3,1717.9L103.6,1719.4L109.0,1722.7L107.3,1724.3L107.4,1726.4L105.7,1729.8L101.9,1730.9L101.9,1732.5L99.3,1731.4L95.2,1731.5L94.7,1730.2L93.7,1730.3L91.1,1728.6L90.6,1727.7L91.4,1724.0L90.8,1724.5L89.1,1722.7L88.5,1719.5L87.5,1718.7Z",
  "M104.7,1750.1L98.0,1752.0L95.5,1750.3L94.4,1747.8L94.4,1743.5L89.7,1739.2L88.1,1739.0L85.6,1735.2L89.7,1732.2L90.4,1727.7L94.7,1730.2L95.2,1731.5L99.3,1731.4L102.4,1732.8L101.7,1736.3L104.0,1737.6L106.2,1737.3L111.8,1744.6L112.4,1746.1L109.5,1751.0L107.1,1751.2L104.7,1750.1Z",
  "M30.7,1820.3L27.0,1820.6L23.1,1814.7L21.3,1816.7L18.5,1816.5L17.0,1814.7L18.2,1812.7L17.2,1810.0L21.3,1811.4L25.5,1808.8L27.3,1810.1L28.8,1808.9L30.3,1809.3L32.3,1807.9L31.9,1807.2L32.7,1807.8L35.0,1806.1L40.3,1805.0L43.1,1802.6L47.5,1803.5L48.1,1804.8L46.9,1805.9L43.9,1808.0L39.6,1809.1L37.9,1812.3L37.1,1811.5L36.7,1812.4L37.5,1812.9L35.4,1813.4L35.8,1814.0L35.3,1813.4L34.7,1816.0L30.7,1820.3Z",
  "M23.9,1825.2L16.4,1828.2L15.1,1828.5L16.3,1827.9L14.6,1828.4L11.4,1826.9L7.6,1822.9L5.9,1818.9L5.5,1819.2L5.6,1817.2L4.7,1815.8L5.2,1812.0L7.6,1808.0L12.1,1810.7L17.2,1810.0L18.2,1812.7L17.0,1814.2L17.8,1815.9L21.0,1816.8L23.1,1814.7L27.0,1820.6L28.1,1820.9L23.9,1825.2Z",
  "M-12.5,1904.3L-16.9,1902.9L-17.6,1901.4L-18.4,1900.8L-19.5,1901.2L-21.5,1898.2L-22.5,1899.0L-23.3,1895.8L-22.0,1894.8L-20.9,1896.3L-19.1,1895.9L-19.7,1895.5L-18.9,1895.2L-19.0,1893.3L-17.4,1891.7L-13.3,1892.2L-10.1,1896.6L-10.3,1899.5L-9.3,1903.3L-12.5,1904.3Z",
];
const V3_FUKUOKA_MUNIS = [
  { name: 'うきは市', nameEn: 'Ukiha', cx: 293.1, cy: 153.3, d: 'M283.3,155.7 L300.6,165.8 L302.4,147.3 L283.1,143.7 Z' },
  { name: 'みやこ町', nameEn: 'Miyako', cx: 319.9, cy: 90.5, d: 'M308.0,66.9 L311.8,84.2 L317.2,103.3 L322.0,117.6 L327.4,113.5 L324.0,97.6 L332.5,78.8 L318.0,79.7 L312.5,66.9 Z' },
  { name: 'みやま市', nameEn: 'Miyama', cx: 243.8, cy: 193.1, d: 'M252.1,201.1 L255.5,196.5 L251.0,179.9 L240.8,182.7 L229.7,200.1 L230.7,203.1 Z' },
  { name: '上毛町', nameEn: 'Koge', cx: 354.1, cy: 106.7, d: 'M342.2,113.2 L360.8,113.7 L360.1,96.9 L357.5,94.9 Z' },
  { name: '中間市', nameEn: 'Nakama', cx: 278.6, cy: 49.1, d: 'M282.3,46.3 L277.7,46.4 L274.0,49.3 L279.8,53.1 Z' },
  { name: '久山町', nameEn: 'Hisayama', cx: 247.9, cy: 80.0, d: 'M243.9,87.4 L244.5,87.3 L255.5,81.0 L252.5,71.8 L246.3,76.6 L239.5,78.1 Z' },
  { name: '久留米市', nameEn: 'Kurume', cx: 256.6, cy: 155.5, d: 'M273.5,143.4 L258.3,142.4 L251.0,147.4 L225.2,168.4 L229.8,171.7 L238.7,171.8 L246.9,165.7 L264.9,159.0 L283.3,155.7 L283.1,143.7 Z' },
  { name: '八女市', nameEn: 'Yame', cx: 279.7, cy: 176.9, d: 'M267.2,168.9 L248.1,170.4 L251.0,179.9 L255.5,196.5 L264.3,196.0 L272.0,193.8 L272.1,193.5 L273.6,185.6 L274.6,185.9 L276.2,181.1 L296.6,192.7 L305.5,195.4 L311.3,179.6 L300.6,165.8 L283.3,155.7 L264.9,159.0 Z' },
  { name: '北九州市', nameEn: 'Kitakyushu', cx: 304.3, cy: 44.6, d: 'M280.4,54.2 L297.0,65.3 L300.1,69.6 L308.0,66.9 L312.5,66.9 L315.2,63.9 L327.4,51.2 L334.1,20.0 L312.6,34.4 L305.7,26.7 L274.6,29.0 L276.0,35.1 L282.3,46.3 L279.8,53.1 Z' },
  { name: '古賀市', nameEn: 'Koga', cx: 244.7, cy: 69.4, d: 'M253.0,67.6 L239.3,62.9 L235.8,68.8 L246.3,76.6 L252.5,71.8 Z' },
  { name: '吉富町', nameEn: 'Yoshitomi', cx: 358.9, cy: 94.3, d: 'M357.5,94.9 L360.1,96.9 L359.1,91.0 Z' },
  { name: '嘉麻市', nameEn: 'Kama', cx: 286.1, cy: 108.7, d: 'M279.2,94.6 L274.4,109.1 L272.7,114.3 L273.8,115.5 L294.8,121.0 L299.4,117.3 L298.1,113.1 L293.8,101.0 L289.8,97.3 Z' },
  { name: '大任町', nameEn: 'Oto', cx: 304.8, cy: 91.9, d: 'M301.8,93.4 L302.6,96.4 L308.0,97.7 L305.9,85.1 L303.7,85.3 Z' },
  { name: '大刀洗町', nameEn: 'Tachiarai', cx: 265.1, cy: 139.7, d: 'M273.5,143.4 L264.8,134.6 L263.6,133.1 L258.3,142.4 Z' },
  { name: '大川市', nameEn: 'Okawa', cx: 226.1, cy: 175.6, d: 'M222.1,176.3 L221.2,182.1 L231.2,177.9 L229.8,171.7 L225.2,168.4 Z' },
  { name: '大木町', nameEn: 'Oki', cx: 234.5, cy: 175.1, d: 'M229.8,171.7 L231.2,177.9 L237.5,179.7 L238.7,171.8 Z' },
  { name: '大牟田市', nameEn: 'Omuta', cx: 239.1, cy: 208.6, d: 'M230.7,203.1 L227.2,217.9 L231.3,217.7 L230.6,215.5 L247.4,213.6 L252.1,201.1 Z' },
  { name: '大野城市', nameEn: 'Onojo', cx: 241.7, cy: 112.7, d: 'M239.5,107.3 L236.3,115.3 L239.1,122.0 L243.1,121.1 L247.3,107.4 L242.4,102.7 Z' },
  { name: '太宰府市', nameEn: 'Dazaifu', cx: 249.2, cy: 111.6, d: 'M257.2,106.3 L247.3,107.4 L243.1,121.1 Z' },
  { name: '宇美町', nameEn: 'Umi', cx: 251.1, cy: 102.0, d: 'M242.4,102.7 L247.3,107.4 L257.2,106.3 L259.3,103.8 L255.7,95.9 L244.7,98.5 Z' },
  { name: '宗像市', nameEn: 'Munakata', cx: 255.2, cy: 49.3, d: 'M268.2,50.7 L252.2,35.1 L241.4,42.9 L254.3,63.5 L268.8,55.3 Z' },
  { name: '宮若市', nameEn: 'Miyawaka', cx: 265.0, cy: 70.2, d: 'M276.5,64.0 L268.8,55.3 L254.3,63.5 L253.0,67.6 L252.5,71.8 L255.5,81.0 L257.7,86.7 L274.2,75.8 L281.6,67.3 Z' },
  { name: '小竹町', nameEn: 'Kotake', cx: 279.9, cy: 71.9, d: 'M281.6,67.3 L274.2,75.8 L283.9,72.6 Z' },
  { name: '小郡市', nameEn: 'Ogori', cx: 255.8, cy: 135.9, d: 'M258.3,142.4 L263.6,133.1 L258.6,128.0 L251.1,127.6 L251.0,147.4 Z' },
  { name: '岡垣町', nameEn: 'Okagaki', cx: 263.3, cy: 40.6, d: 'M268.2,50.7 L269.4,39.4 L268.1,35.8 L252.2,35.1 Z' },
  { name: '川崎町', nameEn: 'Kawasaki', cx: 298.4, cy: 102.2, d: 'M293.8,101.0 L298.1,113.1 L302.6,96.4 L301.8,93.4 Z' },
  { name: '広川町', nameEn: 'Hirokawa', cx: 257.9, cy: 165.8, d: 'M246.9,165.7 L248.1,170.4 L267.2,168.9 L264.9,159.0 Z' },
  { name: '志免町', nameEn: 'Shime', cx: 240.7, cy: 97.6, d: 'M235.0,93.1 L242.4,102.7 L244.7,98.5 L242.9,95.8 Z' },
  { name: '新宮町', nameEn: 'Shingu', cx: 238.2, cy: 73.7, d: 'M230.8,71.4 L239.5,78.1 L246.3,76.6 L235.8,68.8 Z' },
  { name: '春日市', nameEn: 'Kasuga', cx: 236.5, cy: 111.0, d: 'M239.5,107.3 L233.6,110.3 L236.3,115.3 Z' },
  { name: '朝倉市', nameEn: 'Asakura', cx: 285.1, cy: 132.5, d: 'M283.1,143.7 L302.4,147.3 L306.5,141.2 L294.8,121.0 L273.8,115.5 L264.8,134.6 L273.5,143.4 Z' },
  { name: '東峰村', nameEn: 'Toho', cx: 304.4, cy: 127.5, d: 'M294.8,121.0 L306.5,141.2 L313.5,125.5 L299.4,117.3 Z' },
  { name: '柳川市', nameEn: 'Yanagawa', cx: 230.4, cy: 186.8, d: 'M231.2,177.9 L221.2,182.1 L220.8,185.0 L229.7,200.1 L240.8,182.7 L237.5,179.7 Z' },
  { name: '水巻町', nameEn: 'Mizumaki', cx: 278.3, cy: 42.1, d: 'M276.0,35.1 L275.2,34.8 L277.7,46.4 L282.3,46.3 Z' },
  { name: '添田町', nameEn: 'Soeda', cx: 309.6, cy: 111.2, d: 'M299.4,117.3 L313.5,125.5 L322.0,117.6 L317.2,103.3 L308.0,97.7 L302.6,96.4 L298.1,113.1 Z' },
  { name: '田川市', nameEn: 'Tagawa', cx: 296.1, cy: 88.4, d: 'M289.8,97.3 L293.8,101.0 L301.8,93.4 L303.7,85.3 L301.0,74.6 L294.2,80.9 L288.0,85.5 Z' },
  { name: '直方市', nameEn: 'Nogata', cx: 285.7, cy: 64.3, d: 'M297.0,65.3 L280.4,54.2 L276.5,64.0 L281.6,67.3 L283.9,72.6 L286.7,73.6 Z' },
  { name: '福岡市', nameEn: 'Fukuoka', cx: 220.3, cy: 101.2, d: 'M224.0,115.6 L233.6,110.3 L239.5,107.3 L242.4,102.7 L235.0,93.1 L243.9,87.4 L239.5,78.1 L230.8,71.4 L226.6,95.0 L193.0,86.3 L205.3,117.9 L207.6,117.6 L218.1,124.4 L224.5,128.3 L225.2,129.0 L227.1,130.0 Z' },
  { name: '福智町', nameEn: 'Fukuchi', cx: 294.0, cy: 74.0, d: 'M297.0,65.3 L286.7,73.6 L288.9,81.3 L294.2,80.9 L301.0,74.6 L300.1,69.6 Z' },
  { name: '福津市', nameEn: 'Fukutsu', cx: 245.7, cy: 57.8, d: 'M241.4,42.9 L239.3,62.9 L253.0,67.6 L254.3,63.5 Z' },
  { name: '筑前町', nameEn: 'Chikuzen', cx: 266.0, cy: 122.9, d: 'M265.7,113.8 L258.6,128.0 L263.6,133.1 L264.8,134.6 L273.8,115.5 L272.7,114.3 Z' },
  { name: '筑後市', nameEn: 'Chikugo', cx: 244.0, cy: 175.4, d: 'M238.7,171.8 L237.5,179.7 L240.8,182.7 L251.0,179.9 L248.1,170.4 L246.9,165.7 Z' },
  { name: '筑紫野市', nameEn: 'Chikushino', cx: 253.4, cy: 119.0, d: 'M257.2,106.3 L243.1,121.1 L239.1,122.0 L238.4,127.9 L238.5,127.8 L241.4,129.3 L251.1,127.6 L258.6,128.0 L265.7,113.8 L259.3,103.8 Z' },
  { name: '築上町', nameEn: 'Chikujo', cx: 333.7, cy: 93.2, d: 'M332.5,78.8 L324.0,97.6 L327.4,113.5 L328.9,113.2 L345.5,87.4 L338.5,76.2 Z' },
  { name: '篠栗町', nameEn: 'Sasaguri', cx: 251.6, cy: 88.2, d: 'M257.7,86.7 L255.5,81.0 L244.5,87.3 L244.8,91.4 L254.8,94.6 Z' },
  { name: '粕屋町', nameEn: 'Kasuya', cx: 241.2, cy: 91.9, d: 'M235.0,93.1 L242.9,95.8 L244.8,91.4 L244.5,87.3 L243.9,87.4 Z' },
  { name: '糸島市', nameEn: 'Itoshima', cx: 188.9, cy: 107.1, d: 'M193.0,86.3 L174.3,97.9 L187.4,103.8 L167.1,121.6 L189.6,119.8 L205.3,117.9 Z' },
  { name: '糸田町', nameEn: 'Itoda', cx: 290.4, cy: 82.6, d: 'M288.0,85.5 L294.2,80.9 L288.9,81.3 Z' },
  { name: '芦屋町', nameEn: 'Ashiya', cx: 272.2, cy: 34.5, d: 'M274.6,29.0 L268.1,35.8 L269.4,39.4 L275.2,34.8 L276.0,35.1 Z' },
  { name: '苅田町', nameEn: 'Kanda', cx: 324.7, cy: 59.6, d: 'M327.4,51.2 L315.2,63.9 L331.4,63.7 Z' },
  { name: '行橋市', nameEn: 'Yukuhashi', cx: 325.0, cy: 71.5, d: 'M312.5,66.9 L318.0,79.7 L332.5,78.8 L338.5,76.2 L331.4,63.7 L315.2,63.9 Z' },
  { name: '豊前市', nameEn: 'Buzen', cx: 344.4, cy: 100.8, d: 'M359.1,91.0 L345.5,87.4 L328.9,113.2 L342.2,113.2 L357.5,94.9 Z' },
  { name: '赤村', nameEn: 'Aka', cx: 311.0, cy: 93.0, d: 'M305.9,85.1 L308.0,97.7 L317.2,103.3 L311.8,84.2 Z' },
  { name: '遠賀町', nameEn: 'Onga', cx: 272.8, cy: 43.5, d: 'M277.7,46.4 L275.2,34.8 L269.4,39.4 L268.2,50.7 L274.0,49.3 Z' },
  { name: '那珂川市', nameEn: 'Nakagawa', cx: 231.8, cy: 121.2, d: 'M224.0,115.6 L227.1,130.0 L237.0,129.8 L238.4,127.9 L239.1,122.0 L236.3,115.3 L233.6,110.3 Z' },
  { name: '鞍手町', nameEn: 'Kurate', cx: 274.4, cy: 55.4, d: 'M279.8,53.1 L274.0,49.3 L268.2,50.7 L268.8,55.3 L276.5,64.0 L280.4,54.2 Z' },
  { name: '須恵町', nameEn: 'Sue', cx: 248.2, cy: 95.1, d: 'M254.8,94.6 L244.8,91.4 L242.9,95.8 L244.7,98.5 L255.7,95.9 Z' },
  { name: '飯塚市', nameEn: 'Iizuka', cx: 272.5, cy: 92.2, d: 'M283.9,72.6 L274.2,75.8 L257.7,86.7 L254.8,94.6 L255.7,95.9 L259.3,103.8 L265.7,113.8 L272.7,114.3 L274.4,109.1 L279.2,94.6 L289.8,97.3 L288.0,85.5 L288.9,81.3 L286.7,73.6 Z' },
  { name: '香春町', nameEn: 'Kawara', cx: 305.9, cy: 76.5, d: 'M300.1,69.6 L301.0,74.6 L303.7,85.3 L305.9,85.1 L311.8,84.2 L308.0,66.9 Z' }
];
const V3_FUKUOKA_BORDERS = [
  "M283.1,143.7 L283.3,155.7",
  "M302.4,147.3 L283.1,143.7",
  "M283.3,155.7 L300.6,165.8",
  "M312.5,66.9 L308.0,66.9",
  "M332.5,78.8 L318.0,79.7 L312.5,66.9",
  "M327.4,113.5 L324.0,97.6 L332.5,78.8",
  "M317.2,103.3 L322.0,117.6",
  "M311.8,84.2 L317.2,103.3",
  "M308.0,66.9 L311.8,84.2",
  "M230.7,203.1 L252.1,201.1",
  "M240.8,182.7 L229.7,200.1",
  "M251.0,179.9 L240.8,182.7",
  "M255.5,196.5 L251.0,179.9",
  "M357.5,94.9 L342.2,113.2",
  "M360.1,96.9 L357.5,94.9",
  "M279.8,53.1 L282.3,46.3",
  "M274.0,49.3 L279.8,53.1",
  "M277.7,46.4 L274.0,49.3",
  "M282.3,46.3 L277.7,46.4",
  "M239.5,78.1 L243.9,87.4",
  "M246.3,76.6 L239.5,78.1",
  "M252.5,71.8 L246.3,76.6",
  "M255.5,81.0 L252.5,71.8",
  "M244.5,87.3 L255.5,81.0",
  "M243.9,87.4 L244.5,87.3",
  "M283.1,143.7 L273.5,143.4",
  "M264.9,159.0 L283.3,155.7",
  "M246.9,165.7 L264.9,159.0",
  "M238.7,171.8 L246.9,165.7",
  "M229.8,171.7 L238.7,171.8",
  "M225.2,168.4 L229.8,171.7",
  "M258.3,142.4 L251.0,147.4",
  "M273.5,143.4 L258.3,142.4",
  "M248.1,170.4 L251.0,179.9",
  "M264.9,159.0 L267.2,168.9 L248.1,170.4",
  "M279.8,53.1 L280.4,54.2",
  "M276.0,35.1 L282.3,46.3",
  "M274.6,29.0 L276.0,35.1",
  "M315.2,63.9 L327.4,51.2",
  "M312.5,66.9 L315.2,63.9",
  "M300.1,69.6 L308.0,66.9",
  "M297.0,65.3 L300.1,69.6",
  "M280.4,54.2 L297.0,65.3",
  "M252.5,71.8 L253.0,67.6",
  "M235.8,68.8 L246.3,76.6",
  "M253.0,67.6 L239.3,62.9",
  "M359.1,91.0 L357.5,94.9",
  "M289.8,97.3 L279.2,94.6",
  "M293.8,101.0 L289.8,97.3",
  "M298.1,113.1 L293.8,101.0",
  "M299.4,117.3 L298.1,113.1",
  "M294.8,121.0 L299.4,117.3",
  "M273.8,115.5 L294.8,121.0",
  "M272.7,114.3 L273.8,115.5",
  "M274.4,109.1 L272.7,114.3",
  "M279.2,94.6 L274.4,109.1",
  "M303.7,85.3 L301.8,93.4",
  "M305.9,85.1 L303.7,85.3",
  "M308.0,97.7 L305.9,85.1",
  "M302.6,96.4 L308.0,97.7",
  "M301.8,93.4 L302.6,96.4",
  "M263.6,133.1 L258.3,142.4",
  "M264.8,134.6 L263.6,133.1",
  "M273.5,143.4 L264.8,134.6",
  "M231.2,177.9 L229.8,171.7",
  "M219.5,182.8 L231.2,177.9",
  "M237.5,179.7 L238.7,171.8",
  "M231.2,177.9 L237.5,179.7",
  "M242.4,102.7 L239.5,107.3",
  "M247.3,107.4 L242.4,102.7",
  "M243.1,121.1 L247.3,107.4",
  "M239.1,122.0 L243.1,121.1",
  "M236.3,115.3 L239.1,122.0",
  "M239.5,107.3 L236.3,115.3",
  "M243.1,121.1 L257.2,106.3",
  "M257.2,106.3 L247.3,107.4",
  "M242.4,102.7 L242.4,102.7",
  "M244.7,98.5 L242.4,102.7",
  "M255.7,95.9 L244.7,98.5",
  "M259.3,103.8 L255.7,95.9",
  "M257.2,106.3 L259.3,103.8",
  "M268.8,55.3 L268.2,50.7",
  "M254.3,63.5 L268.8,55.3",
  "M241.4,42.9 L254.3,63.5",
  "M268.2,50.7 L252.2,35.1",
  "M281.6,67.3 L276.5,64.0",
  "M274.2,75.8 L281.6,67.3",
  "M257.7,86.7 L274.2,75.8",
  "M255.5,81.0 L257.7,86.7",
  "M254.3,63.5 L253.0,67.6",
  "M276.5,64.0 L268.8,55.3",
  "M283.9,72.6 L281.6,67.3",
  "M274.2,75.8 L283.9,72.6",
  "M258.6,128.0 L251.1,127.6",
  "M263.6,133.1 L258.6,128.0",
  "M269.4,39.4 L268.1,35.8",
  "M268.2,50.7 L269.4,39.4",
  "M301.8,93.4 L293.8,101.0",
  "M298.1,113.1 L302.6,96.4",
  "M246.9,165.7 L248.1,170.4",
  "M242.9,95.8 L235.0,93.1",
  "M244.7,98.5 L242.9,95.8",
  "M235.0,93.1 L242.4,102.7",
  "M230.8,71.4 L239.5,78.1",
  "M233.6,110.3 L236.3,115.3",
  "M239.5,107.3 L233.6,110.3",
  "M273.8,115.5 L264.8,134.6",
  "M306.5,141.2 L294.8,121.0",
  "M313.5,125.5 L299.4,117.3",
  "M240.8,182.7 L237.5,179.7",
  "M279.2,94.6 L274.4,109.1",
  "M275.2,34.8 L277.7,46.4",
  "M276.0,35.1 L275.2,34.8",
  "M317.2,103.3 L308.0,97.7",
  "M288.0,85.5 L289.8,97.3",
  "M294.2,80.9 L288.0,85.5",
  "M301.0,74.6 L294.2,80.9",
  "M303.7,85.3 L301.0,74.6",
  "M286.7,73.6 L297.0,65.3",
  "M283.9,72.6 L286.7,73.6",
  "M280.4,54.2 L276.5,64.0",
  "M193.0,86.3 L205.8,119.3",
  "M235.0,93.1 L243.9,87.4",
  "M227.1,130.0 L224.0,115.6 L233.6,110.3",
  "M301.0,74.6 L300.1,69.6",
  "M288.9,81.3 L294.2,80.9",
  "M286.7,73.6 L288.9,81.3",
  "M272.7,114.3 L265.7,113.8",
  "M265.7,113.8 L258.6,128.0",
  "M265.7,113.8 L259.3,103.8",
  "M239.1,122.0 L238.2,129.8",
  "M338.5,76.2 L332.5,78.8",
  "M328.9,113.2 L345.5,87.4",
  "M254.8,94.6 L257.7,86.7",
  "M244.8,91.4 L254.8,94.6",
  "M244.5,87.3 L244.8,91.4",
  "M242.9,95.8 L244.8,91.4",
  "M288.9,81.3 L288.0,85.5",
  "M269.4,39.4 L275.2,34.8",
  "M315.2,63.9 L331.4,63.7",
  "M311.8,84.2 L305.9,85.1",
  "M268.2,50.7 L274.0,49.3",
  "M255.7,95.9 L254.8,94.6"
];
const V3_FUKUOKA_OUTLINE = "M251.1,134.1 L251.8,134.5 L251.1,135.3 L251.0,147.4 L225.2,168.4 L222.0,176.4 L220.8,184.9 L229.7,200.1 L230.7,203.1 L227.2,217.9 L231.3,217.7 L230.6,215.5 L247.4,213.6 L252.2,201.1 L255.5,196.5 L264.6,196.0 L272.0,193.9 L273.6,185.6 L274.6,185.9 L276.2,181.1 L296.8,192.7 L305.5,195.4 L311.3,179.6 L300.6,165.8 L302.4,147.3 L306.6,141.2 L313.5,125.5 L322.0,117.6 L327.5,113.5 L328.9,113.2 L342.2,113.2 L360.8,113.7 L360.1,96.9 L359.1,91.0 L345.5,87.4 L338.5,76.2 L331.4,63.7 L327.4,51.2 L334.1,20.0 L312.6,34.4 L305.7,26.7 L274.6,29.0 L268.1,35.8 L252.2,35.1 L241.4,42.9 L239.3,62.9 L235.8,68.8 L230.8,71.4 L226.6,95.0 L193.0,86.3 L174.3,97.9 L187.4,103.8 L167.0,121.6 L189.6,119.8 L207.6,117.6 L218.1,124.4 L224.5,128.3 L225.1,129.0 L227.1,130.0 L237.0,129.8 L238.5,127.8 L241.5,129.3 L251.1,127.6 Z";
const V3_SAGA_MUNIS = [
  { name: 'みやき町', cx: 234.2, cy: 146.4, d: 'M234.5,133.2 L231.9,133.6 L229.2,153.9 L228.4,156.0 L231.1,159.6 L241.5,147.1 Z' },
  { name: '上峰町', cx: 230.4, cy: 140.6, d: 'M229.2,153.9 L231.9,133.6 L230.0,134.3 Z' },
  { name: '伊万里市', cx: 144.7, cy: 152.5, d: 'M133.2,152.4 L126.8,153.8 L128.1,155.3 L123.9,158.3 L124.4,158.9 L123.1,159.8 L134.4,165.9 L134.4,166.7 L144.3,168.5 L165.7,156.6 L145.4,130.9 L138.9,134.7 Z' },
  { name: '佐賀市', cx: 206.1, cy: 148.7, d: 'M218.1,124.4 L207.6,117.6 L189.6,119.8 L185.2,145.5 L198.4,146.3 L199.8,174.6 L200.0,174.8 L220.8,185.1 L223.8,164.4 L216.7,142.0 L207.1,135.9 Z' },
  { name: '吉野ヶ里町', cx: 227.8, cy: 140.4, d: 'M228.4,156.0 L229.2,153.9 L230.0,134.3 L224.5,128.3 Z' },
  { name: '唐津市', cx: 162.7, cy: 130.6, d: 'M185.2,145.5 L189.6,119.8 L156.5,122.4 L156.3,111.1 L144.3,103.5 L137.5,111.1 L136.7,123.9 L138.9,134.7 L145.4,130.9 L165.7,156.6 L166.0,157.1 Z' },
  { name: '多久市', cx: 179.7, cy: 157.4, d: 'M166.0,157.1 L178.7,166.2 L182.4,166.4 L189.1,164.5 L185.2,145.5 Z' },
  { name: '大町町', cx: 180.7, cy: 169.3, d: 'M178.7,166.2 L177.8,172.2 L183.9,171.5 L182.4,166.4 Z' },
  { name: '太良町', cx: 185.2, cy: 211.7, d: 'M174.8,214.5 L174.9,215.6 L176.9,216.2 L178.1,216.5 L180.0,214.5 L191.7,217.8 L189.7,202.9 Z' },
  { name: '嬉野市', cx: 164.9, cy: 194.9, d: 'M152.8,191.9 L154.9,194.8 L146.6,198.6 L161.1,200.4 L162.7,212.2 L165.5,209.5 L166.3,210.1 L168.0,211.5 L169.1,210.4 L175.2,187.0 L174.2,178.8 L153.3,191.2 Z' },
  { name: '小城市', cx: 193.6, cy: 158.2, d: 'M185.2,145.5 L189.1,164.5 L193.2,172.0 L199.8,174.6 L198.4,146.3 Z' },
  { name: '有田町', cx: 142.1, cy: 172.9, d: 'M151.2,180.1 L144.3,168.5 L134.4,166.7 L134.8,173.4 L140.6,174.5 L143.4,178.5 Z' },
  { name: '武雄市', cx: 162.0, cy: 172.5, d: 'M165.7,156.6 L144.3,168.5 L151.2,180.1 L153.3,191.2 L174.2,178.8 L177.8,172.2 L178.7,166.2 L166.0,157.1 Z' },
  { name: '江北町', cx: 187.5, cy: 168.7, d: 'M182.4,166.4 L183.9,171.5 L193.2,172.0 L189.1,164.5 Z' },
  { name: '白石町', cx: 184.8, cy: 179.2, d: 'M199.8,174.6 L193.2,172.0 L183.9,171.5 L177.8,172.2 L174.2,178.8 L175.2,187.0 L183.0,189.6 L200.0,174.8 Z' },
  { name: '神埼市', cx: 220.7, cy: 142.1, d: 'M223.8,164.4 L231.1,159.6 L228.4,156.0 L224.5,128.3 L218.1,124.4 L207.1,135.9 L216.7,142.0 Z' },
  { name: '鳥栖市', cx: 242.3, cy: 136.3, d: 'M251.8,134.5 L238.5,127.8 L234.5,133.2 L241.5,147.1 Z' },
  { name: '鹿島市', cx: 178.9, cy: 200.9, d: 'M175.2,187.0 L169.1,210.4 L171.2,208.4 L172.0,209.1 L174.5,211.1 L174.9,216.2 L189.7,202.9 L183.0,189.6 Z' }
];
const V3_SAGA_BORDERS = [
  "M241.5,147.1 L234.5,133.2",
  "M228.4,156.0 L231.1,159.6",
  "M229.2,153.9 L228.4,156.0",
  "M231.9,133.6 L229.2,153.9",
  "M230.0,134.3 L229.2,153.9",
  "M165.7,156.6 L145.4,130.9 L138.9,134.7",
  "M144.3,168.5 L165.7,156.6",
  "M130.4,166.0 L144.3,168.5",
  "M223.8,164.4 L216.7,142.0 L207.1,135.9 L218.1,124.4",
  "M199.8,174.6 L200.0,174.8",
  "M185.2,145.5 L198.4,146.3 L199.8,174.6",
  "M189.6,119.8 L185.2,145.5",
  "M224.5,128.3 L228.4,156.0",
  "M166.0,157.1 L185.2,145.5",
  "M165.7,156.6 L166.0,157.1",
  "M137.5,111.1 L136.7,123.9",
  "M238.5,127.8 L251.8,134.5",
  "M189.1,164.5 L185.2,145.5",
  "M182.4,166.4 L189.1,164.5",
  "M178.7,166.2 L182.4,166.4",
  "M166.0,157.1 L178.7,166.2",
  "M183.9,171.5 L182.4,166.4",
  "M177.8,172.2 L183.9,171.5",
  "M178.7,166.2 L177.8,172.2",
  "M189.7,202.9 L174.1,215.6",
  "M174.2,178.8 L153.3,191.2",
  "M175.2,187.0 L174.2,178.8",
  "M168.9,212.3 L175.2,187.0",
  "M193.2,172.0 L199.8,174.6",
  "M189.1,164.5 L193.2,172.0",
  "M151.2,180.1 L144.3,168.5",
  "M174.2,178.8 L177.8,172.2",
  "M183.9,171.5 L193.2,172.0",
  "M175.2,187.0 L183.0,189.6"
];
const V3_SAGA_OUTLINE = "M137.5,111.1 L136.7,123.9 L138.9,134.7 L133.2,152.4 L126.8,153.8 L128.1,155.3 L123.9,158.3 L124.4,158.9 L123.1,159.8 L134.4,165.9 L134.8,173.4 L140.6,174.5 L143.5,178.6 L151.2,180.1 L153.3,191.2 L152.8,191.9 L154.9,194.8 L146.6,198.6 L161.1,200.4 L162.6,212.3 L165.5,209.5 L166.3,210.1 L168.0,211.5 L171.2,208.4 L172.0,209.1 L174.5,211.1 L174.9,216.2 L175.4,215.7 L176.9,216.2 L178.1,216.6 L180.0,214.5 L191.7,217.8 L189.7,202.9 L183.0,189.6 L200.0,174.8 L220.8,185.1 L223.8,164.4 L231.1,159.6 L241.5,147.1 L251.8,134.5 L238.5,127.8 L234.5,133.2 L231.9,133.6 L230.0,134.3 L224.5,128.3 L218.1,124.4 L207.6,117.6 L189.6,119.8 L156.5,122.4 L156.3,111.1 L144.3,103.5 Z";
const V3_NAGASAKI_MUNIS = [
  { name: '長崎市', cx: 131.2, cy: 257.6, d: 'M134.2,252.7 L129.3,252.1 L129.7,249.9 L125.2,243.5 L129.4,225.2 L124.8,220.9 L116.1,225.3 L115.6,232.2 L103.8,235.8 L106.6,244.5 L114.9,253.6 L126.4,259.8 L129.7,271.4 L134.0,271.5 L122.8,295.2 L115.7,302.1 L127.9,297.1 L132.9,287.5 L142.6,283.2 L153.0,267.1 L158.8,262.7 L159.1,253.9 L153.6,253.1 L147.4,250.9 L145.4,253.0 L139.1,253.8 L138.1,255.8 Z' },
  { name: '佐世保市', cx: 113.4, cy: 170.6, d: 'M128.1,155.3 L111.8,155.8 L111.7,152.8 L109.8,151.2 L97.4,144.6 L89.1,155.3 L83.9,170.1 L96.5,175.8 L98.7,167.4 L95.9,163.7 L100.7,157.6 L106.2,160.2 L105.8,165.2 L99.6,173.1 L100.7,179.1 L111.0,190.9 L118.0,184.9 L125.2,186.3 L126.8,200.6 L132.9,198.4 L134.8,185.2 L140.6,174.5 L134.8,173.4 L134.4,165.9 L122.4,159.4 Z' },
  { name: '南島原市', cx: 204.1, cy: 280.3, d: 'M224.1,267.9 L219.7,265.8 L209.2,265.3 L206.8,269.4 L203.4,270.6 L190.0,283.3 L182.4,284.7 L189.4,297.8 L200.2,293.5 L204.7,285.2 L219.1,282.0 Z' },
  { name: '長与町', cx: 139.8, cy: 249.1, d: 'M147.4,250.9 L141.6,243.6 L135.2,242.8 L135.4,245.3 L134.2,252.7 L138.1,255.8 L139.1,253.8 L145.4,253.0 Z' },
  { name: '時津町', cx: 132.8, cy: 248.9, d: 'M135.4,245.3 L135.2,242.8 L129.7,249.9 L129.3,252.1 L134.2,252.7 Z' },
  { name: '東彼杵町', cx: 153.4, cy: 207.0, d: 'M146.6,198.6 L139.4,201.3 L153.2,216.0 L157.8,217.1 L163.2,216.2 L161.1,200.4 Z' },
  { name: '島原市', cx: 216.8, cy: 256.6, d: 'M224.1,267.9 L224.9,257.5 L218.7,244.0 L212.4,245.0 L210.6,254.9 L207.4,258.8 L207.1,262.0 L209.5,262.9 L213.2,264.3 L209.2,265.3 L219.7,265.8 Z' },
  { name: '諫早市', cx: 173.5, cy: 239.2, d: 'M183.6,253.6 L187.2,250.0 L185.7,246.0 L190.2,240.9 L186.5,235.0 L194.9,228.9 L199.1,219.8 L198.0,219.5 L180.0,214.5 L171.4,224.0 L164.0,226.4 L161.9,238.6 L161.0,246.3 L156.5,247.3 L142.8,238.9 L141.6,243.6 L147.4,250.9 L153.6,253.1 L159.1,253.9 L158.8,262.7 L164.8,263.6 Z' },
  { name: '大村市', cx: 161.2, cy: 224.9, d: 'M161.0,246.3 L161.9,238.6 L164.0,226.4 L171.4,224.0 L175.1,218.7 L174.5,211.1 L172.0,209.1 L171.2,208.4 L163.2,216.2 L157.8,217.1 L153.2,216.0 L148.5,229.4 Z' },
  { name: '平戸市', cx: 70.1, cy: 155.1, d: 'M84.3,131.0 L77.3,141.5 L64.2,143.7 L65.9,155.0 L59.0,157.8 L54.5,172.1 L63.7,175.5 L75.7,159.6 L72.4,156.5 L80.3,151.2 L86.6,141.4 Z' },
  { name: '松浦市', cx: 113.8, cy: 146.8, d: 'M128.1,155.3 L124.7,151.3 L124.3,138.7 L110.1,143.8 L105.4,135.0 L97.4,144.6 L109.8,151.2 L111.7,152.8 L111.8,155.8 Z' },
  { name: '西海市', cx: 110.2, cy: 216.5, d: 'M103.8,235.8 L115.6,232.2 L116.1,225.3 L124.8,220.9 L130.3,219.6 L120.1,210.0 L119.7,204.4 L105.3,194.2 L100.1,206.7 L102.6,214.2 L96.8,218.7 L97.7,229.0 Z' },
  { name: '雲仙市', cx: 198.6, cy: 258.4, d: 'M209.2,265.3 L213.2,264.3 L209.5,262.9 L207.1,262.0 L207.4,258.8 L210.6,254.9 L211.2,238.6 L185.7,246.0 L187.2,250.0 L183.6,253.6 L191.0,256.3 L195.6,264.3 L194.4,272.0 L183.1,279.4 L182.4,284.7 L190.0,283.3 L203.4,270.6 L206.8,269.4 Z' },
  { name: '川棚町', cx: 135.7, cy: 198.1, d: 'M126.8,200.6 L139.4,201.3 L139.3,194.0 L137.2,192.5 L132.9,198.4 Z' },
  { name: '波佐見町', cx: 142.8, cy: 189.5, d: 'M132.9,198.4 L137.2,192.5 L139.3,194.0 L139.4,201.3 L146.6,198.6 L154.9,194.8 L140.6,174.5 L134.8,185.2 Z' },
  { name: '佐々町', cx: 101.4, cy: 162.7, d: 'M105.8,165.2 L106.2,160.2 L100.7,157.6 L95.9,163.7 L98.7,167.4 Z' }
];
const V3_NAGASAKI_BORDERS = [
  "M158.8,262.7 L159.1,253.9 L153.6,253.1 L147.4,250.9 L145.4,253.0 L139.1,253.8 L138.1,255.8 L134.2,252.7 L129.3,252.1 L129.7,249.9",
  "M124.8,220.9 L116.1,225.3 L115.6,232.2 L103.8,235.8",
  "M122.4,159.4 L111.8,155.8 L111.7,152.8 L109.8,151.2 L97.4,144.6",
  "M98.7,167.4 L95.9,163.7 L100.7,157.6 L106.2,160.2 L105.8,165.2",
  "M126.8,200.6 L132.9,198.4 L134.8,185.2 L138.6,180.8",
  "M210.6,254.9 L207.4,258.8 L207.1,262.0 L209.5,262.9 L213.2,264.3 L209.2,265.3 L219.7,265.8 L224.1,267.9",
  "M183.6,253.6 L187.2,250.0 L185.7,246.0",
  "M171.4,224.0 L164.0,226.4 L161.9,238.6 L161.0,246.3",
  "M141.6,243.6 L147.4,250.9",
  "M163.2,216.2 L157.8,217.1 L153.2,216.0",
  "M182.4,284.7 L190.0,283.3 L203.4,270.6 L206.8,269.4 L209.2,265.3",
  "M135.2,242.8 L135.4,245.3 L134.2,252.7",
  "M132.9,198.4 L137.2,192.5 L139.3,194.0 L139.4,201.3",
  "M146.6,198.6 L139.4,201.3"
];
const V3_NAGASAKI_OUTLINE = "M105.4,135.0 L97.4,144.6 L89.1,155.3 L83.9,170.1 L96.5,175.8 L98.7,167.4 L105.8,165.2 L99.6,173.1 L100.7,179.1 L111.0,190.9 L118.0,184.9 L125.2,186.3 L126.8,200.6 L139.4,201.3 L153.2,216.0 L148.5,229.4 L161.0,246.3 L156.5,247.3 L142.8,238.9 L141.6,243.6 L135.2,242.8 L129.7,249.9 L125.2,243.5 L129.4,225.2 L124.8,220.9 L130.3,219.6 L120.1,210.0 L119.7,204.4 L105.3,194.2 L100.1,206.7 L102.6,214.2 L96.8,218.7 L97.7,229.0 L103.8,235.8 L106.6,244.5 L114.9,253.6 L126.4,259.8 L129.7,271.4 L134.0,271.5 L122.8,295.2 L115.7,302.1 L127.9,297.1 L132.9,287.5 L142.6,283.2 L153.0,267.1 L158.8,262.7 L164.8,263.6 L183.6,253.6 L191.0,256.3 L195.6,264.3 L194.4,272.0 L183.1,279.4 L182.4,284.7 L189.4,297.8 L200.2,293.5 L204.7,285.2 L219.1,282.0 L224.1,267.9 L224.9,257.5 L218.7,244.0 L212.4,245.0 L210.6,254.9 L211.2,238.6 L185.7,246.0 L190.2,240.9 L186.5,235.0 L194.9,228.9 L199.1,219.8 L198.0,219.5 L180.0,214.5 L171.4,224.0 L175.1,218.7 L174.5,211.1 L172.0,209.1 L171.2,208.4 L163.2,216.2 L161.1,200.4 L146.6,198.6 L154.9,194.8 L140.6,174.5 L134.8,173.4 L134.4,165.9 L122.4,159.4 L128.1,155.3 L124.7,151.3 L124.3,138.7 L110.1,143.8 Z";
const V3_OITA_MUNIS = [
  { name: '中津市', cx: 353.5, cy: 121.6, d: 'M364.0,89.2 L362.3,112.7 L360.8,112.7 L360.8,113.7 L342.2,113.2 L328.9,113.2 L327.4,113.5 L322.6,117.2 L317.3,123.3 L340.9,144.2 L348.4,138.3 L369.5,144.0 L380.9,96.7 Z' },
  { name: '九重町', cx: 370.2, cy: 180.7, d: 'M386.3,181.6 L383.8,168.1 L375.3,156.4 L350.6,182.5 L354.7,188.8 L360.8,194.6 L364.7,201.5 L366.0,204.8 L376.9,195.5 Z' },
  { name: '佐伯市', cx: 468.7, cy: 245.5, d: 'M449.5,230.6 L416.3,257.2 L423.0,271.7 L459.2,270.9 L463.4,258.5 L499.5,268.6 L512.8,236.6 L491.1,223.8 L511.5,207.0 L473.1,214.6 L471.8,226.6 Z' },
  { name: '別府市', cx: 411.8, cy: 159.5, d: 'M424.0,164.8 L420.1,147.3 L405.7,146.7 L402.6,151.8 L399.4,171.8 L424.6,168.4 Z' },
  { name: '国東市', cx: 447.6, cy: 99.6, d: 'M436.9,101.5 L440.4,120.5 L460.3,125.4 L462.9,96.7 L449.8,77.5 L428.8,75.9 Z' },
  { name: '大分市', cx: 446.9, cy: 182.5, d: 'M453.0,203.5 L462.0,185.2 L483.8,181.4 L493.5,164.3 L476.1,169.8 L453.4,161.8 L436.9,169.1 L424.0,164.8 L424.6,168.4 L427.3,179.1 L413.2,192.1 L406.1,202.2 L416.3,206.8 L430.6,196.7 Z' },
  { name: '宇佐市', cx: 391.0, cy: 125.4, d: 'M405.7,146.7 L408.7,145.0 L404.0,117.4 L411.5,108.3 L407.9,99.5 L380.9,96.7 L369.5,144.0 L390.6,153.5 L402.6,151.8 Z' },
  { name: '日出町', cx: 421.1, cy: 142.7, d: 'M420.1,147.3 L441.9,141.8 L412.3,137.3 L408.7,145.0 L405.7,146.7 Z' },
  { name: '日田市', cx: 321.4, cy: 166.0, d: 'M306.5,141.2 L302.4,147.3 L302.1,150.3 L306.5,159.0 L303.3,169.3 L311.3,179.6 L305.5,195.4 L304.9,195.2 L304.2,197.0 L304.6,197.2 L323.5,209.5 L327.3,210.8 L330.7,210.2 L331.9,205.5 L329.5,182.4 L331.0,182.3 L330.1,178.5 L341.4,176.2 L344.2,178.9 L338.1,166.2 L340.9,144.2 L317.3,123.3 L308.8,136.1 Z' },
  { name: '杵築市', cx: 428.1, cy: 126.2, d: 'M411.5,108.3 L404.0,117.4 L408.7,145.0 L412.3,137.3 L441.9,141.8 L460.3,125.4 L440.4,120.5 L436.9,101.5 L425.0,119.5 Z' },
  { name: '津久見市', cx: 485.5, cy: 207.1, d: 'M473.1,214.6 L511.5,207.0 L486.0,205.3 L494.9,194.7 L471.7,206.4 Z' },
  { name: '玖珠町', cx: 358.6, cy: 157.9, d: 'M338.1,166.2 L344.2,178.9 L347.2,181.7 L350.6,182.5 L375.3,156.4 L383.8,168.1 L390.6,153.5 L369.5,144.0 L348.4,138.3 L340.9,144.2 Z' },
  { name: '由布市', cx: 400.5, cy: 178.7, d: 'M424.6,168.4 L399.4,171.8 L402.6,151.8 L390.6,153.5 L383.8,168.1 L386.3,181.6 L376.9,195.5 L394.2,199.1 L413.2,192.1 L427.3,179.1 Z' },
  { name: '竹田市', cx: 389.6, cy: 222.6, d: 'M394.2,199.1 L376.9,195.5 L366.0,204.8 L367.6,209.1 L378.1,227.0 L378.2,238.7 L387.2,249.2 L382.0,250.9 L393.2,259.2 L400.4,255.0 L407.0,228.9 L398.9,215.7 L406.1,202.2 L413.2,192.1 Z' },
  { name: '臼杵市', cx: 464.9, cy: 206.6, d: 'M453.0,203.5 L444.8,220.9 L449.5,230.6 L471.8,226.6 L473.1,214.6 L471.7,206.4 L494.9,194.7 L476.9,194.6 L483.8,181.4 L462.0,185.2 Z' },
  { name: '豊後大野市', cx: 423.6, cy: 225.7, d: 'M406.1,202.2 L398.9,215.7 L407.0,228.9 L400.4,255.0 L393.2,259.2 L416.3,257.2 L449.5,230.6 L444.8,220.9 L453.0,203.5 L430.6,196.7 L416.3,206.8 Z' },
  { name: '豊後高田市', cx: 423.5, cy: 99.1, d: 'M428.8,75.9 L407.9,99.5 L411.5,108.3 L425.0,119.5 L436.9,101.5 Z' }
];
const V3_OITA_BORDERS = [
  "M369.5,144.0 L380.9,96.7",
  "M340.9,144.2 L348.4,138.3 L369.5,144.0",
  "M317.3,123.3 L340.9,144.2",
  "M365.4,205.3 L376.9,195.5",
  "M383.8,168.1 L375.3,156.4 L350.6,182.5",
  "M376.9,195.5 L386.3,181.6 L383.8,168.1",
  "M473.1,214.6 L471.8,226.6 L449.5,230.6",
  "M511.5,207.0 L473.1,214.6",
  "M449.5,230.6 L416.3,257.2",
  "M424.6,168.4 L424.0,164.8",
  "M402.6,151.8 L399.4,171.8 L424.6,168.4",
  "M405.7,146.7 L402.6,151.8",
  "M420.1,147.3 L405.7,146.7",
  "M428.8,75.9 L436.9,101.5",
  "M436.9,101.5 L440.4,120.5 L460.3,125.4",
  "M406.1,202.2 L416.3,206.8 L430.6,196.7 L453.0,203.5",
  "M413.2,192.1 L406.1,202.2",
  "M424.6,168.4 L427.3,179.1 L413.2,192.1",
  "M453.0,203.5 L462.0,185.2 L483.8,181.4",
  "M390.6,153.5 L402.6,151.8",
  "M369.5,144.0 L390.6,153.5",
  "M411.5,108.3 L407.9,99.5",
  "M408.7,145.0 L404.0,117.4 L411.5,108.3",
  "M405.7,146.7 L408.7,145.0",
  "M441.9,141.8 L412.3,137.3 L408.7,145.0",
  "M345.4,181.3 L338.1,166.2 L340.9,144.2",
  "M436.9,101.5 L425.0,119.5 L411.5,108.3",
  "M494.9,194.7 L471.7,206.4 L473.1,214.6",
  "M383.8,168.1 L390.6,153.5",
  "M376.9,195.5 L394.2,199.1 L413.2,192.1",
  "M393.2,259.2 L400.4,255.0 L407.0,228.9 L398.9,215.7 L406.1,202.2",
  "M453.0,203.5 L444.8,220.9 L449.5,230.6"
];
const V3_OITA_OUTLINE = "M362.3,112.7 L360.8,112.7 L360.8,113.7 L342.2,113.2 L328.9,113.2 L327.5,113.5 L322.4,117.3 L317.3,123.3 L309.0,135.8 L306.6,141.2 L302.4,147.3 L302.1,150.3 L306.5,159.0 L303.3,169.3 L311.3,179.6 L305.5,195.4 L304.9,195.2 L304.2,197.0 L304.6,197.2 L323.1,209.3 L327.5,210.9 L330.7,210.2 L332.0,205.5 L329.5,182.4 L330.9,182.3 L330.1,178.5 L341.4,176.3 L347.1,181.7 L350.6,182.5 L355.0,189.2 L360.8,194.7 L364.7,201.5 L367.6,209.0 L378.1,227.0 L378.1,238.7 L387.2,249.2 L382.0,250.9 L393.2,259.1 L416.3,257.1 L423.0,271.7 L459.2,270.9 L463.4,258.5 L499.5,268.6 L512.8,236.6 L491.1,223.8 L511.5,207.0 L486.0,205.3 L494.9,194.7 L476.9,194.6 L483.8,181.4 L493.5,164.3 L476.1,169.8 L453.4,161.8 L436.9,169.0 L424.0,164.8 L420.1,147.3 L441.9,141.8 L460.3,125.4 L462.9,96.7 L449.8,77.5 L428.8,75.9 L407.9,99.5 L380.9,96.7 L364.0,89.2 Z";
const V3_KUMAMOTO_MUNIS = [
  { name: 'あさぎり町', cx: 316.2, cy: 375.6, d: 'M316.2,393.0 L329.8,387.4 L311.4,353.2 L305.3,368.4 Z' },
  { name: '上天草市', cx: 228.6, cy: 327.0, d: 'M221.7,337.8 L228.2,338.6 L237.8,312.9 L224.6,322.2 Z' },
  { name: '五木村', cx: 303.8, cy: 333.9, d: 'M286.4,339.6 L293.3,343.5 L313.8,348.4 L321.4,347.1 L320.9,330.3 L303.6,318.0 L286.1,323.5 Z' },
  { name: '人吉市', cx: 288.4, cy: 384.9, d: 'M294.6,372.5 L282.5,359.4 L285.5,367.5 L271.3,388.8 L279.5,397.8 L310.2,394.9 L293.6,377.8 Z' },
  { name: '八代市', cx: 287.7, cy: 320.3, d: 'M283.7,305.9 L277.3,312.2 L268.1,297.0 L251.5,312.5 L257.9,329.9 L251.9,336.1 L250.1,343.5 L269.7,345.3 L278.6,349.9 L286.4,339.6 L286.1,323.5 L303.6,318.0 L320.9,330.3 L333.5,325.4 L334.4,307.8 L322.6,301.6 L300.4,305.4 L293.8,298.4 Z' },
  { name: '南小国町', cx: 347.5, cy: 202.4, d: 'M359.4,208.0 L364.7,201.5 L360.8,194.6 L334.2,196.8 L330.7,210.2 Z' },
  { name: '南関町', cx: 254.2, cy: 211.1, d: 'M250.1,218.4 L259.1,217.8 L256.6,198.2 L248.1,213.5 Z' },
  { name: '南阿蘇村', cx: 338.3, cy: 247.1, d: 'M325.4,235.7 L327.3,243.9 L330.3,255.8 L350.8,257.6 L347.8,239.7 Z' },
  { name: '合志市', cx: 292.7, cy: 237.6, d: 'M287.9,244.9 L304.8,237.7 L302.2,236.0 L284.7,230.7 Z' },
  { name: '和水町', cx: 264.4, cy: 208.4, d: 'M267.0,227.9 L267.5,227.2 L272.0,193.8 L256.6,198.2 L259.1,217.8 Z' },
  { name: '嘉島町', cx: 292.9, cy: 267.5, d: 'M293.1,264.2 L289.4,271.3 L296.3,267.0 Z' },
  { name: '多良木町', cx: 329.1, cy: 370.3, d: 'M321.4,347.1 L313.8,348.4 L311.4,353.2 L329.8,387.4 L349.8,387.0 L339.1,369.9 L326.4,361.6 Z' },
  { name: '大津町', cx: 316.2, cy: 238.1, d: 'M302.2,236.0 L304.8,237.7 L309.5,248.5 L309.6,249.2 L327.3,243.9 L325.4,235.7 L323.5,225.4 Z' },
  { name: '天草市', cx: 176.7, cy: 344.5, d: 'M179.8,308.9 L172.9,330.1 L162.7,330.2 L155.3,347.1 L161.5,358.8 L154.5,369.2 L163.5,381.2 L172.2,376.6 L198.3,344.5 L191.8,307.9 Z' },
  { name: '宇土市', cx: 263.8, cy: 280.4, d: 'M263.8,273.8 L245.2,286.4 L282.5,280.9 Z' },
  { name: '宇城市', cx: 272.4, cy: 291.1, d: 'M292.8,283.9 L282.5,280.9 L245.2,286.4 L239.6,296.5 L267.7,292.8 L283.7,305.9 L293.8,298.4 L292.7,284.5 Z' },
  { name: '小国町', cx: 342.5, cy: 187.6, d: 'M360.8,194.6 L341.4,176.2 L330.1,178.5 L334.2,196.8 Z' },
  { name: '山江村', cx: 289.6, cy: 354.8, d: 'M278.6,349.9 L282.5,359.4 L294.6,372.5 L299.4,357.3 L293.3,343.5 L286.4,339.6 Z' },
  { name: '山都町', cx: 339.4, cy: 277.4, d: 'M334.4,307.8 L349.6,301.1 L351.0,288.7 L371.2,266.2 L356.6,252.7 L350.8,257.6 L330.3,255.8 L324.3,259.9 L312.4,268.2 L314.5,284.2 L326.4,287.9 L322.6,301.6 Z' },
  { name: '山鹿市', cx: 283.5, cy: 205.4, d: 'M285.4,221.7 L298.2,212.9 L304.6,197.2 L276.2,181.1 L272.0,193.8 L267.5,227.2 L271.3,229.8 Z' },
  { name: '御船町', cx: 306.2, cy: 271.2, d: 'M289.8,272.9 L309.8,284.4 L314.5,284.2 L312.4,268.2 L324.3,259.9 L312.2,259.6 L296.3,267.0 L289.4,271.3 Z' },
  { name: '水上村', cx: 333.2, cy: 345.2, d: 'M320.9,330.3 L321.4,347.1 L326.4,361.6 L339.8,361.3 L350.2,352.4 L333.5,325.4 Z' },
  { name: '水俣市', cx: 239.8, cy: 384.9, d: 'M233.7,372.5 L221.6,385.6 L228.6,395.1 L252.2,391.6 L261.0,381.8 L258.9,380.0 L240.1,376.9 Z' },
  { name: '氷川町', cx: 275.5, cy: 303.2, d: 'M283.7,305.9 L267.7,292.8 L268.1,297.0 L277.3,312.2 Z' },
  { name: '津奈木町', cx: 237.6, cy: 370.9, d: 'M240.1,376.9 L239.1,363.2 L233.7,372.5 Z' },
  { name: '湯前町', cx: 335.1, cy: 364.3, d: 'M339.1,369.9 L339.8,361.3 L326.4,361.6 Z' },
  { name: '熊本市', cx: 278.3, cy: 255.4, d: 'M289.4,271.3 L293.1,264.2 L301.5,251.5 L287.9,244.9 L284.7,230.7 L285.4,221.7 L271.3,229.8 L267.0,244.1 L257.6,246.8 L263.8,273.8 L282.5,280.9 L292.8,283.9 L289.8,272.9 Z' },
  { name: '玉名市', cx: 256.0, cy: 232.3, d: 'M267.0,244.1 L267.0,227.9 L259.1,217.8 L250.1,218.4 L244.8,228.9 L241.3,235.3 L257.6,246.8 Z' },
  { name: '玉東町', cx: 268.4, cy: 233.6, d: 'M267.0,244.1 L271.3,229.8 L267.5,227.2 L267.0,227.9 Z' },
  { name: '球磨村', cx: 272.2, cy: 367.7, d: 'M269.7,345.3 L258.9,380.0 L261.0,381.8 L271.3,388.8 L285.5,367.5 L282.5,359.4 L278.6,349.9 Z' },
  { name: '産山村', cx: 365.8, cy: 211.1, d: 'M373.3,223.9 L364.7,201.5 L359.4,208.0 Z' },
  { name: '甲佐町', cx: 297.5, cy: 280.6, d: 'M292.8,283.9 L292.7,284.5 L309.8,284.4 L289.8,272.9 Z' },
  { name: '益城町', cx: 303.4, cy: 258.0, d: 'M293.1,264.2 L296.3,267.0 L312.2,259.6 L309.6,249.2 L309.5,248.5 L301.5,251.5 Z' },
  { name: '相良村', cx: 302.5, cy: 357.8, d: 'M293.6,377.8 L305.3,368.4 L311.4,353.2 L313.8,348.4 L293.3,343.5 L299.4,357.3 L294.6,372.5 Z' },
  { name: '美里町', cx: 308.6, cy: 293.8, d: 'M322.6,301.6 L326.4,287.9 L314.5,284.2 L309.8,284.4 L292.7,284.5 L293.8,298.4 L300.4,305.4 Z' },
  { name: '芦北町', cx: 253.3, cy: 361.0, d: 'M251.9,336.1 L239.1,363.2 L240.1,376.9 L258.9,380.0 L269.7,345.3 L250.1,343.5 Z' },
  { name: '苓北町', cx: 171.8, cy: 323.1, d: 'M179.8,308.9 L162.7,330.2 L172.9,330.1 Z' },
  { name: '荒尾市', cx: 240.6, cy: 220.7, d: 'M250.1,218.4 L248.1,213.5 L230.6,215.5 L234.7,227.8 L244.8,228.9 Z' },
  { name: '菊池市', cx: 306.3, cy: 219.1, d: 'M284.7,230.7 L302.2,236.0 L323.5,225.4 L326.0,211.1 L304.6,197.2 L298.2,212.9 L285.4,221.7 Z' },
  { name: '菊陽町', cx: 300.4, cy: 245.1, d: 'M301.5,251.5 L309.5,248.5 L304.8,237.7 L287.9,244.9 Z' },
  { name: '西原村', cx: 320.3, cy: 252.8, d: 'M309.6,249.2 L312.2,259.6 L324.3,259.9 L330.3,255.8 L327.3,243.9 Z' },
  { name: '錦町', cx: 305.5, cy: 382.0, d: 'M310.2,394.9 L316.2,393.0 L305.3,368.4 L293.6,377.8 Z' },
  { name: '長洲町', cx: 240.3, cy: 230.7, d: 'M234.7,227.8 L241.3,235.3 L244.8,228.9 Z' },
  { name: '阿蘇市', cx: 347.7, cy: 224.2, d: 'M323.5,225.4 L325.4,235.7 L347.8,239.7 L374.6,234.6 L373.3,223.9 L359.4,208.0 L330.7,210.2 L326.0,211.1 Z' },
  { name: '高森町', cx: 366.1, cy: 247.5, d: 'M347.8,239.7 L350.8,257.6 L356.6,252.7 L371.2,266.2 L375.3,253.0 L387.2,249.2 L374.6,234.6 Z' }
];
const V3_KUMAMOTO_BORDERS = [
  "M305.3,368.4 L316.2,393.0",
  "M311.4,353.2 L305.3,368.4",
  "M329.8,387.4 L311.4,353.2",
  "M320.9,330.3 L303.6,318.0 L286.1,323.5 L286.4,339.6",
  "M321.4,347.1 L320.9,330.3",
  "M313.8,348.4 L321.4,347.1",
  "M293.3,343.5 L313.8,348.4",
  "M286.4,339.6 L293.3,343.5",
  "M293.6,377.8 L294.6,372.5",
  "M310.2,394.9 L293.6,377.8",
  "M282.5,359.4 L285.5,367.5 L271.3,388.8",
  "M294.6,372.5 L282.5,359.4",
  "M293.8,298.4 L283.7,305.9",
  "M322.6,301.6 L300.4,305.4 L293.8,298.4",
  "M334.4,307.8 L322.6,301.6",
  "M320.9,330.3 L333.5,325.4",
  "M278.6,349.9 L286.4,339.6",
  "M269.7,345.3 L278.6,349.9",
  "M251.9,336.1 L250.1,343.5 L269.7,345.3",
  "M283.7,305.9 L277.3,312.2 L268.1,297.0",
  "M330.7,210.2 L359.4,208.0",
  "M360.8,194.6 L334.2,196.8",
  "M359.4,208.0 L364.7,201.5",
  "M248.1,213.5 L250.1,218.4",
  "M259.1,217.8 L256.6,198.2",
  "M250.1,218.4 L259.1,217.8",
  "M347.8,239.7 L325.4,235.7",
  "M350.8,257.6 L347.8,239.7",
  "M330.3,255.8 L350.8,257.6",
  "M327.3,243.9 L330.3,255.8",
  "M325.4,235.7 L327.3,243.9",
  "M284.7,230.7 L287.9,244.9",
  "M302.2,236.0 L284.7,230.7",
  "M304.8,237.7 L302.2,236.0",
  "M287.9,244.9 L304.8,237.7",
  "M259.1,217.8 L267.0,227.9",
  "M267.5,227.2 L272.0,193.8",
  "M267.0,227.9 L267.5,227.2",
  "M296.3,267.0 L293.1,264.2",
  "M289.4,271.3 L296.3,267.0",
  "M293.1,264.2 L289.4,271.3",
  "M326.4,361.6 L321.4,347.1",
  "M339.1,369.9 L326.4,361.6",
  "M313.8,348.4 L311.4,353.2",
  "M323.5,225.4 L302.2,236.0",
  "M325.4,235.7 L323.5,225.4",
  "M309.6,249.2 L327.3,243.9",
  "M309.5,248.5 L309.6,249.2",
  "M304.8,237.7 L309.5,248.5",
  "M179.8,308.9 L172.9,330.1 L162.7,330.2",
  "M282.5,280.9 L263.8,273.8",
  "M245.2,286.4 L282.5,280.9",
  "M292.7,284.5 L292.8,283.9",
  "M293.8,298.4 L292.7,284.5",
  "M267.7,292.8 L283.7,305.9",
  "M292.8,283.9 L282.5,280.9",
  "M294.6,372.5 L299.4,357.3 L293.3,343.5",
  "M278.6,349.9 L282.5,359.4",
  "M314.5,284.2 L326.4,287.9 L322.6,301.6",
  "M324.3,259.9 L312.4,268.2 L314.5,284.2",
  "M330.3,255.8 L324.3,259.9",
  "M371.2,266.2 L356.6,252.7 L350.8,257.6",
  "M271.3,229.8 L285.4,221.7",
  "M267.5,227.2 L271.3,229.8",
  "M285.4,221.7 L298.2,212.9 L304.6,197.2",
  "M289.4,271.3 L289.8,272.9",
  "M312.2,259.6 L296.3,267.0",
  "M324.3,259.9 L312.2,259.6",
  "M309.8,284.4 L314.5,284.2",
  "M289.8,272.9 L309.8,284.4",
  "M326.4,361.6 L339.8,361.3",
  "M240.1,376.9 L233.7,372.5",
  "M258.9,380.0 L240.1,376.9",
  "M261.0,381.8 L258.9,380.0",
  "M240.1,376.9 L239.1,363.2",
  "M292.8,283.9 L289.8,272.9",
  "M267.0,244.1 L257.6,246.8",
  "M271.3,229.8 L267.0,244.1",
  "M284.7,230.7 L285.4,221.7",
  "M301.5,251.5 L287.9,244.9",
  "M293.1,264.2 L301.5,251.5",
  "M244.8,228.9 L241.3,235.3",
  "M250.1,218.4 L244.8,228.9",
  "M267.0,244.1 L267.0,227.9",
  "M269.7,345.3 L258.9,380.0",
  "M359.4,208.0 L373.3,223.9",
  "M292.7,284.5 L309.8,284.4",
  "M309.5,248.5 L301.5,251.5",
  "M312.2,259.6 L309.6,249.2",
  "M293.6,377.8 L305.3,368.4",
  "M234.7,227.8 L244.8,228.9",
  "M323.5,225.4 L326.0,211.1",
  "M347.8,239.7 L374.6,234.6"
];
const V3_KUMAMOTO_OUTLINE = "M387.2,249.2 L374.6,234.6 L373.3,223.9 L364.7,201.5 L360.8,194.7 L341.4,176.3 L330.1,178.5 L334.2,196.8 L330.7,210.2 L326.0,211.2 L304.6,197.2 L276.2,181.1 L272.0,193.8 L256.6,198.2 L248.1,213.5 L230.6,215.5 L234.7,227.8 L241.3,235.3 L257.6,246.8 L263.8,273.8 L245.2,286.5 L239.6,296.5 L267.7,292.8 L268.1,297.0 L251.5,312.5 L257.9,329.9 L251.9,336.1 L239.1,363.2 L233.7,372.5 L221.6,385.6 L228.6,395.1 L252.2,391.6 L261.0,381.8 L271.3,388.8 L279.5,397.8 L310.2,394.9 L316.2,393.1 L329.8,387.4 L349.8,387.0 L339.1,369.9 L339.8,361.3 L350.2,352.4 L333.5,325.4 L334.4,307.8 L349.6,301.1 L351.0,288.7 L371.2,266.2 L375.3,253.0 Z";
const V3_MIYAZAKI_MUNIS = [
  { name: 'えびの市', cx: 301.0, cy: 408.6, d: 'M295.3,396.3 L285.0,397.3 L280.2,407.0 L307.4,432.3 L312.2,411.4 L323.4,395.2 Z' },
  { name: '三股町', cx: 363.5, cy: 473.3, d: 'M373.0,460.1 L348.0,477.9 L359.2,486.0 L378.0,466.0 Z' },
  { name: '串間市', cx: 378.3, cy: 523.7, d: 'M366.5,492.9 L364.1,495.9 L367.2,530.4 L376.8,545.4 L389.5,549.3 L397.7,522.0 L383.5,522.1 L376.0,497.8 Z' },
  { name: '五ヶ瀬町', cx: 364.4, cy: 286.8, d: 'M372.1,266.9 L356.5,282.6 L351.4,288.2 L349.9,298.5 L349.7,300.5 L367.5,298.7 L377.7,288.0 Z' },
  { name: '国富町', cx: 382.2, cy: 411.8, d: 'M398.3,415.0 L364.8,391.8 L364.1,392.0 L378.0,422.5 L395.7,425.3 Z' },
  { name: '宮崎市', cx: 393.1, cy: 440.5, d: 'M406.3,407.4 L398.3,415.0 L395.7,425.3 L378.0,422.5 L365.5,421.1 L365.8,431.1 L373.0,460.1 L378.0,466.0 L399.9,466.2 L412.3,475.7 L409.7,447.0 L419.2,409.3 Z' },
  { name: '小林市', cx: 337.2, cy: 412.1, d: 'M357.9,415.2 L360.9,392.4 L350.2,386.1 L349.1,385.9 L349.8,387.0 L330.1,387.4 L323.4,395.2 L312.2,411.4 L307.4,432.3 L316.5,442.1 L328.2,423.8 L346.8,431.4 L365.8,431.1 L365.5,421.1 Z' },
  { name: '川南町', cx: 419.8, cy: 376.7, d: 'M425.4,386.6 L430.5,370.2 L407.2,369.3 L416.6,385.7 Z' },
  { name: '延岡市', cx: 439.7, cy: 287.3, d: 'M457.3,317.4 L449.8,314.8 L463.4,284.4 L478.9,276.5 L479.4,263.0 L463.4,258.5 L459.2,270.9 L423.0,271.7 L418.6,262.2 L406.7,289.5 L405.6,304.5 L422.5,308.5 Z' },
  { name: '新富町', cx: 413.2, cy: 402.3, d: 'M419.2,409.3 L421.3,400.9 L408.1,392.7 L406.3,407.4 Z' },
  { name: '日之影町', cx: 402.4, cy: 280.8, d: 'M400.7,267.9 L385.1,290.3 L396.1,303.6 L405.6,304.5 L406.7,289.5 L418.6,262.2 L416.3,257.2 L403.0,258.4 Z' },
  { name: '日南市', cx: 389.0, cy: 489.7, d: 'M412.3,475.7 L399.9,466.2 L378.0,466.0 L359.2,486.0 L366.5,492.9 L376.0,497.8 L383.5,522.1 L397.7,522.0 L397.3,510.1 L411.4,493.6 Z' },
  { name: '日向市', cx: 420.5, cy: 342.0, d: 'M444.0,325.4 L418.9,325.7 L390.5,351.5 L405.0,356.3 L433.8,356.3 Z' },
  { name: '木城町', cx: 399.9, cy: 369.0, d: 'M390.5,351.5 L381.1,355.7 L408.3,391.3 L416.6,385.7 L407.2,369.3 L405.0,356.3 Z' },
  { name: '椎葉村', cx: 357.8, cy: 324.7, d: 'M383.0,325.0 L379.8,315.3 L367.5,298.7 L349.7,300.5 L349.6,301.1 L336.3,306.9 L334.2,311.1 L334.0,316.1 L344.1,342.5 L350.2,352.4 L348.4,353.9 L348.9,355.1 L361.7,355.5 L365.8,349.4 Z' },
  { name: '綾町', cx: 366.1, cy: 409.7, d: 'M378.0,422.5 L364.1,392.0 L360.9,392.4 L357.9,415.2 L365.5,421.1 Z' },
  { name: '美郷町', cx: 395.5, cy: 329.5, d: 'M405.6,304.5 L396.1,303.6 L402.8,317.5 L379.8,315.3 L383.0,325.0 L365.8,349.4 L381.1,355.7 L390.5,351.5 L418.9,325.7 L422.5,308.5 Z' },
  { name: '西米良村', cx: 358.6, cy: 373.5, d: 'M360.9,392.4 L364.1,392.0 L364.8,391.8 L380.2,381.6 L361.7,355.5 L348.9,355.1 L338.8,368.1 L350.2,386.1 Z' },
  { name: '西都市', cx: 386.3, cy: 384.2, d: 'M406.3,407.4 L408.1,392.7 L408.3,391.3 L381.1,355.7 L365.8,349.4 L361.7,355.5 L380.2,381.6 L364.8,391.8 L398.3,415.0 Z' },
  { name: '諸塚村', cx: 384.4, cy: 304.0, d: 'M377.7,288.0 L367.5,298.7 L379.8,315.3 L402.8,317.5 L396.1,303.6 L385.1,290.3 Z' },
  { name: '都城市', cx: 345.6, cy: 457.8, d: 'M365.8,431.1 L346.8,431.4 L331.4,442.4 L316.5,442.1 L310.1,456.4 L329.2,463.7 L335.6,485.3 L364.1,495.9 L366.5,492.9 L359.2,486.0 L348.0,477.9 L373.0,460.1 Z' },
  { name: '都農町', cx: 419.3, cy: 362.8, d: 'M405.0,356.3 L407.2,369.3 L430.5,370.2 L433.8,356.3 Z' },
  { name: '門川町', cx: 434.6, cy: 318.5, d: 'M457.3,317.4 L422.5,308.5 L418.9,325.7 L444.0,325.4 Z' },
  { name: '高千穂町', cx: 385.3, cy: 269.4, d: 'M403.0,258.4 L393.2,259.2 L383.6,252.1 L378.7,251.9 L375.7,252.9 L372.1,266.9 L377.7,288.0 L385.1,290.3 L400.7,267.9 Z' },
  { name: '高原町', cx: 330.8, cy: 434.2, d: 'M346.8,431.4 L328.2,423.8 L316.5,442.1 L331.4,442.4 Z' },
  { name: '高鍋町', cx: 417.7, cy: 392.1, d: 'M408.1,392.7 L421.3,400.9 L425.4,386.6 L416.6,385.7 L408.3,391.3 Z' }
];
const V3_MIYAZAKI_BORDERS = [
  "M307.4,432.3 L312.2,411.4 L323.4,395.2",
  "M378.0,466.0 L373.0,460.1",
  "M359.2,486.0 L378.0,466.0",
  "M373.0,460.1 L348.0,477.9 L359.2,486.0",
  "M397.7,522.0 L383.5,522.1 L376.0,497.8 L366.5,492.9",
  "M366.5,492.9 L364.1,495.9",
  "M367.5,298.7 L377.7,288.0",
  "M349.6,300.5 L367.5,298.7",
  "M377.7,288.0 L372.1,266.9",
  "M378.0,422.5 L395.7,425.3 L398.3,415.0",
  "M364.1,392.0 L378.0,422.5",
  "M364.8,391.8 L364.1,392.0",
  "M398.3,415.0 L364.8,391.8",
  "M419.2,409.3 L406.3,407.4",
  "M378.0,466.0 L399.9,466.2 L412.3,475.7",
  "M365.8,431.1 L373.0,460.1",
  "M365.5,421.1 L365.8,431.1",
  "M378.0,422.5 L365.5,421.1",
  "M406.3,407.4 L398.3,415.0",
  "M346.8,431.4 L365.8,431.1",
  "M316.5,442.1 L328.2,423.8 L346.8,431.4",
  "M360.9,392.4 L350.2,386.1",
  "M365.5,421.1 L357.9,415.2 L360.9,392.4",
  "M416.6,385.7 L425.4,386.6",
  "M407.2,369.3 L416.6,385.7",
  "M430.5,370.2 L407.2,369.3",
  "M405.6,304.5 L422.5,308.5",
  "M419.3,260.7 L406.7,289.5 L405.6,304.5",
  "M422.5,308.5 L457.3,317.4",
  "M408.1,392.7 L406.3,407.4",
  "M421.3,400.9 L408.1,392.7",
  "M396.1,303.6 L405.6,304.5",
  "M385.1,290.3 L396.1,303.6",
  "M404.3,253.0 L400.7,267.9 L385.1,290.3",
  "M359.2,486.0 L366.5,492.9",
  "M405.0,356.3 L433.8,356.3",
  "M390.5,351.5 L405.0,356.3",
  "M418.9,325.7 L390.5,351.5",
  "M444.0,325.4 L418.9,325.7",
  "M407.2,369.3 L405.0,356.3",
  "M408.3,391.3 L416.6,385.7",
  "M381.1,355.7 L408.3,391.3",
  "M390.5,351.5 L381.1,355.7",
  "M361.7,355.5 L365.8,349.4",
  "M348.9,355.1 L361.7,355.5",
  "M379.8,315.3 L367.5,298.7",
  "M365.8,349.4 L383.0,325.0 L379.8,315.3",
  "M364.1,392.0 L360.9,392.4",
  "M418.9,325.7 L422.5,308.5",
  "M365.8,349.4 L381.1,355.7",
  "M396.1,303.6 L402.8,317.5 L379.8,315.3",
  "M364.8,391.8 L380.2,381.6 L361.7,355.5",
  "M408.1,392.7 L408.3,391.3",
  "M385.1,290.3 L377.7,288.0",
  "M346.8,431.4 L331.4,442.4 L316.5,442.1"
];
const V3_MIYAZAKI_OUTLINE = "M457.3,317.4 L449.8,314.8 L463.4,284.4 L478.9,276.5 L479.5,263.0 L463.4,258.5 L459.2,270.9 L423.0,271.7 L416.3,257.1 L393.2,259.1 L383.7,252.1 L378.7,251.9 L375.7,252.9 L372.1,266.9 L356.4,282.7 L351.4,288.2 L350.0,297.5 L349.6,301.1 L336.4,306.9 L334.2,311.2 L334.0,316.0 L344.1,342.5 L350.2,352.4 L348.5,354.0 L348.9,355.1 L339.3,367.4 L339.2,368.8 L350.2,386.1 L349.0,385.9 L349.8,387.0 L330.0,387.4 L323.4,395.2 L296.0,396.3 L285.0,397.3 L280.2,407.0 L307.4,432.3 L316.5,442.1 L310.1,456.4 L329.2,463.7 L335.6,485.3 L364.1,495.9 L367.2,530.4 L376.8,545.4 L389.5,549.3 L397.7,522.0 L397.3,510.1 L411.4,493.6 L412.3,475.7 L409.7,447.0 L419.2,409.3 L421.3,400.9 L425.4,386.6 L430.5,370.2 L433.8,356.3 L444.0,325.4 Z";
const V3_KAGOSHIMA_MUNIS = [
  { name: 'いちき串木野市', cx: 204.8, cy: 473.5, d: 'M186.2,463.7 L210.0,488.6 L221.0,473.7 L195.7,461.9 Z' },
  { name: 'さつま町', cx: 238.3, cy: 431.2, d: 'M214.8,424.2 L224.8,446.8 L236.3,453.7 L238.1,440.3 L258.1,442.9 L263.9,434.3 L264.6,431.6 L238.5,411.6 Z' },
  { name: '伊佐市', cx: 260.0, cy: 406.3, d: 'M264.6,431.6 L278.4,418.4 L278.1,406.0 L281.1,397.7 L279.5,397.8 L271.3,388.8 L261.0,381.8 L252.2,391.6 L238.2,393.7 L238.5,411.6 Z' },
  { name: '出水市', cx: 217.1, cy: 405.0, d: 'M214.8,424.2 L238.5,411.6 L238.2,393.7 L228.6,395.1 L221.6,385.6 L221.8,385.4 L217.8,383.5 L208.9,395.8 L195.6,391.7 L197.4,411.9 L209.4,422.8 Z' },
  { name: '南さつま市', cx: 206.2, cy: 542.7, d: 'M232.9,526.3 L231.0,522.8 L209.6,523.1 L194.1,541.4 L178.2,538.5 L200.6,571.6 L209.3,555.3 Z' },
  { name: '南九州市', cx: 231.4, cy: 555.9, d: 'M232.9,526.3 L209.3,555.3 L219.3,572.4 L243.9,580.4 L249.3,563.6 L243.9,541.4 Z' },
  { name: '南大隅町', cx: 291.1, cy: 600.4, d: 'M289.4,577.9 L283.0,600.3 L271.9,606.8 L274.7,619.2 L312.8,601.1 L309.5,597.6 Z' },
  { name: '垂水市', cx: 288.7, cy: 517.0, d: 'M277.2,509.8 L277.4,529.2 L288.1,539.0 L298.3,525.9 L299.2,499.7 L295.3,494.1 L278.7,509.4 Z' },
  { name: '大崎町', cx: 325.4, cy: 527.4, d: 'M317.2,510.2 L313.1,520.8 L322.6,534.1 L334.0,543.0 L340.8,532.4 L323.7,526.4 L325.7,513.1 L323.3,514.9 L322.1,513.8 Z' },
  { name: '姶良市', cx: 259.1, cy: 463.3, d: 'M261.9,485.6 L272.7,474.2 L277.1,461.3 L258.1,442.9 L246.7,452.9 L237.8,473.8 L255.5,470.3 Z' },
  { name: '志布志市', cx: 345.3, cy: 514.9, d: 'M323.7,526.4 L340.8,532.4 L358.8,528.5 L365.2,508.2 L364.6,501.8 L360.6,494.6 L359.5,494.2 L349.3,502.6 L335.5,498.8 L325.7,513.1 Z' },
  { name: '指宿市', cx: 256.8, cy: 575.1, d: 'M257.2,561.6 L249.3,563.6 L243.9,580.4 L257.8,591.9 L271.7,569.4 Z' },
  { name: '日置市', cx: 220.5, cy: 499.7, d: 'M227.2,476.5 L221.0,473.7 L210.0,488.6 L209.6,523.1 L231.0,522.8 L222.7,504.3 L236.7,495.0 Z' },
  { name: '曽於市', cx: 326.1, cy: 488.6, d: 'M322.1,513.8 L323.3,514.9 L325.7,513.1 L335.5,498.8 L349.3,502.6 L359.5,494.2 L345.2,488.9 L334.5,485.4 L327.9,463.5 L310.0,458.3 L314.5,487.6 L304.7,497.2 L317.2,510.2 Z' },
  { name: '東串良町', cx: 328.2, cy: 543.5, d: 'M322.6,534.1 L324.8,548.5 L333.0,550.4 L334.0,543.0 Z' },
  { name: '枕崎市', cx: 209.7, cy: 566.4, d: 'M209.3,555.3 L200.6,571.6 L219.3,572.4 Z' },
  { name: '湧水町', cx: 281.2, cy: 426.6, d: 'M298.0,430.2 L278.1,406.0 L278.4,418.4 L264.6,431.6 L263.9,434.3 L282.0,437.8 Z' },
  { name: '肝付町', cx: 328.5, cy: 570.1, d: 'M324.8,548.5 L315.2,550.5 L317.3,577.4 L309.5,597.6 L312.8,601.1 L326.6,593.1 L333.3,577.3 L353.4,566.7 L349.3,556.3 L333.0,550.4 Z' },
  { name: '薩摩川内市', cx: 216.9, cy: 451.6, d: 'M227.2,476.5 L237.8,473.8 L246.7,452.9 L258.1,442.9 L238.1,440.3 L236.3,453.7 L224.8,446.8 L214.8,424.2 L209.4,422.8 L193.2,432.9 L186.2,463.7 L195.7,461.9 L221.0,473.7 Z' },
  { name: '錦江町', cx: 303.2, cy: 579.5, d: 'M293.9,563.4 L289.4,577.9 L309.5,597.6 L317.3,577.4 Z' },
  { name: '長島町', cx: 179.7, cy: 384.2, d: 'M185.4,372.5 L174.3,373.5 L174.4,392.2 L183.3,399.5 Z' },
  { name: '阿久根市', cx: 194.1, cy: 413.7, d: 'M209.4,422.8 L197.4,411.9 L195.6,391.7 L185.5,396.3 L186.0,417.9 L193.2,432.9 Z' },
  { name: '霧島市', cx: 292.1, cy: 459.7, d: 'M299.2,499.7 L304.7,497.2 L314.5,487.6 L310.0,458.3 L312.8,441.7 L298.0,430.2 L282.0,437.8 L263.9,434.3 L258.1,442.9 L277.1,461.3 L272.7,474.2 L293.8,479.4 L295.3,494.1 Z' },
  { name: '鹿児島市', cx: 243.3, cy: 505.4, d: 'M257.2,561.6 L247.2,540.4 L253.4,501.2 L261.9,485.6 L255.5,470.3 L237.8,473.8 L227.2,476.5 L236.7,495.0 L222.7,504.3 L231.0,522.8 L232.9,526.3 L243.9,541.4 L249.3,563.6 Z' },
  { name: '鹿屋市', cx: 306.4, cy: 538.7, d: 'M317.2,510.2 L304.7,497.2 L299.2,499.7 L298.3,525.9 L288.1,539.0 L293.9,563.4 L317.3,577.4 L315.2,550.5 L324.8,548.5 L322.6,534.1 L313.1,520.8 Z' }
];
const V3_KAGOSHIMA_BORDERS = [
  "M221.0,473.7 L195.7,461.9 L186.2,463.7",
  "M210.0,488.6 L221.0,473.7",
  "M238.5,411.6 L214.8,424.2",
  "M264.6,431.6 L238.5,411.6",
  "M263.9,434.3 L264.6,431.6",
  "M258.1,442.9 L263.9,434.3",
  "M214.8,424.2 L224.8,446.8 L236.3,453.7 L238.1,440.3 L258.1,442.9",
  "M238.2,392.9 L238.5,411.6",
  "M264.6,431.6 L278.4,418.4 L278.1,406.0",
  "M195.6,391.7 L197.4,411.9 L209.4,422.8",
  "M209.4,422.8 L214.8,424.2",
  "M209.3,555.3 L232.9,526.3",
  "M200.6,571.6 L209.3,555.3",
  "M231.0,522.8 L209.6,523.1",
  "M232.9,526.3 L231.0,522.8",
  "M249.3,563.6 L243.9,541.4 L232.9,526.3",
  "M243.9,580.4 L249.3,563.6",
  "M209.3,555.3 L219.3,572.4",
  "M309.5,597.6 L289.4,577.9",
  "M312.8,601.1 L309.5,597.6",
  "M278.7,509.4 L277.2,509.8",
  "M299.2,499.7 L295.3,494.1",
  "M288.1,539.0 L298.3,525.9 L299.2,499.7",
  "M322.1,513.8 L317.2,510.2",
  "M325.7,513.1 L323.3,514.9",
  "M340.8,532.4 L323.7,526.4 L325.7,513.1",
  "M322.6,534.1 L334.0,543.0",
  "M317.2,510.2 L313.1,520.8 L322.6,534.1",
  "M237.8,473.8 L255.5,470.3 L261.9,485.6",
  "M258.1,442.9 L246.7,452.9 L237.8,473.8",
  "M272.7,474.2 L277.1,461.3 L258.1,442.9",
  "M360.1,493.7 L349.3,502.6 L335.5,498.8 L325.7,513.1",
  "M257.2,561.6 L249.3,563.6",
  "M231.0,522.8 L222.7,504.3 L236.7,495.0 L227.2,476.5",
  "M227.2,476.5 L221.0,473.7",
  "M304.7,497.2 L317.2,510.2",
  "M310.0,458.3 L314.5,487.6 L304.7,497.2",
  "M324.8,548.5 L333.0,550.4",
  "M322.6,534.1 L324.8,548.5",
  "M263.9,434.3 L282.0,437.8 L298.0,430.2",
  "M317.3,577.4 L309.5,597.6",
  "M324.8,548.5 L315.2,550.5 L317.3,577.4",
  "M209.4,422.8 L193.2,432.9",
  "M227.2,476.5 L237.8,473.8",
  "M317.3,577.4 L293.9,563.4",
  "M299.2,499.7 L304.7,497.2"
];
const V3_KAGOSHIMA_OUTLINE = "M312.8,601.1 L326.6,593.1 L333.3,577.3 L353.4,566.7 L349.3,556.3 L333.0,550.4 L334.0,543.0 L340.8,532.4 L358.8,528.5 L365.2,508.2 L364.7,501.9 L360.5,494.5 L346.0,489.2 L334.5,485.4 L327.9,463.5 L310.0,458.3 L310.3,456.4 L310.1,456.4 L310.4,455.8 L312.8,441.7 L298.0,430.2 L278.1,406.0 L281.0,397.7 L279.5,397.8 L271.3,388.8 L261.0,381.8 L252.2,391.6 L228.6,395.1 L221.6,385.6 L221.8,385.3 L217.8,383.5 L208.9,395.8 L195.6,391.7 L185.5,396.3 L186.0,417.9 L193.2,432.9 L186.2,463.7 L210.0,488.6 L209.6,523.1 L194.1,541.4 L178.2,538.5 L200.6,571.6 L219.3,572.4 L243.9,580.4 L257.8,591.9 L271.7,569.4 L257.2,561.6 L247.2,540.4 L253.4,501.2 L261.9,485.6 L272.7,474.2 L293.8,479.4 L295.3,494.1 L278.7,509.4 L274.0,494.7 L258.4,502.9 L277.2,509.8 L277.4,529.2 L288.1,539.0 L293.9,563.4 L289.4,577.9 L283.0,600.3 L271.9,606.8 L274.7,619.2 Z";

const KYUSHU_INTERNAL_BORDERS = [
  "M158.9,205.7 L146.8,197.3 L152.4,192.0 L150.4,182.4 L141.0,184.0 L129.1,178.5 L128.3,166.7 L119.0,157.0 L124.1,147.1",
  "M185.6,222.8 L167.9,215.8",
  "M220.8,186.9 L218.0,174.5 L224.5,171.1 L223.6,166.5 L231.0,164.5 L233.8,156.5 L236.8,162.1 L242.0,148.8 L251.6,146.4 L251.7,127.2 L244.9,125.8 L230.2,135.9 L227.7,129.4 L207.4,119.1 L178.8,119.3",
  "M222.0,383.6 L229.1,393.0 L237.6,394.3 L241.5,389.2 L259.5,386.0 L261.2,380.0",
  "M299.0,192.6 L276.2,181.0 L272.7,193.3 L259.2,192.2 L245.0,205.0 L246.5,214.9 L231.0,214.9",
  "M264.4,379.9 L282.7,399.8",
  "M280.5,405.7 L292.9,414.4 L296.7,427.4 L308.0,430.7 L316.1,440.2 L309.5,448.9 L311.0,456.5 L328.6,461.7 L335.2,484.5 L340.0,491.0 L344.3,485.8 L350.3,491.6",
  "M282.7,399.8 L285.6,395.3 L306.4,397.1 L314.6,390.3 L326.2,392.8 L333.1,382.1 L349.4,384.9 L348.0,376.6 L338.0,366.7 L339.5,359.5 L344.2,360.5 L349.8,350.9 L334.2,328.6 L334.9,312.2",
  "M308.8,196.9 L305.7,194.2",
  "M308.8,196.9 L305.9,193.7",
  "M305.9,193.7 L308.8,196.9",
  "M340.5,176.3 L329.5,178.6 L327.1,187.2 L334.9,197.9 L328.9,210.8 L308.8,196.9",
  "M310.1,184.4 L311.6,177.9 L302.9,172.9 L306.6,169.2 L300.9,164.4 L308.0,162.7 L302.7,146.3 L311.4,138.9 L312.9,125.5 L336.0,111.0 L361.1,113.1 L362.3,91.6",
  "M337.6,304.6 L339.5,298.9 L349.2,299.6 L350.8,287.6 L370.9,267.1 L376.8,249.8 L390.2,252.4",
  "M354.7,491.8 L363.0,493.1 L365.7,502.2 L364.8,515.1 L360.1,517.8",
  "M373.7,226.0 L375.8,220.3 L355.9,184.3",
  "M383.7,245.2 L374.5,237.6",
  "M387.2,248.8 L383.7,245.2",
  "M383.7,245.2 L387.2,248.8",
  "M402.9,253.3 L411.9,248.4 L417.8,258.8",
  "M427.8,264.9 L431.9,260.9 L451.8,261.6 L456.7,249.2 L461.9,248.1 L477.4,251.6 L475.1,260.6",
  "M475.1,266.9 L481.4,267.1"
];

// 九州7県ぶんの市町村パズルピース(V3_*_MUNIS)を、県IDつきで1つにまとめたもの。
// どの県のものも同じ600x640の座標系(KYUSHU_OUTLINE_PATHSと同じ)で作られているため、
// そのまま並べるだけで九州のシルエットにぴったりはまるパズルになる。
const ALL_KYUSHU_MUNIS = [
  ...V3_FUKUOKA_MUNIS.map((m) => ({ ...m, prefId: '40' })),
  ...V3_SAGA_MUNIS.map((m) => ({ ...m, prefId: '41' })),
  ...V3_NAGASAKI_MUNIS.map((m) => ({ ...m, prefId: '42' })),
  ...V3_KUMAMOTO_MUNIS.map((m) => ({ ...m, prefId: '43' })),
  ...V3_OITA_MUNIS.map((m) => ({ ...m, prefId: '44' })),
  ...V3_MIYAZAKI_MUNIS.map((m) => ({ ...m, prefId: '45' })),
  ...V3_KAGOSHIMA_MUNIS.map((m) => ({ ...m, prefId: '46' })),
];
// 上記パズルピースどうしの境界線(県内の市町村境界)。県境そのものはピース同士の輪郭が
// 隣接することで自然に表現されるため、ここには県内境界だけを集約する。
const ALL_KYUSHU_MUNI_BORDERS = [
  ...V3_FUKUOKA_BORDERS,
  ...V3_SAGA_BORDERS,
  ...V3_NAGASAKI_BORDERS,
  ...V3_KUMAMOTO_BORDERS,
  ...V3_OITA_BORDERS,
  ...V3_MIYAZAKI_BORDERS,
  ...V3_KAGOSHIMA_BORDERS,
];

const KYUSHU_PREFS = [
  { id: '40', name: '福岡県', nameEn: 'Fukuoka Pref.', cx: 496.9, cy: 297.5, d: "M375.19,117.24L376.66,117.81L378.19,115.23L376.33,115.48L375.19,117.24ZM462.34,203.96L460.43,200.17L458.78,199.82L460.21,203.41L462.34,203.96ZM447.99,199.33L445.78,200.87L441.82,200.56L441.92,205.03L446.31,206.20L449.96,200.08L447.99,199.33ZM362.12,212.64L362.46,211.06L361.96,209.72L361.26,211.64L362.12,212.64ZM450.51,232.18L452.81,231.29L454.64,233.71L454.16,239.99L449.82,247.21L446.62,249.46L444.29,248.88L443.59,250.36L443.23,252.80L436.95,258.85L428.25,263.10L423.70,263.54L425.60,266.25L431.46,267.55L431.26,264.00L432.99,262.28L439.42,260.81L440.49,258.27L446.27,256.83L445.22,259.81L446.70,263.82L440.82,265.54L444.40,266.91L444.14,268.30L441.32,267.98L440.62,270.00L441.79,270.39L440.51,272.88L442.73,274.38L440.03,274.02L438.88,276.10L440.18,277.39L438.57,278.07L437.60,276.20L436.47,276.77L438.29,279.34L436.68,280.13L434.10,277.38L429.67,279.88L421.27,279.15L419.17,282.83L414.07,283.46L407.82,278.68L410.35,277.96L412.11,279.63L412.69,275.77L403.78,274.42L402.29,270.59L404.91,266.39L403.59,264.71L399.14,261.70L398.38,266.95L396.51,268.66L387.75,271.58L387.17,273.35L388.84,275.48L386.01,279.50L381.58,281.21L377.30,279.58L376.87,282.48L373.20,282.85L375.09,287.62L379.79,285.05L383.07,287.13L382.46,289.06L379.90,289.13L379.03,292.06L381.18,289.52L384.42,291.26L387.49,288.71L389.30,288.46L389.54,289.97L387.11,294.49L380.94,297.65L382.66,299.44L381.32,301.28L376.15,300.56L364.56,305.01L362.91,311.16L368.76,310.73L375.25,311.40L376.26,309.88L381.95,309.96L383.88,311.25L385.96,309.52L387.73,309.67L389.46,311.56L393.29,312.20L394.55,310.17L398.17,308.49L401.96,309.27L404.12,309.13L406.43,310.25L408.17,311.11L409.27,309.83L412.39,309.00L417.48,312.98L419.06,313.54L428.07,317.64L430.29,320.60L431.94,320.18L435.13,322.66L438.92,322.07L442.97,326.62L441.39,329.31L447.95,328.88L448.77,325.03L452.20,323.94L452.15,322.67L452.88,321.86L459.23,318.97L460.26,317.70L463.19,317.95L463.51,316.61L468.93,319.16L469.12,322.35L469.91,323.62L470.10,337.43L468.82,343.31L466.86,344.00L463.72,343.03L461.01,347.68L457.73,345.83L456.45,346.77L458.86,350.10L457.90,352.55L454.01,352.91L451.64,353.91L451.77,355.67L453.91,356.54L453.62,357.92L450.16,359.54L450.38,362.89L448.82,363.16L447.25,360.17L447.98,356.78L445.49,356.59L446.10,360.50L443.39,362.35L443.92,363.77L442.93,366.02L440.19,367.02L439.75,364.40L437.38,364.89L436.58,369.08L434.03,368.13L433.47,370.18L435.26,371.92L434.65,374.25L427.49,377.18L427.03,382.17L428.42,383.80L429.72,384.17L429.51,386.60L430.32,390.87L430.29,394.26L434.04,394.03L434.04,399.47L439.24,402.43L437.51,405.99L442.25,407.76L443.52,411.48L445.15,416.24L444.69,422.13L441.40,425.20L443.88,427.57L441.74,427.18L439.04,429.55L442.77,428.98L450.58,428.58L457.70,429.15L460.94,427.91L462.64,428.58L464.51,426.03L463.47,423.74L462.32,423.00L462.09,420.31L460.07,417.32L462.00,414.97L468.03,413.08L468.69,409.93L470.21,409.00L475.16,407.65L475.12,406.51L474.35,403.36L478.28,400.38L480.33,400.90L487.08,401.57L494.53,402.27L494.21,400.54L497.25,394.61L496.96,390.08L499.35,388.25L499.63,386.47L501.99,390.59L506.54,390.49L511.29,390.97L511.92,392.75L519.06,398.29L520.49,398.57L522.97,398.37L527.82,400.22L529.65,402.76L533.11,403.09L534.72,402.52L538.47,400.00L538.76,398.70L540.54,392.46L542.32,391.08L541.01,387.34L543.62,385.22L543.99,382.71L533.09,376.59L538.03,371.93L530.90,370.01L531.16,367.97L530.60,365.82L531.43,364.81L539.84,363.14L536.42,359.78L537.51,357.89L539.48,356.09L538.46,353.31L536.11,344.89L532.85,343.16L538.50,338.37L538.06,335.76L543.65,334.18L545.59,317.35L546.73,316.58L548.93,316.44L552.30,314.47L555.75,307.42L557.34,306.91L558.67,305.83L562.14,302.51L564.11,301.86L565.91,301.51L567.55,301.27L571.30,301.53L575.70,299.01L579.46,301.83L581.55,301.24L582.53,301.53L582.97,302.10L590.62,301.86L593.50,303.29L605.69,302.16L603.71,296.59L608.03,292.74L608.81,289.22L605.70,285.02L604.84,281.57L606.21,279.46L607.64,274.70L606.27,273.31L603.60,274.42L592.65,270.99L591.38,274.09L589.46,274.11L586.59,270.00L577.85,256.25L571.24,244.79L571.52,240.74L569.84,242.47L568.95,240.96L568.23,239.11L571.85,236.41L570.56,234.02L567.90,236.07L566.88,234.67L568.70,233.13L568.58,229.83L565.27,230.35L568.20,227.91L567.81,226.58L571.37,225.49L570.58,223.44L564.06,225.69L560.91,225.97L558.80,220.91L559.59,218.54L562.97,219.72L563.23,217.19L566.66,215.53L567.68,211.18L564.23,211.50L566.04,206.83L568.01,209.84L568.92,205.85L565.63,203.13L567.39,201.39L569.01,202.21L569.18,199.37L570.89,199.23L568.36,197.04L570.33,195.59L570.36,192.68L572.57,192.68L573.18,188.70L568.52,185.64L566.40,187.68L560.15,187.57L560.02,191.23L556.56,193.56L553.49,201.24L544.98,206.21L544.06,202.69L540.48,203.37L543.29,201.91L540.65,199.19L536.23,201.56L540.07,198.81L536.09,199.46L537.06,195.80L530.58,198.05L530.14,202.30L526.52,205.30L526.53,209.36L525.31,209.39L526.06,205.58L521.50,208.70L514.57,209.77L513.41,206.30L515.39,208.70L524.39,205.63L528.35,202.67L528.87,199.64L527.37,198.67L529.01,198.93L529.26,197.44L526.88,195.28L520.48,194.60L520.01,196.38L514.93,197.37L518.62,195.89L516.75,193.25L518.61,192.99L518.59,191.31L515.15,191.83L515.16,195.17L512.36,195.18L512.03,196.42L507.61,193.76L502.79,193.76L498.17,198.51L495.80,199.86L496.04,202.93L490.14,206.88L480.59,208.79L476.04,208.16L474.53,205.69L470.31,205.96L467.39,206.26L467.17,209.91L463.57,214.06L456.80,215.61L455.46,223.62L453.81,225.41L449.15,224.49L450.69,227.96L449.56,230.70L450.51,232.18ZM434.65,238.46L433.89,237.23L431.95,236.65L431.79,239.67L434.65,238.46ZM402.14,255.69L403.99,257.86L405.03,256.08L403.17,254.90L402.14,255.69ZM419.08,256.62L416.23,257.33L415.36,258.68L418.05,263.49L421.79,263.16L421.76,262.06L419.08,256.62ZM445.77,262.26L444.26,259.72L438.52,263.03L439.35,264.70L443.49,264.00L445.77,262.26ZM420.02,269.86L418.74,269.02L417.89,276.49L420.00,276.53L421.33,274.65L420.02,269.86ZM364.94,287.30L365.76,285.96L364.38,284.75L363.80,286.52L364.94,287.30ZM508.63,173.88L510.04,175.87L510.67,173.99L509.35,173.27L508.63,173.88ZM528.12,177.78L528.22,179.04L529.00,180.77L530.13,181.32L528.12,177.78ZM530.05,195.57L534.92,193.34L532.19,190.68L528.35,192.29L527.19,190.96L520.46,191.63L521.91,194.41L530.05,195.57ZM576.40,219.41L575.40,213.77L573.33,214.11L574.32,219.76L574.96,223.35L577.01,223.02L576.40,219.41Z", regionD: "M375.19,117.24L376.66,117.81L378.19,115.23L376.33,115.48L375.19,117.24ZM462.34,203.96L460.43,200.17L458.78,199.82L460.21,203.41L462.34,203.96ZM447.99,199.33L445.78,200.87L441.82,200.56L441.92,205.03L446.31,206.20L449.96,200.08L447.99,199.33ZM362.12,212.64L362.46,211.06L361.96,209.72L361.26,211.64L362.12,212.64ZM450.51,232.18L452.81,231.29L454.64,233.71L454.16,239.99L449.82,247.21L446.62,249.46L444.29,248.88L443.59,250.36L443.23,252.80L436.95,258.85L428.25,263.10L423.70,263.54L425.60,266.25L431.46,267.55L431.26,264.00L432.99,262.28L439.42,260.81L440.49,258.27L446.27,256.83L445.22,259.81L446.70,263.82L440.82,265.54L444.40,266.91L444.14,268.30L441.32,267.98L440.62,270.00L441.79,270.39L440.51,272.88L442.73,274.38L440.03,274.02L438.88,276.10L440.18,277.39L438.57,278.07L437.60,276.20L436.47,276.77L438.29,279.34L436.68,280.13L434.10,277.38L429.67,279.88L421.27,279.15L419.17,282.83L414.07,283.46L407.82,278.68L410.35,277.96L412.11,279.63L412.69,275.77L403.78,274.42L402.29,270.59L404.91,266.39L403.59,264.71L399.14,261.70L398.38,266.95L396.51,268.66L387.75,271.58L387.17,273.35L388.84,275.48L386.01,279.50L381.58,281.21L377.30,279.58L376.87,282.48L373.20,282.85L375.09,287.62L379.79,285.05L383.07,287.13L382.46,289.06L379.90,289.13L379.03,292.06L381.18,289.52L384.42,291.26L387.49,288.71L389.30,288.46L389.54,289.97L387.11,294.49L380.94,297.65L382.66,299.44L381.32,301.28L376.15,300.56L364.56,305.01L362.91,311.16L368.76,310.73L375.25,311.40L376.26,309.88L381.95,309.96L383.88,311.25L385.96,309.52L387.73,309.67L389.46,311.56L393.29,312.20L394.55,310.17L398.17,308.49L401.96,309.27L404.12,309.13L406.43,310.25L408.17,311.11L409.27,309.83L412.39,309.00L417.48,312.98L419.06,313.54L428.07,317.64L430.29,320.60L431.94,320.18L435.13,322.66L438.92,322.07L442.97,326.62L441.39,329.31L447.95,328.88L448.77,325.03L452.20,323.94L452.15,322.67L452.88,321.86L459.23,318.97L460.26,317.70L463.19,317.95L463.51,316.61L468.93,319.16L469.12,322.35L469.91,323.62L470.10,337.43L468.82,343.31L466.86,344.00L463.72,343.03L461.01,347.68L457.73,345.83L456.45,346.77L458.86,350.10L457.90,352.55L454.01,352.91L451.64,353.91L451.77,355.67L453.91,356.54L453.62,357.92L450.16,359.54L450.38,362.89L448.82,363.16L447.25,360.17L447.98,356.78L445.49,356.59L446.10,360.50L443.39,362.35L443.92,363.77L442.93,366.02L440.19,367.02L439.75,364.40L437.38,364.89L436.58,369.08L434.03,368.13L433.47,370.18L435.26,371.92L434.65,374.25L427.49,377.18L427.03,382.17L428.42,383.80L429.72,384.17L429.51,386.60L430.32,390.87L430.29,394.26L434.04,394.03L434.04,399.47L439.24,402.43L437.51,405.99L442.25,407.76L443.52,411.48L445.15,416.24L444.69,422.13L441.40,425.20L443.88,427.57L441.74,427.18L439.04,429.55L442.77,428.98L450.58,428.58L457.70,429.15L460.94,427.91L462.64,428.58L464.51,426.03L463.47,423.74L462.32,423.00L462.09,420.31L460.07,417.32L462.00,414.97L468.03,413.08L468.69,409.93L470.21,409.00L475.16,407.65L475.12,406.51L474.35,403.36L478.28,400.38L480.33,400.90L487.08,401.57L494.53,402.27L494.21,400.54L497.25,394.61L496.96,390.08L499.35,388.25L499.63,386.47L501.99,390.59L506.54,390.49L511.29,390.97L511.92,392.75L519.06,398.29L520.49,398.57L522.97,398.37L527.82,400.22L529.65,402.76L533.11,403.09L534.72,402.52L538.47,400.00L538.76,398.70L540.54,392.46L542.32,391.08L541.01,387.34L543.62,385.22L543.99,382.71L533.09,376.59L538.03,371.93L530.90,370.01L531.16,367.97L530.60,365.82L531.43,364.81L539.84,363.14L536.42,359.78L537.51,357.89L539.48,356.09L538.46,353.31L536.11,344.89L532.85,343.16L538.50,338.37L538.06,335.76L543.65,334.18L545.59,317.35L546.73,316.58L548.93,316.44L552.30,314.47L555.75,307.42L557.34,306.91L558.67,305.83L562.14,302.51L564.11,301.86L565.91,301.51L567.55,301.27L571.30,301.53L575.70,299.01L579.46,301.83L581.55,301.24L582.53,301.53L582.97,302.10L590.62,301.86L593.50,303.29L605.69,302.16L603.71,296.59L608.03,292.74L608.81,289.22L605.70,285.02L604.84,281.57L606.21,279.46L607.64,274.70L606.27,273.31L603.60,274.42L592.65,270.99L591.38,274.09L589.46,274.11L586.59,270.00L577.85,256.25L571.24,244.79L571.52,240.74L569.84,242.47L568.95,240.96L568.23,239.11L571.85,236.41L570.56,234.02L567.90,236.07L566.88,234.67L568.70,233.13L568.58,229.83L565.27,230.35L568.20,227.91L567.81,226.58L571.37,225.49L570.58,223.44L564.06,225.69L560.91,225.97L558.80,220.91L559.59,218.54L562.97,219.72L563.23,217.19L566.66,215.53L567.68,211.18L564.23,211.50L566.04,206.83L568.01,209.84L568.92,205.85L565.63,203.13L567.39,201.39L569.01,202.21L569.18,199.37L570.89,199.23L568.36,197.04L570.33,195.59L570.36,192.68L572.57,192.68L573.18,188.70L568.52,185.64L566.40,187.68L560.15,187.57L560.02,191.23L556.56,193.56L553.49,201.24L544.98,206.21L544.06,202.69L540.48,203.37L543.29,201.91L540.65,199.19L536.23,201.56L540.07,198.81L536.09,199.46L537.06,195.80L530.58,198.05L530.14,202.30L526.52,205.30L526.53,209.36L525.31,209.39L526.06,205.58L521.50,208.70L514.57,209.77L513.41,206.30L515.39,208.70L524.39,205.63L528.35,202.67L528.87,199.64L527.37,198.67L529.01,198.93L529.26,197.44L526.88,195.28L520.48,194.60L520.01,196.38L514.93,197.37L518.62,195.89L516.75,193.25L518.61,192.99L518.59,191.31L515.15,191.83L515.16,195.17L512.36,195.18L512.03,196.42L507.61,193.76L502.79,193.76L498.17,198.51L495.80,199.86L496.04,202.93L490.14,206.88L480.59,208.79L476.04,208.16L474.53,205.69L470.31,205.96L467.39,206.26L467.17,209.91L463.57,214.06L456.80,215.61L455.46,223.62L453.81,225.41L449.15,224.49L450.69,227.96L449.56,230.70L450.51,232.18ZM434.65,238.46L433.89,237.23L431.95,236.65L431.79,239.67L434.65,238.46ZM402.14,255.69L403.99,257.86L405.03,256.08L403.17,254.90L402.14,255.69ZM419.08,256.62L416.23,257.33L415.36,258.68L418.05,263.49L421.79,263.16L421.76,262.06L419.08,256.62ZM445.77,262.26L444.26,259.72L438.52,263.03L439.35,264.70L443.49,264.00L445.77,262.26ZM420.02,269.86L418.74,269.02L417.89,276.49L420.00,276.53L421.33,274.65L420.02,269.86ZM364.94,287.30L365.76,285.96L364.38,284.75L363.80,286.52L364.94,287.30ZM508.63,173.88L510.04,175.87L510.67,173.99L509.35,173.27L508.63,173.88ZM528.12,177.78L528.22,179.04L529.00,180.77L530.13,181.32L528.12,177.78ZM530.05,195.57L534.92,193.34L532.19,190.68L528.35,192.29L527.19,190.96L520.46,191.63L521.91,194.41L530.05,195.57ZM576.40,219.41L575.40,213.77L573.33,214.11L574.32,219.76L574.96,223.35L577.01,223.02L576.40,219.41Z", regionViewBox: { x: 360.0, y: 114.0, w: 250.1, h: 316.8 }, fullViewBox: { x: 355.0, y: 108.9, w: 260.1, h: 326.9 } },
  { id: '41', name: '佐賀県', nameEn: 'Saga Pref.', cx: 379.0, cy: 357.3, d: "M324.15,277.82L324.89,274.22L321.72,278.83L325.29,281.69L325.71,279.39L324.15,277.82ZM331.31,279.21L331.79,280.08L333.50,279.72L332.47,277.61L331.31,279.21ZM320.87,282.47L321.19,280.67L319.31,281.28L320.87,282.47ZM305.66,285.71L304.73,283.17L303.02,283.02L301.58,284.24L300.20,283.04L298.64,285.49L303.50,287.79L305.66,285.71ZM327.23,288.86L327.14,292.66L330.77,290.68L328.94,286.77L327.23,288.86ZM348.64,296.60L348.59,292.85L346.64,296.48L348.64,296.60ZM351.04,309.34L351.31,310.51L352.97,310.64L352.42,308.75L351.04,309.34ZM318.94,310.84L321.73,309.97L323.67,312.66L322.45,317.08L320.68,317.67L318.90,316.17L319.42,312.80L317.00,311.75L317.12,309.01L312.80,307.42L310.10,310.78L312.76,313.39L312.18,315.13L309.39,314.10L307.86,316.21L316.77,322.92L316.16,325.33L321.54,327.51L325.13,326.28L325.33,330.67L325.73,335.01L321.97,337.76L321.66,343.15L317.95,345.09L318.56,346.84L320.19,345.97L321.44,347.11L319.15,351.15L317.47,350.98L318.08,353.05L321.40,353.89L322.32,356.68L320.85,355.83L320.50,357.43L318.14,355.70L312.32,344.46L309.15,343.93L306.42,345.85L302.65,356.41L303.70,356.66L309.49,364.83L311.09,365.85L314.44,370.11L312.90,376.45L315.10,383.15L329.84,388.95L330.28,390.28L334.09,389.80L335.28,388.77L341.07,387.97L344.85,397.21L343.78,401.90L339.84,401.62L337.60,406.80L339.89,407.34L341.12,410.91L349.50,415.12L350.63,415.27L352.94,417.49L354.44,423.10L357.40,425.16L360.06,424.45L360.19,426.43L363.72,428.53L367.29,433.12L370.47,432.69L373.21,436.08L382.20,437.53L383.94,437.45L399.18,440.50L402.19,439.08L399.14,433.06L396.04,432.43L390.50,416.72L386.25,412.65L385.35,407.88L381.50,403.51L381.90,399.92L386.25,401.24L395.32,393.95L394.86,392.82L401.72,388.05L403.65,381.24L406.96,381.34L406.90,378.53L408.51,378.63L407.95,381.73L415.31,388.89L415.90,392.67L430.29,394.26L430.32,390.87L429.72,384.17L428.42,383.80L427.03,382.17L427.49,377.18L434.65,374.25L435.26,371.92L433.47,370.18L434.17,368.10L436.62,369.06L437.38,364.89L439.75,364.40L440.19,367.02L442.93,366.02L443.92,363.77L443.48,362.07L446.36,359.01L445.49,356.59L447.98,356.78L447.25,360.17L448.82,363.16L450.38,362.89L450.16,359.54L453.62,357.92L453.91,356.54L451.77,355.67L451.64,353.91L454.01,352.91L457.90,352.55L458.86,350.10L456.21,347.57L456.84,346.35L461.01,347.68L463.72,343.03L466.86,344.00L468.82,343.31L470.10,337.43L470.07,330.41L469.91,323.62L469.12,322.35L468.33,318.53L463.51,316.61L460.26,317.70L459.23,318.97L453.08,321.94L452.15,322.67L452.20,323.94L448.77,325.03L447.93,328.80L444.58,329.35L442.09,330.21L441.39,329.31L442.97,326.62L439.31,322.27L435.09,322.68L431.94,320.18L430.29,320.60L428.07,317.64L426.86,317.74L422.56,314.19L419.06,313.54L417.48,312.98L413.38,309.12L409.27,309.83L408.17,311.11L406.43,310.25L404.12,309.13L401.96,309.27L398.17,308.49L394.55,310.17L393.29,312.20L390.30,311.95L387.73,309.67L385.96,309.52L383.88,311.25L381.95,309.96L376.26,309.88L375.25,311.40L368.76,310.73L362.62,311.54L362.39,315.59L359.90,316.99L353.97,317.19L347.94,315.18L345.64,311.68L348.03,309.98L346.76,308.04L343.02,310.74L340.82,308.43L347.63,300.93L345.02,299.41L344.10,296.35L339.13,294.55L339.37,292.43L335.84,293.15L334.79,291.40L332.31,291.43L328.95,295.18L323.92,292.79L322.42,290.36L321.71,294.28L323.50,295.46L321.87,299.88L323.59,300.94L318.00,298.83L317.77,302.50L320.94,308.61L318.94,310.84ZM400.56,439.85L400.13,441.54L401.83,441.14L402.10,440.05L400.56,439.85Z", regionD: "M324.15,277.82L324.89,274.22L321.72,278.83L325.29,281.69L325.71,279.39L324.15,277.82ZM331.31,279.21L331.79,280.08L333.50,279.72L332.47,277.61L331.31,279.21ZM320.87,282.47L321.19,280.67L319.31,281.28L320.87,282.47ZM305.66,285.71L304.73,283.17L303.02,283.02L301.58,284.24L300.20,283.04L298.64,285.49L303.50,287.79L305.66,285.71ZM327.23,288.86L327.14,292.66L330.77,290.68L328.94,286.77L327.23,288.86ZM348.64,296.60L348.59,292.85L346.64,296.48L348.64,296.60ZM351.04,309.34L351.31,310.51L352.97,310.64L352.42,308.75L351.04,309.34ZM318.94,310.84L321.73,309.97L323.67,312.66L322.45,317.08L320.68,317.67L318.90,316.17L319.42,312.80L317.00,311.75L317.12,309.01L312.80,307.42L310.10,310.78L312.76,313.39L312.18,315.13L309.39,314.10L307.86,316.21L316.77,322.92L316.16,325.33L321.54,327.51L325.13,326.28L325.33,330.67L325.73,335.01L321.97,337.76L321.66,343.15L317.95,345.09L318.56,346.84L320.19,345.97L321.44,347.11L319.15,351.15L317.47,350.98L318.08,353.05L321.40,353.89L322.32,356.68L320.85,355.83L320.50,357.43L318.14,355.70L312.32,344.46L309.15,343.93L306.42,345.85L302.65,356.41L303.70,356.66L309.49,364.83L311.09,365.85L314.44,370.11L312.90,376.45L315.10,383.15L329.84,388.95L330.28,390.28L334.09,389.80L335.28,388.77L341.07,387.97L344.85,397.21L343.78,401.90L339.84,401.62L337.60,406.80L339.89,407.34L341.12,410.91L349.50,415.12L350.63,415.27L352.94,417.49L354.44,423.10L357.40,425.16L360.06,424.45L360.19,426.43L363.72,428.53L367.29,433.12L370.47,432.69L373.21,436.08L382.20,437.53L383.94,437.45L399.18,440.50L402.19,439.08L399.14,433.06L396.04,432.43L390.50,416.72L386.25,412.65L385.35,407.88L381.50,403.51L381.90,399.92L386.25,401.24L395.32,393.95L394.86,392.82L401.72,388.05L403.65,381.24L406.96,381.34L406.90,378.53L408.51,378.63L407.95,381.73L415.31,388.89L415.90,392.67L430.29,394.26L430.32,390.87L429.72,384.17L428.42,383.80L427.03,382.17L427.49,377.18L434.65,374.25L435.26,371.92L433.47,370.18L434.17,368.10L436.62,369.06L437.38,364.89L439.75,364.40L440.19,367.02L442.93,366.02L443.92,363.77L443.48,362.07L446.36,359.01L445.49,356.59L447.98,356.78L447.25,360.17L448.82,363.16L450.38,362.89L450.16,359.54L453.62,357.92L453.91,356.54L451.77,355.67L451.64,353.91L454.01,352.91L457.90,352.55L458.86,350.10L456.21,347.57L456.84,346.35L461.01,347.68L463.72,343.03L466.86,344.00L468.82,343.31L470.10,337.43L470.07,330.41L469.91,323.62L469.12,322.35L468.33,318.53L463.51,316.61L460.26,317.70L459.23,318.97L453.08,321.94L452.15,322.67L452.20,323.94L448.77,325.03L447.93,328.80L444.58,329.35L442.09,330.21L441.39,329.31L442.97,326.62L439.31,322.27L435.09,322.68L431.94,320.18L430.29,320.60L428.07,317.64L426.86,317.74L422.56,314.19L419.06,313.54L417.48,312.98L413.38,309.12L409.27,309.83L408.17,311.11L406.43,310.25L404.12,309.13L401.96,309.27L398.17,308.49L394.55,310.17L393.29,312.20L390.30,311.95L387.73,309.67L385.96,309.52L383.88,311.25L381.95,309.96L376.26,309.88L375.25,311.40L368.76,310.73L362.62,311.54L362.39,315.59L359.90,316.99L353.97,317.19L347.94,315.18L345.64,311.68L348.03,309.98L346.76,308.04L343.02,310.74L340.82,308.43L347.63,300.93L345.02,299.41L344.10,296.35L339.13,294.55L339.37,292.43L335.84,293.15L334.79,291.40L332.31,291.43L328.95,295.18L323.92,292.79L322.42,290.36L321.71,294.28L323.50,295.46L321.87,299.88L323.59,300.94L318.00,298.83L317.77,302.50L320.94,308.61L318.94,310.84ZM400.56,439.85L400.13,441.54L401.83,441.14L402.10,440.05L400.56,439.85Z", regionViewBox: { x: 298.0, y: 273.5, w: 172.8, h: 168.7 }, fullViewBox: { x: 295.2, y: 270.8, w: 178.3, h: 174.2 } },
  { id: '42', name: '長崎県', nameEn: 'Nagasaki Pref.', cx: 339.5, cy: 443.9, d: "M125.36,380.72L124.64,380.59L124.58,381.59L125.17,381.70L125.36,380.72ZM137.56,380.86L135.97,381.93L136.03,382.88L138.92,382.20L137.56,380.86ZM119.48,385.77L119.00,385.98L118.07,387.54L119.55,387.32L119.48,385.77ZM118.22,391.07L119.79,390.84L119.41,390.43L118.22,391.07ZM136.64,443.40L136.52,441.97L139.22,441.53L139.69,439.20L138.22,438.19L135.58,439.96L136.64,443.40ZM130.54,450.67L131.14,451.03L133.28,449.31L133.73,447.23L132.45,446.54L131.01,450.67L129.07,448.45L125.41,449.80L126.65,452.00L132.23,453.59L132.92,451.18L131.13,452.73L130.54,450.67ZM129.08,455.24L128.21,454.57L127.95,455.11L129.05,455.68L129.08,455.24ZM122.62,455.48L121.55,456.12L121.02,458.25L122.46,458.09L122.62,455.48ZM140.54,454.03L139.67,455.91L141.29,459.35L140.22,460.04L138.33,456.14L137.32,459.57L136.77,456.01L132.14,453.79L134.99,460.17L133.18,461.76L136.18,461.79L136.19,465.15L139.64,462.37L142.06,464.26L144.29,463.41L142.74,465.67L145.33,465.90L143.75,466.33L145.83,468.65L146.57,462.29L145.14,461.39L147.05,457.20L145.12,457.46L147.39,455.48L145.35,453.77L144.90,450.40L143.20,450.23L143.68,448.70L140.47,449.63L138.20,446.41L136.68,447.10L138.32,448.40L137.53,449.63L135.62,449.99L137.80,452.72L136.17,453.69L138.78,455.49L140.54,454.03ZM120.62,460.11L120.41,459.96L119.99,460.26L120.51,460.73L120.62,460.11ZM141.08,464.05L140.50,464.91L140.63,465.82L141.61,465.37L141.08,464.05ZM118.85,462.05L117.71,460.12L116.56,460.39L116.81,463.06L113.41,464.07L116.79,466.79L117.23,463.80L121.59,469.56L123.24,469.28L125.33,472.93L125.01,474.28L122.04,474.66L125.86,475.42L127.35,473.75L127.57,479.94L130.08,475.64L127.83,472.98L129.18,471.37L131.95,472.07L130.55,471.34L130.46,468.19L132.68,466.86L131.44,462.49L127.85,458.56L129.47,461.58L128.09,467.51L125.08,461.99L123.79,462.22L126.62,467.14L125.90,470.09L122.44,462.22L118.85,462.05ZM72.47,478.85L72.02,477.25L70.21,478.05L71.37,479.21L72.47,478.85ZM110.63,471.05L108.64,472.41L105.66,470.22L105.14,484.31L108.21,485.16L111.28,488.94L114.56,489.01L121.23,480.25L119.75,479.26L119.09,474.41L115.94,473.57L115.39,471.34L111.25,468.60L112.19,474.61L114.34,475.37L113.22,477.75L114.15,480.06L110.96,479.40L112.77,478.29L111.11,476.69L110.63,471.05ZM126.29,477.93L125.23,478.20L126.08,480.27L126.79,479.70L126.29,477.93ZM133.34,487.78L131.34,485.63L130.81,488.88L132.89,489.53L133.34,487.78ZM137.81,491.19L138.85,492.34L141.58,491.68L141.92,486.87L138.83,482.12L137.21,485.33L138.60,487.45L137.93,490.37L133.78,491.05L132.40,492.21L133.18,493.58L137.43,494.49L137.81,491.19ZM130.09,490.56L129.59,491.03L129.96,491.28L130.59,491.04L130.09,490.56ZM114.27,494.89L114.60,492.23L112.52,493.49L112.61,495.11L114.27,494.89ZM91.99,495.69L92.34,494.52L91.96,493.88L91.52,494.76L91.99,495.69ZM111.02,497.12L109.87,498.17L111.03,499.70L112.13,499.17L111.02,497.12ZM52.77,498.22L52.83,501.71L54.46,502.27L54.87,497.71L56.91,496.11L56.10,494.82L52.77,498.22ZM108.98,499.07L108.40,499.82L109.21,500.23L109.44,499.44L108.98,499.07ZM118.58,502.03L117.56,502.95L118.36,506.52L120.18,503.71L118.58,502.03ZM95.95,488.61L97.30,491.12L96.04,489.65L91.85,492.31L92.93,495.87L91.53,496.38L88.75,487.74L87.34,487.79L84.48,495.33L84.92,492.23L81.86,492.93L84.21,490.55L78.17,492.46L77.64,495.31L75.74,495.57L74.48,494.81L75.84,492.92L75.61,488.30L68.56,483.69L66.71,485.01L63.42,489.62L66.26,494.37L64.79,500.01L68.45,504.79L65.09,504.91L65.32,509.81L67.87,512.10L71.08,512.02L68.33,514.20L70.02,517.27L66.11,515.55L69.35,518.53L64.29,516.53L66.21,519.73L63.67,519.93L62.46,523.04L63.94,525.32L66.19,522.74L69.26,522.60L65.62,525.10L66.74,526.94L64.61,529.33L64.92,527.42L59.95,525.25L60.42,523.27L58.90,522.42L57.47,524.84L57.63,522.71L59.61,521.60L57.47,518.36L54.42,526.98L59.97,527.95L62.91,531.95L66.16,532.51L68.84,528.04L73.70,529.52L84.05,528.39L87.21,532.48L87.50,535.32L91.77,536.58L96.10,531.01L94.56,527.86L89.28,524.76L91.18,518.90L98.94,516.21L102.10,521.07L112.19,518.94L112.91,520.31L117.39,519.91L118.25,516.55L116.10,516.11L115.29,512.65L109.00,507.58L105.97,501.62L106.66,494.51L109.45,493.43L107.79,491.65L105.24,493.73L104.61,491.94L102.88,494.43L105.09,489.80L100.29,493.03L98.54,491.92L103.17,489.84L98.56,486.28L99.45,480.33L95.54,482.61L97.02,483.77L95.97,485.64L92.31,485.44L90.14,489.80L92.37,490.88L95.95,488.61ZM65.49,513.76L65.04,513.77L64.87,514.54L65.65,514.15L65.49,513.76ZM59.60,520.70L62.42,518.39L60.73,513.98L63.29,514.20L62.20,510.08L58.16,515.61L59.60,520.70ZM92.74,525.34L93.17,525.15L92.76,524.75L92.74,525.34ZM104.31,528.74L103.32,530.51L106.31,531.20L105.94,528.95L104.31,528.74ZM124.42,530.48L123.44,531.10L122.13,531.30L124.84,532.21L124.42,530.48ZM120.53,532.09L120.40,531.45L119.91,531.65L119.90,532.09L120.53,532.09ZM119.76,532.57L118.51,533.03L118.32,533.57L119.83,533.70L119.76,532.57ZM80.04,534.45L78.88,534.50L77.95,535.17L80.66,535.38L80.04,534.45ZM120.16,539.65L120.14,537.39L117.56,537.90L117.34,539.35L120.16,539.65ZM10.75,667.40L10.20,670.24L7.96,670.80L8.18,671.43L11.76,670.43L13.15,671.67L14.88,667.85L13.48,668.77L10.75,667.40ZM7.57,672.15L7.33,673.18L7.97,673.33L7.76,672.38L7.57,672.15ZM6.77,674.00L6.22,673.47L5.29,674.50L5.40,675.11L6.77,674.00ZM4.45,677.34L3.39,678.28L3.65,678.77L4.61,677.53L4.45,677.34ZM2.74,679.01L0.07,679.60L1.12,683.88L3.11,680.20L2.74,679.01ZM196.94,70.33L197.34,70.55L197.45,69.69L196.94,70.33ZM197.92,73.06L197.84,72.01L197.22,71.42L196.93,71.61L197.92,73.06ZM211.44,88.67L211.69,88.60L211.80,87.13L211.56,87.43L211.44,88.67ZM208.26,99.43L211.79,100.89L210.18,93.47L208.22,96.04L203.97,93.28L202.44,96.63L204.53,94.97L204.76,97.09L207.51,96.21L208.26,99.43ZM204.28,98.95L204.68,99.07L204.86,98.36L204.18,98.58L204.28,98.95ZM210.87,101.55L210.43,100.94L209.04,102.00L209.01,102.46L210.87,101.55ZM190.26,103.23L190.27,102.56L190.02,102.28L189.49,102.96L190.26,103.23ZM207.63,103.47L207.19,102.72L206.99,102.69L207.08,103.51L207.63,103.47ZM203.20,98.42L201.47,97.40L200.33,98.59L200.48,96.88L197.11,97.23L199.01,98.16L199.03,100.11L201.64,100.81L202.32,107.72L200.78,106.36L200.08,101.08L197.30,101.31L196.56,104.83L195.24,104.57L195.83,102.50L194.13,102.87L196.26,100.99L195.25,99.76L192.43,103.23L190.89,102.70L189.85,104.57L189.01,103.20L187.82,104.69L189.06,96.53L184.26,94.69L182.30,99.27L182.94,110.12L179.96,116.20L181.25,118.87L178.76,122.83L179.23,131.05L176.18,142.38L177.15,148.45L175.99,151.91L179.58,148.24L183.88,151.91L186.14,149.63L186.17,156.95L187.74,153.56L189.40,154.24L189.60,149.72L191.87,152.38L193.10,149.84L194.74,150.49L196.44,148.77L194.66,146.54L195.66,145.65L200.63,145.27L198.88,141.67L201.16,141.61L200.86,136.63L203.65,137.38L203.87,134.66L202.08,133.76L203.93,131.16L201.38,130.45L202.12,127.77L204.23,129.33L205.30,125.32L203.91,122.67L206.57,123.55L210.01,121.21L207.77,117.03L209.58,113.65L208.20,112.31L209.96,112.16L211.05,108.67L212.20,109.69L215.84,108.30L215.74,107.76L214.83,106.37L215.22,105.02L214.97,103.71L212.89,102.73L212.43,104.41L211.08,103.05L208.11,103.49L207.71,106.52L206.31,105.34L205.26,108.00L204.66,103.46L206.64,100.63L204.84,100.16L203.98,101.53L203.20,98.42ZM192.16,153.91L192.49,153.43L191.75,152.77L191.36,153.09L192.16,153.91ZM155.27,361.41L155.94,364.21L157.79,362.84L161.77,366.98L168.11,366.94L168.15,363.87L173.78,361.41L170.89,360.28L170.01,354.72L167.85,353.55L165.96,356.80L160.21,357.22L155.27,361.41ZM156.43,367.18L155.88,365.42L153.98,366.36L154.57,363.46L152.83,364.88L155.09,368.10L156.43,367.18ZM170.46,373.47L169.08,372.24L168.13,373.56L169.07,374.28L170.46,373.47ZM154.65,372.19L153.56,372.72L155.21,374.69L156.30,373.60L154.65,372.19ZM145.39,375.96L143.83,376.17L143.03,379.07L145.47,379.12L145.39,375.96ZM153.61,383.02L154.04,380.54L159.37,382.76L160.54,381.15L157.80,380.04L157.45,377.18L160.88,377.53L161.28,375.39L155.07,377.39L152.01,376.25L152.51,374.23L150.15,374.51L149.59,377.95L148.58,376.46L146.73,380.15L150.36,380.31L150.98,383.58L153.61,383.02ZM147.01,381.75L146.28,382.20L146.44,382.71L147.08,382.23L147.01,381.75ZM164.95,377.97L166.94,381.92L166.92,388.62L168.73,389.63L168.43,382.96L171.04,381.16L166.60,375.81L164.95,377.97ZM145.33,384.41L144.97,383.05L144.14,383.20L143.43,384.22L145.33,384.41ZM152.82,383.19L151.68,384.52L152.04,385.15L153.12,384.38L152.82,383.19ZM147.66,385.69L147.71,386.36L148.93,386.09L148.48,385.69L147.66,385.69ZM146.02,387.14L145.54,385.42L144.24,386.46L144.23,388.01L146.02,387.14ZM169.29,395.01L169.02,395.06L168.88,396.45L169.28,396.21L169.29,395.01ZM174.52,420.92L174.58,421.22L175.07,421.44L175.24,421.12L174.52,420.92ZM179.88,424.53L179.53,423.77L178.79,424.07L178.41,424.60L179.88,424.53ZM182.29,427.55L182.21,424.99L180.75,424.54L177.60,425.85L178.02,427.25L182.29,427.55ZM147.16,425.81L143.72,426.05L141.37,428.84L145.77,427.56L147.16,425.81ZM193.23,423.72L187.97,429.05L191.71,430.52L190.45,432.38L195.06,429.16L196.17,424.58L193.68,426.21L193.23,423.72ZM156.42,415.17L158.45,418.64L157.62,422.10L159.27,423.13L155.36,424.71L154.64,418.53L151.09,419.38L151.96,419.95L149.39,422.59L149.15,428.70L151.01,430.67L149.30,431.46L149.67,432.88L153.10,434.34L151.54,434.86L151.33,438.23L150.73,435.96L148.94,435.45L146.34,439.32L145.43,436.25L144.43,435.43L143.84,437.64L142.78,435.61L139.84,437.96L141.06,443.20L138.57,443.79L141.80,444.56L143.32,442.32L143.30,445.38L145.27,446.60L147.92,443.32L149.07,446.76L148.46,447.87L146.86,447.04L146.08,449.92L148.42,448.24L151.23,449.34L151.92,452.39L153.89,452.43L153.38,455.62L152.90,453.02L151.59,454.40L149.34,452.42L148.71,454.80L149.59,456.54L152.47,457.02L152.94,459.31L149.63,458.28L151.55,460.03L148.99,459.87L149.01,461.31L150.45,462.66L151.10,469.96L151.05,473.82L149.59,474.23L153.03,475.75L155.12,471.90L152.52,467.93L154.47,464.13L160.53,466.06L161.77,464.73L160.51,459.17L158.52,459.29L159.90,456.86L157.70,455.78L158.44,453.71L160.37,453.74L159.50,452.42L160.78,449.87L158.77,448.62L163.72,448.01L164.17,444.34L162.06,441.56L162.21,439.06L165.63,445.03L168.33,443.39L170.07,445.37L172.09,440.61L179.33,436.73L179.61,434.95L177.63,430.35L179.54,429.09L175.58,427.51L174.18,429.52L169.14,429.38L166.10,433.52L165.62,432.17L163.63,434.28L162.10,433.34L161.23,434.52L160.60,433.02L159.27,433.94L160.89,429.74L159.48,425.09L161.36,422.59L159.86,419.86L162.81,417.25L161.71,415.48L164.27,414.04L166.18,402.71L162.41,398.18L165.51,390.19L164.51,388.25L160.51,399.02L162.67,401.40L161.31,403.29L163.72,404.02L163.39,407.34L158.65,410.59L157.97,414.74L156.42,415.17ZM145.65,431.19L144.91,433.25L145.82,435.74L146.13,431.98L145.65,431.19ZM165.05,449.07L164.78,448.73L164.20,449.01L164.60,449.43L165.05,449.07ZM180.91,448.51L179.77,450.06L180.32,450.46L182.37,449.44L180.91,448.51ZM150.43,450.65L150.14,450.03L149.87,450.59L150.43,450.65ZM149.52,457.86L148.75,456.54L148.51,456.69L148.71,458.10L149.52,457.86ZM147.74,459.03L146.69,461.52L147.92,462.76L148.20,462.59L147.74,459.03ZM149.16,462.23L149.19,463.54L150.46,463.69L149.46,462.32L149.16,462.23ZM147.75,462.91L147.12,462.50L147.07,463.01L147.55,464.80L147.75,462.91ZM150.20,464.05L149.30,463.73L149.85,464.34L150.20,464.05ZM148.45,466.33L148.67,468.92L149.05,468.92L149.26,467.37L148.45,466.33ZM232.96,0.50L232.97,1.10L233.70,0.35L233.32,0.00L232.96,0.50ZM242.94,7.09L243.54,6.34L242.89,6.22L242.57,6.36L242.94,7.09ZM244.47,19.78L244.88,19.43L244.55,19.15L244.16,19.47L244.47,19.78ZM216.05,97.84L213.73,96.60L211.60,97.89L211.82,100.36L212.83,98.56L212.26,100.91L214.45,102.51L215.28,100.74L216.61,100.56L215.01,102.33L215.76,103.71L219.75,99.62L218.64,97.74L221.53,99.37L218.59,92.93L222.73,93.85L222.69,94.95L224.36,93.40L224.31,93.25L223.54,92.51L223.77,91.78L223.45,90.91L222.52,91.91L218.44,91.26L222.46,90.49L224.49,87.57L222.82,86.15L223.52,84.96L220.66,84.92L222.19,84.20L220.63,80.35L224.00,81.56L225.18,74.48L223.67,77.23L222.43,76.55L223.12,78.12L220.79,77.87L215.56,80.91L221.31,74.09L220.54,70.87L218.52,72.72L218.57,69.30L222.68,70.88L219.60,63.69L222.96,63.05L225.25,57.95L236.74,46.28L235.47,44.88L238.83,42.98L238.49,39.11L241.20,38.98L241.17,30.34L242.86,28.53L240.89,25.29L236.87,25.44L236.30,23.45L234.08,24.08L233.06,22.68L233.90,21.08L234.08,22.61L238.12,24.05L235.84,21.36L235.98,19.22L238.99,23.71L242.84,22.71L241.10,20.18L243.48,20.00L245.25,16.38L243.14,16.77L240.67,13.20L243.45,13.66L246.70,10.31L244.15,10.39L245.79,6.23L241.81,8.61L241.15,5.33L242.96,4.15L236.17,2.65L236.53,0.40L232.61,4.25L229.85,3.11L229.06,6.43L232.02,6.57L232.74,8.48L227.67,7.47L224.94,13.89L222.45,14.70L223.67,17.31L220.40,15.36L218.48,17.49L215.77,14.59L212.09,17.58L211.72,14.66L208.70,15.39L205.82,29.90L201.45,36.53L203.47,38.21L205.44,35.29L207.91,37.83L207.45,39.80L210.44,39.46L210.82,43.99L212.66,42.74L213.79,43.99L210.74,45.30L208.50,43.20L207.45,47.99L206.30,45.81L203.00,55.78L198.94,60.07L199.80,64.12L201.95,65.10L206.41,61.44L207.05,64.81L204.41,64.01L204.86,65.25L202.92,66.13L203.41,69.20L201.45,66.50L198.97,67.23L200.12,69.44L198.22,70.92L201.20,73.24L198.47,74.05L197.63,81.08L199.59,81.64L199.14,83.77L194.14,86.16L194.19,88.62L191.37,85.86L188.98,86.87L191.72,89.74L198.44,88.30L200.26,91.34L201.68,90.23L201.94,92.75L201.87,88.65L203.67,88.87L200.13,85.96L202.14,86.00L202.86,84.37L201.28,83.08L201.35,80.59L203.37,83.63L206.45,80.98L207.34,81.53L204.14,85.59L206.88,88.41L204.45,90.13L204.92,92.22L206.76,91.23L206.10,93.34L208.90,88.98L210.02,89.81L209.12,87.33L210.64,87.58L208.83,85.14L210.55,85.79L212.69,82.37L211.72,86.69L214.72,83.21L215.05,86.58L213.33,87.91L214.76,89.82L214.82,89.81L214.77,89.83L215.69,91.07L214.51,91.94L215.92,91.28L216.48,93.20L213.76,93.38L215.21,93.98L214.21,95.65L216.05,97.84ZM228.32,89.11L228.55,86.71L226.37,87.70L227.16,89.85L228.32,89.11ZM213.42,90.10L213.28,91.18L213.50,90.40L214.77,89.83L214.76,89.82L213.42,90.10ZM225.10,87.56L223.77,91.78L224.31,93.25L225.15,94.07L227.52,93.02L225.10,87.56ZM224.49,98.41L224.89,96.71L223.38,97.45L224.82,99.62L228.76,98.30L224.49,98.41ZM215.74,107.76L217.20,110.00L224.42,103.43L222.52,101.75L220.25,101.99L220.93,104.67L219.35,101.95L215.40,104.40L215.22,105.02L215.74,107.76ZM259.73,277.17L259.04,275.99L258.10,277.37L258.54,277.69L259.73,277.17ZM258.87,310.14L263.40,308.51L265.13,304.89L261.18,303.49L261.15,306.22L258.79,306.51L259.34,301.10L253.20,303.96L246.94,310.68L251.23,310.94L250.19,308.63L253.14,307.65L254.70,310.17L258.78,311.51L258.87,310.14ZM248.85,322.89L256.59,318.50L253.81,315.29L252.46,318.25L248.74,320.10L248.85,322.89ZM254.63,322.72L254.37,322.42L254.49,323.57L254.78,323.65L254.63,322.72ZM231.86,323.40L233.81,320.87L233.28,318.73L230.29,320.94L230.51,326.82L225.33,338.88L229.11,341.28L233.39,340.32L232.30,334.35L233.75,329.87L231.86,323.40ZM251.06,356.45L251.06,355.99L250.22,356.40L251.06,356.45ZM258.37,333.81L255.90,335.35L252.56,333.95L254.08,336.75L252.10,340.58L250.25,339.53L251.98,335.01L249.61,333.64L246.80,340.23L233.85,342.25L235.07,347.82L232.84,350.49L235.97,356.17L231.24,356.46L230.51,358.19L231.70,358.62L227.37,359.64L226.71,362.80L228.46,364.03L227.09,365.50L228.13,366.95L230.71,367.05L231.69,369.93L233.54,369.76L232.27,370.64L230.18,369.85L231.04,372.65L227.67,369.17L225.76,369.20L222.06,372.37L221.70,377.25L224.41,380.02L227.41,380.37L225.58,384.34L223.84,382.64L220.11,383.13L219.73,381.48L218.80,382.47L217.96,378.53L215.79,378.20L217.11,381.25L215.08,383.81L219.51,386.98L233.16,381.54L237.13,377.66L237.00,375.93L239.47,375.79L244.67,366.39L247.54,364.36L248.25,361.31L244.16,358.05L249.41,357.21L248.65,353.41L252.38,353.47L254.04,351.51L250.23,346.45L251.78,347.48L256.85,346.15L257.10,341.83L261.90,339.43L259.78,336.33L258.63,336.74L260.73,333.49L258.86,331.37L260.50,330.98L258.94,326.56L254.20,328.66L252.47,327.26L251.52,328.70L253.16,330.48L251.15,331.10L252.00,332.28L256.85,331.52L258.37,333.81ZM250.49,358.63L249.91,358.12L250.18,358.87L250.49,358.63ZM262.46,360.59L261.85,359.99L261.43,360.28L261.49,361.43L262.46,360.59ZM261.36,363.27L260.81,361.80L260.30,362.42L260.83,363.42L261.36,363.27ZM261.02,363.83L260.49,363.32L259.99,363.77L261.02,363.83ZM260.59,366.60L261.17,365.64L260.88,365.54L260.08,366.28L260.59,366.60ZM213.21,366.74L213.31,366.04L212.16,366.95L213.21,366.74ZM213.42,369.90L213.76,369.60L213.23,369.27L213.42,369.90ZM260.40,370.91L259.45,370.80L259.53,372.02L260.57,372.32L260.40,370.91ZM259.49,372.11L259.13,372.21L258.48,372.16L259.67,372.58L259.49,372.11ZM258.30,373.56L257.97,372.79L257.40,372.20L257.54,373.30L258.30,373.56ZM261.86,375.54L261.33,374.91L261.28,375.92L261.68,376.01L261.86,375.54ZM215.78,376.08L214.81,376.47L214.87,376.92L215.88,376.36L215.78,376.08ZM213.16,380.61L213.59,381.15L213.98,380.30L213.16,380.61ZM212.80,381.76L211.92,383.08L212.59,383.44L213.44,382.19L212.80,381.76ZM214.18,383.55L213.54,383.04L214.67,384.83L214.78,383.70L214.18,383.55ZM252.35,387.56L252.54,386.56L251.69,385.93L251.39,386.54L252.35,387.56ZM255.00,396.62L255.77,394.93L257.95,395.27L256.66,391.40L250.49,394.22L248.06,394.25L255.00,396.62ZM262.25,413.62L262.32,413.25L261.62,413.14L261.48,413.50L262.25,413.62ZM233.81,425.61L234.20,425.10L233.04,424.06L232.58,424.89L233.81,425.61ZM214.17,430.09L217.80,428.67L215.86,424.27L213.64,425.57L214.17,430.09ZM256.28,427.50L255.64,426.96L255.05,426.96L254.91,427.40L256.28,427.50ZM258.63,429.41L258.65,427.79L256.88,427.45L256.49,428.82L258.63,429.41ZM259.18,462.21L260.02,463.17L260.76,462.97L260.77,462.52L259.18,462.21ZM285.94,210.57L284.40,211.08L284.71,211.87L285.84,212.13L285.94,210.57ZM290.85,211.94L290.31,211.07L289.77,211.12L289.02,211.54L290.85,211.94ZM287.06,210.50L286.41,212.01L287.82,212.96L288.10,210.71L287.06,210.50ZM284.85,229.14L281.83,225.00L279.27,226.63L282.99,228.36L279.47,228.36L281.63,230.79L280.57,233.17L281.52,234.48L285.39,234.10L284.48,235.02L286.88,238.53L279.24,234.95L277.86,236.13L280.24,237.86L278.76,240.16L280.30,243.48L284.13,238.96L286.55,241.93L285.04,246.40L287.70,248.15L289.09,246.74L287.71,249.32L293.39,252.44L297.41,243.63L306.87,243.36L308.54,242.87L308.84,239.68L310.55,240.01L310.69,237.49L306.17,235.07L304.15,236.58L302.61,233.68L305.61,231.84L310.59,233.55L311.28,231.89L300.44,226.68L303.74,225.61L303.92,219.79L305.67,217.74L304.66,216.68L295.24,215.65L290.95,212.39L289.10,213.94L290.54,214.33L287.02,214.68L283.93,218.79L284.44,223.86L287.51,226.52L285.17,227.11L284.85,229.14ZM277.89,243.82L276.49,242.10L274.66,242.98L275.16,245.21L277.89,243.82ZM274.80,245.82L274.08,246.49L275.28,247.78L276.58,246.45L274.80,245.82ZM278.96,245.80L278.09,247.26L278.75,248.99L280.16,247.17L278.96,245.80ZM296.10,314.74L294.11,312.92L293.01,313.85L295.59,315.89L296.10,314.74ZM292.24,322.90L292.10,323.70L292.35,324.00L292.83,323.70L292.24,322.90ZM287.29,323.15L285.67,326.29L286.84,327.45L287.94,325.67L287.29,323.15ZM262.59,342.53L263.54,345.98L260.85,345.76L260.53,347.85L263.38,351.91L265.01,351.24L265.92,352.88L270.44,350.35L273.00,351.54L270.18,351.09L266.60,356.25L265.59,355.65L266.32,361.23L263.97,362.55L264.16,359.16L262.73,360.76L263.14,363.23L259.24,368.87L261.49,367.85L261.52,371.79L258.50,374.83L264.28,374.94L267.71,377.06L269.27,374.39L271.47,373.03L271.79,373.15L268.79,377.46L271.60,378.50L272.99,376.19L272.63,380.55L274.25,381.82L276.97,379.19L276.60,373.05L279.29,377.29L278.02,379.72L280.72,381.27L279.52,381.38L280.46,383.26L277.85,384.44L276.30,387.43L279.48,385.87L281.83,386.50L281.98,388.12L283.81,388.00L283.87,387.72L284.12,387.98L284.89,387.93L285.53,391.75L289.69,393.98L289.32,395.31L286.64,394.90L285.65,397.82L282.90,398.40L280.84,396.45L282.88,404.09L284.32,399.46L285.66,400.91L292.36,400.51L290.05,398.44L292.28,397.44L289.81,389.30L292.17,387.96L293.14,389.14L293.68,387.67L296.39,390.30L294.53,390.81L294.80,392.82L296.24,392.08L294.46,393.76L295.60,397.75L297.55,397.92L296.87,395.18L297.89,394.40L298.94,396.39L301.14,393.09L302.89,394.30L304.58,392.55L310.14,394.75L310.16,395.12L310.54,396.30L310.41,398.90L310.59,401.60L308.85,403.68L312.54,410.62L311.42,410.86L312.14,412.50L315.61,414.23L315.00,413.03L316.38,412.52L319.46,414.62L315.72,416.01L317.08,416.11L316.23,420.37L318.03,419.89L319.86,415.37L321.08,417.39L323.10,413.86L327.86,413.37L331.30,415.28L333.73,419.66L337.95,421.21L342.60,425.76L343.33,431.89L341.85,435.90L338.87,437.43L339.27,448.05L344.34,453.42L343.52,455.88L348.05,457.13L346.74,461.43L354.96,468.81L351.30,469.39L350.96,470.79L350.76,469.62L349.32,470.14L348.88,467.48L345.18,468.12L345.23,465.97L343.00,464.22L339.13,465.00L339.40,463.34L335.46,463.18L332.20,459.74L331.56,462.68L330.75,461.96L328.70,459.18L328.80,463.55L326.45,464.53L326.19,468.69L323.93,467.77L322.66,464.57L321.71,471.72L315.16,464.07L311.39,463.83L310.81,462.01L309.18,462.34L309.35,458.68L310.27,457.38L310.85,457.50L310.26,458.65L312.00,459.77L313.42,456.27L312.53,452.77L309.83,452.60L310.33,454.49L309.00,454.51L307.96,452.78L308.27,451.12L309.97,451.11L308.21,450.07L307.86,444.37L311.12,441.08L310.30,446.19L311.58,444.76L311.10,449.16L313.51,450.42L315.39,442.80L312.91,439.13L316.58,435.88L311.65,427.58L307.52,427.65L303.76,424.05L301.17,428.72L303.71,429.66L302.58,430.81L301.23,429.40L298.49,432.51L296.97,429.70L298.73,428.59L296.77,427.48L297.21,425.23L303.30,417.18L300.67,414.40L298.67,414.98L297.84,417.83L295.81,417.68L297.72,413.29L296.41,410.61L294.38,411.29L292.26,407.40L291.47,408.96L285.20,404.59L284.29,406.12L285.54,407.75L281.83,410.18L284.75,409.92L281.76,411.66L284.87,413.35L281.97,414.20L281.34,419.48L278.73,419.98L279.04,425.21L281.89,429.24L279.78,430.03L279.77,432.90L279.62,432.80L278.63,432.43L278.67,432.12L277.77,431.48L275.74,432.72L274.20,441.20L276.77,443.03L275.74,447.48L277.14,448.19L276.73,449.85L277.89,446.58L279.82,446.90L283.32,455.85L285.76,459.83L285.18,463.03L286.91,466.70L290.21,469.50L290.66,471.95L293.97,471.45L294.24,474.21L297.25,477.87L298.47,478.11L299.87,474.29L306.02,475.20L304.54,480.51L306.59,480.54L309.54,485.09L311.68,485.57L310.81,489.91L312.08,489.49L313.01,491.34L312.99,489.74L314.62,490.47L312.39,493.90L314.66,495.38L316.62,493.12L317.79,493.95L318.18,496.74L315.72,499.89L317.30,500.55L319.82,498.41L321.18,499.94L323.56,494.69L325.40,492.63L326.49,492.68L324.08,499.55L322.51,499.78L320.61,503.58L321.63,505.14L318.55,505.65L319.41,507.75L315.72,506.25L316.97,506.10L317.13,502.98L315.22,503.42L313.77,506.78L309.59,507.00L312.14,510.53L315.63,508.63L315.04,516.48L312.41,517.73L307.18,529.21L302.34,531.82L301.66,534.35L301.00,532.07L297.67,535.03L298.25,537.70L303.64,534.43L307.60,536.58L306.98,534.67L312.39,532.50L319.52,524.88L319.83,519.67L321.34,520.62L325.51,519.19L331.97,514.38L335.85,506.68L335.61,501.90L338.29,502.95L339.07,499.25L339.98,500.68L342.02,498.47L341.50,496.99L344.91,494.57L342.92,490.19L345.29,488.62L351.57,490.14L352.26,491.50L353.96,489.43L359.70,490.19L372.06,481.24L380.79,482.93L385.02,480.86L392.49,481.23L394.15,482.61L395.55,484.77L393.56,489.06L398.21,491.04L399.11,495.26L396.75,500.54L391.08,504.33L390.85,506.96L388.44,506.50L388.02,508.68L384.83,510.22L381.40,508.20L382.67,510.49L381.77,516.19L381.91,519.88L385.35,521.21L387.12,524.20L388.77,523.34L390.26,524.83L391.65,528.33L389.93,532.11L392.93,531.98L396.52,529.76L394.30,527.20L397.78,529.09L400.84,528.80L403.98,527.08L405.13,523.48L408.80,522.94L411.02,518.23L409.63,516.90L418.46,517.24L425.59,512.52L427.61,512.93L430.67,507.40L428.14,502.97L433.95,495.57L434.90,482.66L427.12,465.96L422.51,463.06L417.76,459.39L410.04,461.87L406.34,460.85L395.95,467.75L391.46,462.25L386.92,454.92L389.59,451.20L394.16,451.17L394.50,448.14L397.37,447.39L397.63,440.08L386.21,438.92L385.01,436.68L383.94,437.45L382.20,437.53L372.77,435.87L370.46,432.68L366.62,432.63L363.32,428.57L360.19,426.43L360.06,424.45L357.40,425.16L354.44,423.10L353.43,418.37L350.63,415.27L349.50,415.12L341.92,411.53L339.89,407.34L337.60,406.80L338.21,402.97L340.83,401.26L343.78,401.90L344.85,397.21L341.07,387.97L335.28,388.77L334.09,389.80L330.28,390.28L329.84,388.95L326.97,388.01L322.46,384.97L318.95,385.69L315.10,383.15L312.90,376.45L314.73,369.42L311.09,365.85L309.49,364.83L306.68,361.63L303.70,356.66L302.65,356.41L306.42,345.85L309.86,343.23L309.01,336.11L306.41,336.02L305.26,340.41L299.76,337.25L291.26,342.42L288.62,341.26L289.40,338.69L287.23,338.65L287.24,340.39L285.29,340.77L283.29,337.57L285.10,332.42L286.98,332.13L284.23,329.14L280.56,336.19L279.06,335.70L278.45,337.81L275.53,336.21L275.70,338.46L274.20,338.63L271.90,335.66L266.98,336.80L268.19,333.62L262.28,335.08L263.81,338.31L262.59,342.53ZM264.92,352.85L264.36,352.50L264.42,353.05L264.92,352.85ZM263.09,359.93L262.98,359.26L262.54,359.79L263.09,359.93ZM264.34,377.00L263.93,375.91L263.58,376.43L263.68,377.35L264.34,377.00ZM267.19,378.13L265.02,377.27L265.02,378.58L267.33,378.62L267.19,378.13ZM269.27,378.64L268.62,377.53L267.94,377.62L267.86,378.67L269.27,378.64ZM265.66,379.53L265.34,378.95L264.85,378.88L265.16,379.63L265.66,379.53ZM268.80,380.54L268.67,379.31L267.85,379.90L267.77,380.57L268.80,380.54ZM271.61,381.43L270.98,379.79L270.49,381.85L271.42,381.96L271.61,381.43ZM271.21,383.20L271.73,382.25L271.40,382.05L270.83,382.26L271.21,383.20ZM267.22,387.88L266.91,384.26L265.58,383.87L265.96,381.73L267.57,382.98L266.69,380.80L264.66,381.16L264.31,382.95L266.61,386.48L265.07,389.15L267.22,387.88ZM283.75,388.32L284.71,388.61L284.12,387.98L283.81,388.00L283.75,388.32ZM279.64,388.70L279.40,389.23L279.87,389.31L279.64,388.70ZM277.02,389.09L276.79,388.52L276.54,388.63L276.80,389.84L277.02,389.09ZM283.84,390.29L283.31,389.96L283.43,391.34L284.26,391.87L283.84,390.29ZM285.88,394.06L284.69,393.53L284.69,395.10L285.63,395.25L285.88,394.06ZM277.38,413.75L277.39,414.33L278.15,413.88L277.80,413.62L277.38,413.75ZM276.87,414.38L270.53,413.14L270.19,415.83L266.90,417.84L265.91,420.58L265.98,422.56L268.31,423.64L269.11,422.40L270.10,423.62L271.42,420.96L273.98,421.24L274.99,418.83L273.97,418.16L276.03,416.77L275.20,414.89L276.87,414.38ZM276.86,420.68L276.65,418.27L274.69,420.96L274.94,422.63L276.86,420.68ZM259.48,427.34L259.33,429.36L266.59,424.06L260.50,421.90L260.53,424.57L262.33,425.27L260.16,427.04L261.22,427.60L259.48,427.34ZM278.67,432.12L279.62,432.80L279.69,432.82L279.10,429.39L279.40,427.15L278.67,432.12ZM299.23,431.02L299.93,430.59L299.85,430.42L299.83,430.44L299.78,430.27L299.44,429.53L298.58,430.67L299.23,431.02ZM271.40,443.93L269.74,444.95L268.34,442.71L267.78,447.68L269.77,450.13L272.19,450.37L274.10,448.09L273.76,445.33L271.40,443.93ZM269.11,456.93L267.05,458.46L266.73,459.60L269.10,459.42L269.11,456.93ZM297.82,523.55L298.20,523.59L298.41,522.71L297.82,523.55ZM307.26,233.11L306.50,232.96L306.32,233.47L306.62,233.88L307.26,233.11ZM302.63,244.26L301.85,244.96L302.41,246.06L303.15,245.44L302.63,244.26ZM300.26,323.53L302.13,324.85L303.61,320.51L309.16,322.66L309.98,321.36L304.78,318.08L305.28,313.78L301.79,311.24L301.34,316.48L298.43,319.47L299.73,321.43L294.06,324.26L296.73,327.36L299.71,327.05L300.26,323.53ZM306.62,328.61L306.05,329.56L307.27,330.68L308.15,329.84L306.62,328.61ZM319.02,338.38L320.51,337.33L319.30,336.18L322.29,336.49L324.23,334.34L320.02,332.19L319.43,333.99L317.59,331.11L318.58,327.93L310.78,325.28L310.87,326.19L314.19,328.29L313.05,330.62L314.55,337.36L312.19,338.47L313.99,341.96L315.65,338.29L319.02,338.38ZM301.36,396.53L301.87,396.25L301.34,395.67L301.02,396.39L301.36,396.53ZM299.39,399.00L301.31,403.91L296.21,404.39L298.48,409.75L300.38,409.99L298.48,411.63L298.88,413.68L302.47,413.59L301.69,415.47L304.50,416.96L303.86,414.85L307.32,414.16L302.40,409.32L302.50,407.38L304.61,404.29L304.36,410.06L310.01,408.77L308.54,403.37L310.31,401.00L310.41,398.90L310.16,395.12L310.11,394.95L304.64,393.48L302.43,396.52L305.84,397.78L302.61,397.29L303.05,400.94L301.72,400.84L301.11,398.34L299.39,399.00ZM308.17,411.11L307.33,410.23L306.75,411.70L308.25,412.90L308.17,411.11ZM301.49,422.20L301.80,422.28L301.94,421.46L301.49,422.20ZM300.08,429.48L300.47,429.37L300.08,428.48L299.64,428.88L300.08,429.48ZM299.78,430.27L299.85,430.42L300.38,430.05L300.19,429.72L299.69,429.94L299.78,430.27ZM315.00,431.03L315.51,431.62L315.78,430.66L315.20,430.46L315.00,431.03ZM314.85,439.65L314.09,438.67L313.72,438.88L314.27,439.90L314.85,439.65ZM338.34,451.42L333.21,447.41L334.58,451.42L337.89,453.41L338.34,451.42ZM312.00,450.60L311.42,450.98L312.94,451.46L313.22,450.55L312.00,450.60ZM341.83,453.65L341.34,454.03L341.60,454.74L342.08,453.84L341.83,453.65ZM311.60,460.48L311.94,460.05L310.69,459.59L311.60,460.48ZM338.71,461.32L338.21,461.85L339.06,462.28L339.01,461.64L338.71,461.32ZM312.54,461.39L312.48,462.57L313.62,463.19L314.23,462.56L312.54,461.39ZM316.16,462.91L316.47,463.38L316.90,462.46L316.16,462.91ZM302.94,482.36L303.18,481.66L302.43,481.89L302.49,482.33L302.94,482.36ZM362.55,489.99L363.01,490.08L362.76,489.00L362.29,489.07L362.55,489.99ZM349.48,491.77L350.07,489.91L346.81,489.38L347.84,492.64L351.90,492.34L349.48,491.77ZM303.15,501.17L303.91,503.37L307.03,504.24L306.12,502.58L303.15,501.17ZM307.33,504.37L305.38,504.86L307.11,507.45L308.37,506.82L307.33,504.37ZM301.02,513.28L299.96,514.62L301.72,517.54L302.81,514.09L301.02,513.28ZM308.56,537.51L306.16,538.83L306.15,542.93L309.53,540.95L308.56,537.51Z", regionD: "M258.54,277.69L259.73,277.17L259.04,275.99L258.10,277.37L258.54,277.69ZM258.78,311.51L258.87,310.14L263.40,308.51L265.13,304.89L261.18,303.49L261.15,306.22L258.79,306.51L259.34,301.10L253.20,303.96L246.94,310.68L251.23,310.94L250.19,308.63L253.14,307.65L254.70,310.17L258.78,311.51ZM248.74,320.10L248.85,322.89L256.59,318.50L253.81,315.29L252.46,318.25L248.74,320.10ZM254.78,323.65L254.63,322.72L254.37,322.42L254.49,323.57L254.78,323.65ZM233.75,329.87L231.86,323.40L233.81,320.87L233.28,318.73L230.29,320.94L230.51,326.82L225.33,338.88L229.11,341.28L233.39,340.32L232.30,334.35L233.75,329.87ZM250.22,356.40L251.06,356.45L251.06,355.99L250.22,356.40ZM252.00,332.28L256.85,331.52L258.37,333.81L255.90,335.35L252.56,333.95L254.08,336.75L252.10,340.58L250.25,339.53L251.98,335.01L249.61,333.64L246.80,340.23L233.85,342.25L235.07,347.82L232.84,350.49L235.97,356.17L231.24,356.46L230.51,358.19L231.70,358.62L227.37,359.64L226.71,362.80L228.46,364.03L227.09,365.50L228.13,366.95L230.71,367.05L231.69,369.93L233.54,369.76L232.27,370.64L230.18,369.85L231.04,372.65L227.67,369.17L225.76,369.20L222.06,372.37L221.70,377.25L224.41,380.02L227.41,380.37L225.58,384.34L223.84,382.64L220.11,383.13L219.73,381.48L218.80,382.47L217.96,378.53L215.79,378.20L217.11,381.25L215.08,383.81L219.51,386.98L233.16,381.54L237.13,377.66L237.00,375.93L239.47,375.79L244.67,366.39L247.54,364.36L248.25,361.31L244.16,358.05L249.41,357.21L248.65,353.41L252.38,353.47L254.04,351.51L250.23,346.45L251.78,347.48L256.85,346.15L257.10,341.83L261.90,339.43L259.78,336.33L258.63,336.74L260.73,333.49L258.86,331.37L260.50,330.98L258.94,326.56L254.20,328.66L252.47,327.26L251.52,328.70L253.16,330.48L251.15,331.10L252.00,332.28ZM250.18,358.87L250.49,358.63L249.91,358.12L250.18,358.87ZM160.21,357.22L155.27,361.41L155.94,364.21L157.79,362.84L161.77,366.98L168.11,366.94L168.15,363.87L173.78,361.41L170.89,360.28L170.01,354.72L167.85,353.55L165.96,356.80L160.21,357.22ZM152.83,364.88L155.09,368.10L156.43,367.18L155.88,365.42L153.98,366.36L154.57,363.46L152.83,364.88ZM212.16,366.95L213.21,366.74L213.31,366.04L212.16,366.95ZM213.42,369.90L213.76,369.60L213.23,369.27L213.42,369.90ZM258.48,372.16L259.67,372.58L259.49,372.11L259.13,372.21L258.48,372.16ZM258.30,373.56L257.97,372.79L257.40,372.20L257.54,373.30L258.30,373.56ZM215.88,376.36L215.78,376.08L214.81,376.47L214.87,376.92L215.88,376.36ZM213.98,380.30L213.16,380.61L213.59,381.15L213.98,380.30ZM213.44,382.19L212.80,381.76L211.92,383.08L212.59,383.44L213.44,382.19ZM214.78,383.70L214.18,383.55L213.54,383.04L214.67,384.83L214.78,383.70ZM251.39,386.54L252.35,387.56L252.54,386.56L251.69,385.93L251.39,386.54ZM248.06,394.25L255.00,396.62L255.77,394.93L257.95,395.27L256.66,391.40L250.49,394.22L248.06,394.25ZM233.81,425.61L234.20,425.10L233.04,424.06L232.58,424.89L233.81,425.61ZM213.64,425.57L214.17,430.09L217.80,428.67L215.86,424.27L213.64,425.57ZM254.91,427.40L256.28,427.50L255.64,426.96L255.05,426.96L254.91,427.40ZM193.23,423.72L187.97,429.05L191.71,430.52L190.45,432.38L195.06,429.16L196.17,424.58L193.68,426.21L193.23,423.72ZM258.63,429.41L258.65,427.79L256.88,427.45L256.49,428.82L258.63,429.41ZM260.76,462.97L260.77,462.52L259.18,462.21L260.02,463.17L260.76,462.97ZM263.81,338.31L262.59,342.53L263.54,345.98L260.85,345.76L260.53,347.85L263.38,351.91L265.01,351.24L265.92,352.88L270.44,350.35L273.00,351.54L270.18,351.09L266.60,356.25L265.59,355.65L266.32,361.23L263.97,362.55L264.16,359.16L262.73,360.76L263.14,363.23L259.24,368.87L261.49,367.85L261.52,371.79L258.50,374.83L264.28,374.94L267.71,377.06L269.27,374.39L271.47,373.03L271.79,373.15L268.79,377.46L271.60,378.50L272.99,376.19L272.63,380.55L274.25,381.82L276.97,379.19L276.60,373.05L279.29,377.29L278.02,379.72L280.72,381.27L279.52,381.38L280.46,383.26L277.85,384.44L276.30,387.43L279.48,385.87L281.83,386.50L281.98,388.12L283.81,388.00L283.87,387.72L284.12,387.98L284.89,387.93L285.53,391.75L289.69,393.98L289.32,395.31L286.64,394.90L285.65,397.82L282.90,398.40L280.84,396.45L282.88,404.09L284.32,399.46L285.66,400.91L292.36,400.51L290.05,398.44L292.28,397.44L289.81,389.30L292.17,387.96L293.14,389.14L293.68,387.67L296.39,390.30L294.53,390.81L294.80,392.82L296.24,392.08L294.46,393.76L295.60,397.75L297.55,397.92L296.87,395.18L297.89,394.40L298.94,396.39L301.14,393.09L302.89,394.30L304.58,392.55L310.14,394.75L310.16,395.12L310.54,396.30L310.41,398.90L310.59,401.60L308.85,403.68L312.54,410.62L311.42,410.86L312.14,412.50L315.61,414.23L315.00,413.03L316.38,412.52L319.46,414.62L315.72,416.01L317.08,416.11L316.23,420.37L318.03,419.89L319.86,415.37L321.08,417.39L323.10,413.86L327.86,413.37L331.30,415.28L333.73,419.66L337.95,421.21L342.60,425.76L343.33,431.89L341.85,435.90L338.87,437.43L339.27,448.05L344.34,453.42L343.52,455.88L348.05,457.13L346.74,461.43L354.96,468.81L351.30,469.39L350.96,470.79L350.76,469.62L349.32,470.14L348.88,467.48L345.18,468.12L345.23,465.97L343.00,464.22L339.13,465.00L339.40,463.34L335.46,463.18L332.20,459.74L331.56,462.68L330.75,461.96L328.70,459.18L328.80,463.55L326.45,464.53L326.19,468.69L323.93,467.77L322.66,464.57L321.71,471.72L315.16,464.07L311.39,463.83L310.81,462.01L309.18,462.34L309.35,458.68L310.27,457.38L310.85,457.50L310.26,458.65L312.00,459.77L313.42,456.27L312.53,452.77L309.83,452.60L310.33,454.49L309.00,454.51L307.96,452.78L308.27,451.12L309.97,451.11L308.21,450.07L307.86,444.37L311.12,441.08L310.30,446.19L311.58,444.76L311.10,449.16L313.51,450.42L315.39,442.80L312.91,439.13L316.58,435.88L311.65,427.58L307.52,427.65L303.76,424.05L301.17,428.72L303.71,429.66L302.58,430.81L301.23,429.40L298.49,432.51L296.97,429.70L298.73,428.59L296.77,427.48L297.21,425.23L303.30,417.18L300.67,414.40L298.67,414.98L297.84,417.83L295.81,417.68L297.72,413.29L296.41,410.61L294.38,411.29L292.26,407.40L291.47,408.96L285.20,404.59L284.29,406.12L285.54,407.75L281.83,410.18L284.75,409.92L281.76,411.66L284.87,413.35L281.97,414.20L281.34,419.48L278.73,419.98L279.04,425.21L281.89,429.24L279.78,430.03L279.77,432.90L279.62,432.80L278.63,432.43L278.67,432.12L277.77,431.48L275.74,432.72L274.20,441.20L276.77,443.03L275.74,447.48L277.14,448.19L276.73,449.85L277.89,446.58L279.82,446.90L283.32,455.85L285.76,459.83L285.18,463.03L286.91,466.70L290.21,469.50L290.66,471.95L293.97,471.45L294.24,474.21L297.25,477.87L298.47,478.11L299.87,474.29L306.02,475.20L304.54,480.51L306.59,480.54L309.54,485.09L311.68,485.57L310.81,489.91L312.08,489.49L313.01,491.34L312.99,489.74L314.62,490.47L312.39,493.90L314.66,495.38L316.62,493.12L317.79,493.95L318.18,496.74L315.72,499.89L317.30,500.55L319.82,498.41L321.18,499.94L323.56,494.69L325.40,492.63L326.49,492.68L324.08,499.55L322.51,499.78L320.61,503.58L321.63,505.14L318.55,505.65L319.41,507.75L315.72,506.25L316.97,506.10L317.13,502.98L315.22,503.42L313.77,506.78L309.59,507.00L312.14,510.53L315.63,508.63L315.04,516.48L312.41,517.73L307.18,529.21L302.34,531.82L301.66,534.35L301.00,532.07L297.67,535.03L298.25,537.70L303.64,534.43L307.60,536.58L306.98,534.67L312.39,532.50L319.52,524.88L319.83,519.67L321.34,520.62L325.51,519.19L331.97,514.38L335.85,506.68L335.61,501.90L338.29,502.95L339.07,499.25L339.98,500.68L342.02,498.47L341.50,496.99L344.91,494.57L342.92,490.19L345.29,488.62L351.57,490.14L352.26,491.50L353.96,489.43L359.70,490.19L372.06,481.24L380.79,482.93L385.02,480.86L392.49,481.23L394.15,482.61L395.55,484.77L393.56,489.06L398.21,491.04L399.11,495.26L396.75,500.54L391.08,504.33L390.85,506.96L388.44,506.50L388.02,508.68L384.83,510.22L381.40,508.20L382.67,510.49L381.77,516.19L381.91,519.88L385.35,521.21L387.12,524.20L388.77,523.34L390.26,524.83L391.65,528.33L389.93,532.11L392.93,531.98L396.52,529.76L394.30,527.20L397.78,529.09L400.84,528.80L403.98,527.08L405.13,523.48L408.80,522.94L411.02,518.23L409.63,516.90L418.46,517.24L425.59,512.52L427.61,512.93L430.67,507.40L428.14,502.97L433.95,495.57L434.90,482.66L427.12,465.96L422.51,463.06L417.76,459.39L410.04,461.87L406.34,460.85L395.95,467.75L391.46,462.25L386.92,454.92L389.59,451.20L394.16,451.17L394.50,448.14L397.37,447.39L397.63,440.08L386.21,438.92L385.01,436.68L383.94,437.45L382.20,437.53L372.77,435.87L370.46,432.68L366.62,432.63L363.32,428.57L360.19,426.43L360.06,424.45L357.40,425.16L354.44,423.10L353.43,418.37L350.63,415.27L349.50,415.12L341.92,411.53L339.89,407.34L337.60,406.80L338.21,402.97L340.83,401.26L343.78,401.90L344.85,397.21L341.07,387.97L335.28,388.77L334.09,389.80L330.28,390.28L329.84,388.95L326.97,388.01L322.46,384.97L318.95,385.69L315.10,383.15L312.90,376.45L314.73,369.42L311.09,365.85L309.49,364.83L306.68,361.63L303.70,356.66L302.65,356.41L306.42,345.85L309.86,343.23L309.01,336.11L306.41,336.02L305.26,340.41L299.76,337.25L291.26,342.42L288.62,341.26L289.40,338.69L287.23,338.65L287.24,340.39L285.29,340.77L283.29,337.57L285.10,332.42L286.98,332.13L284.23,329.14L280.56,336.19L279.06,335.70L278.45,337.81L275.53,336.21L275.70,338.46L274.20,338.63L271.90,335.66L266.98,336.80L268.19,333.62L262.28,335.08L263.81,338.31ZM264.42,353.05L264.92,352.85L264.36,352.50L264.42,353.05ZM262.54,359.79L263.09,359.93L262.98,359.26L262.54,359.79ZM261.49,361.43L262.46,360.59L261.85,359.99L261.43,360.28L261.49,361.43ZM260.83,363.42L261.36,363.27L260.81,361.80L260.30,362.42L260.83,363.42ZM259.99,363.77L261.02,363.83L260.49,363.32L259.99,363.77ZM260.08,366.28L260.59,366.60L261.17,365.64L260.88,365.54L260.08,366.28ZM260.57,372.32L260.40,370.91L259.45,370.80L259.53,372.02L260.57,372.32ZM261.68,376.01L261.86,375.54L261.33,374.91L261.28,375.92L261.68,376.01ZM263.68,377.35L264.34,377.00L263.93,375.91L263.58,376.43L263.68,377.35ZM267.33,378.62L267.19,378.13L265.02,377.27L265.02,378.58L267.33,378.62ZM267.86,378.67L269.27,378.64L268.62,377.53L267.94,377.62L267.86,378.67ZM265.16,379.63L265.66,379.53L265.34,378.95L264.85,378.88L265.16,379.63ZM267.77,380.57L268.80,380.54L268.67,379.31L267.85,379.90L267.77,380.57ZM271.42,381.96L271.61,381.43L270.98,379.79L270.49,381.85L271.42,381.96ZM270.83,382.26L271.21,383.20L271.73,382.25L271.40,382.05L270.83,382.26ZM265.07,389.15L267.22,387.88L266.91,384.26L265.58,383.87L265.96,381.73L267.57,382.98L266.69,380.80L264.66,381.16L264.31,382.95L266.61,386.48L265.07,389.15ZM276.80,389.84L277.02,389.09L276.79,388.52L276.54,388.63L276.80,389.84ZM261.62,413.14L261.48,413.50L262.25,413.62L262.32,413.25L261.62,413.14ZM277.38,413.75L277.39,414.33L278.15,413.88L277.80,413.62L277.38,413.75ZM275.20,414.89L276.87,414.38L270.53,413.14L270.19,415.83L266.90,417.84L265.91,420.58L265.98,422.56L268.31,423.64L269.11,422.40L270.10,423.62L271.42,420.96L273.98,421.24L274.99,418.83L273.97,418.16L276.03,416.77L275.20,414.89ZM274.94,422.63L276.86,420.68L276.65,418.27L274.69,420.96L274.94,422.63ZM259.48,427.34L259.33,429.36L266.59,424.06L260.50,421.90L260.53,424.57L262.33,425.27L260.16,427.04L261.22,427.60L259.48,427.34ZM279.40,427.15L278.67,432.12L279.62,432.80L279.69,432.82L279.10,429.39L279.40,427.15ZM273.76,445.33L271.40,443.93L269.74,444.95L268.34,442.71L267.78,447.68L269.77,450.13L272.19,450.37L274.10,448.09L273.76,445.33ZM266.73,459.60L269.10,459.42L269.11,456.93L267.05,458.46L266.73,459.60ZM296.10,314.74L294.11,312.92L293.01,313.85L295.59,315.89L296.10,314.74ZM300.26,323.53L302.13,324.85L303.61,320.51L309.16,322.66L309.98,321.36L304.78,318.08L305.28,313.78L301.79,311.24L301.34,316.48L298.43,319.47L299.73,321.43L294.06,324.26L296.73,327.36L299.71,327.05L300.26,323.53ZM292.35,324.00L292.83,323.70L292.24,322.90L292.10,323.70L292.35,324.00ZM287.94,325.67L287.29,323.15L285.67,326.29L286.84,327.45L287.94,325.67ZM308.15,329.84L306.62,328.61L306.05,329.56L307.27,330.68L308.15,329.84ZM284.12,387.98L283.81,388.00L283.75,388.32L284.71,388.61L284.12,387.98ZM279.87,389.31L279.64,388.70L279.40,389.23L279.87,389.31ZM284.26,391.87L283.84,390.29L283.31,389.96L283.43,391.34L284.26,391.87ZM284.69,395.10L285.63,395.25L285.88,394.06L284.69,393.53L284.69,395.10ZM301.36,396.53L301.87,396.25L301.34,395.67L301.02,396.39L301.36,396.53ZM301.11,398.34L299.39,399.00L301.31,403.91L296.21,404.39L298.48,409.75L300.38,409.99L298.48,411.63L298.88,413.68L302.47,413.59L301.69,415.47L304.50,416.96L303.86,414.85L307.32,414.16L302.40,409.32L302.50,407.38L304.61,404.29L304.36,410.06L310.01,408.77L308.54,403.37L310.31,401.00L310.41,398.90L310.16,395.12L310.11,394.95L304.64,393.48L302.43,396.52L305.84,397.78L302.61,397.29L303.05,400.94L301.72,400.84L301.11,398.34ZM306.75,411.70L308.25,412.90L308.17,411.11L307.33,410.23L306.75,411.70ZM301.49,422.20L301.80,422.28L301.94,421.46L301.49,422.20ZM299.64,428.88L300.08,429.48L300.47,429.37L300.08,428.48L299.64,428.88ZM300.19,429.72L299.69,429.94L299.78,430.27L299.85,430.42L300.38,430.05L300.19,429.72ZM299.23,431.02L299.93,430.59L299.85,430.42L299.83,430.44L299.78,430.27L299.44,429.53L298.58,430.67L299.23,431.02ZM302.94,482.36L303.18,481.66L302.43,481.89L302.49,482.33L302.94,482.36ZM306.12,502.58L303.15,501.17L303.91,503.37L307.03,504.24L306.12,502.58ZM308.37,506.82L307.33,504.37L305.38,504.86L307.11,507.45L308.37,506.82ZM302.81,514.09L301.02,513.28L299.96,514.62L301.72,517.54L302.81,514.09ZM298.41,522.71L297.82,523.55L298.20,523.59L298.41,522.71ZM309.53,540.95L308.56,537.51L306.16,538.83L306.15,542.93L309.53,540.95ZM315.65,338.29L319.02,338.38L320.51,337.33L319.30,336.18L322.29,336.49L324.23,334.34L320.02,332.19L319.43,333.99L317.59,331.11L318.58,327.93L310.78,325.28L310.87,326.19L314.19,328.29L313.05,330.62L314.55,337.36L312.19,338.47L313.99,341.96L315.65,338.29ZM315.20,430.46L315.00,431.03L315.51,431.62L315.78,430.66L315.20,430.46ZM314.27,439.90L314.85,439.65L314.09,438.67L313.72,438.88L314.27,439.90ZM338.34,451.42L333.21,447.41L334.58,451.42L337.89,453.41L338.34,451.42ZM313.22,450.55L312.00,450.60L311.42,450.98L312.94,451.46L313.22,450.55ZM342.08,453.84L341.83,453.65L341.34,454.03L341.60,454.74L342.08,453.84ZM311.60,460.48L311.94,460.05L310.69,459.59L311.60,460.48ZM339.06,462.28L339.01,461.64L338.71,461.32L338.21,461.85L339.06,462.28ZM314.23,462.56L312.54,461.39L312.48,462.57L313.62,463.19L314.23,462.56ZM316.16,462.91L316.47,463.38L316.90,462.46L316.16,462.91ZM362.55,489.99L363.01,490.08L362.76,489.00L362.29,489.07L362.55,489.99ZM351.90,492.34L349.48,491.77L350.07,489.91L346.81,489.38L347.84,492.64L351.90,492.34Z", regionViewBox: { x: 151.7, y: 274.9, w: 284.3, h: 269.2 }, fullViewBox: { x: -13.6, y: -13.7, w: 462.2, h: 711.2 } },
  { id: '43', name: '熊本県', nameEn: 'Kumamoto Pref.', cx: 532.0, cy: 518.5, d: "M460.94,427.91L457.70,429.15L450.58,428.58L442.77,428.98L446.15,432.81L447.82,444.17L449.21,450.99L450.78,452.42L453.31,451.70L451.94,453.34L453.13,454.34L456.10,453.45L466.83,460.46L466.01,466.44L475.01,469.29L476.43,467.59L478.63,473.17L480.88,473.83L481.61,477.20L485.59,481.70L482.19,485.35L484.13,501.04L475.66,505.18L469.24,513.81L461.02,516.58L451.02,523.44L452.87,525.81L452.44,528.18L465.19,526.85L469.91,524.00L482.10,523.89L493.58,519.47L495.65,522.13L493.94,523.34L494.00,526.92L491.30,524.27L489.03,524.45L486.38,525.30L489.53,529.62L485.92,533.08L484.37,531.89L480.35,536.13L474.48,545.76L473.10,544.52L470.51,545.69L468.86,548.80L475.59,553.61L467.79,550.27L475.06,553.94L474.55,555.65L471.15,555.26L470.22,559.19L471.66,561.04L475.02,561.34L476.76,570.19L469.27,577.87L458.82,588.92L458.67,590.37L462.73,591.82L457.45,595.04L456.91,598.83L455.48,597.68L453.91,600.22L455.18,605.26L459.00,605.60L456.34,608.88L453.77,606.50L453.35,611.44L452.25,608.12L450.17,608.71L450.54,612.51L448.14,612.94L444.90,618.24L447.34,620.42L446.64,622.94L444.57,621.16L441.33,622.92L440.25,621.85L433.72,630.42L435.51,632.74L434.32,633.96L435.04,636.68L431.27,635.21L431.48,639.00L436.89,643.99L440.32,650.82L446.25,652.15L448.55,652.39L450.32,651.72L451.43,652.41L454.08,651.96L455.46,651.22L456.19,646.10L457.35,645.94L459.50,647.43L463.10,645.71L464.82,646.88L469.73,646.49L470.99,643.49L473.43,642.29L478.81,642.09L481.82,636.81L480.75,634.29L484.75,634.11L485.79,636.74L486.27,640.05L487.37,641.81L490.39,642.09L491.34,642.85L493.56,643.01L494.28,646.93L503.70,654.14L506.91,654.90L508.31,655.70L511.07,653.80L512.44,654.68L512.21,655.58L515.36,655.04L516.62,656.70L518.22,655.52L526.98,656.07L529.74,657.18L531.91,654.70L535.82,654.84L538.64,655.45L540.13,652.12L541.62,651.70L542.05,650.56L546.10,649.37L547.96,647.45L549.55,648.25L550.17,649.56L553.64,651.79L562.61,650.64L562.64,646.66L564.54,645.03L566.48,643.82L566.43,641.34L567.64,640.46L568.87,638.42L570.88,637.20L572.06,638.34L573.70,637.96L576.20,638.33L577.75,640.50L588.64,642.73L591.36,640.78L591.07,639.30L590.20,635.28L589.56,630.37L586.08,629.20L583.83,624.68L582.85,624.39L583.23,622.01L580.26,619.20L578.14,619.61L577.19,618.64L577.58,614.90L579.65,613.90L578.70,609.80L578.99,609.04L583.14,610.53L584.97,609.45L587.41,607.12L587.93,605.61L591.99,598.11L590.99,597.20L588.49,592.83L587.50,593.14L583.96,590.29L583.88,589.03L585.14,586.92L583.92,584.76L582.88,584.40L582.60,578.54L577.42,578.41L572.81,571.11L571.13,564.67L571.56,562.03L569.55,557.81L570.07,551.43L573.33,550.21L572.22,542.93L576.39,541.62L576.13,539.03L577.31,534.60L579.22,533.24L582.69,534.18L586.86,535.38L591.20,534.67L590.74,532.88L592.33,532.32L593.83,528.78L593.70,522.83L592.91,519.43L594.50,518.93L598.04,513.90L598.69,511.07L600.44,510.02L602.95,512.13L605.44,512.09L605.50,506.66L606.97,503.49L606.41,502.56L612.15,497.42L613.38,497.79L618.28,493.87L618.15,491.57L618.78,490.31L619.73,489.93L620.77,487.55L618.79,485.63L618.82,483.76L620.53,483.24L620.80,480.11L622.65,478.68L622.57,477.52L623.20,475.30L627.10,472.63L629.24,471.96L637.11,472.65L638.10,470.62L637.02,468.75L631.04,465.52L626.15,460.51L624.48,459.89L622.21,455.20L622.34,452.53L622.16,448.54L620.67,444.57L621.90,440.40L620.73,439.43L622.81,438.75L624.35,435.30L620.93,433.97L621.03,430.76L615.88,425.24L615.36,422.03L614.25,416.72L610.11,411.69L605.39,408.66L605.44,405.22L605.09,403.24L603.62,401.63L603.76,397.18L599.68,390.57L595.63,387.57L593.38,386.73L592.77,384.22L589.34,382.30L585.60,382.08L580.97,380.49L576.37,380.73L575.75,382.19L574.10,382.68L571.60,384.81L566.83,383.32L566.55,384.94L564.69,391.24L563.47,393.79L569.98,402.25L571.97,405.90L573.20,407.54L570.35,411.99L571.85,413.54L570.77,416.37L568.76,421.30L567.68,422.44L566.10,423.57L561.70,423.58L559.34,420.20L558.86,417.70L554.19,415.70L551.69,416.49L550.21,415.58L548.12,413.23L546.68,413.45L543.72,407.56L538.96,405.67L535.07,406.38L533.11,403.09L529.65,402.76L527.82,400.22L522.97,398.37L520.49,398.57L519.06,398.29L511.92,392.75L511.29,390.97L506.54,390.49L501.99,390.59L499.63,386.47L499.35,388.25L496.96,390.08L497.25,394.61L494.21,400.54L494.42,402.24L487.08,401.57L480.33,400.90L478.28,400.38L474.35,403.36L475.12,406.51L475.19,407.61L468.69,409.93L468.03,413.08L462.00,414.97L460.07,417.32L462.09,420.31L462.32,423.00L463.47,423.74L464.52,426.54L462.64,428.58L460.94,427.91ZM427.22,530.49L427.71,529.24L426.25,528.41L424.88,528.88L427.22,530.49ZM441.33,538.85L440.81,542.50L448.07,543.23L450.53,540.20L449.87,537.11L452.22,533.60L449.27,530.35L452.10,526.48L448.97,523.65L444.41,525.79L438.78,532.30L438.47,533.68L443.36,534.94L443.92,536.43L441.33,538.85ZM437.55,533.48L435.52,534.51L436.51,535.34L437.55,533.48ZM442.14,543.32L442.96,545.37L445.90,545.02L442.14,543.32ZM440.61,546.27L441.47,544.65L440.52,544.22L438.84,545.37L440.61,546.27ZM356.87,547.92L361.77,550.93L364.33,557.56L362.86,557.87L362.32,563.73L358.06,570.59L355.62,573.42L353.42,582.66L351.71,584.47L352.90,586.30L348.81,591.56L350.10,599.29L352.59,599.77L352.87,603.74L358.01,602.07L360.77,604.80L362.37,602.35L369.48,605.49L367.33,606.54L368.56,608.47L367.63,611.01L365.26,610.95L363.62,606.08L361.69,605.01L359.80,608.90L359.58,605.27L356.54,606.00L351.56,611.48L347.69,619.95L348.88,620.67L350.63,619.13L356.88,621.88L357.35,625.12L354.18,626.23L352.51,630.51L354.62,632.46L356.90,630.96L356.98,633.39L359.11,633.59L361.17,630.75L360.51,628.42L362.82,628.49L363.74,630.31L366.64,627.93L369.90,627.91L371.47,626.13L369.68,624.51L371.77,623.18L371.41,619.92L373.34,619.95L373.36,623.65L375.70,622.78L376.20,618.43L374.30,618.97L374.05,617.11L377.06,617.25L382.79,608.57L386.13,609.89L389.80,606.64L389.16,605.21L384.16,606.16L385.81,602.58L387.75,602.16L386.68,600.03L388.15,599.55L387.95,596.97L389.38,598.25L391.59,595.70L390.16,601.38L392.52,602.94L396.92,599.91L399.50,591.67L402.44,588.29L400.55,585.43L401.92,583.99L401.12,582.33L398.92,581.47L396.85,584.21L395.76,583.66L397.28,582.45L396.51,579.08L399.08,576.93L398.66,574.93L400.43,575.02L396.32,565.74L398.80,562.27L395.36,556.28L396.54,554.11L394.40,543.10L379.43,544.34L368.32,551.31L363.51,551.53L361.21,548.68L362.28,546.27L359.69,545.81L356.87,547.92ZM414.46,559.31L409.60,560.59L404.12,565.24L397.96,567.52L402.34,577.42L406.36,577.33L406.80,581.24L404.28,583.62L406.24,584.36L408.19,583.60L410.22,577.81L412.98,577.42L413.75,579.75L420.20,581.46L424.64,580.65L429.24,575.98L429.94,579.16L428.49,580.91L430.38,586.25L432.66,583.03L435.89,583.76L439.81,580.96L442.11,576.67L440.58,575.00L443.14,574.82L441.48,572.06L445.88,566.55L451.70,549.26L448.63,548.11L446.68,550.46L443.74,549.53L437.76,554.90L437.49,551.78L433.04,550.77L433.24,549.13L431.09,548.43L421.72,550.88L414.46,559.31ZM441.74,584.54L444.33,585.85L443.20,587.94L446.40,586.21L442.97,580.60L441.74,584.54ZM422.40,587.79L423.83,587.31L423.59,584.96L422.40,586.10L422.40,587.79ZM403.28,588.88L404.66,588.49L404.62,585.33L403.38,586.18L403.28,588.88ZM428.87,590.38L430.07,589.58L429.19,587.53L427.18,588.87L428.87,590.38ZM422.93,595.44L426.75,593.71L427.06,592.57L421.48,588.50L420.72,591.08L419.18,589.69L418.27,590.72L418.77,592.86L421.81,593.42L422.93,595.44ZM431.22,599.04L434.20,594.79L433.71,593.06L432.09,594.06L430.18,592.49L424.73,597.21L425.59,601.21L423.00,601.24L419.36,604.04L424.94,604.05L431.22,599.04ZM383.04,614.98L386.42,613.40L384.40,611.23L382.78,612.61L383.04,614.98ZM370.90,630.33L369.16,631.77L370.99,631.97L370.90,630.33ZM360.44,633.06L358.73,633.83L358.02,640.21L361.09,637.00L363.78,641.08L364.60,638.97L360.44,633.06ZM480.59,489.18L481.01,487.74L476.97,487.79L476.79,489.19L480.59,489.18ZM463.35,530.42L463.09,528.35L459.73,527.71L455.57,529.34L456.88,532.56L459.54,532.77L458.23,534.53L459.45,536.14L463.35,530.42ZM453.81,545.10L458.43,537.59L455.46,533.22L452.72,536.86L453.81,545.10Z", regionD: "M460.94,427.91L457.70,429.15L450.58,428.58L442.77,428.98L446.15,432.81L447.82,444.17L449.21,450.99L450.78,452.42L453.31,451.70L451.94,453.34L453.13,454.34L456.10,453.45L466.83,460.46L466.01,466.44L475.01,469.29L476.43,467.59L478.63,473.17L480.88,473.83L481.61,477.20L485.59,481.70L482.19,485.35L484.13,501.04L475.66,505.18L469.24,513.81L461.02,516.58L451.02,523.44L452.87,525.81L452.44,528.18L465.19,526.85L469.91,524.00L482.10,523.89L493.58,519.47L495.65,522.13L493.94,523.34L494.00,526.92L491.30,524.27L489.03,524.45L486.38,525.30L489.53,529.62L485.92,533.08L484.37,531.89L480.35,536.13L474.48,545.76L473.10,544.52L470.51,545.69L468.86,548.80L475.59,553.61L467.79,550.27L475.06,553.94L474.55,555.65L471.15,555.26L470.22,559.19L471.66,561.04L475.02,561.34L476.76,570.19L469.27,577.87L458.82,588.92L458.67,590.37L462.73,591.82L457.45,595.04L456.91,598.83L455.48,597.68L453.91,600.22L455.18,605.26L459.00,605.60L456.34,608.88L453.77,606.50L453.35,611.44L452.25,608.12L450.17,608.71L450.54,612.51L448.14,612.94L444.90,618.24L447.34,620.42L446.64,622.94L444.57,621.16L441.33,622.92L440.25,621.85L433.72,630.42L435.51,632.74L434.32,633.96L435.04,636.68L431.27,635.21L431.48,639.00L436.89,643.99L440.32,650.82L446.25,652.15L448.55,652.39L450.32,651.72L451.43,652.41L454.08,651.96L455.46,651.22L456.19,646.10L457.35,645.94L459.50,647.43L463.10,645.71L464.82,646.88L469.73,646.49L470.99,643.49L473.43,642.29L478.81,642.09L481.82,636.81L480.75,634.29L484.75,634.11L485.79,636.74L486.27,640.05L487.37,641.81L490.39,642.09L491.34,642.85L493.56,643.01L494.28,646.93L503.70,654.14L506.91,654.90L508.31,655.70L511.07,653.80L512.44,654.68L512.21,655.58L515.36,655.04L516.62,656.70L518.22,655.52L526.98,656.07L529.74,657.18L531.91,654.70L535.82,654.84L538.64,655.45L540.13,652.12L541.62,651.70L542.05,650.56L546.10,649.37L547.96,647.45L549.55,648.25L550.17,649.56L553.64,651.79L562.61,650.64L562.64,646.66L564.54,645.03L566.48,643.82L566.43,641.34L567.64,640.46L568.87,638.42L570.88,637.20L572.06,638.34L573.70,637.96L576.20,638.33L577.75,640.50L588.64,642.73L591.36,640.78L591.07,639.30L590.20,635.28L589.56,630.37L586.08,629.20L583.83,624.68L582.85,624.39L583.23,622.01L580.26,619.20L578.14,619.61L577.19,618.64L577.58,614.90L579.65,613.90L578.70,609.80L578.99,609.04L583.14,610.53L584.97,609.45L587.41,607.12L587.93,605.61L591.99,598.11L590.99,597.20L588.49,592.83L587.50,593.14L583.96,590.29L583.88,589.03L585.14,586.92L583.92,584.76L582.88,584.40L582.60,578.54L577.42,578.41L572.81,571.11L571.13,564.67L571.56,562.03L569.55,557.81L570.07,551.43L573.33,550.21L572.22,542.93L576.39,541.62L576.13,539.03L577.31,534.60L579.22,533.24L582.69,534.18L586.86,535.38L591.20,534.67L590.74,532.88L592.33,532.32L593.83,528.78L593.70,522.83L592.91,519.43L594.50,518.93L598.04,513.90L598.69,511.07L600.44,510.02L602.95,512.13L605.44,512.09L605.50,506.66L606.97,503.49L606.41,502.56L612.15,497.42L613.38,497.79L618.28,493.87L618.15,491.57L618.78,490.31L619.73,489.93L620.77,487.55L618.79,485.63L618.82,483.76L620.53,483.24L620.80,480.11L622.65,478.68L622.57,477.52L623.20,475.30L627.10,472.63L629.24,471.96L637.11,472.65L638.10,470.62L637.02,468.75L631.04,465.52L626.15,460.51L624.48,459.89L622.21,455.20L622.34,452.53L622.16,448.54L620.67,444.57L621.90,440.40L620.73,439.43L622.81,438.75L624.35,435.30L620.93,433.97L621.03,430.76L615.88,425.24L615.36,422.03L614.25,416.72L610.11,411.69L605.39,408.66L605.44,405.22L605.09,403.24L603.62,401.63L603.76,397.18L599.68,390.57L595.63,387.57L593.38,386.73L592.77,384.22L589.34,382.30L585.60,382.08L580.97,380.49L576.37,380.73L575.75,382.19L574.10,382.68L571.60,384.81L566.83,383.32L566.55,384.94L564.69,391.24L563.47,393.79L569.98,402.25L571.97,405.90L573.20,407.54L570.35,411.99L571.85,413.54L570.77,416.37L568.76,421.30L567.68,422.44L566.10,423.57L561.70,423.58L559.34,420.20L558.86,417.70L554.19,415.70L551.69,416.49L550.21,415.58L548.12,413.23L546.68,413.45L543.72,407.56L538.96,405.67L535.07,406.38L533.11,403.09L529.65,402.76L527.82,400.22L522.97,398.37L520.49,398.57L519.06,398.29L511.92,392.75L511.29,390.97L506.54,390.49L501.99,390.59L499.63,386.47L499.35,388.25L496.96,390.08L497.25,394.61L494.21,400.54L494.42,402.24L487.08,401.57L480.33,400.90L478.28,400.38L474.35,403.36L475.12,406.51L475.19,407.61L468.69,409.93L468.03,413.08L462.00,414.97L460.07,417.32L462.09,420.31L462.32,423.00L463.47,423.74L464.52,426.54L462.64,428.58L460.94,427.91ZM427.22,530.49L427.71,529.24L426.25,528.41L424.88,528.88L427.22,530.49ZM441.33,538.85L440.81,542.50L448.07,543.23L450.53,540.20L449.87,537.11L452.22,533.60L449.27,530.35L452.10,526.48L448.97,523.65L444.41,525.79L438.78,532.30L438.47,533.68L443.36,534.94L443.92,536.43L441.33,538.85ZM437.55,533.48L435.52,534.51L436.51,535.34L437.55,533.48ZM442.14,543.32L442.96,545.37L445.90,545.02L442.14,543.32ZM440.61,546.27L441.47,544.65L440.52,544.22L438.84,545.37L440.61,546.27ZM356.87,547.92L361.77,550.93L364.33,557.56L362.86,557.87L362.32,563.73L358.06,570.59L355.62,573.42L353.42,582.66L351.71,584.47L352.90,586.30L348.81,591.56L350.10,599.29L352.59,599.77L352.87,603.74L358.01,602.07L360.77,604.80L362.37,602.35L369.48,605.49L367.33,606.54L368.56,608.47L367.63,611.01L365.26,610.95L363.62,606.08L361.69,605.01L359.80,608.90L359.58,605.27L356.54,606.00L351.56,611.48L347.69,619.95L348.88,620.67L350.63,619.13L356.88,621.88L357.35,625.12L354.18,626.23L352.51,630.51L354.62,632.46L356.90,630.96L356.98,633.39L359.11,633.59L361.17,630.75L360.51,628.42L362.82,628.49L363.74,630.31L366.64,627.93L369.90,627.91L371.47,626.13L369.68,624.51L371.77,623.18L371.41,619.92L373.34,619.95L373.36,623.65L375.70,622.78L376.20,618.43L374.30,618.97L374.05,617.11L377.06,617.25L382.79,608.57L386.13,609.89L389.80,606.64L389.16,605.21L384.16,606.16L385.81,602.58L387.75,602.16L386.68,600.03L388.15,599.55L387.95,596.97L389.38,598.25L391.59,595.70L390.16,601.38L392.52,602.94L396.92,599.91L399.50,591.67L402.44,588.29L400.55,585.43L401.92,583.99L401.12,582.33L398.92,581.47L396.85,584.21L395.76,583.66L397.28,582.45L396.51,579.08L399.08,576.93L398.66,574.93L400.43,575.02L396.32,565.74L398.80,562.27L395.36,556.28L396.54,554.11L394.40,543.10L379.43,544.34L368.32,551.31L363.51,551.53L361.21,548.68L362.28,546.27L359.69,545.81L356.87,547.92ZM414.46,559.31L409.60,560.59L404.12,565.24L397.96,567.52L402.34,577.42L406.36,577.33L406.80,581.24L404.28,583.62L406.24,584.36L408.19,583.60L410.22,577.81L412.98,577.42L413.75,579.75L420.20,581.46L424.64,580.65L429.24,575.98L429.94,579.16L428.49,580.91L430.38,586.25L432.66,583.03L435.89,583.76L439.81,580.96L442.11,576.67L440.58,575.00L443.14,574.82L441.48,572.06L445.88,566.55L451.70,549.26L448.63,548.11L446.68,550.46L443.74,549.53L437.76,554.90L437.49,551.78L433.04,550.77L433.24,549.13L431.09,548.43L421.72,550.88L414.46,559.31ZM441.74,584.54L444.33,585.85L443.20,587.94L446.40,586.21L442.97,580.60L441.74,584.54ZM422.40,587.79L423.83,587.31L423.59,584.96L422.40,586.10L422.40,587.79ZM403.28,588.88L404.66,588.49L404.62,585.33L403.38,586.18L403.28,588.88ZM428.87,590.38L430.07,589.58L429.19,587.53L427.18,588.87L428.87,590.38ZM422.93,595.44L426.75,593.71L427.06,592.57L421.48,588.50L420.72,591.08L419.18,589.69L418.27,590.72L418.77,592.86L421.81,593.42L422.93,595.44ZM431.22,599.04L434.20,594.79L433.71,593.06L432.09,594.06L430.18,592.49L424.73,597.21L425.59,601.21L423.00,601.24L419.36,604.04L424.94,604.05L431.22,599.04ZM383.04,614.98L386.42,613.40L384.40,611.23L382.78,612.61L383.04,614.98ZM370.90,630.33L369.16,631.77L370.99,631.97L370.90,630.33ZM360.44,633.06L358.73,633.83L358.02,640.21L361.09,637.00L363.78,641.08L364.60,638.97L360.44,633.06ZM480.59,489.18L481.01,487.74L476.97,487.79L476.79,489.19L480.59,489.18ZM463.35,530.42L463.09,528.35L459.73,527.71L455.57,529.34L456.88,532.56L459.54,532.77L458.23,534.53L459.45,536.14L463.35,530.42ZM453.81,545.10L458.43,537.59L455.46,533.22L452.72,536.86L453.81,545.10Z", regionViewBox: { x: 346.5, y: 379.3, w: 292.7, h: 279.0 }, fullViewBox: { x: 341.9, y: 374.7, w: 302.0, h: 288.3 } },
  { id: '44', name: '大分県', nameEn: 'Oita Pref.', cx: 660.2, cy: 378.6, d: "M674.32,262.62L676.05,264.44L673.97,264.93L673.83,267.68L672.19,266.50L671.16,267.79L671.63,269.36L668.17,275.26L666.92,273.83L658.73,280.70L660.99,286.12L659.70,286.73L648.10,283.64L642.73,285.46L636.62,282.92L627.71,283.48L622.76,278.91L622.47,276.61L620.53,275.89L619.10,278.31L617.35,278.22L613.80,277.37L611.90,274.41L607.64,274.70L606.21,279.46L605.70,285.02L608.81,289.22L608.03,292.74L603.71,296.59L605.69,302.16L593.50,303.29L590.62,301.86L582.97,302.10L581.55,301.24L579.46,301.83L575.70,299.01L571.30,301.53L567.55,301.27L562.14,302.51L558.67,305.83L555.75,307.42L552.30,314.47L548.93,316.44L545.59,317.35L543.65,334.18L538.06,335.76L538.50,338.37L532.85,343.16L536.11,344.89L538.46,353.31L539.48,356.09L537.51,357.89L536.42,359.78L539.84,363.14L531.43,364.81L531.16,367.97L530.90,370.01L538.03,371.93L533.09,376.59L543.99,382.71L543.62,385.22L541.01,387.34L542.32,391.08L540.54,392.46L538.76,398.70L538.47,400.00L534.72,402.52L534.47,405.89L538.96,405.67L543.72,407.56L546.68,413.45L548.12,413.23L550.21,415.58L551.69,416.49L554.19,415.70L558.86,417.70L559.34,420.20L561.70,423.58L566.10,423.57L568.76,421.30L570.77,416.37L571.85,413.54L570.35,411.99L573.20,407.54L569.98,402.25L563.47,393.79L564.69,391.24L566.55,384.94L566.83,383.32L571.60,384.81L574.10,382.68L575.75,382.19L576.37,380.73L580.97,380.49L585.60,382.08L589.34,382.30L591.84,383.46L592.77,384.22L593.38,386.73L595.63,387.57L599.68,390.57L603.76,397.18L603.62,401.63L605.44,405.22L605.39,408.66L607.85,410.99L609.36,410.03L614.41,416.11L615.36,422.03L615.88,425.24L621.03,430.76L620.93,433.97L624.35,435.30L622.81,438.75L620.77,439.13L621.90,440.40L620.67,444.57L622.16,448.54L622.21,455.20L624.48,459.89L626.54,459.33L626.15,460.51L631.04,465.52L637.02,468.75L638.35,471.59L642.28,472.82L642.86,473.73L643.04,475.60L644.29,478.59L645.88,479.01L648.96,477.48L654.81,476.80L657.03,476.52L658.14,476.86L659.06,475.74L660.29,475.24L661.51,472.66L667.11,472.02L669.67,470.49L671.52,473.53L673.59,475.87L675.68,476.41L675.42,477.22L678.72,479.65L677.17,485.46L677.57,487.48L682.76,490.20L685.08,490.37L689.73,491.38L691.93,489.67L693.80,487.29L695.66,486.11L702.74,486.95L705.07,487.32L709.40,487.62L712.69,487.81L716.96,486.23L719.23,487.00L723.74,480.52L724.41,475.85L726.60,471.23L732.48,470.57L736.42,471.40L737.84,474.34L742.17,473.23L744.39,472.34L746.52,474.90L751.72,474.47L752.00,478.33L749.69,482.26L749.52,484.11L749.62,488.78L748.58,493.02L749.20,495.97L754.87,494.83L756.84,492.49L754.47,491.97L756.19,489.34L753.80,486.19L755.43,485.16L755.12,482.27L758.16,485.71L759.39,485.17L757.41,482.37L758.10,479.03L760.44,479.31L759.41,482.76L761.11,483.65L761.91,481.58L764.79,483.50L764.21,480.99L765.94,479.59L765.55,481.31L768.32,483.77L770.94,480.64L770.73,478.21L773.52,478.14L774.05,481.29L775.82,481.92L776.88,477.73L783.60,473.13L783.62,470.59L779.02,468.26L776.79,469.48L779.25,471.98L778.06,473.57L775.55,472.11L773.71,474.58L772.73,470.61L769.99,471.14L771.92,469.72L771.16,466.02L773.73,468.06L784.57,457.01L781.39,455.21L778.85,457.00L777.48,449.26L780.75,449.42L780.52,450.97L784.01,453.24L783.73,449.30L787.49,445.80L789.42,445.42L791.52,448.12L791.94,445.58L800.00,446.75L799.46,443.83L797.13,442.64L791.34,442.86L789.12,441.54L789.23,444.69L784.07,446.47L781.30,445.22L782.45,439.82L778.03,444.80L776.27,442.04L774.04,441.17L773.23,443.04L770.39,439.63L768.37,441.15L768.13,439.17L765.62,438.41L766.22,436.37L764.42,435.58L764.04,437.09L758.31,431.62L760.05,429.85L761.28,431.48L762.26,429.54L760.77,427.00L764.64,423.12L766.48,416.62L777.71,417.84L781.04,415.36L785.03,415.18L782.47,411.97L781.13,409.83L781.67,406.70L779.07,407.14L779.56,412.37L776.50,413.82L774.63,413.12L774.99,411.58L769.94,412.24L768.56,406.16L767.30,406.01L766.61,412.50L763.11,412.81L762.07,409.08L760.97,410.61L757.56,408.61L752.28,410.10L750.37,407.23L754.00,406.19L756.15,402.22L759.14,402.65L760.66,399.90L763.66,398.60L762.87,397.73L760.41,397.09L756.90,398.91L755.07,398.44L755.82,396.71L753.86,396.63L748.94,400.65L746.18,398.09L739.31,397.92L745.25,391.81L743.81,388.78L746.19,383.97L749.65,382.21L753.92,378.95L752.13,378.12L755.67,372.76L754.39,371.14L756.05,368.14L758.23,368.19L761.18,362.29L753.52,364.52L754.29,366.99L751.24,365.26L738.45,368.64L729.44,366.09L729.42,368.82L721.73,362.55L720.50,364.22L721.05,362.08L716.03,359.28L713.63,359.35L714.52,362.60L712.63,359.66L710.70,360.45L711.85,364.12L710.67,364.69L708.88,360.85L696.41,365.04L694.08,367.78L678.80,362.82L676.79,360.32L674.22,342.45L674.76,338.94L679.88,337.15L683.32,337.65L686.26,341.60L694.39,342.22L695.70,341.59L695.96,336.48L700.02,335.98L705.80,335.16L706.35,330.89L702.17,326.19L703.98,323.08L709.29,323.27L714.87,327.41L718.05,327.46L721.77,316.89L723.57,312.34L726.02,312.63L726.09,305.33L724.29,305.95L723.98,303.58L727.26,292.94L724.96,283.49L717.98,275.17L716.29,268.61L714.35,268.70L709.38,261.11L706.43,262.85L706.68,260.75L704.01,257.97L701.63,259.96L700.71,258.38L697.92,258.89L697.98,256.81L692.49,255.51L690.72,256.84L691.14,259.78L689.18,259.87L688.16,256.92L684.51,259.21L680.76,258.16L681.36,260.02L674.97,260.73L674.32,262.62ZM715.70,245.37L711.67,243.76L706.04,245.85L703.47,249.29L706.24,248.06L711.50,248.94L715.70,245.37ZM770.21,361.27L772.61,359.32L768.99,359.80L770.21,361.27ZM778.24,386.92L778.18,388.24L779.39,387.73L780.25,386.47L778.24,386.92ZM782.76,402.52L784.41,404.08L785.48,402.70L784.27,401.52L782.76,402.52ZM769.77,430.38L767.21,429.11L769.90,425.68L768.09,425.52L765.56,426.62L765.84,429.56L762.80,432.20L764.13,434.24L769.77,430.38ZM796.31,438.51L797.13,440.84L798.97,438.71L797.96,435.22L796.31,438.51ZM762.23,487.05L765.54,487.45L765.51,486.08L762.41,484.74L762.23,487.05ZM765.11,500.03L766.07,501.37L767.21,499.56L766.33,498.22L765.11,500.03Z", regionD: "M674.32,262.62L676.05,264.44L673.97,264.93L673.83,267.68L672.19,266.50L671.16,267.79L671.63,269.36L668.17,275.26L666.92,273.83L658.73,280.70L660.99,286.12L659.70,286.73L648.10,283.64L642.73,285.46L636.62,282.92L627.71,283.48L622.76,278.91L622.47,276.61L620.53,275.89L619.10,278.31L617.35,278.22L613.80,277.37L611.90,274.41L607.64,274.70L606.21,279.46L605.70,285.02L608.81,289.22L608.03,292.74L603.71,296.59L605.69,302.16L593.50,303.29L590.62,301.86L582.97,302.10L581.55,301.24L579.46,301.83L575.70,299.01L571.30,301.53L567.55,301.27L562.14,302.51L558.67,305.83L555.75,307.42L552.30,314.47L548.93,316.44L545.59,317.35L543.65,334.18L538.06,335.76L538.50,338.37L532.85,343.16L536.11,344.89L538.46,353.31L539.48,356.09L537.51,357.89L536.42,359.78L539.84,363.14L531.43,364.81L531.16,367.97L530.90,370.01L538.03,371.93L533.09,376.59L543.99,382.71L543.62,385.22L541.01,387.34L542.32,391.08L540.54,392.46L538.76,398.70L538.47,400.00L534.72,402.52L534.47,405.89L538.96,405.67L543.72,407.56L546.68,413.45L548.12,413.23L550.21,415.58L551.69,416.49L554.19,415.70L558.86,417.70L559.34,420.20L561.70,423.58L566.10,423.57L568.76,421.30L570.77,416.37L571.85,413.54L570.35,411.99L573.20,407.54L569.98,402.25L563.47,393.79L564.69,391.24L566.55,384.94L566.83,383.32L571.60,384.81L574.10,382.68L575.75,382.19L576.37,380.73L580.97,380.49L585.60,382.08L589.34,382.30L591.84,383.46L592.77,384.22L593.38,386.73L595.63,387.57L599.68,390.57L603.76,397.18L603.62,401.63L605.44,405.22L605.39,408.66L607.85,410.99L609.36,410.03L614.41,416.11L615.36,422.03L615.88,425.24L621.03,430.76L620.93,433.97L624.35,435.30L622.81,438.75L620.77,439.13L621.90,440.40L620.67,444.57L622.16,448.54L622.21,455.20L624.48,459.89L626.54,459.33L626.15,460.51L631.04,465.52L637.02,468.75L638.35,471.59L642.28,472.82L642.86,473.73L643.04,475.60L644.29,478.59L645.88,479.01L648.96,477.48L654.81,476.80L657.03,476.52L658.14,476.86L659.06,475.74L660.29,475.24L661.51,472.66L667.11,472.02L669.67,470.49L671.52,473.53L673.59,475.87L675.68,476.41L675.42,477.22L678.72,479.65L677.17,485.46L677.57,487.48L682.76,490.20L685.08,490.37L689.73,491.38L691.93,489.67L693.80,487.29L695.66,486.11L702.74,486.95L705.07,487.32L709.40,487.62L712.69,487.81L716.96,486.23L719.23,487.00L723.74,480.52L724.41,475.85L726.60,471.23L732.48,470.57L736.42,471.40L737.84,474.34L742.17,473.23L744.39,472.34L746.52,474.90L751.72,474.47L752.00,478.33L749.69,482.26L749.52,484.11L749.62,488.78L748.58,493.02L749.20,495.97L754.87,494.83L756.84,492.49L754.47,491.97L756.19,489.34L753.80,486.19L755.43,485.16L755.12,482.27L758.16,485.71L759.39,485.17L757.41,482.37L758.10,479.03L760.44,479.31L759.41,482.76L761.11,483.65L761.91,481.58L764.79,483.50L764.21,480.99L765.94,479.59L765.55,481.31L768.32,483.77L770.94,480.64L770.73,478.21L773.52,478.14L774.05,481.29L775.82,481.92L776.88,477.73L783.60,473.13L783.62,470.59L779.02,468.26L776.79,469.48L779.25,471.98L778.06,473.57L775.55,472.11L773.71,474.58L772.73,470.61L769.99,471.14L771.92,469.72L771.16,466.02L773.73,468.06L784.57,457.01L781.39,455.21L778.85,457.00L777.48,449.26L780.75,449.42L780.52,450.97L784.01,453.24L783.73,449.30L787.49,445.80L789.42,445.42L791.52,448.12L791.94,445.58L800.00,446.75L799.46,443.83L797.13,442.64L791.34,442.86L789.12,441.54L789.23,444.69L784.07,446.47L781.30,445.22L782.45,439.82L778.03,444.80L776.27,442.04L774.04,441.17L773.23,443.04L770.39,439.63L768.37,441.15L768.13,439.17L765.62,438.41L766.22,436.37L764.42,435.58L764.04,437.09L758.31,431.62L760.05,429.85L761.28,431.48L762.26,429.54L760.77,427.00L764.64,423.12L766.48,416.62L777.71,417.84L781.04,415.36L785.03,415.18L782.47,411.97L781.13,409.83L781.67,406.70L779.07,407.14L779.56,412.37L776.50,413.82L774.63,413.12L774.99,411.58L769.94,412.24L768.56,406.16L767.30,406.01L766.61,412.50L763.11,412.81L762.07,409.08L760.97,410.61L757.56,408.61L752.28,410.10L750.37,407.23L754.00,406.19L756.15,402.22L759.14,402.65L760.66,399.90L763.66,398.60L762.87,397.73L760.41,397.09L756.90,398.91L755.07,398.44L755.82,396.71L753.86,396.63L748.94,400.65L746.18,398.09L739.31,397.92L745.25,391.81L743.81,388.78L746.19,383.97L749.65,382.21L753.92,378.95L752.13,378.12L755.67,372.76L754.39,371.14L756.05,368.14L758.23,368.19L761.18,362.29L753.52,364.52L754.29,366.99L751.24,365.26L738.45,368.64L729.44,366.09L729.42,368.82L721.73,362.55L720.50,364.22L721.05,362.08L716.03,359.28L713.63,359.35L714.52,362.60L712.63,359.66L710.70,360.45L711.85,364.12L710.67,364.69L708.88,360.85L696.41,365.04L694.08,367.78L678.80,362.82L676.79,360.32L674.22,342.45L674.76,338.94L679.88,337.15L683.32,337.65L686.26,341.60L694.39,342.22L695.70,341.59L695.96,336.48L700.02,335.98L705.80,335.16L706.35,330.89L702.17,326.19L703.98,323.08L709.29,323.27L714.87,327.41L718.05,327.46L721.77,316.89L723.57,312.34L726.02,312.63L726.09,305.33L724.29,305.95L723.98,303.58L727.26,292.94L724.96,283.49L717.98,275.17L716.29,268.61L714.35,268.70L709.38,261.11L706.43,262.85L706.68,260.75L704.01,257.97L701.63,259.96L700.71,258.38L697.92,258.89L697.98,256.81L692.49,255.51L690.72,256.84L691.14,259.78L689.18,259.87L688.16,256.92L684.51,259.21L680.76,258.16L681.36,260.02L674.97,260.73L674.32,262.62ZM715.70,245.37L711.67,243.76L706.04,245.85L703.47,249.29L706.24,248.06L711.50,248.94L715.70,245.37ZM770.21,361.27L772.61,359.32L768.99,359.80L770.21,361.27ZM778.24,386.92L778.18,388.24L779.39,387.73L780.25,386.47L778.24,386.92ZM782.76,402.52L784.41,404.08L785.48,402.70L784.27,401.52L782.76,402.52ZM769.77,430.38L767.21,429.11L769.90,425.68L768.09,425.52L765.56,426.62L765.84,429.56L762.80,432.20L764.13,434.24L769.77,430.38ZM796.31,438.51L797.13,440.84L798.97,438.71L797.96,435.22L796.31,438.51ZM762.23,487.05L765.54,487.45L765.51,486.08L762.41,484.74L762.23,487.05ZM765.11,500.03L766.07,501.37L767.21,499.56L766.33,498.22L765.11,500.03Z", regionViewBox: { x: 529.8, y: 242.7, w: 271.3, h: 259.8 }, fullViewBox: { x: 525.5, y: 238.4, w: 279.9, h: 268.4 } },
  { id: '45', name: '宮崎県', nameEn: 'Miyazaki Pref.', cx: 631.9, cy: 631.9, d: "M657.03,476.52L654.81,476.80L648.96,477.48L645.88,479.01L644.29,478.59L643.04,475.60L642.86,473.73L640.83,471.45L637.11,472.65L629.24,471.96L627.10,472.63L623.20,475.30L622.57,477.52L622.65,478.68L620.80,480.11L620.53,483.24L618.82,483.76L618.79,485.63L620.77,487.55L619.73,489.93L618.78,490.31L618.32,493.86L613.38,497.79L612.15,497.42L606.41,502.56L606.97,503.49L605.50,506.66L605.44,512.09L602.95,512.13L600.44,510.02L598.69,511.07L598.04,513.90L594.50,518.93L592.91,519.43L593.70,522.83L593.83,528.78L592.33,532.32L590.74,532.88L590.51,535.29L586.86,535.38L582.69,534.18L579.22,533.24L577.31,534.60L576.13,539.03L576.39,541.62L573.18,541.89L571.91,543.64L573.33,550.21L570.07,551.43L569.55,557.81L572.81,571.11L577.42,578.41L582.60,578.54L582.88,584.40L583.92,584.76L585.14,586.92L583.88,589.03L583.96,590.29L587.50,593.14L588.49,592.83L590.99,597.20L591.99,598.11L589.70,602.66L587.93,605.61L587.41,607.12L584.97,609.45L583.14,610.53L580.64,608.91L578.70,609.80L579.65,613.90L577.58,614.90L577.19,618.64L582.31,620.87L582.85,624.39L583.83,624.68L586.08,629.20L589.56,630.37L590.20,635.28L591.07,639.30L591.36,640.78L588.64,642.73L577.75,640.50L576.20,638.33L573.70,637.96L572.06,638.34L570.88,637.20L568.87,638.42L567.64,640.46L564.54,645.03L562.64,646.66L562.61,650.64L558.11,652.03L553.64,651.79L550.17,649.56L549.55,648.25L547.96,647.45L546.10,649.37L541.62,651.70L540.13,652.12L538.64,655.45L535.82,654.84L531.91,654.70L529.74,657.18L526.98,656.07L518.22,655.52L516.62,656.70L514.84,654.88L512.21,655.58L512.44,654.68L511.07,653.80L508.31,655.70L507.32,659.50L504.66,661.64L504.62,666.33L512.00,669.17L514.05,671.93L515.14,672.67L517.04,674.71L518.60,675.98L520.64,677.62L521.26,683.01L521.43,685.31L521.91,686.32L523.28,687.39L524.41,689.49L525.51,690.90L525.19,693.58L526.42,693.67L527.76,694.95L533.24,695.71L537.80,697.32L538.41,697.67L539.32,697.67L540.15,698.70L540.83,699.15L544.67,705.30L546.19,709.09L549.06,709.31L549.63,709.73L549.67,709.78L549.18,710.37L545.51,711.74L544.37,718.34L541.33,720.62L542.99,729.58L544.64,729.72L546.88,731.09L550.51,730.48L550.59,731.52L552.99,734.78L558.96,735.63L561.94,735.23L566.05,737.19L563.47,743.53L567.61,744.95L571.31,744.23L570.85,753.20L571.59,754.01L572.01,755.19L574.18,757.14L573.74,760.92L573.97,764.42L577.91,768.46L578.23,771.07L579.22,771.53L579.66,773.23L580.46,772.06L582.00,769.73L583.57,767.03L585.01,766.51L585.86,767.54L587.18,768.16L589.67,770.41L591.17,772.19L592.32,772.83L592.65,773.93L594.21,773.98L597.75,774.69L599.73,773.94L600.38,773.28L601.36,773.07L602.04,772.31L604.40,773.23L606.27,774.13L608.57,776.06L608.10,780.75L609.19,782.01L612.00,786.69L611.21,789.90L608.55,792.42L609.85,793.65L611.15,798.97L610.84,801.01L610.99,802.34L610.16,803.89L604.86,806.29L604.20,807.63L603.21,813.43L602.28,816.94L604.52,818.88L605.86,819.44L606.90,817.75L612.24,818.67L616.95,825.86L618.27,824.30L620.04,825.35L618.45,830.66L622.40,836.78L628.45,836.62L630.30,834.67L631.59,835.68L634.22,834.29L636.16,839.82L639.82,841.84L642.91,839.19L639.47,836.37L639.42,832.33L642.02,831.86L641.29,829.29L647.38,824.88L645.70,813.90L650.31,811.74L651.21,810.39L649.99,808.29L650.39,806.11L647.98,805.35L647.72,802.35L650.45,801.97L650.26,792.12L653.10,792.01L651.82,790.54L654.14,786.25L655.69,788.14L655.02,789.81L656.24,789.13L655.54,784.79L656.87,781.73L665.79,775.44L666.90,773.30L665.03,772.16L666.04,769.92L668.42,770.26L666.70,764.28L664.74,764.14L664.37,761.75L668.25,759.76L665.63,756.89L666.96,755.54L666.44,751.86L668.12,751.22L667.13,747.95L669.24,747.14L668.24,743.25L672.55,735.00L665.40,727.12L664.93,715.90L666.94,712.34L665.98,708.70L668.37,703.04L667.31,702.81L666.69,705.96L665.98,704.65L666.41,702.19L669.09,700.53L669.10,694.57L676.60,669.41L679.26,659.08L683.57,647.83L684.28,641.46L690.61,621.21L690.52,616.55L694.67,604.08L699.58,595.57L702.02,595.41L701.36,590.72L704.06,587.76L703.36,585.30L706.12,578.17L715.61,574.65L708.14,573.66L713.87,571.47L712.61,569.61L709.68,571.27L710.00,568.06L707.28,571.72L705.75,570.86L708.49,568.57L707.24,565.95L709.18,559.44L713.53,559.59L712.88,561.53L716.95,562.98L723.77,556.13L719.91,554.63L720.26,551.53L718.53,550.62L717.90,553.36L714.45,553.00L713.99,545.15L716.64,537.83L720.56,532.57L726.82,532.17L729.73,529.18L729.13,527.96L731.55,526.05L730.81,525.05L733.48,519.92L730.07,521.30L729.90,518.97L732.14,518.34L731.20,515.40L733.06,515.15L734.26,511.54L735.91,511.41L736.75,514.63L737.64,510.50L742.46,508.29L742.75,504.29L744.84,503.36L748.33,507.40L750.53,505.70L748.95,502.90L749.85,499.50L752.89,500.35L751.47,497.61L752.33,496.30L755.39,496.57L754.87,494.83L749.20,495.97L748.58,493.02L749.62,488.78L749.52,484.11L749.69,482.26L752.00,478.33L751.72,474.47L746.52,474.90L744.39,472.34L742.17,473.23L737.84,474.34L736.42,471.40L732.48,470.57L726.60,471.23L724.41,475.85L723.74,480.52L719.23,487.00L716.96,486.23L712.69,487.81L709.40,487.62L705.07,487.32L702.74,486.95L695.66,486.11L693.80,487.29L691.93,489.67L689.73,491.38L685.08,490.37L682.76,490.20L677.57,487.48L676.80,486.34L677.17,485.46L678.72,479.65L675.42,477.22L675.68,476.41L673.59,475.87L671.52,473.53L669.93,470.77L667.11,472.02L661.51,472.66L660.29,475.24L659.06,475.74L658.14,476.86L657.03,476.52ZM743.08,511.48L741.76,515.50L745.23,515.70L746.75,512.32L743.92,512.86L743.08,511.48ZM711.50,564.03L711.24,562.77L710.50,563.82L711.50,564.03ZM654.31,799.16L657.02,802.46L656.69,796.41L655.88,796.17L654.31,799.16ZM650.88,812.48L651.88,813.52L651.91,812.24L651.47,811.89L650.88,812.48ZM647.70,819.10L648.86,819.75L649.20,818.06L649.04,817.71L647.70,819.10Z", regionD: "M657.03,476.52L654.81,476.80L648.96,477.48L645.88,479.01L644.29,478.59L643.04,475.60L642.86,473.73L640.83,471.45L637.11,472.65L629.24,471.96L627.10,472.63L623.20,475.30L622.57,477.52L622.65,478.68L620.80,480.11L620.53,483.24L618.82,483.76L618.79,485.63L620.77,487.55L619.73,489.93L618.78,490.31L618.32,493.86L613.38,497.79L612.15,497.42L606.41,502.56L606.97,503.49L605.50,506.66L605.44,512.09L602.95,512.13L600.44,510.02L598.69,511.07L598.04,513.90L594.50,518.93L592.91,519.43L593.70,522.83L593.83,528.78L592.33,532.32L590.74,532.88L590.51,535.29L586.86,535.38L582.69,534.18L579.22,533.24L577.31,534.60L576.13,539.03L576.39,541.62L573.18,541.89L571.91,543.64L573.33,550.21L570.07,551.43L569.55,557.81L572.81,571.11L577.42,578.41L582.60,578.54L582.88,584.40L583.92,584.76L585.14,586.92L583.88,589.03L583.96,590.29L587.50,593.14L588.49,592.83L590.99,597.20L591.99,598.11L589.70,602.66L587.93,605.61L587.41,607.12L584.97,609.45L583.14,610.53L580.64,608.91L578.70,609.80L579.65,613.90L577.58,614.90L577.19,618.64L582.31,620.87L582.85,624.39L583.83,624.68L586.08,629.20L589.56,630.37L590.20,635.28L591.07,639.30L591.36,640.78L588.64,642.73L577.75,640.50L576.20,638.33L573.70,637.96L572.06,638.34L570.88,637.20L568.87,638.42L567.64,640.46L564.54,645.03L562.64,646.66L562.61,650.64L558.11,652.03L553.64,651.79L550.17,649.56L549.55,648.25L547.96,647.45L546.10,649.37L541.62,651.70L540.13,652.12L538.64,655.45L535.82,654.84L531.91,654.70L529.74,657.18L526.98,656.07L518.22,655.52L516.62,656.70L514.84,654.88L512.21,655.58L512.44,654.68L511.07,653.80L508.31,655.70L507.32,659.50L504.66,661.64L504.62,666.33L512.00,669.17L514.05,671.93L515.14,672.67L517.04,674.71L518.60,675.98L520.64,677.62L521.26,683.01L521.43,685.31L521.91,686.32L523.28,687.39L524.41,689.49L525.51,690.90L525.19,693.58L526.42,693.67L527.76,694.95L533.24,695.71L537.80,697.32L538.41,697.67L539.32,697.67L540.15,698.70L540.83,699.15L544.67,705.30L546.19,709.09L549.06,709.31L549.63,709.73L549.67,709.78L549.18,710.37L545.51,711.74L544.37,718.34L541.33,720.62L542.99,729.58L544.64,729.72L546.88,731.09L550.51,730.48L550.59,731.52L552.99,734.78L558.96,735.63L561.94,735.23L566.05,737.19L563.47,743.53L567.61,744.95L571.31,744.23L570.85,753.20L571.59,754.01L572.01,755.19L574.18,757.14L573.74,760.92L573.97,764.42L577.91,768.46L578.23,771.07L579.22,771.53L579.66,773.23L580.46,772.06L582.00,769.73L583.57,767.03L585.01,766.51L585.86,767.54L587.18,768.16L589.67,770.41L591.17,772.19L592.32,772.83L592.65,773.93L594.21,773.98L597.75,774.69L599.73,773.94L600.38,773.28L601.36,773.07L602.04,772.31L604.40,773.23L606.27,774.13L608.57,776.06L608.10,780.75L609.19,782.01L612.00,786.69L611.21,789.90L608.55,792.42L609.85,793.65L611.15,798.97L610.84,801.01L610.99,802.34L610.16,803.89L604.86,806.29L604.20,807.63L603.21,813.43L602.28,816.94L604.52,818.88L605.86,819.44L606.90,817.75L612.24,818.67L616.95,825.86L618.27,824.30L620.04,825.35L618.45,830.66L622.40,836.78L628.45,836.62L630.30,834.67L631.59,835.68L634.22,834.29L636.16,839.82L639.82,841.84L642.91,839.19L639.47,836.37L639.42,832.33L642.02,831.86L641.29,829.29L647.38,824.88L645.70,813.90L650.31,811.74L651.21,810.39L649.99,808.29L650.39,806.11L647.98,805.35L647.72,802.35L650.45,801.97L650.26,792.12L653.10,792.01L651.82,790.54L654.14,786.25L655.69,788.14L655.02,789.81L656.24,789.13L655.54,784.79L656.87,781.73L665.79,775.44L666.90,773.30L665.03,772.16L666.04,769.92L668.42,770.26L666.70,764.28L664.74,764.14L664.37,761.75L668.25,759.76L665.63,756.89L666.96,755.54L666.44,751.86L668.12,751.22L667.13,747.95L669.24,747.14L668.24,743.25L672.55,735.00L665.40,727.12L664.93,715.90L666.94,712.34L665.98,708.70L668.37,703.04L667.31,702.81L666.69,705.96L665.98,704.65L666.41,702.19L669.09,700.53L669.10,694.57L676.60,669.41L679.26,659.08L683.57,647.83L684.28,641.46L690.61,621.21L690.52,616.55L694.67,604.08L699.58,595.57L702.02,595.41L701.36,590.72L704.06,587.76L703.36,585.30L706.12,578.17L715.61,574.65L708.14,573.66L713.87,571.47L712.61,569.61L709.68,571.27L710.00,568.06L707.28,571.72L705.75,570.86L708.49,568.57L707.24,565.95L709.18,559.44L713.53,559.59L712.88,561.53L716.95,562.98L723.77,556.13L719.91,554.63L720.26,551.53L718.53,550.62L717.90,553.36L714.45,553.00L713.99,545.15L716.64,537.83L720.56,532.57L726.82,532.17L729.73,529.18L729.13,527.96L731.55,526.05L730.81,525.05L733.48,519.92L730.07,521.30L729.90,518.97L732.14,518.34L731.20,515.40L733.06,515.15L734.26,511.54L735.91,511.41L736.75,514.63L737.64,510.50L742.46,508.29L742.75,504.29L744.84,503.36L748.33,507.40L750.53,505.70L748.95,502.90L749.85,499.50L752.89,500.35L751.47,497.61L752.33,496.30L755.39,496.57L754.87,494.83L749.20,495.97L748.58,493.02L749.62,488.78L749.52,484.11L749.69,482.26L752.00,478.33L751.72,474.47L746.52,474.90L744.39,472.34L742.17,473.23L737.84,474.34L736.42,471.40L732.48,470.57L726.60,471.23L724.41,475.85L723.74,480.52L719.23,487.00L716.96,486.23L712.69,487.81L709.40,487.62L705.07,487.32L702.74,486.95L695.66,486.11L693.80,487.29L691.93,489.67L689.73,491.38L685.08,490.37L682.76,490.20L677.57,487.48L676.80,486.34L677.17,485.46L678.72,479.65L675.42,477.22L675.68,476.41L673.59,475.87L671.52,473.53L669.93,470.77L667.11,472.02L661.51,472.66L660.29,475.24L659.06,475.74L658.14,476.86L657.03,476.52ZM743.08,511.48L741.76,515.50L745.23,515.70L746.75,512.32L743.92,512.86L743.08,511.48ZM711.50,564.03L711.24,562.77L710.50,563.82L711.50,564.03ZM654.31,799.16L657.02,802.46L656.69,796.41L655.88,796.17L654.31,799.16ZM650.88,812.48L651.88,813.52L651.91,812.24L651.47,811.89L650.88,812.48ZM647.70,819.10L648.86,819.75L649.20,818.06L649.04,817.71L647.70,819.10Z", regionViewBox: { x: 503.1, y: 469.1, w: 253.7, h: 374.2 }, fullViewBox: { x: 497.2, y: 463.1, w: 265.6, h: 386.1 } },
  { id: '46', name: '鹿児島県', nameEn: 'Kagoshima Pref.', cx: 489.3, cy: 772.3, d: "M575.63,840.03L574.99,837.53L572.85,837.73L573.48,841.19L575.63,840.03ZM394.77,615.34L394.12,613.41L392.03,617.18L391.08,616.34L389.79,620.35L388.31,620.14L390.38,624.23L391.74,618.80L394.77,615.34ZM393.10,624.43L393.21,623.63L392.37,624.03L392.51,624.52L393.10,624.43ZM381.11,626.73L381.86,628.01L377.60,626.72L376.83,628.35L378.04,628.98L376.74,629.80L379.52,630.53L377.44,630.82L378.62,632.30L376.17,632.31L377.21,633.67L375.26,633.47L373.69,635.36L377.45,638.16L378.90,641.48L378.38,649.50L383.72,654.60L385.39,654.30L385.97,657.44L387.82,658.54L390.31,657.11L392.25,650.25L391.28,648.38L399.00,642.40L398.10,638.52L394.24,639.20L394.48,633.50L397.07,631.31L395.19,631.37L391.47,623.36L389.33,627.03L387.61,624.21L387.16,627.09L385.92,626.55L387.28,631.32L382.31,626.62L381.11,626.73ZM391.03,674.87L389.42,673.77L389.86,675.49L390.57,675.57L391.03,674.87ZM324.95,716.44L320.67,718.99L321.63,723.13L323.70,721.98L325.07,722.97L323.65,725.74L327.15,726.24L327.18,730.52L332.63,727.89L333.99,725.09L336.88,727.10L338.17,726.44L339.51,722.16L336.99,720.42L339.47,718.67L337.95,715.01L341.00,714.30L341.02,713.61L333.88,714.17L336.77,718.91L335.11,720.55L328.87,716.94L322.56,710.47L318.89,710.83L315.09,715.85L316.01,720.55L318.96,721.92L320.40,713.84L321.43,717.42L324.95,716.44ZM320.20,725.83L320.94,723.82L320.41,724.53L319.05,724.84L320.20,725.83ZM319.15,729.99L320.61,728.11L319.90,726.55L315.82,728.17L314.33,731.97L316.33,737.58L318.41,735.57L316.81,733.88L321.03,731.73L319.15,729.99ZM302.06,747.78L300.56,746.99L291.27,750.83L289.43,752.47L290.43,754.89L288.10,756.04L288.62,758.40L285.25,764.53L286.23,765.90L281.23,766.57L282.95,772.78L286.36,773.63L286.83,775.88L289.31,775.92L289.42,773.44L291.38,772.22L293.14,775.91L292.54,773.25L298.13,767.87L295.78,766.36L295.49,763.76L299.38,759.73L298.49,755.00L300.35,752.15L302.18,752.23L302.45,753.93L304.72,753.28L306.73,745.53L311.82,740.39L309.97,737.18L311.86,735.03L309.73,735.35L308.23,733.59L307.33,737.56L309.10,739.21L307.74,741.95L306.16,741.84L307.31,743.46L306.33,746.08L304.15,745.56L302.06,747.78ZM390.41,840.96L388.97,842.10L388.61,843.90L389.53,843.96L390.41,840.96ZM242.15,880.94L241.38,879.34L240.68,881.33L242.24,883.26L242.15,880.94ZM233.40,888.34L236.02,887.77L237.40,882.88L235.91,882.28L235.37,885.29L233.40,888.34ZM240.37,967.95L239.99,966.98L239.40,967.22L239.33,967.94L240.37,967.95ZM233.21,970.49L232.11,971.23L232.16,972.22L233.48,971.06L233.21,970.49ZM335.20,976.86L339.15,979.83L344.16,978.23L346.62,975.29L341.20,969.90L333.93,973.02L335.20,976.86ZM337.65,1186.81L336.39,1182.18L334.82,1183.77L335.94,1186.19L332.71,1189.90L335.74,1194.72L340.18,1196.88L342.90,1194.13L337.65,1186.81ZM254.15,1210.24L258.46,1210.74L257.98,1207.28L255.15,1205.07L253.73,1206.26L254.15,1210.24ZM272.70,1213.43L272.96,1215.30L273.86,1213.63L272.70,1213.43ZM331.00,1216.70L322.50,1213.28L320.11,1215.14L318.72,1219.24L324.39,1228.82L327.10,1230.22L330.32,1228.73L336.13,1229.09L331.81,1223.28L331.00,1216.70ZM254.65,1260.27L252.68,1262.67L255.01,1265.45L255.80,1262.91L254.65,1260.27ZM298.62,1266.58L291.43,1268.03L286.54,1271.57L289.61,1283.82L292.73,1283.10L292.54,1281.46L297.21,1277.70L298.62,1266.58ZM265.59,1318.98L267.75,1320.98L267.32,1322.92L272.54,1323.04L270.68,1316.79L267.66,1315.56L265.59,1318.98ZM213.73,1377.70L213.85,1378.96L214.91,1378.42L213.73,1377.70ZM211.25,1379.08L210.28,1377.97L208.58,1379.03L210.26,1380.70L211.25,1379.08ZM187.72,1396.15L183.39,1395.54L180.27,1396.95L187.42,1403.66L187.72,1396.15ZM139.96,1476.97L140.24,1478.66L141.23,1478.65L139.96,1476.97ZM137.07,1486.27L134.83,1485.34L135.68,1487.48L140.73,1487.41L140.90,1485.24L139.13,1484.03L137.07,1486.27ZM409.76,610.31L411.43,610.75L411.25,606.52L408.44,604.87L409.22,603.99L404.10,605.65L404.29,607.98L401.02,608.43L399.85,617.57L402.61,615.17L405.95,616.60L405.29,614.40L409.76,610.31ZM401.89,616.99L402.76,619.13L403.39,618.91L403.33,618.04L401.89,616.99ZM394.13,620.01L393.93,619.62L393.25,619.92L393.19,620.62L394.13,620.01ZM401.34,623.99L400.83,623.82L400.45,624.74L401.34,623.99ZM399.15,628.21L399.39,625.73L398.05,625.88L398.66,624.26L395.83,619.57L396.21,624.03L394.36,625.43L397.26,628.73L396.44,627.02L398.73,627.92L398.02,629.30L399.15,628.21ZM436.89,643.99L431.10,638.86L431.82,642.94L429.57,646.88L420.37,653.85L414.84,653.38L412.27,651.70L412.07,648.81L410.23,648.98L410.58,651.10L407.85,648.81L404.10,648.81L398.62,649.89L392.96,653.25L390.83,658.91L390.89,661.39L393.51,663.23L393.24,661.22L395.28,660.18L398.59,665.78L397.66,671.42L395.05,673.60L395.20,676.56L392.56,677.14L392.47,680.80L398.83,687.98L401.26,699.02L401.52,707.30L399.01,713.36L395.42,716.18L396.72,717.88L395.96,720.31L389.85,732.63L392.74,736.68L393.99,744.13L395.20,744.80L399.35,742.38L407.33,748.64L408.17,750.92L409.83,751.03L409.00,752.40L410.55,752.74L409.39,754.49L413.14,755.23L415.87,759.23L417.86,765.79L421.70,766.91L424.60,774.35L425.81,786.79L424.02,800.34L421.14,809.11L412.25,825.22L404.22,829.49L402.92,831.92L395.39,829.66L395.48,824.60L394.09,825.49L394.12,829.35L392.87,826.79L390.74,826.79L388.41,821.88L383.35,828.54L378.97,825.92L377.00,828.69L380.12,827.70L382.52,829.14L389.48,838.42L391.56,840.40L394.94,840.34L394.85,843.22L397.23,842.57L398.95,844.98L397.83,848.42L391.34,850.92L395.16,853.12L400.13,851.84L402.30,854.70L401.63,856.91L396.75,858.34L397.15,861.32L399.93,859.61L400.55,861.37L403.27,861.76L400.07,863.60L403.16,865.25L399.99,866.87L400.59,869.74L405.39,867.32L406.38,868.89L410.27,868.13L413.72,869.79L414.59,865.75L416.86,865.15L419.84,865.48L423.28,868.37L433.03,869.20L440.38,868.78L446.39,870.53L452.48,869.35L458.19,872.91L462.96,878.88L464.47,882.65L462.89,883.85L462.97,888.51L467.59,891.45L473.34,887.78L479.86,892.86L481.65,887.34L488.10,887.04L491.16,884.66L491.91,880.67L490.48,880.29L489.80,882.14L488.85,879.56L494.88,877.12L493.21,871.02L496.75,865.44L488.48,863.77L484.03,858.75L482.36,858.98L479.13,856.00L474.96,851.44L471.25,839.57L471.41,837.06L473.58,835.45L471.84,832.84L469.48,834.26L466.59,828.94L464.04,817.22L464.44,815.81L468.02,816.27L468.15,814.34L463.98,812.38L464.38,809.85L465.36,810.45L464.05,809.12L467.85,810.76L468.93,807.62L465.45,805.69L465.71,804.47L468.22,804.99L471.30,794.39L473.71,795.11L476.19,787.86L474.56,782.36L477.70,777.35L482.52,774.24L483.87,769.05L486.39,767.54L484.93,763.32L485.55,757.36L488.43,753.07L489.69,753.71L495.40,749.32L497.96,749.45L501.69,747.78L505.17,750.14L507.59,749.49L511.19,754.63L524.76,756.58L524.48,759.20L527.70,760.62L530.24,766.63L529.23,770.32L525.51,773.62L522.57,780.58L522.61,785.18L518.22,790.82L505.37,792.39L508.41,790.77L506.25,789.87L507.60,781.02L503.81,776.35L500.55,776.22L499.57,774.38L488.10,776.52L480.61,784.44L485.18,791.13L490.89,795.45L496.50,793.36L500.02,795.59L503.54,792.79L505.31,798.73L503.51,799.28L502.09,812.22L503.76,816.43L510.66,819.17L516.79,828.42L523.55,845.22L525.91,847.82L523.23,855.73L523.80,858.18L523.21,868.69L518.38,875.88L515.38,879.24L518.18,887.12L513.34,899.49L510.53,903.17L506.91,903.66L493.90,914.83L499.22,917.06L498.96,923.98L494.64,930.80L495.38,933.74L497.14,930.42L500.24,931.57L501.45,928.88L500.45,926.23L507.02,925.23L508.03,920.99L513.15,919.34L514.12,917.23L516.42,918.19L528.04,910.11L541.08,908.65L546.92,904.09L550.08,904.01L551.31,901.06L554.29,900.95L562.62,895.68L563.50,893.02L562.20,890.67L567.01,889.59L564.86,887.63L568.76,884.81L569.51,877.95L571.81,875.17L582.27,875.23L585.18,871.01L596.22,862.12L594.05,860.46L590.98,863.22L587.73,862.36L585.93,863.45L583.78,859.24L591.02,853.15L590.23,850.49L591.35,849.51L571.43,842.30L572.59,833.25L580.98,820.34L584.77,817.31L586.43,819.96L586.08,817.01L588.35,817.61L591.72,812.78L597.33,815.05L597.60,816.64L598.89,814.82L602.04,816.11L603.21,813.43L604.20,807.63L604.86,806.29L610.16,803.89L610.99,802.34L610.84,801.01L611.15,798.97L609.85,793.65L608.55,792.42L611.21,789.90L612.00,786.69L609.19,782.01L608.10,780.75L608.57,776.06L606.27,774.13L604.40,773.23L602.04,772.31L601.36,773.07L600.38,773.28L599.73,773.94L597.75,774.69L594.21,773.98L592.65,773.93L592.32,772.83L591.17,772.19L589.67,770.41L587.18,768.16L585.86,767.54L585.01,766.51L583.57,767.03L582.00,769.73L580.46,772.06L579.66,773.23L579.22,771.53L578.23,771.07L577.91,768.46L573.97,764.42L573.74,760.92L574.18,757.14L572.01,755.19L571.59,754.01L570.85,753.20L571.31,744.23L567.61,744.95L563.47,743.53L566.05,737.19L561.94,735.23L558.96,735.63L552.99,734.78L550.59,731.52L550.51,730.48L546.88,731.09L544.64,729.72L543.37,729.99L542.99,729.58L541.33,720.62L544.37,718.34L545.51,711.74L549.18,710.37L549.06,709.31L546.19,709.09L544.67,705.30L540.83,699.15L540.15,698.70L539.32,697.67L537.80,697.32L533.24,695.71L528.81,695.83L527.76,694.95L526.42,693.67L525.19,693.58L525.51,690.90L524.41,689.49L523.28,687.39L521.91,686.32L521.43,685.31L521.26,683.01L520.64,677.62L518.60,675.98L517.04,674.71L515.14,672.67L514.05,671.93L512.00,669.17L504.62,666.33L504.66,661.64L507.32,659.50L508.31,655.70L506.91,654.90L503.70,654.14L494.28,646.93L493.56,643.01L491.34,642.85L490.39,642.09L487.37,641.81L486.27,640.05L485.79,636.74L484.36,633.92L480.75,634.29L481.82,636.81L478.81,642.09L473.43,642.29L470.99,643.49L469.73,646.49L464.82,646.88L463.10,645.71L459.50,647.43L457.35,645.94L456.19,646.10L455.95,650.28L455.46,651.22L454.08,651.96L451.43,652.41L450.32,651.72L448.55,652.39L446.25,652.15L440.32,650.82L436.89,643.99ZM475.58,783.07L475.55,782.26L474.88,782.46L474.83,783.10L475.58,783.07ZM471.88,797.64L473.15,798.21L473.46,797.43L472.11,797.05L471.88,797.64ZM499.08,862.00L498.05,862.61L498.33,863.91L499.93,863.22L499.08,862.00ZM445.67,977.89L444.27,979.07L441.87,978.20L439.06,980.97L442.24,980.27L448.68,982.79L449.58,980.37L445.67,977.89ZM422.54,986.59L422.35,983.27L419.11,980.73L413.25,984.93L410.90,984.96L410.95,988.12L412.75,987.83L413.94,989.63L413.22,987.78L422.54,986.59ZM410.83,1071.30L404.53,1065.85L397.03,1063.01L395.05,1065.37L392.99,1062.36L389.62,1062.73L390.31,1061.17L387.49,1062.05L385.62,1060.73L390.84,1069.29L396.05,1068.01L395.14,1073.01L399.06,1077.89L403.28,1077.21L405.42,1074.23L410.60,1074.92L410.83,1071.30ZM434.75,1089.56L438.04,1103.14L440.40,1104.58L442.53,1109.32L442.56,1117.13L444.24,1116.85L447.54,1123.52L458.74,1126.84L461.74,1125.42L465.76,1127.06L467.58,1125.26L470.85,1126.17L479.43,1123.60L493.99,1108.74L497.82,1090.54L494.62,1085.56L482.37,1080.99L482.05,1079.07L476.80,1076.89L470.41,1071.59L467.10,1072.26L463.43,1069.37L461.00,1070.18L460.70,1065.97L459.49,1069.85L455.04,1067.99L453.50,1069.07L453.50,1074.08L449.84,1076.25L443.84,1084.42L435.11,1085.43L434.75,1089.56ZM508.90,753.86L508.47,753.49L508.07,753.62L507.91,754.36L508.90,753.86ZM509.24,776.82L508.65,776.56L508.42,777.69L508.98,777.46L509.24,776.82ZM592.92,823.39L592.46,824.39L593.03,825.38L593.46,824.63L592.92,823.39ZM534.34,995.69L533.49,1001.21L537.41,1001.61L539.06,1000.25L539.83,997.68L537.61,991.45L534.34,995.69ZM584.69,1009.11L583.42,992.26L585.72,985.62L583.36,983.51L583.39,979.79L581.69,978.85L581.32,974.08L579.88,973.06L576.74,977.32L575.02,976.75L574.86,979.12L569.00,986.43L569.94,991.36L566.14,997.52L566.84,999.49L565.34,999.71L566.25,1002.08L563.46,1001.61L560.24,1009.51L555.57,1014.91L556.87,1016.69L555.62,1021.07L557.20,1024.18L558.10,1034.81L556.32,1040.39L549.98,1053.30L542.69,1062.91L540.14,1067.40L535.71,1067.10L539.33,1079.15L537.60,1090.93L540.77,1097.35L543.04,1097.60L545.90,1093.66L554.48,1089.65L561.16,1090.28L560.60,1085.45L564.06,1083.74L561.19,1078.12L563.62,1073.83L560.20,1070.21L559.19,1068.42L561.32,1067.69L561.45,1065.80L560.07,1063.68L563.55,1057.84L563.57,1054.51L567.02,1050.52L567.92,1046.20L570.96,1046.12L574.27,1043.68L575.10,1036.28L579.85,1031.92L579.37,1025.82L580.62,1022.99L578.70,1021.37L578.98,1018.92L581.92,1010.62L584.69,1009.11Z", regionD: "M575.63,840.03L574.99,837.53L572.85,837.73L573.48,841.19L575.63,840.03ZM405.95,616.60L405.29,614.40L409.76,610.31L411.43,610.75L411.25,606.52L408.44,604.87L409.22,603.99L404.10,605.65L404.29,607.98L401.02,608.43L399.85,617.57L402.61,615.17L405.95,616.60ZM403.33,618.04L401.89,616.99L402.76,619.13L403.39,618.91L403.33,618.04ZM394.77,615.34L394.12,613.41L392.03,617.18L391.08,616.34L389.79,620.35L388.31,620.14L390.38,624.23L391.74,618.80L394.77,615.34ZM393.19,620.62L394.13,620.01L393.93,619.62L393.25,619.92L393.19,620.62ZM393.10,624.43L393.21,623.63L392.37,624.03L392.51,624.52L393.10,624.43ZM401.34,623.99L400.83,623.82L400.45,624.74L401.34,623.99ZM398.02,629.30L399.15,628.21L399.39,625.73L398.05,625.88L398.66,624.26L395.83,619.57L396.21,624.03L394.36,625.43L397.26,628.73L396.44,627.02L398.73,627.92L398.02,629.30ZM381.11,626.73L381.86,628.01L377.60,626.72L376.83,628.35L378.04,628.98L376.74,629.80L379.52,630.53L377.44,630.82L378.62,632.30L376.17,632.31L377.21,633.67L375.26,633.47L373.69,635.36L377.45,638.16L378.90,641.48L378.38,649.50L383.72,654.60L385.39,654.30L385.97,657.44L387.82,658.54L390.31,657.11L392.25,650.25L391.28,648.38L399.00,642.40L398.10,638.52L394.24,639.20L394.48,633.50L397.07,631.31L395.19,631.37L391.47,623.36L389.33,627.03L387.61,624.21L387.16,627.09L385.92,626.55L387.28,631.32L382.31,626.62L381.11,626.73ZM395.28,660.18L398.59,665.78L397.66,671.42L395.05,673.60L395.20,676.56L392.56,677.14L392.47,680.80L398.83,687.98L401.26,699.02L401.52,707.30L399.01,713.36L395.42,716.18L396.72,717.88L395.96,720.31L389.85,732.63L392.74,736.68L393.99,744.13L395.20,744.80L399.35,742.38L407.33,748.64L408.17,750.92L409.83,751.03L409.00,752.40L410.55,752.74L409.39,754.49L413.14,755.23L415.87,759.23L417.86,765.79L421.70,766.91L424.60,774.35L425.81,786.79L424.02,800.34L421.14,809.11L412.25,825.22L404.22,829.49L402.92,831.92L395.39,829.66L395.48,824.60L394.09,825.49L394.12,829.35L392.87,826.79L390.74,826.79L388.41,821.88L383.35,828.54L378.97,825.92L377.00,828.69L380.12,827.70L382.52,829.14L389.48,838.42L391.56,840.40L394.94,840.34L394.85,843.22L397.23,842.57L398.95,844.98L397.83,848.42L391.34,850.92L395.16,853.12L400.13,851.84L402.30,854.70L401.63,856.91L396.75,858.34L397.15,861.32L399.93,859.61L400.55,861.37L403.27,861.76L400.07,863.60L403.16,865.25L399.99,866.87L400.59,869.74L405.39,867.32L406.38,868.89L410.27,868.13L413.72,869.79L414.59,865.75L416.86,865.15L419.84,865.48L423.28,868.37L433.03,869.20L440.38,868.78L446.39,870.53L452.48,869.35L458.19,872.91L462.96,878.88L464.47,882.65L462.89,883.85L462.97,888.51L467.59,891.45L473.34,887.78L479.86,892.86L481.65,887.34L488.10,887.04L491.16,884.66L491.91,880.67L490.48,880.29L489.80,882.14L488.85,879.56L494.88,877.12L493.21,871.02L496.75,865.44L488.48,863.77L484.03,858.75L482.36,858.98L479.13,856.00L474.96,851.44L471.25,839.57L471.41,837.06L473.58,835.45L471.84,832.84L469.48,834.26L466.59,828.94L464.04,817.22L464.44,815.81L468.02,816.27L468.15,814.34L463.98,812.38L464.38,809.85L465.36,810.45L464.05,809.12L467.85,810.76L468.93,807.62L465.45,805.69L465.71,804.47L468.22,804.99L471.30,794.39L473.71,795.11L476.19,787.86L474.56,782.36L477.70,777.35L482.52,774.24L483.87,769.05L486.39,767.54L484.93,763.32L485.55,757.36L488.43,753.07L489.69,753.71L495.40,749.32L497.96,749.45L501.69,747.78L505.17,750.14L507.59,749.49L511.19,754.63L524.76,756.58L524.48,759.20L527.70,760.62L530.24,766.63L529.23,770.32L525.51,773.62L522.57,780.58L522.61,785.18L518.22,790.82L505.37,792.39L508.41,790.77L506.25,789.87L507.60,781.02L503.81,776.35L500.55,776.22L499.57,774.38L488.10,776.52L480.61,784.44L485.18,791.13L490.89,795.45L496.50,793.36L500.02,795.59L503.54,792.79L505.31,798.73L503.51,799.28L502.09,812.22L503.76,816.43L510.66,819.17L516.79,828.42L523.55,845.22L525.91,847.82L523.23,855.73L523.80,858.18L523.21,868.69L518.38,875.88L515.38,879.24L518.18,887.12L513.34,899.49L510.53,903.17L506.91,903.66L493.90,914.83L499.22,917.06L498.96,923.98L494.64,930.80L495.38,933.74L497.14,930.42L500.24,931.57L501.45,928.88L500.45,926.23L507.02,925.23L508.03,920.99L513.15,919.34L514.12,917.23L516.42,918.19L528.04,910.11L541.08,908.65L546.92,904.09L550.08,904.01L551.31,901.06L554.29,900.95L562.62,895.68L563.50,893.02L562.20,890.67L567.01,889.59L564.86,887.63L568.76,884.81L569.51,877.95L571.81,875.17L582.27,875.23L585.18,871.01L596.22,862.12L594.05,860.46L590.98,863.22L587.73,862.36L585.93,863.45L583.78,859.24L591.02,853.15L590.23,850.49L591.35,849.51L571.43,842.30L572.59,833.25L580.98,820.34L584.77,817.31L586.43,819.96L586.08,817.01L588.35,817.61L591.72,812.78L597.33,815.05L597.60,816.64L598.89,814.82L602.04,816.11L603.21,813.43L604.20,807.63L604.86,806.29L610.16,803.89L610.99,802.34L610.84,801.01L611.15,798.97L609.85,793.65L608.55,792.42L611.21,789.90L612.00,786.69L609.19,782.01L608.10,780.75L608.57,776.06L606.27,774.13L604.40,773.23L602.04,772.31L601.36,773.07L600.38,773.28L599.73,773.94L597.75,774.69L594.21,773.98L592.65,773.93L592.32,772.83L591.17,772.19L589.67,770.41L587.18,768.16L585.86,767.54L585.01,766.51L583.57,767.03L582.00,769.73L580.46,772.06L579.66,773.23L579.22,771.53L578.23,771.07L577.91,768.46L573.97,764.42L573.74,760.92L574.18,757.14L572.01,755.19L571.59,754.01L570.85,753.20L571.31,744.23L567.61,744.95L563.47,743.53L566.05,737.19L561.94,735.23L558.96,735.63L552.99,734.78L550.59,731.52L550.51,730.48L546.88,731.09L544.64,729.72L543.37,729.99L542.99,729.58L541.33,720.62L544.37,718.34L545.51,711.74L549.18,710.37L549.06,709.31L546.19,709.09L544.67,705.30L540.83,699.15L540.15,698.70L539.32,697.67L537.80,697.32L533.24,695.71L528.81,695.83L527.76,694.95L526.42,693.67L525.19,693.58L525.51,690.90L524.41,689.49L523.28,687.39L521.91,686.32L521.43,685.31L521.26,683.01L520.64,677.62L518.60,675.98L517.04,674.71L515.14,672.67L514.05,671.93L512.00,669.17L504.62,666.33L504.66,661.64L507.32,659.50L508.31,655.70L506.91,654.90L503.70,654.14L494.28,646.93L493.56,643.01L491.34,642.85L490.39,642.09L487.37,641.81L486.27,640.05L485.79,636.74L484.36,633.92L480.75,634.29L481.82,636.81L478.81,642.09L473.43,642.29L470.99,643.49L469.73,646.49L464.82,646.88L463.10,645.71L459.50,647.43L457.35,645.94L456.19,646.10L455.95,650.28L455.46,651.22L454.08,651.96L451.43,652.41L450.32,651.72L448.55,652.39L446.25,652.15L440.32,650.82L436.89,643.99L431.10,638.86L431.82,642.94L429.57,646.88L420.37,653.85L414.84,653.38L412.27,651.70L412.07,648.81L410.23,648.98L410.58,651.10L407.85,648.81L404.10,648.81L398.62,649.89L392.96,653.25L390.83,658.91L390.89,661.39L393.51,663.23L393.24,661.22L395.28,660.18ZM391.03,674.87L389.42,673.77L389.86,675.49L390.57,675.57L391.03,674.87ZM324.95,716.44L320.67,718.99L321.63,723.13L323.70,721.98L325.07,722.97L323.65,725.74L327.15,726.24L327.18,730.52L332.63,727.89L333.99,725.09L336.88,727.10L338.17,726.44L339.51,722.16L336.99,720.42L339.47,718.67L337.95,715.01L341.00,714.30L341.02,713.61L333.88,714.17L336.77,718.91L335.11,720.55L328.87,716.94L322.56,710.47L318.89,710.83L315.09,715.85L316.01,720.55L318.96,721.92L320.40,713.84L321.43,717.42L324.95,716.44ZM320.20,725.83L320.94,723.82L320.41,724.53L319.05,724.84L320.20,725.83ZM319.15,729.99L320.61,728.11L319.90,726.55L315.82,728.17L314.33,731.97L316.33,737.58L318.41,735.57L316.81,733.88L321.03,731.73L319.15,729.99ZM306.33,746.08L304.15,745.56L302.06,747.78L300.56,746.99L291.27,750.83L289.43,752.47L290.43,754.89L288.10,756.04L288.62,758.40L285.25,764.53L286.23,765.90L281.23,766.57L282.95,772.78L286.36,773.63L286.83,775.88L289.31,775.92L289.42,773.44L291.38,772.22L293.14,775.91L292.54,773.25L298.13,767.87L295.78,766.36L295.49,763.76L299.38,759.73L298.49,755.00L300.35,752.15L302.18,752.23L302.45,753.93L304.72,753.28L306.73,745.53L311.82,740.39L309.97,737.18L311.86,735.03L309.73,735.35L308.23,733.59L307.33,737.56L309.10,739.21L307.74,741.95L306.16,741.84L307.31,743.46L306.33,746.08ZM389.53,843.96L390.41,840.96L388.97,842.10L388.61,843.90L389.53,843.96ZM242.15,880.94L241.38,879.34L240.68,881.33L242.24,883.26L242.15,880.94ZM233.40,888.34L236.02,887.77L237.40,882.88L235.91,882.28L235.37,885.29L233.40,888.34ZM240.37,967.95L239.99,966.98L239.40,967.22L239.33,967.94L240.37,967.95ZM233.48,971.06L233.21,970.49L232.11,971.23L232.16,972.22L233.48,971.06ZM508.90,753.86L508.47,753.49L508.07,753.62L507.91,754.36L508.90,753.86ZM508.42,777.69L508.98,777.46L509.24,776.82L508.65,776.56L508.42,777.69ZM475.58,783.07L475.55,782.26L474.88,782.46L474.83,783.10L475.58,783.07ZM471.88,797.64L473.15,798.21L473.46,797.43L472.11,797.05L471.88,797.64ZM499.93,863.22L499.08,862.00L498.05,862.61L498.33,863.91L499.93,863.22ZM593.03,825.38L593.46,824.63L592.92,823.39L592.46,824.39L593.03,825.38Z", regionViewBox: { x: 230.6, y: 602.5, w: 382.9, h: 371.3 }, fullViewBox: { x: 117.2, y: 586.3, w: 512.5, h: 918.8 } }
];

// 県の共通輪郭パス(KYUSHU_PREFS の d)には含まれていない離島の市町村。
// これらは自分自身のd(境界線)に白塗り+枠線を別途つけてあげないと、
// 地図の上で「白い陸地」として表示されない(内陸の市町村境界のような見た目の乱れを防ぐため、
// この一覧に含まれるものだけに絞って適用する)。
const STANDALONE_ISLAND_MUNI_IDS = new Set([
  '46222', '46523', '46524', '46525', '46527', '46529', '46530', '46531', '46532', '46533', '46534', '46535',
]);

const KYUSHU_MUNICIPALITIES = [
  { id: '41201', name: '佐賀市', nameEn: 'Saga', prefId: '41', cx: 410.8, cy: 347.8, d: "M426.86,317.74L424.22,323.31L421.07,326.00L413.78,328.29L412.75,332.25L416.99,334.21L415.97,336.76L419.36,341.08L420.39,339.38L425.02,339.90L427.46,352.36L427.41,354.38L425.98,354.71L427.69,366.71L429.08,365.17L434.12,364.86L434.17,368.10L433.47,370.18L435.26,371.92L434.65,374.25L427.49,377.18L427.03,382.17L428.42,383.80L429.72,384.17L430.32,390.87L430.29,394.26L415.90,392.67L415.31,388.89L407.95,381.73L408.51,378.63L406.90,378.53L406.96,381.34L403.65,381.24L403.35,381.05L404.37,378.20L403.25,378.26L400.94,367.58L403.33,365.06L406.49,365.94L406.53,360.98L402.44,346.88L399.14,343.89L384.74,344.33L384.44,333.73L387.18,330.82L387.66,326.61L390.60,325.19L388.32,324.97L387.95,323.41L390.12,321.01L390.30,311.95L393.29,312.20L394.55,310.17L398.17,308.49L401.96,309.27L404.12,309.13L406.43,310.25L408.17,311.11L409.27,309.83L413.38,309.12L417.48,312.98L419.06,313.54L422.56,314.19L426.86,317.74Z" },
  { id: '41202', name: '唐津市', nameEn: 'Karatsu', prefId: '41', cx: 354.6, cy: 325.6, d: "M352.42,308.75L352.97,310.64L351.31,310.51L351.04,309.34L352.42,308.75ZM348.59,292.85L348.64,296.60L346.64,296.48L348.59,292.85ZM390.30,311.95L390.12,321.01L387.95,323.41L388.32,324.97L390.60,325.19L387.66,326.61L387.18,330.82L384.44,333.73L384.74,344.33L381.46,344.11L370.03,354.17L361.58,359.75L360.11,358.93L359.64,358.38L356.24,353.41L356.14,350.26L352.77,347.31L350.37,347.47L346.24,342.47L344.81,342.49L345.60,346.93L344.45,348.19L342.27,342.84L338.35,339.64L336.01,334.44L337.19,330.71L333.72,325.99L328.94,327.10L329.33,331.32L327.75,332.18L325.33,330.67L325.13,326.28L321.54,327.51L316.16,325.33L316.77,322.92L307.86,316.21L309.39,314.10L312.18,315.13L312.76,313.39L310.10,310.78L312.80,307.42L317.12,309.01L317.00,311.75L319.42,312.80L318.90,316.17L320.68,317.67L322.45,317.08L324.86,317.41L324.46,320.23L328.34,320.74L332.03,312.01L333.79,311.21L332.14,306.36L323.59,300.94L321.87,299.88L323.50,295.46L321.71,294.28L322.42,290.36L323.92,292.79L328.95,295.18L332.31,291.43L334.79,291.40L335.84,293.15L339.37,292.43L339.13,294.55L344.10,296.35L345.02,299.41L347.63,300.93L340.82,308.43L343.02,310.74L346.76,308.04L348.03,309.98L345.64,311.68L347.94,315.18L353.97,317.19L359.90,316.99L362.39,315.59L362.62,311.54L368.76,310.73L375.25,311.40L376.26,309.88L381.95,309.96L383.88,311.25L385.96,309.52L387.73,309.67L390.30,311.95ZM328.94,286.77L330.77,290.68L327.14,292.66L327.23,288.86L328.94,286.77ZM303.02,283.02L304.73,283.17L305.66,285.71L303.50,287.79L298.64,285.49L300.20,283.04L301.58,284.24L303.02,283.02ZM321.19,280.67L320.87,282.47L319.31,281.28L321.19,280.67ZM332.47,277.61L333.50,279.72L331.79,280.08L331.31,279.21L332.47,277.61ZM324.89,274.22L324.15,277.82L325.71,279.39L325.29,281.69L321.72,278.83L324.89,274.22Z" },
  { id: '41203', name: '鳥栖市', nameEn: 'Tosu', prefId: '41', cx: 459.4, cy: 334.6, d: "M470.07,330.41L470.10,337.43L468.82,343.31L466.86,344.00L463.72,343.03L461.01,347.68L456.84,346.35L454.53,342.25L452.35,341.97L447.93,328.80L448.77,325.03L452.20,323.94L452.15,322.67L453.08,321.94L461.52,327.53L466.89,326.16L470.07,330.41Z" },
  { id: '41204', name: '多久市', nameEn: 'Taku', prefId: '41', cx: 376.9, cy: 359.8, d: "M360.11,358.93L361.58,359.75L370.03,354.17L381.46,344.11L384.74,344.33L383.63,351.26L385.81,351.54L388.03,353.60L387.86,355.91L390.30,357.14L389.59,359.65L393.29,366.57L389.64,368.26L388.47,366.11L383.95,367.51L381.05,370.64L378.15,369.40L376.33,370.44L367.72,368.25L366.07,369.53L362.77,366.37L360.07,366.73L360.11,358.93Z" },
  { id: '41205', name: '伊万里市', nameEn: 'Imari', prefId: '41', cx: 330.2, cy: 353.6, d: "M325.33,330.67L327.75,332.18L329.33,331.32L328.94,327.10L333.72,325.99L337.19,330.71L336.01,334.44L338.35,339.64L342.27,342.84L344.45,348.19L345.60,346.93L344.81,342.49L346.24,342.47L350.37,347.47L352.77,347.31L356.14,350.26L356.24,353.41L359.64,358.38L350.23,360.42L345.89,365.48L344.13,364.89L339.49,371.73L332.26,373.31L328.39,372.84L324.55,368.85L314.44,370.11L311.09,365.85L309.49,364.83L303.70,356.66L302.65,356.41L306.42,345.85L309.15,343.93L312.32,344.46L318.14,355.70L320.50,357.43L320.85,355.83L322.32,356.68L321.40,353.89L318.08,353.05L317.47,350.98L319.15,351.15L321.44,347.11L320.19,345.97L318.56,346.84L317.95,345.09L321.66,343.15L321.97,337.76L325.73,335.01L325.33,330.67Z" },
  { id: '41206', name: '武雄市', nameEn: 'Takeo', prefId: '41', cx: 353.8, cy: 378.7, d: "M359.64,358.38L360.11,358.93L360.07,366.73L362.77,366.37L366.07,369.53L367.72,368.25L376.33,370.44L374.16,375.57L375.21,378.02L373.14,379.43L372.17,383.26L369.23,383.88L370.61,386.29L361.34,389.88L360.30,392.23L358.42,391.45L355.04,393.12L355.16,394.66L351.67,395.89L352.87,400.04L343.78,401.90L344.85,397.21L341.07,387.97L338.50,385.76L336.48,386.42L336.71,383.65L332.26,373.31L339.49,371.73L344.13,364.89L345.89,365.48L350.23,360.42L359.64,358.38Z" },
  { id: '41207', name: '鹿島市', nameEn: 'Kashima', prefId: '41', cx: 374.2, cy: 414.5, d: "M381.90,399.92L381.50,403.51L385.35,407.88L386.25,412.65L390.50,416.72L374.95,425.94L374.63,429.21L370.47,432.69L367.29,433.12L363.72,428.53L363.78,423.60L362.29,422.10L364.48,413.70L362.63,409.63L367.99,404.49L370.32,404.90L371.82,396.67L377.97,396.59L381.90,399.92Z" },
  { id: '41208', name: '小城市', nameEn: 'Ogi', prefId: '41', cx: 396.4, cy: 359.4, d: "M384.74,344.33L399.14,343.89L402.44,346.88L406.53,360.98L406.49,365.94L403.33,365.06L400.94,367.58L403.25,378.26L404.37,378.20L403.35,381.05L397.07,380.46L394.97,377.75L396.98,377.64L396.85,375.72L392.47,372.27L388.82,371.96L389.64,368.26L393.29,366.57L389.59,359.65L390.30,357.14L387.86,355.91L388.03,353.60L385.81,351.54L383.63,351.26L384.74,344.33Z" },
  { id: '41209', name: '嬉野市', nameEn: 'Ureshino', prefId: '41', cx: 357.5, cy: 405.5, d: "M343.78,401.90L352.87,400.04L351.67,395.89L355.16,394.66L355.04,393.12L358.42,391.45L360.30,392.23L361.34,389.88L370.61,386.29L373.07,391.32L369.69,396.59L371.82,396.67L370.32,404.90L367.99,404.49L362.63,409.63L364.48,413.70L362.29,422.10L363.78,423.60L363.72,428.53L360.19,426.43L360.06,424.45L357.40,425.16L354.44,423.10L352.94,417.49L350.63,415.27L349.50,415.12L341.12,410.91L339.89,407.34L337.60,406.80L339.84,401.62L343.78,401.90Z" },
  { id: '41210', name: '神埼市', nameEn: 'Kanzaki', prefId: '41', cx: 429.2, cy: 342.1, d: "M434.17,368.10L434.12,364.86L429.08,365.17L427.69,366.71L425.98,354.71L427.41,354.38L427.46,352.36L425.02,339.90L420.39,339.38L419.36,341.08L415.97,336.76L416.99,334.21L412.75,332.25L413.78,328.29L421.07,326.00L424.22,323.31L426.86,317.74L428.07,317.64L430.29,320.60L431.94,320.18L435.09,322.68L436.26,327.79L432.28,331.65L434.86,334.54L436.23,349.70L439.09,358.42L440.07,357.61L441.81,361.92L443.48,362.07L443.92,363.77L442.93,366.02L440.19,367.02L439.75,364.40L437.38,364.89L436.62,369.06L434.17,368.10Z" },
  { id: '41327', name: '吉野ヶ里町', nameEn: 'Yoshinogari', prefId: '41', cx: 439.0, cy: 338.5, d: "M440.07,357.61L439.09,358.42L436.23,349.70L434.86,334.54L432.28,331.65L436.26,327.79L435.09,322.68L439.31,322.27L442.97,326.62L441.39,329.31L442.09,330.21L443.95,333.08L442.11,339.02L443.77,345.09L441.06,354.96L440.07,357.61Z" },
  { id: '41341', name: '基山町', nameEn: 'Kiyama', prefId: '41', cx: 463.1, cy: 322.5, d: "M470.07,330.41L466.89,326.16L461.52,327.53L453.08,321.94L459.23,318.97L460.26,317.70L463.51,316.61L468.33,318.53L469.12,322.35L469.91,323.62L470.07,330.41Z" },
  { id: '41345', name: '上峰町', nameEn: 'Kamimine', prefId: '41', cx: 444.5, cy: 344.3, d: "M441.06,354.96L443.77,345.09L442.11,339.02L443.95,333.08L442.09,330.21L444.58,329.35L446.63,344.34L445.14,345.64L448.09,351.88L446.68,354.29L443.16,353.62L443.23,354.96L441.06,354.96Z" },
  { id: '41346', name: 'みやき町', nameEn: 'Miyaki', prefId: '41', cx: 449.2, cy: 348.0, d: "M447.93,328.80L452.35,341.97L454.53,342.25L456.84,346.35L456.21,347.57L458.86,350.10L457.90,352.55L454.01,352.91L451.64,353.91L451.77,355.67L453.91,356.54L453.62,357.92L450.16,359.54L450.38,362.89L448.82,363.16L447.25,360.17L447.98,356.78L445.49,356.59L446.36,359.01L443.48,362.07L441.81,361.92L440.07,357.61L441.06,354.96L443.23,354.96L443.16,353.62L446.68,354.29L448.09,351.88L445.14,345.64L446.63,344.34L444.58,329.35L447.93,328.80Z" },
  { id: '41387', name: '玄海町', nameEn: 'Genkai', prefId: '41', cx: 325.7, cy: 309.4, d: "M323.59,300.94L332.14,306.36L333.79,311.21L332.03,312.01L328.34,320.74L324.46,320.23L324.86,317.41L322.45,317.08L323.67,312.66L321.73,309.97L318.94,310.84L320.94,308.61L317.77,302.50L318.00,298.83L323.59,300.94Z" },
  { id: '41401', name: '有田町', nameEn: 'Arita', prefId: '41', cx: 325.2, cy: 379.4, d: "M314.44,370.11L324.55,368.85L328.39,372.84L332.26,373.31L336.71,383.65L336.48,386.42L338.50,385.76L341.07,387.97L335.28,388.77L334.09,389.80L330.28,390.28L329.84,388.95L315.10,383.15L312.90,376.45L314.44,370.11Z" },
  { id: '41423', name: '大町町', nameEn: 'Omachi', prefId: '41', cx: 378.9, cy: 374.9, d: "M376.33,370.44L378.15,369.40L381.05,370.64L383.66,375.28L383.06,377.08L381.22,380.21L375.21,378.02L374.16,375.57L376.33,370.44Z" },
  { id: '41424', name: '江北町', nameEn: 'Kohoku', prefId: '41', cx: 388.1, cy: 374.4, d: "M381.05,370.64L383.95,367.51L388.47,366.11L389.64,368.26L388.82,371.96L392.47,372.27L396.85,375.72L396.98,377.64L394.97,377.75L392.40,379.26L390.52,378.53L388.41,382.13L383.84,380.36L384.50,378.49L383.06,377.08L383.66,375.28L381.05,370.64Z" },
  { id: '41425', name: '白石町', nameEn: 'Shiroishi', prefId: '41', cx: 385.5, cy: 388.3, d: "M403.35,381.05L403.65,381.24L401.72,388.05L394.86,392.82L395.32,393.95L386.25,401.24L381.90,399.92L377.97,396.59L371.82,396.67L369.69,396.59L373.07,391.32L370.61,386.29L369.23,383.88L372.17,383.26L373.14,379.43L375.21,378.02L381.22,380.21L383.06,377.08L384.50,378.49L383.84,380.36L388.41,382.13L390.52,378.53L392.40,379.26L394.97,377.75L397.07,380.46L403.35,381.05Z" },
  { id: '41441', name: '太良町', nameEn: 'Tara', prefId: '41', cx: 386.4, cy: 430.5, d: "M402.10,440.05L401.83,441.14L400.13,441.54L400.56,439.85L402.10,440.05ZM370.47,432.69L374.63,429.21L374.95,425.94L390.50,416.72L396.04,432.43L399.14,433.06L402.19,439.08L399.18,440.50L383.94,437.45L382.20,437.53L373.21,436.08L370.47,432.69Z" },
  { id: '44201', name: '大分市', nameEn: 'Oita', prefId: '44', cx: 705.1, cy: 384.5, d: "M772.61,359.32L770.21,361.27L768.99,359.80L772.61,359.32ZM749.65,382.21L747.74,377.73L746.37,377.58L738.05,381.80L729.71,383.71L727.01,386.21L725.64,385.14L721.63,390.58L722.93,392.38L721.24,395.38L720.72,403.89L718.88,405.96L719.17,409.81L716.16,410.27L713.16,407.96L709.45,407.25L705.56,408.76L697.43,403.79L693.78,405.03L690.97,403.90L686.64,399.99L676.64,404.40L674.24,406.44L675.41,407.65L673.88,410.41L669.62,411.86L666.37,410.58L665.69,405.84L663.02,406.02L658.66,409.63L657.61,406.41L660.80,402.19L659.99,396.47L663.00,393.69L666.00,394.62L666.48,392.47L667.85,392.86L672.82,387.83L675.87,387.17L679.30,381.49L682.70,379.46L681.94,375.29L684.14,369.91L683.67,368.32L679.50,367.06L678.80,362.82L694.08,367.78L696.41,365.04L708.88,360.85L710.67,364.69L711.85,364.12L710.70,360.45L712.63,359.66L714.52,362.60L713.63,359.35L716.03,359.28L721.05,362.08L720.50,364.22L721.73,362.55L729.42,368.82L729.44,366.09L738.45,368.64L751.24,365.26L754.29,366.99L753.52,364.52L761.18,362.29L758.23,368.19L756.05,368.14L754.39,371.14L755.67,372.76L752.13,378.12L753.92,378.95L749.65,382.21Z" },
  { id: '44202', name: '別府市', nameEn: 'Beppu', prefId: '44', cx: 664.9, cy: 357.8, d: "M678.80,362.82L679.50,367.06L675.82,366.80L675.66,373.25L669.87,372.06L666.67,368.60L654.42,372.54L649.68,370.97L649.00,367.38L652.26,363.13L651.57,359.06L657.99,356.44L658.50,351.92L660.81,349.62L659.54,347.57L656.32,349.24L653.39,347.72L653.86,341.53L657.09,341.70L660.66,343.26L668.87,340.44L674.22,342.45L676.79,360.32L678.80,362.82Z" },
  { id: '44203', name: '中津市', nameEn: 'Nakatsu', prefId: '44', cx: 595.1, cy: 312.8, d: "M627.71,283.48L626.33,290.43L623.70,290.31L622.05,294.53L626.47,304.07L623.63,308.63L619.81,309.39L622.66,325.71L616.20,326.64L617.07,329.53L615.42,332.24L617.20,334.25L614.20,338.65L610.44,341.94L608.66,339.93L606.28,340.55L603.96,336.51L600.85,337.56L599.19,334.31L596.81,334.54L594.74,336.95L589.22,331.87L582.65,333.09L580.26,338.82L573.43,339.38L570.01,330.88L563.20,325.97L560.73,321.68L556.57,320.49L555.80,317.38L552.30,314.47L555.75,307.42L558.67,305.83L562.14,302.51L567.55,301.27L571.30,301.53L575.70,299.01L579.46,301.83L581.55,301.24L582.97,302.10L590.62,301.86L593.50,303.29L605.69,302.16L603.71,296.59L608.03,292.74L608.81,289.22L605.70,285.02L606.21,279.46L607.64,274.70L611.90,274.41L613.80,277.37L617.35,278.22L619.10,278.31L620.53,275.89L622.47,276.61L622.76,278.91L627.71,283.48Z" },
  { id: '44204', name: '日田市', nameEn: 'Hita', prefId: '44', cx: 557.6, cy: 368.1, d: "M552.30,314.47L555.80,317.38L556.57,320.49L560.73,321.68L563.20,325.97L570.01,330.88L573.43,339.38L580.26,338.82L581.59,339.23L580.44,345.00L583.40,344.98L583.85,348.20L582.12,347.77L577.16,355.72L576.18,362.38L576.91,364.47L582.54,362.88L583.36,366.56L587.45,369.85L585.60,382.08L580.97,380.49L576.37,380.73L575.75,382.19L574.10,382.68L571.60,384.81L566.83,383.32L566.55,384.94L564.69,391.24L563.47,393.79L569.98,402.25L573.20,407.54L570.35,411.99L571.85,413.54L570.77,416.37L568.76,421.30L566.10,423.57L561.70,423.58L559.34,420.20L558.86,417.70L554.19,415.70L551.69,416.49L550.21,415.58L548.12,413.23L546.68,413.45L543.72,407.56L538.96,405.67L534.47,405.89L534.72,402.52L538.47,400.00L538.76,398.70L540.54,392.46L542.32,391.08L541.01,387.34L543.62,385.22L543.99,382.71L533.09,376.59L538.03,371.93L530.90,370.01L531.16,367.97L531.43,364.81L539.84,363.14L536.42,359.78L537.51,357.89L539.48,356.09L538.46,353.31L536.11,344.89L532.85,343.16L538.50,338.37L538.06,335.76L543.65,334.18L545.59,317.35L548.93,316.44L552.30,314.47Z" },
  { id: '44205', name: '佐伯市', nameEn: 'Saiki', prefId: '44', cx: 733.7, cy: 458.4, d: "M766.33,498.22L767.21,499.56L766.07,501.37L765.11,500.03L766.33,498.22ZM762.41,484.74L765.51,486.08L765.54,487.45L762.23,487.05L762.41,484.74ZM797.96,435.22L798.97,438.71L797.13,440.84L796.31,438.51L797.96,435.22ZM768.09,425.52L769.90,425.68L767.21,429.11L769.77,430.38L764.13,434.24L762.80,432.20L765.84,429.56L765.56,426.62L768.09,425.52ZM669.67,470.49L673.74,467.13L679.80,465.77L688.74,458.64L694.35,459.42L694.36,456.61L697.86,455.03L698.33,449.10L702.66,449.86L700.45,447.01L702.96,444.24L704.70,444.65L705.77,441.72L709.03,439.55L710.52,441.61L713.73,441.77L720.74,437.29L728.73,436.65L730.18,437.77L735.45,434.82L733.68,428.71L737.55,422.86L737.01,420.90L743.85,422.27L746.54,419.62L758.31,419.09L762.14,415.35L768.60,413.34L776.07,416.10L782.47,411.97L785.03,415.18L781.04,415.36L777.71,417.84L766.48,416.62L764.64,423.12L760.77,427.00L762.26,429.54L761.28,431.48L760.05,429.85L758.31,431.62L764.04,437.09L764.42,435.58L766.22,436.37L765.62,438.41L768.13,439.17L768.37,441.15L770.39,439.63L773.23,443.04L774.04,441.17L776.27,442.04L778.03,444.80L782.45,439.82L781.30,445.22L784.07,446.47L789.23,444.69L789.12,441.54L791.34,442.86L797.13,442.64L799.46,443.83L800.00,446.75L791.94,445.58L791.52,448.12L789.42,445.42L787.49,445.80L783.73,449.30L784.01,453.24L780.52,450.97L780.75,449.42L777.48,449.26L778.85,457.00L781.39,455.21L784.57,457.01L773.73,468.06L771.16,466.02L771.92,469.72L769.99,471.14L772.73,470.61L773.71,474.58L775.55,472.11L778.06,473.57L779.25,471.98L776.79,469.48L779.02,468.26L783.62,470.59L783.60,473.13L776.88,477.73L775.82,481.92L774.05,481.29L773.52,478.14L770.73,478.21L770.94,480.64L768.32,483.77L765.55,481.31L765.94,479.59L764.21,480.99L764.79,483.50L761.91,481.58L761.11,483.65L759.41,482.76L760.44,479.31L758.10,479.03L757.41,482.37L759.39,485.17L758.16,485.71L755.12,482.27L755.43,485.16L753.80,486.19L756.19,489.34L754.47,491.97L756.84,492.49L754.87,494.83L749.20,495.97L748.58,493.02L749.62,488.78L749.52,484.11L749.69,482.26L752.00,478.33L751.72,474.47L746.52,474.90L744.39,472.34L742.17,473.23L737.84,474.34L736.42,471.40L732.48,470.57L726.60,471.23L724.41,475.85L723.74,480.52L719.23,487.00L716.96,486.23L712.69,487.81L709.40,487.62L705.07,487.32L702.74,486.95L695.66,486.11L693.80,487.29L691.93,489.67L689.73,491.38L685.08,490.37L682.76,490.20L677.57,487.48L677.17,485.46L678.72,479.65L675.42,477.22L675.68,476.41L673.59,475.87L671.52,473.53L669.67,470.49Z" },
  { id: '44206', name: '臼杵市', nameEn: 'Usuki', prefId: '44', cx: 727.4, cy: 411.5, d: "M713.16,407.96L716.16,410.27L719.17,409.81L718.88,405.96L720.72,403.89L721.24,395.38L722.93,392.38L721.63,390.58L725.64,385.14L727.01,386.21L729.71,383.71L738.05,381.80L746.37,377.58L747.74,377.73L749.65,382.21L746.19,383.97L743.81,388.78L745.25,391.81L739.31,397.92L746.18,398.09L748.94,400.65L753.86,396.63L755.82,396.71L755.07,398.44L756.90,398.91L760.41,397.09L762.87,397.73L749.84,403.75L745.78,403.86L744.88,405.77L736.80,409.80L735.38,411.27L736.57,415.15L740.49,415.37L737.01,420.90L737.55,422.86L733.68,428.71L735.45,434.82L730.18,437.77L728.73,436.65L720.74,437.29L713.73,441.77L710.52,441.61L709.03,439.55L708.58,434.76L705.74,429.17L703.40,428.21L703.29,423.37L704.35,420.73L706.32,421.76L708.93,420.23L707.81,412.86L709.41,409.74L713.16,407.96Z" },
  { id: '44207', name: '津久見市', nameEn: 'Tsukumi', prefId: '44', cx: 752.9, cy: 412.3, d: "M784.27,401.52L785.48,402.70L784.41,404.08L782.76,402.52L784.27,401.52ZM782.47,411.97L776.07,416.10L768.60,413.34L762.14,415.35L758.31,419.09L746.54,419.62L743.85,422.27L737.01,420.90L740.49,415.37L736.57,415.15L735.38,411.27L736.80,409.80L744.88,405.77L745.78,403.86L749.84,403.75L762.87,397.73L763.66,398.60L760.66,399.90L759.14,402.65L756.15,402.22L754.00,406.19L750.37,407.23L752.28,410.10L757.56,408.61L760.97,410.61L762.07,409.08L763.11,412.81L766.61,412.50L767.30,406.01L768.56,406.16L769.94,412.24L774.99,411.58L774.63,413.12L776.50,413.82L779.56,412.37L779.07,407.14L781.67,406.70L781.13,409.83L782.47,411.97ZM780.25,386.47L779.39,387.73L778.18,388.24L778.24,386.92L780.25,386.47Z" },
  { id: '44208', name: '竹田市', nameEn: 'Taketa', prefId: '44', cx: 638.1, cy: 430.2, d: "M666.00,394.62L663.00,393.69L659.99,396.47L660.80,402.19L657.61,406.41L654.79,408.91L653.47,411.41L654.55,413.11L652.73,414.33L655.02,415.14L654.95,417.20L651.53,421.65L649.07,422.12L649.88,425.52L657.48,428.84L658.60,437.57L652.14,452.57L653.77,459.45L651.05,462.99L652.97,464.43L650.83,468.00L642.28,472.82L638.35,471.59L637.02,468.75L631.04,465.52L626.15,460.51L626.54,459.33L624.48,459.89L622.21,455.20L622.16,448.54L620.67,444.57L621.90,440.40L620.77,439.13L622.81,438.75L624.35,435.30L620.93,433.97L621.03,430.76L615.88,425.24L615.36,422.03L614.41,416.11L609.36,410.03L611.91,406.81L618.69,407.06L623.02,398.57L630.46,399.21L634.54,403.10L642.01,403.04L644.63,401.55L643.59,399.52L647.18,398.21L651.66,391.35L663.84,391.83L666.00,394.62Z" },
  { id: '44209', name: '豊後高田市', nameEn: 'Bungotakada', prefId: '44', cx: 676.5, cy: 284.7, d: "M684.51,259.21L687.14,267.32L687.01,271.89L691.24,274.34L690.79,280.18L692.05,282.83L695.58,284.33L694.01,289.05L691.43,289.65L686.57,294.55L681.78,303.34L682.58,309.57L679.91,310.02L671.46,305.45L669.33,302.68L665.90,301.58L663.97,296.94L661.30,293.73L658.96,294.21L659.11,292.01L656.24,290.25L657.02,287.75L659.70,286.73L660.99,286.12L658.73,280.70L666.92,273.83L668.17,275.26L671.63,269.36L671.16,267.79L672.19,266.50L673.83,267.68L673.97,264.93L676.05,264.44L674.32,262.62L674.97,260.73L681.36,260.02L680.76,258.16L684.51,259.21Z" },
  { id: '44210', name: '杵築市', nameEn: 'Kitsuki', prefId: '44', cx: 682.9, cy: 317.0, d: "M663.97,296.94L665.90,301.58L669.33,302.68L671.46,305.45L679.91,310.02L682.58,309.57L681.78,303.34L686.57,294.55L691.43,289.65L694.01,289.05L693.25,295.04L696.74,302.70L698.23,311.22L702.49,312.41L704.01,314.96L708.46,314.61L707.14,319.45L709.83,320.38L714.13,319.47L716.66,316.31L721.77,316.89L718.05,327.46L714.87,327.41L709.29,323.27L703.98,323.08L702.17,326.19L706.35,330.89L705.80,335.16L700.02,335.98L698.71,331.41L693.79,329.95L690.13,331.68L689.50,329.47L687.36,329.09L688.22,325.04L686.55,321.99L684.49,322.38L684.27,324.23L679.78,327.85L680.35,329.73L677.68,329.76L677.19,331.16L671.63,331.69L671.02,332.91L664.95,330.80L664.89,335.52L660.65,339.70L659.00,335.81L655.23,335.03L654.90,333.66L660.69,320.13L659.02,311.63L655.06,307.58L658.35,302.63L661.85,303.69L661.92,301.37L659.69,299.17L663.97,296.94Z" },
  { id: '44211', name: '宇佐市', nameEn: 'Usa', prefId: '44', cx: 640.1, cy: 316.4, d: "M657.09,341.70L653.86,341.53L653.39,347.72L648.19,347.70L644.02,351.51L639.21,349.71L634.93,348.37L632.89,344.78L627.70,345.38L621.24,338.80L617.12,339.78L614.20,338.65L617.20,334.25L615.42,332.24L617.07,329.53L616.20,326.64L622.66,325.71L619.81,309.39L623.63,308.63L626.47,304.07L622.05,294.53L623.70,290.31L626.33,290.43L627.71,283.48L636.62,282.92L642.73,285.46L648.10,283.64L659.70,286.73L657.02,287.75L656.24,290.25L659.11,292.01L658.96,294.21L661.30,293.73L663.97,296.94L659.69,299.17L661.92,301.37L661.85,303.69L658.35,302.63L655.06,307.58L659.02,311.63L660.69,320.13L654.90,333.66L655.23,335.03L659.00,335.81L660.65,339.70L657.09,341.70Z" },
  { id: '44212', name: '豊後大野市', nameEn: 'Bungoono', prefId: '44', cx: 677.6, cy: 436.5, d: "M657.61,406.41L658.66,409.63L663.02,406.02L665.69,405.84L666.37,410.58L669.62,411.86L673.88,410.41L675.41,407.65L674.24,406.44L676.64,404.40L686.64,399.99L690.97,403.90L693.78,405.03L697.43,403.79L705.56,408.76L709.45,407.25L713.16,407.96L709.41,409.74L707.81,412.86L708.93,420.23L706.32,421.76L704.35,420.73L703.29,423.37L703.40,428.21L705.74,429.17L708.58,434.76L709.03,439.55L705.77,441.72L704.70,444.65L702.96,444.24L700.45,447.01L702.66,449.86L698.33,449.10L697.86,455.03L694.36,456.61L694.35,459.42L688.74,458.64L679.80,465.77L673.74,467.13L669.67,470.49L667.11,472.02L661.51,472.66L660.29,475.24L659.06,475.74L658.14,476.86L657.03,476.52L654.81,476.80L648.96,477.48L645.88,479.01L644.29,478.59L643.04,475.60L642.86,473.73L642.28,472.82L650.83,468.00L652.97,464.43L651.05,462.99L653.77,459.45L652.14,452.57L658.60,437.57L657.48,428.84L649.88,425.52L649.07,422.12L651.53,421.65L654.95,417.20L655.02,415.14L652.73,414.33L654.55,413.11L653.47,411.41L654.79,408.91L657.61,406.41Z" },
  { id: '44213', name: '由布市', nameEn: 'Yufu', prefId: '44', cx: 650.2, cy: 377.1, d: "M679.50,367.06L683.67,368.32L684.14,369.91L681.94,375.29L682.70,379.46L679.30,381.49L675.87,387.17L672.82,387.83L667.85,392.86L666.48,392.47L666.00,394.62L663.84,391.83L651.66,391.35L647.18,398.21L643.59,399.52L644.63,401.55L642.01,403.04L634.54,403.10L630.46,399.21L623.02,398.57L623.51,395.21L626.85,392.18L633.36,389.63L637.29,385.90L636.09,384.85L634.01,386.33L631.28,384.40L633.61,384.55L634.08,382.36L630.22,380.51L625.69,371.37L631.16,366.72L632.09,362.89L639.17,355.39L635.74,352.61L639.21,349.71L644.02,351.51L648.19,347.70L653.39,347.72L656.32,349.24L659.54,347.57L660.81,349.62L658.50,351.92L657.99,356.44L651.57,359.06L652.26,363.13L649.00,367.38L649.68,370.97L654.42,372.54L666.67,368.60L669.87,372.06L675.66,373.25L675.82,366.80L679.50,367.06Z" },
  { id: '44214', name: '国東市', nameEn: 'Kunisaki', prefId: '44', cx: 707.3, cy: 287.6, d: "M694.01,289.05L695.58,284.33L692.05,282.83L690.79,280.18L691.24,274.34L687.01,271.89L687.14,267.32L684.51,259.21L688.16,256.92L689.18,259.87L691.14,259.78L690.72,256.84L692.49,255.51L697.98,256.81L697.92,258.89L700.71,258.38L701.63,259.96L704.01,257.97L706.68,260.75L706.43,262.85L709.38,261.11L714.35,268.70L716.29,268.61L717.98,275.17L724.96,283.49L727.26,292.94L723.98,303.58L724.29,305.95L726.09,305.33L726.02,312.63L723.57,312.34L721.77,316.89L716.66,316.31L714.13,319.47L709.83,320.38L707.14,319.45L708.46,314.61L704.01,314.96L702.49,312.41L698.23,311.22L696.74,302.70L693.25,295.04L694.01,289.05Z" },
  { id: '44322', name: '姫島村', nameEn: 'Himeshima', prefId: '44', cx: 710.0, cy: 246.5, d: "M711.67,243.76L715.70,245.37L711.50,248.94L706.24,248.06L703.47,249.29L706.04,245.85L711.67,243.76Z" },
  { id: '44341', name: '日出町', nameEn: 'Hiji', prefId: '44', cx: 681.0, cy: 334.9, d: "M674.22,342.45L668.87,340.44L660.66,343.26L657.09,341.70L660.65,339.70L664.89,335.52L664.95,330.80L671.02,332.91L671.63,331.69L677.19,331.16L677.68,329.76L680.35,329.73L679.78,327.85L684.27,324.23L684.49,322.38L686.55,321.99L688.22,325.04L687.36,329.09L689.50,329.47L690.13,331.68L693.79,329.95L698.71,331.41L700.02,335.98L695.96,336.48L695.70,341.59L694.39,342.22L686.26,341.60L683.32,337.65L679.88,337.15L674.76,338.94L674.22,342.45Z" },
  { id: '44461', name: '九重町', nameEn: 'Kokonoe', prefId: '44', cx: 613.6, cy: 381.2, d: "M623.02,398.57L618.69,407.06L611.91,406.81L609.36,410.03L607.85,410.99L605.39,408.66L605.44,405.22L603.62,401.63L603.76,397.18L599.68,390.57L595.63,387.57L593.38,386.73L592.77,384.22L591.84,383.46L599.13,367.24L603.93,365.42L604.95,362.09L608.09,359.11L611.19,358.64L613.96,354.69L621.04,353.08L623.04,360.45L625.83,360.45L626.05,363.38L629.41,363.55L631.16,366.72L625.69,371.37L630.22,380.51L634.08,382.36L633.61,384.55L631.28,384.40L634.01,386.33L636.09,384.85L637.29,385.90L633.36,389.63L626.85,392.18L623.51,395.21L623.02,398.57Z" },
  { id: '44462', name: '玖珠町', nameEn: 'Kusu', prefId: '44', cx: 602.4, cy: 353.1, d: "M580.26,338.82L582.65,333.09L589.22,331.87L594.74,336.95L596.81,334.54L599.19,334.31L600.85,337.56L603.96,336.51L606.28,340.55L608.66,339.93L610.44,341.94L614.20,338.65L617.12,339.78L621.24,338.80L627.70,345.38L632.89,344.78L634.93,348.37L639.21,349.71L635.74,352.61L639.17,355.39L632.09,362.89L631.16,366.72L629.41,363.55L626.05,363.38L625.83,360.45L623.04,360.45L621.04,353.08L613.96,354.69L611.19,358.64L608.09,359.11L604.95,362.09L603.93,365.42L599.13,367.24L591.84,383.46L589.34,382.30L585.60,382.08L587.45,369.85L583.36,366.56L582.54,362.88L576.91,364.47L576.18,362.38L577.16,355.72L582.12,347.77L583.85,348.20L583.40,344.98L580.44,345.00L581.59,339.23L580.26,338.82Z" },
  { id: '45201', name: '宮崎市', nameEn: 'Miyazaki', prefId: '45', cx: 644.8, cy: 708.2, d: "M660.69,667.04L672.16,670.65L676.60,669.41L669.10,694.57L669.09,700.53L666.41,702.19L665.98,704.65L666.69,705.96L667.31,702.81L668.37,703.04L665.98,708.70L666.94,712.34L664.93,715.90L665.40,727.12L672.55,735.00L668.24,743.25L669.24,747.14L667.13,747.95L668.12,751.22L666.40,749.23L660.37,748.95L657.03,746.85L655.78,744.09L652.94,743.66L652.77,739.45L649.31,736.61L644.59,738.58L640.10,735.90L636.25,735.88L634.11,736.18L633.90,739.91L625.72,739.26L624.44,736.22L619.66,736.88L619.39,731.92L615.62,724.05L619.69,720.94L619.08,716.77L622.44,716.04L622.42,712.05L621.19,712.35L621.02,709.25L619.22,712.04L614.46,711.09L612.28,715.40L609.92,713.78L608.88,703.72L610.81,701.62L612.74,703.03L615.19,701.32L610.61,696.22L609.31,693.25L612.71,686.48L610.26,683.95L613.78,682.10L616.14,687.97L625.72,685.71L630.68,685.64L634.80,689.51L637.91,689.74L639.04,686.50L642.51,685.74L647.49,689.08L650.79,676.44L650.62,672.68L654.18,664.54L659.03,667.88L660.69,667.04Z" },
  { id: '45202', name: '都城市', nameEn: 'Miyakonojo', prefId: '45', cx: 584.9, cy: 729.0, d: "M610.61,696.22L615.19,701.32L612.74,703.03L610.81,701.62L608.88,703.72L609.92,713.78L612.28,715.40L614.46,711.09L619.22,712.04L621.02,709.25L621.19,712.35L622.42,712.05L622.44,716.04L619.08,716.77L619.69,720.94L615.62,724.05L619.39,731.92L612.44,738.78L611.93,741.24L607.33,742.68L604.62,747.46L599.94,746.32L595.12,737.77L591.89,738.43L590.09,741.08L591.24,743.58L588.51,753.85L592.75,756.79L595.12,762.20L599.12,764.52L602.35,763.89L611.37,772.35L609.49,776.64L608.57,776.06L606.27,774.13L604.40,773.23L602.04,772.31L601.36,773.07L600.38,773.28L599.73,773.94L597.75,774.69L594.21,773.98L592.65,773.93L592.32,772.83L591.17,772.19L589.67,770.41L587.18,768.16L585.86,767.54L585.01,766.51L583.57,767.03L582.00,769.73L580.46,772.06L579.66,773.23L579.22,771.53L578.23,771.07L577.91,768.46L573.97,764.42L573.74,760.92L574.18,757.14L572.01,755.19L571.59,754.01L570.85,753.20L571.31,744.23L567.61,744.95L563.47,743.53L566.05,737.19L561.94,735.23L558.96,735.63L552.99,734.78L550.59,731.52L550.51,730.48L546.88,731.09L544.64,729.72L542.99,729.58L541.33,720.62L544.37,718.34L545.51,711.74L549.18,710.37L549.67,709.78L557.15,708.58L564.73,710.97L568.04,710.14L575.68,698.58L580.17,702.09L588.63,703.64L590.24,701.01L586.77,698.49L587.06,696.63L589.14,696.77L589.71,698.44L596.37,694.96L610.61,696.22Z" },
  { id: '45203', name: '延岡市', nameEn: 'Nobeoka', prefId: '45', cx: 705.3, cy: 511.9, d: "M743.08,511.48L743.92,512.86L746.75,512.32L745.23,515.70L741.76,515.50L743.08,511.48ZM723.77,556.13L719.40,555.77L714.33,557.85L705.47,550.47L702.78,549.68L699.59,551.06L697.38,546.87L694.64,548.84L692.54,543.64L685.34,546.30L680.70,545.13L670.35,538.47L665.70,540.88L659.76,540.24L662.21,537.97L664.75,526.73L664.01,523.46L661.08,521.69L662.26,516.33L660.95,514.60L663.87,512.07L665.04,507.01L670.74,502.37L671.01,495.47L672.86,492.96L671.27,489.04L673.20,486.39L676.80,486.34L677.57,487.48L682.76,490.20L685.08,490.37L689.73,491.38L691.93,489.67L693.80,487.29L695.66,486.11L702.74,486.95L705.07,487.32L709.40,487.62L712.69,487.81L716.96,486.23L719.23,487.00L723.74,480.52L724.41,475.85L726.60,471.23L732.48,470.57L736.42,471.40L737.84,474.34L742.17,473.23L744.39,472.34L746.52,474.90L751.72,474.47L752.00,478.33L749.69,482.26L749.52,484.11L749.62,488.78L748.58,493.02L749.20,495.97L754.87,494.83L755.39,496.57L752.33,496.30L751.47,497.61L752.89,500.35L749.85,499.50L748.95,502.90L750.53,505.70L748.33,507.40L744.84,503.36L742.75,504.29L742.46,508.29L737.64,510.50L736.75,514.63L735.91,511.41L734.26,511.54L733.06,515.15L731.20,515.40L732.14,518.34L729.90,518.97L730.07,521.30L733.48,519.92L730.81,525.05L731.55,526.05L729.13,527.96L729.73,529.18L726.82,532.17L720.56,532.57L716.64,537.83L713.99,545.15L714.45,553.00L717.90,553.36L718.53,550.62L720.26,551.53L719.91,554.63L723.77,556.13Z" },
  { id: '45204', name: '日南市', nameEn: 'Nichinan', prefId: '45', cx: 638.8, cy: 768.9, d: "M655.88,796.17L656.69,796.41L657.02,802.46L654.31,799.16L655.88,796.17ZM625.72,739.26L633.90,739.91L634.11,736.18L636.25,735.88L640.10,735.90L644.59,738.58L649.31,736.61L652.77,739.45L652.94,743.66L655.78,744.09L657.03,746.85L660.37,748.95L666.40,749.23L668.12,751.22L666.44,751.86L666.96,755.54L665.63,756.89L668.25,759.76L664.37,761.75L664.74,764.14L666.70,764.28L668.42,770.26L666.04,769.92L665.03,772.16L666.90,773.30L665.79,775.44L656.87,781.73L655.54,784.79L656.24,789.13L655.02,789.81L655.69,788.14L654.14,786.25L651.82,790.54L653.10,792.01L650.26,792.12L650.45,801.97L647.72,802.35L647.98,805.35L650.39,806.11L649.99,808.29L642.76,809.37L638.68,808.13L638.00,806.27L635.84,808.32L632.47,808.38L629.60,803.99L630.21,799.80L627.50,797.26L627.66,794.09L624.94,792.07L626.76,789.70L622.61,785.05L623.18,778.46L619.02,775.14L616.07,776.19L611.37,772.35L602.35,763.89L607.67,756.69L611.54,755.45L613.72,753.86L613.14,752.75L617.12,752.93L619.29,748.10L623.70,747.35L625.72,739.26Z" },
  { id: '45205', name: '小林市', nameEn: 'Kobayashi', prefId: '45', cx: 576.6, cy: 672.5, d: "M610.26,683.95L612.71,686.48L609.31,693.25L610.61,696.22L596.37,694.96L589.71,698.44L589.14,696.77L587.06,696.63L579.16,691.35L571.47,693.19L570.53,695.26L564.03,687.18L560.84,692.36L561.16,698.24L557.15,697.43L554.94,699.96L551.44,700.84L549.40,703.99L549.63,709.73L549.06,709.31L546.19,709.09L544.67,705.30L540.83,699.15L540.15,698.70L539.32,697.67L538.41,697.67L541.42,690.18L545.14,687.38L544.32,683.41L542.02,683.09L543.20,676.77L541.98,674.78L544.24,672.02L551.06,672.46L556.35,668.36L557.76,663.74L562.34,660.18L560.32,659.18L558.11,652.03L562.61,650.64L562.64,646.66L564.54,645.03L567.64,640.46L568.87,638.42L570.88,637.20L572.06,638.34L573.70,637.96L576.20,638.33L577.75,640.50L588.64,642.73L591.36,640.78L594.03,644.69L595.83,644.14L596.78,646.66L600.19,647.74L602.23,646.23L604.51,648.50L607.47,659.68L602.33,662.54L603.69,668.10L601.63,670.21L601.75,674.14L600.35,674.65L603.57,682.45L610.26,683.95Z" },
  { id: '45206', name: '日向市', nameEn: 'Hyuga', prefId: '45', cx: 679.9, cy: 586.3, d: "M707.24,565.95L708.49,568.57L705.75,570.86L707.28,571.72L710.00,568.06L709.68,571.27L712.61,569.61L713.87,571.47L708.14,573.66L715.61,574.65L706.12,578.17L703.36,585.30L704.06,587.76L701.36,590.72L702.02,595.41L699.58,595.57L694.67,604.08L692.08,603.34L690.38,606.55L687.29,604.39L686.85,599.91L685.45,599.74L681.23,600.75L674.84,606.71L672.05,606.00L671.66,603.41L668.88,600.84L666.27,603.22L663.51,602.19L659.02,604.07L649.56,601.57L645.65,603.28L647.14,600.12L642.72,597.51L641.09,598.19L641.16,592.77L643.06,588.87L648.94,591.82L652.95,589.21L654.89,583.04L659.52,583.16L668.93,579.99L671.46,576.34L669.84,567.98L676.33,566.31L677.72,568.29L682.42,569.37L683.06,571.11L685.95,569.15L688.96,569.35L694.14,561.37L698.40,564.99L700.85,564.14L702.78,566.11L707.24,565.95Z" },
  { id: '45207', name: '串間市', nameEn: 'Kushima', prefId: '45', cx: 624.6, cy: 810.4, d: "M649.04,817.71L649.20,818.06L648.86,819.75L647.70,819.10L649.04,817.71ZM651.47,811.89L651.91,812.24L651.88,813.52L650.88,812.48L651.47,811.89ZM608.57,776.06L609.49,776.64L611.37,772.35L616.07,776.19L619.02,775.14L623.18,778.46L622.61,785.05L626.76,789.70L624.94,792.07L627.66,794.09L627.50,797.26L630.21,799.80L629.60,803.99L632.47,808.38L635.84,808.32L638.00,806.27L638.68,808.13L642.76,809.37L649.99,808.29L651.21,810.39L650.31,811.74L645.70,813.90L647.38,824.88L641.29,829.29L642.02,831.86L639.42,832.33L639.47,836.37L642.91,839.19L639.82,841.84L636.16,839.82L634.22,834.29L631.59,835.68L630.30,834.67L628.45,836.62L622.40,836.78L618.45,830.66L620.04,825.35L618.27,824.30L616.95,825.86L612.24,818.67L606.90,817.75L605.86,819.44L604.52,818.88L602.28,816.94L603.21,813.43L604.20,807.63L604.86,806.29L610.16,803.89L610.99,802.34L610.84,801.01L611.15,798.97L609.85,793.65L608.55,792.42L611.21,789.90L612.00,786.69L609.19,782.01L608.10,780.75L608.57,776.06Z" },
  { id: '45208', name: '西都市', nameEn: 'Saito', prefId: '45', cx: 635.5, cy: 637.5, d: "M660.69,667.04L659.03,667.88L654.18,664.54L650.62,672.68L650.79,676.44L641.81,673.75L636.35,665.62L629.05,662.78L625.08,656.22L618.20,655.13L614.64,649.82L611.82,650.45L609.43,647.83L608.87,644.24L613.16,643.33L615.49,637.92L622.72,639.33L625.44,635.88L628.38,635.24L625.32,630.54L628.00,628.29L621.09,626.26L615.38,615.76L616.19,612.14L610.09,604.26L605.50,603.10L605.80,599.39L608.72,595.36L610.57,595.58L615.91,599.60L621.36,598.33L624.32,601.57L629.52,603.33L638.16,611.76L640.07,610.73L644.17,612.99L642.96,616.10L644.52,619.88L652.54,629.10L656.72,639.93L660.73,644.38L664.32,645.59L663.14,647.15L662.81,648.88L655.00,660.79L657.21,658.67L658.32,660.19L656.47,663.17L660.69,667.04Z" },
  { id: '45209', name: 'えびの市', nameEn: 'Ebino', prefId: '45', cx: 533.6, cy: 669.4, d: "M558.11,652.03L560.32,659.18L562.34,660.18L557.76,663.74L556.35,668.36L551.06,672.46L544.24,672.02L541.98,674.78L543.20,676.77L542.02,683.09L544.32,683.41L545.14,687.38L541.42,690.18L538.41,697.67L537.80,697.32L533.24,695.71L527.76,694.95L526.42,693.67L525.19,693.58L525.51,690.90L524.41,689.49L523.28,687.39L521.91,686.32L521.43,685.31L521.26,683.01L520.64,677.62L518.60,675.98L517.04,674.71L515.14,672.67L514.05,671.93L512.00,669.17L504.62,666.33L504.66,661.64L507.32,659.50L508.31,655.70L511.07,653.80L512.44,654.68L512.21,655.58L514.84,654.88L516.62,656.70L518.22,655.52L526.98,656.07L529.74,657.18L531.91,654.70L535.82,654.84L538.64,655.45L540.13,652.12L541.62,651.70L546.10,649.37L547.96,647.45L549.55,648.25L550.17,649.56L553.64,651.79L558.11,652.03Z" },
  { id: '45341', name: '三股町', nameEn: 'Mimata', prefId: '45', cx: 605.9, cy: 748.8, d: "M619.39,731.92L619.66,736.88L624.44,736.22L625.72,739.26L623.70,747.35L619.29,748.10L617.12,752.93L613.14,752.75L613.72,753.86L611.54,755.45L607.67,756.69L602.35,763.89L599.12,764.52L595.12,762.20L592.75,756.79L588.51,753.85L591.24,743.58L590.09,741.08L591.89,738.43L595.12,737.77L599.94,746.32L604.62,747.46L607.33,742.68L611.93,741.24L612.44,738.78L619.39,731.92Z" },
  { id: '45361', name: '高原町', nameEn: 'Takaharu', prefId: '45', cx: 567.7, cy: 700.4, d: "M587.06,696.63L586.77,698.49L590.24,701.01L588.63,703.64L580.17,702.09L575.68,698.58L568.04,710.14L564.73,710.97L557.15,708.58L549.67,709.78L549.63,709.73L549.40,703.99L551.44,700.84L554.94,699.96L557.15,697.43L561.16,698.24L560.84,692.36L564.03,687.18L570.53,695.26L571.47,693.19L579.16,691.35L587.06,696.63Z" },
  { id: '45382', name: '国富町', nameEn: 'Kunitomi', prefId: '45', cx: 629.7, cy: 671.3, d: "M650.79,676.44L647.49,689.08L642.51,685.74L639.04,686.50L637.91,689.74L634.80,689.51L630.68,685.64L625.72,685.71L627.32,678.40L623.83,673.36L620.30,672.42L614.85,667.01L611.93,658.41L608.97,654.82L608.45,647.99L609.43,647.83L611.82,650.45L614.64,649.82L618.20,655.13L625.08,656.22L629.05,662.78L636.35,665.62L641.81,673.75L650.79,676.44Z" },
  { id: '45383', name: '綾町', nameEn: 'Aya', prefId: '45', cx: 612.5, cy: 673.0, d: "M625.72,685.71L616.14,687.97L613.78,682.10L610.26,683.95L603.57,682.45L600.35,674.65L601.75,674.14L601.63,670.21L603.69,668.10L602.33,662.54L607.47,659.68L604.51,648.50L608.45,647.99L608.97,654.82L611.93,658.41L614.85,667.01L620.30,672.42L623.83,673.36L627.32,678.40L625.72,685.71Z" },
  { id: '45401', name: '高鍋町', nameEn: 'Takanabe', prefId: '45', cx: 675.6, cy: 647.8, d: "M662.81,648.88L663.14,647.15L665.91,647.78L670.27,641.93L671.60,642.46L673.42,640.26L677.75,641.95L679.03,637.89L684.28,641.46L683.57,647.83L679.26,659.08L674.47,653.48L669.08,653.92L666.38,649.94L662.81,648.88Z" },
  { id: '45402', name: '新富町', nameEn: 'Shintomi', prefId: '45', cx: 667.8, cy: 660.6, d: "M676.60,669.41L672.16,670.65L660.69,667.04L656.47,663.17L658.32,660.19L657.21,658.67L655.00,660.79L662.81,648.88L666.38,649.94L669.08,653.92L674.47,653.48L679.26,659.08L676.60,669.41Z" },
  { id: '45403', name: '西米良村', nameEn: 'Nishimera', prefId: '45', cx: 602.1, cy: 624.2, d: "M604.51,648.50L602.23,646.23L600.19,647.74L596.78,646.66L595.83,644.14L594.03,644.69L591.36,640.78L591.07,639.30L590.20,635.28L589.56,630.37L586.08,629.20L583.83,624.68L582.85,624.39L582.31,620.87L577.19,618.64L577.58,614.90L579.65,613.90L578.70,609.80L580.64,608.91L583.14,610.53L584.97,609.45L587.41,607.12L587.93,605.61L589.70,602.66L593.39,601.32L595.53,603.83L601.39,602.47L604.21,605.18L605.50,603.10L610.09,604.26L616.19,612.14L615.38,615.76L621.09,626.26L628.00,628.29L625.32,630.54L628.38,635.24L625.44,635.88L622.72,639.33L615.49,637.92L613.16,643.33L608.87,644.24L609.43,647.83L608.45,647.99L604.51,648.50Z" },
  { id: '45404', name: '木城町', nameEn: 'Kijo', prefId: '45', cx: 653.1, cy: 619.5, d: "M641.09,598.19L642.72,597.51L647.14,600.12L645.65,603.28L649.56,601.57L659.02,604.07L661.05,616.73L660.04,618.35L661.79,620.05L663.89,631.74L667.20,632.47L670.84,638.97L673.42,640.26L671.60,642.46L670.27,641.93L665.91,647.78L663.14,647.15L664.32,645.59L660.73,644.38L656.72,639.93L652.54,629.10L644.52,619.88L642.96,616.10L644.17,612.99L640.07,610.73L638.16,611.76L629.52,603.33L641.09,598.19Z" },
  { id: '45405', name: '川南町', nameEn: 'Kawaminami', prefId: '45', cx: 675.8, cy: 628.3, d: "M684.28,641.46L679.03,637.89L677.75,641.95L673.42,640.26L670.84,638.97L667.20,632.47L663.89,631.74L661.79,620.05L667.83,618.10L666.48,615.12L668.12,614.68L671.21,618.05L682.88,619.71L683.91,621.68L682.08,622.55L683.39,623.55L685.59,620.73L689.72,622.43L690.61,621.21L684.28,641.46Z" },
  { id: '45406', name: '都農町', nameEn: 'Tsuno', prefId: '45', cx: 676.8, cy: 610.9, d: "M659.02,604.07L663.51,602.19L666.27,603.22L668.88,600.84L671.66,603.41L672.05,606.00L674.84,606.71L681.23,600.75L685.45,599.74L686.85,599.91L687.29,604.39L690.38,606.55L692.08,603.34L694.67,604.08L690.52,616.55L690.61,621.21L689.72,622.43L685.59,620.73L683.39,623.55L682.08,622.55L683.91,621.68L682.88,619.71L671.21,618.05L668.12,614.68L666.48,615.12L667.83,618.10L661.79,620.05L660.04,618.35L661.05,616.73L659.02,604.07Z" },
  { id: '45421', name: '門川町', nameEn: 'Kadogawa', prefId: '45', cx: 694.4, cy: 557.5, d: "M711.24,562.77L711.50,564.03L710.50,563.82L711.24,562.77ZM680.70,545.13L685.34,546.30L692.54,543.64L694.64,548.84L697.38,546.87L699.59,551.06L702.78,549.68L705.47,550.47L714.33,557.85L719.40,555.77L723.77,556.13L716.95,562.98L712.88,561.53L713.53,559.59L709.18,559.44L707.24,565.95L702.78,566.11L700.85,564.14L698.40,564.99L694.14,561.37L688.96,569.35L685.95,569.15L683.06,571.11L682.42,569.37L677.72,568.29L676.33,566.31L677.56,565.50L677.13,559.36L681.33,556.80L680.02,553.92L681.98,550.17L679.85,546.51L680.70,545.13Z" },
  { id: '45429', name: '諸塚村', nameEn: 'Morotsuka', prefId: '45', cx: 633.4, cy: 540.7, d: "M625.27,519.96L634.37,522.75L639.10,527.61L644.45,528.02L645.47,535.76L648.03,539.18L646.95,544.98L652.17,547.46L653.63,553.65L656.35,556.24L654.82,560.64L648.87,564.59L648.26,561.25L650.07,557.84L647.85,558.22L644.36,554.25L641.51,554.77L641.26,553.19L638.21,552.60L636.65,554.94L637.37,557.56L631.88,553.34L627.86,553.62L626.60,549.18L620.33,549.94L614.95,548.60L613.73,543.24L614.91,539.71L612.46,535.78L612.62,533.03L620.09,531.09L622.27,527.46L622.78,519.56L625.27,519.96Z" },
  { id: '45430', name: '椎葉村', nameEn: 'Shiiba', prefId: '45', cx: 598.5, cy: 564.9, d: "M610.57,595.58L608.72,595.36L605.80,599.39L605.50,603.10L604.21,605.18L601.39,602.47L595.53,603.83L593.39,601.32L589.70,602.66L591.99,598.11L590.99,597.20L588.49,592.83L587.50,593.14L583.96,590.29L583.88,589.03L585.14,586.92L583.92,584.76L582.88,584.40L582.60,578.54L577.42,578.41L572.81,571.11L569.55,557.81L570.07,551.43L573.33,550.21L571.91,543.64L573.18,541.89L576.39,541.62L576.13,539.03L577.31,534.60L579.22,533.24L582.69,534.18L586.86,535.38L590.51,535.29L591.88,539.60L596.06,540.74L604.49,537.44L605.87,530.31L610.17,529.94L612.62,533.03L612.46,535.78L614.91,539.71L613.73,543.24L614.95,548.60L620.33,549.94L626.60,549.18L627.86,553.62L626.56,552.91L631.86,565.44L621.76,569.10L621.17,572.51L623.20,580.70L619.01,584.80L615.63,585.44L614.30,587.79L609.93,587.05L609.56,590.25L611.64,593.50L610.57,595.58Z" },
  { id: '45431', name: '美郷町', nameEn: 'Misato', prefId: '45', cx: 647.3, cy: 570.5, d: "M659.76,540.24L665.70,540.88L670.35,538.47L680.70,545.13L679.85,546.51L681.98,550.17L680.02,553.92L681.33,556.80L677.13,559.36L677.56,565.50L676.33,566.31L669.84,567.98L671.46,576.34L668.93,579.99L659.52,583.16L654.89,583.04L652.95,589.21L648.94,591.82L643.06,588.87L641.16,592.77L641.09,598.19L629.52,603.33L624.32,601.57L621.36,598.33L615.91,599.60L610.57,595.58L611.64,593.50L609.56,590.25L609.93,587.05L614.30,587.79L615.63,585.44L619.01,584.80L623.20,580.70L621.17,572.51L621.76,569.10L631.86,565.44L626.56,552.91L627.86,553.62L631.88,553.34L637.37,557.56L636.65,554.94L638.21,552.60L641.26,553.19L641.51,554.77L644.36,554.25L647.85,558.22L650.07,557.84L648.26,561.25L648.87,564.59L654.82,560.64L656.35,556.24L653.63,553.65L652.17,547.46L646.95,544.98L648.03,539.18L652.77,538.00L655.50,539.99L659.76,540.24Z" },
  { id: '45441', name: '高千穂町', nameEn: 'Takachiho', prefId: '45', cx: 635.4, cy: 493.3, d: "M634.37,522.75L625.27,519.96L625.32,513.03L621.94,510.88L619.25,511.91L616.98,508.86L619.75,506.54L617.97,503.26L622.41,499.52L622.69,496.26L620.93,494.04L618.32,493.86L618.78,490.31L619.73,489.93L620.77,487.55L618.79,485.63L618.82,483.76L620.53,483.24L620.80,480.11L622.65,478.68L622.57,477.52L623.20,475.30L627.10,472.63L629.24,471.96L637.11,472.65L640.83,471.45L642.86,473.73L643.04,475.60L644.29,478.59L645.88,479.01L648.96,477.48L654.81,476.80L657.03,476.52L658.14,476.86L653.70,495.21L649.35,501.02L647.32,501.13L644.57,505.53L639.60,505.56L637.13,503.38L636.04,506.39L638.31,510.81L634.37,522.75Z" },
  { id: '45442', name: '日之影町', nameEn: 'Hinokage', prefId: '45', cx: 656.6, cy: 507.2, d: "M676.80,486.34L673.20,486.39L671.27,489.04L672.86,492.96L671.01,495.47L670.74,502.37L665.04,507.01L663.87,512.07L660.95,514.60L662.26,516.33L661.08,521.69L664.01,523.46L664.75,526.73L662.21,537.97L659.76,540.24L655.50,539.99L652.77,538.00L648.03,539.18L645.47,535.76L644.45,528.02L639.10,527.61L634.37,522.75L638.31,510.81L636.04,506.39L637.13,503.38L639.60,505.56L644.57,505.53L647.32,501.13L649.35,501.02L653.70,495.21L658.14,476.86L659.06,475.74L660.29,475.24L661.51,472.66L667.11,472.02L669.93,470.77L671.52,473.53L673.59,475.87L675.68,476.41L675.42,477.22L678.72,479.65L677.17,485.46L676.80,486.34Z" },
  { id: '45443', name: '五ヶ瀬町', nameEn: 'Gokase', prefId: '45', cx: 608.7, cy: 519.2, d: "M625.27,519.96L622.78,519.56L622.27,527.46L620.09,531.09L612.62,533.03L610.17,529.94L605.87,530.31L604.49,537.44L596.06,540.74L591.88,539.60L590.51,535.29L590.74,532.88L592.33,532.32L593.83,528.78L593.70,522.83L592.91,519.43L594.50,518.93L598.04,513.90L598.69,511.07L600.44,510.02L602.95,512.13L605.44,512.09L605.50,506.66L606.97,503.49L606.41,502.56L612.15,497.42L613.38,497.79L618.32,493.86L620.93,494.04L622.69,496.26L622.41,499.52L617.97,503.26L619.75,506.54L616.98,508.86L619.25,511.91L621.94,510.88L625.32,513.03L625.27,519.96Z" },
  { id: '43100', name: '熊本市', nameEn: 'Kumamoto', prefId: '43', cx: 502.9, cy: 477.7, d: "M520.66,489.07L515.54,489.36L509.42,494.08L503.79,495.99L514.00,496.22L516.10,497.88L516.67,499.89L515.40,505.08L517.75,506.86L520.34,513.52L515.18,513.52L514.93,511.86L511.24,514.80L507.49,509.75L503.27,506.78L497.75,506.10L496.17,503.23L491.92,500.65L488.36,502.66L484.13,501.04L482.19,485.35L485.59,481.70L481.61,477.20L480.88,473.83L478.63,473.17L476.43,467.59L476.78,466.60L487.23,468.61L489.11,466.33L488.13,464.27L489.95,464.53L493.63,457.74L490.47,450.62L493.55,446.61L496.86,445.42L498.26,441.56L502.09,439.73L503.14,440.90L505.88,435.34L511.09,436.61L509.95,438.14L510.26,447.78L508.17,455.47L510.34,457.69L509.38,466.35L514.29,465.31L522.59,465.19L526.32,466.72L526.93,470.44L529.71,470.17L531.23,473.48L531.50,475.99L528.64,475.98L522.56,479.95L520.61,478.72L524.33,487.43L520.66,489.07ZM476.97,487.79L481.01,487.74L480.59,489.18L476.79,489.19L476.97,487.79Z" },
  { id: '43202', name: '八代市', nameEn: 'Yatsushiro', prefId: '43', cx: 514.7, cy: 557.7, d: "M508.99,540.57L515.38,539.27L521.59,531.32L526.11,538.14L529.78,540.02L538.43,536.64L545.01,537.51L548.59,536.21L548.23,534.24L549.57,533.98L551.66,536.55L557.49,535.32L561.50,535.08L568.11,537.70L572.22,542.93L573.33,550.21L570.07,551.43L569.55,557.81L571.56,562.03L571.13,564.67L565.29,568.62L559.27,567.79L555.47,570.77L547.28,569.72L546.92,563.52L538.66,556.88L536.45,558.36L533.80,555.56L528.79,557.63L524.15,556.76L522.32,559.15L514.87,561.69L514.97,563.19L512.00,562.40L512.68,567.04L508.65,568.05L510.18,573.36L508.28,575.66L509.10,579.06L512.84,580.22L512.29,582.23L508.46,583.87L502.59,594.99L497.65,595.51L494.77,587.20L491.54,589.29L487.91,589.38L486.74,587.00L483.92,586.48L477.76,587.57L474.13,584.89L469.93,589.24L467.73,588.72L467.65,583.88L470.42,579.01L469.27,577.87L476.76,570.19L475.02,561.34L471.66,561.04L470.22,559.19L471.15,555.26L474.55,555.65L475.06,553.94L467.79,550.27L475.59,553.61L468.86,548.80L470.51,545.69L473.10,544.52L474.48,545.76L480.35,536.13L484.37,531.89L485.92,533.08L489.53,529.62L498.35,538.18L496.20,544.01L501.05,548.36L504.03,546.35L503.15,544.15L504.86,544.32L507.04,540.90L508.99,540.57Z" },
  { id: '43203', name: '人吉市', nameEn: 'Hitoyoshi', prefId: '43', cx: 514.5, cy: 639.9, d: "M522.57,622.87L521.34,629.45L522.04,632.44L528.43,635.98L528.48,640.67L531.22,647.06L533.98,645.45L536.15,648.61L539.99,646.56L542.05,650.56L541.62,651.70L540.13,652.12L538.64,655.45L535.82,654.84L531.91,654.70L529.74,657.18L526.98,656.07L518.22,655.52L516.62,656.70L515.36,655.04L512.21,655.58L512.44,654.68L511.07,653.80L508.31,655.70L506.91,654.90L503.70,654.14L494.28,646.93L493.56,643.01L494.81,638.68L496.79,638.45L496.46,634.82L497.94,634.47L499.74,629.46L506.87,623.15L511.24,616.72L508.11,614.09L508.24,611.59L506.23,609.41L507.52,606.74L510.45,608.15L510.57,610.75L512.02,611.34L512.73,618.89L514.98,618.68L517.49,623.39L521.57,621.25L522.57,622.87Z" },
  { id: '43204', name: '荒尾市', nameEn: 'Arao', prefId: '43', cx: 456.1, cy: 435.5, d: "M467.06,432.49L467.65,435.16L465.90,438.71L460.49,445.48L460.11,441.93L455.90,441.83L453.82,444.77L451.34,443.24L447.82,444.17L446.15,432.81L442.77,428.98L450.58,428.58L457.70,429.15L460.94,427.91L462.64,428.58L464.52,426.54L467.06,432.49Z" },
  { id: '43205', name: '水俣市', nameEn: 'Minamata', prefId: '43', cx: 453.1, cy: 638.2, d: "M446.64,622.94L447.92,626.54L450.36,628.18L454.67,628.30L464.25,635.15L471.21,631.69L478.11,632.17L480.75,634.29L481.82,636.81L478.81,642.09L473.43,642.29L470.99,643.49L469.73,646.49L464.82,646.88L463.10,645.71L459.50,647.43L457.35,645.94L456.19,646.10L455.46,651.22L454.08,651.96L451.43,652.41L450.32,651.72L448.55,652.39L446.25,652.15L440.32,650.82L436.89,643.99L431.48,639.00L431.27,635.21L435.04,636.68L434.32,633.96L435.51,632.74L433.72,630.42L440.25,621.85L441.33,622.92L444.57,621.16L446.64,622.94Z" },
  { id: '43206', name: '玉名市', nameEn: 'Tamana', prefId: '43', cx: 474.0, cy: 450.7, d: "M488.13,464.27L489.11,466.33L487.23,468.61L476.78,466.60L476.43,467.59L475.01,469.29L466.01,466.44L466.83,460.46L456.10,453.45L460.49,445.48L465.90,438.71L467.65,435.16L467.06,432.49L473.63,430.78L478.28,431.81L482.47,433.43L483.20,435.29L480.96,440.30L483.93,439.64L485.02,443.03L485.86,442.26L488.16,444.33L483.84,450.30L485.78,450.94L486.33,453.71L484.12,458.49L488.13,464.27Z" },
  { id: '43208', name: '山鹿市', nameEn: 'Yamaga', prefId: '43', cx: 508.9, cy: 415.5, d: "M511.09,436.61L505.88,435.34L503.14,440.90L502.09,439.73L498.26,441.56L496.86,445.42L493.55,446.61L488.81,443.47L490.23,438.08L493.38,438.94L494.20,436.63L491.73,435.54L492.51,428.01L489.38,424.63L492.87,422.92L493.58,420.55L493.87,417.43L490.07,416.05L489.47,411.08L494.35,407.12L494.42,402.24L494.21,400.54L497.25,394.61L496.96,390.08L499.35,388.25L499.63,386.47L501.99,390.59L506.54,390.49L511.29,390.97L511.92,392.75L519.06,398.29L520.49,398.57L522.97,398.37L527.82,400.22L529.65,402.76L533.11,403.09L535.07,406.38L533.02,411.58L528.70,413.35L530.22,415.97L526.95,420.77L526.57,426.64L521.19,431.45L517.93,430.58L511.09,436.61Z" },
  { id: '43210', name: '菊池市', nameEn: 'Kikuchi', prefId: '43', cx: 537.0, cy: 431.8, d: "M510.26,447.78L509.95,438.14L511.09,436.61L517.93,430.58L521.19,431.45L526.57,426.64L526.95,420.77L530.22,415.97L528.70,413.35L533.02,411.58L535.07,406.38L538.96,405.67L543.72,407.56L546.68,413.45L548.12,413.23L550.21,415.58L551.69,416.49L554.19,415.70L558.86,417.70L559.34,420.20L561.70,423.58L558.58,428.49L558.09,435.68L555.81,438.69L558.69,441.21L554.83,442.22L551.92,446.02L538.73,446.90L539.27,449.83L533.93,448.57L532.06,454.31L527.09,451.44L523.26,451.88L515.06,447.92L510.26,447.78Z" },
  { id: '43211', name: '宇土市', nameEn: 'Uto', prefId: '43', cx: 485.5, cy: 509.6, d: "M484.13,501.04L488.36,502.66L491.92,500.65L496.17,503.23L497.75,506.10L503.27,506.78L507.49,509.75L506.47,511.33L502.94,510.79L499.43,515.56L495.51,513.19L489.76,514.06L485.76,512.26L484.02,514.80L477.40,516.79L475.48,515.85L463.39,518.51L461.34,518.17L461.02,516.58L469.24,513.81L475.66,505.18L484.13,501.04Z" },
  { id: '43212', name: '上天草市', nameEn: 'Kamiamakusa', prefId: '43', cx: 438.7, cy: 565.5, d: "M423.59,584.96L423.83,587.31L422.40,587.79L422.40,586.10L423.59,584.96ZM442.97,580.60L446.40,586.21L443.20,587.94L444.33,585.85L441.74,584.54L442.97,580.60ZM437.76,554.90L443.74,549.53L446.68,550.46L448.63,548.11L451.70,549.26L445.88,566.55L441.48,572.06L443.14,574.82L440.58,575.00L442.11,576.67L439.81,580.96L435.89,583.76L432.66,583.03L430.38,586.25L428.49,580.91L429.94,579.16L432.58,579.29L435.83,569.02L432.22,570.39L428.54,569.02L426.36,565.03L427.10,561.53L427.69,559.81L435.27,560.71L435.71,556.25L437.76,554.90ZM440.52,544.22L441.47,544.65L440.61,546.27L438.84,545.37L440.52,544.22ZM442.14,543.32L445.90,545.02L442.96,545.37L442.14,543.32ZM437.55,533.48L436.51,535.34L435.52,534.51L437.55,533.48ZM455.46,533.22L458.43,537.59L453.81,545.10L452.72,536.86L455.46,533.22ZM426.25,528.41L427.71,529.24L427.22,530.49L424.88,528.88L426.25,528.41ZM448.97,523.65L452.10,526.48L449.27,530.35L452.22,533.60L449.87,537.11L450.53,540.20L448.07,543.23L440.81,542.50L441.33,538.85L443.92,536.43L443.36,534.94L438.47,533.68L438.78,532.30L444.41,525.79L448.97,523.65Z" },
  { id: '43213', name: '宇城市', nameEn: 'Uki', prefId: '43', cx: 495.7, cy: 523.1, d: "M459.73,527.71L463.09,528.35L463.35,530.42L459.45,536.14L458.23,534.53L459.54,532.77L456.88,532.56L455.57,529.34L459.73,527.71ZM507.49,509.75L511.24,514.80L514.93,511.86L515.18,513.52L520.34,513.52L520.23,514.23L521.59,531.32L515.38,539.27L508.99,540.57L505.38,537.18L506.89,535.62L505.08,534.02L503.55,535.06L499.24,532.05L499.42,530.75L489.03,524.45L491.30,524.27L494.00,526.92L493.94,523.34L495.65,522.13L493.58,519.47L482.10,523.89L469.91,524.00L465.19,526.85L452.44,528.18L452.87,525.81L451.02,523.44L461.02,516.58L461.34,518.17L463.39,518.51L475.48,515.85L477.40,516.79L484.02,514.80L485.76,512.26L489.76,514.06L495.51,513.19L499.43,515.56L502.94,510.79L506.47,511.33L507.49,509.75Z" },
  { id: '43214', name: '阿蘇市', nameEn: 'Aso', prefId: '43', cx: 588.3, cy: 440.7, d: "M558.69,441.21L555.81,438.69L558.09,435.68L558.58,428.49L561.70,423.58L566.10,423.57L567.68,422.44L569.65,424.70L581.43,422.00L582.76,419.60L586.85,418.79L588.23,421.64L595.28,418.07L603.42,419.71L602.69,422.86L600.40,423.87L600.98,426.39L603.81,426.66L607.73,429.78L608.01,436.53L613.80,436.42L614.95,439.03L620.73,439.43L621.90,440.40L620.67,444.57L622.16,448.54L622.34,452.53L606.05,461.10L602.64,457.59L598.57,459.01L588.94,458.90L582.27,459.65L568.13,452.46L565.42,452.23L565.57,454.02L563.61,454.71L560.95,453.89L558.93,451.24L560.86,448.60L559.12,444.22L560.48,442.93L558.69,441.21Z" },
  { id: '43215', name: '天草市', nameEn: 'Amakusa', prefId: '43', cx: 375.5, cy: 588.1, d: "M360.44,633.06L364.60,638.97L363.78,641.08L361.09,637.00L358.02,640.21L358.73,633.83L360.44,633.06ZM370.90,630.33L370.99,631.97L369.16,631.77L370.90,630.33ZM384.40,611.23L386.42,613.40L383.04,614.98L382.78,612.61L384.40,611.23ZM430.18,592.49L432.09,594.06L433.71,593.06L434.20,594.79L431.22,599.04L424.94,604.05L419.36,604.04L423.00,601.24L425.59,601.21L424.73,597.21L430.18,592.49ZM421.48,588.50L427.06,592.57L426.75,593.71L422.93,595.44L421.81,593.42L418.77,592.86L418.27,590.72L419.18,589.69L420.72,591.08L421.48,588.50ZM429.19,587.53L430.07,589.58L428.87,590.38L427.18,588.87L429.19,587.53ZM404.62,585.33L404.66,588.49L403.28,588.88L403.38,586.18L404.62,585.33ZM437.76,554.90L435.71,556.25L435.27,560.71L427.69,559.81L427.10,561.53L426.36,565.03L428.54,569.02L432.22,570.39L435.83,569.02L432.58,579.29L429.94,579.16L429.24,575.98L424.64,580.65L420.20,581.46L413.75,579.75L412.98,577.42L410.22,577.81L408.19,583.60L406.24,584.36L404.28,583.62L406.80,581.24L406.36,577.33L402.34,577.42L397.96,567.52L404.12,565.24L409.60,560.59L414.46,559.31L421.72,550.88L431.09,548.43L433.24,549.13L433.04,550.77L437.49,551.78L437.76,554.90ZM358.06,570.59L363.04,571.98L370.77,570.56L374.48,573.05L374.28,567.66L371.86,565.44L375.04,559.85L376.90,559.91L379.44,556.76L379.15,552.07L381.25,547.19L379.43,544.34L394.40,543.10L396.54,554.11L395.36,556.28L398.80,562.27L396.32,565.74L400.43,575.02L398.66,574.93L399.08,576.93L396.51,579.08L397.28,582.45L395.76,583.66L396.85,584.21L398.92,581.47L401.12,582.33L401.92,583.99L400.55,585.43L402.44,588.29L399.50,591.67L396.92,599.91L392.52,602.94L390.16,601.38L391.59,595.70L389.38,598.25L387.95,596.97L388.15,599.55L386.68,600.03L387.75,602.16L385.81,602.58L384.16,606.16L389.16,605.21L389.80,606.64L386.13,609.89L382.79,608.57L377.06,617.25L374.05,617.11L374.30,618.97L376.20,618.43L375.70,622.78L373.36,623.65L373.34,619.95L371.41,619.92L371.77,623.18L369.68,624.51L371.47,626.13L369.90,627.91L366.64,627.93L363.74,630.31L362.82,628.49L360.51,628.42L361.17,630.75L359.11,633.59L356.98,633.39L356.90,630.96L354.62,632.46L352.51,630.51L354.18,626.23L357.35,625.12L356.88,621.88L350.63,619.13L348.88,620.67L347.69,619.95L351.56,611.48L356.54,606.00L359.58,605.27L359.80,608.90L361.69,605.01L363.62,606.08L365.26,610.95L367.63,611.01L368.56,608.47L367.33,606.54L369.48,605.49L362.37,602.35L360.77,604.80L358.01,602.07L352.87,603.74L352.59,599.77L350.10,599.29L348.81,591.56L352.90,586.30L351.71,584.47L353.42,582.66L355.62,573.42L358.06,570.59Z" },
  { id: '43216', name: '合志市', nameEn: 'Koshi', prefId: '43', cx: 518.5, cy: 456.4, d: "M514.29,465.31L509.38,466.35L510.34,457.69L508.17,455.47L510.26,447.78L515.06,447.92L523.26,451.88L527.09,451.44L532.06,454.31L535.36,456.39L522.81,460.84L518.55,464.62L518.03,463.37L514.29,465.31Z" },
  { id: '43348', name: '美里町', nameEn: 'Misato', prefId: '43', cx: 540.6, cy: 526.7, d: "M557.49,535.32L551.66,536.55L549.57,533.98L548.23,534.24L548.59,536.21L545.01,537.51L538.43,536.64L529.78,540.02L526.11,538.14L521.59,531.32L520.23,514.23L525.34,515.33L529.62,523.55L533.33,523.07L534.23,520.59L539.62,518.44L541.57,514.02L547.37,513.84L563.19,519.42L557.20,521.47L558.81,522.74L560.84,530.34L557.03,533.93L557.49,535.32Z" },
  { id: '43364', name: '玉東町', nameEn: 'Gyokuto', prefId: '43', cx: 488.9, cy: 454.2, d: "M493.55,446.61L490.47,450.62L493.63,457.74L489.95,464.53L488.13,464.27L484.12,458.49L486.33,453.71L485.78,450.94L483.84,450.30L488.16,444.33L488.81,443.47L493.55,446.61Z" },
  { id: '43367', name: '南関町', nameEn: 'Nankan', prefId: '43', cx: 471.9, cy: 420.9, d: "M467.06,432.49L464.52,426.54L463.47,423.74L462.32,423.00L462.09,420.31L460.07,417.32L462.00,414.97L468.03,413.08L468.69,409.93L475.19,407.61L479.36,416.74L480.60,416.38L482.26,422.55L481.33,425.49L479.37,425.53L480.14,430.23L478.28,431.81L473.63,430.78L467.06,432.49Z" },
  { id: '43368', name: '長洲町', nameEn: 'Nagasu', prefId: '43', cx: 454.3, cy: 447.5, d: "M447.82,444.17L451.34,443.24L453.82,444.77L455.90,441.83L460.11,441.93L460.49,445.48L456.10,453.45L453.13,454.34L451.94,453.34L453.31,451.70L450.78,452.42L449.21,450.99L447.82,444.17Z" },
  { id: '43369', name: '和水町', nameEn: 'Namino', prefId: '43', cx: 485.5, cy: 419.1, d: "M488.16,444.33L485.86,442.26L485.02,443.03L483.93,439.64L480.96,440.30L483.20,435.29L482.47,433.43L478.28,431.81L480.14,430.23L479.37,425.53L481.33,425.49L482.26,422.55L480.60,416.38L479.36,416.74L475.19,407.61L475.12,406.51L474.35,403.36L478.28,400.38L480.33,400.90L487.08,401.57L494.42,402.24L494.35,407.12L489.47,411.08L490.07,416.05L493.87,417.43L493.58,420.55L492.87,422.92L489.38,424.63L492.51,428.01L491.73,435.54L494.20,436.63L493.38,438.94L490.23,438.08L488.81,443.47L488.16,444.33Z" },
  { id: '43403', name: '大津町', nameEn: 'Ozu', prefId: '43', cx: 547.9, cy: 455.7, d: "M532.06,454.31L533.93,448.57L539.27,449.83L538.73,446.90L551.92,446.02L554.83,442.22L558.69,441.21L560.48,442.93L559.12,444.22L560.86,448.60L558.93,451.24L560.95,453.89L557.11,460.36L565.59,461.06L563.37,464.13L556.43,463.04L547.19,465.39L546.86,467.67L541.32,470.60L541.20,469.78L536.68,465.28L536.83,458.55L535.36,456.39L532.06,454.31Z" },
  { id: '43404', name: '菊陽町', nameEn: 'Kiyo', prefId: '43', cx: 530.8, cy: 465.1, d: "M531.23,473.48L529.71,470.17L526.93,470.44L526.32,466.72L522.59,465.19L514.29,465.31L518.03,463.37L518.55,464.62L522.81,460.84L535.36,456.39L536.83,458.55L536.68,465.28L541.20,469.78L532.50,474.32L531.23,473.48Z" },
  { id: '43423', name: '南小国町', nameEn: 'Minamioguni', prefId: '43', cx: 587.5, cy: 412.4, d: "M603.42,419.71L595.28,418.07L588.23,421.64L586.85,418.79L582.76,419.60L581.43,422.00L569.65,424.70L567.68,422.44L568.76,421.30L570.77,416.37L571.85,413.54L570.35,411.99L573.20,407.54L571.97,405.90L575.34,404.86L575.78,402.45L579.98,401.10L580.44,403.50L581.83,402.98L583.28,400.35L586.92,405.12L596.81,404.98L599.52,402.78L605.09,403.24L605.44,405.22L605.39,408.66L610.11,411.69L604.58,416.59L603.42,419.71Z" },
  { id: '43424', name: '小国町', nameEn: 'Oguni', prefId: '43', cx: 583.4, cy: 393.7, d: "M605.09,403.24L599.52,402.78L596.81,404.98L586.92,405.12L583.28,400.35L581.83,402.98L580.44,403.50L579.98,401.10L575.78,402.45L575.34,404.86L571.97,405.90L569.98,402.25L563.47,393.79L564.69,391.24L566.55,384.94L566.83,383.32L571.60,384.81L574.10,382.68L575.75,382.19L576.37,380.73L580.97,380.49L585.60,382.08L589.34,382.30L592.77,384.22L593.38,386.73L595.63,387.57L599.68,390.57L603.76,397.18L603.62,401.63L605.09,403.24Z" },
  { id: '43425', name: '産山村', nameEn: 'Ubuyama', prefId: '43', cx: 612.0, cy: 426.9, d: "M620.73,439.43L614.95,439.03L613.80,436.42L608.01,436.53L607.73,429.78L603.81,426.66L600.98,426.39L600.40,423.87L602.69,422.86L603.42,419.71L604.58,416.59L610.11,411.69L614.25,416.72L615.36,422.03L615.88,425.24L621.03,430.76L620.93,433.97L624.35,435.30L622.81,438.75L620.73,439.43Z" },
  { id: '43428', name: '高森町', nameEn: 'Takamori', prefId: '43', cx: 611.5, cy: 469.7, d: "M588.94,458.90L598.57,459.01L602.64,457.59L606.05,461.10L622.34,452.53L622.21,455.20L624.48,459.89L626.15,460.51L631.04,465.52L637.02,468.75L638.10,470.62L637.11,472.65L629.24,471.96L627.10,472.63L623.20,475.30L622.57,477.52L622.65,478.68L620.80,480.11L620.53,483.24L618.82,483.76L618.79,485.63L620.77,487.55L619.73,489.93L618.78,490.31L618.15,491.57L613.51,490.40L611.18,487.80L611.90,483.04L610.75,480.93L602.07,475.04L598.68,475.94L597.18,480.14L592.70,480.98L592.24,471.53L590.37,470.79L592.09,469.47L588.28,461.32L588.94,458.90Z" },
  { id: '43432', name: '西原村', nameEn: 'Nishihara', prefId: '43', cx: 553.4, cy: 474.3, d: "M541.32,470.60L546.86,467.67L547.19,465.39L556.43,463.04L563.37,464.13L562.19,465.61L563.65,467.30L563.79,469.65L562.04,471.20L563.04,476.09L565.87,476.45L567.19,478.68L559.56,483.79L557.05,482.16L553.77,485.01L544.53,483.46L540.65,478.11L542.50,474.78L541.32,470.60Z" },
  { id: '43433', name: '南阿蘇村', nameEn: 'Minamiaso', prefId: '43', cx: 576.1, cy: 468.8, d: "M560.95,453.89L563.61,454.71L565.57,454.02L565.42,452.23L568.13,452.46L582.27,459.65L588.94,458.90L588.28,461.32L592.09,469.47L590.37,470.79L592.24,471.53L592.70,480.98L582.36,481.65L576.28,483.97L574.55,482.55L568.67,482.68L567.19,478.68L565.87,476.45L563.04,476.09L562.04,471.20L563.79,469.65L563.65,467.30L562.19,465.61L563.37,464.13L565.59,461.06L557.11,460.36L560.95,453.89Z" },
  { id: '43441', name: '御船町', nameEn: 'Mifune', prefId: '43', cx: 537.3, cy: 497.4, d: "M516.67,499.89L516.10,497.88L524.70,492.60L526.97,493.55L528.84,497.12L532.67,496.20L531.72,491.70L533.87,490.08L533.81,488.10L541.46,487.25L544.16,485.65L544.53,483.46L553.77,485.01L557.05,482.16L559.56,483.79L559.21,485.33L544.82,494.03L544.08,499.87L546.09,507.76L544.72,512.25L547.37,513.84L541.57,514.02L541.41,511.58L538.02,510.26L537.40,507.76L535.20,507.63L534.10,505.51L528.78,506.68L525.15,504.59L524.50,506.65L523.16,506.02L523.19,503.14L516.67,499.89Z" },
  { id: '43442', name: '嘉島町', nameEn: 'Kashima', prefId: '43', cx: 516.2, cy: 493.3, d: "M516.10,497.88L514.00,496.22L503.79,495.99L509.42,494.08L515.54,489.36L520.66,489.07L524.70,492.60L516.10,497.88Z" },
  { id: '43443', name: '益城町', nameEn: 'Mashiki', prefId: '43', cx: 532.6, cy: 483.1, d: "M520.66,489.07L524.33,487.43L520.61,478.72L522.56,479.95L528.64,475.98L531.50,475.99L531.23,473.48L532.50,474.32L541.20,469.78L541.32,470.60L542.50,474.78L540.65,478.11L544.53,483.46L544.16,485.65L541.46,487.25L533.81,488.10L533.87,490.08L531.72,491.70L532.67,496.20L528.84,497.12L526.97,493.55L524.70,492.60L520.66,489.07Z" },
  { id: '43444', name: '甲佐町', nameEn: 'Kosa', prefId: '43', cx: 529.0, cy: 512.0, d: "M520.34,513.52L517.75,506.86L515.40,505.08L516.67,499.89L523.19,503.14L523.16,506.02L524.50,506.65L525.15,504.59L528.78,506.68L534.10,505.51L535.20,507.63L537.40,507.76L538.02,510.26L541.41,511.58L541.57,514.02L539.62,518.44L534.23,520.59L533.33,523.07L529.62,523.55L525.34,515.33L520.23,514.23L520.34,513.52Z" },
  { id: '43447', name: '山都町', nameEn: 'Yamato', prefId: '43', cx: 578.7, cy: 505.2, d: "M572.22,542.93L568.11,537.70L561.50,535.08L557.49,535.32L557.03,533.93L560.84,530.34L558.81,522.74L557.20,521.47L563.19,519.42L547.37,513.84L544.72,512.25L546.09,507.76L544.08,499.87L544.82,494.03L559.21,485.33L559.56,483.79L567.19,478.68L568.67,482.68L574.55,482.55L576.28,483.97L582.36,481.65L592.70,480.98L597.18,480.14L598.68,475.94L602.07,475.04L610.75,480.93L611.90,483.04L611.18,487.80L613.51,490.40L618.15,491.57L618.28,493.87L613.38,497.79L612.15,497.42L606.41,502.56L606.97,503.49L605.50,506.66L605.44,512.09L602.95,512.13L600.44,510.02L598.69,511.07L598.04,513.90L594.50,518.93L592.91,519.43L593.70,522.83L593.83,528.78L592.33,532.32L590.74,532.88L591.20,534.67L586.86,535.38L582.69,534.18L579.22,533.24L577.31,534.60L576.13,539.03L576.39,541.62L572.22,542.93Z" },
  { id: '43468', name: '氷川町', nameEn: 'Hikawa', prefId: '43', cx: 498.7, cy: 536.5, d: "M508.99,540.57L507.04,540.90L504.86,544.32L503.15,544.15L504.03,546.35L501.05,548.36L496.20,544.01L498.35,538.18L489.53,529.62L486.38,525.30L489.03,524.45L499.42,530.75L499.24,532.05L503.55,535.06L505.08,534.02L506.89,535.62L505.38,537.18L508.99,540.57Z" },
  { id: '43482', name: '芦北町', nameEn: 'Ashikita', prefId: '43', cx: 469.8, cy: 607.7, d: "M469.27,577.87L470.42,579.01L467.65,583.88L467.73,588.72L469.93,589.24L474.13,584.89L477.76,587.57L483.92,586.48L486.74,587.00L487.91,589.38L491.54,589.29L490.19,591.80L483.42,594.83L482.71,598.74L485.18,602.94L482.22,606.92L483.58,610.79L485.48,611.35L480.49,615.11L478.57,628.00L479.73,628.95L478.11,632.17L471.21,631.69L464.25,635.15L454.67,628.30L459.49,627.17L460.09,620.29L458.91,618.18L454.42,616.68L453.35,611.44L453.77,606.50L456.34,608.88L459.00,605.60L455.18,605.26L453.91,600.22L455.48,597.68L456.91,598.83L457.45,595.04L462.73,591.82L458.67,590.37L458.82,588.92L469.27,577.87Z" },
  { id: '43484', name: '津奈木町', nameEn: 'Tsunagi', prefId: '43', cx: 452.6, cy: 620.3, d: "M454.67,628.30L450.36,628.18L447.92,626.54L446.64,622.94L447.34,620.42L444.90,618.24L448.14,612.94L450.54,612.51L450.17,608.71L452.25,608.12L453.35,611.44L454.42,616.68L458.91,618.18L460.09,620.29L459.49,627.17L454.67,628.30Z" },
  { id: '43501', name: '錦町', nameEn: 'Nishiki', prefId: '43', cx: 535.6, cy: 635.0, d: "M542.05,650.56L539.99,646.56L536.15,648.61L533.98,645.45L531.22,647.06L528.48,640.67L528.43,635.98L522.04,632.44L521.34,629.45L529.37,628.15L527.07,626.52L527.71,620.97L535.94,617.80L539.56,625.42L537.07,628.39L541.17,629.28L542.99,634.76L548.36,640.52L545.59,645.28L549.55,648.25L547.96,647.45L546.10,649.37L542.05,650.56Z" },
  { id: '43505', name: '多良木町', nameEn: 'Taragi', prefId: '43', cx: 566.6, cy: 619.9, d: "M556.07,591.52L559.20,600.13L563.92,605.73L562.25,609.45L560.29,610.33L561.90,612.04L561.40,615.61L564.24,619.81L568.75,620.70L570.38,623.34L573.92,619.81L575.99,621.27L578.14,619.61L580.26,619.20L583.23,622.01L582.85,624.39L583.83,624.68L586.08,629.20L589.56,630.37L590.20,635.28L591.07,639.30L591.36,640.78L588.64,642.73L577.75,640.50L576.20,638.33L573.70,637.96L572.06,638.34L570.88,637.20L568.87,638.42L567.64,640.46L566.43,641.34L564.80,640.42L564.66,633.76L563.09,633.14L564.52,627.94L554.30,617.55L550.10,617.24L550.95,614.06L548.21,610.46L547.61,603.36L543.54,598.98L546.55,593.06L552.16,590.85L556.07,591.52Z" },
  { id: '43506', name: '湯前町', nameEn: 'Yunomae', prefId: '43', cx: 570.6, cy: 612.8, d: "M578.14,619.61L575.99,621.27L573.92,619.81L570.38,623.34L568.75,620.70L564.24,619.81L561.40,615.61L561.90,612.04L560.29,610.33L562.25,609.45L566.30,607.46L570.27,602.03L575.40,604.58L578.99,609.04L578.70,609.80L579.65,613.90L577.58,614.90L577.19,618.64L578.14,619.61Z" },
  { id: '43507', name: '水上村', nameEn: 'Mizukami', prefId: '43', cx: 571.7, cy: 589.3, d: "M555.47,570.77L559.27,567.79L565.29,568.62L571.13,564.67L572.81,571.11L577.42,578.41L582.60,578.54L582.88,584.40L583.92,584.76L585.14,586.92L583.88,589.03L583.96,590.29L587.50,593.14L588.49,592.83L590.99,597.20L591.99,598.11L587.93,605.61L587.41,607.12L584.97,609.45L583.14,610.53L578.99,609.04L575.40,604.58L570.27,602.03L566.30,607.46L562.25,609.45L563.92,605.73L559.20,600.13L556.07,591.52L556.09,588.18L559.71,582.58L559.38,579.17L554.96,574.05L555.47,570.77Z" },
  { id: '43510', name: '相良村', nameEn: 'Sagara', prefId: '43', cx: 531.7, cy: 604.8, d: "M521.34,629.45L522.57,622.87L526.05,616.03L526.29,608.05L528.57,604.10L525.93,601.67L523.78,602.91L523.75,593.01L520.98,587.00L523.85,587.70L526.35,585.69L528.53,589.03L532.99,591.55L534.05,594.24L536.25,594.87L539.13,592.31L546.55,593.06L543.54,598.98L540.17,602.69L541.43,607.07L535.51,612.59L535.94,617.80L527.71,620.97L527.07,626.52L529.37,628.15L521.34,629.45Z" },
  { id: '43511', name: '五木村', nameEn: 'Itsuki', prefId: '43', cx: 533.9, cy: 575.4, d: "M512.29,582.23L512.84,580.22L509.10,579.06L508.28,575.66L510.18,573.36L508.65,568.05L512.68,567.04L512.00,562.40L514.97,563.19L514.87,561.69L522.32,559.15L524.15,556.76L528.79,557.63L533.80,555.56L536.45,558.36L538.66,556.88L546.92,563.52L547.28,569.72L555.47,570.77L554.96,574.05L559.38,579.17L559.71,582.58L556.09,588.18L556.07,591.52L552.16,590.85L546.55,593.06L539.13,592.31L536.25,594.87L534.05,594.24L532.99,591.55L528.53,589.03L526.35,585.69L523.85,587.70L520.98,587.00L520.31,584.71L513.69,584.20L512.29,582.23Z" },
  { id: '43512', name: '山江村', nameEn: 'Yamae', prefId: '43', cx: 516.1, cy: 601.8, d: "M502.59,594.99L508.46,583.87L512.29,582.23L513.69,584.20L520.31,584.71L520.98,587.00L523.75,593.01L523.78,602.91L525.93,601.67L528.57,604.10L526.29,608.05L526.05,616.03L522.57,622.87L521.57,621.25L517.49,623.39L514.98,618.68L512.73,618.89L512.02,611.34L510.57,610.75L510.45,608.15L507.52,606.74L507.13,602.38L502.59,594.99Z" },
  { id: '43513', name: '球磨村', nameEn: 'Kuma', prefId: '43', cx: 493.4, cy: 615.5, d: "M491.54,589.29L494.77,587.20L497.65,595.51L502.59,594.99L507.13,602.38L507.52,606.74L506.23,609.41L508.24,611.59L508.11,614.09L511.24,616.72L506.87,623.15L499.74,629.46L497.94,634.47L496.46,634.82L496.79,638.45L494.81,638.68L493.56,643.01L491.34,642.85L490.39,642.09L487.37,641.81L486.27,640.05L485.79,636.74L484.75,634.11L480.75,634.29L478.11,632.17L479.73,628.95L478.57,628.00L480.49,615.11L485.48,611.35L483.58,610.79L482.22,606.92L485.18,602.94L482.71,598.74L483.42,594.83L490.19,591.80L491.54,589.29Z" },
  { id: '43514', name: 'あさぎり町', nameEn: 'Asagiri', prefId: '43', cx: 550.8, cy: 628.5, d: "M549.55,648.25L545.59,645.28L548.36,640.52L542.99,634.76L541.17,629.28L537.07,628.39L539.56,625.42L535.94,617.80L535.51,612.59L541.43,607.07L540.17,602.69L543.54,598.98L547.61,603.36L548.21,610.46L550.95,614.06L550.10,617.24L554.30,617.55L564.52,627.94L563.09,633.14L564.66,633.76L564.80,640.42L566.43,641.34L566.48,643.82L564.54,645.03L562.64,646.66L562.61,650.64L553.64,651.79L550.17,649.56L549.55,648.25Z" },
  { id: '43531', name: '苓北町', nameEn: 'Reihoku', prefId: '43', cx: 369.6, cy: 558.8, d: "M379.43,544.34L381.25,547.19L379.15,552.07L379.44,556.76L376.90,559.91L375.04,559.85L371.86,565.44L374.28,567.66L374.48,573.05L370.77,570.56L363.04,571.98L358.06,570.59L362.32,563.73L362.86,557.87L364.33,557.56L361.77,550.93L356.87,547.92L359.69,545.81L362.28,546.27L361.21,548.68L363.51,551.53L368.32,551.31L379.43,544.34Z" },
  { id: '40100', name: '北九州市', nameEn: 'Kitakyushu', prefId: '40', cx: 535.3, cy: 215.9, d: "M526.15,242.94L525.81,235.77L524.19,233.32L519.50,231.76L516.17,236.04L512.06,235.77L508.32,234.86L505.43,229.35L504.66,228.04L507.44,226.53L509.31,227.54L513.11,224.32L507.85,219.70L507.85,217.26L504.02,213.89L499.98,206.03L500.80,203.87L498.17,198.51L502.79,193.76L507.61,193.76L512.03,196.42L512.36,195.18L515.16,195.17L515.15,191.83L518.59,191.31L518.61,192.99L516.75,193.25L518.62,195.89L514.93,197.37L520.01,196.38L520.48,194.60L526.88,195.28L529.26,197.44L529.01,198.93L527.37,198.67L528.87,199.64L528.35,202.67L524.39,205.63L515.39,208.70L513.41,206.30L514.57,209.77L521.50,208.70L526.06,205.58L525.31,209.39L526.53,209.36L526.52,205.30L530.14,202.30L530.58,198.05L537.06,195.80L536.09,199.46L540.07,198.81L536.23,201.56L540.65,199.19L543.29,201.91L540.48,203.37L544.06,202.69L544.98,206.21L553.49,201.24L556.56,193.56L560.02,191.23L560.15,187.57L566.40,187.68L568.52,185.64L573.18,188.70L572.57,192.68L570.36,192.68L570.33,195.59L568.36,197.04L570.89,199.23L569.18,199.37L569.01,202.21L567.39,201.39L565.63,203.13L568.92,205.85L568.01,209.84L566.04,206.83L564.23,211.50L567.68,211.18L566.66,215.53L563.23,217.19L562.97,219.72L559.59,218.54L558.80,220.91L560.91,225.97L564.06,225.69L558.07,233.18L550.18,234.67L548.82,241.22L547.16,240.13L545.46,244.92L544.42,242.83L539.80,244.89L537.09,244.53L534.83,247.37L530.00,248.16L526.15,242.94ZM534.92,193.34L530.05,195.57L521.91,194.41L520.46,191.63L527.19,190.96L528.35,192.29L532.19,190.68L534.92,193.34ZM528.22,179.04L528.12,177.78L530.13,181.32L529.00,180.77L528.22,179.04ZM510.04,175.87L508.63,173.88L509.35,173.27L510.67,173.99L510.04,175.87ZM576.40,219.41L574.32,219.76L573.33,214.11L575.40,213.77L576.40,219.41Z" },
  { id: '40130', name: '福岡市', nameEn: 'Fukuoka', prefId: '40', cx: 431.1, cy: 287.6, d: "M447.03,298.05L445.48,296.17L440.58,299.16L438.92,302.03L433.59,302.61L437.17,315.18L440.68,318.75L438.89,318.84L438.92,322.07L435.13,322.66L431.94,320.18L430.29,320.60L428.07,317.64L419.06,313.54L417.48,312.98L412.39,309.00L412.35,305.04L416.60,300.54L415.93,294.09L411.89,291.93L411.00,289.59L404.73,289.89L405.76,285.43L405.04,283.58L401.08,283.55L399.49,281.43L398.41,271.48L396.51,268.66L398.38,266.95L399.14,261.70L403.59,264.71L404.91,266.39L402.29,270.59L403.78,274.42L412.69,275.77L412.11,279.63L410.35,277.96L407.82,278.68L414.07,283.46L419.17,282.83L421.27,279.15L429.67,279.88L434.10,277.38L436.68,280.13L438.29,279.34L436.47,276.77L437.60,276.20L438.57,278.07L440.18,277.39L438.88,276.10L440.03,274.02L442.73,274.38L440.51,272.88L441.79,270.39L440.62,270.00L441.32,267.98L444.14,268.30L444.40,266.91L440.82,265.54L446.70,263.82L445.22,259.81L446.27,256.83L440.49,258.27L439.42,260.81L432.99,262.28L431.26,264.00L431.46,267.55L425.60,266.25L423.70,263.54L428.25,263.10L436.95,258.85L443.23,252.80L443.59,250.36L449.98,254.06L451.54,258.66L454.45,258.66L456.65,266.40L459.96,267.01L459.91,269.93L458.09,271.92L455.18,269.31L448.53,275.47L448.81,276.98L454.56,281.90L458.06,288.65L458.07,288.67L456.39,290.60L453.04,288.55L454.57,290.48L454.49,294.28L453.30,294.80L450.90,291.53L449.60,291.81L447.03,298.05ZM421.33,274.65L420.00,276.53L417.89,276.49L418.74,269.02L420.02,269.86L421.33,274.65ZM421.76,262.06L421.79,263.16L418.05,263.49L415.36,258.68L416.23,257.33L419.08,256.62L421.76,262.06ZM403.99,257.86L402.14,255.69L403.17,254.90L405.03,256.08L403.99,257.86ZM361.96,209.72L362.46,211.06L362.12,212.64L361.26,211.64L361.96,209.72ZM443.49,264.00L439.35,264.70L438.52,263.03L444.26,259.72L445.77,262.26L443.49,264.00Z" },
  { id: '40202', name: '大牟田市', nameEn: 'Omuta', prefId: '40', cx: 454.6, cy: 418.0, d: "M470.21,409.00L468.69,409.93L468.03,413.08L462.00,414.97L460.07,417.32L462.09,420.31L462.32,423.00L463.47,423.74L464.51,426.03L462.64,428.58L460.94,427.91L457.70,429.15L450.58,428.58L442.77,428.98L439.04,429.55L441.74,427.18L443.88,427.57L441.40,425.20L444.69,422.13L445.15,416.24L443.52,411.48L448.12,410.46L450.37,407.45L457.49,408.16L462.58,406.43L462.81,404.91L464.80,405.32L465.95,408.68L468.73,406.80L470.21,409.00Z" },
  { id: '40203', name: '久留米市', nameEn: 'Kurume', prefId: '40', cx: 475.4, cy: 352.8, d: "M496.80,338.47L508.76,338.80L510.70,339.26L510.57,340.72L509.42,339.59L507.83,340.76L510.52,342.30L508.99,344.61L510.05,353.44L509.04,353.57L501.65,352.60L490.52,354.40L486.10,357.59L479.77,362.00L477.30,359.99L475.27,362.56L467.79,364.67L463.88,364.14L463.71,365.79L462.22,368.02L456.53,368.75L453.37,373.20L452.14,369.98L449.13,367.89L448.78,369.91L447.30,369.98L447.77,371.99L442.39,373.04L442.27,371.09L440.01,371.78L436.58,369.08L437.38,364.89L439.75,364.40L440.19,367.02L442.93,366.02L443.92,363.77L443.39,362.35L446.10,360.50L445.49,356.59L447.98,356.78L447.25,360.17L448.82,363.16L450.38,362.89L450.16,359.54L453.62,357.92L453.91,356.54L451.77,355.67L451.64,353.91L454.01,352.91L457.90,352.55L458.86,350.10L456.45,346.77L457.73,345.83L461.01,347.68L463.72,343.03L466.86,344.00L468.82,343.31L476.24,340.22L477.90,337.24L488.80,337.29L489.22,340.82L493.34,338.30L496.80,338.47Z" },
  { id: '40204', name: '直方市', nameEn: 'Nogata', prefId: '40', cx: 513.6, cy: 240.6, d: "M505.43,229.35L508.32,234.86L512.06,235.77L516.17,236.04L519.50,231.76L524.19,233.32L525.81,235.77L526.15,242.94L522.85,243.63L519.58,247.84L514.21,249.51L513.27,253.07L509.75,251.85L509.74,246.17L506.96,245.33L505.43,242.68L501.02,242.56L500.53,241.33L499.65,237.62L503.57,236.45L502.87,232.23L505.43,229.35Z" },
  { id: '40205', name: '飯塚市', nameEn: 'Iizuka', prefId: '40', cx: 495.5, cy: 275.2, d: "M509.75,251.85L513.27,253.07L515.69,257.34L515.99,262.55L516.84,265.00L514.94,267.65L514.70,270.72L516.58,274.00L520.03,276.36L519.42,279.97L517.18,282.11L513.53,279.96L512.44,275.51L507.07,274.60L505.26,272.74L503.48,274.15L503.93,278.79L497.48,278.59L493.03,281.50L496.58,283.85L495.48,287.02L496.65,290.70L499.13,291.03L497.96,296.50L496.09,298.12L495.86,302.85L493.88,301.06L487.10,302.28L479.11,290.06L474.58,280.34L473.56,278.79L475.69,276.92L479.42,277.88L481.90,274.74L479.20,273.95L479.47,270.52L477.18,269.09L479.46,266.45L486.04,264.58L487.30,261.43L490.43,260.63L491.81,256.55L497.73,255.75L499.13,257.73L505.55,257.71L506.48,253.32L508.47,253.57L509.75,251.85Z" },
  { id: '40206', name: '田川市', nameEn: 'Tagawa', prefId: '40', cx: 525.3, cy: 270.8, d: "M517.18,282.11L519.42,279.97L520.03,276.36L516.58,274.00L514.70,270.72L514.94,267.65L516.30,268.78L523.71,265.76L522.68,262.00L526.89,260.75L526.10,258.54L527.72,254.88L531.18,254.34L530.71,262.39L533.12,263.44L531.66,264.98L534.54,267.39L532.99,270.51L535.11,274.27L532.18,277.28L524.18,272.86L525.60,275.53L524.85,283.10L522.11,286.63L519.49,286.01L517.18,282.11Z" },
  { id: '40207', name: '柳川市', nameEn: 'Yanagawa', prefId: '40', cx: 441.8, cy: 392.3, d: "M444.09,380.64L446.23,380.63L447.27,383.98L451.96,382.84L451.79,385.41L456.01,386.56L451.13,388.82L452.70,389.57L452.73,392.34L451.25,392.53L451.36,394.54L442.25,407.76L437.51,405.99L439.24,402.43L434.04,399.47L434.04,394.03L430.29,394.26L430.32,390.87L429.51,386.60L432.80,385.79L433.79,382.71L438.07,384.50L440.09,381.06L444.09,380.64Z" },
  { id: '40210', name: '八女市', nameEn: 'Yame', prefId: '40', cx: 504.4, cy: 379.5, d: "M486.10,357.59L490.52,354.40L501.65,352.60L509.04,353.57L510.32,357.18L513.17,358.96L518.53,358.67L521.29,362.00L523.51,361.68L523.77,363.26L530.60,365.82L531.16,367.97L530.90,370.01L538.03,371.93L533.09,376.59L543.99,382.71L543.62,385.22L541.01,387.34L542.32,391.08L540.54,392.46L538.76,398.70L538.47,400.00L534.72,402.52L533.11,403.09L529.65,402.76L527.82,400.22L522.97,398.37L520.49,398.57L519.06,398.29L511.92,392.75L511.29,390.97L506.54,390.49L501.99,390.59L499.63,386.47L499.35,388.25L496.96,390.08L497.25,394.61L494.21,400.54L494.53,402.27L487.08,401.57L480.33,400.90L478.28,400.38L474.35,403.36L472.31,398.07L472.39,390.54L469.41,389.35L470.95,383.77L468.81,383.17L466.64,381.10L467.06,379.12L464.84,378.97L466.61,371.64L465.15,371.41L477.90,370.40L482.26,367.99L484.95,370.04L488.94,369.71L486.63,364.28L486.10,357.59Z" },
  { id: '40211', name: '筑後市', nameEn: 'Chikugo', prefId: '40', cx: 459.0, cy: 377.4, d: "M453.37,373.20L456.53,368.75L462.22,368.02L463.71,365.79L462.97,369.54L465.15,371.41L466.61,371.64L464.84,378.97L467.06,379.12L466.64,381.10L468.81,383.17L462.28,383.66L460.22,386.13L458.58,386.13L458.48,383.60L456.18,383.49L456.01,386.56L451.79,385.41L451.96,382.84L450.78,378.04L453.37,373.20Z" },
  { id: '40212', name: '大川市', nameEn: 'Okawa', prefId: '40', cx: 435.9, cy: 377.9, d: "M436.58,369.08L440.01,371.78L442.27,371.09L442.39,373.04L444.75,374.09L444.09,380.64L440.09,381.06L438.07,384.50L433.79,382.71L432.80,385.79L429.51,386.60L429.72,384.17L428.42,383.80L427.03,382.17L427.49,377.18L434.65,374.25L435.26,371.92L433.47,370.18L434.03,368.13L436.58,369.08Z" },
  { id: '40213', name: '行橋市', nameEn: 'Yukuhashi', prefId: '40', cx: 561.9, cy: 250.1, d: "M545.46,244.92L547.16,240.13L548.82,241.22L557.66,244.54L568.95,240.96L569.84,242.47L571.52,240.74L571.24,244.79L577.85,256.25L575.92,258.59L572.95,257.67L570.35,259.49L567.04,254.88L565.86,256.28L561.81,255.72L558.45,259.00L552.27,260.50L552.83,253.65L554.93,250.70L553.36,248.59L550.62,248.22L549.27,250.58L547.95,250.02L545.46,244.92Z" },
  { id: '40214', name: '豊前市', nameEn: 'Buzen', prefId: '40', cx: 584.5, cy: 286.6, d: "M603.60,274.42L600.76,278.10L601.56,279.10L596.07,283.85L591.51,292.97L588.04,294.84L587.49,297.58L582.53,301.53L581.55,301.24L579.46,301.83L575.70,299.01L571.30,301.53L567.55,301.27L565.91,301.51L566.88,297.00L570.35,293.72L570.65,290.34L574.31,287.46L578.47,279.73L586.59,270.00L589.46,274.11L591.38,274.09L592.65,270.99L603.60,274.42Z" },
  { id: '40215', name: '中間市', nameEn: 'Nakama', prefId: '40', cx: 505.2, cy: 223.4, d: "M507.85,219.70L513.11,224.32L509.31,227.54L507.44,226.53L504.66,228.04L497.43,223.43L499.03,220.69L502.03,219.79L502.98,220.79L504.50,219.57L504.26,217.82L507.85,219.70Z" },
  { id: '40216', name: '小郡市', nameEn: 'Ogori', prefId: '40', cx: 474.9, cy: 329.0, d: "M477.90,337.24L476.24,340.22L468.82,343.31L470.10,337.43L469.91,323.62L469.12,322.35L468.93,319.16L471.74,318.71L472.59,316.40L478.19,319.66L484.51,325.87L481.03,328.33L477.90,337.24Z" },
  { id: '40217', name: '筑紫野市', nameEn: 'Chikushino', prefId: '40', cx: 470.5, cy: 307.8, d: "M479.11,290.06L487.10,302.28L484.69,305.62L480.17,307.40L478.26,310.67L474.44,310.46L475.17,314.68L479.23,318.64L478.19,319.66L472.59,316.40L471.74,318.71L468.93,319.16L463.51,316.61L463.19,317.95L460.26,317.70L459.23,318.97L452.88,321.86L452.04,314.53L453.91,312.27L457.32,312.71L458.99,311.24L461.82,302.27L464.08,303.81L465.57,301.99L467.38,302.32L469.86,306.10L471.69,302.22L469.77,300.65L470.15,298.36L473.58,297.89L476.56,293.13L479.11,290.06Z" },
  { id: '40218', name: '春日市', nameEn: 'Kasuga', prefId: '40', cx: 451.7, cy: 297.9, d: "M447.03,298.05L449.60,291.81L450.90,291.53L453.30,294.80L454.49,294.28L456.22,294.84L455.88,300.95L450.51,304.11L447.03,298.05Z" },
  { id: '40219', name: '大野城市', nameEn: 'Onojo', prefId: '40', cx: 456.7, cy: 300.5, d: "M454.49,294.28L454.57,290.48L453.04,288.55L456.39,290.60L458.07,288.67L461.54,288.79L464.19,294.51L458.85,296.15L460.02,298.86L458.18,300.46L457.52,306.24L458.99,311.24L457.32,312.71L453.91,312.27L451.68,311.22L450.51,304.11L455.88,300.95L456.22,294.84L454.49,294.28Z" },
  { id: '40220', name: '宗像市', nameEn: 'Munakata', prefId: '40', cx: 473.4, cy: 225.1, d: "M470.31,205.96L472.32,210.88L478.75,218.14L480.73,223.85L485.24,222.59L490.21,225.16L491.03,230.72L489.69,230.72L489.45,233.35L486.62,232.62L483.67,234.14L482.20,237.94L472.92,240.81L469.40,233.82L466.74,233.38L465.58,234.66L460.05,229.78L462.23,225.98L461.17,220.58L456.80,215.61L463.57,214.06L467.17,209.91L467.39,206.26L470.31,205.96ZM458.78,199.82L460.43,200.17L462.34,203.96L460.21,203.41L458.78,199.82ZM447.99,199.33L449.96,200.08L446.31,206.20L441.92,205.03L441.82,200.56L445.78,200.87L447.99,199.33ZM378.19,115.23L376.66,117.81L375.19,117.24L376.33,115.48L378.19,115.23Z" },
  { id: '40221', name: '太宰府市', nameEn: 'Dazaifu', prefId: '40', cx: 466.3, cy: 298.5, d: "M476.56,293.13L473.58,297.89L470.15,298.36L469.77,300.65L471.69,302.22L469.86,306.10L467.38,302.32L465.57,301.99L464.08,303.81L461.82,302.27L458.99,311.24L457.52,306.24L458.18,300.46L460.02,298.86L458.85,296.15L464.19,294.51L465.44,296.31L469.83,290.00L471.65,289.62L476.56,293.13Z" },
  { id: '40223', name: '古賀市', nameEn: 'Koga', prefId: '40', cx: 460.8, cy: 248.1, d: "M471.34,245.81L473.68,248.47L470.69,250.96L468.16,251.05L462.92,256.78L461.72,254.26L459.31,255.44L454.13,254.61L454.41,251.53L449.82,247.21L454.16,239.99L463.10,243.37L469.90,243.97L471.34,245.81Z" },
  { id: '40224', name: '福津市', nameEn: 'Fukutsu', prefId: '40', cx: 460.5, cy: 233.2, d: "M456.80,215.61L461.17,220.58L462.23,225.98L460.05,229.78L465.58,234.66L466.74,233.38L469.40,233.82L472.92,240.81L471.34,245.81L469.90,243.97L463.10,243.37L454.16,239.99L454.64,233.71L452.81,231.29L450.51,232.18L449.56,230.70L450.69,227.96L449.15,224.49L453.81,225.41L455.46,223.62L456.80,215.61Z" },
  { id: '40225', name: 'うきは市', nameEn: 'Ukiha', prefId: '40', cx: 523.8, cy: 351.2, d: "M509.04,353.57L510.05,353.44L508.99,344.61L510.52,342.30L507.83,340.76L509.42,339.59L510.57,340.72L510.70,339.26L508.76,338.80L510.72,335.71L513.85,338.90L514.23,337.79L519.50,338.80L521.53,341.83L527.18,338.91L532.85,343.16L536.11,344.89L538.46,353.31L539.48,356.09L537.51,357.89L536.42,359.78L539.84,363.14L531.43,364.81L530.60,365.82L523.77,363.26L523.51,361.68L521.29,362.00L518.53,358.67L513.17,358.96L510.32,357.18L509.04,353.57Z" },
  { id: '40226', name: '宮若市', nameEn: 'Miyawaka', prefId: '40', cx: 485.8, cy: 249.6, d: "M500.53,241.33L501.02,242.56L505.43,242.68L506.96,245.33L506.19,247.27L502.92,248.57L503.66,253.24L501.00,253.81L500.28,252.63L497.73,255.75L491.81,256.55L490.43,260.63L487.30,261.43L486.04,264.58L479.46,266.45L477.18,269.09L475.34,266.96L477.23,264.18L474.40,262.13L469.99,259.45L470.69,250.96L473.68,248.47L471.34,245.81L472.92,240.81L482.20,237.94L483.67,234.14L486.62,232.62L489.45,233.35L489.69,230.72L491.03,230.72L493.40,235.38L494.34,242.70L497.01,243.32L500.53,241.33Z" },
  { id: '40227', name: '嘉麻市', nameEn: 'Kama', prefId: '40', cx: 512.4, cy: 294.7, d: "M503.93,278.79L503.48,274.15L505.26,272.74L507.07,274.60L512.44,275.51L513.53,279.96L517.18,282.11L519.49,286.01L522.11,286.63L525.86,291.93L526.15,300.98L527.50,301.38L529.06,306.62L527.06,307.98L526.59,310.89L523.41,311.11L522.57,308.95L517.95,306.84L509.70,307.94L497.20,304.29L495.86,302.85L496.09,298.12L497.96,296.50L501.95,291.08L502.25,287.19L504.78,283.20L503.93,278.79Z" },
  { id: '40228', name: '朝倉市', nameEn: 'Asakura', prefId: '40', cx: 513.0, cy: 324.8, d: "M508.76,338.80L496.80,338.47L493.74,335.55L491.14,335.65L492.34,332.50L487.98,331.29L486.00,327.73L487.61,325.87L490.21,325.97L495.02,319.86L492.72,314.85L497.20,304.29L509.70,307.94L517.95,306.84L522.57,308.95L523.41,311.11L520.94,312.06L518.81,315.71L529.19,314.57L531.44,317.05L533.15,323.70L535.71,324.43L538.03,329.05L538.06,335.76L538.50,338.37L532.85,343.16L527.18,338.91L521.53,341.83L519.50,338.80L514.23,337.79L513.85,338.90L510.72,335.71L508.76,338.80Z" },
  { id: '40229', name: 'みやま市', nameEn: 'Miyama', prefId: '40', cx: 460.3, cy: 397.8, d: "M470.21,409.00L468.73,406.80L465.95,408.68L464.80,405.32L462.81,404.91L462.58,406.43L457.49,408.16L450.37,407.45L448.12,410.46L443.52,411.48L442.25,407.76L451.36,394.54L451.25,392.53L452.73,392.34L452.70,389.57L451.13,388.82L456.01,386.56L456.18,383.49L458.48,383.60L458.58,386.13L460.22,386.13L462.28,383.66L468.81,383.17L470.95,383.77L469.41,389.35L472.39,390.54L472.31,398.07L474.35,403.36L475.12,406.51L475.16,407.65L470.21,409.00Z" },
  { id: '40230', name: '糸島市', nameEn: 'Itoshima', prefId: '40', cx: 392.9, cy: 295.3, d: "M364.38,284.75L365.76,285.96L364.94,287.30L363.80,286.52L364.38,284.75ZM396.51,268.66L398.41,271.48L399.49,281.43L401.08,283.55L405.04,283.58L405.76,285.43L404.73,289.89L411.00,289.59L411.89,291.93L415.93,294.09L416.60,300.54L412.35,305.04L412.39,309.00L409.27,309.83L408.17,311.11L406.43,310.25L404.12,309.13L401.96,309.27L398.17,308.49L394.55,310.17L393.29,312.20L389.46,311.56L387.73,309.67L385.96,309.52L383.88,311.25L381.95,309.96L376.26,309.88L375.25,311.40L368.76,310.73L362.91,311.16L364.56,305.01L376.15,300.56L381.32,301.28L382.66,299.44L380.94,297.65L387.11,294.49L389.54,289.97L389.30,288.46L387.49,288.71L384.42,291.26L381.18,289.52L379.03,292.06L379.90,289.13L382.46,289.06L383.07,287.13L379.79,285.05L375.09,287.62L373.20,282.85L376.87,282.48L377.30,279.58L381.58,281.21L386.01,279.50L388.84,275.48L387.17,273.35L387.75,271.58L396.51,268.66Z" },
  { id: '40231', name: '那珂川市', nameEn: 'Nakagawa', prefId: '40', cx: 444.4, cy: 312.6, d: "M438.92,322.07L438.89,318.84L440.68,318.75L437.17,315.18L433.59,302.61L438.92,302.03L440.58,299.16L445.48,296.17L447.03,298.05L450.51,304.11L451.68,311.22L453.91,312.27L452.04,314.53L452.88,321.86L452.15,322.67L452.20,323.94L448.77,325.03L447.95,328.88L441.39,329.31L442.97,326.62L438.92,322.07Z" },
  { id: '40341', name: '宇美町', nameEn: 'Umi', prefId: '40', cx: 469.1, cy: 287.8, d: "M458.07,288.67L458.06,288.65L460.94,283.57L467.96,284.69L470.92,283.96L471.46,281.94L474.58,280.34L479.11,290.06L476.56,293.13L471.65,289.62L469.83,290.00L465.44,296.31L464.19,294.51L461.54,288.79L458.07,288.67Z" },
  { id: '40342', name: '篠栗町', nameEn: 'Sasaguri', prefId: '40', cx: 471.2, cy: 272.5, d: "M477.18,269.09L479.47,270.52L479.20,273.95L481.90,274.74L479.42,277.88L475.69,276.92L473.56,278.79L469.26,279.82L461.03,274.91L460.69,269.89L468.83,268.89L474.40,262.13L477.23,264.18L475.34,266.96L477.18,269.09Z" },
  { id: '40343', name: '志免町', nameEn: 'Shime', prefId: '40', cx: 456.0, cy: 281.8, d: "M458.06,288.65L454.56,281.90L448.81,276.98L452.16,276.23L456.74,280.47L458.72,280.31L460.94,283.57L458.06,288.65Z" },
  { id: '40344', name: '須恵町', nameEn: 'Sue', prefId: '40', cx: 465.1, cy: 280.4, d: "M473.56,278.79L474.58,280.34L471.46,281.94L470.92,283.96L467.96,284.69L460.94,283.57L458.72,280.31L458.84,276.26L461.03,274.91L469.26,279.82L473.56,278.79Z" },
  { id: '40345', name: '新宮町', nameEn: 'Shingu', prefId: '40', cx: 453.2, cy: 254.1, d: "M454.45,258.66L451.54,258.66L449.98,254.06L443.59,250.36L444.29,248.88L446.62,249.46L449.82,247.21L454.41,251.53L454.13,254.61L459.31,255.44L461.72,254.26L462.92,256.78L458.68,259.98L454.45,258.66ZM431.95,236.65L433.89,237.23L434.65,238.46L431.79,239.67L431.95,236.65Z" },
  { id: '40348', name: '久山町', nameEn: 'Hisayama', prefId: '40', cx: 464.8, cy: 261.9, d: "M459.91,269.93L459.96,267.01L456.65,266.40L454.45,258.66L458.68,259.98L462.92,256.78L468.16,251.05L470.69,250.96L469.99,259.45L474.40,262.13L468.83,268.89L460.69,269.89L459.91,269.93Z" },
  { id: '40349', name: '粕屋町', nameEn: 'Kasuya', prefId: '40', cx: 455.7, cy: 274.7, d: "M448.81,276.98L448.53,275.47L455.18,269.31L458.09,271.92L459.91,269.93L460.69,269.89L461.03,274.91L458.84,276.26L458.72,280.31L456.74,280.47L452.16,276.23L448.81,276.98Z" },
  { id: '40381', name: '芦屋町', nameEn: 'Ashiya', prefId: '40', cx: 495.9, cy: 205.5, d: "M498.17,198.51L500.80,203.87L499.98,206.03L498.89,205.60L496.74,210.03L491.78,211.26L491.62,207.92L490.14,206.88L496.04,202.93L495.80,199.86L498.17,198.51Z" },
  { id: '40382', name: '水巻町', nameEn: 'Mizumaki', prefId: '40', cx: 503.0, cy: 214.6, d: "M499.98,206.03L504.02,213.89L507.85,217.26L507.85,219.70L504.26,217.82L504.50,219.57L502.98,220.79L502.03,219.79L498.89,205.60L499.98,206.03Z" },
  { id: '40383', name: '岡垣町', nameEn: 'Okagaki', prefId: '40', cx: 483.6, cy: 214.6, d: "M490.21,225.16L485.24,222.59L480.73,223.85L478.75,218.14L472.32,210.88L470.31,205.96L474.53,205.69L476.04,208.16L480.59,208.79L490.14,206.88L491.62,207.92L491.78,211.26L490.65,215.82L493.79,215.57L493.85,216.66L490.21,225.16Z" },
  { id: '40384', name: '遠賀町', nameEn: 'Onga', prefId: '40', cx: 496.2, cy: 216.7, d: "M502.03,219.79L499.03,220.69L497.43,223.43L494.92,223.55L493.00,225.94L490.21,225.16L493.85,216.66L493.79,215.57L490.65,215.82L491.78,211.26L496.74,210.03L498.89,205.60L502.03,219.79Z" },
  { id: '40401', name: '小竹町', nameEn: 'Kotake', prefId: '40', cx: 504.8, cy: 252.3, d: "M506.96,245.33L509.74,246.17L509.75,251.85L508.47,253.57L506.48,253.32L505.55,257.71L499.13,257.73L497.73,255.75L500.28,252.63L501.00,253.81L503.66,253.24L502.92,248.57L506.19,247.27L506.96,245.33Z" },
  { id: '40402', name: '鞍手町', nameEn: 'Kurate', prefId: '40', cx: 497.4, cy: 232.3, d: "M504.66,228.04L505.43,229.35L502.87,232.23L503.57,236.45L499.65,237.62L500.53,241.33L497.01,243.32L494.34,242.70L493.40,235.38L491.03,230.72L490.21,225.16L493.00,225.94L494.92,223.55L497.43,223.43L504.66,228.04Z" },
  { id: '40421', name: '桂川町', nameEn: 'Keisen', prefId: '40', cx: 499.5, cy: 284.9, d: "M497.96,296.50L499.13,291.03L496.65,290.70L495.48,287.02L496.58,283.85L493.03,281.50L497.48,278.59L503.93,278.79L504.78,283.20L502.25,287.19L501.95,291.08L497.96,296.50Z" },
  { id: '40447', name: '筑前町', nameEn: 'Chikuzen', prefId: '40', cx: 486.7, cy: 313.8, d: "M487.10,302.28L493.88,301.06L495.86,302.85L497.20,304.29L492.72,314.85L495.02,319.86L490.21,325.97L487.61,325.87L486.00,327.73L484.51,325.87L478.19,319.66L479.23,318.64L475.17,314.68L474.44,310.46L478.26,310.67L480.17,307.40L484.69,305.62L487.10,302.28Z" },
  { id: '40448', name: '東峰村', nameEn: 'Toho', prefId: '40', cx: 535.8, cy: 319.8, d: "M523.41,311.11L526.59,310.89L527.06,307.98L529.06,306.62L534.45,307.46L535.51,309.01L533.00,311.77L536.66,316.97L546.73,316.58L545.59,317.35L543.65,334.18L538.06,335.76L538.03,329.05L535.71,324.43L533.15,323.70L531.44,317.05L529.19,314.57L518.81,315.71L520.94,312.06L523.41,311.11Z" },
  { id: '40503', name: '大刀洗町', nameEn: 'Tachiarai', prefId: '40', cx: 486.0, cy: 333.8, d: "M496.80,338.47L493.34,338.30L489.22,340.82L488.80,337.29L477.90,337.24L481.03,328.33L484.51,325.87L486.00,327.73L487.98,331.29L492.34,332.50L491.14,335.65L493.74,335.55L496.80,338.47Z" },
  { id: '40522', name: '大木町', nameEn: 'Oki', prefId: '40', cx: 448.6, cy: 376.2, d: "M442.39,373.04L447.77,371.99L447.30,369.98L448.78,369.91L449.13,367.89L452.14,369.98L453.37,373.20L450.78,378.04L451.96,382.84L447.27,383.98L446.23,380.63L444.09,380.64L444.75,374.09L442.39,373.04Z" },
  { id: '40544', name: '広川町', nameEn: 'Hirokawa', prefId: '40', cx: 476.4, cy: 366.1, d: "M463.71,365.79L463.88,364.14L467.79,364.67L475.27,362.56L477.30,359.99L479.77,362.00L486.10,357.59L486.63,364.28L488.94,369.71L484.95,370.04L482.26,367.99L477.90,370.40L465.15,371.41L462.97,369.54L463.71,365.79Z" },
  { id: '40601', name: '香春町', nameEn: 'Kawara', prefId: '40', cx: 537.0, cy: 257.4, d: "M530.00,248.16L534.83,247.37L537.09,244.53L539.80,244.89L541.44,256.33L544.48,261.29L542.89,264.14L544.65,266.11L539.75,268.60L537.23,267.14L534.54,267.39L531.66,264.98L533.12,263.44L530.71,262.39L531.18,254.34L531.69,250.64L530.00,248.16Z" },
  { id: '40602', name: '添田町', nameEn: 'Soeda', prefId: '40', cx: 542.4, cy: 300.5, d: "M529.06,306.62L527.50,301.38L531.07,298.56L532.12,295.21L533.06,280.96L534.98,282.17L537.29,281.27L538.48,283.34L539.84,282.56L541.18,285.81L544.39,283.55L551.38,289.36L555.28,301.51L554.79,304.01L557.34,306.91L555.75,307.42L552.30,314.47L548.93,316.44L546.73,316.58L536.66,316.97L533.00,311.77L535.51,309.01L534.45,307.46L529.06,306.62Z" },
  { id: '40604', name: '糸田町', nameEn: 'Itoda', prefId: '40', cx: 519.4, cy: 264.7, d: "M514.94,267.65L516.84,265.00L515.99,262.55L521.85,260.69L522.68,262.00L523.71,265.76L516.30,268.78L514.94,267.65Z" },
  { id: '40605', name: '川崎町', nameEn: 'Kawasaki', prefId: '40', cx: 528.5, cy: 286.9, d: "M522.11,286.63L524.85,283.10L525.60,275.53L524.18,272.86L532.18,277.28L534.17,279.03L533.06,280.96L532.12,295.21L531.07,298.56L527.50,301.38L526.15,300.98L525.86,291.93L522.11,286.63Z" },
  { id: '40608', name: '大任町', nameEn: 'Oto', prefId: '40', cx: 536.2, cy: 275.5, d: "M532.18,277.28L535.11,274.27L532.99,270.51L534.54,267.39L537.23,267.14L539.84,282.56L538.48,283.34L537.29,281.27L534.98,282.17L533.06,280.96L534.17,279.03L532.18,277.28Z" },
  { id: '40609', name: '赤村', nameEn: 'Aka', prefId: '40', cx: 544.0, cy: 277.1, d: "M537.23,267.14L539.75,268.60L544.65,266.11L545.30,269.63L548.43,269.43L546.25,274.93L550.58,282.07L551.38,289.36L544.39,283.55L541.18,285.81L539.84,282.56L537.23,267.14Z" },
  { id: '40610', name: '福智町', nameEn: 'Fukuchi', prefId: '40', cx: 522.4, cy: 253.0, d: "M526.15,242.94L530.00,248.16L531.69,250.64L531.18,254.34L527.72,254.88L526.10,258.54L526.89,260.75L522.68,262.00L521.85,260.69L515.99,262.55L515.69,257.34L513.27,253.07L514.21,249.51L519.58,247.84L522.85,243.63L526.15,242.94Z" },
  { id: '40621', name: '苅田町', nameEn: 'Kanda', prefId: '40', cx: 560.9, cy: 236.0, d: "M548.82,241.22L550.18,234.67L558.07,233.18L564.06,225.69L570.58,223.44L571.37,225.49L567.81,226.58L568.20,227.91L565.27,230.35L568.58,229.83L568.70,233.13L566.88,234.67L567.90,236.07L570.56,234.02L571.85,236.41L568.23,239.11L568.95,240.96L557.66,244.54L548.82,241.22ZM574.32,219.76L576.40,219.41L577.01,223.02L574.96,223.35L574.32,219.76Z" },
  { id: '40625', name: 'みやこ町', nameEn: 'Miyako', prefId: '40', cx: 554.5, cy: 271.4, d: "M539.80,244.89L544.42,242.83L545.46,244.92L547.95,250.02L549.27,250.58L550.62,248.22L553.36,248.59L554.93,250.70L552.83,253.65L552.27,260.50L558.45,259.00L561.81,255.72L565.86,256.28L567.04,254.88L570.35,259.49L565.83,263.30L566.04,268.27L559.81,282.38L559.88,287.30L562.41,288.64L560.74,297.17L564.11,301.86L562.14,302.51L558.67,305.83L557.34,306.91L554.79,304.01L555.28,301.51L551.38,289.36L550.58,282.07L546.25,274.93L548.43,269.43L545.30,269.63L544.65,266.11L542.89,264.14L544.48,261.29L541.44,256.33L539.80,244.89Z" },
  { id: '40642', name: '吉富町', nameEn: 'Yoshitomi', prefId: '40', cx: 604.5, cy: 277.3, d: "M601.56,279.10L600.76,278.10L603.60,274.42L606.27,273.31L607.64,274.70L606.21,279.46L604.84,281.57L601.56,279.10Z" },
  { id: '40646', name: '上毛町', nameEn: 'Koge', prefId: '40', cx: 598.1, cy: 293.3, d: "M582.53,301.53L587.49,297.58L588.04,294.84L591.51,292.97L596.07,283.85L601.56,279.10L604.84,281.57L605.70,285.02L608.81,289.22L608.03,292.74L603.71,296.59L605.69,302.16L593.50,303.29L590.62,301.86L582.97,302.10L582.53,301.53Z" },
  { id: '40647', name: '築上町', nameEn: 'Chikujo', prefId: '40', cx: 571.4, cy: 276.6, d: "M570.35,259.49L572.95,257.67L575.92,258.59L577.85,256.25L586.59,270.00L578.47,279.73L574.31,287.46L570.65,290.34L570.35,293.72L566.88,297.00L565.91,301.51L564.11,301.86L560.74,297.17L562.41,288.64L559.88,287.30L559.81,282.38L566.04,268.27L565.83,263.30L570.35,259.49Z" },
  { id: '42201', name: '長崎市', nameEn: 'Nagasaki', prefId: '42', cx: 317.4, cy: 483.9, d: "M308.56,537.51L309.53,540.95L306.15,542.93L306.16,538.83L308.56,537.51ZM307.33,504.37L308.37,506.82L307.11,507.45L305.38,504.86L307.33,504.37ZM298.41,522.71L298.20,523.59L297.82,523.55L298.41,522.71ZM301.02,513.28L302.81,514.09L301.72,517.54L299.96,514.62L301.02,513.28ZM303.15,501.17L306.12,502.58L307.03,504.24L303.91,503.37L303.15,501.17ZM346.81,489.38L350.07,489.91L349.48,491.77L351.90,492.34L347.84,492.64L346.81,489.38ZM303.18,481.66L302.94,482.36L302.49,482.33L302.43,481.89L303.18,481.66ZM259.18,462.21L260.77,462.52L260.76,462.97L260.02,463.17L259.18,462.21ZM310.69,459.59L311.94,460.05L311.60,460.48L310.69,459.59ZM269.11,456.93L269.10,459.42L266.73,459.60L267.05,458.46L269.11,456.93ZM312.00,450.60L313.22,450.55L312.94,451.46L311.42,450.98L312.00,450.60ZM321.36,476.82L324.44,480.26L326.30,477.92L326.24,480.59L327.48,478.17L335.38,477.10L337.98,474.61L340.20,475.80L343.58,474.98L345.64,477.23L348.92,475.26L352.61,478.19L351.57,490.14L345.29,488.62L342.92,490.19L344.91,494.57L341.50,496.99L342.02,498.47L339.98,500.68L339.07,499.25L338.29,502.95L335.61,501.90L335.85,506.68L331.97,514.38L325.51,519.19L321.34,520.62L319.83,519.67L319.52,524.88L312.39,532.50L306.98,534.67L307.60,536.58L303.64,534.43L298.25,537.70L297.67,535.03L301.00,532.07L301.66,534.35L302.34,531.82L307.18,529.21L312.41,517.73L315.04,516.48L315.63,508.63L312.14,510.53L309.59,507.00L313.77,506.78L315.22,503.42L317.13,502.98L316.97,506.10L315.72,506.25L319.41,507.75L318.55,505.65L321.63,505.14L320.61,503.58L322.51,499.78L324.08,499.55L326.49,492.68L325.40,492.63L323.56,494.69L321.18,499.94L319.82,498.41L317.30,500.55L315.72,499.89L318.18,496.74L317.79,493.95L316.62,493.12L314.66,495.38L312.39,493.90L314.62,490.47L312.99,489.74L313.01,491.34L312.08,489.49L310.81,489.91L311.68,485.57L309.54,485.09L306.59,480.54L304.54,480.51L306.02,475.20L299.87,474.29L298.47,478.11L297.25,477.87L294.24,474.21L293.97,471.45L290.66,471.95L290.21,469.50L286.91,466.70L285.18,463.03L285.76,459.83L283.32,455.85L286.39,453.72L291.30,453.12L291.98,451.51L298.09,451.41L298.78,442.89L309.68,437.46L312.91,439.13L315.39,442.80L313.51,450.42L311.10,449.16L311.58,444.76L310.30,446.19L311.12,441.08L307.86,444.37L308.21,450.07L309.97,451.11L308.27,451.12L307.96,452.78L309.00,454.51L310.33,454.49L309.83,452.60L312.53,452.77L313.42,456.27L312.00,459.77L310.26,458.65L310.85,457.50L310.27,457.38L309.35,458.68L309.18,462.34L310.81,462.01L309.55,463.93L315.82,473.34L315.30,476.09L321.36,476.82Z" },
  { id: '42202', name: '佐世保市', nameEn: 'Sasebo', prefId: '42', cx: 294.0, cy: 376.6, d: "M262.54,359.79L263.09,359.93L262.98,359.26L262.54,359.79ZM168.11,366.94L168.15,363.87L173.78,361.41L170.89,360.28L170.01,354.72L167.85,353.55L165.96,356.80L160.21,357.22L155.27,361.41L155.94,364.21L157.79,362.84L161.77,366.98L168.11,366.94ZM262.46,360.59L261.85,359.99L261.43,360.28L261.49,361.43L262.46,360.59ZM261.36,363.27L260.81,361.80L260.30,362.42L260.83,363.42L261.36,363.27ZM259.99,363.77L261.02,363.83L260.49,363.32L259.99,363.77ZM152.83,364.88L155.09,368.10L156.43,367.18L155.88,365.42L153.98,366.36L154.57,363.46L152.83,364.88ZM260.59,366.60L261.17,365.64L260.88,365.54L260.08,366.28L260.59,366.60ZM260.40,370.91L259.45,370.80L259.53,372.02L260.57,372.32L260.40,370.91ZM259.49,372.11L259.13,372.21L258.48,372.16L259.67,372.58L259.49,372.11ZM257.97,372.79L257.40,372.20L257.54,373.30L258.30,373.56L257.97,372.79ZM261.86,375.54L261.33,374.91L261.28,375.92L261.68,376.01L261.86,375.54ZM264.34,377.00L263.93,375.91L263.58,376.43L263.68,377.35L264.34,377.00ZM265.34,378.95L264.85,378.88L265.16,379.63L265.66,379.53L265.34,378.95ZM265.58,383.87L265.96,381.73L267.57,382.98L266.69,380.80L264.66,381.16L264.31,382.95L266.61,386.48L265.07,389.15L267.22,387.88L266.91,384.26L265.58,383.87ZM252.54,386.56L251.69,385.93L251.39,386.54L252.35,387.56L252.54,386.56ZM250.49,394.22L248.06,394.25L255.00,396.62L255.77,394.93L257.95,395.27L256.66,391.40L250.49,394.22ZM312.14,412.50L319.75,409.79L321.22,403.71L322.20,393.44L326.97,388.01L322.46,384.97L318.95,385.69L315.10,383.15L312.90,376.45L314.73,369.42L311.09,365.85L309.49,364.83L306.68,361.63L304.35,361.89L302.93,359.88L299.48,360.43L293.42,357.13L293.34,353.48L291.74,353.54L290.83,351.47L284.17,352.01L282.40,348.70L280.75,349.17L275.35,343.38L275.21,345.30L272.90,345.75L273.52,347.67L270.08,348.17L270.44,350.35L273.00,351.54L270.18,351.09L266.60,356.25L265.59,355.65L266.32,361.23L263.97,362.55L264.16,359.16L262.73,360.76L263.14,363.23L259.24,368.87L261.49,367.85L261.52,371.79L258.50,374.83L264.28,374.94L267.71,377.06L269.27,374.39L271.47,373.03L271.79,373.15L268.79,377.46L271.60,378.50L272.99,376.19L272.63,380.55L274.25,381.82L276.97,379.19L276.60,373.05L277.04,371.52L273.48,366.93L275.74,361.07L277.48,361.91L279.54,359.39L284.43,362.79L286.35,362.57L287.61,365.38L285.93,368.73L287.97,371.97L279.29,377.29L278.02,379.72L280.72,381.27L279.52,381.38L280.46,383.26L277.85,384.44L276.30,387.43L279.48,385.87L281.83,386.50L281.98,388.12L283.81,388.00L283.87,387.72L284.12,387.98L284.89,387.93L285.53,391.75L289.69,393.98L289.32,395.31L286.64,394.90L285.65,397.82L282.90,398.40L280.84,396.45L282.88,404.09L284.32,399.46L285.66,400.91L292.36,400.51L290.05,398.44L292.28,397.44L289.81,389.30L292.17,387.96L293.14,389.14L293.68,387.67L296.39,390.30L294.53,390.81L294.80,392.82L296.24,392.08L294.46,393.76L295.60,397.75L297.55,397.92L296.87,395.18L297.89,394.40L298.94,396.39L301.14,393.09L302.89,394.30L304.58,392.55L310.14,394.75L310.16,395.12L310.54,396.30L310.41,398.90L310.59,401.60L308.85,403.68L312.54,410.62L311.42,410.86L312.14,412.50ZM283.75,388.32L284.71,388.61L284.12,387.98L283.81,388.00L283.75,388.32ZM310.11,394.95L304.64,393.48L302.43,396.52L305.84,397.78L302.61,397.29L303.05,400.94L301.72,400.84L301.11,398.34L299.39,399.00L301.31,403.91L296.21,404.39L298.48,409.75L300.38,409.99L298.48,411.63L298.88,413.68L302.47,413.59L301.69,415.47L304.50,416.96L303.86,414.85L307.32,414.16L302.40,409.32L302.50,407.38L304.61,404.29L304.36,410.06L310.01,408.77L308.54,403.37L310.31,401.00L310.41,398.90L310.16,395.12L310.11,394.95ZM267.19,378.13L265.02,377.27L265.02,378.58L267.33,378.62L267.19,378.13ZM269.27,378.64L268.62,377.53L267.94,377.62L267.86,378.67L269.27,378.64ZM268.80,380.54L268.67,379.31L267.85,379.90L267.77,380.57L268.80,380.54ZM271.61,381.43L270.98,379.79L270.49,381.85L271.42,381.96L271.61,381.43ZM271.73,382.25L271.40,382.05L270.83,382.26L271.21,383.20L271.73,382.25ZM279.40,389.23L279.87,389.31L279.64,388.70L279.40,389.23ZM277.02,389.09L276.79,388.52L276.54,388.63L276.80,389.84L277.02,389.09ZM283.84,390.29L283.31,389.96L283.43,391.34L284.26,391.87L283.84,390.29ZM285.88,394.06L284.69,393.53L284.69,395.10L285.63,395.25L285.88,394.06ZM301.87,396.25L301.34,395.67L301.02,396.39L301.36,396.53L301.87,396.25ZM308.17,411.11L307.33,410.23L306.75,411.70L308.25,412.90L308.17,411.11Z" },
  { id: '42203', name: '島原市', nameEn: 'Shimabara', prefId: '42', cx: 424.8, cy: 480.9, d: "M433.95,495.57L430.62,493.31L430.34,494.55L428.37,492.98L415.30,492.34L420.22,491.13L420.48,489.03L413.56,488.78L412.57,486.46L417.03,479.51L419.52,466.08L422.51,463.06L427.12,465.96L434.90,482.66L433.95,495.57Z" },
  { id: '42204', name: '諫早市', nameEn: 'Isahaya', prefId: '42', cx: 369.0, cy: 462.5, d: "M363.01,490.08L362.55,489.99L362.29,489.07L362.76,489.00L363.01,490.08ZM338.71,461.32L339.01,461.64L339.06,462.28L338.21,461.85L338.71,461.32ZM351.57,490.14L352.61,478.19L348.92,475.26L345.64,477.23L343.58,474.98L340.20,475.80L337.98,474.61L330.71,465.58L329.70,462.61L330.75,461.96L331.56,462.68L332.20,459.74L335.46,463.18L339.40,463.34L339.13,465.00L343.00,464.22L345.23,465.97L345.18,468.12L348.88,467.48L349.32,470.14L350.76,469.62L350.96,470.79L351.30,469.39L354.96,468.81L357.41,466.26L356.03,459.40L358.69,444.28L363.02,440.55L370.34,440.24L372.77,435.87L382.20,437.53L383.94,437.45L385.01,436.68L386.21,438.92L397.63,440.08L397.37,447.39L394.50,448.14L394.16,451.17L389.59,451.20L386.92,454.92L391.46,462.25L385.90,468.46L388.08,469.61L385.70,476.91L383.22,477.86L385.02,480.86L380.79,482.93L372.06,481.24L359.70,490.19L353.96,489.43L352.26,491.50L351.57,490.14Z" },
  { id: '42205', name: '大村市', nameEn: 'Omura', prefId: '42', cx: 352.9, cy: 444.5, d: "M341.83,453.65L342.08,453.84L341.60,454.74L341.34,454.03L341.83,453.65ZM333.21,447.41L338.34,451.42L337.89,453.41L334.58,451.42L333.21,447.41ZM343.33,431.89L345.22,431.51L347.00,433.82L353.93,430.54L356.30,430.18L357.67,431.72L363.32,428.57L366.62,432.63L370.46,432.68L372.77,435.87L370.34,440.24L363.02,440.55L358.69,444.28L356.03,459.40L357.41,466.26L354.96,468.81L346.74,461.43L348.05,457.13L343.52,455.88L344.34,453.42L339.27,448.05L338.87,437.43L341.85,435.90L343.33,431.89Z" },
  { id: '42207', name: '平戸市', nameEn: 'Hirado', prefId: '42', cx: 239.8, cy: 357.9, d: "M214.18,383.55L214.78,383.70L214.67,384.83L213.54,383.04L214.18,383.55ZM212.80,381.76L213.44,382.19L212.59,383.44L211.92,383.08L212.80,381.76ZM213.98,380.30L213.59,381.15L213.16,380.61L213.98,380.30ZM215.78,376.08L215.88,376.36L214.87,376.92L214.81,376.47L215.78,376.08ZM213.23,369.27L213.76,369.60L213.42,369.90L213.23,369.27ZM213.31,366.04L213.21,366.74L212.16,366.95L213.31,366.04ZM249.91,358.12L250.49,358.63L250.18,358.87L249.91,358.12ZM251.06,355.99L251.06,356.45L250.22,356.40L251.06,355.99ZM264.36,352.50L264.92,352.85L264.42,353.05L264.36,352.50ZM275.35,343.38L275.21,345.30L272.90,345.75L273.52,347.67L270.08,348.17L270.44,350.35L265.92,352.88L265.01,351.24L263.38,351.91L260.53,347.85L260.85,345.76L263.54,345.98L262.59,342.53L263.81,338.31L262.28,335.08L268.19,333.62L266.98,336.80L271.90,335.66L274.20,338.63L275.70,338.46L275.35,343.38ZM258.94,326.56L260.50,330.98L258.86,331.37L260.73,333.49L258.63,336.74L259.78,336.33L261.90,339.43L257.10,341.83L256.85,346.15L251.78,347.48L250.23,346.45L254.04,351.51L252.38,353.47L248.65,353.41L249.41,357.21L244.16,358.05L248.25,361.31L247.54,364.36L244.67,366.39L239.47,375.79L237.00,375.93L237.13,377.66L233.16,381.54L219.51,386.98L215.08,383.81L217.11,381.25L215.79,378.20L217.96,378.53L218.80,382.47L219.73,381.48L220.11,383.13L223.84,382.64L225.58,384.34L227.41,380.37L224.41,380.02L221.70,377.25L222.06,372.37L225.76,369.20L227.67,369.17L231.04,372.65L230.18,369.85L232.27,370.64L233.54,369.76L231.69,369.93L230.71,367.05L228.13,366.95L227.09,365.50L228.46,364.03L226.71,362.80L227.37,359.64L231.70,358.62L230.51,358.19L231.24,356.46L235.97,356.17L232.84,350.49L235.07,347.82L233.85,342.25L246.80,340.23L249.61,333.64L251.98,335.01L250.25,339.53L252.10,340.58L254.08,336.75L252.56,333.95L255.90,335.35L258.37,333.81L256.85,331.52L252.00,332.28L251.15,331.10L253.16,330.48L251.52,328.70L252.47,327.26L254.20,328.66L258.94,326.56ZM254.37,322.42L254.63,322.72L254.78,323.65L254.49,323.57L254.37,322.42ZM233.28,318.73L233.81,320.87L231.86,323.40L233.75,329.87L232.30,334.35L233.39,340.32L229.11,341.28L225.33,338.88L230.51,326.82L230.29,320.94L233.28,318.73ZM253.81,315.29L256.59,318.50L248.85,322.89L248.74,320.10L252.46,318.25L253.81,315.29ZM259.34,301.10L258.79,306.51L261.15,306.22L261.18,303.49L265.13,304.89L263.40,308.51L258.87,310.14L258.78,311.51L254.70,310.17L253.14,307.65L250.19,308.63L251.23,310.94L246.94,310.68L253.20,303.96L259.34,301.10ZM259.04,275.99L259.73,277.17L258.54,277.69L258.10,277.37L259.04,275.99Z" },
  { id: '42208', name: '松浦市', nameEn: 'Matsuura', prefId: '42', cx: 293.4, cy: 346.0, d: "M306.68,361.63L304.35,361.89L302.93,359.88L299.48,360.43L293.42,357.13L293.34,353.48L291.74,353.54L290.83,351.47L284.17,352.01L282.40,348.70L280.75,349.17L275.35,343.38L275.70,338.46L275.53,336.21L278.45,337.81L279.06,335.70L280.56,336.19L284.23,329.14L286.98,332.13L285.10,332.42L283.29,337.57L285.29,340.77L287.24,340.39L287.23,338.65L289.40,338.69L288.62,341.26L291.26,342.42L299.76,337.25L305.26,340.41L306.41,336.02L309.01,336.11L309.86,343.23L306.42,345.85L302.65,356.41L303.70,356.66L306.68,361.63ZM306.62,328.61L308.15,329.84L307.27,330.68L306.05,329.56L306.62,328.61ZM310.78,325.28L318.58,327.93L317.59,331.11L319.43,333.99L320.02,332.19L324.23,334.34L322.29,336.49L319.30,336.18L320.51,337.33L319.02,338.38L315.65,338.29L313.99,341.96L312.19,338.47L314.55,337.36L313.05,330.62L314.19,328.29L310.87,326.19L310.78,325.28ZM287.29,323.15L287.94,325.67L286.84,327.45L285.67,326.29L287.29,323.15ZM292.24,322.90L292.83,323.70L292.35,324.00L292.10,323.70L292.24,322.90ZM294.11,312.92L296.10,314.74L295.59,315.89L293.01,313.85L294.11,312.92ZM301.79,311.24L305.28,313.78L304.78,318.08L309.98,321.36L309.16,322.66L303.61,320.51L302.13,324.85L300.26,323.53L299.71,327.05L296.73,327.36L294.06,324.26L299.73,321.43L298.43,319.47L301.34,316.48L301.79,311.24Z" },
  { id: '42209', name: '対馬市', nameEn: 'Tsushima', prefId: '42', cx: 219.7, cy: 47.1, d: "M197.45,69.69L196.94,70.33L197.34,70.55L197.45,69.69ZM197.92,73.06L197.84,72.01L197.22,71.42L196.93,71.61L197.92,73.06ZM211.44,88.67L211.69,88.60L211.80,87.13L211.56,87.43L211.44,88.67ZM213.50,90.40L214.77,89.83L214.76,89.82L213.42,90.10L213.28,91.18L213.50,90.40ZM215.69,91.07L214.51,91.94L215.92,91.28L216.48,93.20L213.76,93.38L215.21,93.98L214.21,95.65L216.05,97.84L213.73,96.60L211.60,97.89L211.82,100.36L212.83,98.56L212.26,100.91L214.45,102.51L215.28,100.74L216.61,100.56L215.01,102.33L215.76,103.71L219.75,99.62L218.64,97.74L221.53,99.37L218.59,92.93L222.73,93.85L222.69,94.95L224.36,93.40L224.31,93.25L223.54,92.51L223.77,91.78L223.45,90.91L222.52,91.91L218.44,91.26L222.46,90.49L224.49,87.57L222.82,86.15L223.52,84.96L220.66,84.92L222.19,84.20L220.63,80.35L224.00,81.56L225.18,74.48L223.67,77.23L222.43,76.55L223.12,78.12L220.79,77.87L215.56,80.91L221.31,74.09L220.54,70.87L218.52,72.72L218.57,69.30L222.68,70.88L219.60,63.69L222.96,63.05L225.25,57.95L236.74,46.28L235.47,44.88L238.83,42.98L238.49,39.11L241.20,38.98L241.17,30.34L242.86,28.53L240.89,25.29L236.87,25.44L236.30,23.45L234.08,24.08L233.06,22.68L233.90,21.08L234.08,22.61L238.12,24.05L235.84,21.36L235.98,19.22L238.99,23.71L242.84,22.71L241.10,20.18L243.48,20.00L245.25,16.38L243.14,16.77L240.67,13.20L243.45,13.66L246.70,10.31L244.15,10.39L245.79,6.23L241.81,8.61L241.15,5.33L242.96,4.15L236.17,2.65L236.53,0.40L232.61,4.25L229.85,3.11L229.06,6.43L232.02,6.57L232.74,8.48L227.67,7.47L224.94,13.89L222.45,14.70L223.67,17.31L220.40,15.36L218.48,17.49L215.77,14.59L212.09,17.58L211.72,14.66L208.70,15.39L205.82,29.90L201.45,36.53L203.47,38.21L205.44,35.29L207.91,37.83L207.45,39.80L210.44,39.46L210.82,43.99L212.66,42.74L213.79,43.99L210.74,45.30L208.50,43.20L207.45,47.99L206.30,45.81L203.00,55.78L198.94,60.07L199.80,64.12L201.95,65.10L206.41,61.44L207.05,64.81L204.41,64.01L204.86,65.25L202.92,66.13L203.41,69.20L201.45,66.50L198.97,67.23L200.12,69.44L198.22,70.92L201.20,73.24L198.47,74.05L197.63,81.08L199.59,81.64L199.14,83.77L194.14,86.16L194.19,88.62L191.37,85.86L188.98,86.87L191.72,89.74L198.44,88.30L200.26,91.34L201.68,90.23L201.94,92.75L201.87,88.65L203.67,88.87L200.13,85.96L202.14,86.00L202.86,84.37L201.28,83.08L201.35,80.59L203.37,83.63L206.45,80.98L207.34,81.53L204.14,85.59L206.88,88.41L204.45,90.13L204.92,92.22L206.76,91.23L206.10,93.34L208.90,88.98L210.02,89.81L209.12,87.33L210.64,87.58L208.83,85.14L210.55,85.79L212.69,82.37L211.72,86.69L214.72,83.21L215.05,86.58L213.33,87.91L214.76,89.82L214.82,89.81L214.77,89.83L215.69,91.07ZM225.15,94.07L227.52,93.02L225.10,87.56L223.77,91.78L224.31,93.25L225.15,94.07ZM210.18,93.47L208.22,96.04L203.97,93.28L202.44,96.63L204.53,94.97L204.76,97.09L207.51,96.21L208.26,99.43L211.79,100.89L210.18,93.47ZM204.28,98.95L204.68,99.07L204.86,98.36L204.18,98.58L204.28,98.95ZM210.87,101.55L210.43,100.94L209.04,102.00L209.01,102.46L210.87,101.55ZM190.27,102.56L190.02,102.28L189.49,102.96L190.26,103.23L190.27,102.56ZM207.63,103.47L207.19,102.72L206.99,102.69L207.08,103.51L207.63,103.47ZM208.11,103.49L207.71,106.52L206.31,105.34L205.26,108.00L204.66,103.46L206.64,100.63L204.84,100.16L203.98,101.53L203.20,98.42L201.47,97.40L200.33,98.59L200.48,96.88L197.11,97.23L199.01,98.16L199.03,100.11L201.64,100.81L202.32,107.72L200.78,106.36L200.08,101.08L197.30,101.31L196.56,104.83L195.24,104.57L195.83,102.50L194.13,102.87L196.26,100.99L195.25,99.76L192.43,103.23L190.89,102.70L189.85,104.57L189.01,103.20L187.82,104.69L189.06,96.53L184.26,94.69L182.30,99.27L182.94,110.12L179.96,116.20L181.25,118.87L178.76,122.83L179.23,131.05L176.18,142.38L177.15,148.45L175.99,151.91L179.58,148.24L183.88,151.91L186.14,149.63L186.17,156.95L187.74,153.56L189.40,154.24L189.60,149.72L191.87,152.38L193.10,149.84L194.74,150.49L196.44,148.77L194.66,146.54L195.66,145.65L200.63,145.27L198.88,141.67L201.16,141.61L200.86,136.63L203.65,137.38L203.87,134.66L202.08,133.76L203.93,131.16L201.38,130.45L202.12,127.77L204.23,129.33L205.30,125.32L203.91,122.67L206.57,123.55L210.01,121.21L207.77,117.03L209.58,113.65L208.20,112.31L209.96,112.16L211.05,108.67L212.20,109.69L215.84,108.30L215.74,107.76L214.83,106.37L215.22,105.02L214.97,103.71L212.89,102.73L212.43,104.41L211.08,103.05L208.11,103.49ZM217.20,110.00L224.42,103.43L222.52,101.75L220.25,101.99L220.93,104.67L219.35,101.95L215.40,104.40L215.22,105.02L215.74,107.76L217.20,110.00ZM192.49,153.43L191.75,152.77L191.36,153.09L192.16,153.91L192.49,153.43ZM232.97,1.10L233.70,0.35L233.32,0.00L232.96,0.50L232.97,1.10ZM242.94,7.09L243.54,6.34L242.89,6.22L242.57,6.36L242.94,7.09ZM244.47,19.78L244.88,19.43L244.55,19.15L244.16,19.47L244.47,19.78ZM228.32,89.11L228.55,86.71L226.37,87.70L227.16,89.85L228.32,89.11ZM223.38,97.45L224.82,99.62L228.76,98.30L224.49,98.41L224.89,96.71L223.38,97.45Z" },
  { id: '42210', name: '壱岐市', nameEn: 'Iki', prefId: '42', cx: 294.0, cy: 231.9, d: "M274.80,245.82L276.58,246.45L275.28,247.78L274.08,246.49L274.80,245.82ZM278.96,245.80L280.16,247.17L278.75,248.99L278.09,247.26L278.96,245.80ZM302.63,244.26L303.15,245.44L302.41,246.06L301.85,244.96L302.63,244.26ZM276.49,242.10L277.89,243.82L275.16,245.21L274.66,242.98L276.49,242.10ZM307.26,233.11L306.62,233.88L306.32,233.47L306.50,232.96L307.26,233.11ZM290.95,212.39L295.24,215.65L304.66,216.68L305.67,217.74L303.92,219.79L303.74,225.61L300.44,226.68L311.28,231.89L310.59,233.55L305.61,231.84L302.61,233.68L304.15,236.58L306.17,235.07L310.69,237.49L310.55,240.01L308.84,239.68L308.54,242.87L306.87,243.36L297.41,243.63L293.39,252.44L287.71,249.32L289.09,246.74L287.70,248.15L285.04,246.40L286.55,241.93L284.13,238.96L280.30,243.48L278.76,240.16L280.24,237.86L277.86,236.13L279.24,234.95L286.88,238.53L284.48,235.02L285.39,234.10L281.52,234.48L280.57,233.17L281.63,230.79L279.47,228.36L282.99,228.36L279.27,226.63L281.83,225.00L284.85,229.14L285.17,227.11L287.51,226.52L284.44,223.86L283.93,218.79L287.02,214.68L290.54,214.33L289.10,213.94L290.95,212.39ZM290.31,211.07L290.85,211.94L289.02,211.54L289.77,211.12L290.31,211.07ZM287.06,210.50L288.10,210.71L287.82,212.96L286.41,212.01L287.06,210.50ZM285.94,210.57L285.84,212.13L284.71,211.87L284.40,211.08L285.94,210.57Z" },
  { id: '42211', name: '五島市', nameEn: 'Goto', prefId: '42', cx: 85.7, cy: 509.0, d: "M120.41,459.96L120.62,460.11L120.51,460.73L119.99,460.26L120.41,459.96ZM127.85,458.56L131.44,462.49L132.68,466.86L130.46,468.19L130.55,471.34L131.95,472.07L129.18,471.37L127.83,472.98L130.08,475.64L127.57,479.94L127.35,473.75L125.86,475.42L122.04,474.66L125.01,474.28L125.33,472.93L123.24,469.28L121.59,469.56L117.23,463.80L116.79,466.79L113.41,464.07L116.81,463.06L116.56,460.39L117.71,460.12L118.85,462.05L122.44,462.22L125.90,470.09L126.62,467.14L123.79,462.22L125.08,461.99L128.09,467.51L129.47,461.58L127.85,458.56ZM10.75,667.40L13.48,668.77L14.88,667.85L13.15,671.67L11.76,670.43L8.18,671.43L7.96,670.80L10.20,670.24L10.75,667.40ZM120.14,537.39L120.16,539.65L117.34,539.35L117.56,537.90L120.14,537.39ZM2.74,679.01L3.11,680.20L1.12,683.88L0.07,679.60L2.74,679.01ZM4.45,677.34L4.61,677.53L3.65,678.77L3.39,678.28L4.45,677.34ZM6.22,673.47L6.77,674.00L5.40,675.11L5.29,674.50L6.22,673.47ZM7.57,672.15L7.76,672.38L7.97,673.33L7.33,673.18L7.57,672.15ZM80.04,534.45L80.66,535.38L77.95,535.17L78.88,534.50L80.04,534.45ZM119.76,532.57L119.83,533.70L118.32,533.57L118.51,533.03L119.76,532.57ZM120.40,531.45L120.53,532.09L119.90,532.09L119.91,531.65L120.40,531.45ZM124.42,530.48L124.84,532.21L122.13,531.30L123.44,531.10L124.42,530.48ZM104.31,528.74L105.94,528.95L106.31,531.20L103.32,530.51L104.31,528.74ZM92.76,524.75L93.17,525.15L92.74,525.34L92.76,524.75ZM65.49,513.76L65.65,514.15L64.87,514.54L65.04,513.77L65.49,513.76ZM62.20,510.08L63.29,514.20L60.73,513.98L62.42,518.39L59.60,520.70L58.16,515.61L62.20,510.08ZM118.58,502.03L120.18,503.71L118.36,506.52L117.56,502.95L118.58,502.03ZM108.98,499.07L109.44,499.44L109.21,500.23L108.40,499.82L108.98,499.07ZM111.02,497.12L112.13,499.17L111.03,499.70L109.87,498.17L111.02,497.12ZM56.10,494.82L56.91,496.11L54.87,497.71L54.46,502.27L52.83,501.71L52.77,498.22L56.10,494.82ZM91.99,495.69L91.52,494.76L91.96,493.88L92.34,494.52L91.99,495.69ZM114.60,492.23L114.27,494.89L112.61,495.11L112.52,493.49L114.60,492.23ZM130.09,490.56L130.59,491.04L129.96,491.28L129.59,491.03L130.09,490.56ZM131.34,485.63L133.34,487.78L132.89,489.53L130.81,488.88L131.34,485.63ZM138.83,482.12L141.92,486.87L141.58,491.68L138.85,492.34L137.81,491.19L137.43,494.49L133.18,493.58L132.40,492.21L133.78,491.05L137.93,490.37L138.60,487.45L137.21,485.33L138.83,482.12ZM99.45,480.33L98.56,486.28L103.17,489.84L98.54,491.92L100.29,493.03L105.09,489.80L102.88,494.43L104.61,491.94L105.24,493.73L107.79,491.65L109.45,493.43L106.66,494.51L105.97,501.62L109.00,507.58L115.29,512.65L116.10,516.11L118.25,516.55L117.39,519.91L112.91,520.31L112.19,518.94L102.10,521.07L98.94,516.21L91.18,518.90L89.28,524.76L94.56,527.86L96.10,531.01L91.77,536.58L87.50,535.32L87.21,532.48L84.05,528.39L73.70,529.52L68.84,528.04L66.16,532.51L62.91,531.95L59.97,527.95L54.42,526.98L57.47,518.36L59.61,521.60L57.63,522.71L57.47,524.84L58.90,522.42L60.42,523.27L59.95,525.25L64.92,527.42L64.61,529.33L66.74,526.94L65.62,525.10L69.26,522.60L66.19,522.74L63.94,525.32L62.46,523.04L63.67,519.93L66.21,519.73L64.29,516.53L69.35,518.53L66.11,515.55L70.02,517.27L68.33,514.20L71.08,512.02L67.87,512.10L65.32,509.81L65.09,504.91L68.45,504.79L64.79,500.01L66.26,494.37L63.42,489.62L66.71,485.01L68.56,483.69L75.61,488.30L75.84,492.92L74.48,494.81L75.74,495.57L77.64,495.31L78.17,492.46L84.21,490.55L81.86,492.93L84.92,492.23L84.48,495.33L87.34,487.79L88.75,487.74L91.53,496.38L92.93,495.87L91.85,492.31L96.04,489.65L97.30,491.12L95.95,488.61L92.37,490.88L90.14,489.80L92.31,485.44L95.97,485.64L97.02,483.77L95.54,482.61L99.45,480.33ZM126.29,477.93L126.79,479.70L126.08,480.27L125.23,478.20L126.29,477.93ZM72.02,477.25L72.47,478.85L71.37,479.21L70.21,478.05L72.02,477.25ZM111.25,468.60L115.39,471.34L115.94,473.57L119.09,474.41L119.75,479.26L121.23,480.25L114.56,489.01L111.28,488.94L108.21,485.16L105.14,484.31L105.66,470.22L108.64,472.41L110.63,471.05L111.11,476.69L112.77,478.29L110.96,479.40L114.15,480.06L113.22,477.75L114.34,475.37L112.19,474.61L111.25,468.60ZM122.62,455.48L122.46,458.09L121.02,458.25L121.55,456.12L122.62,455.48Z" },
  { id: '42212', name: '西海市', nameEn: 'Saikai', prefId: '42', cx: 291.7, cy: 432.0, d: "M262.25,413.62L262.32,413.25L261.62,413.14L261.48,413.50L262.25,413.62ZM277.39,414.33L278.15,413.88L277.80,413.62L277.38,413.75L277.39,414.33ZM269.11,422.40L270.10,423.62L271.42,420.96L273.98,421.24L274.99,418.83L273.97,418.16L276.03,416.77L275.20,414.89L276.87,414.38L270.53,413.14L270.19,415.83L266.90,417.84L265.91,420.58L265.98,422.56L268.31,423.64L269.11,422.40ZM276.86,420.68L276.65,418.27L274.69,420.96L274.94,422.63L276.86,420.68ZM234.20,425.10L233.04,424.06L232.58,424.89L233.81,425.61L234.20,425.10ZM259.33,429.36L266.59,424.06L260.50,421.90L260.53,424.57L262.33,425.27L260.16,427.04L261.22,427.60L259.48,427.34L259.33,429.36ZM214.17,430.09L217.80,428.67L215.86,424.27L213.64,425.57L214.17,430.09ZM256.28,427.50L255.64,426.96L255.05,426.96L254.91,427.40L256.28,427.50ZM193.23,423.72L187.97,429.05L191.71,430.52L190.45,432.38L195.06,429.16L196.17,424.58L193.68,426.21L193.23,423.72ZM258.65,427.79L256.88,427.45L256.49,428.82L258.63,429.41L258.65,427.79ZM271.40,443.93L269.74,444.95L268.34,442.71L267.78,447.68L269.77,450.13L272.19,450.37L274.10,448.09L273.76,445.33L271.40,443.93ZM301.94,421.46L301.49,422.20L301.80,422.28L301.94,421.46ZM300.08,429.48L300.47,429.37L300.08,428.48L299.64,428.88L300.08,429.48ZM274.20,441.20L276.77,443.03L275.74,447.48L277.14,448.19L276.73,449.85L277.89,446.58L279.82,446.90L283.32,455.85L286.39,453.72L291.30,453.12L291.98,451.51L298.09,451.41L298.78,442.89L309.68,437.46L312.91,439.13L316.58,435.88L311.65,427.58L307.52,427.65L303.76,424.05L301.17,428.72L303.71,429.66L302.58,430.81L301.23,429.40L298.49,432.51L296.97,429.70L298.73,428.59L296.77,427.48L297.21,425.23L303.30,417.18L300.67,414.40L298.67,414.98L297.84,417.83L295.81,417.68L297.72,413.29L296.41,410.61L294.38,411.29L292.26,407.40L291.47,408.96L285.20,404.59L284.29,406.12L285.54,407.75L281.83,410.18L284.75,409.92L281.76,411.66L284.87,413.35L281.97,414.20L281.34,419.48L278.73,419.98L279.04,425.21L281.89,429.24L279.78,430.03L279.77,432.90L279.62,432.80L278.63,432.43L278.67,432.12L277.77,431.48L275.74,432.72L274.20,441.20ZM279.69,432.82L279.10,429.39L279.40,427.15L278.67,432.12L279.62,432.80L279.69,432.82ZM299.23,431.02L299.93,430.59L299.85,430.42L299.83,430.44L299.78,430.27L299.44,429.53L298.58,430.67L299.23,431.02ZM300.38,430.05L300.19,429.72L299.69,429.94L299.78,430.27L299.85,430.42L300.38,430.05ZM315.51,431.62L315.78,430.66L315.20,430.46L315.00,431.03L315.51,431.62ZM314.85,439.65L314.09,438.67L313.72,438.88L314.27,439.90L314.85,439.65Z" },
  { id: '42213', name: '雲仙市', nameEn: 'Unzen', prefId: '42', cx: 402.7, cy: 483.4, d: "M415.30,492.34L415.63,495.27L412.28,497.39L412.30,498.97L408.00,498.88L406.08,503.86L391.30,514.56L381.77,516.19L382.67,510.49L381.40,508.20L384.83,510.22L388.02,508.68L388.44,506.50L390.85,506.96L391.08,504.33L396.75,500.54L399.11,495.26L398.21,491.04L393.56,489.06L395.55,484.77L394.15,482.61L392.49,481.23L385.02,480.86L383.22,477.86L385.70,476.91L388.08,469.61L385.90,468.46L391.46,462.25L395.95,467.75L406.34,460.85L410.04,461.87L417.76,459.39L422.51,463.06L419.52,466.08L417.03,479.51L412.57,486.46L413.56,488.78L420.48,489.03L420.22,491.13L415.30,492.34Z" },
  { id: '42214', name: '南島原市', nameEn: 'Minamishimabara', prefId: '42', cx: 409.3, cy: 511.1, d: "M433.95,495.57L428.14,502.97L430.67,507.40L427.61,512.93L425.59,512.52L418.46,517.24L409.63,516.90L411.02,518.23L408.80,522.94L405.13,523.48L403.98,527.08L400.84,528.80L397.78,529.09L394.30,527.20L396.52,529.76L392.93,531.98L389.93,532.11L391.65,528.33L390.26,524.83L388.77,523.34L387.12,524.20L385.35,521.21L381.91,519.88L381.77,516.19L391.30,514.56L406.08,503.86L408.00,498.88L412.30,498.97L412.28,497.39L415.63,495.27L415.30,492.34L428.37,492.98L430.34,494.55L430.62,493.31L433.95,495.57Z" },
  { id: '42307', name: '長与町', nameEn: 'Nagayo', prefId: '42', cx: 329.5, cy: 472.2, d: "M323.42,467.56L323.93,467.77L322.66,464.57L323.42,467.56ZM321.36,476.82L324.44,480.26L326.30,477.92L326.24,480.59L327.48,478.17L335.38,477.10L337.98,474.61L330.71,465.58L329.70,462.61L330.75,461.96L328.70,459.18L328.80,463.55L326.45,464.53L326.19,468.69L323.93,467.77L325.93,472.78L321.36,476.82Z" },
  { id: '42308', name: '時津町', nameEn: 'Togitsu', prefId: '42', cx: 318.1, cy: 470.4, d: "M316.90,462.46L316.47,463.38L316.16,462.91L316.90,462.46ZM321.36,476.82L315.30,476.09L315.82,473.34L309.55,463.93L310.81,462.01L311.39,463.83L315.16,464.07L321.71,471.72L322.66,464.57L325.93,472.78L321.36,476.82ZM312.54,461.39L314.23,462.56L313.62,463.19L312.48,462.57L312.54,461.39Z" },
  { id: '42321', name: '東彼杵町', nameEn: 'Higashisonogi', prefId: '42', cx: 345.2, cy: 420.9, d: "M363.32,428.57L357.67,431.72L356.30,430.18L353.93,430.54L347.00,433.82L345.22,431.51L343.33,431.89L342.60,425.76L337.95,421.21L333.73,419.66L331.30,415.28L327.86,413.37L329.49,410.45L334.93,411.27L336.94,409.99L337.60,406.80L339.89,407.34L341.92,411.53L349.50,415.12L350.63,415.27L353.43,418.37L354.44,423.10L357.40,425.16L360.06,424.45L360.19,426.43L363.32,428.57Z" },
  { id: '42322', name: '川棚町', nameEn: 'Kawatana', prefId: '42', cx: 326.5, cy: 409.0, d: "M312.14,412.50L319.75,409.79L321.22,403.71L325.22,402.50L327.84,404.31L334.86,402.00L338.21,402.97L337.60,406.80L336.94,409.99L334.93,411.27L329.49,410.45L327.86,413.37L323.10,413.86L321.08,417.39L319.86,415.37L318.03,419.89L316.23,420.37L317.08,416.11L315.72,416.01L319.46,414.62L316.38,412.52L315.00,413.03L315.61,414.23L312.14,412.50Z" },
  { id: '42323', name: '波佐見町', nameEn: 'Hasami', prefId: '42', cx: 332.8, cy: 396.2, d: "M321.22,403.71L322.20,393.44L326.97,388.01L329.84,388.95L330.28,390.28L334.09,389.80L335.28,388.77L341.07,387.97L344.85,397.21L343.78,401.90L340.83,401.26L338.21,402.97L334.86,402.00L327.84,404.31L325.22,402.50L321.22,403.71Z" },
  { id: '42383', name: '小値賀町', nameEn: 'Ojika', prefId: '42', cx: 153.6, cy: 379.0, d: "M119.41,390.43L119.79,390.84L118.22,391.07L119.41,390.43ZM119.48,385.77L119.55,387.32L118.07,387.54L119.00,385.98L119.48,385.77ZM147.66,385.69L148.48,385.69L148.93,386.09L147.71,386.36L147.66,385.69ZM145.54,385.42L146.02,387.14L144.23,388.01L144.24,386.46L145.54,385.42ZM152.82,383.19L153.12,384.38L152.04,385.15L151.68,384.52L152.82,383.19ZM144.97,383.05L145.33,384.41L143.43,384.22L144.14,383.20L144.97,383.05ZM147.01,381.75L147.08,382.23L146.44,382.71L146.28,382.20L147.01,381.75ZM137.56,380.86L138.92,382.20L136.03,382.88L135.97,381.93L137.56,380.86ZM124.64,380.59L125.36,380.72L125.17,381.70L124.58,381.59L124.64,380.59ZM145.39,375.96L145.47,379.12L143.03,379.07L143.83,376.17L145.39,375.96ZM166.60,375.81L171.04,381.16L168.43,382.96L168.73,389.63L166.92,388.62L166.94,381.92L164.95,377.97L166.60,375.81ZM152.51,374.23L152.01,376.25L155.07,377.39L161.28,375.39L160.88,377.53L157.45,377.18L157.80,380.04L160.54,381.15L159.37,382.76L154.04,380.54L153.61,383.02L150.98,383.58L150.36,380.31L146.73,380.15L148.58,376.46L149.59,377.95L150.15,374.51L152.51,374.23ZM169.08,372.24L170.46,373.47L169.07,374.28L168.13,373.56L169.08,372.24ZM154.65,372.19L156.30,373.60L155.21,374.69L153.56,372.72L154.65,372.19Z" },
  { id: '42391', name: '佐々町', nameEn: 'Sasa', prefId: '42', cx: 280.8, cy: 368.0, d: "M276.60,373.05L277.04,371.52L273.48,366.93L275.74,361.07L277.48,361.91L279.54,359.39L284.43,362.79L286.35,362.57L287.61,365.38L285.93,368.73L287.97,371.97L279.29,377.29L276.60,373.05Z" },
  { id: '42411', name: '新上五島町', nameEn: 'Shinkamigoto', prefId: '42', cx: 158.4, cy: 438.0, d: "M148.45,466.33L149.26,467.37L149.05,468.92L148.67,468.92L148.45,466.33ZM141.08,464.05L141.61,465.37L140.63,465.82L140.50,464.91L141.08,464.05ZM149.30,463.73L150.20,464.05L149.85,464.34L149.30,463.73ZM147.12,462.50L147.75,462.91L147.55,464.80L147.07,463.01L147.12,462.50ZM149.16,462.23L149.46,462.32L150.46,463.69L149.19,463.54L149.16,462.23ZM147.74,459.03L148.20,462.59L147.92,462.76L146.69,461.52L147.74,459.03ZM148.75,456.54L149.52,457.86L148.71,458.10L148.51,456.69L148.75,456.54ZM128.21,454.57L129.08,455.24L129.05,455.68L127.95,455.11L128.21,454.57ZM150.14,450.03L150.43,450.65L149.87,450.59L150.14,450.03ZM164.78,448.73L165.05,449.07L164.60,449.43L164.20,449.01L164.78,448.73ZM180.91,448.51L182.37,449.44L180.32,450.46L179.77,450.06L180.91,448.51ZM132.45,446.54L133.73,447.23L133.28,449.31L131.14,451.03L130.54,450.67L131.13,452.73L132.92,451.18L132.23,453.59L126.65,452.00L125.41,449.80L129.07,448.45L131.01,450.67L132.45,446.54ZM138.20,446.41L140.47,449.63L143.68,448.70L143.20,450.23L144.90,450.40L145.35,453.77L147.39,455.48L145.12,457.46L147.05,457.20L145.14,461.39L146.57,462.29L145.83,468.65L143.75,466.33L145.33,465.90L142.74,465.67L144.29,463.41L142.06,464.26L139.64,462.37L136.19,465.15L136.18,461.79L133.18,461.76L134.99,460.17L132.14,453.79L136.77,456.01L137.32,459.57L138.33,456.14L140.22,460.04L141.29,459.35L139.67,455.91L140.54,454.03L138.78,455.49L136.17,453.69L137.80,452.72L135.62,449.99L137.53,449.63L138.32,448.40L136.68,447.10L138.20,446.41ZM138.22,438.19L139.69,439.20L139.22,441.53L136.52,441.97L136.64,443.40L135.58,439.96L138.22,438.19ZM145.65,431.19L146.13,431.98L145.82,435.74L144.91,433.25L145.65,431.19ZM147.16,425.81L145.77,427.56L141.37,428.84L143.72,426.05L147.16,425.81ZM180.75,424.54L182.21,424.99L182.29,427.55L178.02,427.25L177.60,425.85L180.75,424.54ZM179.53,423.77L179.88,424.53L178.41,424.60L178.79,424.07L179.53,423.77ZM174.52,420.92L175.24,421.12L175.07,421.44L174.58,421.22L174.52,420.92ZM169.29,395.01L169.28,396.21L168.88,396.45L169.02,395.06L169.29,395.01ZM164.51,388.25L165.51,390.19L162.41,398.18L166.18,402.71L164.27,414.04L161.71,415.48L162.81,417.25L159.86,419.86L161.36,422.59L159.48,425.09L160.89,429.74L159.27,433.94L160.60,433.02L161.23,434.52L162.10,433.34L163.63,434.28L165.62,432.17L166.10,433.52L169.14,429.38L174.18,429.52L175.58,427.51L179.54,429.09L177.63,430.35L179.61,434.95L179.33,436.73L172.09,440.61L170.07,445.37L168.33,443.39L165.63,445.03L162.21,439.06L162.06,441.56L164.17,444.34L163.72,448.01L158.77,448.62L160.78,449.87L159.50,452.42L160.37,453.74L158.44,453.71L157.70,455.78L159.90,456.86L158.52,459.29L160.51,459.17L161.77,464.73L160.53,466.06L154.47,464.13L152.52,467.93L155.12,471.90L153.03,475.75L149.59,474.23L151.05,473.82L151.10,469.96L150.45,462.66L149.01,461.31L148.99,459.87L151.55,460.03L149.63,458.28L152.94,459.31L152.47,457.02L149.59,456.54L148.71,454.80L149.34,452.42L151.59,454.40L152.90,453.02L153.38,455.62L153.89,452.43L151.92,452.39L151.23,449.34L148.42,448.24L146.08,449.92L146.86,447.04L148.46,447.87L149.07,446.76L147.92,443.32L145.27,446.60L143.30,445.38L143.32,442.32L141.80,444.56L138.57,443.79L141.06,443.20L139.84,437.96L142.78,435.61L143.84,437.64L144.43,435.43L145.43,436.25L146.34,439.32L148.94,435.45L150.73,435.96L151.33,438.23L151.54,434.86L153.10,434.34L149.67,432.88L149.30,431.46L151.01,430.67L149.15,428.70L149.39,422.59L151.96,419.95L151.09,419.38L154.64,418.53L155.36,424.71L159.27,423.13L157.62,422.10L158.45,418.64L156.42,415.17L157.97,414.74L158.65,410.59L163.39,407.34L163.72,404.02L161.31,403.29L162.67,401.40L160.51,399.02L164.51,388.25Z" },
  { id: '46201', name: '鹿児島市', nameEn: 'Kagoshima', prefId: '46', cx: 462.5, cy: 786.9, d: "M473.15,798.21L471.88,797.64L472.11,797.05L473.46,797.43L473.15,798.21ZM475.55,782.26L475.58,783.07L474.83,783.10L474.88,782.46L475.55,782.26ZM509.24,776.82L508.98,777.46L508.42,777.69L508.65,776.56L509.24,776.82ZM505.37,792.39L503.54,792.79L500.02,795.59L496.50,793.36L490.89,795.45L485.18,791.13L480.61,784.44L488.10,776.52L499.57,774.38L500.55,776.22L503.81,776.35L507.60,781.02L506.25,789.87L508.41,790.77L505.37,792.39ZM484.93,763.32L486.39,767.54L483.87,769.05L482.52,774.24L477.70,777.35L474.56,782.36L476.19,787.86L473.71,795.11L471.30,794.39L468.22,804.99L465.71,804.47L465.45,805.69L468.93,807.62L467.85,810.76L464.05,809.12L465.36,810.45L464.38,809.85L463.98,812.38L468.15,814.34L468.02,816.27L464.44,815.81L464.04,817.22L466.59,828.94L469.48,834.26L471.84,832.84L473.58,835.45L471.41,837.06L471.25,839.57L474.96,851.44L479.13,856.00L476.40,857.86L469.46,858.41L467.12,851.45L464.99,849.22L461.35,848.62L458.95,845.18L462.27,840.80L463.38,833.82L462.70,830.78L458.56,826.10L457.70,816.78L452.12,816.27L449.56,812.89L447.21,808.66L450.09,804.33L449.77,799.23L445.81,796.99L443.60,792.16L439.51,789.73L437.15,786.10L440.13,782.42L442.75,783.07L445.78,780.31L444.94,775.87L447.77,773.92L454.18,774.80L454.92,772.55L452.26,767.88L448.79,767.77L447.22,757.29L444.64,756.47L442.58,752.23L446.77,748.36L451.47,747.33L455.53,748.92L460.76,750.72L462.43,749.10L461.45,745.39L467.73,743.39L477.05,744.68L479.70,748.81L474.60,751.78L475.09,754.39L482.28,759.03L482.28,762.08L484.93,763.32Z" },
  { id: '46203', name: '鹿屋市', nameEn: 'Kanoya', prefId: '46', cx: 539.6, cy: 825.2, d: "M552.23,793.35L550.21,795.82L551.39,804.30L549.88,806.25L547.21,806.21L547.00,810.18L550.13,814.87L556.36,815.77L558.76,822.43L557.94,826.87L559.86,836.72L561.93,837.25L560.72,838.30L561.44,839.99L552.94,842.31L548.33,838.79L548.31,834.32L545.73,832.90L546.11,838.65L549.79,842.45L550.40,853.23L553.26,860.40L552.02,862.00L554.94,871.11L552.28,875.26L546.55,869.17L544.05,869.52L541.39,864.93L538.57,864.37L539.80,859.77L538.66,857.51L527.84,854.54L523.80,858.18L523.23,855.73L525.91,847.82L523.55,845.22L516.79,828.42L516.77,826.43L519.53,824.31L523.91,824.04L529.23,812.52L527.95,806.98L524.03,804.01L526.86,799.65L525.91,797.10L528.82,795.19L527.89,792.81L531.27,782.35L530.30,780.45L535.40,779.40L537.02,777.52L544.59,781.96L546.16,785.35L552.52,790.97L552.23,793.35Z" },
  { id: '46204', name: '枕崎市', nameEn: 'Makurazaki', prefId: '46', cx: 420.6, cy: 859.5, d: "M420.84,848.27L425.43,854.86L431.79,854.04L433.27,852.19L434.63,855.02L431.77,858.06L433.03,869.20L423.28,868.37L419.84,865.48L416.86,865.15L414.59,865.75L413.72,869.79L410.27,868.13L407.98,862.87L411.26,858.89L406.43,855.80L406.84,854.01L411.67,853.47L418.52,847.17L420.84,848.27Z" },
  { id: '46206', name: '阿久根市', nameEn: 'Akune', prefId: '46', cx: 404.1, cy: 677.0, d: "M389.42,673.77L391.03,674.87L390.57,675.57L389.86,675.49L389.42,673.77ZM404.10,648.81L402.43,655.50L404.76,660.03L404.04,663.67L407.91,666.52L406.74,671.31L407.71,672.79L406.37,673.47L416.01,679.18L420.99,686.77L417.53,693.04L415.57,693.22L411.26,689.39L410.47,699.08L405.89,697.79L401.26,699.02L398.83,687.98L392.47,680.80L392.56,677.14L395.20,676.56L395.05,673.60L397.66,671.42L398.59,665.78L395.28,660.18L393.24,661.22L393.51,663.23L390.89,661.39L390.83,658.91L392.96,653.25L398.62,649.89L404.10,648.81Z" },
  { id: '46208', name: '出水市', nameEn: 'Izumi', prefId: '46', cx: 432.0, cy: 665.1, d: "M420.99,686.77L416.01,679.18L406.37,673.47L407.71,672.79L406.74,671.31L407.91,666.52L404.04,663.67L404.76,660.03L402.43,655.50L404.10,648.81L407.85,648.81L410.58,651.10L410.23,648.98L412.07,648.81L412.27,651.70L414.84,653.38L420.37,653.85L429.57,646.88L431.82,642.94L431.10,638.86L436.89,643.99L440.32,650.82L446.25,652.15L448.55,652.39L450.32,651.72L451.43,652.41L454.08,651.96L455.46,651.22L455.95,650.28L462.58,659.63L464.02,664.80L462.32,664.71L456.35,673.11L452.83,673.67L451.93,678.66L449.80,679.63L446.17,677.93L442.99,679.13L441.49,682.75L432.82,684.03L432.83,685.87L429.88,685.41L427.54,688.48L420.99,686.77Z" },
  { id: '46210', name: '指宿市', nameEn: 'Ibusuki', prefId: '46', cx: 479.0, cy: 874.8, d: "M499.08,862.00L499.93,863.22L498.33,863.91L498.05,862.61L499.08,862.00ZM469.46,858.41L476.40,857.86L479.13,856.00L482.36,858.98L484.03,858.75L488.48,863.77L496.75,865.44L493.21,871.02L494.88,877.12L488.85,879.56L489.80,882.14L490.48,880.29L491.91,880.67L491.16,884.66L488.10,887.04L481.65,887.34L479.86,892.86L473.34,887.78L467.59,891.45L462.97,888.51L462.89,883.85L464.47,882.65L462.96,878.88L467.95,875.31L470.57,865.77L469.46,858.41Z" },
  { id: '46213', name: '西之表市', nameEn: 'Nishinoomote', prefId: '46', cx: 572.8, cy: 1007.1, d: "M537.61,991.45L539.83,997.68L539.06,1000.25L537.41,1001.61L533.49,1001.21L534.34,995.69L537.61,991.45ZM575.10,1036.28L564.90,1029.37L563.83,1022.51L557.20,1024.18L555.62,1021.07L556.87,1016.69L555.57,1014.91L560.24,1009.51L563.46,1001.61L566.25,1002.08L565.34,999.71L566.84,999.49L566.14,997.52L569.94,991.36L569.00,986.43L574.86,979.12L575.02,976.75L576.74,977.32L579.88,973.06L581.32,974.08L581.69,978.85L583.39,979.79L583.36,983.51L585.72,985.62L583.42,992.26L584.69,1009.11L581.92,1010.62L578.98,1018.92L578.70,1021.37L580.62,1022.99L579.37,1025.82L579.85,1031.92L575.10,1036.28Z" },
  { id: '46214', name: '垂水市', nameEn: 'Tarumizu', prefId: '46', cx: 517.3, cy: 803.8, d: "M503.54,792.79L505.37,792.39L518.22,790.82L522.61,785.18L522.57,780.58L525.51,773.62L528.41,775.20L527.29,777.59L530.30,780.45L531.27,782.35L527.89,792.81L528.82,795.19L525.91,797.10L526.86,799.65L524.03,804.01L527.95,806.98L529.23,812.52L523.91,824.04L519.53,824.31L516.77,826.43L516.79,828.42L510.66,819.17L503.76,816.43L502.09,812.22L503.51,799.28L505.31,798.73L503.54,792.79Z" },
  { id: '46215', name: '薩摩川内市', nameEn: 'Satsumasendai', prefId: '46', cx: 430.8, cy: 721.7, d: "M308.23,733.59L309.73,735.35L311.86,735.03L309.97,737.18L311.82,740.39L306.73,745.53L304.72,753.28L302.45,753.93L302.18,752.23L300.35,752.15L298.49,755.00L299.38,759.73L295.49,763.76L295.78,766.36L298.13,767.87L292.54,773.25L293.14,775.91L291.38,772.22L289.42,773.44L289.31,775.92L286.83,775.88L286.36,773.63L282.95,772.78L281.23,766.57L286.23,765.90L285.25,764.53L288.62,758.40L288.10,756.04L290.43,754.89L289.43,752.47L291.27,750.83L300.56,746.99L302.06,747.78L304.15,745.56L306.33,746.08L307.31,743.46L306.16,741.84L307.74,741.95L309.10,739.21L307.33,737.56L308.23,733.59ZM319.90,726.55L320.61,728.11L319.15,729.99L321.03,731.73L316.81,733.88L318.41,735.57L316.33,737.58L314.33,731.97L315.82,728.17L319.90,726.55ZM320.94,723.82L320.20,725.83L319.05,724.84L320.41,724.53L320.94,723.82ZM322.56,710.47L328.87,716.94L335.11,720.55L336.77,718.91L333.88,714.17L341.02,713.61L341.00,714.30L337.95,715.01L339.47,718.67L336.99,720.42L339.51,722.16L338.17,726.44L336.88,727.10L333.99,725.09L332.63,727.89L327.18,730.52L327.15,726.24L323.65,725.74L325.07,722.97L323.70,721.98L321.63,723.13L320.67,718.99L324.95,716.44L321.43,717.42L320.40,713.84L318.96,721.92L316.01,720.55L315.09,715.85L318.89,710.83L322.56,710.47ZM455.53,748.92L451.47,747.33L446.77,748.36L442.58,752.23L442.16,748.45L435.05,748.79L434.96,746.39L431.86,745.84L430.27,742.08L423.50,744.28L420.94,740.49L414.91,742.58L407.92,737.12L405.52,737.04L404.36,734.41L397.23,733.67L392.74,736.68L389.85,732.63L395.96,720.31L396.72,717.88L395.42,716.18L399.01,713.36L401.52,707.30L401.26,699.02L405.89,697.79L410.47,699.08L411.26,689.39L415.57,693.22L417.53,693.04L420.99,686.77L427.54,688.48L426.46,691.32L428.27,693.11L427.34,694.49L428.61,697.30L435.02,699.60L440.09,705.27L439.76,716.03L442.99,720.32L450.23,721.63L452.19,726.56L453.96,720.53L452.77,717.79L454.40,717.21L453.82,714.32L455.89,708.13L462.72,708.64L463.13,705.32L468.34,707.71L475.87,707.72L477.57,710.39L480.26,711.26L477.11,716.67L472.79,717.18L466.39,723.47L464.32,729.11L465.07,731.36L461.44,733.54L461.81,741.24L457.36,744.68L455.53,748.92Z" },
  { id: '46216', name: '日置市', nameEn: 'Hioki', prefId: '46', cx: 435.9, cy: 782.0, d: "M442.58,752.23L444.64,756.47L447.22,757.29L448.79,767.77L452.26,767.88L454.92,772.55L454.18,774.80L447.77,773.92L444.94,775.87L445.78,780.31L442.75,783.07L440.13,782.42L437.15,786.10L439.51,789.73L443.60,792.16L445.81,796.99L449.77,799.23L450.09,804.33L447.21,808.66L436.84,813.07L430.62,812.86L427.63,810.34L421.14,809.11L424.02,800.34L425.81,786.79L424.60,774.35L421.70,766.91L425.02,759.81L424.77,757.23L434.58,754.64L435.05,748.79L442.16,748.45L442.58,752.23Z" },
  { id: '46217', name: '曽於市', nameEn: 'Soo', prefId: '46', cx: 562.6, cy: 767.6, d: "M552.23,793.35L552.52,790.97L546.16,785.35L544.59,781.96L537.02,777.52L538.43,775.54L543.11,776.08L543.02,772.00L539.35,768.29L540.01,765.16L548.93,765.75L546.35,756.79L546.41,748.83L543.98,747.56L546.59,743.22L541.26,739.17L543.37,729.99L544.64,729.72L546.88,731.09L550.51,730.48L550.59,731.52L552.99,734.78L558.96,735.63L561.94,735.23L566.05,737.19L563.47,743.53L567.61,744.95L571.31,744.23L570.85,753.20L571.59,754.01L572.01,755.19L574.18,757.14L573.74,760.92L573.97,764.42L577.91,768.46L578.23,771.07L579.22,771.53L579.66,773.23L580.46,772.06L582.00,769.73L583.57,767.03L585.01,766.51L585.86,767.54L587.18,768.16L589.67,770.41L591.17,772.19L592.32,772.83L592.65,773.93L594.21,773.98L597.75,774.69L599.73,773.94L600.38,773.28L601.36,773.07L602.04,772.31L604.40,773.23L601.42,778.55L597.75,780.39L594.67,780.05L594.17,782.51L591.28,784.08L574.45,779.43L571.19,783.50L576.44,788.60L576.45,790.47L572.10,793.27L573.16,797.07L568.49,799.40L567.87,797.69L562.56,796.84L559.64,799.08L560.09,796.70L558.21,797.70L554.95,796.70L552.23,793.35Z" },
  { id: '46218', name: '霧島市', nameEn: 'Kirishima', prefId: '46', cx: 521.3, cy: 730.0, d: "M508.47,753.49L508.90,753.86L507.91,754.36L508.07,753.62L508.47,753.49ZM537.02,777.52L535.40,779.40L530.30,780.45L527.29,777.59L528.41,775.20L525.51,773.62L529.23,770.32L530.24,766.63L527.70,760.62L524.48,759.20L524.76,756.58L511.19,754.63L507.59,749.49L505.17,750.14L501.69,747.78L497.96,749.45L501.70,742.80L503.91,744.09L505.77,742.43L506.64,744.17L508.40,741.66L505.28,740.58L503.04,741.59L504.13,737.82L502.03,737.82L503.12,733.22L494.66,730.74L490.60,725.33L488.01,714.71L480.26,711.26L486.69,708.78L484.18,706.22L487.27,700.80L490.48,699.68L495.60,701.27L498.79,699.31L510.14,705.24L528.81,695.83L533.24,695.71L537.80,697.32L539.32,697.67L540.15,698.70L540.83,699.15L544.67,705.30L546.19,709.09L549.06,709.31L549.18,710.37L545.51,711.74L544.37,718.34L541.33,720.62L542.99,729.58L543.37,729.99L541.26,739.17L546.59,743.22L543.98,747.56L546.41,748.83L546.35,756.79L548.93,765.75L540.01,765.16L539.35,768.29L543.02,772.00L543.11,776.08L538.43,775.54L537.02,777.52Z" },
  { id: '46219', name: 'いちき串木野市', nameEn: 'Ichikikushikino', prefId: '46', cx: 415.6, cy: 748.1, d: "M392.74,736.68L397.23,733.67L404.36,734.41L405.52,737.04L407.92,737.12L414.91,742.58L420.94,740.49L423.50,744.28L430.27,742.08L431.86,745.84L434.96,746.39L435.05,748.79L434.58,754.64L424.77,757.23L425.02,759.81L421.70,766.91L417.86,765.79L415.87,759.23L413.14,755.23L409.39,754.49L410.55,752.74L409.00,752.40L409.83,751.03L408.17,750.92L407.33,748.64L399.35,742.38L395.20,744.80L393.99,744.13L392.74,736.68Z" },
  { id: '46220', name: '南さつま市', nameEn: 'Minamisatsuma', prefId: '46', cx: 413.9, cy: 834.2, d: "M390.41,840.96L389.53,843.96L388.61,843.90L388.97,842.10L390.41,840.96ZM233.21,970.49L233.48,971.06L232.16,972.22L232.11,971.23L233.21,970.49ZM239.99,966.98L240.37,967.95L239.33,967.94L239.40,967.22L239.99,966.98ZM235.91,882.28L237.40,882.88L236.02,887.77L233.40,888.34L235.37,885.29L235.91,882.28ZM241.38,879.34L242.15,880.94L242.24,883.26L240.68,881.33L241.38,879.34ZM447.21,808.66L449.56,812.89L444.41,815.30L435.70,828.87L431.24,828.92L427.13,833.54L426.40,840.82L424.15,845.70L420.84,848.27L418.52,847.17L411.67,853.47L406.84,854.01L406.43,855.80L411.26,858.89L407.98,862.87L410.27,868.13L406.38,868.89L405.39,867.32L400.59,869.74L399.99,866.87L403.16,865.25L400.07,863.60L403.27,861.76L400.55,861.37L399.93,859.61L397.15,861.32L396.75,858.34L401.63,856.91L402.30,854.70L400.13,851.84L395.16,853.12L391.34,850.92L397.83,848.42L398.95,844.98L397.23,842.57L394.85,843.22L394.94,840.34L391.56,840.40L389.48,838.42L382.52,829.14L380.12,827.70L377.00,828.69L378.97,825.92L383.35,828.54L388.41,821.88L390.74,826.79L392.87,826.79L394.12,829.35L394.09,825.49L395.48,824.60L395.39,829.66L402.92,831.92L404.22,829.49L412.25,825.22L421.14,809.11L427.63,810.34L430.62,812.86L436.84,813.07L447.21,808.66Z" },
  { id: '46221', name: '志布志市', nameEn: 'Shibushi', prefId: '46', cx: 587.8, cy: 798.9, d: "M586.08,817.01L588.35,817.61L591.72,812.78L597.33,815.05L597.60,816.64L598.89,814.82L602.04,816.11L603.21,813.43L604.20,807.63L604.86,806.29L610.16,803.89L610.99,802.34L610.84,801.01L611.15,798.97L609.85,793.65L608.55,792.42L611.21,789.90L612.00,786.69L609.19,782.01L608.10,780.75L608.57,776.06L606.27,774.13L604.40,773.23L601.42,778.55L597.75,780.39L594.67,780.05L594.17,782.51L591.28,784.08L574.45,779.43L571.19,783.50L576.44,788.60L576.45,790.47L572.10,793.27L573.16,797.07L568.49,799.40L567.87,797.69L562.56,796.84L562.85,804.32L559.33,805.90L561.94,807.48L560.11,813.03L566.45,818.25L569.75,817.10L572.39,813.67L575.11,816.67L579.21,817.55L577.96,817.65L578.91,820.81L580.98,820.34L584.77,817.31L586.43,819.96L586.08,817.01ZM560.09,796.70L558.21,797.70L559.64,799.08L560.09,796.70ZM556.52,798.57L556.42,799.23L557.18,799.07L556.52,798.57ZM560.54,802.97L560.25,802.33L559.79,802.14L559.34,802.70L560.54,802.97ZM554.98,803.37L553.10,804.58L553.47,805.79L554.76,805.23L554.98,803.37ZM592.92,823.39L592.46,824.39L593.03,825.38L593.46,824.63L592.92,823.39Z" },
  { id: '46223', name: '南九州市', nameEn: 'Minamikyushu', prefId: '46', cx: 447.8, cy: 847.0, d: "M449.56,812.89L452.12,816.27L457.70,816.78L458.56,826.10L462.70,830.78L463.38,833.82L462.27,840.80L458.95,845.18L461.35,848.62L464.99,849.22L467.12,851.45L469.46,858.41L470.57,865.77L467.95,875.31L462.96,878.88L458.19,872.91L452.48,869.35L446.39,870.53L440.38,868.78L433.03,869.20L431.77,858.06L434.63,855.02L433.27,852.19L431.79,854.04L425.43,854.86L420.84,848.27L424.15,845.70L426.40,840.82L427.13,833.54L431.24,828.92L435.70,828.87L444.41,815.30L449.56,812.89Z" },
  { id: '46224', name: '伊佐市', nameEn: 'Isa', prefId: '46', cx: 482.7, cy: 666.5, d: "M456.35,673.11L462.32,664.71L464.02,664.80L462.58,659.63L455.95,650.28L456.19,646.10L457.35,645.94L459.50,647.43L463.10,645.71L464.82,646.88L469.73,646.49L470.99,643.49L473.43,642.29L478.81,642.09L481.82,636.81L480.75,634.29L484.36,633.92L485.79,636.74L486.27,640.05L487.37,641.81L490.39,642.09L491.34,642.85L493.56,643.01L494.28,646.93L503.70,654.14L506.91,654.90L508.31,655.70L507.32,659.50L504.66,661.64L504.62,666.33L505.01,681.35L502.03,682.52L498.62,686.93L495.43,694.10L488.14,697.43L485.40,692.79L481.31,694.64L480.38,692.98L476.65,692.51L468.42,682.85L469.68,679.50L467.24,678.01L460.75,680.32L456.35,673.11Z" },
  { id: '46225', name: '姶良市', nameEn: 'Aira', prefId: '46', cx: 481.6, cy: 736.1, d: "M484.93,763.32L482.28,762.08L482.28,759.03L475.09,754.39L474.60,751.78L479.70,748.81L477.05,744.68L467.73,743.39L461.45,745.39L462.43,749.10L460.76,750.72L455.53,748.92L457.36,744.68L461.81,741.24L461.44,733.54L465.07,731.36L464.32,729.11L466.39,723.47L472.79,717.18L477.11,716.67L480.26,711.26L488.01,714.71L490.60,725.33L494.66,730.74L503.12,733.22L502.03,737.82L504.13,737.82L503.04,741.59L505.28,740.58L508.40,741.66L506.64,744.17L505.77,742.43L503.91,744.09L501.70,742.80L497.96,749.45L495.40,749.32L489.69,753.71L488.43,753.07L485.55,757.36L484.93,763.32Z" },
  { id: '46303', name: '三島村', nameEn: 'Mishima', prefId: '46', cx: 340.1, cy: 975.0, d: "M419.11,980.73L422.35,983.27L422.54,986.59L413.22,987.78L413.94,989.63L412.75,987.83L410.95,988.12L410.90,984.96L413.25,984.93L419.11,980.73ZM445.67,977.89L449.58,980.37L448.68,982.79L442.24,980.27L439.06,980.97L441.87,978.20L444.27,979.07L445.67,977.89ZM341.20,969.90L346.62,975.29L344.16,978.23L339.15,979.83L335.20,976.86L333.93,973.02L341.20,969.90Z" },
  { id: '46392', name: 'さつま町', nameEn: 'Satsuma', prefId: '46', cx: 455.9, cy: 696.8, d: "M427.54,688.48L429.88,685.41L432.83,685.87L432.82,684.03L441.49,682.75L442.99,679.13L446.17,677.93L449.80,679.63L451.93,678.66L452.83,673.67L456.35,673.11L460.75,680.32L467.24,678.01L469.68,679.50L468.42,682.85L476.65,692.51L480.38,692.98L481.31,694.64L485.40,692.79L488.14,697.43L487.27,700.80L484.18,706.22L486.69,708.78L480.26,711.26L477.57,710.39L475.87,707.72L468.34,707.71L463.13,705.32L462.72,708.64L455.89,708.13L453.82,714.32L454.40,717.21L452.77,717.79L453.96,720.53L452.19,726.56L450.23,721.63L442.99,720.32L439.76,716.03L440.09,705.27L435.02,699.60L428.61,697.30L427.34,694.49L428.27,693.11L426.46,691.32L427.54,688.48Z" },
  { id: '46404', name: '長島町', nameEn: 'Nagashima', prefId: '46', cx: 386.6, cy: 640.1, d: "M409.22,603.99L408.44,604.87L411.25,606.52L411.43,610.75L409.76,610.31L405.29,614.40L405.95,616.60L402.61,615.17L399.85,617.57L401.02,608.43L404.29,607.98L404.10,605.65L409.22,603.99ZM400.45,624.74L400.83,623.82L401.34,623.99L400.45,624.74ZM393.21,623.63L393.10,624.43L392.51,624.52L392.37,624.03L393.21,623.63ZM391.47,623.36L395.19,631.37L397.07,631.31L394.48,633.50L394.24,639.20L398.10,638.52L399.00,642.40L391.28,648.38L392.25,650.25L390.31,657.11L387.82,658.54L385.97,657.44L385.39,654.30L383.72,654.60L378.38,649.50L378.90,641.48L377.45,638.16L373.69,635.36L375.26,633.47L377.21,633.67L376.17,632.31L378.62,632.30L377.44,630.82L379.52,630.53L376.74,629.80L378.04,628.98L376.83,628.35L377.60,626.72L381.86,628.01L381.11,626.73L382.31,626.62L387.28,631.32L385.92,626.55L387.16,627.09L387.61,624.21L389.33,627.03L391.47,623.36ZM393.93,619.62L394.13,620.01L393.19,620.62L393.25,619.92L393.93,619.62ZM395.83,619.57L398.66,624.26L398.05,625.88L399.39,625.73L399.15,628.21L398.02,629.30L398.73,627.92L396.44,627.02L397.26,628.73L394.36,625.43L396.21,624.03L395.83,619.57ZM401.89,616.99L403.33,618.04L403.39,618.91L402.76,619.13L401.89,616.99ZM394.12,613.41L394.77,615.34L391.74,618.80L390.38,624.23L388.31,620.14L389.79,620.35L391.08,616.34L392.03,617.18L394.12,613.41Z" },
  { id: '46452', name: '湧水町', nameEn: 'Yusui', prefId: '46', cx: 510.0, cy: 689.0, d: "M528.81,695.83L510.14,705.24L498.79,699.31L495.60,701.27L490.48,699.68L487.27,700.80L488.14,697.43L495.43,694.10L498.62,686.93L502.03,682.52L505.01,681.35L504.62,666.33L512.00,669.17L514.05,671.93L515.14,672.67L517.04,674.71L518.60,675.98L520.64,677.62L521.26,683.01L521.43,685.31L521.91,686.32L523.28,687.39L524.41,689.49L525.51,690.90L525.19,693.58L526.42,693.67L527.76,694.95L528.81,695.83Z" },
  { id: '46468', name: '大崎町', nameEn: 'Osaki', prefId: '46', cx: 562.7, cy: 816.0, d: "M564.62,832.76L572.59,833.25L580.98,820.34L578.91,820.81L577.96,817.65L579.21,817.55L575.11,816.67L572.39,813.67L569.75,817.10L566.45,818.25L560.11,813.03L561.94,807.48L559.33,805.90L562.85,804.32L562.56,796.84L559.64,799.08L558.21,797.70L554.95,796.70L552.23,793.35L550.21,795.82L551.39,804.30L549.88,806.25L547.21,806.21L547.00,810.18L550.13,814.87L556.36,815.77L558.76,822.43L560.62,829.45L564.62,832.76ZM565.28,815.04L566.53,814.66L566.79,811.79L564.80,812.46L565.28,815.04Z" },
  { id: '46482', name: '東串良町', nameEn: 'Higashikushira', prefId: '46', cx: 565.1, cy: 836.2, d: "M575.63,840.03L573.48,841.19L572.85,837.73L574.99,837.53L575.63,840.03ZM561.44,839.99L560.72,838.30L561.93,837.25L559.86,836.72L557.94,826.87L558.76,822.43L560.62,829.45L564.62,832.76L572.59,833.25L571.43,842.30L565.20,842.68L563.51,844.44L562.85,841.89L561.75,843.17L561.44,839.99Z" },
  { id: '46490', name: '錦江町', nameEn: 'Kinko', prefId: '46', cx: 537.8, cy: 878.0, d: "M523.80,858.18L527.84,854.54L538.66,857.51L539.80,859.77L538.57,864.37L541.39,864.93L544.05,869.52L546.55,869.17L552.28,875.26L548.91,882.27L553.46,883.39L556.25,886.02L542.88,899.89L538.82,901.93L533.33,899.93L532.14,898.01L535.19,893.83L533.80,893.87L532.40,889.34L526.89,882.86L526.99,880.65L530.40,881.34L532.01,879.07L535.89,878.39L533.39,872.05L531.30,871.19L529.24,876.35L525.62,873.41L518.38,875.88L523.21,868.69L523.80,858.18Z" },
  { id: '46491', name: '南大隅町', nameEn: 'Minamiosumi', prefId: '46', cx: 519.5, cy: 902.0, d: "M518.38,875.88L525.62,873.41L529.24,876.35L531.30,871.19L533.39,872.05L535.89,878.39L532.01,879.07L530.40,881.34L526.99,880.65L526.89,882.86L532.40,889.34L533.80,893.87L535.19,893.83L532.14,898.01L533.33,899.93L538.82,901.93L542.88,899.89L546.92,904.09L541.08,908.65L528.04,910.11L516.42,918.19L514.12,917.23L513.15,919.34L508.03,920.99L507.02,925.23L500.45,926.23L501.45,928.88L500.24,931.57L497.14,930.42L495.38,933.74L494.64,930.80L498.96,923.98L499.22,917.06L493.90,914.83L506.91,903.66L510.53,903.17L513.34,899.49L518.18,887.12L515.38,879.24L518.38,875.88Z" },
  { id: '46492', name: '肝付町', nameEn: 'Kimotsuki', prefId: '46', cx: 566.1, cy: 865.8, d: "M548.91,882.27L553.46,883.39L556.25,886.02L542.88,899.89L546.92,904.09L550.08,904.01L551.31,901.06L554.29,900.95L562.62,895.68L563.50,893.02L562.20,890.67L567.01,889.59L564.86,887.63L568.76,884.81L569.51,877.95L571.81,875.17L582.27,875.23L585.18,871.01L596.22,862.12L594.05,860.46L590.98,863.22L587.73,862.36L585.93,863.45L583.78,859.24L591.02,853.15L590.23,850.49L591.35,849.51L571.43,842.30L565.20,842.68L563.51,844.44L562.85,841.89L561.75,843.17L561.44,839.99L552.94,842.31L548.33,838.79L548.31,834.32L545.73,832.90L546.11,838.65L549.79,842.45L550.40,853.23L553.26,860.40L552.02,862.00L554.94,871.11L552.28,875.26L548.91,882.27Z" },
  { id: '46501', name: '中種子町', nameEn: 'Nakatane', prefId: '46', cx: 559.4, cy: 1048.9, d: "M557.20,1024.18L563.83,1022.51L564.90,1029.37L575.10,1036.28L574.27,1043.68L570.96,1046.12L567.92,1046.20L567.02,1050.52L563.57,1054.51L563.55,1057.84L560.07,1063.68L561.45,1065.80L561.32,1067.69L559.19,1068.42L560.20,1070.21L550.25,1072.07L548.13,1070.62L547.20,1066.70L542.69,1062.91L549.98,1053.30L556.32,1040.39L558.10,1034.81L557.20,1024.18Z" },
  { id: '46502', name: '南種子町', nameEn: 'Minamitane', prefId: '46', cx: 548.7, cy: 1080.4, d: "M542.69,1062.91L547.20,1066.70L548.13,1070.62L550.25,1072.07L560.20,1070.21L563.62,1073.83L561.19,1078.12L564.06,1083.74L560.60,1085.45L561.16,1090.28L554.48,1089.65L545.90,1093.66L543.04,1097.60L540.77,1097.35L537.60,1090.93L539.33,1079.15L535.71,1067.10L540.14,1067.40L542.69,1062.91Z" },
  { id: '46505', name: '屋久島町', nameEn: 'Yakushima', prefId: '46', cx: 465.8, cy: 1098.8, d: "M460.70,1065.97L461.00,1070.18L463.43,1069.37L467.10,1072.26L470.41,1071.59L476.80,1076.89L482.05,1079.07L482.37,1080.99L494.62,1085.56L497.82,1090.54L493.99,1108.74L479.43,1123.60L470.85,1126.17L467.58,1125.26L465.76,1127.06L461.74,1125.42L458.74,1126.84L447.54,1123.52L444.24,1116.85L442.56,1117.13L442.53,1109.32L440.40,1104.58L438.04,1103.14L434.75,1089.56L435.11,1085.43L443.84,1084.42L449.84,1076.25L453.50,1074.08L453.50,1069.07L455.04,1067.99L459.49,1069.85L460.70,1065.97ZM385.62,1060.73L387.49,1062.05L390.31,1061.17L389.62,1062.73L392.99,1062.36L395.05,1065.37L397.03,1063.01L404.53,1065.85L410.83,1071.30L410.60,1074.92L405.42,1074.23L403.28,1077.21L399.06,1077.89L395.14,1073.01L396.05,1068.01L390.84,1069.29L385.62,1060.73Z" },
  { id: '46304', name: '十島村', nameEn: 'Toshima', prefId: '46', cx: 326.5, cy: 1221.9, d: "M139.13,1484.03L137.07,1486.27L134.83,1485.34L135.68,1487.48L140.73,1487.41L140.90,1485.24L139.13,1484.03ZM141.23,1478.65L139.96,1476.97L140.24,1478.66L141.23,1478.65ZM183.39,1395.54L180.27,1396.95L187.42,1403.66L187.72,1396.15L183.39,1395.54ZM210.28,1377.97L208.58,1379.03L210.26,1380.70L211.25,1379.08L210.28,1377.97ZM214.91,1378.42L213.73,1377.70L213.85,1378.96L214.91,1378.42ZM267.66,1315.56L265.59,1318.98L267.75,1320.98L267.32,1322.92L272.54,1323.04L270.68,1316.79L267.66,1315.56ZM298.62,1266.58L291.43,1268.03L286.54,1271.57L289.61,1283.82L292.73,1283.10L292.54,1281.46L297.21,1277.70L298.62,1266.58ZM254.65,1260.27L252.68,1262.67L255.01,1265.45L255.80,1262.91L254.65,1260.27ZM322.50,1213.28L320.11,1215.14L318.72,1219.24L324.39,1228.82L327.10,1230.22L330.32,1228.73L336.13,1229.09L331.81,1223.28L331.00,1216.70L322.50,1213.28ZM273.86,1213.63L272.70,1213.43L272.96,1215.30L273.86,1213.63ZM255.15,1205.07L253.73,1206.26L254.15,1210.24L258.46,1210.74L257.98,1207.28L255.15,1205.07ZM336.39,1182.18L334.82,1183.77L335.94,1186.19L332.71,1189.90L335.74,1194.72L340.18,1196.88L342.90,1194.13L337.65,1186.81L336.39,1182.18Z" },
  // 奄美群島12市町村。国土数値情報(国交省)の行政区域データを、鹿児島市・中種子町・屋久島町・
  // 十島村の実際の緯度経度とローカル座標(cx/cy)から求めた変換式で座標変換し、実際の海岸線を
  // 簡略化して作成。基準点から離れる島(与論島・沖永良部島側)ほど、変換の誤差はやや大きくなる。
  { id: '46222', name: '奄美市', nameEn: 'Amami', prefId: '46', cx: 215.1, cy: 1595.1, d: "M204.6,1612.1L204.0,1613.4L209.4,1616.9L208.5,1618.2L206.9,1623.9L203.3,1622.3L202.8,1620.8L194.1,1620.3L190.5,1617.0L189.4,1614.7L192.5,1609.9L191.8,1608.7L197.5,1606.9L193.3,1600.6L201.9,1597.9L203.8,1596.2L204.3,1593.2L210.3,1593.8L208.1,1584.9L201.0,1577.9L203.3,1578.9L209.3,1579.5L213.1,1580.3L214.4,1575.9L216.5,1572.3L218.1,1574.0L220.5,1576.2L227.3,1573.5L227.8,1570.9L228.7,1566.6L230.8,1565.7L232.4,1564.9L233.8,1562.4L235.9,1567.9L235.4,1574.6L237.4,1576.1L237.4,1578.3L236.4,1582.3L232.9,1580.0L231.7,1579.3L230.4,1580.2L229.9,1580.3L230.1,1587.4L231.3,1590.7L233.3,1590.8L240.3,1591.9L232.0,1596.0L232.1,1597.5L232.6,1597.9L233.0,1601.3L224.5,1602.6L218.7,1602.8L217.5,1603.4L216.0,1601.9L212.5,1604.1L213.6,1604.1L215.0,1604.3L215.6,1609.4L212.7,1611.3L204.9,1613.0ZM259.1,1579.7L255.0,1578.5L254.8,1578.2L257.6,1577.8L257.9,1574.4L257.1,1573.2L257.1,1571.8L257.4,1571.4L257.3,1572.6L258.3,1573.0L258.6,1574.5L260.2,1572.1L257.8,1567.6L258.7,1565.7L257.7,1562.8L259.0,1562.9L261.9,1570.6L263.3,1569.8L262.0,1567.1L263.7,1564.9L263.0,1564.9L263.1,1563.3L261.9,1561.3L259.7,1559.4L257.4,1553.9L260.3,1554.9L260.5,1553.4L261.6,1553.0L264.0,1548.5L267.1,1547.7L268.0,1552.6L267.2,1554.6L268.2,1558.0L270.6,1562.2L273.7,1562.7L272.9,1564.9L274.5,1566.7L272.2,1571.4L273.7,1571.7L271.7,1575.9L270.7,1575.5L271.3,1573.9L268.2,1577.7L262.6,1578.2L261.5,1581.0L259.4,1580.8L259.1,1579.7Z" },
  { id: '46523', name: '大和村', nameEn: 'Yamato', prefId: '46', cx: 192.5, cy: 1591.2, d: "M201.9,1597.9L193.3,1600.6L193.3,1603.0L191.9,1603.1L189.2,1599.8L183.6,1599.0L180.7,1595.1L177.1,1596.3L171.6,1595.1L170.8,1594.0L171.9,1592.2L170.5,1590.6L171.7,1590.7L171.9,1589.7L175.8,1590.2L176.7,1589.0L178.2,1590.5L180.9,1590.0L181.2,1589.0L182.1,1589.4L182.8,1588.8L182.0,1587.3L183.0,1586.3L181.9,1585.4L185.7,1585.4L188.5,1581.0L189.9,1580.9L191.5,1583.3L194.6,1585.2L196.1,1584.3L196.8,1582.3L199.7,1580.8L201.3,1582.4L202.2,1585.7L203.4,1584.7L203.3,1583.7L204.4,1584.2L204.7,1583.7L203.3,1582.6L203.1,1580.1L200.9,1578.1L201.4,1578.1L207.2,1582.1L208.1,1584.9L207.6,1587.0L210.3,1593.8L204.3,1593.2L203.1,1594.0L203.8,1596.2L203.3,1598.8L201.9,1597.9Z" },
  { id: '46524', name: '宇検村', nameEn: 'Uken', prefId: '46', cx: 178.4, cy: 1604.1, d: "M169.0,1603.1L166.8,1601.4L166.9,1600.0L165.1,1600.7L163.2,1598.3L163.9,1597.4L162.0,1597.4L160.9,1596.0L161.5,1595.2L160.5,1595.6L159.8,1593.8L161.0,1594.8L163.8,1593.3L165.1,1594.1L166.5,1592.5L170.1,1592.1L170.5,1590.6L171.9,1592.2L170.8,1594.0L171.6,1595.1L177.1,1596.3L181.4,1595.4L183.6,1599.0L189.2,1599.8L191.1,1602.4L193.9,1603.1L197.5,1606.9L192.9,1609.2L191.8,1608.7L192.5,1609.9L189.9,1613.9L187.9,1613.7L185.8,1615.1L184.2,1613.7L182.0,1614.8L180.7,1612.7L178.5,1612.9L175.9,1610.0L164.5,1612.7L163.4,1610.9L163.7,1608.0L166.2,1607.6L166.9,1605.3L168.1,1605.9L167.3,1606.8L169.7,1605.4L171.2,1606.6L171.7,1605.1L172.9,1605.3L174.0,1606.9L174.9,1603.1L177.2,1603.0L178.8,1604.4L179.9,1604.6L178.5,1604.0L178.3,1601.4L173.7,1601.4L172.4,1599.9L171.4,1600.9L171.8,1603.4ZM152.6,1595.3L153.7,1593.1L157.0,1595.2L158.2,1594.8L161.0,1597.2L162.2,1599.9L160.2,1599.1L158.9,1600.0L157.2,1598.7L155.9,1599.2L152.6,1595.3ZM157.2,1605.1L158.1,1606.9L159.3,1607.3L158.0,1608.0L157.7,1606.8L157.5,1609.9L154.9,1609.9L153.5,1607.6L157.2,1605.1Z" },
  { id: '46525', name: '瀬戸内町', nameEn: 'Setouchi', prefId: '46', cx: 170.1, cy: 1641.5, d: "M165.6,1647.9L162.2,1652.4L160.6,1651.0L161.7,1649.8L162.1,1644.3L161.0,1641.3L161.7,1636.6L157.9,1635.5L156.9,1633.0L154.5,1630.2L152.4,1625.9L153.2,1622.6L154.9,1623.7L159.3,1620.7L161.3,1623.5L166.2,1623.2L166.5,1624.2L166.1,1625.5L158.0,1625.6L159.6,1629.3L162.5,1629.6L164.6,1633.3L166.4,1634.3L169.3,1629.0L170.6,1632.9L173.0,1630.5L174.1,1634.9L167.3,1634.8L167.4,1636.1L171.0,1636.4L166.9,1638.6L168.5,1639.2L169.1,1641.5L171.8,1639.5L174.1,1639.2L171.3,1640.2L170.8,1643.2L173.8,1642.0L174.0,1644.6L176.5,1643.8L178.9,1646.3L181.7,1644.7L183.0,1645.3L185.5,1647.2L187.9,1646.7L190.0,1647.2L191.9,1648.5L188.9,1655.3L183.9,1658.6L183.1,1655.7L184.3,1649.8L180.5,1652.0L177.7,1652.0L177.0,1654.3L177.2,1657.1L174.0,1656.6L172.0,1651.0L170.6,1646.0L166.9,1645.7L168.2,1647.4ZM186.2,1635.6L184.6,1640.7L184.5,1636.9L183.6,1637.5L183.0,1636.7L184.1,1635.6L182.8,1635.5L182.4,1637.4L180.1,1635.8L178.8,1636.1L177.8,1634.7L179.0,1632.8L176.1,1631.4L176.7,1630.6L178.2,1631.5L179.1,1630.3L177.4,1629.3L178.5,1628.4L178.1,1627.4L175.8,1628.2L175.7,1626.4L177.6,1625.7L176.2,1625.6L175.9,1623.3L175.2,1625.8L172.8,1627.0L174.9,1620.9L182.5,1621.3L181.0,1622.4L180.8,1626.6L182.5,1627.5L182.5,1630.4L184.6,1632.2L184.1,1633.6L186.2,1635.6ZM149.7,1659.1L150.5,1661.6L149.2,1663.4L149.4,1665.5L145.5,1667.0L144.6,1664.5L144.9,1661.8L146.0,1660.6L145.6,1657.9L147.6,1657.4L147.9,1655.5L151.0,1653.4L150.5,1655.9L152.5,1658.9L149.7,1659.1Z" },
  { id: '46527', name: '龍郷町', nameEn: 'Tatsugo', prefId: '46', cx: 242.6, cy: 1575.9, d: "M243.8,1588.1L243.2,1587.2L243.3,1588.9L240.4,1592.2L237.3,1591.3L234.3,1592.0L229.7,1589.7L231.2,1585.9L232.9,1586.2L233.8,1585.4L234.0,1583.5L236.0,1580.3L237.4,1578.3L237.4,1576.1L234.1,1576.4L235.4,1574.6L234.7,1571.0L233.9,1562.4L234.5,1561.7L236.0,1562.9L237.8,1566.4L238.8,1565.9L240.4,1563.9L241.7,1561.4L244.3,1561.7L245.9,1559.8L251.9,1559.6L251.3,1560.9L250.4,1562.6L250.5,1564.1L249.9,1563.5L248.2,1565.5L248.4,1570.0L246.6,1571.4L245.3,1572.2L245.7,1573.3L245.0,1573.1L245.6,1573.4L244.7,1575.2L245.3,1574.5L246.3,1573.9L247.4,1575.1L247.6,1570.9L249.9,1569.7L251.0,1571.1L251.4,1569.1L250.4,1567.4L251.6,1566.4L253.5,1567.8L253.0,1568.5L251.2,1572.4L251.7,1575.0L255.8,1575.6L256.6,1571.8L257.4,1571.3L255.9,1577.4L249.9,1579.0L249.2,1581.5L246.4,1583.8L245.4,1587.3Z" },
  { id: '46529', name: '喜界町', nameEn: 'Kikai', prefId: '46', cx: 330.6, cy: 1606.9, d: "M325.1,1618.6L322.6,1617.6L322.5,1615.9L321.0,1613.9L318.9,1614.3L318.4,1612.4L317.6,1612.6L317.1,1608.6L317.8,1607.3L321.5,1604.5L322.2,1606.4L322.8,1606.2L322.4,1604.7L326.1,1605.4L326.4,1604.1L330.8,1601.9L335.4,1597.0L337.0,1596.2L337.0,1596.8L337.3,1596.9L338.6,1594.3L341.4,1594.0L343.7,1595.9L344.4,1597.4L343.6,1598.0L344.4,1597.8L344.6,1598.8L344.0,1600.0L342.6,1599.7L343.6,1600.8L341.7,1601.5L341.6,1603.2L340.1,1604.7L338.4,1603.5L338.7,1604.5L338.2,1605.2L336.9,1604.0L337.3,1605.5L338.4,1605.6L334.2,1611.0L331.8,1616.0L331.0,1615.4L330.6,1617.1L329.7,1617.4L328.9,1616.3L328.7,1617.9L326.0,1618.8L325.0,1617.8L325.1,1618.6Z" },
  { id: '46530', name: '徳之島町', nameEn: 'Tokunoshima', prefId: '46', cx: 106.4, cy: 1718.9, d: "M111.7,1744.5L106.2,1737.3L104.0,1737.6L101.4,1735.6L102.5,1732.9L101.9,1730.9L105.7,1729.8L107.4,1726.4L107.3,1724.3L108.9,1722.2L105.3,1720.8L103.6,1719.4L103.3,1717.9L99.6,1716.8L97.2,1711.9L95.1,1712.6L96.3,1709.2L94.6,1708.3L93.7,1705.2L97.4,1702.8L95.9,1698.5L91.5,1697.4L91.8,1692.4L95.9,1694.1L98.1,1693.2L106.1,1694.0L105.4,1695.1L106.9,1698.8L104.7,1699.1L102.4,1701.3L106.0,1703.3L105.8,1705.7L104.7,1706.6L106.3,1709.4L104.9,1709.3L105.0,1712.8L108.2,1714.5L109.0,1716.6L111.8,1716.5L112.5,1718.4L116.1,1721.9L115.6,1723.2L119.7,1725.1L120.9,1726.8L119.5,1732.4L117.1,1733.3L118.1,1734.9L117.3,1735.1L116.5,1737.6L117.1,1739.5L114.7,1740.0L113.1,1742.0L113.6,1744.0L111.7,1744.5Z" },
  { id: '46531', name: '天城町', nameEn: 'Amagi', prefId: '46', cx: 95.0, cy: 1715.7, d: "M87.5,1718.7L87.1,1713.6L88.6,1713.1L87.5,1712.3L88.0,1710.7L85.3,1708.6L85.8,1703.5L86.2,1706.6L88.2,1702.2L87.2,1700.5L88.5,1701.1L88.8,1701.5L88.9,1701.5L87.3,1698.9L87.5,1694.4L89.3,1692.3L91.4,1692.0L91.5,1697.4L95.9,1698.5L97.4,1702.8L93.7,1705.2L94.6,1708.3L96.3,1709.2L95.1,1712.6L97.2,1711.9L99.6,1716.8L103.3,1717.9L103.6,1719.4L109.0,1722.7L107.3,1724.3L107.4,1726.4L105.7,1729.8L101.9,1730.9L101.9,1732.5L99.3,1731.4L95.2,1731.5L94.7,1730.2L93.7,1730.3L91.1,1728.6L90.6,1727.7L91.4,1724.0L90.8,1724.5L89.1,1722.7L88.5,1719.5L87.5,1718.7Z" },
  { id: '46532', name: '伊仙町', nameEn: 'Isen', prefId: '46', cx: 99.2, cy: 1741.2, d: "M104.7,1750.1L98.0,1752.0L95.5,1750.3L94.4,1747.8L94.4,1743.5L89.7,1739.2L88.1,1739.0L85.6,1735.2L89.7,1732.2L90.4,1727.7L94.7,1730.2L95.2,1731.5L99.3,1731.4L102.4,1732.8L101.7,1736.3L104.0,1737.6L106.2,1737.3L111.8,1744.6L112.4,1746.1L109.5,1751.0L107.1,1751.2L104.7,1750.1Z" },
  { id: '46533', name: '和泊町', nameEn: 'Wadomari', prefId: '46', cx: 31.3, cy: 1811.7, d: "M30.7,1820.3L27.0,1820.6L23.1,1814.7L21.3,1816.7L18.5,1816.5L17.0,1814.7L18.2,1812.7L17.2,1810.0L21.3,1811.4L25.5,1808.8L27.3,1810.1L28.8,1808.9L30.3,1809.3L32.3,1807.9L31.9,1807.2L32.7,1807.8L35.0,1806.1L40.3,1805.0L43.1,1802.6L47.5,1803.5L48.1,1804.8L46.9,1805.9L43.9,1808.0L39.6,1809.1L37.9,1812.3L37.1,1811.5L36.7,1812.4L37.5,1812.9L35.4,1813.4L35.8,1814.0L35.3,1813.4L34.7,1816.0L30.7,1820.3Z" },
  { id: '46534', name: '知名町', nameEn: 'Chinan', prefId: '46', cx: 14.9, cy: 1818.9, d: "M23.9,1825.2L16.4,1828.2L15.1,1828.5L16.3,1827.9L14.6,1828.4L11.4,1826.9L7.6,1822.9L5.9,1818.9L5.5,1819.2L5.6,1817.2L4.7,1815.8L5.2,1812.0L7.6,1808.0L12.1,1810.7L17.2,1810.0L18.2,1812.7L17.0,1814.2L17.8,1815.9L21.0,1816.8L23.1,1814.7L27.0,1820.6L28.1,1820.9L23.9,1825.2Z" },
  { id: '46535', name: '与論町', nameEn: 'Yoron', prefId: '46', cx: -15.4, cy: 1897.9, d: "M-12.5,1904.3L-16.9,1902.9L-17.6,1901.4L-18.4,1900.8L-19.5,1901.2L-21.5,1898.2L-22.5,1899.0L-23.3,1895.8L-22.0,1894.8L-20.9,1896.3L-19.1,1895.9L-19.7,1895.5L-18.9,1895.2L-19.0,1893.3L-17.4,1891.7L-13.3,1892.2L-10.1,1896.6L-10.3,1899.5L-9.3,1903.3L-12.5,1904.3Z" },
];

// 離島(対馬・壱岐は長崎県、種子島・屋久島は鹿児島県)。地図の隅に区画したインセット表示用の個別座標系
const KYUSHU_INSET_ISLANDS = [
  { name: '対馬', nameEn: 'Tsushima', parentId: '42', viewW: 66.7, viewH: 123.2, d: 'M52.7,6.6 L39.4,24.6 L23.9,22.6 L16.4,45.1 L29.2,53.0 L23.7,52.2 L13.9,70.1 L22.2,75.2 L13.9,77.8 L14.1,95.4 L3.6,98.7 L17.0,104.9 L16.4,92.0 L21.6,92.4 L21.2,105.6 L30.1,94.8 L31.2,116.6 L37.2,112.0 L34.1,105.1 L40.1,105.6 L34.0,103.3 L40.2,99.4 L36.2,91.7 L40.9,85.5 L31.0,92.3 L34.1,80.0 L38.4,81.6 L35.2,74.0 L57.5,47.7 L59.2,36.6 L49.1,30.3 L59.2,30.4 L56.9,20.2 L63.2,17.2 Z' },
  { name: '壱岐', nameEn: 'Iki', parentId: '42', viewW: 77.6, viewH: 95.2, d: 'M31.3,5.1 L16.8,18.7 L24.2,35.1 L18.7,40.7 L12.4,31.9 L7.1,35.3 L14.8,39.0 L7.5,39.0 L9.8,49.2 L19.8,51.2 L22.9,60.6 L4.2,55.5 L9.2,71.1 L17.2,61.5 L22.2,67.8 L19.0,77.3 L27.5,78.0 L24.6,83.5 L36.4,90.1 L44.7,71.4 L64.3,70.8 L72.0,63.7 L68.1,55.5 L55.5,52.9 L58.1,47.2 L73.5,46.5 L51.0,35.4 L57.8,33.2 L59.7,14.2 Z' },
  { name: '種子島', nameEn: 'Tanegashima', parentId: '46', viewW: 40.7, viewH: 100, d: 'M19.4,77.3 L22.3,80.8 L20.9,85.0 L22.5,87.2 L20.3,88.3 L20.6,91.4 L16.3,91.0 L7.3,96.0 L5.2,91.9 L6.4,84.2 L4.0,76.5 L7.6,76.0 L16.0,62.4 L18.6,55.6 L16.8,43.3 L22.1,34.2 L24.3,33.9 L25.8,24.4 L32.9,15.7 L36.7,23.8 L35.2,28.1 L36.0,39.0 L32.3,45.3 L32.9,53.7 L29.8,56.6 L29.2,61.3 L25.1,63.0 L20.1,73.6 L20.7,76.8 Z' },
  { name: '屋久島', nameEn: 'Yakushima', parentId: '46', viewW: 103.7, viewH: 100, d: 'M43.1,4.0 L99.4,39.0 L95.4,66.0 L70.6,91.3 L50.8,96.0 L25.1,92.1 L15.4,81.0 L15.3,69.3 L4.8,48.8 L4.0,33.3 L17.3,31.8 L32.1,16.2 L32.1,8.7 L41.3,9.8 Z' },
  { name: '十島村', nameEn: 'Toshima Village', parentId: '46', viewW: 70.7, viewH: 100.0, d: 'M39.5,28.2 L39.6,28.5 L40.0,28.8 L40.0,28.9 L40.2,29.1 L40.3,28.9 L40.4,28.3 L40.3,28.2 L40.3,27.9 L40.4,27.7 L40.1,27.5 L39.9,27.6 L39.7,27.8 L39.5,28.2 Z M28.1,63.1 L28.1,62.8 L27.9,62.8 L27.8,62.9 L27.8,63.2 L27.8,63.2 L28.1,63.1 Z M26.5,63.5 L26.5,63.6 L26.7,63.8 L26.9,63.6 L27.0,63.3 L27.0,63.0 L26.8,63.1 L26.7,62.9 L26.5,63.0 L26.2,63.3 L26.3,63.4 L26.5,63.5 Z M17.7,68.7 L18.2,69.2 L18.6,69.8 L18.8,69.9 L19.3,70.1 L19.4,70.3 L19.9,70.7 L20.0,70.5 L19.8,70.0 L19.8,69.7 L19.8,69.3 L20.0,69.0 L20.0,68.8 L20.0,68.4 L19.8,68.3 L19.3,68.2 L19.2,68.4 L18.8,68.4 L18.8,68.3 L18.7,68.2 L18.3,68.3 L17.9,68.5 L17.7,68.7 Z M6.0,93.2 L5.9,93.0 L5.9,92.6 L5.6,92.7 L5.5,92.9 L5.7,93.2 L6.0,93.2 Z M4.5,95.3 L4.0,95.3 L4.0,95.4 L4.3,95.9 L4.5,95.9 L4.7,95.6 L4.8,95.7 L5.4,96.0 L5.8,95.9 L5.9,95.5 L5.9,95.2 L5.6,95.0 L5.3,94.9 L4.8,95.3 L4.7,95.5 L4.5,95.4 L4.5,95.3 Z M64.4,4.8 L64.5,4.9 L64.6,5.2 L64.4,5.3 L64.1,5.6 L63.9,5.7 L64.0,6.0 L63.8,6.2 L63.6,6.3 L63.7,6.5 L64.0,6.6 L64.0,6.9 L64.1,7.0 L63.9,7.2 L64.5,7.8 L64.8,7.9 L64.9,7.9 L65.2,8.0 L65.5,8.3 L65.8,8.4 L66.3,8.3 L66.5,8.1 L66.7,7.6 L66.5,7.4 L66.5,7.2 L66.3,6.9 L66.0,6.8 L65.8,6.5 L65.6,6.1 L65.4,5.8 L65.1,5.4 L64.9,4.8 L64.9,4.7 L64.7,4.2 L64.7,4.0 L64.4,4.1 L64.2,4.5 L64.4,4.8 Z M39.9,11.8 L39.9,12.0 L40.0,12.4 L40.5,12.6 L40.7,12.7 L40.7,12.6 L41.0,12.7 L41.2,12.6 L41.4,12.3 L41.3,12.2 L41.2,11.8 L41.1,11.6 L40.7,11.2 L40.4,11.2 L40.3,10.9 L40.1,11.1 L40.0,11.0 L39.8,11.2 L39.9,11.8 Z M45.7,13.9 L45.8,13.6 L45.9,13.5 L45.7,13.3 L45.5,13.4 L45.5,13.8 L45.6,14.0 L45.7,13.9 Z M60.1,13.7 L59.8,13.9 L59.7,14.5 L59.5,14.6 L59.4,15.2 L59.5,15.3 L59.5,15.5 L59.7,15.7 L59.6,16.0 L59.8,16.3 L59.9,16.5 L60.1,16.6 L60.3,16.5 L60.5,16.8 L60.6,17.0 L60.6,17.1 L61.1,18.0 L61.6,18.4 L61.9,18.5 L62.3,18.4 L62.5,18.2 L62.9,18.0 L63.5,18.0 L63.8,18.1 L63.9,18.3 L64.2,18.1 L64.6,18.1 L64.8,17.9 L64.6,17.7 L64.5,17.4 L64.0,17.1 L63.8,16.9 L63.3,16.4 L63.2,15.6 L63.3,15.4 L63.4,15.3 L63.4,15.1 L63.3,14.9 L63.1,14.9 L63.0,14.8 L63.1,14.6 L63.1,14.4 L62.9,14.5 L62.8,14.4 L62.7,14.2 L62.4,14.0 L62.0,14.0 L61.8,13.9 L61.6,13.9 L61.6,13.5 L61.4,13.4 L61.3,13.5 L61.0,13.4 L60.9,13.5 L60.5,13.4 L60.4,13.5 L60.1,13.6 L60.1,13.7 Z M52.5,29.6 L52.1,29.5 L52.0,29.7 L51.6,29.7 L51.2,29.8 L51.0,30.0 L50.7,30.4 L50.3,30.3 L50.3,30.5 L50.2,30.6 L50.1,30.5 L49.7,30.9 L50.0,31.2 L49.7,31.7 L50.0,32.0 L50.1,32.3 L50.0,32.5 L50.1,32.6 L50.1,33.2 L50.3,33.7 L50.6,34.0 L50.5,34.2 L50.6,34.6 L51.2,34.7 L51.6,34.4 L51.5,34.1 L51.5,33.9 L51.9,33.6 L52.0,33.4 L52.3,33.1 L52.5,33.0 L52.9,32.8 L53.0,32.4 L53.1,32.2 L53.3,31.8 L53.3,31.5 L53.4,31.3 L53.2,31.1 L53.3,30.4 L53.5,30.0 L53.5,29.6 L53.3,29.4 L53.3,29.4 L52.8,29.5 L52.7,29.7 L52.5,29.6 Z M43.4,45.2 L43.5,45.5 L43.7,45.6 L44.0,45.8 L44.1,45.9 L43.9,46.4 L44.1,46.6 L44.6,46.6 L44.9,46.5 L45.1,46.6 L45.5,46.4 L45.6,46.2 L45.5,45.8 L45.3,45.6 L45.2,45.4 L45.1,45.1 L44.9,44.5 L44.4,44.3 L44.0,44.2 L43.9,44.4 L43.6,44.7 L43.5,44.9 L43.4,45.2 Z' },
];

const PREF_VIEW_W = 600;
const PREF_VIEW_H = 600;

// 長崎県 各市町村の個別地図データ (国土数値情報より自動生成・簡略化)
const NAGASAKI_CITY_MAPS = {
  '42201': { name: '長崎市', nameEn: 'Nagasaki City', viewW: 110.3, viewH: 122.3,
    d: 'M57.8,108.5L58.8,111.9L55.4,113.9L55.4,109.8L57.8,108.5ZM56.6,75.3L57.6,77.8L56.4,78.4L54.6,75.8L56.6,75.3ZM47.7,93.7L47.5,94.6L47.1,94.5L47.7,93.7ZM50.3,84.3L52.1,85.1L51.0,88.5L49.2,85.6L50.3,84.3ZM52.4,72.1L55.4,73.6L56.3,75.2L53.2,74.3L52.4,72.1ZM96.1,60.4L99.3,60.9L98.7,62.7L101.2,63.3L97.1,63.6L96.1,60.4ZM52.4,52.6L52.2,53.3L51.7,53.3L51.7,52.9L52.4,52.6ZM8.4,33.2L10.0,33.5L10.0,33.9L9.3,34.1L8.4,33.2ZM59.9,30.6L61.2,31.0L60.9,31.5L59.9,30.6ZM18.4,27.9L18.4,30.4L16.0,30.6L16.3,29.4L18.4,27.9ZM61.3,21.6L62.5,21.5L62.2,22.4L60.7,22.0L61.3,21.6ZM70.6,47.8L73.7,51.2L75.6,48.9L75.5,51.6L76.7,49.1L84.6,48.1L87.2,45.6L89.5,46.8L92.8,46.0L94.9,48.2L98.2,46.2L101.9,49.2L100.8,61.1L94.5,59.6L92.2,61.2L94.2,65.5L90.8,68.0L91.3,69.4L89.2,71.7L88.3,70.2L87.5,73.9L84.9,72.9L85.1,77.7L81.2,85.4L74.8,90.2L70.6,91.6L69.1,90.6L68.8,95.9L61.6,103.5L56.2,105.6L56.9,107.6L52.9,105.4L47.5,108.7L46.9,106.0L50.3,103.0L50.9,105.3L51.6,102.8L56.4,100.2L61.7,88.7L64.3,87.5L64.9,79.6L61.4,81.5L58.8,78.0L63.0,77.8L64.5,74.4L66.4,74.0L66.2,77.1L65.0,77.2L68.7,78.7L67.8,76.6L70.9,76.1L69.9,74.6L71.8,70.8L73.3,70.5L75.7,63.7L74.7,63.6L72.8,65.7L70.4,70.9L69.1,69.4L66.6,71.5L65.0,70.9L67.4,67.7L67.0,64.9L65.9,64.1L63.9,66.4L61.6,64.9L63.9,61.4L62.2,60.7L62.3,62.3L61.3,60.5L60.1,60.9L60.9,56.5L58.8,56.1L55.8,51.5L53.8,51.5L55.3,46.2L49.1,45.3L47.7,49.1L46.5,48.8L43.5,45.2L43.2,42.4L39.9,42.9L39.5,40.5L36.2,37.7L34.4,34.0L35.0,30.8L32.6,26.8L35.6,24.7L40.6,24.1L41.2,22.5L47.3,22.4L48.0,13.9L58.9,8.4L62.2,10.1L64.6,13.8L62.8,21.4L60.4,20.1L60.8,15.7L59.6,17.2L60.4,12.1L57.1,15.3L57.5,21.0L59.2,22.1L57.5,22.1L57.2,23.8L58.3,25.5L59.6,25.5L59.1,23.6L61.8,23.7L62.7,27.2L61.3,30.7L59.5,29.6L60.1,28.5L59.5,28.4L58.6,29.7L58.4,33.3L60.1,33.0L58.8,34.9L65.1,44.3L64.6,47.1L70.6,47.8Z' },
  '42202': { name: '佐世保市', nameEn: 'Sasebo City', viewW: 202.0, viewH: 101.4,
    d: 'M123.6,30.3L124.2,30.5L124.1,29.8L123.6,30.3ZM29.2,37.5L29.3,34.4L34.9,32.0L32.0,30.8L31.1,25.3L29.0,24.1L27.1,27.4L21.3,27.8L16.4,32.0L17.0,34.8L18.9,33.4L22.9,37.5L29.2,37.5ZM123.6,31.1L123.0,30.5L122.5,30.8L122.6,32.0L123.6,31.1ZM122.5,33.8L121.9,32.4L121.4,33.0L121.9,34.0L122.5,33.8ZM121.1,34.3L122.1,34.4L121.6,33.9L121.1,34.3ZM13.9,35.4L16.2,38.7L17.5,37.7L17.0,36.0L15.1,36.9L15.7,34.0L13.9,35.4ZM121.7,37.2L122.3,36.2L122.0,36.1L121.2,36.8L121.7,37.2ZM121.5,41.5L120.6,41.4L120.6,42.6L121.7,42.9L121.5,41.5ZM120.6,42.7L120.2,42.8L119.6,42.7L120.8,43.1L120.6,42.7ZM119.1,43.3L118.5,42.8L118.6,43.9L119.4,44.1L119.1,43.3ZM123.0,46.1L122.4,45.5L122.4,46.5L122.8,46.6L123.0,46.1ZM125.4,47.6L125.0,46.5L124.7,47.0L124.8,47.9L125.4,47.6ZM126.4,49.5L126.0,49.4L126.3,50.2L126.8,50.1L126.4,49.5ZM126.7,54.4L127.1,52.3L128.7,53.5L127.8,51.4L125.8,51.7L125.4,53.5L127.7,57.0L126.2,59.7L128.3,58.4L128.0,54.8L126.7,54.4ZM113.6,57.1L112.8,56.5L112.5,57.1L113.5,58.1L113.6,57.1ZM111.6,64.8L109.2,64.8L116.1,67.2L116.9,65.5L119.1,65.8L117.8,62.0L111.6,64.8ZM173.2,83.1L180.9,80.3L182.3,74.3L183.3,64.0L188.1,58.6L183.6,55.5L180.1,56.2L176.2,53.7L174.0,47.0L175.8,40.0L172.2,36.4L170.6,35.4L167.8,32.2L165.5,32.4L164.0,30.4L160.6,31.0L154.5,27.7L154.4,24.0L152.8,24.1L151.9,22.0L145.3,22.6L143.5,19.3L141.9,19.7L136.5,13.9L136.3,15.9L134.0,16.3L134.6,18.2L131.2,18.7L131.5,20.9L134.1,22.1L131.3,21.6L127.7,26.8L126.7,26.2L127.4,31.8L125.1,33.1L125.3,29.7L123.8,31.3L124.2,33.8L120.3,39.4L122.6,38.4L122.6,42.3L119.6,45.4L125.4,45.5L128.8,47.6L130.4,44.9L132.6,43.6L132.9,43.7L129.9,48.0L132.7,49.1L134.1,46.7L133.7,51.1L135.4,52.4L138.1,49.7L137.7,43.6L138.1,42.1L134.6,37.5L136.8,31.6L138.6,32.5L140.6,29.9L145.5,33.3L147.5,33.1L148.7,35.9L147.0,39.3L149.1,42.5L140.4,47.8L139.1,50.3L141.8,51.8L140.6,51.9L141.6,53.8L139.0,55.0L137.4,58.0L140.6,56.4L142.9,57.1L143.1,58.7L144.9,58.6L145.0,58.3L145.2,58.5L146.0,58.5L146.6,62.3L150.8,64.5L150.4,65.9L147.7,65.5L146.8,68.4L144.0,69.0L141.9,67.0L144.0,74.6L145.4,70.0L146.8,71.5L153.5,71.1L151.2,69.0L153.4,68.0L150.9,59.9L153.3,58.5L154.2,59.7L154.8,58.2L157.5,60.9L155.6,61.4L155.9,63.4L157.3,62.6L155.6,64.3L156.7,68.3L158.7,68.5L158.0,65.7L159.0,65.0L160.0,66.9L162.2,63.6L164.0,64.9L165.7,63.1L171.2,65.3L171.3,65.7L171.6,66.9L171.5,69.5L171.7,72.2L170.0,74.2L173.6,81.2L172.5,81.4L173.2,83.1ZM144.9,58.9L145.8,59.2L145.2,58.5L144.9,58.6L144.9,58.9ZM171.2,65.5L165.7,64.0L163.5,67.1L166.9,68.3L163.7,67.8L164.2,71.5L162.8,71.4L162.2,68.9L160.5,69.6L162.4,74.5L157.3,74.9L159.6,80.3L161.5,80.5L159.6,82.2L160.0,84.2L163.6,84.1L162.8,86.0L165.6,87.5L165.0,85.4L168.4,84.7L163.5,79.9L163.6,77.9L165.7,74.8L165.5,80.6L171.1,79.3L169.6,73.9L171.4,71.6L171.5,69.5L171.3,65.7L171.2,65.5ZM128.3,48.7L126.1,47.8L126.1,49.1L128.4,49.2L128.3,48.7ZM130.4,49.2L129.7,48.1L129.0,48.2L129.0,49.2L130.4,49.2ZM129.9,51.1L129.8,49.9L129.0,50.5L128.9,51.1L129.9,51.1ZM132.7,52.0L132.1,50.3L131.6,52.4L132.5,52.5L132.7,52.0ZM132.8,52.8L132.5,52.6L131.9,52.8L132.3,53.8L132.8,52.8ZM140.5,59.8L141.0,59.9L140.7,59.3L140.5,59.8ZM138.1,59.6L137.9,59.1L137.6,59.2L137.9,60.4L138.1,59.6ZM144.9,60.8L144.4,60.5L144.5,61.9L145.4,62.4L144.9,60.8ZM147.0,64.6L145.8,64.1L145.8,65.7L146.7,65.8L147.0,64.6ZM163.0,66.8L162.4,66.2L162.1,66.9L162.5,67.1L163.0,66.8ZM169.3,81.7L168.4,80.8L167.9,82.3L169.4,83.5L169.3,81.7Z' },
  '42203': { name: '島原市', nameEn: 'Shimabara City', viewW: 27.5, viewH: 37.7,
    d: 'M24.0,35.1L20.7,32.9L20.4,34.1L18.4,32.5L5.3,31.9L10.3,30.7L10.5,28.6L3.6,28.3L2.6,26.0L7.1,19.1L9.6,5.6L12.5,2.6L17.2,5.5L24.9,22.2L24.0,35.1Z' },
  '42204': { name: '諫早市', nameEn: 'Isahaya City', viewW: 78.8, viewH: 66.5,
    d: 'M38.7,59.6L38.3,59.6L38.0,58.6L38.5,58.6L38.7,59.6ZM14.4,30.9L14.7,31.2L14.8,31.8L13.9,31.4L14.4,30.9ZM27.3,59.7L28.3,47.8L24.7,44.8L21.4,46.8L19.3,44.5L15.9,45.4L13.7,44.2L6.4,35.1L5.4,32.2L6.5,31.5L7.3,32.2L7.9,29.3L11.2,32.7L15.1,32.9L14.9,34.6L18.7,33.8L21.0,35.5L20.9,37.7L24.6,37.0L25.1,39.7L26.5,39.2L26.7,40.4L27.0,39.0L30.7,38.4L33.1,35.8L31.8,29.0L34.4,13.8L38.8,10.1L46.1,9.8L48.5,5.4L57.9,7.1L59.7,7.0L60.7,6.2L61.9,8.5L73.4,9.6L73.1,17.0L70.2,17.7L69.9,20.7L65.3,20.8L62.7,24.5L67.2,31.8L61.6,38.0L63.8,39.2L61.4,46.5L59.0,47.4L60.8,50.4L56.5,52.5L47.8,50.8L35.4,59.8L29.7,59.0L28.0,61.1L27.3,59.7Z' },
  '42205': { name: '大村市', nameEn: 'Omura City', viewW: 46.0, viewH: 46.7,
    d: 'M11.8,28.3L12.1,28.5L11.6,29.4L11.3,28.7L11.8,28.3ZM3.2,22.1L8.3,26.1L7.9,28.1L4.6,26.1L3.2,22.1ZM13.3,6.5L15.2,6.2L17.0,8.5L23.9,5.2L26.3,4.8L27.7,6.4L33.3,3.2L36.6,7.3L40.5,7.3L42.8,10.5L40.3,14.9L33.0,15.2L28.7,18.9L26.0,34.0L27.4,40.9L25.0,43.5L16.7,36.1L18.1,31.8L13.5,30.5L14.3,28.1L9.3,22.7L8.9,12.1L11.9,10.5L13.3,6.5Z' },
  '42207': { name: '平戸市', nameEn: 'Hirado City', viewW: 81.5, viewH: 128.7,
    d: 'M11.1,116.4L11.7,116.6L11.6,117.7L10.5,115.9L11.1,116.4ZM9.8,114.6L10.4,115.1L9.5,116.3L8.9,116.0L9.8,114.6ZM10.9,113.2L10.5,114.0L10.1,113.5L10.9,113.2ZM12.7,109.0L12.8,109.2L11.8,109.8L11.8,109.4L12.7,109.0ZM10.2,102.2L10.7,102.5L10.4,102.8L10.2,102.2ZM10.3,98.9L10.2,99.6L9.1,99.8L10.3,98.9ZM46.9,91.0L47.4,91.5L47.1,91.8L46.9,91.0ZM48.0,88.9L48.0,89.3L47.2,89.3L48.0,88.9ZM61.3,85.4L61.9,85.7L61.4,85.9L61.3,85.4ZM72.3,76.3L72.2,78.2L69.9,78.6L70.5,80.6L67.0,81.1L67.4,83.2L62.9,85.8L62.0,84.1L60.3,84.8L57.5,80.7L57.8,78.6L60.5,78.9L59.5,75.4L60.8,71.2L59.2,68.0L65.1,66.5L63.9,69.7L68.9,68.5L71.2,71.5L72.7,71.3L72.3,76.3ZM55.9,59.4L57.5,63.9L55.8,64.3L57.7,66.4L55.6,69.6L56.7,69.2L58.9,72.3L54.1,74.7L53.8,79.0L48.7,80.4L47.2,79.3L51.0,84.4L49.3,86.4L45.6,86.3L46.4,90.1L41.1,90.9L45.2,94.2L44.5,97.2L41.6,99.3L36.4,108.7L34.0,108.8L34.1,110.5L30.1,114.4L16.5,119.9L12.0,116.7L14.1,114.1L12.7,111.1L14.9,111.4L15.8,115.4L16.7,114.4L17.1,116.0L20.8,115.5L22.5,117.2L24.4,113.3L21.4,112.9L18.7,110.1L19.0,105.3L22.7,102.1L24.6,102.1L28.0,105.5L27.1,102.7L29.2,103.5L30.5,102.6L28.6,102.8L27.7,99.9L25.1,99.8L24.0,98.4L25.4,96.9L23.7,95.7L24.3,92.5L28.7,91.5L27.5,91.1L28.2,89.3L32.9,89.1L29.8,83.4L32.0,80.7L30.8,75.1L43.8,73.1L46.6,66.5L48.9,67.9L47.2,72.4L49.1,73.5L51.0,69.6L49.5,66.8L52.9,68.2L55.3,66.7L53.8,64.4L49.0,65.2L48.1,64.0L50.1,63.4L48.5,61.6L49.4,60.1L51.2,61.5L55.9,59.4ZM51.3,55.3L51.6,55.6L51.7,56.5L51.4,56.5L51.3,55.3ZM30.2,51.6L30.8,53.8L28.8,56.3L30.7,62.8L29.3,67.2L30.3,73.2L26.1,74.2L22.3,71.8L27.5,59.7L27.2,53.8L30.2,51.6ZM50.8,48.2L53.5,51.4L45.8,55.8L45.7,53.0L49.4,51.1L50.8,48.2ZM56.3,34.0L55.7,39.4L58.1,39.1L58.1,36.4L62.1,37.8L60.4,41.4L55.8,43.0L55.7,44.4L51.7,43.1L50.1,40.5L47.1,41.5L48.2,43.8L43.9,43.6L50.2,36.8L56.3,34.0ZM56.0,8.9L56.7,10.1L55.5,10.6L55.1,10.3L56.0,8.9Z' },
  '42208': { name: '松浦市', nameEn: 'Matsuura City', viewW: 57.0, viewH: 58.8,
    d: 'M35.4,54.4L33.1,54.7L31.6,52.7L28.2,53.2L22.1,49.9L22.0,46.3L20.4,46.4L19.5,44.3L12.9,44.8L11.1,41.5L9.5,42.0L4.1,36.2L4.4,31.3L4.2,29.0L7.2,30.6L7.8,28.5L9.3,29.0L12.9,22.0L15.7,24.9L13.8,25.2L12.0,30.4L14.0,33.6L15.9,33.2L15.9,31.5L18.1,31.5L17.3,34.1L20.0,35.2L28.5,30.1L34.0,33.2L35.1,28.8L37.7,28.9L38.6,36.0L35.1,38.7L31.4,49.2L32.4,49.5L35.4,54.4ZM35.3,21.4L36.9,22.7L36.0,23.5L34.8,22.4L35.3,21.4ZM39.5,18.1L47.3,20.7L46.3,23.9L48.1,26.8L48.7,25.0L52.9,27.2L51.0,29.3L48.0,29.0L49.2,30.1L47.7,31.2L44.4,31.1L42.7,34.8L40.9,31.3L43.3,30.2L41.8,23.4L42.9,21.1L39.6,19.0L39.5,18.1ZM16.0,16.0L16.6,18.5L15.5,20.3L14.4,19.1L16.0,16.0ZM20.9,15.7L21.5,16.5L21.1,16.8L20.8,16.5L20.9,15.7ZM22.8,5.7L24.8,7.6L24.3,8.7L21.7,6.7L22.8,5.7ZM30.5,4.1L34.0,6.6L33.5,10.9L38.7,14.2L37.9,15.5L32.3,13.3L30.8,17.7L29.0,16.3L28.4,19.9L25.4,20.2L22.8,17.1L28.4,14.2L27.1,12.3L30.0,9.3L30.5,4.1Z' },
  '42209': { name: '対馬市', nameEn: 'Tsushima City', viewW: 95.8, viewH: 182.1,
    d: 'M34.0,82.2L33.5,82.9L33.9,83.1L34.0,82.2ZM34.5,85.6L34.4,84.6L33.8,84.0L33.5,84.2L34.5,85.6ZM48.0,101.2L48.3,101.2L48.4,99.7L48.1,100.0L48.0,101.2ZM50.1,103.0L51.3,102.4L51.3,102.4L50.0,102.7L49.8,103.7L50.1,103.0ZM52.3,103.6L51.1,104.5L52.5,103.8L53.0,105.8L50.3,105.9L51.8,106.5L50.8,108.2L52.6,110.4L50.3,109.2L48.2,110.4L48.4,112.9L49.4,111.1L48.8,113.5L51.0,115.1L51.8,113.3L53.2,113.1L51.6,114.9L52.3,116.3L56.3,112.2L55.2,110.3L58.1,111.9L55.2,105.5L59.3,106.4L59.3,107.5L60.9,106.0L60.9,105.8L60.1,105.1L60.3,104.3L60.0,103.5L59.1,104.5L55.0,103.8L59.0,103.0L61.1,100.1L59.4,98.7L60.1,97.5L57.2,97.5L58.8,96.8L57.2,92.9L60.6,94.1L61.7,87.0L60.2,89.8L59.0,89.1L59.7,90.7L57.4,90.4L52.1,93.5L57.9,86.6L57.1,83.4L55.1,85.3L55.1,81.9L59.2,83.4L56.2,76.2L59.5,75.6L61.8,70.5L73.3,58.8L72.0,57.4L75.4,55.5L75.1,51.7L77.8,51.5L77.7,42.9L79.4,41.1L77.5,37.8L73.4,38.0L72.9,36.0L70.6,36.6L69.6,35.2L70.5,33.6L70.6,35.2L74.7,36.6L72.4,33.9L72.5,31.8L75.6,36.3L79.4,35.3L77.7,32.7L80.0,32.6L81.8,28.9L79.7,29.3L77.2,25.8L80.0,26.2L83.3,22.9L80.7,22.9L82.4,18.8L78.4,21.2L77.7,17.9L79.5,16.7L72.7,15.2L73.1,13.0L69.2,16.8L66.4,15.7L65.6,19.0L68.6,19.1L69.3,21.0L64.2,20.0L61.5,26.4L59.0,27.3L60.2,29.9L57.0,27.9L55.0,30.0L52.3,27.1L48.7,30.1L48.3,27.2L45.3,27.9L42.4,42.5L38.0,49.1L40.0,50.8L42.0,47.8L44.5,50.4L44.0,52.4L47.0,52.0L47.4,56.5L49.2,55.3L50.4,56.5L47.3,57.9L45.1,55.8L44.0,60.5L42.9,58.4L39.6,68.3L35.5,72.6L36.4,76.7L38.5,77.7L43.0,74.0L43.6,77.4L41.0,76.6L41.4,77.8L39.5,78.7L40.0,81.8L38.0,79.1L35.5,79.8L36.7,82.0L34.8,83.5L37.8,85.8L35.0,86.6L34.2,93.6L36.2,94.2L35.7,96.3L30.7,98.7L30.8,101.2L27.9,98.4L25.5,99.4L28.3,102.3L35.0,100.9L36.8,103.9L38.2,102.8L38.5,105.3L38.4,101.2L40.2,101.4L36.7,98.5L38.7,98.6L39.4,96.9L37.8,95.6L37.9,93.1L39.9,96.2L43.0,93.5L43.9,94.1L40.7,98.1L43.4,101.0L41.0,102.7L41.5,104.8L43.3,103.8L42.7,105.9L45.5,101.5L46.6,102.4L45.7,99.9L47.2,100.1L45.4,97.7L47.1,98.3L49.3,94.9L48.3,99.2L51.3,95.8L51.6,99.1L49.9,100.5L51.3,102.4L51.4,102.4L51.3,102.4L52.3,103.6ZM61.7,106.6L64.1,105.6L61.7,100.1L60.3,104.3L60.9,105.8L61.7,106.6ZM46.7,106.0L44.8,108.6L40.5,105.8L39.0,109.2L41.1,107.5L41.3,109.6L44.1,108.8L44.8,112.0L48.4,113.4L46.7,106.0ZM40.8,111.5L41.2,111.6L41.4,110.9L40.7,111.1L40.8,111.5ZM47.4,114.1L47.0,113.5L45.6,114.6L45.6,115.0L47.4,114.1ZM26.8,115.1L26.6,114.8L26.1,115.5L26.8,115.8L26.8,115.1ZM44.2,116.0L43.8,115.3L43.6,115.2L43.6,116.1L44.2,116.0ZM44.7,116.0L44.3,119.1L42.9,117.9L41.8,120.6L41.2,116.0L43.2,113.2L41.4,112.7L40.5,114.1L39.8,111.0L38.0,110.0L36.9,111.1L37.0,109.4L33.7,109.8L35.6,110.7L35.6,112.7L38.2,113.4L38.9,120.3L37.3,118.9L36.6,113.6L33.9,113.9L33.1,117.4L31.8,117.1L32.4,115.1L30.7,115.4L32.8,113.5L31.8,112.3L29.0,115.8L27.5,115.3L26.4,117.1L25.6,115.8L24.4,117.2L25.6,109.1L20.8,107.2L18.9,111.8L19.5,122.7L16.5,128.8L17.8,131.4L15.3,135.4L15.8,143.6L12.7,154.9L13.7,161.0L12.6,164.5L16.1,160.8L20.4,164.5L22.7,162.2L22.7,169.5L24.3,166.1L26.0,166.8L26.2,162.3L28.4,164.9L29.7,162.4L31.3,163.0L33.0,161.3L31.2,159.1L32.2,158.2L37.2,157.8L35.4,154.2L37.7,154.2L37.4,149.2L40.2,149.9L40.4,147.2L38.6,146.3L40.5,143.7L37.9,143.0L38.7,140.3L40.8,141.9L41.9,137.9L40.5,135.2L43.1,136.1L46.6,133.8L44.3,129.6L46.1,126.2L44.8,124.9L46.5,124.7L47.6,121.2L48.8,122.2L52.4,120.9L52.3,120.3L51.4,118.9L51.8,117.6L51.5,116.3L49.5,115.3L49.0,117.0L47.6,115.6L44.7,116.0ZM53.8,122.6L61.0,116.0L59.1,114.3L56.8,114.5L57.5,117.2L55.9,114.5L52.0,117.0L51.8,117.6L52.3,120.3L53.8,122.6ZM29.1,166.0L28.3,165.3L27.9,165.6L28.7,166.5L29.1,166.0ZM69.5,13.7L70.3,12.9L69.9,12.6L69.5,13.1L69.5,13.7ZM79.5,19.6L80.1,18.9L79.5,18.8L79.1,18.9L79.5,19.6ZM81.0,32.3L81.4,32.0L81.1,31.7L80.7,32.0L81.0,32.3ZM64.9,101.7L65.1,99.3L62.9,100.3L63.7,102.4L64.9,101.7ZM59.9,110.0L61.4,112.2L65.3,110.9L61.1,111.0L61.5,109.3L59.9,110.0Z' },
  '42210': { name: '壱岐市', nameEn: 'Iki City', viewW: 43.9, viewH: 48.7,
    d: 'M4.1,38.7L5.9,39.3L4.6,40.6L3.4,39.3L4.1,38.7ZM8.2,38.7L9.4,40.0L8.0,41.8L7.4,40.1L8.2,38.7ZM31.9,37.1L32.4,38.3L31.7,38.9L31.1,37.8L31.9,37.1ZM5.8,35.0L7.2,36.7L4.4,38.1L3.9,35.8L5.8,35.0ZM36.5,26.0L35.9,26.7L35.6,26.3L35.8,25.8L36.5,26.0ZM20.2,5.2L24.5,8.5L33.9,9.5L34.9,10.6L33.2,12.6L33.0,18.5L29.7,19.5L40.6,24.7L39.9,26.4L34.9,24.7L31.9,26.5L33.4,29.4L35.4,27.9L40.0,30.3L39.8,32.9L38.1,32.5L37.8,35.7L36.1,36.2L26.7,36.5L22.7,45.3L17.0,42.2L18.4,39.6L17.0,41.0L14.3,39.3L15.8,34.8L13.4,31.8L9.6,36.3L8.0,33.0L9.5,30.7L7.1,29.0L8.5,27.8L16.2,31.4L13.8,27.9L14.7,27.0L10.8,27.3L9.8,26.0L10.9,23.6L8.7,21.2L12.3,21.2L8.5,19.5L11.1,17.9L14.1,22.0L14.4,20.0L16.8,19.4L13.7,16.7L13.2,11.6L16.3,7.5L19.8,7.2L18.4,6.8L20.2,5.2ZM19.6,3.9L20.1,4.8L18.3,4.4L19.0,4.0L19.6,3.9ZM16.3,3.4L17.4,3.6L17.1,5.8L15.7,4.9L16.3,3.4ZM15.2,3.4L15.1,5.0L14.0,4.7L13.7,3.9L15.2,3.4Z' },
  '42211': { name: '五島市', nameEn: 'Goto City', viewW: 178.4, viewH: 264.9,
    d: 'M138.6,22.8L138.8,22.9L138.7,23.5L138.2,23.1L138.6,22.8ZM146.1,21.4L149.6,25.3L150.9,29.7L148.7,31.0L148.8,34.1L150.2,34.9L147.4,34.2L146.0,35.8L148.3,38.4L145.8,42.7L145.6,36.5L144.1,38.2L140.2,37.5L143.2,37.1L143.5,35.7L141.4,32.1L139.8,32.4L135.4,26.6L135.0,29.6L131.6,26.9L135.0,25.9L134.8,23.2L135.9,22.9L137.1,24.8L140.6,25.0L144.1,32.9L144.8,29.9L142.0,25.0L143.3,24.8L146.3,30.3L147.7,24.4L146.1,21.4ZM29.0,230.2L31.7,231.6L33.1,230.6L31.4,234.5L30.0,233.2L26.4,234.2L26.2,233.6L28.4,233.0L29.0,230.2ZM138.3,100.2L138.4,102.4L135.5,102.1L135.8,100.7L138.3,100.2ZM20.9,241.8L21.3,243.0L19.3,246.7L18.3,242.4L20.9,241.8ZM22.7,240.1L22.8,240.3L21.9,241.6L21.6,241.1L22.7,240.1ZM24.4,236.3L25.0,236.8L23.6,237.9L23.5,237.3L24.4,236.3ZM25.8,234.9L26.0,235.2L26.2,236.1L25.5,236.0L25.8,234.9ZM98.2,97.2L98.9,98.2L96.2,98.0L97.1,97.3L98.2,97.2ZM138.0,95.4L138.0,96.5L136.5,96.4L136.7,95.8L138.0,95.4ZM138.6,94.2L138.7,94.9L138.1,94.9L138.1,94.4L138.6,94.2ZM142.6,93.3L143.0,95.0L140.3,94.1L141.6,93.9L142.6,93.3ZM122.5,91.5L124.1,91.7L124.5,94.0L121.5,93.3L122.5,91.5ZM111.0,87.5L111.4,87.9L110.9,88.1L111.0,87.5ZM83.7,76.6L83.9,76.9L83.1,77.3L83.2,76.6L83.7,76.6ZM80.4,72.9L81.5,77.0L78.9,76.8L80.6,81.2L77.8,83.5L76.4,78.4L80.4,72.9ZM136.8,64.8L138.4,66.5L136.6,69.3L135.8,65.7L136.8,64.8ZM127.2,61.9L127.6,62.2L127.4,63.0L126.6,62.6L127.2,61.9ZM129.2,59.9L130.3,62.0L129.2,62.5L128.1,61.0L129.2,59.9ZM74.3,57.6L75.1,58.9L73.1,60.5L72.7,65.1L71.0,64.5L71.0,61.0L74.3,57.6ZM110.2,58.5L109.7,57.6L110.2,56.7L110.5,57.3L110.2,58.5ZM132.8,55.0L132.5,57.7L130.8,57.9L130.7,56.3L132.8,55.0ZM148.3,53.4L148.8,53.8L148.2,54.1L147.8,53.8L148.3,53.4ZM149.5,48.4L151.5,50.6L151.1,52.3L149.0,51.7L149.5,48.4ZM157.0,44.9L160.1,49.7L159.8,54.5L157.1,55.1L156.0,54.0L155.6,57.3L151.4,56.4L150.6,55.0L152.0,53.8L156.1,53.2L156.8,50.2L155.4,48.1L157.0,44.9ZM117.7,43.1L116.8,49.1L121.4,52.6L116.7,54.7L118.5,55.8L123.3,52.6L121.1,57.2L122.8,54.7L123.4,56.5L126.0,54.4L127.7,56.2L124.9,57.3L124.2,64.4L127.2,70.4L133.5,75.4L134.3,78.9L136.5,79.3L135.6,82.7L131.1,83.1L130.4,81.7L120.3,83.9L117.1,79.0L109.4,81.7L107.5,87.6L112.8,90.7L114.3,93.8L110.0,99.4L105.7,98.1L105.4,95.3L102.3,91.2L91.9,92.3L87.0,90.8L84.4,95.3L81.1,94.7L78.2,90.7L72.6,89.8L75.7,81.2L77.8,84.4L75.8,85.5L75.7,87.6L77.1,85.2L78.6,86.1L78.2,88.0L83.1,90.2L82.8,92.1L84.9,89.7L83.8,87.9L87.5,85.4L84.4,85.5L82.1,88.1L80.7,85.8L81.9,82.7L84.4,82.5L82.5,79.3L87.6,81.3L84.3,78.3L88.2,80.1L86.5,77.0L89.3,74.8L86.1,74.9L83.5,72.6L83.3,67.7L86.7,67.6L83.0,62.8L84.5,57.2L81.6,52.4L84.9,47.8L86.8,46.5L93.8,51.1L94.0,55.7L92.7,57.6L93.9,58.4L95.8,58.1L96.4,55.3L102.4,53.3L100.1,55.7L103.1,55.0L102.7,58.1L105.5,50.6L107.0,50.5L109.7,59.2L111.1,58.7L110.1,55.1L114.2,52.4L115.5,53.9L114.2,51.4L110.6,53.7L108.3,52.6L110.5,48.2L114.2,48.4L115.2,46.6L113.7,45.4L117.7,43.1ZM144.5,40.7L145.0,42.5L144.3,43.1L143.4,41.0L144.5,40.7ZM90.2,40.0L90.7,41.6L89.6,42.0L88.4,40.8L90.2,40.0ZM129.5,31.4L133.6,34.1L134.1,36.4L137.3,37.2L138.0,42.1L139.4,43.0L132.8,51.8L129.5,51.7L126.4,48.0L123.3,47.1L123.9,33.0L126.8,35.2L128.8,33.8L129.3,39.5L131.0,41.1L129.2,42.2L132.4,42.9L131.4,40.5L132.5,38.2L130.4,37.4L129.5,31.4ZM140.8,18.3L140.7,20.9L139.2,21.0L139.8,18.9L140.8,18.3Z' },
  '42212': { name: '西海市', nameEn: 'Saikai City', viewW: 149.2, viewH: 71.8,
    d: 'M84.6,19.3L84.6,18.9L83.9,18.8L83.8,19.2L84.6,19.3ZM99.7,20.0L100.5,19.6L100.1,19.3L99.7,19.4L99.7,20.0ZM91.4,28.1L92.4,29.3L93.7,26.7L96.3,26.9L97.3,24.5L96.3,23.9L98.3,22.5L97.5,20.6L99.2,20.1L92.8,18.8L92.5,21.5L89.2,23.5L88.2,26.3L88.3,28.3L90.6,29.3L91.4,28.1ZM99.2,26.4L99.0,24.0L97.0,26.7L97.3,28.3L99.2,26.4ZM56.5,30.8L55.4,29.8L54.9,30.6L56.1,31.3L56.5,30.8ZM81.6,35.1L88.9,29.8L82.8,27.6L82.8,30.3L84.6,31.0L82.5,32.7L83.5,33.3L81.8,33.0L81.6,35.1ZM36.5,35.8L40.1,34.4L38.2,30.0L36.0,31.3L36.5,35.8ZM78.6,33.2L78.0,32.7L77.4,32.7L77.2,33.1L78.6,33.2ZM15.5,29.4L10.3,34.7L14.0,36.2L12.8,38.1L17.4,34.9L18.5,30.3L16.0,31.9L15.5,29.4ZM81.0,33.5L79.2,33.1L78.8,34.5L80.9,35.1L81.0,33.5ZM93.7,49.6L92.1,50.6L90.7,48.4L90.1,53.4L92.1,55.8L94.5,56.1L96.4,53.8L96.1,51.0L93.7,49.6ZM124.3,27.2L123.8,27.9L124.1,28.0L124.3,27.2ZM122.4,35.2L122.8,35.1L122.4,34.2L122.0,34.6L122.4,35.2ZM96.5,46.9L99.1,48.7L98.1,53.2L99.5,53.9L99.0,55.5L100.2,52.3L102.1,52.6L105.6,61.5L108.7,59.4L113.6,58.8L114.3,57.2L120.4,57.1L121.1,48.6L132.0,43.2L135.2,44.8L138.9,41.6L134.0,33.3L129.8,33.3L126.1,29.7L123.5,34.4L126.0,35.4L124.9,36.5L123.5,35.1L120.8,38.2L119.3,35.4L121.0,34.3L119.1,33.2L119.5,30.9L125.6,22.9L123.0,20.1L121.0,20.7L120.2,23.5L118.1,23.4L120.0,19.0L118.7,16.3L116.7,17.0L114.6,13.1L113.8,14.7L107.5,10.3L106.6,11.8L107.9,13.4L104.1,15.9L107.1,15.6L104.1,17.4L107.2,19.0L104.3,19.9L103.7,25.2L101.0,25.7L101.4,30.9L104.2,34.9L102.1,35.7L102.1,38.6L101.9,38.5L100.9,38.1L101.0,37.8L100.1,37.2L98.1,38.4L96.5,46.9ZM102.0,38.5L101.4,35.1L101.7,32.8L101.0,37.8L101.9,38.5L102.0,38.5ZM121.5,36.7L122.2,36.3L122.2,36.1L122.1,36.1L122.1,36.0L121.8,35.2L120.9,36.4L121.5,36.7ZM122.7,35.7L122.5,35.4L122.0,35.6L122.1,36.0L122.2,36.1L122.7,35.7ZM137.8,37.3L138.1,36.4L137.5,36.2L137.3,36.7L137.8,37.3ZM137.2,45.3L136.4,44.4L136.0,44.6L136.6,45.6L137.2,45.3Z' },
  '42213': { name: '雲仙市', nameEn: 'Unzen City', viewW: 50.2, viewH: 65.9,
    d: 'M38.4,37.5L38.8,40.4L35.4,42.5L35.4,44.1L31.1,44.0L29.2,49.0L14.4,59.7L4.9,61.3L5.8,55.6L4.5,53.4L8.0,55.4L11.2,53.8L11.6,51.7L14.0,52.1L14.2,49.5L19.9,45.7L22.3,40.4L21.4,36.2L16.7,34.2L18.7,29.9L17.3,27.8L15.6,26.4L8.2,26.0L6.4,23.0L8.8,22.1L11.2,14.8L9.0,13.6L14.6,7.4L19.1,12.9L29.5,6.0L33.2,7.0L40.9,4.5L45.7,8.2L42.7,11.2L40.2,24.7L35.7,31.6L36.7,33.9L43.6,34.2L43.4,36.3L38.4,37.5Z' },
  '42214': { name: '南島原市', nameEn: 'Minamishimabara City', viewW: 60.5, viewH: 48.1,
    d: 'M56.4,7.4L50.5,14.8L53.1,19.2L50.0,24.8L48.0,24.4L40.9,29.1L32.0,28.7L33.4,30.1L31.2,34.8L27.5,35.3L26.4,38.9L23.2,40.6L20.2,40.9L16.7,39.0L18.9,41.6L15.3,43.8L12.3,43.9L14.1,40.2L12.7,36.7L11.2,35.2L9.5,36.0L7.8,33.0L4.3,31.7L4.2,28.0L13.7,26.4L28.5,15.7L30.4,10.7L34.7,10.8L34.7,9.2L38.0,7.1L37.7,4.2L50.8,4.8L52.7,6.4L53.0,5.1L56.4,7.4Z' },
  '42307': { name: '長与町', nameEn: 'Nagayo Town', viewW: 20.0, viewH: 24.8,
    d: 'M3.8,10.1L4.3,10.3L3.0,7.1L3.8,10.1ZM1.7,19.4L4.8,22.8L6.7,20.5L6.6,23.1L7.8,20.7L15.7,19.6L18.3,17.1L11.1,8.1L10.1,5.1L11.1,4.5L9.1,1.7L9.2,6.1L6.8,7.1L6.5,11.2L4.3,10.3L6.3,15.3L1.7,19.4Z' },
  '42308': { name: '時津町', nameEn: 'Togitsu Town', viewW: 19.0, viewH: 18.1,
    d: 'M8.7,2.4L8.2,3.3L7.9,2.8L8.7,2.4ZM13.1,16.7L7.1,16.0L7.6,13.3L1.3,3.9L2.6,1.9L3.2,3.8L6.9,4.0L13.5,11.6L14.4,4.5L17.7,12.7L13.1,16.7ZM4.3,1.3L6.0,2.5L5.4,3.1L4.2,2.5L4.3,1.3Z' },
  '42321': { name: '東彼杵町', nameEn: 'Higashisonogi Town', viewW: 41.1, viewH: 32.7,
    d: 'M38.3,24.6L32.6,27.8L31.3,26.2L28.9,26.6L22.0,29.9L20.2,27.5L18.3,27.9L17.6,21.8L12.9,17.2L8.7,15.7L6.3,11.3L2.8,9.4L4.5,6.5L9.9,7.3L11.9,6.0L12.6,2.8L14.9,3.4L16.9,7.6L24.5,11.2L25.6,11.3L28.4,14.4L29.4,19.1L32.4,21.2L35.0,20.5L35.2,22.5L38.3,24.6Z' },
  '42322': { name: '川棚町', nameEn: 'Kawatana Town', viewW: 30.2, viewH: 22.5,
    d: 'M2.1,12.6L9.7,9.9L11.2,3.8L15.2,2.6L17.8,4.4L24.8,2.1L28.2,3.1L27.5,6.9L26.9,10.1L24.9,11.4L19.4,10.5L17.8,13.5L13.0,13.9L11.0,17.5L9.8,15.5L8.0,20.0L6.2,20.5L7.0,16.2L5.7,16.1L9.4,14.7L6.3,12.6L4.9,13.1L5.6,14.3L2.1,12.6Z' },
  '42323': { name: '波佐見町', nameEn: 'Hasami Town', viewW: 27.4, viewH: 20.1,
    d: 'M1.9,17.6L2.9,7.4L7.6,1.9L10.5,2.9L11.0,4.2L14.8,3.7L16.0,2.7L21.7,1.9L25.5,11.1L24.5,15.8L21.5,15.2L18.9,16.9L15.5,15.9L8.5,18.2L5.9,16.4L1.9,17.6Z' },
  '42383': { name: '小値賀町', nameEn: 'Ojika Town', viewW: 61.4, viewH: 27.4,
    d: 'M5.6,22.5L6.0,22.9L4.4,23.1L5.6,22.5ZM5.6,17.8L5.7,19.4L4.2,19.6L5.2,18.0L5.6,17.8ZM33.8,17.7L34.6,17.7L35.1,18.1L33.9,18.4L33.8,17.7ZM31.7,17.5L32.2,19.2L30.4,20.1L30.4,18.5L31.7,17.5ZM39.0,15.2L39.3,16.4L38.2,17.2L37.8,16.6L39.0,15.2ZM31.1,15.1L31.5,16.5L29.6,16.3L30.3,15.2L31.1,15.1ZM33.2,13.8L33.2,14.3L32.6,14.8L32.4,14.2L33.2,13.8ZM23.7,12.9L25.1,14.2L22.2,14.9L22.1,14.0L23.7,12.9ZM10.8,12.6L11.5,12.8L11.3,13.7L10.7,13.6L10.8,12.6ZM31.6,8.0L31.6,11.2L29.2,11.1L30.0,8.2L31.6,8.0ZM52.8,7.9L57.2,13.2L54.6,15.0L54.9,21.7L53.1,20.7L53.1,14.0L51.1,10.0L52.8,7.9ZM38.7,6.3L38.2,8.3L41.2,9.4L47.4,7.4L47.0,9.6L43.6,9.2L44.0,12.1L46.7,13.2L45.5,14.8L40.2,12.6L39.8,15.1L37.1,15.6L36.5,12.4L32.9,12.2L34.7,8.5L35.8,10.0L36.3,6.6L38.7,6.3ZM55.2,4.3L56.6,5.5L55.2,6.3L54.3,5.6L55.2,4.3ZM40.8,4.2L42.5,5.6L41.4,6.7L39.7,4.8L40.8,4.2Z' },
  '42391': { name: '佐々町', nameEn: 'Sasa Town', viewW: 17.4, viewH: 20.8,
    d: 'M4.6,15.1L5.0,13.6L1.4,9.0L3.7,3.1L5.4,4.0L7.5,1.4L12.4,4.8L14.3,4.6L15.6,7.4L13.9,10.8L15.9,14.0L7.2,19.3L4.6,15.1Z' },
  '42411': { name: '新上五島町', nameEn: 'Shinkamigoto Town', viewW: 71.0, viewH: 101.5,
    d: 'M30.0,85.1L30.8,86.1L30.6,87.7L30.3,87.7L30.0,85.1ZM22.7,82.8L23.2,84.1L22.2,84.6L22.1,83.7L22.7,82.8ZM30.9,82.5L31.8,82.8L31.4,83.1L30.9,82.5ZM28.7,81.2L29.3,81.7L29.1,83.6L28.7,81.8L28.7,81.2ZM30.8,81.0L31.1,81.1L32.1,82.4L30.8,82.3L30.8,81.0ZM29.3,77.8L29.8,81.3L29.5,81.5L28.3,80.3L29.3,77.8ZM30.3,75.3L31.1,76.6L30.3,76.9L30.1,75.4L30.3,75.3ZM9.8,73.3L10.7,74.0L10.6,74.4L9.5,73.9L9.8,73.3ZM31.7,68.8L32.0,69.4L31.5,69.3L31.7,68.8ZM46.4,67.5L46.6,67.8L46.2,68.2L45.8,67.8L46.4,67.5ZM62.5,67.3L64.0,68.2L61.9,69.2L61.4,68.8L62.5,67.3ZM14.0,65.3L15.3,66.0L14.9,68.1L12.7,69.8L12.1,69.4L12.7,71.5L14.5,69.9L13.8,72.3L8.2,70.8L7.0,68.6L10.7,67.2L12.6,69.4L14.0,65.3ZM19.8,65.2L22.1,68.4L25.3,67.4L24.8,69.0L26.5,69.1L26.9,72.5L29.0,74.2L26.7,76.2L28.6,75.9L26.7,80.1L28.2,81.0L27.4,87.4L25.3,85.1L26.9,84.6L24.3,84.4L25.9,82.2L23.7,83.0L21.2,81.1L17.8,83.9L17.8,80.5L14.8,80.5L16.6,78.9L13.7,72.5L18.4,74.8L18.9,78.3L19.9,74.9L21.8,78.8L22.9,78.1L21.3,74.7L22.1,72.8L20.4,74.2L17.8,72.4L19.4,71.5L17.2,68.7L19.1,68.4L19.9,67.1L18.3,65.9L19.8,65.2ZM19.8,56.9L21.3,57.9L20.8,60.3L18.1,60.7L18.2,62.1L17.2,58.7L19.8,56.9ZM27.2,49.9L27.7,50.7L27.4,54.5L26.5,52.0L27.2,49.9ZM28.8,44.6L27.4,46.3L23.0,47.6L25.3,44.8L28.8,44.6ZM62.3,43.3L63.8,43.7L63.9,46.3L59.6,46.0L59.2,44.6L62.3,43.3ZM61.1,42.5L61.5,43.3L60.0,43.4L60.4,42.8L61.1,42.5ZM56.1,39.7L56.8,39.9L56.7,40.2L56.2,40.0L56.1,39.7ZM50.9,13.8L50.9,15.0L50.5,15.2L50.6,13.8L50.9,13.8ZM46.1,7.0L47.1,8.9L44.0,16.9L47.8,21.5L45.9,32.8L43.3,34.2L44.4,36.0L41.5,38.6L43.0,41.3L41.1,43.8L42.5,48.5L40.9,52.7L42.2,51.8L42.8,53.3L43.7,52.1L45.2,53.0L47.2,50.9L47.7,52.3L50.7,48.1L55.8,48.3L57.2,46.3L61.1,47.8L59.2,49.1L61.2,53.7L60.9,55.5L53.7,59.4L51.7,64.1L49.9,62.1L47.2,63.8L43.8,57.8L43.7,60.3L45.8,63.1L45.3,66.8L40.4,67.4L42.4,68.6L41.1,71.2L42.0,72.5L40.0,72.5L39.3,74.5L41.5,75.6L40.1,78.0L42.1,77.9L43.4,83.5L42.1,84.8L36.1,82.9L34.1,86.7L36.7,90.6L34.6,94.5L31.2,93.0L32.6,92.6L32.7,88.7L32.0,81.4L30.6,80.1L30.6,78.6L33.1,78.8L31.2,77.0L34.5,78.1L34.1,75.8L31.2,75.3L30.3,73.6L30.9,71.2L33.2,73.1L34.5,71.8L35.0,74.4L35.5,71.2L33.5,71.1L32.8,68.1L30.0,67.0L27.7,68.7L28.5,65.8L30.1,66.6L30.7,65.5L29.5,62.1L26.9,65.4L24.9,64.1L24.9,61.1L23.4,63.3L20.2,62.5L22.7,61.9L21.4,56.7L24.4,54.4L25.4,56.4L26.0,54.2L27.0,55.0L27.9,58.1L30.5,54.2L32.3,54.7L32.9,57.0L33.1,53.6L34.7,53.1L31.3,51.6L30.9,50.2L32.6,49.4L30.7,47.4L31.0,41.3L33.6,38.7L32.7,38.1L36.2,37.3L37.0,43.5L40.9,41.9L39.2,40.9L40.0,37.4L38.0,33.9L39.6,33.5L40.2,29.3L45.0,26.1L45.3,22.8L42.9,22.0L44.3,20.1L42.1,17.8L46.1,7.0Z' },
  // 奄美群島12市町村。県ページ用データ(cx/cy/d)の輪郭をそのまま流用し、
  // 左上を原点(0,0)にずらして切り出しただけの簡易版(他の長崎県の市町村と同じ作り方)。
  '46222': { name: '奄美市', nameEn: 'Amami City', viewW: 98.7, viewH: 88.4,
    d: 'M22.01,70.50L21.41,71.80L26.81,75.30L25.91,76.60L24.31,82.30L20.71,80.70L20.21,79.20L11.51,78.70L7.91,75.40L6.81,73.10L9.91,68.30L9.21,67.10L14.91,65.30L10.71,59.00L19.31,56.30L21.21,54.60L21.71,51.60L27.71,52.20L25.51,43.30L18.41,36.30L20.71,37.30L26.71,37.90L30.51,38.70L31.81,34.30L33.91,30.70L35.51,32.40L37.91,34.60L44.71,31.90L45.21,29.30L46.11,25.00L48.21,24.10L49.81,23.30L51.21,20.80L53.31,26.30L52.81,33.00L54.81,34.50L54.81,36.70L53.81,40.70L50.31,38.40L49.11,37.70L47.81,38.60L47.31,38.70L47.51,45.80L48.71,49.10L50.71,49.20L57.71,50.30L49.41,54.40L49.51,55.90L50.01,56.30L50.41,59.70L41.91,61.00L36.11,61.20L34.91,61.80L33.41,60.30L29.91,62.50L31.01,62.50L32.41,62.70L33.01,67.80L30.11,69.70L22.31,71.40ZM76.51,38.10L72.41,36.90L72.21,36.60L75.01,36.20L75.31,32.80L74.51,31.60L74.51,30.20L74.81,29.80L74.71,31.00L75.71,31.40L76.01,32.90L77.61,30.50L75.21,26.00L76.11,24.10L75.11,21.20L76.41,21.30L79.31,29.00L80.71,28.20L79.41,25.50L81.11,23.30L80.41,23.30L80.51,21.70L79.31,19.70L77.11,17.80L74.81,12.30L77.71,13.30L77.91,11.80L79.01,11.40L81.41,6.90L84.51,6.10L85.41,11.00L84.61,13.00L85.61,16.40L88.01,20.60L91.11,21.10L90.31,23.30L91.91,25.10L89.61,29.80L91.11,30.10L89.11,34.30L88.11,33.90L88.71,32.30L85.61,36.10L80.01,36.60L78.91,39.40L76.81,39.20L76.51,38.10Z' },
  '46523': { name: '大和村', nameEn: 'Yamato Village', viewW: 46.2, viewH: 29.0,
    d: 'M34.58,21.80L25.98,24.50L25.98,26.90L24.58,27.00L21.88,23.70L16.28,22.90L13.38,19.00L9.78,20.20L4.28,19.00L3.48,17.90L4.58,16.10L3.18,14.50L4.38,14.60L4.58,13.60L8.48,14.10L9.38,12.90L10.88,14.40L13.58,13.90L13.88,12.90L14.78,13.30L15.48,12.70L14.68,11.20L15.68,10.20L14.58,9.30L18.38,9.30L21.18,4.90L22.58,4.80L24.18,7.20L27.28,9.10L28.78,8.20L29.48,6.20L32.38,4.70L33.98,6.30L34.88,9.60L36.08,8.60L35.98,7.60L37.08,8.10L37.38,7.60L35.98,6.50L35.78,4.00L33.58,2.00L34.08,2.00L39.88,6.00L40.78,8.80L40.28,10.90L42.98,17.70L36.98,17.10L35.78,17.90L36.48,20.10L35.98,22.70L34.58,21.80Z' },
  '46524': { name: '宇検村', nameEn: 'Uken Village', viewW: 52.1, viewH: 28.4,
    d: 'M19.99,14.46L17.79,12.76L17.89,11.36L16.09,12.06L14.19,9.66L14.89,8.76L12.99,8.76L11.89,7.36L12.49,6.56L11.49,6.96L10.79,5.16L11.99,6.16L14.79,4.66L16.09,5.46L17.49,3.86L21.09,3.46L21.49,1.96L22.89,3.56L21.79,5.36L22.59,6.46L28.09,7.66L32.39,6.76L34.59,10.36L40.19,11.16L42.09,13.76L44.89,14.46L48.49,18.26L43.89,20.56L42.79,20.06L43.49,21.26L40.89,25.26L38.89,25.06L36.79,26.46L35.19,25.06L32.99,26.16L31.69,24.06L29.49,24.26L26.89,21.36L15.49,24.06L14.39,22.26L14.69,19.36L17.19,18.96L17.89,16.66L19.09,17.26L18.29,18.16L20.69,16.76L22.19,17.96L22.69,16.46L23.89,16.66L24.99,18.26L25.89,14.46L28.19,14.36L29.79,15.76L30.89,15.96L29.49,15.36L29.29,12.76L24.69,12.76L23.39,11.26L22.39,12.26L22.79,14.76ZM3.59,6.66L4.69,4.46L7.99,6.56L9.19,6.16L11.99,8.56L13.19,11.26L11.19,10.46L9.89,11.36L8.19,10.06L6.89,10.56L3.59,6.66ZM8.19,16.46L9.09,18.26L10.29,18.66L8.99,19.36L8.69,18.16L8.49,21.26L5.89,21.26L4.49,18.96L8.19,16.46Z' },
  '46525': { name: '瀬戸内町', nameEn: 'Setouchi Town', viewW: 54.9, viewH: 53.7,
    d: 'M24.78,30.90L21.38,35.40L19.78,34.00L20.88,32.80L21.28,27.30L20.18,24.30L20.88,19.60L17.08,18.50L16.08,16.00L13.68,13.20L11.58,8.90L12.38,5.60L14.08,6.70L18.48,3.70L20.48,6.50L25.38,6.20L25.68,7.20L25.28,8.50L17.18,8.60L18.78,12.30L21.68,12.60L23.78,16.30L25.58,17.30L28.48,12.00L29.78,15.90L32.18,13.50L33.28,17.90L26.48,17.80L26.58,19.10L30.18,19.40L26.08,21.60L27.68,22.20L28.28,24.50L30.98,22.50L33.28,22.20L30.48,23.20L29.98,26.20L32.98,25.00L33.18,27.60L35.68,26.80L38.08,29.30L40.88,27.70L42.18,28.30L44.68,30.20L47.08,29.70L49.18,30.20L51.08,31.50L48.08,38.30L43.08,41.60L42.28,38.70L43.48,32.80L39.68,35.00L36.88,35.00L36.18,37.30L36.38,40.10L33.18,39.60L31.18,34.00L29.78,29.00L26.08,28.70L27.38,30.40ZM45.38,18.60L43.78,23.70L43.68,19.90L42.78,20.50L42.18,19.70L43.28,18.60L41.98,18.50L41.58,20.40L39.28,18.80L37.98,19.10L36.98,17.70L38.18,15.80L35.28,14.40L35.88,13.60L37.38,14.50L38.28,13.30L36.58,12.30L37.68,11.40L37.28,10.40L34.98,11.20L34.88,9.40L36.78,8.70L35.38,8.60L35.08,6.30L34.38,8.80L31.98,10.00L34.08,3.90L41.68,4.30L40.18,5.40L39.98,9.60L41.68,10.50L41.68,13.40L43.78,15.20L43.28,16.60L45.38,18.60ZM8.88,42.10L9.68,44.60L8.38,46.40L8.58,48.50L4.68,50.00L3.78,47.50L4.08,44.80L5.18,43.60L4.78,40.90L6.78,40.40L7.08,38.50L10.18,36.40L9.68,38.90L11.68,41.90L8.88,42.10Z' },
  '46527': { name: '龍郷町', nameEn: 'Tatsugo Town', viewW: 32.1, viewH: 37.8,
    d: 'M16.32,31.11L15.72,30.21L15.82,31.91L12.92,35.21L9.82,34.31L6.82,35.01L2.22,32.71L3.72,28.91L5.42,29.21L6.32,28.41L6.52,26.51L8.52,23.31L9.92,21.31L9.92,19.11L6.62,19.41L7.92,17.61L7.22,14.01L6.42,5.41L7.02,4.71L8.52,5.91L10.32,9.41L11.32,8.91L12.92,6.91L14.22,4.41L16.82,4.71L18.42,2.81L24.42,2.61L23.82,3.91L22.92,5.61L23.02,7.11L22.42,6.51L20.72,8.51L20.92,13.01L19.12,14.41L17.82,15.21L18.22,16.31L17.52,16.11L18.12,16.41L17.22,18.21L17.82,17.51L18.82,16.91L19.92,18.11L20.12,13.91L22.42,12.71L23.52,14.11L23.92,12.11L22.92,10.41L24.12,9.41L26.02,10.81L25.52,11.51L23.72,15.41L24.22,18.01L28.32,18.61L29.12,14.81L29.92,14.31L28.42,20.41L22.42,22.01L21.72,24.51L18.92,26.81L17.92,30.31Z' },
  '46529': { name: '喜界町', nameEn: 'Kikai Town', viewW: 31.9, viewH: 28.8,
    d: 'M10.20,26.58L7.70,25.58L7.60,23.88L6.10,21.88L4.00,22.28L3.50,20.38L2.70,20.58L2.20,16.58L2.90,15.28L6.60,12.48L7.30,14.38L7.90,14.18L7.50,12.68L11.20,13.38L11.50,12.08L15.90,9.88L20.50,4.98L22.10,4.18L22.10,4.78L22.40,4.88L23.70,2.28L26.50,1.98L28.80,3.88L29.50,5.38L28.70,5.98L29.50,5.78L29.70,6.78L29.10,7.98L27.70,7.68L28.70,8.78L26.80,9.48L26.70,11.18L25.20,12.68L23.50,11.48L23.80,12.48L23.30,13.18L22.00,11.98L22.40,13.48L23.50,13.58L19.30,18.98L16.90,23.98L16.10,23.38L15.70,25.08L14.80,25.38L14.00,24.28L13.80,25.88L11.10,26.78L10.10,25.78L10.20,26.58Z' },
  '46530': { name: '徳之島町', nameEn: 'Tokunoshima Town', viewW: 34.1, viewH: 60.4,
    d: 'M22.55,56.27L17.05,49.07L14.85,49.37L12.25,47.37L13.35,44.67L12.75,42.67L16.55,41.57L18.25,38.17L18.15,36.07L19.75,33.97L16.15,32.57L14.45,31.17L14.15,29.67L10.45,28.57L8.05,23.67L5.95,24.37L7.15,20.97L5.45,20.07L4.55,16.97L8.25,14.57L6.75,10.27L2.35,9.17L2.65,4.17L6.75,5.87L8.95,4.97L16.95,5.77L16.25,6.87L17.75,10.57L15.55,10.87L13.25,13.07L16.85,15.07L16.65,17.47L15.55,18.37L17.15,21.17L15.75,21.07L15.85,24.57L19.05,26.27L19.85,28.37L22.65,28.27L23.35,30.17L26.95,33.67L26.45,34.97L30.55,36.87L31.75,38.57L30.35,44.17L27.95,45.07L28.95,46.67L28.15,46.87L27.35,49.37L27.95,51.27L25.55,51.77L23.95,53.77L24.45,55.77L22.55,56.27Z' },
  '46531': { name: '天城町', nameEn: 'Amagi Town', viewW: 27.5, viewH: 47.0,
    d: 'M4.10,29.94L3.70,24.84L5.20,24.34L4.10,23.54L4.60,21.94L1.90,19.84L2.40,14.74L2.80,17.84L4.80,13.44L3.80,11.74L5.10,12.34L5.40,12.74L5.50,12.74L3.90,10.14L4.10,5.64L5.90,3.54L8.00,3.24L8.10,8.64L12.50,9.74L14.00,14.04L10.30,16.44L11.20,19.54L12.90,20.44L11.70,23.84L13.80,23.14L16.20,28.04L19.90,29.14L20.20,30.64L25.60,33.94L23.90,35.54L24.00,37.64L22.30,41.04L18.50,42.14L18.50,43.74L15.90,42.64L11.80,42.74L11.30,41.44L10.30,41.54L7.70,39.84L7.20,38.94L8.00,35.24L7.40,35.74L5.70,33.94L5.10,30.74L4.10,29.94Z' },
  '46532': { name: '伊仙町', nameEn: 'Isen Town', viewW: 31.1, viewH: 28.2,
    d: 'M21.24,24.34L14.54,26.24L12.04,24.54L10.94,22.04L10.94,17.74L6.24,13.44L4.64,13.24L2.14,9.44L6.24,6.44L6.94,1.94L11.24,4.44L11.74,5.74L15.84,5.64L18.94,7.04L18.24,10.54L20.54,11.84L22.74,11.54L28.34,18.84L28.94,20.34L26.04,25.24L23.64,25.44L21.24,24.34Z' },
  '46533': { name: '和泊町', nameEn: 'Wadomari Town', viewW: 36.1, viewH: 20.9,
    d: 'M16.19,19.14L12.49,19.44L8.59,13.54L6.79,15.54L3.99,15.34L2.49,13.54L3.69,11.54L2.69,8.84L6.79,10.24L10.99,7.64L12.79,8.94L14.29,7.74L15.79,8.14L17.79,6.74L17.39,6.04L18.19,6.64L20.49,4.94L25.79,3.84L28.59,1.44L32.99,2.34L33.59,3.64L32.39,4.74L29.39,6.84L25.09,7.94L23.39,11.14L22.59,10.34L22.19,11.24L22.99,11.74L20.89,12.24L21.29,12.84L20.79,12.24L20.19,14.84L16.19,19.14Z' },
  '46534': { name: '知名町', nameEn: 'Chinan Town', viewW: 27.1, viewH: 23.8,
    d: 'M21.07,18.84L13.57,21.84L12.27,22.14L13.47,21.54L11.77,22.04L8.57,20.54L4.77,16.54L3.07,12.54L2.67,12.84L2.77,10.84L1.87,9.44L2.37,5.64L4.77,1.64L9.27,4.34L14.37,3.64L15.37,6.34L14.17,7.84L14.97,9.54L18.17,10.44L20.27,8.34L24.17,14.24L25.27,14.54L21.07,18.84Z' },
  '46535': { name: '与論町', nameEn: 'Yoron Town', viewW: 16.2, viewH: 14.6,
    d: 'M11.92,13.61L7.52,12.21L6.82,10.71L6.02,10.11L4.92,10.51L2.92,7.51L1.92,8.31L1.12,5.11L2.42,4.11L3.52,5.61L5.32,5.21L4.72,4.81L5.52,4.51L5.42,2.61L7.02,1.01L11.12,1.51L14.32,5.91L14.12,8.81L15.12,12.61L11.92,13.61Z' },
};
// ACTIVE_CITY_IDS は CITY_CONFIGS のキー一覧(冒頭で定義済み)。体験可能な市町村が増えたらそちらに追加する。

// 長崎県本島16市町(国土数値情報より簡略化・滑らかな曲線に加工。離島は別途インセット表示)
const NAGASAKI_OUTLINE_PATHS = ["M201.0,45.9 L176.1,76.0 L150.4,109.3 L134.1,155.4 L173.3,173.0 L180.3,147.0 L202.4,140.0 L182.9,164.8 L186.3,183.3 L218.4,220.2 L240.3,201.5 L262.7,205.7 L267.7,250.5 L306.8,252.7 L350.0,298.4 L335.2,340.2 L374.3,392.6 L360.2,395.9 L317.6,369.7 L313.9,384.4 L293.8,381.9 L276.8,404.0 L262.8,384.1 L275.8,326.9 L261.5,313.5 L278.7,309.5 L246.8,279.6 L245.7,262.3 L200.6,230.5 L184.5,269.3 L192.3,292.7 L174.2,306.8 L177.0,338.8 L195.9,359.9 L204.8,387.2 L230.6,415.5 L266.5,434.9 L276.6,471.0 L290.2,471.1 L255.3,545.0 L233.1,566.4 L271.0,551.0 L286.8,520.9 L317.0,507.6 L349.2,457.6 L367.5,443.9 L386.1,446.5 L444.6,415.4 L467.7,423.9 L482.0,448.7 L478.3,472.7 L443.0,495.7 L441.0,512.2 L462.7,553.2 L496.3,539.6 L510.4,513.9 L555.2,503.9 L570.9,460.1 L573.3,427.5 L553.9,385.4 L534.2,388.6 L528.8,419.6 L530.6,368.8 L451.3,391.7 L465.2,376.0 L453.8,357.5 L479.9,338.5 L492.9,310.3 L489.4,309.3 L433.4,293.7 L406.6,323.2 L418.1,306.7 L416.4,283.0 L408.6,276.8 L406.0,274.8 L381.0,299.0 L374.4,249.7 L329.4,244.1 L355.2,232.3 L310.6,169.0 L292.7,165.7 L291.4,142.3 L254.1,122.1 L271.8,109.4 L261.1,96.7 L259.9,57.7 L215.7,73.6 Z", "M56.6,117.1 L42.5,161.5 L71.0,172.3 L108.6,122.6 L98.4,113.0 L123.0,96.5 L142.6,66.1 L135.2,33.6 L113.6,66.3 L72.7,73.2 L78.0,108.3 Z"];

// 長崎県に隣接する県(佐賀県・福岡県・熊本県)の輪郭。長崎県ページの座標系に変換したもの。枠に入る範囲だけ表示。
const NAGASAKI_NEIGHBOR_PREF_OUTLINES = [
  { id: '41', name: '佐賀県', d: 'M392.9,0.8 L519.3,-4.4 L656.5,80.6 L561.1,208.0 L498.9,173.0 L445.9,219.3 L466.9,261.0 L480.0,323.5 L423.0,309.2 L406.6,323.2 L418.2,306.8 L416.3,283.0 L408.5,276.8 L405.9,274.8 L381.0,299.1 L374.3,249.7 L329.5,244.0 L355.1,232.3 L310.5,169.0 L292.6,165.7 L291.3,142.3 L254.2,122.1 L271.7,109.4 L261.0,96.7 L261.2,82.5 L290.8,103.5 L308.1,48.0 L301.4,14.5 L304.2,-25.7 L325.2,-49.2 L362.7,-25.7 Z' },
  { id: '40', name: '福岡県', d: 'M1001.2,-91.3 L996.9,-23.0 L847.0,15.7 L817.7,230.9 L726.6,197.7 L591.9,294.6 L561.1,208.0 L656.5,80.6 L519.3,-4.4 L392.9,0.8 L395.9,-15.7 L453.2,-41.3 L459.3,-56.2 L433.7,-47.7 L443.1,-60.8 L419.4,-70.5 L449.9,-78.2 L483.1,-123.3 L495.0,-91.3 L516.9,-88.2 L517.2,-69.9 L584.0,-81.2 L599.8,-136.1 L561.4,-108.3 L529.1,-120.5 L526.0,-135.5 L543.1,-119.0 L582.4,-134.5 L619.9,-177.2 L607.7,-215.9 L623.0,-218.4 L625.4,-243.0 L646.4,-244.6 L650.4,-263.2 L725.1,-267.1 L734.2,-293.0 L768.9,-284.2 L780.5,-299.4 L772.3,-282.4 L804.6,-286.6 L795.5,-264.1 L765.3,-254.0 L797.9,-264.1 L796.4,-253.1 L819.5,-286.9 L845.4,-261.9 L882.9,-308.6 L913.4,-309.2 L885.1,-212.6 L902.7,-216.5 L893.6,-197.0 L908.8,-192.8 L904.9,-175.1 L952.4,-95.8 Z' },
  { id: '43', name: '熊本県', d: 'M1077.7,401.5 L912.5,582.3 L960.6,824.6 L754.6,862.0 L696.1,808.1 L563.5,819.7 L585.5,777.3 L605.6,776.4 L610.8,743.8 L632.1,738.9 L618.7,720.0 L640.6,702.6 L632.1,695.0 L676.6,652.4 L659.8,613.7 L676.3,604.8 L658.3,589.9 L708.0,546.6 L699.5,537.2 L719.0,539.9 L722.3,528.3 L616.0,543.6 L616.3,527.1 L694.9,476.8 L685.7,444.8 L697.9,426.8 L682.1,396.1 L650.1,389.7 L650.1,371.1 L607.7,350.0 L591.9,294.6 L726.6,197.7 L817.7,230.9 L886.9,281.5 L964.3,183.0 Z' },
];

// 隣接県どうしの境界線(福岡-佐賀、佐賀-長崎、福岡-熊本)。枠に入る範囲だけ抜粋。
const NAGASAKI_NEIGHBOR_PREF_BORDERS = [
  'M561.1,208.0 L656.5,80.6 L519.3,-4.4 L392.9,0.8',
  'M492.9,310.3 L489.4,309.3 L433.4,293.7 L406.6,323.2 L418.1,306.7 L416.4,283.0 L408.6,276.8 L406.0,274.8 L381.0,299.0 L374.4,249.7 L329.4,244.1 L355.2,232.3 L310.6,169.0 L292.7,165.7 L291.4,142.3 L254.1,122.1 L271.8,109.4 L261.1,96.7 L259.9,57.7',
  'M817.7,230.9 L726.6,197.7 L591.9,294.6',
];

// 佐賀県ページに表示する隣接県(福岡・長崎・熊本)のプレビュー
const SAGA_NEIGHBOR_PREF_OUTLINES = [
  { id: '40', name: '福岡県', d: 'M995.1,11.6 L989.7,97.8 L800.5,146.6 L763.6,418.2 L648.6,376.3 L478.6,498.6 L439.7,389.3 L560.1,228.6 L387.0,121.2 L227.4,127.8 L313.2,58.2 L262.0,35.5 L335.1,-9.9 L465.9,24.3 L482.4,-68.0 L502.0,-78.4 L515.5,-101.1 L523.9,-179.2 L566.3,-209.9 L628.2,-206.9 L653.2,-233.8 L775.1,-242.2 L801.7,-212.2 L885.5,-268.8 L859.7,-146.9 L875.1,-98.0 L902.8,-49.5 L930.1,-5.3 Z' },
  { id: '42', name: '長崎県', d: 'M78.1,332.4 L49.9,345.1 L41.1,312.4 L13.0,303.6 L37.6,334.7 L33.4,358.2 L7.0,404.7 L34.7,380.9 L63.2,386.3 L69.3,442.8 L118.9,445.9 L173.2,503.6 L154.7,556.3 L203.9,622.4 L186.2,626.6 L132.4,593.6 L127.8,612.0 L102.4,609.0 L80.9,636.6 L63.2,611.6 L79.7,539.3 L61.6,522.4 L83.2,517.4 L43.2,479.7 L41.6,457.8 L15.3,417.8 L35.7,466.6 L25.7,496.3 L48.8,513.9 L45.3,554.3 L21.1,580.9 L9.9,615.5 L22.4,651.3 L67.8,675.9 L80.5,721.3 L97.8,721.3 L53.9,814.7 L25.8,841.7 L73.5,822.4 L93.5,784.3 L131.6,767.4 L172.4,704.3 L195.5,687.0 L218.9,690.5 L292.8,651.3 L322.0,662.0 L340.1,693.2 L335.1,723.6 L290.9,752.4 L288.2,773.2 L315.5,825.1 L358.2,807.8 L375.9,775.5 L432.4,762.8 L452.0,707.4 L455.1,666.3 L430.9,613.2 L405.9,617.4 L398.9,656.3 L401.3,592.4 L301.2,621.3 L318.6,601.3 L304.3,578.2 L337.4,554.0 L337.4,535.1 L265.5,517.0 L244.7,534.7 L259.3,513.9 L231.2,493.9 L212.4,504.3 L190.5,451.6 L147.4,434.7 L168.9,408.9 L115.9,365.1 L78.5,349.3 Z' },
  { id: '43', name: '熊本県', d: 'M1091.7,633.6 L883.2,861.7 L944.0,1167.4 L684.0,1214.8 L610.1,1146.7 L442.8,1161.3 L492.0,1119.0 L513.2,1082.8 L562.8,977.1 L586.3,952.8 L561.3,885.5 L625.9,825.1 L624.3,808.6 L515.1,823.2 L537.0,784.0 L609.0,734.7 L585.1,629.3 L521.6,585.1 L495.9,555.5 L478.6,498.6 L648.6,376.3 L763.6,418.2 L850.9,482.0 L948.6,357.8 L1091.7,633.6 Z' },
];
const SAGA_NEIGHBOR_PREF_BORDERS = [
  'M439.8,389.4 L560.2,228.6 L387.1,121.3 L227.5,127.9',
  'M337.5,535.2 L265.6,517.1 L244.8,534.8 L259.4,514.1 L231.3,494.1 L212.5,504.4 L190.6,451.7 L147.5,434.8 L169.0,409.0 L115.9,365.2 L78.6,349.4 L77.5,306.0 L52.5,281.0 L39.8,264.4 L61.3,231.0',
];


const INTERNAL_BORDERS = [
  "M367.5,443.9 L368.4,416.3 L351.1,413.8 L332.0,407.2 L325.5,413.5 L305.9,416.2 L302.8,422.3 L290.6,412.8 L275.5,410.9 L276.8,404.0",
  "M261.5,313.5 L234.4,327.2 L232.7,348.7 L195.9,359.9",
  "M254.1,122.1 L221.0,110.7 L220.8,101.5 L214.6,96.4 L176.1,76.0",
  "M180.3,147.0 L171.4,135.5 L186.5,116.4 L203.4,124.4 L202.4,140.0",
  "M267.7,250.5 L286.6,243.6 L292.7,202.4 L304.6,188.7",
  "M528.8,419.6 L518.9,431.8 L517.8,441.6 L525.2,444.5 L536.8,448.9 L524.5,452.0 L557.0,453.6 L570.9,460.1",
  "M444.6,415.4 L455.7,404.2 L451.3,391.7",
  "M406.6,323.2 L383.5,330.7 L376.9,368.8 L374.3,392.6",
  "M313.9,384.4 L332.0,407.2",
  "M381.0,299.0 L364.3,301.7 L350.0,298.4",
  "M441.0,512.2 L464.7,508.0 L506.3,468.5 L517.0,464.7 L524.5,452.0",
  "M293.8,381.9 L294.5,389.6 L290.6,412.8",
  "M286.6,243.6 L300.2,225.2 L306.7,229.8 L306.8,252.7",
  "M329.4,244.1 L306.8,252.7"
];

const MUNICIPALITIES = [
  { id: '42201', name: '長崎市', nameEn: 'Nagasaki City', cx: 278.0, cy: 437.4, d: 'M290.6,412.8 L275.5,410.9 L276.8,404.0 L262.8,384.1 L275.8,326.9 L261.5,313.5 L234.4,327.2 L232.7,348.7 L195.9,359.9 L204.8,387.2 L230.6,415.5 L266.5,434.9 L276.6,471.0 L290.2,471.1 L255.3,545.0 L233.1,566.4 L271.0,551.0 L286.8,520.9 L317.0,507.6 L349.2,457.6 L367.5,443.9 L368.4,416.3 L351.1,413.8 L332.0,407.2 L325.5,413.5 L305.9,416.2 L302.8,422.3 L290.6,412.8 Z' },
  { id: '42202', name: '佐世保市', nameEn: 'Sasebo City', cx: 199.9, cy: 161.9, d: 'M271.8,109.4 L221.0,110.7 L220.8,101.5 L214.6,96.4 L176.1,76.0 L150.4,109.3 L134.1,155.4 L173.3,173.0 L180.3,147.0 L171.4,135.5 L186.5,116.4 L203.4,124.4 L202.4,140.0 L182.9,164.8 L186.3,183.3 L218.4,220.2 L240.3,201.5 L262.7,205.7 L267.7,250.5 L286.6,243.6 L292.7,202.4 L310.6,169.0 L292.7,165.7 L291.4,142.3 L254.1,122.1 Z' },
  { id: '42214', name: '南島原市', nameEn: 'Minamishimabara City', cx: 505.1, cy: 505.6, d: 'M570.9,460.1 L557.0,453.6 L524.5,452.0 L517.0,464.7 L506.3,468.5 L464.7,508.0 L441.0,512.2 L462.7,553.2 L496.3,539.6 L510.4,513.9 L555.2,503.9 L570.9,460.1 Z' },
  { id: '42307', name: '長与町', nameEn: 'Nagayo Town', cx: 307.4, cy: 396.6, d: 'M332.0,407.2 L313.9,384.4 L293.8,381.9 L294.5,389.6 L290.6,412.8 L302.8,422.3 L305.9,416.2 L325.5,413.5 L332.0,407.2 Z' },
  { id: '42308', name: '時津町', nameEn: 'Togitsu Town', cx: 283.4, cy: 394.4, d: 'M294.5,389.6 L293.8,381.9 L276.8,404.0 L275.5,410.9 L290.6,412.8 Z' },
  { id: '42321', name: '東彼杵町', nameEn: 'Higashisonogi Town', cx: 350.0, cy: 272.6, d: 'M329.4,244.1 L306.8,252.7 L350.0,298.4 L364.3,301.7 L381.0,299.0 L374.4,249.7 Z' },
  { id: '42203', name: '島原市', nameEn: 'Shimabara City', cx: 544.0, cy: 432.8, d: 'M570.9,460.1 L573.3,427.5 L553.9,385.4 L534.2,388.6 L528.8,419.6 L518.9,431.8 L517.8,441.6 L525.2,444.5 L536.8,448.9 L524.5,452.0 L557.0,453.6 L570.9,460.1 Z' },
  { id: '42204', name: '諫早市', nameEn: 'Isahaya City', cx: 390.0, cy: 381.7, d: 'M444.6,415.4 L455.7,404.2 L451.3,391.7 L465.2,376.0 L453.8,357.5 L479.9,338.5 L492.9,310.3 L489.4,309.3 L433.4,293.7 L406.6,323.2 L383.5,330.7 L376.9,368.8 L374.3,392.6 L360.2,395.9 L317.6,369.7 L313.9,384.4 L332.0,407.2 L351.1,413.8 L368.4,416.3 L367.5,443.9 L386.1,446.5 Z' },
  { id: '42205', name: '大村市', nameEn: 'Omura City', cx: 366.9, cy: 332.5, d: 'M374.3,392.6 L376.9,368.8 L383.5,330.7 L406.6,323.2 L418.1,306.7 L416.4,283.0 L408.6,276.8 L406.0,274.8 L381.0,299.0 L364.3,301.7 L350.0,298.4 L335.2,340.2 Z' },
  { id: '42207', name: '平戸市', nameEn: 'Hirado City', cx: 89.7, cy: 104.6, d: 'M135.2,33.6 L113.6,66.3 L72.7,73.2 L78.0,108.3 L56.6,117.1 L42.5,161.5 L71.0,172.3 L108.6,122.6 L98.4,113.0 L123.0,96.5 L142.6,66.1 Z' },
  { id: '42208', name: '松浦市', nameEn: 'Matsuura City', cx: 218.1, cy: 77.5, d: 'M271.8,109.4 L261.1,96.7 L259.9,57.7 L215.7,73.6 L201.0,45.9 L176.1,76.0 L214.6,96.4 L220.8,101.5 L221.0,110.7 L271.8,109.4 Z' },
  { id: '42212', name: '西海市', nameEn: 'Saikai City', cx: 216.7, cy: 287.9, d: 'M195.9,359.9 L232.7,348.7 L234.4,327.2 L261.5,313.5 L278.7,309.5 L246.8,279.6 L245.7,262.3 L200.6,230.5 L184.5,269.3 L192.3,292.7 L174.2,306.8 L177.0,338.8 Z' },
  { id: '42213', name: '雲仙市', nameEn: 'Unzen City', cx: 488.8, cy: 445.7, d: 'M524.5,452.0 L536.8,448.9 L525.2,444.5 L517.8,441.6 L518.9,431.8 L528.8,419.6 L530.6,368.8 L451.3,391.7 L455.7,404.2 L444.6,415.4 L467.7,423.9 L482.0,448.7 L478.3,472.7 L443.0,495.7 L441.0,512.2 L464.7,508.0 L506.3,468.5 L517.0,464.7 L524.5,452.0 Z' },
  { id: '42322', name: '川棚町', nameEn: 'Kawatana Town', cx: 292.5, cy: 247.2, d: 'M267.7,250.5 L286.6,243.6 L300.2,225.2 L306.7,229.8 L306.8,252.7 L267.7,250.5 Z' },
  { id: '42323', name: '波佐見町', nameEn: 'Hasami Town', cx: 318.1, cy: 214.4, d: 'M286.6,243.6 L292.7,202.4 L310.6,169.0 L358.8,237.4 L361.1,229.6 L329.4,244.1 L306.8,252.7 L306.7,229.8 L300.2,225.2 L286.6,243.6 Z' },
  { id: '42391', name: '佐々町', nameEn: 'Sasa Town', cx: 190.5, cy: 138.0, d: 'M202.4,140.0 L203.4,124.4 L186.5,116.4 L171.4,135.5 L180.3,147.0 Z' }
];

// 九州の他6県(福岡・佐賀・熊本・大分・宮崎・鹿児島)の市町村データ。
// 長崎県ページ(MUNICIPALITIES/INTERNAL_BORDERS/NAGASAKI_OUTLINE_PATHS)と同じ手法(国土数値情報ベースの実データをローポリ化)で作成。
// 県ごとに { municipalities, internalBorders, outlinePaths } を持つ。長崎県('42')は既存のNAGASAKI用データをそのまま参照する。
// 鹿児島県: 本土のみ(離島は別テーブルで表示)
const KAGOSHIMA_MAINLAND_CITIES = [
  { name: 'いちき串木野市', cx: 158.7, cy: 249.7, d: 'M122.8,232.3 L142.9,228.4 L196.1,253.3 L173.0,284.6 Z' },
  { name: 'さつま町', cx: 241.2, cy: 173.2, d: 'M183.1,149.0 L233.0,122.4 L288.0,164.5 L286.5,170.3 L274.3,188.4 L232.2,183.0 L228.3,211.1 L204.2,196.6 Z' },
  { name: '伊佐市', cx: 284.6, cy: 109.2, d: 'M233.0,122.4 L232.3,83.0 L282.1,55.0 L322.9,92.3 L316.5,110.7 L317.2,136.7 L288.0,164.5 Z' },
  { name: '出水市', cx: 183.6, cy: 107.0, d: 'M171.7,146.1 L146.4,123.1 L142.5,80.4 L170.7,89.1 L189.3,63.2 L232.3,83.0 L233.0,122.4 L183.1,149.0 Z' },
  { name: '南さつま市', cx: 168.6, cy: 392.7, d: 'M221.2,364.1 L171.5,425.2 L153.2,459.6 L106.0,389.8 L139.5,396.0 L172.0,357.5 L217.1,356.8 Z' },
  { name: '南九州市', cx: 221.6, cy: 427.9, d: 'M221.2,364.1 L244.4,395.9 L255.7,442.8 L244.4,478.1 L192.6,461.4 L171.5,425.2 Z' },
  { name: '南大隅町', cx: 342.0, cy: 520.5, d: 'M340.3,473.0 L382.7,514.5 L389.7,521.7 L309.3,560.0 L303.4,533.9 L326.7,520.1 Z' },
  { name: '垂水市', cx: 336.8, cy: 340.9, d: 'M314.6,329.3 L317.8,328.6 L352.7,296.2 L361.0,308.0 L359.1,363.4 L337.6,390.9 L315.0,370.2 Z' },
  { name: '大崎町', cx: 412.9, cy: 354.2, d: 'M398.9,330.3 L409.3,337.8 L411.8,340.2 L416.8,336.3 L412.6,364.3 L448.7,377.0 L434.2,399.3 L410.2,380.6 L390.2,352.5 Z M403.5,346.7  Z M412.0,345.5  Z M406.4,339.3  Z' },
  { name: '姶良市', cx: 275.2, cy: 236.8, d: 'M282.4,278.4 L268.8,246.2 L231.5,253.5 L250.3,209.5 L274.3,188.4 L314.4,227.2 L305.0,254.4 Z' },
  { name: '志布志市', cx: 453.4, cy: 338.4, d: 'M416.8,336.3 L437.4,306.2 L466.5,314.3 L489.2,295.5 L502.4,318.8 L486.6,368.7 L448.7,377.0 L412.6,364.3 Z M420.8,364.9  Z' },
  { name: '指宿市', cx: 269.8, cy: 463.3, d: 'M272.4,438.6 L302.9,454.9 L273.7,502.3 L244.4,478.1 L255.7,442.8 Z' },
  { name: '日置市', cx: 199.5, cy: 303.9, d: 'M209.1,259.2 L229.2,298.2 L199.7,317.8 L217.1,356.8 L172.0,357.5 L173.0,284.6 L196.1,253.3 Z' },
  { name: '曽於市', cx: 419.7, cy: 298.0, d: 'M398.9,330.3 L372.6,302.9 L393.2,282.6 L383.6,220.8 L421.5,231.7 L435.3,277.9 L489.2,295.5 L466.5,314.3 L437.4,306.2 L416.8,336.3 L411.8,340.2 L409.3,337.8 Z' },
  { name: '東串良町', cx: 422.9, cy: 401.4, d: 'M410.2,380.6 L434.2,399.3 L432.2,414.9 L414.9,410.9 Z' },
  { name: '枕崎市', cx: 172.4, cy: 448.7, d: 'M171.5,425.2 L192.6,461.4 L153.2,459.6 Z' },
  { name: '湧水町', cx: 315.2, cy: 153.6, d: 'M358.4,161.7 L324.7,177.7 L286.5,170.3 L288.0,164.5 L317.2,136.7 L316.5,110.7 Z' },
  { name: '肝付町', cx: 420.6, cy: 460.2, d: 'M414.9,410.9 L432.2,414.9 L466.6,427.4 L475.1,449.2 L432.8,471.7 L418.6,504.9 L389.7,521.7 L382.7,514.5 L399.0,471.9 L394.7,415.2 Z' },
  { name: '薩摩川内市', cx: 198.8, cy: 206.0, d: 'M209.1,259.2 L196.1,253.3 L142.9,228.4 L122.8,232.3 L137.6,167.2 L171.7,146.1 L183.1,149.0 L204.2,196.6 L228.3,211.1 L232.2,183.0 L274.3,188.4 L250.3,209.5 L231.5,253.5 Z' },
  { name: '錦江町', cx: 367.9, cy: 475.4, d: 'M349.7,442.4 L399.0,471.9 L382.7,514.5 L340.3,473.0 Z' },
  { name: '長島町', cx: 108.3, cy: 65.2, d: 'M121.2,40.0 L116.6,96.9 L98.0,81.6 L97.6,42.1 Z' },
  { name: '阿久根市', cx: 140.3, cy: 123.8, d: 'M171.7,146.1 L137.6,167.2 L122.4,135.7 L121.3,90.1 L142.5,80.4 L146.4,123.1 Z' },
  { name: '霧島市', cx: 343.5, cy: 233.9, d: 'M361.0,308.0 L352.7,296.2 L349.5,265.3 L305.0,254.4 L314.4,227.2 L274.3,188.4 L286.5,170.3 L324.7,177.7 L358.4,161.7 L389.6,185.8 L383.6,220.8 L393.2,282.6 L372.6,302.9 Z' },
  { name: '鹿児島市', cx: 256.6, cy: 331.0, d: 'M272.4,438.6 L255.7,442.8 L244.4,395.9 L221.2,364.1 L217.1,356.8 L199.7,317.8 L229.2,298.2 L209.1,259.2 L231.5,253.5 L268.8,246.2 L282.4,278.4 L264.5,311.3 L251.4,393.8 Z M314.6,329.3 L274.9,314.9 L307.8,297.5 L317.8,328.6 Z' },
  { name: '鹿屋市', cx: 380.7, cy: 379.0, d: 'M398.9,330.3 L390.2,352.5 L410.2,380.6 L414.9,410.9 L394.7,415.2 L399.0,471.9 L349.7,442.4 L337.6,390.9 L359.1,363.4 L361.0,308.0 L372.6,302.9 Z' }
];
const KAGOSHIMA_MAINLAND_INTERNAL_BORDERS= [
  "M196.1,253.3 L142.9,228.4 L122.8,232.3", "M173.0,284.6 L196.1,253.3", "M233.0,122.4 L183.1,149.0", "M288.0,164.5 L233.0,122.4", "M286.5,170.3 L288.0,164.5", "M274.3,188.4 L286.5,170.3", "M183.1,149.0 L204.2,196.6 L228.3,211.1 L232.2,183.0 L274.3,188.4", "M232.3,83.0 L233.0,122.4", "M288.0,164.5 L317.2,136.7 L316.5,110.7", "M142.5,80.4 L146.4,123.1 L171.7,146.1", "M171.7,146.1 L183.1,149.0", "M171.5,425.2 L221.2,364.1", "M153.2,459.6 L171.5,425.2", "M217.1,356.8 L172.0,357.5", "M221.2,364.1 L217.1,356.8", "M255.7,442.8 L244.4,395.9 L221.2,364.1", "M244.4,478.1 L255.7,442.8", "M171.5,425.2 L192.6,461.4", "M382.7,514.5 L340.3,473.0", "M389.7,521.7 L382.7,514.5", "M317.8,328.6 L314.6,329.3", "M361.0,308.0 L352.7,296.2", "M337.6,390.9 L359.1,363.4 L361.0,308.0", "M409.3,337.8 L398.9,330.3", "M416.8,336.3 L411.8,340.2", "M448.7,377.0 L412.6,364.3 L416.8,336.3", "M410.2,380.6 L434.2,399.3", "M398.9,330.3 L390.2,352.5 L410.2,380.6", "M231.5,253.5 L268.8,246.2 L282.4,278.4", "M274.3,188.4 L250.3,209.5 L231.5,253.5", "M305.0,254.4 L314.4,227.2 L274.3,188.4", "M489.2,295.5 L466.5,314.3 L437.4,306.2 L416.8,336.3", "M272.4,438.6 L255.7,442.8", "M217.1,356.8 L199.7,317.8 L229.2,298.2 L209.1,259.2", "M209.1,259.2 L196.1,253.3", "M372.6,302.9 L398.9,330.3", "M383.6,220.8 L393.2,282.6 L372.6,302.9", "M414.9,410.9 L432.2,414.9", "M410.2,380.6 L414.9,410.9", "M286.5,170.3 L324.7,177.7 L358.4,161.7", "M399.0,471.9 L382.7,514.5", "M414.9,410.9 L394.7,415.2 L399.0,471.9", "M171.7,146.1 L137.6,167.2", "M209.1,259.2 L231.5,253.5", "M399.0,471.9 L349.7,442.4", "M361.0,308.0 L372.6,302.9"
];
const KAGOSHIMA_MAINLAND_OUTLINE_PATHS= [
  "M337.6,390.9 L315.0,370.2 L314.6,329.3 L274.9,314.9 L307.8,297.5 L317.8,328.6 L352.7,296.2 L349.5,265.3 L305.0,254.4 L282.4,278.4 L264.5,311.3 L251.4,393.8 L272.4,438.6 L302.9,454.9 L273.7,502.3 L244.4,478.1 L192.6,461.4 L153.2,459.6 L106.0,389.8 L139.5,396.0 L172.0,357.5 L173.0,284.6 L122.8,232.3 L137.6,167.2 L122.4,135.7 L121.3,90.1 L142.5,80.4 L170.7,89.1 L189.3,63.2 L232.3,83.0 L282.1,55.0 L322.9,92.3 L316.5,110.7 L358.4,161.7 L389.6,185.8 L383.6,220.8 L421.5,231.7 L435.3,277.9 L489.2,295.5 L502.4,318.8 L486.6,368.7 L448.7,377.0 L434.2,399.3 L432.2,414.9 L466.6,427.4 L475.1,449.2 L432.8,471.7 L418.6,504.9 L389.7,521.7 L309.3,560.0 L303.4,533.9 L326.7,520.1 L340.3,473.0 L349.7,442.4 Z", "M121.2,40.0 L116.6,96.9 L98.0,81.6 L97.6,42.1 Z"
];

const TEMP_KUMAMOTO_ON_KYUSHU_OUTLINE = "M316.2,393.0 L329.7,387.4 L330.0,387.4 L333.7,383.2 L349.1,385.9 L339.1,369.8 L339.2,368.8 L338.8,368.1 L339.3,367.4 L339.8,361.3 L348.4,353.9 L344.0,342.4 L333.5,325.4 L334.0,316.0 L333.0,313.5 L334.2,311.2 L334.4,307.8 L336.4,306.9 L340.4,298.8 L349.5,300.5 L350.0,297.3 L350.9,288.7 L351.4,288.2 L351.5,287.6 L356.5,282.6 L371.2,266.2 L375.2,253.0 L375.7,252.9 L376.0,251.8 L378.8,251.9 L387.2,249.2 L374.6,234.6 L373.3,224.0 L364.7,201.5 L360.7,194.7 L341.4,176.3 L330.1,178.6 L334.2,196.9 L330.7,210.2 L325.9,211.2 L304.6,197.2 L276.2,181.1 L272.0,193.9 L256.6,198.3 L248.1,213.6 L230.6,215.5 L234.7,227.8 L241.3,235.3 L257.6,246.8 L263.8,273.8 L245.3,286.5 L239.7,296.5 L267.7,292.8 L268.1,297.0 L251.5,312.5 L257.9,329.8 L251.9,336.1 L239.1,363.2 L233.7,372.5 L221.8,385.3 L238.1,392.9 L261.8,379.6 L281.1,397.3 L281.0,397.6 L285.0,397.3 L285.3,396.7 L295.3,396.3 L310.2,394.9 Z";
const TEMP_MIYAZAKI_ON_KYUSHU_OUTLINE = "M367.1,530.4 L376.8,545.4 L389.4,549.3 L397.7,522.0 L397.3,510.1 L411.3,493.6 L412.3,475.7 L409.7,447.0 L419.1,409.3 L421.3,400.9 L425.3,386.6 L430.5,370.2 L433.8,356.3 L443.9,325.4 L457.3,317.4 L449.8,314.8 L463.3,284.4 L478.9,276.5 L479.9,251.1 L458.6,249.1 L454.6,260.9 L419.3,260.7 L413.8,248.1 L404.3,253.0 L376.0,251.8 L372.1,266.9 L351.5,287.6 L349.5,300.5 L340.4,298.8 L333.0,313.5 L348.9,355.1 L338.8,368.1 L350.2,386.1 L333.7,383.2 L323.3,395.2 L285.3,396.7 L280.2,407.0 L307.4,432.3 L316.5,442.1 L310.4,455.8 L310.2,456.4 L329.1,463.7 L335.6,485.3 L345.9,489.1 L360.0,493.7 L360.5,494.5 L364.1,495.9 L364.6,501.9 L366.3,504.8 L365.2,508.3 Z";
const TEMP_KUMAMOTO_ON_KYUSHU_MUNIS = [
  { name: 'あさぎり町', cx: 316.2, cy: 375.5, d: 'M316.2,393.0 L329.7,387.4 L311.4,353.1 L305.3,368.3 Z' },
  { name: '上天草市', cx: 228.6, cy: 327.0, d: 'M221.7,337.8 L228.3,338.6 L237.8,312.9 L224.6,322.1 Z' },
  { name: '五木村', cx: 303.8, cy: 333.8, d: 'M286.4,339.6 L293.3,343.4 L313.8,348.4 L321.4,347.1 L320.9,330.3 L303.6,318.0 L286.1,323.5 Z' },
  { name: '人吉市', cx: 288.4, cy: 384.9, d: 'M294.6,372.5 L282.5,359.4 L285.5,367.5 L271.3,388.8 L279.5,397.8 L310.2,394.9 L293.6,377.8 Z' },
  { name: '八代市', cx: 287.7, cy: 320.3, d: 'M283.7,305.9 L277.3,312.2 L268.1,297.0 L251.5,312.5 L257.9,329.8 L251.9,336.1 L250.1,343.4 L269.7,345.3 L278.6,349.9 L286.4,339.6 L286.1,323.5 L303.6,318.0 L320.9,330.3 L333.5,325.4 L334.4,307.7 L322.6,301.6 L300.4,305.4 L293.8,298.4 Z' },
  { name: '南小国町', cx: 347.5, cy: 202.4, d: 'M359.4,208.0 L364.7,201.5 L360.7,194.7 L334.2,196.8 L330.7,210.2 Z' },
  { name: '南関町', cx: 254.2, cy: 211.1, d: 'M250.1,218.4 L259.1,217.8 L256.6,198.2 L248.1,213.6 Z' },
  { name: '南阿蘇村', cx: 338.3, cy: 247.1, d: 'M325.4,235.7 L327.3,244.0 L330.3,255.8 L350.8,257.6 L347.8,239.8 Z' },
  { name: '合志市', cx: 292.7, cy: 237.7, d: 'M287.9,245.0 L304.8,237.7 L302.2,236.1 L284.7,230.7 Z' },
  { name: '和水町', cx: 264.4, cy: 208.5, d: 'M267.0,228.0 L267.5,227.2 L272.0,193.9 L256.6,198.2 L259.1,217.8 Z' },
  { name: '嘉島町', cx: 292.9, cy: 267.5, d: 'M293.1,264.2 L289.4,271.3 L296.3,267.0 Z' },
  { name: '多良木町', cx: 329.1, cy: 370.4, d: 'M321.4,347.1 L313.8,348.4 L311.4,353.1 L329.7,387.4 L349.7,387.0 L339.1,369.8 L326.4,361.6 Z' },
  { name: '大津町', cx: 316.2, cy: 238.1, d: 'M302.2,236.1 L304.8,237.7 L309.5,248.5 L309.6,249.2 L327.3,244.0 L325.4,235.7 L323.5,225.4 Z' },
  { name: '天草市', cx: 176.7, cy: 344.4, d: 'M179.9,308.9 L172.9,330.1 L162.7,330.2 L155.3,347.1 L161.5,358.8 L154.6,369.2 L163.6,381.1 L172.2,376.5 L198.3,344.5 L191.9,307.9 Z' },
  { name: '宇土市', cx: 263.9, cy: 280.4, d: 'M263.8,273.8 L245.3,286.4 L282.5,280.9 Z' },
  { name: '宇城市', cx: 272.5, cy: 291.1, d: 'M292.8,284.0 L282.5,280.9 L245.3,286.4 L239.7,296.5 L267.7,292.8 L283.7,305.9 L293.8,298.4 L292.7,284.5 Z' },
  { name: '小国町', cx: 342.5, cy: 187.7, d: 'M360.7,194.7 L341.4,176.3 L330.1,178.6 L334.2,196.8 Z' },
  { name: '山江村', cx: 289.6, cy: 354.8, d: 'M278.6,349.9 L282.5,359.4 L294.6,372.5 L299.4,357.3 L293.3,343.4 L286.4,339.6 Z' },
  { name: '山都町', cx: 339.4, cy: 277.4, d: 'M334.4,307.7 L349.6,301.1 L350.9,288.7 L371.2,266.2 L356.5,252.7 L350.8,257.6 L330.3,255.8 L324.2,259.9 L312.4,268.2 L314.4,284.2 L326.4,287.9 L322.6,301.6 Z' },
  { name: '山鹿市', cx: 283.5, cy: 205.4, d: 'M285.4,221.7 L298.2,213.0 L304.6,197.2 L276.2,181.1 L272.0,193.9 L267.5,227.2 L271.3,229.8 Z' },
  { name: '御船町', cx: 306.1, cy: 271.2, d: 'M289.8,272.9 L309.8,284.4 L314.4,284.2 L312.4,268.2 L324.2,259.9 L312.2,259.6 L296.3,267.0 L289.4,271.3 Z' },
  { name: '水上村', cx: 333.2, cy: 345.2, d: 'M320.9,330.3 L321.4,347.1 L326.4,361.6 L339.8,361.3 L350.2,352.4 L333.5,325.4 Z' },
  { name: '水俣市', cx: 238.8, cy: 383.0, d: 'M238.1,392.9 L259.8,380.7 L258.9,380.0 L240.2,376.8 L233.7,372.5 L221.7,385.4 Z' },
  { name: '氷川町', cx: 275.5, cy: 303.2, d: 'M283.7,305.9 L267.7,292.8 L268.1,297.0 L277.3,312.2 Z' },
  { name: '津奈木町', cx: 237.7, cy: 370.8, d: 'M240.2,376.8 L239.1,363.2 L233.7,372.5 Z' },
  { name: '湯前町', cx: 335.1, cy: 364.2, d: 'M339.1,369.8 L339.8,361.3 L326.4,361.6 Z' },
  { name: '熊本市', cx: 278.3, cy: 255.4, d: 'M289.4,271.3 L293.1,264.2 L301.5,251.5 L287.9,245.0 L284.7,230.7 L285.4,221.7 L271.3,229.8 L267.0,244.1 L257.6,246.8 L263.8,273.8 L282.5,280.9 L292.8,284.0 L289.8,272.9 Z' },
  { name: '玉名市', cx: 256.0, cy: 232.3, d: 'M267.0,244.1 L267.0,228.0 L259.1,217.8 L250.1,218.4 L244.9,228.9 L241.3,235.3 L257.6,246.8 Z' },
  { name: '玉東町', cx: 268.4, cy: 233.6, d: 'M267.0,244.1 L271.3,229.8 L267.5,227.2 L267.0,228.0 Z' },
  { name: '球磨村', cx: 272.2, cy: 367.6, d: 'M269.7,345.3 L258.9,380.0 L261.0,381.7 L271.3,388.8 L285.5,367.5 L282.5,359.4 L278.6,349.9 Z' },
  { name: '産山村', cx: 365.8, cy: 211.2, d: 'M373.3,224.0 L364.7,201.5 L359.4,208.0 Z' },
  { name: '甲佐町', cx: 297.5, cy: 280.6, d: 'M292.8,284.0 L292.7,284.5 L309.8,284.4 L289.8,272.9 Z' },
  { name: '益城町', cx: 303.4, cy: 258.0, d: 'M293.1,264.2 L296.3,267.0 L312.2,259.6 L309.6,249.2 L309.5,248.5 L301.5,251.5 Z' },
  { name: '相良村', cx: 302.5, cy: 357.7, d: 'M293.6,377.8 L305.3,368.3 L311.4,353.1 L313.8,348.4 L293.3,343.4 L299.4,357.3 L294.6,372.5 Z' },
  { name: '美里町', cx: 308.6, cy: 293.8, d: 'M322.6,301.6 L326.4,287.9 L314.4,284.2 L309.8,284.4 L292.7,284.5 L293.8,298.4 L300.4,305.4 Z' },
  { name: '芦北町', cx: 253.3, cy: 360.9, d: 'M251.9,336.1 L239.1,363.2 L240.2,376.8 L258.9,380.0 L269.7,345.3 L250.1,343.4 Z' },
  { name: '苓北町', cx: 171.8, cy: 323.1, d: 'M179.9,308.9 L162.7,330.2 L172.9,330.1 Z' },
  { name: '荒尾市', cx: 240.6, cy: 220.8, d: 'M250.1,218.4 L248.1,213.6 L230.6,215.5 L234.7,227.8 L244.9,228.9 Z' },
  { name: '菊池市', cx: 306.2, cy: 219.2, d: 'M284.7,230.7 L302.2,236.1 L323.5,225.4 L325.9,211.1 L304.6,197.2 L298.2,213.0 L285.4,221.7 Z' },
  { name: '菊陽町', cx: 300.4, cy: 245.1, d: 'M301.5,251.5 L309.5,248.5 L304.8,237.7 L287.9,245.0 Z' },
  { name: '西原村', cx: 320.3, cy: 252.8, d: 'M309.6,249.2 L312.2,259.6 L324.2,259.9 L330.3,255.8 L327.3,244.0 Z' },
  { name: '錦町', cx: 305.4, cy: 382.0, d: 'M310.2,394.9 L316.2,393.0 L305.3,368.3 L293.6,377.8 Z' },
  { name: '長洲町', cx: 240.3, cy: 230.7, d: 'M234.7,227.8 L241.3,235.3 L244.9,228.9 Z' },
  { name: '阿蘇市', cx: 347.7, cy: 224.2, d: 'M323.5,225.4 L325.4,235.7 L347.8,239.8 L374.6,234.6 L373.3,224.0 L359.4,208.0 L330.7,210.2 L325.9,211.1 Z' },
  { name: '高森町', cx: 366.1, cy: 247.5, d: 'M347.8,239.8 L350.8,257.6 L356.5,252.7 L371.2,266.2 L375.2,253.0 L387.2,249.2 L374.6,234.6 Z' }
];
const TEMP_MIYAZAKI_ON_KYUSHU_MUNIS = [
  { name: 'えびの市', cx: 301.0, cy: 408.6, d: 'M295.3,396.3 L285.0,397.3 L280.2,407.0 L307.4,432.3 L312.2,411.4 L323.3,395.2 Z' },
  { name: '三股町', cx: 363.5, cy: 473.3, d: 'M372.9,460.1 L348.0,477.9 L359.1,486.0 L378.0,466.0 Z' },
  { name: '串間市', cx: 378.3, cy: 523.7, d: 'M366.4,492.9 L364.1,495.9 L367.1,530.4 L376.8,545.4 L389.4,549.3 L397.7,522.0 L383.5,522.1 L375.9,497.8 Z' },
  { name: '五ヶ瀬町', cx: 364.4, cy: 286.8, d: 'M372.1,266.9 L355.7,283.4 L351.4,288.1 L350.0,297.3 L349.7,300.5 L367.4,298.7 L377.7,288.0 Z' },
  { name: '国富町', cx: 382.1, cy: 411.8, d: 'M398.3,415.0 L364.8,391.8 L364.1,392.0 L378.0,422.5 L395.6,425.3 Z' },
  { name: '宮崎市', cx: 393.0, cy: 440.5, d: 'M406.3,407.4 L398.3,415.0 L395.6,425.3 L378.0,422.5 L365.5,421.1 L365.8,431.1 L372.9,460.1 L378.0,466.0 L399.9,466.2 L412.3,475.7 L409.7,447.0 L419.1,409.3 Z' },
  { name: '小林市', cx: 337.2, cy: 412.1, d: 'M357.9,415.2 L360.9,392.4 L350.2,386.1 L349.0,385.9 L349.7,387.0 L330.1,387.4 L323.3,395.2 L312.2,411.4 L307.4,432.3 L316.5,442.1 L328.2,423.8 L346.7,431.4 L365.8,431.1 L365.5,421.1 Z' },
  { name: '川南町', cx: 419.8, cy: 376.7, d: 'M425.3,386.6 L430.5,370.2 L407.2,369.3 L416.6,385.7 Z' },
  { name: '延岡市', cx: 442.1, cy: 281.7, d: 'M422.5,308.4 L457.3,317.4 L449.8,314.8 L463.3,284.4 L478.9,276.5 L479.9,251.1 L458.6,249.1 L454.6,260.9 L419.3,260.7 L406.6,289.5 L405.5,304.5 Z' },
  { name: '新富町', cx: 413.2, cy: 402.3, d: 'M419.1,409.3 L421.3,400.9 L408.0,392.7 L406.3,407.4 Z' },
  { name: '日之影町', cx: 403.3, cy: 277.9, d: 'M419.3,260.7 L413.8,248.1 L404.3,253.0 L400.7,267.9 L385.0,290.3 L396.0,303.6 L405.5,304.5 L406.6,289.5 Z' },
  { name: '日南市', cx: 388.9, cy: 489.7, d: 'M412.3,475.7 L399.9,466.2 L378.0,466.0 L359.1,486.0 L366.4,492.9 L375.9,497.8 L383.5,522.1 L397.7,522.0 L397.3,510.1 L411.3,493.6 Z' },
  { name: '日向市', cx: 420.4, cy: 342.0, d: 'M443.9,325.4 L418.9,325.7 L390.5,351.5 L405.0,356.3 L433.7,356.3 Z' },
  { name: '木城町', cx: 399.9, cy: 369.0, d: 'M390.5,351.5 L381.1,355.7 L408.3,391.3 L416.6,385.7 L407.2,369.3 L405.0,356.3 Z' },
  { name: '椎葉村', cx: 357.8, cy: 324.7, d: 'M383.0,325.0 L379.8,315.3 L367.4,298.7 L349.7,300.5 L349.6,301.1 L336.3,306.9 L334.2,311.1 L334.0,316.1 L344.1,342.5 L350.2,352.4 L348.4,353.9 L348.9,355.1 L361.7,355.5 L365.7,349.4 Z' },
  { name: '綾町', cx: 366.1, cy: 409.7, d: 'M378.0,422.5 L364.1,392.0 L360.9,392.4 L357.9,415.2 L365.5,421.1 Z' },
  { name: '美郷町', cx: 395.5, cy: 329.5, d: 'M405.5,304.5 L396.0,303.6 L402.8,317.5 L379.8,315.3 L383.0,325.0 L365.7,349.4 L381.1,355.7 L390.5,351.5 L418.9,325.7 L422.5,308.4 Z' },
  { name: '西米良村', cx: 358.6, cy: 373.5, d: 'M360.9,392.4 L364.1,392.0 L364.8,391.8 L380.2,381.6 L361.7,355.5 L348.9,355.1 L338.8,368.1 L350.2,386.1 Z' },
  { name: '西都市', cx: 386.3, cy: 384.2, d: 'M406.3,407.4 L408.0,392.7 L408.3,391.3 L381.1,355.7 L365.7,349.4 L361.7,355.5 L380.2,381.6 L364.8,391.8 L398.3,415.0 Z' },
  { name: '諸塚村', cx: 384.3, cy: 304.0, d: 'M377.7,288.0 L367.4,298.7 L379.8,315.3 L402.8,317.5 L396.0,303.6 L385.0,290.3 Z' },
  { name: '都城市', cx: 345.5, cy: 457.8, d: 'M365.8,431.1 L346.7,431.4 L331.4,442.4 L316.5,442.1 L310.1,456.4 L329.1,463.7 L335.6,485.3 L364.1,495.9 L366.4,492.9 L359.1,486.0 L348.0,477.9 L372.9,460.1 Z' },
  { name: '都農町', cx: 419.3, cy: 362.8, d: 'M405.0,356.3 L407.2,369.3 L430.5,370.2 L433.7,356.3 Z' },
  { name: '門川町', cx: 434.6, cy: 318.5, d: 'M457.3,317.4 L422.5,308.4 L418.9,325.7 L443.9,325.4 Z' },
  { name: '高千穂町', cx: 386.5, cy: 267.8, d: 'M400.7,267.9 L404.3,253.0 L378.6,251.9 L375.7,252.8 L372.1,266.9 L377.7,288.0 L385.0,290.3 Z' },
  { name: '高原町', cx: 330.8, cy: 434.2, d: 'M346.7,431.4 L328.2,423.8 L316.5,442.1 L331.4,442.4 Z' },
  { name: '高鍋町', cx: 417.6, cy: 392.1, d: 'M408.0,392.7 L421.3,400.9 L425.3,386.6 L416.6,385.7 L408.3,391.3 Z' }
];

const TEMP_KAGOSHIMA_ON_KYUSHU_OUTLINE = "M288.1,539.0 L277.4,529.2 L277.2,509.8 L258.3,502.9 L274.0,494.7 L278.7,509.4 L295.3,494.1 L293.7,479.4 L272.6,474.2 L261.9,485.6 L253.4,501.2 L247.2,540.4 L257.2,561.6 L271.6,569.4 L257.8,591.9 L243.9,580.4 L219.3,572.4 L200.6,571.6 L178.2,538.5 L194.1,541.4 L209.5,523.1 L210.0,488.6 L186.2,463.7 L193.2,432.8 L186.0,417.9 L185.5,396.3 L195.5,391.7 L208.9,395.8 L217.7,383.5 L238.1,392.9 L261.8,379.6 L281.1,397.3 L278.1,406.0 L298.0,430.2 L312.8,441.7 L309.9,458.3 L327.9,463.4 L334.5,485.4 L360.0,493.7 L366.3,504.8 L358.8,528.5 L340.8,532.4 L333.9,543.0 L333.0,550.4 L349.3,556.3 L353.3,566.7 L333.3,577.3 L326.5,593.1 L312.8,601.1 L274.7,619.2 L271.9,606.8 L282.9,600.3 L289.4,578.0 L293.8,563.4 Z";
const TEMP_KAGOSHIMA_ON_KYUSHU_MUNIS = [
  { name: 'いちき串木野市', cx: 204.8, cy: 473.5, d: 'M186.2,463.7 L210.0,488.6 L221.0,473.7 L195.7,461.9 Z' },
  { name: 'さつま町', cx: 238.2, cy: 431.2, d: 'M214.8,424.2 L224.8,446.8 L236.2,453.7 L238.1,440.3 L258.1,442.9 L263.9,434.3 L264.6,431.6 L238.5,411.6 Z' },
  { name: '伊佐市', cx: 259.4, cy: 405.1, d: 'M264.6,431.6 L278.4,418.4 L278.1,406.0 L281.0,397.7 L279.5,397.8 L271.3,388.8 L261.0,381.7 L259.8,380.7 L238.1,392.9 L238.5,411.6 Z' },
  { name: '出水市', cx: 217.7, cy: 404.3, d: 'M209.4,422.8 L214.8,424.2 L238.5,411.6 L238.1,392.9 L217.7,383.5 L208.9,395.8 L195.5,391.7 L197.4,411.9 Z' },
  { name: '南さつま市', cx: 206.2, cy: 542.6, d: 'M232.9,526.3 L230.9,522.8 L209.5,523.1 L194.1,541.4 L178.2,538.5 L200.6,571.6 L209.3,555.3 Z' },
  { name: '南九州市', cx: 231.4, cy: 555.9, d: 'M232.9,526.3 L209.3,555.3 L219.3,572.4 L243.9,580.4 L249.2,563.6 L243.9,541.4 Z' },
  { name: '南大隅町', cx: 291.0, cy: 600.4, d: 'M289.4,578.0 L282.9,600.3 L271.9,606.8 L274.7,619.2 L312.8,601.1 L309.5,597.6 Z' },
  { name: '垂水市', cx: 288.7, cy: 517.0, d: 'M277.2,509.8 L277.4,529.2 L288.1,539.0 L298.3,525.9 L299.2,499.7 L295.3,494.1 L278.7,509.4 Z' },
  { name: '大崎町', cx: 325.3, cy: 527.5, d: 'M317.2,510.2 L313.1,520.8 L322.5,534.1 L333.9,543.0 L340.8,532.4 L323.7,526.4 L325.7,513.1 L323.3,514.9 L322.1,513.8 Z' },
  { name: '姶良市', cx: 259.1, cy: 463.3, d: 'M261.9,485.6 L272.6,474.2 L277.1,461.3 L258.1,442.9 L246.7,452.9 L237.8,473.8 L255.5,470.3 Z' },
  { name: '志布志市', cx: 345.3, cy: 514.9, d: 'M323.7,526.4 L340.8,532.4 L358.8,528.5 L365.2,508.3 L364.6,501.8 L360.5,494.6 L359.4,494.2 L349.3,502.6 L335.5,498.8 L325.7,513.1 Z' },
  { name: '指宿市', cx: 256.7, cy: 575.1, d: 'M257.2,561.6 L249.2,563.6 L243.9,580.4 L257.8,591.9 L271.6,569.4 Z' },
  { name: '日置市', cx: 220.4, cy: 499.7, d: 'M227.1,476.5 L221.0,473.7 L210.0,488.6 L209.5,523.1 L230.9,522.8 L222.7,504.3 L236.7,495.0 Z' },
  { name: '曽於市', cx: 326.1, cy: 488.5, d: 'M322.1,513.8 L323.3,514.9 L325.7,513.1 L335.5,498.8 L349.3,502.6 L359.4,494.2 L345.5,489.0 L334.5,485.4 L327.9,463.4 L309.9,458.3 L314.5,487.6 L304.7,497.2 L317.2,510.2 Z' },
  { name: '東串良町', cx: 328.1, cy: 543.5, d: 'M322.5,534.1 L324.8,548.5 L333.0,550.4 L333.9,543.0 Z' },
  { name: '枕崎市', cx: 209.7, cy: 566.4, d: 'M209.3,555.3 L200.6,571.6 L219.3,572.4 Z' },
  { name: '湧水町', cx: 281.2, cy: 426.6, d: 'M298.0,430.2 L278.1,406.0 L278.4,418.4 L264.6,431.6 L263.9,434.3 L282.0,437.8 Z' },
  { name: '肝付町', cx: 328.5, cy: 570.1, d: 'M324.8,548.5 L315.2,550.5 L317.2,577.4 L309.5,597.6 L312.8,601.1 L326.5,593.1 L333.3,577.3 L353.3,566.7 L349.3,556.3 L333.0,550.4 Z' },
  { name: '薩摩川内市', cx: 216.8, cy: 451.6, d: 'M227.1,476.5 L237.8,473.8 L246.7,452.9 L258.1,442.9 L238.1,440.3 L236.2,453.7 L224.8,446.8 L214.8,424.2 L209.4,422.8 L193.2,432.8 L186.2,463.7 L195.7,461.9 L221.0,473.7 Z' },
  { name: '錦江町', cx: 303.2, cy: 579.5, d: 'M293.8,563.4 L289.4,578.0 L309.5,597.6 L317.2,577.4 Z' },
  { name: '長島町', cx: 179.6, cy: 384.1, d: 'M185.4,372.5 L174.2,373.5 L174.4,392.2 L183.2,399.5 Z' },
  { name: '阿久根市', cx: 194.1, cy: 413.7, d: 'M209.4,422.8 L197.4,411.9 L195.5,391.7 L185.5,396.3 L186.0,417.9 L193.2,432.8 Z' },
  { name: '霧島市', cx: 292.1, cy: 459.7, d: 'M299.2,499.7 L304.7,497.2 L314.5,487.6 L309.9,458.3 L312.8,441.7 L298.0,430.2 L282.0,437.8 L263.9,434.3 L258.1,442.9 L277.1,461.3 L272.6,474.2 L293.7,479.4 L295.3,494.1 Z' },
  { name: '鹿児島市', cx: 248.9, cy: 512.2, d: 'M257.2,561.6 L278.7,509.4 L274.0,494.7 L258.3,502.9 L277.2,509.8 L247.2,540.4 L253.4,501.2 L261.9,485.6 L255.5,470.3 L237.8,473.8 L227.1,476.5 L236.7,495.0 L222.7,504.3 L230.9,522.8 L232.9,526.3 L243.9,541.4 L249.2,563.6 Z' },
  { name: '鹿屋市', cx: 306.3, cy: 538.7, d: 'M317.2,510.2 L304.7,497.2 L299.2,499.7 L298.3,525.9 L288.1,539.0 L293.8,563.4 L317.2,577.4 L315.2,550.5 L324.8,548.5 L322.5,534.1 L313.1,520.8 Z' }
];
const TEMP_KUMAMOTO_ON_KYUSHU_BORDERS = [
  "M305.3,368.3 L316.2,393.0",
  "M311.4,353.1 L305.3,368.3",
  "M329.7,387.4 L311.4,353.1",
  "M320.9,330.3 L303.6,318.0 L286.1,323.5 L286.4,339.6",
  "M321.4,347.1 L320.9,330.3",
  "M313.8,348.4 L321.4,347.1",
  "M293.3,343.4 L313.8,348.4",
  "M286.4,339.6 L293.3,343.4",
  "M293.6,377.8 L294.6,372.5",
  "M310.2,394.9 L293.6,377.8",
  "M282.5,359.4 L285.5,367.5 L271.3,388.8",
  "M294.6,372.5 L282.5,359.4",
  "M293.8,298.4 L283.7,305.9",
  "M322.6,301.6 L300.4,305.4 L293.8,298.4",
  "M334.4,307.7 L322.6,301.6",
  "M320.9,330.3 L333.5,325.4",
  "M278.6,349.9 L286.4,339.6",
  "M269.7,345.3 L278.6,349.9",
  "M251.9,336.1 L250.1,343.4 L269.7,345.3",
  "M283.7,305.9 L277.3,312.2 L268.1,297.0",
  "M330.7,210.2 L359.4,208.0",
  "M360.7,194.7 L334.2,196.8",
  "M359.4,208.0 L364.7,201.5",
  "M248.1,213.6 L250.1,218.4",
  "M259.1,217.8 L256.6,198.2",
  "M250.1,218.4 L259.1,217.8",
  "M347.8,239.8 L325.4,235.7",
  "M350.8,257.6 L347.8,239.8",
  "M330.3,255.8 L350.8,257.6",
  "M327.3,244.0 L330.3,255.8",
  "M325.4,235.7 L327.3,244.0",
  "M284.7,230.7 L287.9,245.0",
  "M302.2,236.1 L284.7,230.7",
  "M304.8,237.7 L302.2,236.1",
  "M287.9,245.0 L304.8,237.7",
  "M259.1,217.8 L267.0,228.0",
  "M267.5,227.2 L272.0,193.9",
  "M267.0,228.0 L267.5,227.2",
  "M296.3,267.0 L293.1,264.2",
  "M289.4,271.3 L296.3,267.0",
  "M293.1,264.2 L289.4,271.3",
  "M326.4,361.6 L321.4,347.1",
  "M339.1,369.8 L326.4,361.6",
  "M313.8,348.4 L311.4,353.1",
  "M323.5,225.4 L302.2,236.1",
  "M325.4,235.7 L323.5,225.4",
  "M309.6,249.2 L327.3,244.0",
  "M309.5,248.5 L309.6,249.2",
  "M304.8,237.7 L309.5,248.5",
  "M179.9,308.9 L172.9,330.1 L162.7,330.2",
  "M282.5,280.9 L263.8,273.8",
  "M245.3,286.4 L282.5,280.9",
  "M292.7,284.5 L292.8,284.0",
  "M293.8,298.4 L292.7,284.5",
  "M267.7,292.8 L283.7,305.9",
  "M292.8,284.0 L282.5,280.9",
  "M294.6,372.5 L299.4,357.3 L293.3,343.4",
  "M278.6,349.9 L282.5,359.4",
  "M314.4,284.2 L326.4,287.9 L322.6,301.6",
  "M324.2,259.9 L312.4,268.2 L314.4,284.2",
  "M330.3,255.8 L324.2,259.9",
  "M371.2,266.2 L356.5,252.7 L350.8,257.6",
  "M271.3,229.8 L285.4,221.7",
  "M267.5,227.2 L271.3,229.8",
  "M285.4,221.7 L298.2,213.0 L304.6,197.2",
  "M289.4,271.3 L289.8,272.9",
  "M312.2,259.6 L296.3,267.0",
  "M324.2,259.9 L312.2,259.6",
  "M309.8,284.4 L314.4,284.2",
  "M289.8,272.9 L309.8,284.4",
  "M326.4,361.6 L339.8,361.3",
  "M240.2,376.8 L233.7,372.5",
  "M258.9,380.0 L240.2,376.8",
  "M261.0,381.7 L258.9,380.0",
  "M240.2,376.8 L239.1,363.2",
  "M292.8,284.0 L289.8,272.9",
  "M267.0,244.1 L257.6,246.8",
  "M271.3,229.8 L267.0,244.1",
  "M284.7,230.7 L285.4,221.7",
  "M301.5,251.5 L287.9,245.0",
  "M293.1,264.2 L301.5,251.5",
  "M244.9,228.9 L241.3,235.3",
  "M250.1,218.4 L244.9,228.9",
  "M267.0,244.1 L267.0,228.0",
  "M269.7,345.3 L258.9,380.0",
  "M359.4,208.0 L373.3,224.0",
  "M292.7,284.5 L309.8,284.4",
  "M309.5,248.5 L301.5,251.5",
  "M312.2,259.6 L309.6,249.2",
  "M293.6,377.8 L305.3,368.3",
  "M234.7,227.8 L244.9,228.9",
  "M323.5,225.4 L325.9,211.1",
  "M347.8,239.8 L374.6,234.6"
];
const TEMP_MIYAZAKI_ON_KYUSHU_BORDERS = [
  "M307.4,432.3 L312.2,411.4 L323.3,395.2",
  "M378.0,466.0 L372.9,460.1",
  "M359.1,486.0 L378.0,466.0",
  "M372.9,460.1 L348.0,477.9 L359.1,486.0",
  "M397.7,522.0 L383.5,522.1 L375.9,497.8 L366.4,492.9",
  "M366.4,492.9 L364.1,495.9",
  "M367.4,298.7 L377.7,288.0",
  "M349.5,300.5 L367.4,298.7",
  "M377.7,288.0 L372.1,266.9",
  "M378.0,422.5 L395.6,425.3 L398.3,415.0",
  "M364.1,392.0 L378.0,422.5",
  "M364.8,391.8 L364.1,392.0",
  "M398.3,415.0 L364.8,391.8",
  "M419.1,409.3 L406.3,407.4",
  "M378.0,466.0 L399.9,466.2 L412.3,475.7",
  "M365.8,431.1 L372.9,460.1",
  "M365.5,421.1 L365.8,431.1",
  "M378.0,422.5 L365.5,421.1",
  "M406.3,407.4 L398.3,415.0",
  "M346.7,431.4 L365.8,431.1",
  "M316.5,442.1 L328.2,423.8 L346.7,431.4",
  "M360.9,392.4 L350.2,386.1",
  "M365.5,421.1 L357.9,415.2 L360.9,392.4",
  "M416.6,385.7 L425.3,386.6",
  "M407.2,369.3 L416.6,385.7",
  "M430.5,370.2 L407.2,369.3",
  "M405.5,304.5 L422.5,308.4",
  "M419.3,260.7 L406.6,289.5 L405.5,304.5",
  "M422.5,308.4 L457.3,317.4",
  "M408.0,392.7 L406.3,407.4",
  "M421.3,400.9 L408.0,392.7",
  "M396.0,303.6 L405.5,304.5",
  "M385.0,290.3 L396.0,303.6",
  "M404.3,253.0 L400.7,267.9 L385.0,290.3",
  "M359.1,486.0 L366.4,492.9",
  "M405.0,356.3 L433.7,356.3",
  "M390.5,351.5 L405.0,356.3",
  "M418.9,325.7 L390.5,351.5",
  "M443.9,325.4 L418.9,325.7",
  "M407.2,369.3 L405.0,356.3",
  "M408.3,391.3 L416.6,385.7",
  "M381.1,355.7 L408.3,391.3",
  "M390.5,351.5 L381.1,355.7",
  "M361.7,355.5 L365.7,349.4",
  "M348.9,355.1 L361.7,355.5",
  "M379.8,315.3 L367.4,298.7",
  "M365.7,349.4 L383.0,325.0 L379.8,315.3",
  "M364.1,392.0 L360.9,392.4",
  "M418.9,325.7 L422.5,308.4",
  "M365.7,349.4 L381.1,355.7",
  "M396.0,303.6 L402.8,317.5 L379.8,315.3",
  "M364.8,391.8 L380.2,381.6 L361.7,355.5",
  "M408.0,392.7 L408.3,391.3",
  "M385.0,290.3 L377.7,288.0",
  "M346.7,431.4 L331.4,442.4 L316.5,442.1"
];
const TEMP_KAGOSHIMA_ON_KYUSHU_BORDERS = [
  "M221.0,473.7 L195.7,461.9 L186.2,463.7",
  "M210.0,488.6 L221.0,473.7",
  "M238.5,411.6 L214.8,424.2",
  "M264.6,431.6 L238.5,411.6",
  "M263.9,434.3 L264.6,431.6",
  "M258.1,442.9 L263.9,434.3",
  "M214.8,424.2 L224.8,446.8 L236.2,453.7 L238.1,440.3 L258.1,442.9",
  "M238.1,392.9 L238.5,411.6",
  "M264.6,431.6 L278.4,418.4 L278.1,406.0",
  "M195.5,391.7 L197.4,411.9 L209.4,422.8",
  "M209.4,422.8 L214.8,424.2",
  "M209.3,555.3 L232.9,526.3",
  "M200.6,571.6 L209.3,555.3",
  "M230.9,522.8 L209.5,523.1",
  "M232.9,526.3 L230.9,522.8",
  "M249.2,563.6 L243.9,541.4 L232.9,526.3",
  "M243.9,580.4 L249.2,563.6",
  "M209.3,555.3 L219.3,572.4",
  "M309.5,597.6 L289.4,578.0",
  "M312.8,601.1 L309.5,597.6",
  "M278.7,509.4 L277.2,509.8",
  "M299.2,499.7 L295.3,494.1",
  "M288.1,539.0 L298.3,525.9 L299.2,499.7",
  "M322.1,513.8 L317.2,510.2",
  "M325.7,513.1 L323.3,514.9",
  "M340.8,532.4 L323.7,526.4 L325.7,513.1",
  "M322.5,534.1 L333.9,543.0",
  "M317.2,510.2 L313.1,520.8 L322.5,534.1",
  "M237.8,473.8 L255.5,470.3 L261.9,485.6",
  "M258.1,442.9 L246.7,452.9 L237.8,473.8",
  "M272.6,474.2 L277.1,461.3 L258.1,442.9",
  "M360.0,493.7 L349.3,502.6 L335.5,498.8 L325.7,513.1",
  "M257.2,561.6 L249.2,563.6",
  "M230.9,522.8 L222.7,504.3 L236.7,495.0 L227.1,476.5",
  "M227.1,476.5 L221.0,473.7",
  "M304.7,497.2 L317.2,510.2",
  "M309.9,458.3 L314.5,487.6 L304.7,497.2",
  "M324.8,548.5 L333.0,550.4",
  "M322.5,534.1 L324.8,548.5",
  "M263.9,434.3 L282.0,437.8 L298.0,430.2",
  "M317.2,577.4 L309.5,597.6",
  "M324.8,548.5 L315.2,550.5 L317.2,577.4",
  "M209.4,422.8 L193.2,432.8",
  "M227.1,476.5 L237.8,473.8",
  "M317.2,577.4 L293.8,563.4",
  "M299.2,499.7 L304.7,497.2"
];

const TEMP_KUMAMOTO_ON_KYUSHU_ISLANDS = [
  "M221.7,337.8 L224.6,322.1 L237.8,312.9 L228.3,338.6 Z",
  "M179.9,308.9 L191.9,307.9 L198.3,344.5 L172.2,376.6 L163.6,381.1 L154.6,369.2 L161.5,358.8 L155.3,347.1 L162.7,330.2 Z"
];
const TEMP_KAGOSHIMA_ON_KYUSHU_ISLANDS = [
  "M185.4,372.5 L183.2,399.5 L174.4,392.2 L174.2,373.5 Z"
];
const TEMP_FUKUOKA_ON_KYUSHU_OUTLINE = "M251.1,134.1 L251.8,134.5 L251.1,135.3 L251.0,147.4 L225.2,168.4 L222.0,176.4 L220.8,184.9 L229.7,200.1 L230.7,203.1 L227.2,217.9 L231.4,217.7 L230.6,215.5 L247.4,213.6 L252.2,201.1 L255.5,196.5 L264.7,196.0 L272.0,193.9 L273.6,185.6 L274.6,185.9 L276.2,181.1 L296.6,192.7 L305.5,195.4 L311.3,179.6 L300.6,165.8 L302.4,147.3 L306.6,141.2 L313.5,125.5 L322.0,117.6 L327.5,113.5 L328.9,113.2 L342.2,113.2 L360.8,113.7 L360.1,96.9 L359.1,91.0 L345.5,87.4 L338.5,76.2 L331.4,63.7 L327.4,51.2 L334.1,20.0 L312.6,34.4 L305.7,26.7 L274.6,29.0 L268.1,35.8 L252.2,35.1 L241.4,42.9 L239.3,62.9 L235.8,68.8 L230.8,71.4 L226.6,95.0 L193.0,86.3 L174.3,97.9 L187.4,103.8 L167.0,121.6 L189.6,119.8 L207.6,117.6 L218.1,124.4 L224.5,128.3 L225.1,129.0 L227.1,130.0 L237.0,129.8 L238.5,127.8 L241.5,129.3 L251.1,127.6 Z";
const TEMP_FUKUOKA_ON_KYUSHU_MUNIS = [
  { name: 'うきは市', cx: 293.1, cy: 153.3, d: 'M283.3,155.7 L300.6,165.8 L302.4,147.3 L283.1,143.7 Z' },
  { name: 'みやこ町', cx: 319.9, cy: 90.5, d: 'M308.0,66.9 L311.8,84.2 L317.2,103.3 L322.0,117.6 L327.4,113.5 L324.0,97.6 L332.5,78.8 L318.0,79.7 L312.5,66.9 Z' },
  { name: 'みやま市', cx: 243.8, cy: 193.1, d: 'M252.1,201.1 L255.5,196.5 L251.0,179.9 L240.8,182.7 L229.7,200.1 L230.7,203.1 Z' },
  { name: '上毛町', cx: 354.1, cy: 106.7, d: 'M342.2,113.2 L360.8,113.7 L360.1,96.9 L357.5,94.9 Z' },
  { name: '中間市', cx: 278.6, cy: 49.1, d: 'M282.3,46.3 L277.7,46.4 L274.0,49.3 L279.8,53.1 Z' },
  { name: '久山町', cx: 247.9, cy: 80.0, d: 'M243.9,87.4 L244.5,87.3 L255.5,81.0 L252.5,71.8 L246.3,76.6 L239.5,78.1 Z' },
  { name: '久留米市', cx: 256.6, cy: 155.5, d: 'M273.5,143.4 L258.3,142.4 L251.0,147.4 L225.2,168.4 L229.8,171.7 L238.7,171.8 L246.9,165.7 L264.9,159.0 L283.3,155.7 L283.1,143.7 Z' },
  { name: '八女市', cx: 279.7, cy: 176.9, d: 'M267.2,168.9 L248.1,170.4 L251.0,179.9 L255.5,196.5 L264.5,196.0 L272.0,193.9 L272.1,193.7 L273.6,185.6 L274.6,185.9 L276.2,181.1 L296.6,192.7 L305.5,195.4 L311.3,179.6 L300.6,165.8 L283.3,155.7 L264.9,159.0 Z' },
  { name: '北九州市', cx: 304.3, cy: 44.6, d: 'M280.4,54.2 L297.0,65.3 L300.1,69.6 L308.0,66.9 L312.5,66.9 L315.2,63.9 L327.4,51.2 L334.1,20.0 L312.6,34.4 L305.7,26.7 L274.6,29.0 L276.0,35.1 L282.3,46.3 L279.8,53.1 Z' },
  { name: '古賀市', cx: 244.7, cy: 69.4, d: 'M253.0,67.6 L239.3,62.9 L235.8,68.8 L246.3,76.6 L252.5,71.8 Z' },
  { name: '吉富町', cx: 358.9, cy: 94.3, d: 'M357.5,94.9 L360.1,96.9 L359.1,91.0 Z' },
  { name: '嘉麻市', cx: 286.1, cy: 108.7, d: 'M279.2,94.6 L274.4,109.1 L272.7,114.3 L273.8,115.5 L294.8,121.0 L299.4,117.3 L298.1,113.1 L293.8,101.0 L289.8,97.3 Z' },
  { name: '大任町', cx: 304.8, cy: 91.9, d: 'M301.8,93.4 L302.6,96.4 L308.0,97.7 L305.9,85.1 L303.7,85.3 Z' },
  { name: '大刀洗町', cx: 265.1, cy: 139.7, d: 'M273.5,143.4 L264.8,134.6 L263.6,133.1 L258.3,142.4 Z' },
  { name: '大川市', cx: 226.1, cy: 175.6, d: 'M222.1,176.3 L221.2,182.1 L231.2,177.9 L229.8,171.7 L225.2,168.4 Z' },
  { name: '大木町', cx: 234.5, cy: 175.1, d: 'M229.8,171.7 L231.2,177.9 L237.5,179.7 L238.7,171.8 Z' },
  { name: '大牟田市', cx: 239.2, cy: 208.6, d: 'M230.7,203.1 L227.2,217.9 L231.3,217.7 L230.6,215.5 L247.4,213.7 L252.1,201.1 Z' },
  { name: '大野城市', cx: 241.7, cy: 112.7, d: 'M239.5,107.3 L236.3,115.3 L239.1,122.0 L243.1,121.1 L247.3,107.4 L242.4,102.7 Z' },
  { name: '太宰府市', cx: 249.2, cy: 111.6, d: 'M257.2,106.3 L247.3,107.4 L243.1,121.1 Z' },
  { name: '宇美町', cx: 251.1, cy: 102.0, d: 'M242.4,102.7 L247.3,107.4 L257.2,106.3 L259.3,103.8 L255.7,95.9 L244.7,98.5 Z' },
  { name: '宗像市', cx: 255.2, cy: 49.3, d: 'M268.2,50.7 L252.2,35.1 L241.4,42.9 L254.3,63.5 L268.8,55.3 Z' },
  { name: '宮若市', cx: 265.0, cy: 70.2, d: 'M276.5,64.0 L268.8,55.3 L254.3,63.5 L253.0,67.6 L252.5,71.8 L255.5,81.0 L257.7,86.7 L274.2,75.8 L281.6,67.3 Z' },
  { name: '小竹町', cx: 279.9, cy: 71.9, d: 'M281.6,67.3 L274.2,75.8 L283.9,72.6 Z' },
  { name: '小郡市', cx: 255.8, cy: 135.9, d: 'M258.3,142.4 L263.6,133.1 L258.6,128.0 L251.1,127.6 L251.0,147.4 Z' },
  { name: '岡垣町', cx: 263.3, cy: 40.6, d: 'M268.2,50.7 L269.4,39.4 L268.1,35.8 L252.2,35.1 Z' },
  { name: '川崎町', cx: 298.4, cy: 102.2, d: 'M293.8,101.0 L298.1,113.1 L302.6,96.4 L301.8,93.4 Z' },
  { name: '広川町', cx: 257.9, cy: 165.8, d: 'M246.9,165.7 L248.1,170.4 L267.2,168.9 L264.9,159.0 Z' },
  { name: '志免町', cx: 240.7, cy: 97.6, d: 'M235.0,93.1 L242.4,102.7 L244.7,98.5 L242.9,95.8 Z' },
  { name: '新宮町', cx: 238.2, cy: 73.7, d: 'M230.8,71.4 L239.5,78.1 L246.3,76.6 L235.8,68.8 Z' },
  { name: '春日市', cx: 236.5, cy: 111.0, d: 'M239.5,107.3 L233.6,110.3 L236.3,115.3 Z' },
  { name: '朝倉市', cx: 285.1, cy: 132.5, d: 'M283.1,143.7 L302.4,147.3 L306.5,141.2 L294.8,121.0 L273.8,115.5 L264.8,134.6 L273.5,143.4 Z' },
  { name: '東峰村', cx: 304.4, cy: 127.5, d: 'M294.8,121.0 L306.5,141.2 L313.5,125.5 L299.4,117.3 Z' },
  { name: '柳川市', cx: 230.4, cy: 186.8, d: 'M231.2,177.9 L221.2,182.1 L220.8,185.0 L229.7,200.1 L240.8,182.7 L237.5,179.7 Z' },
  { name: '水巻町', cx: 278.3, cy: 42.1, d: 'M276.0,35.1 L275.2,34.8 L277.7,46.4 L282.3,46.3 Z' },
  { name: '添田町', cx: 309.6, cy: 111.2, d: 'M299.4,117.3 L313.5,125.5 L322.0,117.6 L317.2,103.3 L308.0,97.7 L302.6,96.4 L298.1,113.1 Z' },
  { name: '田川市', cx: 296.1, cy: 88.4, d: 'M289.8,97.3 L293.8,101.0 L301.8,93.4 L303.7,85.3 L301.0,74.6 L294.2,80.9 L288.0,85.5 Z' },
  { name: '直方市', cx: 285.7, cy: 64.3, d: 'M297.0,65.3 L280.4,54.2 L276.5,64.0 L281.6,67.3 L283.9,72.6 L286.7,73.6 Z' },
  { name: '福岡市', cx: 220.3, cy: 101.2, d: 'M224.0,115.6 L233.6,110.3 L239.5,107.3 L242.4,102.7 L235.0,93.1 L243.9,87.4 L239.5,78.1 L230.8,71.4 L226.6,95.0 L193.0,86.3 L205.3,117.9 L207.6,117.6 L218.1,124.4 L224.5,128.3 L225.2,129.0 L227.1,130.0 Z' },
  { name: '福智町', cx: 294.0, cy: 74.0, d: 'M297.0,65.3 L286.7,73.6 L288.9,81.3 L294.2,80.9 L301.0,74.6 L300.1,69.6 Z' },
  { name: '福津市', cx: 245.7, cy: 57.8, d: 'M241.4,42.9 L239.3,62.9 L253.0,67.6 L254.3,63.5 Z' },
  { name: '筑前町', cx: 266.0, cy: 122.9, d: 'M265.7,113.8 L258.6,128.0 L263.6,133.1 L264.8,134.6 L273.8,115.5 L272.7,114.3 Z' },
  { name: '筑後市', cx: 244.0, cy: 175.4, d: 'M238.7,171.8 L237.5,179.7 L240.8,182.7 L251.0,179.9 L248.1,170.4 L246.9,165.7 Z' },
  { name: '筑紫野市', cx: 253.4, cy: 119.0, d: 'M257.2,106.3 L243.1,121.1 L239.1,122.0 L238.4,127.9 L238.5,127.8 L241.4,129.3 L251.1,127.6 L258.6,128.0 L265.7,113.8 L259.3,103.8 Z' },
  { name: '築上町', cx: 333.7, cy: 93.2, d: 'M332.5,78.8 L324.0,97.6 L327.4,113.5 L328.9,113.2 L345.5,87.4 L338.5,76.2 Z' },
  { name: '篠栗町', cx: 251.6, cy: 88.2, d: 'M257.7,86.7 L255.5,81.0 L244.5,87.3 L244.8,91.4 L254.8,94.6 Z' },
  { name: '粕屋町', cx: 241.2, cy: 91.9, d: 'M235.0,93.1 L242.9,95.8 L244.8,91.4 L244.5,87.3 L243.9,87.4 Z' },
  { name: '糸島市', cx: 188.9, cy: 107.1, d: 'M193.0,86.3 L174.3,97.9 L187.4,103.8 L167.1,121.6 L189.6,119.8 L205.3,117.9 Z' },
  { name: '糸田町', cx: 290.4, cy: 82.6, d: 'M288.0,85.5 L294.2,80.9 L288.9,81.3 Z' },
  { name: '芦屋町', cx: 272.2, cy: 34.5, d: 'M274.6,29.0 L268.1,35.8 L269.4,39.4 L275.2,34.8 L276.0,35.1 Z' },
  { name: '苅田町', cx: 324.7, cy: 59.6, d: 'M327.4,51.2 L315.2,63.9 L331.4,63.7 Z' },
  { name: '行橋市', cx: 325.0, cy: 71.5, d: 'M312.5,66.9 L318.0,79.7 L332.5,78.8 L338.5,76.2 L331.4,63.7 L315.2,63.9 Z' },
  { name: '豊前市', cx: 344.4, cy: 100.8, d: 'M359.1,91.0 L345.5,87.4 L328.9,113.2 L342.2,113.2 L357.5,94.9 Z' },
  { name: '赤村', cx: 311.0, cy: 93.0, d: 'M305.9,85.1 L308.0,97.7 L317.2,103.3 L311.8,84.2 Z' },
  { name: '遠賀町', cx: 272.8, cy: 43.5, d: 'M277.7,46.4 L275.2,34.8 L269.4,39.4 L268.2,50.7 L274.0,49.3 Z' },
  { name: '那珂川市', cx: 231.8, cy: 121.2, d: 'M224.0,115.6 L227.1,130.0 L237.0,129.8 L238.4,127.9 L239.1,122.0 L236.3,115.3 L233.6,110.3 Z' },
  { name: '鞍手町', cx: 274.4, cy: 55.4, d: 'M279.8,53.1 L274.0,49.3 L268.2,50.7 L268.8,55.3 L276.5,64.0 L280.4,54.2 Z' },
  { name: '須恵町', cx: 248.2, cy: 95.1, d: 'M254.8,94.6 L244.8,91.4 L242.9,95.8 L244.7,98.5 L255.7,95.9 Z' },
  { name: '飯塚市', cx: 272.5, cy: 92.2, d: 'M283.9,72.6 L274.2,75.8 L257.7,86.7 L254.8,94.6 L255.7,95.9 L259.3,103.8 L265.7,113.8 L272.7,114.3 L274.4,109.1 L279.2,94.6 L289.8,97.3 L288.0,85.5 L288.9,81.3 L286.7,73.6 Z' },
  { name: '香春町', cx: 305.9, cy: 76.5, d: 'M300.1,69.6 L301.0,74.6 L303.7,85.3 L305.9,85.1 L311.8,84.2 L308.0,66.9 Z' }
];
const TEMP_FUKUOKA_ON_KYUSHU_BORDERS = [
  "M283.1,143.7 L283.3,155.7",
  "M302.4,147.3 L283.1,143.7",
  "M283.3,155.7 L300.6,165.8",
  "M312.5,66.9 L308.0,66.9",
  "M332.5,78.8 L318.0,79.7 L312.5,66.9",
  "M327.4,113.5 L324.0,97.6 L332.5,78.8",
  "M317.2,103.3 L322.0,117.6",
  "M311.8,84.2 L317.2,103.3",
  "M308.0,66.9 L311.8,84.2",
  "M230.7,203.1 L252.1,201.1",
  "M240.8,182.7 L229.7,200.1",
  "M251.0,179.9 L240.8,182.7",
  "M255.5,196.5 L251.0,179.9",
  "M357.5,94.9 L342.2,113.2",
  "M360.1,96.9 L357.5,94.9",
  "M279.8,53.1 L282.3,46.3",
  "M274.0,49.3 L279.8,53.1",
  "M277.7,46.4 L274.0,49.3",
  "M282.3,46.3 L277.7,46.4",
  "M239.5,78.1 L243.9,87.4",
  "M246.3,76.6 L239.5,78.1",
  "M252.5,71.8 L246.3,76.6",
  "M255.5,81.0 L252.5,71.8",
  "M244.5,87.3 L255.5,81.0",
  "M243.9,87.4 L244.5,87.3",
  "M283.1,143.7 L273.5,143.4",
  "M264.9,159.0 L283.3,155.7",
  "M246.9,165.7 L264.9,159.0",
  "M238.7,171.8 L246.9,165.7",
  "M229.8,171.7 L238.7,171.8",
  "M225.2,168.4 L229.8,171.7",
  "M258.3,142.4 L251.0,147.4",
  "M273.5,143.4 L258.3,142.4",
  "M248.1,170.4 L251.0,179.9",
  "M264.9,159.0 L267.2,168.9 L248.1,170.4",
  "M279.8,53.1 L280.4,54.2",
  "M276.0,35.1 L282.3,46.3",
  "M274.6,29.0 L276.0,35.1",
  "M315.2,63.9 L327.4,51.2",
  "M312.5,66.9 L315.2,63.9",
  "M300.1,69.6 L308.0,66.9",
  "M297.0,65.3 L300.1,69.6",
  "M280.4,54.2 L297.0,65.3",
  "M252.5,71.8 L253.0,67.6",
  "M235.8,68.8 L246.3,76.6",
  "M253.0,67.6 L239.3,62.9",
  "M359.1,91.0 L357.5,94.9",
  "M289.8,97.3 L279.2,94.6",
  "M293.8,101.0 L289.8,97.3",
  "M298.1,113.1 L293.8,101.0",
  "M299.4,117.3 L298.1,113.1",
  "M294.8,121.0 L299.4,117.3",
  "M273.8,115.5 L294.8,121.0",
  "M272.7,114.3 L273.8,115.5",
  "M274.4,109.1 L272.7,114.3",
  "M279.2,94.6 L274.4,109.1",
  "M303.7,85.3 L301.8,93.4",
  "M305.9,85.1 L303.7,85.3",
  "M308.0,97.7 L305.9,85.1",
  "M302.6,96.4 L308.0,97.7",
  "M301.8,93.4 L302.6,96.4",
  "M263.6,133.1 L258.3,142.4",
  "M264.8,134.6 L263.6,133.1",
  "M273.5,143.4 L264.8,134.6",
  "M231.2,177.9 L229.8,171.7",
  "M219.5,182.8 L231.2,177.9",
  "M237.5,179.7 L238.7,171.8",
  "M231.2,177.9 L237.5,179.7",
  "M242.4,102.7 L239.5,107.3",
  "M247.3,107.4 L242.4,102.7",
  "M243.1,121.1 L247.3,107.4",
  "M239.1,122.0 L243.1,121.1",
  "M236.3,115.3 L239.1,122.0",
  "M239.5,107.3 L236.3,115.3",
  "M243.1,121.1 L257.2,106.3",
  "M257.2,106.3 L247.3,107.4",
  "M242.4,102.7 L242.4,102.7",
  "M244.7,98.5 L242.4,102.7",
  "M255.7,95.9 L244.7,98.5",
  "M259.3,103.8 L255.7,95.9",
  "M257.2,106.3 L259.3,103.8",
  "M268.8,55.3 L268.2,50.7",
  "M254.3,63.5 L268.8,55.3",
  "M241.4,42.9 L254.3,63.5",
  "M268.2,50.7 L252.2,35.1",
  "M281.6,67.3 L276.5,64.0",
  "M274.2,75.8 L281.6,67.3",
  "M257.7,86.7 L274.2,75.8",
  "M255.5,81.0 L257.7,86.7",
  "M254.3,63.5 L253.0,67.6",
  "M276.5,64.0 L268.8,55.3",
  "M283.9,72.6 L281.6,67.3",
  "M274.2,75.8 L283.9,72.6",
  "M258.6,128.0 L251.1,127.6",
  "M263.6,133.1 L258.6,128.0",
  "M269.4,39.4 L268.1,35.8",
  "M268.2,50.7 L269.4,39.4",
  "M301.8,93.4 L293.8,101.0",
  "M298.1,113.1 L302.6,96.4",
  "M246.9,165.7 L248.1,170.4",
  "M242.9,95.8 L235.0,93.1",
  "M244.7,98.5 L242.9,95.8",
  "M235.0,93.1 L242.4,102.7",
  "M230.8,71.4 L239.5,78.1",
  "M233.6,110.3 L236.3,115.3",
  "M239.5,107.3 L233.6,110.3",
  "M273.8,115.5 L264.8,134.6",
  "M306.5,141.2 L294.8,121.0",
  "M313.5,125.5 L299.4,117.3",
  "M240.8,182.7 L237.5,179.7",
  "M279.2,94.6 L274.4,109.1",
  "M275.2,34.8 L277.7,46.4",
  "M276.0,35.1 L275.2,34.8",
  "M317.2,103.3 L308.0,97.7",
  "M288.0,85.5 L289.8,97.3",
  "M294.2,80.9 L288.0,85.5",
  "M301.0,74.6 L294.2,80.9",
  "M303.7,85.3 L301.0,74.6",
  "M286.7,73.6 L297.0,65.3",
  "M283.9,72.6 L286.7,73.6",
  "M280.4,54.2 L276.5,64.0",
  "M193.0,86.3 L205.8,119.3",
  "M235.0,93.1 L243.9,87.4",
  "M227.1,130.0 L224.0,115.6 L233.6,110.3",
  "M301.0,74.6 L300.1,69.6",
  "M288.9,81.3 L294.2,80.9",
  "M286.7,73.6 L288.9,81.3",
  "M272.7,114.3 L265.7,113.8",
  "M265.7,113.8 L258.6,128.0",
  "M265.7,113.8 L259.3,103.8",
  "M239.1,122.0 L238.2,129.8",
  "M338.5,76.2 L332.5,78.8",
  "M328.9,113.2 L345.5,87.4",
  "M254.8,94.6 L257.7,86.7",
  "M244.8,91.4 L254.8,94.6",
  "M244.5,87.3 L244.8,91.4",
  "M242.9,95.8 L244.8,91.4",
  "M288.9,81.3 L288.0,85.5",
  "M269.4,39.4 L275.2,34.8",
  "M315.2,63.9 L331.4,63.7",
  "M311.8,84.2 L305.9,85.1",
  "M268.2,50.7 L274.0,49.3",
  "M255.7,95.9 L254.8,94.6"
];
const TEMP_SAGA_ON_KYUSHU_OUTLINE = "M137.5,111.1 L136.7,123.9 L138.9,134.7 L133.2,152.4 L126.8,153.8 L128.1,155.3 L123.9,158.3 L124.4,158.9 L123.1,159.8 L134.4,165.9 L134.8,173.4 L140.6,174.5 L143.5,178.6 L151.2,180.1 L153.3,191.2 L152.8,191.9 L154.9,194.8 L146.6,198.6 L161.1,200.4 L162.6,212.3 L165.5,209.5 L166.3,210.1 L168.0,211.5 L171.2,208.4 L172.0,209.1 L174.5,211.1 L174.9,216.2 L175.4,215.7 L176.9,216.2 L178.1,216.6 L180.0,214.5 L191.7,217.8 L189.7,202.9 L183.0,189.6 L200.0,174.8 L220.8,185.1 L223.8,164.4 L231.1,159.6 L241.5,147.1 L251.8,134.5 L238.5,127.8 L234.5,133.2 L231.9,133.6 L230.0,134.3 L224.5,128.3 L218.1,124.4 L207.6,117.6 L189.6,119.8 L156.5,122.4 L156.3,111.1 L144.3,103.5 Z";
const TEMP_SAGA_ON_KYUSHU_MUNIS = [
  { name: 'みやき町', cx: 234.2, cy: 146.4, d: 'M234.5,133.2 L231.9,133.6 L229.2,153.9 L228.4,156.0 L231.1,159.6 L241.5,147.1 Z' },
  { name: '上峰町', cx: 230.4, cy: 140.6, d: 'M229.2,153.9 L231.9,133.6 L230.0,134.3 Z' },
  { name: '伊万里市', cx: 144.7, cy: 152.5, d: 'M133.2,152.4 L126.8,153.8 L128.1,155.3 L123.9,158.3 L124.4,158.9 L123.1,159.8 L134.4,165.9 L134.4,166.7 L144.3,168.5 L165.7,156.6 L145.4,130.9 L138.9,134.7 Z' },
  { name: '佐賀市', cx: 206.1, cy: 148.7, d: 'M218.1,124.4 L207.6,117.6 L189.6,119.8 L185.2,145.5 L198.4,146.3 L199.8,174.6 L200.0,174.8 L220.8,185.1 L223.8,164.4 L216.7,142.0 L207.1,135.9 Z' },
  { name: '吉野ヶ里町', cx: 227.8, cy: 140.4, d: 'M228.4,156.0 L229.2,153.9 L230.0,134.3 L224.5,128.3 Z' },
  { name: '唐津市', cx: 162.7, cy: 130.6, d: 'M185.2,145.5 L189.6,119.8 L156.5,122.4 L156.3,111.1 L144.3,103.5 L137.5,111.1 L136.7,123.9 L138.9,134.7 L145.4,130.9 L165.7,156.6 L166.0,157.1 Z' },
  { name: '多久市', cx: 179.7, cy: 157.4, d: 'M166.0,157.1 L178.7,166.2 L182.4,166.4 L189.1,164.5 L185.2,145.5 Z' },
  { name: '大町町', cx: 180.7, cy: 169.3, d: 'M178.7,166.2 L177.8,172.2 L183.9,171.5 L182.4,166.4 Z' },
  { name: '太良町', cx: 185.2, cy: 211.7, d: 'M174.8,214.5 L174.9,215.6 L176.9,216.2 L178.1,216.5 L180.0,214.5 L191.7,217.8 L189.7,202.9 Z' },
  { name: '嬉野市', cx: 164.9, cy: 194.9, d: 'M152.8,191.9 L154.9,194.8 L146.6,198.6 L161.1,200.4 L162.7,212.2 L165.5,209.5 L166.3,210.1 L168.0,211.5 L169.1,210.4 L175.2,187.0 L174.2,178.8 L153.3,191.2 Z' },
  { name: '小城市', cx: 193.6, cy: 158.2, d: 'M185.2,145.5 L189.1,164.5 L193.2,172.0 L199.8,174.6 L198.4,146.3 Z' },
  { name: '有田町', cx: 142.1, cy: 172.9, d: 'M151.2,180.1 L144.3,168.5 L134.4,166.7 L134.8,173.4 L140.6,174.5 L143.4,178.5 Z' },
  { name: '武雄市', cx: 162.0, cy: 172.5, d: 'M165.7,156.6 L144.3,168.5 L151.2,180.1 L153.3,191.2 L174.2,178.8 L177.8,172.2 L178.7,166.2 L166.0,157.1 Z' },
  { name: '江北町', cx: 187.5, cy: 168.7, d: 'M182.4,166.4 L183.9,171.5 L193.2,172.0 L189.1,164.5 Z' },
  { name: '白石町', cx: 184.8, cy: 179.2, d: 'M199.8,174.6 L193.2,172.0 L183.9,171.5 L177.8,172.2 L174.2,178.8 L175.2,187.0 L183.0,189.6 L200.0,174.8 Z' },
  { name: '神埼市', cx: 220.7, cy: 142.1, d: 'M223.8,164.4 L231.1,159.6 L228.4,156.0 L224.5,128.3 L218.1,124.4 L207.1,135.9 L216.7,142.0 Z' },
  { name: '鳥栖市', cx: 242.3, cy: 136.3, d: 'M251.8,134.5 L238.5,127.8 L234.5,133.2 L241.5,147.1 Z' },
  { name: '鹿島市', cx: 178.9, cy: 200.9, d: 'M175.2,187.0 L169.1,210.4 L171.2,208.4 L172.0,209.1 L174.5,211.1 L174.9,216.2 L189.7,202.9 L183.0,189.6 Z' }
];
const TEMP_SAGA_ON_KYUSHU_BORDERS = [
  "M241.5,147.1 L234.5,133.2",
  "M228.4,156.0 L231.1,159.6",
  "M229.2,153.9 L228.4,156.0",
  "M231.9,133.6 L229.2,153.9",
  "M230.0,134.3 L229.2,153.9",
  "M165.7,156.6 L145.4,130.9 L138.9,134.7",
  "M144.3,168.5 L165.7,156.6",
  "M130.4,166.0 L144.3,168.5",
  "M223.8,164.4 L216.7,142.0 L207.1,135.9 L218.1,124.4",
  "M199.8,174.6 L200.0,174.8",
  "M185.2,145.5 L198.4,146.3 L199.8,174.6",
  "M189.6,119.8 L185.2,145.5",
  "M224.5,128.3 L228.4,156.0",
  "M166.0,157.1 L185.2,145.5",
  "M165.7,156.6 L166.0,157.1",
  "M137.5,111.1 L136.7,123.9",
  "M238.5,127.8 L251.8,134.5",
  "M189.1,164.5 L185.2,145.5",
  "M182.4,166.4 L189.1,164.5",
  "M178.7,166.2 L182.4,166.4",
  "M166.0,157.1 L178.7,166.2",
  "M183.9,171.5 L182.4,166.4",
  "M177.8,172.2 L183.9,171.5",
  "M178.7,166.2 L177.8,172.2",
  "M189.7,202.9 L174.1,215.6",
  "M174.2,178.8 L153.3,191.2",
  "M175.2,187.0 L174.2,178.8",
  "M168.9,212.3 L175.2,187.0",
  "M193.2,172.0 L199.8,174.6",
  "M189.1,164.5 L193.2,172.0",
  "M151.2,180.1 L144.3,168.5",
  "M174.2,178.8 L177.8,172.2",
  "M183.9,171.5 L193.2,172.0",
  "M175.2,187.0 L183.0,189.6"
];
const TEMP_NAGASAKI_ON_KYUSHU_OUTLINE = "M105.4,135.0 L97.4,144.6 L89.1,155.3 L83.9,170.1 L96.5,175.8 L98.7,167.4 L105.8,165.2 L99.6,173.1 L100.7,179.1 L111.0,190.9 L118.0,184.9 L125.2,186.3 L126.8,200.6 L139.4,201.3 L153.2,216.0 L148.5,229.4 L161.0,246.3 L156.5,247.3 L142.8,238.9 L141.6,243.6 L135.2,242.8 L129.7,249.9 L125.2,243.5 L129.4,225.2 L124.8,220.9 L130.3,219.6 L120.1,210.0 L119.7,204.4 L105.3,194.2 L100.1,206.7 L102.6,214.2 L96.8,218.7 L97.7,229.0 L103.8,235.8 L106.6,244.5 L114.9,253.6 L126.4,259.8 L129.7,271.4 L134.0,271.5 L122.8,295.2 L115.7,302.1 L127.9,297.1 L132.9,287.5 L142.6,283.2 L153.0,267.1 L158.8,262.7 L164.8,263.6 L183.6,253.6 L191.0,256.3 L195.6,264.3 L194.4,272.0 L183.1,279.4 L182.4,284.7 L189.4,297.8 L200.2,293.5 L204.7,285.2 L219.1,282.0 L224.1,267.9 L224.9,257.5 L218.7,244.0 L212.4,245.0 L210.6,254.9 L211.2,238.6 L185.7,246.0 L190.2,240.9 L186.5,235.0 L194.9,228.9 L199.1,219.8 L198.0,219.5 L180.0,214.5 L171.4,224.0 L175.1,218.7 L174.5,211.1 L172.0,209.1 L171.2,208.4 L163.2,216.2 L161.1,200.4 L146.6,198.6 L154.9,194.8 L140.6,174.5 L134.8,173.4 L134.4,165.9 L122.4,159.4 L128.1,155.3 L124.7,151.3 L124.3,138.7 L110.1,143.8 Z";
const TEMP_NAGASAKI_ON_KYUSHU_MUNIS = [
  { name: '長崎市', cx: 131.2, cy: 257.6, d: 'M134.2,252.7 L129.3,252.1 L129.7,249.9 L125.2,243.5 L129.4,225.2 L124.8,220.9 L116.1,225.3 L115.6,232.2 L103.8,235.8 L106.6,244.5 L114.9,253.6 L126.4,259.8 L129.7,271.4 L134.0,271.5 L122.8,295.2 L115.7,302.1 L127.9,297.1 L132.9,287.5 L142.6,283.2 L153.0,267.1 L158.8,262.7 L159.1,253.9 L153.6,253.1 L147.4,250.9 L145.4,253.0 L139.1,253.8 L138.1,255.8 Z' },
  { name: '佐世保市', cx: 113.4, cy: 170.6, d: 'M128.1,155.3 L111.8,155.8 L111.7,152.8 L109.8,151.2 L97.4,144.6 L89.1,155.3 L83.9,170.1 L96.5,175.8 L98.7,167.4 L95.9,163.7 L100.7,157.6 L106.2,160.2 L105.8,165.2 L99.6,173.1 L100.7,179.1 L111.0,190.9 L118.0,184.9 L125.2,186.3 L126.8,200.6 L132.9,198.4 L134.8,185.2 L140.6,174.5 L134.8,173.4 L134.4,165.9 L122.4,159.4 Z' },
  { name: '南島原市', cx: 204.1, cy: 280.3, d: 'M224.1,267.9 L219.7,265.8 L209.2,265.3 L206.8,269.4 L203.4,270.6 L190.0,283.3 L182.4,284.7 L189.4,297.8 L200.2,293.5 L204.7,285.2 L219.1,282.0 Z' },
  { name: '長与町', cx: 139.8, cy: 249.1, d: 'M147.4,250.9 L141.6,243.6 L135.2,242.8 L135.4,245.3 L134.2,252.7 L138.1,255.8 L139.1,253.8 L145.4,253.0 Z' },
  { name: '時津町', cx: 132.8, cy: 248.9, d: 'M135.4,245.3 L135.2,242.8 L129.7,249.9 L129.3,252.1 L134.2,252.7 Z' },
  { name: '東彼杵町', cx: 153.4, cy: 207.0, d: 'M146.6,198.6 L139.4,201.3 L153.2,216.0 L157.8,217.1 L163.2,216.2 L161.1,200.4 Z' },
  { name: '島原市', cx: 216.8, cy: 256.6, d: 'M224.1,267.9 L224.9,257.5 L218.7,244.0 L212.4,245.0 L210.6,254.9 L207.4,258.8 L207.1,262.0 L209.5,262.9 L213.2,264.3 L209.2,265.3 L219.7,265.8 Z' },
  { name: '諫早市', cx: 173.5, cy: 239.2, d: 'M183.6,253.6 L187.2,250.0 L185.7,246.0 L190.2,240.9 L186.5,235.0 L194.9,228.9 L199.1,219.8 L198.0,219.5 L180.0,214.5 L171.4,224.0 L164.0,226.4 L161.9,238.6 L161.0,246.3 L156.5,247.3 L142.8,238.9 L141.6,243.6 L147.4,250.9 L153.6,253.1 L159.1,253.9 L158.8,262.7 L164.8,263.6 Z' },
  { name: '大村市', cx: 161.2, cy: 224.9, d: 'M161.0,246.3 L161.9,238.6 L164.0,226.4 L171.4,224.0 L175.1,218.7 L174.5,211.1 L172.0,209.1 L171.2,208.4 L163.2,216.2 L157.8,217.1 L153.2,216.0 L148.5,229.4 Z' },
  { name: '平戸市', cx: 70.1, cy: 155.1, d: 'M84.3,131.0 L77.3,141.5 L64.2,143.7 L65.9,155.0 L59.0,157.8 L54.5,172.1 L63.7,175.5 L75.7,159.6 L72.4,156.5 L80.3,151.2 L86.6,141.4 Z' },
  { name: '松浦市', cx: 113.8, cy: 146.8, d: 'M128.1,155.3 L124.7,151.3 L124.3,138.7 L110.1,143.8 L105.4,135.0 L97.4,144.6 L109.8,151.2 L111.7,152.8 L111.8,155.8 Z' },
  { name: '西海市', cx: 110.2, cy: 216.5, d: 'M103.8,235.8 L115.6,232.2 L116.1,225.3 L124.8,220.9 L130.3,219.6 L120.1,210.0 L119.7,204.4 L105.3,194.2 L100.1,206.7 L102.6,214.2 L96.8,218.7 L97.7,229.0 Z' },
  { name: '雲仙市', cx: 198.6, cy: 258.4, d: 'M209.2,265.3 L213.2,264.3 L209.5,262.9 L207.1,262.0 L207.4,258.8 L210.6,254.9 L211.2,238.6 L185.7,246.0 L187.2,250.0 L183.6,253.6 L191.0,256.3 L195.6,264.3 L194.4,272.0 L183.1,279.4 L182.4,284.7 L190.0,283.3 L203.4,270.6 L206.8,269.4 Z' },
  { name: '川棚町', cx: 135.7, cy: 198.1, d: 'M126.8,200.6 L139.4,201.3 L139.3,194.0 L137.2,192.5 L132.9,198.4 Z' },
  { name: '波佐見町', cx: 142.8, cy: 189.5, d: 'M132.9,198.4 L137.2,192.5 L139.3,194.0 L139.4,201.3 L146.6,198.6 L154.9,194.8 L140.6,174.5 L134.8,185.2 Z' },
  { name: '佐々町', cx: 101.4, cy: 162.7, d: 'M105.8,165.2 L106.2,160.2 L100.7,157.6 L95.9,163.7 L98.7,167.4 Z' }
];
const TEMP_NAGASAKI_ON_KYUSHU_BORDERS = [
  "M158.8,262.7 L159.1,253.9 L153.6,253.1 L147.4,250.9 L145.4,253.0 L139.1,253.8 L138.1,255.8 L134.2,252.7 L129.3,252.1 L129.7,249.9",
  "M124.8,220.9 L116.1,225.3 L115.6,232.2 L103.8,235.8",
  "M122.4,159.4 L111.8,155.8 L111.7,152.8 L109.8,151.2 L97.4,144.6",
  "M98.7,167.4 L95.9,163.7 L100.7,157.6 L106.2,160.2 L105.8,165.2",
  "M126.8,200.6 L132.9,198.4 L134.8,185.2 L138.6,180.8",
  "M210.6,254.9 L207.4,258.8 L207.1,262.0 L209.5,262.9 L213.2,264.3 L209.2,265.3 L219.7,265.8 L224.1,267.9",
  "M183.6,253.6 L187.2,250.0 L185.7,246.0",
  "M171.4,224.0 L164.0,226.4 L161.9,238.6 L161.0,246.3",
  "M141.6,243.6 L147.4,250.9",
  "M163.2,216.2 L157.8,217.1 L153.2,216.0",
  "M182.4,284.7 L190.0,283.3 L203.4,270.6 L206.8,269.4 L209.2,265.3",
  "M135.2,242.8 L135.4,245.3 L134.2,252.7",
  "M132.9,198.4 L137.2,192.5 L139.3,194.0 L139.4,201.3",
  "M146.6,198.6 L139.4,201.3"
];
const TEMP_OITA_ON_KYUSHU_OUTLINE = "M360.8,112.7 L360.8,113.7 L342.2,113.2 L328.9,113.2 L327.5,113.5 L322.4,117.3 L317.3,123.3 L309.0,135.8 L306.6,141.2 L302.4,147.3 L302.1,150.3 L306.5,159.0 L303.3,169.3 L311.3,179.6 L305.5,195.4 L304.9,195.2 L304.2,197.0 L304.6,197.2 L323.0,209.2 L327.5,210.9 L330.7,210.2 L332.0,205.5 L329.5,182.4 L330.9,182.3 L330.1,178.6 L341.4,176.3 L347.0,181.7 L350.6,182.5 L355.1,189.4 L360.7,194.7 L364.7,201.5 L367.5,208.8 L378.1,227.0 L378.1,238.8 L387.2,249.2 L382.0,250.9 L383.7,252.1 L404.3,253.0 L413.8,248.1 L419.3,260.7 L454.6,260.9 L458.6,249.1 L479.9,251.1 L479.4,263.0 L499.5,268.6 L512.8,236.6 L491.1,223.8 L511.5,207.0 L486.0,205.3 L494.9,194.7 L476.9,194.6 L483.8,181.4 L493.5,164.3 L476.1,169.8 L453.4,161.8 L436.9,169.0 L424.0,164.8 L420.1,147.3 L441.9,141.8 L460.3,125.4 L462.9,96.7 L449.8,77.5 L428.8,75.9 L407.9,99.5 L380.9,96.7 L364.0,89.2 L362.3,112.7 Z";
const TEMP_OITA_ON_KYUSHU_MUNIS = [
  { name: '中津市', cx: 353.5, cy: 121.6, d: 'M364.0,89.2 L362.3,112.7 L360.8,112.7 L360.8,113.7 L342.2,113.2 L328.9,113.2 L327.4,113.5 L322.6,117.2 L317.3,123.3 L340.9,144.2 L348.4,138.3 L369.5,144.0 L380.9,96.7 Z' },
  { name: '九重町', cx: 370.2, cy: 180.7, d: 'M386.3,181.6 L383.8,168.1 L375.3,156.4 L350.6,182.5 L355.0,189.2 L360.7,194.7 L364.7,201.5 L366.0,204.8 L376.9,195.5 Z' },
  { name: '佐伯市', cx: 473.3, cy: 241.4, d: 'M417.4,256.3 L419.3,260.7 L454.6,260.9 L458.6,249.1 L479.9,251.1 L479.4,263.0 L499.5,268.6 L512.8,236.6 L491.1,223.8 L511.5,207.0 L473.1,214.6 L471.8,226.6 L449.5,230.6 Z' },
  { name: '別府市', cx: 411.8, cy: 159.5, d: 'M424.0,164.8 L420.1,147.3 L405.7,146.7 L402.6,151.8 L399.4,171.8 L424.6,168.4 Z' },
  { name: '国東市', cx: 447.6, cy: 99.6, d: 'M436.9,101.5 L440.4,120.5 L460.3,125.4 L462.9,96.7 L449.8,77.5 L428.8,75.9 Z' },
  { name: '大分市', cx: 446.9, cy: 182.5, d: 'M453.0,203.5 L462.0,185.2 L483.8,181.4 L493.5,164.3 L476.1,169.8 L453.4,161.8 L436.9,169.1 L424.0,164.8 L424.6,168.4 L427.3,179.1 L413.2,192.1 L406.1,202.2 L416.3,206.8 L430.6,196.7 Z' },
  { name: '宇佐市', cx: 391.0, cy: 125.4, d: 'M405.7,146.7 L408.7,145.0 L404.0,117.4 L411.5,108.3 L407.9,99.5 L380.9,96.7 L369.5,144.0 L390.6,153.5 L402.6,151.8 Z' },
  { name: '日出町', cx: 421.1, cy: 142.7, d: 'M420.1,147.3 L441.9,141.8 L412.3,137.3 L408.7,145.0 L405.7,146.7 Z' },
  { name: '日田市', cx: 321.4, cy: 166.1, d: 'M306.5,141.2 L302.4,147.3 L302.1,150.3 L306.5,159.0 L303.3,169.3 L311.3,179.6 L305.5,195.4 L304.9,195.2 L304.2,197.0 L304.6,197.2 L323.3,209.4 L327.3,210.8 L330.7,210.2 L331.9,205.5 L329.5,182.4 L330.9,182.3 L330.1,178.6 L341.4,176.3 L344.3,179.1 L338.1,166.2 L340.9,144.2 L317.3,123.3 L308.8,136.1 Z' },
  { name: '杵築市', cx: 428.1, cy: 126.2, d: 'M411.5,108.3 L404.0,117.4 L408.7,145.0 L412.3,137.3 L441.9,141.8 L460.3,125.4 L440.4,120.5 L436.9,101.5 L425.0,119.5 Z' },
  { name: '津久見市', cx: 485.5, cy: 207.1, d: 'M473.1,214.6 L511.5,207.0 L486.0,205.3 L494.9,194.7 L471.7,206.4 Z' },
  { name: '玖珠町', cx: 358.6, cy: 157.9, d: 'M338.1,166.2 L344.3,179.1 L347.0,181.7 L350.6,182.5 L375.3,156.4 L383.8,168.1 L390.6,153.5 L369.5,144.0 L348.4,138.3 L340.9,144.2 Z' },
  { name: '由布市', cx: 400.5, cy: 178.7, d: 'M424.6,168.4 L399.4,171.8 L402.6,151.8 L390.6,153.5 L383.8,168.1 L386.3,181.6 L376.9,195.5 L394.2,199.1 L413.2,192.1 L427.3,179.1 Z' },
  { name: '竹田市', cx: 389.5, cy: 221.2, d: 'M376.9,195.5 L366.0,204.8 L367.6,209.0 L378.1,227.0 L378.2,238.7 L387.2,249.2 L381.9,250.9 L383.6,252.1 L400.9,252.9 L407.0,228.9 L398.9,215.7 L406.1,202.2 L413.2,192.1 L394.2,199.1 Z' },
  { name: '臼杵市', cx: 464.9, cy: 206.6, d: 'M453.0,203.5 L444.8,220.9 L449.5,230.6 L471.8,226.6 L473.1,214.6 L471.7,206.4 L494.9,194.7 L476.9,194.6 L483.8,181.4 L462.0,185.2 Z' },
  { name: '豊後大野市', cx: 424.6, cy: 224.0, d: 'M398.9,215.7 L407.0,228.9 L400.9,252.9 L404.3,253.0 L413.8,248.1 L417.4,256.3 L449.5,230.6 L444.8,220.9 L453.0,203.5 L430.6,196.7 L416.3,206.8 L406.1,202.2 Z' },
  { name: '豊後高田市', cx: 423.5, cy: 99.1, d: 'M428.8,75.9 L407.9,99.5 L411.5,108.3 L425.0,119.5 L436.9,101.5 Z' }
];
const TEMP_OITA_ON_KYUSHU_BORDERS = [
  "M369.5,144.0 L380.9,96.7",
  "M340.9,144.2 L348.4,138.3 L369.5,144.0",
  "M317.3,123.3 L340.9,144.2",
  "M365.4,205.3 L376.9,195.5",
  "M383.8,168.1 L375.3,156.4 L350.6,182.5",
  "M376.9,195.5 L386.3,181.6 L383.8,168.1",
  "M473.1,214.6 L471.8,226.6 L449.5,230.6",
  "M511.5,207.0 L473.1,214.6",
  "M449.5,230.6 L416.3,257.2",
  "M424.6,168.4 L424.0,164.8",
  "M402.6,151.8 L399.4,171.8 L424.6,168.4",
  "M405.7,146.7 L402.6,151.8",
  "M420.1,147.3 L405.7,146.7",
  "M428.8,75.9 L436.9,101.5",
  "M436.9,101.5 L440.4,120.5 L460.3,125.4",
  "M406.1,202.2 L416.3,206.8 L430.6,196.7 L453.0,203.5",
  "M413.2,192.1 L406.1,202.2",
  "M424.6,168.4 L427.3,179.1 L413.2,192.1",
  "M453.0,203.5 L462.0,185.2 L483.8,181.4",
  "M390.6,153.5 L402.6,151.8",
  "M369.5,144.0 L390.6,153.5",
  "M411.5,108.3 L407.9,99.5",
  "M408.7,145.0 L404.0,117.4 L411.5,108.3",
  "M405.7,146.7 L408.7,145.0",
  "M441.9,141.8 L412.3,137.3 L408.7,145.0",
  "M345.4,181.3 L338.1,166.2 L340.9,144.2",
  "M436.9,101.5 L425.0,119.5 L411.5,108.3",
  "M494.9,194.7 L471.7,206.4 L473.1,214.6",
  "M383.8,168.1 L390.6,153.5",
  "M376.9,195.5 L394.2,199.1 L413.2,192.1",
  "M393.2,259.2 L400.4,255.0 L407.0,228.9 L398.9,215.7 L406.1,202.2",
  "M453.0,203.5 L444.8,220.9 L449.5,230.6"
];
const TEMP_NAGASAKI_ON_KYUSHU_ISLANDS = [
  "M59.0,157.8 L54.5,172.1 L63.7,175.5 L75.7,159.6 L72.4,156.5 L80.3,151.2 L86.6,141.4 L84.3,131.0 L77.3,141.5 L64.2,143.7 L65.9,155.0 Z"
];






// 鹿児島県の離島(種子島・屋久島・奄美群島・徳之島・沖永良部島・与論島・トカラ列島・三島村)。地図隅の別テーブルに表示
const KAGOSHIMA_INSET_ISLANDS = [
  { name: '種子島', nameEn: 'Tanegashima', group: 'north', viewW: 40.7, viewH: 100, d: 'M19.4,77.3 L22.3,80.8 L20.9,85.0 L22.5,87.2 L20.3,88.3 L20.6,91.4 L16.3,91.0 L7.3,96.0 L5.2,91.9 L6.4,84.2 L4.0,76.5 L7.6,76.0 L16.0,62.4 L18.6,55.6 L16.8,43.3 L22.1,34.2 L24.3,33.9 L25.8,24.4 L32.9,15.7 L36.7,23.8 L35.2,28.1 L36.0,39.0 L32.3,45.3 L32.9,53.7 L29.8,56.6 L29.2,61.3 L25.1,63.0 L20.1,73.6 L20.7,76.8 Z' },
  { name: '屋久島', nameEn: 'Yakushima', group: 'north', viewW: 103.7, viewH: 100, d: 'M43.1,4.0 L99.4,39.0 L95.4,66.0 L70.6,91.3 L50.8,96.0 L25.1,92.1 L15.4,81.0 L15.3,69.3 L4.8,48.8 L4.0,33.3 L17.3,31.8 L32.1,16.2 L32.1,8.7 L41.3,9.8 Z' },
  { name: 'トカラ列島', nameEn: 'Tokara Islands', group: 'north', viewW: 70.7, viewH: 100.0, d: 'M39.5,28.2 L39.6,28.5 L40.0,28.8 L40.0,28.9 L40.2,29.1 L40.3,28.9 L40.4,28.3 L40.3,28.2 L40.3,27.9 L40.4,27.7 L40.1,27.5 L39.9,27.6 L39.7,27.8 L39.5,28.2 Z M28.1,63.1 L28.1,62.8 L27.9,62.8 L27.8,62.9 L27.8,63.2 L27.8,63.2 L28.1,63.1 Z M26.5,63.5 L26.5,63.6 L26.7,63.8 L26.9,63.6 L27.0,63.3 L27.0,63.0 L26.8,63.1 L26.7,62.9 L26.5,63.0 L26.2,63.3 L26.3,63.4 L26.5,63.5 Z M17.7,68.7 L18.2,69.2 L18.6,69.8 L18.8,69.9 L19.3,70.1 L19.4,70.3 L19.9,70.7 L20.0,70.5 L19.8,70.0 L19.8,69.7 L19.8,69.3 L20.0,69.0 L20.0,68.8 L20.0,68.4 L19.8,68.3 L19.3,68.2 L19.2,68.4 L18.8,68.4 L18.8,68.3 L18.7,68.2 L18.3,68.3 L17.9,68.5 L17.7,68.7 Z M6.0,93.2 L5.9,93.0 L5.9,92.6 L5.6,92.7 L5.5,92.9 L5.7,93.2 L6.0,93.2 Z M4.5,95.3 L4.0,95.3 L4.0,95.4 L4.3,95.9 L4.5,95.9 L4.7,95.6 L4.8,95.7 L5.4,96.0 L5.8,95.9 L5.9,95.5 L5.9,95.2 L5.6,95.0 L5.3,94.9 L4.8,95.3 L4.7,95.5 L4.5,95.4 L4.5,95.3 Z M64.4,4.8 L64.5,4.9 L64.6,5.2 L64.4,5.3 L64.1,5.6 L63.9,5.7 L64.0,6.0 L63.8,6.2 L63.6,6.3 L63.7,6.5 L64.0,6.6 L64.0,6.9 L64.1,7.0 L63.9,7.2 L64.5,7.8 L64.8,7.9 L64.9,7.9 L65.2,8.0 L65.5,8.3 L65.8,8.4 L66.3,8.3 L66.5,8.1 L66.7,7.6 L66.5,7.4 L66.5,7.2 L66.3,6.9 L66.0,6.8 L65.8,6.5 L65.6,6.1 L65.4,5.8 L65.1,5.4 L64.9,4.8 L64.9,4.7 L64.7,4.2 L64.7,4.0 L64.4,4.1 L64.2,4.5 L64.4,4.8 Z M39.9,11.8 L39.9,12.0 L40.0,12.4 L40.5,12.6 L40.7,12.7 L40.7,12.6 L41.0,12.7 L41.2,12.6 L41.4,12.3 L41.3,12.2 L41.2,11.8 L41.1,11.6 L40.7,11.2 L40.4,11.2 L40.3,10.9 L40.1,11.1 L40.0,11.0 L39.8,11.2 L39.9,11.8 Z M45.7,13.9 L45.8,13.6 L45.9,13.5 L45.7,13.3 L45.5,13.4 L45.5,13.8 L45.6,14.0 L45.7,13.9 Z M60.1,13.7 L59.8,13.9 L59.7,14.5 L59.5,14.6 L59.4,15.2 L59.5,15.3 L59.5,15.5 L59.7,15.7 L59.6,16.0 L59.8,16.3 L59.9,16.5 L60.1,16.6 L60.3,16.5 L60.5,16.8 L60.6,17.0 L60.6,17.1 L61.1,18.0 L61.6,18.4 L61.9,18.5 L62.3,18.4 L62.5,18.2 L62.9,18.0 L63.5,18.0 L63.8,18.1 L63.9,18.3 L64.2,18.1 L64.6,18.1 L64.8,17.9 L64.6,17.7 L64.5,17.4 L64.0,17.1 L63.8,16.9 L63.3,16.4 L63.2,15.6 L63.3,15.4 L63.4,15.3 L63.4,15.1 L63.3,14.9 L63.1,14.9 L63.0,14.8 L63.1,14.6 L63.1,14.4 L62.9,14.5 L62.8,14.4 L62.7,14.2 L62.4,14.0 L62.0,14.0 L61.8,13.9 L61.6,13.9 L61.6,13.5 L61.4,13.4 L61.3,13.5 L61.0,13.4 L60.9,13.5 L60.5,13.4 L60.4,13.5 L60.1,13.6 L60.1,13.7 Z M52.5,29.6 L52.1,29.5 L52.0,29.7 L51.6,29.7 L51.2,29.8 L51.0,30.0 L50.7,30.4 L50.3,30.3 L50.3,30.5 L50.2,30.6 L50.1,30.5 L49.7,30.9 L50.0,31.2 L49.7,31.7 L50.0,32.0 L50.1,32.3 L50.0,32.5 L50.1,32.6 L50.1,33.2 L50.3,33.7 L50.6,34.0 L50.5,34.2 L50.6,34.6 L51.2,34.7 L51.6,34.4 L51.5,34.1 L51.5,33.9 L51.9,33.6 L52.0,33.4 L52.3,33.1 L52.5,33.0 L52.9,32.8 L53.0,32.4 L53.1,32.2 L53.3,31.8 L53.3,31.5 L53.4,31.3 L53.2,31.1 L53.3,30.4 L53.5,30.0 L53.5,29.6 L53.3,29.4 L53.3,29.4 L52.8,29.5 L52.7,29.7 L52.5,29.6 Z M43.4,45.2 L43.5,45.5 L43.7,45.6 L44.0,45.8 L44.1,45.9 L43.9,46.4 L44.1,46.6 L44.6,46.6 L44.9,46.5 L45.1,46.6 L45.5,46.4 L45.6,46.2 L45.5,45.8 L45.3,45.6 L45.2,45.4 L45.1,45.1 L44.9,44.5 L44.4,44.3 L44.0,44.2 L43.9,44.4 L43.6,44.7 L43.5,44.9 L43.4,45.2 Z' },
  { name: '三島村', nameEn: 'Mishima Village', group: 'north', viewW: 138.2, viewH: 100, d: 'M46.7,4.0 L131.1,51.6 L73.1,96.0 L4.0,48.6 Z' },
  { name: '奄美群島', nameEn: 'Amami Islands', group: 'south', viewW: 217.2, viewH: 100, d: 'M80.0,70.8 L63.7,75.7 L63.3,84.6 L49.1,81.1 L58.1,92.3 L56.3,96.0 L54.1,90.0 L48.1,91.4 L39.7,86.5 L37.0,74.2 L32.5,77.8 L34.7,71.7 L39.6,68.6 L32.2,69.6 L35.4,65.3 L30.3,65.4 L31.2,72.3 L28.6,72.4 L22.7,66.3 L21.4,68.7 L13.5,67.5 L11.8,62.7 L7.9,64.2 L4.0,59.6 L10.9,59.4 L14.6,55.9 L21.1,60.2 L21.5,56.2 L24.5,55.0 L29.5,60.2 L30.7,57.0 L34.9,58.1 L35.9,54.3 L39.6,55.1 L39.2,52.2 L33.5,51.2 L33.0,54.5 L29.8,54.6 L25.9,52.3 L21.1,46.6 L41.8,40.7 L49.4,31.0 L55.5,34.5 L60.2,29.7 L62.9,34.2 L64.9,31.6 L61.8,26.8 L73.1,28.1 L75.5,20.2 L80.4,23.0 L82.9,19.8 L84.6,27.7 L90.1,23.0 L87.6,20.3 L88.8,14.2 L95.0,7.3 L98.1,11.0 L106.3,4.1 L112.3,4.0 L105.1,19.6 L111.4,14.8 L112.0,10.4 L113.8,14.1 L111.9,18.4 L116.2,18.8 L117.0,14.9 L117.9,20.9 L110.4,22.8 L99.8,39.3 L93.3,40.6 L94.4,46.1 L82.1,50.9 L75.8,49.4 L76.3,56.3 L72.4,62.0 L64.6,60.8 L75.6,65.5 Z M203.8,31.1 L200.2,38.7 L196.5,39.0 L190.3,52.4 L183.8,54.8 L177.4,49.2 L179.2,42.3 L185.8,41.4 L198.2,29.2 Z' },
  { name: '徳之島', nameEn: 'Tokunoshima', group: 'south', viewW: 59.7, viewH: 100, d: 'M51.1,74.6 L39.9,92.2 L22.8,96.0 L16.4,82.8 L4.6,73.1 L10.8,68.0 L13.3,57.8 L7.0,47.6 L8.1,36.9 L4.0,34.3 L11.3,9.3 L34.8,9.8 L35.9,17.1 L29.4,20.7 L34.5,23.6 L33.5,37.4 L55.7,54.4 Z' },
  { name: '沖永良部島', nameEn: 'Okinoerabujima', group: 'south', viewW: 150.3, viewH: 100, d: 'M142.3,5.6 L54.8,90.3 L27.3,96.0 L9.8,80.5 L4.0,45.4 L11.0,33.5 L57.7,39.7 L127.7,4.0 Z' },
  { name: '与論島', nameEn: 'Yoronjima', group: 'south', viewW: 121.3, viewH: 100, d: 'M69.8,4.0 L38.0,42.5 L4.0,44.7 L9.0,66.9 L56.9,96.0 L115.6,94.1 L108.7,37.3 Z' }
];


const OTHER_PREF_MUNICIPALITIES = {
  '40': [
    { name: 'うきは市', cx: 374.9, cy: 389.8, d: 'M351.2,396.7 L350.6,365.0 L401.4,374.4 L396.6,423.1 Z' },
    { name: 'みやこ町', cx: 445.7, cy: 223.5, d: 'M416.0,163.2 L427.9,163.3 L442.3,196.8 L480.4,194.6 L458.2,243.8 L467.2,285.6 L453.0,296.5 L440.4,258.8 L426.2,208.8 Z' },
    { name: 'みやま市', cx: 246.1, cy: 497.0, d: 'M269.3,515.8 L213.1,521.2 L210.4,513.2 L239.4,467.6 L266.4,460.3 L278.1,503.7 Z' },
    { name: '上毛町', cx: 540.1, cy: 262.5, d: 'M506.1,284.9 L546.2,236.7 L553.1,242.0 L554.9,286.3 Z' },
    { name: '中間市', cx: 338.4, cy: 115.6, d: 'M348.7,109.1 L342.0,127.0 L326.7,117.1 L336.4,109.3 Z' },
    { name: '久山町', cx: 255.9, cy: 198.7, d: 'M247.6,217.0 L236.1,192.8 L254.0,188.8 L270.4,176.2 L278.2,200.3 L249.3,216.9 Z' },
    { name: '久留米市', cx: 278.1, cy: 399.8, d: 'M325.4,364.3 L350.6,365.0 L351.2,396.7 L302.8,405.4 L255.6,423.0 L233.9,438.9 L210.7,438.6 L198.5,430.1 L266.4,374.7 L285.6,361.7 Z' },
    { name: '八女市', cx: 331.2, cy: 453.9, d: 'M302.8,405.4 L351.2,396.7 L396.6,423.1 L424.8,459.4 L409.5,501.0 L325.7,475.2 L320.6,501.4 L278.1,503.7 L266.4,460.3 L258.7,435.1 L308.8,431.4 Z' },
    { name: '北九州市', cx: 396.2, cy: 115.6, d: 'M343.6,129.8 L342.0,127.0 L348.7,109.1 L332.1,79.7 L328.3,63.6 L410.2,57.7 L428.1,77.9 L484.6,40.0 L467.1,122.0 L435.0,155.3 L427.9,163.3 L416.0,163.2 L395.4,170.3 L387.2,159.0 Z' },
    { name: '古賀市', cx: 251.6, cy: 170.2, d: 'M271.7,165.2 L270.4,176.2 L254.0,188.8 L226.4,168.2 L235.5,152.7 Z' },
    { name: '吉富町', cx: 549.9, cy: 235.1, d: 'M546.2,236.7 L550.5,226.7 L553.1,242.0 Z' },
    { name: '嘉麻市', cx: 358.9, cy: 274.5, d: 'M340.4,236.0 L368.3,243.2 L378.7,252.9 L390.1,284.6 L393.4,295.8 L381.5,305.5 L326.2,290.9 L323.4,287.8 L327.8,274.1 Z' },
    { name: '大任町', cx: 406.7, cy: 228.1, d: 'M399.9,232.8 L404.9,211.6 L410.6,211.0 L416.1,244.2 L401.8,240.7 Z' },
    { name: '大刀洗町', cx: 303.3, cy: 351.1, d: 'M325.4,364.3 L285.6,361.7 L299.5,337.2 L302.6,341.2 Z' },
    { name: '大川市', cx: 201.8, cy: 447.8, d: 'M198.5,430.1 L210.7,438.6 L214.3,454.9 L183.6,467.7 Z' },
    { name: '大木町', cx: 222.4, cy: 448.0, d: 'M210.7,438.6 L233.9,438.9 L230.9,459.6 L214.3,454.9 Z' },
    { name: '大牟田市', cx: 234.9, cy: 538.7, d: 'M269.3,515.8 L253.4,557.9 L203.7,560.0 L213.1,521.2 Z' },
    { name: '大野城市', cx: 240.9, cy: 283.4, d: 'M236.2,269.3 L243.8,257.3 L256.7,269.8 L245.7,305.8 L235.0,308.0 L227.8,290.5 Z' },
    { name: '太宰府市', cx: 261.7, cy: 280.8, d: 'M282.7,266.9 L245.7,305.8 L256.7,269.8 Z' },
    { name: '宇美町', cx: 263.3, cy: 256.7, d: 'M243.8,257.3 L243.7,257.2 L249.8,246.3 L278.6,239.4 L288.1,260.3 L282.7,266.9 L256.7,269.8 Z' },
    { name: '宗像市', cx: 282.1, cy: 117.6, d: 'M311.5,120.8 L313.2,132.8 L275.1,154.4 L241.1,100.3 L269.6,79.6 Z' },
    { name: '宮若市', cx: 300.0, cy: 172.3, d: 'M333.3,155.6 L346.8,164.2 L327.3,186.6 L284.0,215.2 L278.2,200.3 L270.4,176.2 L271.7,165.2 L275.1,154.4 L313.2,132.8 Z' },
    { name: '小竹町', cx: 342.3, cy: 176.3, d: 'M346.8,164.2 L352.7,178.2 L327.3,186.6 Z' },
    { name: '小郡市', cx: 280.9, cy: 344.1, d: 'M285.6,361.7 L266.4,374.7 L266.6,322.8 L286.2,323.9 L299.5,337.2 Z' },
    { name: '岡垣町', cx: 301.8, cy: 93.2, d: 'M311.5,120.8 L269.6,79.6 L311.3,81.5 L314.8,90.9 Z' },
    { name: '川崎町', cx: 392.6, cy: 252.8, d: 'M378.7,252.9 L399.9,232.8 L401.8,240.7 L390.1,284.6 Z' },
    { name: '広川町', cx: 281.5, cy: 423.7, d: 'M255.6,423.0 L302.8,405.4 L308.8,431.4 L258.7,435.1 Z' },
    { name: '志免町', cx: 240.7, cy: 243.8, d: 'M224.3,232.2 L245.1,239.3 L249.8,246.3 L243.7,257.2 Z' },
    { name: '新宮町', cx: 232.4, cy: 181.2, d: 'M213.3,175.0 L226.4,168.2 L254.0,188.8 L236.1,192.8 Z' },
    { name: '春日市', cx: 228.2, cy: 279.1, d: 'M236.2,269.3 L227.8,290.5 L220.5,277.4 Z' },
    { name: '朝倉市', cx: 357.1, cy: 342.8, d: 'M350.6,365.0 L325.4,364.3 L302.6,341.2 L326.2,290.9 L381.5,305.5 L412.3,358.5 L401.4,374.4 Z' },
    { name: '東峰村', cx: 404.4, cy: 319.3, d: 'M381.5,305.5 L393.4,295.8 L430.6,317.3 L412.3,358.5 Z' },
    { name: '柳川市', cx: 215.7, cy: 472.6, d: 'M230.9,459.6 L239.4,467.6 L210.4,513.2 L183.6,467.7 L214.3,454.9 Z' },
    { name: '桂川町', cx: 334.1, cy: 255.1, d: 'M327.8,274.1 L340.4,236.0 Z' },
    { name: '水巻町', cx: 336.8, cy: 94.2, d: 'M332.1,79.7 L348.7,109.1 L336.4,109.3 L329.8,78.8 Z' },
    { name: '添田町', cx: 417.9, cy: 276.8, d: 'M393.4,295.8 L390.1,284.6 L401.8,240.7 L416.1,244.2 L440.4,258.8 L453.0,296.5 L430.6,317.3 Z' },
    { name: '田川市', cx: 384.7, cy: 219.4, d: 'M368.3,243.2 L363.6,212.1 L379.9,200.0 L397.8,183.5 L404.9,211.6 L399.9,232.8 L378.7,252.9 Z' },
    { name: '直方市', cx: 353.9, cy: 161.3, d: 'M387.2,159.0 L360.1,180.8 L352.7,178.2 L346.8,164.2 L333.3,155.6 L343.6,129.8 Z' },
    { name: '福岡市', cx: 209.8, cy: 250.1, d: 'M203.4,329.0 L147.5,301.0 L114.0,214.3 L202.1,237.2 L213.3,175.0 L236.1,192.8 L247.6,217.0 L224.3,232.2 L243.7,257.2 L243.8,257.3 L236.2,269.3 L220.5,277.4 L195.4,291.2 Z' },
    { name: '福智町', cx: 381.0, cy: 182.5, d: 'M387.2,159.0 L395.4,170.3 L397.8,183.5 L379.9,200.0 L365.8,201.2 L360.1,180.8 Z' },
    { name: '福津市', cx: 255.8, cy: 143.2, d: 'M241.1,100.3 L275.1,154.4 L271.7,165.2 L235.5,152.7 Z' },
    { name: '筑前町', cx: 307.1, cy: 311.2, d: 'M304.9,286.5 L323.4,287.8 L326.2,290.9 L302.6,341.2 L299.5,337.2 L286.2,323.9 Z' },
    { name: '筑後市', cx: 247.5, cy: 447.4, d: 'M233.9,438.9 L255.6,423.0 L258.7,435.1 L266.4,460.3 L239.4,467.6 L230.9,459.6 Z' },
    { name: '筑紫野市', cx: 267.8, cy: 300.4, d: 'M288.1,260.3 L304.9,286.5 L286.2,323.9 L266.6,322.8 L232.8,328.6 L235.0,308.0 L245.7,305.8 L282.7,266.9 Z' },
    { name: '築上町', cx: 481.3, cy: 235.6, d: 'M480.4,194.6 L496.2,187.6 L514.6,217.2 L471.0,284.9 L467.2,285.6 L458.2,243.8 Z' },
    { name: '篠栗町', cx: 267.6, cy: 219.2, d: 'M284.0,215.2 L276.4,236.1 L250.0,227.7 L249.3,216.9 L278.2,200.3 Z' },
    { name: '粕屋町', cx: 243.3, cy: 226.6, d: 'M224.3,232.2 L247.6,217.0 L249.3,216.9 L250.0,227.7 L245.1,239.3 Z' },
    { name: '糸島市', cx: 94.2, cy: 265.5, d: 'M147.5,301.0 L45.1,307.4 L99.3,260.1 L64.9,244.8 L114.0,214.3 Z' },
    { name: '糸田町', cx: 369.8, cy: 204.4, d: 'M363.6,212.1 L365.8,201.2 L379.9,200.0 Z' },
    { name: '芦屋町', cx: 323.3, cy: 78.9, d: 'M328.3,63.6 L332.1,79.7 L329.8,78.8 L314.8,90.9 L311.3,81.5 Z' },
    { name: '苅田町', cx: 459.9, cy: 144.0, d: 'M467.1,122.0 L477.5,154.8 L435.0,155.3 Z' },
    { name: '行橋市', cx: 459.9, cy: 175.4, d: 'M427.9,163.3 L435.0,155.3 L477.5,154.8 L496.2,187.6 L480.4,194.6 L442.3,196.8 Z' },
    { name: '豊前市', cx: 517.7, cy: 250.1, d: 'M550.5,226.7 L546.2,236.7 L506.1,284.9 L471.0,284.9 L514.6,217.2 Z' },
    { name: '赤村', cx: 423.3, cy: 230.7, d: 'M410.6,211.0 L426.2,208.8 L440.4,258.8 L416.1,244.2 Z' },
    { name: '遠賀町', cx: 323.8, cy: 103.4, d: 'M336.4,109.3 L326.7,117.1 L311.5,120.8 L314.8,90.9 L329.8,78.8 Z' },
    { name: '那珂川市', cx: 219.2, cy: 304.1, d: 'M220.5,277.4 L227.8,290.5 L235.0,308.0 L232.8,328.6 L203.4,329.0 L195.4,291.2 Z' },
    { name: '鞍手町', cx: 328.4, cy: 130.5, d: 'M342.0,127.0 L343.6,129.8 L333.3,155.6 L313.2,132.8 L311.5,120.8 L326.7,117.1 Z' },
    { name: '須恵町', cx: 260.0, cy: 237.8, d: 'M276.4,236.1 L278.6,239.4 L249.8,246.3 L245.1,239.3 L250.0,227.7 Z' },
    { name: '飯塚市', cx: 325.8, cy: 231.2, d: 'M352.7,178.2 L360.1,180.8 L365.8,201.2 L363.6,212.1 L368.3,243.2 L340.4,236.0 L327.8,274.1 L323.4,287.8 L304.9,286.5 L288.1,260.3 L278.6,239.4 L276.4,236.1 L284.0,215.2 L327.3,186.6 Z' },
    { name: '香春町', cx: 408.5, cy: 191.4, d: 'M395.4,170.3 L416.0,163.2 L426.2,208.8 L410.6,211.0 L404.9,211.6 L397.8,183.5 Z' }
  ],
  '41': [
    { name: 'みやき町', cx: 484.2, cy: 238.6, d: 'M491.2,182.6 L518.9,238.0 L477.4,287.7 L466.8,273.6 L469.9,265.3 L480.8,184.4 Z' },
    { name: '上峰町', cx: 474.6, cy: 212.3, d: 'M469.9,265.3 L473.1,187.1 L480.8,184.4 Z' },
    { name: '伊万里市', cx: 114.3, cy: 257.7, d: 'M110.4,188.6 L136.5,173.7 L217.0,276.0 L131.9,323.2 L76.6,313.1 L76.5,325.1 L31.3,300.4 L52.7,285.0 L41.2,271.5 L39.6,269.5 L87.9,259.2 Z' },
    { name: '佐賀市', cx: 378.0, cy: 242.5, d: 'M425.8,147.7 L382.0,193.5 L420.1,217.7 L448.5,306.8 L436.4,389.4 L353.7,348.2 L352.8,347.7 L347.3,234.8 L295.0,231.7 L312.2,129.4 L383.9,120.5 Z' },
    { name: '吉野ヶ里町', cx: 465.3, cy: 222.3, d: 'M466.8,273.6 L451.3,163.3 L473.1,187.1 L469.9,265.3 Z' },
    { name: '唐津市', cx: 180.8, cy: 165.1, d: 'M295.0,231.7 L218.5,277.8 L217.0,276.0 L136.5,173.7 L110.4,188.6 L101.5,145.6 L105.0,94.6 L132.1,64.6 L179.7,94.6 L180.7,139.6 L312.2,129.4 Z' },
    { name: '基山町', cx: 533.6, cy: 174.3, d: 'M560.0,187.7 L507.2,161.0 Z' },
    { name: '多久市', cx: 275.2, cy: 289.1, d: 'M218.5,277.8 L295.0,231.7 L310.2,307.3 L283.5,314.8 L268.8,314.1 Z' },
    { name: '大町町', cx: 276.8, cy: 325.5, d: 'M268.8,314.1 L283.5,314.8 L289.7,335.1 L265.3,338.1 Z' },
    { name: '太良町', cx: 301.1, cy: 502.1, d: 'M312.8,460.3 L322.3,529.9 L317.9,528.7 L261.9,513.3 L249.6,509.7 Z' },
    { name: '嬉野市', cx: 212.6, cy: 422.8, d: 'M167.7,413.5 L251.1,364.2 L254.8,397.0 L229.0,496.6 L219.5,489.0 L216.3,486.7 L185.7,516.0 L177.8,456.1 L123.0,449.3 L154.3,434.6 Z' },
    { name: '小城市', cx: 326.4, cy: 291.7, d: 'M295.0,231.7 L347.3,234.8 L352.8,347.7 L326.7,337.2 L310.2,307.3 Z' },
    { name: '有田町', cx: 111.6, cy: 340.0, d: 'M76.6,313.1 L131.9,323.2 L159.3,369.5 L100.0,357.6 L78.1,353.6 Z' },
    { name: '武雄市', cx: 209.9, cy: 334.6, d: 'M217.0,276.0 L218.5,277.8 L268.8,314.1 L265.3,338.1 L251.1,364.2 L167.7,413.5 L159.3,369.5 L131.9,323.2 Z' },
    { name: '江北町', cx: 302.5, cy: 323.6, d: 'M283.5,314.8 L310.2,307.3 L326.7,337.2 L289.7,335.1 Z' },
    { name: '玄海町', cx: 103.2, cy: 120.1, d: 'M105.0,94.6 L101.5,145.6 Z' },
    { name: '白石町', cx: 297.5, cy: 359.4, d: 'M352.8,347.7 L353.7,348.2 L286.1,407.3 L254.8,397.0 L251.1,364.2 L265.3,338.1 L289.7,335.1 L326.7,337.2 Z' },
    { name: '神埼市', cx: 438.8, cy: 227.2, d: 'M448.5,306.8 L420.1,217.7 L382.0,193.5 L425.8,147.7 L451.3,163.3 L466.8,273.6 L477.4,287.7 Z' },
    { name: '鳥栖市', cx: 519.3, cy: 192.3, d: 'M560.0,187.7 L518.9,238.0 L491.2,182.6 L507.2,161.0 Z' },
    { name: '鹿島市', cx: 266.8, cy: 454.6, d: 'M286.1,407.3 L312.8,460.3 L217.1,545.8 L231.0,525.6 L249.6,509.7 L229.0,496.6 L254.8,397.0 Z' }
  ],
  '43': [
    { name: 'あさぎり町', cx: 400.1, cy: 497.7, d: 'M401.3,536.9 L376.9,481.8 L390.6,447.8 L431.6,524.4 Z' },
    { name: '上天草市', cx: 204.3, cy: 391.2, d: 'M190.0,413.5 L196.6,378.5 L226.0,357.8 L204.7,415.2 Z' },
    { name: '五木村', cx: 373.2, cy: 408.9, d: 'M334.6,417.5 L334.0,381.6 L373.1,369.2 L411.9,396.7 L413.0,434.3 L396.0,437.1 L350.1,426.1 Z' },
    { name: '人吉市', cx: 338.7, cy: 507.4, d: 'M353.0,491.0 L350.8,502.9 L387.9,541.1 L319.2,547.6 L301.0,527.5 L332.7,479.9 L326.0,461.8 Z' },
    { name: '八代市', cx: 336.6, cy: 376.4, d: 'M328.6,342.1 L351.2,325.3 L365.9,341.1 L415.6,332.6 L442.0,346.3 L440.0,385.7 L411.9,396.7 L373.1,369.2 L334.0,381.6 L334.6,417.5 L317.2,440.6 L297.4,430.2 L253.6,426.1 L257.5,409.6 L270.9,395.7 L256.7,357.0 L293.8,322.3 L314.4,356.2 Z' },
    { name: '南小国町', cx: 476.8, cy: 110.4, d: 'M497.9,123.3 L433.8,128.3 L441.5,98.3 L500.9,93.5 L509.8,108.8 Z' },
    { name: '南関町', cx: 261.1, cy: 132.2, d: 'M253.5,146.5 L249.0,135.7 L268.1,101.4 L273.6,145.2 Z' },
    { name: '南阿蘇村', cx: 446.3, cy: 209.5, d: 'M421.8,185.2 L471.9,194.3 L478.7,234.2 L432.9,230.1 L426.1,203.7 Z' },
    { name: '合志市', cx: 353.7, cy: 188.9, d: 'M338.1,205.9 L330.9,174.1 L370.0,186.0 L375.9,189.7 Z' },
    { name: '和水町', cx: 285.6, cy: 134.5, d: 'M291.3,167.9 L273.6,145.2 L268.1,101.4 L302.6,91.7 L292.5,166.3 Z' },
    { name: '嘉島町', cx: 349.3, cy: 256.3, d: 'M349.6,248.9 L356.8,255.2 L341.4,264.8 Z' },
    { name: '多良木町', cx: 426.3, cy: 474.1, d: 'M413.0,434.3 L424.1,466.7 L452.6,485.1 L476.3,523.4 L431.6,524.4 L390.6,447.8 L396.0,437.1 Z' },
    { name: '大津町', cx: 397.8, cy: 193.7, d: 'M370.0,186.0 L417.7,162.2 L421.8,185.2 L426.1,203.7 L386.6,215.4 L386.4,213.9 L375.9,189.7 Z' },
    { name: '天草市', cx: 77.3, cy: 430.6, d: 'M96.5,348.9 L123.3,346.6 L137.7,428.4 L79.4,500.1 L60.1,510.4 L40.0,483.6 L55.5,460.5 L41.6,434.3 L58.2,396.4 L81.0,396.3 Z' },
    { name: '宇土市', cx: 284.3, cy: 285.1, d: 'M284.1,270.5 L326.0,286.3 L242.7,298.6 Z' },
    { name: '宇城市', cx: 308.7, cy: 309.2, d: 'M349.0,293.1 L348.8,294.4 L351.2,325.3 L328.6,342.1 L292.9,312.9 L230.2,321.1 L242.7,298.6 L326.0,286.3 Z' },
    { name: '小国町', cx: 458.1, cy: 75.4, d: 'M500.9,93.5 L441.5,98.3 L432.3,57.5 L457.6,52.3 Z' },
    { name: '山江村', cx: 340.8, cy: 449.0, d: 'M317.2,440.6 L334.6,417.5 L350.1,426.1 L363.7,457.0 L353.0,491.0 L326.0,461.8 Z' },
    { name: '山都町', cx: 447.8, cy: 279.0, d: 'M442.0,346.3 L415.6,332.6 L424.1,302.0 L397.4,293.7 L392.9,257.8 L419.3,239.3 L432.9,230.1 L478.7,234.2 L491.5,223.2 L524.3,253.4 L479.0,303.8 L476.0,331.4 Z' },
    { name: '山鹿市', cx: 325.3, cy: 125.8, d: 'M332.4,153.9 L301.0,172.0 L292.5,166.3 L302.6,91.7 L311.9,63.2 L375.4,99.2 L361.1,134.4 Z' },
    { name: '御船町', cx: 378.7, cy: 264.0, d: 'M342.4,268.4 L341.4,264.8 L356.8,255.2 L392.3,238.7 L419.3,239.3 L392.9,257.8 L397.4,293.7 L387.0,294.0 Z' },
    { name: '水上村', cx: 436.8, cy: 432.6, d: 'M411.9,396.7 L440.0,385.7 L477.4,446.2 L454.1,466.0 L424.1,466.7 L413.0,434.3 Z' },
    { name: '水俣市', cx: 236.2, cy: 515.3, d: 'M216.9,491.1 L231.3,500.8 L273.3,507.8 L278.0,511.7 L258.3,533.8 L205.6,541.6 L189.8,520.2 Z' },
    { name: '氷川町', cx: 307.4, cy: 333.4, d: 'M328.6,342.1 L314.4,356.2 L293.8,322.3 L292.9,312.9 Z' },
    { name: '津奈木町', cx: 225.7, cy: 487.4, d: 'M231.3,500.8 L216.9,491.1 L229.0,470.3 Z' },
    { name: '湯前町', cx: 443.6, cy: 472.6, d: 'M452.6,485.1 L424.1,466.7 L454.1,466.0 Z' },
    { name: '熊本市', cx: 325.0, cy: 228.7, d: 'M341.4,264.8 L342.4,268.4 L349.0,293.1 L326.0,286.3 L284.1,270.5 L270.3,210.0 L291.3,204.0 L301.0,172.0 L332.4,153.9 L330.9,174.1 L338.1,205.9 L368.5,220.6 L349.6,248.9 Z' },
    { name: '玉名市', cx: 265.1, cy: 175.4, d: 'M291.3,204.0 L270.3,210.0 L233.9,184.4 L241.8,170.0 L253.5,146.5 L273.6,145.2 L291.3,167.9 Z' },
    { name: '玉東町', cx: 294.0, cy: 177.6, d: 'M291.3,204.0 L291.3,167.9 L292.5,166.3 L301.0,172.0 Z' },
    { name: '球磨村', cx: 303.7, cy: 479.9, d: 'M297.4,430.2 L317.2,440.6 L326.0,461.8 L332.7,479.9 L301.0,527.5 L278.0,511.7 L273.3,507.8 Z' },
    { name: '産山村', cx: 512.2, cy: 130.4, d: 'M528.9,159.0 L497.9,123.3 L509.8,108.8 Z' },
    { name: '甲佐町', cx: 356.8, cy: 287.5, d: 'M349.0,293.1 L342.4,268.4 L387.0,294.0 L348.8,294.4 Z' },
    { name: '益城町', cx: 373.4, cy: 232.1, d: 'M349.6,248.9 L368.5,220.6 L386.4,213.9 L386.6,215.4 L392.3,238.7 L356.8,255.2 Z' },
    { name: '相良村', cx: 368.7, cy: 463.4, d: 'M350.8,502.9 L353.0,491.0 L363.7,457.0 L350.1,426.1 L396.0,437.1 L390.6,447.8 L376.9,481.8 Z' },
    { name: '美里町', cx: 384.3, cy: 311.9, d: 'M415.6,332.6 L365.9,341.1 L351.2,325.3 L348.8,294.4 L387.0,294.0 L397.4,293.7 L424.1,302.0 Z' },
    { name: '芦北町', cx: 257.0, cy: 457.5, d: 'M257.5,409.6 L253.6,426.1 L297.4,430.2 L273.3,507.8 L231.3,500.8 L229.0,470.3 Z' },
    { name: '苓北町', cx: 78.6, cy: 380.5, d: 'M96.5,348.9 L81.0,396.3 L58.2,396.4 Z' },
    { name: '荒尾市', cx: 234.7, cy: 152.0, d: 'M253.5,146.5 L241.8,170.0 L219.1,167.6 L210.0,140.1 L249.0,135.7 Z' },
    { name: '菊池市', cx: 372.9, cy: 148.6, d: 'M330.9,174.1 L332.4,153.9 L361.1,134.4 L375.4,99.2 L423.1,130.3 L417.7,162.2 L370.0,186.0 Z' },
    { name: '菊陽町', cx: 367.2, cy: 207.5, d: 'M368.5,220.6 L338.1,205.9 L375.9,189.7 L386.4,213.9 Z' },
    { name: '西原村', cx: 411.4, cy: 225.4, d: 'M386.6,215.4 L426.1,203.7 L432.9,230.1 L419.3,239.3 L392.3,238.7 Z' },
    { name: '錦町', cx: 379.2, cy: 515.7, d: 'M387.9,541.1 L350.8,502.9 L376.9,481.8 L401.3,536.9 Z' },
    { name: '長洲町', cx: 231.6, cy: 174.0, d: 'M219.1,167.6 L241.8,170.0 L233.9,184.4 Z' },
    { name: '阿蘇市', cx: 465.9, cy: 158.2, d: 'M417.7,162.2 L423.1,130.3 L433.8,128.3 L497.9,123.3 L528.9,159.0 L531.8,182.7 L471.9,194.3 L421.8,185.2 Z' },
    { name: '高森町', cx: 513.1, cy: 218.2, d: 'M471.9,194.3 L531.8,182.7 L560.0,215.5 L533.3,223.9 L524.3,253.4 L491.5,223.2 L478.7,234.2 Z' }
  ],
  '44': [
    { name: '中津市', cx: 163.5, cy: 184.6, d: 'M236.4,127.1 L208.4,243.2 L156.7,229.0 L138.1,243.6 L80.3,192.3 L102.6,166.2 L190.8,166.4 L194.8,108.6 Z' },
    { name: '九重町', cx: 217.1, cy: 335.3, d: 'M226.6,369.4 L198.4,393.5 L162.1,337.6 L222.5,273.6 L243.5,302.3 L249.6,335.3 Z' },
    { name: '佐伯市', cx: 455.2, cy: 484.4, d: 'M404.7,455.6 L459.4,445.7 L462.6,416.4 L556.7,397.6 L506.7,438.9 L560.0,470.2 L527.4,548.7 L438.6,524.0 L428.3,554.5 L339.6,556.5 L323.2,520.8 Z' },
    { name: '別府市', cx: 314.4, cy: 278.6, d: 'M342.1,294.1 L343.5,303.0 L281.8,311.3 L289.5,262.3 L297.2,249.7 L332.6,251.2 Z' },
    { name: '国東市', cx: 397.3, cy: 134.2, d: 'M373.6,138.9 L353.9,76.0 L405.4,80.0 L437.6,127.1 L431.1,197.4 L382.3,185.5 Z' },
    { name: '大分市', cx: 388.5, cy: 335.8, d: 'M413.2,389.1 L358.3,372.4 L323.1,397.3 L298.2,385.9 L315.6,361.1 L350.2,329.1 L343.5,303.0 L342.1,294.1 L373.7,304.6 L414.2,286.8 L469.8,306.5 L512.6,293.0 L488.8,334.9 L435.4,344.1 Z' },
    { name: '姫島村', cx: 410.2, cy: 43.5, d: 'M410.2,43.5  Z' },
    { name: '宇佐市', cx: 278.1, cy: 206.8, d: 'M297.2,249.7 L289.5,262.3 L260.2,266.5 L208.4,243.2 L236.4,127.1 L302.6,134.0 L311.4,155.5 L293.0,177.8 L304.5,245.5 Z' },
    { name: '日出町', cx: 326.7, cy: 242.1, d: 'M332.6,251.2 L297.2,249.7 L304.5,245.5 L313.4,226.7 L386.0,237.6 Z' },
    { name: '日田市', cx: 88.0, cy: 308.5, d: 'M80.3,192.3 L138.1,243.6 L131.2,297.6 L149.2,334.7 L110.3,337.3 L118.1,411.8 L43.4,384.8 L63.1,336.0 L40.5,323.1 L53.7,280.0 L40.0,252.7 Z' },
    { name: '杵築市', cx: 348.9, cy: 194.2, d: 'M311.4,155.5 L344.4,183.0 L373.6,138.9 L382.3,185.5 L431.1,197.4 L386.0,237.6 L313.4,226.7 L304.5,245.5 L293.0,177.8 Z' },
    { name: '津久見市', cx: 497.8, cy: 394.3, d: 'M462.6,416.4 L459.2,396.1 L516.1,367.6 L494.2,393.6 L556.7,397.6 Z' },
    { name: '玖珠町', cx: 185.8, cy: 280.9, d: 'M138.1,243.6 L156.7,229.0 L208.4,243.2 L260.2,266.5 L243.5,302.3 L222.5,273.6 L162.1,337.6 L149.2,334.7 L131.2,297.6 Z' },
    { name: '由布市', cx: 282.9, cy: 321.9, d: 'M343.5,303.0 L350.2,329.1 L315.6,361.1 L268.9,378.4 L226.6,369.4 L249.6,335.3 L243.5,302.3 L260.2,266.5 L289.5,262.3 L281.8,311.3 Z' },
    { name: '竹田市', cx: 263.5, cy: 431.4, d: 'M315.6,361.1 L298.2,385.9 L280.6,418.9 L300.3,451.5 L284.2,515.5 L266.5,525.7 L229.7,498.4 L229.4,446.7 L198.4,393.5 L226.6,369.4 L268.9,378.4 Z' },
    { name: '臼杵市', cx: 450.4, cy: 394.8, d: 'M413.2,389.1 L435.4,344.1 L488.8,334.9 L471.8,367.2 L516.1,367.6 L459.2,396.1 L462.6,416.4 L459.4,445.7 L404.7,455.6 L393.0,431.7 Z' },
    { name: '豊後大野市', cx: 331.4, cy: 442.2, d: 'M298.2,385.9 L323.1,397.3 L358.3,372.4 L413.2,389.1 L393.0,431.7 L404.7,455.6 L323.2,520.8 L266.5,525.7 L284.2,515.5 L300.3,451.5 L280.6,418.9 Z' },
    { name: '豊後高田市', cx: 337.2, cy: 137.5, d: 'M353.9,76.0 L373.6,138.9 L344.4,183.0 L311.4,155.5 L302.6,134.0 Z' }
  ],
  '45': [
    { name: 'えびの市', cx: 164.7, cy: 317.0, d: 'M202.1,294.0 L182.8,322.0 L174.6,358.0 L127.6,314.3 L136.4,296.5 Z' },
    { name: '三股町', cx: 273.2, cy: 427.4, d: 'M287.7,406.0 L296.5,416.3 L263.9,450.8 L244.6,436.7 Z' },
    { name: '串間市', cx: 295.8, cy: 508.6, d: 'M276.5,462.6 L292.9,471.2 L305.9,513.1 L330.4,513.0 L316.2,560.0 L294.4,553.4 L277.7,527.5 L272.5,467.8 Z' },
    { name: '五ヶ瀬町', cx: 271.7, cy: 109.4, d: 'M295.9,108.9 L278.2,127.3 L247.3,130.4 L250.7,108.2 L286.2,72.4 Z' },
    { name: '国富町', cx: 300.2, cy: 318.4, d: 'M331.5,328.2 L326.9,345.9 L296.5,341.2 L272.4,288.4 L273.7,288.1 Z' },
    { name: '宮崎市', cx: 320.3, cy: 366.6, d: 'M345.3,315.0 L367.5,318.4 L351.2,383.5 L355.7,433.0 L334.3,416.5 L296.5,416.3 L287.7,406.0 L275.4,355.9 L274.9,338.7 L296.5,341.2 L326.9,345.9 L331.5,328.2 Z' },
    { name: '小林市', cx: 229.2, cy: 326.0, d: 'M274.9,338.7 L275.4,355.9 L242.5,356.5 L210.4,343.3 L190.3,374.9 L174.6,358.0 L182.8,322.0 L202.1,294.0 L219.9,273.2 L248.5,278.2 L266.9,289.1 L261.7,328.5 Z' },
    { name: '川南町', cx: 368.8, cy: 264.2, d: 'M378.2,279.2 L363.1,277.5 L346.8,249.2 L387.1,250.8 Z' },
    { name: '延岡市', cx: 412.4, cy: 100.9, d: 'M373.3,144.2 L344.0,137.4 L345.9,111.4 L367.8,61.8 L428.7,62.1 L435.7,41.8 L472.4,45.2 L470.7,89.0 L443.8,102.6 L420.4,155.2 L433.4,159.6 Z' },
    { name: '新富町', cx: 358.1, cy: 306.7, d: 'M367.5,318.4 L345.3,315.0 L348.3,289.6 L371.2,303.9 Z' },
    { name: '日之影町', cx: 341.2, cy: 90.2, d: 'M367.8,61.8 L345.9,111.4 L344.0,137.4 L327.6,135.9 L308.6,112.8 L335.6,74.2 L341.8,48.5 L358.2,40.0 Z' },
    { name: '日南市', cx: 314.0, cy: 463.3, d: 'M355.7,433.0 L354.0,463.9 L329.8,492.3 L330.4,513.0 L305.9,513.1 L292.9,471.2 L276.5,462.6 L263.9,450.8 L296.5,416.3 L334.3,416.5 Z' },
    { name: '日向市', cx: 366.2, cy: 203.9, d: 'M410.3,173.4 L392.7,226.8 L343.0,226.8 L318.0,218.6 L367.1,173.9 Z' },
    { name: '木城町', cx: 336.9, cy: 247.5, d: 'M318.0,218.6 L343.0,226.8 L346.8,249.2 L363.1,277.5 L348.7,287.2 L301.8,225.8 Z' },
    { name: '椎葉村', cx: 263.4, cy: 170.2, d: 'M275.3,214.9 L268.3,225.4 L246.2,224.8 L218.8,153.0 L231.6,127.6 L247.3,130.4 L278.2,127.3 L299.5,156.1 L305.1,172.7 Z' },
    { name: '綾町', cx: 274.5, cy: 317.2, d: 'M296.5,341.2 L274.9,338.7 L261.7,328.5 L266.9,289.1 L272.4,288.4 Z' },
    { name: '美郷町', cx: 325.1, cy: 173.9, d: 'M344.0,137.4 L373.3,144.2 L367.1,173.9 L318.0,218.6 L301.8,225.8 L275.3,214.9 L305.1,172.7 L299.5,156.1 L339.3,159.8 L327.6,135.9 Z' },
    { name: '西米良村', cx: 263.1, cy: 264.0, d: 'M266.9,289.1 L248.5,278.2 L228.7,247.2 L246.2,224.8 L268.3,225.4 L300.2,270.5 L273.7,288.1 L272.4,288.4 Z' },
    { name: '西都市', cx: 310.3, cy: 271.6, d: 'M345.3,315.0 L331.5,328.2 L273.7,288.1 L300.2,270.5 L268.3,225.4 L275.3,214.9 L301.8,225.8 L348.7,287.2 L348.3,289.6 Z' },
    { name: '諸塚村', cx: 308.2, cy: 133.5, d: 'M295.9,108.9 L308.6,112.8 L327.6,135.9 L339.3,159.8 L299.5,156.1 L278.2,127.3 Z' },
    { name: '都城市', cx: 240.3, cy: 412.3, d: 'M275.4,355.9 L287.7,406.0 L244.6,436.7 L263.9,450.8 L276.5,462.6 L272.5,467.8 L223.2,449.5 L212.1,412.2 L179.2,399.6 L190.3,374.9 L216.0,375.4 L242.5,356.5 Z' },
    { name: '都農町', cx: 367.4, cy: 238.4, d: 'M343.0,226.8 L392.7,226.8 L387.1,250.8 L346.8,249.2 Z' },
    { name: '門川町', cx: 396.0, cy: 162.8, d: 'M433.4,159.6 L410.3,173.4 L367.1,173.9 L373.3,144.2 Z' },
    { name: '高千穂町', cx: 310.2, cy: 77.2, d: 'M308.6,112.8 L295.9,108.9 L286.2,72.4 L293.0,46.4 L341.8,48.5 L335.6,74.2 Z' },
    { name: '高原町', cx: 209.9, cy: 365.0, d: 'M242.5,356.5 L216.0,375.4 L190.3,374.9 L190.3,374.9 L210.4,343.3 Z' },
    { name: '高鍋町', cx: 361.9, cy: 287.5, d: 'M348.3,289.6 L348.7,287.2 L363.1,277.5 L378.2,279.2 L371.2,303.9 Z' }
  ],
  '46': KAGOSHIMA_MAINLAND_CITIES,
};

const OTHER_PREF_INTERNAL_BORDERS = {
  '40': ["M350.6,365.0 L351.2,396.7", "M401.4,374.4 L350.6,365.0", "M351.2,396.7 L396.6,423.1", "M427.9,163.3 L416.0,163.2", "M480.4,194.6 L442.3,196.8 L427.9,163.3", "M467.2,285.6 L458.2,243.8 L480.4,194.6", "M440.4,258.8 L453.0,296.5", "M426.2,208.8 L440.4,258.8", "M416.0,163.2 L426.2,208.8", "M213.1,521.2 L269.3,515.8", "M239.4,467.6 L210.4,513.2", "M266.4,460.3 L239.4,467.6", "M278.1,503.7 L266.4,460.3", "M546.2,236.7 L506.1,284.9", "M553.1,242.0 L546.2,236.7", "M342.0,127.0 L348.7,109.1", "M326.7,117.1 L342.0,127.0", "M336.4,109.3 L326.7,117.1", "M348.7,109.1 L336.4,109.3", "M236.1,192.8 L247.6,217.0", "M254.0,188.8 L236.1,192.8", "M270.4,176.2 L254.0,188.8", "M278.2,200.3 L270.4,176.2", "M249.3,216.9 L278.2,200.3", "M247.6,217.0 L249.3,216.9", "M350.6,365.0 L325.4,364.3", "M302.8,405.4 L351.2,396.7", "M255.6,423.0 L302.8,405.4", "M233.9,438.9 L255.6,423.0", "M210.7,438.6 L233.9,438.9", "M198.5,430.1 L210.7,438.6", "M285.6,361.7 L266.4,374.7", "M325.4,364.3 L285.6,361.7", "M258.7,435.1 L266.4,460.3", "M302.8,405.4 L308.8,431.4 L258.7,435.1", "M342.0,127.0 L343.6,129.8", "M332.1,79.7 L348.7,109.1", "M328.3,63.6 L332.1,79.7", "M435.0,155.3 L467.1,122.0", "M427.9,163.3 L435.0,155.3", "M395.4,170.3 L416.0,163.2", "M387.2,159.0 L395.4,170.3", "M343.6,129.8 L387.2,159.0", "M270.4,176.2 L271.7,165.2", "M226.4,168.2 L254.0,188.8", "M271.7,165.2 L235.5,152.7", "M550.5,226.7 L546.2,236.7", "M368.3,243.2 L340.4,236.0", "M378.7,252.9 L368.3,243.2", "M390.1,284.6 L378.7,252.9", "M393.4,295.8 L390.1,284.6", "M381.5,305.5 L393.4,295.8", "M326.2,290.9 L381.5,305.5", "M323.4,287.8 L326.2,290.9", "M327.8,274.1 L323.4,287.8", "M340.4,236.0 L327.8,274.1", "M404.9,211.6 L399.9,232.8", "M410.6,211.0 L404.9,211.6", "M416.1,244.2 L410.6,211.0", "M401.8,240.7 L416.1,244.2", "M399.9,232.8 L401.8,240.7", "M299.5,337.2 L285.6,361.7", "M302.6,341.2 L299.5,337.2", "M325.4,364.3 L302.6,341.2", "M214.3,454.9 L210.7,438.6", "M183.6,467.7 L214.3,454.9", "M230.9,459.6 L233.9,438.9", "M214.3,454.9 L230.9,459.6", "M243.8,257.3 L236.2,269.3", "M256.7,269.8 L243.8,257.3", "M245.7,305.8 L256.7,269.8", "M235.0,308.0 L245.7,305.8", "M227.8,290.5 L235.0,308.0", "M236.2,269.3 L227.8,290.5", "M245.7,305.8 L282.7,266.9", "M282.7,266.9 L256.7,269.8", "M243.7,257.2 L243.8,257.3", "M249.8,246.3 L243.7,257.2", "M278.6,239.4 L249.8,246.3", "M288.1,260.3 L278.6,239.4", "M282.7,266.9 L288.1,260.3", "M313.2,132.8 L311.5,120.8", "M275.1,154.4 L313.2,132.8", "M241.1,100.3 L275.1,154.4", "M311.5,120.8 L269.6,79.6", "M346.8,164.2 L333.3,155.6", "M327.3,186.6 L346.8,164.2", "M284.0,215.2 L327.3,186.6", "M278.2,200.3 L284.0,215.2", "M275.1,154.4 L271.7,165.2", "M333.3,155.6 L313.2,132.8", "M352.7,178.2 L346.8,164.2", "M327.3,186.6 L352.7,178.2", "M286.2,323.9 L266.6,322.8", "M299.5,337.2 L286.2,323.9", "M314.8,90.9 L311.3,81.5", "M311.5,120.8 L314.8,90.9", "M399.9,232.8 L378.7,252.9", "M390.1,284.6 L401.8,240.7", "M255.6,423.0 L258.7,435.1", "M245.1,239.3 L224.3,232.2", "M249.8,246.3 L245.1,239.3", "M224.3,232.2 L243.7,257.2", "M213.3,175.0 L236.1,192.8", "M220.5,277.4 L227.8,290.5", "M236.2,269.3 L220.5,277.4", "M326.2,290.9 L302.6,341.2", "M412.3,358.5 L381.5,305.5", "M430.6,317.3 L393.4,295.8", "M239.4,467.6 L230.9,459.6", "M340.4,236.0 L327.8,274.1", "M329.8,78.8 L336.4,109.3", "M332.1,79.7 L329.8,78.8", "M440.4,258.8 L416.1,244.2", "M363.6,212.1 L368.3,243.2", "M379.9,200.0 L363.6,212.1", "M397.8,183.5 L379.9,200.0", "M404.9,211.6 L397.8,183.5", "M360.1,180.8 L387.2,159.0", "M352.7,178.2 L360.1,180.8", "M343.6,129.8 L333.3,155.6", "M114.0,214.3 L147.5,301.0", "M224.3,232.2 L247.6,217.0", "M203.4,329.0 L195.4,291.2 L220.5,277.4", "M397.8,183.5 L395.4,170.3", "M365.8,201.2 L379.9,200.0", "M360.1,180.8 L365.8,201.2", "M323.4,287.8 L304.9,286.5", "M304.9,286.5 L286.2,323.9", "M304.9,286.5 L288.1,260.3", "M235.0,308.0 L232.8,328.6", "M496.2,187.6 L480.4,194.6", "M471.0,284.9 L514.6,217.2", "M276.4,236.1 L284.0,215.2", "M250.0,227.7 L276.4,236.1", "M249.3,216.9 L250.0,227.7", "M245.1,239.3 L250.0,227.7", "M365.8,201.2 L363.6,212.1", "M314.8,90.9 L329.8,78.8", "M435.0,155.3 L477.5,154.8", "M426.2,208.8 L410.6,211.0", "M311.5,120.8 L326.7,117.1", "M278.6,239.4 L276.4,236.1"],
  '41': ["M518.9,238.0 L491.2,182.6", "M466.8,273.6 L477.4,287.7", "M469.9,265.3 L466.8,273.6", "M480.8,184.4 L469.9,265.3", "M473.1,187.1 L469.9,265.3", "M217.0,276.0 L136.5,173.7 L110.4,188.6", "M131.9,323.2 L217.0,276.0", "M76.6,313.1 L131.9,323.2", "M448.5,306.8 L420.1,217.7 L382.0,193.5 L425.8,147.7", "M352.8,347.7 L353.7,348.2", "M295.0,231.7 L347.3,234.8 L352.8,347.7", "M312.2,129.4 L295.0,231.7", "M451.3,163.3 L466.8,273.6", "M218.5,277.8 L295.0,231.7", "M217.0,276.0 L218.5,277.8", "M105.0,94.6 L101.5,145.6", "M507.2,161.0 L560.0,187.7", "M310.2,307.3 L295.0,231.7", "M283.5,314.8 L310.2,307.3", "M268.8,314.1 L283.5,314.8", "M218.5,277.8 L268.8,314.1", "M289.7,335.1 L283.5,314.8", "M265.3,338.1 L289.7,335.1", "M268.8,314.1 L265.3,338.1", "M312.8,460.3 L250.6,510.7", "M251.1,364.2 L167.7,413.5", "M254.8,397.0 L251.1,364.2", "M229.7,497.6 L254.8,397.0", "M326.7,337.2 L352.8,347.7", "M310.2,307.3 L326.7,337.2", "M159.3,369.5 L131.9,323.2", "M251.1,364.2 L265.3,338.1", "M289.7,335.1 L326.7,337.2", "M254.8,397.0 L286.1,407.3"],
  '43': ["M376.9,481.8 L401.3,536.9", "M390.6,447.8 L376.9,481.8", "M431.6,524.4 L390.6,447.8", "M411.9,396.7 L373.1,369.2 L334.0,381.6 L334.6,417.5", "M413.0,434.3 L411.9,396.7", "M396.0,437.1 L413.0,434.3", "M350.1,426.1 L396.0,437.1", "M334.6,417.5 L350.1,426.1", "M350.8,502.9 L353.0,491.0", "M387.9,541.1 L350.8,502.9", "M326.0,461.8 L332.7,479.9 L301.0,527.5", "M353.0,491.0 L326.0,461.8", "M351.2,325.3 L328.6,342.1", "M415.6,332.6 L365.9,341.1 L351.2,325.3", "M442.0,346.3 L415.6,332.6", "M411.9,396.7 L440.0,385.7", "M317.2,440.6 L334.6,417.5", "M297.4,430.2 L317.2,440.6", "M257.5,409.6 L253.6,426.1 L297.4,430.2", "M328.6,342.1 L314.4,356.2 L293.8,322.3", "M433.8,128.3 L497.9,123.3", "M500.9,93.5 L441.5,98.3", "M497.9,123.3 L509.8,108.8", "M249.0,135.7 L253.5,146.5", "M273.6,145.2 L268.1,101.4", "M253.5,146.5 L273.6,145.2", "M471.9,194.3 L421.8,185.2", "M478.7,234.2 L471.9,194.3", "M432.9,230.1 L478.7,234.2", "M426.1,203.7 L432.9,230.1", "M421.8,185.2 L426.1,203.7", "M330.9,174.1 L338.1,205.9", "M370.0,186.0 L330.9,174.1", "M375.9,189.7 L370.0,186.0", "M338.1,205.9 L375.9,189.7", "M273.6,145.2 L291.3,167.9", "M292.5,166.3 L302.6,91.7", "M291.3,167.9 L292.5,166.3", "M356.8,255.2 L349.6,248.9", "M341.4,264.8 L356.8,255.2", "M349.6,248.9 L341.4,264.8", "M424.1,466.7 L413.0,434.3", "M452.6,485.1 L424.1,466.7", "M396.0,437.1 L390.6,447.8", "M417.7,162.2 L370.0,186.0", "M421.8,185.2 L417.7,162.2", "M386.6,215.4 L426.1,203.7", "M386.4,213.9 L386.6,215.4", "M375.9,189.7 L386.4,213.9", "M96.5,348.9 L81.0,396.3 L58.2,396.4", "M326.0,286.3 L284.1,270.5", "M242.7,298.6 L326.0,286.3", "M348.8,294.4 L349.0,293.1", "M351.2,325.3 L348.8,294.4", "M292.9,312.9 L328.6,342.1", "M349.0,293.1 L326.0,286.3", "M353.0,491.0 L363.7,457.0 L350.1,426.1", "M317.2,440.6 L326.0,461.8", "M397.4,293.7 L424.1,302.0 L415.6,332.6", "M419.3,239.3 L392.9,257.8 L397.4,293.7", "M432.9,230.1 L419.3,239.3", "M524.3,253.4 L491.5,223.2 L478.7,234.2", "M301.0,172.0 L332.4,153.9", "M292.5,166.3 L301.0,172.0", "M332.4,153.9 L361.1,134.4 L375.4,99.2", "M341.4,264.8 L342.4,268.4", "M392.3,238.7 L356.8,255.2", "M419.3,239.3 L392.3,238.7", "M387.0,294.0 L397.4,293.7", "M342.4,268.4 L387.0,294.0", "M424.1,466.7 L454.1,466.0", "M231.3,500.8 L216.9,491.1", "M273.3,507.8 L231.3,500.8", "M278.0,511.7 L273.3,507.8", "M231.3,500.8 L229.0,470.3", "M349.0,293.1 L342.4,268.4", "M291.3,204.0 L270.3,210.0", "M301.0,172.0 L291.3,204.0", "M330.9,174.1 L332.4,153.9", "M368.5,220.6 L338.1,205.9", "M349.6,248.9 L368.5,220.6", "M241.8,170.0 L233.9,184.4", "M253.5,146.5 L241.8,170.0", "M291.3,204.0 L291.3,167.9", "M297.4,430.2 L273.3,507.8", "M497.9,123.3 L528.9,159.0", "M348.8,294.4 L387.0,294.0", "M386.4,213.9 L368.5,220.6", "M392.3,238.7 L386.6,215.4", "M350.8,502.9 L376.9,481.8", "M219.1,167.6 L241.8,170.0", "M417.7,162.2 L423.1,130.3", "M471.9,194.3 L531.8,182.7"],
  '44': ["M208.4,243.2 L236.4,127.1", "M138.1,243.6 L156.7,229.0 L208.4,243.2", "M80.3,192.3 L138.1,243.6", "M198.4,393.5 L226.6,369.4", "M243.5,302.3 L222.5,273.6 L162.1,337.6", "M226.6,369.4 L249.6,335.3 L243.5,302.3", "M462.6,416.4 L459.4,445.7 L404.7,455.6", "M556.7,397.6 L462.6,416.4", "M404.7,455.6 L323.2,520.8", "M343.5,303.0 L342.1,294.1", "M289.5,262.3 L281.8,311.3 L343.5,303.0", "M297.2,249.7 L289.5,262.3", "M332.6,251.2 L297.2,249.7", "M353.9,76.0 L373.6,138.9", "M373.6,138.9 L382.3,185.5 L431.1,197.4", "M298.2,385.9 L323.1,397.3 L358.3,372.4 L413.2,389.1", "M315.6,361.1 L298.2,385.9", "M343.5,303.0 L350.2,329.1 L315.6,361.1", "M413.2,389.1 L435.4,344.1 L488.8,334.9", "M260.2,266.5 L289.5,262.3", "M208.4,243.2 L260.2,266.5", "M311.4,155.5 L302.6,134.0", "M304.5,245.5 L293.0,177.8 L311.4,155.5", "M297.2,249.7 L304.5,245.5", "M386.0,237.6 L313.4,226.7 L304.5,245.5", "M149.2,334.7 L131.2,297.6 L138.1,243.6", "M373.6,138.9 L344.4,183.0 L311.4,155.5", "M516.1,367.6 L459.2,396.1 L462.6,416.4", "M243.5,302.3 L260.2,266.5", "M226.6,369.4 L268.9,378.4 L315.6,361.1", "M266.5,525.7 L284.2,515.5 L300.3,451.5 L280.6,418.9 L298.2,385.9", "M413.2,389.1 L393.0,431.7 L404.7,455.6"],
  '45': ["M174.6,358.0 L182.8,322.0 L202.1,294.0", "M296.5,416.3 L287.7,406.0", "M263.9,450.8 L296.5,416.3", "M287.7,406.0 L244.6,436.7 L263.9,450.8", "M330.4,513.0 L305.9,513.1 L292.9,471.2 L276.5,462.6", "M276.5,462.6 L272.5,467.8", "M278.2,127.3 L295.9,108.9", "M247.3,130.4 L278.2,127.3", "M295.9,108.9 L286.2,72.4", "M296.5,341.2 L326.9,345.9 L331.5,328.2", "M272.4,288.4 L296.5,341.2", "M273.7,288.1 L272.4,288.4", "M331.5,328.2 L273.7,288.1", "M367.5,318.4 L345.3,315.0", "M296.5,416.3 L334.3,416.5 L355.7,433.0", "M275.4,355.9 L287.7,406.0", "M274.9,338.7 L275.4,355.9", "M296.5,341.2 L274.9,338.7", "M345.3,315.0 L331.5,328.2", "M242.5,356.5 L275.4,355.9", "M190.3,374.9 L210.4,343.3 L242.5,356.5", "M266.9,289.1 L248.5,278.2", "M274.9,338.7 L261.7,328.5 L266.9,289.1", "M363.1,277.5 L378.2,279.2", "M346.8,249.2 L363.1,277.5", "M387.1,250.8 L346.8,249.2", "M344.0,137.4 L373.3,144.2", "M367.8,61.8 L345.9,111.4 L344.0,137.4", "M373.3,144.2 L433.4,159.6", "M348.3,289.6 L345.3,315.0", "M371.2,303.9 L348.3,289.6", "M327.6,135.9 L344.0,137.4", "M308.6,112.8 L327.6,135.9", "M341.8,48.5 L335.6,74.2 L308.6,112.8", "M263.9,450.8 L276.5,462.6", "M343.0,226.8 L392.7,226.8", "M318.0,218.6 L343.0,226.8", "M367.1,173.9 L318.0,218.6", "M410.3,173.4 L367.1,173.9", "M346.8,249.2 L343.0,226.8", "M348.7,287.2 L363.1,277.5", "M301.8,225.8 L348.7,287.2", "M318.0,218.6 L301.8,225.8", "M268.3,225.4 L275.3,214.9", "M246.2,224.8 L268.3,225.4", "M299.5,156.1 L278.2,127.3", "M275.3,214.9 L305.1,172.7 L299.5,156.1", "M272.4,288.4 L266.9,289.1", "M367.1,173.9 L373.3,144.2", "M275.3,214.9 L301.8,225.8", "M327.6,135.9 L339.3,159.8 L299.5,156.1", "M273.7,288.1 L300.2,270.5 L268.3,225.4", "M348.3,289.6 L348.7,287.2", "M308.6,112.8 L295.9,108.9", "M242.5,356.5 L216.0,375.4 L190.3,374.9"],
  '46': KAGOSHIMA_MAINLAND_INTERNAL_BORDERS,
};

const OTHER_PREF_OUTLINE_PATHS = {
  '40': ["M203.4,329.0 L147.5,301.0 L45.1,307.4 L99.3,260.1 L64.9,244.8 L114.0,214.3 L202.1,237.2 L213.3,175.0 L226.4,168.2 L235.5,152.7 L241.1,100.3 L269.6,79.6 L311.4,81.5 L328.3,63.6 L410.2,57.7 L428.1,77.9 L484.6,40.0 L467.2,122.0 L477.5,154.8 L496.2,187.6 L514.6,217.2 L550.5,226.7 L553.1,242.0 L554.9,286.3 L506.1,284.9 L471.1,284.9 L467.3,285.6 L453.0,296.5 L430.6,317.3 L412.4,358.5 L401.4,374.4 L396.6,423.1 L424.9,459.4 L409.5,501.0 L325.7,475.2 L320.6,501.4 L278.1,503.7 L269.4,515.8 L253.4,557.9 L203.7,560.0 L213.1,521.2 L210.4,513.2 L183.6,467.7 L198.5,430.1 L266.4,374.7 L266.7,322.8 L232.8,328.6 Z"],
  '41': ["M132.1,64.6 L105.0,94.6 L101.5,145.6 L110.4,188.6 L87.9,259.2 L39.6,269.5 L41.2,271.5 L52.7,285.0 L31.3,300.4 L76.5,325.1 L76.6,313.1 L78.1,353.6 L100.0,357.6 L159.3,369.5 L167.7,413.5 L154.3,434.6 L123.0,449.3 L177.8,456.1 L185.7,516.0 L216.3,486.7 L219.5,489.0 L229.0,496.6 L249.6,509.7 L231.0,525.6 L217.1,545.8 L255.6,511.4 L261.9,513.3 L317.9,528.7 L322.3,529.9 L312.8,460.3 L286.1,407.3 L353.7,348.2 L436.4,389.4 L448.5,306.8 L477.4,287.7 L518.9,238.0 L560.0,187.7 L507.2,161.0 L491.2,182.6 L480.8,184.4 L473.1,187.1 L451.3,163.3 L425.8,147.7 L383.9,120.5 L312.2,129.4 L180.7,139.6 L179.7,94.6 Z"],
  '43': ["M524.3,253.4 L479.0,303.8 L476.0,331.4 L442.0,346.4 L440.0,385.7 L477.4,446.2 L454.1,466.0 L452.6,485.1 L476.3,523.4 L431.6,524.4 L401.3,537.0 L387.9,541.1 L319.2,547.6 L301.0,527.5 L278.0,511.7 L258.3,533.8 L205.6,541.6 L189.8,520.2 L216.9,491.1 L229.0,470.3 L257.5,409.6 L270.9,395.7 L256.7,357.0 L293.8,322.3 L292.9,312.9 L230.2,321.1 L242.7,298.7 L284.1,270.5 L270.3,210.0 L233.9,184.4 L219.1,167.6 L210.0,140.1 L249.0,135.7 L268.1,101.5 L302.6,91.7 L311.9,63.2 L375.4,99.2 L423.1,130.4 L433.8,128.3 L441.5,98.4 L432.3,57.5 L457.6,52.4 L500.9,93.6 L509.8,108.8 L528.9,159.0 L531.8,182.8 L560.0,215.5 L533.3,224.0 Z", "M190.0,413.5 L196.6,378.5 L226.0,357.8 L204.7,415.2 Z", "M96.5,348.9 L123.3,346.7 L137.7,428.5 L79.4,500.2 L60.1,510.4 L40.0,483.6 L55.5,460.5 L41.6,434.4 L58.2,396.4 Z"],
  '44': ["M353.9,76.0 L405.4,80.0 L437.6,127.1 L431.1,197.4 L386.0,237.6 L332.6,251.2 L342.1,294.1 L373.7,304.5 L414.2,286.8 L469.8,306.4 L512.6,293.0 L488.8,334.9 L471.8,367.2 L516.1,367.6 L494.2,393.6 L556.7,397.6 L506.7,438.9 L560.0,470.2 L527.4,548.7 L438.6,524.0 L428.3,554.5 L339.6,556.5 L323.2,520.7 L266.5,525.6 L229.7,498.4 L229.4,446.7 L198.4,393.5 L162.1,337.6 L149.2,334.6 L110.3,337.3 L118.1,411.8 L43.4,384.8 L63.1,336.0 L40.5,323.1 L53.7,280.0 L40.0,252.7 L80.3,192.3 L102.6,166.2 L190.8,166.4 L194.8,108.6 L236.4,127.1 L302.6,133.9 Z"],
  '45': ["M371.2,303.9 L367.5,318.4 L351.2,383.5 L355.7,433.0 L354.0,463.9 L329.8,492.3 L330.4,513.0 L316.2,560.0 L294.4,553.4 L277.7,527.5 L272.5,467.8 L223.2,449.5 L212.1,412.2 L179.2,399.6 L190.3,374.9 L190.3,374.9 L174.6,358.0 L127.6,314.3 L136.4,296.5 L202.1,294.0 L219.9,273.2 L248.5,278.2 L228.7,247.2 L246.2,224.8 L218.8,153.0 L231.6,127.6 L247.3,130.4 L250.7,108.2 L286.2,72.4 L293.0,46.4 L341.8,48.5 L358.2,40.0 L367.8,61.8 L428.7,62.1 L435.7,41.8 L472.4,45.2 L470.7,89.0 L443.8,102.6 L420.4,155.2 L433.4,159.6 L410.3,173.4 L392.8,226.8 L387.1,250.8 L378.2,279.2 Z"],
  '46': KAGOSHIMA_MAINLAND_OUTLINE_PATHS,
};

const OTHER_PREF_NAMES = {
  '40': { name: '福岡県', nameEn: 'Fukuoka' },
  '41': { name: '佐賀県', nameEn: 'Saga' },
  '43': { name: '熊本県', nameEn: 'Kumamoto' },
  '44': { name: '大分県', nameEn: 'Oita' },
  '45': { name: '宮崎県', nameEn: 'Miyazaki' },
  '46': { name: '鹿児島県', nameEn: 'Kagoshima' },
};

// 長崎県の離島(対馬・壱岐・五島・新上五島・小値賀)。地図隅に区画したインセット表示用の個別座標系
const NAGASAKI_INSET_ISLANDS = [
  { name: '対馬市', nameEn: 'Tsushima', viewW: 66.7, viewH: 123.2, d: 'M52.7,6.6 L39.4,24.6 L23.9,22.6 L16.4,45.1 L29.2,53.0 L23.7,52.2 L13.9,70.1 L22.2,75.2 L13.9,77.8 L14.1,95.4 L3.6,98.7 L17.0,104.9 L16.4,92.0 L21.6,92.4 L21.2,105.6 L30.1,94.8 L31.2,116.6 L37.2,112.0 L34.1,105.1 L40.1,105.6 L34.0,103.3 L40.2,99.4 L36.2,91.7 L40.9,85.5 L31.0,92.3 L34.1,80.0 L38.4,81.6 L35.2,74.0 L57.5,47.7 L59.2,36.6 L49.1,30.3 L59.2,30.4 L56.9,20.2 L63.2,17.2 Z' },
  { name: '壱岐市', nameEn: 'Iki', viewW: 77.6, viewH: 95.2, d: 'M31.3,5.1 L16.8,18.7 L24.2,35.1 L18.7,40.7 L12.4,31.9 L7.1,35.3 L14.8,39.0 L7.5,39.0 L9.8,49.2 L19.8,51.2 L22.9,60.6 L4.2,55.5 L9.2,71.1 L17.2,61.5 L22.2,67.8 L19.0,77.3 L27.5,78.0 L24.6,83.5 L36.4,90.1 L44.7,71.4 L64.3,70.8 L72.0,63.7 L68.1,55.5 L55.5,52.9 L58.1,47.2 L73.5,46.5 L51.0,35.4 L57.8,33.2 L59.7,14.2 Z' },
  { name: '五島市', nameEn: 'Goto', viewW: 106.4, viewH: 94.7, d: 'M72.7,5.1 L60.9,29.2 L56.8,16.2 L37.4,28.0 L24.0,12.1 L21.9,49.4 L30.5,52.7 L17.7,69.3 L27.8,68.6 L20.9,78.8 L10.2,62.3 L5.7,75.2 L23.2,83.5 L49.8,77.3 L61.3,89.7 L60.4,63.1 L99.4,64.6 L82.4,37.1 L87.6,24.8 L71.4,22.5 Z' },
  { name: '新上五島町', nameEn: 'Shinkamigoto Town', viewW: 46.7, viewH: 100.8, d: 'M28.8,5.4 L30.5,20.3 L28.6,31.9 L25.6,40.7 L44.2,53.4 L36.5,59.3 L26.5,57.7 L28.5,63.1 L24.6,72.8 L18.6,83.5 L19.3,91.4 L17.2,95.4 L13.7,93.8 L15.2,89.5 L13.1,80.5 L17.1,78.5 L12.8,73.9 L18.0,71.4 L23.0,67.5 L20.6,33.1 L15.2,37.4 L13.2,47.0 L3.8,56.5 L5.0,61.9 L9.3,65.4 L13.1,65.6 Z' },
  { name: '小値賀町', nameEn: 'Ojika Town', viewW: 78.4, viewH: 50.1, d: 'M32.9,2.7 L21.8,4.0 L23.9,10.5 L19.2,20.5 L14.4,13.4 L12.2,22.8 L4.2,25.6 L5.7,31.0 L22.8,31.8 L19.4,37.4 L25.7,47.4 L38.1,44.7 L36.1,35.8 L40.1,32.9 L49.5,41.3 L55.5,37.7 L65.2,43.5 L70.1,37.5 L57.8,30.5 L56.2,16.8 L67.5,13.8 L72.3,18.5 L74.2,8.3 L56.3,14.8 L46.1,12.7 L44.9,17.8 L30.6,12.4 Z' }
];


/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function pct(v, total) {
  return ((v / total) * 100).toFixed(2);
}
// 地名ラベルが重ならないよう、近すぎるラベルを少しずつずらす簡易的な衝突回避
// (実測のピクセルサイズではなく、地図の座標系上での距離をもとにした近似)
// 県ページ:市町村の座標範囲(cx/cy)の外側に、表示フレーム(regionViewBox)半分ぶんの
// 余白を足した範囲を返す。これにより「どの市町村を選んでも画面中央まで動かせる」
// ために必要十分な最小限のパン可能領域(viewBox)が求まる。
function computePannableViewBox(regionViewBox, munis) {
  const xs = munis.map((m) => m.cx);
  const ys = munis.map((m) => m.cy);
  const minX = xs.length ? Math.min(...xs) : regionViewBox.x;
  const maxX = xs.length ? Math.max(...xs) : regionViewBox.x + regionViewBox.w;
  const minY = ys.length ? Math.min(...ys) : regionViewBox.y;
  const maxY = ys.length ? Math.max(...ys) : regionViewBox.y + regionViewBox.h;
  return {
    x: minX - regionViewBox.w / 2,
    y: minY - regionViewBox.h / 2,
    w: (maxX - minX) + regionViewBox.w,
    h: (maxY - minY) + regionViewBox.h,
  };
}

function layoutNonOverlapping(items, distScale = 1) {
  if (items.length <= 1) return items.map((it) => ({ ...it, labelX: it.cx, labelY: it.cy }));
  const xs = items.map((it) => it.cx);
  const ys = items.map((it) => it.cy);
  const spanX = Math.max(...xs) - Math.min(...xs) || 1;
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;
  // 実際に並んでいる市町村どうしの分布(離島などで枠だけ広い場合に引きずられないよう、
  // 枠全体のサイズではなく実際の座標の広がりをもとに間隔の目安を決める)
  const minDist = Math.max(Math.min(spanX, spanY) * 0.1, Math.max(spanX, spanY) * 0.035, 1) * distScale;
  const placed = [];
  return items.map((item) => {
    let x = item.cx;
    let y = item.cy;
    let attempt = 0;
    while (attempt < 28 && placed.some((p) => Math.hypot(p.x - x, p.y - y) < minDist)) {
      const angle = attempt * 2.4;
      const radius = minDist * (0.8 + attempt * 0.18);
      x = item.cx + Math.cos(angle) * radius;
      y = item.cy + Math.sin(angle) * radius;
      attempt += 1;
    }
    placed.push({ x, y });
    return { ...item, labelX: x, labelY: y };
  });
}

// 緯度経度 → 地図SVG座標(九州全体マップと同じ正確な図法を、市ごとに切り出したもの)
// 以前の2点だけの簡易変換は東西・南北で拡大率が異なり形が歪んでいたため、
// 九州全体で使っている正確な図法(経度×cos(緯度)の正距円筒図法)に統一した。
// (ISAHAYA_CROP・GEO_PROJの定義はCITY_CONFIGSより前、ファイル冒頭に移動済み)
function geoToSvg(lat, lon) {
  return {
    x: (lon - GEO_PROJ.lonMin) * GEO_PROJ.coslat * GEO_PROJ.scale,
    y: (GEO_PROJ.latMax - lat) * GEO_PROJ.scale,
  };
}
// 地図SVG座標 → 緯度経度(geoToSvgの逆変換。現在地からの実距離計算に使用)
function svgToGeo(x, y) {
  return {
    lat: GEO_PROJ.latMax - y / GEO_PROJ.scale,
    lon: x / (GEO_PROJ.scale * GEO_PROJ.coslat) + GEO_PROJ.lonMin,
  };
}
// 2地点(緯度経度)間の直線距離(km) - Haversine公式
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// 直線距離からの簡易移動時間推定(デモ用の概算値。実際の道路距離・経路ではない)
const TRAVEL_SPEED_KMH = { car: 28, transit: 18, walk: 4.2 };
function estimateMinutes(km, speedKmh) {
  const raw = (km / speedKmh) * 60;
  // 10分未満は1分刻み、それ以上は5分刻みに丸めて「おおよその目安」であることを示す
  if (raw < 10) return Math.max(1, Math.round(raw));
  return Math.max(5, Math.round(raw / 5) * 5);
}
function autoMode(d) {
  if (d < 90) return 'walk';
  if (d < 220) return 'bus';
  return 'taxi';
}
function minutesForMode(d, mode) {
  if (mode === 'walk') return Math.max(6, Math.round(d * 0.45));
  if (mode === 'bus') return Math.round(12 + d * 0.18);
  return Math.round(8 + d * 0.12); // taxi
}
const MODE_LABEL = { walk: { ja: '徒歩', en: 'Walk' }, bus: { ja: '公共機関', en: 'Public transit' }, taxi: { ja: '車', en: 'Car' } };
const MODE_ICON = { walk: Footprints, bus: Bus, taxi: Car };
const MODE_COLOR = { walk: '#9AA0A6', bus: '#3B5E91', taxi: '#E2613D' };
function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// 営業時間データの形式: hours.week は [日,月,火,水,木,金,土] の7要素配列。
// 各要素は当日の営業時間帯リスト [[開始分,終了分], ...](複数なら昼・夜営業など)。空配列[]はその曜日が定休日。
// hours が null の場合は「常時開放」(神社・公園・展望台など、定休日の心配が不要な観光地向け)。
function minutesOfDay(date) { return date.getHours() * 60 + date.getMinutes(); }

// 指定した日時(Date)が営業時間内かどうかを判定する
function isOpenAt(hours, date) {
  if (!hours || !Array.isArray(hours.week)) return true; // 常時開放、またはデータ形式が不正な場合は開いている扱いにする
  const todayRanges = hours.week[date.getDay()] || [];
  const mins = minutesOfDay(date);
  return todayRanges.some(([start, end]) => mins >= start && mins < end);
}

// 「あと何分で閉まるか」を返す。営業時間外、または常時開放の場合はnull
function minutesUntilClose(hours, date) {
  if (!hours || !Array.isArray(hours.week)) return null;
  const todayRanges = hours.week[date.getDay()] || [];
  const mins = minutesOfDay(date);
  for (const [start, end] of todayRanges) {
    if (mins >= start && mins < end) return end - mins;
  }
  return null;
}

// 営業時間の状態をまとめて返す: { open: 営業中か, closingSoon: 30分以内に閉まるか, todayLabel: 今日の営業時間の表示用文字列 }
function getOpenStatus(hours, date, lang) {
  if (!hours || !Array.isArray(hours.week)) return { always: true };
  const open = isOpenAt(hours, date);
  const closeIn = minutesUntilClose(hours, date);
  const todayRanges = hours.week[date.getDay()] || [];
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const todayLabel = todayRanges.length
    ? todayRanges.map(([s, e]) => `${fmt(s)}-${fmt(e)}`).join(', ')
    : (lang === 'en' ? 'Closed today' : '本日定休日');
  return {
    always: false,
    open,
    closingSoon: open && closeIn !== null && closeIn <= 30,
    closeIn,
    todayLabel,
  };
}
function diffMinutes(t1, t2) {
  const [h1, m1] = t1.split(':').map(Number);
  const [h2, m2] = t2.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}
function formatDuration(mins, lang) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (lang === 'en') return h > 0 ? `${h}h ${m}m` : `${m}m`;
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

// Googleマップでのナビゲーション用
const GMAPS_TRAVELMODE = { walk: 'walking', bus: 'transit', taxi: 'driving' };
function gmapsUrl(originName, destinationName, mode) {
  const params = new URLSearchParams({
    api: '1',
    origin: originName,
    destination: destinationName,
    travelmode: GMAPS_TRAVELMODE[mode] || 'driving',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */

// エラーバウンダリ: 予期しないエラーが起きた際、Artifactの汎用エラーではなく
// 実際のエラーメッセージ・スタックトレースを画面に表示し、原因調査をしやすくする
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('CONOTAVI app crashed:', error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', color: '#21262C', background: '#FBEAEA', minHeight: '100vh', boxSizing: 'border-box' }}>
          <h2 style={{ marginTop: 0 }}>エラーが発生しました / An error occurred</h2>
          <p style={{ fontWeight: 700 }}>{String(this.state.error && this.state.error.message || this.state.error)}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, background: '#fff', padding: 12, borderRadius: 8, overflow: 'auto' }}>
            {String((this.state.error && this.state.error.stack) || '')}
            {this.state.info ? `\n\n--- component stack ---\n${this.state.info.componentStack}` : ''}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MairuDemo() {
  return (
    <AppErrorBoundary>
      <MairuDemoInner />
    </AppErrorBoundary>
  );
}

function MairuDemoInner() {
  const [lang, setLang] = useState('ja'); // 'ja' | 'en'
  const [appStage, setAppStage] = useState('top'); // 'top' | 'entry' | 'kyushu' | 'region' | 'muni' | 'city' | 'purpose'
  const [purposeCategory, setPurposeCategory] = useState(null); // 目的で探す:選択中のカテゴリ('roadside'など)
  const [purposePrefId, setPurposePrefId] = useState(null); // 目的で探す:選択中の県
  const [purposeSpots, setPurposeSpots] = useState([]); // 目的で探す:選択中の県で見つかったスポット一覧
  const [purposeLoading, setPurposeLoading] = useState(false); // 目的で探す:読み込み中フラグ
  const [purposeSelectedSpot, setPurposeSelectedSpot] = useState(null); // 目的で探す:詳細表示中のスポット
  const [selectedCity, setSelectedCity] = useState(null); // 選択中の市町村ID
  const activeCityConfig = CITY_CONFIGS[selectedCity] || CITY_CONFIGS[ACTIVE_CITY_IDS[0]]; // 選択中の市が未対応なら諫早市の設定にフォールバック(現在地の距離計算等の既定値として使用)
  const activeAirport = getAirportInfo(selectedCity, activeCityConfig.prefId); // 表示中の市に応じた最寄りの空港
  const activeAirportSvg = useMemo(() => geoToSvg(activeAirport.lat, activeAirport.lon), [activeAirport]);
  const activeFerry = getFerryInfo(selectedCity); // 表示中の市に対応するフェリーターミナル(無い市町村ではnull)
  const activeFerrySvg = useMemo(() => (activeFerry ? geoToSvg(activeFerry.lat, activeFerry.lon) : null), [activeFerry]);
  const [regionMode, setRegionMode] = useState('map'); // 地域選択画面の 'map' | 'card'
  const [peekCityId, setPeekCityId] = useState(null); // 地域地図でタップ中の市町村
  const [kyushuMode, setKyushuMode] = useState('map'); // 九州選択画面の 'map' | 'card'
  const [peekPrefId, setPeekPrefId] = useState(null); // 九州地図でタップ中の県
  const [showAllPrefNames, setShowAllPrefNames] = useState(false); // 「地名を表示」ボタン:仮実装
  const [myLocationXY, setMyLocationXY] = useState(null); // 九州ページ:現在地(ワンショット取得)のx,y座標
  const [myLocationStatus, setMyLocationStatus] = useState('idle'); // 'idle' | 'loading' | 'error'
  const [showAirportPins, setShowAirportPins] = useState(false); // 空港のピン表示トグル(九州・県ページ共通)
  const [showFerryPins, setShowFerryPins] = useState(false); // フェリーのピン表示トグル(九州・県ページ共通)
  const [peekAirportId, setPeekAirportId] = useState(null); // タップ中の空港ピン
  const [peekFerryId, setPeekFerryId] = useState(null); // タップ中のフェリーピン
  const [showRoadsidePins, setShowRoadsidePins] = useState(false); // 道の駅のピン表示トグル(九州・県ページ共通)
  const [roadsideMapSpots, setRoadsideMapSpots] = useState([]); // ピン表示用に取得した道の駅一覧
  const [roadsideMapLoading, setRoadsideMapLoading] = useState(false);
  const [peekRoadsideId, setPeekRoadsideId] = useState(null); // タップ中の道の駅ピン
  const [poiDetail, setPoiDetail] = useState(null); // 空港・フェリー・道の駅共通の詳細カード。{ type: 'airport'|'ferry'|'roadside', data } | null

  // 空港・フェリー・道の駅、いずれかのピンを選ぶときに使う共通関数。
  // 他のカテゴリで開いていた吹き出しは自動的に閉じ、最後にタップしたものだけが開いた状態になる。
  function peekPoi(type, key) {
    setPeekAirportId(type === 'airport' ? (peekAirportId === key ? null : key) : null);
    setPeekFerryId(type === 'ferry' ? (peekFerryId === key ? null : key) : null);
    setPeekRoadsideId(type === 'roadside' ? (peekRoadsideId === key ? null : key) : null);
    setPeekPrefId(null);
    setPeekCityId(null);
  }
  const [kyushuZoom, setKyushuZoom] = useState(1); // 九州ページ(県を選ぶ前)の拡大率
  useEffect(() => {
    if (appStage !== 'kyushu') setKyushuZoom(1); // 九州ページ以外に移動したら拡大率をリセットする
  }, [appStage]);
  const [iconLabelPeek, setIconLabelPeek] = useState(null); // 右側アイコンをタップした時に、アイコンの左に一時的に出すラベル文字
  useEffect(() => {
    if (!iconLabelPeek) return undefined;
    const t = setTimeout(() => setIconLabelPeek(null), 1800);
    return () => clearTimeout(t);
  }, [iconLabelPeek]);
  const [regionZoom, setRegionZoom] = useState(1); // 県ページの拡大率
  const muniMapFrameRef = useRef(null); // 市町村ページ(全画面地図モード)の地図フレームDOM。実際の画面比率を測るために使う
  const [muniMapSize, setMuniMapSize] = useState(() => (typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : null)); // 上記フレームの実測サイズ { w, h }(px)
  const kyushuMapFrameRef = useRef(null); // 九州ページ(全画面地図モード)の地図フレームDOM。実際の画面比率を測るために使う
  const [kyushuMapSize, setKyushuMapSize] = useState(() => (typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : null)); // 上記フレームの実測サイズ { w, h }(px)
  const regionMapFrameRef = useRef(null); // 県ページ(全画面地図モード)の地図フレームDOM。実際の画面比率を測るために使う
  const [regionMapSize, setRegionMapSize] = useState(() => (typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : null)); // 上記フレームの実測サイズ { w, h }(px)

  const [showAllCityNames, setShowAllCityNames] = useState(false); // 県ページの「地名を表示」ボタン:長崎県のみ試験導入
  const regionMapScrollRef = useRef(null); // 県ページの地図(本島+離島)のスクロール領域
  const regionMapContentRef = useRef(null); // 県ページの地図の中身(拡大縮小される要素)本体への参照(ピンチ操作で直接操作するため)
  const muniGroupRef = useRef(null); // 県ページ:実際に描画されている市町村(本島側)のグループ。getBBoxで本当の中心を測るために使う
  const muniPathRefs = useRef({}); // 県ページ:市町村ID→パス要素。選択時にその市町村を直接中央へ寄せるために使う
  const [selectedPrefId, setSelectedPrefId] = useState('42'); // 県ページで表示中の県(初期値は長崎県)
  useEffect(() => {
    setRegionZoom(1); // 県ページ以外に移動した時・選んでいる県が変わった時は拡大率をリセットする
  }, [appStage, selectedPrefId]);
  const [peekIslandKey, setPeekIslandKey] = useState(null); // 離島インセットでタップ中の島

  // 九州ページ⇔県ページを移動したら、空港・フェリー・道の駅のピン表示は一旦リセットする。
  // (県ページは狭い範囲の地図なので、九州全体分のピンをそのまま引き継ぐと位置がおかしく見えるため)
  useEffect(() => {
    setShowAirportPins(false);
    setShowFerryPins(false);
    setShowRoadsidePins(false);
    setPeekAirportId(null);
    setPeekFerryId(null);
    setPeekRoadsideId(null);
    setPoiDetail(null);
  }, [appStage, selectedPrefId, selectedCity]);

  useEffect(() => {
    if (appStage !== 'region') return;
    const currentPref = KYUSHU_PREFS.find((x) => x.id === selectedPrefId);
    if (!currentPref) return;
    const el = regionMapScrollRef.current;
    if (!el) return;
    const rvb = currentPref.regionViewBox;
    const munis = KYUSHU_MUNICIPALITIES.filter((m) => m.prefId === selectedPrefId);
    if (!munis.length) return;
    // 実際に描画される地図の座標範囲(prefFullViewBox)は、県ページの表示コードと全く同じ
    // 計算を使う必要がある。本島をそのまま基準にしつつ、離島がある方向にだけ届く分の
    // 余白を追加する(使わない方向にまで均等に広げると無駄な余白になるため)。
    const muniXsA = munis.map((m) => m.cx);
    const muniYsA = munis.map((m) => m.cy);
    const bufA = Math.max(rvb.w, rvb.h) * 0.5;
    const fvbMinX = Math.min(rvb.x, ...muniXsA) - bufA;
    const fvbMinY = Math.min(rvb.y, ...muniYsA) - bufA;
    const fvbMaxX = Math.max(rvb.x + rvb.w, ...muniXsA) + bufA;
    const fvbMaxY = Math.max(rvb.y + rvb.h, ...muniYsA) + bufA;
    const fvb = { x: fvbMinX, y: fvbMinY, w: fvbMaxX - fvbMinX, h: fvbMaxY - fvbMinY };
    // 県ごとに用意されている表示範囲(regionViewBox)自体が、その県の本島を
    // 綺麗に収める形であらかじめ調整されているため、基本的には中心もそのままその範囲の中心を使う。
    // ただし長崎県・鹿児島県は、それでもまだズレて見えるとのフィードバックがあったため、
    // 代わりに分かりやすい目印(大村市・鹿児島市)の位置を直接中心にする。
    const REGION_CENTER_OVERRIDE = { '42': { name: '大村市', offsetX: 0 }, '46': { name: '鹿児島市', offsetX: 25 } };
    const override = REGION_CENTER_OVERRIDE[selectedPrefId];
    const overrideMuni = override ? munis.find((m) => m.name === override.name) : null;
    const mainlandCx = overrideMuni ? overrideMuni.cx + (override.offsetX || 0) : rvb.x + rvb.w / 2;
    const mainlandCy = overrideMuni ? overrideMuni.cy : rvb.y + rvb.h / 2;
    const apply = () => {
      // ウィンドウの縦横比を固定したことで、X方向とY方向の拡大率が異なる場合があるため、別々に計算する
      const scaleX = el.scrollWidth / fvb.w;
      const scaleY = el.scrollHeight / fvb.h;
      const mainlandCenterX = (mainlandCx - fvb.x) * scaleX;
      const mainlandCenterY = (mainlandCy - fvb.y) * scaleY;
      el.scrollLeft = mainlandCenterX - el.clientWidth / 2;
      el.scrollTop = mainlandCenterY - el.clientHeight / 2;
    };
    // モバイルなどでレイアウト確定が1フレームで間に合わないことがあるため、
    // サイズが取得できるまで数フレーム試行する
    let tries = 0;
    let raf;
    const frame = () => {
      if (el.clientWidth && el.clientHeight && el.scrollWidth) {
        apply();
      } else if (tries < 30) {
        tries += 1;
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [appStage, selectedPrefId, regionMapSize]);

  useEffect(() => {
    if (appStage !== 'region' || !peekCityId) return;
    const currentPref = KYUSHU_PREFS.find((x) => x.id === selectedPrefId);
    if (!currentPref) return;
    const m = KYUSHU_MUNICIPALITIES.find((x) => (x.id ?? x.name) === peekCityId && x.prefId === selectedPrefId);
    if (!m) return;
    const el = regionMapScrollRef.current;
    if (!el) return;
    const munis = KYUSHU_MUNICIPALITIES.filter((x) => x.prefId === selectedPrefId);
    const prefViewBox = currentPref.regionViewBox;
    // 本島をそのまま基準にしつつ、離島がある方向にだけ届く分の余白を追加する。
    const muniXsB = munis.map((x) => x.cx);
    const muniYsB = munis.map((x) => x.cy);
    const bufB = Math.max(prefViewBox.w, prefViewBox.h) * 0.5;
    const fvbMinXB = Math.min(prefViewBox.x, ...muniXsB) - bufB;
    const fvbMinYB = Math.min(prefViewBox.y, ...muniYsB) - bufB;
    const fvbMaxXB = Math.max(prefViewBox.x + prefViewBox.w, ...muniXsB) + bufB;
    const fvbMaxYB = Math.max(prefViewBox.y + prefViewBox.h, ...muniYsB) + bufB;
    const fvb = { x: fvbMinXB, y: fvbMinYB, w: fvbMaxXB - fvbMinXB, h: fvbMaxYB - fvbMinYB };
    const apply = () => {
      const scaleX = el.scrollWidth / fvb.w;
      const scaleY = el.scrollHeight / fvb.h;
      const targetX = (m.cx - fvb.x) * scaleX;
      const targetY = (m.cy - fvb.y) * scaleY;
      el.scrollTo({ left: targetX - el.clientWidth / 2, top: targetY - el.clientHeight / 2, behavior: 'smooth' });
    };
    let tries = 0;
    let raf;
    const frame = () => {
      if (el.clientWidth && el.clientHeight && el.scrollWidth) {
        apply();
      } else if (tries < 30) {
        tries += 1;
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [peekCityId, selectedPrefId, appStage]);

  const panDragRef = useRef({ dragging: false, startX: 0, startY: 0, startScrollLeft: 0, startScrollTop: 0, moved: false, el: null });

  // 九州ページ:「現在地を表示」ボタン。ワンショットで一度だけ位置を取得する(常時追跡はしない)。
  function handleLocateMe() {
    if (!navigator.geolocation) {
      setMyLocationStatus('error');
      return;
    }
    setMyLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const svg = geoToSvg(pos.coords.latitude, pos.coords.longitude);
        setMyLocationXY(svg);
        setMyLocationStatus('idle');
      },
      () => {
        setMyLocationStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }
  useEffect(() => {
    if (myLocationStatus !== 'error') return undefined;
    const t = setTimeout(() => setMyLocationStatus('idle'), 3000); // エラー表示は一定時間で自動的に消す
    return () => clearTimeout(t);
  }, [myLocationStatus]);

  // 近い場所に複数のピンが重なって見づらくなるのを防ぐため、指定した距離(データ座標系の単位)以内の
  // ピンを1つのクラスターにまとめる。ピンが多い九州全体ページで使う。
  function clusterPins(points, cellSize) {
    const cells = {};
    points.forEach((p) => {
      const cx = Math.round(p.x / cellSize);
      const cy = Math.round(p.y / cellSize);
      const key = `${cx},${cy}`;
      (cells[key] = cells[key] || []).push(p);
    });
    return Object.values(cells).map((items) => ({
      x: items.reduce((s, i) => s + i.x, 0) / items.length,
      y: items.reduce((s, i) => s + i.y, 0) / items.length,
      // idの昇順に並び替えておく。並び順が毎回変わると、まとめて生成しているキー(選択状態の
      // 管理に使う)も変わってしまい、「前回選んだピンの色が残る」ような不具合につながるため。
      items: [...items].sort((a, b) => String(a.id).localeCompare(String(b.id))),
    }));
  }
  // 携帯の狭い画面では、同じデータ座標上の距離でも見た目上はより近く(重なりやすく)なるため、
  // 画面幅が狭いときはクラスターにまとめる基準の距離を広げる。
  const poiClusterCellSize = (typeof window !== 'undefined' && window.innerWidth < 560) ? 70 : 26;

  function handlePanMouseMove(e) {
    const st = panDragRef.current;
    if (!st.dragging) return;
    const el = st.el;
    if (!el) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) st.moved = true;
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
    el.scrollLeft = Math.min(maxLeft, Math.max(0, st.startScrollLeft - dx));
    el.scrollTop = Math.min(maxTop, Math.max(0, st.startScrollTop - dy));
  }
  function handlePanMouseUp() {
    const el = panDragRef.current.el;
    panDragRef.current.dragging = false;
    if (el) el.classList.remove('is-panning');
    window.removeEventListener('mousemove', handlePanMouseMove);
    window.removeEventListener('mouseup', handlePanMouseUp);
  }
  function makePanMouseDown(ref) {
    return function (e) {
      const el = ref.current;
      if (!el) return;
      e.preventDefault();
      panDragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startScrollLeft: el.scrollLeft, startScrollTop: el.scrollTop, moved: false, el };
      el.classList.add('is-panning');
      window.addEventListener('mousemove', handlePanMouseMove);
      window.addEventListener('mouseup', handlePanMouseUp);
    };
  }
  const handlePanMouseDown = makePanMouseDown(regionMapScrollRef);
  // ピンチズーム(スマホでの2本指ズーム)。
  // スクロール位置を自分で計算し直す方式は何度か試したがうまくいかなかったため、
  // CSSの transform(scale + transform-origin)に任せる、素直なやり方に変更する。
  // transform-origin を「つまんだ位置」に設定しておけば、拡大縮小はブラウザが
  // 自動でその位置を中心に行ってくれるため、自分でスクロール位置を計算し直す必要がない。
  const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1, raf: null, pendingScale: null });
  function makePinchHandlers(setZoom, contentRef, scrollRef) {
    function getDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }
    function getMid(touches, content) {
      const rect = content.getBoundingClientRect();
      const midX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left;
      const midY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top;
      return { x: midX, y: midY };
    }
    return {
      onTouchStart: (e) => {
        const content = contentRef.current;
        const el = scrollRef.current;
        if (e.touches.length === 2 && content && el) {
          const mid = getMid(e.touches, content);
          content.style.transformOrigin = `${mid.x}px ${mid.y}px`;
          setZoom((z) => {
            pinchRef.current = {
              active: true, startDist: getDist(e.touches), startZoom: z, raf: null, pendingScale: 1,
              midX: mid.x, midY: mid.y, scrollLeftBefore: el.scrollLeft, scrollTopBefore: el.scrollTop,
            };
            return z;
          });
        }
      },
      onTouchMove: (e) => {
        const p = pinchRef.current;
        const content = contentRef.current;
        if (e.touches.length === 2 && p.active && content) {
          e.preventDefault();
          const dist = getDist(e.touches);
          const scale = Math.min(3 / p.startZoom, Math.max(1 / p.startZoom, dist / p.startDist));
          p.pendingScale = scale;
          if (!p.raf) {
            p.raf = requestAnimationFrame(() => {
              p.raf = null;
              if (p.active && content) content.style.transform = `scale(${p.pendingScale})`;
            });
          }
        }
      },
      onTouchEnd: (e) => {
        if (e.touches.length < 2) {
          const p = pinchRef.current;
          const content = contentRef.current;
          const el = scrollRef.current;
          if (p.active && content && el && p.pendingScale != null) {
            const finalZoom = Math.min(3, Math.max(1, +(p.startZoom * p.pendingScale).toFixed(2)));
            const ratio = finalZoom / p.startZoom;
            // つまんだ場所が画面上で同じ位置に見え続けるよう、通常表示(width/height方式)に
            // 戻すタイミングでスクロール位置を計算し直す
            const newScrollLeft = p.midX * (ratio - 1) + p.scrollLeftBefore;
            const newScrollTop = p.midY * (ratio - 1) + p.scrollTopBefore;
            content.style.transform = '';
            content.style.transformOrigin = '';
            setZoom(finalZoom);
            // Reactが新しいサイズを実際に反映し終えるまで待ってからスクロール位置を設定する
            // (すぐ後だと、まだ古いサイズのままでスクロール位置がおかしくなることがあるため)
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                el.scrollLeft = newScrollLeft;
                el.scrollTop = newScrollTop;
              });
            });
          }
          p.active = false;
        }
      },
    };
  }
  const kyushuMapScrollRef = useRef(null); // 九州全体図のスクロール領域
  const kyushuMapContentRef = useRef(null); // 九州全体図の中身(拡大縮小される要素)本体への参照(ピンチ操作で直接操作するため)
  const handleKyushuPanMouseDown = makePanMouseDown(kyushuMapScrollRef);
  // 拡大率(全体表示)の基準は、KYUSHU_MAINLAND_VIEWBOX(対馬・壱岐・五島・種子島・屋久島まで
  // 含む、九州本土のもともとの表示範囲)に少しだけ余白を足したものを使う。
  const KYUSHU_PAN_PADDING = 30;
  const kyushuSizingBox = {
    x: KYUSHU_MAINLAND_VIEWBOX.x - KYUSHU_PAN_PADDING,
    y: KYUSHU_MAINLAND_VIEWBOX.y - KYUSHU_PAN_PADDING,
    w: KYUSHU_MAINLAND_VIEWBOX.w + KYUSHU_PAN_PADDING * 2,
    h: KYUSHU_MAINLAND_VIEWBOX.h + KYUSHU_PAN_PADDING * 2,
  };
  // 実際にパン(スクロール)できる範囲(kyushuPanBox)は、拡大なしでもどの県を選んでも
  // 画面中央まで持って来られるよう、四方に「表示範囲の半分」の余白を追加する
  // (大分県のように端にある県でも中央に来せるために必要な余白)。
  // さらに奄美群島(与論島など)がぎりぎり収まる分だけ下にも延長する。
  const islandMaxY = Math.max(...Object.values(AIRPORT_SVG_OVERRIDE).map((p) => p.y));
  const kyushuHPad = Math.max(kyushuSizingBox.w, kyushuSizingBox.h) * 0.3;
  const kyushuVPad = kyushuSizingBox.h * 0.4;
  const kyushuPanBoxBase = {
    x: kyushuSizingBox.x - kyushuHPad,
    y: kyushuSizingBox.y - kyushuVPad,
    w: kyushuSizingBox.w + kyushuHPad * 2,
    h: kyushuSizingBox.h + kyushuVPad * 2,
  };
  const kyushuPanBox = islandMaxY > kyushuPanBoxBase.y + kyushuPanBoxBase.h
    ? { ...kyushuPanBoxBase, h: islandMaxY - kyushuPanBoxBase.y + 350 }
    : kyushuPanBoxBase;

  useEffect(() => {
    if (appStage !== 'kyushu') return;
    const el = kyushuMapScrollRef.current;
    if (!el) return;
    // 単純な外接矩形の中心だと、地図の形の偏りの分だけ余白が偏って見えるため、
    // 縦横とも各県の代表点の平均を「見た目の中心」として使う。
    const centerXRef = KYUSHU_PREFS.reduce((sum, p) => sum + p.cx, 0) / KYUSHU_PREFS.length;
    const centerYRef = KYUSHU_PREFS.reduce((sum, p) => sum + p.cy, 0) / KYUSHU_PREFS.length;
    const apply = () => {
      const scaleX = el.scrollWidth / kyushuPanBox.w;
      const scaleY = el.scrollHeight / kyushuPanBox.h;
      const centerX = (centerXRef - kyushuPanBox.x) * scaleX;
      const centerY = (centerYRef - kyushuPanBox.y) * scaleY;
      el.scrollLeft = centerX - el.clientWidth / 2;
      el.scrollTop = centerY - el.clientHeight / 2;
    };
    let tries = 0;
    let raf;
    const frame = () => {
      if (el.clientWidth && el.clientHeight && el.scrollWidth) {
        apply();
      } else if (tries < 20) {
        tries += 1;
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [appStage, kyushuMapSize]);

  useEffect(() => {
    if (appStage !== 'kyushu' || !peekPrefId) return;
    const p = KYUSHU_PREFS.find((x) => x.id === peekPrefId);
    if (!p) return;
    const el = kyushuMapScrollRef.current;
    if (!el) return;
    const apply = () => {
      const scaleX = el.scrollWidth / kyushuPanBox.w;
      const scaleY = el.scrollHeight / kyushuPanBox.h;
      const targetX = (p.cx - kyushuPanBox.x) * scaleX;
      const targetY = (p.cy - kyushuPanBox.y) * scaleY;
      el.scrollTo({ left: targetX - el.clientWidth / 2, top: targetY - el.clientHeight / 2, behavior: 'smooth' });
    };
    let tries = 0;
    let raf;
    const frame = () => {
      if (el.clientWidth && el.clientHeight && el.scrollWidth) {
        apply();
      } else if (tries < 20) {
        tries += 1;
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [peekPrefId, appStage]);

  const [activeCategory, setActiveCategory] = useState('sightseeing');
  const [showOtherMenu, setShowOtherMenu] = useState(false); // 「その他」タブを押した際に開くウインドウの開閉状態
  const [selectMode, setSelectMode] = useState('map'); // 'map' | 'card'
  const [lastBrowseMode, setLastBrowseMode] = useState('map'); // 候補/決定から戻る際に復元する表示モード('map' | 'card')
  const [selectedId, setSelectedId] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false); // 詳細カードの説明文を全文表示しているか(スポットを切り替えたらリセット)
  const [expandedCardDescs, setExpandedCardDescs] = useState([]); // 一覧カード(写真あり)で説明文を全文表示中のスポットID一覧
  const [candidates, setCandidates] = useState([]);
  const [decided, setDecided] = useState([]);
  const [reserved, setReserved] = useState([]); // 予約済みとしてマークしたスポットID(候補・決定とは独立した補助フラグ)
  const [customDuration, setCustomDuration] = useState({});
  const [view, setView] = useState('select');
  useEffect(() => {
    const el = muniMapFrameRef.current;
    if (!el) return undefined;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMuniMapSize({ w: rect.width, h: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [appStage, selectedCity, view, selectMode]);
  useEffect(() => {
    const el = kyushuMapFrameRef.current;
    if (!el) return undefined;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setKyushuMapSize({ w: rect.width, h: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [appStage, kyushuMode]);
  useEffect(() => {
    const el = regionMapFrameRef.current;
    if (!el) return undefined;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setRegionMapSize({ w: rect.width, h: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [appStage, selectedPrefId, regionMode]);
  const [calculating, setCalculating] = useState(false);
  const [routeStops, setRouteStops] = useState(null); // 出発地を除いた決定済み地点の順序(最後が宿泊地の場合あり)
  const [legDistances, setLegDistances] = useState([]);
  const [legModes, setLegModes] = useState([]);
  const [routeOrigin, setRouteOrigin] = useState('airport'); // ルートの出発地: 'airport' | 'ferry' | 'mylocation' | 'custom'
  const [customOriginName, setCustomOriginName] = useState(''); // 地名を入力する場合の出発地名(仮実装: 座標は取得できないため空港の座標を代用)
  const [routeViewMode, setRouteViewMode] = useState('timeline'); // 'timeline' | 'map'
  const [detourMode, setDetourMode] = useState(false);
  const [detourCategory, setDetourCategory] = useState('all'); // 寄り道モードのカテゴリ絞り込み
  const [linkedId, setLinkedId] = useState(null); // 地図ピン⇄リストを相互ハイライト中のスポット(1回目タップ用。選択画面・寄り道モードで共用)
  const [budget, setBudget] = useState(20000); // 予算(円)
  const [showBudget, setShowBudget] = useState(false); // 予算バーの開閉状態(初期は閉じておき、ボタンで開閉する)
  const [travelers, setTravelers] = useState(1); // 人数
  const [myLocation, setMyLocation] = useState(null); // 取得した現在地のSVG座標 {x,y}
  const [locating, setLocating] = useState(false); // 現在地取得中フラグ
  const [locationError, setLocationError] = useState(null); // 現在地取得エラーメッセージ
  const [savedPlans, setSavedPlans] = useState([]); // ブラウザに保存済みのプラン一覧
  const [showSaveDialog, setShowSaveDialog] = useState(false); // 保存・保存したプラン確認ダイアログの表示(1つに統合)
  const [showShareDialog, setShowShareDialog] = useState(false); // 共有ダイアログの表示
  const [saveNameInput, setSaveNameInput] = useState(''); // 保存名の入力中の値
  const [planToast, setPlanToast] = useState(''); // 保存/読込/共有の簡易通知メッセージ
  const [sharedPlanBanner, setSharedPlanBanner] = useState(false); // 共有リンクから開いた際の案内バナー
  const [tripDate, setTripDate] = useState(''); // 旅行の出発日(YYYY-MM-DD、未選択時は空文字)
  const [spotsReady, setSpotsReady] = useState(false); // SPOTS_DATA_URLからの取得が完了したか
  const [airportsReady, setAirportsReady] = useState(false); // data/airports.jsonの取得が完了したか(取得できたらtrueにして再描画を促す)

  // 起動時: data/airports.json(スプレッドシート「空港」シート由来)を取得し、
  // 取得できればAIRPORTS/PREF_AIRPORT/MUNI_AIRPORT_OVERRIDEをその内容で置き換える。
  // 取得できない場合はDEFAULT_*(コードに埋め込まれた既定値)のまま動作する。
  useEffect(() => {
    let cancelled = false;
    fetch('/data/airports.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        const nextAirports = {};
        const nextPrefAirport = {};
        const nextMuniOverride = {};
        rows.forEach((a) => {
          if (!a.id) return;
          nextAirports[a.id] = { name: a.name, nameEn: a.nameEn, lat: a.lat, lon: a.lng };
          if (a.isPrefDefault) {
            const pref = KYUSHU_PREFS.find((p) => p.name === a.pref);
            if (pref) nextPrefAirport[pref.id] = a.id;
          }
          (a.targets || []).forEach((muniName) => {
            const muni = KYUSHU_MUNICIPALITIES.find((m) => m.name === muniName);
            if (muni) nextMuniOverride[muni.id ?? muni.name] = a.id;
          });
        });
        AIRPORTS = nextAirports;
        PREF_AIRPORT = nextPrefAirport;
        MUNI_AIRPORT_OVERRIDE = nextMuniOverride;
        setAirportsReady(true); // 再描画を促し、activeAirportに反映させる
      })
      .catch((err) => {
        console.error('空港データ(airports.json)の取得に失敗しました。既定値のまま動作します:', err);
      });
    return () => { cancelled = true; };
  }, []);

  const [ferriesReady, setFerriesReady] = useState(false); // data/ferries.jsonの取得が完了したか

  // 起動時: data/ferries.json(スプレッドシート「フェリー」シート由来)を取得し、
  // 取得できればFERRIES/MUNI_FERRY_OVERRIDEをその内容で置き換える。
  // 空港と違い「県ごとの既定値」は無いので、対象市町村(targets)以外は何もしない。
  useEffect(() => {
    let cancelled = false;
    fetch('/data/ferries.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        const nextFerries = {};
        const nextMuniOverride = {};
        rows.forEach((f) => {
          if (!f.id) return;
          nextFerries[f.id] = { name: f.name, nameEn: f.nameEn, lat: f.lat, lon: f.lng };
          (f.targets || []).forEach((muniName) => {
            const muni = KYUSHU_MUNICIPALITIES.find((m) => m.name === muniName);
            if (muni) nextMuniOverride[muni.id ?? muni.name] = f.id;
          });
        });
        FERRIES = nextFerries;
        MUNI_FERRY_OVERRIDE = nextMuniOverride;
        setFerriesReady(true); // 再描画を促す
      })
      .catch((err) => {
        console.error('フェリーデータ(ferries.json)の取得に失敗しました:', err);
      });
    return () => { cancelled = true; };
  }, []);

  // 初回読み込み時: GAS Web App→GitHub→ConoHa WING経由で配信されている本物のスポット
  // データを取得してSPOTSに反映し、それが終わってから、ブラウザに保存済みのプラン
  // 一覧の読み込み・共有リンク(URLの?planパラメータ)の復元を行う
  useEffect(() => {
    fetch(SPOTS_DATA_URL)
      .then((r) => r.json())
      .then((rows) => {
        const mapped = (Array.isArray(rows) ? rows : [])
          .map((s) => ({
            id: s.id,
            category: CATEGORY_JA_TO_EN[s.category] || s.category,
            name: s.name,
            nameEn: s.nameEn,
            x: s.x,
            y: s.y,
            duration: s.duration,
            price: s.price,
            image: s.image || undefined,
            desc: s.desc,
            descEn: s.descEn,
            hours: s.hours,
          }))
          // 緯度経度が無い(ジオコーディング未完了)スポットは、地図上に置く場所が無いので除外する
          .filter((s) => typeof s.x === 'number' && typeof s.y === 'number' && !Number.isNaN(s.x) && !Number.isNaN(s.y));
        // 本物のデータが1件も無ければ、プレビュー確認用の仮スポット(A/B/C/D)を代わりに使う
        SPOTS.push(...(mapped.length > 0 ? mapped : DEMO_SPOTS));
      })
      .catch((err) => {
        console.error('スポットデータの取得に失敗しました:', err);
        // 取得自体に失敗した場合も、プレビュー確認用の仮スポット(A/B/C/D)を使う
        SPOTS.push(...DEMO_SPOTS);
      })
      .finally(() => {
        try {
          const raw = localStorage.getItem(SAVED_PLANS_STORAGE_KEY);
          const list = raw ? JSON.parse(raw) : [];
          setSavedPlans(Array.isArray(list) ? list : []);
        } catch {
          setSavedPlans([]);
        }

        try {
          const params = new URLSearchParams(window.location.search);
          const encoded = params.get('plan');
          if (encoded) {
            const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
            const compact = JSON.parse(json);
            const validIds = new Set(SPOTS.map((s) => s.id));
            const safeCandidates = Array.isArray(compact.c) ? compact.c.filter((id) => validIds.has(id)) : [];
            const safeDecided = Array.isArray(compact.d) ? compact.d.filter((id) => validIds.has(id)) : [];
            const safeReserved = Array.isArray(compact.r) ? compact.r.filter((id) => validIds.has(id)) : [];
            const safeDuration = (compact.du && typeof compact.du === 'object') ? compact.du : {};
            const safeBudget = Number.isFinite(compact.b) ? compact.b : 20000;
            const safeTravelers = Number.isFinite(compact.t) ? Math.max(1, compact.t) : 1;
            setCandidates(safeCandidates);
            setDecided(safeDecided);
            setReserved(safeReserved);
            setCustomDuration(safeDuration);
            setBudget(safeBudget);
            setTravelers(safeTravelers);
            setAppStage('muni');
            setSelectedCity('42204');
            setSharedPlanBanner(true);
            // 決定済みスポットが1件以上あれば、ルート計算まで行ってタイムライン画面を直接表示する
            if (safeDecided.length > 0) {
              const { stops, distances, modes } = computeRouteFrom(activeAirportSvg, safeDecided);
              setRouteStops(stops);
              setLegDistances(distances);
              setLegModes(modes);
              setView('route');
            }
            // 共有元のURLを汚さないよう、復元後はクエリパラメータを取り除く
            const cleanUrl = new URL(window.location.href);
            cleanUrl.search = '';
            window.history.replaceState({}, '', cleanUrl.toString());
          }
        } catch {
          // 共有リンクが壊れている場合は通常起動にフォールバック(エラーは出さない)
        }

        setSpotsReady(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // selectedCityが変わるたびに、その市の実データ(activeCityConfig.dataUrl)を取得してSPOTSを入れ替える。
  // 初回マウント時の取得(上のuseEffect、共有リンク用に諫早市データを読む)とは別に、
  // ユーザーが県ページから別の市(体験可能な市に限る)を選んだ場合はここで読み直す。
  useEffect(() => {
    if (!selectedCity || !CITY_CONFIGS[selectedCity]) return;
    const cfg = CITY_CONFIGS[selectedCity];
    let cancelled = false;
    setSpotsReady(false);
    fetch(cfg.dataUrl)
      .then((r) => r.json())
      .then((rows) => {
        if (cancelled) return;
        const mapped = (Array.isArray(rows) ? rows : [])
          .map((s) => ({
            id: s.id,
            category: CATEGORY_JA_TO_EN[s.category] || s.category,
            name: s.name,
            nameEn: s.nameEn,
            x: s.x,
            y: s.y,
            duration: s.duration,
            price: s.price,
            image: s.image || undefined,
            desc: s.desc,
            descEn: s.descEn,
            hours: s.hours,
          }))
          .filter((s) => typeof s.x === 'number' && typeof s.y === 'number' && !Number.isNaN(s.x) && !Number.isNaN(s.y));
        SPOTS.length = 0;
        SPOTS.push(...(mapped.length > 0 ? mapped : DEMO_SPOTS));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`${cfg.name}のスポットデータの取得に失敗しました:`, err);
        SPOTS.length = 0;
        SPOTS.push(...DEMO_SPOTS);
      })
      .finally(() => {
        if (!cancelled) setSpotsReady(true);
      });
    return () => { cancelled = true; };
  }, [selectedCity]);

  // 「目的で探す」: 県を選ぶと、その県内の全市町村のスポットデータ(CITY_CONFIGSにdataUrlがあるもの)を
  // まとめて取得し、選択中のカテゴリ(今のところ道の駅のみ)に一致するものだけ抽出する。
  useEffect(() => {
    if (appStage !== 'purpose' || purposeCategory !== 'roadside' || !purposePrefId) return;
    let cancelled = false;
    setPurposeLoading(true);
    setPurposeSpots([]);

    const cityIds = Object.keys(CITY_CONFIGS).filter((id) => CITY_CONFIGS[id].prefId === purposePrefId);
    Promise.all(
      cityIds.map((cityId) => {
        const cfg = CITY_CONFIGS[cityId];
        return fetch(cfg.dataUrl)
          .then((r) => (r.ok ? r.json() : []))
          .then((rows) => (Array.isArray(rows) ? rows : []))
          .catch(() => []); // 1市町村分の取得に失敗しても、他の市町村には影響させない
      })
    ).then((results) => {
      if (cancelled) return;
      const merged = results.flat().filter((s) => s.category === '道の駅');
      merged.sort((a, b) => (a.city || '').localeCompare(b.city || '', 'ja'));
      setPurposeSpots(merged);
      setPurposeLoading(false);
    });

    return () => { cancelled = true; };
  }, [appStage, purposeCategory, purposePrefId]);

  // 地図の「道の駅」ピン表示用: 九州ページでONにした場合は全県分、県ページでONにした場合はその県分だけ取得する。
  // CITY_CONFIGSにはまだ一部の市町村しか登録されていないため、道の駅は
  // KYUSHU_MUNICIPALITIES(全市町村のリスト)を使って、conotavi.com/data/○○市.json を
  // 市町村名で直接取得する(各市町村のデータファイルには、その市町村の道の駅も含まれている)。
  // 一度に大量(約100件)のリクエストを同時に送るとサーバー側の同時接続数制限に
  // 引っかかり一部が失敗することがあったため、少数ずつ順番にまとめて取得する。
  useEffect(() => {
    if (!showRoadsidePins) return;
    if (appStage !== 'kyushu' && appStage !== 'region') return;
    let cancelled = false;
    setRoadsideMapLoading(true);

    const targetMunis = appStage === 'region'
      ? KYUSHU_MUNICIPALITIES.filter((m) => m.prefId === selectedPrefId)
      : KYUSHU_MUNICIPALITIES;

    const BATCH_SIZE = 8;
    async function fetchAllInBatches() {
      const allRows = [];
      for (let i = 0; i < targetMunis.length; i += BATCH_SIZE) {
        if (cancelled) return allRows;
        const batch = targetMunis.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map((m) => {
            const url = `/data/${encodeURIComponent(m.name)}.json`;
            return fetch(url)
              .then((r) => (r.ok ? r.json() : []))
              .then((rows) => (Array.isArray(rows) ? rows : []))
              .then((rows) => rows.map((row) => ({ ...row, cityId: m.id ?? m.name, prefId: m.prefId })))
              .catch(() => []);
          })
        );
        allRows.push(...batchResults.flat());
      }
      return allRows;
    }

    fetchAllInBatches().then((allRows) => {
      if (cancelled) return;
      const merged = allRows.filter((s) => s.category === '道の駅' && typeof s.x === 'number' && typeof s.y === 'number');
      if (merged.length) {
        setRoadsideMapSpots(merged);
      } else {
        // 実データが取得できなかった場合(通信環境・プレビューなど)は既定値を使う
        const fallback = appStage === 'region' ? DEFAULT_ROADSIDE.filter((s) => s.prefId === selectedPrefId) : DEFAULT_ROADSIDE;
        setRoadsideMapSpots(fallback);
      }
      setRoadsideMapLoading(false);
    });

    return () => { cancelled = true; };
  }, [showRoadsidePins, appStage, selectedPrefId]);

  // 詳細カードで開くスポットが変わったら、説明文の「もっと見る」展開状態をリセットする
  useEffect(() => {
    setDescExpanded(false);
  }, [selectedId]);

  const visibleSpots = SPOTS.filter((s) => s.category === activeCategory);
  const selectedSpot = SPOTS.find((s) => s.id === selectedId) || null;
  // 詳細モーダルが開いていればそのスポット、それ以外は地図/リストでハイライト中(1回タップ)のスポットを対象にする
  const travelTargetSpot = selectedSpot || SPOTS.find((s) => s.id === linkedId) || null;

  // 現在地が表示されている場合、対象スポットまでの直線距離と簡易移動時間を算出(デモ用の概算値)
  const travelFromMe = useMemo(() => {
    if (!myLocation || !travelTargetSpot) return null;
    const spotGeo = svgToGeo(travelTargetSpot.x, travelTargetSpot.y);
    const km = haversineKm(myLocation.lat, myLocation.lon, spotGeo.lat, spotGeo.lon);
    return {
      km,
      car: estimateMinutes(km, TRAVEL_SPEED_KMH.car),
      transit: estimateMinutes(km, TRAVEL_SPEED_KMH.transit),
      walk: estimateMinutes(km, TRAVEL_SPEED_KMH.walk),
    };
  }, [myLocation, travelTargetSpot]);

  const canCreateRoute = decided.length > 0;
  // ルートの実際の出発地点: 「現在地」が選択され、かつ現在地を取得済みの場合のみ現在地を使う。
  // 「フェリー」が選択され、かつこの市にフェリーターミナルがある場合はそちらを使う。
  // 「地名を入力」の場合は座標取得ができないため、仮に空港の座標を代用する。それ以外は表示中の市の最寄り空港。
  const originIsFerry = routeOrigin === 'ferry' && !!activeFerrySvg;
  const effectiveOrigin = (routeOrigin === 'mylocation' && myLocation)
    ? myLocation
    : originIsFerry
      ? activeFerrySvg
      : activeAirportSvg;
  const originIsMyLocation = routeOrigin === 'mylocation' && !!myLocation;
  const originIsCustom = routeOrigin === 'custom' && !!customOriginName.trim();
  const originLabel = (lang) => originIsCustom
    ? customOriginName.trim()
    : originIsMyLocation
      ? (lang === 'en' ? 'Your location' : '現在地')
      : originIsFerry
        ? (lang === 'en' ? activeFerry.nameEn : activeFerry.name)
        : (lang === 'en' ? activeAirport.nameEn : activeAirport.name);
  // Googleマップでのナビ用クエリ。現在地の場合は緯度経度をそのまま渡す(地名より正確なため)
  const originQueryFor = () => originIsMyLocation
    ? `${myLocation.lat},${myLocation.lon}`
    : originIsFerry ? activeFerry.name : activeAirport.name;

  const spentBudget = decided.reduce((sum, id) => sum + (SPOTS.find((s) => s.id === id)?.price || 0) * travelers, 0);
  const remainingBudget = budget - spentBudget;
  // カテゴリ別の使用額(観光・食事・宿泊・道の駅)。予算配分グラフ表示に使用。
  const spentByCategory = useMemo(() => {
    const totals = { sightseeing: 0, food: 0, lodging: 0, roadside: 0 };
    decided.forEach((id) => {
      const spot = SPOTS.find((s) => s.id === id);
      if (spot) totals[spot.category] += (spot.price || 0) * travelers;
    });
    return totals;
  }, [decided, travelers]);
  function wouldExceedBudget(spot) {
    if (decided.includes(spot.id)) return false;
    return spentBudget + (spot.price || 0) * travelers > budget;
  }

  // 表示言語に応じてスポット名・説明・市町村名・カテゴリラベルを切り替える
  function sName(spot) { return lang === 'en' ? (spot.nameEn || spot.name) : spot.name; }
  function sDesc(spot) { return lang === 'en' ? (spot.descEn || spot.desc) : spot.desc; }
  function mName(m) { return lang === 'en' ? (m.nameEn || m.name) : m.name; }
  function catLabel(meta) { return meta.label[lang]; }
  function modeLabel(mode) { return MODE_LABEL[mode][lang]; }

  // 地図ピン・リスト項目共通: 1回目のタップは地図⇄リストの相互ハイライトのみ、
  // 同じ地点をもう一度タップすると詳細モーダルを開く
  function handleSpotTap(id) {
    if (linkedId === id) {
      setSelectedId(id);
    } else {
      setLinkedId(id);
    }
  }

  function toggleCandidate(id) {
    setCandidates((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleDecided(id) {
    setDecided((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleReserved(id) {
    setReserved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleCardDescExpanded(id) {
    setExpandedCardDescs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  // 予約ボタンを表示するかどうか: 飲食店・宿泊施設のみ予約の概念があるとみなす(観光地・道の駅は不要)
  function needsReservation(spot) {
    return spot.category === 'food' || spot.category === 'lodging';
  }
  function getDuration(spot) {
    return customDuration[spot.id] ?? spot.duration;
  }
  function adjustDuration(id, delta) {
    setCustomDuration((prev) => {
      const spot = SPOTS.find((s) => s.id === id);
      const current = prev[id] ?? spot.duration;
      const next = Math.min(180, Math.max(10, current + delta));
      return { ...prev, [id]: next };
    });
  }
  function updateLegMode(legIndex, mode) {
    setLegModes((prev) => prev.map((m, i) => (i === legIndex ? mode : m)));
  }
  function adjustTravelers(delta) {
    setTravelers((prev) => Math.min(50, Math.max(1, prev + delta)));
  }
  function adjustBudget(delta) {
    setBudget((prev) => Math.max(0, prev + delta));
  }

  function locateMe(options) {
    const useAsRouteOrigin = options && options.useAsRouteOrigin;
    if (!('geolocation' in navigator)) {
      setLocationError(lang === 'en' ? 'Your browser does not support location services.' : 'お使いの端末は位置情報サービスに対応していません。');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const svg = geoToSvg(latitude, longitude);
        const loc = { x: svg.x, y: svg.y, lat: latitude, lon: longitude };
        setMyLocation(loc);
        setLocating(false);
        if (useAsRouteOrigin) {
          setRouteOrigin('mylocation');
          recalcRouteFromMyLocation(loc);
        }
        // 表示中の市の地図描画範囲から大きく外れている場合は注意書きを出す
        const margin = 150;
        const { crop } = activeCityConfig;
        if (svg.x < crop.x - margin || svg.x > crop.x + activeCityConfig.viewW + margin || svg.y < crop.y - margin || svg.y > crop.y + activeCityConfig.viewH + margin) {
          setLocationError(lang === 'en'
            ? `You appear to be far from ${activeCityConfig.nameEn}, so the position shown may be inaccurate.`
            : `${activeCityConfig.name}から離れた場所にいるようです。表示位置の精度が低い可能性があります。`);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(lang === 'en' ? 'Location access was denied. Please allow location access in your browser settings.' : '位置情報の利用が許可されませんでした。ブラウザの設定をご確認ください。');
        } else {
          setLocationError(lang === 'en' ? 'Could not get your location. Please try again.' : '現在地を取得できませんでした。もう一度お試しください。');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // 決定済みスポットを指定の出発地点から最近隣法で並べ替え、距離・移動手段を算出する
  function computeRouteFrom(origin, decidedIds) {
    const ids = decidedIds || decided;
    const decidedSpots = ids.map((id) => SPOTS.find((s) => s.id === id));
    const lodgings = decidedSpots.filter((s) => s.category === 'lodging');
    let remaining = decidedSpots.filter((s) => s.category !== 'lodging');

    let current = origin;
    const ordered = [];
    while (remaining.length) {
      remaining = [...remaining].sort((a, b) => dist(current, a) - dist(current, b));
      const next = remaining.shift();
      ordered.push(next);
      current = next;
    }

    // 宿泊地が決定されていれば、最後に最も近い宿泊地へ。なければ最後の地点で終了
    let stops = ordered;
    if (lodgings.length) {
      const sortedLodging = [...lodgings].sort((a, b) => dist(current, a) - dist(current, b));
      stops = [...ordered, sortedLodging[0]];
    }

    const distances = [];
    let prevPoint = origin;
    stops.forEach((spot) => {
      distances.push(dist(prevPoint, spot));
      prevPoint = spot;
    });
    const modes = distances.map((d) => autoMode(d));
    return { stops, distances, modes };
  }

  function buildRoute() {
    if (!canCreateRoute) return;
    setCalculating(true);
    setTimeout(() => {
      const { stops, distances, modes } = computeRouteFrom(effectiveOrigin);
      setRouteStops(stops);
      setLegDistances(distances);
      setLegModes(modes);
      setCalculating(false);
      setView('route');
    }, 1300);
  }

  // ルート画面で現在地を取得/更新した際、出発地を現在地に切り替えて訪問順を含め再計算する
  function recalcRouteFromMyLocation(loc) {
    if (!routeStops) return;
    const { stops, distances, modes } = computeRouteFrom({ x: loc.x, y: loc.y });
    setRouteStops(stops);
    setLegDistances(distances);
    setLegModes(modes);
  }

  // 移動手段・滞在時間の変更に応じてスケジュールをリアルタイムに再計算
  const plan = useMemo(() => {
    if (!routeStops || !routeStops.length) return null;
    let time = '10:00';
    const startLabel = originIsMyLocation
      ? (lang === 'en' ? 'Depart from your location' : '現在地 出発')
      : originIsFerry
        ? (lang === 'en' ? `Depart ${activeFerry.nameEn}` : `${activeFerry.name} 出発`)
        : (lang === 'en' ? `Depart ${activeAirport.nameEn}` : `${activeAirport.name} 出発`);
    const items = [{ type: 'start', label: startLabel, time }];
    routeStops.forEach((spot, i) => {
      const d = legDistances[i];
      const mode = legModes[i] || 'walk';
      const minutes = minutesForMode(d, mode);
      const arrive = addMinutes(time, minutes);
      items.push({ type: 'travel', mode, minutes, distance: (d / 20).toFixed(1) });
      const isHotel = spot.category === 'lodging';
      const stay = isHotel ? null : getDuration(spot);
      items.push({
        type: isHotel ? 'end' : 'stop',
        label: sName(spot),
        category: spot.category,
        spotId: spot.id,
        arrive,
        depart: isHotel ? null : addMinutes(arrive, stay),
        stay,
      });
      time = isHotel ? arrive : addMinutes(arrive, stay);
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStops, legDistances, legModes, customDuration, lang, originIsMyLocation, originIsFerry, activeAirport, activeFerry]);

  // 現在の選択状態を、保存・ファイル出力・共有用の軽量なスナップショットにまとめる
  // (ルート計算結果(routeStops等)は decided から再計算できるため含めない=データを軽く保つ)
  function buildPlanSnapshot(name) {
    return {
      v: PLAN_FORMAT_VERSION,
      name: name || '',
      candidates,
      decided,
      reserved,
      customDuration,
      budget,
      travelers,
      routeOrigin: 'airport', // 現在地・地名入力(仮)は端末/入力ごとに変わるため保存時は空港扱いに戻す
      savedAt: new Date().toISOString(),
    };
  }

  // スナップショットから選択状態を復元する。存在しないスポットIDは無視し、壊れたデータでも極力復元する
  function applyPlanSnapshot(snap) {
    if (!snap || typeof snap !== 'object') return false;
    const validIds = new Set(SPOTS.map((s) => s.id));
    const safeCandidates = Array.isArray(snap.candidates) ? snap.candidates.filter((id) => validIds.has(id)) : [];
    const safeDecided = Array.isArray(snap.decided) ? snap.decided.filter((id) => validIds.has(id)) : [];
    const safeReserved = Array.isArray(snap.reserved) ? snap.reserved.filter((id) => validIds.has(id)) : [];
    const safeDuration = (snap.customDuration && typeof snap.customDuration === 'object') ? snap.customDuration : {};
    setCandidates(safeCandidates);
    setDecided(safeDecided);
    setReserved(safeReserved);
    setCustomDuration(safeDuration);
    setBudget(Number.isFinite(snap.budget) ? snap.budget : 20000);
    setTravelers(Number.isFinite(snap.travelers) ? Math.max(1, snap.travelers) : 1);
    setRouteOrigin('airport');
    setSelectedId(null);
    setLinkedId(null);
    if (safeDecided.length > 0) {
      const { stops, distances, modes } = computeRouteFrom(activeAirportSvg, safeDecided);
      setRouteStops(stops);
      setLegDistances(distances);
      setLegModes(modes);
      setView('route');
    } else {
      setRouteStops(null);
      setLegDistances([]);
      setLegModes([]);
      setView('select');
    }
    return true;
  }

  function loadSavedPlansFromStorage() {
    try {
      const raw = localStorage.getItem(SAVED_PLANS_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setSavedPlans(Array.isArray(list) ? list : []);
    } catch {
      setSavedPlans([]);
    }
  }

  function persistSavedPlans(list) {
    setSavedPlans(list);
    try {
      localStorage.setItem(SAVED_PLANS_STORAGE_KEY, JSON.stringify(list));
    } catch {
      setPlanToast(lang === 'en' ? 'Could not save to this browser.' : 'ブラウザへの保存に失敗しました。');
    }
  }

  function savePlanToBrowser(name) {
    const snap = buildPlanSnapshot(name || (lang === 'en' ? 'Untitled plan' : '名称未設定のプラン'));
    const next = [snap, ...savedPlans].slice(0, 20); // 端末の保存領域を圧迫しないよう上限20件
    persistSavedPlans(next);
    setShowSaveDialog(false);
    setSaveNameInput('');
    setPlanToast(lang === 'en' ? 'Plan saved to this browser.' : 'このブラウザにプランを保存しました。');
  }

  function deleteSavedPlan(index) {
    const next = savedPlans.filter((_, i) => i !== index);
    persistSavedPlans(next);
  }

  function loadSavedPlan(snap) {
    applyPlanSnapshot(snap);
    setShowSaveDialog(false);
    setPlanToast(lang === 'en' ? 'Plan loaded.' : 'プランを読み込みました。');
  }

  // プランをJSONファイルとしてダウンロードする(別端末への移動やバックアップ用)
  function exportPlanToFile() {
    const snap = buildPlanSnapshot(lang === 'en' ? 'Exported plan' : '書き出したプラン');
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `conotavi-plan-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setPlanToast(lang === 'en' ? 'Plan file downloaded.' : 'プランのファイルをダウンロードしました。');
  }

  // アップロードされたJSONファイルからプランを復元する
  function importPlanFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snap = JSON.parse(reader.result);
        applyPlanSnapshot(snap);
        setPlanToast(lang === 'en' ? 'Plan file loaded.' : 'ファイルからプランを読み込みました。');
      } catch {
        setPlanToast(lang === 'en' ? 'This file could not be read as a plan.' : 'このファイルはプランとして読み込めませんでした。');
      }
    };
    reader.readAsText(file);
  }

  // プランをURLに埋め込んで共有用リンクを作る(専用サーバーを使わず、リンクを開いた人の端末上で再現する方式)
  function buildShareUrl() {
    const snap = buildPlanSnapshot('');
    const compact = {
      v: snap.v,
      c: snap.candidates,
      d: snap.decided,
      r: snap.reserved,
      du: snap.customDuration,
      b: snap.budget,
      t: snap.travelers,
    };
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(compact)))));
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('plan', encoded);
    return url.toString();
  }

  function decodeShareParam(encoded) {
    try {
      const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
      const compact = JSON.parse(json);
      return {
        v: compact.v,
        candidates: compact.c,
        decided: compact.d,
        reserved: compact.r,
        customDuration: compact.du,
        budget: compact.b,
        travelers: compact.t,
      };
    } catch {
      return null;
    }
  }

  async function shareCurrentPlan() {
    const url = buildShareUrl();
    const shareText = lang === 'en'
      ? `My CONOTAVI travel plan for Isahaya City:\n${url}`
      : `諫早市のCONOTAVI旅行プランです:\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'CONOTAVI', text: shareText, url });
      } catch (err) {
        // ユーザー自身が共有をキャンセルした場合は何もしない。それ以外の失敗時はダイアログにフォールバック
        if (err && err.name !== 'AbortError') {
          setShowShareDialog(true);
        }
      }
      return;
    }
    setShowShareDialog(true);
  }

  async function copyShareUrl() {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setPlanToast(lang === 'en' ? 'Link copied.' : 'リンクをコピーしました。');
    } catch {
      setPlanToast(lang === 'en' ? 'Could not copy the link.' : 'リンクをコピーできませんでした。');
    }
  }

  function reset() {
    setCandidates([]);
    setDecided([]);
    setReserved([]);
    setCustomDuration({});
    setRouteStops(null);
    setLegDistances([]);
    setLegModes([]);
    setRouteOrigin('airport');
    setView('select');
    setSelectedId(null);
    setLinkedId(null);
  }

  const totalLabel = plan ? formatDuration(diffMinutes(plan[0].time, plan[plan.length - 1].arrive), lang) : '';

  // ルートマップに描く点線(出発地→決定順の各スポット)
  const routePolylinePoints = routeStops
    ? [effectiveOrigin, ...routeStops].map((p) => `${p.x},${p.y}`).join(' ')
    : '';

  // 寄り道モード: ルート上の各地点付近にある未決定のおすすめスポットを検出(カテゴリで絞り込み可能)
  const nearbySpots = useMemo(() => {
    if (!detourMode || !routeStops || !routeStops.length) return [];
    const routeIds = new Set(routeStops.map((s) => s.id));
    const found = new Map();
    routeStops.forEach((stop) => {
      SPOTS.forEach((s) => {
        if (routeIds.has(s.id) || found.has(s.id)) return;
        if (detourCategory !== 'all' && s.category !== detourCategory) return;
        if (dist(s, stop) < 75) found.set(s.id, s);
      });
    });
    return Array.from(found.values());
  }, [detourMode, detourCategory, routeStops]);

  // Googleマップでのナビ用に、区間ごとの出発地・目的地・移動手段を整理
  // 表示名は言語に応じて切り替えるが、検索クエリ(originQuery/destinationQuery)は
  // 正確なジオコーディングのため常に日本語名(現在地利用時は緯度経度)を使用する
  const naviLegs = useMemo(() => {
    if (!routeStops || !routeStops.length) return [];
    let prevName = originQueryFor();
    const startLabel = originLabel(lang);
    return routeStops.map((spot, i) => {
      const leg = {
        fromLabel: i === 0 ? startLabel : sName(routeStops[i - 1]),
        toLabel: sName(spot),
        originQuery: prevName,
        destinationQuery: `${spot.name} 諫早市`,
        mode: legModes[i] || 'walk',
        distanceKm: (legDistances[i] / 20).toFixed(1),
      };
      prevName = `${spot.name} 諫早市`;
      return leg;
    });
  }, [routeStops, legModes, legDistances, lang, originIsMyLocation, myLocation, originIsFerry, activeFerry, activeAirport]);

  const naviCombinedUrl = useMemo(() => {
    if (!routeStops || !routeStops.length) return '#';
    const destination = `${routeStops[routeStops.length - 1].name} 諫早市`;
    const waypoints = routeStops.slice(0, -1).map((s) => `${s.name} 諫早市`).join('|');
    const params = new URLSearchParams({ api: '1', origin: originQueryFor(), destination, travelmode: 'driving' });
    if (waypoints) params.set('waypoints', waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [routeStops, originIsMyLocation, myLocation, originIsFerry, activeFerry, activeAirport]);

  // 観光地カード(カード一覧/候補/決定ページで共通利用)
  function renderSpotCard(spot) {
    const meta = CATEGORY_META[spot.category];
    const Icon = meta.icon;
    const isCandidate = candidates.includes(spot.id);
    const isDecided = decided.includes(spot.id);
    const isReserved = reserved.includes(spot.id);
    const state = isDecided ? 'decided' : isCandidate ? 'candidate' : 'default';
    const overBudget = wouldExceedBudget(spot);
    const priceRangeText = formatPriceRangeText(spot.priceRangeText);
    const priceLabel = priceRangeText
      ? `¥${priceRangeText}${travelers > 1 ? ` ×${travelers}` : ''}`
      : spot.price
        ? `¥${spot.price.toLocaleString()}${travelers > 1 ? ` ×${travelers}` : ''}`
        : (lang === 'en' ? 'Free' : '無料');

    if (spot.image) {
      // 写真があるスポットは、写真ブロック+完全な黒地テキストパネルの2段構成(グラデーションではなく黒塗り+白文字)
      return (
        <div
          key={spot.id}
          className={`spot-card has-photo ${overBudget ? 'is-over-budget' : ''}`}
          style={{ '--cat-color': meta.color, '--cat-tint': meta.tint }}
          onClick={() => setSelectedId(spot.id)}
        >
          <div className="card-photo-frame">
            <img src={spot.image} alt={sName(spot)} className="card-photo-img" loading="lazy" decoding="async" />
            {(state === 'decided' || state === 'candidate') && (
              <span className="card-photo-badge">
                {state === 'decided' ? <Check size={12} /> : <Star size={12} />}
              </span>
            )}
          </div>
          <div className="card-photo-panel">
            <div className="card-photo-info">
              <span className="card-photo-tag"><Icon size={9} />{catLabel(meta)}</span>
              <span className="card-photo-price">{priceLabel}</span>
            </div>
            <span className="card-photo-name">{sName(spot)}</span>
            <p className={`card-photo-desc ${expandedCardDescs.includes(spot.id) ? '' : 'is-clamped'}`}>{sDesc(spot)}</p>
            {!expandedCardDescs.includes(spot.id) && (
              <button
                type="button"
                className="card-photo-more"
                onClick={(e) => { e.stopPropagation(); toggleCardDescExpanded(spot.id); }}
              >
                {lang === 'en' ? 'Show more' : 'もっと見る'}
              </button>
            )}
            {overBudget && <span className="card-photo-budget-warn">{lang === 'en' ? 'Over budget' : '予算オーバー'}</span>}
            <div className="card-photo-actions">
              <button
                className={`card-action-btn ${isCandidate ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleCandidate(spot.id); }}
              >
                <Star size={10} /> {lang === 'en' ? 'Save' : '候補'}
              </button>
              <button
                className={`card-action-btn ${isDecided ? 'active' : ''}`}
                disabled={overBudget}
                onClick={(e) => { e.stopPropagation(); toggleDecided(spot.id); }}
              >
                <Check size={10} /> {lang === 'en' ? 'Pick' : '決定'}
              </button>
              {needsReservation(spot) && (
                <button
                  className={`card-action-btn ${isReserved ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleReserved(spot.id); }}
                >
                  <Calendar size={10} /> {lang === 'en' ? 'Book' : '予約'}
                </button>
              )}
              {spot.affiliateUrl && (
                <a
                  className="card-action-btn"
                  href={spot.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={10} /> {lang === 'en' ? 'Book here' : '予約はこちら'}
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={spot.id}
        className={`spot-card ${state === 'decided' ? 'is-decided' : state === 'candidate' ? 'is-candidate' : ''} ${overBudget ? 'is-over-budget' : ''}`}
        style={{ '--cat-color': meta.color, '--cat-tint': meta.tint }}
        onClick={() => setSelectedId(spot.id)}
      >
        <div className="card-hero" style={{ background: 'var(--cat-tint)' }}>
          <Icon size={26} className="card-hero-icon" />
          {state === 'decided' && (
            <span className="card-hero-badge"><Check size={12} /></span>
          )}
        </div>
        <div className="card-body">
          <span className="card-tag"><Icon size={10} />{catLabel(meta)}</span>
          <div className="card-top">
            <span className="card-name">{sName(spot)}</span>
            {state === 'candidate' && <Star size={13} className="card-state-icon" />}
          </div>
          <p className="card-desc">{sDesc(spot)}</p>
          <div className="card-meta-row">
            {spot.category !== 'lodging' && (
              <span className="card-duration">
                <Clock size={11} /> {lang === 'en' ? `avg. ${getDuration(spot)} min` : `平均${getDuration(spot)}分`}
              </span>
            )}
            <span className="card-price">{priceLabel}</span>
          </div>
          {overBudget && <span className="card-budget-warn">{lang === 'en' ? 'Over budget' : '予算オーバー'}</span>}
          <div className="card-actions">
            <button
              className={`card-action-btn ${isCandidate ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleCandidate(spot.id); }}
            >
              <Star size={11} /> {lang === 'en' ? 'Save' : '候補'}
            </button>
            <button
              className={`card-action-btn ${isDecided ? 'active' : ''}`}
              disabled={overBudget}
              onClick={(e) => { e.stopPropagation(); toggleDecided(spot.id); }}
            >
              <Check size={11} /> {lang === 'en' ? 'Pick' : '決定'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!spotsReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#5B616A', fontSize: 14 }}>
        読み込み中…
      </div>
    );
  }

  return (
    <div className="mairu-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@500&display=swap');

        html, body { margin:0; padding:0; }

        .mairu-app {
          --ink: #21262C;
          --muted: #8A8F98;
          --paper: #FFFFFF;
          --line: #C9CCD1;
          --lodge: #3B5E91;
          color-scheme: light only;
          forced-color-adjust: none;
          font-family: 'Noto Sans JP', sans-serif;
          color: var(--ink) !important;
          -webkit-text-fill-color: var(--ink) !important;
          background: var(--paper);
          min-height: 100vh;
          position: relative;
          box-sizing: border-box;
        }
        .mairu-app * {
          box-sizing: border-box;
          color-scheme: light only;
          forced-color-adjust: none;
          -webkit-text-fill-color: currentColor !important;
        }
        .mairu-app button { font-family: inherit; }
        .mairu-app button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .mairu-app input,
        .mairu-app select,
        .mairu-app textarea {
          color: var(--ink) !important;
          background: #fff;
        }

        .app-top {
          height:100vh;
          height:100dvh;
          position:relative;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          overflow:hidden;
          background:#FFFFFF;
        }
        .app-top-content { position:relative; z-index:1; text-align:center; max-width:360px; }
        .app-top-logo {
          font-family:'Zen Kaku Gothic New', sans-serif;
          font-size:clamp(44px, 12vw, 64px);
          font-weight:900;
          letter-spacing:0.02em;
          line-height:1;
          margin:0 0 14px;
          color:var(--ink);
        }
        .app-top-tagline { font-size:14.5px; color:#454A52; line-height:1.75; margin:0 0 32px; }
        .app-top-start-btn {
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding:15px 32px;
          border-radius:999px;
          border:none;
          background:var(--ink);
          color:#fff;
          font-size:14.5px;
          font-weight:700;
          letter-spacing:0.02em;
          cursor:pointer;
          transition: transform .15s, box-shadow .15s;
          box-shadow:0 8px 20px rgba(33,38,44,0.18);
          -webkit-tap-highlight-color: transparent;
        }
        @media (hover: hover) and (pointer: fine) {
          .app-top-start-btn:hover { transform:translateY(-1px); box-shadow:0 10px 24px rgba(33,38,44,0.24); }
          .app-top-start-btn:hover .app-top-start-arrow { transform:translateX(3px); }
        }
        .app-top-start-arrow { transition: transform .15s; }
        .lang-toggle-top { position:absolute; top:24px; right:24px; display:flex; align-items:center; gap:8px; padding:6px 14px; border-radius:999px; border:1px solid var(--line); background:#fff; z-index:1; }
        .lang-toggle-opt { background:none; border:none; font-size:13px; font-weight:600; color:var(--muted); cursor:pointer; padding:0; font-family:inherit; -webkit-tap-highlight-color:transparent; }
        .lang-toggle-opt.active { color:var(--ink); }
        .lang-toggle-sep { font-size:12px; color:var(--line); }

        /* ---------- 入り口選択画面(目的で探す・地域で探す・NO PLAN) ---------- */
        .entry-view {
          height:100vh;
          height:100dvh;
          display:flex;
          flex-direction:column;
          background:#EFF1F2;
          padding:0;
          position:relative;
        }
        .entry-view.isahaya-sea-bg { background:#D9E8F0; }
        .entry-view.minamishimabara-sea-bg { background:#D9E8F0; }
        .entry-view.shimabara-sea-bg { background:#D9E8F0; }
        .entry-view.nagasakicity-sea-bg { background:#D9E8F0; }
        .entry-view.sasebo-sea-bg { background:#D9E8F0; }
        .entry-view.omura-sea-bg { background:#D9E8F0; }
        .entry-view.hirado-sea-bg { background:#D9E8F0; }
        .entry-view.matsuura-sea-bg { background:#D9E8F0; }
        .entry-view.tsushima-sea-bg { background:#D9E8F0; }
        .entry-view.iki-sea-bg { background:#D9E8F0; }
        .entry-view.goto-sea-bg { background:#D9E8F0; }
        .entry-view.saikai-sea-bg { background:#D9E8F0; }
        .entry-view.unzen-sea-bg { background:#D9E8F0; }
        .entry-view.nagayo-sea-bg { background:#D9E8F0; }
        .entry-view.togitsu-sea-bg { background:#D9E8F0; }
        .entry-view.higashisonogi-sea-bg { background:#D9E8F0; }
        .entry-view.kawatana-sea-bg { background:#D9E8F0; }
        .entry-view.hasami-sea-bg { background:#D9E8F0; }
        .entry-view.ojika-sea-bg { background:#D9E8F0; }
        .entry-view.sasa-sea-bg { background:#D9E8F0; }
        .entry-view.shinkamigoto-sea-bg { background:#D9E8F0; }
        .entry-view.sagacity-sea-bg { background:#D9E8F0; }
        .entry-view.karatsu-sea-bg { background:#D9E8F0; }
        .entry-view.tosu-sea-bg { background:#D9E8F0; }
        .entry-view.taku-sea-bg { background:#D9E8F0; }
        .entry-view.imari-sea-bg { background:#D9E8F0; }
        .entry-view.takeo-sea-bg { background:#D9E8F0; }
        .entry-view.kashima-sea-bg { background:#D9E8F0; }
        .entry-view.ogi-sea-bg { background:#D9E8F0; }
        .entry-view.ureshino-sea-bg { background:#D9E8F0; }
        .entry-view.kanzaki-sea-bg { background:#D9E8F0; }
        .entry-view.yoshinogari-sea-bg { background:#D9E8F0; }
        .entry-view.kiyama-sea-bg { background:#D9E8F0; }
        .entry-view.kamimine-sea-bg { background:#D9E8F0; }
        .entry-view.miyaki-sea-bg { background:#D9E8F0; }
        .entry-view.genkai-sea-bg { background:#D9E8F0; }
        .entry-view.arita-sea-bg { background:#D9E8F0; }
        .entry-view.omachi-sea-bg { background:#D9E8F0; }
        .entry-view.kohoku-sea-bg { background:#D9E8F0; }
        .entry-view.shiroishi-sea-bg { background:#D9E8F0; }
        .entry-view.tara-sea-bg { background:#D9E8F0; }
        .entry-view.kitakyushu-sea-bg { background:#D9E8F0; }
        .entry-view.fukuokacity-sea-bg { background:#D9E8F0; }
        .entry-view.omuta-sea-bg { background:#D9E8F0; }
        .entry-view.kurume-sea-bg { background:#D9E8F0; }
        .entry-view.nogata-sea-bg { background:#D9E8F0; }
        .entry-view.iizuka-sea-bg { background:#D9E8F0; }
        .entry-view.tagawa-sea-bg { background:#D9E8F0; }
        .entry-view.yanagawa-sea-bg { background:#D9E8F0; }
        .entry-view.yame-sea-bg { background:#D9E8F0; }
        .entry-view.chikugo-sea-bg { background:#D9E8F0; }
        .entry-view.okawa-sea-bg { background:#D9E8F0; }
        .entry-view.yukuhashi-sea-bg { background:#D9E8F0; }
        .entry-view.buzen-sea-bg { background:#D9E8F0; }
        .entry-view.nakama-sea-bg { background:#D9E8F0; }
        .entry-view.ogori-sea-bg { background:#D9E8F0; }
        .entry-view.chikushino-sea-bg { background:#D9E8F0; }
        .entry-view.kasuga-sea-bg { background:#D9E8F0; }
        .entry-view.onojo-sea-bg { background:#D9E8F0; }
        .entry-view.munakata-sea-bg { background:#D9E8F0; }
        .entry-view.dazaifu-sea-bg { background:#D9E8F0; }
        .entry-view.koga-sea-bg { background:#D9E8F0; }
        .entry-view.fukutsu-sea-bg { background:#D9E8F0; }
        .entry-view.ukiha-sea-bg { background:#D9E8F0; }
        .entry-view.miyawaka-sea-bg { background:#D9E8F0; }
        .entry-view.kama-sea-bg { background:#D9E8F0; }
        .entry-view.asakura-sea-bg { background:#D9E8F0; }
        .entry-view.miyama-sea-bg { background:#D9E8F0; }
        .entry-view.itoshima-sea-bg { background:#D9E8F0; }
        .entry-view.nakagawa-sea-bg { background:#D9E8F0; }
        .entry-view.umi-sea-bg { background:#D9E8F0; }
        .entry-view.sasaguri-sea-bg { background:#D9E8F0; }
        .entry-view.shime-sea-bg { background:#D9E8F0; }
        .entry-view.sue-sea-bg { background:#D9E8F0; }
        .entry-view.shingu-sea-bg { background:#D9E8F0; }
        .entry-view.hisayama-sea-bg { background:#D9E8F0; }
        .entry-view.kasuya-sea-bg { background:#D9E8F0; }
        .entry-view.ashiya-sea-bg { background:#D9E8F0; }
        .entry-view.mizumaki-sea-bg { background:#D9E8F0; }
        .entry-view.okagaki-sea-bg { background:#D9E8F0; }
        .entry-view.onga-sea-bg { background:#D9E8F0; }
        .entry-view.kotake-sea-bg { background:#D9E8F0; }
        .entry-view.kurate-sea-bg { background:#D9E8F0; }
        .entry-view.keisen-sea-bg { background:#D9E8F0; }
        .entry-view.chikuzen-sea-bg { background:#D9E8F0; }
        .entry-view.toho-sea-bg { background:#D9E8F0; }
        .entry-view.tachiarai-sea-bg { background:#D9E8F0; }
        .entry-view.oki-sea-bg { background:#D9E8F0; }
        .entry-view.hirokawa-sea-bg { background:#D9E8F0; }
        .entry-view.kawara-sea-bg { background:#D9E8F0; }
        .entry-view.soeda-sea-bg { background:#D9E8F0; }
        .entry-view.itoda-sea-bg { background:#D9E8F0; }
        .entry-view.kawasakitown-sea-bg { background:#D9E8F0; }
        .entry-view.oto-sea-bg { background:#D9E8F0; }
        .entry-view.aka-sea-bg { background:#D9E8F0; }
        .entry-view.fukuchi-sea-bg { background:#D9E8F0; }
        .entry-view.kanda-sea-bg { background:#D9E8F0; }
        .entry-view.miyako-sea-bg { background:#D9E8F0; }
        .entry-view.yoshitomi-sea-bg { background:#D9E8F0; }
        .entry-view.koge-sea-bg { background:#D9E8F0; }
        .entry-view.chikujo-sea-bg { background:#D9E8F0; }
        .entry-view.oitacity-sea-bg { background:#D9E8F0; }
        .entry-view.beppu-sea-bg { background:#D9E8F0; }
        .entry-view.nakatsu-sea-bg { background:#D9E8F0; }
        .entry-view.hita-sea-bg { background:#D9E8F0; }
        .entry-view.saiki-sea-bg { background:#D9E8F0; }
        .entry-view.usuki-sea-bg { background:#D9E8F0; }
        .entry-view.tsukumi-sea-bg { background:#D9E8F0; }
        .entry-view.taketa-sea-bg { background:#D9E8F0; }
        .entry-view.bungotakada-sea-bg { background:#D9E8F0; }
        .entry-view.kitsuki-sea-bg { background:#D9E8F0; }
        .entry-view.usa-sea-bg { background:#D9E8F0; }
        .entry-view.bungoono-sea-bg { background:#D9E8F0; }
        .entry-view.yufu-sea-bg { background:#D9E8F0; }
        .entry-view.kunisaki-sea-bg { background:#D9E8F0; }
        .entry-view.himeshima-sea-bg { background:#D9E8F0; }
        .entry-view.hiji-sea-bg { background:#D9E8F0; }
        .entry-view.kokonoe-sea-bg { background:#D9E8F0; }
        .entry-view.kusu-sea-bg { background:#D9E8F0; }
        .entry-view.kumamotocity-sea-bg { background:#D9E8F0; }
        .entry-view.yatsushiro-sea-bg { background:#D9E8F0; }
        .entry-view.hitoyoshi-sea-bg { background:#D9E8F0; }
        .entry-view.arao-sea-bg { background:#D9E8F0; }
        .entry-view.minamata-sea-bg { background:#D9E8F0; }
        .entry-view.tamana-sea-bg { background:#D9E8F0; }
        .entry-view.yamaga-sea-bg { background:#D9E8F0; }
        .entry-view.kikuchi-sea-bg { background:#D9E8F0; }
        .entry-view.uto-sea-bg { background:#D9E8F0; }
        .entry-view.kamiamakusa-sea-bg { background:#D9E8F0; }
        .entry-view.uki-sea-bg { background:#D9E8F0; }
        .entry-view.aso-sea-bg { background:#D9E8F0; }
        .entry-view.amakusa-sea-bg { background:#D9E8F0; }
        .entry-view.koshi-sea-bg { background:#D9E8F0; }
        .entry-view.misato-sea-bg { background:#D9E8F0; }
        .entry-view.gyokuto-sea-bg { background:#D9E8F0; }
        .entry-view.nankan-sea-bg { background:#D9E8F0; }
        .entry-view.nagasu-sea-bg { background:#D9E8F0; }
        .entry-view.nagomi-sea-bg { background:#D9E8F0; }
        .entry-view.ozu-sea-bg { background:#D9E8F0; }
        .entry-view.kikuyo-sea-bg { background:#D9E8F0; }
        .entry-view.minamioguni-sea-bg { background:#D9E8F0; }
        .entry-view.oguni-sea-bg { background:#D9E8F0; }
        .entry-view.ubuyama-sea-bg { background:#D9E8F0; }
        .entry-view.takamori-sea-bg { background:#D9E8F0; }
        .entry-view.nishihara-sea-bg { background:#D9E8F0; }
        .entry-view.minamiaso-sea-bg { background:#D9E8F0; }
        .entry-view.mifune-sea-bg { background:#D9E8F0; }
        .entry-view.kashimatown-sea-bg { background:#D9E8F0; }
        .entry-view.mashiki-sea-bg { background:#D9E8F0; }
        .entry-view.kosa-sea-bg { background:#D9E8F0; }
        .entry-view.yamato-sea-bg { background:#D9E8F0; }
        .entry-view.hikawa-sea-bg { background:#D9E8F0; }
        .entry-view.ashikita-sea-bg { background:#D9E8F0; }
        .entry-view.tsunagi-sea-bg { background:#D9E8F0; }
        .entry-view.nishiki-sea-bg { background:#D9E8F0; }
        .entry-view.taragi-sea-bg { background:#D9E8F0; }
        .entry-view.yunomae-sea-bg { background:#D9E8F0; }
        .entry-view.mizukami-sea-bg { background:#D9E8F0; }
        .entry-view.sagara-sea-bg { background:#D9E8F0; }
        .entry-view.itsuki-sea-bg { background:#D9E8F0; }
        .entry-view.yamae-sea-bg { background:#D9E8F0; }
        .entry-view.kumavillage-sea-bg { background:#D9E8F0; }
        .entry-view.asagiri-sea-bg { background:#D9E8F0; }
        .entry-view.reihoku-sea-bg { background:#D9E8F0; }
        .entry-view.miyazakicity-sea-bg { background:#D9E8F0; }
        .entry-view.miyakonojo-sea-bg { background:#D9E8F0; }
        .entry-view.nobeoka-sea-bg { background:#D9E8F0; }
        .entry-view.nichinan-sea-bg { background:#D9E8F0; }
        .entry-view.kobayashi-sea-bg { background:#D9E8F0; }
        .entry-view.hyuga-sea-bg { background:#D9E8F0; }
        .entry-view.kushima-sea-bg { background:#D9E8F0; }
        .entry-view.saito-sea-bg { background:#D9E8F0; }
        .entry-view.ebino-sea-bg { background:#D9E8F0; }
        .entry-view.mimata-sea-bg { background:#D9E8F0; }
        .entry-view.takaharu-sea-bg { background:#D9E8F0; }
        .entry-view.kunitomi-sea-bg { background:#D9E8F0; }
        .entry-view.aya-sea-bg { background:#D9E8F0; }
        .entry-view.takanabe-sea-bg { background:#D9E8F0; }
        .entry-view.shintomi-sea-bg { background:#D9E8F0; }
        .entry-view.nishimera-sea-bg { background:#D9E8F0; }
        .entry-view.kijo-sea-bg { background:#D9E8F0; }
        .entry-view.kawaminami-sea-bg { background:#D9E8F0; }
        .entry-view.tsuno-sea-bg { background:#D9E8F0; }
        .entry-view.kadogawa-sea-bg { background:#D9E8F0; }
        .entry-view.morotsuka-sea-bg { background:#D9E8F0; }
        .entry-view.shiiba-sea-bg { background:#D9E8F0; }
        .entry-view.misatotown-sea-bg { background:#D9E8F0; }
        .entry-view.takachiho-sea-bg { background:#D9E8F0; }
        .entry-view.hinokage-sea-bg { background:#D9E8F0; }
        .entry-view.gokase-sea-bg { background:#D9E8F0; }
        .entry-view.kagoshimacity-sea-bg { background:#D9E8F0; }
        .entry-view.kanoya-sea-bg { background:#D9E8F0; }
        .entry-view.makurazaki-sea-bg { background:#D9E8F0; }
        .entry-view.akune-sea-bg { background:#D9E8F0; }
        .entry-view.izumi-sea-bg { background:#D9E8F0; }
        .entry-view.ibusuki-sea-bg { background:#D9E8F0; }
        .entry-view.nishinoomote-sea-bg { background:#D9E8F0; }
        .entry-view.tarumizu-sea-bg { background:#D9E8F0; }
        .entry-view.satsumasendai-sea-bg { background:#D9E8F0; }
        .entry-view.hioki-sea-bg { background:#D9E8F0; }
        .entry-view.soo-sea-bg { background:#D9E8F0; }
        .entry-view.kirishima-sea-bg { background:#D9E8F0; }
        .entry-view.ichikikushikino-sea-bg { background:#D9E8F0; }
        .entry-view.minamisatsuma-sea-bg { background:#D9E8F0; }
        .entry-view.shibushi-sea-bg { background:#D9E8F0; }
        .entry-view.minamikyushu-sea-bg { background:#D9E8F0; }
        .entry-view.isa-sea-bg { background:#D9E8F0; }
        .entry-view.aira-sea-bg { background:#D9E8F0; }
        .entry-view.mishima-sea-bg { background:#D9E8F0; }
        .entry-view.satsumatown-sea-bg { background:#D9E8F0; }
        .entry-view.nagashima-sea-bg { background:#D9E8F0; }
        .entry-view.yusui-sea-bg { background:#D9E8F0; }
        .entry-view.osaki-sea-bg { background:#D9E8F0; }
        .entry-view.higashikushira-sea-bg { background:#D9E8F0; }
        .entry-view.kinko-sea-bg { background:#D9E8F0; }
        .entry-view.minamiosumi-sea-bg { background:#D9E8F0; }
        .entry-view.kimotsuki-sea-bg { background:#D9E8F0; }
        .entry-view.nakatane-sea-bg { background:#D9E8F0; }
        .entry-view.minamitane-sea-bg { background:#D9E8F0; }
        .entry-view.yakushima-sea-bg { background:#D9E8F0; }
        .entry-view.toshimavillage-sea-bg { background:#D9E8F0; }
        .entry-view.nagasaki-sea-bg { background:#D9E8F0; }
        .region-scroll {
          height:auto;
          min-height:100vh;
          min-height:100dvh;
          display:block;
          padding-bottom:100px;
        }
        .region-scroll.has-bottom-toolbar {
          padding-bottom:calc(64px + env(safe-area-inset-bottom, 0px));
        }
        .entry-header {
          background:#fff;
          padding:40px 28px 24px;
          flex-shrink:0;
          position:relative;
          z-index:2;
        }
        .entry-header-row { display:flex; align-items:center; justify-content:space-between; gap:16px; }
        .entry-header-text { min-width:0; flex:1 1 auto; }
        .entry-lang-toggle { display:flex; align-items:center; gap:8px; padding:6px 14px; border-radius:999px; border:1px solid var(--line); background:#fff; flex-shrink:0; }
        .entry-title-btn { background:none; border:none; padding:0; margin:0 0 4px; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent; display:inline-block; }
        .entry-title { font-size:26px; font-weight:800; color:#1A2E3B; margin:0; letter-spacing:0.04em; }
        .entry-catch { font-size:12.5px; color:#7A9BAD; margin:0; white-space:normal; overflow-wrap:break-word; }
        .entry-footer-wrap { background:#fff; }
        .kyushu-page-view.region-scroll { padding-bottom:0; }
        .entry-wave { display:block; width:100%; height:24px; flex-shrink:0; }
        .entry-wave-bottom { transform:rotate(180deg); }
        .entry-footer-links { background:#fff; padding:28px 20px; display:flex; align-items:center; justify-content:center; gap:10px; flex-shrink:0; flex-wrap:nowrap; white-space:nowrap; }
        .entry-footer-link { font-size:11.5px; color:#7A9BAD; text-decoration:none; }
        .entry-footer-dot-sep { font-size:11.5px; color:#C7D6DC; }
        .entry-prompt { padding:36px 28px 36px; flex-shrink:0; }
        .entry-prompt-spacer { height:20px; flex-shrink:0; }
        .entry-prompt-text { font-size:14px; color:#3A5A6A; margin:0; font-weight:600; letter-spacing:0.02em; }
        .entry-prompt-text-lg {
          font-size:21px;
          margin:0;
          font-weight:800;
          letter-spacing:0.02em;
          background: linear-gradient(90deg, #1B8FE0 0%, #2BA868 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          display:inline-block;
        }
        .entry-cards { padding:0 18px; display:flex; flex-direction:column; gap:10px; flex:1; min-height:0; }
        .entry-card {
          background:#fff;
          border:none;
          box-shadow: 0 2px 10px rgba(26,46,59,0.08);
          border-radius:16px;
          padding:14px 22px;
          display:flex;
          align-items:center;
          gap:18px;
          cursor:pointer;
          flex:0 0 auto;
          text-align:left;
          font-family:inherit;
          -webkit-tap-highlight-color:transparent;
        }
        .entry-card:disabled { cursor:default; opacity:0.55; }
        .entry-card-icon { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:20px; }
        .entry-card-body { flex:1; min-width:0; }
        .entry-card-ja { font-size:13.5px; font-weight:800; margin:0 0 3px; color:#1A2E3B; }
        .purpose-card-ja { font-size:13.5px; }
        .entry-card-desc { font-size:11.5px; margin:0; color:#8A9FA8; line-height:1.5; }
        .entry-card-chev { font-size:17px; color:#C8D4D8; flex-shrink:0; }
        .entry-card-arrow { font-size:22px; font-weight:700; color:#1A2E3B; flex-shrink:0; }
        .entry-card-arrow.arrow-blue { color:#B8C4C9; }
        .entry-card-badge { font-size:9.5px; color:#fff; background:#E2613D; border-radius:999px; padding:3px 10px; flex-shrink:0; font-weight:700; letter-spacing:0.02em; }
        .entry-footer { margin:12px 18px; padding:12px 18px; background:#EFF4F2; border-radius:12px; display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .entry-footer-dot { width:6px; height:6px; border-radius:50%; background:#3A7A5A; flex-shrink:0; }
        .entry-footer-text { font-size:10px; color:#5A8070; margin:0; }
        .purpose-spot-list { padding:0 18px 90px; display:flex; flex-direction:column; gap:8px; }
        .purpose-loading-text { text-align:center; color:#8A9FA8; font-size:13px; padding:40px 0; }
        .purpose-spot-card { background:#fff; border:none; width:100%; font-family:inherit; text-align:left; cursor:pointer; border-radius:14px; padding:12px 16px; display:flex; align-items:center; gap:14px; box-shadow: 0 2px 8px rgba(26,46,59,0.06); -webkit-tap-highlight-color:transparent; }
        .purpose-spot-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .purpose-spot-body { flex:1; min-width:0; }
        .purpose-spot-name { font-size:14.5px; font-weight:700; margin:0 0 2px; color:#1A2E3B; }
        .purpose-spot-city { font-size:11.5px; margin:0; color:#8A9FA8; }
        .purpose-detail-back { background:none; border:none; padding:8px 18px; font-size:13px; color:#3A7A5A; font-weight:700; cursor:pointer; text-align:left; font-family:inherit; }
        .purpose-detail-card { margin:0 18px; background:#fff; border-radius:16px; overflow:hidden; box-shadow: 0 2px 10px rgba(26,46,59,0.08); }
        .purpose-detail-hero { width:100%; height:160px; display:flex; align-items:center; justify-content:center; }
        .purpose-detail-hero-img { width:100%; height:100%; object-fit:cover; }
        .purpose-detail-body { padding:18px 20px 24px; }
        .purpose-detail-city { font-size:12px; color:#8A9FA8; margin:0 0 4px; }
        .purpose-detail-name { font-size:19px; font-weight:800; color:#1A2E3B; margin:0 0 10px; }
        .purpose-detail-desc { font-size:13.5px; line-height:1.7; color:#3A4A52; margin:0 0 16px; }
        .purpose-detail-meta { display:flex; flex-direction:column; gap:8px; }
        .purpose-detail-meta-row { display:flex; align-items:center; gap:8px; font-size:12.5px; color:#5A6E76; }

        .region-view { padding:0 0 100px; background:#EFF1F2; min-height:100vh; min-height:100dvh; }
        .region-view-legacy { padding:22px 22px 60px; max-width:760px; margin:0 auto; background:#fff; }
        .region-body { padding:0 18px 0; }
        .region-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .region-title { font-family:'Zen Kaku Gothic New', sans-serif; font-weight:800; font-size:19px; color:#1A2E3B; margin:4px 0 14px; letter-spacing:0.02em; }
        .floating-back-btn {
          position:fixed;
          left:28px;
          bottom:18px;
          background:rgba(226,97,61,0.75);
          border:none;
          box-shadow:none;
          color:#fff;
          font-size:12px;
          font-weight:600;
          padding:6px 13px;
          border-radius:999px;
          cursor:pointer;
          z-index:20;
          -webkit-tap-highlight-color:transparent;
        }
        @media (hover: hover) and (pointer: fine) {
          .floating-back-btn:hover { background:rgba(226,97,61,0.92); }
        }
        .floating-back-btn.floating-back-btn-icon {
          width:32px; height:32px; padding:0;
          display:flex; align-items:center; justify-content:center;
          font-size:16px; font-weight:700;
          background:#E2613D;
        }
        .floating-back-btn.kyushu-back-right { left:10px; right:auto; bottom:14px; z-index:8; }
        .kyushu-icons-consolidated .map-zoom-group { bottom:14px; flex-direction:row; z-index:8; height:32px; box-sizing:border-box; }
        @media (hover: hover) and (pointer: fine) {
          .floating-back-btn.floating-back-btn-icon:hover { background:#c9502f; }
        }
        .region-back-link { display:block; background:none; border:none; font-size:11px; font-weight:600; color:var(--muted); cursor:pointer; padding:0; margin-bottom:4px; }

        .region-map-frame { position:relative; width:100%; aspect-ratio: ${PREF_VIEW_W} / ${PREF_VIEW_H}; background:#fff; border-radius:18px; overflow:hidden; box-shadow: 0 2px 12px rgba(26,46,59,0.08); --frame-pad:0px; }
        .region-map-frame.nagasaki-sea-bg { background:#D9E8F0; }
        .region-land-fill { fill:#fff; stroke:none; transition: fill .25s; }
        .neighbor-pref-outline { fill:#EFF1F2; stroke:none; }
        .kyushu-map-frame { aspect-ratio: ${KYUSHU_VIEW_W + 12} / ${KYUSHU_VIEW_H + 12}; }

        .island-inset-row { display:flex; gap:10px; margin-top:10px; }
        .island-inset-row-stacked { flex-direction:column; gap:14px; }
        .island-inset-panel { background:#fff; box-shadow: 0 2px 10px rgba(26,46,59,0.08); border-radius:14px; padding:14px 14px 10px; margin-top:10px; position:relative; }
        .inset-group { display:flex; flex-direction:column; align-items:center; gap:4px; }
        .inset-group .inset-islands-row { margin-top:18px; justify-content:center; }
        .island-inset-frame { position:relative; flex:1; background:#fff; border-radius:14px; box-shadow: 0 2px 10px rgba(26,46,59,0.08); padding:34px 20px 34px; display:flex; flex-direction:column; align-items:center; min-width:0; }
        .island-inset-frame .inset-islands-row { gap:14px; flex-wrap:wrap; justify-content:space-evenly; align-items:center; width:100%; margin-top:8px; }
        .inset-group-label { position:absolute; left:10px; top:10px; z-index:2; font-size:10px; font-weight:700; color:var(--ink); background:rgba(255,255,255,0.85); padding:3px 9px; border-radius:999px; border:1px solid var(--line); white-space:nowrap; pointer-events:none; }
        .inset-islands-row { display:flex; align-items:flex-end; gap:6px; }
        .inset-island { position:relative; display:flex; flex-direction:column; align-items:center; gap:2px; background:none; border:none; cursor:pointer; padding:2px; border-radius:6px; -webkit-tap-highlight-color: transparent; }
        .inset-island-svg { display:block; width:calc(var(--isl-w) * 0.85); max-width:76px; transition: transform .15s; }
        .inset-island-svg.is-peeking { transform:scale(1.18); }
        .inset-island-svg path { fill:#fff; stroke:#21262C; stroke-width:1.2; vector-effect:non-scaling-stroke; transition: fill .15s, stroke .15s; }
        .inset-island-svg.is-peeking path { fill:#6E7A4C; stroke:#21262C; }
        .inset-island-bubble { position:absolute; bottom:100%; left:50%; transform:translateX(-50%); margin-bottom:8px; background:#21262C; color:#fff; padding:5px 9px; border-radius:8px; font-size:10px; font-weight:600; white-space:nowrap; z-index:5; box-shadow:0 4px 10px rgba(0,0,0,0.22); }
        .inset-island-bubble::after { content:''; position:absolute; left:50%; top:100%; transform:translateX(-50%); border:4px solid transparent; border-top-color:#21262C; }
        .inset-divider { width:1px; align-self:stretch; background:var(--line); margin:0 2px; }
        .inset-islands-row .inset-divider { align-self:center; height:34px; margin:0; }
        .region-outline { fill:none; stroke:#21262C; stroke-width:0.8; stroke-linejoin:round; pointer-events:none; vector-effect:non-scaling-stroke; transition: stroke .25s; }
        .pref-outline { fill:none; stroke:#21262C; stroke-width:0.8; stroke-linejoin:round; pointer-events:none; vector-effect:non-scaling-stroke; }
        .muni-boundary { fill:transparent; stroke:none; cursor:pointer; transition: fill .15s; -webkit-tap-highlight-color: transparent; }
        .muni-boundary.is-peeking { fill:#6E7A4C; }
        .internal-border { fill:none; stroke:#9AA0A6; stroke-width:0.4; stroke-linecap:round; pointer-events:none; vector-effect:non-scaling-stroke; }
        .kyushu-internal-border { fill:none; stroke:#9AA0A6; stroke-width:0.4; stroke-linecap:round; pointer-events:none; vector-effect:non-scaling-stroke; transition: opacity .25s; }
        .muni-shape { fill:#EDEEEC; stroke:#9AA0A6; stroke-width:1.2; stroke-linejoin:round; cursor:pointer; transition: fill .15s; -webkit-tap-highlight-color: transparent; }
        .muni-hit-region { fill:transparent; stroke:none; cursor:pointer; transition: fill .15s; -webkit-tap-highlight-color: transparent; }
        .border-test-line { fill:none; stroke:#9AA0A6; stroke-width:0.6; stroke-dasharray:0.2 3; stroke-linecap:round; pointer-events:none; }
        @media (hover: hover) and (pointer: fine) {
          .muni-shape:hover { fill:#E2E4E0; }
          .muni-hit-region:hover { fill:#E2E4E0; }
        }
        .muni-shape.is-peeking { fill:#6E7A4C; stroke:#6E7A4C; }
        .muni-hit-region.is-peeking { fill:#6E7A4C; }

        .muni-peek { position:absolute; transform:translate(-50%, calc(-100% - 10px)); background:#21262C; color:#fff; padding:7px 8px 7px 11px; border-radius:9px; font-size:11.5px; font-weight:600; white-space:nowrap; display:flex; align-items:center; gap:8px; z-index:5; }
        .muni-peek-name { cursor:pointer; }
        .muni-peek::after { content:''; position:absolute; left:50%; top:100%; transform:translateX(-50%); border:5px solid transparent; border-top-color:#21262C; }
        .muni-soon-tag { font-size:10px; color:#C9CCD1; font-weight:500; }

        .muni-card-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
        .muni-card { display:flex; align-items:center; justify-content:space-between; padding:13px 14px; border-radius:12px; border:none; box-shadow: 0 2px 10px rgba(26,46,59,0.08); background:#fff; cursor:pointer; text-align:left; }
        .muni-card.is-active { box-shadow: 0 2px 10px rgba(226,97,61,0.18); border:1.5px solid #E2613D; cursor:pointer; }
        .muni-card.is-soon { opacity:0.55; cursor:not-allowed; }
        .muni-card-name { font-size:13px; font-weight:700; }
        .muni-card-tag { font-size:10px; font-weight:700; color:#A8B4B8; background:#EEF1F0; padding:3px 8px; border-radius:999px; }
        .muni-card-tag.active { color:#fff; background:#E2613D; }
        @media (min-width:640px) { .muni-card-grid { grid-template-columns:repeat(3,1fr); } }

        .header { display:flex; flex-direction:column; gap:10px; padding:16px 22px; }
        .brand-line { display:flex; justify-content:space-between; align-items:center; gap:14px; }
        .brand-stack { display:flex; flex-direction:column; }
        .brand-name { font-family:'Zen Kaku Gothic New', sans-serif; font-weight:700; font-size:22px; letter-spacing:0.04em; }
        .brand-sub { display:block; font-size:11px; color:var(--muted); margin-top:2px; letter-spacing:0.04em; }
        .lang-toggle { padding:6px 14px; border-radius:999px; border:1px solid var(--line); background:#fff; font-size:12px; font-weight:700; color:var(--ink); cursor:pointer; flex-shrink:0; }

        .tabs { display:flex; gap:8px; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:2px; }
        .tab { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; border:1.5px solid var(--line); background:var(--paper); color:var(--ink); font-size:13px; font-weight:500; cursor:pointer; transition: background .15s, color .15s, border-color .15s; flex-shrink:0; white-space:nowrap; }
        .tab-active { border-color: var(--ink); background: var(--ink); color:#fff; }

        .select-view { padding:22px 18px; }

        .budget-bar { background:#F6F6F4; border-radius:14px; padding:12px 16px; margin-bottom:14px; }
        .budget-inputs-row { display:flex; align-items:stretch; gap:0; flex-wrap:nowrap; margin-bottom:8px; }
        .budget-input-row { display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px; font-weight:600; color:var(--ink); flex:1; padding:0 14px; }
        .budget-input-divider { width:1px; align-self:center; height:28px; background:var(--line); flex-shrink:0; }
        .budget-input { width:84px; padding:6px 9px; border-radius:8px; border:1.5px solid var(--line); font-size:13px; font-family:'JetBrains Mono', monospace; text-align:center; }
        .budget-stepper, .travelers-stepper { display:flex; align-items:center; gap:6px; }
        .budget-status { display:flex; justify-content:space-between; font-size:12px; color:var(--muted); margin-bottom:6px; }
        .budget-status .over-budget-text { color:#D9534F; font-weight:700; }
        .budget-progress { height:7px; border-radius:999px; background:var(--line); overflow:hidden; }
        .budget-progress-fill { height:100%; border-radius:999px; transition: width .25s ease; }
        .budget-per-person-note { font-size:10.5px; color:var(--muted); margin:8px 0 0; line-height:1.5; }
        .budget-breakdown { margin-top:10px; }
        .budget-breakdown-bar { display:flex; height:7px; border-radius:999px; overflow:hidden; gap:1.5px; margin-bottom:7px; }
        .budget-breakdown-segment { height:100%; transition: width .25s ease; }
        .budget-breakdown-legend { display:flex; flex-wrap:wrap; gap:8px 12px; }
        .budget-breakdown-legend-item { display:flex; align-items:center; gap:5px; font-size:10.5px; color:var(--muted); font-family:'JetBrains Mono', monospace; }
        .budget-breakdown-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

        .mode-switch-wrap { padding:0 22px; }
        .mode-switch { display:flex; flex-wrap:wrap; gap:4px; background:#fff; box-shadow: 0 2px 8px rgba(26,46,59,0.06); padding:3px; border-radius:999px; margin:0 auto 14px; max-width:100%; width:fit-content; }
        .map-frame-wrap { position:relative; }
        .tabs-on-frame { display:flex; justify-content:center; margin-bottom:10px; }
        .tabs-on-frame .tabs { flex-wrap:nowrap; gap:6px; overflow-x:auto; max-width:100%; }
        .mode-switch button { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:999px; border:none; background:transparent; font-size:12px; font-weight:600; color:var(--muted); cursor:pointer; }
        .mode-switch button.active { background:#fff; color:var(--ink); box-shadow:0 1px 3px rgba(0,0,0,0.1); }
        .mode-switch button:disabled { color:#C9CCD1; cursor:not-allowed; }
        .mode-count-badge { display:inline-flex; align-items:center; justify-content:center; min-width:16px; height:16px; padding:0 4px; border-radius:999px; background:#E2613D; color:#fff; font-size:9.5px; font-weight:700; }
        .budget-warn-badge { background:#D9534F; }
        .empty-page-hint { grid-column:1 / -1; text-align:center; font-size:12.5px; color:var(--muted); padding:40px 16px; line-height:1.6; }

        .card-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; padding-bottom:14px; }
        .spot-card { position:relative; border:1.5px solid var(--cat-color); border-radius:14px; overflow:hidden; display:flex; flex-direction:column; cursor:pointer; background:#fff; transition: box-shadow .15s, transform .15s; -webkit-tap-highlight-color: transparent; }
        .spot-card.has-photo { border:none; box-shadow:0 2px 10px rgba(20,16,14,0.14); }
        @media (hover: hover) and (pointer: fine) {
          .spot-card:hover { box-shadow:0 4px 10px rgba(0,0,0,0.08); transform:translateY(-1px); }
          .spot-card.has-photo:hover { box-shadow:0 6px 16px rgba(20,16,14,0.22); }
        }
        .spot-card.is-candidate { border-width:2px; }
        .spot-card.is-decided { border-width:2.5px; }
        .card-hero { position:relative; height:78px; flex-shrink:0; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .card-hero-icon { color:var(--cat-color); }
        .card-hero-badge { position:absolute; top:7px; right:7px; width:20px; height:20px; border-radius:50%; background:var(--cat-color); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 2px #fff; }
        .card-photo-frame { position:relative; height:128px; flex-shrink:0; overflow:hidden; }
        .card-photo-img { width:100%; height:100%; object-fit:cover; display:block; }
        .card-photo-badge { position:absolute; top:8px; right:8px; width:20px; height:20px; border-radius:50%; background:#fff; color:var(--cat-color); display:flex; align-items:center; justify-content:center; box-shadow:0 1px 4px rgba(0,0,0,0.3); }
        .card-photo-panel { background:#111111; padding:10px 12px 11px; display:flex; flex-direction:column; align-items:stretch; gap:6px; flex:1; text-align:left; }
        .card-photo-info { display:flex; align-items:center; justify-content:flex-start; gap:8px; }
        .card-photo-tag { display:inline-flex; align-items:center; gap:4px; background:var(--cat-color); color:#fff; font-size:9.5px; font-weight:700; letter-spacing:0.02em; padding:2px 8px; border-radius:999px; }
        .card-photo-price { color:rgba(255,255,255,0.92); font-size:11px; font-weight:700; font-family:'JetBrains Mono', monospace; white-space:nowrap; }
        .card-photo-name { display:block; width:100%; color:#fff; font-weight:700; font-size:13.5px; line-height:1.3; text-align:left; }
        .card-photo-desc { color:rgba(255,255,255,0.78); font-size:11px; line-height:1.55; margin:0; text-align:left; }
        .card-photo-desc.is-clamped { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
        .card-photo-more { align-self:flex-start; background:none; border:none; padding:0; margin-top:-3px; color:rgba(255,255,255,0.6); font-size:10px; font-weight:700; text-decoration:underline; cursor:pointer; }
        .card-photo-budget-warn { align-self:flex-start; font-size:10px; font-weight:700; color:#fff; background:#D9534F; padding:2px 7px; border-radius:999px; }
        .card-photo-actions { display:flex; gap:5px; margin-top:auto; padding-top:2px; }
        .card-photo-actions .card-action-btn { border-color:transparent; font-size:9.5px; padding:6px 2px; background:#EFEFEC; color:var(--ink); }
        .card-photo-actions .card-action-btn.active { background:var(--cat-color); color:#fff; }
        .card-body { padding:11px 12px; display:flex; flex-direction:column; gap:6px; flex:1; }
        .card-tag { display:inline-flex; align-items:center; gap:4px; font-size:9.5px; font-weight:600; color:var(--cat-color); background:var(--cat-tint); padding:2px 8px; border-radius:999px; align-self:flex-start; }
        .card-top { display:flex; align-items:center; justify-content:space-between; gap:6px; }
        .card-name { font-weight:700; font-size:13px; }
        .card-state-icon { color:var(--cat-color); flex-shrink:0; }
        .card-desc { font-size:11.5px; line-height:1.5; color:#5B616A; margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .card-duration { font-size:11px; color:var(--muted); display:flex; align-items:center; gap:4px; }
        .card-meta-row { display:flex; align-items:center; justify-content:space-between; gap:6px; }
        .card-price { font-size:11px; color:var(--muted); font-family:'JetBrains Mono', monospace; }
        .card-budget-warn { font-size:10.5px; color:#D9534F; font-weight:700; }
        .spot-card.is-over-budget { opacity:0.55; }
        .card-action-btn:disabled { opacity:0.45; cursor:not-allowed; }
        .card-actions { display:flex; gap:6px; margin-top:auto; padding-top:3px; }
        .card-action-btn { flex:1; font-size:10.5px; font-weight:600; padding:7px 4px; border-radius:8px; border:1.5px solid var(--line); background:#fff; cursor:pointer; color:var(--ink); display:flex; align-items:center; justify-content:center; gap:3px; }
        .card-action-btn.active { background:var(--cat-color); border-color:var(--cat-color); color:#fff; }

        @media (min-width:640px) {
          .card-grid { grid-template-columns:repeat(3,1fr); }
        }
        @media (min-width:900px) {
          .card-grid { grid-template-columns:repeat(4,1fr); }
        }

        .map-scroll { width:100%; border-radius:18px; margin-bottom:24px; }
        .kyushu-fullmap-view { position:relative; height:100vh; height:100dvh; width:100%; overflow:hidden; background:#D9E8F0; }
        .map-scroll.kyushu-fullmap-scroll { width:100%; height:100%; margin-bottom:0; border-radius:0; }
        .region-map-frame.kyushu-fullmap-frame { width:100%; height:100%; aspect-ratio:auto; border-radius:0; box-shadow:none; }
        .kyushu-float-header { position:absolute; top:14px; left:14px; z-index:10; display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.92); padding:8px 14px; border-radius:999px; }
        .kyushu-float-title-btn { background:none; border:none; padding:0; cursor:pointer; }
        .kyushu-float-title { font-size:16px; font-weight:800; color:#1A2E3B; margin:0; letter-spacing:0.03em; }
        .kyushu-float-lang { display:flex; align-items:center; gap:4px; }
        .kyushu-float-tabs { position:absolute; top:14px; left:50%; transform:translateX(-50%); z-index:10; margin:0; }
        .kyushu-float-tabs button { padding:8px 12px; }
        .show-names-inline-btn.icon-only { display:inline-flex; align-items:center; justify-content:center; }
        @media (max-width:560px) {
          .kyushu-float-header { top:10px; left:10px; padding:6px 12px; }
          .kyushu-float-title { font-size:14px; }
          .kyushu-float-tabs { top:auto; bottom:14px; left:50%; }
        }
        .entry-view.muni-map-fullscreen { position:relative; height:100vh; height:100dvh; width:100%; overflow:hidden; }
        .map-scroll.muni-fullmap-scroll { position:fixed; inset:0; width:100%; height:100vh; height:100dvh; margin-bottom:0; border-radius:0; z-index:1; background:#D9E8F0; }
        .map-frame-wrap.muni-fullmap-frame-wrap { position:relative; width:100%; height:100%; }
        .map-frame.muni-fullmap-frame { width:100%; height:100%; aspect-ratio:auto; border-radius:0; box-shadow:none; }
        .tabs-on-frame.muni-float-category-tabs { position:absolute; left:50%; bottom:16px; transform:translateX(-50%); margin-bottom:0; z-index:8; background:rgba(255,255,255,0.92); padding:6px 10px; border-radius:999px; max-width:calc(100% - 32px); }
        .tabs-on-frame.muni-float-category-tabs .tabs { margin:0; }
        .entry-fullmap-view { background:#D9E8F0; }
        .entry-fullmap-view .kyushu-float-header {
          position:absolute; top:0; left:0; right:0; width:100%;
          border-radius:0; background:#D9E8F0;
          padding:16px 20px; justify-content:space-between;
          box-shadow:none;
        }
        .entry-fullmap-view .kyushu-float-title { font-size:22px; color:#1A2E3B; }
        .entry-fullmap-view .kyushu-float-lang { background:#fff; border-radius:999px; padding:6px 14px; }
        .entry-fullmap-view .kyushu-float-lang .lang-toggle-opt { color:var(--muted); }
        .entry-fullmap-view .kyushu-float-lang .lang-toggle-opt.active { color:var(--ink); }
        @media (max-width:560px) {
          .entry-fullmap-view .kyushu-float-header { padding:14px 18px; }
          .entry-fullmap-view .kyushu-float-title { font-size:18px; }
        }
        .kyushu-topbar-view .kyushu-float-header {
          position:absolute; top:0; left:0; right:0; width:100%;
          border-radius:0; background:transparent;
          padding:16px 20px; justify-content:space-between;
          box-shadow:none; z-index:10;
        }
        .kyushu-topbar-view .kyushu-float-title { font-size:22px; color:#1A2E3B; }
        .kyushu-topbar-view .kyushu-float-lang { background:rgba(255,255,255,0.85); border-radius:999px; padding:6px 14px; }
        .kyushu-topbar-view .kyushu-float-lang .lang-toggle-opt { color:var(--muted); }
        .kyushu-topbar-view .kyushu-float-lang .lang-toggle-opt.active { color:var(--ink); }
        .kyushu-topbar-view .kyushu-float-tabs { top:80px; flex-wrap:nowrap; }
        .kyushu-topbar-view .kyushu-float-tabs button { white-space:nowrap; }
        .kyushu-topbar-view .map-location-label { top:136px; }
        .kyushu-topbar-view .map-toggle-group { top:136px; }
        .kyushu-icons-consolidated .map-location-label { top:auto; bottom:64px; left:14px; }
        .kyushu-icons-consolidated .map-toggle-group { top:76px; }
        .kyushu-icons-consolidated .muni-name-grid-overlay { padding-top:84px; padding-right:56px; }
        .kyushu-float-header.kyushu-float-header-dimmed { background:transparent; transition:background 0.15s ease; }
        .kyushu-float-header.kyushu-float-header-dimmed .kyushu-float-title,
        .kyushu-float-header.kyushu-float-header-dimmed .lang-toggle-opt { color:#fff; }
        .kyushu-float-header.kyushu-float-header-dimmed .kyushu-float-lang { background:rgba(255,255,255,0.15); }
        .kyushu-float-header.kyushu-float-header-dimmed .lang-toggle-opt.active { color:#fff; font-weight:800; }
        .map-toggle-divider { width:22px; height:1px; background:var(--line); margin:2px 0; }
        @media (max-width:560px) {
          .kyushu-topbar-view .kyushu-float-header { padding:calc(env(safe-area-inset-top, 0px) + 14px) 18px 14px; }
          .kyushu-topbar-view .kyushu-float-title { font-size:18px; }
          .kyushu-topbar-view .kyushu-float-tabs { top:auto; bottom:14px; }
          .kyushu-topbar-view .kyushu-float-tabs button { padding:6px 9px; font-size:11px; gap:3px; }
          .kyushu-topbar-view .map-location-label { top:70px; }
          .kyushu-topbar-view .map-toggle-group { top:70px; }
          .kyushu-icons-consolidated .map-location-label { top:auto; bottom:64px; left:14px; }
          .kyushu-icons-consolidated .map-toggle-group { top:calc(env(safe-area-inset-top, 0px) + 66px); }
          .kyushu-icons-consolidated .muni-name-grid-overlay { padding-top:calc(env(safe-area-inset-top, 0px) + 76px); padding-right:52px; }
        }
        .entry-fullmap-bg { position:absolute; inset:0; z-index:0; }
        .entry-cards-float { position:absolute; left:0; right:0; top:92px; z-index:5; padding:0 18px; max-width:460px; margin:0 auto; }
        .entry-footer-wrap.entry-footer-float { position:absolute; left:50%; bottom:14px; transform:translateX(-50%); z-index:6; background:none; }
        .entry-footer-wrap.kyushu-footer-float {
          left:0; right:0; bottom:14px; transform:none; width:100%; height:32px;
          border-radius:0; background:transparent;
          box-shadow:none; padding:0 20px; display:flex; align-items:center; justify-content:center; z-index:6;
        }
        .entry-footer-float .entry-footer-links { background:none; padding:8px 18px; }
        .kyushu-footer-float .entry-footer-links { background:none; padding:0 18px; }
        .kyushu-footer-float .entry-footer-link { }
        .kyushu-footer-float.kyushu-float-header-dimmed .entry-footer-links { background:none; }
        .kyushu-footer-float.kyushu-float-header-dimmed .entry-footer-link { color:#fff; text-shadow:none; }
        @media (max-width:560px) {
          .tabs-on-frame.muni-float-category-tabs { bottom:12px; }
          .entry-cards-float { top:78px; }
        }
        .map-frame { position:relative; width:100%; aspect-ratio: ${VIEW_W} / ${VIEW_H}; background:#D9E8F0; border-radius:18px; overflow:hidden; box-shadow: 0 2px 12px rgba(26,46,59,0.08); }
        .map-location-label { position:absolute; left:10px; top:10px; z-index:2; display:flex; align-items:center; gap:8px; font-size:11px; font-weight:700; color:var(--ink); background:rgba(255,255,255,0.85); padding:4px 10px; border-radius:999px; border:1px solid var(--line); pointer-events:none; }
        .show-names-inline-btn { font-size:11px; font-weight:700; color:var(--ink); background:none; border:none; padding:0; cursor:pointer; pointer-events:auto; }
        .map-toggle-group { position:absolute; right:10px; top:10px; z-index:2; display:flex; flex-direction:column; align-items:center; gap:6px; }
        .map-zoom-group { position:absolute; right:10px; bottom:10px; z-index:2; display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.85); border-radius:999px; padding:6px 14px; }
        .zoom-btn { width:auto; height:auto; border:none; background:none; color:var(--ink); font-size:16px; font-weight:700; line-height:1; cursor:pointer; box-shadow:none; padding:0; }
        .zoom-btn:disabled { opacity:0.4; cursor:default; }
        .locate-me-btn { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#1F6E45; background:rgba(255,255,255,0.55); border:1px solid var(--line); padding:5px 10px; border-radius:999px; cursor:pointer; }
        .map-toggle-group-solid .locate-me-btn { background:rgba(255,255,255,0.96); }
        .locate-me-btn.icon-only { padding:8px; width:32px; height:32px; justify-content:center; position:relative; }
        .icon-label-peek {
          position:absolute; right:100%; top:50%; transform:translateY(-50%);
          white-space:nowrap; background:rgba(255,255,255,0.92); color:var(--ink);
          padding:0 12px 0 14px; height:32px; display:flex; align-items:center;
          border-radius:999px 0 0 999px; font-size:12px; font-weight:700;
          box-shadow:0 1px 6px rgba(0,0,0,0.1);
          pointer-events:none; z-index:20;
        }
        .locate-me-btn.pin-toggle-btn.active { background:#1F6E45; color:#fff; border-color:#1F6E45; }
        .locate-me-btn.active { background:#1F6E45; color:#fff; border-color:#1F6E45; }
        .locate-me-btn:disabled { opacity:0.6; cursor:default; }
        .locate-me-error { position:absolute; right:calc(100% + 8px); top:50%; transform:translateY(-50%); white-space:nowrap; font-size:10.5px; color:#B94A3E; background:rgba(255,255,255,0.95); padding:4px 10px; border-radius:999px; z-index:20; }
        .my-location-marker { position:absolute; transform:translate(-50%, -50%); width:0; height:0; pointer-events:none; }
        .my-location-dot { position:absolute; top:-6px; left:-6px; width:12px; height:12px; border-radius:50%; background:#2E7DD7; border:2px solid #fff; box-shadow:0 0 4px rgba(0,0,0,0.35); }
        .my-location-pulse { position:absolute; top:-16px; left:-16px; width:32px; height:32px; border-radius:50%; background:rgba(46,125,215,0.35); animation: my-location-pulse-anim 1.8s ease-out infinite; }
        @keyframes my-location-pulse-anim { 0% { transform:scale(0.4); opacity:0.8; } 100% { transform:scale(1.4); opacity:0; } }
        .poi-pin { position:absolute; cursor:pointer; z-index:3; }
        .poi-pin::before { content:''; position:absolute; left:50%; top:50%; width:40px; height:40px; transform:translate(-50%, -50%); }
        .poi-pin-icon {
          position:absolute; left:0; top:0;
          width:22px; height:22px;
          transform: translate(calc(22px * 0.20710678), calc(22px * -1.20710678)) rotate(-45deg) translate(-50%, -50%);
          border-radius:50% 50% 50% 0;
          background:#fff;
          border:2px solid transparent;
          box-sizing:border-box;
        }
        .poi-pin-icon-glyph { position:absolute; inset:0; transform:rotate(45deg); display:flex; align-items:center; justify-content:center; }
        .poi-pin-icon-airport { color:#1B6CA8; border-color:#1B6CA8; }
        .poi-pin-icon-ferry { color:#1F7A6C; border-color:#1F7A6C; }
        .poi-pin-icon-roadside { color:#C9821A; border-color:#C9821A; }
        .poi-pin-cluster { display:flex; align-items:center; justify-content:center; min-width:24px; height:24px; padding:0 6px; border-radius:999px; background:#fff; border:2px solid transparent; box-sizing:border-box; font-size:11px; font-weight:800; transform:translate(-50%, -100%); }
        .poi-pin-cluster.poi-pin-icon-airport { color:#1B6CA8; border-color:#1B6CA8; }
        .poi-pin-cluster.poi-pin-icon-ferry { color:#1F7A6C; border-color:#1F7A6C; }
        .poi-pin-cluster.poi-pin-icon-roadside { color:#C9821A; border-color:#C9821A; }
        .poi-pin-icon-airport.is-peeked { background:#1B6CA8; color:#fff; }
        .poi-pin-icon-ferry.is-peeked { background:#1F7A6C; color:#fff; }
        .poi-pin-icon-roadside.is-peeked { background:#C9821A; color:#fff; }
        .poi-pin-label-list { display:flex; flex-direction:column; gap:4px; }
        .poi-pin-label { position:absolute; bottom:32px; left:0; transform:translateX(-50%); white-space:nowrap; background:#21262C; color:#fff; font-size:11.5px; font-weight:600; padding:7px 8px 7px 11px; border-radius:9px; display:flex; align-items:center; gap:8px; z-index:5; }
        .poi-pin-label.poi-pin-label-left { left:auto; right:16px; transform:none; }
        .poi-pin-label-name { cursor:default; }
        .poi-pin-label-row { background:none; border:none; color:#fff; font-size:11.5px; font-weight:600; padding:2px 0; text-align:left; cursor:pointer; font-family:inherit; }
        .show-names-inline-btn.active { color:#E2613D; text-decoration:underline; }
        .region-dim-overlay { fill:rgba(16,20,24,0.55); pointer-events:none; }
        .pref-floating-label { position:absolute; transform:translate(-50%, -50%); pointer-events:auto; white-space:nowrap; z-index:1; }
        .pref-floating-label-text { display:flex; align-items:center; background:rgba(33,38,44,0.85); backdrop-filter:blur(2px); color:#fff; padding:4px 7px; border-radius:6px; font-size:9.5px; font-weight:600; border:none; outline:none; box-shadow:none; -webkit-appearance:none; appearance:none; -webkit-tap-highlight-color:transparent; cursor:pointer; }
        .muni-name-grid-overlay { position:absolute; inset:0; background:rgba(18,21,26,0.32); display:flex; align-items:flex-start; justify-content:center; z-index:1; padding:48px 16px 16px; }
        .muni-name-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap:8px; max-height:100%; overflow-y:auto; width:100%; align-content:flex-start; }
        .muni-name-grid-item { background:rgba(255,255,255,0.95); color:#21262C; border:none; border-radius:10px; padding:8px 4px; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center; }
        .pref-label-dot { fill:#21262C; opacity:0.85; }
        .pref-label-line { stroke:#21262C; stroke-width:0.6; opacity:0.55; }
        .map-svg { position:absolute; left:var(--frame-pad, 0); top:var(--frame-pad, 0); width:calc(100% - var(--frame-pad, 0) * 2); height:calc(100% - var(--frame-pad, 0) * 2); }
        .map-pan-scroll { position:absolute; left:var(--frame-pad, 0); top:var(--frame-pad, 0); width:calc(100% - var(--frame-pad, 0) * 2); height:calc(100% - var(--frame-pad, 0) * 2); overflow:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; touch-action:pan-x pan-y; scrollbar-width:none; -ms-overflow-style:none; cursor:grab; user-select:none; border-radius:14px; }
        .map-pan-scroll::-webkit-scrollbar { display:none; }
        .map-pan-scroll.is-panning { cursor:grabbing; }
        .map-pan-content { position:relative; min-width:100%; min-height:100%; }
        .map-pan-content.kyushu-contain-fit { min-width:0; min-height:0; }
        .map-svg-pan { position:absolute; inset:0; width:100%; height:100%; }
        .city-outline { fill:#FFFFFF; stroke:#21262C; stroke-width:1.2; stroke-linejoin:round; stroke-linecap:round; vector-effect:non-scaling-stroke; }
        .neighbor-muni-outline { fill:#EFF1F2; stroke:#B7BBC0; stroke-width:1.2; stroke-linejoin:round; stroke-linecap:round; vector-effect:non-scaling-stroke; }
        .neighbor-internal-border { fill:none; stroke:#9AA0A6; stroke-width:1; stroke-dasharray:0.2 3; stroke-linecap:round; vector-effect:non-scaling-stroke; }

        .spot-pin {
          --pin-size: 26px;
          position:absolute;
          left:0; top:0;
          width:var(--pin-size); height:var(--pin-size);
          transform: translate(calc(var(--pin-size) * 0.20710678), calc(var(--pin-size) * -1.20710678)) rotate(-45deg) translate(-50%, -50%);
          border-radius:50% 50% 50% 0;
          border:2px solid var(--cat-color);
          background:#fff;
          color:var(--cat-color);
          cursor:pointer;
          padding:0;
          z-index:1;
          transition: background .15s, color .15s;
          -webkit-tap-highlight-color: transparent;
        }
        .spot-pin-icon { position:absolute; inset:0; transform:rotate(45deg); display:flex; align-items:center; justify-content:center; }
        .spot-pin.is-candidate, .spot-pin.is-decided { background:var(--cat-color); color:#fff; }
        .spot-pin.is-over-budget { opacity:0.45; }
        .spot-pin.is-linked {
          background: var(--cat-color);
          color: #fff;
          z-index:4;
        }

        .spot-index-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:8px; margin-top:12px; }
        .spot-index-item { display:flex; align-items:center; gap:7px; min-width:0; background:#fff; border:1.5px solid var(--cat-color); border-radius:10px; padding:7px 9px; cursor:pointer; text-align:left; }
        .spot-index-item.is-candidate, .spot-index-item.is-decided { background:var(--cat-color); }
        .spot-index-item.is-candidate .spot-index-name, .spot-index-item.is-decided .spot-index-name { color:#fff; }
        .spot-index-num { flex-shrink:0; width:20px; height:20px; border-radius:50%; border:1.5px solid var(--cat-color); background:#fff; color:var(--cat-color); font-size:10.5px; font-weight:700; display:flex; align-items:center; justify-content:center; }
        .spot-index-item.is-candidate .spot-index-num, .spot-index-item.is-decided .spot-index-num { background:#fff; color:var(--cat-color); border-color:#fff; }
        .spot-index-item.is-linked { background:var(--cat-color); box-shadow:0 0 0 2px var(--cat-color); }
        .spot-index-item.is-linked .spot-index-name { color:#fff; }
        .spot-index-item.is-linked .spot-index-num { background:#fff; color:var(--cat-color); border-color:#fff; }
        .spot-index-name { flex:1; min-width:0; font-size:11px; font-weight:500; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .detour-index-grid { margin-top:14px; }
        .detour-empty-note { font-size:12px; color:var(--muted); text-align:center; margin:16px 0 0; }

        .peek-detail-btn { background:#E2613D; border:none; color:#fff; border-radius:6px; padding:4px 7px; font-size:10.5px; font-weight:600; cursor:pointer; white-space:nowrap; }

        .calc-overlay { position:absolute; inset:0; background:rgba(255,255,255,0.94); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; font-size:14px; }
        .spinner { width:30px; height:30px; border:3px solid var(--line); border-top-color:var(--ink); border-radius:50%; animation:spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .my-location-marker { position:absolute; transform:translate(-50%,-50%); width:16px; height:16px; display:flex; align-items:center; justify-content:center; z-index:3; pointer-events:none; }
        .pin-travel-bubble { position:absolute; transform:translate(-50%,-130%); display:flex; flex-direction:column; align-items:center; gap:1px; background:#21262C; color:#fff; padding:5px 9px; border-radius:8px; font-size:11px; font-weight:600; white-space:nowrap; pointer-events:none; z-index:4; box-shadow:0 2px 8px rgba(0,0,0,0.25); }
        .pin-travel-bubble-name { font-size:10px; font-weight:700; opacity:0.85; }
        .pin-travel-bubble-time { display:flex; align-items:center; gap:4px; }
        .my-location-dot { position:relative; width:12px; height:12px; border-radius:50%; background:#1D9E75; border:2px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,0.35); }
        .my-location-pulse { position:absolute; width:12px; height:12px; border-radius:50%; background:#1D9E75; opacity:0.45; animation: my-location-pulse 2s ease-out infinite; }
        @keyframes my-location-pulse {
          0% { transform:scale(1); opacity:0.45; }
          100% { transform:scale(3.2); opacity:0; }
        }

        .locate-btn { display:flex; align-items:center; gap:6px; padding:7px 13px; border-radius:999px; border:1.5px solid var(--line); background:#fff; font-size:12px; font-weight:600; color:var(--ink); cursor:pointer; flex-shrink:0; }
        .locate-btn.is-active { background:var(--ink); border-color:var(--ink); color:#fff; }
        .start-actions-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .locate-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .locate-travel-panel { display:flex; align-items:center; gap:7px; flex:1; min-width:0; padding:6px 12px; border-radius:999px; background:#F6F6F4; overflow-x:auto; }
        .locate-travel-distance { font-size:11.5px; font-weight:700; color:var(--ink); white-space:nowrap; flex-shrink:0; }
        .locate-travel-divider { width:1px; height:14px; background:var(--line); flex-shrink:0; }
        .locate-travel-chip { display:flex; align-items:center; gap:3px; font-size:11px; font-weight:600; color:var(--ink); white-space:nowrap; flex-shrink:0; }
        .locate-error { font-size:11.5px; color:#D9534F; background:#FBEAEA; padding:7px 10px; border-radius:8px; line-height:1.5; margin:0; width:100%; }

        .chip-row { display:flex; gap:6px; overflow-x:auto; flex:1; padding-bottom:2px; }
        .chip { display:flex; align-items:center; gap:5px; font-size:12px; padding:5px 9px; border-radius:8px; white-space:nowrap; border:1px solid var(--cat-color); flex-shrink:0; }
        .chip-candidate { background: var(--cat-tint); }
        .chip-decided { background: var(--cat-color); color:#fff; }
        .chip button { background:none; border:none; display:flex; cursor:pointer; color:inherit; padding:0; }
        .dock-empty { font-size:12px; color:var(--muted); }

        .bottom-toolbar { position:fixed; right:18px; bottom:calc(16px + env(safe-area-inset-bottom, 0px)); z-index:40; display:inline-flex; background:#fff; border-radius:999px; overflow:hidden; }
        .bottom-toolbar-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:14px 22px; border-radius:999px; border:none; background:transparent; color:var(--muted); font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; -webkit-tap-highlight-color:transparent; }
        .bottom-toolbar-btn.is-active { background:#F3F3F1; color:var(--ink); }
        .bottom-toolbar-btn-primary { background:#E2613D; color:#fff; font-weight:700; }
        .bottom-toolbar-btn-primary:disabled { background:#C9CCD1; color:#fff; cursor:not-allowed; }

        .overlay-backdrop { position:fixed; inset:0; background:rgba(20,22,26,0.45); display:flex; align-items:center; justify-content:center; padding:20px; z-index:50; overflow-y:auto; }
        .overlay-backdrop.detail-backdrop { align-items:flex-start; padding:28px 16px; }
        .detail-card { position:relative; background:#fff; border-radius:16px; padding:0; max-width:360px; width:100%; box-shadow:0 14px 34px rgba(0,0,0,0.18); overflow:hidden; }
        .detail-hero { height:140px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        .detail-hero.has-image { height:200px; }
        .detail-hero-icon { color:var(--cat-color); }
        .detail-hero-img { width:100%; height:100%; object-fit:cover; display:block; }
        .detail-textblock { background:#111111; padding:16px 20px 18px; display:flex; flex-direction:column; align-items:stretch; gap:8px; text-align:left; }
        .detail-textblock-top { display:flex; align-items:center; justify-content:flex-start; gap:8px; }
        .detail-textblock-tag { display:inline-flex; align-items:center; gap:5px; background:var(--cat-color); color:#fff; font-size:11px; font-weight:700; letter-spacing:0.02em; padding:4px 10px; border-radius:7px; }
        .detail-textblock-price { color:rgba(255,255,255,0.92); font-size:12.5px; font-weight:700; font-family:'JetBrains Mono', monospace; white-space:nowrap; }
        .detail-textblock-name { display:block; width:100%; color:#fff; font-family:'Zen Kaku Gothic New', sans-serif; font-size:21px; line-height:1.3; margin:0; text-align:left; }
        .detail-textblock-desc { color:rgba(255,255,255,0.82); font-size:13px; line-height:1.65; margin:0; text-align:left; }
        .detail-textblock-desc.is-clamped { display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
        .detail-textblock-more { align-self:flex-start; background:none; border:none; padding:0; margin-top:-3px; color:rgba(255,255,255,0.62); font-size:12px; font-weight:700; text-decoration:underline; cursor:pointer; }
        .detail-body { padding:18px 22px 22px; }
        .detail-body-dark { background:#111111; padding-top:14px; }
        .detail-body-dark .detail-price,
        .detail-body-dark .duration-label,
        .detail-body-dark .stepper-value { color:rgba(255,255,255,0.85); }

        .plan-dialog-card {
          position:relative;
          background:#fff;
          border-radius:16px;
          padding:22px;
          max-width:380px;
          width:100%;
          box-shadow:0 14px 34px rgba(0,0,0,0.18);
        }
        .plan-dialog-x { position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.05); border:none; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--ink); }
        .plan-dialog-title { font-family:'Zen Kaku Gothic New', sans-serif; font-size:17px; margin:0 0 8px; padding-right:20px; }
        .plan-dialog-desc { font-size:12.5px; color:#5B616A; line-height:1.6; margin:0 0 14px; }
        .plan-name-input { width:100%; padding:10px 12px; border-radius:9px; border:1.5px solid var(--line); font-size:13.5px; margin-bottom:14px; font-family:inherit; color:var(--ink) !important; }
        .plan-dialog-actions { display:flex; gap:8px; }
        .plan-dialog-btn { flex:1; padding:10px; border-radius:9px; border:1.5px solid var(--line); background:#fff; font-size:13px; font-weight:600; color:var(--ink); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; }
        .plan-dialog-btn-primary { background:var(--ink); border-color:var(--ink); color:#fff; }
        .plan-dialog-divider { height:1px; background:var(--line); margin:18px 0 14px; }
        .plan-dialog-file-btn { display:flex; align-items:center; justify-content:center; gap:7px; width:100%; padding:10px; border-radius:9px; border:1.5px dashed var(--line); background:#fff; font-size:12.5px; font-weight:600; color:var(--ink); cursor:pointer; }
        .plan-dialog-file-label { position:relative; overflow:hidden; }
        .plan-file-input-hidden { position:absolute; inset:0; opacity:0; cursor:pointer; }
        .plan-dialog-file-note { font-size:11px; color:var(--muted); text-align:center; margin:8px 0 0; }
        .plan-dialog-close-text { display:block; width:100%; text-align:center; background:none; border:none; font-size:12.5px; font-weight:600; color:var(--muted); cursor:pointer; margin-top:14px; }
        .other-menu-list { display:flex; flex-direction:column; gap:8px; }
        .other-menu-item { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:10px; border:1.5px solid var(--line); background:#fff; font-size:13.5px; font-weight:600; color:var(--ink); cursor:pointer; text-align:left; -webkit-tap-highlight-color: transparent; }
        .other-menu-item:hover { background:#F6F6F4; }

        .saved-plan-list { display:flex; flex-direction:column; gap:8px; max-height:280px; overflow-y:auto; }
        .saved-plan-item { display:flex; align-items:center; gap:8px; }
        .saved-plan-info { flex:1; min-width:0; text-align:left; background:#F6F6F4; border:none; border-radius:10px; padding:10px 12px; cursor:pointer; display:flex; flex-direction:column; gap:2px; }
        .saved-plan-name { font-size:13.5px; font-weight:700; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .saved-plan-meta { font-size:11px; color:var(--muted); }
        .saved-plan-delete { flex-shrink:0; width:34px; height:34px; border-radius:9px; border:1.5px solid var(--line); background:#fff; color:#B3494B; cursor:pointer; display:flex; align-items:center; justify-content:center; }

        .share-url-row { display:flex; gap:8px; margin-bottom:10px; }
        .share-url-input { flex:1; min-width:0; padding:10px 12px; border-radius:9px; border:1.5px solid var(--line); font-size:11.5px; font-family:'JetBrains Mono', monospace; color:var(--ink) !important; background:#F6F6F4; }
        .share-url-copy-btn { flex-shrink:0; padding:0 16px; border-radius:9px; border:none; background:var(--ink); color:#fff; font-size:13px; font-weight:600; cursor:pointer; }

        .plan-toast {
          position:fixed;
          bottom:28px;
          left:50%;
          transform:translateX(-50%);
          background:#21262C;
          color:#fff;
          font-size:12.5px;
          font-weight:600;
          padding:11px 20px;
          border-radius:999px;
          box-shadow:0 8px 20px rgba(0,0,0,0.25);
          z-index:60;
          animation: plan-toast-life 2.6s ease forwards;
        }
        @keyframes plan-toast-life {
          0% { opacity:0; transform:translateX(-50%) translateY(8px); }
          10% { opacity:1; transform:translateX(-50%) translateY(0); }
          85% { opacity:1; }
          100% { opacity:0; }
        }
        .shared-plan-banner {
          position:fixed;
          top:14px;
          left:50%;
          transform:translateX(-50%);
          background:#21262C;
          color:#fff;
          font-size:12.5px;
          font-weight:600;
          padding:10px 12px 10px 16px;
          border-radius:999px;
          display:flex;
          align-items:center;
          gap:10px;
          box-shadow:0 8px 20px rgba(0,0,0,0.25);
          z-index:60;
          max-width:90vw;
        }
        .shared-plan-banner button { background:rgba(255,255,255,0.15); border:none; border-radius:50%; width:22px; height:22px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer; }

        .detail-tag { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:var(--cat-color); border:1px solid var(--cat-color); padding:3px 9px; border-radius:999px; margin-bottom:10px; }
        .detail-name { font-family:'Zen Kaku Gothic New', sans-serif; font-size:19px; margin:0 0 8px; }
        .detail-desc { font-size:13px; color:#454A52; line-height:1.65; margin:0 0 10px; }
        .detail-price { font-size:12.5px; font-weight:700; color:var(--ink); font-family:'JetBrains Mono', monospace; margin:0 0 12px; }
        .hours-status { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:11.5px; font-weight:600; padding:7px 10px; border-radius:8px; margin:0 0 12px; }
        .travel-from-me { display:flex; flex-direction:column; gap:4px; background:#F6F6F4; border-radius:8px; padding:8px 10px; margin:0 0 12px; }
        .travel-from-me-label { font-size:11px; font-weight:700; color:var(--muted); }
        .travel-from-me-modes { display:flex; gap:12px; flex-wrap:wrap; }
        .travel-mode { display:flex; align-items:center; gap:4px; font-size:11.5px; font-weight:600; color:var(--ink); }
        .travel-from-me-disclaimer { font-size:9.5px; color:var(--muted); line-height:1.4; margin:2px 0 0; }
        .hours-status-text { white-space:nowrap; }
        .hours-today { font-family:'JetBrains Mono', monospace; font-weight:500; color:inherit; opacity:0.75; margin-left:auto; }
        .hours-open { background:#E9F3EC; color:#2E7D4F; }
        .hours-closing-soon { background:#FBF1E2; color:#9A6510; }
        .hours-closed { background:#FBEAEA; color:#B3494B; }
        .budget-warning-text { font-size:11.5px; color:#D9534F; background:#FBEAEA; padding:8px 10px; border-radius:8px; margin:0 0 14px; line-height:1.5; }
        .detail-meta { font-size:12px; color:var(--muted); display:flex; align-items:center; gap:5px; margin:0 0 16px; }
        .detail-actions { display:flex; gap:8px; }
        .action-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px; border-radius:999px; border:1.5px solid transparent; background:#EFEFEC; color:var(--ink); font-size:13px; font-weight:700; cursor:pointer; }
        .action-btn.action-active { background:var(--cat-color); color:#fff; }

        .route-view { padding:16px 22px 50px; }
        .route-actions { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
        .route-action-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; border:1.5px solid var(--line); background:var(--paper); font-size:13px; font-weight:500; color:var(--ink); cursor:pointer; -webkit-tap-highlight-color: transparent; flex-shrink:0; white-space:nowrap; }
        .route-action-btn.active { background:var(--ink); border-color:var(--ink); color:#fff; font-weight:700; }
        .summary-label { display:block; font-size:11px; color:var(--muted); margin-bottom:2px; }
        .summary-value { font-family:'JetBrains Mono', monospace; font-size:15px; font-weight:600; white-space:nowrap; }
        .start-actions { display:flex; flex-direction:column; align-items:flex-end; justify-content:center; gap:6px; margin-left:auto; padding-left:10px; flex-shrink:0; text-align:right; }
        .locate-origin-reset { background:none; border:none; font-size:11.5px; font-weight:600; color:var(--muted); text-decoration:underline; cursor:pointer; padding:0; }

        .trip-date-row { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:20px; }
        .trip-date-label { display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; color:var(--ink); }
        .trip-date-input { border:1.5px solid var(--line); border-radius:8px; padding:6px 9px; font-size:12.5px; font-family:inherit; color:var(--ink) !important; background:#fff; }
        .crowd-badge { font-size:11px; font-weight:600; padding:5px 11px; border-radius:999px; white-space:nowrap; }
        .crowd-busy { background:#FBEAEA; color:#B3494B; }
        .crowd-normal { background:#E9F3EC; color:#2E7D4F; }


        .navi-view { margin-bottom:24px; }
        .navi-combined-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:13px; border-radius:10px; background:var(--ink); color:#fff; font-size:13.5px; font-weight:700; text-decoration:none; margin-bottom:10px; }
        .navi-note { font-size:11.5px; color:var(--muted); margin:0 0 16px; line-height:1.5; }
        .navi-legs { display:flex; flex-direction:column; gap:10px; }
        .navi-leg-card { border:1.5px solid var(--line); border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:6px; }
        .navi-leg-route { display:flex; flex-direction:column; font-size:13px; font-weight:700; gap:2px; }
        .navi-leg-arrow { font-size:11px; color:var(--muted); font-weight:400; }
        .navi-leg-meta { display:flex; align-items:center; gap:5px; font-size:11.5px; color:#5B616A; }
        .navi-leg-btn { display:flex; align-items:center; justify-content:center; gap:6px; padding:9px; border-radius:8px; border:1.5px solid var(--ink); color:var(--ink); font-size:12px; font-weight:700; text-decoration:none; margin-top:4px; }

        .route-map-toolbar { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
        .detour-toggle, .recalc-btn { display:flex; align-items:center; gap:6px; padding:7px 12px; border-radius:999px; border:1.5px solid var(--line); background:#fff; font-size:12px; font-weight:600; color:var(--ink); cursor:pointer; }
        .detour-toggle.active { background:#FBF1E2; border-color:#C9821A; color:#9A6510; }

        .detour-filter { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
        .detour-filter button { padding:5px 12px; border-radius:999px; border:1.5px solid var(--line); background:#fff; font-size:11.5px; font-weight:600; color:var(--muted); cursor:pointer; }
        .detour-filter button.active { background:var(--cat-color, var(--ink)); border-color:var(--cat-color, var(--ink)); color:#fff; }

        .route-path-line { fill:none; stroke:#21262C; stroke-width:2; stroke-dasharray:7 7; stroke-linecap:round; }
        .route-airport-marker { position:absolute; transform:translate(-50%,-50%); width:26px; height:26px; border-radius:50%; background:#21262C; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 3px #fff; z-index:2; }
        .route-stop-marker { position:absolute; transform:translate(-50%,-50%); width:26px; height:26px; border-radius:50%; background:var(--cat-color); color:#fff; font-size:12px; font-weight:700; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 0 0 3px #fff; z-index:2; padding:0; }
        .route-stop-marker.is-hotel { width:30px; height:30px; }
        .route-map-caption { font-size:11px; color:var(--muted); margin-top:12px; text-align:center; }

        .timeline { display:flex; flex-direction:column; gap:8px; }
        .t-row { display:flex; align-items:stretch; gap:0; }
        .t-row-stop { gap:10px; }
        .t-row-stop {
          background:#fff;
          border:1.5px solid var(--line);
          border-radius:14px;
          padding:0 14px;
          box-shadow:0 2px 6px rgba(26,46,59,0.05);
          flex-wrap:wrap;
        }
        .t-node-col { position:relative; flex-shrink:0; width:44px; display:flex; align-items:center; justify-content:center; }
        .t-row-travel .t-node-col::before {
          content:'';
          position:absolute;
          top:0; bottom:0; left:50%;
          width:3px;
          margin-left:-1.5px;
          background:var(--mode-color);
        }
        .t-node { position:relative; z-index:1; flex-shrink:0; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; }
        .t-mode-badge { position:relative; z-index:1; flex-shrink:0; width:26px; height:26px; border-radius:50%; background:#fff; border:2.5px solid var(--mode-color); display:flex; align-items:center; justify-content:center; color:var(--mode-color); box-shadow:0 0 0 4px #EFF1F2; }
        .t-content-col { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; gap:4px; padding:14px 0; }
        .t-time-inline { font-family:'JetBrains Mono', monospace; font-size:12.5px; font-weight:600; color:#7C828A; }
        .t-time-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .t-row-stop.clickable { cursor:pointer; transition: border-color .15s, box-shadow .15s; -webkit-tap-highlight-color: transparent; }
        @media (hover: hover) and (pointer: fine) {
          .t-row-stop.clickable:hover { border-color:#C7CBD1; box-shadow:0 3px 10px rgba(26,46,59,0.09); }
        }
        .stop-chevron { flex-shrink:0; align-self:center; color:#B7BBC0; margin-left:6px; }
        .stop-name { font-weight:800; font-size:15.5px; line-height:1.3; }
        .stop-stay-badge { font-size:10.5px; font-weight:600; color:#5B616A; background:#F6F6F4; border-radius:999px; padding:2px 8px; }
        .t-card-actions { display:flex; flex-direction:row; align-items:center; gap:6px; margin-left:auto; padding-left:10px; flex-shrink:0; }
        .t-card-action-btn-confirm { margin-left:0; }
        .t-card-action-btn { display:flex; align-items:center; gap:4px; padding:5px 10px; border-radius:999px; border:1.5px solid var(--line); background:#fff; font-size:11px; font-weight:600; color:var(--ink); cursor:pointer; -webkit-tap-highlight-color: transparent; }
        .t-card-action-btn.active { background:#E9F3EC; border-color:#3F8753; color:#2E7D4F; }
        .travel-info { display:flex; flex-direction:row; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; }
        .travel-label { font-size:12px; color:var(--mode-color); font-weight:700; }
        .mode-toggle { display:flex; align-items:center; gap:5px; }
        .mode-toggle-divider { width:1px; height:18px; background:var(--line); margin:0 2px; }
        .mode-btn { display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0; border-radius:999px; border:1.5px solid var(--line); background:#fff; color:#5B616A; cursor:pointer; -webkit-tap-highlight-color: transparent; flex-shrink:0; }
        .mode-btn.mode-active { background:var(--ink); border-color:var(--ink); color:#fff; }
        .disclaimer { font-size:11px; color:var(--muted); margin-top:30px; text-align:center; }

        .duration-control { display:flex; align-items:center; justify-content:flex-end; gap:10px; margin:0 0 16px; }
        .duration-label { font-size:12px; color:var(--muted); display:flex; align-items:center; gap:5px; }
        .stepper { display:flex; align-items:center; gap:8px; }
        .stepper-btn { width:26px; height:26px; border-radius:7px; border:1.5px solid transparent; background:#EFEFEC; font-size:15px; line-height:1; cursor:pointer; color:var(--ink); display:flex; align-items:center; justify-content:center; padding:0; -webkit-tap-highlight-color: transparent; flex-shrink:0; }
        .stepper-btn:active { background:#E2E2DE; }
        .stepper-value { font-family:'JetBrains Mono', monospace; font-size:13px; min-width:38px; text-align:center; }
        .travelers-value { min-width:22px; }

        @media (max-width:560px) {
          .entry-header { padding:18px 20px 16px; }
          .entry-title { font-size:22px; }
          .entry-prompt-spacer { height:8px; }
          .header { padding:14px 16px; }
          .mode-switch-wrap { padding:0 16px; }
          .select-view { padding:16px; }
          .route-view { padding:14px 16px 40px; }
          .route-action-btn { padding:7px 12px; font-size:12px; gap:5px; }
          .spot-pin { --pin-size: 22px; }
          .spot-index-name { font-size:10.5px; }

          .inset-island-svg { width:calc(var(--isl-w) * 0.46); max-width:42px; }
          .island-inset-panel { padding:10px 8px; gap:6px; }
          .island-inset-frame { padding:28px 14px 24px; }
          .island-inset-row { gap:6px; }
          .inset-islands-row { gap:0; }
          .inset-group-label { font-size:8.5px; }
          .region-map-frame { --frame-pad:0px; }
          .bottom-toolbar { right:16px; bottom:calc(14px + env(safe-area-inset-bottom, 0px)); }
          .bottom-toolbar-btn { padding:12px 18px; font-size:12px; gap:5px; }

          .budget-bar { padding:10px 10px; }
          .budget-inputs-row { flex-wrap:nowrap; gap:0; }
          .budget-input-row { font-size:10.5px; gap:4px; flex-shrink:1; padding:0 6px; }
          .budget-stepper, .travelers-stepper { gap:3px; }
          .budget-input { width:52px; padding:4px 2px; font-size:11px; }
          .stepper-btn { width:20px; height:20px; font-size:12px; border-radius:6px; }
          .travelers-value { min-width:14px; font-size:11px; }

          .locate-travel-panel { width:100%; order:3; }
          .locate-travel-distance { font-size:11px; }
          .locate-travel-chip { font-size:10.5px; }
          .locate-error { order:4; }

          .t-time-col { width:44px; padding:12px 6px 12px 0; }
          .t-time-big { font-size:13px; }
          .t-node-col { width:36px; }
          .t-node { width:32px; height:32px; }
          .t-content-col { padding:12px 0; }
          .stop-name { font-size:14.5px; }
          .mode-btn { width:28px; height:28px; }

          .pref-floating-label-text { font-size:8px; padding:3px 5px; border-radius:5px; }
          .muni-peek-name { font-size:11px; }

          .muni-name-grid { grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap:5px; }
          .muni-name-grid-item { font-size:9.5px; padding:5px 2px; border-radius:8px; }
        }
        @media (max-width:380px) {
          .budget-input-row { font-size:9.5px; padding:0 4px; }
          .budget-input { width:44px; font-size:10px; }

          .pref-floating-label-text { font-size:7.5px; padding:2.5px 4px; }

          .muni-name-grid { grid-template-columns: repeat(auto-fill, minmax(46px, 1fr)); gap:4px; }
          .muni-name-grid-item { font-size:9px; padding:4px 2px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mairu-app * { animation-duration:0.001ms !important; transition:none !important; }
        }
      `}</style>

      {appStage === 'top' && (
        <div className="app-top">
          <div className="app-top-content">
            <h1 className="app-top-logo">CONOTAVI</h1>
            <p className="app-top-tagline">
              {lang === 'en' ? 'Make this trip something special.' : 'この旅を、もっと特別に。'}
            </p>
            <button className="app-top-start-btn" onClick={() => setAppStage('entry')}>
              {lang === 'en' ? 'Get started' : 'はじめる'}
              <span className="app-top-start-arrow">→</span>
            </button>
          </div>
          <div className="lang-toggle-top">
            <button
              className={lang === 'ja' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
              onClick={() => setLang('ja')}
            >JP</button>
            <span className="lang-toggle-sep">/</span>
            <button
              className={lang === 'en' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
              onClick={() => setLang('en')}
            >EN</button>
          </div>
        </div>
      )}

      {appStage === 'entry' && (
        <div className="kyushu-fullmap-view entry-fullmap-view">
          <div className="kyushu-float-header">
            <button className="entry-title-btn kyushu-float-title-btn" onClick={() => setAppStage('top')}>
              <h1 className="kyushu-float-title">CONOTAVI</h1>
            </button>
            <div className="entry-lang-toggle kyushu-float-lang">
              <button
                className={lang === 'ja' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
                onClick={() => setLang('ja')}
              >JP</button>
              <span className="lang-toggle-sep">/</span>
              <button
                className={lang === 'en' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
                onClick={() => setLang('en')}
              >EN</button>
            </div>
          </div>

          <div className="entry-cards entry-cards-float">
            <button
              className="entry-card"
              onClick={() => { setAppStage('kyushu'); setPeekIslandKey(null); }}
            >
              <div className="entry-card-icon" style={{ background: '#1F6E45' }}>
                <MapIcon size={22} color="#fff" />
              </div>
              <div className="entry-card-body">
                <p className="entry-card-ja">{lang === 'en' ? 'By Area' : '地域で探す'}</p>
                <p className="entry-card-desc">{lang === 'en' ? 'Tap an area on the map' : '地図からエリアをタップ'}</p>
              </div>
              <ChevronRight size={20} color="#B8C4C9" />
            </button>

            <button
              className="entry-card"
              onClick={() => { setAppStage('purpose'); setPurposeCategory(null); setPurposePrefId(null); }}
            >
              <div className="entry-card-icon" style={{ background: '#1B6CA8' }}>
                <Compass size={22} color="#fff" />
              </div>
              <div className="entry-card-body">
                <p className="entry-card-ja">{lang === 'en' ? 'By Purpose' : '目的で探す'}</p>
                <p className="entry-card-desc">{lang === 'en' ? 'Sights, food, hot springs…' : '観る・食べる・温泉など'}</p>
              </div>
              <ChevronRight size={20} color="#B8C4C9" />
            </button>

            <button className="entry-card" disabled>
              <div className="entry-card-icon" style={{ background: '#4A5A63' }}>
                <Compass size={22} color="#fff" />
              </div>
              <div className="entry-card-body">
                <p className="entry-card-ja">NO PLAN</p>
                <p className="entry-card-desc">{lang === 'en' ? 'Not decided yet' : 'まだ決まっていない'}</p>
              </div>
              <span className="entry-card-badge">{lang === 'en' ? 'Coming soon' : '準備中'}</span>
            </button>
          </div>

          <div className="entry-footer-wrap entry-footer-float">
            <div className="entry-footer-links">
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Terms of Service' : '利用規約'}</a>
              <span className="entry-footer-dot-sep">・</span>
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Privacy Policy' : 'プライバシーポリシー'}</a>
            </div>
          </div>
        </div>
      )}

      {appStage === 'kyushu' && (
        kyushuMode === 'map' ? (
        <div className="kyushu-fullmap-view kyushu-topbar-view kyushu-icons-consolidated">
          <div className={`kyushu-float-header ${showAllPrefNames && !peekPrefId ? 'kyushu-float-header-dimmed' : ''}`}>
            <button className="entry-title-btn kyushu-float-title-btn" onClick={() => setAppStage('top')}>
              <h1 className="kyushu-float-title">CONOTAVI</h1>
            </button>
            <div className="entry-lang-toggle kyushu-float-lang">
              <button
                className={lang === 'ja' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
                onClick={() => setLang('ja')}
              >JP</button>
              <span className="lang-toggle-sep">/</span>
              <button
                className={lang === 'en' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
                onClick={() => setLang('en')}
              >EN</button>
            </div>
          </div>

            <div className="map-scroll kyushu-fullmap-scroll">
              <div className="region-map-frame kyushu-map-frame kyushu-fullmap-frame nagasaki-sea-bg" ref={kyushuMapFrameRef}>
                <div className={`map-toggle-group ${showAllPrefNames ? 'map-toggle-group-solid' : ''}`}>
                  <button
                    className={kyushuMode === 'map' ? 'locate-me-btn icon-only active' : 'locate-me-btn icon-only'}
                    onClick={() => { setKyushuMode('map'); setPeekPrefId(null); setPeekIslandKey(null); setIconLabelPeek(lang === 'en' ? 'By Area' : '地域で探す'); }}
                    title={lang === 'en' ? 'By Area' : '地域で探す'}
                    aria-label={lang === 'en' ? 'By Area' : '地域で探す'}
                  >
                    <MapIcon size={16} />
                  </button>
                  <button
                    className="locate-me-btn icon-only"
                    onClick={() => { setAppStage('purpose'); setPurposeCategory(null); setPurposePrefId(null); }}
                    title={lang === 'en' ? 'By Purpose' : '目的で探す'}
                    aria-label={lang === 'en' ? 'By Purpose' : '目的で探す'}
                  >
                    <Compass size={16} />
                  </button>
                  <button className="locate-me-btn icon-only" disabled title={lang === 'en' ? 'NO PLAN (Coming soon)' : 'NO PLAN(準備中)'} aria-label="NO PLAN">
                    <X size={16} />
                  </button>
                  <div className="map-toggle-divider" />
                  <button
                    className={`locate-me-btn icon-only ${showAllPrefNames ? 'active' : ''}`}
                    onClick={() => { setShowAllPrefNames((v) => !v); setShowAirportPins(false); setShowFerryPins(false); setShowRoadsidePins(false); setIconLabelPeek(lang === 'en' ? 'Show place names' : '地名を表示'); }}
                    title={lang === 'en' ? 'Show place names' : '地名を表示'}
                    aria-label={lang === 'en' ? 'Show place names' : '地名を表示'}
                  >
                    <Landmark size={16} />
                  </button>
                  <button
                    className="locate-me-btn icon-only"
                    onClick={() => { handleLocateMe(); setIconLabelPeek(lang === 'en' ? 'Show my location' : '現在地を表示'); }}
                    disabled={myLocationStatus === 'loading'}
                    title={lang === 'en' ? 'Show my location' : '現在地を表示'}
                    aria-label={lang === 'en' ? 'Show my location' : '現在地を表示'}
                  >
                    <Navigation size={16} />
                    {myLocationStatus === 'error' && (
                      <span className="locate-me-error">
                        {lang === 'en' ? 'Could not get location' : '現在地を取得できませんでした'}
                      </span>
                    )}
                  </button>
                  <button
                    className={`locate-me-btn pin-toggle-btn icon-only ${showAirportPins ? 'active' : ''}`}
                    onClick={() => { setShowAirportPins((v) => !v); setShowFerryPins(false); setShowRoadsidePins(false); setShowAllPrefNames(false); setPeekAirportId(null); setPeekFerryId(null); setPeekRoadsideId(null); setIconLabelPeek(lang === 'en' ? 'Show airports' : '空港を表示'); }}
                    title={lang === 'en' ? 'Show airports' : '空港を表示'}
                    aria-label={lang === 'en' ? 'Show airports' : '空港を表示'}
                  >
                    <Plane size={16} />
                  </button>
                  <button
                    className={`locate-me-btn pin-toggle-btn icon-only ${showFerryPins ? 'active' : ''}`}
                    onClick={() => { setShowFerryPins((v) => !v); setShowAirportPins(false); setShowRoadsidePins(false); setShowAllPrefNames(false); setPeekFerryId(null); setPeekAirportId(null); setPeekRoadsideId(null); setIconLabelPeek(lang === 'en' ? 'Show ferry terminals' : 'フェリーを表示'); }}
                    title={lang === 'en' ? 'Show ferry terminals' : 'フェリーを表示'}
                    aria-label={lang === 'en' ? 'Show ferry terminals' : 'フェリーを表示'}
                  >
                    <Ship size={16} />
                  </button>
                  <button
                    className={`locate-me-btn pin-toggle-btn icon-only ${showRoadsidePins ? 'active' : ''}`}
                    onClick={() => { setShowRoadsidePins((v) => !v); setShowAirportPins(false); setShowFerryPins(false); setShowAllPrefNames(false); setPeekRoadsideId(null); setPeekAirportId(null); setPeekFerryId(null); setIconLabelPeek(lang === 'en' ? 'Show roadside stations' : '道の駅を表示'); }}
                    title={lang === 'en' ? 'Show roadside stations' : '道の駅を表示'}
                    aria-label={lang === 'en' ? 'Show roadside stations' : '道の駅を表示'}
                  >
                    {roadsideMapLoading ? <Clock size={16} /> : <Store size={16} />}
                  </button>
                </div>
                <div className="map-zoom-group">
                  <button
                    className="zoom-btn"
                    onClick={() => setKyushuZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))}
                    disabled={kyushuZoom >= 3}
                    title={lang === 'en' ? 'Zoom in' : '拡大'}
                  >+</button>
                  <span className="lang-toggle-sep">/</span>
                  <button
                    className="zoom-btn"
                    onClick={() => setKyushuZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}
                    disabled={kyushuZoom <= 1}
                    title={lang === 'en' ? 'Zoom out' : '縮小'}
                  >−</button>
                </div>
                <div
                  className="map-pan-scroll"
                  ref={kyushuMapScrollRef}
                  onMouseDown={handleKyushuPanMouseDown}
                  onClick={() => { if (peekPrefId) setPeekPrefId(null); setPeekAirportId(null); setPeekFerryId(null); setPeekRoadsideId(null); }}
                  {...makePinchHandlers(setKyushuZoom, kyushuMapContentRef, kyushuMapScrollRef)}
                >
                  <div ref={kyushuMapContentRef} className="map-pan-content kyushu-contain-fit" style={(() => {
                    let hPct = (kyushuPanBox.h / KYUSHU_MAINLAND_VIEWBOX.h) * 100;
                    if (kyushuMapSize && kyushuMapSize.w > 0 && kyushuMapSize.h > 0) {
                      const effectiveW = kyushuMapSize.w; // 地図はフレーム全面に表示(左右の要素は地図の上に重ねるだけ)
                      const effectiveH = kyushuMapSize.h; // 地図はヘッダー・フッターの裏まで全面表示(余白は拡大率側で調整)
                      const scaleW = effectiveW / kyushuSizingBox.w;
                      const scaleH = effectiveH / kyushuSizingBox.h; // 本島基準の拡大率(奄美群島の分は含めない)
                      const scale = Math.min(scaleW, scaleH) * 1.25; // 少しだけ大きめに表示して画面を埋める(端は多少見切れる)
                      wPct = (scale * kyushuPanBox.w / effectiveW) * 100;
                      hPct = (scale * kyushuPanBox.h / effectiveH) * 100;
                    }
                    return { width: `${wPct * kyushuZoom}%`, height: `${hPct * kyushuZoom}%` };
                  })()}>
                    <svg viewBox={`${kyushuPanBox.x} ${kyushuPanBox.y} ${kyushuPanBox.w} ${kyushuPanBox.h}`} className="map-svg-pan" aria-hidden="true">
                      {KYUSHU_OUTLINE_PATHS.map((d, i) => (
                        <path key={`land-${i}`} d={d} className="region-land-fill" />
                      ))}
                      {KYUSHU_PREFS.map((p) => {
                        const isPeeking = peekPrefId === p.id;
                        return (
                          <path
                            key={p.id}
                            d={p.d}
                            className={`muni-boundary ${isPeeking ? 'is-peeking' : ''}`}
                            onClick={(e) => { e.stopPropagation(); if (panDragRef.current.moved) { panDragRef.current.moved = false; return; } setPeekPrefId(isPeeking ? null : p.id); setPeekAirportId(null); setPeekFerryId(null); setPeekRoadsideId(null); }}
                          />
                        );
                      })}
                      {KAGOSHIMA_REMOTE_ISLAND_PATHS.map((d, i) => (
                        <path
                          key={`kagoshima-island-${i}`}
                          d={d}
                          className={`muni-boundary ${peekPrefId === '46' ? 'is-peeking' : ''}`}
                          onClick={(e) => { e.stopPropagation(); if (panDragRef.current.moved) { panDragRef.current.moved = false; return; } setPeekPrefId(peekPrefId === '46' ? null : '46'); setPeekAirportId(null); setPeekFerryId(null); setPeekRoadsideId(null); }}
                        />
                      ))}
                      {KYUSHU_PREFS.map((p) => (
                        <path key={`pb-${p.id}`} d={p.d} className="kyushu-internal-border" />
                      ))}
                      {KYUSHU_OUTLINE_PATHS.map((d, i) => (
                        <path key={`ko-${i}`} d={d} className="region-outline" />
                      ))}
                    </svg>

                    {(() => {
                      const p = KYUSHU_PREFS.find((x) => x.id === peekPrefId);
                      if (!p) return null;
                      return (
                        <div className="muni-peek" style={{ left: pct(p.cx - kyushuPanBox.x, kyushuPanBox.w) + '%', top: pct(p.cy - kyushuPanBox.y, kyushuPanBox.h) + '%' }}>
                          <span className="muni-peek-name" onClick={() => setPeekPrefId(null)}>{mName(p)}</span>
                          <button
                            className="peek-detail-btn"
                            onClick={() => { setSelectedPrefId(p.id); setAppStage('region'); setPeekPrefId(null); setPeekIslandKey(null); }}
                          >
                            {lang === 'en' ? 'Select ›' : '選択する ›'}
                          </button>
                        </div>
                      );
                    })()}

                    {myLocationXY && (
                      <div
                        className="my-location-marker"
                        style={{ left: pct(myLocationXY.x - kyushuPanBox.x, kyushuPanBox.w) + '%', top: pct(myLocationXY.y - kyushuPanBox.y, kyushuPanBox.h) + '%' }}
                      >
                        <span className="my-location-dot" />
                        <span className="my-location-pulse" />
                      </div>
                    )}
                    {showAirportPins && clusterPins(
                      Object.entries(AIRPORTS).map(([id, a]) => { const svg = airportSvgPos(id, a); return { id, x: svg.x, y: svg.y, name: a.name, nameEn: a.nameEn }; }),
                      poiClusterCellSize
                    ).map((cluster) => {
                      const key = cluster.items.map((i) => i.id).join('|');
                      const isCluster = cluster.items.length > 1;
                      return (
                        <div
                          key={`airport-c-${key}`}
                          className="poi-pin airport-pin"
                          style={{ left: pct(cluster.x - kyushuPanBox.x, kyushuPanBox.w) + '%', top: pct(cluster.y - kyushuPanBox.y, kyushuPanBox.h) + '%' }}
                          onClick={(e) => { e.stopPropagation(); peekPoi('airport', key); }}
                        >
                          {isCluster ? (
                            <span className={`poi-pin-cluster poi-pin-icon-airport ${peekAirportId === key ? 'is-peeked' : ''}`}><Plane size={11} />{cluster.items.length}</span>
                          ) : (
                            <span className={`poi-pin-icon poi-pin-icon-airport ${peekAirportId === key ? 'is-peeked' : ''}`}><span className="poi-pin-icon-glyph"><Plane size={12} /></span></span>
                          )}
                          {peekAirportId === key && (
                            <span className="poi-pin-label">
                              {isCluster ? (
                                <span className="poi-pin-label-list">
                                  {cluster.items.map((i) => (
                                    <button key={i.id} className="poi-pin-label-row" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'airport', data: i }); setPeekAirportId(null); }}>
                                      {lang === 'en' ? i.nameEn : i.name}
                                    </button>
                                  ))}
                                </span>
                              ) : (
                                <>
                                  <span className="poi-pin-label-name">{lang === 'en' ? cluster.items[0].nameEn : cluster.items[0].name}</span>
                                  <button className="peek-detail-btn" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'airport', data: cluster.items[0] }); setPeekAirportId(null); }}>
                                    {lang === 'en' ? 'Select ›' : '選択する ›'}
                                  </button>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {showFerryPins && clusterPins(
                      Object.entries(FERRIES).map(([id, f]) => { const svg = geoToSvg(f.lat, f.lon); return { id, x: svg.x, y: svg.y, name: f.name, nameEn: f.nameEn }; }),
                      poiClusterCellSize
                    ).map((cluster) => {
                      const key = cluster.items.map((i) => i.id).join('|');
                      const isCluster = cluster.items.length > 1;
                      return (
                        <div
                          key={`ferry-c-${key}`}
                          className="poi-pin ferry-pin"
                          style={{ left: pct(cluster.x - kyushuPanBox.x, kyushuPanBox.w) + '%', top: pct(cluster.y - kyushuPanBox.y, kyushuPanBox.h) + '%' }}
                          onClick={(e) => { e.stopPropagation(); peekPoi('ferry', key); }}
                        >
                          {isCluster ? (
                            <span className={`poi-pin-cluster poi-pin-icon-ferry ${peekFerryId === key ? 'is-peeked' : ''}`}><Ship size={11} />{cluster.items.length}</span>
                          ) : (
                            <span className={`poi-pin-icon poi-pin-icon-ferry ${peekFerryId === key ? 'is-peeked' : ''}`}><span className="poi-pin-icon-glyph"><Ship size={12} /></span></span>
                          )}
                          {peekFerryId === key && (
                            <span className="poi-pin-label">
                              {isCluster ? (
                                <span className="poi-pin-label-list">
                                  {cluster.items.map((i) => (
                                    <button key={i.id} className="poi-pin-label-row" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'ferry', data: i }); setPeekFerryId(null); }}>
                                      {lang === 'en' ? i.nameEn : i.name}
                                    </button>
                                  ))}
                                </span>
                              ) : (
                                <>
                                  <span className="poi-pin-label-name">{lang === 'en' ? cluster.items[0].nameEn : cluster.items[0].name}</span>
                                  <button className="peek-detail-btn" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'ferry', data: cluster.items[0] }); setPeekFerryId(null); }}>
                                    {lang === 'en' ? 'Select ›' : '選択する ›'}
                                  </button>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {showRoadsidePins && (() => {
                      // 道の駅は数が多いので、九州ページでは1つ1つではなく、県ごとにまとめて
                      // 「その県に何件あるか」を県の中心に表示する。
                      const countByPref = {};
                      roadsideMapSpots.forEach((s) => {
                        if (!s.prefId) return;
                        countByPref[s.prefId] = (countByPref[s.prefId] || 0) + 1;
                      });
                      return KYUSHU_PREFS.filter((p) => countByPref[p.id]).map((p) => {
                        const key = `roadside-pref-${p.id}`;
                        const count = countByPref[p.id];
                        const isNearRightEdge = (p.cx - kyushuPanBox.x) / kyushuPanBox.w > 0.62; // 右のアイコン列に吹き出しが重ならないよう、右寄りの県は吹き出しを左にずらす
                        return (
                          <div
                            key={key}
                            className="poi-pin roadside-pin"
                            style={{ left: pct(p.cx - kyushuPanBox.x, kyushuPanBox.w) + '%', top: pct(p.cy - kyushuPanBox.y, kyushuPanBox.h) + '%' }}
                            onClick={(e) => { e.stopPropagation(); peekPoi('roadside', key); }}
                          >
                            <span className={`poi-pin-cluster poi-pin-icon-roadside ${peekRoadsideId === key ? 'is-peeked' : ''}`}><Store size={11} />{count}</span>
                            {peekRoadsideId === key && (
                              <span className={`poi-pin-label ${isNearRightEdge ? 'poi-pin-label-left' : ''}`}>
                                <span className="poi-pin-label-name">
                                  {lang === 'en' ? `${mName(p)} / ${count} roadside stations` : `${mName(p)} / 道の駅 ${count}か所`}
                                </span>
                                <button className="peek-detail-btn" onClick={(e) => { e.stopPropagation(); setPeekRoadsideId(null); setAppStage('region'); setSelectedPrefId(p.id); }}>
                                  {lang === 'en' ? 'View roadside stations ›' : '道の駅を確認する ›'}
                                </button>
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {showAllPrefNames && !peekPrefId && (
                  <div className="muni-name-grid-overlay" onClick={(e) => e.stopPropagation()}>
                    <div className="muni-name-grid">
                      {KYUSHU_PREFS.map((p) => (
                        <button
                          key={`dimname-${p.id}`}
                          className="muni-name-grid-item"
                          onClick={() => setPeekPrefId(p.id)}
                        >
                          {mName(p)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          <button
            className="floating-back-btn floating-back-btn-icon kyushu-back-right"
            onClick={() => { setAppStage('entry'); setPeekIslandKey(null); }}
            title={lang === 'en' ? 'Back' : '戻る'}
            aria-label={lang === 'en' ? 'Back' : '戻る'}
          >
            <ChevronLeft size={20} />
          </button>

          <div className={`entry-footer-wrap entry-footer-float kyushu-footer-float ${showAllPrefNames && !peekPrefId ? 'kyushu-float-header-dimmed' : ''}`}>
            <div className="entry-footer-links">
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Terms of Service' : '利用規約'}</a>
              <span className="entry-footer-dot-sep">・</span>
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Privacy Policy' : 'プライバシーポリシー'}</a>
            </div>
          </div>
        </div>
        ) : (
        <div className="entry-view region-scroll nagasaki-sea-bg kyushu-page-view">
          <div className="entry-header">
            <div className="entry-header-row">
              <div className="entry-header-text">
                <button className="entry-title-btn" onClick={() => setAppStage('top')}>
                  <h1 className="entry-title">CONOTAVI</h1>
                </button>
                <p className="entry-catch">{lang === 'en' ? 'Make this trip something special.' : 'この旅を、もっと特別に。'}</p>
              </div>
              <div className="entry-lang-toggle">
                <button
                  className={lang === 'ja' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
                  onClick={() => setLang('ja')}
                >JP</button>
                <span className="lang-toggle-sep">/</span>
                <button
                  className={lang === 'en' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
                  onClick={() => setLang('en')}
                >EN</button>
              </div>
            </div>
          </div>

          <svg className="entry-wave" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,0 L400,0 L400,24 Q200,-16 0,24 Z" fill="#fff" />
          </svg>

          <div className="entry-prompt-spacer" />

          <div className="region-body">

          <div className="mode-switch" role="group" aria-label={lang === 'en' ? 'Switch display mode' : '表示方法を切り替え'}>
            <button className={kyushuMode === 'map' ? 'active' : ''} onClick={() => { setKyushuMode('map'); setPeekPrefId(null); setPeekIslandKey(null); }}>
              <MapIcon size={14} /> {lang === 'en' ? 'By Area' : '地域で探す'}
            </button>
            <button onClick={() => { setAppStage('purpose'); setPurposeCategory(null); setPurposePrefId(null); }}>
              <Compass size={14} /> {lang === 'en' ? 'By Purpose' : '目的で探す'}
            </button>
            <button disabled title={lang === 'en' ? 'Coming soon' : '準備中'}>
              <Compass size={14} /> NO PLAN
            </button>
          </div>

            <div className="muni-card-grid">
              {KYUSHU_PREFS.map((p) => {
                return (
                  <button
                    key={p.id}
                    className="muni-card is-active"
                    onClick={() => { setSelectedPrefId(p.id); setAppStage('region'); }}
                  >
                    <span className="muni-card-name">{mName(p)}</span>
                    <span className="muni-card-tag active">{lang === 'en' ? 'Available' : '体験可能'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <svg className="entry-wave entry-wave-bottom" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,0 L400,0 L400,24 Q200,-16 0,24 Z" fill="#fff" />
          </svg>
          <div className="entry-footer-wrap">
            <div className="entry-footer-links">
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Terms of Service' : '利用規約'}</a>
              <span className="entry-footer-dot-sep">・</span>
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Privacy Policy' : 'プライバシーポリシー'}</a>
            </div>
          </div>

          <button
            className="floating-back-btn"
            onClick={() => { setAppStage('entry'); setPeekIslandKey(null); }}
          >
            {lang === 'en' ? '← Back' : '← 戻る'}
          </button>
        </div>
        )
      )}

      {appStage === 'region' && (() => {
        const currentPref = KYUSHU_PREFS.find((x) => x.id === selectedPrefId);
        const prefName = currentPref.name;
        const prefNameEn = currentPref.nameEn;
        const prefMunicipalities = KYUSHU_MUNICIPALITIES.filter((m) => m.prefId === selectedPrefId);
        const prefOutlinePaths = [currentPref.d];
        const prefViewBox = currentPref.regionViewBox;
        // どの市町村を選んでも画面の真ん中まで動かせるように、パン可能領域(prefFullViewBox)を用意する。
        // 拡大率(本島がぴったり収まる基準)は、県ごとに用意されている表示範囲(regionViewBox)を
        // そのまま使う。離島を含む市町村リストから毎回計算し直すと、長崎県・鹿児島県のように
        // 離島が多い県で計算がおかしくなり、本島が小さく/一部しか見えなくなる問題があったため。
        const prefSizingViewBox = prefViewBox;
        // パン可能範囲は、本島(regionViewBox)をそのまま基準にしつつ、離島(対馬・奄美群島など)
        // がある方向にだけ、そこまで届く分の余白を追加する(使わない方向にまで余白を
        // 均等に広げると、その分だけ無駄な余白ができてしまうため、必要な方向だけ広げる)。
        const prefMuniXs2 = prefMunicipalities.map((m) => m.cx);
        const prefMuniYs2 = prefMunicipalities.map((m) => m.cy);
        const buf = Math.max(prefSizingViewBox.w, prefSizingViewBox.h) * 0.5; // 端の市町村でも画面中央まで来られるようにする余裕分
        const fullMinX = Math.min(prefViewBox.x, ...prefMuniXs2) - buf;
        const fullMinY = Math.min(prefViewBox.y, ...prefMuniYs2) - buf;
        const fullMaxX = Math.max(prefViewBox.x + prefViewBox.w, ...prefMuniXs2) + buf;
        const fullMaxY = Math.max(prefViewBox.y + prefViewBox.h, ...prefMuniYs2) + buf;
        const prefFullViewBox = { x: fullMinX, y: fullMinY, w: fullMaxX - fullMinX, h: fullMaxY - fullMinY };
        const scrollContentWPct = (prefFullViewBox.w / prefViewBox.w) * 100;
        const scrollContentHPct = (prefFullViewBox.h / prefViewBox.h) * 100;
        return (
        regionMode === 'map' ? (
        <div className="kyushu-fullmap-view kyushu-topbar-view kyushu-icons-consolidated">
          <div className={`kyushu-float-header ${showAllCityNames && !peekCityId ? 'kyushu-float-header-dimmed' : ''}`}>
            <button className="entry-title-btn kyushu-float-title-btn" onClick={() => setAppStage('top')}>
              <h1 className="kyushu-float-title">CONOTAVI</h1>
            </button>
            <div className="entry-lang-toggle kyushu-float-lang">
              <button className={lang === 'ja' ? 'lang-toggle-opt active' : 'lang-toggle-opt'} onClick={() => setLang('ja')}>JP</button>
              <span className="lang-toggle-sep">/</span>
              <button className={lang === 'en' ? 'lang-toggle-opt active' : 'lang-toggle-opt'} onClick={() => setLang('en')}>EN</button>
            </div>
          </div>

            <div className="map-scroll kyushu-fullmap-scroll">
              <div className="region-map-frame kyushu-map-frame kyushu-fullmap-frame nagasaki-sea-bg" ref={regionMapFrameRef}>
                <div className={`map-toggle-group ${showAllCityNames ? 'map-toggle-group-solid' : ''}`}>
                  <button
                    className={regionMode === 'map' ? 'locate-me-btn icon-only active' : 'locate-me-btn icon-only'}
                    onClick={() => { setRegionMode('map'); setPeekCityId(null); setPeekIslandKey(null); }}
                    title={lang === 'en' ? 'By Area' : '地域で探す'}
                    aria-label={lang === 'en' ? 'By Area' : '地域で探す'}
                  >
                    <MapIcon size={16} />
                  </button>
                  <button
                    className="locate-me-btn icon-only"
                    onClick={() => { setAppStage('purpose'); setPurposeCategory(null); setPurposePrefId(null); }}
                    title={lang === 'en' ? 'By Purpose' : '目的で探す'}
                    aria-label={lang === 'en' ? 'By Purpose' : '目的で探す'}
                  >
                    <Compass size={16} />
                  </button>
                  <button className="locate-me-btn icon-only" disabled title={lang === 'en' ? 'NO PLAN (Coming soon)' : 'NO PLAN(準備中)'} aria-label="NO PLAN">
                    <X size={16} />
                  </button>
                  <div className="map-toggle-divider" />
                  {['40','41','42','43','44','45','46'].includes(selectedPrefId) && (
                    <button
                      className={`locate-me-btn icon-only ${showAllCityNames ? 'active' : ''}`}
                      onClick={() => setShowAllCityNames((v) => !v)}
                      title={lang === 'en' ? 'Show place names' : '地名を表示'}
                      aria-label={lang === 'en' ? 'Show place names' : '地名を表示'}
                    >
                      <Landmark size={16} />
                    </button>
                  )}
                  <button
                    className="locate-me-btn icon-only"
                    onClick={handleLocateMe}
                    disabled={myLocationStatus === 'loading'}
                    title={lang === 'en' ? 'Show my location' : '現在地を表示'}
                    aria-label={lang === 'en' ? 'Show my location' : '現在地を表示'}
                  >
                    <Navigation size={16} />
                  </button>
                  <button
                    className={`locate-me-btn pin-toggle-btn icon-only ${showAirportPins ? 'active' : ''}`}
                    onClick={() => { setShowAirportPins((v) => !v); setShowFerryPins(false); setShowRoadsidePins(false); setPeekAirportId(null); setPeekFerryId(null); setPeekRoadsideId(null); }}
                    title={lang === 'en' ? 'Show airports' : '空港を表示'}
                    aria-label={lang === 'en' ? 'Show airports' : '空港を表示'}
                  >
                    <Plane size={16} />
                  </button>
                  <button
                    className={`locate-me-btn pin-toggle-btn icon-only ${showFerryPins ? 'active' : ''}`}
                    onClick={() => { setShowFerryPins((v) => !v); setShowAirportPins(false); setShowRoadsidePins(false); setPeekFerryId(null); setPeekAirportId(null); setPeekRoadsideId(null); }}
                    title={lang === 'en' ? 'Show ferry terminals' : 'フェリーを表示'}
                    aria-label={lang === 'en' ? 'Show ferry terminals' : 'フェリーを表示'}
                  >
                    <Ship size={16} />
                  </button>
                  <button
                    className={`locate-me-btn pin-toggle-btn icon-only ${showRoadsidePins ? 'active' : ''}`}
                    onClick={() => { setShowRoadsidePins((v) => !v); setShowAirportPins(false); setShowFerryPins(false); setPeekRoadsideId(null); setPeekAirportId(null); setPeekFerryId(null); }}
                    title={lang === 'en' ? 'Show roadside stations' : '道の駅を表示'}
                    aria-label={lang === 'en' ? 'Show roadside stations' : '道の駅を表示'}
                  >
                    {roadsideMapLoading ? <Clock size={16} /> : <Store size={16} />}
                  </button>
                  {myLocationStatus === 'error' && (
                    <span className="locate-me-error">
                      {lang === 'en' ? 'Could not get location' : '現在地を取得できませんでした'}
                    </span>
                  )}
                </div>
                <div className="map-zoom-group">
                  <button
                    className="zoom-btn"
                    onClick={() => setRegionZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))}
                    disabled={regionZoom >= 3}
                    title={lang === 'en' ? 'Zoom in' : '拡大'}
                  >+</button>
                  <span className="lang-toggle-sep">/</span>
                  <button
                    className="zoom-btn"
                    onClick={() => setRegionZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}
                    disabled={regionZoom <= 1}
                    title={lang === 'en' ? 'Zoom out' : '縮小'}
                  >−</button>
                </div>
                <div
                  className="map-pan-scroll"
                  ref={regionMapScrollRef}
                  onMouseDown={handlePanMouseDown}
                  onClick={() => { if (peekCityId) setPeekCityId(null); setPeekAirportId(null); setPeekFerryId(null); setPeekRoadsideId(null); }}
                  {...makePinchHandlers(setRegionZoom, regionMapContentRef, regionMapScrollRef)}
                >
                  <div ref={regionMapContentRef} className="map-pan-content kyushu-contain-fit" style={(() => {
                    let wPct = (prefFullViewBox.w / prefViewBox.w) * 100;
                    let hPct = (prefFullViewBox.h / prefViewBox.h) * 100;
                    if (regionMapSize && regionMapSize.w > 0 && regionMapSize.h > 0) {
                      const effectiveW = regionMapSize.w; // 地図はフレーム全面に表示(左右の要素は地図の上に重ねるだけ)
                      const effectiveH = regionMapSize.h; // 地図はヘッダー・フッターの裏まで全面表示(余白は拡大率側で調整)
                      const scaleW = effectiveW / prefSizingViewBox.w; // 本島基準の拡大率(離島の分は含めない)
                      const scaleH = effectiveH / prefSizingViewBox.h; // 本島基準の拡大率(離島の分は含めない)
                      const scale = Math.min(scaleW, scaleH) * 1.2; // 少しだけ大きめに表示する(端は多少見切れる)
                      wPct = (scale * prefFullViewBox.w / effectiveW) * 100;
                      hPct = (scale * prefFullViewBox.h / effectiveH) * 100;
                    }
                    return { width: `${wPct * regionZoom}%`, height: `${hPct * regionZoom}%` };
                  })()}>
                    <svg viewBox={`${prefFullViewBox.x} ${prefFullViewBox.y} ${prefFullViewBox.w} ${prefFullViewBox.h}`} className="map-svg-pan" aria-hidden="true">
                      {KYUSHU_PREFS.filter((p) => p.id !== selectedPrefId).map((p) => (
                        <path key={`neighbor-${p.id}`} d={p.d} className="neighbor-muni-outline" />
                      ))}
                      {prefOutlinePaths.map((d, i) => (
                        <path key={`land-${i}`} d={d} className="region-land-fill" />
                      ))}
                      {prefMunicipalities.filter((m) => STANDALONE_ISLAND_MUNI_IDS.has(m.id)).map((m) => (
                        <path key={`selffill-${m.id ?? m.name}`} d={m.d} className="region-land-fill" />
                      ))}
                      {prefMunicipalities.filter((m) => STANDALONE_ISLAND_MUNI_IDS.has(m.id)).map((m) => (
                        <path key={`selfoutline-${m.id ?? m.name}`} d={m.d} className="pref-outline" />
                      ))}
                      <g ref={muniGroupRef}>
                        {prefMunicipalities.map((m) => {
                          const mid = m.id ?? m.name;
                          const isPeeking = peekCityId === mid;
                          return (
                            <path
                              key={mid}
                              ref={(el) => { muniPathRefs.current[mid] = el; }}
                              d={m.d}
                              className={`muni-boundary ${isPeeking ? 'is-peeking' : ''}`}
                              onClick={(e) => { e.stopPropagation(); if (panDragRef.current.moved) { panDragRef.current.moved = false; return; } setPeekCityId(isPeeking ? null : mid); setPeekAirportId(null); setPeekFerryId(null); setPeekRoadsideId(null); }}
                            />
                          );
                        })}
                      </g>
                      {prefMunicipalities.map((m) => (
                        <path key={`ib-${m.id ?? m.name}`} d={m.d} className="internal-border" />
                      ))}
                      {prefOutlinePaths.map((d, i) => (
                        <path key={`outline-${i}`} d={d} className="pref-outline" />
                      ))}
                    </svg>

                    {(() => {
                      const m = prefMunicipalities.find((x) => (x.id ?? x.name) === peekCityId);
                      if (!m) return null;
                      const isActive = ACTIVE_CITY_IDS.includes(m.id ?? m.name);
                      return (
                        <div className="muni-peek" style={{ left: pct(m.cx - prefFullViewBox.x, prefFullViewBox.w) + '%', top: pct(m.cy - prefFullViewBox.y, prefFullViewBox.h) + '%' }}>
                          <span className="muni-peek-name" onClick={() => setPeekCityId(null)}>{mName(m)}</span>
                          {isActive ? (
                            <button
                              className="peek-detail-btn"
                              onClick={() => { setSelectedCity(m.id ?? m.name); setAppStage('muni'); setPeekCityId(null); }}
                            >
                              {lang === 'en' ? 'Select ›' : '選択する ›'}
                            </button>
                          ) : (
                            <span className="muni-soon-tag">{lang === 'en' ? 'Coming soon' : '準備中'}</span>
                          )}
                        </div>
                      );
                    })()}

                    {myLocationXY && (
                      <div
                        className="my-location-marker"
                        style={{ left: pct(myLocationXY.x - prefFullViewBox.x, prefFullViewBox.w) + '%', top: pct(myLocationXY.y - prefFullViewBox.y, prefFullViewBox.h) + '%' }}
                      >
                        <span className="my-location-dot" />
                        <span className="my-location-pulse" />
                      </div>
                    )}
                    {showAirportPins && clusterPins(
                      Object.entries(AIRPORTS)
                        .map(([id, a]) => { const svg = airportSvgPos(id, a); return { id, x: svg.x, y: svg.y, name: a.name, nameEn: a.nameEn }; })
                        .filter((p) => p.x >= prefFullViewBox.x && p.x <= prefFullViewBox.x + prefFullViewBox.w
                          && p.y >= prefFullViewBox.y && p.y <= prefFullViewBox.y + prefFullViewBox.h),
                      poiClusterCellSize
                    ).map((cluster) => {
                      const key = cluster.items.map((i) => i.id).join('|');
                      const isCluster = cluster.items.length > 1;
                      return (
                        <div
                          key={`airport-c-${key}`}
                          className="poi-pin airport-pin"
                          style={{ left: pct(cluster.x - prefFullViewBox.x, prefFullViewBox.w) + '%', top: pct(cluster.y - prefFullViewBox.y, prefFullViewBox.h) + '%' }}
                          onClick={(e) => { e.stopPropagation(); peekPoi('airport', key); }}
                        >
                          {isCluster ? (
                            <span className={`poi-pin-cluster poi-pin-icon-airport ${peekAirportId === key ? 'is-peeked' : ''}`}><Plane size={11} />{cluster.items.length}</span>
                          ) : (
                            <span className={`poi-pin-icon poi-pin-icon-airport ${peekAirportId === key ? 'is-peeked' : ''}`}><span className="poi-pin-icon-glyph"><Plane size={12} /></span></span>
                          )}
                          {peekAirportId === key && (
                            <span className="poi-pin-label">
                              {isCluster ? (
                                <span className="poi-pin-label-list">
                                  {cluster.items.map((i) => (
                                    <button key={i.id} className="poi-pin-label-row" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'airport', data: i }); setPeekAirportId(null); }}>
                                      {lang === 'en' ? i.nameEn : i.name}
                                    </button>
                                  ))}
                                </span>
                              ) : (
                                <>
                                  <span className="poi-pin-label-name">{lang === 'en' ? cluster.items[0].nameEn : cluster.items[0].name}</span>
                                  <button className="peek-detail-btn" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'airport', data: cluster.items[0] }); setPeekAirportId(null); }}>
                                    {lang === 'en' ? 'Select ›' : '選択する ›'}
                                  </button>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {showFerryPins && clusterPins(
                      Object.entries(FERRIES)
                        .map(([id, f]) => { const svg = geoToSvg(f.lat, f.lon); return { id, x: svg.x, y: svg.y, name: f.name, nameEn: f.nameEn }; })
                        .filter((p) => p.x >= prefFullViewBox.x && p.x <= prefFullViewBox.x + prefFullViewBox.w
                          && p.y >= prefFullViewBox.y && p.y <= prefFullViewBox.y + prefFullViewBox.h),
                      poiClusterCellSize
                    ).map((cluster) => {
                      const key = cluster.items.map((i) => i.id).join('|');
                      const isCluster = cluster.items.length > 1;
                      return (
                        <div
                          key={`ferry-c-${key}`}
                          className="poi-pin ferry-pin"
                          style={{ left: pct(cluster.x - prefFullViewBox.x, prefFullViewBox.w) + '%', top: pct(cluster.y - prefFullViewBox.y, prefFullViewBox.h) + '%' }}
                          onClick={(e) => { e.stopPropagation(); peekPoi('ferry', key); }}
                        >
                          {isCluster ? (
                            <span className={`poi-pin-cluster poi-pin-icon-ferry ${peekFerryId === key ? 'is-peeked' : ''}`}><Ship size={11} />{cluster.items.length}</span>
                          ) : (
                            <span className={`poi-pin-icon poi-pin-icon-ferry ${peekFerryId === key ? 'is-peeked' : ''}`}><span className="poi-pin-icon-glyph"><Ship size={12} /></span></span>
                          )}
                          {peekFerryId === key && (
                            <span className="poi-pin-label">
                              {isCluster ? (
                                <span className="poi-pin-label-list">
                                  {cluster.items.map((i) => (
                                    <button key={i.id} className="poi-pin-label-row" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'ferry', data: i }); setPeekFerryId(null); }}>
                                      {lang === 'en' ? i.nameEn : i.name}
                                    </button>
                                  ))}
                                </span>
                              ) : (
                                <>
                                  <span className="poi-pin-label-name">{lang === 'en' ? cluster.items[0].nameEn : cluster.items[0].name}</span>
                                  <button className="peek-detail-btn" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'ferry', data: cluster.items[0] }); setPeekFerryId(null); }}>
                                    {lang === 'en' ? 'Select ›' : '選択する ›'}
                                  </button>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {showRoadsidePins && clusterPins(
                      roadsideMapSpots.map((s) => ({ ...s })),
                      poiClusterCellSize
                    ).map((cluster) => {
                      const key = cluster.items.map((i) => i.id).join('|');
                      const isCluster = cluster.items.length > 1;
                      return (
                        <div
                          key={`roadside-c-${key}`}
                          className="poi-pin roadside-pin"
                          style={{ left: pct(cluster.x - prefFullViewBox.x, prefFullViewBox.w) + '%', top: pct(cluster.y - prefFullViewBox.y, prefFullViewBox.h) + '%' }}
                          onClick={(e) => { e.stopPropagation(); peekPoi('roadside', key); }}
                        >
                          {isCluster ? (
                            <span className={`poi-pin-cluster poi-pin-icon-roadside ${peekRoadsideId === key ? 'is-peeked' : ''}`}><Store size={11} />{cluster.items.length}</span>
                          ) : (
                            <span className={`poi-pin-icon poi-pin-icon-roadside ${peekRoadsideId === key ? 'is-peeked' : ''}`}><span className="poi-pin-icon-glyph"><Store size={12} /></span></span>
                          )}
                          {peekRoadsideId === key && (
                            <span className="poi-pin-label">
                              {isCluster ? (
                                <span className="poi-pin-label-list">
                                  {cluster.items.map((i) => (
                                    <button key={i.id} className="poi-pin-label-row" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'roadside', data: i }); setPeekRoadsideId(null); }}>
                                      {lang === 'en' ? (i.nameEn || i.name) : i.name}
                                    </button>
                                  ))}
                                </span>
                              ) : (
                                <>
                                  <span className="poi-pin-label-name">{lang === 'en' ? (cluster.items[0].nameEn || cluster.items[0].name) : cluster.items[0].name}</span>
                                  <button className="peek-detail-btn" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'roadside', data: cluster.items[0] }); setPeekRoadsideId(null); }}>
                                    {lang === 'en' ? 'Select ›' : '選択する ›'}
                                  </button>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {['40','41','42','43','44','45','46'].includes(selectedPrefId) && showAllCityNames && !peekCityId && (
                  <div className="muni-name-grid-overlay" onClick={(e) => e.stopPropagation()}>
                    <div className="muni-name-grid">
                      {prefMunicipalities.map((m) => {
                        const mid = m.id ?? m.name;
                        return (
                          <button
                            key={`dimname-${mid}`}
                            className="muni-name-grid-item"
                            onClick={() => setPeekCityId(mid)}
                          >
                            {mName(m)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>

          <button
            className="floating-back-btn floating-back-btn-icon kyushu-back-right"
            onClick={() => { setAppStage('kyushu'); setPeekIslandKey(null); }}
            title={lang === 'en' ? 'Back' : '戻る'}
            aria-label={lang === 'en' ? 'Back' : '戻る'}
          >
            <ChevronLeft size={20} />
          </button>

          <div className={`entry-footer-wrap entry-footer-float kyushu-footer-float ${showAllCityNames && !peekCityId ? 'kyushu-float-header-dimmed' : ''}`}>
            <div className="entry-footer-links">
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Terms of Service' : '利用規約'}</a>
              <span className="entry-footer-dot-sep">・</span>
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Privacy Policy' : 'プライバシーポリシー'}</a>
            </div>
          </div>
        </div>
        ) : (
        <div className="entry-view region-scroll nagasaki-sea-bg kyushu-page-view">
          <div className="entry-header">
            <div className="entry-header-row">
              <div className="entry-header-text">
                <button className="entry-title-btn" onClick={() => setAppStage('top')}>
                  <h1 className="entry-title">CONOTAVI</h1>
                </button>
                <p className="entry-catch">{lang === 'en' ? 'Make this trip something special.' : 'この旅を、もっと特別に。'}</p>
              </div>
              <div className="entry-lang-toggle">
                <button className={lang === 'ja' ? 'lang-toggle-opt active' : 'lang-toggle-opt'} onClick={() => setLang('ja')}>JP</button>
                <span className="lang-toggle-sep">/</span>
                <button className={lang === 'en' ? 'lang-toggle-opt active' : 'lang-toggle-opt'} onClick={() => setLang('en')}>EN</button>
              </div>
            </div>
          </div>

          <svg className="entry-wave" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,0 L400,0 L400,24 Q200,-16 0,24 Z" fill="#fff" />
          </svg>

          <div className="entry-prompt-spacer" />

          <div className="region-body">
          <div className="mode-switch" role="group" aria-label={lang === 'en' ? 'Switch display mode' : '地域の表示方法を切り替え'}>
            <button className={regionMode === 'map' ? 'active' : ''} onClick={() => { setRegionMode('map'); setPeekCityId(null); setPeekIslandKey(null); }}>
              <MapIcon size={14} /> {lang === 'en' ? 'By Area' : '地域で探す'}
            </button>
            <button onClick={() => { setAppStage('purpose'); setPurposeCategory(null); setPurposePrefId(null); }}>
              <Compass size={14} /> {lang === 'en' ? 'By Purpose' : '目的で探す'}
            </button>
            <button disabled title={lang === 'en' ? 'Coming soon' : '準備中'}>
              <Compass size={14} /> NO PLAN
            </button>
          </div>

            <div className="muni-card-grid">
              {prefMunicipalities.map((m) => {
                const mid = m.id ?? m.name;
                const isActive = ACTIVE_CITY_IDS.includes(mid);
                return (
                  <button
                    key={mid}
                    className={`muni-card ${isActive ? 'is-active' : 'is-soon'}`}
                    disabled={!isActive}
                    onClick={() => { if (isActive) { setSelectedCity(mid); setAppStage('muni'); } }}
                  >
                    <span className="muni-card-name">{mName(m)}</span>
                    <span className={`muni-card-tag ${isActive ? 'active' : ''}`}>{isActive ? (lang === 'en' ? 'Available' : '体験可能') : (lang === 'en' ? 'Coming soon' : '準備中')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <svg className="entry-wave entry-wave-bottom" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,0 L400,0 L400,24 Q200,-16 0,24 Z" fill="#fff" />
          </svg>
          <div className="entry-footer-wrap">
            <div className="entry-footer-links">
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Terms of Service' : '利用規約'}</a>
              <span className="entry-footer-dot-sep">・</span>
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Privacy Policy' : 'プライバシーポリシー'}</a>
            </div>
          </div>

          <button
            className="floating-back-btn"
            onClick={() => { setAppStage('kyushu'); setPeekIslandKey(null); }}
          >
            {lang === 'en' ? '← Back' : '← 戻る'}
          </button>
        </div>
        )
        );
      })()}

      {appStage === 'muni' && (() => {
        const cityMap = NAGASAKI_CITY_MAPS[selectedCity];
        const cityName = cityMap ? (lang === 'en' ? cityMap.nameEn : cityMap.name) : selectedCity;
        const isIsahaya = ACTIVE_CITY_IDS.includes(selectedCity);
        const categoryTabs = (
          <nav className="tabs" aria-label={lang === 'en' ? 'Category selection' : 'カテゴリ選択'}>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const isOther = key === 'roadside';
              return (
                <button
                  key={key}
                  className={`tab ${activeCategory === key && selectMode !== 'candidates' && selectMode !== 'decided' ? 'tab-active' : ''}`}
                  onClick={() => {
                    if (isOther) {
                      setShowOtherMenu(true);
                      return;
                    }
                    setActiveCategory(key);
                    setLinkedId(null);
                    if (selectMode === 'candidates' || selectMode === 'decided') {
                      setSelectMode(lastBrowseMode);
                    }
                  }}
                  aria-haspopup={isOther ? 'dialog' : undefined}
                  aria-pressed={!isOther && activeCategory === key && selectMode !== 'candidates' && selectMode !== 'decided'}
                >
                  <Icon size={16} />
                  {isOther ? (lang === 'en' ? 'Other' : 'その他') : catLabel(meta)}
                </button>
              );
            })}
          </nav>
        );
        const isMapFull = isIsahaya && view === 'select' && selectMode === 'map';
        const muniCrop = activeCityConfig.crop;
        let muniMapBox = { x: muniCrop.x, y: muniCrop.y, w: activeCityConfig.viewW, h: activeCityConfig.viewH };
        if (muniMapSize && muniMapSize.w > 0 && muniMapSize.h > 0) {
          const containerAspect = muniMapSize.w / muniMapSize.h;
          const viewAspect = activeCityConfig.viewW / activeCityConfig.viewH;
          const ccx = muniCrop.x + activeCityConfig.viewW / 2;
          const ccy = muniCrop.y + activeCityConfig.viewH / 2;
          if (containerAspect > viewAspect) {
            // 画面の方が横長 → 横方向にビューボックスを広げて画面いっぱいに(縦は変更しない)
            const w2 = containerAspect * activeCityConfig.viewH;
            muniMapBox = { x: ccx - w2 / 2, y: muniCrop.y, w: w2, h: activeCityConfig.viewH };
          } else {
            // 画面の方が縦長 → 縦方向にビューボックスを広げて画面いっぱいに(横は変更しない)
            const h2 = activeCityConfig.viewW / containerAspect;
            muniMapBox = { x: muniCrop.x, y: ccy - h2 / 2, w: activeCityConfig.viewW, h: h2 };
          }
        }
        return (
          <div className={`entry-view region-scroll ${isIsahaya ? activeCityConfig.seaBgClass : ''} ${isIsahaya && view === 'select' ? 'has-bottom-toolbar' : ''} ${isMapFull ? 'muni-map-fullscreen kyushu-topbar-view kyushu-icons-consolidated' : ''}`}>
            {isMapFull ? (
              <div className="kyushu-float-header">
                <button className="entry-title-btn kyushu-float-title-btn" onClick={() => setAppStage('top')}>
                  <h1 className="kyushu-float-title">CONOTAVI</h1>
                </button>
                <div className="entry-lang-toggle kyushu-float-lang">
                  <button className={lang === 'ja' ? 'lang-toggle-opt active' : 'lang-toggle-opt'} onClick={() => setLang('ja')}>JP</button>
                  <span className="lang-toggle-sep">/</span>
                  <button className={lang === 'en' ? 'lang-toggle-opt active' : 'lang-toggle-opt'} onClick={() => setLang('en')}>EN</button>
                </div>
              </div>
            ) : (
            <>
            <div className="entry-header">
              <div className="entry-header-row">
                <div className="entry-header-text">
                  <button className="entry-title-btn" onClick={() => setAppStage('top')}>
                    <h1 className="entry-title">CONOTAVI</h1>
                  </button>
                  <p className="entry-catch">{lang === 'en' ? 'Make this trip something special.' : 'この旅を、もっと特別に。'}</p>
                </div>
                <div className="entry-lang-toggle">
                  <button className={lang === 'ja' ? 'lang-toggle-opt active' : 'lang-toggle-opt'} onClick={() => setLang('ja')}>JP</button>
                  <span className="lang-toggle-sep">/</span>
                  <button className={lang === 'en' ? 'lang-toggle-opt active' : 'lang-toggle-opt'} onClick={() => setLang('en')}>EN</button>
                </div>
              </div>
            </div>

            <svg className="entry-wave" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,0 L400,0 L400,24 Q200,-16 0,24 Z" fill="#fff" />
            </svg>

            <div className="entry-prompt-spacer" />

            <div className="region-body">
              {cityMap && !isIsahaya ? (
                <div className="region-map-frame" style={{ aspectRatio: `${cityMap.viewW} / ${cityMap.viewH}` }}>
                  <span className="map-location-label">{lang === 'en' ? cityMap.nameEn : cityMap.name}</span>
                  <svg viewBox={`0 0 ${cityMap.viewW} ${cityMap.viewH}`} className="map-svg" aria-hidden="true">
                    <path d={cityMap.d} className="muni-shape" fill="#EDEEEC" stroke="#9AA0A6" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : null}

              {!isIsahaya && (
                <div style={{ marginTop: '18px' }}>
                  <div className="muni-card is-soon" style={{ width: '100%' }}>
                    <span className="muni-card-name">{lang === 'en' ? `Spots in ${cityName}` : `${cityName}のスポット`}</span>
                    <span className="muni-card-tag">{lang === 'en' ? 'Coming soon' : '準備中'}</span>
                  </div>
                </div>
              )}
            </div>
            </>
            )}

            {isIsahaya && (
            <>
      {view === 'select' && !isMapFull && (
        <div className="mode-switch-wrap">
          <div className="mode-switch" role="group" aria-label={lang === 'en' ? 'Switch display mode' : '表示方法を切り替え'}>
            <button className={selectMode === 'map' ? 'active' : ''} onClick={() => { setSelectMode('map'); setLastBrowseMode('map'); setLinkedId(null); }}>
              <MapIcon size={14} /> {lang === 'en' ? 'By Area' : '地域で探す'}
            </button>
            <button onClick={() => { setAppStage('purpose'); setPurposeCategory(null); setPurposePrefId(null); }}>
              <Compass size={14} /> {lang === 'en' ? 'By Purpose' : '目的で探す'}
            </button>
            <button disabled title={lang === 'en' ? 'Coming soon' : '準備中'}>
              <Compass size={14} /> NO PLAN
            </button>
          </div>
        </div>
      )}

      {view === 'select' && selectMode !== 'map' && (
      <header className="header">
        {categoryTabs}
      </header>
      )}

      {view === 'select' && (
        <main className="select-view">
          {selectMode === 'map' ? (
            <>
              <div className="map-scroll muni-fullmap-scroll">
                <div className="map-frame-wrap muni-fullmap-frame-wrap">
                  <div className="tabs-on-frame muni-float-category-tabs">{categoryTabs}</div>
                <div
                  className="map-frame muni-fullmap-frame"
                  ref={muniMapFrameRef}
                  onClick={() => { setPeekAirportId(null); setPeekFerryId(null); }}
                >
                  <span className="map-location-label">
                    <span>{(() => { const ap = KYUSHU_PREFS.find((x) => x.id === activeCityConfig.prefId); return ap ? mName(ap) : ''; })()}</span>
                    <span className="lang-toggle-sep">/</span>
                    <span>{lang === 'en' ? activeCityConfig.nameEn : activeCityConfig.name}</span>
                  </span>
                  <div className="map-toggle-group">
                    <button
                      className="locate-me-btn icon-only active"
                      onClick={() => { setSelectMode('map'); setLastBrowseMode('map'); setLinkedId(null); }}
                      title={lang === 'en' ? 'By Area' : '地域で探す'}
                      aria-label={lang === 'en' ? 'By Area' : '地域で探す'}
                    >
                      <MapIcon size={16} />
                    </button>
                    <button
                      className="locate-me-btn icon-only"
                      onClick={() => { setAppStage('purpose'); setPurposeCategory(null); setPurposePrefId(null); }}
                      title={lang === 'en' ? 'By Purpose' : '目的で探す'}
                      aria-label={lang === 'en' ? 'By Purpose' : '目的で探す'}
                    >
                      <Compass size={16} />
                    </button>
                    <button className="locate-me-btn icon-only" disabled title={lang === 'en' ? 'NO PLAN (Coming soon)' : 'NO PLAN(準備中)'} aria-label="NO PLAN">
                      <X size={16} />
                    </button>
                    <div className="map-toggle-divider" />
                    <button
                      className={`locate-me-btn pin-toggle-btn icon-only ${showAirportPins ? 'active' : ''}`}
                      onClick={() => { setShowAirportPins((v) => !v); setShowFerryPins(false); setPeekAirportId(null); setPeekFerryId(null); }}
                      title={lang === 'en' ? 'Show airports' : '空港を表示'}
                      aria-label={lang === 'en' ? 'Show airports' : '空港を表示'}
                    >
                      <Plane size={16} />
                    </button>
                    <button
                      className={`locate-me-btn pin-toggle-btn icon-only ${showFerryPins ? 'active' : ''}`}
                      onClick={() => { setShowFerryPins((v) => !v); setShowAirportPins(false); setPeekFerryId(null); setPeekAirportId(null); }}
                      title={lang === 'en' ? 'Show ferry terminals' : 'フェリーを表示'}
                      aria-label={lang === 'en' ? 'Show ferry terminals' : 'フェリーを表示'}
                    >
                      <Ship size={16} />
                    </button>
                  </div>
                  <svg viewBox={`${muniMapBox.x} ${muniMapBox.y} ${muniMapBox.w} ${muniMapBox.h}`} className="map-svg" aria-hidden="true">
                    {KYUSHU_MUNICIPALITIES.filter((m) => {
                      if (m.id === selectedCity) return false;
                      const margin = Math.max(muniMapBox.w, muniMapBox.h) * 0.75; // 隣接県の市町村も入る程度の余裕
                      return m.cx > muniMapBox.x - margin && m.cx < muniMapBox.x + muniMapBox.w + margin && m.cy > muniMapBox.y - margin && m.cy < muniMapBox.y + muniMapBox.h + margin;
                    }).map((n) => (
                      <path key={n.id} d={n.d} className="neighbor-muni-outline" />
                    ))}
                    <path
                      d={(KYUSHU_MUNICIPALITIES.find((m) => m.id === selectedCity) || {}).d}
                      className="city-outline"
                    />
                  </svg>

                  {visibleSpots.map((spot) => {
                    const meta = CATEGORY_META[spot.category];
                    const Icon = meta.icon;
                    const state = decided.includes(spot.id) ? 'decided' : candidates.includes(spot.id) ? 'candidate' : 'default';
                    const overBudget = wouldExceedBudget(spot);
                    const isLinked = linkedId === spot.id;
                    return (
                      <button
                        key={spot.id}
                        className={`spot-pin ${state === 'decided' ? 'is-decided' : state === 'candidate' ? 'is-candidate' : ''} ${overBudget ? 'is-over-budget' : ''} ${isLinked ? 'is-linked' : ''}`}
                        style={{ left: pct(spot.x - muniMapBox.x, muniMapBox.w) + '%', top: pct(spot.y - muniMapBox.y, muniMapBox.h) + '%', '--cat-color': meta.color, '--cat-tint': meta.tint }}
                        onClick={() => handleSpotTap(spot.id)}
                        aria-label={sName(spot)}
                      >
                        <span className="spot-pin-icon">
                          {state === 'decided' ? <Check size={12} /> : <Icon size={12} />}
                        </span>
                      </button>
                    );
                  })}

                  {linkedId && myLocation && travelFromMe && (() => {
                    const spot = SPOTS.find((s) => s.id === linkedId);
                    if (!spot) return null;
                    return (
                      <div
                        className="pin-travel-bubble"
                        style={{ left: pct(spot.x - muniMapBox.x, muniMapBox.w) + '%', top: pct(spot.y - muniMapBox.y, muniMapBox.h) + '%' }}
                      >
                        <span className="pin-travel-bubble-name">{sName(spot)}</span>
                        <span className="pin-travel-bubble-time"><Car size={12} /> {lang === 'en' ? `~${travelFromMe.car} min` : `約${travelFromMe.car}分`}</span>
                      </div>
                    );
                  })()}

                  {myLocation && (
                    <div
                      className="my-location-marker"
                      style={{ left: pct(myLocation.x - muniMapBox.x, muniMapBox.w) + '%', top: pct(myLocation.y - muniMapBox.y, muniMapBox.h) + '%' }}
                      aria-label={lang === 'en' ? 'Your current location' : '現在地'}
                    >
                      <span className="my-location-pulse" />
                      <span className="my-location-dot" />
                    </div>
                  )}

                  {showAirportPins && Object.entries(AIRPORTS).map(([id, a]) => {
                    const svg = airportSvgPos(id, a);
                    if (svg.x < muniMapBox.x || svg.x > muniMapBox.x + muniMapBox.w || svg.y < muniMapBox.y || svg.y > muniMapBox.y + muniMapBox.h) return null;
                    return (
                      <div
                        key={`airport-${id}`}
                        className="poi-pin airport-pin"
                        style={{ left: pct(svg.x - muniMapBox.x, muniMapBox.w) + '%', top: pct(svg.y - muniMapBox.y, muniMapBox.h) + '%' }}
                        onClick={(e) => { e.stopPropagation(); peekPoi('airport', id); }}
                      >
                        <span className={`poi-pin-icon poi-pin-icon-airport ${peekAirportId === id ? 'is-peeked' : ''}`}><span className="poi-pin-icon-glyph"><Plane size={12} /></span></span>
                        {peekAirportId === id && (
                          <span className="poi-pin-label">
                            <span className="poi-pin-label-name">{lang === 'en' ? a.nameEn : a.name}</span>
                            <button className="peek-detail-btn" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'airport', data: a }); setPeekAirportId(null); }}>
                              {lang === 'en' ? 'Select ›' : '選択する ›'}
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {showFerryPins && Object.entries(FERRIES).map(([id, f]) => {
                    const svg = geoToSvg(f.lat, f.lon);
                    if (svg.x < muniMapBox.x || svg.x > muniMapBox.x + muniMapBox.w || svg.y < muniMapBox.y || svg.y > muniMapBox.y + muniMapBox.h) return null;
                    return (
                      <div
                        key={`ferry-${id}`}
                        className="poi-pin ferry-pin"
                        style={{ left: pct(svg.x - muniMapBox.x, muniMapBox.w) + '%', top: pct(svg.y - muniMapBox.y, muniMapBox.h) + '%' }}
                        onClick={(e) => { e.stopPropagation(); peekPoi('ferry', id); }}
                      >
                        <span className={`poi-pin-icon poi-pin-icon-ferry ${peekFerryId === id ? 'is-peeked' : ''}`}><span className="poi-pin-icon-glyph"><Ship size={12} /></span></span>
                        {peekFerryId === id && (
                          <span className="poi-pin-label">
                            <span className="poi-pin-label-name">{lang === 'en' ? f.nameEn : f.name}</span>
                            <button className="peek-detail-btn" onClick={(e) => { e.stopPropagation(); setPoiDetail({ type: 'ferry', data: f }); setPeekFerryId(null); }}>
                              {lang === 'en' ? 'Select ›' : '選択する ›'}
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {calculating && (
                    <div className="calc-overlay">
                      <div className="spinner" />
                      <p>{lang === 'en' ? 'Calculating the shortest route...' : '最短ルートを計算中...'}</p>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </>
          ) : selectMode === 'card' ? (
            <div className="card-grid">
              {visibleSpots.map(renderSpotCard)}
            </div>
          ) : selectMode === 'candidates' ? (
            <div className="card-grid">
              {candidates.length === 0 ? (
                <p className="empty-page-hint">
                  {lang === 'en' ? 'No saved spots yet. Tap the star on any spot to save it here.' : 'まだ候補がありません。スポットの★ボタンで候補に追加できます。'}
                </p>
              ) : (
                candidates.map((id) => SPOTS.find((s) => s.id === id)).filter(Boolean).map(renderSpotCard)
              )}
            </div>
          ) : (
            <div className="card-grid">
              {decided.length === 0 ? (
                <p className="empty-page-hint">
                  {lang === 'en' ? 'No picked spots yet. Tap the check on any spot to pick it.' : 'まだ決定がありません。スポットの✓ボタンで決定に追加できます。'}
                </p>
              ) : (
                decided.map((id) => SPOTS.find((s) => s.id === id)).filter(Boolean).map(renderSpotCard)
              )}
            </div>
          )}

        </main>
      )}

      {view === 'select' && (
        <div className="bottom-toolbar">
          <button className="bottom-toolbar-btn bottom-toolbar-btn-primary" disabled={!canCreateRoute || calculating} onClick={buildRoute}>
            <Route size={16} />
            {lang === 'en' ? 'Create route' : 'ルート検索'}
          </button>
        </div>
      )}

      {view === 'route' && plan && (
        <main className="route-view">
          <div className="route-actions">
            <button className={`route-action-btn ${routeViewMode === 'timeline' ? 'active' : ''}`} onClick={() => { setRouteViewMode('timeline'); setLinkedId(null); }}>
              <LayoutGrid size={14} /> {lang === 'en' ? 'Timeline' : 'タイムライン'}
            </button>
            <button className={`route-action-btn ${routeViewMode === 'map' ? 'active' : ''}`} onClick={() => setRouteViewMode('map')}>
              <MapIcon size={14} /> {lang === 'en' ? 'Route map' : 'ルートマップ'}
            </button>
            <button className="route-action-btn" onClick={() => { loadSavedPlansFromStorage(); setShowSaveDialog(true); }}>
              <Save size={14} /> {lang === 'en' ? 'Save' : '保存'}
            </button>
            <button className="route-action-btn" onClick={shareCurrentPlan}>
              <Share2 size={14} /> {lang === 'en' ? 'Share' : '共有'}
            </button>
          </div>

          {routeViewMode === 'navi' && (
            <div className="navi-view">
              <a className="navi-combined-btn" href={naviCombinedUrl} target="_blank" rel="noopener noreferrer">
                <Navigation size={15} /> {lang === 'en' ? 'Open full route in Google Maps (car)' : '全ルートをGoogleマップで開く(車)'}
              </a>
              <p className="navi-note">
                {lang === 'en'
                  ? 'If each leg uses a different mode of transport, start navigation separately using the buttons below.'
                  : '区間ごとに移動手段が異なる場合は、下の各区間のボタンからそれぞれナビを開始してください。'}
              </p>
              <div className="navi-legs">
                {naviLegs.map((leg, i) => {
                  const LegIcon = MODE_ICON[leg.mode];
                  return (
                    <div key={i} className="navi-leg-card">
                      <div className="navi-leg-route">
                        <span>{leg.fromLabel}</span>
                        <span className="navi-leg-arrow">↓</span>
                        <span>{leg.toLabel}</span>
                      </div>
                      <div className="navi-leg-meta">
                        <LegIcon size={13} /> {modeLabel(leg.mode)} ・ {leg.distanceKm}km
                      </div>
                      <a className="navi-leg-btn" href={gmapsUrl(leg.originQuery, leg.destinationQuery, leg.mode)} target="_blank" rel="noopener noreferrer">
                        <Navigation size={13} /> {lang === 'en' ? 'Start navigation for this leg' : 'この区間のナビを開始'}
                      </a>
                    </div>
                  );
                })}
              </div>
              <p className="disclaimer">
                {lang === 'en'
                  ? 'Opens the Google Maps app or website. You can change each leg\u2019s mode of transport from the timeline view.'
                  : '※Googleマップアプリ/サイトが開きます。区間ごとの移動手段はタイムライン画面で変更できます。'}
              </p>
            </div>
          )}

          {routeViewMode === 'map' && (
            <>
              <div className="route-map-toolbar">
                <button className={`detour-toggle ${detourMode ? 'active' : ''}`} onClick={() => { setDetourMode((v) => !v); setLinkedId(null); }}>
                  <Compass size={14} /> {lang === 'en' ? 'Detour mode' : '寄り道モード'}{detourMode ? ' ON' : ''}
                </button>
                <button className="recalc-btn" onClick={buildRoute}>
                  <RotateCcw size={13} /> {lang === 'en' ? 'Recalculate route' : 'ルートを再計算'}
                </button>
              </div>
              {detourMode && (
                <div className="detour-filter" role="group" aria-label={lang === 'en' ? 'Filter detours by category' : '寄り道カテゴリで絞り込み'}>
                  <button className={detourCategory === 'all' ? 'active' : ''} onClick={() => { setDetourCategory('all'); setLinkedId(null); }}>
                    {lang === 'en' ? 'All' : 'すべて'}
                  </button>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <button
                      key={key}
                      className={detourCategory === key ? 'active' : ''}
                      style={{ '--cat-color': meta.color }}
                      onClick={() => { setDetourCategory(key); setLinkedId(null); }}
                    >
                      {catLabel(meta)}
                    </button>
                  ))}
                </div>
              )}
              <div className="map-scroll">
                <div className="map-frame" style={{ aspectRatio: `${activeCityConfig.viewW} / ${activeCityConfig.viewH}` }}>
                  <svg viewBox={`${activeCityConfig.crop.x} ${activeCityConfig.crop.y} ${activeCityConfig.viewW} ${activeCityConfig.viewH}`} className="map-svg" aria-hidden="true">
                    <path
                      d={(KYUSHU_MUNICIPALITIES.find((m) => m.id === selectedCity) || {}).d}
                      className="city-outline"
                    />
                    <polyline points={routePolylinePoints} className="route-path-line" />
                  </svg>

                  {originIsMyLocation ? (
                    <div className="my-location-marker" style={{ left: pct(effectiveOrigin.x - activeCityConfig.crop.x, activeCityConfig.viewW) + '%', top: pct(effectiveOrigin.y - activeCityConfig.crop.y, activeCityConfig.viewH) + '%' }} aria-label={lang === 'en' ? 'Your current location' : '現在地'}>
                      <span className="my-location-pulse" />
                      <span className="my-location-dot" />
                    </div>
                  ) : (
                    <div className="route-airport-marker" style={{ left: pct(effectiveOrigin.x - activeCityConfig.crop.x, activeCityConfig.viewW) + '%', top: pct(effectiveOrigin.y - activeCityConfig.crop.y, activeCityConfig.viewH) + '%' }}>
                      <Flag size={13} />
                    </div>
                  )}

                  {detourMode && nearbySpots.map((spot) => {
                    const meta = CATEGORY_META[spot.category];
                    const Icon = meta.icon;
                    const state = decided.includes(spot.id) ? 'decided' : candidates.includes(spot.id) ? 'candidate' : 'default';
                    const isLinked = linkedId === spot.id;
                    return (
                      <button
                        key={spot.id}
                        className={`spot-pin ${state === 'decided' ? 'is-decided' : state === 'candidate' ? 'is-candidate' : ''} ${isLinked ? 'is-linked' : ''}`}
                        style={{ left: pct(spot.x - activeCityConfig.crop.x, activeCityConfig.viewW) + '%', top: pct(spot.y - activeCityConfig.crop.y, activeCityConfig.viewH) + '%', '--cat-color': meta.color, '--cat-tint': meta.tint }}
                        onClick={() => handleSpotTap(spot.id)}
                        aria-label={sName(spot)}
                      >
                        <span className="spot-pin-icon">
                          {state === 'decided' ? <Check size={12} /> : <Icon size={12} />}
                        </span>
                      </button>
                    );
                  })}

                  {detourMode && linkedId && myLocation && travelFromMe && (() => {
                    const spot = nearbySpots.find((s) => s.id === linkedId);
                    if (!spot) return null;
                    return (
                      <div
                        className="pin-travel-bubble"
                        style={{ left: pct(spot.x - activeCityConfig.crop.x, activeCityConfig.viewW) + '%', top: pct(spot.y - activeCityConfig.crop.y, activeCityConfig.viewH) + '%' }}
                      >
                        <span className="pin-travel-bubble-name">{sName(spot)}</span>
                        <span className="pin-travel-bubble-time"><Car size={12} /> {lang === 'en' ? `~${travelFromMe.car} min` : `約${travelFromMe.car}分`}</span>
                      </div>
                    );
                  })()}

                  {routeStops.map((spot, i) => {
                    const meta = CATEGORY_META[spot.category];
                    const isHotelStop = spot.category === 'lodging';
                    return (
                      <button
                        key={spot.id}
                        className={`route-stop-marker ${isHotelStop ? 'is-hotel' : ''}`}
                        style={{ left: pct(spot.x - activeCityConfig.crop.x, activeCityConfig.viewW) + '%', top: pct(spot.y - activeCityConfig.crop.y, activeCityConfig.viewH) + '%', '--cat-color': meta.color }}
                        onClick={() => setSelectedId(spot.id)}
                        aria-label={sName(spot)}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              {detourMode && (
                nearbySpots.length > 0 ? (
                  <div className="spot-index-grid detour-index-grid">
                    {nearbySpots.map((spot) => {
                      const meta = CATEGORY_META[spot.category];
                      const Icon = meta.icon;
                      const state = decided.includes(spot.id) ? 'decided' : candidates.includes(spot.id) ? 'candidate' : 'default';
                      const isLinked = linkedId === spot.id;
                      return (
                        <button
                          key={spot.id}
                          className={`spot-index-item ${state === 'decided' ? 'is-decided' : state === 'candidate' ? 'is-candidate' : ''} ${isLinked ? 'is-linked' : ''}`}
                          style={{ '--cat-color': meta.color, '--cat-tint': meta.tint }}
                          onClick={() => handleSpotTap(spot.id)}
                        >
                          <span className="spot-index-num">{state === 'decided' ? <Check size={11} /> : <Icon size={11} />}</span>
                          <span className="spot-index-name">{sName(spot)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="detour-empty-note">
                    {lang === 'en' ? 'No detour suggestions near your route.' : 'ルート付近に寄り道できるスポットが見つかりませんでした。'}
                  </p>
                )
              )}
              <p className="route-map-caption">
                {lang === 'en'
                  ? 'The dotted line connects stops in visiting order. Numbers show the order; pins below the map are detour-mode suggestions.'
                  : '点線は訪問順をつないだ簡易ルートです。番号は訪れる順番、地図下の一覧は寄り道モードのおすすめスポットです。'}
              </p>
            </>
          )}
          {routeViewMode === 'timeline' && (
          <div className="timeline">
            {plan.map((item, idx) => {
              if (item.type === 'travel') {
                const legIndex = (idx - 1) / 2;
                const ActiveIcon = MODE_ICON[item.mode];
                return (
                  <div key={idx} className="t-row t-row-travel" style={{ '--mode-color': MODE_COLOR[item.mode] }}>
                    <div className="t-node-col">
                      <span className="t-mode-badge"><ActiveIcon size={13} /></span>
                    </div>
                    <div className="t-content-col">
                      <div className="travel-info">
                        <span className="travel-label">
                          {modeLabel(item.mode)} ・ {lang === 'en' ? `approx. ${item.minutes} min` : `約${item.minutes}分`} ・ {item.distance}km
                        </span>
                        <div className="mode-toggle" role="group" aria-label={lang === 'en' ? 'Choose transport mode' : '移動手段を選択'}>
                          {['walk', 'bus', 'taxi'].map((m) => {
                            const MIcon = MODE_ICON[m];
                            return (
                              <button
                                key={m}
                                className={`mode-btn ${item.mode === m ? 'mode-active' : ''}`}
                                onClick={() => updateLegMode(legIndex, m)}
                                aria-label={modeLabel(m)}
                                title={modeLabel(m)}
                                aria-pressed={item.mode === m}
                              >
                                <MIcon size={15} />
                              </button>
                            );
                          })}
                          <span className="mode-toggle-divider" />
                          <button
                            className="mode-btn"
                            aria-label="ナビ"
                            title="ナビ"
                            onClick={() => {
                              const leg = naviLegs[legIndex];
                              if (!leg) return;
                              const ok = window.confirm(
                                lang === 'en' ? 'Start navigation for this leg?' : 'この区間のナビを開始しますか？'
                              );
                              if (ok) {
                                window.open(gmapsUrl(leg.originQuery, leg.destinationQuery, leg.mode), '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <Compass size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              const isStart = item.type === 'start';
              const isEnd = item.type === 'end';
              const isStop = !isStart && !isEnd;
              const dotColor = isStart ? '#9AA0A6' : isEnd ? CATEGORY_META.lodging.color : CATEGORY_META[item.category].color;
              const StopIcon = isStart ? Navigation : isEnd ? CATEGORY_META.lodging.icon : CATEGORY_META[item.category].icon;
              const timeInline = isStart
                ? (lang === 'en' ? `Depart ${item.time}` : `${item.time} 出発`)
                : isEnd
                  ? (lang === 'en' ? `Arrive ${item.arrive}` : `${item.arrive} 到着`)
                  : (lang === 'en' ? `Arrive ${item.arrive}` : `${item.arrive} 着`);
              const isDestination = isStop || isEnd;
              const destSpot = isDestination ? SPOTS.find((s) => s.id === item.spotId) : null;
              const destIsReserved = isDestination && reserved.includes(item.spotId);
              return (
                <div
                  key={idx}
                  className={`t-row t-row-stop ${isDestination ? 'clickable' : ''}`}
                  onClick={isDestination ? () => setSelectedId(item.spotId) : undefined}
                >
                  <div className="t-node-col">
                    <span className="t-node" style={{ background: dotColor }}><StopIcon size={15} /></span>
                  </div>
                  <div className="t-content-col">
                    <span className="stop-name">{item.label}</span>
                    <div className="t-time-row">
                      <span className="t-time-inline">{timeInline}</span>
                      {isStop && (
                        <span className="stop-stay-badge">{lang === 'en' ? `Stay ${item.stay} min` : `滞在${item.stay}分`}</span>
                      )}
                    </div>
                  </div>
                  {isDestination && (
                    <div className="t-card-actions">
                      {destSpot && needsReservation(destSpot) && (
                        <button
                          className={`t-card-action-btn ${destIsReserved ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleReserved(item.spotId); }}
                        >
                          <Calendar size={12} /> {destIsReserved ? (lang === 'en' ? 'Reserved' : '予約済み') : (lang === 'en' ? 'Reserve' : '予約')}
                        </button>
                      )}
                      <button
                        className="t-card-action-btn t-card-action-btn-confirm"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(item.spotId); }}
                      >
                        <ChevronRight size={12} /> {lang === 'en' ? 'Details' : '確認'}
                      </button>
                    </div>
                  )}
                  {isStart && (
                    <div className="start-actions">
                        <button
                          className="locate-btn"
                          onClick={(e) => { e.stopPropagation(); locateMe({ useAsRouteOrigin: true }); }}
                          disabled={locating}
                        >
                          <Navigation size={13} />
                          {locating
                            ? (lang === 'en' ? 'Locating…' : '取得中…')
                            : originIsMyLocation
                              ? (lang === 'en' ? 'Update my location' : '現在地を更新')
                              : (lang === 'en' ? 'Start from my location' : '現在地から出発する')}
                        </button>
                        {activeFerrySvg && !originIsFerry && (
                          <button
                            className="locate-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRouteOrigin('ferry');
                              setCustomOriginName('');
                              const { stops, distances, modes } = computeRouteFrom(activeFerrySvg);
                              setRouteStops(stops);
                              setLegDistances(distances);
                              setLegModes(modes);
                            }}
                          >
                            <Navigation size={13} />
                            {lang === 'en' ? `Start from ${activeFerry.nameEn}` : `${activeFerry.name}から出発する`}
                          </button>
                        )}
                        {(originIsMyLocation || originIsCustom || originIsFerry) && (
                          <button
                            className="locate-origin-reset"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRouteOrigin('airport');
                              setCustomOriginName('');
                              const { stops, distances, modes } = computeRouteFrom(activeAirportSvg);
                              setRouteStops(stops);
                              setLegDistances(distances);
                              setLegModes(modes);
                            }}
                          >
                            {lang === 'en' ? 'Back to airport departure' : '空港出発に戻す'}
                          </button>
                        )}
                        {locationError && <p className="locate-error">{locationError}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
          <p className="disclaimer">
            {lang === 'en' ? 'Locations, routes, and times shown are estimates.' : '※表示される地点・経路・所要時間は目安です'}
          </p>
        </main>
      )}

      {selectedSpot && (
        <div className="overlay-backdrop detail-backdrop" onClick={() => { setSelectedId(null); setLinkedId(null); }}>
          <div className="detail-card" onClick={(e) => e.stopPropagation()} style={{ '--cat-color': CATEGORY_META[selectedSpot.category].color, '--cat-tint': CATEGORY_META[selectedSpot.category].tint }}>

            <div className={`detail-hero ${selectedSpot.image ? 'has-image' : ''}`} style={{ background: selectedSpot.image ? 'none' : 'var(--cat-tint)' }}>
              {selectedSpot.image ? (
                <img src={selectedSpot.image} alt={sName(selectedSpot)} className="detail-hero-img" loading="eager" decoding="async" />
              ) : (
                (() => {
                  const HeroIcon = CATEGORY_META[selectedSpot.category].icon;
                  return <HeroIcon size={42} className="detail-hero-icon" />;
                })()
              )}
            </div>

            {selectedSpot.image && (
              <div className="detail-textblock">
                <div className="detail-textblock-top">
                  <span className="detail-textblock-tag">
                    {(() => {
                      const Icon = CATEGORY_META[selectedSpot.category].icon;
                      return <Icon size={12} />;
                    })()}
                    {catLabel(CATEGORY_META[selectedSpot.category])}
                  </span>
                  <span className="detail-textblock-price">
                    {formatPriceRangeText(selectedSpot.priceRangeText)
                      ? `¥${formatPriceRangeText(selectedSpot.priceRangeText)}${travelers > 1 ? ` ×${travelers}` : ''}`
                      : selectedSpot.price
                        ? `¥${selectedSpot.price.toLocaleString()}${travelers > 1 ? ` ×${travelers}` : ''}`
                        : (lang === 'en' ? 'Free' : '無料')}
                  </span>
                </div>
                <h2 className="detail-textblock-name">{sName(selectedSpot)}</h2>
                <p className={`detail-textblock-desc ${descExpanded ? '' : 'is-clamped'}`}>{sDesc(selectedSpot)}</p>
                {!descExpanded && (
                  <button type="button" className="detail-textblock-more" onClick={() => setDescExpanded(true)}>
                    {lang === 'en' ? 'Show more' : 'もっと見る'}
                  </button>
                )}
              </div>
            )}

            <div className={`detail-body ${selectedSpot.image ? 'detail-body-dark' : ''}`}>
            {!selectedSpot.image && (
              <Fragment>
                <div className="detail-tag">
                  {(() => {
                    const Icon = CATEGORY_META[selectedSpot.category].icon;
                    return <Icon size={14} />;
                  })()}
                  {catLabel(CATEGORY_META[selectedSpot.category])}
                </div>
                <h2 className="detail-name">{sName(selectedSpot)}</h2>
                <p className="detail-desc">{sDesc(selectedSpot)}</p>
                <p className="detail-price">
                  {formatPriceRangeText(selectedSpot.priceRangeText)
                    ? (lang === 'en'
                        ? `Approx. ¥${formatPriceRangeText(selectedSpot.priceRangeText)}/person${travelers > 1 ? ` · Total ×${travelers}` : ''}`
                        : `目安 ¥${formatPriceRangeText(selectedSpot.priceRangeText)}/人${travelers > 1 ? ` ・ ${travelers}人分` : ''}`)
                    : selectedSpot.price
                      ? (lang === 'en'
                          ? `Approx. ¥${selectedSpot.price.toLocaleString()}/person${travelers > 1 ? ` · Total ¥${(selectedSpot.price * travelers).toLocaleString()} (${travelers} people)` : ''}`
                          : `目安 ¥${selectedSpot.price.toLocaleString()}/人${travelers > 1 ? ` ・ 合計 ¥${(selectedSpot.price * travelers).toLocaleString()}(${travelers}人)` : ''}`)
                      : (lang === 'en' ? 'Free' : '無料')}
                </p>
              </Fragment>
            )}
            {selectedSpot.hours && (() => {
              const status = getOpenStatus(selectedSpot.hours, new Date(), lang);
              return (
                <div className={`hours-status ${status.open ? (status.closingSoon ? 'hours-closing-soon' : 'hours-open') : 'hours-closed'}`}>
                  <Clock size={13} />
                  <span className="hours-status-text">
                    {status.open
                      ? (status.closingSoon
                          ? (lang === 'en' ? `Open · closes in ${status.closeIn} min` : `営業中・あと${status.closeIn}分で閉まります`)
                          : (lang === 'en' ? 'Open now' : '営業中'))
                      : (lang === 'en' ? 'Currently closed' : '営業時間外')}
                  </span>
                  <span className="hours-today">{status.todayLabel}</span>
                </div>
              );
            })()}
            {myLocation && travelFromMe && (
              <div className="travel-from-me">
                <span className="travel-from-me-label">
                  {lang === 'en' ? `About ${travelFromMe.km.toFixed(1)} km from your location` : `現在地から約${travelFromMe.km.toFixed(1)}km`}
                </span>
                <div className="travel-from-me-modes">
                  <span className="travel-mode"><Car size={13} /> {lang === 'en' ? `~${travelFromMe.car} min` : `車 約${travelFromMe.car}分`}</span>
                  <span className="travel-mode"><Bus size={13} /> {lang === 'en' ? `~${travelFromMe.transit} min` : `公共交通 約${travelFromMe.transit}分`}</span>
                  <span className="travel-mode"><Footprints size={13} /> {lang === 'en' ? `~${travelFromMe.walk} min` : `徒歩 約${travelFromMe.walk}分`}</span>
                </div>
                <p className="travel-from-me-disclaimer">
                  {lang === 'en'
                    ? 'Times are rough estimates based on straight-line distance. Please check a navigation app for the exact time.'
                    : '時間は直線距離による概算です。正確な時間はNAVIでご確認ください。'}
                </p>
              </div>
            )}
            {selectedSpot.category !== 'lodging' && (
              <div className="duration-control">
                <span className="duration-label"><Clock size={13} /> {lang === 'en' ? 'Average visit duration' : '平均滞在時間'}</span>
                <div className="stepper">
                  <button className="stepper-btn" onClick={() => adjustDuration(selectedSpot.id, -5)} aria-label={lang === 'en' ? 'Decrease visit duration by 5 minutes' : '滞在時間を5分減らす'}>−</button>
                  <span className="stepper-value">{lang === 'en' ? `${getDuration(selectedSpot)} min` : `${getDuration(selectedSpot)}分`}</span>
                  <button className="stepper-btn" onClick={() => adjustDuration(selectedSpot.id, 5)} aria-label={lang === 'en' ? 'Increase visit duration by 5 minutes' : '滞在時間を5分増やす'}>＋</button>
                </div>
              </div>
            )}
            {wouldExceedBudget(selectedSpot) && (
              <p className="budget-warning-text">
                {lang === 'en'
                  ? `Exceeds your remaining budget (¥${remainingBudget.toLocaleString()}), so it can't be picked yet. You can still save it.`
                  : `残り予算(¥${remainingBudget.toLocaleString()})を超えるため「決定」できません。候補には追加できます。`}
              </p>
            )}
            <div className="detail-actions">
              <button className={`action-btn ${candidates.includes(selectedSpot.id) ? 'action-active' : ''}`} onClick={() => toggleCandidate(selectedSpot.id)}>
                <Star size={14} /> {candidates.includes(selectedSpot.id) ? (lang === 'en' ? 'Saved' : '候補中') : (lang === 'en' ? 'Save' : '候補')}
              </button>
              <button
                className={`action-btn ${decided.includes(selectedSpot.id) ? 'action-active' : ''}`}
                disabled={wouldExceedBudget(selectedSpot)}
                onClick={() => toggleDecided(selectedSpot.id)}
              >
                <Check size={14} /> {decided.includes(selectedSpot.id) ? (lang === 'en' ? 'Picked' : '決定済み') : (lang === 'en' ? 'Pick this' : '決定')}
              </button>
              {needsReservation(selectedSpot) && (
                <button
                  className={`action-btn ${reserved.includes(selectedSpot.id) ? 'action-active' : ''}`}
                  onClick={() => toggleReserved(selectedSpot.id)}
                >
                  <Calendar size={14} /> {reserved.includes(selectedSpot.id) ? (lang === 'en' ? 'Reserved' : '予約済み') : (lang === 'en' ? 'Reserve' : '予約')}
                </button>
              )}
              {selectedSpot.affiliateUrl && (
                <a
                  className="action-btn"
                  href={selectedSpot.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  <ExternalLink size={14} /> {lang === 'en' ? 'Book here' : '予約はこちら'}
                </a>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {showOtherMenu && (
        <div className="overlay-backdrop" onClick={() => setShowOtherMenu(false)}>
          <div className="plan-dialog-card" onClick={(e) => e.stopPropagation()}>
            <button className="plan-dialog-x" onClick={() => setShowOtherMenu(false)} aria-label={lang === 'en' ? 'Close' : '閉じる'}>
              <X size={16} />
            </button>
            <h3 className="plan-dialog-title">{lang === 'en' ? 'Other' : 'その他'}</h3>
            <p className="plan-dialog-desc">
              {lang === 'en' ? 'Choose a category to browse.' : '見たいカテゴリを選んでください。'}
            </p>
            <div className="other-menu-list">
              <button
                className="other-menu-item"
                onClick={() => {
                  setActiveCategory('roadside');
                  setLinkedId(null);
                  if (selectMode === 'candidates' || selectMode === 'decided') {
                    setSelectMode(lastBrowseMode);
                  }
                  setShowOtherMenu(false);
                }}
              >
                <Store size={16} /> {lang === 'en' ? 'Rest stop' : '道の駅'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="overlay-backdrop" onClick={() => setShowSaveDialog(false)}>
          <div className="plan-dialog-card" onClick={(e) => e.stopPropagation()}>
            <button className="plan-dialog-x" onClick={() => setShowSaveDialog(false)} aria-label={lang === 'en' ? 'Close' : '閉じる'}><X size={16} /></button>
            <h3 className="plan-dialog-title">{lang === 'en' ? 'Save this plan' : 'プランを保存'}</h3>
            <p className="plan-dialog-desc">
              {lang === 'en'
                ? 'Saved to this browser only.'
                : 'このブラウザにのみ保存されます。'}
            </p>
            <input
              type="text"
              className="plan-name-input"
              placeholder={lang === 'en' ? 'Plan name (optional)' : 'プラン名(省略可)'}
              value={saveNameInput}
              onChange={(e) => setSaveNameInput(e.target.value)}
              maxLength={40}
            />
            <div className="plan-dialog-actions">
              <button className="plan-dialog-btn plan-dialog-btn-primary" onClick={() => savePlanToBrowser(saveNameInput)}>
                <Save size={14} /> {lang === 'en' ? 'Save' : '保存する'}
              </button>
            </div>
            <div className="plan-dialog-divider" />
            <button className="plan-dialog-file-btn" onClick={exportPlanToFile}>
              <Download size={14} /> {lang === 'en' ? 'Download as a file instead' : 'ファイルとしてダウンロード'}
            </button>

            <div className="plan-dialog-divider" />
            <h3 className="plan-dialog-title">{lang === 'en' ? 'My plans' : '保存したプラン'}</h3>
            {savedPlans.length === 0 ? (
              <p className="plan-dialog-desc">
                {lang === 'en' ? 'No plans saved on this browser yet.' : 'このブラウザにはまだ保存されたプランがありません。'}
              </p>
            ) : (
              <div className="saved-plan-list">
                {savedPlans.map((snap, i) => (
                  <div key={i} className="saved-plan-item">
                    <button className="saved-plan-info" onClick={() => loadSavedPlan(snap)}>
                      <span className="saved-plan-name">{snap.name || (lang === 'en' ? 'Untitled plan' : '名称未設定のプラン')}</span>
                      <span className="saved-plan-meta">
                        {(snap.decided || []).length}{lang === 'en' ? ' spots' : '件決定'}
                        {snap.savedAt ? ` ・ ${new Date(snap.savedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP')}` : ''}
                      </span>
                    </button>
                    <button className="saved-plan-delete" onClick={() => deleteSavedPlan(i)} aria-label={lang === 'en' ? 'Delete' : '削除'}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="plan-dialog-divider" />
            <label className="plan-dialog-file-btn plan-dialog-file-label">
              <Upload size={14} /> {lang === 'en' ? 'Load from a file' : 'ファイルから読み込む'}
              <input
                type="file"
                accept="application/json"
                className="plan-file-input-hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    importPlanFromFile(e.target.files[0]);
                    setShowSaveDialog(false);
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      )}

      {showShareDialog && (
        <div className="overlay-backdrop" onClick={() => setShowShareDialog(false)}>
          <div className="plan-dialog-card" onClick={(e) => e.stopPropagation()}>
            <button className="plan-dialog-x" onClick={() => setShowShareDialog(false)} aria-label={lang === 'en' ? 'Close' : '閉じる'}><X size={16} /></button>
            <h3 className="plan-dialog-title">{lang === 'en' ? 'Share this plan' : 'プランを共有'}</h3>
            <p className="plan-dialog-desc">
              {lang === 'en'
                ? 'Anyone who opens this link will see the same plan.'
                : 'このリンクを開いた人は、同じプランを見ることができます。'}
            </p>
            <div className="share-url-row">
              <input type="text" className="share-url-input" readOnly value={buildShareUrl()} onFocus={(e) => e.target.select()} />
              <button className="share-url-copy-btn" onClick={copyShareUrl}>{lang === 'en' ? 'Copy' : 'コピー'}</button>
            </div>
            <p className="plan-dialog-file-note">
              {lang === 'en' ? 'Paste this link into LINE, mail, or any messaging app.' : 'LINEやメールなど、お好きなアプリに貼り付けて送ってください。'}
            </p>
          </div>
        </div>
      )}

      {planToast && (
        <div className="plan-toast" onAnimationEnd={() => setPlanToast('')}>{planToast}</div>
      )}

      {sharedPlanBanner && (
        <div className="shared-plan-banner">
          <span>{lang === 'en' ? 'A shared plan was loaded.' : '共有されたプランを読み込みました。'}</span>
          <button onClick={() => setSharedPlanBanner(false)} aria-label={lang === 'en' ? 'Close' : '閉じる'}><X size={14} /></button>
        </div>
      )}
            </>
            )}

            <button
              className={isMapFull ? 'floating-back-btn floating-back-btn-icon kyushu-back-right' : 'floating-back-btn'}
              onClick={() => { if (isIsahaya && view === 'route') { setView('select'); } else { setAppStage('region'); } }}
              title={isMapFull ? (lang === 'en' ? 'Back' : '戻る') : undefined}
              aria-label={isMapFull ? (lang === 'en' ? 'Back' : '戻る') : undefined}
            >
              {isMapFull ? <ChevronLeft size={20} /> : (lang === 'en' ? '← Back' : '← 戻る')}
            </button>

            {isMapFull && (
              <div className="entry-footer-wrap entry-footer-float kyushu-footer-float">
                <div className="entry-footer-links">
                  <a href="#" className="entry-footer-link">{lang === 'en' ? 'Terms of Service' : '利用規約'}</a>
                  <span className="entry-footer-dot-sep">・</span>
                  <a href="#" className="entry-footer-link">{lang === 'en' ? 'Privacy Policy' : 'プライバシーポリシー'}</a>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {appStage === 'purpose' && (
        <div className="entry-view region-scroll nagasaki-sea-bg kyushu-page-view">
          <div className="entry-header">
            <div className="entry-header-row">
              <div className="entry-header-text">
                <button className="entry-title-btn" onClick={() => setAppStage('top')}>
                  <h1 className="entry-title">CONOTAVI</h1>
                </button>
                <p className="entry-catch">{lang === 'en' ? 'Make this trip something special.' : 'この旅を、もっと特別に。'}</p>
              </div>
              <div className="entry-lang-toggle">
                <button
                  className={lang === 'ja' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
                  onClick={() => setLang('ja')}
                >JP</button>
                <span className="lang-toggle-sep">/</span>
                <button
                  className={lang === 'en' ? 'lang-toggle-opt active' : 'lang-toggle-opt'}
                  onClick={() => setLang('en')}
                >EN</button>
              </div>
            </div>
          </div>

          <svg className="entry-wave" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,0 L400,0 L400,24 Q200,-16 0,24 Z" fill="#fff" />
          </svg>

          <div className="entry-prompt-spacer" />

          {!purposeCategory && (
            <div className="entry-cards">
              <button className="entry-card" onClick={() => setPurposeCategory('roadside')}>
                <div className="entry-card-icon" style={{ background: CATEGORY_META.roadside.color }}>
                  <Store size={22} color="#fff" />
                </div>
                <div className="entry-card-body">
                  <p className="entry-card-ja purpose-card-ja">{lang === 'en' ? 'Roadside Stations' : '道の駅'}</p>
                </div>
                <ChevronRight size={20} color="#B8C4C9" />
              </button>

              <button className="entry-card" disabled>
                <div className="entry-card-icon" style={{ background: CATEGORY_META.sightseeing.color }}>
                  <Landmark size={22} color="#fff" />
                </div>
                <div className="entry-card-body">
                  <p className="entry-card-ja purpose-card-ja">{lang === 'en' ? 'Sightseeing' : '観る'}</p>
                </div>
                <span className="entry-card-badge">{lang === 'en' ? 'Coming soon' : '準備中'}</span>
              </button>

              <button className="entry-card" disabled>
                <div className="entry-card-icon" style={{ background: CATEGORY_META.food.color }}>
                  <UtensilsCrossed size={22} color="#fff" />
                </div>
                <div className="entry-card-body">
                  <p className="entry-card-ja purpose-card-ja">{lang === 'en' ? 'Food' : '食べる'}</p>
                </div>
                <span className="entry-card-badge">{lang === 'en' ? 'Coming soon' : '準備中'}</span>
              </button>

              <button className="entry-card" disabled>
                <div className="entry-card-icon" style={{ background: CATEGORY_META.lodging.color }}>
                  <BedDouble size={22} color="#fff" />
                </div>
                <div className="entry-card-body">
                  <p className="entry-card-ja purpose-card-ja">{lang === 'en' ? 'Hot Springs / Stay' : '温泉・宿泊'}</p>
                </div>
                <span className="entry-card-badge">{lang === 'en' ? 'Coming soon' : '準備中'}</span>
              </button>
            </div>
          )}

          {purposeCategory === 'roadside' && !purposePrefId && (
            <div className="entry-cards">
              {KYUSHU_PREFS.map((p) => (
                <button key={p.id} className="entry-card" onClick={() => setPurposePrefId(p.id)}>
                  <div className="entry-card-icon" style={{ background: CATEGORY_META.roadside.color }}>
                    <Store size={22} color="#fff" />
                  </div>
                  <div className="entry-card-body">
                    <p className="entry-card-ja purpose-card-ja">{mName(p)}</p>
                  </div>
                  <ChevronRight size={20} color="#B8C4C9" />
                </button>
              ))}
            </div>
          )}

          {purposeCategory === 'roadside' && purposePrefId && (
            <div className="purpose-spot-list">
              {purposeLoading && (
                <p className="purpose-loading-text">{lang === 'en' ? 'Loading…' : '読み込み中…'}</p>
              )}
              {!purposeLoading && purposeSpots.length === 0 && (
                <p className="purpose-loading-text">{lang === 'en' ? 'No roadside stations found yet for this prefecture.' : 'この県の道の駅データはまだ登録されていません。'}</p>
              )}
              {!purposeLoading && purposeSpots.map((s) => (
                <button key={s.id} className="purpose-spot-card" onClick={() => setPurposeSelectedSpot(s)}>
                  <div className="purpose-spot-icon" style={{ background: CATEGORY_META.roadside.tint, color: CATEGORY_META.roadside.color }}>
                    <Store size={18} />
                  </div>
                  <div className="purpose-spot-body">
                    <p className="purpose-spot-name">{lang === 'en' ? (s.nameEn || s.name) : s.name}</p>
                    <p className="purpose-spot-city">{s.city}</p>
                  </div>
                  <ChevronRight size={18} color="#B8C4C9" />
                </button>
              ))}
            </div>
          )}

          <svg className="entry-wave entry-wave-bottom" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,0 L400,0 L400,24 Q200,-16 0,24 Z" fill="#fff" />
          </svg>
          <div className="entry-footer-wrap">
            <div className="entry-footer-links">
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Terms of Service' : '利用規約'}</a>
              <span className="entry-footer-dot-sep">・</span>
              <a href="#" className="entry-footer-link">{lang === 'en' ? 'Privacy Policy' : 'プライバシーポリシー'}</a>
            </div>
          </div>

          <button
            className="floating-back-btn"
            onClick={() => {
              if (purposePrefId) setPurposePrefId(null);
              else if (purposeCategory) setPurposeCategory(null);
              else setAppStage('entry');
            }}
          >
            {lang === 'en' ? '← Back' : '← 戻る'}
          </button>

          {purposeSelectedSpot && (() => {
            const s = purposeSelectedSpot;
            const openStatus = getOpenStatus(s.hours, new Date(), lang);
            const meta = CATEGORY_META.roadside;
            return (
              <div className="overlay-backdrop detail-backdrop" onClick={() => setPurposeSelectedSpot(null)}>
                <div className="detail-card" onClick={(e) => e.stopPropagation()} style={{ '--cat-color': meta.color, '--cat-tint': meta.tint }}>
                  <div className="detail-hero" style={{ background: s.image ? 'none' : 'var(--cat-tint)' }}>
                    {s.image ? (
                      <img src={s.image} alt={s.name} className="detail-hero-img" loading="eager" decoding="async" />
                    ) : (
                      <Store size={42} className="detail-hero-icon" />
                    )}
                  </div>
                  <div className="detail-body">
                    <div className="detail-tag">
                      <Store size={14} />
                      {lang === 'en' ? meta.label.en : meta.label.ja}
                    </div>
                    <h2 className="detail-name">{lang === 'en' ? (s.nameEn || s.name) : s.name}</h2>
                    <p className="detail-desc">{lang === 'en' ? (s.descEn || s.desc) : s.desc}</p>
                    <p style={{ fontSize: '12px', color: '#8A9FA8', margin: '0 0 12px' }}>{s.city}</p>
                    <div className="purpose-detail-meta">
                      {!openStatus.always && (
                        <div className="purpose-detail-meta-row">
                          <Clock size={14} />
                          <span>{openStatus.todayLabel}</span>
                        </div>
                      )}
                      {s.parking && (
                        <div className="purpose-detail-meta-row">
                          <Car size={14} />
                          <span>{lang === 'en' ? 'Parking: ' : '駐車場: '}{s.parking}</span>
                        </div>
                      )}
                      {s.accessible && (
                        <div className="purpose-detail-meta-row">
                          <Check size={14} />
                          <span>{lang === 'en' ? 'Accessible: ' : 'バリアフリー対応: '}{s.accessible}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {poiDetail && (() => {
        const { type, data } = poiDetail;
        const metaByType = {
          airport: { Icon: Plane, color: '#1B6CA8', tint: '#E7F0F7', label: lang === 'en' ? 'Airport' : '空港' },
          ferry: { Icon: Ship, color: '#1F7A6C', tint: '#E6F1EE', label: lang === 'en' ? 'Ferry Terminal' : 'フェリーターミナル' },
          roadside: { Icon: Store, color: CATEGORY_META.roadside.color, tint: CATEGORY_META.roadside.tint, label: lang === 'en' ? 'Roadside Station' : '道の駅' },
        };
        const meta = metaByType[type];
        const name = lang === 'en' ? (data.nameEn || data.name) : data.name;
        const desc = type === 'roadside' ? (lang === 'en' ? (data.descEn || data.desc) : data.desc) : null;
        return (
          <div className="overlay-backdrop detail-backdrop" onClick={() => setPoiDetail(null)}>
            <div className="detail-card" onClick={(e) => e.stopPropagation()} style={{ '--cat-color': meta.color, '--cat-tint': meta.tint }}>
              <div className="detail-hero" style={{ background: 'var(--cat-tint)' }}>
                <meta.Icon size={42} color={meta.color} />
              </div>
              <div className="detail-body">
                <div className="detail-tag">
                  <meta.Icon size={14} />
                  {meta.label}
                </div>
                <h2 className="detail-name">{name}</h2>
                {type === 'roadside' && data.city && <p style={{ fontSize: '12px', color: '#8A9FA8', margin: '0 0 8px' }}>{data.city}</p>}
                {desc && <p className="detail-desc">{desc}</p>}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
