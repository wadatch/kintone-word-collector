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
    const $resultsContainer = $('<div id="word-collector-results"></div>');
    let totalIssues = 0;
    
    targetFields.forEach(function(fieldCode) {
      if (record[fieldCode] && record[fieldCode].value) {
        const fieldValue = record[fieldCode].value;
        const issues = checkWords(fieldValue);
        
        if (issues.length > 0) {
          totalIssues += issues.length;
          const fieldLabel = kintone.app.getFieldElements(fieldCode)[0]?.innerText || fieldCode;
          $resultsContainer.append(createIssueElement(fieldLabel, issues));
        }
      }
    });
    
    const existingResults = document.getElementById('word-collector-results');
    if (existingResults) {
      existingResults.remove();
    }
    
    if (totalIssues > 0) {
      const $summary = $('<div class="word-collector-summary"></div>');
      $summary.html('合計 <strong>' + totalIssues + '</strong> 件の表記修正候補が見つかりました。');
      $resultsContainer.prepend($summary);
      
      const headerSpace = kintone.app.record.getHeaderMenuSpaceElement();
      if (headerSpace) {
        $(headerSpace).append($resultsContainer);
      }
    }
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
      
      const $cancelButton = $('<button class="word-collector-button-cancel">そのまま</button>');
      $cancelButton.on('click', function() {
        $dialog.remove();
        $overlay.remove();
        resolve(false);
      });
      
      $buttons.append($replaceButton);
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
    let hasIssues = false;
    
    targetFields.forEach(function(fieldCode) {
      if (event.record[fieldCode] && event.record[fieldCode].value) {
        const fieldValue = event.record[fieldCode].value;
        const issues = checkWords(fieldValue);
        
        if (issues.length > 0) {
          hasIssues = true;
          const fieldLabel = $('[data-field-code="' + fieldCode + '"]').find('.field-name').text() || fieldCode;
          issuesByField[fieldCode] = {
            label: fieldLabel,
            issues: issues,
            value: fieldValue
          };
        }
      }
    });
    
    if (hasIssues) {
      return showReplaceDialog(issuesByField).then(function(shouldReplace) {
        if (shouldReplace) {
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