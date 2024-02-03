﻿$(document).ready(async function () {

	//设定一个全局变量 数据过期时间
	var expireTime = 1000 * 60 * 60 * 24 * 7; //7天
	console.log('选课插件已启动');
	debugger;

	await inital();

	//如果是查老师的根目录 即url为 chalaoshi.de 或者 http://chalaoshi-de-s.webvpn.zju.edu.cn:8001/ url需要完全匹配
	if (window.location.href == 'http://chalaoshi.de/' || window.location.href == 'http://chalaoshi-de-s.webvpn.zju.edu.cn:8001/') {
		//获取当前时间
		let nowTime = new Date().getTime();
		// //获取本地存储的数据
		let localData = localStorage.getItem('search-data');
		let localTime = localStorage.getItem('search-last-update');
		//如果本地存储的数据存在 并且没有过期
		if (localData && nowTime - localTime < expireTime) {
			//直接使用本地存储的数据
			console.log('发现本地存储的数据');
			updateChromeStorage(localData, localTime);
		} else {
			//如果过期了或者没有数据 模拟点击查老师搜索框获取数据 并再从本地存储中获取
			await forgePrepareSearch();
			//获取本地存储的数据
			localData = localStorage.getItem('search-data');
			localTime = localStorage.getItem('search-last-update');
			console.log('模拟点击查老师搜索框获取数据');
			console.log(localData);
			console.log(localTime);
			console.log('将页面存储的数据写入插件储存空间');
			updateChromeStorage(localData, localTime);
			desktop_notification('选课插件提示', '检测到打开查老师，评分数据已更新', 10000);
		}
	}
	//如果是zdbl选课页面 url包含 http://zdbk.zju.edu.cn/jwglxt/xsxk
	else if (window.location.href.includes('http://zdbk.zju.edu.cn/jwglxt/xsxk')) {

		let localTime = await getLocalData('search-last-update')['search-last-update'];

		if (!localTime || new Date().getTime() - localTime > expireTime) {
			desktop_notification('选课插件提示', '评分数据已过期，点击打开查老师页面更新评分', 20000);
			//此处暂时不返回 避免影响后续代码执行
		}


		let localData = await getLocalData('search-data');
		if (!localData) {
			desktop_notification('选课插件提示', '评分数据异常，点击打开查老师页面更新评分', 20000);
			return;
		}
		startZDBKInject();


	}

	// desktop_notification('选课插件已启动', '选课插件已启动', 3000);



});

//封装chrome.storage.local.get 为promise
function getLocalData(key) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(key, (result) => {
			//如果result是空对象
			if (Object.keys(result).length === 0) {
				resolve(null);
				return;
			}
			resolve(result);
		});
	});
}




function startZDBKInject() {
	// 开始监听 整体选课栏目 发生变化时触发自动下拉滚动与绑定点击事件
	observer.observe(targetNode, config);

	//查找 id为#nextPage 的元素 如果存在 点他一下
	// debugger
	if ($('#nextPage').length > 0) {
		//如果#nextpage元素存在href属性 移除href属性 避免chrome报错
		if ($('#nextPage').attr('href')) {
			$('#nextPage').removeAttr('href');
		}
		$('#nextPage')[0].click();
		bindForgeClick();
	}

	$(window).scroll(function () {
		autoScroll();
		bindForgeClick();
	});
}





// 选择要观察变化的目标节点
const targetNode = document.getElementById('contentBox');

// 创建一个MutationObserver实例并传入回调函数
const observer = new MutationObserver(function (mutations) {
	mutations.forEach(function (mutation) {
		// 检查变化类型是否为子节点的添加
		if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
			// 在这里执行你的函数
			console.log('选课系统界面栏目已切换 启动默认下拉');
			autoScroll();
			bindForgeClick();
		}
	});
});

// 配置观察器以监视子节点的变化
const config = { childList: true };





//   // 在页面加载完成后，你可能还需要检查当前已存在的节点
//   document.querySelectorAll('.table-hover').forEach((element) => {
// 	yourBusinessLogic(element);
//   });


