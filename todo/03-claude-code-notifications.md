# 3. Claude Code 在終端機完成工作、或等待使用者回覆選項時，跳出系統通知

**狀態**：進行中
**認領視窗**：2026-07-10 / claude-code-notifications

## 目標

終端機裡的 Claude Code 工作做完、或是卡在等待使用者選擇（例如跳出 1/2/3 選項等回覆）時，要能跳出提示音 + GNOME 系統內建的通知小視窗。

## 背景

這比較像是 Claude Code 本身的設定/hook 問題，不是硬體或 Fedora 系統問題。Claude Code 有 hook 機制可以在特定事件（例如 Stop、等待輸入）時執行自訂指令，理論上可以掛一個會呼叫 `notify-send`（GNOME 通知）+ 播放提示音的指令上去。建議這個項目直接去看 Claude Code 官方的 hooks 文件/設定方式（`settings.json`），不用往 Fedora 系統本身找答案。

## 進度與發現

（尚無記錄）
