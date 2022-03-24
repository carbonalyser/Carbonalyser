/**
 * Animate buttons with jquery.
 */
const rotateAnimation = {
    loop: false,                                          // did animation loop or not
    currentDeg: 0,                                        // current rotation deg
    minimalNoticeableMs: 40,                              // minimal noticeable delay (ms)
    durationMs: 500,                                      // total duration of animation (ms)
    steps: function () {                                  // how many steps for one animate
      return Math.round(this.durationMs/this.minimalNoticeableMs); 
    },
    degPerStep: function () {                             // how many deg rotate per step
      return 360 / this.steps(); 
    },
    button: null,                                         // button to animate
    start: function() {                                   // start animation
      setTimeout(this.step.bind(this), this.minimalNoticeableMs);
    },
    stop: function() {                                    // stop animation (smoothly)
      this.loop = false;
    },
    step: function () {                                   // make one step in animation
      let animationEnd = false;
      this.currentDeg += this.degPerStep();
      if ( this.loop ) {
        // nothing to do
      } else {
        if (this.currentDeg >= 360 ) {
          this.currentDeg = 0;
          animationEnd = true;
        }
      }
      this.button.rotate(this.currentDeg);
      if ( animationEnd ) {
        this.onAnimationEnd();
      } else {
            setTimeout(this.step.bind(this), this.minimalNoticeableMs);
      }
    },
    reset: function() {                                   // reset animation
      this.currentDeg = 0;
    },
    onAnimationEnd: async function() {                    // called on animation end
      await tab.update();
    }
}