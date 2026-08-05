# 01a. Shift 單擊切換中英文偶爾失效（掉鍵）

**狀態**：已完成 Complete
**認領視窗**：（早期檔案，未記錄；檔案建立於 2026-07-12）
**備註 Note**：本機已修復（binary patch），已回報上游，尚未合併

**⚠️ 目前系統實際狀態（2026-07-21 起）：本機暫時換回原始 200ms bug 版本（有加 debug log，見 [`patches/ibus-chewing-shift-debug-log.patch`](../../patches/ibus-chewing-shift-debug-log.patch)），不是上面說的 500ms 修復版！這是刻意為之，目的是實際蒐集真實掉鍵樣本回覆上游，見下方「進度追蹤」2026-07-21 那一段。研究結束後要記得換回 500ms 修復版，重新套用 [`patches/ibus-chewing-shift-500ms.patch`](../../patches/ibus-chewing-shift-500ms.patch)。**

## 症狀

使用新酷音（ibus-chewing）輸入法，單擊 Shift 切換中英文模式，在特定條件下沒反應，需要連按兩次才會切換。

## 觸發條件

- 使用電池（非接電源）
- GNOME 電源模式為「平衡」或「省電」（非「效能」模式）
- 電量越低（觀察約 40% 以下）越容易發生
- 切到「效能」模式後，不論電量多少都不會發生

## 根本原因

`ibus-chewing` 原始碼 `src/ibus-chewing-preedit.c` 的 `self_handle_shift_left`/`self_handle_shift_right`
用 `g_get_monotonic_time()` 量測 Shift 按下到放開的時間差，**寫死 200ms 門檻**（註解誤寫成 100ms），
超過門檻就視為「Shift 是組合鍵的一部分」而忽略，不會觸發中英文切換。

在省電模式/低電量時，CPU 效能狀態較低（`min_perf_pct` 無下限、EPP 偏省電、閒置狀態較深），
導致系統排程延遲增加，使用者空間量到的按鍵時間差因此更容易超過這個 200ms 的寫死門檻。

已排除的可能原因：PS/2 `serio0`/`i8042` runtime power management——此硬體上該裝置的
`runtime_status` 為 `unsupported`，代表根本沒有 runtime suspend 發生，所以不是這個機制造成的。

## 修復方式

把 200ms 門檻改成 500ms（並修正過期的註解）。Patch 檔案：[`patches/ibus-chewing-shift-500ms.patch`](../../patches/ibus-chewing-shift-500ms.patch)

```diff
diff --git a/src/ibus-chewing-preedit.c b/src/ibus-chewing-preedit.c
index 33fdf7a..28a75b6 100644
--- a/src/ibus-chewing-preedit.c
+++ b/src/ibus-chewing-preedit.c
@@ -381,9 +381,9 @@ EventResponse self_handle_shift_left(IBusChewingPreEdit *self, KSym kSym,
         return EVENT_RESPONSE_IGNORE;
     }
 
-    /* Ignore the Shift key if hold more than 100 ms */
+    /* Ignore the Shift key if hold more than 500 ms */
     gint64 currTs = g_get_monotonic_time();
-    if (currTs - self->keyLastTs > 200 * G_TIME_SPAN_MILLISECOND) {
+    if (currTs - self->keyLastTs > 500 * G_TIME_SPAN_MILLISECOND) {
         return EVENT_RESPONSE_IGNORE;
     }
 
@@ -415,9 +415,9 @@ EventResponse self_handle_shift_right(IBusChewingPreEdit *self, KSym kSym,
         return EVENT_RESPONSE_IGNORE;
     }
 
-    /* Ignore the Shift key if hold more than 100 ms */
+    /* Ignore the Shift key if hold more than 500 ms */
     gint64 currTs = g_get_monotonic_time();
-    if (currTs - self->keyLastTs > 200 * G_TIME_SPAN_MILLISECOND) {
+    if (currTs - self->keyLastTs > 500 * G_TIME_SPAN_MILLISECOND) {
         return EVENT_RESPONSE_IGNORE;
     }
```

### 重建步驟（重灌後如果要重做）

```bash
sudo dnf builddep -y ibus-chewing
git clone --branch v2.1.7 https://github.com/chewing/ibus-chewing.git
cd ibus-chewing
git apply /path/to/patches/ibus-chewing-shift-500ms.patch
meson setup --prefix=/usr build
ninja -C build

# 換掉正在跑的 binary（不能直接 cp,會 "Text file busy"）
sudo cp build/src/ibus-engine-chewing /usr/libexec/ibus-engine-chewing.new
sudo mv /usr/libexec/ibus-engine-chewing.new /usr/libexec/ibus-engine-chewing
ibus restart
```

