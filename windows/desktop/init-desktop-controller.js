require(['desktop-controller'], function (DesktopController) {
    console.log(`[INIT] desktop module loaded`);
    const desktopCntroller = new DesktopController();
    desktopCntroller.run();
  }, function (error) {
    console.log(`[INIT] failed to load desktop module ${error}`);
  });