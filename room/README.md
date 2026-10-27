# こころのへや：ハロウィンとクローゼット（ハンコのごほうび）

作業ブランチ: `codex/room-halloween`。2026-10-15 のユーザー依頼で本番反映を実施。公開先は https://ayurasika.github.io/hub-0af5b3/ 。

## 見本

`python3 -m http.server 8767 --bind 127.0.0.1 --directory hub`

http://127.0.0.1:8767/room-preview.html

見本は部屋のスクリプトだけを読み込み、架空の判子をメモリ内に置きます。学習データファイルや同期処理は読み込みません。見本での着せ替え保存キーは実ハブと別です。`?days=6` を付けると6日達成済みの架空データで表示します。

## 追加したもの

- 背景とキャラを分離。ドラッグ・矢印キー・矢印ボタンでキャラと飾りを移動。
- かぼちゃランタン、おばけのぬいぐるみ、お菓子かご、月と星のガーランド。
- 帽子のみ、マントのみ、帽子＋マント、元の緑ニット。
- キャラの赤茶色と、一つずつの丸いほっぺをカフェの参照に寄せた。
- 端末内の自動保存、一手戻す、位置リセット、衣装解除、JSONバックアップと復元。

## 保存・互換性

`season.js` は `kokoro-room-season-v1` だけを書き込みます。見本は `kokoro-room-season-preview-v1`。
既存の `core.js`、`device.js`、`layout.js` は変更していません。既存の6種の報酬規則を維持し、過去の報酬IDとバックアップの検証結果を変えません。`ui.js` が検証済み台帳の達成日数だけを季節のUIへ通知します。

ハンコ3個以上の日に既存家具を1個獲得し、その達成日の累計1〜6日に、かぼちゃ→おばけ→お菓子かご→帽子→月と星→マントを追加で解放します。開始前の日と10/15より前の日は対象外、連続日でなくても可、同日に何度確認しても重複しません。10/15以降の達成日を数え、6種を集めた後も通常家具は増えます。未獲得のボタン・配置・衣装はロックし、獲得後は自分で飾れます。季節の配置バックアップだけでは獲得扱いにしません。
古い家具用バックアップと、新しい飾り・着せ替え用バックアップは別のファイルです。
不正な保存や復元データは拒否し、上書きしません。他タブで変更済みのドラッグも拒否します。

## 古いiPad向けの配慮

- ライブラリ追加・動画なし。歩行は1体だけをCSS transformで移動し、JavaScriptの常時描画ループは使いません。
- 衣装はキャラ全体の小さなPNG一枚を切り替える。未選択衣装は先読みしない。
- ドラッグの描画だけ requestAnimationFrame を使用。保存は指を離した時だけ。
- Pointer Events 非対応時の touch/mouse 操作と、矢印ボタンの代替操作。
- キャラ最大420px、小物最大224px（横長ガーランド384px）、背景960px。
- 初期の背景・基本キャラ・4小物の画像合計553,478 bytes（約541 KiB）。各衣装は約172〜194 KiB。
- CSSの inset に頼らず、top/right/bottom/left を明示。

## 確認

`node --test hub/room/checks/season.test.js` — 11件成功。旧schema:1の移行、服の段階解放、着替え・undo・新旧バックアップ互換を追加確認。達成日ごとの6段階解放、開始前・ハンコ不足の日の除外、同日の重複防止、獲得記録の復元も確認。

保存、元の衣装へ戻す、飾り解除、undo、復元、壊れたデータの拒否、別タブ競合、保存失敗、学習記録不変、既存報酬・既存バックアップ互換を検証。
Chromeの見本で、ドラッグ位置と再読み込みの保持、矢印移動、衣装3通り、元の服、undo、飾り解除、既存の判子からの報酬を確認。
390px・768pxの画面幅で画像欠落・横はみ出しなし。ブラウザ警告・エラーなし。
実際の古いiPadでの速度・Safari操作は未確認です。部屋以外のハブHTMLは変更していません。

## 素材と生成指示

組み込みの image_gen を使用。元画像は `generated_images/` に保存、部屋用の縮小版は `assets/` に保存。生成時に子どもの写真・個人情報・学習記録は使用していません。

