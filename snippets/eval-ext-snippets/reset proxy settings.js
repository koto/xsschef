// requires proxy permission
try {
   chrome.proxy.settings.get({'incognito': false},__logEval);
} catch (e){
   __logEval(false);
}