console.log("starting worker");

const compareFn = (a, b) => {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
};

chrome.action.onClicked.addListener(async (tab) => {
  const tabs = await chrome.tabs.query({});
  const tabUrls = tabs.map((tab) => {
    let url;
    if (tab.discarded && tab.pendingUrl) {
      // Tabs get discarded, e.g., when memory saver is active. In this case,
      // the correct url is `pendingUrl` (assuming it's present).
      url = tab.pendingUrl;
    } else {
      url = tab.url;
    }
    return { id: tab.id, url: url };
  });
  // TODO: Sort while ignoring query params/fragments.
  tabUrls.sort((a, b) => compareFn(a.url, b.url));

  const targetIndexes = tabUrls.map((tab, index) => ({ ...tab, index: index }));
  let promises = [];
  console.log("moving tabs");
  for (const tab of targetIndexes) {
    // Sadly, it doesn't seem to be possible to move multiple tabs at once to
    // arbitrary locations (though you can bulk move a set of tabs to a fixed
    // location).
    // await chrome.tabs.move(tab.id, {index: tab.index});
    promises.push(chrome.tabs.move(tab.id, { index: tab.index }));
  }
  await Promise.all(promises);
  console.log("moved tabs");
});
