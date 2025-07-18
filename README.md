# Kintone Word Collector (文言チェッカー)

[![Build Status](https://github.com/wadatch/kintone-word-collector/actions/workflows/build.yml/badge.svg)](https://github.com/wadatch/kintone-word-collector/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

日本語文章の表記ゆれや不適切な表現をチェック・修正提案するKintoneプラグインです。

## 機能

- **67個の表記ゆれチェック**: 一般的な日本語表記の問題を自動検出
- **保存時の自動置換ダイアログ**: レコード保存時に問題を検出し、修正を提案
- **フィールド選択可能な設定画面**: チェック対象のフィールドを自由に選択
- **リアルタイム表示**: 編集中にも問題箇所をハイライト表示
- **ファイル添付フィールド対応**: PDF・DOCXファイルの文字列チェック機能

## インストール方法

1. [Releases](https://github.com/wadatch/kintone-word-collector/releases) から最新の `kintone-word-collector.zip` をダウンロード
2. Kintone管理画面でプラグインをアップロード
3. アプリにプラグインを追加
4. プラグイン設定でチェック対象フィールドを選択

## 開発

### 必要な環境

- Node.js 18以上
- npm

### セットアップ

```bash
git clone https://github.com/wadatch/kintone-word-collector.git
cd kintone-word-collector
npm install
```

### ビルド

```bash
npm run package
```

生成されるファイル: `plugin.zip`

### 秘密鍵の管理

プラグインのビルドには秘密鍵が必要です。GitHub Actionsでは `PLUGIN_PRIVATE_KEY` として設定してください。
開発環境では `ienmacjkmpbhkikakmnieiekgemiloaj.ppk` を使用します。

## 対応機能

### チェック対象フィールド

- 文字列（1行）
- 文字列（複数行）
- リッチエディター
- ファイル添付フィールド（PDF、DOCX）

### ファイル添付フィールドの対応

プラグインはファイル添付フィールドの以下の形式をサポートします：

- **PDF**: `application/pdf`
- **DOCX**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

ファイル内のテキストを抽出して文言チェックを行います。

## 正誤対照表

正誤対照表は `src/data/correction-table.csv` で管理されています。このCSVファイルから自動的にJavaScriptファイルが生成され、プラグインで使用されます。

### 正誤対照表の編集

1. `src/data/correction-table.csv` を編集
2. `npm run generate-table` を実行してJavaScriptファイルを生成
3. プラグインをビルド

### 正誤対照表の内容

CSVファイルには以下の67個の変換ルールが定義されています：

| 誤表記             | 正表記       |
|----------------------|--------------------|
| 挨拶                 | あいさつ           |
| 敢えて               | あえて             |
| 当たって             | あたって           |
| 予め                 | あらかじめ         |
| 有難う御座います     | ありがとうございます |
| 有る                 | ある               |
| 或いは               | あるいは           |
| 如何に               | いかに             |
| 幾つ                 | いくつ             |
| 致します             | いたします         |
| 頂く                 | いただく           |
| 何時                 | いつ               |
| 一杯                 | いっぱい           |
| 未だ                 | いまだ             |
| 居る                 | いる               |
| 色々                 | いろいろ           |
| 曰く                 | いわく             |
| 概ね                 | おおむね           |
| 凡そ                 | おおよそ           |
| 及び                 | および             |
| お願い致します       | お願いいたします   |
| 且つ                 | かつ               |
| 下さい               | ください           |
| 位                   | くらい             |
| 事                   | こと               |
| 毎                   | ごと               |
| 様々                 | さまざま           |
| 更に                 | さらに             |
| 直ぐに               | すぐに             |
| 既に                 | すでに             |
| 即ち                 | すなわち           |
| 是非                 | ぜひ               |
| 大分                 | だいぶ             |
| 沢山                 | たくさん           |
| 但し                 | ただし             |
| 為                   | ため               |
| 出来る               | できる             |
| 通り                 | とおり             |
| 何処                 | どこ               |
| 等                   | など               |
| 成る                 | なる               |
| 殆ど                 | ほとんど           |
| 参る                 | まいる             |
| 先ず                 | まず               |
| 又                   | また               |
| 迄                   | まで               |
| 尤も                 | もっとも           |
| 物                   | もの               |
| 様                   | よう               |
| 宜しく               | よろしく           |
| 僅か                 | わずか             |
| する時               | するとき           |
| の様に               | のように           |
| 子供                 | 子ども             |
| 子供達               | 子ども達           |
| 私達                 | 私たち             |
| 父兄・父母           | 保護者             |
| 母子家庭・父子家庭   | ひとり親家庭       |
| 障害者               | 障がい者・障碍者   |
| HP                   | ホームページ       |

## ライセンス

MIT License

Copyright (c) 2025 wadatch

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 技術仕様

### プラグインの構成

```
src/
├── manifest.json          # プラグインの設定
├── css/
│   └── style.css          # プラグイン用のスタイル
├── js/
│   ├── desktop.js         # メイン処理
│   ├── config.js          # 設定画面
│   ├── file-processor.js  # ファイル処理（PDF/DOCX）
│   └── correction-table.js # 正誤対照表（自動生成）
├── html/
│   └── config.html        # 設定画面のHTML
├── data/
│   └── correction-table.csv # 正誤対照表のデータ
└── image/
    └── icon.png           # プラグインアイコン
```

### 使用ライブラリ

- jQuery 3.6.0
- Kintone JavaScript API
- @kintone/plugin-packer（ビルド用）
- @kintone/plugin-uploader（開発用）

### 開発コマンド

```bash
# 正誤対照表の自動生成
npm run generate-table

# プラグインのビルド（正誤対照表の生成も含む）
npm run package

# プラグインのアップロード（開発用）
npm run upload
```

## 貢献

Issue や Pull Request は歓迎します。

## 作者

wadatch
