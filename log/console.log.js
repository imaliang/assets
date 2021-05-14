!function() {
	if (window.console && window.console.log) {
		const e = (...e)=>setTimeout(console.log.bind(console, ...e));
		e("%c ", "\n  background:url(".concat(`https://cdn.jsdelivr.net/gh/imaliang/assets/img/favicon.png`, ") no-repeat center;\n  background-size:100px;\n  margin:5px 0;\n  padding:0 0 120px 100px;\n  border-radius:10px;\n  overflow:hidden;\n  ")),
		e("\n %c 阿椋 %c https://aliang.link \n", "color:#FFFFFB;background:#ffa628;padding:5px 0;border-radius:.5rem 0 0 .5rem;", "background: #efefef;padding:5px 0 5px;border-radius:0 .5rem .5rem 0;"), 
			e(`%c页面加载消耗了 ${(Math.round(100 * performance.now()) / 100 / 1e3).toFixed(2)}s`, "background: #fff;color: #333;padding:10px;text-shadow: 0 0 2px #eee, 0 0 3px #eee, 0 0 3px #eee, 0 0 2px #eee, 0 0 3px #eee;"),
		localStorage.getItem("access") || localStorage.setItem("access", (new Date).getTime());
		let o = new Date(Number.parseInt(localStorage.getItem("access")))
			, t = `${o.getFullYear()}年${o.getMonth() + 1}月${o.getDate()}日`
			, n = 0;
		localStorage.getItem("hit") ? n = Number.parseInt(localStorage.getItem("hit")) : localStorage.setItem("hit", 0),
			localStorage.setItem("hit", ++n),
			e(`%c这是你自 ${t} 以来第 ${n} 次在本站打开控制台，你想知道什么秘密嘛~`, "padding:10px;");
	}
}();