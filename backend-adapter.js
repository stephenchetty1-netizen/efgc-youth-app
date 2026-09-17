window.EFGC_SUPABASE={url:'https://ktgdabqninofldpafklz.supabase.co',publishableKey:'sb_publishable_6SP_eNtyZiIUbHk7Raq3qQ_Em9HVF1d',projectRef:'ktgdabqninofldpafklz'};
(() => {
  const assets = [
    { type:'style', selector:'link[data-efgc-duty-v63]', src:'v63-duty-ack.css?v=63.0', data:'efgcDutyV63' },
    { type:'script', selector:'script[data-efgc-duty-v63]', src:'v63-duty-ack.js?v=63.0', data:'efgcDutyV63' },
    { type:'style', selector:'link[data-efgc-scripture-v68]', src:'v68-scripture-generator.css?v=68.0', data:'efgcScriptureV68' },
    { type:'script', selector:'script[data-efgc-scripture-v68]', src:'v68-scripture-generator.js?v=68.0', data:'efgcScriptureV68' }
  ];
  assets.forEach((asset) => {
    if (document.querySelector(asset.selector)) return;
    if (asset.type === 'style') {
      const node = document.createElement('link');
      node.rel = 'stylesheet';
      node.href = asset.src;
      node.dataset[asset.data] = '1';
      document.head.appendChild(node);
    } else {
      const node = document.createElement('script');
      node.src = asset.src;
      node.async = true;
      node.dataset[asset.data] = '1';
      document.body.appendChild(node);
    }
  });
})();
