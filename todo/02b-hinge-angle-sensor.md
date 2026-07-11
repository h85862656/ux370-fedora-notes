# 2b. 研究 Fedora 能否讀到翻轉鉸鏈角度感測器訊號

**狀態**：待處理 To-do
**認領視窗**：（尚未認領）

## 目標

確認 Fedora 系統層級能不能讀到 UX370UAR 翻轉鉸鏈角度的感測器數值（不只是「有沒有進入平板模式」這個布林值，而是能不能拿到接近實際角度或至少能分辨「約210°~330°帳篷模式」與「360°平板模式」兩種區間）。

## 背景

屬於「2. 觸控/翻轉相關功能」系列項目之一，見 [02a](02a-virtual-keyboard-button.md)、[02c](02c-tablet-mode-button.md)、[02d](02d-tablet-mode-peripherals.md)。02d 依賴這項或 02c 至少完成一項。

同款硬體參考筆記提到 `HID-SENSOR-INT-020b`（Hinge Sensor，回報 lid angle）與 `HID-SENSOR-200073`（accelerometer，用於自動旋轉）都透過 Intel Sensor Hub 呈現，見 [README.md](../README.md) 參考資料連結。GNOME/systemd 這類角度資訊通常經由 `iio-sensor-proxy` 這個 daemon 暴露出來，可以先確認這個服務有沒有跑、有沒有抓到對應 sensor。翻轉超過180°時，ASUS 韌體/GNOME 本身可能已經有「帳篷模式=平板模式」的判斷（使用者觀察是這樣），要釐清這個判斷目前是在哪一層做的（韌體、kernel driver、iio-sensor-proxy、還是 GNOME Shell 自己）。

## 進度與發現

（尚無記錄）
