chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed!");

    chrome.storage.local.set({ installed: true }, () => {
        console.log("Initial state saved!");
    });
});

chrome.action.onClicked.addListener((tab) => {
    console.log("Extension icon clicked on tab:", tab);
    chrome.storage.local.get("savedTabs", (result) => {
        console.log("Saved tabs:", result.savedTabs);
    });
});

// Event listeners to track tab changes
// chrome.tabs.onCreated.addListener(() => updateWindowList());
// chrome.tabs.onRemoved.addListener(() => updateWindowList());
// chrome.tabs.onUpdated.addListener(() => updateWindowList());