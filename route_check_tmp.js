const { EleventyServerless } = require('@11ty/eleventy');
const testPath = '/results/school/West_Windsor-Plainsboro_High_School_North_(Plainsboro,_NJ)/Montgomery_High_School_(Skillman,_NJ)/';
const elev = new EleventyServerless('odb', {
  path: testPath,
  functionsDir: './serverless/',
});
console.log('isServerlessUrl', elev.isServerlessUrl(testPath));
elev.getOutput().then(([page]) => {
  console.log('rendered', !!page, page && page.content ? page.content.length : 0);
}).catch((e) => {
  console.error('error', e.message);
  process.exit(1);
});
