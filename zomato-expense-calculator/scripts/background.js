chrome.runtime.onInstalled.addListener(() => {
    console.log("Zomato Expense Calculator Installed");
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: 'dashboard.html' });
});
