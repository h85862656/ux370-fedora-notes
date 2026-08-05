# 10. Chrome 點了沒反應，完全打不開（無視窗、無錯誤訊息）

**狀態**：已完成 Complete
**認領視窗**：（早期檔案，未記錄；檔案建立於 2026-07-23）
**備註 Note**：已在 Chromium 官方 issue 留言（附案例），NetworkManager 那邊等註冊 GitLab 帳號後再補留言

## 症狀

**使用者實際看到的現象**：點桌面/工作列的 Chrome 圖示，完全沒有反應——沒有視窗跳出來，
也沒有任何錯誤對話框或提示訊息，就像什麼都沒發生一樣。重開機五次都無法解決（因為觸發原因
跟開關機無關，見下方根本原因）。

**診斷方式**：因為 GUI 完全沒有線索，改用終端機直接執行 `google-chrome-stable` 指令啟動，
這樣程式的 stderr 輸出才會直接印在終端機畫面上，才看得到底下這個平常看不到的 log 訊息：

```
[ERROR:chrome/browser/process_singleton_posix.cc:365] 另一台電腦
(2001-b400-e455-df20-b2cd-84a6-2e1b-e5c5.emome-ip6.hinet.net) 的 Google Chrome 處理程序
(8445) 正在使用這個設定檔。Chrome 已鎖定此設定檔，確保其不致受損。
[ERROR:chrome/browser/ui/views/message_box_dialog.cc:200] Unable to show message box: ...
```

第二行說明了為什麼 GUI 完全沒反應：連 Chrome 自己想跳出來的錯誤視窗本身都彈不出來，
所以從桌面圖示點開時，使用者端就是「什麼都沒發生」，沒有任何文字線索可以搜尋，
一定要像這樣從終端機啟動才挖得到根本原因。

## 根本原因

Chrome 在 Linux 上用 `~/.config/google-chrome/SingletonLock`（一個 symlink，內容是
`主機名稱-PID`）判斷「這個 profile 是不是已經被別的機器占用」，防止 profile 被同時寫入而毀損。
這是 Chromium 已知超過十年的老問題（Chromium issue 367048 / 41103620），Windows 版 Chrome
用的是 session-local named mutex，完全不牽扯主機名稱，所以沒有這一類 bug。

這台機器**沒有設定固定主機名稱**（`hostnamectl` 顯示 `Static hostname: (unset)`）。
NetworkManager 在沒有固定主機名稱時，會對目前的 IPv6 位址做反解析（PTR record）當作暫時主機名稱：

```
NetworkManager: policy: set-hostname: set hostname to
    '2001-b400-e455-df20-b2cd-84a6-2e1b-e5c5.emome-ip6.hinet.net' (from address lookup)
```

Chrome 剛好在主機名稱是這串怪名字的當下寫入了鎖定檔。**約一小時後，同一次開機期間內（沒有重開機）**，
NetworkManager 又把主機名稱改回 `fedora`：

```
NetworkManager: policy: set-hostname: set hostname to 'fedora' (from system startup)
```

鎖定檔裡記錄的舊主機名稱，跟系統當下回報的名稱對不上，Chrome 就誤判成「別台電腦在用」而拒絕啟動。

這是兩個各自合理的設計互相不知道對方假設，撞在一起才出事：NetworkManager 假設「改暫時主機名稱沒有
副作用」，Chrome（Linux 版）假設「主機名稱在同一次開機期間內穩定不變」。

## 修復方式

**第一步：解除當下的鎖定（治標）**

確認 Chrome 完全沒有進程在跑（`pgrep -a chrome` 應為空）後，刪除三個鎖定用的 symlink
（不含任何書籤/密碼/紀錄資料，Chrome 下次啟動會自動重新產生）：

```bash
rm ~/.config/google-chrome/SingletonLock \
   ~/.config/google-chrome/SingletonSocket \
   ~/.config/google-chrome/SingletonCookie
```

**第二步：設定固定主機名稱（治本，避免復發）**

```bash
sudo hostnamectl set-hostname thomas-fedora
sudo hostnamectl set-hostname "Thomas-Fedora" --pretty
```

- Static hostname（技術用，給 DNS/網路協定）：只能小寫字母、數字、連字號 → `thomas-fedora`
- Pretty hostname（GNOME 設定「裝置名稱」顯示用）：可以照想要的樣子 → `Thomas-Fedora`

設定後寫入 `/etc/hostname` 與 `/etc/machine-info`，NetworkManager 之後就不會再用反解 IP 覆蓋掉。

**額外副作用**：藍牙服務（bluetoothd）預設會拿 pretty hostname 當藍牙裝置名稱，但只有服務啟動時讀取一次，
不會即時感知後續變更，需要 `sudo systemctl restart bluetooth`（或重開機）才會更新成新名字。

## 更新後會被覆蓋的風險

- `hostnamectl` 設定的固定主機名稱是系統層級設定（寫在 `/etc/hostname`、`/etc/machine-info`），
  不會被 Chrome 或 GNOME 更新覆蓋掉。
- 如果之後又手動執行 `hostnamectl set-hostname` 清空，或者改用其他工具重新產生 `/etc/hostname`，
  NetworkManager 又會回到用反解 IP 猜名字的行為，理論上可能復發。

## 上游回報

- **Chromium**：Issue https://issues.chromium.org/issues/41103620 （原編號 367048，Status 目前顯示 Fixed，
  但社群留言顯示 Ubuntu 24.04.03 上依然會復發，代表修復可能還沒完全涵蓋所有觸發路徑）
  已在該 issue 留言 #22（2026-07-23）附上這次的案例，重點是「主機名稱是被 NetworkManager
  自動改的，不是使用者手動改的」這個比較少見的觸發路徑。
- **NetworkManager**：尚未回報。已查過 gitlab.freedesktop.org/NetworkManager/NetworkManager，
  沒有找到「反解主機名稱中途變更，影響依賴主機名稱穩定性的其他程式」這個角度的既有回報，
  值得開新 issue。**等使用者註冊 GitLab 帳號後再去留言**，草稿內容見本次對話紀錄
  （標題：Reverse-DNS-derived transient hostname changes mid-session break apps that rely on
  hostname stability）。
