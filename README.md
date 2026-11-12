# CrossPad Converter: スマホコントローラー to DUALSHOCK / Switch

スマホ画面マッピング式Bluetoothコントローラー（**ShootingPlus V3**、Flydigi、GameSirなど）のBLE通知パケットを、**DUALSHOCK 4 (PS4)** および **Nintendo Switch Proコントローラー** のHID標準信号にリアルタイム変換・エミュレーション・ハードウェア/ソフトウェアブリッジ出力するアプリケーションです。

---

## 📱 Android APKの自動ビルド（GitHub Actions）

このリポジトリは **React / Vite → Capacitor → Android APK** の順にGitHub Actionsでビルドします。Node.js 22、Java 21、Android SDK 36を使用します。

### スマホにインストールする手順

1. [ControllerMap の Actions](https://github.com/yuki19990315-hub/ControllerMap/actions/workflows/build-apk.yml) を開く。
2. 「Build Android APK」の実行履歴から、**緑のチェックが付いた成功済みの実行**を開く。必要なら「Run workflow」で実行する。
3. ページ下部の **Artifacts → CrossPad-Android-APK** をダウンロードする（ZIP形式）。
4. Androidスマホの「ファイル」アプリでZIPを解凍し、**app-debug.apk** を開いてインストールする。求められた場合は、そのファイルを開いたアプリに限り「この提供元のアプリを許可」を有効にする。

- 成果物の保存期間は30日です。**Releasesには自動配布しません。**
- 生成するのはテスト用の**デバッグ署名付きAPK**です。
- このAPKはWebアプリをAndroid WebViewで表示します。**Web Bluetooth / WebHIDはAndroid WebViewでそのまま動作するとは限らず、Bluetooth接続やゲームパッド変換機能の実機動作は未確認**です。ネイティブBLE/HIDを利用するには別途Android実装が必要です。
---

## 🌟 主な機能

1. **ShootingPlus V3 自由ボタン再配置 (Remapping)**:
   - V3の全15物理ボタン（A/B/X/Y/L1/R1/L2/R2/L3/R3/十字キー/SELECT/START/HOME）を、DUALSHOCK 4やSwitch Proのボタンへ1対1で直感的に割り当て。
   - スティックの反転・左右スワップ、クイックプリセット（標準、FPS、コンソール直結）。
2. **リアルタイムDUALSHOCK 4 & Switch Proビジュアライザー**:
   - 押されたボタンやアナログスティックの傾き、L2/R2トリガー圧をリアルタイムSVGで可視化。
3. **仮想スマホ画面マッピングスタジオ**:
   - アスペクト比20:9の仮想スマホ画面上でタッチノードをドラッグ配置。
4. **スティック感度・デッドゾーン・ジャイロ照準チューニング**:
   - リニア/指数/S字カーブ、デッドゾーン補正、ジャイロによる右スティック視点操作。
5. **BLE & HID パケットインスペクター**:
   - 16バイトShootingPlus V3 BLE GATTパケットと64バイトDS4 / 49バイトSwitch HIDレポートのリアルタイム生ログ表示。
6. **コード出力（PCブリッジ & マイコン）**:
   - Python ViGEm仮想ゲームパッドブリッジスクリプト
   - ESP32 Bluetooth HIDハードウェアファームウェア（Arduino C++）

---

## 🛠️ ローカルでの起動方法

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動 (ポート 3000)
npm run dev

# プロダクションビルド
npm run build
```

---

## 💻 動作環境
- **Web**: Google Chrome, Microsoft Edge, Brave（Web Bluetooth / WebHID対応ブラウザ）
- **Android**: Android 8.0以上（APKまたはChrome PWA）
