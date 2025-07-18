jQuery.noConflict();
(function($, PLUGIN_ID) {
  'use strict';

  const CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);
  
  // 正誤対照表は correction-table.js から読み込み
  const WORD_MAP = CORRECTION_TABLE;

  // mammothとPDF.jsライブラリを初期化
  function initializeLibraries() {
    return new Promise(function(resolve) {
      const promises = [];
      
      // mammothの初期化
      if (typeof FileProcessor !== 'undefined' && typeof FileProcessor.loadMammoth === 'function') {
        promises.push(
          FileProcessor.loadMammoth().then(function(mammoth) {
            console.log('mammoth初期化完了');
          }).catch(function(error) {
            console.warn('mammoth初期化失敗:', error);
          })
        );
      }
      
      // PDF.jsの初期化
      if (typeof FileProcessor !== 'undefined' && typeof FileProcessor.loadPDFjs === 'function') {
        promises.push(
          FileProcessor.loadPDFjs().then(function(pdfjsLib) {
            console.log('PDF.js初期化完了');
          }).catch(function(error) {
            console.warn('PDF.js初期化失敗:', error);
          })
        );
      }
      
      Promise.all(promises).then(function() {
        console.log('ライブラリ初期化完了');
        resolve();
      }).catch(function(error) {
        console.warn('ライブラリ初期化でエラーが発生しましたが、処理を続行します:', error);
        resolve(); // エラーでも処理を続行
      });
    });
  }

  function checkWords(text) {
    const issues = [];
    
    Object.keys(WORD_MAP).forEach(function(incorrectWord) {
      const regex = new RegExp(incorrectWord, 'g');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        issues.push({
          word: incorrectWord,
          suggestion: WORD_MAP[incorrectWord],
          position: match.index
        });
      }
    });
    
    return issues.sort((a, b) => a.position - b.position);
  }

  function checkFileField(fieldCode, files, fieldLabel, fieldElement) {
    if (!files || files.length === 0) {
      return Promise.resolve();
    }

    console.log('ファイルフィールドチェック開始:', fieldLabel, files.length + '個のファイル');

    const filePromises = files.map(function(file) {
      if (FileProcessor.isSupported(file.contentType)) {
        return FileProcessor.extractText(file).then(function(result) {
          if (result.isText) {
            const issues = checkWords(result.text);
            console.log('誤表記チェック結果:', file.name, issues.length + '件の問題');
            if (issues.length > 0) {
              console.log('誤表記発見:', file.name, issues);
              return {
                fileName: file.name,
                issues: issues,
                hasErrors: true
              };
            }
          }
          return {
            fileName: file.name,
            hasErrors: false
          };
        }).catch(function(error) {
          console.error('ファイル処理エラー:', file.name, error);
          return {
            fileName: file.name,
            hasErrors: false,
            error: error.message
          };
        });
      } else {
        return Promise.resolve({
          fileName: file.name,
          hasErrors: false
        });
      }
    });

    return Promise.all(filePromises).then(function(results) {
      // エラーがあるファイルを収集
      const filesWithErrors = results.filter(function(result) {
        return result && result.hasErrors;
      });
      
      if (filesWithErrors.length > 0) {
        console.log('警告表示対象ファイル:', filesWithErrors.length + '個');
        setTimeout(function() {
          showMultipleFileWarnings(fieldElement, fieldLabel, filesWithErrors);
        }, 100);
      }
      
      return results;
    });
  }

  function showTextFieldWarning(fieldLabel, issues) {
    console.log('テキストフィールド警告表示:', fieldLabel, issues.length + '件の問題');
    
    // ヘッダーメニューエリアに警告を表示
    const headerSpace = kintone.app.record.getHeaderMenuSpaceElement();
    if (!headerSpace) {
      console.error('ヘッダーメニューエリアが見つかりません');
      return;
    }

    // 警告メッセージのHTML文字列を作成
    let warningHtml = `
      <div class="word-collector-text-warning" style="
        background-color: #e3f2fd;
        border: 1px solid #90caf9;
        border-radius: 6px;
        padding: 15px;
        margin: 10px 0;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <div style="
          color: #0d47a1;
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 16px;
        ">
          📝 テキストフィールドに誤表記が見つかりました (${issues.length}件)
        </div>
        <div style="
          color: #495057;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 12px;
          padding: 8px 12px;
          background-color: #e9ecef;
          border-radius: 4px;
          border-left: 4px solid #2196f3;
        ">
          📝 フィールド: ${fieldLabel}
        </div>
        <div style="
          margin-bottom: 15px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
          border-left: 4px solid #2196f3;
        ">
          <div style="
            color: #495057;
            font-size: 13px;
            line-height: 1.6;
          ">
            ${issues.slice(0, 5).map(issue => 
              `"<span style="color: #dc3545; font-weight: bold;">${issue.word}</span>" → "<span style="color: #28a745; font-weight: bold;">${issue.suggestion}</span>"`
            ).join('<br>')}
            ${issues.length > 5 ? '<br><span style="color: #6c757d;">他 ' + (issues.length - 5) + ' 件...</span>' : ''}
          </div>
        </div>
      </div>
    `;

    // ヘッダーメニューエリアに挿入
    $(headerSpace).append(warningHtml);
    
    console.log('✅ テキストフィールド警告を表示しました:', fieldLabel, issues.length + '件');
  }

  function showMultipleFileWarnings(fieldElement, fieldLabel, filesWithErrors) {
    console.log('複数ファイル警告表示:', filesWithErrors.length + '個のファイル');
    
    // 既存のファイル警告を削除（テキスト警告は残す）
    $('.word-collector-file-warning').remove();

    // ヘッダーメニューエリアに警告を表示
    const headerSpace = kintone.app.record.getHeaderMenuSpaceElement();
    if (!headerSpace) {
      console.error('ヘッダーメニューエリアが見つかりません');
      return;
    }

    // 総問題数を計算
    const totalIssues = filesWithErrors.reduce(function(sum, file) {
      return sum + file.issues.length;
    }, 0);

    // 警告メッセージのHTML文字列を作成
    let warningHtml = `
      <div class="word-collector-file-warning" style="
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 6px;
        padding: 15px;
        margin: 10px 0;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <div style="
          color: #856404;
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 16px;
        ">
          ⚠️ ${filesWithErrors.length}個の添付ファイルに誤表記がみつかりました (合計${totalIssues}件)
        </div>
        <div style="
          color: #495057;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 12px;
          padding: 8px 12px;
          background-color: #e9ecef;
          border-radius: 4px;
          border-left: 4px solid #6c757d;
        ">
          📁 フィールド: ${fieldLabel}
        </div>
    `;

    // 各ファイルの詳細を追加
    filesWithErrors.forEach(function(file) {
      warningHtml += `
        <div style="
          margin-bottom: 15px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
          border-left: 4px solid #ffc107;
        ">
          <div style="
            font-weight: bold;
            margin-bottom: 5px;
            color: #495057;
          ">
            📄 ${file.fileName} (${file.issues.length}件)
          </div>
          <div style="
            color: #495057;
            font-size: 13px;
            line-height: 1.6;
          ">
            ${file.issues.slice(0, 3).map(issue => 
              `"<span style="color: #dc3545; font-weight: bold;">${issue.word}</span>" → "<span style="color: #28a745; font-weight: bold;">${issue.suggestion}</span>"`
            ).join('<br>')}
            ${file.issues.length > 3 ? '<br><span style="color: #6c757d;">他 ' + (file.issues.length - 3) + ' 件...</span>' : ''}
          </div>
        </div>
      `;
    });

    warningHtml += `</div>`;

    // ヘッダーメニューエリアに挿入
    $(headerSpace).append(warningHtml);
    
    console.log('✅ 複数ファイル警告を表示しました:', filesWithErrors.length + '個のファイル');
  }

  function showFileWarning(fieldElement, fieldLabel, fileName, issues) {
    // 後方互換性のために残す（使用されていない）
    console.log('単一ファイル警告表示:', fileName, issues.length + '件');
    showMultipleFileWarnings(fieldElement, fieldLabel, [{
      fileName: fileName,
      issues: issues,
      hasErrors: true
    }]);
  }

  function showUnifiedWarning(allIssues) {
    const hasTextIssues = allIssues.textFields.length > 0;
    const hasFileIssues = allIssues.fileFields.length > 0;
    
    if (!hasTextIssues && !hasFileIssues) {
      console.log('誤表記は見つかりませんでした');
      return;
    }
    
    console.log('統合警告表示:', 'テキスト', allIssues.textFields.length, 'ファイル', allIssues.fileFields.length);
    
    // ヘッダーメニューエリアに警告を表示
    const headerSpace = kintone.app.record.getHeaderMenuSpaceElement();
    if (!headerSpace) {
      console.error('ヘッダーメニューエリアが見つかりません');
      return;
    }

    // 総問題数を計算
    let totalIssues = 0;
    allIssues.textFields.forEach(function(field) {
      totalIssues += field.issues.length;
    });
    allIssues.fileFields.forEach(function(field) {
      field.filesWithErrors.forEach(function(file) {
        totalIssues += file.issues.length;
      });
    });

    // 警告メッセージのHTML文字列を作成
    let warningHtml = `
      <div class="word-collector-file-warning" style="
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 6px;
        padding: 15px;
        margin: 10px 0;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <div style="
          color: #856404;
          font-weight: bold;
          margin-bottom: 15px;
          font-size: 16px;
        ">
          ⚠️ 誤表記が見つかりました (合計${totalIssues}件)
        </div>
    `;

    // テキストフィールドの問題を表示
    if (hasTextIssues) {
      allIssues.textFields.forEach(function(field) {
        warningHtml += `
          <div style="
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
            border-left: 4px solid #007bff;
          ">
            <div style="
              color: #495057;
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 12px;
              padding: 8px 12px;
              background-color: #e9ecef;
              border-radius: 4px;
              border-left: 4px solid #6c757d;
            ">
              📝 テキストフィールド: ${field.fieldLabel}
            </div>
            <div style="
              color: #495057;
              font-size: 13px;
              line-height: 1.6;
              margin-left: 10px;
            ">
              ${field.issues.slice(0, 3).map(issue => 
                `"<span style="color: #dc3545; font-weight: bold;">${issue.word}</span>" → "<span style="color: #28a745; font-weight: bold;">${issue.suggestion}</span>"`
              ).join('<br>')}
              ${field.issues.length > 3 ? '<br><span style="color: #6c757d;">他 ' + (field.issues.length - 3) + ' 件...</span>' : ''}
            </div>
          </div>
        `;
      });
    }

    // ファイルフィールドの問題を表示
    if (hasFileIssues) {
      allIssues.fileFields.forEach(function(field) {
        warningHtml += `
          <div style="
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
            border-left: 4px solid #ffc107;
          ">
            <div style="
              color: #495057;
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 12px;
              padding: 8px 12px;
              background-color: #e9ecef;
              border-radius: 4px;
              border-left: 4px solid #6c757d;
            ">
              📁 ファイルフィールド: ${field.fieldLabel}
            </div>
        `;
        
        field.filesWithErrors.forEach(function(file) {
          warningHtml += `
            <div style="
              margin-bottom: 10px;
              margin-left: 10px;
              padding: 8px;
              background-color: #ffffff;
              border-radius: 4px;
              border: 1px solid #dee2e6;
            ">
              <div style="
                font-weight: bold;
                margin-bottom: 5px;
                color: #495057;
              ">
                📄 ${file.fileName} (${file.issues.length}件)
              </div>
              <div style="
                color: #495057;
                font-size: 13px;
                line-height: 1.6;
              ">
                ${file.issues.slice(0, 3).map(issue => 
                  `"<span style="color: #dc3545; font-weight: bold;">${issue.word}</span>" → "<span style="color: #28a745; font-weight: bold;">${issue.suggestion}</span>"`
                ).join('<br>')}
                ${file.issues.length > 3 ? '<br><span style="color: #6c757d;">他 ' + (file.issues.length - 3) + ' 件...</span>' : ''}
              </div>
            </div>
          `;
        });
        
        warningHtml += `</div>`;
      });
    }

    warningHtml += `</div>`;

    // ヘッダーメニューエリアに挿入
    $(headerSpace).append(warningHtml);
    
    console.log('✅ 統合警告を表示しました: テキスト', allIssues.textFields.length, 'ファイル', allIssues.fileFields.length);
  }

  function createIssueElement(fieldLabel, issues) {
    const $container = $('<div class="word-collector-issues"></div>');
    
    if (issues.length > 0) {
      const $header = $('<div class="word-collector-header"></div>');
      $header.html('<strong>' + fieldLabel + '</strong> に表記の問題が見つかりました:');
      $container.append($header);
      
      const $list = $('<ul class="word-collector-list"></ul>');
      issues.forEach(function(issue) {
        const $item = $('<li></li>');
        $item.html('"<span class="word-collector-incorrect">' + issue.word + 
                  '</span>" → "<span class="word-collector-suggestion">' + 
                  issue.suggestion + '</span>"');
        $list.append($item);
      });
      
      $container.append($list);
    }
    
    return $container;
  }

  function checkFields(record) {
    if (!CONFIG || !CONFIG.fields) {
      return;
    }
    
    const targetFields = JSON.parse(CONFIG.fields);
    let allIssues = {
      textFields: [],
      fileFields: []
    };
    
    // 既存の警告を削除
    $('.word-collector-file-warning').remove();
    $('.word-collector-text-warning').remove();
    $('#word-collector-results').remove();
    
    const fieldPromises = targetFields.map(function(fieldCode) {
      if (record[fieldCode] && record[fieldCode].value) {
        const fieldValue = record[fieldCode].value;
        const fieldElements = kintone.app.getFieldElements(fieldCode);
        const fieldLabel = (fieldElements && fieldElements[0] && fieldElements[0].innerText) || fieldCode;
        
        // より確実なフィールド要素の取得
        let $fieldElement = $('[data-field-code="' + fieldCode + '"]');
        if ($fieldElement.length === 0) {
          $fieldElement = $('.field-' + fieldCode);
        }
        if ($fieldElement.length === 0) {
          $fieldElement = $('*[data-field-code="' + fieldCode + '"]');
        }
        
        console.log('フィールド要素検索:', fieldCode, fieldLabel, $fieldElement.length + '個見つかった');
        
        // ファイルフィールドの場合
        if (Array.isArray(fieldValue)) {
          console.log('ファイルフィールド検出:', fieldLabel, fieldValue);
          return checkFileField(fieldCode, fieldValue, fieldLabel, $fieldElement).then(function(results) {
            // エラーがあるファイルを収集
            if (results && Array.isArray(results)) {
              const filesWithErrors = results.filter(function(result) {
                return result && result.hasErrors;
              });
              
              if (filesWithErrors.length > 0) {
                allIssues.fileFields.push({
                  fieldLabel: fieldLabel,
                  filesWithErrors: filesWithErrors
                });
              }
            }
          }).catch(function(error) {
            console.error('ファイルフィールドチェックエラー:', fieldLabel, error);
          });
        } else {
          // テキストフィールドの場合
          console.log('テキストフィールド検出:', fieldLabel, 'テキスト長:', fieldValue ? fieldValue.length : 0);
          console.log('フィールド値:', fieldValue);
          const issues = checkWords(fieldValue);
          console.log('誤表記チェック結果:', fieldLabel, issues.length + '件の問題');
          if (issues.length > 0) {
            console.log('テキストフィールドに誤表記発見:', fieldLabel, issues);
            allIssues.textFields.push({
              fieldLabel: fieldLabel,
              issues: issues
            });
            // テキストフィールドの警告もヘッダーに即座に表示
            setTimeout(function() {
              showTextFieldWarning(fieldLabel, issues);
            }, 100);
          }
          return Promise.resolve();
        }
      }
      return Promise.resolve();
    });
    
    Promise.all(fieldPromises).then(function() {
      // 統合された警告を表示
      showUnifiedWarning(allIssues);
    }).catch(function(error) {
      console.error('ファイルチェック中にエラーが発生しました:', error);
    });
  }

  kintone.events.on([
    'app.record.detail.show',
    'app.record.edit.show'
  ], function(event) {
    // ライブラリを初期化してからファイルチェックを実行
    initializeLibraries().then(function() {
      checkFields(event.record);
    });
    return event;
  });

  kintone.events.on([
    'app.record.edit.change.' + (CONFIG && CONFIG.fields ? JSON.parse(CONFIG.fields).join(',app.record.edit.change.') : ''),
    'app.record.create.change.' + (CONFIG && CONFIG.fields ? JSON.parse(CONFIG.fields).join(',app.record.create.change.') : '')
  ].filter(e => e.includes('.')), function(event) {
    // ライブラリを初期化してからファイルチェックを実行
    initializeLibraries().then(function() {
      checkFields(event.record);
    });
    return event;
  });

  function showReplaceDialog(issuesByField) {
    return new Promise(function(resolve) {
      const $dialog = $('<div class="word-collector-dialog"></div>');
      const $overlay = $('<div class="word-collector-overlay"></div>');
      
      const $dialogContent = $('<div class="word-collector-dialog-content"></div>');
      $dialogContent.append('<h2>誤表記が見つかりました</h2>');
      
      let totalIssues = 0;
      Object.keys(issuesByField).forEach(function(fieldCode) {
        totalIssues += issuesByField[fieldCode].issues.length;
      });
      
      $dialogContent.append('<p>以下の誤表記が見つかりました。置換しますか？</p>');
      
      Object.keys(issuesByField).forEach(function(fieldCode) {
        const fieldInfo = issuesByField[fieldCode];
        const $fieldSection = $('<div class="word-collector-field-section"></div>');
        $fieldSection.append('<h3>' + fieldInfo.label + '</h3>');
        
        const $issuesList = $('<ul class="word-collector-dialog-list"></ul>');
        fieldInfo.issues.forEach(function(issue) {
          const $item = $('<li></li>');
          $item.html('"<span class="word-collector-incorrect">' + issue.word + 
                    '</span>" → "<span class="word-collector-suggestion">' + 
                    issue.suggestion + '</span>"');
          $issuesList.append($item);
        });
        
        $fieldSection.append($issuesList);
        $dialogContent.append($fieldSection);
      });
      
      const $buttons = $('<div class="word-collector-dialog-buttons"></div>');
      
      const $replaceButton = $('<button class="word-collector-button-replace">置換</button>');
      $replaceButton.on('click', function() {
        $dialog.remove();
        $overlay.remove();
        resolve(true);
      });
      
      const $proceedButton = $('<button class="word-collector-button-proceed">そのまま</button>');
      $proceedButton.on('click', function() {
        $dialog.remove();
        $overlay.remove();
        resolve(false);
      });
      
      const $cancelButton = $('<button class="word-collector-button-cancel">キャンセル</button>');
      $cancelButton.on('click', function() {
        $dialog.remove();
        $overlay.remove();
        resolve('cancel');
      });
      
      $buttons.append($replaceButton);
      $buttons.append($proceedButton);
      $buttons.append($cancelButton);
      $dialogContent.append($buttons);
      
      $dialog.append($dialogContent);
      $('body').append($overlay);
      $('body').append($dialog);
    });
  }

  function showFileDialog(filesByField) {
    return new Promise(function(resolve) {
      const $dialog = $('<div class="word-collector-dialog"></div>');
      const $overlay = $('<div class="word-collector-overlay"></div>');
      
      const $dialogContent = $('<div class="word-collector-dialog-content"></div>');
      
      // まず全ファイルの内容をチェックして、誤表記があるかどうかを確認
      const filePromises = [];
      let hasTextIssues = false;
      let totalIssues = 0;
      
      Object.keys(filesByField).forEach(function(fieldCode) {
        const fieldInfo = filesByField[fieldCode];
        
        fieldInfo.files.forEach(function(file) {
          // サポートされているファイル形式は内容をチェック
          if (FileProcessor.isSupported(file.contentType)) {
            const filePromise = FileProcessor.extractText(file).then(function(result) {
              if (result.isText) {
                console.log('抽出完了:', file.name, 'テキスト長:', result.text.length);
                console.log('抽出テキスト (最初の200文字):', result.text.substring(0, 200) + '...');
                const issues = checkWords(result.text);
                console.log('誤表記チェック結果:', file.name, '問題数:', issues.length);
                if (issues.length > 0) {
                  hasTextIssues = true;
                  totalIssues += issues.length;
                  file.issues = issues;
                }
              } else {
                console.log('テキスト抽出失敗:', file.name);
                file.extractionFailed = true;
              }
              return file;
            }).catch(function(error) {
              console.error('ファイル処理エラー:', file.name, error.message);
              file.error = error.message;
              return file;
            });
            filePromises.push(filePromise);
          }
        });
      });
      
      // すべてのファイルチェックが完了したらダイアログを表示
      Promise.all(filePromises).then(function() {
        // ダイアログのタイトルと説明を設定
        if (hasTextIssues) {
          $dialogContent.append('<h2>ファイルに誤表記が見つかりました</h2>');
          $dialogContent.append('<p>以下のファイルで表記の問題が見つかりました。修正・再アップロードしてから保存することをお勧めします。</p>');
        } else {
          $dialogContent.append('<h2>ファイルが検出されました</h2>');
          $dialogContent.append('<p>以下のファイルが見つかりました。テキストファイルの内容をチェックしました。</p>');
        }
        
        // ファイルの詳細情報を表示
        Object.keys(filesByField).forEach(function(fieldCode) {
          const fieldInfo = filesByField[fieldCode];
          const $fieldSection = $('<div class="word-collector-field-section"></div>');
          $fieldSection.append('<h3>' + fieldInfo.label + '</h3>');
          
          const $filesList = $('<ul class="word-collector-dialog-list"></ul>');
          
          fieldInfo.files.forEach(function(file) {
            const $item = $('<li></li>');
            const fileTypeName = FileProcessor.getFileTypeName(file.contentType);
            
            if (file.issues && file.issues.length > 0) {
              $item.html('<strong>' + file.name + '</strong> (' + fileTypeName + ')' +
                        '<br><span class="word-collector-file-note" style="color: #d32f2f; font-weight: bold;">' + 
                        file.issues.length + '件の表記修正候補が見つかりました。</span>');
              
              // 具体的な問題を表示
              const $issuesList = $('<ul style="margin-top: 5px; padding-left: 20px;"></ul>');
              file.issues.slice(0, 3).forEach(function(issue) {
                const $issueItem = $('<li style="font-size: 12px;"></li>');
                $issueItem.html('"<span class="word-collector-incorrect">' + issue.word + 
                               '</span>" → "<span class="word-collector-suggestion">' + 
                               issue.suggestion + '</span>"');
                $issuesList.append($issueItem);
              });
              if (file.issues.length > 3) {
                $issuesList.append('<li style="font-size: 12px; color: #666;">他 ' + (file.issues.length - 3) + ' 件...</li>');
              }
              $item.append($issuesList);
            } else if (file.error) {
              $item.html('<strong>' + file.name + '</strong> (' + fileTypeName + ')' +
                        '<br><span class="word-collector-file-note" style="color: #f57c00;">読み取りエラー: ' + file.error + '</span>');
            } else if (file.extractionFailed) {
              $item.html('<strong>' + file.name + '</strong> (' + fileTypeName + ')' +
                        '<br><span class="word-collector-file-note" style="color: #f57c00;">テキスト抽出に失敗しました。手動で内容確認してください。</span>');
            } else {
              $item.html('<strong>' + file.name + '</strong> (' + fileTypeName + ')' +
                        '<br><span class="word-collector-file-note" style="color: #2e7d32;">問題は見つかりませんでした。</span>');
            }
            
            $filesList.append($item);
          });
          
          $fieldSection.append($filesList);
          $dialogContent.append($fieldSection);
        });
        
        const $buttons = $('<div class="word-collector-dialog-buttons"></div>');
        
        const $okButton = $('<button class="word-collector-button-ok">OK</button>');
        $okButton.on('click', function() {
          $dialog.remove();
          $overlay.remove();
          resolve(true);
        });
        
        const $cancelButton = $('<button class="word-collector-button-cancel">キャンセル</button>');
        $cancelButton.on('click', function() {
          $dialog.remove();
          $overlay.remove();
          resolve(false);
        });
        
        $buttons.append($okButton);
        $buttons.append($cancelButton);
        $dialogContent.append($buttons);
        
        $dialog.append($dialogContent);
        $('body').append($overlay);
        $('body').append($dialog);
        
      }).catch(function(error) {
        console.error('ファイルチェック中にエラーが発生しました:', error);
        // エラーが発生した場合もダイアログを表示
        $dialogContent.append('<h2>ファイルチェックエラー</h2>');
        $dialogContent.append('<p>ファイルの内容チェック中にエラーが発生しました。</p>');
        
        const $buttons = $('<div class="word-collector-dialog-buttons"></div>');
        const $okButton = $('<button class="word-collector-button-ok">OK</button>');
        $okButton.on('click', function() {
          $dialog.remove();
          $overlay.remove();
          resolve(true);
        });
        $buttons.append($okButton);
        $dialogContent.append($buttons);
        
        $dialog.append($dialogContent);
        $('body').append($overlay);
        $('body').append($dialog);
      });
    });
  }

  function replaceWords(text, issues) {
    let replacedText = text;
    
    // Sort issues by position in descending order to avoid position shift
    const sortedIssues = issues.sort((a, b) => b.position - a.position);
    
    sortedIssues.forEach(function(issue) {
      const before = replacedText.substring(0, issue.position);
      const after = replacedText.substring(issue.position + issue.word.length);
      replacedText = before + issue.suggestion + after;
    });
    
    return replacedText;
  }

  kintone.events.on([
    'app.record.create.submit',
    'app.record.edit.submit',
    'app.record.index.edit.submit'
  ], function(event) {
    if (!CONFIG || !CONFIG.fields) {
      return event;
    }
    
    const targetFields = JSON.parse(CONFIG.fields);
    const issuesByField = {};
    let hasIssues = false;
    
    targetFields.forEach(function(fieldCode) {
      if (event.record[fieldCode] && event.record[fieldCode].value) {
        const fieldValue = event.record[fieldCode].value;
        const fieldElement = $('[data-field-code="' + fieldCode + '"]').find('.field-name');
        const fieldLabel = (fieldElement && fieldElement.length > 0) ? fieldElement.text() : fieldCode;
        
        // テキストフィールドの場合のみ処理（ファイルフィールドは除外）
        if (!Array.isArray(fieldValue) && fieldValue) {
          const issues = checkWords(fieldValue);
          
          if (issues.length > 0) {
            hasIssues = true;
            issuesByField[fieldCode] = {
              label: fieldLabel,
              issues: issues,
              value: fieldValue
            };
          }
        }
      }
    });
    
    // テキストの問題がある場合のみ置換ダイアログを表示
    if (hasIssues) {
      return showReplaceDialog(issuesByField).then(function(result) {
        if (result === 'cancel') {
          // キャンセルされた場合は保存を中止
          return Promise.reject(new Error('保存がキャンセルされました'));
        }
        if (result === true) {
          Object.keys(issuesByField).forEach(function(fieldCode) {
            const fieldInfo = issuesByField[fieldCode];
            const replacedText = replaceWords(fieldInfo.value, fieldInfo.issues);
            event.record[fieldCode].value = replacedText;
          });
        }
        return event;
      });
    }
    
    return event;
  });

})(jQuery, kintone.$PLUGIN_ID);