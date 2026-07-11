# 電池瓦數顯示錯誤（GNOME 擴充功能）

**狀態：已完成 Complete**
**備註 Note：已回報上游，等待回覆**

## 症狀

`batt-watt-power-monitor@DarkPhilosophy`（GNOME Shell 擴充功能,顯示電池即時瓦數）
面板上瓦數卡在固定的 `-7.7 W`,不會隨實際耗電浮動。手動 disable/enable 這個擴充功能可以暫時修好,
但重開機後又會回到卡住的狀態。

這台機器的電池只提供 `power_now` + `energy_now`,沒有 `current_now`。

## 根本原因

擴充功能路徑：`~/.local/share/gnome-shell/extensions/batt-watt-power-monitor@DarkPhilosophy/`

`library/system.js` 的 `readFileSafely()` 是非同步讀檔,但在讀取結果還沒回來前會先回傳一個同步的
預設值（cache miss 預設）。`library/upower.js` 的 `getAutopath()`/`getBatteryCorrection()` 會把
探測到的 `isTP` 這個 flag **永久快取**。

在冷開機時,第一次探測 `power_now` 有可能在非同步讀取真正完成「之前」就先拿到那個同步預設值,
導致 `isTP: false` 被永久鎖死。之後擴充功能就一律改用 `current_now × voltage_now` 計算瓦數——
但這台硬體根本沒有 `current_now`,於是算出一個固定的假數字 `-7.7 W`（`-1 sentinel × 7.7V`）,
直到手動 disable/enable 重置快取為止。

## 修復方式

修改 `library/upower.js`：移除永久凍結的 `isTP` flag,改成 `getPower()` 每次呼叫都重新檢查
`power_now` 是否真的可讀,優先動態使用它;只有在 `power_now` 真的讀不到時才 fallback 到
`current_now × voltage_now`;兩者都讀不到就回傳 `0`（而不是之前那種假的負數）。

已用獨立 gjs 單元測試（mock `system.js`,涵蓋含這個 race condition 在內的 4 種情境）以及
實機冷開機測試驗證,面板瓦數從開機就正確浮動,沒有再卡住。

這個修復是通用的（不是寫死這台筆電的路徑/數值）,因為問題本身是通用的非同步讀取 race condition,
不是這個硬體特有的問題。

修好之後的完整檔案備份在：[`patches/batt-watt-power-monitor-upower.js`](../../patches/batt-watt-power-monitor-upower.js)
（這是完整檔案,不是 diff——因為當初沒有留原始未修改版本可以比對。重灌後如果上游還沒合併,
直接把這個檔案複製過去蓋掉 `~/.local/share/gnome-shell/extensions/batt-watt-power-monitor@DarkPhilosophy/library/upower.js` 即可）。

## 更新後會被覆蓋的風險

這是修改 GNOME Shell 擴充功能本身的檔案（`~/.local/share/gnome-shell/extensions/...`）,
如果之後透過 extensions.gnome.org 或擴充功能自動更新機制更新到官方新版,這個本機修改會被覆蓋。
等上游合併後,直接更新到合併後的官方版本即可,不需要再手動 patch。

## 上游回報

- Issue: https://github.com/DarkPhilosophy/batt-watt-power-monitor/issues/10
- 狀態：OPEN,尚無回覆