- 背景: 元の木製ロフト部屋の構図・光・家具を保ち、キャラだけを消し、床とラグを補完。`room-empty-loft.jpg`
- 基本キャラ: 元の顔・しっぽ・緑のニット・立ち姿を保った透過画像。カフェ見本の落ち着いたシナモンの毛色と、左右一つずつの薄いピンクの丸いほっぺに調整。`character-kokoa-cafe.png`
- 魔女衣装: 元の姿と顔・位置を保ち、深いプラム色のベルベット、折れた帽子の先、赤茶のリボン、真鍮バックル、マントの金糸の星と縫い目、三日月の留め具、柔らかな布のひだを表現。帽子だけ／マントだけは完成した衣装画像から片方のみ外して生成。`character-witch.png` / `character-hat.png` / `character-cape.png`
- かぼちゃ: 丸くふっくらした小さな陶器、短い巻いた茎とセージ色の葉、小さな離れた楕円の目、小さな笑顔、一つずつのピンクのほっぺ。杏色のつやを抑えた釉薬、控えめな内側の灯り。怖い顔や大口、野菜の皮の斑点は避ける。`halloween-pumpkin.png`
- おばけ: アイボリーの柔らかな布、丸みのある頭、刺繍の目と笑顔、ピンクのほっぺ、手縫いの縁とスカラップ、くすみモーブのサテンリボン。`halloween-ghost.png`
- かご: 蜂蜜色の籐の編み目、プラムのギンガムリボン、杏・クリーム・モーブの包み紙、星のクッキー、笑顔のかぼちゃチャーム。`halloween-candy.png`
- ガーランド: 麻ひも、中央の蜂蜜色の三日月と左右のクリームの星、フェルトの厚み、ブランケットステッチ、小さな刺繍、モーブのリボン。`halloween-stars.png`

全小物は透明背景、暖かな左上からの光、柔らかな立体感、縮小しても読める輪郭で統一。初期のSVG案は採用していません。

カフェの参照をもとに4着を追加。だいふくは未追加。Cafeリポジトリは変更していません。

## 本番反映の記録（2026-10-15）

公開リポジトリ `ayurasika/hub-0af5b3` のコミット `29a62f4b833cafc3e22f9be2ed8f81d4c2381749`。GitHub Pages の built を確認。公開した14ファイルを取得し、コード・画像のSHA-256がローカルの確認済みファイルとすべて一致。部屋以外のHTMLは公開前後で一致。プレビュー・テスト・生成元画像・作業メモは今回の公開対象外。

公開用チェックアウトも fast-forward で更新済み。部屋の台帳はユーザー端末内のまま、ハンコや獲得記録のテストは架空データのみ。実端末の過去データをテスト用に書き換えていません。

## クローゼット（2026-10-15）

緑ニットは最初から使用可。既存のハロウィン6種に続け、ハンコ3個以上の日の累計7日でピンクのエプロン、8日で黒いワンピース、9日で赤チェック＋ベレー帽、10日でワイン色のエプロンを解放。連続日・暦上の季節による制限なし。過去の達成日を引き続き数えます。

衣装カードには着用見本・着用中／獲得済み／あと何日の表示。ハロウィン帽子・マントはクローゼット内の折りたたみに移動し、緑ニットと組み合わせます。カフェ服を選ぶと帽子・マントは解除。キャラや小物の位置は維持。

保存キーは変更せず、state schema:2 に outfit を追加。旧schema:1は読み取り時だけ緑ニットとして解釈し、読み取りだけで元データを書き換えません。新バックアップは kokoro-room-season-backup-v2、旧v1も復元可。服のバックアップを復元してもハンコの獲得日数は増えません。

画像は character-{pink-apron,black-dress,red-plaid,wine-apron}.png（最大420px）。カード用は character-{kokoa-cafe,pink-apron,black-dress,red-plaid,wine-apron}-thumb.png（最大112px、5枚で86,764 bytes）。カードは小画像だけを読み、フルサイズは着ている1着のみ。常時アニメーション・新ライブラリ・通信処理は追加なし。

架空データのブラウザで全4着の切り替え、再読み込み後の衣装保持、ハロウィンへの切り替え、6日目のロック・7日目のピンクのみ解放を確認。390px幅で横はみ出し・画像欠落なし。旧保存・バックアップ・学習記録不変を含む11テスト成功。古いiPad実機は未確認。

