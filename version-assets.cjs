// Stamp the published artifact with its commit, keeping all browser assets in sync.
const fs=require('node:fs'),vm=require('node:vm');
const version=process.env.GITHUB_SHA||process.argv[2];if(!version||!/^[a-zA-Z0-9-]+$/.test(version))throw Error('A release version is required');
const context=vm.createContext({window:{}});vm.runInContext(fs.readFileSync('site/cloud-config.js','utf8'),context);const config=context.window.ATHAR_CLOUD_CONFIG;config.assetVersion=version;
fs.writeFileSync('site/cloud-config.js','window.ATHAR_CLOUD_CONFIG='+JSON.stringify(config,null,2)+';\n');
let html=fs.readFileSync('site/index.html','utf8');html=html.replace(/((?:src|href)=")([^"?#]+\.(?:css|js))(?:\?v=[^"#]*)?("|#)/g,(_,prefix,file,end)=>prefix+file+'?v='+version+end);
html=html.replace(/<meta name="athar-release" content="[^"]*">/g,'').replace('</head>','<meta name="athar-release" content="'+version+'"></head>');
fs.writeFileSync('site/index.html',html);console.log('Versioned published assets: '+version);
