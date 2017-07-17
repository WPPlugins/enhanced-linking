/*
 * Let's do it
**/

var enhancedLinks;

(function ($) {

	$.fn.delayed = function (evt, timeout, callback) {
		var metakey = 'delayedTimer';
		$(this).bind(evt, $.proxy(function (e) {
			clearTimeout($(this).data(metakey));
			$(this).data(metakey, setTimeout($.proxy(function () {
				callback(e);
			}, this), timeout));
		}, this));

		return this;
	};

	enhancedLinks = {
		
		zemantaAPIKey : 'xk1s9mv9u0c3krldgtqglzxa',
		bingSearchInterval : 650,
		zemantaSearchInterval : 650,
		isSearchTermModified : false,
		// scheme: selector, wrapper, loader function, has loaded content
		toggleScheme : {
			'internal' : ['#enhanced-links-nav .internal-toggle', '#search-panel'],
			'zemanta' : ['#enhanced-links-nav .zemwp-toggle', '#zemwp-panel', 'performZemantaSearch', false],
			'websearch' : ['#enhanced-links-nav .websearch-toggle', '#websearch-panel', 'performWebSearch', false]
		},
		lastBlock : '',
		articleList : null,
		searchList : null,
		prevBingRequest : null,
		prevZemantaRequest : null,
		
		logGA: (function () {
			var ga = document.createElement('script'), 
				ns = 'enhancedLinksZemantaNS', ga_prefix = ns ? ns + '.' : '';
			
			ga.type = 'text/javascript';
			ga.async = true;
			ga.src = ('https:' === document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
			
			document.getElementsByTagName('head')[0].appendChild(ga);
			
			if(!window._gaq) {
				window._gaq = [];
			}
			
			window._gaq.push([ga_prefix + '_setAccount', 'UA-1933864-10']);
			window._gaq.push([ga_prefix + '_setDomainName', 'none']);
			
			return function (d, page) {
				window._gaq.push([ga_prefix + '_trackPageview', '/tracking' + (page.substring(0, 1) !== '/' ? '/' + page : page)]);
			};
		})(),
		
		init: function () {	
			$('#wp-link').bind('wpdialogbeforeopen', $.proxy(this, 'beforeOpen'));
			$('#search-panel').hide();

			this.initNavigation();
			this.initZemantaSuggestions();
			this.initWebSearch();
		},
		
		initBasicTableHandlers : function (ul) {
			$(ul).delegate('li', 'click', function () {
				$(this).parent().find('li.selected').removeClass('selected');
				$(this).addClass('selected');
				$('#url-field').val($(this).find('.item-permalink').val());
				$('#link-title-field').val($(this).find('.item-title').text());
			}).delegate('.item-external, .item-url', 'click', function (evt) {
				evt.stopPropagation();
			});
		},
		
		initNavigation : function () {
			var that = this, el = $('<ul id="enhanced-links-nav"></ul>'),
				make_logger = function (tab) {
					return function () {
						that.logGA(null, '/enhanced-linking/tab/' + tab);
					};
				};
			
			el.append($('<li><a href="#" class="internal-toggle">My Posts</a></li>'));
			el.append($('<li><a href="#" class="zemwp-toggle">Related Articles</a></li>'));
			el.append($('<li><a href="#" class="websearch-toggle">Search the Web</a></li>'));
			
			el.find('.internal-toggle')
					.click(make_logger('internal'))
					.click($.proxy(this, 'toggleInternalLinking'))
				.end()
				.find('.zemwp-toggle')
					.click(make_logger('zemanta'))
					.click($.proxy(this, 'toggleZemantaLinking'))
				.end()
				.find('.websearch-toggle')
					.click(make_logger('websearch'))
					.click($.proxy(this, 'toggleWebSearchLinking'))
				.end();
			
			// remove wordpress stuff
			$('#internal-toggle').remove();

			$('#link-options')
				.after(el)
				.after($('<span class="howto enhanced-links-howto">Or link to:</span>'));
		},

		initZemantaSuggestions : function () {
			var zemantaPanel = $('<div id="zemwp-panel" style="display:none;">' +
						'<div class="link-search-wrapper">' +
							'<label><span>Refine</span>' + "\n" +
							'<input type="text" id="zemwp-refine-field" class="link-search-field" tabindex="60" autocomplete="off" /><img class="waiting" src="images/wpspin_light.gif" alt="" style="display: none; "></label>' + 
						'</div>' +
						'<div class="query-results">' +
							'<div class="query-notice" style="display:none;"><em>Nothing found.</em></div>' +
								'<ul></ul><div class="river-waiting"><img class="waiting" src="images/wpspin_light.gif" alt="" /></div>' +
						'</div>' + 
					'</div>');

			this.articleList = $('.query-results ul', zemantaPanel);
			$('#zemwp-refine-field', zemantaPanel)
				.delayed('keyup', this.zemantaSearchInterval,  $.proxy(this.performZemantaSearch, this))
				.keyup($.proxy(function (evt) {
					if(this.isValidKey(evt.which)) {
						$('#websearch-search-field').val($(evt.target).val());
						this.isSearchTermModified = true;
					}
				}, this));

			$('#link-selector').append(zemantaPanel);
			this.initBasicTableHandlers(this.articleList);
		},

		initWebSearch : function() {
			var webSearchPanel = $('<div id="websearch-panel" style="display:none;">' +
									'<div class="link-search-wrapper">' +
										'<label><span>Search</span>' + "\n" +
										'<input type="text" id="websearch-search-field" class="link-search-field" tabindex="60" autocomplete="off" /><img class="waiting" src="images/wpspin_light.gif" alt="" style="display: none; "></label>' + 
									'</div>' +
									'<div class="query-results">' +
										'<div class="query-notice" style="display:none;"><em>No results found by your criteria.</em></div>' +
											'<ul></ul><div class="river-waiting"><img class="waiting" src="images/wpspin_light.gif" alt="" /></div>' +
									'</div>' + 
								'</div>');
			this.searchList = $('.query-results ul', webSearchPanel);
	
			$('#websearch-search-field', webSearchPanel)
				.delayed('keyup', this.bingSearchInterval, $.proxy(this.performWebSearch, this))
				.keyup($.proxy(function (evt) {
					if(this.isValidKey(evt.which)) {
						$('#zemwp-refine-field').val($(evt.target).val());
						this.isSearchTermModified = true;
					}
				}, this));
			
			$('#link-selector').append(webSearchPanel);
			this.initBasicTableHandlers(this.searchList);
		},
		
		toggleInternalLinking : function (evt) {
			this.toggleBlock('internal');
			evt.preventDefault();
		},

		toggleZemantaLinking : function (evt) { 	
			this.toggleBlock('zemanta');
			evt.preventDefault();
		},
		
		toggleWebSearchLinking : function (evt) {
			this.toggleBlock('websearch');
			evt.preventDefault();
		},

		toggleBlock : function (which) {
			for(var i in this.toggleScheme) {
				if(this.toggleScheme.hasOwnProperty(i)) {
					var scheme = this.toggleScheme[i], toggle = scheme[0], panel = scheme[1],
						collapse = which === i && !$(toggle).hasClass('active');

					$(toggle).toggleClass('active', collapse);
					$(panel).toggle(collapse);
					
					// first load
					if(collapse && scheme.length > 3 && !scheme[3]) {
						this[scheme[2]]();
						scheme[3] = true;
						this.isSearchTermModified = false;
					} else if(collapse && which !== this.lastBlock && scheme.length > 2 && this.isSearchTermModified) { // reload when search term modified
						this[scheme[2]]();
						this.isSearchTermModified = false;
					}
				}
			}
			
			this.lastBlock = which;
		},
		
		beforeOpen : function (data) {
			var selectedText = $.trim(tinyMCE.activeEditor.selection.getContent({'format': 'text'}));

			this.isSearchTermModified = false;
			$('#zemwp-refine-field, #websearch-search-field').val(selectedText);
			
			for(var i in this.toggleScheme) {
				if(this.toggleScheme.hasOwnProperty(i)) {
					var scheme = this.toggleScheme[i], toggle = scheme[0];
					
					if(scheme.length > 3) {
						// mark on-screen block as loaded and reload it in further
						// the rest of blocks should be marked as unloaded
						scheme[3] = this.lastBlock === i && $(toggle).hasClass('active');
						if(scheme[3]) {
							this[scheme[2]]();
						}
					}
				}
			}
		},
		
		performWebSearch : function () {
			var searchString, waiting;

			searchString = $('#websearch-search-field').val();
			waiting = $('#websearch-panel .link-search-wrapper img.waiting');
			
			if(searchString === '') {
				this.searchList.empty();
				$('#websearch-panel .query-notice').show();
				return;
			}
			
			waiting.show();
			
			this.getBingSearchResults(searchString, $.proxy(function (data) {
				var response = data.d || {}, 
					results = response.results || [];

				this.searchList.empty();
				$('#websearch-panel .query-notice').toggle(!results.length);

				for(var i = 0, c = results.length; i < c; i++) {
					var date = results[i].DateTime ? this.convertDate(results[i].DateTime) : '',
						item = $('<li' + (i % 2 === 0 ? ' class="alternate"' : '') + '><input type="hidden" class="item-permalink" value="%permalink%">' + 
									'<span class="item-info"><a href="%permalink%" class="item-external" target="_blank"><br/></a> <span>%date%</span></span>' +
									'<span class="item-title">%title%</span>' +
									'</li>'),
									maxLinkLength = 40,
									linkText = results[i].DisplayUrl;

					item.find('.item-permalink').val(results[i].Url).end()
						.find('.item-title').text(results[i].Title).end()
						.find('.item-external').attr('href', results[i].Url).end()
						.find('.item-url').attr('href', results[i].Url).text(linkText).end()
						.find('.item-info span').text(date);

					this.searchList.append(item);
				}
				
				waiting.hide();
			}, this));
		},
		
		performZemantaSearch : function () {
			var title, text, emphasis, waiting;

			title = $('#title').val();
			text = tinyMCE.activeEditor.getContent(); 
			emphasis = $('#zemwp-refine-field').val();
			waiting = $('#zemwp-panel .link-search-wrapper img.waiting');

			waiting.show();
			
			this.getZemantaSuggestions({
				text_title: title, 
				text: text, 
				emphasis: emphasis
			}, $.proxy(function (data) {
					var articles = data.articles || [];
				
					this.articleList.empty();
					$('#zemwp-panel .query-notice').toggle(!articles.length);

					for(var i = 0, c = articles.length; i < c; i++) {
						var date = this.convertDate(articles[i].published_datetime),
							item = $('<li' + (i % 2 === 0 ? ' class="alternate"' : '') + '><input type="hidden" class="item-permalink" value="%permalink%">' + 
									'<span class="item-info"><a href="%permalink%" class="item-external" target="_blank"><br/></a> <span>%date%</span></span>' +
									'<span class="item-title">%title%</span>' + 
									'</li>');
	
						item.find('.item-permalink').val(articles[i].url).end()
							.find('.item-title').text(articles[i].title).end()
							.find('.item-external').attr('href', articles[i].url).end()
							.find('.item-info span').text(date);
	
						this.articleList.append(item);
					}
					
					waiting.hide();
					
				}, this), $.proxy(function(xhr, textStatus, errorThrown){
					//alert("Unable to receive results from Zemanta.\n\nReason: " + textStatus + "\nDescription: " + errorThrown);
					$('#zemwp-panel .river-waiting').hide();
				}, this));
		},

		getBingSearchResults : function (searchString, callback, onerror) {
			var dummy = function () {};
			callback = typeof(callback) === 'function' ? callback : dummy;
			onerror = typeof(onerror) === 'function' ? onerror : dummy;

			if(this.prevBingRequest) {
				this.prevBingRequest.abort();
			}

			this.prevBingRequest = $.ajax({
				url: ajaxurl,
				type: 'GET',
				dataType: "json",
				data: {
					query : searchString,
					action : 'el_bingsearch'
				},
				success: callback,
				error: onerror
			});
		},

		getZemantaSuggestions : function (data, callback, onerror) {
			var dummy = function () {};
			callback = typeof(callback) === 'function' ? callback : dummy;
			onerror = typeof(onerror) === 'function' ? onerror : dummy;
			var postData = $.extend({}, data, { 
					api_key: this.zemantaAPIKey,
					format: 'json',
					method : 'zemanta.suggest'
				});

			if(this.prevZemantaRequest) {
				this.prevZemantaRequest.abort();
			}

			this.prevZemantaRequest = $.ajax({
				url: 'http://api.zemanta.com/services/rest/0.0/',
				type: 'POST',
				dataType: 'json',
				data: postData,
				success: callback,
				error: onerror
			});
		},

		isValidKey : function (charCode) {
			return charCode === 16 || !!String.fromCharCode(charCode).match(/(\w|\s)/);
		},

		convertDate : function (string) {
			var d = this.dateFromISO8601(string);
			

			function pad(n) {
				return n<10 ? '0'+n : n;
			}
			
			return d.getUTCFullYear() + '/' + pad(d.getUTCMonth()+1) + '/' + pad(d.getUTCDate());
		},
		
		dateFromISO8601 : function (string) {
			var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
				"(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\\.([0-9]+))?)?" +
				"(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?",
				d = string.match(new RegExp(regexp)),
				offset = 0,
				date = new Date(d[1], 0, 1),
				time = 0;
			if (d[3]) { date.setMonth(d[3] - 1); }
			if (d[5]) { date.setDate(d[5]); }
			if (d[7]) { date.setHours(d[7]); }
			if (d[8]) { date.setMinutes(d[8]); }
			if (d[10]) { date.setSeconds(d[10]); }
			if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
			if (d[14]) {
				offset = (Number(d[16]) * 60) + Number(d[17]);
				offset *= ((d[15] === '-') ? 1 : -1);
			}
			offset -= date.getTimezoneOffset();
			time = (Number(date) + (offset * 60 * 1000));
			
			var newDate = new Date();
			newDate.setTime(Number(time));
			
			return newDate;
		}
		
	};
	
	$(document).ready(function () { 
		enhancedLinks.init();
	});
	
})(jQuery);