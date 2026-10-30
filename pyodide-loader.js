(function prepareDuoduoRuntime() {
  if (!('serviceWorker' in navigator)) {
    window.__duoduoSWReady = Promise.reject(new Error('当前浏览器不支持离线运行组件，请使用最新版 Safari、Chrome 或 Edge'));
    return;
  }
  window.__duoduoSWReady = navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(() => navigator.serviceWorker.ready)
    .then(() => new Promise((resolve, reject) => {
      if (navigator.serviceWorker.controller) return resolve(true);
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve(true);
      };
      navigator.serviceWorker.addEventListener('controllerchange', done, { once: true });
      const timer = setTimeout(() => {
        if (!navigator.serviceWorker.controller) {
          settled = true;
          reject(new Error('计算内核加载超时，请刷新页面重试'));
        }
      }, 20000);
      const clear = () => { clearTimeout(timer); resolve(true); };
      if (navigator.serviceWorker.controller) clear();
    }));
})();
