#!/usr/bin/env python3
"""平板模式虛擬開關 daemon。

透過 uinput 建立一個只回報 SW_TABLET_MODE 的虛擬輸入裝置，讓 GNOME/mutter
把它當成真正的硬體平板模式開關處理（詳見 02c-tablet-mode-button.md 的驗證紀錄）。

由 systemd socket activation 啟動：平常不會有任何行程在跑，只有第一次收到
控制指令時才會被喚醒；切回筆電模式（狀態 0）後閒置 GRACE_SECONDS 秒沒有新
指令，就自動結束、釋放虛擬裝置，交還給下一次連線重新喚醒。

控制協定：透過 /run/tablet-mode-switch.sock 這個 Unix socket，每次連線送一行
純文字指令，daemon 回一行純文字結果後關閉該次連線（daemon 本身繼續留著等下一次
連線）：
  SET 1    -> 切換成平板模式，回覆 "OK 1"
  SET 0    -> 切換成筆電模式，回覆 "OK 0"
  TOGGLE   -> 切換成目前狀態的相反值
  STATUS   -> 不改變狀態，只回報目前值

刻意把指令設計成「設定成某個狀態」而不是寫死給單一按鈕用，是為了讓未來
02b（鉸鏈角度感測器）如果做出來，可以直接當成另一個獨立來源接上同一個
daemon——不管是哪個來源送出指令，最後送達的那個指令就是目前狀態，不需要
額外的優先權/仲裁邏輯。
"""
import socket

from evdev import UInput, ecodes as e

GRACE_SECONDS = 8


def main():
    ui = UInput({e.EV_SW: [e.SW_TABLET_MODE]}, name="virtual-tablet-mode-switch")
    state = 0

    # systemd socket activation：fd 3 是 .socket unit 傳進來的監聽 socket
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM, fileno=3)

    try:
        while True:
            # 平板模式（1）時不設逾時，一直等下一個指令；
            # 筆電模式（0）時，閒置太久就自動結束程式。
            sock.settimeout(GRACE_SECONDS if state == 0 else None)
            try:
                conn, _ = sock.accept()
            except socket.timeout:
                break

            with conn:
                data = conn.recv(64).decode(errors="replace").strip()
                if data == "TOGGLE":
                    state = 0 if state else 1
                elif data in ("SET 0", "SET 1"):
                    state = int(data.split()[1])
                elif data == "STATUS":
                    pass
                else:
                    conn.sendall(b"ERR unknown command\n")
                    continue

                ui.write(e.EV_SW, e.SW_TABLET_MODE, state)
                ui.syn()
                conn.sendall(f"OK {state}\n".encode())
    finally:
        ui.close()


if __name__ == "__main__":
    main()
