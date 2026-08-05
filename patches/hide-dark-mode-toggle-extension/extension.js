/* 隱藏系統選單裡的「深色模式」快速切換按鈕。
 *
 * GNOME Shell 把這顆按鈕放在 quickSettings._darkMode 這個 indicator 底下
 * （見 ui/panel.js 的 this._darkMode = new DarkModeStatus.Indicator()）。
 * 它沒有把 visible 綁到任何屬性上，所以直接 hide() 就會一直維持隱藏。
 *
 * 停用這個擴充套件會把按鈕還原顯示，不會留下任何殘留設定。
 */
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class HideDarkModeToggleExtension extends Extension {
    enable() {
        // _darkMode 是 GNOME Shell 的內部欄位，未來版本改名的話這裡會抓不到，
        // 那時按鈕只會重新出現，不會讓 GNOME Shell 出錯。
        const indicator = Main.panel.statusArea.quickSettings?._darkMode;
        this._hidden = indicator?.quickSettingsItems ?? [];
        this._hidden.forEach(item => item.hide());
    }

    disable() {
        this._hidden?.forEach(item => item.show());
        this._hidden = null;
    }
}
