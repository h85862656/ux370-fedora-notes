# ASUS ZenBook UX370UAR + Fedora 疑難排解筆記

紀錄這台 UX370UAR 在 Fedora 上遇到過的問題、診斷過程與修復方式。
主要目的：重灌系統、或未來更新後問題復發時，可以直接查閱，不用重新診斷一次。

## 硬體/系統資訊

- 機型：ASUS ZenBook UX370UAR
- 系統：Fedora 44
- 桌面環境：GNOME Shell 50.2

## 問題清單

已經診斷、修復過的問題。

| 問題 Issue | 狀態 Status | 筆記 Note |
|---|---|---|
| Shift 單擊切換中英文偶爾失效（掉鍵） | 已完成 Complete | [issues/shift-key-drop.md](issues/shift-key-drop.md)（本機已修復，已回報上游 Codeberg，尚未合併） |
| 電池瓦數顯示錯誤（GNOME 擴充功能） | 已完成 Complete | [issues/battery-wattage-display.md](issues/battery-wattage-display.md)（已回報上游，等待回覆） |

### 檔案格式說明

每個問題一個檔案,內容包含:
- 症狀 / 如何重現
- 根本原因
- 修復方式(含指令)
- 修復是否會被系統更新覆蓋掉、要注意什麼
- 上游回報連結

## 待處理項目

正在規劃/進行中的目標清單，細節放在 `todo/` 資料夾，每個項目一個檔案。

### 共同背景知識（每個視窗開始前都該先讀）

- **電源模式對應**：GNOME 的省電/平衡/效能三檔，實際是靠 `tuned-ppd`（不是 `power-profiles-daemon`）映射到 tuned profile：`power-saver→powersave`、`balanced→balanced(-battery)`、`performance→throughput-performance`。細節見 [issues/shift-key-drop.md](issues/shift-key-drop.md) 診斷過程。
- **已知但尚未深入診斷的舊觀察**：之前測試 Shift 掉鍵問題時，曾發現「接電源或不接電源、只要電源模式是省電，重開機到 GNOME 桌面時，輸入法中英切換圖示不會顯示，也點不到、Shift 也切不了」——這是 [todo/01](todo/01-power-saver-ime-icon.md) 的現象，判斷可能跟掉鍵是不同成因。
- **側邊音量鍵曾經失效過又自己恢復**：懷疑跟某次系統更新有關，跟 [todo/05](todo/05-volume-key-check.md) 有關，尚未深究原因，只是現象曾被記錄。
- **同款硬體參考筆記**：見下方「參考資料」。跟 [todo/02b](todo/02b-hinge-angle-sensor.md)（Hinge Sensor）、[todo/06](todo/06-fingerprint-reader.md)（指紋辨識無驅動）直接相關。
- **repo 既有慣例**：`issues/` 放已經診斷、修復過的問題；`patches/` 放實際可套用的 patch 檔或完整備份檔；`todo/` 放還沒開始或還在做的事。做完的 todo 項目，如果衍生出診斷細節或 patch，比照 `issues/`、`patches/` 的既有格式另外開檔案，並在對應的 `todo/*.md` 裡連過去。
- **風險等級**：[todo/04](todo/04-ssd-repartition.md)（磁碟分割調整）具有破壞性，資料遺失風險高，處理前必須先完成備份要求，見該檔案說明。

### 多視窗協作規則

給多個平行執行的 Claude Code 視窗協作用，每個視窗認領一個項目、獨立處理，完成後回填對應檔案並推送。

1. 開始前先 `git pull`，確認拿到的是最新版本，避免跟其他視窗的認領/更新衝突。
2. 選一個「狀態」還是 `待處理 To-do` 的項目，打開對應的 `todo/*.md`，把狀態改成 `進行中 In Progress`，並在「認領視窗」欄位填上「日期 / 這次任務內容當標題」（例如 `2026-07-10 / 觸控板捲動速度調整`），**先 commit 這個認領動作再開始做事**，降低跟其他視窗撞題目的機率。
3. 處理過程中衍生的診斷紀錄、patch、腳本，比照既有的 `issues/`、`patches/` 慣例存檔。
4. 完成後（或卡住需要討論時），回來更新該項目的 `todo/*.md`：
   - 狀態改成 `已完成 Complete` / `卡住待討論 Blocked` / `暫緩 On Hold`
   - 在「進度與發現」欄位寫清楚做了什麼、發現什麼、還有什麼要注意，並連結新增的檔案
   - 同步更新下面總覽表格裡這個項目的「狀態」欄位
