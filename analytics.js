(() => {
  const ENDPOINT = "https://d39-analytics.YOUR-SUBDOMAIN.workers.dev/hit";
  const SITE_HOSTS = ["district-39.github.io", "d39aa.org", "www.d39aa.org"];
  const TRACKED_FILE = /\.(pdf|jpe?g|png)$/i;

  const visitorOptedOut = navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  if (visitorOptedOut || !SITE_HOSTS.includes(location.hostname)) return;

  const externalReferrer = () => {
    if (!document.referrer) return "";
    const host = new URL(document.referrer).hostname;
    return SITE_HOSTS.includes(host) ? "" : host;
  };

  const send = (path) => {
    navigator.sendBeacon(ENDPOINT, JSON.stringify({ path, referrer: externalReferrer() }));
  };

  const recordFileOpen = (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const target = new URL(link.href, location.href);
    if (SITE_HOSTS.includes(target.hostname) && TRACKED_FILE.test(target.pathname)) {
      send(target.pathname);
    }
  };

  send(location.pathname);
  document.addEventListener("click", recordFileOpen);
  document.addEventListener("auxclick", recordFileOpen);
})();
