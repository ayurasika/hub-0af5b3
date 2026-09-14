#!/bin/bash
# こころハブ 週次自動更新（launchd: com.ayu.kokoro-hub が毎週月曜5:30に実行）
# やること：理科カンペ25問の選定（復習ローテ_ルール.md準拠）→ 印刷HTML生成 → ハブ反映 → ログ追記 → ツール最新化
# 問題文の創作・改変はしない（プールの文言をそのまま使う）

cd /Users/ayu/kokoro-juken || exit 1
LOG=hub/update.log
echo "===== $(date '+%F %T') 週次更新開始 =====" >> "$LOG"

python3 << 'PYEOF' >> "$LOG" 2>&1
import json, re, collections, html, datetime, subprocess

BASE = '/Users/ayu/kokoro-juken'
today = datetime.date.today()
week = today.strftime('%Y-%m-%d')
weekfile = today.strftime('%Y-%m%d')

def notify(msg):
    subprocess.run(['osascript', '-e',
        f'display notification "{msg}" with title "こころハブ 週次更新"'], check=False)

# ---- 0. 設定 ----
# 【2026-07-30 変更】以前は「一度出した問題は永久に出さない」＝1問1回の使い捨てだった。
# その結果、星と太陽(21問)・月の満ち欠け(31問)が全消費され、カンペに二度と出てこなくなり
# こころが両単元を忘れていた。そこで「復習枠」を作り、出した問題も間隔をおいて戻すようにした。
REVIEW_SLOTS = 8   # 25問のうち「前に出した問題をもう一度出す枠」。増やせば復習重視、減らせば新規重視

# ---- 1. プールとログ読み込み ----
pool = json.load(open(f'{BASE}/rika/復習プール.json'))['問題']
logtext = open(f'{BASE}/rika/復習ログ.md').read()

# 各問題を「最後に出した日」を週見出しごとに拾う（未出題ならキーなし）
heads = [(m.start(), m.group(1)) for m in re.finditer(r'##\s*(\d{4}-\d{2}-\d{2})の週', logtext)]
last_seen = {}
for i, (pos, wk) in enumerate(heads):
    end = heads[i + 1][0] if i + 1 < len(heads) else len(logtext)
    d = datetime.date(*map(int, wk.split('-')))
    for qid in re.findall(r'k\d+-\d+', logtext[pos:end]):
        if qid not in last_seen or d > last_seen[qid]:
            last_seen[qid] = d

def age(q):  # 最後に出してから何日たったか（未出題は超大きい＝最優先）
    return 99999 if q['id'] not in last_seen else (today - last_seen[q['id']]).days

usable = [q for q in pool if not q['図必須']]
if len(usable) < 25:
    notify(f'使える問題が{len(usable)}問しかなく25問組めません。Claudeセッションで問題追加を')
    print(f'ABORT: 図なし問題が{len(usable)}問。プール追加が必要。')
    raise SystemExit(0)

mi = [q for q in usable if q['id'] not in last_seen]                                  # 未出題
sumi = sorted([q for q in usable if q['id'] in last_seen],
              key=lambda q: (-age(q), q['id']))                                       # 出題済み・古い順

# 新規と復習の配分。未出題が減ったら自動で復習枠が増える（＝プールが枯れても止まらない）
new_n = min(25 - REVIEW_SLOTS, len(mi))
review_n = min(25 - new_n, len(sumi))

# ---- 2. 新規ぶんの配合（直近層=最新回、忘れかけ層=古い回ほど厚く）----
groups = collections.defaultdict(list)
for q in mi:
    groups[q['回']].append(q)
for kai in groups:
    groups[kai].sort(key=lambda q: q['id'])

def spread(lst, n):
    if n >= len(lst): return lst[:]
    step = len(lst) / n
    return [lst[int(i * step)] for i in range(n)]

sel = []
if new_n and groups:
    kais = sorted(groups.keys())
    recent = kais[-1]
    older = kais[:-1]
    quota = {recent: min(5, len(groups[recent]), new_n)}
    need = max(0, new_n - quota[recent])
    weights = list(range(len(older), 0, -1))  # 古いほど重い
    wsum = sum(weights) or 1
    alloc = {k: min(len(groups[k]), max(0, round(need * w / wsum))) for k, w in zip(older, weights)}
    # 端数調整（在庫のある回に足す/引く）
    diff = need - sum(alloc.values())
    for k in older + [recent]:
        while diff > 0 and alloc.get(k, 0) < len(groups[k]):
            alloc[k] = alloc.get(k, 0) + 1; diff -= 1
        while diff < 0 and alloc.get(k, 0) > 0:
            alloc[k] -= 1; diff += 1
    quota.update(alloc)
    for kai, n in quota.items():
        sel.extend(spread(groups[kai], n))

# ---- 3. 復習ぶん（出題済みの古い順。単元がかたよらないよう間引いて選ぶ）----
if review_n:
    sel.extend(spread(sumi[:max(review_n * 3, review_n)], review_n))

# ひっかけ3問以上を保証
traps = [q for q in sel if q['ひっかけ']]
if len(traps) < 3:
    inside = {q['id'] for q in sel}
    cands = [q for q in (mi + sumi) if q['ひっかけ'] and q['id'] not in inside]
    for c in cands[:3 - len(traps)]:
        same = [q for q in sel if not q['ひっかけ']]
        if same:
            sel.remove(same[-1]); sel.append(c)
