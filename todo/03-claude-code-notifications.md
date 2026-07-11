# 3. Claude Code 在終端機完成工作、或等待使用者回覆選項時，跳出系統通知

**狀態**：已完成 Complete
**認領視窗**：2026-07-10 / claude-code-notifications

## 目標

終端機裡的 Claude Code 工作做完、或是卡在等待使用者選擇（例如跳出 1/2/3 選項等回覆）時，要能跳出提示音 + GNOME 系統內建的通知小視窗。

## 背景

這比較像是 Claude Code 本身的設定/hook 問題，不是硬體或 Fedora 系統問題。Claude Code 有 hook 機制可以在特定事件（例如 Stop、等待輸入）時執行自訂指令，理論上可以掛一個會呼叫 `notify-send`（GNOME 通知）+ 播放提示音的指令上去。建議這個項目直接去看 Claude Code 官方的 hooks 文件/設定方式（`settings.json`），不用往 Fedora 系統本身找答案。

## 進度與發現

參考資料：使用者在 Windows 11 上已經有一套可用的做法（PowerShell 播放 `.wav`），機制同樣是掛 `Stop` + `Notification` 這兩個 hook 事件，只是指令換成 Windows 專用的播放方式。詳見 [reference/claude-notification-hook-windows](../reference/claude-notification-hook-windows/README.md)。

### 實際做法（Fedora / GNOME）

發現這台機器沒裝 `paplay`（PulseAudio 指令，Windows 筆記裡查到的建議是這個），改用系統內建的 PipeWire 指令 `pw-play` 播放音效，兩者都用 `notify-send` 跳 GNOME 桌面通知。

全域設定寫在 `~/.claude/settings.json`（套用到所有專案），新增的 `hooks` 區塊：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' '工作完成' && pw-play /usr/share/sounds/freedesktop/stereo/service-logout.oga"
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' '等待你的回覆' && pw-play /usr/share/sounds/freedesktop/stereo/service-login.oga"
          }
        ]
      }
    ]
  }
}
```

- `Stop`（工作完成）→ 播 `service-logout.oga`
- `Notification`（等待使用者回覆，包含權限提示、選擇題等）→ 播 `service-login.oga`
- 兩個音效檔都是系統內建的 `/usr/share/sounds/freedesktop/stereo/` 底下的檔案，不需要額外安裝或攜帶檔案。

**驗證**：實際觸發過一次 Stop（工作完成有跳通知+聲音）與一次 Notification（跳出選擇題有跳通知+聲音），使用者現場確認兩者都正常運作。

**注意事項**：`~/.claude/settings.json` 是使用者層級設定，不受這台筆電硬體影響，理論上换到其他 Linux 機器只要確認 `notify-send`、`pw-play` 存在（或换成該機器上可用的播放指令）就能直接沿用。如果之後系統改用 PulseAudio 而不是 PipeWire，`pw-play` 可能要换回 `paplay`。
