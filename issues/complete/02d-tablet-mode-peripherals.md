# 02d. 平板模式下的周邊行為：自動關觸控板 + 自動旋轉開關按鈕

**狀態**：已完成 Complete
**認領視窗**：2026-08-05 / 平板模式周邊行為
**完成日期**：2026-08-05

## 目標

- 進入平板模式時，自動停用觸控板（不管是靠 [02b](../to-do/02b-hinge-angle-sensor.md) 自動偵測進入、還是靠 [02c](02c-tablet-mode-button.md) 手動按鈕進入，都要生效）
- 系統操作按鈕區要新增一顆「是否自動旋轉螢幕」的開關按鈕，方便平板模式下切換
- 鍵盤不用特別處理——已觀察到 ASUS 韌體/硬體本身在翻轉到一定角度後會自動斷電關閉實體鍵盤，不需要另外寫邏輯
  - ⚠️ **這條的理由後來證實是錯的**（結論「不用特別處理」仍然成立）：實際停用鍵盤的是 mutter 的軟體邏輯，不是韌體斷電。詳見下方「進度與發現 → 目標三」。

## 背景

屬於「02. 觸控/翻轉相關功能」系列項目之一，見 [02a](../to-do/02a-virtual-keyboard-button.md)、[02b](../to-do/02b-hinge-angle-sensor.md)、[02c](02c-tablet-mode-button.md)。

這項依賴 02b 或 02c 至少一個先完成（要有「現在是不是平板模式」這個狀態可以掛觸發條件），建議排在 02b/02c 之後處理。

## 進度與發現

**結論：三個目標全部已經滿足，本項目不需要寫任何程式碼、沒有新增任何檔案。**

[02c](../complete/02c-tablet-mode-button.md) 把 `SW_TABLET_MODE` 這個開關做出來之後，GNOME/mutter 原生就會處理掉這裡列的所有行為。

### 目標一：進入平板模式時自動停用觸控板 → 已滿足

mutter 收到 `SW_TABLET_MODE=1` 就會自己停用內建觸控板，不需要額外邏輯。實測（2026-08-05）：平板模式下觸控板完全沒反應，退出後恢復。

因為觸發條件掛在 `SW_TABLET_MODE` 上而不是掛在按鈕上，所以未來 [02b](../to-do/02b-hinge-angle-sensor.md) 用角度感測器進入平板模式時，這個行為會一樣自動生效，02b 不需要重做。

### 目標二：自動旋轉開關按鈕 → 已滿足（GNOME 內建）

不需要自己寫擴充套件。GNOME 內建就有「自動旋轉 / Auto Rotate」quick settings 按鈕，實測行為：

| 狀態 | 按鈕 | 螢幕 |
| --- | --- | --- |
| 一般筆電模式 | 不顯示 | 不會自動旋轉 |
| 平板模式 | **自動出現** | 跟著 G-sensor 轉；把按鈕關掉就鎖住目前方向 |

這正是本項目想要的行為（「方便平板模式下切換」），而且筆電模式下不顯示反而更好——打字時螢幕不該亂轉。

按鈕顯示條件的來源（查 GNOME Shell 原始碼確認）：

```
gresource extract /usr/lib64/gnome-shell/libshell-18.so /org/gnome/shell/ui/status/autoRotate.js
gresource extract /usr/lib64/gnome-shell/libshell-18.so /org/gnome/shell/misc/systemActions.js
```

`autoRotate.js` 把按鈕的 `visible` 綁到 `SystemActions` 的 `can-lock-orientation`，而 `systemActions.js` 的 `_updateOrientationLock()` 是 `available = this._monitorManager.get_panel_orientation_managed()`——也就是「mutter 現在有沒有在接管螢幕方向」。實測顯示 mutter 只在平板模式下接管，所以按鈕跟著只在平板模式出現。

相關環境事實：`iio-sensor-proxy` 服務 active、`HasAccelerometer` 為 `true`、`org.gnome.settings-daemon.peripherals.touchscreen orientation-lock` 預設 `false`（false = 沒鎖住 = 允許自動旋轉）。按鈕本身就是在切換這個 gsettings 值。

### 目標三：鍵盤不用特別處理 → 確認，但原本的理由是錯的

原本記錄假設「ASUS 韌體/硬體在翻轉到一定角度後會自動斷電關閉實體鍵盤」。實測顯示**不是靠這個機制**：用 02c 的按鈕強制進入平板模式時，螢幕還是筆電角度、鉸鏈根本沒翻，實體鍵盤一樣立刻失效。所以停用鍵盤的是 **mutter 的軟體邏輯**（跟觸控板同一套），不是韌體斷電。

結論同樣是「不需要另外寫邏輯」，但要知道真正的原因，否則之後做 02b 時可能誤判成「一定要翻到某個角度才會生效」。

### 資源佔用（CPU / RAM / 續航）

（2026-08-05 依 README 新規則補寫）

**完全沒有影響：CPU 0、RAM 0、續航 0。** 本項目沒有安裝任何東西、沒有寫任何程式、沒有改任何設定，三個目標全部是 GNOME/mutter 原生行為，在 [02c](02c-tablet-mode-button.md) 把 `SW_TABLET_MODE` 訊號做出來之後就自動生效。

這些原生行為本身也不耗電：停用觸控板/鍵盤是 mutter 收到開關訊號時做一次判斷，不是持續輪詢；自動旋轉按鈕只在平板模式下才出現，也不需要計時器。

**未驗證的部分**：`iio-sensor-proxy` 服務本身是開機就啟動、常駐在跑的（跟本項目無關，Fedora 預設如此）。合理推測 mutter 只在平板模式下才向它要求讀取加速度計、回到筆電模式就釋放，這樣筆電模式下感測器不會持續耗電——但**這只是推測，沒有驗證**。`journalctl -u iio-sensor-proxy` 沒有記錄 claim/release 事件，要確認得另外想辦法（例如觀察 `/sys/bus/iio/devices/` 底下的取樣頻率或 powered 狀態在兩種模式下的差異）。如果之後 [02b](../to-do/02b-hinge-angle-sensor.md) 要處理感測器耗電問題，這是個可以順便釐清的點。

**決定：暫時忽略不計，不專程測量。** 這類 HID 加速度計取樣時的功耗屬於**毫瓦等級（估計低於 0.05 W）**，而本機整機耗電約 6.2 W，佔比在 1% 以下，比螢幕亮度調一格還小；而且它只可能在平板模式下被讀取，那時螢幕本來就開著（2～3 W），這點消耗完全被淹沒。

⚠️ **上面的 0.05 W 是這類感測器的通用量級估算，不是在這台機器上實測到的數字**，引用時請不要當成本機實測值。之所以沒有實測，是因為 `power_now` 的讀值浮動（CPU 背景活動、螢幕亮度、網路收發，動輒 0.5 W）遠大於待測的差異，要在這種雜訊裡分辨 0.02 W 需要接近實驗室的控制條件，投入產出比不合理。如果 02b 之後有更精確的量測結果，以那邊為準並回頭更新這一段。

### 驗收紀錄（2026-08-05）

一般筆電模式：沒有自動旋轉按鈕、螢幕不會自動轉。
平板模式：實體鍵盤與觸控板都沒反應、只剩螢幕觸控可用；自動旋轉按鈕出現；開啟時螢幕跟著 G-sensor 轉，關閉時固定在最後方向。
