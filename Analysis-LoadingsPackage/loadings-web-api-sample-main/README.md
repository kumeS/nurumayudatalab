---
title: Loadings Web API Sample
emoji: 🚀
colorFrom: gray
colorTo: indigo
sdk: docker
pinned: false
license: mit
---

# Loadings Web API サンプル

## プロジェクト概要

このプロジェクトは、主成分分析（PCA）の因子負荷量検定を行うWeb APIです。R言語のloadingsパッケージとplumberパッケージを使用して、統計解析をWeb API経由で実行できるサービスを提供します。

### 主な機能

- **CSVファイルアップロード**: カスタムデータの解析が可能
- **主成分分析 (PCA)**: データの次元削減と可視化
- **因子負荷量検定**: 統計的有意性の評価
- **データエクスポート**: 解析結果のダウンロード
- **リアルタイムビジュアライゼーション**: biplot、因子負荷量分布、p値分布の生成

## セットアップ

### 方法1: Nix環境を利用

Nixを使用した環境構築：

> [!WARNING]
> Nixがインストールされている必要があります。

```sh
# 環境構築
nix-shell

# Web API起動
cd src
Rscript api-integrated.R
```

### 方法2: Docker環境を利用

```sh
# Docker Composeでサービス起動
docker-compose up -d
```

## API エンドポイント仕様

### ベースURL
- ローカル: `http://127.0.0.1:7860`
- Hugging Face Spaces: `https://myxogastria0808-loadings-web-api-sample.hf.space`

### 1. データアップロード

#### CSVファイルアップロード
```
POST /upload/csv
Content-Type: multipart/form-data

Parameters:
- file: CSVファイル（必須）

Response:
- data_id: アップロードされたデータの識別子
- data_summary: データの基本統計情報
```

#### データ要約統計取得
```
GET /data/summary/{data_id}
POST /data/summary

Response:
- データの次元、列名、基本統計量
- 相関行列
- データ品質評価
```

### 2. PCA解析

#### カスタムデータでPCA実行
```
POST /analyze/pca-custom

Parameters:
- data_id: データ識別子（必須）
- scale: データ標準化フラグ（デフォルト: true）
- center: データ中心化フラグ（デフォルト: true）

Response:
- biplot画像（Base64エンコード）
- 主成分別の因子負荷量・p値プロット
- 寄与率、固有値などの統計情報
```

#### 因子負荷量分析
```
POST /analyze/correlation-custom/{component}

Parameters:
- data_id: データ識別子
- component: 主成分番号（1-10）

Response:
- 因子負荷量分布プロット
- 上位・下位変数のランキング
```

#### p値分析
```
POST /analyze/pvalue-custom/{component}

Parameters:
- data_id: データ識別子
- component: 主成分番号（1-10）

Response:
- p値分布プロット
- 統計的有意性の詳細情報
```

### 3. 従来のテストデータ解析

#### PCA Biplot生成
```
GET /pca

Response: PNG画像（800x800px）
テストデータ（fasting）を使用したbiplot
```

#### 因子負荷量分布
```
GET /correlation-coefficien/{number}

Parameters:
- number: 主成分番号（1-10の整数）

Response: PNG画像（800x800px）
指定した主成分の因子負荷量分布バープロット
```

#### p値分布
```
GET /p-value/{number}

Parameters:
- number: 主成分番号（1-10の整数）

Response: PNG画像（800x800px）
指定した主成分のp値分布バープロット
```

### 4. ユーティリティ

#### データエクスポート
```
GET /export/data/{data_id}

Parameters:
- include_analysis: 解析結果を含むか（オプション）

Response: CSV形式のデータファイル
```

#### ヘルスチェック
```
GET /health

Response:
- APIステータス
- 利用可能機能一覧
- バージョン情報
```

#### 解析結果取得
```
GET /results/{analysis_id}

Response: 指定した解析IDの詳細結果
```

## 技術仕様

### 使用技術
- **R**: 統計解析エンジン
- **plumber**: Web APIフレームワーク
- **loadings**: 因子負荷量検定パッケージ
- **Docker**: コンテナ化
- **Nix**: 再現可能な開発環境

### データ処理
- CSV形式のデータ自動検証
- 欠損値の自動処理
- 数値データの自動抽出
- 外れ値検出とレポート

### セキュリティ機能
- CORS対応
- 一時データの自動クリーンアップ（24時間）
- ファイル形式検証

## Swagger UI

API仕様書とテスト環境：
- ローカル: `http://127.0.0.1:7860/__docs__/#/`
- Hugging Face Spaces: `https://myxogastria0808-loadings-web-api-sample.hf.space/__docs__/#/`

![Swagger UI](https://github.com/user-attachments/assets/1eab9119-daf5-43fc-9418-3dacc7bded11)

## 使用例

### 1. CSVデータをアップロードしてPCA解析

```bash
# 1. CSVファイルをアップロード
curl -X POST -F "file=@data.csv" http://127.0.0.1:7860/upload/csv

# 2. レスポンスのdata_idを使用してPCA実行
curl -X POST -d '{"data_id":"data_20240101_120000_1234"}' \
  -H "Content-Type: application/json" \
  http://127.0.0.1:7860/analyze/pca-custom
```

### 2. 特定の主成分の因子負荷量分析

```bash
curl -X POST -d '{"data_id":"data_20240101_120000_1234"}' \
  -H "Content-Type: application/json" \
  http://127.0.0.1:7860/analyze/correlation-custom/1
```

## 参考資料

- [R plumber公式ドキュメント](https://www.rplumber.io/articles/rendering-output.html)
- [loadingsパッケージ](https://cran.r-project.org/package=loadings)
- [主成分分析の理論](https://ja.wikipedia.org/wiki/主成分分析)