**重要：`--prefix` 一定要設 `/usr`，不是 meson 預設的 `/usr/local`！**
之前用預設 prefix 編譯過，導致翻譯檔路徑抓錯，中英文模式切換的通知彈窗變成顯示英文而不是中文。

## 更新後會被覆蓋的風險

**這是直接置換 `/usr/libexec/ibus-engine-chewing`，不是透過套件管理系統安裝的。**
只要 `dnf update` 更新到新版 `ibus-chewing` 套件，這個 binary 就會被官方版本蓋掉，問題可能會回來。
如果掉鍵問題重新出現，先檢查是不是最近更新過 `ibus-chewing`：

```bash
rpm -q ibus-chewing
dnf history list | grep -i chewing
```

如果是，重跑上面的「重建步驟」即可。長期來看，等上游合併這個修復後就不需要再手動處理。

## 上游回報

- GitHub issue（唯讀鏡像，已由作者確認不會處理）：https://github.com/chewing/ibus-chewing/issues/290
  - 作者 kanru 回覆：「本 repo 是唯讀模式，請至 https://codeberg.org/chewing/ibus-chewing/issues 開 issue」
- **實際追蹤處（Codeberg，主要開發現場）**：https://codeberg.org/chewing/ibus-chewing/issues/302
  - 內容與 GitHub 那則相同（中英雙語 + 診斷過程 + patch diff），狀態：已送出，等待回覆
- 附註：chewing/ibus-chewing 主要開發已轉移到 Codeberg，GitHub 上只留唯讀鏡像方便搜尋，之後回報進度以 Codeberg 為準

### 進度追蹤

- 2026-07-10：維護者 kanru 回覆，沒有直接接受 500ms patch，傾向比照 Windows 版做成可調整設定；質疑「整整 200ms 都執行不到」是否合理，要求提供診斷資訊（背景 CPU 負載、kernel HZ）。
- 2026-07-13：已回覆 kanru：
  - `CONFIG_HZ=1000`（推翻低 HZ 假設）
  - 測試當下背景負載輕量（8 個大多靜態分頁 + 1 個播放音樂的分頁，無其他吃重程式）
  - 提出新假設：CPU C-state（深度閒置）造成 Shift 按下到放開之間的量測時間差被灌水，跟已排除的 PS/2 runtime PM 是不同機制
  - 待電量較低、容易重現問題時，計畫加 debug log 實測真實時間差，並搭配 `turbostat`/C-state 使用量數據佐證，測完後回覆 kanru
