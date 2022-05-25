/**
 * This class handle:
 *  - create websocket connection
 *  - handle request for : headset , request access, control headset ...
 *  - handle 2 main flows : sub and train flow
 *  - use async/await and Promise for request need to be run on sync
 */

class Cortex {
    constructor (socket_url) {
        // create socket
        this.socket = new WebSocket(socket_url);
        // // Production credentials
        this.clientId = null;
        this.clientSecret = null;
        this.debit = 1;
    }

    queryHeadsetId(){
        const QUERY_HEADSET_ID = 2
        let socket = this.socket
        let queryHeadsetRequest =  {
            "jsonrpc": "2.0", 
            "id": QUERY_HEADSET_ID,
            "method": "queryHeadsets",
            "params": {}
        }

        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(queryHeadsetRequest));
            socket.onmessage = function(event) {
                try {
                    let data = event.data
                    if(JSON.parse(data)['id']==QUERY_HEADSET_ID){
                        if(JSON.parse(data)['result'].length > 0){
                            let headsetId = JSON.parse(data)['result'][0]['id']
                            resolve(headsetId)
                        }
                        else{
                            let ele = document.getElementById("msg");
                            if (ele != undefined) {
                                ele.innerHTML = "No headset connected";
                            }
                        }
                    }
                    
                } catch (error) {
                    let ele = document.getElementById("msg");
                    if (ele != undefined) {
                        ele.innerHTML = "Problem connecting to headset";
                    }
                }
            }
        })
    }

    getCortexInfo(){
        let socket = this.socket
        return new Promise(function(resolve, reject){
            const REQUEST_ACCESS_ID = 999;
            let requestAccessRequest = {
                "jsonrpc": "2.0", 
                "method": "getCortexInfo", 
                "id": REQUEST_ACCESS_ID
            }

            socket.send(JSON.stringify(requestAccessRequest));
            socket.onmessage = function(event) {
                try {
                    let data = event.data;
                    if(JSON.parse(data)['id']==REQUEST_ACCESS_ID){
                        resolve(data);
                    }
                } catch (error) {}
            }
        })
    }

    requestAccess(){
        let socket = this.socket
        let self = this;
        return new Promise(function(resolve, reject){
            const REQUEST_ACCESS_ID = 1
            let requestAccessRequest = {
                "jsonrpc": "2.0", 
                "method": "requestAccess", 
                "params": { 
                    "clientId": self.clientId, 
                    "clientSecret": self.clientSecret
                },
                "id": REQUEST_ACCESS_ID
            }

            // console.log('start send request: ',requestAccessRequest)
            socket.send(JSON.stringify(requestAccessRequest));

            socket.onmessage = function(event) {
                try {
                    let data = event.data;
                    if(JSON.parse(data)['id']==REQUEST_ACCESS_ID){
                        resolve(data)
                    }
                } catch (error) {}
            }
        })
    }

    authorize(){
        let socket = this.socket
        let self = this;
        return new Promise(function(resolve, reject){
            const AUTHORIZE_ID = 4
            let authorizeRequest = { 
                "jsonrpc": "2.0", "method": "authorize", 
                "params": { 
                    "clientId": self.clientId, 
                    "clientSecret": self.clientSecret, 
                    "debit": self.debit
                },
                "id": AUTHORIZE_ID
            }
            socket.send(JSON.stringify(authorizeRequest))
            socket.onmessage = function(event) {
                try {
                    let data = event.data;
                    if(JSON.parse(data)['id']==AUTHORIZE_ID){
                        let cortexToken = JSON.parse(data)['result']['cortexToken']
                        resolve(cortexToken)
                    }
                } catch (error) {}
            }
        })
    }

    controlDevice(headsetId){
        let socket = this.socket
        const CONTROL_DEVICE_ID = 3
        let controlDeviceRequest = {
            "jsonrpc": "2.0",
            "id": CONTROL_DEVICE_ID,
            "method": "controlDevice",
            "params": {
                "command": "connect",
                "headset": headsetId
            }
        }
        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(controlDeviceRequest));
            socket.onmessage = function(event) {
                try {
                    let data = event.data;
                    if(JSON.parse(data)['id']==CONTROL_DEVICE_ID){
                        resolve(data)
                    }
                } catch (error) {}
            }
        }) 
    }

    createSession(headsetId){
        let socket = this.socket;
        const CREATE_SESSION_ID = 5
        let createSessionRequest = { 
            "jsonrpc": "2.0",
            "id": CREATE_SESSION_ID,
            "method": "createSession",
            "params": {
                "cortexToken": this.authToken,
                "headset": headsetId,
                "status": "active"
            }
        }
        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(createSessionRequest));
            socket.onmessage = function(event) {
                // console.log(data)
                try {
                    let data = event.data;
                    if(JSON.parse(data)['id']==CREATE_SESSION_ID){
                        let sessionId = JSON.parse(data)['result']['id']
                        resolve(sessionId)
                    }
                } catch (error) {}
            }
        })
    }

    startRecord(recordName, subject_name="",description="", groupName=""){
        let socket = this.socket;
        const CREATE_RECORD_REQUEST_ID = 11

        let createRecordRequest = {
            "jsonrpc": "2.0", 
            "method": "createRecord", 
            "params": {
                "cortexToken": this.authToken,
                "session": this.sessionId,
                "title": recordName,
                "description": description
            }, 
            "id": CREATE_RECORD_REQUEST_ID
        }
        if (subject_name.length > 0) {
            createRecordRequest.params.subjectName = subject_name;
        }
        console.log(createRecordRequest);
        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(createRecordRequest));
            socket.onmessage = function(event) {
                try {
                    let data = event.data;
                    if(JSON.parse(data)['id']==CREATE_RECORD_REQUEST_ID){
                        console.log('CREATE RECORD RESULT --------------------------------')
                        console.log(data)
                        resolve(data)
                    }
                } catch (error) {}
            }
        })
    }

    sendStopMarker(markerId, time) {
        let socket = this.socket;
        const UPDATE_MARKER_REQUEST_ID = 14
        let updateMarkerRequest = {
            "jsonrpc": "2.0",
            "id": UPDATE_MARKER_REQUEST_ID,
            "method": "updateMarker", 
            "params": {
                "cortexToken": this.authToken, 
                "session": this.sessionId, 
                "markerId": markerId,
                "time": time
            }
        }
        console.log(updateMarkerRequest)
        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(updateMarkerRequest));
            socket.onmessage = function(event) {
                try {
                    let data = JSON.parse(event.data);
                    if(data['id']==UPDATE_MARKER_REQUEST_ID){
                        console.log('UPDATE MARKER RESULT --------------------------------')
                        console.log(data)
                        resolve(data)
                    }
                } catch (error) {}
            }
        })
    }

    injectMarker(label, value, port, time, save=false){
        let socket = this.socket;
        const INJECT_MARKER_REQUEST_ID = 13
        let injectMarkerRequest = {
            "jsonrpc": "2.0",
            "id": INJECT_MARKER_REQUEST_ID,
            "method": "injectMarker", 
            "params": {
                "cortexToken": this.authToken, 
                "session": this.sessionId, 
                "label": label,
                "value": value, 
                "port": port,
                "time": time
            }
        }
        console.log(injectMarkerRequest)
        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(injectMarkerRequest));
            socket.onmessage = function(event) {
                try {
                    let data = JSON.parse(event.data);
                    if(data['id']==INJECT_MARKER_REQUEST_ID){
                        console.log('INJECT MARKER RESULT --------------------------------')
                        console.log(data)
                        resolve(data)
                    }
                } catch (error) {
                    console.log("unable to inject marker")                  
                }
            }
        })
    }

    updateMarker(markerId, time, extras={}) {
        let socket = this.socket;
        const UPDATE_MARKER_REQUEST_ID = 16
        let updateMarkerRequest = {
            "jsonrpc": "2.0",
            "id": UPDATE_MARKER_REQUEST_ID,
            "method": "updateMarker", 
            "params": {
                "cortexToken": this.authToken, 
                "session": this.sessionId, 
                "markerId": markerId,
                "time": time,
                "extras": extras
            }
        }
        console.log(updateMarkerRequest)
        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(updateMarkerRequest));
            socket.onmessage = function(event) {
                try {
                    let data = JSON.parse(event.data);
                    if(data['id']==UPDATE_MARKER_REQUEST_ID){
                        console.log('UPDATE WITH EXTRAS MARKER RESULT --------------------------------')
                        console.log(data)
                        resolve(data)
                    }
                } catch (error) {}
            }
        })
    }

    querySessions(){
        let socket = this.socket;
        const QUERY_SESSIONS_REQUEST_ID = 15
        let querySessionsRequest = {
            "jsonrpc": "2.0", 
            "method": "querySessions", 
            "params": {
                "cortexToken": this.authToken
            }, 
            "id": QUERY_SESSIONS_REQUEST_ID
        }

        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(querySessionsRequest));
            socket.onmessage = function(event) {
                try {
                    let data = JSON.parse(event.data);
                    if(data['id']==QUERY_SESSIONS_REQUEST_ID){
                        console.log('QUERY SESSIONS RESULT --------------------------------')
                        console.log(data)
                        resolve(data)
                    }
                } catch (error) {
                    console.log("ERROR: " + error)
                    reject(error);
                }
            }
        })
    }

    stopRecord(){
        let socket = this.socket;
        const STOP_RECORD_REQUEST_ID = 12
        let stopRecordRequest = {
            "jsonrpc": "2.0", 
            "method": "stopRecord", 
            "params": {
                "cortexToken": this.authToken,
                "session": this.sessionId
            }, 
            "id": STOP_RECORD_REQUEST_ID
        }

        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(stopRecordRequest));
            socket.onmessage = function(event) {
                try {
                    let data = event.data;
                    if(JSON.parse(data)['id']==STOP_RECORD_REQUEST_ID){
                        console.log('STOP RECORD RESULT --------------------------------')
                        console.log(data)
                        resolve(data)
                    }
                } catch (error) {}
            }
        })
    }

    /**
     * - query headset infor
     * - connect to headset with control device request
     * - authentication and get back auth token
     * - create session and get back session id
     */
    async querySessionInfo(){
        let headsetId=""
        await this.queryHeadsetId()
            .then((headset)=>{headsetId = headset}, 
                ()=>{ console.log("Unable to queryHeadsets"); return }
            );
        this.headsetId = headsetId

        let ctResult=""
        await this.controlDevice(headsetId).then((result)=>{ctResult=result})
        this.ctResult = ctResult
        console.log(ctResult)

        if (this.authToken === undefined){
            let authToken=""
            await this.authorize().then((auth)=>{authToken = auth})
            this.authToken = authToken
        }

        let sessionId = ""
        await this.querySessions().then((resp) => {
            if (resp.result.length > 0) {
                sessionId = resp.result[0].id;
            }
        })
        // if (sessionId == "") {
        //     await this.createSession(headsetId).then((result)=>{sessionId=result})
        // }
        this.sessionId = sessionId
        // let recordId = "";
        // await this.startRecord(document.title).then((result)=>recordId=result);
        // console.log("recordId " + recordId);
        console.log('HEADSET ID -----------------------------------')
        console.log(this.headsetId)
        console.log('\r\n')
        console.log('CONNECT STATUS -------------------------------')
        console.log(this.ctResult)
        console.log('\r\n')
        console.log('AUTH TOKEN -----------------------------------')
        console.log('\r\n')
        console.log('SESSION ID -----------------------------------')
        console.log(this.sessionId)
        console.log('\r\n')
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.sessionId);
            }, 20);
        });
    }

    async joinOmniscienceSession(){
        this.checkGrantAccessAndQuerySessionInfo()

        if (this.authToken === undefined){
            console.warn("no authtoken");
        }
        let sessionId = ""
        await this.querySessions().then((resp) => {
            if (resp.result.length > 0) {
                sessionId = resp.result[0].id;
            }
            if (resp.result.length > 1) {
                console.warn("Too many sessions returned");
            }
        })
        if (sessionId == "") {
            await this.createSession(this.headsetId).then((result)=>{sessionId=result})
        }
        console.log("set session id");
        this.sessionId = sessionId
    }



    /**
     * - check if user logined
     * - check if app is granted for access
     * - query session info to prepare for sub and train
     */
    async checkGrantAccessAndQuerySessionInfo(){
        let requestAccessResult = ""
        await this.requestAccess().then((result)=>{requestAccessResult=result})

        let accessGranted = JSON.parse(requestAccessResult)
    
        // check if user is logged in CortexUI
        if ("error" in accessGranted){
            alert('You must login on EmotivApp before request for grant access then rerun')
            throw new Error('You must login on EmotivApp before request for grant access')
        }else{
            console.log(accessGranted['result']['message'])
            // console.log(accessGranted['result'])
            if(accessGranted['result']['accessGranted']){
                await this.querySessionInfo()
            }
            else{
                alert('You must accept access request from this app on EmotivApp then rerun tryijng again');
                await this.checkGrantAccessAndQuerySessionInfo();
                // throw new Error('You must accept access request from this app on EmotivApp ' )
            }
        }   
    }


    /**
     * 
     * - check login and grant access
     * - subcribe for stream
     * - logout data stream to console or file
     */
    sub(streams){
        this.socket.on('open',async ()=>{
            await this.checkGrantAccessAndQuerySessionInfo()
            this.subRequest(streams, this.sessionId)
            this.socket.on('message', (data)=>{
                // log stream data to file or console here
                console.log(data)
            })
        })
    }


    setupProfile(headsetId, profileName, status){
        const SETUP_PROFILE_ID = 7;
        let setupProfileRequest = {
            "jsonrpc": "2.0",
            "method": "setupProfile",
            "params": {
                "cortexToken": this.authToken,
                "headset": headsetId,
                "profile": profileName,
                "status": status
            },
            "id": SETUP_PROFILE_ID
        }
        let socket = this.socket
        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(setupProfileRequest));
            socket.on('message', (data)=>{
                if(status=='create'){
                    resolve(data)
                }

                try {
                    if(JSON.parse(data)['id']==SETUP_PROFILE_ID){
                        if(JSON.parse(data)['result']['action']==status){
                            console.log('SETUP PROFILE -------------------------------------')
                            console.log(data)
                            console.log('\r\n')
                            resolve(data)
                        }
                    }
                    
                } catch (error) {
                    
                }

            })
        })
    }

    queryProfileRequest(){
        const QUERY_PROFILE_ID = 9
        let queryProfileRequest = {
            "jsonrpc": "2.0",
            "method": "queryProfile",
            "params": {
                "cortexToken": this.authToken
            },
            "id": QUERY_PROFILE_ID
        }

        let socket = this.socket
        return new Promise(function(resolve, reject){
            socket.send(JSON.stringify(queryProfileRequest))
            socket.on('message', (data)=>{
                try {
                    if(JSON.parse(data)['id']==QUERY_PROFILE_ID){
                        // console.log(data)
                        resolve(data)
                    }
                } catch (error) {
                    
                }
            })
        })
    }

    /**
     * 
     * - load profile which trained before
     * - sub 'com' stream (mental command)
     * - user think specific thing which used while training, for example 'push' action
     * - 'push' command should show up on mental command stream
     */
    live(profileName) {
        this.socket.on('open',async ()=>{

            await this.checkGrantAccessAndQuerySessionInfo()

            // load profile
            let loadProfileResult=""
            let status = "load"
            await this.setupProfile(this.headsetId, 
                                    profileName, 
                                    status).then((result)=>{loadProfileResult=result})
            console.log(loadProfileResult)

            // // sub 'com' stream and view live mode
            this.subRequest(['com'], this.sessionId)

            this.socket.on('message', (data)=>{
                console.log(data)
            })
        })
    }
}


export { Cortex };


