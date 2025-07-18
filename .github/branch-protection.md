# ブランチ保護ルールの設定

mainブランチを保護するため、以下の設定を GitHub Web UI で行ってください。

## 設定手順

1. リポジトリの **Settings** → **Branches** に移動
2. **Add rule** をクリック
3. 以下の設定を行う:

### Branch name pattern
```
main
```

### 保護ルール
- [x] **Require a pull request before merging**
  - [x] **Require approvals**: 1人以上
  - [x] **Dismiss stale pull request approvals when new commits are pushed**
  - [x] **Require review from code owners** (CODEOWNERS ファイルがある場合)

- [x] **Require status checks to pass before merging**
  - [x] **Require branches to be up to date before merging**
  - Status checks to require:
    - `build` (GitHub Actionsの build job)

- [x] **Require conversation resolution before merging**

- [x] **Require signed commits** (推奨)

- [x] **Require linear history** (推奨)

- [x] **Include administrators** (管理者にも適用)

- [x] **Restrict pushes that create files**
  - Path: `**/*.ppk` (秘密鍵ファイルの直接プッシュを防ぐ)

## 効果

この設定により:
- mainブランチへの直接プッシュが禁止される
- すべての変更はPR経由で行われる
- PR作成時にビルドテストが実行される
- PRマージ時のみリリースが作成される