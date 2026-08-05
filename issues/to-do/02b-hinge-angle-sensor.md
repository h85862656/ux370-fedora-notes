# 02b. 研究 Fedora 能否讀到翻轉鉸鏈角度感測器訊號

**狀態**：待處理 To-do
**認領視窗**：（尚未認領）

## 目標

確認 Fedora 系統層級能不能讀到 UX370UAR 翻轉鉸鏈角度的感測器數值（不只是「有沒有進入平板模式」這個布林值，而是能不能拿到接近實際角度或至少能分辨「約210°~330°帳篷模式」與「360°平板模式」兩種區間）。

## 背景

屬於「02. 觸控/翻轉相關功能」系列項目之一，見 [02a](02a-virtual-keyboard-button.md)、[02c](../complete/02c-tablet-mode-button.md)、[02d](../complete/02d-tablet-mode-peripherals.md)。02d 原本依賴這項或 02c 至少完成一項，現在已由 02c 滿足並結案。

同款硬體參考筆記提到 `HID-SENSOR-INT-020b`（Hinge Sensor，回報 lid angle）與 `HID-SENSOR-200073`（accelerometer，用於自動旋轉）都透過 Intel Sensor Hub 呈現，見 [README.md](../../README.md) 參考資料連結。GNOME/systemd 這類角度資訊通常經由 `iio-sensor-proxy` 這個 daemon 暴露出來，可以先確認這個服務有沒有跑、有沒有抓到對應 sensor。翻轉超過180°時，ASUS 韌體/GNOME 本身可能已經有「帳篷模式=平板模式」的判斷（使用者觀察是這樣），要釐清這個判斷目前是在哪一層做的（韌體、kernel driver、iio-sensor-proxy、還是 GNOME Shell 自己）。

## 進度與發現

（尚無記錄）

### 來自 02c / 02d 的相關經驗（參考用，不是本項目的結論）

⚠️ **以下只是別的項目在別的目的下順手觀察到的東西，不構成本項目的前提，也不該用來縮小調查範圍。本項目仍然要從硬體層自己查起**（Intel Sensor Hub / HID sensor / iio 裝置節點等），該重驗的還是要重驗。列在這裡只是讓接手的視窗少走冤枉路。

- [02c](../complete/02c-tablet-mode-button.md) 當時為了做手動按鈕，查過這台**沒有**現成的 `SW_TABLET_MODE` 硬體輸入裝置（`/proc/bus/input/devices` 只有 Lid Switch），也**沒有** `logind` 的 `TabletMode` 屬性。但這是「以按鈕為目的」的查法，不代表角度感測器本身不存在或讀不到——當時完全沒有往 Intel Sensor Hub / HID sensor 那個方向查。
- GNOME/mutter 判斷平板模式的依據是 kernel 的 `SW_TABLET_MODE`。如果本項目最後成功讀到角度，要讓系統真的進入平板模式，可以直接送指令給 02c 已經做好的 daemon（`SET 0`/`SET 1`/`TOGGLE`/`STATUS`），不必重做那一層；當然也可以自己決定用別的做法。
- [02d](../complete/02d-tablet-mode-peripherals.md) 實測推翻了「ASUS 韌體在翻到一定角度後自動斷電關閉實體鍵盤」這個說法：用按鈕強制進入平板模式時（鉸鏈根本沒翻），實體鍵盤與觸控板一樣立刻失效，所以那是 mutter 的軟體行為。上面「背景」段落裡「翻轉超過 180° 時 ASUS 韌體/GNOME 可能已有判斷」這個假設**還沒被驗證也還沒被推翻**，只是不能再拿「鍵盤會自己關掉」當佐證。
- 驗證平板模式狀態時，不要用 `libinput debug-events` 判讀——它會另外開一個獨立的 libinput context，看不到 mutter 自己的停用邏輯，會給假陰性。要用實際操作桌面觀察。