//为页面上所有选课pannel绑定点击事件 使得点击后修改dom
function bindForgeClick() {
	//查找所有class为kched的元素 为他们新绑定点击事件 loadScoreData 函数

	$('.panel-heading').each(function (index, element) {
		// $(element).click(loadScoreData);
		//如果没有绑定过
		if (!$(element).data('events') || !$(element).data('events').bindForgeClick) {
			//绑定点击事件
			$(element).click((event) => loadScoreData(event.currentTarget));
			//绑定完给加上data标签防止重复绑定
			$(element).data('events', { bindForgeClick: true });

			//如果这个panel是默认展开的 直接对他调用一次loadScoreData
			//兄弟元素 的style属性的display属性为block
			if ($(element).siblings().first().attr('style') == 'display: block;') {
				loadScoreData(element);
			}
		}
	});

}



function autoScroll() {
	const distanceToBottom = $(document).height() - $(window).height() - $(window).scrollTop();
	// 如果#nextpage元素存在并且距离页面底部小于100px
	if ($('#nextPage').length > 0 && distanceToBottom < 100) {
		//更改nextPage元素的的innerText 为加载中
		$('#nextPage')[0].innerText = '加载中...';

		//如果#nextpage元素存在href属性 移除href属性
		if ($('#nextPage').attr('href')) {
			$('#nextPage').removeAttr('href');
		}


		// 模拟点击#nextpage元素
		$('#nextPage')[0].click();

		//再改为点此加载更多
		$('#nextPage')[0].innerText = '点此加载更多';
	}
}

async function loadScoreData(element) {

	console.log('开始加载评分数据', element);
	//延迟0.5秒 等待愚蠢的zdbk加载
	await new Promise(r => setTimeout(r, 500));

	//table是panel-heading的兄弟元素的子元素
	let table = $(element).siblings().first().find('table');

	//如果table已经处理过了 直接返回
	if ($(table).attr('data-score') == 'true') {
		return;
	}

	// 获取本地存储的数据
	chrome.storage.local.get('search-data', (localData) => {

		//反序列化 localData原本是JSON字符串
		localData = JSON.parse(localData['search-data']);

		// 对当前table元素下子元素进行处理
		//table下thead的tr元素下面的第一个th元素后面插入一个th
		$(table).find('thead').children('tr').children('th').eq(0).after('<th width="5%" >评分</th>');

		//开始处理table下tbody的tr元素
		let trs = $(table).find('tbody').children('tr');
		//如果trs为空 再次调用loadScoreData
		if (trs.length == 0) {
			console.log('trs为空 zdbk还在记载 再次调用loadScoreData');
			loadScoreData(element);
			return;
		}
		//遍历每一个tr元素
		trs.each(function (index, element) {
			//如果tr没有id属性 则说明是课程错误 无教学班
			if (!$(element).attr('id')) {
				console.log('课程错误 无教学班');
				//把tr下的第一个子元素td的colspan属性改为14 对其
				$(element).children('td').eq(0).attr('colspan', '14');
			}
			else {
				//正常课程处理
				//获取教师姓名
				let teacherNames = [];
				//tr下的第二个元素的第一个子元素的html
				let teacherNameHTML = $(element).children('td').eq(1).children('a').html();
				//html处理出 教师姓名 以<br/>作为分隔符
				teacherNames = teacherNameHTML.split('<br>');
				console.log('教师姓名', teacherNames);

				//根据教师姓名在本地存储的数据中查找评分 并插入到tr的第二个td元素后面
				//teacherNames是一个数组 有可能有多个老师 需要放到一个td里面
				let scoreHTML = '';
				teacherNames.forEach((teacherName) => {
					//如果老师名字在本地存储的数据中
					let res = localData.teachers.find((teacher) => teacher.name == teacherName);
					if (res && res.rate) {
						//如果有评分
						//根据评分高低设置颜色 满分十分 但是rate是字符串 

						//如果评分大于8.5 设置为红色
						if (parseFloat(res.rate) > 8.5) {
							scoreHTML += '<a style="color:red;" href=https://chalaoshi.de/t/' + res.id + ' target="_blank" >' + res.rate + '</a><br>';
						}
						//如果评分小于2 设置为紫色
						else if (parseFloat(res.rate) < 2) {
							scoreHTML += '<a style="color:#4340ff;" href=https://chalaoshi.de/t/' + res.id + ' target="_blank" >' + res.rate + '</a><br>';
						}
						// 正常情况黑色
						else {
							scoreHTML += '<a style="color:black;" href=https://chalaoshi.de/t/' + res.id + ' target="_blank" >' + res.rate + '</a><br>';
						}

						// scoreHTML += `<a style={color:} href=https://chalaoshi.de/t/${res.id}>` + res.rate + '</a> <br>';
					}
					//如果没有评分
					else {
						//如果没有评分 
						scoreHTML += '<a style="color:black;" href="javascript:void(0);" > N/A </a><br>';
					}
				});
				//如果评分html不为空 插入到tr的第二个td元素后面
				if (scoreHTML) {
					$(element).children('td').eq(1).after('<td>' + scoreHTML + '</td>');
				}
			}
		});



		//给table添加data属性 标志已经处理
		$(table).attr('data-score', 'true');


	});



}







