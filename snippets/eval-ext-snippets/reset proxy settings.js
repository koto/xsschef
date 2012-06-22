// requires proxy permission
try {
   chrome.proxy.settings.clear({'incognito': false},__logEval);
} catch (e){
   __logEval(false);
}