- **2026-07-21：正式開始實測階段**，把本機暫時換回原始 200ms bug 版本並加上 debug log（patch 見 [`patches/ibus-chewing-shift-debug-log.patch`](../../patches/ibus-chewing-shift-debug-log.patch)），蒐集真實掉鍵樣本。以下依實際發生順序記錄每個階段：
  1. **重新部署 debug 版**：從乾淨的 v2.1.7 原始碼出發（**沒有**套用 500ms patch，門檻維持原本的 200ms），在 `self_handle_shift_left`/`self_handle_shift_right` 裡加上 `shift_debug_log()`，把每次判斷結果（時間差、是否被判定為掉鍵）寫進 `/tmp/shift-debug.log`。用 `meson setup --prefix=/usr build --reconfigure && ninja -C build` 編譯，換掉正在跑的 `/usr/libexec/ibus-engine-chewing`（先 cp 成 `.new` 再 mv，避免 "Text file busy"），`ibus restart` 生效。確認 `/tmp` 是 tmpfs（存在記憶體裡），純文字 log 不會累積到造成系統異常。
  2. **檢查現有 log，沒抓到明顯掉鍵**：檢視最近一小時、以及全部歷史 log，`interval-check` 分支（真正代表掉鍵的判斷）在約 60 筆紀錄中只有 2 筆超過 200ms 門檻（219.9ms、833.1ms）。使用者實際打字期間也沒感受到掉鍵，跟當初回報的 ~90% 失敗率明顯對不上，開始往下追這個落差。
  3. **排查「是不是系統更新剛好把它治好了」**：檢查 kernel/GNOME Shell/mutter/ibus 版本與更新時間軸，沒找到能直接解釋行為改變的更新紀錄；同時釐清 kanru 在 2026-07-10 的回覆只是「要求提供診斷資訊」，並未實際處理或合併任何修復，排除「上游已默默修好」的可能。
  4. **追查第二道判斷分支（`keyLast` 檢查）並修正誤判**：發現 `self_handle_shift_left/right` 除了時間差判斷外，還有一個「上一個處理的按鍵是不是 Shift」的檢查。一開始誤把這個分支也標成「DROPPED(掉鍵)」寫進 log，但這條分支其實是在過濾「Shift 是組合鍵一部分」的正常情境（大寫字母、Shift+Tab、Shift+方向鍵選取），不是使用者想切換中英文的場合。加上 log 後這個分支頻繁觸發，但使用者完全沒感覺到對應的掉鍵，兩相印證後確認這是誤判，**真正代表 bug 的只有 `interval-check` 分支**，log 裡已把兩者分開標註。
  5. **驗證目前系統上的 binary 確實是原始 200ms 版本**：用 `objdump -d` 反組譯 `/usr/libexec/ibus-engine-chewing`，在 `self_handle_shift_left/right` 裡找到比較用的常數是 `0x30d40`（=200000 µs=200ms），確認不是不小心裝成 500ms 修復版；再用 `nm -D`/`strings` 確認 `shift_debug_log`、`is_shift_toggle` 等自訂符號都在，確認這是本機客製編譯版，沒被套件更新蓋掉。
  6. **驗證 Fedora 官方套件本身沒動過原始碼**：`dnf download --source ibus-chewing` 抓到 `ibus-chewing-2.1.7-2.fc44.src.rpm`，解開後檢查 `.spec` 檔的 `%prep`/`%build`，確認沒有任何 `Patch:` 或 `sed` 之類的下游修改；把裡面附的原始碼 tarball 跟 GitHub 上 `v2.1.7` tag 的原始碼整包 `diff -r`，結果**完全一致**，排除「Fedora 包裝的版本其實跟上游不一樣」這個可能性。
  7. **比對使用者描述的重現情境跟程式碼邏輯，發現落差**：使用者具體描述原本的重現方式是「按下放開一個文字鍵、過 3 秒、再按下放開一個 Shift 鍵」，這樣就無法切換。追蹤 `ibus_chewing_pre_edit_process_key` 裡 `keyLast`/`keyLastTs` 的更新時機，發現時間差計算的起點是「Shift 自己被按下的那一刻」，跟前一個文字鍵按下的時間點無關——照程式碼邏輯，這個情境理論上不該觸發 200ms 門檻失敗。**這跟使用者記憶中原本 ~90% 失敗率的重現方式對不上，目前尚未解開，是還沒解決的疑點**。
  8. **低電量「打字變順但功耗沒降」的新觀察與初步驗證**：使用者回報電量 16%、省電模式下打字手感比以前同條件下順，但 batt-watt 擴充功能顯示的瓦數沒有明顯下降，因此推測「kernel 在低電量時可能沒有像以前一樣做降頻」。用 `sudo turbostat --interval 1 --num_iterations 10` 實測：`Bzy_MHz` 穩定在 800-890MHz、`PkgWatt` 約 1.3-1.7W，都符合省電模式該有的行為，**排除了「CPU 沒有降頻」這個字面上的假設**。改提出修正版假設：可能是某次 kernel 更新調整了 cpuidle `menu` governor 對「要不要進入最深的 C9/C10 閒置狀態」的判斷（硬體限制 C10 喚醒延遲超過 1ms），在不太影響整體耗電的前提下減少了深度閒置造成的按鍵延遲——**這個假設目前還沒有實測資料驗證**（需要在真正掉鍵當下比對 C-state 分佈），先記錄下來，尚未結案。
  9. **確認即將進行的系統更新不會動到目前的 debug binary**：透過 `pkcon get-updates` 檢查 GNOME Software 已下載、待重開機套用的更新清單，確認裡面**沒有** `ibus-chewing`、`gnome-shell`、`mutter`，所以重開機不會覆蓋掉目前手動置換的 debug binary。清單裡有 kernel 從 `7.1.3-201.fc44` 跳到 `7.1.4-200.fc44`（其餘為 bluez、openssh、openssl 等系統套件），對正在追的 C-state 假設是一個新變數，重開機後如果體感又有變化要留意可能是這個原因。
- **下一步（尚未執行）**：
  - 讓目前的 debug 版繼續在背景蒐集真實 `interval-check` DROPPED 樣本，尤其是電量低、離線用電池的情境。
  - 找到足夠樣本，或能重現使用者原本描述的重現方式後，重新測 C-state（`turbostat`/`cpupower idle-info`）分佈佐證延遲假設，解開第 7 點的落差。
  - 蒐集齊後整理回覆 kanru（Codeberg #302）。
  - **研究結束後記得把 binary 換回 500ms 修復版**（重新套用 [`patches/ibus-chewing-shift-500ms.patch`](../../patches/ibus-chewing-shift-500ms.patch)、重新編譯部署），不要讓系統長期停留在故意重現 bug 的狀態。build 環境沿用「重建步驟」章節。
