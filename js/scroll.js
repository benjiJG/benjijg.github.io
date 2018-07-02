$(document).ready(function(){
  // Add smooth scrolling to all links
  $("a").on('click', function(event) {
    if (this.hash !== "") {
      event.preventDefault();
      var hash = this.hash;
      $('html, body').animate({
        scrollTop: $(hash).offset().top
      }, 800, function(){
        window.location.hash = hash;
      });
    }
  });

  // Add functionality for slider
});

$(window).on('load', function() {
  document.getElementById('home').scrollIntoView();
  // Initialise page to home pane
  $('#home-button').trigger('click');
});

// Animate computer svg
var tl = new TimelineMax();
$('.arrow-up, #portfolio-button').on('click', function() {
  var tl = new TimelineMax();

  tl.from('#stand', 0.5, {scaleY: 0, transformOrigin: "bottom", ease: Power2.easeOut})
    .from('#standBack', 0.5, {scaleY: 0, transformOrigin: "bottom", ease: Bounce.easeOut}) 
    .from('#monitorBottom', 0.7, {scaleX: 0, transformOrigin: "center", ease: Bounce.easeOut})
    .from('#screen', 0.6, {scaleY: 0, transformOrigin: "bottom", ease: Circ.easeOut, delay: 0.4})
    .from('#yellowBox', 0.5, {scale: 0})
    .staggerFrom('#Layer_1 > g:nth-child(1) > g path', 0.2, {scaleX: 0}, -0.1)

  // Add animation to skill bars
  $('.skillbar').each(function(){
		$(this).find('.skillbar-bar').animate({
			width:$(this).attr('data-percent')
		},6000);
  });
});
