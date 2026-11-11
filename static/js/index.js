window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


// Keep all videos in a grid on one clock. With independent `loop`s, every restart
// adds a slightly different seek delay, so the clips drift apart over time.
// The longest video is the master; each other video follows
// (master time mod its own duration), so shorter clips repeat in step.
var SYNC_SEEK_THRESHOLD = 0.3;  // seconds; larger drift is fixed with a seek
var SYNC_MAX_RATE_NUDGE = 0.1;  // smaller drift is absorbed by +/-10% playback rate

function waitUntilPlayable(video) {
  return new Promise(function(resolve) {
    if (video.readyState >= 3) return resolve(true);
    video.addEventListener('canplay', function() { resolve(true); }, { once: true });
    var sources = video.querySelectorAll('source');
    if (sources.length) {
      // A missing file fires `error` on its <source>, not on the <video>.
      sources[sources.length - 1].addEventListener('error', function() { resolve(false); }, { once: true });
    }
    setTimeout(function() { resolve(video.readyState >= 1); }, 8000);
  });
}

function syncVideoGrid(grid) {
  var all = Array.prototype.slice.call(grid.querySelectorAll('video'));
  if (all.length < 2) return;

  Promise.all(all.map(waitUntilPlayable)).then(function(ok) {
    var videos = all.filter(function(v, i) { return ok[i] && v.duration > 0; });
    if (videos.length < 2) return;

    var master = videos.reduce(function(a, b) { return b.duration > a.duration ? b : a; });
    videos.forEach(function(v) {
      v.loop = (v === master);
      v.pause();
      v.currentTime = 0;
    });
    videos.forEach(function(v) { v.play().catch(function() {}); });

    function follow() {
      var t = master.currentTime;
      videos.forEach(function(v) {
        if (v === master) return;
        var d = v.duration;
        var diff = (t % d) - v.currentTime;
        // Measure the shorter way around the loop point.
        if (diff > d / 2) diff -= d;
        if (diff < -d / 2) diff += d;

        if (Math.abs(diff) > SYNC_SEEK_THRESHOLD || v.ended) {
          v.currentTime = t % d;
          v.playbackRate = 1;
        } else {
          v.playbackRate = 1 + Math.max(-SYNC_MAX_RATE_NUDGE, Math.min(SYNC_MAX_RATE_NUDGE, diff));
        }
        if (v.paused && !master.paused) v.play().catch(function() {});
      });
      requestAnimationFrame(follow);
    }
    requestAnimationFrame(follow);
  });
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
    	// Add listener to  event
    	carousels[i].on('before:show', state => {
    		console.log(state);
    	});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    if ($('#interpolation-slider').length) {
      preloadInterpolationImages();

      $('#interpolation-slider').on('input', function(event) {
        setInterpolationImage(this.value);
      });
      setInterpolationImage(0);
      $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);
    }

    bulmaSlider.attach();

    document.querySelectorAll('.teaser-grid').forEach(syncVideoGrid);

})
