# CrossPad Converter: スマホコントローラー to DUALSHOCK / Switch

スマホ用Bluetoothコントローラーの入力を診断・マッピングするツールです。Android版ではネイティブBLE通信に加え、**Shizuku + Android uinput経由の実験的な仮想DS4互換ゲームパッド**を試せます。V3の実機入力形式、DS4互換性、別ゲームでの利用は未検証です。

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
- このAPKはWebViewを基盤としますが、Bluetooth LE用の**ネイティブAndroidプラグインを追加済み**です。Android実機での動作検証は未実施です。WebHIDはWebViewからの利用を保証しません。
---

## Android（root不要）でのBLE入力診断

新しいAPKでは、Android WebView上のWeb Bluetoothに依存せず、AndroidネイティブのBLEスキャンとGATT通知取得を試せます。

1. APKをインストールし、AndroidでBluetoothをオンにします。
2. **入力デバイス → 接続する → Bluetooth** を開き、初回は「付近のデバイス」を許可します。
3. 一覧からV3に該当するBLE機器を選び、**接続** を押します。
4. 変換モニターの「Android ネイティブBLE診断モード」で、受信件数・バイト数・特性UUID・HEXデータを確認します。
5. AndroidのBluetooth設定で通常のゲームパッドとしてペアリング済みの場合は **OS認識を更新** で、Androidが列挙するInputDeviceを確認できます。

**制約と判定基準**
- この段階で実装されているのは **BLEスキャン／接続／GATT通知／入力診断** です。実機V3のサービスUUIDやパケット形式は検証されておらず、接続できるとは限りません。端末やコントローラーによってはBLEではなく別のBluetooth/HID接続方式が必要です。
- 16バイトのV3形式を前提とする既存パーサーはありますが、対応する実機形式であることの確認が必要です。未知の入力形式はRAW HEXとして確認し、形式を決めつけません。
- Androidの**通常APK単独**では、他アプリにDS4入力を送れません。新たに**Shizukuのshell権限からuinputを操作して仮想ゲームパッドを作る試験機能**を追加しました。ただしこの機能は端末側のuinput権限・SELinux設定、ゲーム側の入力対応に依存し、公式DS4と完全一致するHID実装ではありません。Nothing Phone (4a) Proでは未検証です。
- Androidが元のV3を標準Gamepadとして認識した場合でも、DUALSHOCK 4として認識されたことを意味しません。
- AndroidのBluetooth HID Device APIは**他のホスト機器へ**入力する機能です。同じAndroid端末内のゲームに対するDS4偽装とは異なります。
- 操作入力を他のAndroidアプリへ渡す方法の評価には、実機の入力方式と、対象ゲームの標準Gamepad対応状況を確認する必要があります。

## Shizukuを使った仮想DS4テスト（実験機能）

Androidの標準ゲームパッドとして認識させる手段を検証するため、Android本体をroot化せずにShizukuのADB shell権限から `/dev/uinput` を利用する試験機能を作成しました。

1. [Shizuku公式サイト](https://shizuku.rikka.app/download/)からインストールします。
2. Androidの**開発者向けオプション → ワイヤレスデバッグ**を有効化し、Shizukuの公式手順でサービスを起動します（再起動後は起動し直す必要があります）。
3. CrossPadの「Shizukuで仮想DS4をテスト」欄で**状況を確認 → 権限を許可 → 仮想DS4を作成**を選びます。
4. **入力デバイス → OS認識を更新**で、Androidが仮想InputDeviceを認識したか確認します。もし作成に失敗したら、画面に表示される `uid` と `/dev/uinput` の確認結果を調べます。
5. 機能テスト後は**仮想DS4を停止**してください。

**注意:** これはuinputによるDS4互換の入力イベントテストであり、SonyのBluetoothペアリング・タッチパッド・ジャイロ・振動などを再現する完全なDUALSHOCK 4 HIDスタックではありません。DS4としてゲームに認識されるか、他アプリへの入力が継続するか、V3実機との統合については未検証です。Androidの入出力・省電力制約によりバックグラウンドでBLE更新が止まる可能性があります。uinputへのアクセスが禁止される端末ではroot化せずにこの方式を使えない場合があります。

コードの参考資料：[Android uinput公式使用方法](https://android.googlesource.com/platform/frameworks/base/+/HEAD/cmds/uinput/README.md)、[Shizuku公式API](https://github.com/RikkaApps/Shizuku-API)。

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
