#!/usr/bin/env node
/**
 * CSVファイルから正誤対照表のJavaScriptファイルを生成するスクリプト
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '../src/data/correction-table.csv');
const OUTPUT_FILE = path.join(__dirname, '../src/js/correction-table.js');

function generateCorrectionTableJS() {
  try {
    // CSVファイルを読み込み
    const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // ヘッダー行をスキップ
    const dataLines = lines.slice(1);
    
    // JavaScriptオブジェクトを生成
    const corrections = [];
    dataLines.forEach(line => {
      const [incorrect, correct] = line.split(',');
      if (incorrect && correct) {
        corrections.push(`  '${incorrect}': '${correct}'`);
      }
    });
    
    // JavaScriptファイルの内容を生成
    const jsContent = `// 正誤対照表データ
// このファイルは src/data/correction-table.csv から自動生成されます

const CORRECTION_TABLE = {
${corrections.join(',\n')}
};`;
    
    // ファイルを書き込み
    fs.writeFileSync(OUTPUT_FILE, jsContent, 'utf8');
    
    console.log(`✅ 正誤対照表JavaScriptファイルを生成しました: ${OUTPUT_FILE}`);
    console.log(`📊 ${corrections.length}件の変換ルールを処理しました`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// メイン処理
if (require.main === module) {
  generateCorrectionTableJS();
}

module.exports = generateCorrectionTableJS;