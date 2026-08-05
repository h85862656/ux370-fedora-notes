# ASUS ZenBook UX370UAR + Fedora 疑難排解筆記

紀錄這台 UX370UAR 在 Fedora 上遇到過的問題、規劃中的項目與修復方式。
主要目的：重灌系統、或未來更新後問題復發時，可以直接查閱，不用重新診斷一次。

## 硬體/系統資訊

- 機型：ASUS ZenBook UX370UAR
- 系統：Fedora 44
- 桌面環境：GNOME Shell 50.2

## 項目清單 Issues

所有項目（不管原本是 bug 還是想新增的功能/設定）都當成同一種東西看待，用「狀態」分類，
實體檔案也放在對應狀態的資料夾底下：

```
issues/to-do/        待處理 To-do
issues/in-progress/  進行中 In Progress
issues/complete/     已完成 Complete
issues/blocked/      卡住待討論 Blocked
issues/on-hold/      暫緩 On Hold
```

狀態改變時，檔案要跟著 `git mv` 到對應資料夾（不是只改檔案內文字），這樣 `ls issues/*/ ` 就能一眼看到全貌。

| # | 項目 Item | 狀態 Status | 詳細內容 Details |
|---|---|---|---|
| 00 | 電池瓦數顯示錯誤（GNOME 擴充功能） | 已完成 Complete | [issues/complete/00-battery-wattage-display.md](issues/complete/00-battery-wattage-display.md)（已回報上游，等待回覆） |
| 01a | Shift 單擊切換中英文偶爾失效（掉鍵） | 已完成 Complete | [issues/complete/01a-shift-key-drop.md](issues/complete/01a-shift-key-drop.md)（本機已修復，已回報上游 Codeberg，尚未合併；⚠️ 目前暫時換回 bug 版本蒐集樣本中，詳見檔案內警示） |
| 01b | 省電模式下開機，輸入法圖示消失、無法切換中英文 | 待處理 To-do | [issues/to-do/01b-power-saver-ime-icon.md](issues/to-do/01b-power-saver-ime-icon.md) |
| 03 | Claude Code 完成/等待回覆時跳出系統通知 | 已完成 Complete | [issues/complete/03-claude-code-notifications.md](issues/complete/03-claude-code-notifications.md) |
| 07 | 觸控板雙指捲動速度太快，想調慢 30% | 已完成 Complete | [issues/complete/07-touchpad-scroll-speed.md](issues/complete/07-touchpad-scroll-speed.md)（已安裝 WSF，實際落點 0.15；Ptyxis 終端機減速幅度較小，屬已知限制，使用者接受現況） |
| 02a | 觸控輸入無法自動彈出虛擬鍵盤 → 手動按鈕呼叫/關閉 | 待處理 To-do | [issues/to-do/02a-virtual-keyboard-button.md](issues/to-do/02a-virtual-keyboard-button.md) |
| 02b | 研究 Fedora 能否讀到翻轉鉸鏈角度感測器訊號 | 待處理 To-do | [issues/to-do/02b-hinge-angle-sensor.md](issues/to-do/02b-hinge-angle-sensor.md) |
| 02c | 新增手動按鈕：一鍵進入/退出平板模式 | 已完成 Complete | [issues/complete/02c-tablet-mode-button.md](issues/complete/02c-tablet-mode-button.md) |
| 02d | 平板模式下自動關觸控板 + 自動旋轉開關按鈕 | 進行中 In Progress | [issues/in-progress/02d-tablet-mode-peripherals.md](issues/in-progress/02d-tablet-mode-peripherals.md) |
| 04 | 1TB SSD 磁碟空間調整（雙系統，⚠️ 破壞性） | 待處理 To-do | [issues/to-do/04-ssd-repartition.md](issues/to-do/04-ssd-repartition.md) |
| 05 | 確認側邊音量鍵是否正常 | 待處理 To-do | [issues/to-do/05-volume-key-check.md](issues/to-do/05-volume-key-check.md) |
| 06 | 側邊指紋辨識 Goodix GXFP3200 (SPI) 無官方驅動 | 待處理 To-do | [issues/to-do/06-fingerprint-reader.md](issues/to-do/06-fingerprint-reader.md) |
| 08 | Chrome 關機沒等到正常結束，顯示「意外結束」 | 進行中 In Progress | [issues/in-progress/08-chrome-shutdown-grace-period.md](issues/in-progress/08-chrome-shutdown-grace-period.md) |
| 09 | LINE 擴充套件像 PWA 一樣獨立顯示在工作列 | 待處理 To-do | [issues/to-do/09-line-extension-standalone-icon.md](issues/to-do/09-line-extension-standalone-icon.md) |
| 10 | Chrome 點了沒反應，完全打不開（無視窗、無錯誤訊息） | 已完成 Complete | [issues/complete/10-chrome-hostname-lock.md](issues/complete/10-chrome-hostname-lock.md)（根源是 NetworkManager 主機名稱漂移；已回報 Chromium，NetworkManager 待註冊帳號後補留言） |

