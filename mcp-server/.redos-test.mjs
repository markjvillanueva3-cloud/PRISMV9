function referencesEngine(haystack, engineName){
  const esc = engineName.replace(/[.*+?^${}()|[\]\]/g, "\$&");
  return new RegExp(`(?<![A-Za-z0-9_])${esc}(?![A-Za-z0-9_])`).test(haystack);
}
const big = "a".repeat(2000000);
let t0=Date.now();
console.log("huge-no-match:", referencesEngine(big,"SPCEngine"), "ms:", Date.now()-t0);
console.log("import-brace:", referencesEngine('import {SPCEngine} from "x"', "SPCEngine"));
console.log("dotpath:", referencesEngine("../engines/SPCEngine.js", "SPCEngine"));
console.log("substring-block:", referencesEngine("SPCEngineWrapper", "SPCEngine"));
console.log("underscore-block:", referencesEngine("SPCEngine_v2", "SPCEngine"));
console.log("digit-block:", referencesEngine("SPCEngine2", "SPCEngine"));
console.log("metachar-literal:", referencesEngine("a.b+c", "a.b+c"), "(want true)");
console.log("metachar-noregex:", referencesEngine("axbxc", "a.b+c"), "(want false)");
// CRLF body
console.log("crlf-body:", referencesEngine("foo\r\nSPCEngine\r\nbar", "SPCEngine"));
