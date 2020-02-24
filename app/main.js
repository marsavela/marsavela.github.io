$(document).ready(function() {

  // Show my email address
  var $emailLinks = $('.email.obfuscated');
  if ($emailLinks.data('email')) {
    var obfuscated = $emailLinks.data('email');
    $emailLinks.attr('href', 'mailto:' + obfuscated
          .replace(/ /, '@')
          .replace(/ /, '.'));
  }
});