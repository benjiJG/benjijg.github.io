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
