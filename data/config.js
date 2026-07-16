// こころハブ 週次設定（毎週 update-hub.sh が week を更新。他は手動/Claudeセッションで変更）
window.HUB_CONFIG = {
  week: "2026-07-13",
  // 同期先URL（Google Apps Scriptの /exec URL）。空なら端末ごと保存。設定手順: hub-sync/設定手順.md
  syncUrl: "https://script.google.com/macros/s/AKfycbzDqRXupanKHMZRrGSdX-VGAShS-tTTmBmkAsW5FTSaP5MW4jjZrFd9s9EHBmV6fmHa/exec",
  // 漢字2週ループ：[前回, 今回] ※回番号が違ったらあゆみ→Claudeに一言（config修正します）
  kanjiWindow: [35, 36],
  kanjiThemes: { 35: "歴史（日本史）", 36: "歴史（日本史②）" },
  toiletCard: "未指名（購入カード30枚の一覧をClaudeに教えてもらえたら毎週自動指名します）",
  // チェック表（こころ＝kokoro、ママ＝ayumi）。文言はここを書き換えれば変わる
  checklist: {
    kokoro_am: [
      { id: "keisan", label: "計算マスター 1ページ" }
    ],
    kokoro_pm: [
      { id: "kanji", label: "漢字マスター（今週の2回ぶん）" },
      { id: "rika", label: "理科カンペ ママと5問" },
      { id: "hinshi", label: "品詞クイズ 3問だけ（下の🔤からひらく）" }
    ],
    ayumi: [
      { id: "koekake_am", label: "朝イチ「ハブ開こう」の声かけ" },
      { id: "keisan_photo", label: "Claudeに「計マス丸つけ」と言う（写真はハブの📷から届く）" },
      { id: "yoji", label: "ごはん中に四字熟語を1個使う" }
    ]
  }
};
