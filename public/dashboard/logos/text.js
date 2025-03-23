console.log("Hosted script is loaded and working!");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "test") {
    sendResponse({ response: "Background script is working!" });
  }
});
