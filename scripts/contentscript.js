(function() {
  /* globals chrome */
  'use strict';

  var itpubDownloader = {
    //http://www.itpub.net/attachment.php?aid=OTIzNzAxfDQyYzhjNDRkfDE0MDQ0NjYwMjB8MzUwMTczfDE4NzU4NDA%3D&fid=61 
    //href = href.replace("attachment.php?", "forum.php?mod=attachment&");
    attachmentRegexp: /attachment.php\?aid=[a-zA-Z0-9]+%3D&fid/,
    mapElement: function(element) {
      if (element.tagName.toLowerCase() === 'a') {
        var href = element.href;
        if (itpubDownloader.isAttachmentURL(href)) {
          href = href.replace(/attachment.php\?/, "forum.php?mod=attachment&");
          var text = element.text;
          itpubDownloader.attachmentTexts[href] = text;
          console.log(text + " | " + href);
          itpubDownloader.linkedImages[href] = text;
          return href;
        }
      }

      return '';
    },

    isAttachmentURL: function(url) {
      return itpubDownloader.attachmentRegexp.test(url);
    },

    removeDuplicateOrEmpty: function(images) {
      var result = [],
        hash = {};

      for (var i = 0; i < images.length; i++) {
        hash[images[i]] = 0;
      }
      for (var key in hash) {
        if (key !== '') {
          result.push(key);
        }
      }
      return result;
    }
  };

  itpubDownloader.attachments = {};
  itpubDownloader.linkedImages = {};
  itpubDownloader.attachmentTexts = {};
  itpubDownloader.images = [].slice.apply(document.getElementsByTagName('*'));
  itpubDownloader.images = itpubDownloader.images.map(itpubDownloader.mapElement);

  itpubDownloader.images = itpubDownloader.removeDuplicateOrEmpty(itpubDownloader.images);
  chrome.extension.sendMessage({
    linkedImages: itpubDownloader.linkedImages,
    attachmentTexts: itpubDownloader.attachmentTexts,
    attachments: itpubDownloader.attachments,
    images: itpubDownloader.images
  });

  itpubDownloader.attachments = null;
  itpubDownloader.linkedImages = null;
  itpubDownloader.attachmentTexts = null;
  itpubDownloader.images = null;
}());