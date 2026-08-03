/* 平板模式切換按鈕（GNOME quick settings toggle）。
 *
 * 按鈕本身不直接操作 uinput，只是把「要切成哪個狀態」透過
 * /run/tablet-mode-switch.sock 送給背景 daemon（見 tablet-mode-switchd.py）。
 * daemon 由 systemd socket activation 管理，平常不在跑，這裡連上去時才會被喚醒。
 */
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const SOCKET_PATH = '/run/tablet-mode-switch.sock';

// 送一行指令給 daemon，並把回覆的狀態值（0/1）傳給 callback。
// 全程非同步，避免卡住 GNOME Shell 主執行緒。
function sendCommand(command, callback) {
    const client = new Gio.SocketClient();
    const address = new Gio.UnixSocketAddress({path: SOCKET_PATH});

    client.connect_async(address, null, (source, result) => {
        let connection;
        try {
            connection = client.connect_finish(result);
        } catch (e) {
            logError(e, 'tablet-mode-toggle: 無法連線到 daemon');
            return;
        }

        try {
            connection.get_output_stream().write(command, null);
            const reply = new Gio.DataInputStream({
                base_stream: connection.get_input_stream(),
            });
            reply.read_line_async(0, null, (stream, res) => {
                let line = null;
                try {
                    [line] = stream.read_line_finish_utf8(res);
                } catch (e) {
                    logError(e, 'tablet-mode-toggle: 讀取回覆失敗');
                }
                connection.close(null);
                // 回覆格式是 "OK 0" / "OK 1"
                if (callback && line?.startsWith('OK '))
                    callback(line.trim().split(' ')[1] === '1');
            });
        } catch (e) {
            logError(e, 'tablet-mode-toggle: 送出指令失敗');
        }
    });
}

const TabletModeToggle = GObject.registerClass(
class TabletModeToggle extends QuickSettings.QuickToggle {
    _init() {
        super._init({
            title: '平板模式',
            iconName: 'input-tablet-symbolic',
            toggleMode: true,
        });

        // 開機/重載後同步一次目前狀態，避免按鈕顯示跟實際狀態不一致
        // （例如 02b 的角度感測器之後也會改動同一個開關）。
        this._syncing = true;
        sendCommand('STATUS', (isOn) => {
            this.checked = isOn;
            this._syncing = false;
        });

        this.connect('notify::checked', () => {
            if (this._syncing)
                return;
            sendCommand(this.checked ? 'SET 1' : 'SET 0');
        });
    }
});

export default class TabletModeExtension extends Extension {
    enable() {
        this._indicator = new QuickSettings.SystemIndicator();
        this._toggle = new TabletModeToggle();
        this._indicator.quickSettingsItems.push(this._toggle);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator?.quickSettingsItems.forEach(item => item.destroy());
        this._indicator?.destroy();
        this._indicator = null;
        this._toggle = null;
    }
}
