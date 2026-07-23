# 02c. 新增手動按鈕：一鍵進入/退出平板模式

**狀態**：進行中 In Progress
**認領視窗**：2026-07-23 / 平板模式手動按鈕

## 目標

不論 [02b](02b-hinge-angle-sensor.md) 有沒有成功抓到角度感測器訊號，都要在同一個系統操作按鈕區新增一顆按鈕，按一下強制進入 GNOME 平板模式，再按一下退出。

## 背景

屬於「02. 觸控/翻轉相關功能」系列項目之一，見 [02a](02a-virtual-keyboard-button.md)、[02b](02b-hinge-angle-sensor.md)、[02d](02d-tablet-mode-peripherals.md)。

這是 02b 的保底方案——就算感測器自動偵測搞不定，至少讓使用者能手動觸發同樣的平板模式狀態。

## 進度與發現

- **技術路線已驗證可行**：這台硬體沒有現成的「Tablet Mode Switch」輸入裝置（`/proc/bus/input/devices` 只有 Lid Switch），也沒有 `logind` 的 `TabletMode` 屬性可用。但 GNOME/mutter 實際上是靠 kernel 的 `SW_TABLET_MODE` 開關訊號來判斷平板模式，只要有裝置回報這個訊號就會生效——可以用 `python3-evdev`（`sudo dnf install python3-evdev`）透過 `uinput` 建立一個「虛擬」輸入裝置，只回報 `SW_TABLET_MODE`，手動把值設成 1/0 來假冒這個訊號。
- **實測結果**：建立虛擬開關並設為 1 後，實體鍵盤與觸控板實際操作時確實失效，符合 GNOME/mutter 原生平板模式的行為（自動停用內建鍵盤/觸控板）；設回 0 後恢復正常。判斷方式**必須是實際操作桌面觀察**，不能用 `libinput debug-events` 這類工具自動判讀——因為它會另外開一個獨立的 libinput context，不會套用 mutter 自己實作的「平板模式停用輸入」邏輯，用它測會得到假陰性（誤判失敗）。
- **正式實作方向**：
  - 需要一個小程式持續持有虛擬裝置的檔案描述符（裝置存在與否 = fd 有沒有開著，關掉就消失），所以本質上需要「有東西在背景撐著」；但考量使用者在意背景常駐程式的耗電，最終方向改成用 **systemd socket activation**：平常完全不啟動、不佔資源，只有按下按鈕那一刻才臨時啟動，切回筆電模式後閒置一段時間自動關閉釋放資源，而不是從開機就常駐。
  - 控制介面要設計成通用的「設定平板模式狀態」指令（不是寫死只給按鈕用），這樣未來 [02b](02b-hinge-angle-sensor.md)（鉸鏈角度感測器）如果做出來，可以直接當成另一個觸發來源接上同一個 daemon，兩邊「誰最後送出指令，虛擬開關就呈現誰的狀態」，不用另外寫優先權/仲裁邏輯，是這種簡單狀態機的天然行為。
  - 待處理：`/dev/uinput` 目前權限是 `crw-------`（僅 root），還沒決定正式版要怎麼讓一般使用者流程觸發同時不開放過寬的權限；GNOME 系統操作按鈕區的按鈕要寫成 GNOME Shell extension（quick settings toggle）。
