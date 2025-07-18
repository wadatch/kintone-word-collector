// ファイル処理用のユーティリティ
(function(global) {
  'use strict';

  // PDFとDOCXのテキスト抽出は制限があるため、基本的なチェック機能のみ実装
  const FileProcessor = {
    // サポートされているファイルタイプ
    supportedTypes: {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/msword': 'DOC',
      'text/plain': 'TXT'
    },

    // ファイルがサポートされているかチェック
    isSupported: function(contentType) {
      return this.supportedTypes.hasOwnProperty(contentType);
    },

    // ファイルタイプの表示名を取得
    getFileTypeName: function(contentType) {
      return this.supportedTypes[contentType] || 'Unknown';
    },

    // ファイル内容のテキスト抽出（制限付き）
    extractText: function(file) {
      return new Promise(function(resolve, reject) {
        if (!file || !file.contentType) {
          reject(new Error('無効なファイルです'));
          return;
        }

        const fileType = FileProcessor.getFileTypeName(file.contentType);
        
        // テキストファイルの場合は実際に読み込み可能
        if (file.contentType === 'text/plain') {
          // Kintone APIを使用してファイル内容を取得
          kintone.api(kintone.api.url('/k/v1/file', true), 'GET', {
            fileKey: file.fileKey
          }).then(function(response) {
            // バイナリデータからテキストを抽出
            try {
              const text = response; // 実際の実装では適切な変換が必要
              resolve(text);
            } catch (error) {
              reject(new Error('テキスト抽出に失敗しました'));
            }
          }).catch(function(error) {
            reject(error);
          });
        } else {
          // PDF/DOCXの場合はファイル情報のみ提供
          const message = fileType + 'ファイルが検出されました。\n' +
                         'ファイル名: ' + file.name + '\n' +
                         'このファイルタイプは現在テキスト抽出をサポートしていません。\n' +
                         '内容を確認して必要に応じて修正・再アップロードしてください。';
          
          resolve({
            isFileInfo: true,
            message: message,
            fileName: file.name,
            fileType: fileType
          });
        }
      });
    },

    // ファイルフィールドの値からテキストを抽出
    processFileField: function(fieldValue) {
      if (!fieldValue || !Array.isArray(fieldValue)) {
        return Promise.resolve([]);
      }

      const promises = fieldValue.map(function(file) {
        if (FileProcessor.isSupported(file.contentType)) {
          return FileProcessor.extractText(file);
        } else {
          return Promise.resolve({
            isFileInfo: true,
            message: 'サポートされていないファイル形式です: ' + file.name,
            fileName: file.name,
            fileType: 'Unsupported'
          });
        }
      });

      return Promise.all(promises);
    }
  };

  // グローバルに公開
  global.FileProcessor = FileProcessor;

})(this);