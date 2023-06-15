// Sort urls by base, then query, then hash. This ensures that all urls with a
// matching scheme/host/port/path get grouped together.
const compareUrls = (a, b) => {
  // First, compare the "base" url (scheme, host, port, and path).
  if (a.base < b.base) {
    return -1;
  } else if (a.base > b.base) {
    return 1;
  }
  // Then, compare query strings. Empty query strings always come first.
  if (a.query < b.query) {
    return -1;
  } else if (a.query > b.query) {
    return 1;
  }
  // Finally, compare hashses.
  if (a.hash < b.hash) {
    return -1;
  } else if (a.hash > b.hash) {
    return 1;
  }
  return 0;
};

const createSortableUrl = (urlString) => {
  const url = new URL(urlString);
  // Extract the query parameters and hash directly.
  const query = url.search;
  const hash = url.hash;
  // To create the "base" url, we have to manually remove the query params and
  // fragment and then reconstruct the resulting url.
  for (const key of url.searchParams.keys()) {
    url.searchParams.delete(key);
  }
  url.hash = "";
  const base = url.toString();
  return {
    original: urlString,
    base,
    query,
    hash,
  };
};

chrome.action.onClicked.addListener(async (tab) => {
  // NOTE: We only sort urls within the current (active) window.
  const tabs = await chrome.tabs.query({
    currentWindow: true,
  });
  const tabUrls = tabs.map((tab) => {
    let originalUrl;
    if (tab.discarded && tab.pendingUrl) {
      // Tabs get discarded, e.g., when memory saver is active. In this case,
      // the correct url is `pendingUrl` (assuming it's present).
      originalUrl = tab.pendingUrl;
    } else {
      originalUrl = tab.url;
    }
    const url = createSortableUrl(originalUrl);
    return { id: tab.id, url };
  });
  tabUrls.sort((a, b) => compareUrls(a.url, b.url));

  const targetIndexes = tabUrls.map((tab, index) => ({ ...tab, index: index }));
  let urls = [];
  let promises = [];
  for (const tab of targetIndexes) {
    // Sadly, it doesn't seem to be possible to move multiple tabs at once to
    // arbitrary locations (though you can bulk move a set of tabs to a fixed
    // location).
    promises.push(chrome.tabs.move(tab.id, { index: tab.index }));
    urls.push(tab.url);
  }
  await Promise.all(promises);
  const mime = "text/plain;charset=UTF-8";
  const dataUrl = `data:${mime},${encodeURIComponent(
    urls.map((u) => u.original).join("\n")
  )}`;
  await chrome.tabs.create({
    active: true,
    url: dataUrl,
  });
});
