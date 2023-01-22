///myMainVariables
var settings = {

}
var MyRecaptcha = {
	V2:{
		key: {
			private: `paste_here`,
			public: `paste_here`,
		},
	},
	V3:{
		key: {
			private: `paste_here`,
			public: `paste_here`,
		},
	},
};
var metadata = {
	title : 'Site title',
	description: `paste_here`,
	url: 'expected_url',
	image: '/public/img/index.png',
	logo: '/public/img/dia.svg',
	color: '#FB6D93',
	author: 'maaoindigo',
	appName: 'paste_here',
	keywords: ['website'],
	type: 'website',
};

let mainVars = {
	metadata, settings, MyRecaptcha
};

module.exports = mainVars;