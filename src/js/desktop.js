jQuery.noConflict();
(function($, PLUGIN_ID) {
  'use strict';

  const CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);
  
  // 正誤対照表は correction-table.js から読み込み
  const WORD_MAP = CORRECTION_TABLE;

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

  function checkFileField(fieldCode, files, fieldLabel, $resultsContainer) {
    if (!files || files.length === 0) {
      return Promise.resolve();
    }

    const filePromises = files.map(function(file) {
      if (FileProcessor.isSupported(file.contentType)) {
        return FileProcessor.extractText(file).then(function(result) {
          const fileTypeName = FileProcessor.getFileTypeName(file.contentType);
          const $fileInfo = $('<div class="word-corrector-file-info"></div>');
          
          if (result.isText) {
            // テキストファイルの場合は実際にチェック
            const issues = checkWords(result.text);
            if (issues.length > 0) {
              $fileInfo.html('<strong>' + fieldLabel + '</strong>: ' + file.name + ' (' + fileTypeName + ')' +
                            '<br><span class="word-corrector-file-note">' + issues.length + '件の表記修正候補が見つかりました。</span>');
              
              // 問題のある箇所をリスト表示
              const $issuesList = $('<ul class="word-corrector-list"></ul>');
              issues.forEach(function(issue) {
                const $item = $('<li></li>');
                $item.html('"<span class="word-corrector-incorrect">' + issue.word + 
                          '</span>" → "<span class="word-corrector-suggestion">' + 
                          issue.suggestion + '</span>"');
                $issuesList.append($item);
              });
              $fileInfo.append($issuesList);
            } else {
              $fileInfo.html('<strong>' + fieldLabel + '</strong>: ' + file.name + ' (' + fileTypeName + ')' +
                            '<br><span class="word-corrector-file-note">問題は見つかりませんでした。</span>');
            }
          } else {
            // PDF/DOCXの場合は情報表示のみ
            $fileInfo.html('<strong>' + fieldLabel + '</strong>: ' + file.name + ' (' + fileTypeName + ')' +
                          '<br><span class="word-corrector-file-note">このファイル形式は内容確認が必要です。必要に応じて修正・再アップロードしてください。</span>');
          }
          
          $resultsContainer.append($fileInfo);
          return result;
        }).catch(function(error) {
          const $fileInfo = $('<div class="word-corrector-file-info"></div>');
          $fileInfo.html('<strong>' + fieldLabel + '</strong>: ' + file.name + 
                        '<br><span class="word-corrector-file-note">ファイルの読み取りに失敗しました: ' + error.message + '</span>');
          $resultsContainer.append($fileInfo);
          return null;
        });
      } else {
        return Promise.resolve(null);
      }
    });

    return Promise.all(filePromises);
  }

  function createIssueElement(fieldLabel, issues) {
    const $container = $('<div class="word-corrector-issues"></div>');
    
    if (issues.length > 0) {
      const $header = $('<div class="word-corrector-header"></div>');
      $header.html('<strong>' + fieldLabel + '</strong> に表記の問題が見つかりました:');
      $container.append($header);
      
      const $list = $('<ul class="word-corrector-list"></ul>');
      issues.forEach(function(issue) {
        const $item = $('<li></li>');
        $item.html('"<span class="word-corrector-incorrect">' + issue.word + 
                  '</span>" → "<span class="word-corrector-suggestion">' + 
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
    const $resultsContainer = $('<div id="word-corrector-results"></div>');
    let totalIssues = 0;
    
    const fieldPromises = targetFields.map(function(fieldCode) {
      if (record[fieldCode] && record[fieldCode].value) {
        const fieldValue = record[fieldCode].value;
        const fieldElements = kintone.app.getFieldElements(fieldCode);
        const fieldLabel = (fieldElements && fieldElements[0]) ? fieldElements[0].innerText : fieldCode;
        
        // ファイルフィールドの場合
        if (Array.isArray(fieldValue)) {
          return checkFileField(fieldCode, fieldValue, fieldLabel, $resultsContainer);
        } else {
          // テキストフィールドの場合
          const issues = checkWords(fieldValue);
          if (issues.length > 0) {
            totalIssues += issues.length;
            $resultsContainer.append(createIssueElement(fieldLabel, issues));
          }
          return Promise.resolve();
        }
      }
      return Promise.resolve();
    });
    
    Promise.all(fieldPromises).then(function() {
      const existingResults = document.getElementById('word-corrector-results');
      if (existingResults) {
        existingResults.remove();
      }
      
      // ファイルの問題も含めて結果を表示
      if ($resultsContainer.children().length > 0) {
        const headerSpace = kintone.app.record.getHeaderMenuSpaceElement();
        if (headerSpace) {
          $(headerSpace).append($resultsContainer);
        }
      }
    }).catch(function(error) {
      console.error('ファイルチェック中にエラーが発生しました:', error);
    });
  }

  kintone.events.on([
    'app.record.detail.show',
    'app.record.edit.show'
  ], function(event) {
    checkFields(event.record);
    return event;
  });

  kintone.events.on([
    'app.record.edit.change.' + (CONFIG && CONFIG.fields ? JSON.parse(CONFIG.fields).join(',app.record.edit.change.') : ''),
    'app.record.create.change.' + (CONFIG && CONFIG.fields ? JSON.parse(CONFIG.fields).join(',app.record.create.change.') : '')
  ].filter(e => e.includes('.')), function(event) {
    checkFields(event.record);
    return event;
  });

  function showReplaceDialog(issuesByField) {
    return new Promise(function(resolve) {
      const $dialog = $('<div class="word-corrector-dialog"></div>');
      const $overlay = $('<div class="word-corrector-overlay"></div>');
      
      const $dialogContent = $('<div class="word-corrector-dialog-content"></div>');
      $dialogContent.append('<h2>誤表記が見つかりました</h2>');
      
      let totalIssues = 0;
      Object.keys(issuesByField).forEach(function(fieldCode) {
        totalIssues += issuesByField[fieldCode].issues.length;
      });
      
      $dialogContent.append('<p>以下の誤表記が見つかりました。置換しますか？</p>');
      
      Object.keys(issuesByField).forEach(function(fieldCode) {
        const fieldInfo = issuesByField[fieldCode];
        const $fieldSection = $('<div class="word-corrector-field-section"></div>');
        $fieldSection.append('<h3>' + fieldInfo.label + '</h3>');
        
        const $issuesList = $('<ul class="word-corrector-dialog-list"></ul>');
        fieldInfo.issues.forEach(function(issue) {
          const $item = $('<li></li>');
          $item.html('"<span class="word-corrector-incorrect">' + issue.word + 
                    '</span>" → "<span class="word-corrector-suggestion">' + 
                    issue.suggestion + '</span>"');
          $issuesList.append($item);
        });
        
        $fieldSection.append($issuesList);
        $dialogContent.append($fieldSection);
      });
      
      const $buttons = $('<div class="word-corrector-dialog-buttons"></div>');
      
      const $replaceButton = $('<button class="word-corrector-button-replace">置換</button>');
      $replaceButton.on('click', function() {
        $dialog.remove();
        $overlay.remove();
        resolve(true);
      });
      
      const $proceedButton = $('<button class="word-corrector-button-proceed">そのまま</button>');
      $proceedButton.on('click', function() {
        $dialog.remove();
        $overlay.remove();
        resolve(false);
      });
      
      const $cancelButton = $('<button class="word-corrector-button-cancel">キャンセル</button>');
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
      const $dialog = $('<div class="word-corrector-dialog"></div>');
      const $overlay = $('<div class="word-corrector-overlay"></div>');
      
      const $dialogContent = $('<div class="word-corrector-dialog-content"></div>');
      $dialogContent.append('<h2>ファイルが検出されました</h2>');
      
      $dialogContent.append('<p>以下のファイルが見つかりました。内容を確認し、必要に応じて修正・再アップロードしてください。</p>');
      
      Object.keys(filesByField).forEach(function(fieldCode) {
        const fieldInfo = filesByField[fieldCode];
        const $fieldSection = $('<div class="word-corrector-field-section"></div>');
        $fieldSection.append('<h3>' + fieldInfo.label + '</h3>');
        
        const $filesList = $('<ul class="word-corrector-dialog-list"></ul>');
        fieldInfo.files.forEach(function(file) {
          const $item = $('<li></li>');
          const fileTypeName = FileProcessor.getFileTypeName(file.contentType);
          $item.html('<strong>' + file.name + '</strong> (' + fileTypeName + ')' +
                    '<br><span class="word-corrector-file-note">このファイル形式は内容確認が必要です。</span>');
          $filesList.append($item);
        });
        
        $fieldSection.append($filesList);
        $dialogContent.append($fieldSection);
      });
      
      const $buttons = $('<div class="word-corrector-dialog-buttons"></div>');
      
      const $okButton = $('<button class="word-corrector-button-ok">OK</button>');
      $okButton.on('click', function() {
        $dialog.remove();
        $overlay.remove();
        resolve(true);
      });
      
      const $cancelButton = $('<button class="word-corrector-button-cancel">キャンセル</button>');
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
    const filesByField = {};
    let hasIssues = false;
    let hasFiles = false;
    
    targetFields.forEach(function(fieldCode) {
      if (event.record[fieldCode] && event.record[fieldCode].value) {
        const fieldValue = event.record[fieldCode].value;
        const fieldLabel = $('[data-field-code="' + fieldCode + '"]').find('.field-name').text() || fieldCode;
        
        // ファイルフィールドの場合
        if (Array.isArray(fieldValue)) {
          const supportedFiles = fieldValue.filter(function(file) {
            return FileProcessor.isSupported(file.contentType);
          });
          
          if (supportedFiles.length > 0) {
            hasFiles = true;
            filesByField[fieldCode] = {
              label: fieldLabel,
              files: supportedFiles
            };
          }
        } else {
          // テキストフィールドの場合
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
    
    // ファイルがある場合は先にファイルダイアログを表示
    if (hasFiles) {
      return showFileDialog(filesByField).then(function(shouldContinue) {
        if (!shouldContinue) {
          // キャンセルされた場合は保存を中止
          return Promise.reject(new Error('保存がキャンセルされました'));
        }
        
        // ファイルダイアログの後、テキストの問題がある場合は置換ダイアログを表示
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
    }
    
    // テキストの問題のみある場合
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