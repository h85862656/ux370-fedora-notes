# Shift 單擊切換中英文偶爾失效（掉鍵）

**狀態：已本機修復（binary patch）,已回報上游,尚未合併**

## 症狀

使用新酷音（ibus-chewing）輸入法,單擊 Shift 切換中英文模式,在特定條件下沒反應,需要連按兩次才會切換。

## 觸發條件

- 使用電池（非接電源）
- GNOME 電源模式為「平衡」或「省電」（非「效能」模式）
- 電量越低（觀察約 40% 以下）越容易發生
- 切到「效能」模式後,不論電量多少都不會發生

## 根本原因

`ibus-chewing` 原始碼 `src/ibus-chewing-preedit.c` 的 `self_handle_shift_left`/`self_handle_shift_right`
用 `g_get_monotonic_time()` 量測 Shift 按下到放開的時間差,**寫死 200ms 門檻**（註解誤寫成 100ms）,
超過門檻就視為「Shift 是組合鍵的一部分」而忽略,不會觸發中英文切換。

在省電模式/低電量時,CPU 效能狀態較低（`min_perf_pct` 無下限、EPP 偏省電、閒置狀態較深）,
導致系統排程延遲增加,使用者空間量到的按鍵時間差因此更容易超過這個 200ms 的寫死門檻。

已排除的可能原因：PS/2 `serio0`/`i8042` runtime power management——此硬體上該裝置的
`runtime_status` 為 `unsupported`,代表根本沒有 runtime suspend 發生,所以不是這個機制造成的。

## 修復方式

把 200ms 門檻改成 500ms（並修正過期的註解）。Patch 檔案：[`patches/ibus-chewing-shift-500ms.patch`](../patches/ibus-chewing-shift-500ms.patch)

```diff
diff --git a/src/ibus-chewing-preedit.c b/src/ibus-chewing-preedit.c
index 33fdf7a..28a75b6 100644
--- a/src/ibus-chewing-preedit.c
+++ b/src/ibus-chewing-preedit.c
@@ -381,9 +381,9 @@ EventResponse self_handle_shift_left(IBusChewingPreEdit *self, KSym kSym,
         return EVENT_RESPONSE_IGNORE;
     }
 
-    /* Ignore the Shift key if hold more than 100 ms */
+    /* Ignore the Shift key if hold more than 500 ms */
     gint64 currTs = g_get_monotonic_time();
-    if (currTs - self->keyLastTs > 200 * G_TIME_SPAN_MILLISECOND) {
+    if (currTs - self->keyLastTs > 500 * G_TIME_SPAN_MILLISECOND) {
         return EVENT_RESPONSE_IGNORE;
     }
 
@@ -415,9 +415,9 @@ EventResponse self_handle_shift_right(IBusChewingPreEdit *self, KSym kSym,
         return EVENT_RESPONSE_IGNORE;
     }
 
-    /* Ignore the Shift key if hold more than 100 ms */
+    /* Ignore the Shift key if hold more than 500 ms */
     gint64 currTs = g_get_monotonic_time();
-    if (currTs - self->keyLastTs > 200 * G_TIME_SPAN_MILLISECOND) {
+    if (currTs - self->keyLastTs > 500 * G_TIME_SPAN_MILLISECOND) {
         return EVENT_RESPONSE_IGNORE;
     }
```

### 重建步驟（重灌後如果要重做）

```bash
sudo dnf builddep -y ibus-chewing
git clone --branch v2.1.7 https://github.com/chewing/ibus-chewing.git
cd ibus-chewing
git apply /path/to/patches/ibus-chewing-shift-500ms.patch
meson setup --prefix=/usr build
ninja -C build

# 換掉正在跑的 binary（不能直接 cp,會 "Text file busy"）
sudo cp build/src/ibus-engine-chewing /usr/libexec/ibus-engine-chewing.new
sudo mv /usr/libexec/ibus-engine-chewing.new /usr/libexec/ibus-engine-chewing
ibus restart
```

**重要：`--prefix` 一定要設 `/usr`,不是 meson 預設的 `/usr/local`！**
之前用預設 prefix 編譯過,導致翻譯檔路徑抓錯,中英文模式切換的通知彈窗變成顯示英文而不是中文。

## 更新後會被覆蓋的風險

**這是直接置換 `/usr/libexec/ibus-engine-chewing`,不是透過套件管理系統安裝的。**
只要 `dnf update` 更新到新版 `ibus-chewing` 套件,這個 binary 就會被官方版本蓋掉,問題可能會回來。
如果掉鍵問題重新出現,先檢查是不是最近更新過 `ibus-chewing`：

```bash
rpm -q ibus-chewing
dnf history list | grep -i chewing
```

如果是,重跑上面的「重建步驟」即可。長期來看,等上游合併這個修復後就不需要再手動處理。

## 上游回報

- GitHub issue（唯讀鏡像,已由作者確認不會處理）：https://github.com/chewing/ibus-chewing/issues/290
  - 作者 kanru 回覆：「本 repo 是唯讀模式，請至 https://codeberg.org/chewing/ibus-chewing/issues 開 issue」
- **實際追蹤處（Codeberg,主要開發現場）**：https://codeberg.org/chewing/ibus-chewing/issues/302
  - 內容與 GitHub 那則相同（中英雙語 + 診斷過程 + patch diff）,狀態：已送出,等待回覆
- 附註：chewing/ibus-chewing 主要開發已轉移到 Codeberg,GitHub 上只留唯讀鏡像方便搜尋,之後回報進度以 Codeberg 為準
