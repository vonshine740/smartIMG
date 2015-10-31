;(function(){
	var smartIMG = function( smartEle ){
		var self = this;
		this.item = smartEle;
		this.resized = false;
		this.imgs = this.getImgs();
		this.exitLen = this.imgs.length;
		// 默认参数
		this.setting = {
			"ratio" : "16:9",				//图片的宽高比
			"lazy-load" : false,				//是否启用懒加载
			"multi-load" : false,			//是否依据屏幕分辨率加载不同图片
			'multi-data' : null,			//依据分辨率加载不同图片的数据地图
			"load-class" : 'loaded',		//懒加载图片，懒加载完毕后添加的类标识
			"load-func" : this.showIt,		//懒加载图片，加载完毕后执行的方法
			"load-type" : 'fadeIn',			//懒加载图片，加载完毕后出现的方式
			"img-parent" : 'img-parent',	//图片的外层容器类
			"main-container" : '',			//滚动列表外层容器
			"center-fix" : false,				//对于不符合设定宽高比的图片是否启用居中定位
			"drawing" : true,
			"ignore-flag" : 'smartIMG-ignore'
		}

		//合并用户参数与默认参数配置
		$.extend( this.setting, this.getSetting() );

		// 获取整体滚动的容器
		this.McElem = this.setting['main-container'] == ''? $(document) : $('.'+ this.setting['main-container']);
		this.McHeight = this.setting['main-container'] == ''? $(window).height() : $('.'+ this.setting['main-container']).outerHeight();

		// 初始化绑定事件
		this.bindEvent();

		this.listenAll();
	};

	smartIMG.prototype = {
		// 获取配置参数
		getSetting : function(){
            if( this.item ){
                var setting = this.item.attr('data-setting');
                if( setting && setting != '' ){
                    return $.parseJSON( setting );
                }else{
                    return {};
                }
            }

		},
		// 绑定事件
		bindEvent : function( oNewFlag ){
			var that = this;
			if( typeof oNewFlag != 'undefined' ){
				that.exitLen = oNewFlag.newLen;
				this.imgs = oNewFlag.newGather;
			}
			if( that.setting['lazy-load'] ){
				that.loadLazy(self);
				that.McElem.bind('scroll', function(){
					that.loadLazy();
					that.resized = false;
				});
				$(window).bind('resize', function(){
					that.resized = true;
					that.loadLazy(this);
				});
			}else{
				that.loadDefault();
				that.McElem.bind('scroll', function(){
					that.resized = false;
				});
				$(window).bind('resize', function(){
					that.resized = true;
					that.loadDefault();
				});
			}
		},
		// 全局检测ajax请求方法
		listenAll : function(){
			var that = this;
			$(document).ajaxComplete(function(){
				var isNew = that.isAddNew();
				if( isNew.isAdded ){
					that.bindEvent( isNew );
				}
			});
		},
		// 获取图片集合的方法
		getImgs : function(){
			var imgGather = [],
				_this = this;
			this.item.find('img').each(function(){
				// 嵌套处理--只有当前内部，内部容器外部的内容才被获取
				if( $(this).parents('.smartIMG')[0] == _this.item[0] && !$(this).hasClass(  ) ){
					imgGather.push( $(this) );
				}
			});
			return imgGather;
		},

		showIt : function( _imgSelf ){
			_imgSelf.fadeIn();
		},

		loadLazy : function( ){
			var scrollOffset = this.McElem[0] == document ? (document.documentElement.scrollTop || document.body.scrollTop) : this.McElem.scrollTop(),
				that = this;
			
				for( var i = 0, j = this.imgs.length; i < j; i++ ){
					var _url = this.imgs[i].attr('data-src'),
						currentElem = this.imgs[i],
						currentElemTop = this.McElem[0] == document ? currentElem.offset().top : (currentElem.offset().top - this.McElem.offset().top),
						perParent = currentElem.parents('.'+this.setting['img-parent']);
						if( that.resized || !perParent.hasClass('formated') ){
							that.formatImgParByRatio( currentElem );
						}
						//进入可视区域
						if( currentElemTop - scrollOffset < that.McHeight ){

							// 是否多图加载
							if(that.setting['multi-load']){
								that.loadLazyMulti( currentElem );
							}else if( !currentElem.hasClass(that.setting['load-class']) ){
								// 非多图加载，且未加载过
								currentElem.attr('src', _url).addClass(that.setting['load-class']);
								currentElem.bind('load', function(){
									that.loadedAct( currentElem );
								});
							}
							
						}
					
				}
		},

		loadLazyMulti : function( currentImg ){
			var viewarea = this.McElem,
				viewareaWidth = viewarea.outerWidth(),
				multiData = this.setting['multi-data'] === null ? null : $.parseJSON(this.setting['multi-data']),
				that = this;
				if(multiData === null){
					// 如果支持多图片加载，但未传入配置数据地图，则以默认方式去执行 以360位分辨率界限
					var currentElem = currentImg,
						_url = currentElem.attr('data-src'),
						_miniurl = currentElem.attr('data-mini'),
						_suitUrl = '',
						_isSuit = false,
						_currentUrl = currentElem.attr('src');

					// 根据当前频幕宽度确定加载图像连接地址，并判断已存在链接图像的引用是否和当前屏宽匹配
					if( viewareaWidth <= 360 && _miniurl !== undefined){
						_suitUrl = _miniurl;
					}else if( viewareaWidth > 360 && _url !== undefined ){
						_suitUrl = _url;
					}

					// 根据当前图片的引用地址判断加载图片是否正确
					if( _currentUrl !== undefined ){
						_isSuit =  _currentUrl == _suitUrl ? true : false;
					}

					if( ( !currentElem.hasClass(that.setting['load-class']) || that.resized ) && ( currentElem.attr('src') != undefined || !_isSuit ) ){
						currentElem.attr('src', _suitUrl).addClass(that.setting['load-class']);
						currentElem.bind('load', function(){
							// that.formatByRatio( currentElem );
							that.loadedAct( currentElem );
						});
					}
				}else if( typeof multiData == 'object' ){
					// 多图配置文件：大小图位于同一个目录，不同分辨率下添加不同的文件名后缀即可
					var vwpos = that.posComputed( viewareaWidth, multiData );
					for( var i = 0, j = this.imgs.length; i < j; i++ ){
						var currentElem = this.imgs[i],
							_urlBase = currentElem.attr('data-src'),
							_utlCurrent = that.urlComputed( vwpos, _urlBase, multiData );
						if( !currentElem.hasClass(that.setting['load-class']) ){
							currentElem.attr('src', _utlCurrent).addClass(that.setting['load-class']);
						}else if( that.resized ){
							currentElem.attr('src', _utlCurrent).addClass(that.setting['load-class']);
						}
						// that.formatByRatio( currentElem );
					}
				}

		},
		posComputed : function( vw, multiData ){
			if( vw > multiData.screen[0] ){
				return 0;
			}else if( vw <= multiData.screen[multiData.screen.length-1] ){
				return ( multiData.screen.length );
			}else{
				for( var i = 0; i < multiData.screen.length-1; i++ ){
					if( vw <= multiData.screen[i] && vw > multiData.screen[i+1] ){
						return i+1;
					}else if( vw > multiData.screen[i] && vw <= multiData.screen[i-1] ){
						return i;
					}
				}
			}
		},

		urlComputed : function( posIndex, baseUrl, multiData ){
			var insertPos = baseUrl.lastIndexOf('.');
			var urlComputed = baseUrl.substring(0,insertPos)+'_'+multiData.suffix[posIndex]+baseUrl.substring(insertPos);
			return urlComputed;

		},

		loadDefault : function(){
			var _this = this;
			for( var i = 0, j = this.imgs.length; i < j; i++ ){
				var perParent = this.imgs[i].parents('.'+this.setting['img-parent']);
				if( _this.resized || !perParent.hasClass('formated')){
					_this.formatImgParByRatio( this.imgs[i] );
				}
				if( _this.setting['lazy-load'] ){
					if( _this.resized || !this.imgs[i].hasClass('formated') && this.imgs[i].hasClass(_this.setting['load-class']) ){
						_this.formatImgByRatio( this.imgs[i] );
					}
				}else{
					if( _this.resized || !this.imgs[i].hasClass('formated') ){
						_this.formatImgByRatio( this.imgs[i] );
					}
				}
			}
		},

		loadedAct : function( _imgSelf ){
			this.loadDefault();
			this.setting['load-func']( _imgSelf );
		},

		// 根据宽高比固定图片容器的宽高，并将图片中心显示多余隐藏
		formatImgParByRatio : function( perImg ){
			var ratioArray = this.setting.ratio.split(':');
			this.ratio = ratioArray[0]/ratioArray[1];
			var perParent = perImg.parents('.'+this.setting['img-parent']),
				perParentWidth = perParent.outerWidth(),
				perParentHeight = perParentWidth/(this.ratio);
				perParent.css({'height': perParentHeight,'overflow':'hidden'}).addClass('formated');
				// console.log(perParentWidth);
				// console.log(perParentHeight);
			// this.resized = false;
		},

		//根据宽高比定位图片
		formatImgByRatio : function( perImg ){
			var ratioArray = this.setting.ratio.split(':');
			this.ratio = ratioArray[0]/ratioArray[1];
			var perWidth = perImg.outerWidth(),
				perHeight = perImg.outerHeight(),
				perRatio = perWidth / perHeight,
				perParent = perImg.parents('.'+this.setting['img-parent']),
				perParentWidth = perParent.outerWidth(),
				perParentHeight = perParentWidth/(this.ratio);

			// 图片需要填满父级框框
			if( this.setting['drawing'] && !perImg.hasClass(this.setting["ignore-flag"]) ){

				if( this.ratio > perRatio ){
					perImg.css({
						'width':'100%',
						'height':'auto'
					}).addClass('formated');
					if(this.setting['center-fix']){
						perImg.css({
							'margin-top':(perParentHeight - perHeight)/2
						});
					}
				}else if( this.ratio < perRatio ){
					perImg.css({
						'width':'auto',
						'height':perParentHeight
					}).addClass('formated');
					if(this.setting['center-fix']){
						perImg.css({
							'position':'relative',
							'left':'-10%',
							"z-index":1
						});
					}
				}

			}else if( !perImg.hasClass(this.setting["ignore-flag"]) ){

				perImg.css({
						'position':'relative',
						'top':'50%',
						'margin-top':-perHeight/2,
						'left':'50%',
						'margin-left':-perWidth/2,
						'z-index':1
					}).addClass('formated');

			}
				
			
			// this.resized = false;
		},
		// 为判断是否动态添加更多添加的方法
		isAddNew : function(){
			var that = this,
				newImgGather = that.getImgs();
			return {
						isAdded : newImgGather.length == that.exitLen ? false : true,
						newLen : newImgGather.length,
						newGather : newImgGather
					};
		}

	};

	smartIMG.init = function( smartElems ){
		var _this_ = this;
		smartElems.each(function(){
			new _this_( $(this) );
		});

	}

	window.smartIMG = smartIMG;
})();

window.onload = function(){
	;(function getAndInit(){
		var elemLen = $('.smartIMG').length,
			newElemLen = 0;
		if( elemLen > 0 ){
			smartIMG.init( $('.smartIMG') );
		}
		// 如果整体是ajax添加进来的，那么也初始化一下
		$(document).ajaxComplete(function(){
			newElemLen = $('.smartIMG').length;
			if(newElemLen != elemLen){
				smartIMG.init( $('.smartIMG') );
			}
		});
	})();
}