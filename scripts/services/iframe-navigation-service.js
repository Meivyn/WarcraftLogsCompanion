define(function() {
  class IframeNavigationService {
    listenForNavigationEvents() {
      window.addEventListener('message', event => {
        if (event.data === 'goBack')
          window.history.back();

        if (event.data === 'goForward')
          window.history.forward();

        if (event.data === 'refresh')
          window.location.reload();
      });
    }
  }

  return IframeNavigationService;
});