### 生成プロンプト（組み込み imagegen）

共通: Use case: identity-preserve. Transparent full-body character sprite for a child's cozy room dress-up game. Image 1 is the edit target. Keep exactly the cinnamon/russet squirrel, cream face, glossy eyes, little smile, one single ROUND pale pink blush on each cheek, standing pose, hands, feet, curled tail, framing, camera and warm upper-left light. Change only clothing and the specified head accessory. Same character scale and registration; tactile detailed 3D plush render. No text, scenery, props, double blush or striped cheeks. Transparent background.

- pink-apron: Dusty rose pinafore over ivory knitted long sleeves. Wooden strap buttons, scalloped cream pocket, small waist bow, stitched hems, fine knit and linen folds. No hat.
- black-dress: Cafe reference LEFT outfit only. Charcoal black cotton dress, puff sleeves, gathered waist, pleated skirt, ivory neckline and matte black grosgrain ear bow. Seam detail, stitched hem, subtle fabric weave. Reference is clothing inspiration only; keep edit target's face and standing pose.
- red-plaid: Cafe reference RIGHT outfit only. Deep muted red tartan with carefully aligned forest-green and beige lines, puff sleeves over ivory knit, gathered skirt, small dark buttons. Burgundy wool beret with felt texture and short stem. Preserve edit target's face and pose.
- wine-apron: Cafe wine reference clothing only. Burgundy linen pinafore, ivory cable-knit, covered strap buttons, stitched pocket, waistband and waist bow. Cream daisy hair clip with honey center. Preserve edit target's face and pose.

元画像: pink-apron=exec-6c3cf4c6-bf47-47bb-b231-4ec4b69ddc05.png、black-dress=exec-88ab812b-14c2-4eed-920d-71cf3e6c746f.png、red-plaid=exec-4dbda082-8f98-4e64-a7a9-8b035a459834.png、wine-apron=exec-98db2d83-a95a-4934-b60d-e51709bff72c.png（generated_images/）。sipsで縮小し、透過を維持。

クローゼット公開コミット: `6483bed58860ef9ba74708ea49a7b96e4d496e07`（ayurasika/hub-0af5b3）。公開対象13ファイル。390px・768px幅で横はみ出し・画像欠落・部屋のエラー表示なし。

本番検証: 上記13ファイルを公開URLから取得し、ローカル確認版とすべてバイト一致。本番ブラウザのクローゼットで5枚の着用見本が読み込み済み、部屋・着せ替えのエラー表示なし。既存の学習記録や本番のハンコをテスト用に変更していません。

## 未獲得の服をひみつにする修正

未獲得のカードは画像・服名を出さず「？／ひみつの服／あと何日」に変更。次の服の案内と読み上げラベルからも服名を除去。獲得済みの服だけ、名前と着用見本を表示して読み込みます。報酬・保存ルールは変更なし。架空の7日達成データで、獲得済み2着は画像あり、未獲得3着は画像要素なし・名前なしをブラウザで確認。

上記修正の公開コミット: `85c6194`。コードは `season-ui.js`、`style.css` とHTMLのキャッシュ更新のみ。

## 自動うろうろと獲得日数の修正（2026-10-15）

- `roam.js`: 床の範囲をゆっくり歩いて2〜5秒休む動きを繰り返す。向きは画像の左右反転、歩くリズムは小さな上下・傾きのCSSアニメーション。全衣装で共用し、画像追加なし。
- 移動は1区間につきCSS transformのlinear transitionと到着用タイマー1つ。JavaScriptの常時フレームループ、歩行位置の保存・通信なし。
- 画面外・タブ非表示・ウィンドウ非アクティブ時は現在位置で休止。ドラッグ中・キーボードでキャラにフォーカス中も停止。移動操作を終えると少し待って再開。
- 「うろうろをとめる／うろうろする」。設定は `kokoro-room-roam-v1`、見本は `kokoro-room-roam-preview-v1`。動きを減らす設定では初期停止。
- 手動で決めた位置は既存の配置保存へ、歩いている途中の位置は端末の獲得・配置台帳に書き込まない。

