jQuery.noConflict();
(function($, PLUGIN_ID) {
  'use strict';

  const CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID);
  
  const WORD_MAP = {
    '挨拶': 'あいさつ',
    '敢えて': 'あえて',
    '当たって': 'あたって',
    '予め': 'あらかじめ',
    '有難う御座います': 'ありがとうございます',
    '有る': 'ある',
    '或いは': 'あるいは',
    '如何に': 'いかに',
    '幾つ': 'いくつ',
    '致します': 'いたします',
    '頂く': 'いただく',
    '何時': 'いつ',
    '一杯': 'いっぱい',
    '未だ': 'いまだ',
    '居る': 'いる',
    '色々': 'いろいろ',
    '曰く': 'いわく',
    '概ね': 'おおむね',
    '凡そ': 'おおよそ',
    '及び': 'および',
    'お願い致します': 'お願いいたします',
    '且つ': 'かつ',
    '下さい': 'ください',
    '位': 'くらい',
    '事': 'こと',
    '毎': 'ごと',
    '様々': 'さまざま',
    '更に': 'さらに',
    '直ぐに': 'すぐに',
    '既に': 'すでに',
    '即ち': 'すなわち',
    '是非': 'ぜひ',
    '大分': 'だいぶ',
    '沢山': 'たくさん',
    '但し': 'ただし',
    '為': 'ため',
    '出来る': 'できる',
    '通り': 'とおり',
    '何処': 'どこ',
    '等': 'など',
    '成る': 'なる',
    '殆ど': 'ほとんど',
    '参る': 'まいる',
    '先ず': 'まず',
    '又': 'また',
    '迄': 'まで',
    '尤も': 'もっとも',
    '物': 'もの',
    '様': 'よう',
    '宜しく': 'よろしく',
    '僅か': 'わずか',
    'する時': 'するとき',
    'の様に': 'のように',
    '子供': '子ども',
    '子供達': '子ども達',
    '私達': '私たち',
    '父兄・父母': '保護者',
    '母子家庭・父子家庭': 'ひとり親家庭',
    '障害者': '障がい者・障碍者',
    'HP': 'ホームページ'
  };

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