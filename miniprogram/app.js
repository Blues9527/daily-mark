const store = require('./utils/store');

App({
  globalData: {
    statusBarHeight: 20,
  },

  onLaunch(options) {
    let statusBarHeight = 20;
    let headerTop = 64;
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      statusBarHeight = info.statusBarHeight || 20;
      headerTop = statusBarHeight + 44;
    } catch (error) {
      statusBarHeight = 20;
      headerTop = 64;
    }
    try {
      const menu = wx.getMenuButtonBoundingClientRect
        ? wx.getMenuButtonBoundingClientRect()
        : null;
      if (menu && menu.bottom) headerTop = menu.bottom + 8;
    } catch (error) {
      headerTop = statusBarHeight + 44;
    }
    this.globalData.statusBarHeight = headerTop;
    const demo = Boolean(options && options.query && options.query.demo === '1');
    store.init({ demo });
  },
});
