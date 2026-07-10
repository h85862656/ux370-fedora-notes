# 8. 重開機/關機時 Chrome 沒等到正常關閉，下次開啟顯示「上次意外結束」

**狀態**：未開始
**認領視窗**：（尚未認領）

## 目標

按下 GNOME 的重開機或關機按鈕時，如果 Chrome 還開著，系統要先給 Chrome 足夠的關閉等待時間（至少 5 秒），確保 Chrome 能正常寫入結束狀態，避免下次啟動時顯示「之前當機、意外結束」的提示。

## 背景

Chrome 是否顯示「上次未正常關閉」，是靠自己 Preferences 設定檔裡的 `exit_type` 欄位判斷——只有收到訊號後跑完自己的正常關閉流程，才會把這個值寫成 `Normal`；如果進程是被直接砍掉（來不及處理），就會留在 `Crashed`/`Abnormal`，下次啟動就跳出提示。GNOME/systemd 在 logout 或 shutdown 時，理論上會對使用者的應用程式送出終止訊號並等待一段時間才強制結束，但目前看起來等待時間不夠讓 Chrome 跑完。需要研究的方向：

- `systemd-logind`／`systemd` 在 session 結束、關機流程中，對一般使用者應用程式的等待時間設定在哪裡（例如 `DefaultTimeoutStopSec`、inhibitor lock 機制）
- 或者是不是要專門針對 Chrome 這類應用寫一個 shutdown/logout hook script，主動送出正常關閉訊號並等待，確保跑完再讓系統繼續關機流程
- 不確定 GNOME Shell 本身的 session 管理跟 systemd 的關機流程分別扮演什麼角色，這點也要查清楚再下手，不要一開始就假設是哪一層的問題

## 進度與發現

（尚無記錄）