### 檔案格式說明

每個項目一個檔案,內容依情況包含:
- 狀態 / 認領視窗
- 目標（想達成什麼結果）
- 背景（為什麼要做、已知線索）
- 症狀 / 如何重現（如果本質是 bug）
- 根本原因（如果本質是 bug）
- 修復方式(含指令)、修復是否會被系統更新覆蓋掉、上游回報連結（如果已修復）
- 進度與發現

### 共同背景知識（每個視窗開始前都該先讀）

- **電源模式對應**：GNOME 的省電/平衡/效能三檔，實際是靠 `tuned-ppd`（不是 `power-profiles-daemon`）映射到 tuned profile：`power-saver→powersave`、`balanced→balanced(-battery)`、`performance→throughput-performance`。細節見 [issues/complete/01a-shift-key-drop.md](issues/complete/01a-shift-key-drop.md) 診斷過程。
- **已知但尚未深入診斷的舊觀察**：之前測試 Shift 掉鍵問題時，曾發現「接電源或不接電源、只要電源模式是省電，重開機到 GNOME 桌面時，輸入法中英切換圖示不會顯示，也點不到、Shift 也切不了」——這是 [issues/to-do/01b-power-saver-ime-icon.md](issues/to-do/01b-power-saver-ime-icon.md) 的現象，判斷可能跟掉鍵是不同成因。
- **側邊音量鍵的時好時壞歷史**：剛裝好 Fedora 時側邊音量鍵一開始是失效的；後來某次開機發現變正常了，當時判斷可能是某次系統更新順便修好的（沒有確認是哪次更新、也沒有深究原因）；再之後又失效了一次（同樣懷疑可能又是某次更新造成，沒有實際證據），而且這次沒有再自己恢復，才因此開了 [issues/to-do/05-volume-key-check.md](issues/to-do/05-volume-key-check.md) 這個項目要實際分析解決。
- **同款硬體參考筆記**：見下方「參考資料」。跟 [issues/to-do/02b-hinge-angle-sensor.md](issues/to-do/02b-hinge-angle-sensor.md)（Hinge Sensor）、[issues/to-do/06-fingerprint-reader.md](issues/to-do/06-fingerprint-reader.md)（指紋辨識無驅動）直接相關。
- **平板模式的觸發機制**：GNOME 判斷「現在是不是平板模式」的依據是 kernel 的 `SW_TABLET_MODE` 開關訊號（不是 logind 的 `TabletMode` 屬性——這台沒有；也不是硬體的 Tablet Mode Switch 裝置——這台也沒有，`/proc/bus/input/devices` 只有 Lid Switch）。只要有任何輸入裝置回報這個訊號，mutter 就會進入平板模式（停用內建鍵盤/觸控板、啟用自動旋轉與螢幕鍵盤）。[issues/complete/02c-tablet-mode-button.md](issues/complete/02c-tablet-mode-button.md) 已經用 `python3-evdev` 建立虛擬裝置實作出可用的開關 daemon，控制介面是通用的 `SET 0`/`SET 1`/`TOGGLE`/`STATUS`，[issues/to-do/02b-hinge-angle-sensor.md](issues/to-do/02b-hinge-angle-sensor.md) 做出來後可以直接當成另一個觸發來源接上去，不需要重做這一層。
- **repo 既有慣例**：`issues/to-do/`、`issues/in-progress/`、`issues/complete/`、`issues/blocked/`、`issues/on-hold/` 五個資料夾對應五種狀態，項目本身不分「bug」還是「功能」，狀態改變就把檔案 `git mv` 到對應資料夾；`patches/` 放實際可套用的 patch 檔或完整備份檔；`reference/` 放跨平台/跨機器的參考資料（不是這台機器專屬的問題）。
- **主機名稱已固定**：2026-07-22 設定固定主機名稱為 `thomas-fedora`（pretty: `Thomas-Fedora`），起因跟細節見 [issues/complete/10-chrome-hostname-lock.md](issues/complete/10-chrome-hostname-lock.md)。之前因為沒設固定名稱，NetworkManager 會用反解 IP 動態改名，可能影響任何依賴主機名稱穩定性的程式（不只 Chrome）。
- **風險等級**：[issues/to-do/04-ssd-repartition.md](issues/to-do/04-ssd-repartition.md)（磁碟分割調整）具有破壞性，資料遺失風險高，處理前必須先完成備份要求，見該檔案說明。