5. `git add` + `commit`（commit message 標明項目編號）+ `push`。
6. 如果 push 時發現別的視窗也改了同一個檔案（包括這份 README 的表格）導致衝突，正常解衝突即可，不要整份用自己的版本覆蓋過去。
7. 新增待補項目時：在 `todo/` 資料夾建立新檔案（比照既有檔案格式：狀態 / 認領視窗 / 目標 / 背景 / 進度與發現），編號接續目前最大的號碼往下加（不要留空號、也不要重複用已經刪除/搬移過的舊編號），並在下面表格新增一列。

**狀態選項**：`待處理 To-do` / `進行中 In Progress` / `已完成 Complete` / `卡住待討論 Blocked` / `暫緩 On Hold`

### 項目總覽

| # | 項目 Item | 狀態 Status | 詳細內容 Details |
|---|---|---|---|
| 1 | 省電模式下開機，輸入法圖示消失、無法切換中英文 | 待處理 To-do | [todo/01](todo/01-power-saver-ime-icon.md) |
| 2a | 觸控輸入無法自動彈出虛擬鍵盤 → 手動按鈕呼叫/關閉 | 待處理 To-do | [todo/02a](todo/02a-virtual-keyboard-button.md) |
| 2b | 研究 Fedora 能否讀到翻轉鉸鏈角度感測器訊號 | 待處理 To-do | [todo/02b](todo/02b-hinge-angle-sensor.md) |
| 2c | 新增手動按鈕：一鍵進入/退出平板模式 | 待處理 To-do | [todo/02c](todo/02c-tablet-mode-button.md) |
| 2d | 平板模式下自動關觸控板 + 自動旋轉開關按鈕 | 待處理 To-do | [todo/02d](todo/02d-tablet-mode-peripherals.md) |
| 3 | Claude Code 完成/等待回覆時跳出系統通知 | 已完成 Complete | [todo/03](todo/03-claude-code-notifications.md) |
| 4 | 1TB SSD 磁碟空間調整（雙系統，⚠️ 破壞性） | 待處理 To-do | [todo/04](todo/04-ssd-repartition.md) |
| 5 | 確認側邊音量鍵是否正常 | 待處理 To-do | [todo/05](todo/05-volume-key-check.md) |
| 6 | 側邊指紋辨識 Goodix GXFP3200 (SPI) 無官方驅動 | 待處理 To-do | [todo/06](todo/06-fingerprint-reader.md) |
| 7 | 觸控板雙指捲動速度太快，想調慢 30% | 卡住待討論 Blocked | [todo/07](todo/07-touchpad-scroll-speed.md) |
| 8 | Chrome 關機沒等到正常結束，顯示「意外結束」 | 待處理 To-do | [todo/08](todo/08-chrome-shutdown-grace-period.md) |
| 9 | LINE 擴充套件像 PWA 一樣獨立顯示在工作列 | 待處理 To-do | [todo/09](todo/09-line-extension-standalone-icon.md) |

## 參考資料

- [shahmir-k/ASUS-ZenBook-Flip-S-UX370UAR](https://github.com/shahmir-k/ASUS-ZenBook-Flip-S-UX370UAR) — 同款硬體（UX370UAR）在 Linux Mint/Cinnamon 上的設定筆記。目前還沒實際處理過跟他一樣的問題,先放著當參考。桌面環境相關部分（Fn 鍵重對應等）不適用 GNOME,但硬體層級的內容未來可能用得到:
  - 電池充電上限 85%（透過 `asus-nb-wmi` 的 `charge_control_end_threshold`,理論上與桌面環境/發行版無關）
  - CPU undervolt（需搭配停用 microcode 更新以繞過 Plundervolt/CVE-2019-11157 緩解措施）
