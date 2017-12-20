/**
 * Created by A on 2017/12/20.
 */
const page = require('webpage').create(),
    system = require('system');

var tools = {};

tools.LogRequest = function (data) {
    // data:  id  method  url  postData(类似querystring) headers time
    var dataString = JSON.stringify(data)
    console.log("REQUEST: ",dataString)
}

tools.LogError = function (data) { // 这样好像还是输出到 data的部分了
    var dataString = JSON.stringify(data)
    console.error("PHANTOM ERROR: ",dataString)
    //system.stderr.write("PHANTOM ERROR: "+ dataString)
}

tools.Trace = function () {
    Array.prototype.unshift.call(arguments, "TRACE:")
    console.log.apply(this, arguments);
}



var requestUrl = system.args[1],
    userAgent = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36";

page.settings.localToRemoteUrlAccessEnabled = true;
page.settings.loadImages = false;
page.settings.userAgent = userAgent


page.onPageCreated = function(newPage) {
    newPage.settings.userAgent = userAgent;
    newPage.onLoadStarted = function(url, isFrame) {
        console.log("NEW PAGE:",url)
    }
    newPage.onResourceRequested = function(requestData, networkRequest) {
        tools.LogRequest(requestData)
    };

};

page.onInitialized = function() {
    page.evaluate(function () {
        // set a property lastListenerInfo for those has been addEventListener
        //在所有通过addEventListener 添加事件的元素上绑定一个 lastListenerInfo 的属性
        HTMLElement.prototype.realAddEventListener = HTMLElement.prototype.addEventListener;
        HTMLElement.prototype.addEventListener = function(a,b,c){
            this.realAddEventListener(a,b,c);
            if(!this.lastListenerInfo){  this.lastListenerInfo = new Array()};
            if(a == "click"){
                this.lastListenerInfo.push({a : a, b : b , c : c});
            }
        };
    })

};



page.onResourceRequested = function(requestData, networkRequest) {
    networkRequest.setHeader("User-Agent", userAgent);
    tools.LogRequest(requestData)

};


//浏览器的地址栏的请求改变
page.onNavigationRequested = function(url, type, willNavigate, main) {
    if(url != requestUrl)
        console.log('HREF:' + url);
}

page.onUrlChanged = function(targetUrl) {
    tools.Trace("Url Before Go back")
    page.urlChangedTimes = page.urlChangedTimes || 0; //todo: 自己加的属性
    page.urlChangedTimes++;
    tools.Trace("After Url Go back", page.urlChangedTimes)
};



page.onError = function(msg, trace) {
    if(msg){
        var errorData = {
            message: 'PAGE ERROR: ' + msg,
        };

        var traceString = ""
        if (trace && trace.length) {
            trace.forEach(function(t) {
                traceString += (' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
            });
        }
        errorData.trace = traceString;
        errorData.systemUrl = requestUrl;
        errorData.pageUrl = page.url; //当前页面的url
        tools.LogError(errorData);
        if(traceString.indexOf("too much recursion") != -1){
            tools.LogError({
                data:" catching the too much recursion killing self"
            });
            phantom.exit(1);
        }
    }

};

phantom.onError = function(msg, trace) {
    var errorData = {
        message: msg,
    };
    var traceString = ""
    if (trace && trace.length) {
        trace.forEach(function(t) {
            traceString += (' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
        });
    }
    errorData.trace = traceString;
    errorData.systemUrl = requestUrl
    tools.LogError(errorData);
    phantom.exit(1);
};

page.onConsoleMessage = function(message, line, file) {
    tools.Trace("Having something console", JSON.stringify(arguments))
};

page.open(requestUrl,function(status){
    if (status !== 'success') {
        console.error('Unable to access network');
        phantom.exit();
    }
    tools.Trace("Before Click-----",status)
    //page.injectJs("./operation.js");
    console.error(" 第一次处理")
	page.navigationLocked = true; //在锁住的时候 原地跳的表单拿不到数据
	page.evaluate(function () {
		//fillIn();
		Array.prototype.forEach.call(document.getElementsByTagName("form"), function(item){
			item.target = "_blank";
		})
		Array.prototype.forEach.call(document.getElementsByTagName("a"), function(item){
			item.target = "_blank";
		})
		Array.prototype.forEach.call(document.getElementsByTagName("*"), function(item){
			if(item.type == "submit" || item.tagName == "A" || item.onclick || item.lastListenerInfo){
				item.click()
				//fillIn();//为了填充每次点击带来的潜在的input 是否有更好的办法？？
			}
		})
	})
    console.error(" 第N次处理",page.urlChangedTimes -1 )
    page.navigationLocked = false;
    page.evaluate(function (changeTimes) {
		console.log("entering  what is the change inn times", changeTimes)
		//fillIn();
		Array.prototype.forEach.call(document.getElementsByTagName("form"), function(item){
			item.target = "_blank";
		})
		Array.prototype.forEach.call(document.getElementsByTagName("a"), function(item){
			item.target = "_blank";
		})
	   
		var jumpItems = Array.prototype.filter.call(document.getElementsByTagName("*"), function(item){
			var unvalidHref = ["javascript:void(0)", "javascript:", "", null]
			if(item.tagName == "A" && !unvalidHref.includes(item.href)){
				// 这种就不点了--a 链接可以做的事情在锁着的时候应该已经搞定
				return false
			}
			if(item.type == "submit" || item.onclick || item.lastListenerInfo ){ //
				return true;
			}
		})

		console.log("before slicing ----  jump length", jumpItems.length)
		console.log("now the sliceing part index start",changeTimes )
		console.log("jump length", jumpItems.length)
		jumpItems.forEach(function (item, key) {
			console.log("keys is", item.outerHTML)
			item.click()
			console.log("afterimg the task----------")
			//fillIn();
			console.log("afterimg the file finishing ----------")
		})
		console.log("为什么就是执行不到这里呢")
    }, page.urlChangedTimes)

    tools.Trace("After Click------")


    setTimeout(function () {
        tools.Trace("Exit-----")
        phantom.exit();
    },2000)



} );

