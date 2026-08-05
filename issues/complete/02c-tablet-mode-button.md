# 02c. 新增手動按鈕：一鍵進入/退出平板模式

**狀態**：已完成 Complete
**認領視窗**：2026-07-23 / 平板模式手動按鈕
**完成日期**：2026-08-04

## 目標

不論 [02b](../to-do/02b-hinge-angle-sensor.md) 有沒有成功抓到角度感測器訊號，都要在同一個系統操作按鈕區新增一顆按鈕，按一下強制進入 GNOME 平板模式，再按一下退出。

## 背景

屬於「02. 觸控/翻轉相關功能」系列項目之一，見 [02a](../to-do/02a-virtual-keyboard-button.md)、[02b](../to-do/02b-hinge-angle-sensor.md)、[02d](02d-tablet-mode-peripherals.md)。

這是 02b 的保底方案——就算感測器自動偵測搞不定，至少讓使用者能手動觸發同樣的平板模式狀態。

## 進度與發現

- **技術路線已驗證可行**：這台硬體沒有現成的「Tablet Mode Switch」輸入裝置（`/proc/bus/input/devices` 只有 Lid Switch），也沒有 `logind` 的 `TabletMode` 屬性可用。但 GNOME/mutter 實際上是靠 kernel 的 `SW_TABLET_MODE` 開關訊號來判斷平板模式，只要有裝置回報這個訊號就會生效——可以用 `python3-evdev`（`sudo dnf install python3-evdev`）透過 `uinput` 建立一個「虛擬」輸入裝置，只回報 `SW_TABLET_MODE`，手動把值設成 1/0 來假冒這個訊號。
- **實測結果**：建立虛擬開關並設為 1 後，實體鍵盤與觸控板實際操作時確實失效，符合 GNOME/mutter 原生平板模式的行為（自動停用內建鍵盤/觸控板）；設回 0 後恢復正常。判斷方式**必須是實際操作桌面觀察**，不能用 `libinput debug-events` 這類工具自動判讀——因為它會另外開一個獨立的 libinput context，不會套用 mutter 自己實作的「平板模式停用輸入」邏輯，用它測會得到假陰性（誤判失敗）。
- **正式實作方向**：
  - 需要一個小程式持續持有虛擬裝置的檔案描述符（裝置存在與否 = fd 有沒有開著，關掉就消失），所以本質上需要「有東西在背景撐著」；但考量使用者在意背景常駐程式的耗電，最終方向改成用 **systemd socket activation**：平常完全不啟動、不佔資源，只有按下按鈕那一刻才臨時啟動，切回筆電模式後閒置一段時間自動關閉釋放資源，而不是從開機就常駐。
  - 控制介面要設計成通用的「設定平板模式狀態」指令（不是寫死只給按鈕用），這樣未來 [02b](../to-do/02b-hinge-angle-sensor.md)（鉸鏈角度感測器）如果做出來，可以直接當成另一個觸發來源接上同一個 daemon，兩邊「誰最後送出指令，虛擬開關就呈現誰的狀態」，不用另外寫優先權/仲裁邏輯，是這種簡單狀態機的天然行為。
  - `/dev/uinput` 權限是 `crw-------`（僅 root），最後的解法是**不放寬這個權限**：daemon 由 systemd 以 root 身分啟動所以開得了 `/dev/uinput`，而一般使用者是透過 socket 檔案跟它溝通，socket 權限設成 `root:h8586` `0660`，等於只把「切換平板模式」這一個動作開放給使用者，而不是把整個 uinput 開放出去。

## 完成內容

四個檔案加一個擴充套件資料夾，都放在 [`patches/`](../../patches/)：

| 檔案 | 安裝位置 | 作用 |
| --- | --- | --- |
| `tablet-mode-switchd.py` | `/usr/local/bin/tablet-mode-switchd`（755） | daemon 本體，持有虛擬 `SW_TABLET_MODE` 開關裝置 |
| `tablet-mode-switch.socket` | `/etc/systemd/system/`（644） | 監聽 `/run/tablet-mode-switch.sock`，有人連線才喚醒 daemon |
| `tablet-mode-switch.service` | `/etc/systemd/system/`（644） | daemon 的 systemd 服務定義 |
| `tablet-mode-toggle` | `/usr/local/bin/tablet-mode-toggle`（755） | 命令列控制小工具（測試用，日常用按鈕即可） |
| `tablet-mode-toggle-extension/` | `~/.local/share/gnome-shell/extensions/tablet-mode-toggle@local/` | GNOME Shell 擴充套件，提供系統操作按鈕區的「平板模式」按鈕 |

安裝步驟（systemd 部分需要 root）：

```bash
sudo install -m 755 patches/tablet-mode-switchd.py /usr/local/bin/tablet-mode-switchd
sudo install -m 755 patches/tablet-mode-toggle /usr/local/bin/tablet-mode-toggle
sudo install -m 644 patches/tablet-mode-switch.socket /etc/systemd/system/
sudo install -m 644 patches/tablet-mode-switch.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tablet-mode-switch.socket
mkdir -p ~/.local/share/gnome-shell/extensions
cp -r patches/tablet-mode-toggle-extension ~/.local/share/gnome-shell/extensions/tablet-mode-toggle@local
gnome-extensions enable tablet-mode-toggle@local
```

前置需求：`sudo dnf install python3-evdev`。
擴充套件裝好後**必須登出再登入**才會生效（Wayland 不支援重載 GNOME Shell）。
`.socket` 檔裡的 `SocketGroup=` 寫死成 `h8586`，換機器時要改成該機器的使用者。

## 使用方式

- 一般操作：右上角系統選單 →「平板模式」按鈕，按一下進入、再按一下退出。
- 命令列（除錯用）：`tablet-mode-toggle STATUS` / `SET 1` / `SET 0` / `TOGGLE`，回覆格式為 `OK <0|1>`。

## 驗證結果

- 進入平板模式後，實體鍵盤與觸控板確實失效、螢幕鍵盤可用；退出後恢復正常（實際操作桌面觀察，非工具判讀）。
- 重開機後按鈕正常出現，擴充套件狀態 ACTIVE。
- **冷啟動測試通過**：daemon 在 `inactive`（完全沒在跑）的狀態下，第一次按按鈕就被 socket activation 正確喚醒並切換成功，不需要事先用指令暖機。
- 省電行為符合設計：平板模式關閉且閒置 8 秒後 daemon 自動結束，`systemctl is-active tablet-mode-switch.service` 回到 `inactive`，CPU/RAM 佔用歸零；平板模式開啟期間 daemon 阻塞在 `accept()`，不會被排程執行，也沒有任何計時器會週期性喚醒 CPU。

## 已知限制與後續

- **按鈕外觀只在 GNOME Shell 啟動時同步一次狀態**。目前只有按鈕會改變狀態，所以不會顯示錯；但等 [02b](../to-do/02b-hinge-angle-sensor.md) 的角度感測器做出來、從外部改了狀態之後，按鈕外觀不會自動跟上。
  - 評估過「每次打開系統選單就去問 daemon 現在的狀態」這種輪詢做法，但那會讓每次開系統選單（調音量、看電池）都把 daemon 叫醒 8 秒，跟本項目的省電前提衝突，因此**不採用**。
  - 決定留給 02b 一起處理，改用「02b 改變狀態時主動通知按鈕」的事件式做法——沒事發生就完全不動，才符合省電設計。
