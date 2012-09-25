
chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
        sendResponse({farewell: "O HAI! " + request.greeting + ". You've just been in extension background!"});
    });