### 多視窗協作規則

給多個平行執行的 Claude Code 視窗協作用，每個視窗認領一個項目、獨立處理，完成後回填對應檔案並推送。

1. 開始前先 `git pull`，確認拿到的是最新版本，避免跟其他視窗的認領/更新衝突。
2. 選一個在 `issues/to-do/` 底下的項目，`git mv` 到 `issues/in-progress/`，打開對應檔案把「狀態」改成 `進行中 In Progress`，並在「認領視窗」欄位填上「日期 / 這次任務內容當標題」（例如 `2026-07-10 / 觸控板捲動速度調整`），**先 commit 這個認領動作（mv + 改狀態）再開始做事**，降低跟其他視窗撞題目的機率。
3. 處理過程中衍生的診斷紀錄、patch、腳本，比照既有的 `patches/` 慣例存檔。
4. 完成後（或卡住需要討論時）：
   - 把檔案 `git mv` 到對應的新狀態資料夾（`issues/complete/`、`issues/blocked/`、`issues/on-hold/`）
   - 檔案內「狀態」欄位同步改成 `已完成 Complete` / `卡住待討論 Blocked` / `暫緩 On Hold`
   - 在「進度與發現」欄位寫清楚做了什麼、發現什麼、還有什麼要注意，並連結新增的檔案
   - 同步更新 README 上面總表裡這個項目的「狀態」欄位跟連結路徑
5. `git add` + `commit`（commit message 標明項目編號）+ `push`。
6. 如果 push 時發現別的視窗也改了同一個檔案（包括這份 README 的表格）導致衝突，正常解衝突即可，不要整份用自己的版本覆蓋過去。
7. 新增待補項目時：在 `issues/to-do/` 資料夾建立新檔案（比照既有檔案格式：狀態 / 認領視窗 / 目標 / 背景 / 進度與發現），編號接續目前最大的號碼往下加（不要留空號、也不要重複用已經刪除/搬移過的舊編號），並在上面總表新增一列。

**狀態選項**：`待處理 To-do` / `進行中 In Progress` / `已完成 Complete` / `卡住待討論 Blocked` / `暫緩 On Hold`

## 參考資料

- [shahmir-k/ASUS-ZenBook-Flip-S-UX370UAR](https://github.com/shahmir-k/ASUS-ZenBook-Flip-S-UX370UAR) — 同款硬體（UX370UAR）在 Linux Mint/Cinnamon 上的設定筆記。目前還沒實際處理過跟他一樣的問題,先放著當參考。桌面環境相關部分（Fn 鍵重對應等）不適用 GNOME,但硬體層級的內容未來可能用得到:
  - 電池充電上限 85%（透過 `asus-nb-wmi` 的 `charge_control_end_threshold`,理論上與桌面環境/發行版無關）
  - CPU undervolt（需搭配停用 microcode 更新以繞過 Plundervolt/CVE-2019-11157 緩解措施）
