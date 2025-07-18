jQuery.noConflict();
(function($, PLUGIN_ID) {
  'use strict';

  const CONF = kintone.plugin.app.getConfig(PLUGIN_ID);
  
  function escapeHtml(htmlstr) {
    return htmlstr.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setDropDown() {
    return kintone.api(kintone.api.url('/k/v1/preview/form', true), 'GET', {
      app: kintone.app.getId()
    }).then(function(resp) {
      const $selectFields = $('#select-fields');
      $selectFields.empty();
      
      const properties = resp.properties;
      const textFields = properties.filter(function(field) {
        return ['SINGLE_LINE_TEXT', 'MULTI_LINE_TEXT', 'RICH_TEXT', 'FILE'].indexOf(field.type) >= 0;
      });
      
      textFields.forEach(function(field) {
        const $option = $('<option></option>');
        $option.attr('value', field.code);
        $option.text(escapeHtml(field.label));
        $selectFields.append($option);
      });
      
      if (CONF.fields) {
        const savedFields = JSON.parse(CONF.fields);
        $selectFields.val(savedFields);
      }
    }).catch(function(err) {
      alert('フィールド情報の取得に失敗しました: ' + err.message);
    });
  }

  $(document).ready(function() {
    setDropDown();
    
    $('.js-submit-settings').on('submit', function(e) {
      e.preventDefault();
      
      const selectedFields = $('#select-fields').val();
      
      if (!selectedFields || selectedFields.length === 0) {
        alert('チェック対象フィールドを選択してください');
        return;
      }
      
      const config = {
        fields: JSON.stringify(selectedFields)
      };
      
      kintone.plugin.app.setConfig(config, function() {
        alert('設定を保存しました。アプリを更新してください。');
        window.location.href = '../../flow?app=' + kintone.app.getId();
      });
    });
    
    $('#cancel-button').on('click', function() {
      window.location.href = '../../' + kintone.app.getId() + '/plugin/';
    });
  });
})(jQuery, kintone.$PLUGIN_ID);