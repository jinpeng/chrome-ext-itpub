(function(ls) {
  /* globals $, jss, chrome */
  /* jshint multistr: true */
  'use strict';

  function initializePopup() {
    // Register download folder name listener
    $('#folder_name_textbox')
      .val(ls.folder_name)
      .on('change', function() {
        ls.folder_name = $.trim(this.value);
      });

    // Register filter URL listener
    $('#filter_textbox')
      .val(ls.filter_url)
      .on('change', function() {
        ls.filter_url = $.trim(this.value);
      });

    chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
      if (ls.folder_name) {
        suggest({
          filename: ls.folder_name + '/' + item.filename
        });
      }
    });

    $('#download_button').on('click', downloadImages);

    if (ls.show_url_filter === 'true') {
      $('#filter_textbox').on('keyup', filterImages);
      $('#filter_url_mode_input').val(ls.filter_url_mode).on('change', function() {
        ls.filter_url_mode = this.value;
        filterImages();
      });
    }

    $('#images_table')
      .on('change', '#toggle_all_checkbox', function() {
        $('#download_button').prop('disabled', !this.checked);
        for (var i = 0; i < visibleImages.length; i++) {
          $('#image' + i).toggleClass('checked', this.checked);
        }
      })
      .on('click', 'input.image_url_textbox', function() {
        $(this).toggleClass('checked', !$(this).hasClass('checked'));

        var allAreChecked = true;
        var allAreUnchecked = true;
        for (var i = 0; i < visibleImages.length; i++) {
          if ($('#image' + i).hasClass('checked')) {
            allAreUnchecked = false;
          } else {
            allAreChecked = false;
          }
          // Exit the loop early
          if (!(allAreChecked || allAreUnchecked)) break;
        }

        $('#download_button').prop('disabled', allAreUnchecked);

        var toggle_all_checkbox = $('#toggle_all_checkbox');
        toggle_all_checkbox.prop('indeterminate', !(allAreChecked || allAreUnchecked));
        if (allAreChecked) {
          toggle_all_checkbox.prop('checked', true);
        } else if (allAreUnchecked) {
          toggle_all_checkbox.prop('checked', false);
        }
      })
      .on('click', '.image_url_textbox', function() {
        this.select();
      })
      .on('click', '.download_image_button', function() {
        chrome.downloads.download({
          url: $(this).data('url')
        });
      });

    // Get images on the page
    chrome.windows.getCurrent(function(currentWindow) {
      chrome.tabs.query({
        active: true,
        windowId: currentWindow.id
      }, function(activeTabs) {
        chrome.tabs.executeScript(activeTabs[0].id, {
          file: '/scripts/contentscript.js',
          allFrames: true
        });
      });
    });
  }

  function initializeStyles() {
    // Filters
    $('#image_url_filter').toggle(ls.show_url_filter === 'true');

    // Images
    jss.set('.image_buttons_container', {
      'margin-top': (ls.show_image_url === 'true' ? 3 : -3) + 'px'
    });

    jss.set('img', {
      'min-width': ls.image_min_width + 'px',
      'max-width': ls.image_max_width + 'px',
      'border-width': ls.image_border_width + 'px',
      'border-style': 'solid',
      'border-color': '#f6f6f6'
    });
    jss.set('input.image_url_textbox.checked', {
      'border-color': ls.image_border_color
    });

    // Periodically set the body padding to offset the height of the fixed position filters
    setInterval(function() {
      $('body').css('padding-top', $('#filters_container').height());
    }, 200);
  }

  var allImages = [];
  var visibleImages = [];
  var linkedImages = {};
  var attachmentTexts = {};

  // Add images to `allImages` and trigger filtration
  // `contentscript.js` is injected into all frames of the active tab, so this listener may be called multiple times
  chrome.extension.onMessage.addListener(function(result) {
    $.extend(linkedImages, result.linkedImages);
    $.extend(attachmentTexts, result.attachmentTexts);
    for (var i = 0; i < result.images.length; i++) {
      if (allImages.indexOf(result.images[i]) === -1) {
        allImages.push(result.images[i]);
      }
    }
    filterImages();
  });

  var timeoutID;

  function filterImages() {
    clearTimeout(timeoutID); // Cancel pending filtration
    timeoutID = setTimeout(function() {
      // Copy all images initially
      visibleImages = allImages.slice(0);

      if (ls.show_url_filter === 'true') {
        var filterValue = $('#filter_textbox').val();
          console.log("filtering... " + filterValue);
        if (filterValue) {
          switch (ls.filter_url_mode) {
            case 'normal':
              var terms = filterValue.split(' ');
              visibleImages = visibleImages.filter(function(url) {
                var title = linkedImages[url];
                for (var i = 0; i < terms.length; i++) {
                  var term = terms[i];
                  if (term.length !== 0) {
                    var expected = (term[0] !== '-');
                    if (!expected) {
                      term = term.substr(1);
                      if (term.length === 0) {
                        continue;
                      }
                    }
                    var found = (title.indexOf(term) !== -1);
                    if (found !== expected) {
                      return false;
                    }
                  }
                }
                return true;
              });
              break;
            case 'wildcard':
              filterValue = filterValue.replace(/([.^$[\]\\(){}|-])/g, '\\$1').replace(/([?*+])/, '.$1');
              /* fall through */
            case 'regex':
              visibleImages = visibleImages.filter(function(url) {
                try {
                  var title = linkedImages[url];
                  return title.match(filterValue);
                } catch (e) {
                  return false;
                }
              });
              break;
          }
        }
      }

      if (ls.show_only_images_from_links === 'true' && ls.only_images_from_links === 'true') {
        visibleImages = visibleImages.filter(function(url) {
          return linkedImages[url];
        });
      }

      displayImages();
    }, 200);
  }

  function displayImages() {
    $('#download_button').prop('disabled', true);

    var images_table = $('#images_table').empty();

    var toggle_all_checkbox_row = '<tr><th align="left" colspan="' + ls.columns + '"><label><input type="checkbox" id="toggle_all_checkbox" />Select all (' + visibleImages.length + ')</label></th></tr>';
    images_table.append(toggle_all_checkbox_row);

    var columns = parseInt(ls.columns);
    var columnWidth = (Math.round(100 * 100 / columns) / 100) + '%';
    var rows = Math.ceil(visibleImages.length / columns);

    // Tools row
    var show_image_url = ls.show_image_url === 'true';
    var show_download_image_button = ls.show_download_image_button === 'true';

    // Append dummy image row to keep the popup width constant
    var dummy_row = $('<tr></tr>');
    var colspan = ((show_image_url ? 1 : 0) + (show_download_image_button ? 1 : 0)) || 1;
    for (var columnIndex = 0; columnIndex < columns; columnIndex++) {
      var dummy_cell = '<td colspan="' + colspan + '" style="min-width: ' + ls.image_max_width + 'px; width: ' + columnWidth + '; vertical-align: top;"></td>';
      dummy_row.append(dummy_cell);
    }
    images_table.append(dummy_row);

    for (var rowIndex = 0; rowIndex < rows; rowIndex++) {
      if (show_image_url || show_download_image_button) {
        var tools_row = $('<tr></tr>');
        for (var columnIndex = 0; columnIndex < columns; columnIndex++) {
          var index = rowIndex * columns + columnIndex;
          if (index === visibleImages.length) break;

          if (show_image_url) {
            tools_row.append('<td><input type="text" id="image' + index + '" class="image_url_textbox" value="' + linkedImages[visibleImages[index]] + '" readonly /></td>');
          }

          if (show_download_image_button) {
            tools_row.append('<td class="download_image_button" data-url="' + visibleImages[index] + '" title="Download">&nbsp;</td>');
          }
        }
        images_table.append(tools_row);
      }
    }
  }

  function downloadImages() {
    if (ls.show_download_confirmation === 'true') {
      showDownloadConfirmation(startDownload);
    } else {
      startDownload();
    }

    function startDownload() {
      var checkedImages = 0;
      for (var i = 0; i < visibleImages.length; i++) {
        if ($('#image' + i).hasClass('checked')) {
          checkedImages++;
          chrome.downloads.download({
            url: visibleImages[i]
          });
        }
      }

      flashDownloadingNotification(checkedImages);
    }
  }

  function showDownloadConfirmation(startDownload) {
    var notification_container =
      $(
        '<div>\
          <div>\
            <hr/>\
            Take a quick look at your Chrome settings and search for the <b>download location</b>.\
            <span class="danger">If the <b>Ask where to save each file before downloading</b> option is checked, proceeding might open a lot of popup windows. Are you sure you want to do this?</span>\
          </div>\
          <input type="button" id="yes_button" class="success" value="YES" />\
          <input type="button" id="no_button" class="danger" value="NO" />\
          <label><input type="checkbox" id="dont_show_again_checkbox" />Don\'t show this again</label>\
        </div>'
      )
      .appendTo('#filters_container');

    $('#yes_button, #no_button').on('click', function() {
      ls.show_download_confirmation = !$('#dont_show_again_checkbox').prop('checked');
      notification_container.remove();
    });
    $('#yes_button').on('click', startDownload);
  }

  function flashDownloadingNotification(imageCount) {
    if (ls.show_download_notification !== 'true') return;

    var downloading_notification = $('<div class="success">Downloading ' + imageCount + ' image' + (imageCount > 1 ? 's' : '') + '...</div>').appendTo('#filters_container');
    flash(downloading_notification, 3.5, 0, function() {
      downloading_notification.remove();
    });
  }

  function flash(element, flashes, interval, callback) {
    if (!interval) interval = parseInt(ls.animation_duration);

    var fade = function(fadeIn) {
      if (flashes > 0) {
        flashes -= 0.5;
        if (fadeIn) {
          element.fadeIn(interval, function() {
            fade(false);
          });
        } else {
          element.fadeOut(interval, function() {
            fade(true);
          });
        }
      } else if (callback) {
        callback(element);
      }
    };
    fade(false);
  }

  $(function() {
    initializePopup();
    initializeStyles();
  });
}(localStorage));