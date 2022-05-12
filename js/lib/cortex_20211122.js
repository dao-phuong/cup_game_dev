import { Cortex } from './cortexLib_20211122.js'
    let emotiv = {};
    let SOCKET_URL = "wss://localhost:6868";
    emotiv.client = new Cortex(SOCKET_URL);

    //listen event from omni
    window.addEventListener('message', function(event) {
        console.log("event receive message from labs ", event);
        if (event.data && event.data.headsets) {
            emotiv.client.authToken = event.data.auth;
            emotiv.client.headsetId = event.data.headsets[0];
            emotiv.client.sessionId = event.data.session_id[0];
        }

        emotiv.origin = event.origin;
    });

    let markers_sent = [];
    let markers_set = [];

    emotiv.setupExperiment = async function (client_id, client_secret) {
        emotiv.client.clientId = client_id;
        emotiv.client.clientSecret = client_secret;
        let all_id = document.getElementById("root");
        if (all_id !== undefined) {
            all_id.style.cursor = 'wait';
        }
        await emotiv.client.checkGrantAccessAndQuerySessionInfo(client_id, client_secret);
        let sessionId = "";
        await emotiv.client.querySessions().then((resp) => {
            if (resp.result.length > 0) {
                sessionId = resp.result[0].id;
                console.log("Retrieved Session " + sessionId);
            }
        }, (err) => {
            console.log("ERROR GETTING session: " + err);
        });
        if (sessionId === "") {
            await emotiv.client.createSession(this.headsetId).then((result)=>{
                sessionId=result;
                console.log("createSession Result " + result);
            }, (err)=>{
                console.log("ERROR in creating session");
            });
            console.log("Created Session? " + sessionId);
        }
        this.sessionId = sessionId;
        if (all_id !== undefined) {
            all_id.style.cursor = 'none';
        }
        console.log("Finished Setup");
    }


    emotiv.sendMarkers = function(markerBuffer) {
        if (emotiv.client) {
            let n = 1
            let common_time = performance.now() + T0;
            for (var key in markerBuffer) {
                var value = markerBuffer[key];

                var d = n * 200;
                setTimeout(function() {
                    emotiv.sendMarker(value, key, false, common_time);
                }, d)
                n++;
            }
        }
    }

    let T0 = Date.now() - performance.now();
    emotiv.sendStopMarker = function (time) {
        if (emotiv.client.sessionId) {
            if (time === undefined) {
                time = performance.now() + T0;
            }

            if (emotiv.run_marker_id) {
                emotiv.client.sendStopMarker(emotiv.run_marker_id, time)
            } else {
                const stopInvertal = setInterval(() => {
                    console.log('stop invertal', emotiv.run_marker_id);
                    if (emotiv.run_marker_id) {
                        emotiv.client.sendStopMarker(emotiv.run_marker_id, time);
                        emotiv.run_marker_id = undefined;
                        clearInterval(stopInvertal);
                    }
                }, 50);
            }
        }
    }

    emotiv.updateMarker = function (time, extras={}) {
        if (emotiv.client.sessionId) {
            if (time === undefined) {
                time = performance.now() + emotiv.T0;
            }

            if (emotiv.run_marker_id) {
                emotiv.client.updateMarker(emotiv.run_marker_id, time, extras);
            } else {
                console.log("Failed to update marker");
            }
        }
    }

    emotiv.sendMarker = async function(value, label, save_marker_id=false, time=-1) {
        if ( emotiv.client.sessionId && emotiv.client.authToken) {
            if (typeof value === "boolean"){
                value = value ? "True": "False";
            }
            if (time === -1) {
                time = performance.now() + T0;
            }
            markers_sent.push(time);
            let port = document.title;
            let event = await emotiv.client.injectMarker(label, value, port, time);
            let marker = event.result.marker;
            markers_set.push(marker.startDatetime);
            emotiv.run_marker_id = marker.uuid
        }
    }

    emotiv.startRecord = function(title='title', subject_name='', description='') {
        console.log('markers_sent', markers_sent)
        console.log('markers_set', markers_set)
        if (emotiv.client){
            return emotiv.client.startRecord(title, subject_name, description)
                .then((s) => {
                    console.log('Record started');
                    console.log(s);
                }, (err) => {
                    console.log('Problem starting record', err)
            });
        }
    }

    emotiv.closeRecord = function() {
        console.log('markers_sent', markers_sent)
        console.log('markers_set', markers_set)
        if (emotiv.client){
            return emotiv.client.stopRecord()
                .then((s) => {
                    console.log('Finished');
                    console.log(s);
                }, (err) => {
                    console.log('Problem closing session', err)
            });
        }
    }

    emotiv.endExperiment = () => {
        window.parent.postMessage({"data": "psychopy finished"}, emotiv.origin); 
    }

export { emotiv };
