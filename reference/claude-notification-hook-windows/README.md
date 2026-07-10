# Claude Code 完成提示音設定 (Notification Sound Hook)

## 環境版本
- **作業系統**: Windows 11 Home, Build 10.0.26200
- **Claude Code 版本**: 2.1.206
- **設定檔位置**: `C:\Users\<使用者名稱>\.claude\settings.json`（全域設定，套用到所有專案）

## 這是什麼
Claude Code 支援 hooks（掛鉤），可以在特定事件發生時自動執行 shell 指令。
這個設定讓 Claude 在以下兩個時機自動播放提示音，這樣不用一直盯著螢幕看有沒有做完：

| 事件 | 觸發時機 |
|---|---|
| `Stop` | Claude 完成一次回應、停下來的時候 |
| `Notification` | Claude Code 跳出通知時（例如等待你確認權限） |

## 隨附檔案
- `Windows Logon.wav`：Windows 內建音效檔（原始路徑：`C:\Windows\Media\Windows Logon.wav`），已複製一份放在這個資料夾方便攜帶。

## 套用步驟（在新電腦上）

1. 把這個資料夾整個複製到新電腦上任一位置，例如 `C:\Users\<使用者名稱>\claude-notification-hook-setup\`。
   （或者直接把 `Windows Logon.wav` 複製到新電腦的 `C:\Windows\Media\` 底下，因為 Windows 通常內建就有這個檔案，也可以不用複製，直接沿用系統內建路徑。）

2. 開啟（或建立）全域設定檔：
   ```
   C:\Users\<使用者名稱>\.claude\settings.json
   ```

3. 在 JSON 裡加入（或合併）以下 `hooks` 區塊。**注意**：如果 `settings.json` 已經有其他內容（例如 `permissions`），要小心合併，不要整個覆蓋掉。

   ```json
   {
     "hooks": {
       "Stop": [
         {
           "matcher": "",
           "hooks": [
             {
               "type": "command",
               "command": "powershell -NoProfile -c \"(New-Object Media.SoundPlayer 'C:\\Windows\\Media\\Windows Logon.wav').PlaySync()\""
             }
           ]
         }
       ],
       "Notification": [
         {
           "matcher": "",
           "hooks": [
             {
               "type": "command",
               "command": "powershell -NoProfile -c \"(New-Object Media.SoundPlayer 'C:\\Windows\\Media\\Windows Logon.wav').PlaySync()\""
             }
           ]
         }
       ]
     }
   }
   ```

4. 如果音效檔案放的路徑跟原電腦不一樣，記得把 `command` 裡的路徑 `C:\Windows\Media\Windows Logon.wav` 改成新電腦上實際的檔案路徑（路徑中的反斜線在 JSON 字串裡要寫成 `\\`）。

5. 儲存後重新開啟 Claude Code，就會在完成回應或跳出通知時自動播放音效。

## 技術說明
- 指令使用 PowerShell 的 `System.Media.SoundPlayer` 物件播放 `.wav` 檔。
- `PlaySync()` 是同步播放，會等音效播完才讓 hook 指令結束（用 `Play()` 則是非同步、不等待）。
- 此做法僅適用於 **Windows**（依賴 PowerShell 與 Windows Media 音效檔），不適用於 macOS / Linux。
- `matcher: ""` 代表不篩選，任何 Stop / Notification 事件都會觸發。
