var H5P = H5P || {};

/**
 * H5P audio module
 *
 * @external {jQuery} $ H5P.jQuery
 */
H5P.Audio = (function ($) {
  /**
  * @param {Object} params Options for this library.
  * @param {Number} id Content identifier
  * @returns {undefined}
  */
  function C(params, id) {
    this.$ = $(this);
    this.contentId = id;
    this.params = params;

    this.params = $.extend({}, {
      playerMode: 'full',
      fitToWrapper: true,
      controls: true,
      autoplay: false
    }, params);

    // Use new copyright information if available. Fallback to old.
    if (params.files !== undefined
      && params.files[0] !== undefined
      && params.files[0].copyright !== undefined) {

      this.copyright = params.files[0].copyright;
    }
    else if (params.copyright !== undefined) {
      this.copyright = params.copyright;
    }
  }

  /**
   * Adds a minimalistic look to the audio player.
   *
   * @param {jQuery} $container Container for the player.
   */
  C.prototype.addMinimalAudioPlayer = function ($container) {
    var INNER_CONTAINER = 'h5p-audio-inner';
    var AUDIO_BUTTON = 'h5p-audio-minimal-button';
    var PLAY_BUTTON = 'h5p-audio-minimal-play';
    var PAUSE_BUTTON = 'h5p-audio-minimal-pause';

    var self = this;
    self.$inner = $('<div/>', {
      class: INNER_CONTAINER
    }).appendTo($container);

    var audioButton = $('<button/>', {
      class: AUDIO_BUTTON
    }).appendTo(self.$inner)
      .click( function () {
        if (audioButton.hasClass(PLAY_BUTTON)) {
          audioButton.removeClass(PLAY_BUTTON);
          audioButton.addClass(PAUSE_BUTTON);
          self.play();
        }
        else {
          audioButton.removeClass(PAUSE_BUTTON);
          audioButton.addClass(PLAY_BUTTON);
          self.stop();
        }
      });

    //Auto start playing
    if (this.params.autoplay || this.params.cpAutoplay) {
      audioButton.removeClass(PLAY_BUTTON);
      audioButton.addClass(PAUSE_BUTTON);
    }
    else {
      audioButton.addClass(PLAY_BUTTON);
    }

    if (this.params.fitToWrapper === undefined || this.params.fitToWrapper) {
      audioButton.css({ width: '100%' });
      self.$inner.css({height: '100%', display: 'flex'});
    }

    self.audio.addEventListener('ended', function () {
      audioButton.removeClass(PAUSE_BUTTON);
      audioButton.addClass(PLAY_BUTTON);
    });

    this.$audioButton = audioButton;
    //Scale icon to container
    self.resize();
  };

  /**
   * Resizes the audio player icon when the wrapper is resized.
   */
  C.prototype.resize = function () {
    // Find the smallest value of height and width, and use it to choose the font size.
    if (this.params.fitToWrapper) {
      var smallest = (this.$inner.width() < this.$inner.height()) ? (this.$inner.width() / 2) : (this.$inner.height() / 2);
      this.$audioButton.css({'font-size': smallest+'px'});
    }
  };



  return C;
})(H5P.jQuery);

/**
 * Wipe out the content of the wrapper and put our HTML in it.
 *
 * @param {jQuery} $wrapper Our poor container.
 */
H5P.Audio.prototype.attach = function ($wrapper) {
  $wrapper.addClass('h5p-audio-wrapper');
  
  // Check if browser supports audio.
  var audio = document.createElement('audio');
  if (audio.canPlayType === undefined) {
    // Try flash
    this.attachFlash($wrapper);
    return;
  }

  // Add supported source files.
  if (this.params.files !== undefined && this.params.files instanceof Object) {
    for (var i = 0; i < this.params.files.length; i++) {
      var file = this.params.files[i];

      if (audio.canPlayType(file.mime)) {
        var source = document.createElement('source');
        source.src = H5P.getPath(file.path, this.contentId);
        source.type = file.mime;
        audio.appendChild(source);
      }
    }
  }

  if (!audio.children.length) {
    // Try flash
    this.attachFlash($wrapper);
    return;
  }

  if (this.endedCallback !== undefined) {
    audio.addEventListener('ended', this.endedCallback, false);
  }

  audio.className = 'h5p-audio';
  audio.controls = this.params.controls === undefined ? true : this.params.controls;
  audio.autoplay = this.params.autoplay === undefined ? false : this.params.autoplay;
  audio.preload = 'auto';
  audio.style.display = 'block';

  if (this.params.fitToWrapper === undefined || this.params.fitToWrapper) {
    audio.style.width = '100%';
    audio.style.height = '100%';
  }


  this.audio = audio;

  if (this.params.playerMode === 'minimalistic') {
    audio.controls = false;
    this.addMinimalAudioPlayer($wrapper);
  }
  else {
    $wrapper.html(audio);
  }
};

/**
 * Attaches a flash audio player to the wrapper.
 *
 * @param {jQuery} $wrapper Our dear container.
 */
H5P.Audio.prototype.attachFlash = function ($wrapper) {
  if (this.params.files !== undefined && this.params.files instanceof Object) {
    for (var i = 0; i < this.params.files.length; i++) {
      var file = this.params.files[i];
      if (file.mime === 'audio/mpeg' || file.mime === 'audio/mp3') {
        var audioSource = H5P.getPath(file.path, this.contentId);
        break;
      }
    }
  }

  if (audioSource === undefined) {
    $wrapper.text('No supported audio files found.');
    if (this.endedCallback !== undefined) {
      this.endedCallback();
    }
    return;
  }

  var options = {
    buffering: true,
    clip: {
      url: window.location.protocol + '//' + window.location.host + audioSource,
      autoPlay: this.params.autoplay === undefined ? false : this.params.autoplay,
      scaling: 'fit'
    },
    plugins: {
      controls: null
    }
  };

  if (this.params.controls === undefined || this.params.controls) {
    options.plugins.controls = {
      fullscreen: false,
      autoHide: false
    };
  }

  if (this.endedCallback !== undefined) {
    options.clip.onFinish = this.endedCallback;
    options.clip.onError = this.endedCallback;
  }

  this.flowplayer = flowplayer($wrapper[0], {
    src: "http://releases.flowplayer.org/swf/flowplayer-3.2.16.swf",
    wmode: "opaque"
  }, options);
};

/**
 * Stop the audio. TODO: Rename to pause?
 *
 * @returns {undefined}
 */
H5P.Audio.prototype.stop = function () {
  if (this.flowplayer !== undefined) {
    this.flowplayer.stop().close().unload();
  }
  if (this.audio !== undefined) {
    this.audio.pause();
  }
};

/**
 * Play
 */
H5P.Audio.prototype.play = function () {
  if (this.flowplayer !== undefined) {
    this.flowplayer.play();
  }
  if (this.audio !== undefined) {
    this.audio.currentTime = 0;
    this.audio.play();
  }
};

/**
 * Gather copyright information for the current content.
 *
 * @returns {H5P.ContentCopyrights} Copyright information
 */
H5P.Audio.prototype.getCopyrights = function () {
  if (this.copyright === undefined) {
    return;
  }
  
  var info = new H5P.ContentCopyrights();
  info.addMedia(new H5P.MediaCopyright(this.copyright));
  
  return info;
};
