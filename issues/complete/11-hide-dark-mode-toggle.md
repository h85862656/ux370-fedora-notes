# 11. 隱藏系統選單裡的「深色模式」按鈕

**狀態**：已完成 Complete
**認領視窗**：2026-08-05 / 隱藏深色模式按鈕
**完成日期**：2026-08-05

## 目標

把 GNOME 系統操作按鈕區（quick settings）裡的「深色模式」切換按鈕隱藏起來，其他按鈕全部保留。

## 背景

使用者不會用到這顆按鈕，但 GNOME 沒有提供任何內建設定可以把單一 quick settings 按鈕藏起來。

評估過兩條路：

1. 裝現成的 Quick Settings Tweaker 擴充套件——功能齊全，但為了藏一顆按鈕裝一整套設定介面偏重，而且對 GNOME 50 的支援狀況不確定。
2. 自己寫一個只做這件事的小擴充套件——採用這條。[02c](../complete/02c-tablet-mode-button.md) 已經驗證這台機器上自製 GNOME Shell 擴充套件的做法可行，直接沿用同一套骨架。

## 進度與發現

### 原理

GNOME Shell 把這顆按鈕掛在 `Main.panel.statusArea.quickSettings._darkMode` 這個 indicator 底下，按鈕本體在它的 `quickSettingsItems` 陣列裡。查證方式（唯讀，不需要 root）：

```bash
gresource extract /usr/lib64/gnome-shell/libshell-18.so /org/gnome/shell/ui/panel.js | grep -n -i darkmode
gresource extract /usr/lib64/gnome-shell/libshell-18.so /org/gnome/shell/ui/status/darkMode.js
```

`panel.js` 裡是 `this._darkMode = new DarkModeStatus.Indicator()`。關鍵在於 `darkMode.js` **沒有**把按鈕的 `visible` 屬性 `bind_property` 到任何東西上（對照 `autoRotate.js` 就有綁 `can-lock-orientation`），所以直接呼叫 `hide()` 之後不會被系統自己改回來。這是這個做法能成立的前提。

### 完成內容

[`patches/hide-dark-mode-toggle-extension/`](../../patches/hide-dark-mode-toggle-extension/)，安裝到 `~/.local/share/gnome-shell/extensions/hide-dark-mode-toggle@local/`（使用者目錄，不需要 root）。

```bash
cp -r patches/hide-dark-mode-toggle-extension ~/.local/share/gnome-shell/extensions/hide-dark-mode-toggle@local
```

接著把 uuid 加進已啟用清單。**注意**：在 Wayland 上新複製進來的套件，執行中的 GNOME Shell 還沒掃描到，這時 `gnome-extensions enable` 會回報「擴充套件不存在」——這是正常的，不是錯誤。改用 `gsettings` 直接把 uuid 加進清單即可，下次登入時 GNOME Shell 掃到資料夾就會載入：

```bash
gsettings get org.gnome.shell enabled-extensions   # 先看現有清單
gsettings set org.gnome.shell enabled-extensions "[...原有項目..., 'hide-dark-mode-toggle@local']"
```

然後**登出再登入**（Wayland 不支援重載 GNOME Shell）。

想恢復按鈕：到「擴充套件管理員」把 Hide Dark Mode Toggle 關掉即可，`disable()` 會把按鈕 `show()` 回來，不留任何殘留設定。

### 驗證結果（2026-08-05，重開機後）

- `gnome-extensions info hide-dark-mode-toggle@local` → 已啟用: 是、狀態: ACTIVE
- 實際觀察：深色模式按鈕消失，其餘按鈕（平板模式、夜光模式、不要打擾、鍵盤、飛航模式、無線網路、藍牙、電源模式）全部正常保留
- 同機的 `tablet-mode-toggle@local`（見 [02c](../complete/02c-tablet-mode-button.md)）狀態不受影響，仍為 ACTIVE

### 資源佔用

實質為零。`enable()` 在登入時執行一次 `hide()` 就結束，**沒有計時器、沒有訊號監聽、沒有背景行程**，之後不再被執行；記憶體只有一個 Extension 物件加一個陣列參照，活在本來就在跑的 `gnome-shell` 行程裡。對續航沒有可量測的影響——耗電的是週期性喚醒 CPU，這裡沒有任何東西會喚醒 CPU。

方向上甚至是負的：少一個可見元件，代表每次打開系統選單時 GNOME Shell 少排版、少繪製一次，幅度小到量不出來但不是增加負擔。

### 已知風險

`_darkMode` 是 GNOME Shell 的內部欄位（前面有底線），不屬於對外穩定 API。未來 GNOME 版本如果改名或改結構，這個套件會抓不到而失效——症狀是按鈕重新出現，不會讓 GNOME Shell 出錯（程式碼用了 `?.` 保護）。屆時重新用上面的 `gresource extract` 查一次欄位名稱即可。