「すでに全部もらったよ」の原因は、既存の家具の全期間の獲得数を新しいごほうびにも使っていたこと。`season.js` の開始日を2026-10-15に固定し、`ui.js` が検証済み台帳のうちこの日以降かつ今日以前の達成日数を `collectionDays` として渡す。全期間の家具の数はそのまま。旧ルールで置いていた飾りや衣装の位置・設定も削除せず、未獲得分は解放まで表示しない。服の「？」も維持。

`node --test hub/room/checks/*.test.js` — 17件成功。過去の家具10個＋10/15の達成で家具11個・ハロウィン1個、旧バックアップ復元、旧ステータスの一括解放防止、床の境界、掴んだ位置で停止、休止・再開、画面外とタブ非表示、動きを減らす設定、操作とフォーカスの同時停止を確認。

ブラウザの架空データでも家具11個・ハロウィンはかぼちゃのみ、服は緑ニットのみを確認。移動する座標、停止ボタン、停止の保持、矢印での手動位置と再読み込み、画面外での歩行停止を確認。古いiPad実機での負荷・タッチ操作は未確認。

見本の `?days=N` は10/15からN日経過した仮想日付で動く。`?days=1&past=10` は過去の家具10個を持っている公開初日の再現。学習記録はメモリ上の架空データのみ。これらの見本ファイルは本番の読み込み対象外。

本番コミット: `b7aadf6de5309a9a6fcfb46e086e39528fc0a6e3`。GitHub Pages built を確認。公開対象は index.html、ui.js、season.js、season-ui.js、roam.js、style.css の6ファイル。

## 秋のごほうび9品（2026-10-27）

既存の判子3個以上の日の累計11〜19日目に、うさぎ・くま・ねこのぬいぐるみ、葉っぱのマグ、どんぐりのノート、秋の写真立て、紅葉リース、どんぐりの置物、きのこのランプを順番に解放する。部屋の開始日以降かつ10/15以降、今日以前の検証済み達成日を数える。連続である必要はない。既に11日以上達成している場合は過去の達成分が反映され、19日以上なら全9品を使える。

獲得後は「飾る」で配置し、片づけても所有状態は残る。未獲得品は「ひみつのごほうび」と残り日数を表示する。既存1〜6日目のごほうび、7〜10日目の服、初期の緑ニット、通常家具は維持する。

### 保存・バックアップ・巻戻し

- 通常家具のITEMS、日付による報酬ID、台帳の検証規則は変更しない。秋の所有状態は検証済み達成日から導出し、新たな獲得台帳を追加しない。
- 保存キーは `kokoro-room-season-v1`、見本は `kokoro-room-season-preview-v1`。旧schema1/2と季節バックアップv1/v2に対応し、読み取りだけで既存保存を上書きしない。
- 「家具と配置のバックアップ」は獲得記録と通常家具、「飾りと着せ替えのバックアップ」は服・キャラ・季節飾りの配置を含む。端末移行では両方を保存する。飾りだけの復元で未獲得品は解放されない。
- 秋のUIを戻す場合も、秋9品のIDを検証・保存できる互換性を残す。旧season.js全体への単純な巻戻しは行わない。保存済みの秋配置、学習記録、localStorageを消去しない。
- 週次更新は更新元から公開用へ同期するため、公開時・巻戻し時とも両方に同じ変更を反映する。週次更新スクリプト全体の実行は教材更新も行うので、秋変更だけの反映には使用しない。

### 素材と見本

採用デザインに基づく個別の透過PNG。生成り、セージグリーン、木色で既存部屋に揃えた。部屋用は最大256px、カード用は最大112px、9品×2種類で合計847,236 bytes。獲得済みカードの縮小画像を読み込み、部屋用は配置時に読み込む。

`room-preview.html?days=10` / `11` / `19` / `25` で架空の達成日数を比較できる。`?days=1&past=10` でシーズン前の家具がある場合を確認する。プレビューの家具台帳はメモリ、季節配置は本番と別キーで、学習データや同期処理を読み込まない。

検証: `node --test room/checks/*.test.js` は21件成功。10/11/19/25日境界、旧保存、重複獲得防止、衣装と配置の保持、undo、競合、保存失敗を確認した。Chromeでスマホ相当390×844とPC相当1200×900の9品表示、ドラッグと再読込、架空のJSON保存→変更→復元→再読込を確認済み。実機iPad/Safariの操作・速度は未確認。
