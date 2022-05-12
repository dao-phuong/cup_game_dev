"use strict";
(function (window, document, experiment) {
	$(function() {
	   //  window.addEventListener('message', function(event) {
	   //      console.log("event receive message from omni ", event);
	   //      if (event.data && event.data.headsets) {
	   //          window.headsets = event.data.headsets;
	   //          window.auth = event.data.auth;
	   //          window.client.authToken = event.data.auth;
	   //          // setTimeout(setupExperiment, 300);
				// experiment.initExperiment();
	   //      }
	   //  });
		setTimeout(window.experiment.initExperiment, 1000);
	});
})(window, window.document, window.experiment = window.experiment || {});
