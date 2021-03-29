define(['../constants/lang-en.js',
		'../constants/lang-br.js',
		'../constants/lang-cn.js',
		'../constants/lang-de.js',
		'../constants/lang-es.js',
		'../constants/lang-fr.js',
		'../constants/lang-it.js',
		'../constants/lang-ja.js',
		'../constants/lang-ko.js',
		'../constants/lang-ru.js',
		'../constants/lang-tw.js'
		], function (en, br, cn, de, es, fr, it, ja, ko, ru, tw) {
    class LangService {
		trans(str) {
			if (this._locale[str])
				return this._locale[str];
			return this._enLocale[str];
		}

		language() { return this._localeString; }
		setLanguage(lang) { 
			this._localeString = lang;
			this._enLocale = en;
			
			this._locale = eval(lang);
			this._localeString = lang;
		}
	}
	  
	return LangService;
});
