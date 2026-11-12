# CrossPad Converter: スマホコントローラー to DUALSHOCK / Switch

スマホ画面マッピング式Bluetoothコントローラー（**ShootingPlus V3**、Flydigi、GameSirなど）のBLE通知パケットを、**DUALSHOCK 4 (PS4)** および **Nintendo Switch Proコントローラー** のHID標準信号にリアルタイム変換・エミュレーション・ハードウェア/ソフトウェアブリッジ出力するアプリケーションです。

---

## 📱 Android APKの自動ビルドについて (GitHub Actions)

本リポジトリには **GitHub Actions 自動ビルドワークフロー (`.github/workflows/build-apk.yml`)** が内蔵されています。

### APKの入手方法（超簡単・完全自動）：
1. このリポジトリをご自身のGitHubアカウントにPushまたはForkします。
2. GitHubリポジトリの **「Actions」タブ** を開きます。
3. 自動的に `Build & Package Android APK` ワークフローが走り、約2分でビルドが完了します。
4. 完了したワークフローの **「Artifacts（成果物）」** に `CrossPad-Android-APK` (`app-debug.apk`) が出力されるので、クリックしてダウンロードしてください！
5. または **「Releases」タブ** から直接 `app-debug.apk` をダウンロードできます。

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
