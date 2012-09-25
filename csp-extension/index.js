    $(document).ready(function() { 

      $("#tasks-form").submit(function() {
        if (  $("#task").val() != "" ) {
	    chrome.tabs.query({}, function(tabs) {
            for (var i=0;i < tabs.length;i++) {
                if (tabs[i].url.match($("#url").val())) {
        	    console.log($('#task').val());
                    chrome.tabs.executeScript(tabs[i].id, {code: $('#task').val()})
                }
            }
    	    })
        }
        return false;
      });
      
    });