function updateChromeStorage(localData, localTime) {
	chrome.storage.local.set({
		'search-data': localData,
		'search-last-update': localTime
	}, function () {
		console.log('数据已写入插件储存空间');
	});
}


async function forgePrepareSearch() {
	const search_version = 5;
	const searchDataKey = "search-data";
	const searchVersionKey = "search-version";
	const searchLastUpdateKey = "search-last-update";
	const localVersion = Number(localStorage.getItem(searchVersionKey));
	const lastUpdateTime = Number(localStorage.getItem(searchLastUpdateKey));
	let searchData;

	if (localVersion && localVersion === search_version && (Date.now() - lastUpdateTime) < 7 * 24 * 60 * 60 * 1000) {
		searchData = searchData || JSON.parse(localStorage.getItem(searchDataKey));
		if (searchData && "colleges" in searchData && "teachers" in searchData) {
			return;
		}
	}

	const now = new Date();
	const url = "/static/json/search.json?v=" + search_version + "&date=" + now.getUTCFullYear() + (now.getUTCMonth() + 1).toString().padStart(2, "0") + now.getUTCDate().toString().padStart(2, "0");

	try {
		const response = await fetch(url);
		if (response.ok) {
			const data = await response.json();
			if ("colleges" in data && "teachers" in data) {
				searchData = data;
				localStorage.setItem(searchDataKey, JSON.stringify(data));
				localStorage.setItem(searchVersionKey, search_version.toString());
				localStorage.setItem(searchLastUpdateKey, Date.now().toString());
			}
		}
	} catch (error) {
		console.error("Error fetching search data:", error);
	}
}

//初始化函数
async function inital() {
	//检查缓存中 isinit 是否为true
	let result = await getLocalData('isinit');

	if (result) {
		console.log("插件已初始化")
		return;
	}
	//执行初始化逻辑

	debugger;
	//加载json文件至chrome缓存 位置 /data/default.json
	// 使用fetch加载json文件
	const response = await fetch(chrome.runtime.getURL('/data/default.json'));
	const data = await response.json();

	//这里没做错误处理 请求自己本地的json如果还能出错那是真的🐂🍺

	//将json文件写入chrome缓存
	console.log('加载json文件至chrome缓存', data);
	chrome.storage.local.set({ 'search-data': JSON.stringify(data) }, function () {
		console.log('数据已写入插件储存空间');
		//写入数据时间 默认为0 强制用户更新
		chrome.storage.local.set({ 'search-last-update': 0 }, function () {
			console.log('数据时间已写入插件储存空间');
			//设置isinit为true
			chrome.storage.local.set({ 'isinit': true }, function () {
				console.log('初始化成功');
			});
		});
	});

}


function desktop_notification(title, data, closeTime = 3000) {
	//显示一个桌面通知
	//由于content-script.js无法使用chrome.notifications 需要通过background.js来发送消息
	chrome.runtime.sendMessage({
		data: {
			title: title,
			message: data,
			closeTime: closeTime
		}
	}, function (response) {
		console.log('收到来自后台的回复：' + response);
	});

}