sel.sort(key=lambda q: q['id'])
sel = sel[:25]

tanshuku = {'星と太陽':'星','月の満ち欠け':'月','気象':'気象','気体と化学反応':'気体',
            '水溶液':'水溶液','音の性質':'音','光の性質':'光'}
def tan(u): return tanshuku.get(u, u[:3])

# ---- 3. 印刷用カンペHTML（テンプレのカンペページのみ）----
tpl = open('/Users/ayu/.claude/skills/rika-fukushu/template.html').read()
rows = []
for i, q in enumerate(sel, 1):
    cls = ' class="trap"' if q['ひっかけ'] else ''
    rows.append(
        f"<tr{cls}><td class=\"no\">{i}</td><td class=\"unit\">{tan(q['単元'])}</td>"
        f"<td class=\"q\">{html.escape(q['問題'])}</td><td class=\"a\">{html.escape(q['答え'])}</td>"
        f"<td class=\"hint\">{html.escape(q.get('補足','') or '')}</td></tr>")
out = tpl.replace('{{DATE}}', f'{week}の週').replace('{{KANPE_ROWS}}', '\n    '.join(rows))
start = out.index('<!-- ========== 1ページ目：トイレ ========== -->')
end = out.index('<!-- ========== 2ページ目〜：カンペ ========== -->')
out = out[:start] + out[end:]
out = out.replace('<div class="page kanpe">', '<div class="page kanpe" style="page-break-before:auto;">', 1)
open(f'{BASE}/rika/復習プリント/週{weekfile}.html', 'w').write(out)

# ---- 4. ハブ反映 ----
data = {'week': week, 'questions': [
    {'id': q['id'], 'unit': tan(q['単元']), 'q': q['問題'], 'a': q['答え'],
     'why': q.get('補足','') or '', 'trap': q['ひっかけ']} for q in sel]}
json.dump(data, open(f'{BASE}/hub/data/rika-week.json', 'w'), ensure_ascii=False, indent=1)
open(f'{BASE}/hub/data/rika-week.js', 'w').write(
    'window.RIKA_WEEK = ' + json.dumps(data, ensure_ascii=False) + ';')

cfg = open(f'{BASE}/hub/data/config.js').read()
cfg = re.sub(r'week: "[^"]*"', f'week: "{week}"', cfg, count=1)
open(f'{BASE}/hub/data/config.js', 'w').write(cfg)

# ---- 5. ログ追記 ----
ids = ' '.join(q['id'] for q in sel)
with open(f'{BASE}/rika/復習ログ.md', 'a') as f:
    f.write(f"\n## {week}の週（自動生成）\n- トイレ: 週替わり交換（カード名は一覧登録後に自動指名）\n"
            f"- カンペ25問: {ids}\n- 内訳: 新規{new_n}問／復習{review_n}問\n")

mi_left = len(mi) - new_n
print(f'{week}: 25問生成OK（新規{new_n}問／復習{review_n}問／'
      f'ひっかけ{sum(1 for q in sel if q["ひっかけ"])}問／未出題残り{mi_left}問）')
if mi_left == 0:
    notify(f'カンペ更新OK。未出題が0になったので、これからは全部「復習モード」で回します')
else:
    notify(f'今週の理科カンペできたよ（新規{new_n}／復習{review_n}／未出題残り{mi_left}）')
PYEOF

# ---- 6. ツール最新版をハブへコピー ----
cp kanji/漢字マスター.html hub/tools/ 2>>"$LOG"
cp kokugo/品詞_攻略.html kokugo/品詞_説明.html hub/tools/ 2>>"$LOG"
cp kokugo/四字熟語/四字熟語カンペ_食事中用.html hub/tools/ 2>>"$LOG"
cp sansu/単位ダイブ.html sansu/単位_攻略.html sansu/単位_台本.html hub/tools/ 2>>"$LOG"
cp rika/星座_暗記.html hub/tools/ 2>>"$LOG"
cp rika/自転と公転_シミュレーター.html hub/tools/ 2>>"$LOG"
NEWEST=$(ls -t rika/復習プリント/週*.html | head -1)
cp "$NEWEST" hub/tools/理科カンペ_印刷用.html 2>>"$LOG"

# ---- 7. Web公開（GitHub Pages）へ反映 ----
DEPLOY=/Users/ayu/.kokoro-hub-deploy
if [ -d "$DEPLOY/.git" ]; then
  rsync -a --delete --exclude '.git' --exclude 'update.log' --exclude 'update-hub.sh' --exclude '.deploy-repo' hub/ "$DEPLOY/" >> "$LOG" 2>&1
  git -C "$DEPLOY" add -A >> "$LOG" 2>&1
  git -C "$DEPLOY" commit -m "weekly update $(date +%F)" >> "$LOG" 2>&1
  git -C "$DEPLOY" push >> "$LOG" 2>&1 && echo "Web公開に反映OK" >> "$LOG" || echo "⚠ Web公開への反映に失敗（次回セッションでClaudeに見せて）" >> "$LOG"
fi

echo "===== $(date '+%F %T') 週次更新おわり =====" >> "$LOG"
