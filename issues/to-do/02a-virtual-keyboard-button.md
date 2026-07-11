# 02a. Chrome / PWA 觸控輸入無法自動彈出虛擬鍵盤 → 手動按鈕呼叫/關閉

**狀態**：待處理 To-do
**認領視窗**：（尚未認領）

## 目標

在 GNOME 頂部「wifi/藍牙/背光/音量」那個系統操作按鈕區（quick settings）新增一顆按鈕，按一下叫出螢幕虛擬鍵盤，再按一下收起。

## 背景

屬於「02. 觸控/翻轉相關功能」系列項目之一，見 [02b](02b-hinge-angle-sensor.md)、[02c](02c-tablet-mode-button.md)、[02d](02d-tablet-mode-peripherals.md)。

Chrome 瀏覽器與其 PWA app，觸控點擊文字輸入框時不會像原生 GTK app 一樣自動彈出虛擬鍵盤，這是已知現象（GNOME 的虛擬鍵盤彈出邏輯多半靠 GTK/IBus 的 focus 事件，Chromium 的 web 內容不會觸發同一套機制）。與其修 Chrome 本身，方向改成手動開關按鈕比較務實。

## 進度與發現

（尚無記錄）
