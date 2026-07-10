# ASUS ZenBook UX370UAR + Fedora 疑難排解筆記

紀錄這台 UX370UAR 在 Fedora 上遇到過的問題、診斷過程與修復方式。
主要目的：重灌系統、或未來更新後問題復發時，可以直接查閱，不用重新診斷一次。

## 硬體/系統資訊

- 機型：ASUS ZenBook UX370UAR
- 系統：Fedora 44
- 桌面環境：GNOME Shell 50.2

## 待處理項目

正在規劃/進行中的目標清單（含多視窗協作規則）：[TODO.md](TODO.md)

## 問題清單

| 問題 | 狀態 | 筆記 |
|---|---|---|
| Shift 單擊切換中英文偶爾失效（掉鍵） | 已本機修復,已回報上游（Codeberg）,等待回覆 | [issues/shift-key-drop.md](issues/shift-key-drop.md) |
| 電池瓦數顯示錯誤（GNOME 擴充功能） | 已修復,已回報上游 | [issues/battery-wattage-display.md](issues/battery-wattage-display.md) |

## 使用方式

每個問題一個檔案,內容包含:
- 症狀 / 如何重現
- 根本原因
- 修復方式(含指令)
- 修復是否會被系統更新覆蓋掉、要注意什麼
- 上游回報連結

## 參考資料

- [shahmir-k/ASUS-ZenBook-Flip-S-UX370UAR](https://github.com/shahmir-k/ASUS-ZenBook-Flip-S-UX370UAR) — 同款硬體（UX370UAR）在 Linux Mint/Cinnamon 上的設定筆記。目前還沒實際處理過跟他一樣的問題,先放著當參考。桌面環境相關部分（Fn 鍵重對應等）不適用 GNOME,但硬體層級的內容未來可能用得到:
  - 電池充電上限 85%（透過 `asus-nb-wmi` 的 `charge_control_end_threshold`,理論上與桌面環境/發行版無關）
  - CPU undervolt（需搭配停用 microcode 更新以繞過 Plundervolt/CVE-2019-11157 緩解措施）
