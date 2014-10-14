(function(ls) {
  'use strict';

  // One-time reset of settings
  chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') { // Open the options page after install
      chrome.tabs.create({
        url: '/views/options.html'
      });
    } else if (details.reason === 'update' && /^(((0|1)\..*)|(2\.(0|1)(\..*)?))$/.test(details.previousVersion)) { // Clear data from versions before 2.1
      ls.clear();
    }
  });

  // Define struct of attachments
  function Attachment(url, title, checkedSign) {
    this.url = url;
    this.title = title;
    this.checkedSign = checkedSign;
  }

  // Global
  ls.animation_duration = '500';

  // Popup
  var defaults = {
    // Filters
    folder_name: '',
    filter_url: '',
    filter_url_mode: 'normal',
    filter_min_width: 0,
    filter_min_width_enabled: false,
    filter_max_width: 3000,
    filter_max_width_enabled: false,
    filter_min_height: 0,
    filter_min_height_enabled: false,
    filter_max_height: 3000,
    filter_max_height_enabled: false,
    only_images_from_links: false,
    // Options
    // General
    show_download_confirmation: true,
    show_download_notification: true,
    // Filters
    show_url_filter: true,
    // Images
    show_image_url: true,
    show_download_image_button: true,
    columns: 1,
    image_min_width: 250,
    image_max_width: 350,
    image_border_width: 3,
    image_border_color: '#3498db'
  };

  for (var option in defaults) {
    if (ls[option] === undefined) ls[option] = defaults[option];
    ls[option + '_default'] = defaults[option];
  }

  ls.options = JSON.stringify(Object.keys(defaults));
}(localStorage));

chrome.runtime.onInstalled.addListener(function() {
  // Replace all rules ...
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    // With a new rule ...
    chrome.declarativeContent.onPageChanged.addRules([
      {
        // That fires when a page's URL is itpub.net forum detail page:
        // http://www.itpub.net/thread-1876279-1-3.html or http://www.itpub.net/forum.php?mod=viewthread&tid=1835016
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'www.itpub.net', schemes: ['http'],  urlContains: 'thread' },
          }),
        ],
        // And shows the extension's page action.
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
});
