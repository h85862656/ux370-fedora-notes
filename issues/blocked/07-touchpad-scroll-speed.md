# 07. 觸控板雙指捲動（上下/左右）速度太快，想調慢 30%

**狀態**：卡住待討論 Blocked
**認領視窗**：2026-07-10 / 觸控板捲動速度調整

## 目標

觸控板雙指上下、左右捲動的畫面移動速度，調整為目前速度的約 70%（也就是慢 30%）。

## 背景

GNOME/libinput 的捲動速度可能可以透過 `gsettings`（`org.gnome.desktop.peripherals.touchpad`）或 libinput 設定檔調整，實際能不能做到精確的「-30%」還是只能選幾個預設檔位，需要實測確認。

## 進度與發現

**目前設定確認**：`gsettings list-recursively org.gnome.desktop.peripherals.touchpad` 裡的 `speed`（目前值 `-0.025`）控制的是游標移動速度，**不是**雙指捲動速度；GNOME 官方到目前為止沒有獨立的捲動速度設定，這是社群從 2023 年就在跟 GNOME 官方反應、但尚未實作的 feature request（見 [GNOME Discourse 討論](https://discourse.gnome.org/t/add-touchpad-scroll-sensitivity-adjustment-feature/18097)）。libinput 維護者認為這不是他們的職責（要考慮 kinetic scrolling 等），GTK/GNOME 端則說要等底層 API 先補齊，目前沒有時間表。

**環境確認**：本機是 GNOME Wayland session（`XDG_SESSION_TYPE=wayland`），這會限制哪些方案可用（例如 X11 的 `xinput` 調法在 Wayland 下完全無效）。

**查到的三個方案比較**：

1. **libinput-config**（<https://gitlab.com/warningnonpotablewater/libinput-config>）
   - 需要自行 `meson build && ninja && sudo ninja install` 編譯安裝，寫 `/etc/libinput.conf`，設定 `scroll-factor=0.8`（或 x/y 分開設）。
   - 專案本身已標示為「deprecated」，仍能動但沒人在積極維護，之後 Fedora 更新可能會遇到相容性問題要自己排除。

2. **udev hwdb 虛擬觸控板尺寸**（見 [UbuntuHandbook 教學](https://ubuntuhandbook.org/index.php/2023/05/adjust-touchpad-scrolling-ubuntu/)）
   - 原理：用 `libinput measure touchpad-size` 量出觸控板實際物理尺寸，然後在 `/etc/udev/hwdb.d/61-evdev-local.hwdb` 裡「謊報」一個放大/縮小過的尺寸給 libinput，間接讓捲動速度變快/變慢（例如把寬度從 114.6mm 謊報成 172mm 會變成約 1.5 倍速）。
   - 缺點：這個尺寸同時也是 libinput 判斷手勢、觸控行為的依據，改了尺寸等於連帶影響其他判斷邏輯，副作用不完全可控；且有使用者回報在某些筆電上完全沒作用。**不推薦**當作首選。

3. **Wayland Scroll Factor / WSF**（<https://github.com/daniel-g-carrasco/wayland-scroll-factor>，**目前研究後最推薦的方案**）
   - 專門為 GNOME Wayland 設計的第三方工具，用「per-user 的 guarded preload」載入到 `gnome-shell` 進程裡直接調整雙指捲動（含水平/垂直）、雙指縮放、雙指旋轉的係數，安裝一行 bootstrap script（`curl ... | bash`），**不需要 root**，**不寫 `/etc/ld.so.preload`**（只影響目前使用者），官方說明設計成可逆、有提供解除安裝步驟。
   - MIT 授權、141 顆星、最新版 v0.3.5（2026-06-13）、看起來仍在積極維護中。
   - 調整值改變後不用重登入就會在「下一次觸發的手勢事件」套用，但**啟用/停用這個 preload 本身**需要登出再登入一次。
   - 使用者要的「慢 30%」大約對應把 scroll factor 設成 `0.7`。
   - 唯一需要注意的地方：這是把第三方程式碼掛進 `gnome-shell`（桌面殼層本身）的進程裡執行，雖然設計上聲稱可逆、且不是系統層級的全域 preload，但終究不是官方途徑，等於在核心桌面進程裡跑外部程式碼，出問題時的影響範圍會比一般應用程式的 extension 大。

**目前決定**：使用者看完三個方案後，選擇先只記錄研究結果，**尚未實際安裝 WSF**，之後要不要動手再另外討論決定。
